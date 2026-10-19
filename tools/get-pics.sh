#!/bin/bash
# Downloads any picture listed in pics.js that isn't in pics/ yet (Twemoji, CC-BY 4.0).
# Run from anywhere: tools/get-pics.sh   Then bump the version (tools/bump.sh).
cd "$(dirname "$0")/.."
mkdir -p pics
for code in $(grep -o "'[0-9a-f-]\{4,\}'" pics.js | tr -d "'" | sort -u); do
  [ -s "pics/$code.svg" ] && continue
  curl -fsSL "https://cdn.jsdelivr.net/gh/jdecked/twemoji@15.1.0/assets/svg/$code.svg" -o "pics/$code.svg" \
    && echo "got $code" || { echo "MISSING $code"; rm -f "pics/$code.svg"; }
done
