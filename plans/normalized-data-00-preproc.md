# Normalized Data Preprocessing

**Issue:** #9 — Use normalized data
**Branch:** `9-use-normalized-data`
**Stage:** 00 — Preprocessing plan

## Goal

Replace the current test `connectivity.pq` with real **relative dilution factors**.
The value F for a (source, target, depth, time_window) tuple means:

> "If the source hex has larval concentration C, the target hex gets F * C."

## Physics / Formula

Source hexes are modeled as homogeneous, potentially filled with oyster populations
releasing larvae at constant concentration. We derive the resulting concentration
in each target hex, adjusted for partial water coverage.

```
F(month, year, hex0, hex1) = [obs / N_hex0] * [wf_hex0 / wf_hex1]
```

Where:
- `obs(month, year, hex0, hex1)` — raw particle count (from NetCDF, NOT `obs_per_origin_area`)
- `N_hex0 = sum(obs over ALL hex1)` — total particles from source, including escape hex
- `wf_hex0` = `water_fraction_hex0` — fraction of source hex covered by water
- `wf_hex1` = `water_fraction_hex1` — fraction of target hex covered by water

Hex areas cancel because all hexes are uniform H3 cells.

## Aggregation

**Current step:** Mean over month AND year dimensions.
Output: one F per `(hex0, hex1, depth, time_window)`.

**Future:** Expose monthly climatologies (mean over year only → F per month, hex0, hex1, depth, time_window).
The preprocessing script should be structured so this is easy to add later
(e.g., compute F per month/year first, then aggregate as a final step).

## Input Data

9 NetCDF files, one per (depth, time_window):

```
preproc/input_comp/  (or input/ — compressed copies)
  {05m,10m,15m}_ds_conn_{07,14,28}.nc
```

Each contains:
- `obs(month, year, hex0, hex1)` — raw connectivity counts (sparse, 4D)
- `water_fraction_hex0(hex0)`, `water_fraction_hex1(hex1)`
- `hex0(hex0)`, `hex1(hex1)` — string hex labels
- `habitable_hex0(hex0)`, `habitable_hex1(hex1)` — boolean (relevant for #39, not this issue)
- Dimensions: hex0=8364, hex1=8397, month=5, year=4

Filename encodes depth and time_window:
- `05m_ds_conn_07.nc` → depth="05m", time_window="00d-07d"

## Output

`database/data/connectivity.pq` — drop-in replacement for the current file.

Schema (must match existing DB loader expectations):
```
start_id: int64      — integer hex index (from hex0 label mapping)
end_id:   string     — integer hex index as string (current schema quirk)
time:     string     — e.g. "00d-07d"
depth:    string     — e.g. "05m"
weight:   float64    — the dilution factor F
```

## Processing Steps

1. For each of the 9 NetCDF files:
   a. Read `obs`, `water_fraction_hex0`, `water_fraction_hex1`, `hex0`, `hex1`
   b. Compute `N_hex0 = obs.sum(dim="hex1")` (includes escape hex)
   c. Compute `F = (obs / N_hex0) * (wf_hex0 / wf_hex1)`
   d. Average F over month and year → F_mean(hex0, hex1)
   e. Extract depth and time_window from filename
   f. Sparsify: drop NaN / zero entries
   g. Map hex labels to integer IDs (consistent across all files)
2. Concatenate all 9 into a single DataFrame
3. Write to `database/data/connectivity.pq`

## Escape Hex

Particles leaving the domain land in a special hex. It is included in the
`sum(obs over hex1)` denominator (so N_hex0 is correct) but should be excluded
from the output rows (no meaningful dilution factor for out-of-domain).

Identification: likely has `water_fraction_hex1 = NaN` or 0, or is the extra
hex explaining why hex1 (8397) > hex0 (8364). Need to verify from actual data.

## Hex ID Mapping

Current parquet uses integer `start_id` / `end_id`. NetCDF uses string labels.
Need a consistent mapping. Options:
- Sort hex labels alphabetically and assign 0..N
- Use H3 index integer representation
- Match against existing `hexes.geojson` IDs in `database/data/`

**Must verify** which mapping the existing `hexes.geojson` and `meta.json` use.

## Open Questions

YOUR QUESTIONS/NOTES:
- [ ] Confirm: average over both month AND year for now?
- [ ] How to identify the escape hex in hex1?
- [ ] What is the hex label → integer ID mapping used in the current data?
- [ ] Are the input .nc files available locally, or only on the GEOMAR cluster?
