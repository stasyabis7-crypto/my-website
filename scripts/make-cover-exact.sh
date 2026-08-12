#!/bin/bash
# Like make-cover.sh, but for animations whose own JS drives timing via
# `elapsed % duration` (confirmed in source) — the loop is already
# mathematically exact regardless of capture start phase, so no
# crossfade-seam blending is needed. Simpler + higher quality than the
# crossfade approach for these.
#
# Usage: scripts/make-cover-exact.sh <project-rel-html> <w> <h> <durationSeconds> <outFile> [bgColor] [embedTheme]
set -euo pipefail

PROJECT="$1"; W="$2"; H="$3"; DUR="$4"; OUT="$5"; BG="${6:-}"; EMBED_THEME="${7:-}"

TMP=$(mktemp -d)
trap 'rm -rf "$TMP"' EXIT

node scripts/record-loop.js "$PROJECT" "$W" "$H" "$DUR" "$TMP/raw.webm" "$BG" "$EMBED_THEME"
ffmpeg -y -loglevel error -i "$TMP/raw.webm" -c copy "$TMP/remux.webm"
ffmpeg -y -loglevel error -i "$TMP/remux.webm" -vf "scale=${W}:${H}" -c:v libx264 -pix_fmt yuv420p -crf 20 -preset slow -movflags +faststart -an "$OUT"

echo "Wrote $OUT"
