#!/usr/bin/env bash
# CI entry point (.github/workflows/check.yml runs this on every push and pull request).
#
# Runs scripts/check.sh --strict: every check is required, and when HANDOFF.md says "mode: event"
# the real mission/ is validated up to HANDOFF's "stage:" (not only the fixtures).
# The first and the last line name the commit, mode and stage that were checked, so a submit-gate
# NOT_RUN can be resolved only by the CI result of the same commit (v1.1 A3):
#   CI commit=<sha> mode=<pre_event|event> stage=<stage|->
#   CI RESULT commit=<sha> mode=<mode> stage=<stage> status=PASS|FAIL|NOT_RUN exit=<0|1|2>
# Exit code is check.sh's: 0 PASS · 1 FAIL · 2 a required check did NOT_RUN.

set -u
SCRIPT_DIR="${0%/*}"
[ "$SCRIPT_DIR" = "$0" ] && SCRIPT_DIR="."
cd "$SCRIPT_DIR/.." || exit 2

commit="${GITHUB_SHA:-}"
if [ -z "$commit" ] && command -v git >/dev/null 2>&1; then
  commit="$(git rev-parse --short HEAD 2>/dev/null || true)"
fi
commit="${commit:-unknown}"

# HANDOFF.md front matter: the first "mode:" and "stage:" lines in the first 30 lines (pure bash).
MODE=""
STAGE=""
if [ -f HANDOFF.md ]; then
  n=0
  while IFS= read -r line && [ $n -lt 30 ]; do
    n=$((n + 1))
    line="${line%$'\r'}"
    case "$line" in
      mode:*) [ -z "$MODE" ] && { MODE="${line#mode:}"; MODE="${MODE// /}"; } ;;
      stage:*) [ -z "$STAGE" ] && { STAGE="${line#stage:}"; STAGE="${STAGE// /}"; } ;;
    esac
  done < HANDOFF.md
fi
MODE="${MODE:-pre_event}"
STAGE="${STAGE:--}"

echo "CI commit=${commit} mode=${MODE} stage=${STAGE}"
bash scripts/check.sh --strict
rc=$?
case $rc in
  0) status=PASS ;;
  1) status=FAIL ;;
  *) status=NOT_RUN ;;
esac
echo "CI RESULT commit=${commit} mode=${MODE} stage=${STAGE} status=${status} exit=${rc}"
exit $rc
