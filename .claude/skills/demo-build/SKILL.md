---
name: demo-build
description: Builds the one core action from PRD sentence 3 into a deployed public web demo, test first. Mode build (10:20–14:00) makes the empty first deploy so the URL exists by G2 10:35, writes app/SMOKE.md by 10:45 (step 2 quotes PRD sentence 3 verbatim, 완료 조건 quotes sentence 6 verbatim) and red app/tests by 11:00, then writes the code until they pass (green), keeps the public-demo rules (no login, reset, error banner, no API keys in the browser), takes a recovery snapshot (git tag good-HHMM or an app/ ZIP) at every good point, reaches G3 at 13:00 and freezes at 14:00 with a re-synced static fallback. Mode test (14:00–14:45) runs the 3 smoke steps on the deployed URL three times while the Sales role records them in mission/SUBMISSION.md for G4. Bounded repair policy — three strikes or 30 minutes in total, then the PM decides a scope cut. Build role; the PM joins for scope decisions. Invoke with /demo-build <build|test>, or read this file and follow it if slash commands are unavailable.
requires:
  - (없음)
enhanced_by:
  - node : node --test app/tests runs the logic, fallback and server tests headless; node scripts/serve.mjs serves app/ over http locally
  - shell/git : local run, commit after every green step, git tag good-<HHMM> recovery snapshots, last known-good commit for RECOVERY.md
  - a deploy target with a URL (GitHub Pages publishing app/ only / Vercel with Root Directory app — whichever app/DEPLOY.md and mission/BOARD.md name) : the live demo link and its /tests/ runner
  - Google Sheet + Apps Script (app/sheet/README.md) : a 5-minute data layer when the core scene needs shared data, and the proxy that keeps any AI key out of the browser
  - Claude Code : edits and runs the app directly
degraded:
  - no node : T0 = the deployed URL's /tests/ page (Vercel <URL>/tests/, Pages <URL>/tests/ — app/ is the site root on both); before the first deploy, open app/fallback.html by double-click and run the 3 SMOKE steps by hand. app/index.html and the runner need http(s); file:// shows a FAIL banner instead of running
  - no shell/runtime : the AI writes the files and the human commits them (GitHub web editor); the deployed URL is where the app runs; the recovery snapshot is an app/ ZIP named app_good-<HHMM>.zip anywhere outside app/ (in the repo only under snapshots/, which *.zip keeps out of git) — its path goes into app/RECOVERY.md
  - shell but no git : snapshot = the same ZIP plus the app/ content sha256 (submit-gate 「git 없음」 command) instead of a tag; checkpoint lines carry `수정 <HH:MM>` instead of a commit hash
  - no deploy target : see 「Degraded — no deploy target」 below (local runs are tagged, G3 is blocked with a ready-made 🚨, check 1 stays FAIL)
  - no file access : code comes back in fenced blocks with exact paths; the human saves them
verified_on:
  - (미검증)
---

# demo-build — test first, one scene that works

Status: `specified` (HTHn v1.1). Output language: Korean for messages to the team; **code comments in English**. Owner of `app/`: Build (준서) unless `mission/BOARD.md` `## 파일 소유` says otherwise.

## Inputs

`mission/PRD.md` (version line · sentence 3 핵심 행동 · 4 입력→출력 · 5 하지 않을 것 · 6 완료 조건), `mission/BOARD.md` (deploy target, file ownership, deadlines, my budget row), `CONTRACT.md` (safety rules), `mission/MISSION.md` 「사실」/「미확인」 (whether code written before the event is allowed — U4), and the skeleton already in the repo: `app/index.html`, `app/app.js` (DOM binding), `app/logic.js` (pure functions, ES module), `app/data/fixture.json` (`"_label": "synthetic"`), `app/styles.css`, `app/SMOKE.md`, `app/tests/` (`logic.test.mjs` harness invariants, `scaffold-core.test.mjs` skeleton core action — replaced on event day, `smoke-input.js` the one SMOKE input, `fallback.test.mjs`, `serve.test.mjs`, browser runner `index.html`, `README.md`), `scripts/build_fallback.mjs`, `app/RECOVERY.md`, `app/DEPLOY.md`.

