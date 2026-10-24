---
name: submit-gate
description: The last gate (G6) before the 16:00 submission target, in two modes. precheck (14:45) is a dry run of checks 1 to 9 on the current commit — nothing is handed in. final (15:30) runs all ten fixed checks on the final commit, by members who did not author what they check — demo URL and the 3 smoke steps, the two-page file, personal contact data, labels and simulation marks, criteria mapping, form fields, recovery path, hashes and commit, time/slots/event mode — then the receipt rules and cross rules, and writes mission/SUBMISSION.md with results PASS, FAIL or NOT_RUN, hashes, tests and a verdict (approve, approve-with-defects, revise or fail). F1 to F5 are never waived; NOT_RUN blocks like FAIL unless the same commit's CI log shows it passed. One submission per team, no resubmission, first-round judging in order of arrival, so the PM hands it in by hand once, at the first moment the receipt says approve or approve-with-defects — 16:00 is the target and ceiling, 16:50 the final limit, never later. The AI never submits. Everyone must be able to run it. Invoke with /submit-gate <precheck|final>, or read this file and follow it if slash commands are unavailable.
requires:
  - (없음)
enhanced_by:
  - python (python_cmd from me/env.md) : scripts/validate_mission.py mission --stage <HANDOFF stage> for precheck check 9, --stage submit (all earlier stages again plus C-empty, header, receipt rules C-S*, C-Y* if DEMODAY.md exists, cross rules X-1 to X-6) for final check 9 and before the verdict; bash scripts/check.sh for the RESULT lines pii and node-tests, and in final `bash scripts/check.sh --stage submit` so RESULT event-mission is the submit-stage run whatever HANDOFF's stage says
  - shell : sha256 and size of the slide file (shasum -a 256, wc -c), curl -sI of the demo URL, grep across app/ and the deployed page source
  - Windows : certutil -hashfile <file> SHA256 or PowerShell Get-FileHash -Algorithm SHA256 <file>; curl.exe -sI <url>
  - node : node --test app/tests for checks 2 and 8 (fallback parity must run, not SKIP)
  - a browser : open the demo URL and its /tests/ runner on another device, run app/SMOKE.md
  - git : the source commit hash, git diff --stat pre-event..HEAD -- app/, git tag submitted
  - CI (GitHub Actions check workflow) : the only way to clear a NOT_RUN — a log link for the same commit
degraded:
  - no python : the checker reads the checklist and the contract rules below and judges each rule-id by reading the files (T0 path, same IDs, PASS / FAIL / NOT_RUN); every 증거 cell says 수동 점검 (python 없음). A check that needs a tool you lack is NOT_RUN until the same commit's CI log shows it passed
  - no shell at all (claude.ai web) : files are searched with the AI's file tools; the human runs certutil or shasum in a terminal and pastes the hash; size + modified time only if hashing is impossible, and the 증거 cell says so; the human opens the URL and reports what happened
  - no file access : the human pastes PITCH.md, SMOKE.md results and the form fields; the receipt comes back as Markdown and the SUBMISSION owner saves it
  - no git : there is no commit hash. The 소스 커밋 and 배포 URL sha256 cells use exactly `내용 sha256 <64자리> (no git)`, where the 64 hex digits come from the app/ content manifest: `find app -type f ! -name '*.zip' -print0 | LC_ALL=C sort -z | xargs -0 shasum -a 256 | shasum -a 256 | cut -c1-64` (Windows: the same line in Git Bash). The header `소스 커밋:` carries the same value. The git-diff part of check 9 is then NOT_RUN (unless HANDOFF 「결정」 holds a `pre-event 기준: 내용 sha256 …` to compare with); the validator accepts this form (C-S3) and says `no git`
verified_on:
  - (미검증)
---

# submit-gate — verified file or it did not happen

Status: `specified` (HTHn v1.1). Output language: **Korean**.

## Modes

| Mode | When | What | Hand-in |
|---|---|---|---|
| `precheck` | 14:45 (with G4) | dry run of checks 1–9 on the current commit; check 9 pre-checks only up to HANDOFF.md `stage:` (= `RESULT event-mission`, normally `evidence` at 14:45); row 10 `NOT_RUN` (`precheck`); verdict `revise`; expected FAILs listed below; every other FAIL / NOT_RUN goes to its owner at once; results go in `## 체크` **and** one `## 테스트` row | none — G6 stays `ready` |
| `final` | 15:30 (G5) → 16:00 target | all ten checks on the final commit, receipt rules, cross rules, verdict | the PM, by hand, once, on approve / approve-with-defects |

