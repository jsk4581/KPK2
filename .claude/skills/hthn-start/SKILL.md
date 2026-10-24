---
name: hthn-start
description: Entry skill of the HTHn team repo. Run it when you open the repo, come back after a break, or stop working. It detects your environment without asking, confirms your role, reads your role kit (roles/<role>.md), creates your personal 3-block instructions under me/ from templates/me-*.md, briefs you from HANDOFF.md / mission/BOARD.md / log/, and leaves a checkpoint when you stop. On event day OPEN first checks the event-mode entry conditions (event account, first allowed call logged, personal-account and other-AI fallback off) from evidence, without asking, and writes them as the first brief line. Every team member uses it; on event day it is the first action at 08:30. Invoke with /hthn-start [open|resume|close], or read this file and follow it if slash commands are unavailable.
requires:
  - (없음)
enhanced_by:
  - shell (bash/zsh/PowerShell) : environment detection in one command, changed-file listing, presence check of fallback-related environment variable names (never their values)
  - git                         : pull --rebase --autostash before read, commit+push checkpoint, commit hash as the checkpoint id
  - Claude Code                 : slash-command auto-discovery of .claude/skills/; a non-interactive account/status command, if the client offers one, for the event-account check
  - pre-event relay bot, if the team has one (never on event day) : Discord decisions appended to HANDOFF.md 「제안」
degraded:
  - no shell  : the AI reads files directly with its file tools. Environment is recorded as declared by the host; missing tools are assumed absent. Event-mode conditions it cannot see stay 미확인
  - no git    : before OPEN/RESUME ask the human to re-download the ZIP into a new folder (never extract over a folder with unsaved edits; copy me/ across) or to open HANDOFF.md and mission/BOARD.md on GitHub web. The brief carries 기준: ZIP <시각> — 이후 변경은 보이지 않음 (line 1, or line 2 right after the 행사 모드 line on event day / in a rehearsal). Writes go through the GitHub web editor or the T0 relay (4 fields, below); checkpoint id = file modified time, not a hash
  - git present but this folder is not a repository (`git rev-parse` fails — e.g. an unzipped copy or a sandbox) : treat as local-only. me/env.md says `git: 있음(저장소 아님)`; checkpoint id = modified time; the round-trip check is `NOT_RUN — 저장소 아님` (never PASS) until the log reaches GitHub through the web editor; tell the human once that a `git clone` of the team repo would remove this degrade
  - no file access (claude.ai web) : the human pastes the web (T0) paste set defined in CLAUDE.md (CLAUDE.md, CONTRACT.md, HANDOFF.md, mission/BOARD.md if it exists, roles/<role>.md, templates/me-*.md and this SKILL.md); the human saves the results into the repo
verified_on:
  - (미검증)
---

# hthn-start — open · resume · close

Status: `specified` (HTHn v1.1). Output language: **Korean** for everything the team reads. Code and file names stay in English.

## When to run

| Trigger | Mode |
|---|---|
| First time in the repo, the pre-event onboarding, or 08:30 on event day | OPEN |
| Coming back after a break, or after someone else pushed | RESUME |
| Leaving the keyboard, finishing a task, end of day | CLOSE |

## Rules that never change

1. Never overwrite a file wholesale. Append, or replace only the section this skill owns. If the file belongs to another role (see `mission/BOARD.md` `## 파일 소유`; before G2 the CONTRACT.md 기본 배치 table), write under HANDOFF.md 「제안」 instead.
2. Do not ask the user about OS, paths, installed tools or the logged-in account. Detect them; if you cannot, assume they are absent (or `미확인`) and take the degraded path.
3. Say what you skipped. If anything is missing, the first response carries one degrade block (format below). Silence is forbidden: "could not run" (`NOT_RUN`) is a different report from "passed" (`PASS`).
4. Never copy personal contact details (emails, phone numbers) into any file. Refer to people by role or given name only.
5. Do not cache "current state" in chat. State lives in HANDOFF.md and `mission/BOARD.md` — the only board (there is no repo-root BOARD.md; git is the source of truth, Discord is conversation).
6. On event day the Claude client must run on the **event-provided credits**, never a personal or company account, and nothing may fall back to another account or another AI. No other AI after the 09:00 mission release. Check this from evidence only (event-mode entry conditions below) and never infer it from memory, chat or habit: whatever you cannot confirm is `미확인`, and a member with any `미확인` stops making AI calls and goes to the PM.
7. Git integration rule (CONTRACT.md §git): one trunk (`main`); `git pull --rebase --autostash` before reading or writing; write only files you own; `git add <my files>` (never `-A`, never force-push), commit, `git push` right after writing; a rejected push is retried after another pull, at most 3 times; a remaining conflict is resolved by the file's owner; commit messages use `type(scope): what`. One writer per clone: while the human edits by hand, this AI does not write (and the reverse).

