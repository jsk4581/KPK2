---
name: evidence-research
description: Keeps every market, competition and buyer claim honest. Mode market (10:20–11:00, GTM) builds the 주장 section of mission/EVIDENCE.md v1 from templates/EVIDENCE.md, where each claim carries an ID (E<n>) that slides cite, a source, a year, a region and unit, a label (verified, single-source, hypothesis, simulation) and a confidence score. Mode simulation (14:00–14:45, Sales, before G4) runs two or three scripted buyer personas through the deployed demo and appends them as S<n> rows under the Buyer simulation section, under the fixed disclaimer line, labelled simulation and marked [SIMULATION]. The two sections have separate owners (GTM 주장 · Sales Buyer simulation). Invoke with /evidence-research <market|simulation>, or read this file and follow it if slash commands are unavailable.
requires:
  - (없음)
enhanced_by:
  - web search / fetch (only if the event rules allow external lookup; check mission/MISSION.md 금지사항 first) : sources for claims
  - python3 : scripts/validate_mission.py mission --stage evidence checks C-E1 to C-E4
  - shell/git : copies the template, commits mission/EVIDENCE.md v1 and v2
  - a browser : runs the buyer personas through the deployed demo URL
degraded:
  - no web access : every number is labelled hypothesis with the reasoning written out; nothing is invented to fill a cell
  - no python3 : the contract rules are checked by reading (Self-check list) and reported per rule-id as PASS / FAIL / NOT_RUN 수동 점검
  - no file access : the tables come back as Markdown and the section owner saves them (T0 relay, 4 fields)
  - no deployed URL at 14:00 : personas run against the local app over http (`node scripts/serve.mjs`) or app/fallback.html — but only after simulation step 0 confirms that target shows the PRD core scene; the 시도 cell starts with `(fallback)` or `(로컬)`
  - core scene not working yet, or the target is stale (step 0 fails) : walk each persona through the SMOKE.md 기대 text and, if node exists, call the app/logic.js core function read-only with the SMOKE step-2 input; the 시도 cell starts with `(데스크 워크스루 — 1·3단계 미실행)`, and one 제안 line goes to Build (`작성:Sales <HH:MM> · app/ · 핵심 장면 미구현/불일치 — S<n> 재실행 필요`); re-run on the URL after G3 if time allows
  - no git but file access : write the file, then append `T<n> done · 수정 <HH:MM> · <역할>` to HANDOFF 「체크포인트」 (or hand that line to the PM) — never skip the status line
verified_on:
  - (미검증)
---

# evidence-research — claims with labels

Status: `specified` (HTHn v1.1). Output language: **Korean**; keep source titles and quotes in their original language.

## Ownership (per section)

`mission/EVIDENCE.md` has two section owners (final word in `mission/BOARD.md` `## 파일 소유`):

- `## 주장` (`mission/EVIDENCE.md#주장`) — GTM·피치 (곤살로). GTM creates the file in market mode.
- `## Buyer simulation [SIMULATION — 실제 고객 아님]` (`mission/EVIDENCE.md#Buyer simulation`) — Sales (태진).

Each owner writes only their own section and never edits the other's rows; a change to the other section goes under HANDOFF.md 「제안」 (`작성:<역할> <HH:MM>`). Pull right before writing and push right after, so the two sections never collide.

Degrade block (Korean, once, top of the first response) when something is missing:

```
[이 환경에는 웹 검색이 없습니다]
 → 모든 수치를 hypothesis로 라벨하고 추론을 적습니다. 결과 표 구조는 같습니다.
 → 건너뛴 것: 출처 조회 (verified·single-source 라벨 불가)
```

## Labels (the only four)

| 라벨 | 뜻 |
|---|---|
| `verified` | two independent sources agree, or one primary source with year · region · unit. 출처 and 연도 (4 digits) are never empty, and the source is real — a `[SIMULATION]`, 가상, 시뮬레이션, 추론 or 없음 source can never be `verified` (C-E2) |
| `single-source` | one real source; 출처 and 연도 (4 digits) are never empty (C-E2); usable only with the source named on the slide |
| `hypothesis` | our reasoning, no source yet; the slide must say so |
| `simulation` | produced by our own buyer simulation or synthetic data; labelled on screen and on the slides |

A number without source, year, region and unit cannot be `verified`. A label never moves up without a new source.

## Inputs

