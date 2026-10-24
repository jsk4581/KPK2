---
name: mission-intake
description: Turns the mission announced at 09:00 into a decision by G1 10:20. Three modes run back to back — intake (separate facts / interpretation / unknowns, judging criteria, prohibitions, deliverables), options (three candidate customer-problem pairs A/B/C from an all-hands ideation round), decide (PMF filter scored on Mission Fit, 8h demo feasibility, buyer reason, evidence; the PM records the choice by candidate ID and the versioned 6-sentence AI PRD with the C·U·T gate and one line of reasoning per letter). Writes mission/MISSION.md, DECISION.md, PRD.md from templates/. Everyone joins; the PM drives. Invoke with /mission-intake <intake|options|decide>.
requires:
  - (없음)
enhanced_by:
  - shell/git : copies templates/ into mission/, commits MISSION.md, DECISION.md, PRD.md at G1
  - python3   : scripts/validate_mission.py mission --stage intake / --stage decide checks the artifact contract mechanically
  - web search (only if the event rules allow it — check MISSION.md 금지사항 first) : quick evidence for the buyer-reason score
degraded:
  - no file access : the PM pastes the mission text and the three templates; outputs are returned as three Markdown blocks the PM saves into mission/
  - no python3 : the AI checks the contract rules listed under "Self-check" below by reading the files; each rule-id is reported PASS / FAIL / NOT_RUN as "수동 점검", never as a validator PASS
  - no web search : buyer-reason and evidence scores are marked `hypothesis`; nothing is invented
  - no git : commits go through the GitHub web editor (CONTRACT §C 7). The pre-event tag is made on GitHub web — Releases → Draft a new release → Choose a tag `pre-event` (Create new tag on `main`) → Publish; if that is blocked the PM writes `pre-event 기준: <last commit hash shown on GitHub web> · <HH:MM>` under HANDOFF 「결정」 before 10:00, and submit-gate check 9 diffs against that hash. With no hash at all (no GitHub access), the PM records the app/ content sha256 (submit-gate 「git 없음」 command) as `pre-event 기준: 내용 sha256 <64자리> · <HH:MM>`
verified_on:
  - (미검증)
---

# mission-intake — 09:00 → G1 10:20

Status: `specified` (HTHn v1.1). Output language: **Korean**. Keep quotations from the mission text verbatim in their original language.

## Inputs

- The mission text as announced (paste or file). Nothing else is required to start.
- `CONTRACT.md` (gate times, safety rules), `docs/event-rules.md` (official facts and open questions), `docs/prior-hypothesis.md` (pre-event hypothesis — labelled `미션 전 가설`, optional).
- `templates/MISSION.md`, `templates/DECISION.md`, `templates/PRD.md` — copy them into `mission/` and fill only the `<...>` slots. Never change or duplicate a template heading; the required H2 headings, in order, are the artifact contract (extra H2 sections may be added between or after them; a duplicated required heading fails `S-dup-heading`). Delete every `[예시]` row — a row containing `[예시]` is skipped by the validator, so leaving it hides nothing but adds nothing.

Brief completeness gate before moving to `options` (from H-001): the intake must state purpose, target users, context/constraints, prohibitions, and judging criteria. Any missing item is written under `## 미확인` with an assumption, never guessed.

Degrade block (Korean, once, top of the first response) when something is missing:

```
[이 환경에는 python3가 없습니다]
 → 검증기 대신 계약 규칙을 직접 읽어 점검합니다. 결과는 규칙 ID마다 PASS / FAIL / NOT_RUN "수동 점검"으로 표기합니다.
 → 건너뛴 것: scripts/validate_mission.py 자동 검사. HANDOFF.md가 mode: event가 된 뒤에는 push마다 CI가 mission/을 stage까지 다시 검사한다 (GitHub repo → Actions → check) — 그 전에는 이 수동 점검이 유일한 검사
```

## Mode 1 — intake (09:00–09:55, PM + everyone reading)

