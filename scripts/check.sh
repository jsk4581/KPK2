#!/usr/bin/env bash
# HTHn local check: runs every check this machine can run and says out loud what did not run.
#
# Output: one "RESULT <id> PASS|FAIL|NOT_RUN [reason]" line per check, then one "CHECK 상태:" line.
#   ids: unittest · validate-good · validate-bad · pii · node-tests · event-mission
# Exit:  1 = a check FAILed
#        2 = a required check did NOT_RUN (NOT_RUN is never PASS)
#        0 = every required check PASSed (optional NOT_RUN checks are still listed)
# Required: unittest, pii, and event-mission when HANDOFF.md says "mode: event".
# --strict (used by scripts/ci.sh): every check is required, except event-mission before the event.
# --stage <intake|decide|board|evidence|pitch|submit>: validate mission/ up to this stage instead of
#   HANDOFF's "stage:" (submit-gate final runs `check.sh --stage submit` — the checker cannot raise
#   HANDOFF's stage, the PM does). Without it, a receipt whose 판정 is already approve /
#   approve-with-defects / fail while HANDOFF lags below submit is validated at submit anyway, with a WARN.
#
# Uses only bash builtins besides the interpreters it probes, so it degrades instead of crashing.

set -u
# PYTHONDONTWRITEBYTECODE keeps scripts/ and tests/ free of __pycache__ in the team repo.
export PYTHONUTF8=1 PYTHONIOENCODING=utf-8 PYTHONDONTWRITEBYTECODE=1

SCRIPT_DIR="${0%/*}"
[ "$SCRIPT_DIR" = "$0" ] && SCRIPT_DIR="."
cd "$SCRIPT_DIR/.." || exit 2

STRICT=0
STAGE_OVERRIDE=""
while [ $# -gt 0 ]; do
  case "$1" in
    --strict) STRICT=1 ;;
    --stage) shift; STAGE_OVERRIDE="${1:-}" ;;
    --stage=*) STAGE_OVERRIDE="${1#--stage=}" ;;
  esac
  shift
done

STAGES=(intake decide board evidence pitch submit)
IDS=()
STATUS=()
NOTES=()

record() {
  # $1 = id, $2 = PASS|FAIL|NOT_RUN, $3 = note
  IDS+=("$1")
  STATUS+=("$2")
  NOTES+=("${3:-}")
}

run_check() {
  # $1 = id, rest = command; PASS when the command exits 0
  local id="$1"
  shift
  echo ""
  echo "== ${id}"
  echo "\$ $*"
  if "$@"; then record "$id" PASS; else record "$id" FAIL "exit $?"; fi
}

# ---------- HANDOFF.md mode / stage (pure bash) ----------
MODE=""
STAGE=""
REHEARSAL=""
PRE_INTAKE=0
if [ -f HANDOFF.md ]; then
  n=0
  while IFS= read -r line && [ $n -lt 30 ]; do
    n=$((n + 1))
    line="${line%$'\r'}"
    case "$line" in
      mode:*) [ -z "$MODE" ] && { MODE="${line#mode:}"; MODE="${MODE// /}"; } ;;
      stage:*) [ -z "$STAGE" ] && { STAGE="${line#stage:}"; STAGE="${STAGE// /}"; } ;;
      rehearsal:*) [ -z "$REHEARSAL" ] && { REHEARSAL="${line#rehearsal:}"; REHEARSAL="${REHEARSAL// /}"; } ;;
    esac
  done < HANDOFF.md
fi
[ -z "$MODE" ] && MODE="pre_event"
# Event day is fixed (CONTRACT.md). HTHN_TODAY overrides the clock for tests; bash 3.2 has no
# printf %(...)T, so the date is then unknown and the event-day guard is skipped (said out loud).
TODAY="${HTHN_TODAY:-}"
[ -z "$TODAY" ] && { printf -v TODAY '%(%Y-%m-%d)T' -1 2>/dev/null || TODAY=""; }
EVENT_DAY="2026-10-24"

# ---------- receipt verdict (pure bash): the first non-blank line under "## 판정" ----------
VERDICT=""
if [ -f mission/SUBMISSION.md ]; then
  in_verdict=0
  while IFS= read -r line; do
    line="${line%$'\r'}"
    if [ $in_verdict -eq 1 ]; then
      case "$line" in
        "## "*) break ;;
        ""|"<!--"*|">"*) continue ;;
        *) VERDICT="${line%% *}"; break ;;
      esac
    fi
    [ "$line" = "## 판정" ] && in_verdict=1
  done < mission/SUBMISSION.md
fi

