#!/usr/bin/env bash
# stop.sh — stop the brain HTTP server started by start.sh (kills by pid file).
set -euo pipefail

BRAIN_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$BRAIN_DIR"

PID_FILE=".brain.pid"

if [[ ! -f "$PID_FILE" ]]; then
  echo "not running (no $PID_FILE)"
  exit 0
fi

PID="$(cat "$PID_FILE")"
if ! kill -0 "$PID" 2>/dev/null; then
  echo "stale pid file (pid $PID not running) — removed"
  rm -f "$PID_FILE"
  exit 0
fi

kill "$PID"
for _ in $(seq 1 25); do
  if ! kill -0 "$PID" 2>/dev/null; then
    rm -f "$PID_FILE"
    echo "stopped pid $PID"
    exit 0
  fi
  sleep 0.2
done

kill -9 "$PID" 2>/dev/null || true
rm -f "$PID_FILE"
echo "force-stopped pid $PID"
