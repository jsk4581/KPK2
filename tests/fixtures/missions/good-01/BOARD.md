# BOARD — 2026-10-24 · 제출 목표 16:00 · 재계획 0회 [SIMULATION]

> [SIMULATION] 제출이 끝난 뒤의 상태다 (G6 submitted). 제출 직전 상태는 테스트가 이 파일을 변이해 만든다 (G6 approved).

## 게이트

| 게이트 | 시각 | 확인 | 상태 |
|---|---|---|---|
| G1 | 10:20 | 후보 3개 점수화 · 선택 · PRD 6문장 C·U·T | done |
| G2 | 10:35 | 작업표·파일 소유표·예산표 확정 · 빈 배포 URL 존재 | done |
| G3 | 13:00 | 핵심 장면이 배포 URL에서 작동 | done |
| G4 | 14:45 | MVP 테스트 기록과 시뮬레이션 표기 · submit-gate precheck | done |
| G5 | 15:30 | 2장과 90초 스크립트 확정 | done |
| G6 | 16:00 | submit-gate approve → PM 제출 | submitted |

## 작업

| # | 작업 | 담당 | 소유 파일 | 마감 | 게이트 | 의존 | 상태 |
|---|---|---|---|---|---|---|---|
| T1 | PRD 확정과 보드 작성 | 우영 | mission/PRD.md | 10:35 | G2 | - | done |
| T2 | SMOKE와 테스트 먼저 작성 | 준서 | app/SMOKE.md | 11:00 | G3 | T1 | done |
| T3 | 메뉴 추천 화면 구현과 배포 | 준서 | app/index.html | 13:00 | G3 | T2 | done |
| T4 | 시장 근거 | 곤살로 | mission/EVIDENCE.md#주장 | 11:00 | G4 | T1 | done |
| T5 | 구매자 시뮬레이션 | 태진 | mission/EVIDENCE.md#Buyer simulation | 14:45 | G4 | T3, T4 | done |
| T6 | 2장과 스크립트 | 곤살로 | mission/PITCH.md | 15:30 | G5 | T4, T5 | done |
| T7 | 제출 검사 | 태진 | mission/SUBMISSION.md | 16:00 | G6 | T6 | done |

## 파일 소유

| 파일 | 소유 | 쓰기 규칙 |
|---|---|---|
| mission/MISSION.md | PM(우영) | 소유자만 |
| mission/DECISION.md | PM(우영) | 소유자만 |
| mission/PRD.md | PM(우영) | 소유자만 |
| mission/BOARD.md | PM(우영) | 소유자만 |
| mission/EVIDENCE.md#주장 | GTM(곤살로) | 소유자만 |
| mission/EVIDENCE.md#Buyer simulation | Sales(태진) | 소유자만 |
| mission/PITCH.md | GTM(곤살로) | 소유자만 |
| mission/SUBMISSION.md | Sales(태진) | 소유자만 |
| mission/DEMODAY.md | GTM(곤살로) | 소유자만 |
| app/ | Build(준서) | 소유자만 |
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
| 13:00 | 8 | [SIMULATION] 운영진 공지 |
| 13:30 | 7 | [SIMULATION] 운영진 공지 |
| 14:00 | 6 | [SIMULATION] 창구 확인 |
| 14:30 | 6 | [SIMULATION] 창구 확인 |
| 15:00 | 5 | [SIMULATION] 창구 확인 |
| 15:30 | 5 | [SIMULATION] 창구 확인 |
