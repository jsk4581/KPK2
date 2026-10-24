---
name: pitch-compile
description: Compiles DECISION, PRD, EVIDENCE and the deployed demo into the two-slide hand-in plus a 90-second script in mission/PITCH.md (from templates/PITCH.md). Every number and every traction word carries a label on the same line, simulations are marked, and nothing is presented as traction that did not happen. Mode skeleton (12:30) lays out both slides and the claim-ID list early, then v1 (14:00), review with one objection per role (14:45, after the buyer simulation) and final by G5 15:30 with a read-aloud time measured by the presenter and the 제출 파일 section (file, pages ≤ 2, size in bytes). If the team passes the first round, mode demoday writes mission/DEMODAY.md for the 10-minute pitch at 19:00. GTM/pitch role. Invoke with /pitch-compile <skeleton|v1|review|final|demoday>, or read this file and follow it if slash commands are unavailable.
requires:
  - (없음)
enhanced_by:
  - python3 : scripts/validate_mission.py mission --stage pitch checks C-T1 to C-T9 and, when mission/EVIDENCE.md exists, X-1 (slide tags and 라벨 점검 vs EVIDENCE IDs and labels) — so a raised label fails at G5, not only at submit (and C-Y1 to C-Y3 for DEMODAY.md)
  - shell/git : copies the template, commits PITCH.md and pitch/slides.<pdf|pptx> at G5, sha256 and size of the exported file (shasum -a 256 · wc -c · Windows certutil -hashfile <file> SHA256)
  - a slide tool the team already uses (Google Slides / Keynote / HTML) : the two-page file itself
  - google chrome (headless) : scripts/export_slides.sh prints pitch/slides.html (from templates/slide-kit/template.html) to pitch/slides.pdf and reports 페이지·크기·sha256 for `## 제출 파일` and the SUBMISSION header
degraded:
  - no slide tool (or AI-only, no human at the keyboard) : PITCH.md holds both slides as Markdown with exact text and layout notes; the human lays them out and exports. Never invent the export values — write `크기: 사람 기입 대기` (and `페이지: 사람 기입 대기` if not exported) and `낭독: 사람 측정 대기`; `--stage pitch` reports them as WARN, `--stage submit` as FAIL until a human fills real values
  - no python3 : the contract rules are checked by reading (Self-check list) and reported per rule-id as PASS / FAIL / NOT_RUN 수동 점검; the script is word-counted by hand
  - no file access : content comes back as Markdown and the owner saves it (T0 relay, 4 fields)
  - no git but file access : commit PITCH.md and the slide file through the GitHub web editor, then append `T<n> done · 수정 <HH:MM> · GTM` to HANDOFF 「체크포인트」 (never skip the status line); the slide sha256 still comes from shasum / certutil
verified_on:
  - (미검증)
---

# pitch-compile — two slides, labelled

Status: `specified` (HTHn v1.1). Output language: Korean unless `mission/MISSION.md` `## 제출물` requires another language — then that language, with a one-line Korean gloss under each slide heading as a `>` quote (labels apply to it too). Owner of `mission/PITCH.md`, `mission/DEMODAY.md` and the slide file: GTM·피치 (곤살로) unless `mission/BOARD.md` says otherwise.

## Inputs

`mission/DECISION.md`, `mission/PRD.md` (and its `버전` line), `mission/EVIDENCE.md` (`## 주장` E<n> for skeleton/v1, plus Buyer simulation S<n> for final), the demo URL and one screenshot (`mission/BOARD.md` / demo-build), `mission/MISSION.md` `## 심사기준` and `## 제출물`, `app/SMOKE.md` (click path), `app/RECOVERY.md` (fallback), `templates/PITCH.md`, `templates/DEMODAY.md`.

Degrade block (Korean, once, top of the first response) when something is missing:

```
[이 환경에는 슬라이드 도구가 없습니다]
 → PITCH.md에 두 장의 정확한 문구와 배치 메모를 씁니다. 사람이 슬라이드로 옮깁니다.
 → 건너뛴 것: 2장 파일 직접 생성 (해시·크기·쪽수는 사람이 내보낸 뒤 「제출 파일」에 기록 — 그 전까지 `크기: 사람 기입 대기` · `낭독: 사람 측정 대기`, pitch에서 WARN · 제출에서 FAIL)
```

