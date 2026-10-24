---
name: sprint-board
description: The PM's board and integration skill. Mode board builds mission/BOARD.md (the only board) from the G1 decision at 10:20 — gates G1 to G6, back-calculated tasks T<n> with one owner, one owned file and checked dependencies, file ownership with write rules, a per-person budget, and the slot log Sales appends from 10:00 — and is confirmed at G2 10:35. Mode replan runs whenever a gate slips by more than 15 minutes and cuts scope without moving the 16:00 submission target. Mode integrate runs at G3 13:00, G4 14:45 and G5 15:30 and runs the cross rules X-1 to X-5 plus the PRD version check across PRD, app/SMOKE.md, EVIDENCE, PITCH, SUBMISSION and the board; every disagreement becomes one line in HANDOFF.md 「제안」 and the PM resolves it. Invoke with /sprint-board <board|replan|integrate>, or read this file and follow it if slash commands are unavailable.
requires:
  - (없음)
enhanced_by:
  - shell/git : copies templates/BOARD.md, commits mission/BOARD.md at G2, lists files changed since the last gate (git log --name-only), checks reported commits exist
  - python3 : scripts/validate_mission.py mission --stage board checks the board contract (C-B1 to C-B5); the decide, evidence and pitch stages and the final receipt stage back the integrate checks
  - Claude Code : reads mission/*.md, app/SMOKE.md, HANDOFF.md and log/ directly
degraded:
  - no file access : the PM pastes DECISION.md, PRD.md (and for integrate also app/SMOKE.md, EVIDENCE.md, PITCH.md, SUBMISSION.md); the board or the integrate report comes back as Markdown the PM saves
  - no python3 : the contract rules are checked by reading (list under Self-check) and reported per rule-id as PASS / FAIL / NOT_RUN 수동 점검, never as a validator PASS
  - no git : the PM (the board's owner) commits mission/BOARD.md through the GitHub web editor (repo → Add file / Edit → Commit to main) — the T0 relay (4 fields) only if web editing is blocked, because the relay is for non-owners. G2 evidence without git = the web commit visible on GitHub plus the deploy URL answering. File-change detection uses modified times
verified_on:
  - (미검증)
---

# sprint-board — board · replan · integrate

Status: `specified` (HTHn v1.1). Output language: **Korean**. Owner of `mission/BOARD.md`: the PM (우영) unless CONTRACT.md says otherwise — the only exception is the `## 슬롯` rows, which Sales appends.

`mission/BOARD.md` is the **only** board. There is no repo-root `BOARD.md`; if one exists, the PM deletes it in the G2 commit and tells the team in one line.

## Day anchors (never move later)

09:00 mission · G1 10:20 decision · G2 10:35 board + empty first deploy URL · 12:30 pitch skeleton · G3 13:00 core scene works · 14:00 build freeze · G4 14:45 test record + submit-gate precheck (no submission) · G5 15:30 two slides final + submit-gate final · G6 16:00 submission (target and ceiling) · 16:50 final limit (nothing is handed in after it; the old 16:30 hard stop is superseded). Slot watch: from 10:00 every hour, from 13:00 every 30 minutes. The official window closes at 17:00; 16:00–16:50 is an exception window and is never planned into. Override an anchor only if `mission/MISSION.md` `## 제출물` states a different official window — then tell the whole team in one line.

Degrade block (Korean, once, top of the first response) when something is missing:

```
[이 환경에는 python3가 없습니다]
 → 보드 계약(C-B1~C-B5)과 교차 규칙(X-1~X-5)을 직접 읽어 점검합니다. 결과는 규칙 ID마다 PASS / FAIL / NOT_RUN "수동 점검"으로 표기합니다.
 → 건너뛴 것: scripts/validate_mission.py 자동 검사. HANDOFF.md가 mode: event이면 push마다 CI가 mission/을 stage까지 다시 검사한다 (GitHub repo → Actions → check)
```

## Inputs

`mission/DECISION.md`, `mission/PRD.md`, `CONTRACT.md` (gate table, roles, default file owners, git rules, event-mode entry conditions), `templates/BOARD.md`, the current time, and on replan / integrate the existing `mission/BOARD.md`, `HANDOFF.md`, `log/`, `app/SMOKE.md`, `mission/EVIDENCE.md`, `mission/PITCH.md`, `mission/SUBMISSION.md`.

Always `git pull --rebase --autostash` before reading (if git exists). Never judge from a stale file.

## Mode board (10:20 → G2 10:35)

1. Copy `templates/BOARD.md` to `mission/BOARD.md` and fill only the `<...>` slots — every `<...>` (including `<n>`, `<HHMM>`, `E<n>`) is an empty value the validator rejects (C-empty). First line: `# BOARD — <YYYY-MM-DD> · 제출 목표 16:00 · 재계획 0회` — no slot count in the title (slots live only in `## 슬롯` rows, so Sales never edits a line the PM edits). The `데모 URL:` line under the title holds the demo link everyone reads (evidence-research, pitch-compile): Build reports it in HANDOFF 「체크포인트」 as `데모 URL <URL> · <HH:MM> · Build` and the PM copies it; before the first deploy write `없음 (T2 보류 <HH:MM>)`. Delete every `[예시]` row. Keep the required heading order exactly: `## 게이트` `## 작업` `## 파일 소유` `## 예산` `## 슬롯` (no heading twice).
2. `## 게이트` — columns `게이트 | 시각 | 확인 | 상태`, one row each for G1 10:20, G2 10:35, G3 13:00, G4 14:45, G5 15:30, G6 16:00 (copy 확인 from the CONTRACT.md gate table; G2's 확인 includes "빈 첫 배포 URL 존재"). G1 is `done` when the board is made; G2–G5 start `todo`. G1–G5 status ∈ `todo` `doing` `done` `blocked`. **G6 only** uses `ready` → `approved` → `submitted` (C-B1): it starts `ready`, the PM sets `approved` after a submit-gate verdict of approve / approve-with-defects, and `submitted` after the confirmation is saved. G6 is never `done`, and the verdict never waits for G6 (X-3 needs G1–G5 only).
3. `## 작업` — columns `# | 작업 | 담당 | 소유 파일 | 마감 | 게이트 | 의존 | 상태`. One row per task; `#` = `T<n>`, unique. 담당 holds exactly one **given name** from the CONTRACT.md 기본 배치 table (never a role word, never a comma). 의존 is `-` or existing T numbers separated by commas — no unknown number, no cycle (C-B2). 상태 ∈ `todo` `doing` `done` `blocked`. Start from each role kit's `## 내 시간표`. Mandatory rows (rename freely, keep the deadline and dependency shape):

   | # | 작업 | 담당(기본) | 소유 파일 | 마감 | 게이트 | 의존 |
   |---|---|---|---|---|---|---|
   | T1 | 보드·파일 소유·예산 확정 | 우영 | mission/BOARD.md | 10:35 | G2 | - |
   | T2 | 빈 첫 배포 — 골격 그대로 배포 URL 존재 (🚨 첫 공개 배포 승인) | 준서 | app/ | 10:35 | G2 | - |
   | T3 | `app/SMOKE.md` 3단계 + `## 완료 조건` (PRD 3·6 원문) | 준서 | app/SMOKE.md | 10:45 | G3 | - |
   | T4 | `app/tests` red 커밋 | 준서 | app/ | 11:00 | G3 | T3 |
   | T5 | EVIDENCE 「주장」 v1 (E1…) | 곤살로 | mission/EVIDENCE.md#주장 | 11:00 | G3 | - |
   | T6 | 피치 골격 — 2장 뼈대 + 주장 ID 목록 | 곤살로 | mission/PITCH.md | 12:30 | G5 | T5 |
   | T7 | 핵심 장면 배포 URL에서 작동 · 복구 스냅샷 | 준서 | app/ | 13:00 | G3 | T2,T4 |
   | T8 | freeze · fallback 재동기화 · `good-1400` 태그 | 준서 | app/ | 14:00 | G4 | T7 |
   | T9 | Buyer simulation v2 (S1…) | 태진 | mission/EVIDENCE.md#Buyer simulation | 14:45 | G4 | T7 |
   | T10 | MVP 테스트 기록 「테스트」 (실행은 준서) | 태진 | mission/SUBMISSION.md | 14:45 | G4 | T8 |
   | T11 | submit-gate precheck (체크 1~9, 제출 없음) | 태진 | mission/SUBMISSION.md | 14:45 | G4 | T6,T10 |
   | T12 | PITCH final + `pitch/slides.pdf` | 곤살로 | mission/PITCH.md | 15:30 | G5 | T6,T9 |
   | T13 | submit-gate final → 판정 | 태진 | mission/SUBMISSION.md | 15:45 | G6 | T11,T12 |
   | T14 | 슬롯 관측 — 10:00부터 매시, 13:00부터 30분 (append-only) | 태진 | mission/BOARD.md#슬롯 | 16:00 | G6 | - |
   | T15 | integrate 13:00 · 14:45 · 15:30 | 우영 | HANDOFF.md#제안 | 15:30 | G5 | - |

   These rows contain no `<...>` slot on purpose — copy them as they are. If MISSION 「제출물」 asks for PPTX, write `pitch/slides.pptx` in T12 and in 파일 소유 (event-rules U7 assumes PDF). **No deploy target (demo-build degraded):** T7 drops its dependency on T2 (`T4` only) and its 작업 text says `핵심 장면 로컬 작동 (배포 URL 없음 — 🚨 PM)`; it can reach `done` only as `done (로컬)` noted in 「체크포인트」, and G3 stays `blocked` until a URL exists.

4. `## 파일 소유` — columns `파일 | 소유 | 쓰기 규칙`, 쓰기 규칙 ∈ `소유자만` `append-only` (C-B3). 소유 is written `<역할>(<이름>)` (e.g. `Build(준서)`) — the same form as the template and the submit-gate 검사자 column; only 작업 담당 uses the bare given name. The template already holds every row — the ten required ones (`mission/MISSION.md` `mission/DECISION.md` `mission/PRD.md` `mission/BOARD.md` `mission/EVIDENCE.md#주장` `mission/EVIDENCE.md#Buyer simulation` `mission/PITCH.md` `mission/SUBMISSION.md` `app/` `HANDOFF.md#제안`) plus `mission/BOARD.md#슬롯 | Sales(태진) | append-only`, `mission/DEMODAY.md`, `pitch/slides.pdf`, `HANDOFF.md#체크포인트` and `HANDOFF.md#블로커` (both 전원 · append-only) — fill the names, do not add them again. Defaults: PM — MISSION, DECISION, PRD, BOARD · GTM — EVIDENCE#주장, PITCH, DEMODAY, slides · Sales — EVIDENCE#Buyer simulation, SUBMISSION, BOARD#슬롯 · Build — `app/` · `HANDOFF.md#제안` = 전원, `append-only` (each entry tagged `작성:<역할> <HH:MM>`; on conflict keep both). One file (or section), one owner — everyone else writes under HANDOFF.md 「제안」.
5. `## 예산` — columns `사람 | 세션 수 | 모델 | 잔여 중단선 | 시간 상한`, **one row per person, four rows** (C-B4). Recommended model: decisions/PRD/pitch → Opus; build iteration and tests → Sonnet; bulk formatting → Haiku. 잔여 중단선 = the remaining-credit level at which that person stops and asks the PM. Write a number only when the client actually shows a balance; when the amount is known (e.g. $500) but the form (U2) is not, write `크레딧 형태 미확인 — 속도 제한 첫 경고 시 PM · 14:45–16:00 예비 남김` and switch to a number as soon as the form shows a balance. 시간 상한 = the longest one task may run before the PM decides; the repair policy cap is `같은 실패 3회 · 합계 30분` (whichever comes first). All sessions run on the event-provided account only (CONTRACT 행사 모드 진입 조건); keep a reserve for the 14:45–16:00 fixes and checks.
6. `## 슬롯` — columns `시각 | 남은 슬롯 | 출처`, the last section of the file (C-B5). Zero rows is valid at G2; the 10:00 count, taken before the board exists, sits in HANDOFF.md 「체크포인트」 as `슬롯 <n> · <시각> · <출처>` and the PM copies it in as the first row at G2. Sales appends one row every hour from 10:00 and every 30 minutes from 13:00 — append only, never editing the title or older rows; 출처 says where the count came from (공지 · 운영진 · 화면). Slot counts justify finishing earlier, never later. 출처 is only what the recorder saw (`화면 직접 관측` · `운영진 공지`); a count heard second-hand goes to HANDOFF 「체크포인트」 as `슬롯 전언 <n> · <HH:MM> · <누구에게서>` until someone sees the screen. A late row keeps its own time and says `(HH:MM 늦게 기록)` at the end of 출처; a missed round is `<HH:MM> | 미관측 | -` (C-B5 checks HH:MM order and 0–8 or `미관측`). **Trigger:** when a new row shows `남은 슬롯 ≤ 2`, Sales asks the PM one 🚨 decision immediately — A: run submit-gate final now, and if F1–F5 (checks 1·3·4·5·10) PASS the PM hands it in by hand as approve-with-defects · B: continue — and the answer goes to HANDOFF 「결정」.
7. The first public deploy of the demo (T2) is one approval decision (CONTRACT.md 승인 형식, 🚨 one decision). If READINESS R8 pre-approved it before the event, write `사전 승인 R8 · <HH:MM>` in HANDOFF 「결정」 and do not ask again. Otherwise ask at 10:20 so the URL exists at G2 — and because the PM is the one asking, the PM does not answer it alone: another member (default Build; Sales if Build is the one deploying) answers ✓/✗ within 10 minutes, recorded as `결정자: PM · 확인: <역할>(<이름>) ✓`; no answer in 10 minutes = `보류` (CONTRACT.md 「승인 형식」).
8. Self-check (below), then `git add mission/BOARD.md && git commit -m "feat(board): G2" && git push` (delete a stray root `BOARD.md` with `git rm BOARD.md` in the same commit). Set the G2 row to `done` only after the push and only if the empty deploy URL answers (without git: the GitHub web commit is visible and the URL answers). The PM sets HANDOFF.md `stage: board` in the same commit. Tell each owner their rows in one Korean line each.

## Mode replan (any gate slips more than 15 minutes)

Allowed moves: narrow the core scene, drop a slide element, drop a simulation run, reassign an owner, move a gate earlier. Not allowed: moving 16:00 later, adding features after G3, splitting one file between two owners, editing a file you do not own, changing PRD sentences without the version rule. Increment `재계획 <n>회` in the title, keep finished rows and every `## 슬롯` row, re-date the rest, re-check 의존 for cycles, commit `fix(board): replan <n>`. Finishing before 16:00 as soon as submit-gate final says approve is always allowed.

**PRD version change.** If a replan narrows sentence 3, 4 or 6 after G2, the PM raises `버전: v<n+1> (<HH:MM>)` in `mission/PRD.md`, records old → new in HANDOFF.md 「결정」, and adds a task row for each affected owner (SMOKE → Build, PITCH → GTM) with 의존 on nothing and 마감 within 20 minutes. Those owners answer `✓ PRD v<n+1>` under the decision when their file matches.

## Mode integrate (PM at G3 13:00 · G4 14:45 · G5 15:30)

Purpose: the streams (PRD → demo → evidence → pitch → receipt) must tell one story before the gate is marked `done`. Integrate only **reads** other owners' files. It never edits them. The `X-*` IDs are the validator's cross rules with the validator's meaning, so a T0 manual run and a T2 run report the same IDs; `I-*` and `P-V` are integrate-only checks the validator does not emit.

| Check | What must agree | From gate |
|---|---|---|
| X-2 | PRD sentence 3 captured text appears verbatim in the body of `app/SMOKE.md` numbered step 2 (same scope as the validator and `node --test app/tests`) | G3 |
| X-4 | PRD sentence 6 captured text appears verbatim under SMOKE `## 완료 조건` | G3 |
| I-0 | every gate before the one being checked is `done` in `## 게이트`; every `done` task row has its owned file committed (integrate-only check — not a validator rule) | G3 |
| X-3 | validator meaning only: BOARD G1–G5 are all `done` before SUBMISSION `## 판정` is approve / approve-with-defects (G6 does not gate) | G5 |
| P-V | PRD version: if `버전` rose after G2, HANDOFF 「결정」 records the change and `✓ PRD v<n>` from the SMOKE and PITCH owners exist | G3 |
| I-1 | `app/SMOKE.md` 3 steps ↔ `app/tests` names ↔ what the deployed URL does (SMOKE `## 실행 기록`) | G3 |
| I-2 | `mission/SUBMISSION.md` `## 테스트` rows run the same 3 SMOKE steps; EVIDENCE simulation rows are `S<n>`, all labelled `simulation`, under the disclaimer line (C-E3, C-E4) | G4 |
| X-1 | every `주장 ID` in PITCH `## 라벨 점검` exists in EVIDENCE `## 주장` with the **same** label (no upgrades) | G5 |
| X-5 | the planned per-row checkers of SUBMISSION `## 체크` are not the owners of what they check: rows 1·2·8·9 ≠ `app/` owner · rows 3·5·6 ≠ `mission/PITCH.md` owner · row 5 also ≠ `mission/EVIDENCE.md#Buyer simulation` owner · rows 4·7·10 not empty (default 1·2·8·9 Sales, 3·5·6 PM, 4·7·10 Build) | G5 |
| I-3 | the demo URL and core scene on Slide 2 match the board and PRD sentences 3–6; no slide heading other than `## Slide 1` / `## Slide 2` | G5 |

Procedure:
0. **Task statuses.** Copy every `T<n> <상태> · 커밋 <hash>` line appended to HANDOFF.md 「체크포인트」 since the last integrate into the 상태 cell of that `## 작업` row (check that the commit exists with `git log`; without git the line carries `수정 <HH:MM>` instead of a hash). The validator's `X-6` WARN (board stage, also inside `scripts/check.sh` event-mission) lists every checkpoint status the board has not caught up with — do not wait for an integrate to clear it. The PM is the board's only writer; owners report, the PM records. **Stand-in:** if the PM is away at an integrate time, another member may run integrate, but reports step 0 only as 「제안」 lines (`작성:<역할> (PM 대행) <HH:MM>`) and never edits `mission/BOARD.md`.
1. `git pull --rebase --autostash`. Run the checks for the current gate and every earlier gate (G5 runs all ten).
2. T2: also run `python3 scripts/validate_mission.py mission --stage board` (G3), `--stage evidence` (G4), `--stage pitch` (G5). Quote any `FAIL` line with its rule-id. A check that could not run is `NOT_RUN`, never OK.
3. Output one line per check, Korean: `OK <ID> <한 줄>` · `MISMATCH <ID> <파일 A> ↔ <파일 B>: <차이> → 소유자 <역할>` · `NOT_RUN <ID> <이유>`.
4. For each MISMATCH or NOT_RUN append one line to HANDOFF.md 「제안」 (append only, at the end of that section): `[integrate G<n> <HH:MM>] <ID> <파일 A> ↔ <파일 B>: <차이> → <소유자 역할> · 제안: <수정 한 줄> · 작성:<역할> <HH:MM>` (`작성:PM`, or `작성:<역할> (PM 대행)` for a stand-in).
4b. The PM tells each owner in the team channel, one line per MISMATCH: `[integrate G<n>] <ID> <파일> → <역할>` — Build and GTM are heads-down and will not see 「제안」 until their next break.
5. The PM resolves each line: promote to 「결정」 with time (the owner then fixes their own file) or dismiss with one reason. The gate row becomes `done` only when no MISMATCH or NOT_RUN is open for that gate, or the PM has recorded an explicit 「결정」 to accept it. The PM raises HANDOFF.md `stage` as each gate passes (`evidence` after EVIDENCE v1, `pitch` at G5, `submit` when submit-gate final starts).
6. Commit `chore(board): integrate G<n>` (`mission/BOARD.md` and HANDOFF.md only).

## Self-check (validator or manual)

- T2: `python3 scripts/validate_mission.py mission --stage board` → `SUMMARY ... fail=0`. Read every `WARN` line (X-6 board drift, C-B5 slots ≤ 2) — they do not fail the run but need a person.
- Between G1 and Build's T3 (10:45) the node X-2/X-4 tests SKIP as `NOT_RUN` (SMOKE.md not yet aligned to the mission PRD) — expected, not a red build.
- T0: read and report each rule-id PASS / FAIL / NOT_RUN — S-dup-heading no required heading twice · C-B1 게이트 rows G1–G6 with columns `게이트|시각|확인|상태`, G1–G5 in `todo|doing|done|blocked`, G6 in `ready|approved|submitted` · C-B2 작업 columns as above, `T<n>` unique, one 담당 per row, 의존 `-` or existing T numbers, no cycle · C-B3 파일 소유 columns `파일|소유|쓰기 규칙`, all ten required rows, 쓰기 규칙 in `소유자만|append-only` · C-B4 예산 columns `사람|세션 수|모델|잔여 중단선|시간 상한`, four rows · C-B5 슬롯 columns `시각|남은 슬롯|출처`. Report `수동 점검 PASS n/6 · FAIL … · NOT_RUN …`.

## Do not

- Do not create or edit a repo-root `BOARD.md`. The board is `mission/BOARD.md`.
- Do not add a feature to the board after G3. Narrow instead.
- Do not write into `mission/` files, `app/` or HANDOFF.md sections you do not own; integrate writes only 「제안」 lines.
- Do not mark a gate `done` on someone's word. The file must be committed and the check must pass. Do not mark G6 `done` — it ends at `submitted`.

## 사람이 하는 일

- 10:20 우영(PM): 첫 공개 배포 🚨 승인을 바로 묻는다 (준서가 10:35까지 빈 앱 URL을 만든다).
- 10:35 우영: `mission/BOARD.md`를 팀 채널에 올리고 G2를 `done`으로 바꾼다 (빈 배포 URL이 열릴 때만). 각자 자기 행과 자기 예산 행만 본다.
- 10:00부터 매시, 13:00부터 30분마다 태진(Sales): `## 슬롯` 맨 아래에 `시각 | 남은 슬롯 | 출처` 한 행만 더한다 (머리줄·기존 행은 고치지 않는다). 남은 슬롯 ≤ 2이면 바로 우영에게 🚨.
- 각자: 예산표의 잔여 중단선이나 시간 상한(같은 실패 3회 · 합계 30분)에 닿으면 멈추고 우영에게 한 줄.
- 게이트가 15분 밀리면 우영이 `replan`을 돌린다. 기능을 더하지 않고 범위를 줄인다. 16:00은 늦추지 않는다. G2 뒤 PRD를 바꾸면 버전을 올리고 SMOKE·PITCH 소유자의 ✓를 받는다.
- 13:00 · 14:45 · 15:30 우영: `integrate`를 돌려 작업 상태를 옮기고, X-1~X-5 어긋남은 「제안」에 적고 팀 채널로 소유자에게 한 줄씩 알린 뒤 하나씩 「결정」으로 올리거나 기각한다. 남의 파일은 소유자가 고친다.

## Changes (v1.1)

- The only board is `mission/BOARD.md` (A4); a stray root `BOARD.md` is removed at G2.
- 게이트 rows G1–G6; G6 enum `ready → approved → submitted`, never `done` (A1, C-B1). 작업 rows `T<n>` with checked 의존 and no cycles (C-B2); mandatory rows now include the empty first deploy (10:35), the 12:30 pitch skeleton and the 14:45 submit-gate precheck (A5).
- 파일 소유 uses `파일|소유|쓰기 규칙` with the ten required rows and the EVIDENCE section split (GTM 주장 · Sales Buyer simulation) (C-B3); 예산 is per person with 잔여 중단선 and 시간 상한, 3 retries capped at 30 minutes in total (C-B4, C §9); 슬롯 gains 출처 and starts at 10:00 (C-B5).
- Integrate runs the validator's cross rules X-1 to X-5 (validator meaning) plus a PRD version check (P-V) and integrate-only checks I-0 (gate order) and I-1–I-3 (reading checks); NOT_RUN is reported, never treated as OK. Replan follows the PRD version change rule (C §4).
