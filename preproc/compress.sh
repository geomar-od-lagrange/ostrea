#!/usr/bin/env bash

mkdir -p input_comp/
for f in input/**/*.nc; do
    echo "${f}"
    f_="$(basename "$f")"
    nccopy -d1 -s "$f" "input_comp/${f_}";
    echo "... done"
done