1. `git pull --rebase --autostash`. Copy `templates/MISSION.md` to `mission/MISSION.md`. First line: `# MISSION — <YYYY-MM-DD>`.
2. Paste the mission text under `## 원문` without editing a word, **as a blockquote: put `> ` in front of every line** (a heading in the announcement becomes `> ## 심사기준`, a blank line becomes `>`). Prefixing is not an edit; it keeps the organizer's own H2s from breaking the heading contract (S-MISSION-headings, S-dup-heading). Never use a ``` code fence — the validator drops fenced text and C-M1 then sees an empty 원문. Do not save the announcement as a separate file in `mission/` (the pre-event structure test fails on it); `## 원문` is its only home.
3. Split it into `## 사실` (stated in the text), `## 해석` (what we think it means — **every line ends with `(해석: <이름/역할>)`**), `## 미확인` (questions for the organizers — **every line contains `가정:`** followed by the assumption we take if unanswered).
   - **Two readings.** If the mission admits two different customers (e.g. worker-facing B2C vs organization-facing B2B), write one `## 해석` line per reading. Options mode then scores candidates from each; a reading the team rejects is recorded in DECISION `## 기각` as an extra row `해석: <읽기> | <이유>` (not counted as a candidate by C-D2). If the organization-facing reading wins, PRD sentence 5 must name the per-person visibility limit (e.g. `개인별 기록을 기관에 보여 주는 것`).
   - **Criteria we cannot show today.** For each judging criterion with no observable test on our two pages or in the demo (e.g. 해자·Moat, 야망·Ambition, "충분히 큰가"), add a `## 미확인` line `<기준> 판단 방법 — 가정: <2장과 데모에서 어떻게 보여 줄지 한 줄>`; the pitch states it as `hypothesis`.
   - **Organizer rule vs CONTRACT.** If the announcement allows something CONTRACT.md forbids (e.g. consented real personal data), keep the stricter CONTRACT rule unless the PM records otherwise in HANDOFF 「결정」; write the conflict in `## 미확인` with `가정:` and, at decide, the accepted score loss under DECISION `## 수용 리스크`. Use the prepared playbook `docs/event-rules.md` 「Real data 대응」 for a real-data criterion. If the organizer rule is stricter, it wins.
4. Extract `## 심사기준` and `## 금지사항 · 도구 규칙` verbatim. In `## 심사기준` write each criterion's name in **bold** (`- **Mission Fit** — <원문 설명>`): the validator (C-T4) requires every bold name in the PITCH mapping. Add the standing rules from CONTRACT.md: event Claude credits only, no other AI, no real personal data (even with consent), simulations labelled.
5. Extract `## 제출물` (what, format, where, by when), plus `팀명:` (copied from the CONTRACT.md 「팀명」 line; if it still says 미확인, a `## 미확인` line) and `양식 필드:` — every field name the submission form shows (e.g. 팀명 · 데모 링크 · 파일 · 한 줄 소개 60자); submit-gate check 7 reads this list. If the window is not 17:00 or the deliverable is not "demo link + up to 2 pages", tell the PM so sprint-board re-anchors. Ask the organizers whether code written before the event is allowed (event-rules U4) and record the answer under `## 사실`, or under `## 미확인` with an assumption. If it is not allowed, tell Build now: the empty-app path applies (demo-build step 0).
6. Keep the `## 후보` heading and its table header; zero rows is valid at the intake stage.
7. Before 10:00 the PM tags the last pre-event commit: `git tag pre-event && git push origin pre-event` (submit-gate check 9 diffs `app/` against it). Without git: the `no git` degraded path above (web Releases tag, else the boundary hash in HANDOFF 「결정」).
8. In the same commit as `mission/MISSION.md`, the PM sets HANDOFF.md `mode: event` and `stage: intake` (from now on CI validates the real `mission/` up to that stage; in a rehearsal also `rehearsal: true` — CONTRACT §C 10). Commit `feat(mission): intake` and push — target 09:55.

## Mode 2 — options (09:55–10:10, all hands)

Ideation round rules (multi-agent party mode, adapted for four humans):
- The PM is facilitator. Each round picks 2–3 voices (roles) to speak; the others listen. A round ends when someone asks a direct question or after 5 minutes.
- Three rounds maximum. Every candidate is one table row.
- If `docs/prior-hypothesis.md` fits the mission, it enters as one candidate — append `(미션 전 가설)` to its 고객 cell, no privilege.
- Optional: record the rounds under an extra `## 아이데이션 기록` H2 after `## 후보` (one line per round: who spoke, what changed). The candidate table stays exactly three rows.
- Output: the `## 후보` table in `mission/MISSION.md` with columns `# | 고객 | 문제 | 구매 이유 | 8h 데모 장면 | 라운드` and **exactly three rows** whose `#` is `A`, `B`, `C` (each once — C-M4). Fewer than three means the round is not done; more than three means merge. From here on every candidate is named by its ID (A/B/C), never by a paraphrase.
- Commit `feat(mission): candidates A/B/C` and push. The stage stays `intake` until G1.

## Mode 3 — decide (10:10–10:20, PM decides)

Score each candidate 1–5 (integers) on four axes:

| 축 | 질문 |
|---|---|
| Mission Fit | 심사기준·미션 문장과 얼마나 직접 닿는가 |
| 8h 데모 가능성 | G3(13:00)까지 핵심 행동 1개가 배포 URL에서 작동하는가 (실제 빌드 시간은 약 2.5시간 — 저위험·반복 가능·눈에 보이는 before/after) |
| 구매 이유 | 누가 왜 돈을 내는가가 한 문장으로 나오는가 |
| 근거 | 그 주장에 출처가 있는가 (없으면 hypothesis) |

Copy `templates/DECISION.md` to `mission/DECISION.md` (`# DECISION — <YYYY-MM-DD>`) and fill, keeping the heading order `## 선택` `## 점수` `## 기각` `## 시장 주장` `## 수용 리스크` `## 결정`:
- `## 선택`: the first line is exactly `선택: <A|B|C>` (C-D5), then one sentence of reason.
- `## 점수`: table `후보 | Mission Fit | 8h 데모 가능성 | 구매 이유 | 근거 | 합계`, exactly three rows, `후보` ∈ `A` `B` `C` (each once); the four middle cells are integers 1–5 and `합계` is their sum (C-D1).
- `## 기각`: table `후보 | 이유` with the two candidates not chosen, one reason each (C-D2). A rejected *reading* of the mission (step 3 "Two readings") is an extra row whose 후보 cell starts with `해석:` — C-D2 does not count it.
- `## 시장 주장`: one claim line carrying exactly one label from `verified | single-source | hypothesis | simulation` (C-D3).
- `## 결정`: one line with `결정자: <PM>` and `시각: <HH:MM>` (C-D4). If two or more candidates share the top 합계, add a line `동점 처리: <rule used and result>` — default rule: higher 8h 데모 가능성 wins (C-D6).

Copy `templates/PRD.md` to `mission/PRD.md`. First line `# PRD — <YYYY-MM-DD>`, and directly after it the version line `버전: v1 (<HH:MM>)` (C-P4). Then write the **6-sentence AI PRD** (BE AIC 2026-09-05 format). Keep each frame exactly and replace every blank — no `______`, `<...>`, `TBD` or `[예시]` may remain (C-P2). After stripping, each sentence must fully match its frame (C-P1):

```
1. 사용자는 (.+) 한 명입니다.
2. 이 사람은 (.+) 때문에 불편합니다.
3. 이 도구의 핵심 행동은 (.+) 하나입니다.
4. (.+?)(을|를) 넣으면 (.+?)(을|를|이|가) (보여줍니다|보여 줍니다|표시합니다).
5. 오늘은 ([^,，]+), ([^,，]+), ([^,，]+)(을|를) 하지 않습니다.
6. (.+)하면 완료입니다.
```

- Sentence 4: pick 을/를 and 을/를/이/가 to match the nouns (`음성을 넣으면 요약을 보여줍니다.` passes; `4. 음성 요약` fails).
- Sentence 5 names **exactly three** things, separated by two commas.
- Sentence 3's captured text is the core action. Build copies it **verbatim** into step 2 of `app/SMOKE.md` (X-2); sentence 6's captured text goes verbatim under SMOKE `## 완료 조건` (X-4). Write both as short concrete phrases someone can paste.

