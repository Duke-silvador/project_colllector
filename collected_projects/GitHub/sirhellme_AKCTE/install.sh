#!/bin/bash

cd data/raw/Kepler553
ls
bash kepler_lc_curl.txt

mv kepler_lc_curl.txt ../../raw/

cd ../../..

echo "File berhasil di unduh. Jumlah file di data/raw"
ls data/raw/Kepler553 | grep -c fits
