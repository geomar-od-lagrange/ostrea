# Plan: Unified Preprocessing Notebook (replaces nb01–nb04)

## Summary

One notebook does everything:
- **Phase 1**: Scan all 9 local NC files (metadata only) → build canonical hex mapping
- **Phase 2**: Scan all 9 NC files again (obs arrays) → compute connectivity weights
- **Phase 3**: Prune disconnected clusters
- Outputs: `hex_label_to_id.json`, `meta.json`, `hexes.geojson`, 9 × `connectivity_*.pq`

Memory constraint: only one NC file open at a time.

---

## Notebook: `preproc/notebooks/03_unified_preprocessing.ipynb`

(Old notebooks 01–04 moved to `preproc/notebooks/archive/`)

---

## Cell Layout

### Cell 1 — Markdown: Title and Overview

### Cell 2 — Parameters

```python
from pathlib import Path
import numpy as np

LOCAL_INPUT_DIR = Path("../input_comp")

# (depth, nc_time_suffix, DT_H_hours, time_label)
FILES = [
    ("05m", "00-07days", 168,  "00d-07d"),
    ("05m", "07-14days", 168,  "07d-14d"),
    ("05m", "07-28days", 504,  "07d-28d"),
    ("10m", "00-07days", 168,  "00d-07d"),
    ("10m", "07-14days", 168,  "07d-14d"),
    ("10m", "07-28days", 504,  "07d-28d"),
    ("15m", "00-07days", 168,  "00d-07d"),
    ("15m", "07-14days", 168,  "07d-14d"),
    ("15m", "07-28days", 504,  "07d-28d"),
]

_TIME_TO_DAYS = {"00-07days": "07", "07-14days": "14", "07-28days": "28"}

ESCAPE_HEX_STR   = "(0, 0, 0)"
ESCAPE_HEX_BYTES = b"(0, 0, 0)"

MIN_CLUSTER_SIZE = 4   # BFS pruning threshold
WEIGHT_SIG_FIGS  = 3   # significant figures for weight rounding

OUT_DIR = Path("../../database/data")

HEX_VARS = [
    "water_fraction",
    "depth_mean", "depth_median", "depth_std",
    "aqc_count", "rst_count", "pop_count",
    "dss_count", "hly_count", "his_count",
    "lon", "lat",
]

def local_path(depth, time_suffix):
    days = _TIME_TO_DAYS[time_suffix]
    return LOCAL_INPUT_DIR / f"{depth}_ds_conn_{days}.nc"

def _to_str(v):
    return v.decode() if isinstance(v, bytes) else str(v)
```

DT_H values: `00-07days` = 168 h (7d), `07-14days` = 168 h (7d), `07-28days` = 504 h (21d).

### Cell 3 — Imports

```python
import json, math, gc, time as time_mod
import numpy as np
import pandas as pd
import xarray as xr
from pathlib import Path
from collections import Counter
```

---

## Phase 1: Build Canonical Hex Metadata

### Cell 4 — Markdown: Phase 1 header

### Cell 5 — Scan all 9 files for hex labels + metadata

For each file (open → read metadata only → close):

```
for depth, time_suffix, _, _ in FILES:
    ds = xr.open_dataset(local_path(depth, time_suffix), engine="netcdf4")
    for dim in ["hex0", "hex1"]:
        labels = ds[dim].values
        for i, label in enumerate(labels):
            label_str = _to_str(label)
            if label_str == ESCAPE_HEX_STR: continue
            if label_str in hex_data: continue   # first-seen-wins
            rec = {}
            for v in HEX_VARS:
                key = f"{v}_{dim}"
                if key in ds: rec[v] = float(ds[key].values[i])
            for coord in ["lon", "lat"]:
                key = f"{coord}_{dim}_corners"
                if key in ds: rec[f"{coord}_corners"] = ds[key].values[:, i].tolist()
            hex_data[label_str] = rec
    ds.close()
    print(f"{depth} {time_suffix}: {len(hex_data)} unique hexes so far")
```

`hex_data` key = str label like `"(-1, -19, 20)"`.
First-seen-wins is valid because per-hex metadata is identical across all files.
Expected final count: ~8425.