## Contract (mission/PITCH.md — required headings, in this order)

First line `# PITCH — <YYYY-MM-DD>` (tail `· v<0|1|2|3>`; v0 = skeleton, v3 = final), then `## Slide 1` `## Slide 2` `## 스크립트 (90초)` `## 심사기준 매핑` `## 라벨 점검` `## 반론과 수정` `## 제출 파일`. Extra H2 sections are allowed between or after them; a required heading twice fails `S-dup-heading`.

- C-T1 no slide heading other than `## Slide 1` and `## Slide 2` — any heading matching `^## Slide (?![12]\s*$)` (`## Slide 3`, `## Slide 4`, `## Slide 2b` …) fails. If it does not fit, cut.
- C-T2 / C-T5 in Slide 1 and Slide 2 bodies, two kinds of line need a label **on the same line**:
  - a **market/result number line** — a number with a unit `%` `원` `달러` `$` `억` `만` `천` `배` `명` `건` `분` `시간` `초` `곳` `개` `팀` `종` `MAU` `DAU` (time units included: a before/after claim like `절감 11분` is exactly the claim that needs a label);
  - a **traction-word line** — `계약` `인터뷰` `실사용자` `매출` `파일럿` `MOU` `결제` `구매 의향` `지불` `고객 <n>` (the same list as DEMODAY C-Y3 and `roles/gtm-pitch.md`).
  The label is one of the four (`verified` `single-source` `hypothesis` `simulation`) — cite as `(E<n> · <label>)` with the EVIDENCE `## 주장` ID and the **same** label — or `(제품 사양)` for a line that only states what the product itself does (e.g. `입력은 1,000자까지 (제품 사양)`). Mechanically `(제품 사양)` satisfies the rule, but **never use it to excuse a traction word** — traction stands only with `simulation` / `hypothesis`, or a `verified` E-ID, and even then prefer to delete it.
