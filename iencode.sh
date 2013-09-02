#!/bin/bash

# configure cwebp location if not in PATH
CWEBP=cwebp
# configure flags
CWEBP_FLAGS="-m 6"

set -e

cd $(dirname $0)/www/dump

iencode() {
  EXT="$1"
  QUAL="$2"
  export EXT QUAL CWEBP CWEBP_FLAGS
  set -x
  find . -name \*."${EXT}" -print0 | xargs -0 -P ${THREADS} -n 1 bash -c '
    IN="$0"
    OUT="${IN%.${EXT}}.webp"
    [[ -f ${OUT} ]] || ${CWEBP} -q "${QUAL}" ${CWEBP_FLAGS} ${IN} -o ${OUT}
  '
}

iencode jpg 90
iencode png 99

if hash zopflipng; then
  find . -name \*.png -print0 | xargs -0 -I '{}' -P ${THREADS} zopflipng -my '{}' '{}'
else
  echo >&2 "Install zopfli (https://code.google.com/p/zopfli/) to improve PNG compression."
  echo >&2 "Approximately 2% savings can be seen across the board, with no cost to quality."
fi