### Cell 6 — Build sorted label-to-ID mapping

```python
sorted_labels = sorted(hex_data.keys())           # lexicographic sort
label_to_id = {label: i for i, label in enumerate(sorted_labels)}
```

Print: ID range, first/last 3 labels.

### Cell 7 — Write `hex_label_to_id.json`

`OUT_DIR / "hex_label_to_id.json"` — JSON `{str_label: int_id}`.

### Cell 8 — Write `hexes.geojson`

GeoJSON FeatureCollection. Per feature: `properties.id = int`, geometry = Polygon from `lon_corners`/`lat_corners` (7-point ring, closed).

### Cell 9 — Write `meta.json`

Columnar JSON `{col_name: {str_id: value}}`. 11 columns:

| Column | Source | Default |
|---|---|---|
| `id` | `label_to_id[label]` | — |
| `lon` | `rec["lon"]` | — |
| `lat` | `rec["lat"]` | — |
| `depth` | `rec["depth_median"]` | — |
| `water_fraction` | `rec["water_fraction"]` | — |
| `disease` | `rec["dss_count"]` | 0.0 |
| `rest` | `rec["rst_count"]` | 0.0 |
| `aqc` | `rec["aqc_count"]` | 0.0 |
| `pop` | `rec["pop_count"]` | 0.0 |
| `his` | `rec["his_count"]` | 0.0 |
| `hly` | `rec["hly_count"]` | 0.0 |

Row key = `str(hex_id)`.

---

## Phase 2: Compute Connectivity

### Cell 10 — Markdown: Phase 2 header

### Cell 11 — Process all 9 files, accumulate records

For each file:

1. Open NC file
2. Read small arrays: `hex0_labels`, `hex1_labels`, `wf_hex0`, `wf_hex1`, `n_months`, `n_years`
3. Build: `escape_mask_hex1`, `valid_hex1_mask`, `hex0_str`, `hex1_str`, `hex1_ids` (int array, -1 for unknown)
4. Load full obs: `obs_all = ds["obs"].values` — shape `(month, year, hex0, hex1)`
5. Sum: `obs_sum = np.nansum(obs_all, axis=(0, 1))`; `N_hex0_sum = obs_sum.sum(axis=1)`
6. `del obs_all; gc.collect()`
7. For each source hex `i`:
   - Skip if `N_hex0_sum[i] == 0`
   - `src_id = label_to_id.get(hex0_str[i], -1)`; skip if -1
   - Skip if `wf_hex0[i]` is 0 or NaN
   - `row = obs_sum[i]`; `target_mask = valid_hex1_mask & (row > 0)`
   - Compute F (see below), filter F > 0, append DataFrame
8. `ds.close()`

**F formula:**
```
F_raw = (obs_sum[i,j] / (N_hex0_sum[i] * DT_H * n_months_years)) * (wf_hex0[i] / wf_hex1[j])
exp = floor(log10(F_raw))
F = round(F_raw * 10^(WEIGHT_SIG_FIGS - 1 - exp)) / 10^(WEIGHT_SIG_FIGS - 1 - exp)
```

Drop rows where F rounds to 0.

Note: `07-28days` DT_H = 504, not 168.

**Output DataFrame columns per file:** `start_id` (int64), `end_id` (str), `time` (str), `depth` (str), `weight` (float64).

### Cell 12 — Concatenate and inspect

```python
conn = pd.concat(all_records, ignore_index=True)
conn = conn[["start_id", "end_id", "time", "depth", "weight"]]
```

Print: total rows, rows per depth/time, weight range.

### Cell 13 — Write pre-pruning parquets

```python
for (depth, time_label), group in conn.groupby(["depth", "time"]):
    out_path = OUT_DIR / f"connectivity_{depth}_{time_label}.pq"
    group[["start_id","end_id","time","depth","weight"]].to_parquet(out_path, index=False)
```

9 files written. Will be overwritten after Phase 3.

---

## Phase 3: Prune Disconnected Hex Clusters

### Cell 14 — Markdown: Phase 3 header

### Cell 15 — Stage A: Remove hexes with NaN/Inf corners

Load `hexes.geojson`, scan coordinates:
```python
bad_ids = {feat["properties"]["id"] for feat in gj["features"]
           if any(not math.isfinite(v) for pt in feat["geometry"]["coordinates"][0] for v in pt)}
```

### Cell 16 — Stage B: BFS spatial adjacency pruning

Parse cube coordinates from `label_to_id` keys:
```python
def parse_cube(label):
    return tuple(int(x) for x in label.strip("()").split(","))
```

6 cube-neighbor directions: `(±1,∓1,0)`, `(±1,0,∓1)`, `(0,±1,∓1)`.

BFS from each unvisited cube → find components → collect IDs of components with size < `MIN_CLUSTER_SIZE`.

### Cell 17 — Apply pruning to all outputs

`prune_ids = bad_ids | small_component_ids`

- `hexes.geojson`: drop features with `properties.id` in `prune_ids`
- `meta.json`: drop row keys where id value in `prune_ids`
- `hex_label_to_id.json`: drop entries where value in `prune_ids`
- Each `connectivity_*.pq`: drop rows where `start_id` or `int(end_id)` in `prune_ids`

IDs are **not** renumbered (sparse IDs preserved, matches existing behavior).

Print before/after counts for each output.

---

## Verification

### Cell 18 — Markdown: Verification header

### Cell 19 — Consistency checks

1. All 12 output files exist
2. ID sets match across `hex_label_to_id.json`, `meta.json`, `hexes.geojson`
3. No escape hex in `hex_label_to_id.json`
4. No NaN/Inf corners in `hexes.geojson`
5. All `start_id`/`end_id` in each parquet are in the valid ID set
6. All weights > 0 and < 1
7. Total rows > 15,000,000

Print summary table: file, rows, weight range.

---

## Output Files

| File | Path |
|---|---|
| `hex_label_to_id.json` | `database/data/hex_label_to_id.json` |
| `hexes.geojson` | `database/data/hexes.geojson` |
| `meta.json` | `database/data/meta.json` |
| `connectivity_05m_00d-07d.pq` | `database/data/connectivity_05m_00d-07d.pq` |
| `connectivity_05m_07d-14d.pq` | `database/data/connectivity_05m_07d-14d.pq` |
| `connectivity_05m_07d-28d.pq` | `database/data/connectivity_05m_07d-28d.pq` |
| `connectivity_10m_00d-07d.pq` | `database/data/connectivity_10m_00d-07d.pq` |
| `connectivity_10m_07d-14d.pq` | `database/data/connectivity_10m_07d-14d.pq` |
| `connectivity_10m_07d-28d.pq` | `database/data/connectivity_10m_07d-28d.pq` |
| `connectivity_15m_00d-07d.pq` | `database/data/connectivity_15m_00d-07d.pq` |
| `connectivity_15m_07d-14d.pq` | `database/data/connectivity_15m_07d-14d.pq` |
| `connectivity_15m_07d-28d.pq` | `database/data/connectivity_15m_07d-28d.pq` |

---

## Changes from Current Pipeline

| Aspect | Old (nb02 + nb03×9 + nb04) | New (unified) |
|---|---|---|
| Source data | OPeNDAP (nb02) + local (nb03) | Local only (all phases) |
| Rounding | 5 sig figs → 3 sig figs (2 passes) | 3 sig figs directly |
| Execution | 11 separate notebook runs | 1 notebook run |
| Mapping consistency | nb02 could use stale OPeNDAP data | Built from same local files |
| Intermediate state | `hex_label_to_id.json` as coupling artifact | In-memory, written once |
| Pruning | Separate nb04 after all nb03 runs | Integrated as Phase 3 |

---

## YOUR QUESTIONS/NOTES

1. **`end_id` dtype**: Currently stored as `object` (string) for historical compatibility. Switch to `int64`? The DB loader handles both, but `int64` saves ~30% parquet size on that column.

2. **ID renumbering after pruning**: Currently IDs are sparse after pruning (matches existing behavior). Should the unified notebook renumber to contiguous 0..N-1? Simpler downstream, but requires updating all files consistently.

3. **nb05 integration**: EMODnet depth quantile (user decided to skip — depth values from NC files are sufficient).

4. **nb06 integration**: Sanity check could be added as a Phase 4 verification, or kept separate.