Results never carry over from precheck to final: the commit, the deploy and the slide file change, so final re-runs everything.

## Who runs it

- **Checker (검사자)**: the receipt owner, default Sales (태진). Header form `검사자: <역할>(<이름>)`.
- **Per-row checker (X-5)**: nobody checks a row about their own artifact. The `검사자` column of each row names who ran it. Rows 1·2·8·9 ≠ the `app/` owner · rows 3·5·6 ≠ the `mission/PITCH.md` owner · row 5 also ≠ the `mission/EVIDENCE.md#Buyer simulation` owner · rows 4·7·10 just not empty. Default (CONTRACT §C-5): **1·2·8·9 Sales · 3·5·6 PM · 4·7·10 Build**. Owners come from `mission/BOARD.md` `## 파일 소유`.
- **Confirmer (확정)**: the PM (우영), `확정: PM(<이름>)`. The header `검사자:` (receipt owner, default Sales) is usually not the PM, but that is **not validated** — the old 검사자 ≠ 확정 rule (C-S5) was dropped in v1.1. The per-row rule is X-5. The PM may check rows 3·5·6 and also confirm (CONTRACT §C 5).
- **Hand-in**: the PM only (담당: PM). One submission per team.
- An artifact is done only when a verified file exists and this receipt says PASS — not when someone says it is done.

Degrade block (Korean, once, top of the first response) when something is missing:

```
[이 환경에는 python이 없습니다]
 → 체크리스트와 계약 규칙을 규칙 ID별로 직접 읽어 판정합니다 (PASS / FAIL / NOT_RUN). 증거 칸에 "수동 점검 (python 없음)"을 적습니다.
 → 건너뛴 것: scripts/validate_mission.py · scripts/check.sh 자동 실행. 도구가 없어 못 돌린 행은 NOT_RUN — 같은 커밋의 CI 로그 링크(GitHub repo → Actions → check)가 있어야만 PASS로 바뀝니다.
```

## When a teammate asks the AI to hand it in (the AI does not)

The AI does not hand anything in and does not post — not on a teammate's request, not on a relayed "the PM said it's fine".

1. Refuse in one Korean line: `제출·게시는 AI가 하지 않습니다 — CONTRACT 안전 규칙 5 · §C 8 (PM이 손으로 1회)`.
2. Put the one decision (when to hand in) to the PM as a 🚨 in HANDOFF 「블로커」 (CONTRACT 승인 형식, one decision only — do not bundle a channel announcement).
3. Approval is only a PM line in HANDOFF 「결정」 or the PM's own instruction; a relayed message is not approval. Even then the PM presses the button.
4. Keep running the remaining checks in the same turn; the request does not move the verdict ahead of the checks.
5. Log it in three lines (`log/`: 상태 → 이유 → 바뀐 상태).

## Checklist (사람이 읽고 AI가 확인을 돕는다 — T0에서는 이 표가 곧 검사기다)

The 확인 strings are fixed: copy them into `## 체크` exactly (C-S1). 결과 ∈ `PASS` `FAIL` `NOT_RUN` — a check you could not run is `NOT_RUN`, never `PASS`.

