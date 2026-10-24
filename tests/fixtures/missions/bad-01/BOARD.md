# BOARD — 2026-10-24 [SIMULATION]

> [SIMULATION] 의도적으로 틀린 fixture다. G6 행 누락(C-B1) · 담당 2명(C-B2) · Buyer simulation 소유 행 누락(C-B3) · G5 미완료인데 approve(X-3).

## 게이트

| 게이트 | 시각 | 확인 | 상태 |
|---|---|---|---|
| G1 | 10:20 | 후보 3개 점수화 · PRD 6문장 | done |
| G2 | 10:35 | 작업표·파일 소유표·예산표 확정 | done |
| G3 | 13:00 | 핵심 장면이 배포 URL에서 작동 | done |
| G4 | 14:45 | MVP 테스트 기록과 시뮬레이션 표기 | done |
| G5 | 15:30 | 2장과 90초 스크립트 확정 | doing |

## 작업

| # | 작업 | 담당 | 소유 파일 | 마감 | 게이트 | 의존 | 상태 |
|---|---|---|---|---|---|---|---|
| T1 | PRD 확정과 보드 작성 | 우영 | mission/PRD.md | 10:35 | G2 | - | done |
| T2 | 영수증 분류 화면 구현 | 준서, 태진 | app/index.html | 13:00 | G3 | T1 | done |
| T3 | 2장과 스크립트 | 곤살로 | mission/PITCH.md | 15:30 | G5 | T2 | doing |

## 파일 소유

| 파일 | 소유 | 쓰기 규칙 |
|---|---|---|
| mission/MISSION.md | 우영 | 소유자만 |
| mission/DECISION.md | 우영 | 소유자만 |
| mission/PRD.md | 우영 | 소유자만 |
| mission/BOARD.md | 우영 | 소유자만 |
| mission/EVIDENCE.md#주장 | 곤살로 | 소유자만 |
| mission/PITCH.md | 곤살로 | 소유자만 |
| mission/SUBMISSION.md | 태진 | 소유자만 |
| app/ | 준서 | 소유자만 |
| HANDOFF.md#제안 | 전원 | append-only |

## 예산

| 사람 | 세션 수 | 모델 | 잔여 중단선 | 시간 상한 |
|---|---|---|---|---|
| 우영 | 2 | Claude (행사 크레딧) | 잔여 30% 이하면 중단 | 30분 |
| 준서 | 4 | Claude (행사 크레딧) | 잔여 20% 이하면 중단 | 30분 |
| 곤살로 | 2 | Claude (행사 크레딧) | 잔여 30% 이하면 중단 | 30분 |
| 태진 | 2 | Claude (행사 크레딧) | 잔여 30% 이하면 중단 | 30분 |

## 슬롯

| 시각 | 남은 슬롯 | 출처 |
|---|---|---|