Default stack (app/DEPLOY.md): static HTML + JS with an inline JSON fixture or a Google Sheet via `app/sheet/`. Switch to Firebase only when the board states the need (login or realtime) — and even then judges must reach the core scene without logging in.

Degrade block (Korean, once, top of the first response) when something is missing:

```
[이 환경에는 node가 없습니다]
 → 배포 URL의 /tests/ 를 열어 같은 스모크 단계를 확인합니다 (배포 전이면 app/fallback.html을 더블클릭하고 SMOKE 3단계를 손으로). 결과는 같고 조금 느립니다.
 → 건너뛴 것: node --test app/tests 자동 실행 → NOT_RUN (push 후 같은 커밋의 CI 결과로만 해소 — GitHub repo → Actions → check)
```

## Public demo rules (always on — app/DEPLOY.md)

1. **No login** in front of the core scene. A judge opens the URL on any device and reaches step 2 of SMOKE directly.
2. **Reset**: a visible reset control (e.g. 「처음으로」) returns the page to the first-screen state with the synthetic data, so the next judge starts clean.
3. **Error banner**: any failure (network, sheet, proxy, timeout) shows a one-line Korean banner and falls back to the synthetic fixture — never a blank page or a silent hang.
4. **Other device**: after each deploy, open the URL once on a different device or network (phone data) before calling a step green.
5. **No API keys in the browser**: never put a key in browser JS, `app/config.js`, `fixture.json` or any committed file — a static site publishes it. If the core scene needs an AI call, go through an Apps Script proxy that keeps the key in Script Properties, or show pre-generated outputs labelled `synthetic`. Wiring the first live AI call is a 🚨 one-decision PM approval (paid API, CONTRACT rule 5).
6. Data stays synthetic (`"_label": "synthetic"`) — no real personal data, no credentials or `.env` in git.

## Mode build (10:20–14:00)

TDD order is fixed: **empty first deploy (10:35) → SMOKE (10:45) → tests red (11:00) → code (green) → snapshot.** Deploying the unchanged skeleton is not application code; no new application code before step 2 is committed red.

0. **Empty first deploy (by G2 10:35).** Deploy the repo skeleton unchanged so the demo URL exists (app/DEPLOY.md) and open it once. The first public deploy is one approval decision — pre-approved before the event if READINESS R8 is ✓ (then just note `사전 승인 R8`), otherwise the PM's 🚨 answered by a second member within 10 minutes (CONTRACT.md 「승인 형식」). Report the URL in HANDOFF 「체크포인트」 as `데모 URL <URL> · <HH:MM> · Build` for the BOARD `데모 URL:` line. While the organizers have not answered U4/Q3 (pre-event code allowed?), follow the MISSION 「미확인」 assumption; on a not-allowed notice, reset to the echo stub below at once. Hand the URL to the PM for `mission/BOARD.md` (or 「제안」). If the organizers said code written before the event is not allowed (MISSION.md 「사실」/「미확인」), use the empty-app path in app/DEPLOY.md instead: reset `decideNextAction` in `app/logic.js` to an echo stub (returns the input unchanged), commit, and deploy that. G2 needs the URL to answer, not to work.
1. **SMOKE first (by 10:45).** `git pull --rebase --autostash`. Rewrite `app/SMOKE.md` for today's mission in this exact shape:
   - `# SMOKE` heading line, then the target URL line.
   - Exactly three steps, each with a `기대:` line a judge could check in 10 seconds: ① 페이지 열림 ② 핵심 행동 — the step text quotes **PRD sentence 3's captured text verbatim** (copy–paste the words between `핵심 행동은` and `하나입니다`, no paraphrase) and uses the input → output of sentence 4 · ③ 가상 데이터 로드 / reset back to the first screen.
   - `## 완료 조건` — one line that quotes **PRD sentence 6's captured text verbatim** (the words before `하면 완료입니다`).
   - `## 실행 기록` — table `회차 | 시각 | 통과 단계 | 실패 | 조치`; the 통과 단계 cell ends with the target and method: `3/3 (배포 URL · 브라우저)` · `3/3 (로컬 · 브라우저)` · `3/3 (fallback · 브라우저)`. Only `배포 URL` rows count for G3, check 2 and F1.
   Note the PRD version you copied from (`PRD v<n>`) on the URL line — the node X-2/X-4 tests SKIP as NOT_RUN until it is there (G1 → T3), then run. A multi-field input is one string joined with ` / ` (templates/SMOKE.md). (Cross rules X-2 and X-4.)
