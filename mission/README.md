# mission/ — 당일 오버레이

> **09:00 전에는 비어 있다. `mission-intake`가 만든다.** 행사 전(`HANDOFF.md` `mode: pre_event`)에는 이 README 말고 아무 파일도 두지 않는다 — 구조 테스트가 확인한다.
> **주최 측 공지 원문은 별도 파일로 저장하지 않는다** (`mission/_announcement.md` 같은 파일은 구조 테스트 FAIL). 원문은 `MISSION.md` 「원문」에만 둔다 — 모든 줄 앞에 `> `를 붙인 인용으로 (원문의 `## 심사기준` 같은 제목도 `> ## 심사기준`이 되어 헤딩 계약을 깨지 않는다. 코드 펜스 ``` 는 쓰지 않는다 — 검증기가 펜스 안을 지워 「원문」이 비게 된다).

미션이 공개되면 아래 파일이 순서대로 생긴다. 양식은 `templates/`에, 기계 검사는 `scripts/validate_mission.py`에 있다.

| 파일 | 만드는 스킬 | 기본 소유 (`CONTRACT.md` §C 3) | stage | 시각 |
|---|---|---|---|---|
| `MISSION.md` | mission-intake (intake·options) | PM | intake (후보 행 0 허용) → decide (후보 3행) | 09:55 · 10:20 |
| `DECISION.md` | mission-intake (decide) | PM | decide | G1 10:20 |
| `PRD.md` | mission-intake (decide) — 둘째 줄 `버전: v<n> (<HH:MM>)` | PM | decide | G1 10:20 |
| `mission/BOARD.md` | sprint-board — **작업판 정본** | PM (「슬롯」 행 추가만 Sales, append-only) | board | G2 10:35 |
| `EVIDENCE.md` | evidence-research (market·simulation) | `#주장` GTM · `#Buyer simulation` Sales | evidence (시뮬레이션 표 행 0 허용 = v1) | 11:00 · 14:45 |
| `PITCH.md` | pitch-compile (12:30 skeleton → final) | GTM | pitch | G5 15:30 |
| `SUBMISSION.md` | submit-gate (14:45 precheck · 15:30 final) + demo-build test 기록 | Sales (판정·제출 확정은 PM) | submit (앞 단계 전부 재검사 + X-1~X-5) | G6 16:00 |
| `DEMODAY.md` | pitch-compile (demoday) — 1차 통과 시에만 | GTM | demoday | 19:00 전 |

- **작업판은 이 폴더의 `mission/BOARD.md` 하나다.** repo 루트에 `BOARD.md`를 만들지 않는다. G2 전에는 없으므로 브리핑은 "보드 없음 (G2 전)". 최종 파일 소유는 당일 그 「파일 소유」표가 정한다.
- 각 파일 첫 줄은 `# <NAME> — <YYYY-MM-DD>`.
- 시뮬레이션 내용은 `[SIMULATION]`(부분 문자열이면 된다 — `[SIMULATION] 리허설용`도 통과), 근거 라벨은 `verified` · `single-source` · `hypothesis` · `simulation` 중 하나.
- 검사: `python3 scripts/validate_mission.py mission --stage <intake|decide|board|evidence|pitch|submit|all>` (python이 없으면 스킬의 체크리스트를 직접 읽는다). 결과 줄은 `PASS` · `FAIL` · `WARN`(사람이 볼 것 — 실패는 아니다), 마지막 줄 `SUMMARY pass=<n> fail=<n> warn=<n>`. `HANDOFF.md`가 `mode: event`이면 `scripts/check.sh`와 CI가 `stage`까지 자동으로 검사한다 (`bash scripts/check.sh --stage submit`으로 단계를 지정할 수 있다).
- 리허설이 끝나면 이 README만 남기고 비운다 (`mission/BOARD.md` 포함) — HANDOFF는 `mode: pre_event` · `stage: intake`.
