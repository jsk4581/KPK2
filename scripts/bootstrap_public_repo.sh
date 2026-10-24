#!/usr/bin/env bash
# bootstrap_public_repo.sh — event day, 10:00 or later: create the NEW public repo from this harness with ONE commit.
#
# Usage:  bash scripts/bootstrap_public_repo.sh <repo-name> [github-owner]      (default owner: Roykoo83)
# Result: ~/<repo-name> with a single commit tagged `pre-event`, pushed to a new public GitHub repo.
#
# Organizer rules (2026-10-24): code only after 10:00 in a new public repo; pre-existing code must be disclosed
# in the submission form. This script copies the process harness + empty app skeleton (no product features),
# prepends a bilingual disclosure to README.md, and refuses to run before 10:00 local time.
# It never copies secrets (.env*, keys are gitignored and excluded), `me/`, `tests/sim/`, caches, or zips.
# Requires: git, rsync, gh (logged in to the owner account).
set -euo pipefail

NAME="${1:?usage: bootstrap_public_repo.sh <repo-name> [owner]}"
OWNER="${2:-Roykoo83}"
SRC="$(cd "$(dirname "$0")/.." && pwd)"
DST="$HOME/$NAME"
NOW="$(date +%H:%M)"
HHMM="$(date +%H%M)"

if [ "${HTHN_BOOTSTRAP_FORCE:-0}" != "1" ] && [ "$HHMM" -lt 1000 ]; then
  echo "refusing: it is $NOW — organizer rule says the new repo starts at 10:00 (set HTHN_BOOTSTRAP_FORCE=1 only for a dry run elsewhere)"; exit 1
fi
if [ -e "$DST" ]; then echo "refusing: $DST already exists"; exit 1; fi
command -v gh >/dev/null || { echo "gh CLI not found — create the public repo on github.com and push manually (see docs/event-day-official.md §2)"; exit 1; }

mkdir -p "$DST"
rsync -a \
  --exclude '.git' --exclude 'tests/sim' --exclude 'me/' --exclude 'mission/*' \
  --exclude '__pycache__' --exclude 'node_modules' --exclude '*.zip' --exclude '.DS_Store' \
  --exclude '.env' --exclude '.env.*' --exclude 'app/.env*' --exclude '*.pem' --exclude '*.key' \
  "$SRC/" "$DST/"
mkdir -p "$DST/mission" && cp "$SRC/mission/README.md" "$DST/mission/README.md"

{
cat <<DISC
> **Disclosure (Ambition for Korea, 2026-10-24).** This repository was created at ${NOW} on event day. Its first commit (tag \`pre-event\`) imports our team's **process harness** prepared before the event — contract, role guides, skill prompts, templates, validators, CI — and an **empty app skeleton with no product features** (\`app/\`). All product code is written after 10:00 in the commits that follow that tag: \`git diff --stat pre-event..HEAD -- app/\`. The same statement is entered in the submission form ("기존에 만들어 둔 코드나 제품을 일부 가져왔어요").
>
> **사전 준비물 공개.** 이 레포는 행사 당일 ${NOW}에 만들었다. 첫 커밋(\`pre-event\` 태그)은 행사 전에 준비한 **팀 프로세스 하네스**(계약·역할 가이드·스킬·템플릿·검증기·CI)와 **제품 기능이 없는 빈 앱 골격**이다. 제품 코드는 전부 그 뒤 커밋에서 썼다.

DISC
cat "$SRC/README.md"
} > "$DST/README.md"

cd "$DST"
git init -q -b main
git add -A
git commit -q -m "chore: import team process harness (pre-event, disclosed in README and submission form)"
git tag pre-event
gh repo create "$OWNER/$NAME" --public --source=. --remote=origin --push
git push -q origin pre-event
echo "OK  https://github.com/$OWNER/$NAME"
echo "팀원: git clone https://github.com/$OWNER/$NAME.git  → 그 clone에서 /hthn-start"