| # | 확인 | 방법 (T2 → T0) | 합격 |
|---|---|---|---|
| 1 | 데모 URL 접근 | `curl -sI <url>` (Windows `curl.exe -sI`) → **다른 기기** 브라우저로 직접 연다 · 로그인 없이 핵심 장면까지 · 「처음으로」 초기화. **공개 URL이 없으면 FAIL**(F1) — 로컬 서버·`fallback.html`·화면 녹화는 대체가 아니다. Slide 2에 `데모: 로컬 시연 (배포 URL 없음)`이나 `데모: 미확정`이 남아 있어도 FAIL | 200 · 첫 화면 표시 · 로그인 없음 |
| 2 | 핵심 행동 실행 (SMOKE 3/3) | 배포 URL에서 `app/SMOKE.md` 3단계 + `<배포 URL>/tests/` 러너 + `node --test app/tests` · SMOKE 2단계·「완료 조건」이 PRD 3·6번 원문과 같음 · 「테스트」의 `(배포 URL …)` 행 — `(로컬 …)` `(fallback …)` `판독` 행은 근거가 아니다 | 3/3 · node FAIL 0 |
| 3 | 2장 파일 (페이지 ≤ 2) | 대상은 **내보낸 파일** `pitch/slides.pdf`(또는 `.pptx`) — 있음·형식 · 그 파일에서 쪽수를 센다 · PITCH `## 제출 파일`의 파일·페이지·크기(바이트)가 실제와 같음(검증기 C-T8이 파일을 열어 본다) · Slide 1·2 외 슬라이드 절 없음. `사람 기입 대기`가 남아 있으면 FAIL | MISSION.md 제출물 형식과 일치 · 2쪽 이내 |
| 4 | 개인정보 0 | 대상 셋: repo · 배포 페이지 소스 · 내보낸 슬라이드 파일. `bash scripts/check.sh` 의 `RESULT pii` (또는 `python3 scripts/pii_scan.py .` — SKIPPED 줄의 PDF·PPTX·ZIP은 미검사다: 슬라이드는 텍스트로 내보내 이메일·전화 패턴을 검색하고, repo 안 복구 ZIP은 임시 폴더에 풀어 `pii_scan.py <폴더>`로 검사하거나 증거 칸에 `ZIP 미검사`) + 키 모양 검색 `grep -rnE "sk-an[t]-[A-Za-z0-9_-]{20,}" app/` (문서 속 설명 문구에는 걸리지 않는다) 와 배포 페이지 소스("페이지 소스 보기")에서 같은 검색 | 0건 · 증거 칸에 pii `RESULT`/`SUMMARY` 줄과 `슬라이드 텍스트 검색: <방법>` 둘 다 |
| 5 | 라벨·시뮬레이션 표기 | 대상 둘: `mission/PITCH.md`(검증기) **와** 내보낸 슬라이드 파일의 같은 줄(눈으로 대조 — 파일에서 라벨이 빠지면 FAIL) · 슬라이드 숫자·실적 줄마다 같은 줄 라벨 · 라벨 점검 ID·라벨 = EVIDENCE · 시뮬레이션 절 면책 줄과 S<n> 라벨 · 화면의 시뮬레이션 표기 | 누락 0 |
| 6 | 심사기준 매핑 | PITCH `## 심사기준 매핑`이 MISSION.md `## 심사기준`의 굵은 기준 이름을 전부 다룬다 (C-T4) | 누락 0 |
| 7 | 제출 양식 필드 | 필드 목록은 MISSION.md 「제출물」 `양식 필드:`에서 읽는다(기본 가정이 아니라 실제 양식) · 팀명은 MISSION 「제출물」 `팀명:` · SUBMISSION 「제출」의 `양식 …` 줄을 채운다 · 사전 준비물 문장(정본 `templates/SUBMISSION.md`: "사전 준비물: 팀 프로세스 하네스(계약·스킬·템플릿·검증기)와 빈 앱 골격(제품 기능 0) — 10:00 새 공개 레포의 첫 커밋(pre-event 태그)으로 가져옴, 그 이후가 당일 작업 (제출 양식 「기존 코드 가져왔어요」 체크 + 「무엇을 가져왔나요」에 이 문장)")은 설명 칸에, 설명 칸이 없으면 Slide 2 맨 아래 한 줄로 · 글자 수·파일 형식·용량이 양식 제한 안 | 전부 채움 |
| 8 | 복구 경로 | `app/RECOVERY.md`에 `good-<HHMM>` 태그(또는 `app_good-<HHMM>.zip`)·마지막 정상 커밋·재배포 실측 1회 기재 · `app/fallback.html` 열림 · fallback parity 테스트가 SKIP 없이 PASS | 있음 · 동기화됨 |
| 9 | 해시·커밋 | 머리 줄 `소스 커밋:` `배포 버전:` `발표 파일 sha256:` = `## 산출물` 3행 · `git diff --stat pre-event..HEAD -- app/` · 그 커밋에서 계약 검사: **final** = `validate_mission.py mission --stage submit`(이전 단계 전부 재검사 + C-empty · 헤더 · C-S* · X-*), **precheck** = HANDOFF `stage:`까지만(`RESULT event-mission` = `--stage <HANDOFF stage>`) | 기록됨 · 계약 검사 fail=0 (precheck는 아래 예상 FAIL 제외) |
| 10 | 시각·슬롯 | 지금 시각 vs 16:50 · 창구가 열려 있음 · `mission/BOARD.md` `## 슬롯` 최신 행(30분 넘게 묵었으면 검증기 C-B5 WARN — 지금 화면을 보고 한 행 더하게 한다) · 4명의 `log/`에 `행사 모드: ① 행사 계정 yes · ② 최초 허용 호출 <HH:MM> · ③ 개인 계정·타 AI 폴백 off`. **리허설**(HANDOFF `rehearsal: true`)이면 결과 `NOT_RUN` · 증거 `[SIMULATION 대체] 리허설 — 행사 모드 줄 n/4` (PASS 금지, 검증기 C-S1이 막는다) | 16:50 이전 · 창구 열림 · 슬롯 기록됨 · 증거에 `행사 모드 4/4`. 16:00 이후라는 사실은 FAIL이 아니라 알려진 결함으로 적는다 |

