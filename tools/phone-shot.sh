#!/usr/bin/env bash
# Phone-viewport screenshots under headless Chrome, which clamps the window
# width to >=500px and eats ~87px of height: the app renders in a true WxH
# iframe pinned at the window origin instead. Everything right/below the
# iframe in the PNG is dead space — judge only the top-left WxH region.
# Usage: tools/phone-shot.sh OUT.png W H "/blorble/?query" [PROFILE_DIR]
set -euo pipefail
OUT=$1; W=$2; H=$3; APPURL=$4; PROFILE=${5:-$(mktemp -d)}
rm -f "$OUT"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SRV=$(mktemp -d)
ln -s "$ROOT/dist" "$SRV/blorble"
cat > "$SRV/shell.html" <<EOF
<!doctype html><meta charset="utf-8"><body style="margin:0;background:#888">
<iframe style="border:none;display:block;width:${W}px;height:${H}px" src="${APPURL}"></iframe>
EOF
PORT=$(( (RANDOM % 20000) + 20000 ))
CHROMEPID=""
python3 -m http.server "$PORT" -d "$SRV" >/dev/null 2>&1 &
SRVPID=$!
trap 'kill $CHROMEPID $SRVPID 2>/dev/null || true' EXIT
# our server must own the port — otherwise we would screenshot someone else's content
for _ in $(seq 1 20); do lsof -ti :"$PORT" 2>/dev/null | grep -qx "$SRVPID" && break; sleep 0.25; done
lsof -ti :"$PORT" 2>/dev/null | grep -qx "$SRVPID" || { echo "FAILED: http.server did not bind :$PORT"; exit 1; }
"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" --headless=new --disable-gpu \
  --hide-scrollbars --user-data-dir="$PROFILE" --window-size=$((W + 200)),$((H + 200)) \
  --screenshot="$OUT" "http://localhost:$PORT/shell.html" >/dev/null 2>&1 &
CHROMEPID=$!
for _ in $(seq 1 40); do [ -s "$OUT" ] && break; sleep 0.5; done
sleep 1
[ -s "$OUT" ] && echo "wrote $OUT (iframe ${W}x${H} at origin)" || { echo "FAILED: no screenshot"; exit 1; }