2. **Tests next, red (by 11:00).** For every SMOKE step write a test before any code: **replace** `app/tests/scaffold-core.test.mjs` with the tests of the new core action (same file name — that is the TDD step, not deleting tests; `logic.test.mjs` holds the harness invariants and stays), and set the new step-2 input once in `app/tests/smoke-input.js` (`SMOKE_INPUT`, plus `PARITY_INPUTS` that reach the new core scene) — the node tests and the browser runner both import it. Call functions that do not exist yet through `import * as logic from '../logic.js'`: a named `import { newFn }` of a missing export is a SyntaxError that removes the whole file from the run (no red, just no tests). Run them and confirm they **fail** for the right reason (missing behaviour, not a syntax error). Record the red run in the commit message or `log/`, not in SMOKE `## 실행 기록`. Commit `test(app): smoke 3 steps (red)` and push. The node X-2 / X-4 tests read `mission/PRD.md` when it exists (else the skeleton `app/tests/scaffold-prd.md`, which you never edit). Every file that hard-codes the core action is listed in `app/tests/README.md` 「당일 고치는 법」 (`app.js` call site and `renderRows`, `tests/index.html` pre-check, `data/fixture.json` shape, `app/sheet/Code.gs` seed).
3. **Code, green.** Implement only PRD sentence 3 in `app/logic.js` (pure functions) and `app/app.js` (DOM), keeping the public demo rules above. Sentence 6 is the pass condition; sentence 5 lists what not to build. Re-run the tests after each change; commit `feat(app): <step>` only on green so every commit leaves the page working. While logic.js, fixture.json or ids change, the fallback comparison tests SKIP (the always-on fallback tests use the fallback's own inlined data) — green is still possible, and expected, until the freeze.
   - If `data/fixture.json` columns change, update `seedSyntheticSheet` in `app/sheet/Code.gs` to the same columns, or record in HANDOFF 「체크포인트」 `sheet 경로 미사용 · SHEET_API_URL 비움` so nobody turns sheet mode on later and silently breaks SMOKE step 3.
   - If the core scene needs an AI call and the AI path is blocked (🚨 unanswered or refused), the stand-ins are: pre-generated outputs labelled `synthetic`, or a small rule-based responder labelled `synthetic` on screen (`규칙 기반 대역 — 시뮬레이션`). Either way raise the criterion impact to the PM at G3 as one 🚨 line (`AI의 역할 기준이 약해진다 — A 승인 요청 계속 · B 대역으로 제출`), never silently.
4. **Deploy and re-test on the URL.** Redeploy as soon as a step is green. Re-run the three SMOKE steps on the deployed URL (and its `/tests/` runner) and once from another device, not on localhost; Build writes those runs into SMOKE `## 실행 기록`.
5. **Recovery snapshot at every good point.** When the deployed URL passes SMOKE 3/3: `git tag good-<HHMM> && git push origin good-<HHMM>` (without git: zip the whole `app/` folder as `app_good-<HHMM>.zip` to any path outside `app/` — in the repo only under `snapshots/` — and write the path in RECOVERY). Write the tag (or ZIP name), commit and time into `app/RECOVERY.md` 「지금 상태」. Measure one redeploy from the snapshot before G3 and record it in RECOVERY (time to working URL). `app/fallback.html` is the last resort, not the plan.
6. **Board status.** After each commit that finishes or blocks a board task row, append `T<n> <상태> · 커밋 <hash> · Build` to HANDOFF.md 「체크포인트」 (the PM copies it into `mission/BOARD.md`).
7. **PRD version change.** If the PM raises the PRD version after G2 (HANDOFF 「결정」), update SMOKE step 2 and `## 완료 조건` to the new captured text verbatim, adjust the tests, and answer `✓ PRD v<n>` under that decision. Until then integrate reports X-2 / X-4.
8. **G3 13:00.** The core scene works on the deployed URL, `app/SMOKE.md` 3/3 there (a `(배포 URL …)` row), a `good-<HHMM>` snapshot exists, and `node --test app/tests` reports **no FAIL** (SKIPs of the fallback comparison are allowed at G3; T0: the URL's `/tests/` runner 3/3). Report to the PM in one line with the URL, the commit hash, the snapshot and the test result. If 13:00 passes without that, narrow the scene — never add a feature.
9. **Freeze 14:00 + recovery.** After the freeze only fixes for a failing SMOKE step are allowed. Rebuild `app/fallback.html` with `node scripts/build_fallback.mjs` (by hand: `app/RECOVERY.md`, including step 1b — remove the file:// guard), so the comparison tests run and pass (submit-gate check 8 needs them run, not skipped). Check that `PARITY_INPUTS` in `app/tests/smoke-input.js` reach the new core scene, not only error paths. Take the freeze snapshot (`good-<HHMM>`) and update `app/RECOVERY.md`. Note the freeze commit in HANDOFF.md 「체크포인트」 and hand the URL plus one screenshot to the pitch owner.

Model note: iterate with Sonnet for speed; use Opus only for a design decision the PM must approve. Watch your `## 예산` row in `mission/BOARD.md` (잔여 중단선 · 시간 상한).

## Mode test (14:00–14:45, feeds G4)

Build is frozen and executes the runs; the owner of `mission/SUBMISSION.md` (default Sales · 태진) watches and records them — the builder does not certify their own demo.

1. If `mission/SUBMISSION.md` does not exist, the owner copies `templates/SUBMISSION.md` into `mission/` (first line `# SUBMISSION — <YYYY-MM-DD>`).
2. Build runs the three SMOKE steps on the deployed URL three times, pressing reset between runs, and reads each result aloud. (Personas are not needed here — they come at 14:45 from evidence-research.)
3. Sales records each run under `## 테스트` with columns `회차 | 시각 | 통과 단계 | 실패 | 조치`; the 통과 단계 cell names the target and method, e.g. `2/3 (배포 URL · 브라우저)`. A step that was only read, not executed, is `판독` and counts as NOT_RUN. Failures go to Build in one line; Build fixes only that step (freeze rule). If Sales is away, Build writes the rows as `기록 대행 Build` in 조치 and Sales confirms them before the 14:45 precheck.
4. Sales commits `test(mission): mvp test record` before 14:45 so the submit-gate precheck can use it. The first passing run unblocks the pitch screenshot.

## Degraded — no deploy target (no URL can be approved or reached)

Local is never the deploy, and F1 is never waived. When no public URL exists:

1. **Run locally over http**: `node scripts/serve.mjs` → `http://localhost:8000/` (runner `…/tests/`) — never `file://` (index.html then shows only the FAIL banner); without node, `app/fallback.html` by double-click.
2. **Record honestly**: SMOKE 「실행 기록」 and SUBMISSION 「테스트」 rows are tagged `(로컬 · 브라우저)` or `(fallback · 브라우저)`; they never count as G3, check 2 or F1.
3. **Board**: T7 becomes `done (로컬)` in 「체크포인트」 (the board keeps G3 `blocked`); sprint-board drops T7's dependency on T2.
4. **One decision now** (HANDOFF 「블로커」, CONTRACT 승인 형식):

```
🚨 [승인 필요] 데모 공개 배포 경로 · 수신: PM(<이름>)
선택지: A(권고) 지금 배포 승인 (<경로> · 실측 <n>분) · B 배포 없이 fallback + 녹화로 준비 (체크 1 FAIL → 제출 판정 불가) · 보류
근거: 배포 URL 없음 <HH:MM>부터 · 로컬 SMOKE <n>/3 · RECOVERY 「지금 상태」
```

5. Hand GTM the token `데모: 로컬 시연 (배포 URL 없음)` for Slide 2 (pitch-compile) — submit-gate check 1 treats it as FAIL.

## Repair policy (H-001)

```
1st same failure → diagnose the root cause, fix
2nd same failure → try a different approach
3rd same failure → BLOCKED: ask the PM one decision ("핵심 장면을 X로 좁힐까요, Y를 뺄까요")
```

The three attempts share **one 30-minute cap in total**, counted from the first failure. At 30 minutes stop even if fewer than three attempts were made, restore the last `good-<HHMM>` snapshot if the URL is broken, and ask the PM the same one decision.

## Do not

- Do not write application code before the red tests are committed.
- Do not paraphrase PRD sentence 3 or 6 in SMOKE — copy the captured text exactly.
- No login in front of the core scene, no real personal data, no OAuth to real accounts, no secrets in git or in browser code, no new dependency after 12:00 unless the build is blocked without it.
- No "it works on my machine" — the deployed URL is the only truth.
- Never add a feature after G3. Narrow the scene instead.

## 사람이 하는 일

- 10:20 준서(Build): 우영에게 첫 공개 배포 🚨 승인을 받고, 10:35까지 골격(또는 사전 코드 불허 시 빈 앱)을 그대로 배포해 URL부터 만든다. 10:45 `app/SMOKE.md` — 2단계에 PRD 3번 문장의 빈칸 내용을, `## 완료 조건`에 6번 문장의 빈칸 내용을 **글자 그대로** 붙인다. 11:00 `app/tests` **빨간불** 확인 후 커밋. 코드는 그다음이다.
- 배포할 때마다 다른 기기(휴대폰 데이터)로 한 번 열어 본다. 로그인 없이 핵심 장면까지 가는지, 「처음으로」로 초기화되는지, 오류 때 배너가 뜨는지 본다. 브라우저 코드에 API 키를 넣지 않는다.
- SMOKE 3/3이 될 때마다 `git tag good-<HHMM>`(git이 없으면 `app/` 폴더를 `app/` 밖에 `app_good-<HHMM>.zip`으로 — repo 안이면 `snapshots/`) — RECOVERY에 경로와 함께 적는다. G3 전에 스냅샷으로 재배포를 한 번 실측한다.
- 13:00(G3) 준서: 배포 URL에서 핵심 장면이 돌고 테스트가 통과하면 URL·커밋·스냅샷·결과를 우영에게 한 줄로 보고한다.
- 14:00 전원: 빌드 freeze. 준서는 `node scripts/build_fallback.mjs`로 fallback을 다시 만들고 스냅샷을 찍고 RECOVERY를 갱신한다. 이후는 고치기만.
- 14:00–14:45 준서가 배포 URL에서 스모크 3단계를 3회 돌리고, 태진(Sales)이 `mission/SUBMISSION.md` 「테스트」에 대상·방식과 함께 적는다 (`3/3 (배포 URL · 브라우저)`). 태진이 없으면 준서가 `기록 대행 Build`로 적고 precheck 전에 태진이 확인한다.
- 배포 대상이 없으면: 로컬은 `node scripts/serve.mjs`(http)로만, 기록은 `(로컬 …)`, 바로 우영에게 🚨 한 결정 (위 「Degraded — no deploy target」).
- 같은 실패가 3번이거나 첫 실패부터 30분이 지나면 준서는 고치기를 멈추고 우영에게 한 결정만 묻는다.

## Changes (v1.1)

- `app/SMOKE.md` shape fixed: `# SMOKE` → 3 steps with `기대:` → `## 완료 조건` → `## 실행 기록`; step 2 quotes PRD sentence 3's captured text verbatim (X-2) and `## 완료 조건` quotes sentence 6's (X-4); PRD version changes after G2 are re-approved with `✓ PRD v<n>`.
- Empty first deploy by G2 10:35 (A5), with the empty-app path when pre-event code is not allowed (D).
- Public demo rules: no login, reset control, error banner with synthetic fallback, other-device check, no API keys in the browser (D, app/DEPLOY.md).
- Recovery snapshot = `git tag good-<HHMM>` or an `app/` ZIP, with one measured redeploy; fallback.html is the last resort (D, app/RECOVERY.md).
- Repair policy: three attempts share a 30-minute total cap (C §9); board path is `mission/BOARD.md` (A4); missing node checks are NOT_RUN until the same commit's CI result (A3).