### Check ID ↔ rule-id mapping (same IDs on every path)

The automatic run (T2), the CI run and the manual run (T0) report the **same check IDs 1–10**, each as `PASS` / `FAIL` / `NOT_RUN`. A check is PASS only when every rule-id mapped to it is PASS.

| # | 규칙 ID (validate_mission.py) | 자동 검사 (`scripts/check.sh` RESULT id) | 수동 확인 (T0) | 면제 불가 |
|---|---|---|---|---|
| 1 | C-S3 (배포 URL 행) | — | URL을 다른 기기로 연다 | **F1** |
| 2 | X-2 · X-4 · C-S4 | `node-tests` | SMOKE 3단계 손으로 · `/tests/` 러너 | — |
| 3 | C-T1 · C-T8 | — | 내보낸 파일 쪽수 | **F2** |
| 4 | — | `pii` | 슬라이드 텍스트·배포 소스 검색 | **F3** |
| 5 | C-T2 · C-T5 · C-T7 · X-1 · C-E3 · C-E4 | — | 줄마다 라벨 대조 | **F4** |
| 6 | C-T4 | — | 매핑 행 수 = 심사기준 수 | — |
| 7 | — | — | 양식 화면 확인 | — |
| 8 | — | `node-tests` (fallback parity, no SKIP) | fallback 열기 · RECOVERY 태그 | — |
| 9 | C-S3 · C-SUBMISSION-header · S-SUBMISSION-header · C-empty · 전 파일 S-dup-heading · S-<NAME>-title/-headings/-table-*·S-PRD-lines·S-PRD-cut · C-<NAME>-date · stage pre-checks C-M1–4 C-D1–6 C-P1–4 C-B1–5 C-E1–4 C-T1–9 | final: `validate_mission.py mission --stage submit`만 (또는 `bash scripts/check.sh --stage submit`의 `event-mission`) · precheck: `event-mission`(HANDOFF stage까지) | T0 계약 점검 (아래) | — |
| 10 | C-B5 | — | 시각·창구·log 행사 모드 4/4 | **F5** (타 AI 미사용·행사 모드) |
| 판정 | C-S1 · C-S2 · C-S6 · C-S7 · X-3 · X-5 · C-Y1–C-Y3 (`mission/DEMODAY.md`가 있을 때 submit에서 재검사) | `RESULT` 전체 (exit 0/1/2) | 이 영수증 자체 | — |

**면제 불가 F1–F5** = 체크 1 · 3 · 4 · 5 · 10 (F1 데모 URL 외부 접근 · F2 2장 이내 파일 · F3 개인정보 0 · F4 시뮬레이션·라벨 표기 · F5 타 AI 미사용 = 행사 모드). 이 다섯이 PASS가 아니면 어떤 시각에도 제출 판정이 나오지 않는다.

**Missing artifact.** When the artifact a row checks does not exist, that row is `FAIL` and the rows that depend on it are `NOT_RUN` (reason in 증거):

| 없는 것 | FAIL | NOT_RUN (의존) |
|---|---|---|
| 공개 배포 URL | 1 | 2 (배포 URL 실행) · 9의 `배포 버전` |
| 내보낸 2장 파일 | 3 | 4의 슬라이드 텍스트 검색 · 5의 파일 대조 · 9의 `발표 파일 sha256` |
| 복구 지점(태그·ZIP·재배포 실측) | 8 | — |
| git | — | 9의 git diff (`내용 sha256 … (no git)` 형식, 위 degraded) |

