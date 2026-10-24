#!/usr/bin/env bash
# start.sh — start the brain HTTP server in the background and print /v1/health.
# Writes the pid to brain/.brain.pid and the log to brain/brain.log (*.log is gitignored).
set -euo pipefail

BRAIN_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$BRAIN_DIR"

PID_FILE=".brain.pid"
LOG_FILE="brain.log"
PORT="${PORT:-8787}"
HEALTH_URL="http://127.0.0.1:${PORT}/v1/health"

if [[ -f "$PID_FILE" ]] && kill -0 "$(cat "$PID_FILE")" 2>/dev/null; then
  echo "already running (pid $(cat "$PID_FILE")) — $HEALTH_URL"
  curl -s "$HEALTH_URL" || true
  echo
  exit 0
fi

rm -f "$PID_FILE"
nohup node mcp/bin.js >> "$LOG_FILE" 2>&1 &
echo $! > "$PID_FILE"
echo "started pid $(cat "$PID_FILE") on port $PORT (log: $LOG_FILE)"

for _ in $(seq 1 30); do
  if curl -sf "$HEALTH_URL" >/dev/null 2>&1; then
    curl -s "$HEALTH_URL"
    echo
    exit 0
  fi
  if ! kill -0 "$(cat "$PID_FILE")" 2>/dev/null; then
    break
  fi
  sleep 0.2
done

echo "health check failed — last log lines:" >&2
tail -n 20 "$LOG_FILE" >&2 || true
rm -f "$PID_FILE"
exit 1
