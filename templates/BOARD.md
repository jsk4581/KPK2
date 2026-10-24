# BOARD — <YYYY-MM-DD> · 제출 목표 16:00 · 재계획 <n>회

데모 URL: <배포 URL — Build가 HANDOFF 「체크포인트」에 `데모 URL <URL> · <HH:MM> · Build`로 알리면 PM이 옮긴다. 없으면 `없음 (T2 보류 <HH:MM>)`>

<!-- 정본 경로는 `mission/BOARD.md` 하나다 — 루트에 BOARD.md를 만들지 않는다. G2(10:35)까지 PM이 sprint-board로 이 템플릿을 `mission/BOARD.md`로 복사해 채운다.
쓰기: 이 파일의 쓰기 주체는 PM 하나다 — 예외는 「슬롯」 행 덧붙이기(Sales, append-only)뿐. 작업 상태 변경은 담당이 HANDOFF 「체크포인트」에 `T<n> <상태> · 커밋 <hash>`로 알리고 PM이 옮긴다.
「게이트」: G1–G6 여섯 행. G1–G5 상태는 todo / doing / done / blocked, G6만 ready → approved → submitted (C-B1). 제출 승인(X-3)은 G1–G5가 전부 done이면 된다 — G6은 제출 그 자체다.
그 밖의 시각(게이트 아님): 10:00부터 매시·13:00부터 30분마다 슬롯 관측(Sales) · 12:30 pitch-compile skeleton(GTM) · 14:00 freeze · 14:45 submit-gate precheck(체크 1–9 드라이런, 제출 없음) · 15:30 submit-gate final. 체크가 PASS면 16:00 전이라도 낸다.
「작업」: `#`는 `T1`, `T2` … 겹치지 않게. 담당은 이름 1명(쉼표 금지). 의존은 `-` 또는 있는 T 번호(여럿이면 쉼표), 순환 금지 (C-B2).
「파일 소유」: 아래 행은 이미 다 들어 있다 — 지우지 말고 `<이름>`만 채운다. 소유는 `<역할>(<이름>)`, 쓰기 규칙은 `소유자만` 또는 `append-only` (C-B3). 발표 파일이 PPTX면 `pitch/slides.pdf`를 `pitch/slides.pptx`로 바꾼다 (MISSION 「제출물」). submit-gate 검사자는 이 표의 소유자와 달라야 한다 (X-5).
「예산」: 사람별 4행 — 잔여 중단선(이 이하면 새 작업을 멈추고 마지막 수정·검증용으로 남긴다)과 시간 상한(한 문제에 3회 재시도라도 총 30분) (C-B4).
「슬롯」: Sales가 맨 아래에 한 행씩 덧붙인다 — 기존 행 수정 금지, 출처는 어디서 본 숫자인지. 남은 슬롯 ≤ 2이면 즉시 PM에게 🚨 한 결정. 행 0개도 된다 (C-B5). `[예시]` 행은 지운다. -->

## 게이트

| 게이트 | 시각 | 확인 | 상태 |
|---|---|---|---|
| G1 | 10:20 | 후보 3개 점수 · 선택 1 · PRD 6문장 C·U·T 3 PASS | <todo\|doing\|done\|blocked> |
| G2 | 10:35 | 작업표·파일 소유표·예산표 확정 · 빈 배포 URL 존재 | <todo\|doing\|done\|blocked> |
| G3 | 13:00 | 핵심 장면이 배포 URL에서 작동 (SMOKE 3/3) | <todo\|doing\|done\|blocked> |
| G4 | 14:45 | 테스트 기록 · 시뮬레이션 표기 · submit-gate precheck | <todo\|doing\|done\|blocked> |
| G5 | 15:30 | 2장 파일·90초 스크립트 확정 → submit-gate final | <todo\|doing\|done\|blocked> |
| G6 | 16:00 | submit-gate 판정 → PM 제출 (목표·상한 16:00 · 최종 한계 16:50) | <ready\|approved\|submitted> |
| G3 | 13:00 | [예시] 배포 URL에서 SMOKE 3/3 PASS 보고 · 커밋 기록 | done |

## 작업

| # | 작업 | 담당 | 소유 파일 | 마감 | 게이트 | 의존 | 상태 |
|---|---|---|---|---|---|---|---|
| T1 | [예시] PRD 3번 문장으로 SMOKE 3단계 작성 | 준서 | app/SMOKE.md | 10:45 | G3 | - | todo |

## 파일 소유

| 파일 | 소유 | 쓰기 규칙 |
|---|---|---|
| mission/MISSION.md | PM(<이름>) | 소유자만 |
| mission/DECISION.md | PM(<이름>) | 소유자만 |
| mission/PRD.md | PM(<이름>) | 소유자만 |
| mission/BOARD.md | PM(<이름>) | 소유자만 |
| mission/BOARD.md#슬롯 | Sales(<이름>) | append-only |
| mission/EVIDENCE.md#주장 | GTM(<이름>) | 소유자만 |
| mission/EVIDENCE.md#Buyer simulation | Sales(<이름>) | 소유자만 |
| mission/PITCH.md | GTM(<이름>) | 소유자만 |
| mission/SUBMISSION.md | Sales(<이름>) | 소유자만 |
| mission/DEMODAY.md | GTM(<이름>) | 소유자만 |
| pitch/slides.pdf | GTM(<이름>) | 소유자만 |
| app/ | Build(<이름>) | 소유자만 |
| HANDOFF.md#제안 | 전원 | append-only |
| HANDOFF.md#체크포인트 | 전원 | append-only |
| HANDOFF.md#블로커 | 전원 | append-only |
| [예시] log/2026-10-24_build_1.md | Build(준서) | 소유자만 |

## 예산

| 사람 | 세션 수 | 모델 | 잔여 중단선 | 시간 상한 |
|---|---|---|---|---|
| PM(<이름>) | <n> | <행사 계정 모델> | <잔여 크레딧 n% 이하면 새 작업 중단> | <한 문제 재시도 3회 · 총 30분> |
| Build(<이름>) | <n> | <행사 계정 모델> | <잔여 크레딧 n% 이하면 새 작업 중단> | <한 문제 재시도 3회 · 총 30분> |
| GTM(<이름>) | <n> | <행사 계정 모델> | <잔여 크레딧 n% 이하면 새 작업 중단> | <한 문제 재시도 3회 · 총 30분> |
| Sales(<이름>) | <n> | <행사 계정 모델> | <잔여 크레딧 n% 이하면 새 작업 중단> | <한 문제 재시도 3회 · 총 30분> |
| [예시] Build(준서) | 4 | Claude (행사 계정) | 잔여 크레딧 30% 이하면 새 기능 중단 — 마지막 수정·검증용으로 남긴다 | 한 문제 재시도 3회 · 총 30분 |

## 슬롯

| 시각 | 남은 슬롯 | 출처 |
|---|---|---|
| 13:00 | 8 | [예시] 행사장 접수 화면 (Sales가 직접 봄) |