A redeploy row that says `실측 불가` is not a measurement: check 8 is FAIL until one redeploy is timed.

**Absent checker.** If the assigned checker of a row is away and nobody else may check it (X-5), the row is `NOT_RUN`, 검사자 cell exactly `미실행`, 증거 `<역할> 부재 — <HH:MM>`. The validator accepts `미실행` only with `NOT_RUN`.

**NOT_RUN rule.** `NOT_RUN` counts exactly like `FAIL` in the verdict. The only way to clear it is a CI log for the **same commit** as `소스 커밋:` (GitHub repo → Actions → check → the run for that hash) in which the mapped checks passed: then 결과 becomes `PASS` and 증거 says `CI <log link> · 커밋 <hash>`. A CI run on another commit does not count. A NOT_RUN on F1–F5 therefore blocks; a NOT_RUN elsewhere can only go to `## 알려진 결함`.

### 판정 (enum: `approve` · `approve-with-defects` · `revise` · `fail`)

| 판정 | 조건 |
|---|---|
| `approve` | 10행 전부 PASS (C-S2) · BOARD G1–G5 전부 `done` (X-3) · X-5 · C-S1/C-S7 PASS |
| `approve-with-defects` | 1·3·4·5·10 PASS (C-S2) · 나머지 FAIL/NOT_RUN 행 번호가 전부 `## 알려진 결함`에 `#번호`로 있음 · `PM 승인: PM(<이름>) <HH:MM>` 줄 (C-S6) · X-3 · X-5 |
| `revise` | 고치면 되는 FAIL/NOT_RUN이 있고 16:50 전에 고칠 시간이 있음 (precheck는 항상 `revise`). F1–F5 행이 **답을 기다리는 🚨 하나 때문에만** 막혀 있으면 16:20까지는 `revise` |
| `fail` | 면제 불가 항목이 16:50까지 PASS가 될 수 없음 — 제출하지 않는다. 객관 기준: F1–F5 행이 막혀 있고 (16:50 − 지금) < (RECOVERY 「재배포 실측」의 걸린 시간 + 20분)이면 `fail`. 16:20이 지나도 답 없는 🚨에 막힌 F1–F5 행이 있으면 `fail` |

**리허설 판정.** 리허설(HANDOFF `rehearsal: true`)에서는 체크 10이 `NOT_RUN [SIMULATION 대체]`이므로 approve가 나올 수 없다. 리허설 합격 = **체크 10 말고 전부 PASS + 판정 `revise`** (CONTRACT §C 10). 공개 URL 없이 돈 리허설은 체크 1도 FAIL이고, 그것이 정직한 결과다.

### T0 contract check (check 9 and the final contract run without python)

Read each file and report **each rule-id** as PASS / FAIL / NOT_RUN: S-dup-heading on every file · MISSION C-M1–C-M4 · DECISION C-D1–C-D6 · PRD C-P1–C-P4 · `mission/BOARD.md` C-B1–C-B5 (G1–G5 todo/doing/done/blocked, G6 ready/approved/submitted, `T<n>` deps without cycles, 파일 소유 쓰기 규칙, per-person 예산, 슬롯 with 출처) · EVIDENCE C-E1–C-E4 (E<n> with 연도·지역·단위, verified/single-source with a real dated source, S<n> rows labelled simulation under the disclaimer line) · PITCH C-T1–C-T8 · SUBMISSION C-S* plus C-SUBMISSION-header / S-SUBMISSION-header (the six header lines incl. the three hash lines) (this receipt) · DEMODAY C-Y1–C-Y3 (only if `mission/DEMODAY.md` exists) · C-empty (no template slot `<...>` / `______` / `TBD` left in any file; `[예시]` rows are skipped) · per file S-<NAME>-title / -headings / -table-* (and S-PRD-lines, S-PRD-cut) · cross rules X-1 (라벨 점검 IDs exist in EVIDENCE with the same label), X-2 (PRD sentence 3 captured text verbatim in the body of `app/SMOKE.md` numbered step 2), X-3 (BOARD G1–G5 `done` before approve / approve-with-defects; G6 does not gate), X-4 (PRD sentence 6 captured text verbatim under SMOKE `## 완료 조건`), X-5 (per-row checkers ≠ owners). Every file's first line is `# <NAME> — <YYYY-MM-DD>` with a real date (S-<NAME>-title, C-<NAME>-date). Write the count in the 증거 cell of check 9: `수동 점검 PASS n · FAIL n · NOT_RUN n (python 없음)`.

