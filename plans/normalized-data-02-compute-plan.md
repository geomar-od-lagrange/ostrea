# Compute Plan: Normalized Relative Dilutions

**Follows from:** `normalized-data-01-input-structure.md`
**Implements:** issue #9 (normalized data) + issue #44 (07d-28d time window fix)

## What we compute

For each (source hex, target hex, depth, time_window):

$$F = \frac{\text{obs}}{N_{\text{hex0}} \cdot DT_h} \cdot \frac{wf_{\text{hex0}}}{wf_{\text{hex1}}}$$

| Term | Meaning |
|------|---------|
| `obs(month, year, hex0, hex1)` | cumulative particle-hours at target (1 position recorded per hour) |
| `N_hex0 = obs.sum(dim="hex1")` | total particle-hours from source, summed over ALL hex1 incl. escape hex |
| `DT_h` | window duration in hours (see table below) |
| `wf_hex0` | water fraction of source hex — accounts for fewer particles released from coastal hexes |
| `wf_hex1` | water fraction of target hex — converts to concentration (particle-hours per water area) |

**Interpretation:** $F \in [0, 1]$ is the relative pathogen concentration at the target
hex per unit source concentration. Multiply by actual pathogen load at source to get
expected absolute concentration at target.

### Time window → DT_h

| File suffix    | Time window label | DT_h (hours) |
|----------------|-------------------|--------------|
| `_00-07days`   | `00d-07d`         | 168          |
| `_07-14days`   | `07d-14d`         | 168          |
| `_07-28days`   | `07d-28d`         | 504          |

Note: `07d-28d` replaces the previously mislabelled `14d-28d` (issue #44).

## Aggregation

1. Compute $F(month, year, hex0, hex1)$ per file
2. Average over month and year → $F(hex0, hex1)$ per (depth, time_window)
3. Structure code so month-only aggregation (climatology) can be added later

Since obs is a count, summing before dividing is equivalent and numerically cleaner:

```python
obs_sum = ds.obs.sum(dim=["month", "year"])           # (hex0, hex1)
N_hex0_sum = obs_sum.sum(dim="hex1")                  # (hex0,) — includes escape hex
n_months_years = ds.obs.sizes["month"] * ds.obs.sizes["year"]

F = (obs_sum / (N_hex0_sum * DT_h * n_months_years)) * (wf_hex0 / wf_hex1)
```

Yes, summing over obs is the way!

## Filtering

- **Exclude escape hex:** drop rows where `hex1 == b'(0, 0, 0)'` before output
- **Exclude zeros/NaN:** drop rows where F is NaN or 0 (sparse storage)
- The escape hex IS included in `N_hex0_sum` (correct denominator) but excluded from output rows

## Hex ID mapping

Output schema requires integer IDs. Strategy:
- Collect union of all hex0 and hex1 labels across all 9 files (excluding escape hex)
- Sort lexicographically and assign 0..N
- Must match `database/data/hexes.geojson` — verify existing IDs before writing

## Output schema

`database/data/connectivity.pq` — drop-in replacement:

```
start_id: int64    — source hex integer ID
end_id:   string   — target hex integer ID as string (existing schema quirk)
time:     string   — e.g. "00d-07d"
depth:    string   — e.g. "05m"
weight:   float64  — F value
```

## Data access

The published files at `data.geomar.de` are **uncompressed** (~11 GB each, ~100 GB total)
— deflate was not applied before publication. OPeNDAP would transfer 100 GB of mostly NaN;
not practical. Processing runs on the GEOMAR cluster where the original files are local:

```
/gxfs_work/geomar/smomw400/git_projects/2022_north-sea_oysters/output_data/
  040_connectivity_analysis_{05m,10m,15m}/
    040_connectivity_analysis_{depth}_{time}.nc
```

The notebook uses OPeNDAP URLs for development/inspection only (metadata, small slices).
Swap `BASE_URL` for the local path when running the full processing on the cluster.

**Future:** re-publish with deflate compression — files would shrink to a few hundred MB each.

## Processing steps

1. Open all 9 files (local paths on cluster; OPeNDAP for dev)
2. Build global hex label → int ID mapping from union of all hex0/hex1 labels
3. For each file:
   a. Sum obs over month and year
   b. Compute N_hex0_sum (include escape hex in sum)
   c. Compute F using formula above
   d. Drop escape hex rows and NaN/zero rows
   e. Map hex labels to integer IDs
   f. Tag with depth and time_window from filename
4. Concatenate all 9 → single DataFrame
5. Write to `database/data/connectivity.pq`

## Assumptions / pending confirmation

- **DT_h:** using 168/168/504 hours — please correct if wrong
- **Aggregation:** sum obs over month+year first, then normalize (confirmed above)
- **Hex ID mapping:** existing `hexes.geojson` and `meta.json` have no hex label strings
  and were generated from old test data — we regenerate both alongside `connectivity.pq`

YOUR NOTES:

:+1: