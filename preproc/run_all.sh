#!/usr/bin/env bash
# Run from preproc/: bash run_all.sh
set -euo pipefail
cd "$(dirname "$0")"
pm() { pixi run bash -c "cd notebooks && papermill 03_compute_connectivity.ipynb 03_compute_connectivity.$1_$2.exec.ipynb -p DEPTH $1 -p TIME $3 -p DT_H $4 -p TIME_LABEL $2"; }

pm 05m 00d-07d 00-07days 168 & pm 10m 00d-07d 00-07days 168 & wait
pm 15m 00d-07d 00-07days 168 & pm 05m 07d-14d 07-14days 168 & wait
pm 10m 07d-14d 07-14days 168 & pm 15m 07d-14d 07-14days 168 & wait
pm 05m 07d-28d 07-28days 504 & pm 10m 07d-28d 07-28days 504 & wait
pm 15m 07d-28d 07-28days 504 & wait