Degrade block format (Korean, once, at the top of the first response):

```
[이 환경에는 git이 없습니다]
 → GitHub 웹 편집기로 커밋합니다 (막히면 T0 중계 4항목으로 팀 채널에 붙이고 소유자가 반영). 결과는 같고 조금 느립니다.
 → 건너뛴 것: 커밋 해시 체크포인트 (수정 시각으로 대체) · 최신 상태 자동 반영 (기준: ZIP <시각>)
```

## Event-mode entry conditions (event day OPEN, before anything else)

CONTRACT.md 「행사 모드 진입 조건」. Each member's OPEN checks all three **without asking a question** and writes the result as the **first line of the brief**:

| # | Condition | Evidence the AI reads (never the human's answer to a question) |
|---|---|---|
| ① | The client is logged in with the event account | What the client exposes: a non-interactive account/status command the shell can run (print only the account or organization label, never a token), or the account line the host shows in this session. Desktop/web UIs the AI cannot read → `미확인` |
| ② | The first allowed call is logged | A `첫 허용 호출: <HH:MM>` line in one of my `log/<today>_<slug>_<n>.md` files. If none exists and ① is `yes` and ③ is `off`, this OPEN is that call: step 7 writes the line |
| ③ | Personal-account and other-AI fallback is OFF | Only the **names** of environment variables are checked, never their values: a personal API-key variable for this client or any other AI provider's key variable that is set → `on`. Client settings that route to another account or model provider → `on`. Nothing found and the shell ran → `off`. No shell → `미확인` |

First brief line (exact form, also written into my log):

`행사 모드: ① 행사 계정 <yes|미확인> · ② 최초 허용 호출 <HH:MM|미확인> · ③ 개인 계정·타 AI 폴백 <off|on|미확인>` (same format as `log/README.md` and `templates/log-entry.md`)

If any value is not `yes` / `<HH:MM>` / `off`: stop after the brief, make no further AI calls for work, and tell the member in one Korean line: `호출 중단 — 행사 모드 미확인 항목을 PM에게 알리세요 (설정 → 계정 직접 확인)`. The human checks the account screen themselves and reports to the PM, not to the AI. Before event day the line is `행사 모드: 행사 전 (해당 없음)`.

**Rehearsal.** When HANDOFF.md has `mode: event` **and** `rehearsal: true` and today is not 2026-10-24, there is no event account to check, so ① can never be `yes`. Write instead:

`행사 모드: 리허설 — ① 행사 계정 해당 없음 · ② 최초 허용 호출 <HH:MM|미확인> · ③ 개인 계정·타 AI 폴백 <off|on|미확인> (판정만 기록, 호출 중단 없음)`

Check only ③ (and log ②); stop AI calls only when ③ is `on`. Never use this form on 2026-10-24, and never without the `rehearsal: true` header (then the event-day rule above applies). submit-gate check 10 treats a rehearsal as `NOT_RUN` with `[SIMULATION 대체]`, never PASS (CONTRACT §C 10).

## OPEN

1. **Freshness.** If git exists: `git pull --rebase --autostash`. Record the resulting commit hash (`git rev-parse --short HEAD`). If not: ask the human to re-download the ZIP into a new folder or open HANDOFF.md / `mission/BOARD.md` on GitHub web, record "ZIP as of <download time>", and emit the degrade block.
   On event day run the event-mode entry conditions (above) now.
