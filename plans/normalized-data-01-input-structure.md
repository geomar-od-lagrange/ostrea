# Input Dataset Structure

**Source:** `https://data.geomar.de/thredds/dodsC/20.500.12085/11cc2d8f-4039-49d3-aaab-04ce0fb23190/submission`

9 files, one per (depth, time_window):
```
040_connectivity_analysis_{depth}/040_connectivity_analysis_{depth}_{time}.nc
  depth ∈ {05m, 10m, 15m}
  time  ∈ {00-07days, 07-14days, 07-28days}
```

Each file ~11 GB. All 9 are structurally identical.

## Dimensions

| Dim    | Size | Notes |
|--------|------|-------|
| hex0   | 8364 | source hexes |
| hex1   | 8397 | target hexes; 33 more than hex0 — likely includes escape/out-of-domain hex(es) |
| month  | 5    | float64 0.0–4.0 (5 simulation months) |
| year   | 4    | float64 0.0–3.0 (4 simulation years) |
| corner | 7    | hex polygon corners; geometry only |

## Coordinates

| Name       | Dims   | Notes |
|------------|--------|-------|
| hex0       | (hex0) | byte-string label, format `b'(-1, -19, 20)'` — NOT H3 index |
| hex1       | (hex1) | same format |
| hex_label  | (hex0) | appears to be a duplicate of hex0 coordinate — TBC |
| lon_hex0   | (hex0) | centroid longitude |
| lat_hex0   | (hex0) | centroid latitude |
| lon_hex1   | (hex1) | centroid longitude |
| lat_hex1   | (hex1) | centroid latitude |
| month      | (month) | |
| year       | (year) | |

## Data Variables

### The one that matters

| Name | Dims | Notes |
|------|------|-------|
| obs  | (month, year, hex0, hex1) | raw particle counts; sparse (mostly NaN); 11 GB |

### Per-hex metadata — hex0 and hex1 variants of each

| Stem | Dims | Notes |
|------|------|-------|
| water_fraction | (hexN) | fraction of hex covered by water — needed for normalization |
| gridbox_count  | (hexN) | number of ocean model gridboxes in hex |
| water_count    | (hexN) | number of wet gridboxes in hex |
| depth_mean     | (hexN) | mean depth of wet gridboxes |
| depth_median   | (hexN) | median depth |
| depth_std      | (hexN) | std of depth |
| aqc_count      | (hexN) | aquaculture sites per hex |
| rst_count      | (hexN) | restoration sites per hex |
| pop_count      | (hexN) | wild population sites per hex |
| dss_count      | (hexN) | disease surveillance sites per hex (?) |
| hly_count      | (hexN) | (TBC) |
| his_count      | (hexN) | (TBC) |

### Geometry (low priority)

| Name | Dims |
|------|------|
| lon_hex0_corners | (corner, hex0) |
| lat_hex0_corners | (corner, hex0) |
| lon_hex1_corners | (corner, hex1) |
| lat_hex1_corners | (corner, hex1) |

## Notes / Open Questions

- `water_fraction_hex0/hex1` IS present (was hidden in xarray's truncated repr) — the
  normalization formula from `normalized-data-00-preproc.md` still applies as written.
- `hex_label` on hex0: is this identical to the hex0 coordinate, or different? If identical,
  we can ignore it; if not, we need to understand why two label vars exist.
- The hex label format `(-1, -19, 20)` is not a standard H3 index string. Need to confirm
  what coordinate system this represents and how it maps to the integer IDs in
  `database/data/hexes.geojson`.
- hex1 has 33 more entries than hex0. Need to identify which are the "escape" hexes
  (particles that left the domain) and exclude them from output rows.
- `month` and `year` are float64 0-based indices, not calendar values. Climatological mean
  averages over both dimensions.

YOUR QUESTIONS/NOTES:
- [ ] What do `hly_count` and `his_count` stand for?
- [ ] Is `hex_label` == `hex0` coordinate, or something else?
- [ ] What is the `(-1, -19, 20)` hex label format? Cube coordinates? Custom index?
- [ ] Are the 33 extra hex1 entries the escape hex, or something else?
