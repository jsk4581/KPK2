#!/usr/bin/env bash
# status.sh — print /v1/health and the public tunnel URL (from the cloudflared log) if present.
set -uo pipefail

BRAIN_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$BRAIN_DIR"

PID_FILE=".brain.pid"
PORT="${PORT:-8787}"
HEALTH_URL="http://127.0.0.1:${PORT}/v1/health"
TUNNEL_LOG="${TUNNEL_LOG:-$BRAIN_DIR/../context/tunnel/cloudflared.log}"

if [[ -f "$PID_FILE" ]] && kill -0 "$(cat "$PID_FILE")" 2>/dev/null; then
  echo "process: running (pid $(cat "$PID_FILE"))"
else
  echo "process: not running (no live pid in $PID_FILE)"
fi

if HEALTH="$(curl -sf --max-time 3 "$HEALTH_URL")"; then
  echo "health:  $HEALTH"
else
  echo "health:  unreachable at $HEALTH_URL"
fi

if [[ -f "$TUNNEL_LOG" ]]; then
  TUNNEL_URL="$(grep -o 'https://[a-z0-9-]*\.trycloudflare\.com' "$TUNNEL_LOG" | tail -n 1 || true)"
  if [[ -n "$TUNNEL_URL" ]]; then
    echo "tunnel:  $TUNNEL_URL  (mcp: $TUNNEL_URL/mcp · health: $TUNNEL_URL/v1/health)"
  else
    echo "tunnel:  log present but no trycloudflare URL found"
  fi
else
  echo "tunnel:  no cloudflared log at $TUNNEL_LOG"
fi