2. **Environment (do not ask).** Detect OS, Claude client, shell, git, node, and python: probe `python3`, `python`, `py -3` in that order and keep the first that runs Python ≥ 3.9 — record it as `python_cmd:` in `me/env.md` and use it for every validator call (on Windows `python3` is often a Store stub). Fill `templates/me-env.md` and write it to `me/env.md` as the `[내 환경]` block. Derive the tier: T0 (no shell/runtime), T1 (shell), T2 (node or python), T3 (host-only orchestration tools recorded only in that person's `me/env.md` — never used on event day, never written into shared files).
3. **Role.** Read the role table in `CONTRACT.md`. If `me/common.md` has no role yet, ask exactly one question:
   `역할을 고르세요: PM(pm) / 빌드(build) / GTM·피치(gtm-pitch) / 판매·구매자(sales-buyer)`
   Map the answer to the role slug and read `roles/<slug>.md` in full (R&R, environment setup, my skills, my files, my timetable, my TDD, when blocked).
4. **Personal instructions (me/, git-ignored).** From the templates, fill only the `<...>` slots:
   - `templates/me-common.md` → `me/common.md` `[HTHn 공통]`: repo path, `CONTRACT.md` pointer, role slug, role kit path `roles/<slug>.md`, my skills (copied from the role kit's `## 내 스킬`), my files (from `## 내 파일`). Regenerate on every OPEN.
   - `templates/me-env.md` → `me/env.md` `[내 환경]` (step 2). Discard and regenerate when the device changes.
   - `templates/me-style.md` → `me/style.md` `[나의 방식]`: create **only if absent** (the human owns it), with two defaults — answer in Korean, ask before reverting anything.
   If `templates/` is unreadable, write the three blocks with the headings above and tell the user (degrade block).
5. **Environment setup check (from the role kit).** Run the checks listed in `roles/<slug>.md` `## 환경 세팅 (행사 전)` that apply to the detected tier: at T2 `bash scripts/check.sh` (one `RESULT <id> <PASS|FAIL|NOT_RUN>` line per check, last line `CHECK 상태:`; exit 2 = a required check did not run — `NOT_RUN` is never PASS) or `node --test app/tests`; at T0 the deployed URL's `/tests/` page, or before the first deploy `app/fallback.html` opened by double-click with the 3 SMOKE steps done by hand. Report each as PASS / FAIL / NOT_RUN(이유). Never report a skipped check as PASS.
6. **Brief (3–7 lines, Korean).** Build it only from files, never from memory. Event day and rehearsal: line 1 is the `행사 모드:` line; without git, the `기준: ZIP` line comes next (line 2), otherwise it is line 1.
   - current stage and gate (HANDOFF.md `mode` · `stage` lines and 「현재 단계」)
   - board: if `mission/BOARD.md` does not exist yet (always before the event, and on event day before G2), write exactly `보드 없음 (G2 전)` and take my rows from `roles/<slug>.md` `## 내 시간표` only. Otherwise next gate and time left from `mission/BOARD.md` `## 게이트`; on event day compute against the timetable: 09:00 mission · G1 10:20 · G2 10:35 (empty first deploy URL exists) · 12:30 pitch skeleton · G3 13:00 · freeze 14:00 · 14:45 G4 + submit-gate precheck · G5 15:30 + submit-gate final · G6 16:00 target · 16:50 final limit · slot watch from 10:00 hourly, from 13:00 every 30 minutes
   - my open rows: `mission/BOARD.md` `## 작업` rows whose 담당 is my given name (from the CONTRACT.md 기본 배치 table for my role) — and my rows in `roles/<slug>.md` `## 내 시간표`
   - newest 「제안」 waiting for a decision (HANDOFF.md)
   - blockers and anything changed since my last checkpoint
7. **Round-trip check.** Fill `templates/log-entry.md` into `log/<YYYY-MM-DD>_<slug>_<n>.md` with three lines `상태 → 이유 → 바뀐 상태` (on event day add the `행사 모드:` line from the entry conditions and, when this OPEN is the first allowed call, `첫 허용 호출: <HH:MM>`). Read it back. If git exists: `git add log/<YYYY-MM-DD>_<slug>_<n>.md && git commit -m "chore(log): open <slug>" && git push`. If git is absent: output the log path and its lines in one fenced block and tell the user to commit it with the GitHub web editor (Add file → Create new file → Commit to `main`), or, if that is blocked, to relay it with the four T0 fields (below) for the PM. The round trip is done when the file shows on GitHub web. The degrade block names it: `왕복 검증 = GitHub 웹 커밋 (또는 T0 중계 → PM 반영)`. In a folder that is not a repository (git present, `git rev-parse` fails) the round trip is `NOT_RUN — 저장소 아님` until the same web-editor commit shows on GitHub. (`me/` contents are git-ignored; only `me/README.md` and `.gitkeep` are tracked.)
8. Report the brief and stop. Wait for the next instruction.

## RESUME

Same as OPEN, but skip steps 2–5 when `me/common.md` and `me/env.md` already exist (re-read `roles/<slug>.md` `## 내 시간표` only). On event day re-run the event-mode entry conditions (③ can change between sessions) and keep the `행사 모드:` line first. Freshness first: `git pull --rebase --autostash`, or without git ask the human to re-download the ZIP into a new folder (copy `me/` across, never extract over unsaved edits) or read HANDOFF.md / `mission/BOARD.md` on GitHub web — the brief's first line then is `기준: ZIP <시각> — 이후 변경은 보이지 않음`. Keep the brief to 5 lines (`보드 없음 (G2 전)` while there is no board) and add one line listing files changed since my last checkpoint (`git log --since=<checkpoint time> --name-only` or modified times).

## CLOSE / checkpoint

1. `git pull --rebase --autostash` first (if git exists).
2. Append to HANDOFF.md 「체크포인트」 one block: time · role · files changed · verification done (command and its PASS/FAIL/NOT_RUN result) · blockers · next step (one line each). Add one `T<n> <상태> · 커밋 <hash> · <역할>` line per `mission/BOARD.md` task row whose status changed (the PM copies it into the board). Include the commit hash after pushing.
3. Append a log entry (three lines, as in OPEN step 7; on event day keep the `행사 모드:` line).
4. `git add HANDOFF.md log/<YYYY-MM-DD>_<slug>_<n>.md && git commit -m "chore(handoff): checkpoint <slug>" && git push`. If any part fails, say so in a degrade block — never report the checkpoint as shared. Without git, use the GitHub web editor (or the T0 relay below).
5. After a rehearsal, the PM empties `mission/` (keep `README.md`; `mission/BOARD.md` goes too) and sets HANDOFF.md back to `mode: pre_event` with the stage line HANDOFF.md 「현재 단계」 prescribes, so the pre-event structure test applies again.

## Discord → HANDOFF and the T0 relay (manual sync)

A decision made in Discord is written by the person who made it under HANDOFF.md 「제안」 with the message link (append-only, each entry tagged `작성:<역할> <HH:MM>`; if two entries collide both are kept). The PM promotes it to 「결정」. Before the event an automated relay may append these; on event day only humans do this.

**T0 relay** (a member without git or without file access hands a change to the owner): the Discord message must carry all four fields, or the owner does not apply it.

```
기준 버전: <커밋 해시 또는 ZIP 받은 시각>
대상 경로: <repo 안 파일 경로#절>
변경 ID: <역할>-<HHMM>-<n>
반영 확인 요청: <소유자 역할> — 반영 후 커밋 해시로 답해 주세요
```

The owner reviews the change against the current file (never pastes a whole file over it), applies it, commits, and replies with the commit hash. Until that reply the change does not exist.

## 사람이 하는 일

- 행사 전(10/22~23): 각자 자기 `roles/<역할>.md`의 `## 환경 세팅 (행사 전)`을 따라 한 번 `/hthn-start`를 돌리고 왕복 검증(log 1건 — git push 또는 GitHub 웹 커밋)까지 끝낸다. 이때 브리핑의 보드 줄은 `보드 없음 (G2 전)`이 정상이다.
- 행사 당일 08:30 체크인 직후: 전원 `/hthn-start`. AI는 계정을 묻지 않고 확인할 수 있는 것만 확인한다 — 브리핑 첫 줄 `행사 모드:`에 `미확인`이 하나라도 있으면 **AI 호출을 멈추고** 설정 → 계정 화면을 직접 확인해 PM에게 말한다. 개인 계정·타 AI로 자동 전환되는 설정은 꺼 둔다.
- PM은 4명의 log에 `행사 모드: ① 행사 계정 yes · ② 최초 허용 호출 <HH:MM> · ③ 개인 계정·타 AI 폴백 off`가 있는지, 브리핑 4개가 같은 단계·같은 다음 게이트를 가리키는지 확인한다. 다르면 HANDOFF.md가 정본이다.
- 09:00–09:00 개회·세션 동안 환경 최종 점검. 미션은 09:00에 나온다.
- git이 없는 사람이 남의 파일을 바꾸고 싶으면 T0 중계 4항목(기준 버전·대상 경로·변경 ID·반영 확인 요청)을 채워 팀 채널에 올린다. 소유자가 반영하고 커밋 해시로 답한다.
- degrade 블록이 뜬 사람은 무엇이 빠졌는지 팀 채널에 한 줄 올린다.
- 자리를 뜰 때는 CLOSE를 돌린다. 체크포인트 없이 떠나지 않는다.

## Changes (v1.1)

- Canonical board is `mission/BOARD.md` only (A4); before G2 the brief says `보드 없음 (G2 전)` and takes rows from the role kit.
- Event-day OPEN checks the three event-mode entry conditions from evidence, without asking (A7): event account · first allowed call logged in `log/` · personal-account and other-AI fallback off; the result is the first brief line and any `미확인` stops AI calls until the PM clears it.
- T0 relay needs four fields (기준 버전 · 대상 경로 · 변경 ID · 반영 확인 요청) and the owner answers with a commit hash (CONTRACT §C-7); 「제안」 entries carry `작성:<역할> <HH:MM>`.
- Environment checks report `scripts/check.sh` `RESULT` lines as PASS / FAIL / NOT_RUN (A3); brief uses the v1.1 timetable (12:30 skeleton · 14:45 precheck · 16:50 final limit · slot watch from 10:00).