`mission/DECISION.md` (`## 시장 주장` and its label), `mission/PRD.md` (sentences 1–2: user and problem; 3–6: core action and done condition), `mission/MISSION.md` (`## 금지사항 · 도구 규칙`), `templates/EVIDENCE.md`, the demo URL from `mission/BOARD.md`, and `app/SMOKE.md` for the persona click path.

## Mode market (10:20–11:00, GTM)

1. `git pull --rebase --autostash`. Copy `templates/EVIDENCE.md` to `mission/EVIDENCE.md`; first line `# EVIDENCE — <YYYY-MM-DD> · v1` (the template tail `· v<1|2>`). The title line belongs to GTM: only GTM changes the version, to `v2` after Sales hands over the S rows. Delete every `[예시]` row. Keep the required heading order: `## 주장` then `## Buyer simulation [SIMULATION — 실제 고객 아님]`, and keep the disclaimer line directly under the second heading (see simulation step 3).
2. List the claims the pitch will need, five to eight, no more: demand signal or market size · two or three competitors or substitutes and the gap · the buyer and why they pay · why now. Start from the DECISION `## 시장 주장` line and keep its label unless a new source justifies a change.
3. Fill `## 주장` with columns `ID | 주장 | 출처 | 연도 | 지역·단위 | 라벨 | 신뢰 | 쓰이는 곳` (C-E1):
   - `ID` = `E1`, `E2`, … unique and never reused — the pitch cites a claim as `(E<n> · <라벨>)`.
   - `출처` = title · URL or publisher (or `없음 — 추론: <한 줄>` for a hypothesis). A `[SIMULATION]`, 가상, 시뮬레이션, 추론 or 없음 source is never `verified` **or** `single-source` (C-E2) — label it `hypothesis`.
   - `연도` = the 4-digit reference year of the figure (`-` only for a hypothesis without a source).
   - `지역·단위` = where and in what unit the figure holds (e.g. `국내 · 명`, `글로벌 · 달러`; `-` when the claim has no number).
   - `라벨` ∈ the four above · `신뢰` = integer 1–5 · `쓰이는 곳` = `PRD`, `PITCH Slide 1`, `PITCH Slide 2` or `DEMODAY`.
4. If lookup is forbidden or unavailable, label `hypothesis`, write the reasoning, and emit the degrade block.
5. Leave the simulation table with its header row and the disclaimer line only (zero rows is valid in v1).
6. Self-check, then `git add mission/EVIDENCE.md && git commit -m "docs(mission): evidence v1" && git push`, and append `T<n> done · 커밋 <hash> · GTM` to HANDOFF.md 「체크포인트」 for the board row. The two weakest claims (by ID) feed the 12:30 pitch skeleton first. The PM sets HANDOFF.md `stage: evidence`.

## Mode simulation (14:00–14:45, Sales, feeds G4)