- **Simulation findings use E-IDs only.** Buyer-simulation rows (`S<n>`) are never cited on a slide or in `## 라벨 점검` (C-T7 rejects non-E IDs, X-1 only knows `## 주장` IDs). To use a simulation finding, GTM adds an `E<n>` row to EVIDENCE `## 주장` with 라벨 `simulation` and 출처 `[SIMULATION] 구매자 시뮬레이션 S1–S3` (like good-01's E3), and the slide line cites `(E<n> · simulation)`, keeping `[시뮬레이션]` in the wording.
- C-T3 the 90-second script is at most 220 words (split on whitespace; the `낭독:` line and placeholder-only lines are not counted). That is the contract cap — **for Korean aim at about 130–150 어절**, because 220 어절 read aloud is about 130 seconds; above 150 the validator WARNs.
- C-T6 under `## 스크립트 (90초)` one `낭독:` line, ≤ 95 seconds, in one of three forms: `낭독: <n>초 (추정)` (drafts, AI estimate) · `낭독: 사람 측정 대기` (AI-only, WARN until the receipt run) · `낭독: <n>초 (측정 <HH:MM> <발표자>)` (the presenter read it with a timer). v3 without a line, or with a value that has no number, FAILs; the receipt run (`--stage submit`) requires the `(측정 …)` form.
- C-T4 `## 심사기준 매핑` is a table `심사기준 | 어디서 다루나` covering every criterion in MISSION.md.
- C-T7 `## 라벨 점검` is a table `주장 ID | 슬라이드 | 라벨` with at least one row whenever a slide holds a number or traction line; only when the slides hold none, a single line `없음` instead.
- C-T8 `## 제출 파일` has three lines: `파일: pitch/slides.pdf` (or `.pptx`) · `페이지: <n>` (n ≤ 2) · `크기: <바이트 정수>`. From v3 (title tail `· v3`) and in the receipt run the validator opens the file: it must exist at that path, 크기 must equal its byte size, the counted pages must equal 페이지, and words like `계획` `미측정` `미기록` `미내보냄` FAIL.
- C-T9 (v3 and the receipt run) `## 반론과 수정` has exactly four rows, one per role: PM · Build · GTM · Sales.
- X-1 every `주장 ID` under `## 라벨 점검` (and every inline `(E<n> · <label>)` tag) is an `E<n>` that exists in EVIDENCE `## 주장` with the same label (an `S<n>` fails C-T7 and X-1). No label is upgraded on a slide. Runs at `--stage pitch` (G5) whenever EVIDENCE.md exists, and again in the receipt run.

## Slide spec (default — override from MISSION.md 제출물)

| Slide | Content | Source |
|---|---|---|
| 1 — 문제·고객·왜 지금 | problem in one sentence · the one customer · why now (one labelled claim) · what we chose not to do | DECISION, PRD 1–2 and 5, EVIDENCE |
| 2 — 데모·차별점·시장·GTM | screenshot + URL · the core scene in 3 steps (= `app/SMOKE.md`) · one differentiation line · market claim with label · first GTM move · the ask | PRD 3–6, EVIDENCE, demo |

## Mode skeleton (12:30, before G3 — v0)

The pitch exists early so a slot crunch never finds it missing.

1. `git pull --rebase --autostash`. Copy `templates/PITCH.md` to `mission/PITCH.md` (tail `· v0`). Keep every required heading.
2. Fill both slides as bullet skeletons from DECISION and PRD (problem, customer, not-doing, core scene, and the demo line `데모: 미확정 (G3 대기)` until the BOARD `데모 URL:` line has a URL). Every line that will carry a number or traction word gets its planned tag now — `(E<n> · <label>)` from EVIDENCE v1 — or is cut.
3. Fill `## 라벨 점검` with the **claim-ID list**: one row per E-ID the slides will use, label copied from EVIDENCE. Fill `## 심사기준 매핑` with every criterion and the planned slide line.
4. Leave the script, `낭독:` and `## 제출 파일` as template slots. Commit `docs(mission): pitch skeleton` and append `T<n> done · 커밋 <hash> · GTM` to HANDOFF.md 「체크포인트」. Structure (S-*) must PASS now; content FAILs on the empty slots are expected until v1.

## Mode v1 (14:00–14:45)

1. `git pull --rebase --autostash`. Fill the remaining `<...>` slots in `mission/PITCH.md` (tail `· v1`): final Slide 1 text, Slide 2 text with layout notes and the real demo URL (from the BOARD `데모 URL:` line), the 90-second script with `낭독: <n>초 (추정)`, and update `## 라벨 점검` — one row `주장 ID | 슬라이드 | 라벨` per claim used, ID and label copied from EVIDENCE (the slide line carries the same tag).
   **Expected at v1 (write them down, do not chase them):** C-T8 / C-empty on `## 제출 파일` (the file is exported at G5) — or WARN if you wrote `사람 기입 대기`. Any other FAIL (C-T2, C-T5, X-1 …) is real.
2. Claims still `hypothesis` are listed first under `## 라벨 점검` so the review sees them.
3. Self-check, commit `docs(mission): pitch v1`.

## Mode review (14:45–15:10)

Starts after the Buyer simulation (T9, 14:45) so Sales objects with its result; Sales sends the objection by 15:00, after dispatching the precheck lines. Each role gives exactly one objection: PM — scope honesty · Build — does the demo claim match what runs at the URL · GTM — market claim labels · Sales — buyer reason and simulation wording. Record the four objections and the fix for each as rows `역할 | 반론 | 수정` under `## 반론과 수정` — exactly four rows, one per role (C-T9 at v3). Produce v2.

**No demo URL at 15:10.** If the BOARD `데모 URL:` line still has no URL, write Slide 2's demo line as exactly `데모: 로컬 시연 (배포 URL 없음)` (no `링크를 열고` request) and send the PM one 🚨 decision: `A 로컬 시연 피치로 마무리 (제출 판정 불가 — 체크 1 FAIL) · B 배포 승인을 다시 요청 · 보류`. submit-gate check 1 is FAIL while that token is on the slide.

## Mode final (15:10–15:30 = G5)

1. Apply EVIDENCE v2 (a simulation finding appears only through its `simulation`-labelled `E<n>` row in `## 주장` — cite `(E<n> · simulation)` and keep `[시뮬레이션]` in the wording; never `S<n>`). If the PRD version rose after G2, make the slides match it and answer `✓ PRD v<n>` under the HANDOFF 「결정」 line.
2. Produce v3 (final); export the two-page file in the format MISSION.md requires to the fixed path `pitch/slides.<pdf|pptx>` and commit it. Count its pages in the exported file. Fill `## 제출 파일`: `파일:` · `페이지:` (≤ 2) · `크기:` (bytes, `wc -c` or file properties). Record name, size and sha256 (`shasum -a 256`, Windows `certutil -hashfile <file> SHA256`; size + modified time only if no hash tool works at all) in one line in HANDOFF.md 「체크포인트」 for the submit-gate checker, who copies it into SUBMISSION (`발표 파일 sha256:` header and `## 산출물` row `발표 파일`). Any later change to the file invalidates the receipt.
3. The **presenter** reads the script aloud once with a timer and writes `낭독: <n>초 (측정 <HH:MM> <발표자>)` under the script; it must be ≤ 95 (target 90). Over 95 → cut words, read again. An AI cannot do this step: an AI-only run writes `낭독: 사람 측정 대기` and asks the presenter — never a made-up number.
4. Self-check, commit `feat(mission): G5 pitch final`, and append `T<n> done · 커밋 <hash> · GTM` to HANDOFF.md 「체크포인트」. The PM runs `/sprint-board integrate` (X-1, X-5, I-3) before marking G5 `done` and sets HANDOFF.md `stage: pitch`.

## Mode demoday (17:00–19:00, only if the team passes the first round)

Copy `templates/DEMODAY.md` to `mission/DEMODAY.md` (`# DEMODAY — <YYYY-MM-DD>`), headings fixed: `## 타임라인 (10분)` `## 데모 경로` `## 예상 질문 10` `## 복구` `## 리허설 기록`.

- 타임라인: 문제·고객 2분 → 라이브 데모 4분 → 시장·GTM·근거 2분 → 요청·팀 1분 → 버퍼 1분.
- 데모 경로: the click path from `app/SMOKE.md` (reset first).
- 예상 질문 10 (C-Y1): table `질문 | 답 | 라벨`, exactly ten rows; every number keeps its EVIDENCE label, simulation stays labelled. An answer with a traction phrase needs 라벨 `simulation`/`hypothesis` or a verified `(E<n> · verified)` in the answer (C-Y3).
- 복구: the `good-<HHMM>` snapshot redeploy and the static fallback from `app/RECOVERY.md`.
- 리허설 기록 (C-Y2): table `회차 | 낭독 시간(초) | 메모`, at least two timed rehearsals.
- Slides stay at two pages unless the organizers say otherwise for the evening.

## Self-check (validator or manual)

- T2: `python3 scripts/validate_mission.py mission --stage pitch` → `SUMMARY ... fail=0` (skeleton: S-* PASS, content FAIL expected). Fix every `FAIL`; quote the rule-id. Read every `WARN` (pending human values, script over 150 어절, estimated read time at v3) — G5 is not `done` while a `사람 … 대기` WARN is open.
- T0: read and report each rule-id PASS / FAIL / NOT_RUN — S-dup-heading · C-T1 · C-T2 · C-T3 (count script words on whitespace) · C-T4 (every **bold** criterion in MISSION 「심사기준」 is a mapping row) · C-T5 · C-T6 · C-T7 · C-T8 · C-T9 · X-1 (compare every tag and every 라벨 점검 row with EVIDENCE); for DEMODAY.md also C-Y1, C-Y2, C-Y3. Report `수동 점검 PASS n/11 · FAIL … · NOT_RUN …` (n/14 with DEMODAY).

## Do not

- No traction, users, revenue, interviews or contracts that did not happen.
- No number line or traction line without a label on the same line. No label upgrades without a new source in EVIDENCE. No `(제품 사양)` on a traction claim.
- No third slide, under any heading.
- No change to the slide file after its hash is in SUBMISSION without telling the checker.

## 사람이 하는 일

- 12:30 곤살로(GTM): 피치 골격 — 2장 뼈대와 쓸 주장 ID 목록(「라벨 점검」)을 커밋한다. 슬롯이 급하게 줄어도 낼 피치가 있게 하는 단계다.
- 14:00 곤살로: v1. 14:45 전원: 반론 1개씩 (태진은 시뮬레이션 결과로, 15:00까지). 15:10 곤살로: 최종 — 데모 URL이 아직 없으면 `데모: 로컬 시연 (배포 URL 없음)` + 우영에게 🚨. 15:30(G5) 파일 확정 — 「제출 파일」에 파일·쪽수(2 이하)·크기(바이트, 실제 파일과 같게).
- 숫자 줄과 실적 단어(계약·인터뷰·실사용자·매출·파일럿·고객 n) 줄에는 같은 줄에 라벨을 붙인다. 실적이 아닌 제품 설명만 `(제품 사양)`.
- 발표자는 스크립트를 소리 내어 읽고 시간을 재 `낭독: <n>초 (측정 <HH:MM> <발표자>)`로 적는다 (95초 이하, 목표 90초 · 한국어 약 130–150어절). AI는 이 값을 지어내지 않는다 — `사람 측정 대기`.
- 1차 통과 시 17:00 곤살로: 10분 피치 준비. 19:00 전 리허설 2회, 「리허설 기록」에 `회차 | 낭독 시간(초) | 메모`로 적는다.

## Changes (v1.1)

- New mode `skeleton` at 12:30 (v0): two-slide skeleton plus the claim-ID list in `## 라벨 점검`, so a pitch exists before G3 (A5).
- New required section `## 제출 파일` with `파일:` `페이지:` (≤ 2) `크기:` (C-T8); measured `낭독: <n>초` ≤ 95 (C-T6).
- Number and traction lines need a label (four labels or `(제품 사양)`) on the same line (C-T2, C-T5), with `(제품 사양)` never excusing traction; any slide heading other than 1/2 fails (C-T1); `## 라벨 점검` needs ≥ 1 row whenever such a line exists (C-T7); simulation findings reach the slides only as a `simulation`-labelled `E<n>` row in EVIDENCE `## 주장` (C-T7 / X-1 accept E-IDs only).
- DEMODAY 리허설 기록 uses `회차|낭독 시간(초)|메모` (C-Y2); board path is `mission/BOARD.md` (A4); manual checks report PASS / FAIL / NOT_RUN (A3).


## Event slide kit (2026-10-24 official — `templates/slide-kit/GUIDE.md`)

The organizers' kit overrides generic layout choices. Hard rules: 16:9 **1920×1080**, **max 2 pages**, final file **PDF** (`pitch/slides.pdf`); **every page** has the logo band image at the bottom, ~90% of page width, ~3% bottom margin, never recolored, resized out of ratio or overlapped (`footer-for-dark-slides.png` on dark backgrounds, `footer-for-light-slides.png` on light); team name small at top-left; body text ≥ 28px; key phrases in **English** (overseas target market); no third page, no unrelated company logos.

Content map (kit): **Slide 1 — 무엇을, 누구에게**: service name + one-liner · target overseas market (country + customer, concrete) · the customer's problem in 1–2 lines · chosen topic (VC topic name or Wildcard). **Slide 2 — 오늘 만든 것**: 1–2 real screenshots of today's product · how it works and where Claude is used · why this team can solve it, next-7-day plan (optional). Keep every number labelled exactly as the contract requires (C-T2/C-T5); the band is not a place for text.

Fastest path: `mkdir -p pitch && cp templates/slide-kit/template.html pitch/slides.html`, fill the team info from PITCH Slide 1·2 (keep every label), then `bash scripts/export_slides.sh pitch/slides.html pitch/slides.pdf` — it copies the logo-band PNGs next to the HTML, prints with headless Chrome (fonts embedded) and reports `파일·페이지·크기` for `## 제출 파일` plus the sha256 for the SUBMISSION header. No Chrome: open the HTML in a browser → Print → Save as PDF with margins **None** and **Background graphics** on, then run the same script on the PDF for the report. Then check 3 (pages ≤ 2, band on both pages, Korean glyphs by eye). Read `templates/slide-kit/README.md`. Embedded Korean fonts: verify glyphs in the exported PDF (rehearsal defect H3).

**Finals (shark tank, 19:00)**: 8 teams × (3-minute pitch **in English** + 7-minute Q&A **in Korean**) in front of 6 VCs, presented from our own laptop (bring the HDMI adapter). `demoday` mode therefore writes an English 3-minute script (~380–420 words at a calm pace) under 「타임라인 (10분)」 rows 3' + 7', plus Korean answers in 「예상 질문 10」. The demo URL must stay live until 21:00.