## Mode precheck (14:45 — no hand-in)

1. `git pull --rebase --autostash`. If `mission/SUBMISSION.md` does not exist, the owner copies `templates/SUBMISSION.md` (the MVP test rows under `## 테스트` should already be there from demo-build test mode).
2. Run checks 1–9 on the current commit with the per-row checkers above. Row 10 is `NOT_RUN` with 증거 `precheck — final에서 실행`. Check 9 pre-checks only up to HANDOFF.md `stage:` (`bash scripts/check.sh` → `RESULT event-mission`, i.e. `--stage <HANDOFF stage>`; at 14:45 that is normally `evidence`) — never `--stage submit` or `--stage pitch` yet.
   **Expected at 14:45 (write them, do not chase them):** check 3 FAIL/NOT_RUN — the two-page file is not exported until G5 (PITCH `## 제출 파일` still slots, C-T8); PITCH v1 slots such as `낭독:` (C-T6) and leftover `<...>` (C-empty) — not run at the `evidence` stage; row 9 hash lines empty until final. Mark them `(precheck 예상)` in the 증거 cell and do not send them to owners. Any other FAIL / NOT_RUN is real.
3. Record in **both** places: fill the `## 체크` rows and the header lines you can, **and** append one `## 테스트` row `| precheck | <HH:MM> | 체크 PASS n/9 | #<n>,… | 소유자 전달 |`. `## 판정` = `revise`; `## 제출` stays `미제출`. Do not touch BOARD G6 (stays `ready`).
4. For every FAIL / NOT_RUN that is not marked `(precheck 예상)` send one Korean line to the owner now: `#<n> <FAIL|NOT_RUN> — <무엇> — <누가 고치나> (precheck)`, and append the same line to HANDOFF.md 「제안」 with `작성:<역할> <HH:MM>` so it survives the chat.
5. Commit `chore(submit): precheck` (`git add mission/SUBMISSION.md`) and push; append `precheck <HH:MM>: PASS n/9 · FAIL #… · NOT_RUN #…` to HANDOFF.md 「체크포인트」.

## Mode final (15:30 → G6 16:00 target · 16:50 final limit)

1. `git pull --rebase --autostash`. The PM sets HANDOFF.md `stage: submit`. If it still says something else when you start (the checker cannot change it), send the PM one line and run the contract check at submit anyway — `bash scripts/check.sh --stage submit` (or `python3 scripts/validate_mission.py mission --stage submit`); **that** result is check 9's, never a `RESULT event-mission` taken at a lower stage (check.sh also switches to submit by itself once the receipt has a final verdict, with a WARN). If `## 테스트` has no `precheck` row, T11 never ran: add `precheck 미실행` under `## 알려진 결함` (the validator WARNs) and continue. Fix the three hash targets first: `소스 커밋` (`git rev-parse --short HEAD`), `배포 버전` (deploy ID, or deploy time + commit), `발표 파일 sha256` (`shasum -a 256` / `certutil -hashfile <file> SHA256`). If any of the three changes later, the verdict is void and final runs again.
2. Run checks 1–10 in order (the same ten rows as in `templates/SUBMISSION.md`). If the PRD version rose after G2 and the SMOKE or PITCH owner has not answered `✓ PRD v<n>` under the HANDOFF 「결정」 line, checks 2 and 6 are not PASS (CONTRACT §C 4). At the first FAIL send one Korean line to the owner: `#<n> FAIL — <무엇> — <누가 고치나>`. After the fix, re-run that check — and every check whose hash target changed.
3. Fill the receipt with the contract headings, in this order:
   - Header lines: `검사자: <역할>(<이름>)` · `확정: PM(<이름>)` · `시각: <HH:MM>` · `소스 커밋: <hash | 내용 sha256 <64자리> (no git)>` · `배포 버전: <배포 ID 또는 배포 시각+커밋>` · `발표 파일 sha256: <64자리 | mtime <수정 시각>>`
   - `## 체크` — table `# | 확인 | 결과 | 증거 | 검사자 | 시각`, exactly the ten fixed rows, 결과 ∈ `PASS` `FAIL` `NOT_RUN` (C-S1), 검사자 per X-5.
   - `## 산출물` — table `종류 | 파일/링크 | 버전 | 크기 | sha256` with three rows (C-S3): `| 소스 커밋 | main | <hash> | 커밋 | 커밋 <hash> |` · `| 배포 URL | <https://…> | <배포 ID 또는 커밋> | URL | 커밋 <hash> |` · `| 발표 파일 | pitch/slides.pdf | v<n> | <바이트 정수> | <sha256 64자리> |`. The 배포 URL cell must be an `http(s)://` address — `없음` or a local path FAILs C-S3 (and check 1). Without git both sha256 cells of 소스 커밋 and 배포 URL are `내용 sha256 <64자리> (no git)` (degraded `no git`). Only if no hashing is possible at all write `mtime <수정 시각>` for the slide file and say so in the 증거 cell of check 9.
   - `## 테스트` — table `회차 | 시각 | 통과 단계 | 실패 | 조치`, at least one row (C-S4); 통과 단계 names target and method (`3/3 (배포 URL · 브라우저)`), the precheck row is `| precheck | <HH:MM> | 체크 PASS n/9 | … |`.
   - `## 알려진 결함` — `- (없음)` or one line per defect `#<n> <FAIL|NOT_RUN> — <무엇> · 담당 <역할>`.
   - `## 판정` — one of `approve` · `approve-with-defects` · `revise` · `fail` (C-S2, C-S6); for approve-with-defects add `PM 승인: PM(<이름>) <HH:MM>`.
   - `## 제출` — four lines that stay as in the template until step 7: `담당: PM` · `시각: 미제출` · `접수 확인: 미제출` · `타임아웃 시: 재전송 금지, 접수 상태 확인` (C-S7) — then the `양식 …` lines the check-7 checker filled (팀명 · 데모 링크 · 파일 · 설명·소개 · 사전 준비물 위치).
