#!/bin/bash
# One-off pipeline: record a works/*/index.html animation loop and encode it
# to a grid-ready mp4. Wraps record-loop.js + the crossfade-seam ffmpeg
# recipe worked out for slots 14/15. Not part of the site runtime.
#
# Usage: scripts/make-cover.sh <project-rel-html> <w> <h> <captureDuration> <outFile> [bgColor] [embedTheme]
#
# captureDuration: raw seconds to record. The tail 0.6s is cross-faded into
# the head 0.6s to mask the loop seam (see slot14 for why: most of these
# animations aren't on a single clean period, so an exact-frame loop isn't
# achievable — the blend hides it). Output duration = captureDuration - 0.6.
set -euo pipefail

PROJECT="$1"; W="$2"; H="$3"; DUR="$4"; OUT="$5"; BG="${6:-}"; EMBED_THEME="${7:-}"
SEAM=0.6
TAIL_START=$(python3 -c "print($DUR - $SEAM)")

TMP=$(mktemp -d)
trap 'rm -rf "$TMP"' EXIT

node scripts/record-loop.js "$PROJECT" "$W" "$H" "$DUR" "$TMP/raw.webm" "$BG" "$EMBED_THEME"
ffmpeg -y -loglevel error -i "$TMP/raw.webm" -c copy "$TMP/remux.webm"
ffmpeg -y -loglevel error -i "$TMP/remux.webm" -filter_complex "
[0:v]trim=${SEAM}:${TAIL_START},setpts=PTS-STARTPTS[middle];
[0:v]trim=${TAIL_START}:${DUR},setpts=PTS-STARTPTS[tail];
[0:v]trim=0:${SEAM},setpts=PTS-STARTPTS[head];
[tail][head]xfade=transition=fade:duration=${SEAM}:offset=0[seam];
[middle][seam]concat=n=2:v=1:a=0[cat];
[cat]scale=${W}:${H}[out]
" -map "[out]" -c:v libx264 -pix_fmt yuv420p -crf 16 -preset slow -movflags +faststart -an "$OUT"

echo "Wrote $OUT"