0. **Check the target first.** `git pull --rebase --autostash`, then re-read `app/SMOKE.md` and the newest HANDOFF 「체크포인트」 lines: SMOKE step 2 must contain the PRD sentence-3 text, and the target you will click (BOARD `데모 URL:`, else the local app or fallback.html) must show that scene. If it does not (stale fallback, core not built yet), use the degraded desk walkthrough above and say so in every 시도 cell.
1. Write two or three buyer personas from DECISION.md **before** running anything: role, situation, the substitute they use today, who decides the purchase, the objection they are likely to raise. Personas are invented; no real names, companies or contact details.
2. Run each persona once through the demo following the 3 steps in `app/SMOKE.md`. Record what they tried, what happened, the objection, and the one condition under which they would pay. The 시도 cell starts with how it ran: `(URL)` · `(로컬)` · `(fallback)` · `(데스크 워크스루 — 1·3단계 미실행)`.
3. Under `## Buyer simulation [SIMULATION — 실제 고객 아님]` the **first line** is exactly (C-E4):

   `> 구매 의사의 증거가 아님 — 발표에서도 simulation 라벨 유지`

   Append rows to the table with columns `ID | 페르소나 | 시도 | 결과 | 반론 | 지불 조건 | 라벨` (C-E3): `ID` = `S1`, `S2`, … unique, every 라벨 cell is `simulation`, and every 페르소나 cell starts with `[SIMULATION]` and ends with `· 대체재: <지금 쓰는 것> · 구매 결정: <누가>` (the table has no separate columns for them). Do not edit the title line — tell GTM the S rows are in, and GTM raises the tail to `v2`. Do not touch `## 주장` (GTM's section) — a simulation finding the pitch needs goes to GTM by ID (`S<n>`); GTM decides whether to add a `## 주장` row `E<n>` with 라벨 `simulation` (출처 `[SIMULATION] 구매자 시뮬레이션 S<n>…`), and only that `E<n>` may appear on a slide or in PITCH `## 라벨 점검` — never the `S<n>` itself (C-T7, X-1).
4. Never describe these rows as a customer interview, pilot, contract, purchase intent or user count — in the file, in chat or on the slides.
5. Self-check, commit `docs(mission): evidence v2 simulation` (append the `T<n>` status line to HANDOFF 「체크포인트」), and hand the two strongest findings, as `S<n>` with their `simulation` label, to GTM before 14:45 (G4) so GTM can turn them into `simulation` `E<n>` rows for the pitch.

## Self-check (validator or manual)

- T2: `python3 scripts/validate_mission.py mission --stage evidence` → `SUMMARY ... fail=0`. Fix every `FAIL` in your own section before handing off; quote the rule-id (a FAIL in the other section goes to its owner as one line).
- T0: read and report each rule-id PASS / FAIL / NOT_RUN — S-dup-heading no required heading twice · C-E1 `## 주장` columns `ID|주장|출처|연도|지역·단위|라벨|신뢰|쓰이는 곳`, IDs `E<n>` unique, every 라벨 in the four-label set, 신뢰 integers 1–5 · C-E2 every `verified` / `single-source` row has a non-empty real 출처 and a 4-digit 연도 · C-E3 simulation table columns `ID|페르소나|시도|결과|반론|지불 조건|라벨`, IDs `S<n>`, every 라벨 = `simulation` (zero rows allowed in v1) · C-E4 the disclaimer line is the first line under the simulation heading. Report `수동 점검 PASS n/5 · FAIL … · NOT_RUN …`.

## Do not

- Do not write a number to fill a cell. Empty plus `hypothesis` is correct; invented is not.
- Do not present simulation results as traction, interviews or validation.
- Do not edit the other owner's section of EVIDENCE.md.
- Do not look things up if MISSION.md forbids external tools; say so and label.
- Do not use any AI other than the event-provided Claude after 09:00.

## 사람이 하는 일

- 10:20–11:00 곤살로(GTM): 「주장」 5~8개, 각각 ID `E<n>` · 출처 · 연도 · 지역·단위. 11:00에 v1을 커밋하고 약한 주장 2개(ID로)를 12:30 피치 골격에 먼저 반영한다. 태진(Sales)은 구매 이유 주장을 「제안」으로 보탠다.
- 14:00 태진: 먼저 SMOKE 2단계와 데모 화면이 PRD 3번 장면인지 확인한다 (아니면 `데스크 워크스루`로 적고 준서에게 「제안」). 14:00–14:45 배포 URL에서 페르소나 2~3명을 돌리고 `S<n>`으로 적는다 — 시도 칸 맨 앞에 `(URL)`·`(로컬)`·`(fallback)`·`(데스크 워크스루 — 1·3단계 미실행)` 중 하나. 제목 줄 v2는 곤살로가 올린다. 시뮬레이션 절 첫 줄 "구매 의사의 증거가 아님 — 발표에서도 simulation 라벨 유지"를 지우지 않는다. 채널에 올릴 때 제목에 [시뮬레이션]을 붙인다.
- 숫자가 출처·연도 없이 남아 있으면 hypothesis로 둔다. 라벨을 올리고 싶으면 출처를 먼저 찾는다.

## Changes (v1.1)

- Section owners split (C §3): `## 주장` = GTM, `## Buyer simulation` = Sales; neither edits the other's rows.
- `## 주장` columns gain `연도` and `지역·단위`; `verified` and `single-source` need a real source and a 4-digit year (C-E1, C-E2).
- Simulation rows get IDs `S<n>` (C-E3) and the section starts with the fixed disclaimer line `> 구매 의사의 증거가 아님 — 발표에서도 simulation 라벨 유지` (C-E4); personas also record substitute and purchase decider.
- Manual checks report PASS / FAIL / NOT_RUN per rule-id (A3); board path is `mission/BOARD.md` (A4).