4. Verdict per the table above. Then the **final contract run** `python3 scripts/validate_mission.py mission --stage submit` (C-S* on this receipt plus X-1 to X-6, after re-checking every earlier stage), or the T0 list by hand. Read its `WARN` lines (slot log stale or ≤ 2, test rows without a target, no precheck row, board drift) and decide each one in 증거 or 「알려진 결함」. Any `FAIL` turns the verdict back to `revise` until the owner fixes it. Write the `SUMMARY` line (or the T0 count) into the 증거 cell of check 9. On approve / approve-with-defects the PM sets BOARD G6 to `approved` (G1–G5 must already be `done`; X-3).
5. Commit `chore(submit): receipt` (`git add mission/SUBMISSION.md`) and push.
6. **Hand-in — PM only, once.** The PM reads the receipt and hands it in by hand immediately on approve or approve-with-defects, because first-round slots close in order of arrival and there is no second submission. Check the file format and size against the form first. A missing response or a timeout is not a failure: **do not resend**. Check the submission state on the confirmation screen or with the organizers first, then record the confirmation (screenshot or number). The AI never submits, posts or sends anything.
7. After the hand-in: fill `## 제출` (`시각`, `접수 확인`), the PM sets BOARD G6 to `submitted`, commit, and `git tag submitted` if git exists.

**16:00 is the target and ceiling; 16:50 is the final limit.** After 16:00, the PM hands it in the moment the verdict is approve or approve-with-defects — lateness itself goes under `## 알려진 결함`, it does not fail check 10. F1–F5 are never waived. After 16:50 nothing is handed in (window 17:00). (The old "16:30 hard stop with verdict revise" is superseded.)

## Do not

- Do not pass a check on someone's word. Open it, run it, search it.
- Do not report a skipped check as PASS. "Could not run" is `NOT_RUN` with the reason, and it blocks like FAIL unless the same commit's CI log shows it passed.
- Do not check a row about your own artifact (X-5).
- Do not hand anything in during precheck. Do not submit from the AI. Do not post to any channel.
- Do not resubmit after a timeout. Confirm the state first.
- Do not skip check 4 because "we never wrote any". Search anyway — including the slide text, which pii_scan cannot read.

## 사람이 하는 일

