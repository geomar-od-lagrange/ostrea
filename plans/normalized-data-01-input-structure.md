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
| hex1   | 8397 | target hexes |
| month  | 5    | float64 0-based index (0.0–4.0) |
| year   | 4    | float64 0-based index (0.0–3.0) |
| corner | 7    | hex polygon corners; geometry only |

**On hex0 vs hex1 size:** N(hex0) and N(hex1) are not equal and may differ slightly across
files. This is because random initial positions and land-killing of particles creates
roundoff noise at hex edges — not all source hexes emit particles in every file.
There is exactly **one** invalid target hex in hex1 (the out-of-domain escape hex, labeled
with a special value in the hextraj coordinate system — see below). The full set of valid
hexes is obtained by taking the union of hex0 and hex1 labels across all 9 files.

**On month/year aggregation:** For the current dashboard we average over both month and
year. Since `obs` is a count, we can simply `sum(month, year)` — no weighting needed,
no loss of information. The processing script should be structured to also support
outputting per-month climatologies (mean over year, keeping month) for future
seasonal/interannual variability investigation.

## Coordinates

| Name       | Dims    | Notes |
|------------|---------|-------|
| hex0       | (hex0)  | byte-string label in hextraj format, e.g. `b'(-1, -19, 20)'` |
| hex1       | (hex1)  | same format |
| hex_label  | (hex0)  | TBC: may be duplicate of hex0 coordinate |
| lon_hex0   | (hex0)  | centroid longitude |
| lat_hex0   | (hex0)  | centroid latitude |
| lon_hex1   | (hex1)  | centroid longitude |
| lat_hex1   | (hex1)  | centroid latitude |
| month      | (month) | |
| year       | (year)  | |

**Hex label format:** Labels like `(-1, -19, 20)` are in the custom coordinate system
from [hextraj](https://github.com/willirath/hextraj). This is a regional hex grid
(not H3 global) that avoids H3's 1→7 hierarchy jumps and ignores pentagons.
The byte-string labels are stable IDs usable across all 9 files.
For the ostrea app, map these to sequential integers.

**Corner coordinates** (`lon/lat_hex{0,1}_corners`, `corner` dim = 7) are present and
needed for constructing GeoJSON polygon layers. The full set should be assembled across
all files to capture hexes that appear in only some files.

## Data Variables

### obs — the one that matters

| Name | Dims                          | Notes |
|------|-------------------------------|-------|
| obs  | (month, year, hex0, hex1)     | raw particle counts; sparse (mostly NaN); ~11 GB |

`obs(month, year, hex0, hex1)` counts particles released from hex0 that arrived in hex1
within the time window, for a given simulation month and year.
**Confirm from manuscript:** exact definition (are these per-release counts? per unit area?
normalized in any way already?).

### Per-hex metadata

Each exists in a `_hex0` and `_hex1` variant.

| Stem             | Dims   | Notes |
|------------------|--------|-------|
| water_fraction   | (hexN) | fraction of hex area covered by water — used in normalization |
| gridbox_count    | (hexN) | number of ocean model gridboxes intersecting hex |
| water_count      | (hexN) | number of wet gridboxes in hex |
| depth_mean       | (hexN) | mean depth of wet gridboxes |
| depth_median     | (hexN) | median depth of wet gridboxes |
| depth_std        | (hexN) | std of depth of wet gridboxes |
| aqc_count        | (hexN) | aquaculture sites per hex |
| rst_count        | (hexN) | restoration sites per hex |
| pop_count        | (hexN) | wild population sites per hex |
| dss_count        | (hexN) | disease surveillance sites per hex |
| hly_count        | (hexN) | unknown — TBC |
| his_count        | (hexN) | unknown — TBC |

**Normalization:** `water_fraction` is present and the formula from
`normalized-data-00-preproc.md` applies. Confirm exact formula against manuscript before
implementing.

**Depth-based habitable filtering (future issue):** The current app uses a ≤85m depth
threshold on median/mean depth. For steep-shelf areas (e.g. Norwegian coast), these
aggregates are poor indicators of whether a hex is at least partially habitable — they
tend to exclude too much valid area. Will need a better depth label (e.g. minimum depth,
or fraction of gridboxes shallower than 85m). Track as a separate issue.

### Geometry

| Name              | Dims           |
|-------------------|----------------|
| lon_hex0_corners  | (corner, hex0) |
| lat_hex0_corners  | (corner, hex0) |
| lon_hex1_corners  | (corner, hex1) |
| lat_hex1_corners  | (corner, hex1) |

Already largely present in `database/data/hexes.geojson`. Assemble union across all 9
files to ensure complete coverage.

## Open Questions

- [ ] Confirm exact definition of `obs` against manuscript
- [ ] Confirm normalization formula against manuscript
- [ ] Is `hex_label` identical to `hex0` coordinate, or different?
- [ ] What do `hly_count` and `his_count` stand for?
- [ ] Identify the hextraj invalid-hex label value (to exclude from output)