STAGE_NOTE=""
EFFECTIVE_STAGE="$STAGE"
if [ -n "$STAGE_OVERRIDE" ]; then
  EFFECTIVE_STAGE="$STAGE_OVERRIDE"
  STAGE_NOTE=" (--stage ${STAGE_OVERRIDE} · HANDOFF stage=${STAGE:--})"
elif [ "$MODE" = "event" ] && [ "$STAGE" != "submit" ]; then
  case "$VERDICT" in
    approve|approve-with-defects|fail)
      EFFECTIVE_STAGE="submit"
      STAGE_NOTE=" (영수증 판정 ${VERDICT} — HANDOFF stage=${STAGE:--} 대신 submit으로 검사)"
      ;;
  esac
fi

echo "HTHn check — $(pwd)"
echo "mode=${MODE} stage=${STAGE:--}${STAGE_NOTE}$([ "$REHEARSAL" = "true" ] && echo ' · rehearsal')$([ $STRICT -eq 1 ] && echo ' · strict')"
if [ -n "$STAGE_NOTE" ] && [ -z "$STAGE_OVERRIDE" ]; then
  echo "WARN HANDOFF stage=${STAGE:--} 가 영수증보다 늦다 — PM이 'stage: submit'으로 올린다. 그 전까지 이 검사는 submit 기준이다."
fi

# ---------- python: probe python3, python, py -3 (>= 3.9) ----------
# The macOS /usr/bin/python3 stub and the Windows Store python3 alias exist without a usable
# interpreter, so each candidate is run, not just looked up.
PY=()
for cand in "python3" "python" "py -3"; do
  read -r -a parts <<< "$cand"
  if command -v "${parts[0]}" >/dev/null 2>&1 \
     && "${parts[@]}" -c 'import sys; sys.exit(0 if sys.version_info >= (3, 9) else 1)' >/dev/null 2>&1; then
    PY=("${parts[@]}")
    break
  fi
done

degrade_block() {
  # $1 = missing tool, $2 = what replaces it, $3 = skipped checks
  echo ""
  echo "[이 환경에는 $1가 없습니다]"
  echo " → $2"
  echo " → 건너뛴 것: $3 (NOT_RUN — PASS가 아닙니다)"
}