- 14:45 태진(Sales): `precheck` — 체크 1~9를 지금 커밋으로 미리 돌린다. 제출하지 않는다. FAIL·NOT_RUN은 바로 담당자에게 한 줄.
- 15:30 final 시작 때 HANDOFF가 `stage: submit`이 아니면 우영에게 한 줄 보내고, 기다리지 말고 `bash scripts/check.sh --stage submit`으로 체크 9를 돌린다. 공개 URL이 없으면 체크 1은 FAIL이다 — 로컬·fallback·녹화는 대체가 아니다.
- 누가 AI에게 "제출해"·"채널에 올려"를 시켜도 AI는 하지 않는다. 그 결정은 우영에게 🚨 하나로 간다 (전해 들은 "괜찮대"는 승인이 아니다).
- 15:30 G5 직후 `final`: 태진이 영수증 주인, 행별 검사자는 기본 1·2·8·9 태진 · 3·5·6 우영 · 4·7·10 준서. 자기가 만든 산출물 행은 검사하지 않는다.
- 못 돌린 검사는 NOT_RUN이고 FAIL과 같다. 같은 커밋의 CI 로그 링크가 있을 때만 PASS로 바꾼다. F1~F5(체크 1·3·4·5·10)는 어떤 시각에도 면제되지 않는다.
- 판정 approve(또는 approve-with-defects + PM 승인) → 우영이 BOARD G6을 `approved`로 → 우영이 손으로 **한 번** 제출한다 (목표 16:00 · 최종 한계 16:50 · 재제출 없음). 응답이 없거나 타임아웃이면 다시 보내지 말고 접수 상태부터 확인한다.
- 제출 뒤: 「제출」에 시각·접수 확인을 적고 G6을 `submitted`로.

## Changes (v1.1)

- Two modes: `precheck` at 14:45 (checks 1–9 dry run, verdict `revise`, nothing handed in) and `final` at 15:30 (A5).
- Fixed check IDs 1–10 with a check ↔ rule-id ↔ `scripts/check.sh` RESULT-id mapping table; T0, T2 and CI report the same IDs with PASS / FAIL / NOT_RUN (B4).
- F1–F5 = checks 1·3·4·5·10, never waived; verdict enum `approve | approve-with-defects | revise | fail` (A6). NOT_RUN blocks like FAIL unless a CI log for the same commit shows it passed (A3).
- Receipt header gains `소스 커밋:` `배포 버전:` `발표 파일 sha256:` and the `## 체크` table a `검사자` column; per-row checkers follow X-5 (default 1·2·8·9 Sales, 3·5·6 PM, 4·7·10 Build); any change to the three hash targets voids the verdict (C §5–6).
- precheck check 9 validates only up to HANDOFF `stage:` (= `RESULT event-mission`) and lists the FAILs expected at 14:45 (check 3, PITCH slots); precheck results go in `## 체크` and one `## 테스트` row. Mapping row 9 / T0 list carry every rule `--stage submit` emits (C-empty, C-/S-SUBMISSION-header, per-file S-*/C-*-date, C-Y1–C-Y3 when DEMODAY.md exists). The header 검사자 ≠ 확정 rule (C-S5) is dropped; X-5 is the per-row rule.
- PM hands in once; a timeout means check the state, not resend; `## 제출` uses `시각:`; 16:50 final limit; board path is `mission/BOARD.md` (A4, C §8).


## Event-day official rules (2026-10-24, from the organizers' notice — read `docs/event-day-official.md`)

- Submission form has 9 fields (서비스 이름 · 한 줄 소개 · 타깃 해외 시장 · 데모 링크 · 데모 사용법 · PDF ≤2 · 오늘 새로 만든 부분 · 기존 코드 가져옴 체크+내용 · 재제출 불가 확인). Check 7 reads them from MISSION 「제출물」 `양식 필드:` and fills the `양식 …` lines in SUBMISSION 「제출」. The pre-event harness import **must** be disclosed in the 「기존 코드 가져왔어요」 checkbox + text (the 사전 준비물 sentence).
- Judging is in submission order: 3 VC PASS = finals, 3 VC FAIL = out, finals close at 8 teams; VC review runs in earnest from 15:00. Sales records the live status page (제출 페이지 「실시간 현황 보기」) in `mission/BOARD.md` 「슬롯」.
- The deployed demo must stay up until **21:00** (VCs open the link themselves during the shark tank). Check 1 adds: no planned redeploy after submission; `app/RECOVERY.md` lists the last good tag.
- PDF: 16:9 1920×1080, every page carries the event logo band at the bottom (`templates/slide-kit/`); check 3 also looks for the band on both pages.