Then the scope gate under `## C·U·T` — three lines, each `PASS` or `FAIL` followed by ` — ` and **one line of reasoning about this mission** (C-P3; the template's sample reason is replaced, never left as is):

```
Clear: PASS — <왜 심사위원이 10초 안에 사용자와 불편을 이해하는가, 이 미션 기준 한 줄>
Usable: PASS — <입력·출력·완료 장면이 화면에 어떻게 보이는가 한 줄>
Tiny: PASS — <핵심 행동 하나가 왜 G3 13:00까지 끝나는가 한 줄>
```

If any letter is FAIL, narrow sentence 3 or add to sentence 5 and re-score until all three are PASS.

**PRD version rule.** Up to G2 (10:35) the PM may edit the PRD in place and keep `v1`. After G2 any change to the six sentences raises the version (`버전: v2 (<HH:MM>)`, …), is recorded in HANDOFF.md 「결정」 with the old and new sentence, and the owners of `app/SMOKE.md` (Build) and `mission/PITCH.md` (GTM) re-approve — each answers `✓ PRD v<n>` under that decision after updating their file. Until both ✓ exist, sprint-board integrate reports the gap.

**G1 rule.** If it is 10:20 and no decision exists, the PM picks the candidate with the highest 8h 데모 가능성 score. The skill reminds the PM of this at 10:15.

Commit `feat(mission): G1 decision` and push; the PM sets HANDOFF.md `stage: decide` in the same commit (or commits through the GitHub web editor; the T0 relay to the channel only as a last resort).

**Expected red after G1.** Once `mission/PRD.md` exists, the node X-2/X-4 tests compare it with `app/SMOKE.md`. While HANDOFF `stage` is intake/decide/board and SMOKE does not yet carry `PRD v<n>` (Build's T3, 10:45), they report `SKIP NOT_RUN` instead of failing — so the PM's G1 and G2 commits stay green. A red X-2/X-4 after `stage: evidence` is real.

## Self-check (validator or manual)

- T2: `python3 scripts/validate_mission.py mission --stage intake` after mode 1, `python3 scripts/validate_mission.py mission --stage decide` after mode 3 (decide re-runs every intake rule too, because options mode edits MISSION.md). Any `FAIL` line is fixed before G1; quote the failing rule-id to the PM. `WARN` lines are for a human to read; they do not block.
- T0 (no python3): check by reading, and report each rule-id as PASS / FAIL / NOT_RUN — S-dup-heading no required H2 twice · C-M1 원문 not empty · C-M2 every 해석 line ends with `(해석: ...)` · C-M3 every 미확인 line has `가정:` · C-M4 (decide) 후보 table exactly 3 rows, `#` = A, B, C once each · C-D1 점수 3 rows A/B/C, integers 1–5, 합계 correct · C-D2 기각 table `후보|이유` with the two others · C-D3 one label on the market claim · C-D4 `결정자:` and `시각:` · C-D5 `선택: <A|B|C>` first line · C-D6 `동점 처리:` line when tied · C-P1 six frames fully match · C-P2 no blank or placeholder captures · C-P3 C·U·T three lines with PASS and a reason · C-P4 `버전: v<n> (<HH:MM>)` line. Report as `수동 점검 PASS n/15 · FAIL … · NOT_RUN …`.

## Do not

- Do not present the pre-event hypothesis as the decision before scoring it.
- Do not invent judging criteria or constraints; write them under `## 미확인` with `가정:`.
- Do not change PRD sentences after G2 without raising the version and recording the decision.
- Do not spend past 10:20 on ideation. Ending it is the job.

## 사람이 하는 일

- 09:00 우영(PM): 미션 원문을 그대로 붙여넣는다 — 모든 줄 앞에 `> `(인용). 요약하지 않는다. 별도 파일로 저장하지 않는다. MISSION.md와 같은 커밋에서 HANDOFF를 `mode: event` · `stage: intake`로 바꾼다 (09:55).
- 09:55 우영: 심사기준 이름을 굵게 · 화면으로 못 보여 줄 기준은 「미확인」에 `가정:` · 팀명과 양식 필드를 「제출물」에 · 주최 측 규칙이 계약과 부딪히면 「미확인」 한 줄 (엄격한 쪽이 이긴다).
- 09:55 전원: 라운드 3회. 후보는 A·B·C 세 개로 끝내고, 이후에는 ID로만 부른다.
- 10:20 우영: 결정(G1) — `선택: A|B|C`. 결정 뒤에는 되돌리지 않는다 (G3에서 범위만 좁힌다). PRD 6문장은 C·U·T 세 줄이 전부 PASS이고 각 줄에 근거가 있어야 보드로 간다.
- G2 뒤 PRD를 바꾸면 우영이 버전을 올리고 HANDOFF 「결정」에 적는다. 준서(SMOKE)·곤살로(PITCH)는 고친 뒤 `✓ PRD v<n>`으로 답한다.
- 준서(Build)는 결정 직후 PRD 3번·6번 문장의 빈칸 내용을 받아 `app/SMOKE.md`에 그대로 옮긴다.

## Changes (v1.1)

- 후보 table gains `#` = A/B/C (C-M4 at decide; zero rows allowed at intake); DECISION uses those IDs: `선택: <A|B|C>` (C-D5), `## 기각` table `후보|이유` (C-D2), `동점 처리:` line (C-D6).
- PRD carries `버전: v<n> (<HH:MM>)` (C-P4) with a post-G2 change rule (version bump + HANDOFF 「결정」 + SMOKE/PITCH ✓); sentences use the v1.1 fullmatch frames; C·U·T lines need one line of reasoning each (C-P3); sentence 3 and 6 captures feed X-2 / X-4.
- HANDOFF `mode: event` + `stage: intake` are set in the MISSION.md commit (A2); manual checks report PASS / FAIL / NOT_RUN per rule-id (A3); S-dup-heading and extra-H2 rules from B1.