if [ ${#PY[@]} -gt 0 ]; then
  echo "python: ${PY[*]} → $("${PY[@]}" --version 2>&1)"
  if [ "${HTHN_CHECK_NESTED:-}" = "1" ]; then
    record unittest NOT_RUN "중첩 실행 방지 (HTHN_CHECK_NESTED=1)"
  else
    # HTHN_CHECK_NESTED stops tests that run check.sh from re-running this suite (no `env`: PATH may be bare).
    export HTHN_CHECK_NESTED=1
    run_check unittest "${PY[@]}" -m unittest discover -s tests -v
    unset HTHN_CHECK_NESTED
  fi
  run_check validate-good "${PY[@]}" scripts/validate_mission.py tests/fixtures/missions/good-01 --stage all

  # The bad fixture must be rejected: exit 1 is the expected result.
  echo ""
  echo "== validate-bad (FAIL이 나와야 PASS)"
  out="$("${PY[@]}" scripts/validate_mission.py tests/fixtures/missions/bad-01 --stage all 2>&1)"
  rc=$?
  echo "${out##*$'\n'}"
  if [ $rc -eq 1 ]; then record validate-bad PASS; else record validate-bad FAIL "exit ${rc} (기대 1)"; fi

  run_check pii "${PY[@]}" scripts/pii_scan.py .
else
  degrade_block "python(3.9 이상 — python3·python·py -3 모두 시도)" \
    "CI(GitHub repo → Actions → check)가 push마다 같은 검사를 돌립니다. mode: event이면 mission/도 CI가 검사합니다." \
    "unittest · validate-good · validate-bad · pii · event-mission"
  record unittest NOT_RUN "python 없음"
  record validate-good NOT_RUN "python 없음"
  record validate-bad NOT_RUN "python 없음"
  record pii NOT_RUN "python 없음"
fi

# ---------- event mode: the real mission/ up to HANDOFF stage ----------
if [ "$MODE" = "event" ] && [ "$REHEARSAL" = "true" ] && [ "$TODAY" = "$EVENT_DAY" ]; then
  record event-mission FAIL "HANDOFF.md 'rehearsal: true' 가 행사일(${EVENT_DAY})에 남아 있다 — PM이 지운다 (CONTRACT §C 10)"
elif [ "$MODE" = "event" ]; then
  [ "$REHEARSAL" = "true" ] && [ -z "$TODAY" ] && echo "WARN 날짜를 못 읽어 'rehearsal: true' 행사일 확인을 건너뜀 (bash 3.2)"
  valid=0
  for s in "${STAGES[@]}"; do [ "$s" = "$EFFECTIVE_STAGE" ] && valid=1; done
  if [ $valid -eq 0 ]; then
    record event-mission FAIL "stage '${EFFECTIVE_STAGE}' 가 intake|decide|board|evidence|pitch|submit 중 하나가 아님 (HANDOFF.md 또는 --stage)"
  elif [ "$EFFECTIVE_STAGE" = "intake" ] && [ ! -f mission/MISSION.md ]; then
    # Right after the PM flips mode to event (09:00) there is no MISSION.md yet: not a failure, just not run.
    PRE_INTAKE=1
    record event-mission NOT_RUN "mission/MISSION.md 생성 전 — 09:00 원문 붙여넣기 뒤 다시 검사 (생성 후에는 필수)"
  elif [ ${#PY[@]} -eq 0 ]; then
    record event-mission NOT_RUN "python 없음 — CI가 검사"
  else
    # submit re-checks every earlier stage itself; other stages are checked cumulatively here.
    failed=0
    warns=0
    for s in "${STAGES[@]}"; do
      [ "$EFFECTIVE_STAGE" = "submit" ] && [ "$s" != "submit" ] && continue
      echo ""
      echo "== event-mission: mission/ --stage ${s}"
      out="$("${PY[@]}" scripts/validate_mission.py mission --stage "$s" 2>&1)" || failed=1
      echo "$out"
      while IFS= read -r line; do
        case "$line" in WARN\ *) warns=$((warns + 1)) ;; esac
      done <<< "$out"
      [ "$s" = "$EFFECTIVE_STAGE" ] && break
    done
    note="mission/ ~${EFFECTIVE_STAGE}${STAGE_NOTE}"
    [ $warns -gt 0 ] && note="${note} · WARN ${warns}건 (위 WARN 줄을 읽는다)"
    if [ $failed -eq 0 ]; then record event-mission PASS "$note"; else record event-mission FAIL "$note"; fi
  fi
else
  record event-mission NOT_RUN "mode=${MODE} — 행사 전에는 mission/을 검사하지 않음 (필수 아님)"
fi

# ---------- node: app tests ----------
shopt -s nullglob
APP_TESTS=(app/tests/*.test.mjs)
shopt -u nullglob
if command -v node >/dev/null 2>&1; then
  echo ""
  echo "node: $(node --version 2>&1)"
  if [ ${#APP_TESTS[@]} -gt 0 ]; then
    run_check node-tests node --test "${APP_TESTS[@]}"
  else
    record node-tests FAIL "app/tests/*.test.mjs 없음"
  fi
else
  degrade_block "node" \
    "CI가 push마다 app 테스트를 돌립니다. 손으로는 배포 URL의 /tests/ 를 열거나, 배포 전이면 app/fallback.html을 더블클릭해 SMOKE 3단계를 확인합니다." \
    "node-tests"
  record node-tests NOT_RUN "node 없음 → CI 또는 배포 URL /tests/"
fi

# ---------- summary ----------
is_required() {
  case "$1" in
    unittest|pii) return 0 ;;
    event-mission) [ "${PRE_INTAKE:-0}" = "1" ] && return 1; [ "$MODE" = "event" ] && return 0; return 1 ;;
    *) [ $STRICT -eq 1 ] && return 0; return 1 ;;
  esac
}

echo ""
echo "== 요약"
n_fail=0
n_ran=0
missing=()
optional=()
for i in "${!IDS[@]}"; do
  echo "RESULT ${IDS[$i]} ${STATUS[$i]}${NOTES[$i]:+ ${NOTES[$i]}}"
  case "${STATUS[$i]}" in
    FAIL) n_fail=$((n_fail + 1)); n_ran=$((n_ran + 1)) ;;
    PASS) n_ran=$((n_ran + 1)) ;;
    NOT_RUN)
      if is_required "${IDS[$i]}"; then missing+=("${IDS[$i]}"); else optional+=("${IDS[$i]}"); fi ;;
  esac
done

if [ $n_fail -gt 0 ]; then
  echo "CHECK 상태: FAIL — 실패 ${n_fail}건 (실행 ${n_ran}건)"
  exit 1
fi
if [ ${#missing[@]} -gt 0 ]; then
  echo "CHECK 상태: NOT_RUN — 필수 검사 ${missing[*]} 가 돌지 않았습니다 (실행 ${n_ran}건). PASS 아님"
  exit 2
fi
echo "CHECK 상태: PASS — 필수 검사 전부 PASS (실행 ${n_ran}건)${optional[*]:+ · NOT_RUN ${#optional[@]}건: ${optional[*]}}"
exit 0
