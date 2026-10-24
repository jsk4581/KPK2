# BOARD — 2026-10-24 · 제출 목표 16:00 · 재계획 0회

데모 URL: https://kpk2-second-draft.vercel.app (앱 직접 주소 /app.html · Build가 팀 채널에 13:41 공유 · app/SMOKE.md 「실행 기록」 회차 1 13:12 배포 URL 3/3 · HANDOFF 「체크포인트」에 `데모 URL` 줄은 없음 — PM이 채널·SMOKE 기록에서 옮김)

> 작성 15:35 (PM) — G2 목표 10:35보다 늦게 만든 보드다. 상태는 HANDOFF 「결정」「체크포인트」「제안」· git log · mission/SUBMISSION.md · app/SMOKE.md의 기록만으로 적었다. 담당의 "완료했습니다" 말은 근거로 쓰지 않았다. Build 커밋 시각은 git에 UTC로 찍혀 있어 아래에는 +9h(KST)로 적는다.
> 제품명: Dream Achieve Moments (13:58 결정 · 개발 코드명 Second Draft). Sales 15:30 재검토 제안은 T20.

## 게이트

| 게이트 | 시각 | 확인 | 상태 |
|---|---|---|---|
| G1 | 10:20 | 후보 3개 점수 · 선택 1 · PRD 6문장 C·U·T 3 PASS | done |
| G2 | 10:35 | 작업표·파일 소유표·예산표 확정 · 빈 배포 URL 존재 | done |
| G3 | 13:00 | 핵심 장면이 배포 URL에서 작동 (SMOKE 3/3) | done |
| G4 | 14:45 | 테스트 기록 · 시뮬레이션 표기 · submit-gate precheck | doing |
| G5 | 15:30 | 2장 파일·90초 스크립트 확정 → submit-gate final | doing |
| G6 | 16:00 | submit-gate 판정 → PM 제출 (목표·상한 16:00 · 최종 한계 16:50) | ready |

게이트 실적 (근거):

- G1 done 11:30 — 목표 10:20보다 70분 늦음. HANDOFF 「결정」 11:30 (후보 A 선택, PRD v1) · 커밋 99f6a1d 11:28 (DECISION.md · PRD.md) · PRD v2 12:25 (커밋 62fff7e, 「결정」에 기록 — SMOKE(Build)·PITCH(GTM) 소유자 ✓는 HANDOFF에 아직 없음).
- G2 done 15:35 (늦게) — 배포 URL은 13:12 SMOKE 실행 기록·13:41 팀 채널 공유로 존재 확인. 보드(이 파일)는 15:35 작성 · 커밋은 PM(`feat(board): G2`). 첫 공개 배포 🚨 승인 줄(사전 승인 R8 또는 「결정」)은 HANDOFF에 없음 — 결함으로 기록.
- G3 done — HANDOFF에 integrate 기록 없음. 커밋과 실행 기록으로 대체: SMOKE 재작성 6ceb759 (13:13) · tests 2225381 (13:13) · fallback 재동기화 98c5f62 (13:13) · app/SMOKE.md 「실행 기록」 회차 1 13:12 배포 URL 3/3 (Playwright) · mission/SUBMISSION.md 「테스트」 회차 1 14:15 배포 URL 3/3 (Sales 수동). 미충족: app/RECOVERY.md 「지금 상태」 미갱신(빈칸) · good 태그 없음(git tag: pre-event만).
- G4 doing — 테스트 기록 있음(SUBMISSION 「테스트」 회차 1–3: 14:15 · 14:22 · 15:19, 모두 배포 URL 3/3) · 체크 1·2 PASS(Sales 14:12·14:15) · 체크 3–10 NOT_RUN · mission/EVIDENCE.md 미생성(시뮬레이션 표기·`--stage evidence` 불가) · 14:45 precheck 회차 기록 없음 · 14:00 freeze 뒤에도 web/ 커밋 계속(15:23까지).
- G5 doing — mission/PITCH.md 미생성 · pitch/slides.pdf 미생성 · 초안: docs/gtm/slides-draft/slides.pdf v4.2 (Sales 15:20) + Second Draft 제목 변형 slides-sd.pdf (15:31) · GTM 슬라이드 제안 docs/gtm/gonzalo/ (15:01–15:16).
- G6 ready — 현재 판정 revise (SUBMISSION 14:15). X-3: G4·G5가 done이 되기 전에는 approve 불가.

## 작업

| # | 작업 | 담당 | 소유 파일 | 마감 | 게이트 | 의존 | 상태 |
|---|---|---|---|---|---|---|---|
| T1 | 보드·파일 소유·예산 확정 (sprint-board board) — 15:35 늦게 작성, 커밋은 PM | 우영 | mission/BOARD.md | 10:35 | G2 | - | done |
| T2 | 빈 첫 배포 — Vercel 배포 URL 존재 (SMOKE 기록 13:12 · 채널 공유 13:41) | 준서 | web/ | 10:35 | G2 | - | done |
| T3 | app/SMOKE.md 3단계 + 「완료 조건」 (PRD v2 3·6 원문) — 커밋 6ceb759 13:13 | 준서 | app/SMOKE.md | 10:45 | G3 | - | done |
| T4 | app/tests red → green 커밋 — 2225381 13:13 | 준서 | app/tests/ | 11:00 | G3 | T3 | done |
| T5 | PRD v2 + 데모 줄기(하이브리드 B) 결정 기록 — 커밋 62fff7e 12:23 · 「결정」 12:25 | 우영 | mission/PRD.md | 12:25 | G3 | - | done |
| T6 | 시장 근거 후보 E1–E70 + 1차 출처 검증 (market-claims · verify-e68-e59 · verify-payers) — 1e650c0 11:40 → 46479a1 13:41 | 태진 | docs/gtm/ | 12:30 | G3 | - | done |
| T7 | EVIDENCE 「주장」 v1 (E-id·라벨 — docs/gtm/market-claims.md 후보에서 선별) — mission/EVIDENCE.md 미생성 | 곤살로 | mission/EVIDENCE.md#주장 | 11:00 | G3 | - | doing |
| T8 | 피치 골격 — 2장 뼈대 + 주장 ID 목록 (pitch-compile skeleton) — mission/PITCH.md 미생성 | 곤살로 | mission/PITCH.md | 12:30 | G5 | T7 | doing |
| T9 | 핵심 장면(P0: 경로 3 → 주 3 → Not today) 배포 URL에서 작동 — SMOKE 회차 1 13:12 · SUBMISSION 테스트 회차 1 14:15 | 준서 | web/ | 13:00 | G3 | T2,T4 | done |
| T10 | 결정 브레인 코어 + MCP/REST 서버 (app/logic.js 공유) — 86f5cff 14:04 → e73a9e4 15:28 | 우영 | brain/ | 14:00 | G4 | T5 | done |
| T11 | freeze · fallback 재동기화 · RECOVERY 「지금 상태」 갱신 · good-1400 태그 — fallback 98c5f62만, RECOVERY 빈칸·태그 없음·freeze 뒤 커밋 계속 | 준서 | app/ | 14:00 | G4 | T9 | doing |
| T12 | Buyer simulation S1–S3 v2 [SIMULATION] — 초안 docs/gtm/journey-io.md 11:38, 배포 URL 실행 결과 EVIDENCE 미기입 | 태진 | mission/EVIDENCE.md#Buyer simulation | 14:45 | G4 | T9 | doing |
| T13 | MVP 테스트 기록 「테스트」 (배포 URL 3/3) — 회차 1–3 14:15·14:22·15:19 · 커밋 4db9a41 → 87b24f2 | 태진 | mission/SUBMISSION.md | 14:45 | G4 | T9 | done |
| T14 | submit-gate precheck (체크 1~9 드라이런, 제출 없음) — 체크 1·2 PASS, 3–10 NOT_RUN | 태진 | mission/SUBMISSION.md | 14:45 | G4 | T8,T13 | doing |
| T15 | 발표자료 초안 v0–v4.2 (키트 2장 · 라벨 표기 · 화면 캡처) — a4f8a7e 13:53 → 36a4775 15:31 | 태진 | docs/gtm/slides-draft/ | 15:00 | G5 | T6 | done |
| T16 | GTM 리서치·시나리오(Maya)·슬라이드 제안 — 4961d14 14:00 → a9d7805 15:16 | 곤살로 | docs/gtm/gonzalo/ | 15:00 | G5 | - | done |
| T17 | 랜딩·앱 카피를 PRD 톤·제품명(Dream Achieve Moments)으로 맞춤 — bb5ce6a 14:40 · 99aad11 14:49 · Sales 15:11 확인 | 준서 | web/ | 15:15 | G5 | T9 | done |
| T18 | PITCH final (라벨 점검 · 90초 스크립트) + pitch/slides.pdf — 미생성 | 곤살로 | mission/PITCH.md | 15:30 | G5 | T8,T12,T15 | doing |
| T19 | integrate G3·G4·G5 (X-1~X-5 · 어긋남 → 「제안」) — HANDOFF에 integrate 기록 없음, 이 보드 작성이 첫 정리 | 우영 | HANDOFF.md#제안 | 15:30 | G5 | - | doing |
| T20 | 제품명 최종 결정 — 13:58 Dream Achieve Moments 유지 여부 (Sales 15:30 Second Draft 재검토 제안, 15:40까지) | 우영 | HANDOFF.md#결정 | 15:40 | G5 | - | doing |
| T21 | submit-gate final → 판정 (검사자 ≠ 작성자, X-5) | 태진 | mission/SUBMISSION.md | 15:45 | G6 | T14,T18 | todo |
| T22 | 제출 확정 · 양식 9칸 · 제출 1회 · 접수 확인 저장 → G6 approved → submitted | 우영 | mission/BOARD.md | 16:00 | G6 | T21 | todo |
| T23 | 슬롯 관측 — 10:00부터 매시, 13:00부터 30분 (append-only) — 12:00=8 한 건만 기록, 13:00 이후 미관측 | 태진 | mission/BOARD.md#슬롯 | 16:00 | G6 | - | doing |

## 파일 소유

| 파일 | 소유 | 쓰기 규칙 |
|---|---|---|
| mission/MISSION.md | PM(우영) | 소유자만 |
| mission/DECISION.md | PM(우영) | 소유자만 |
| mission/PRD.md | PM(우영) | 소유자만 |
| mission/BOARD.md | PM(우영) | 소유자만 |
| mission/BOARD.md#슬롯 | Sales(태진) | append-only |
| mission/EVIDENCE.md#주장 | GTM(곤살로) | 소유자만 |
| mission/EVIDENCE.md#Buyer simulation | Sales(태진) | 소유자만 |
| mission/PITCH.md | GTM(곤살로) | 소유자만 |
| mission/SUBMISSION.md | Sales(태진) | 소유자만 |
| mission/DEMODAY.md | GTM(곤살로) | 소유자만 |
| pitch/slides.pdf | GTM(곤살로) | 소유자만 |
| app/ | Build(준서) | 소유자만 |
| web/ | Build(준서) | 소유자만 |
| android/ | Build(준서) | 소유자만 |
| brain/ | PM(우영) | 소유자만 |
| testset/ | PM(우영) | 소유자만 |
| docs/research/ | PM(우영) | 소유자만 |
| docs/gtm/ (docs/gtm/gonzalo/ 제외) | Sales(태진) | 소유자만 |
| docs/gtm/gonzalo/ | GTM(곤살로) | 소유자만 |
| HANDOFF.md#결정 (머리 mode·stage · 「현재 단계」 포함) | PM(우영) | 소유자만 |
| HANDOFF.md#제안 | 전원 | append-only |
| HANDOFF.md#체크포인트 | 전원 | append-only |
| HANDOFF.md#블로커 | 전원 | append-only |
| log/ (자기 역할 파일만) | 전원 | 소유자만 |

## 예산

| 사람 | 세션 수 | 모델 | 잔여 중단선 | 시간 상한 |
|---|---|---|---|---|
| PM(우영) | 2 (log pm_1 11:00 + 보드·brain 세션) | Claude Code · 행사 계정(Console 크레딧) · 권장 Opus(결정·PRD·brain) | 잔여 $50 of $500 이하면 새 작업 중단 — 마지막 수정·검증용으로 남긴다 | 한 문제 재시도 3회 · 총 30분 |
| Build(준서) | 1 이상 (당일 log 없음 — 커밋 12:42–15:23 기준) | Claude Code · 행사 계정(Console 크레딧) · 권장 Sonnet(빌드·테스트) | 잔여 $50 of $500 이하면 새 기능 중단 — 마지막 수정·재배포용으로 남긴다 | 한 문제 재시도 3회 · 총 30분 |
| GTM(곤살로) | 1 이상 (당일 log 없음 — 커밋 14:00–15:16 기준) | Claude Code · 행사 계정(Console 크레딧) · 권장 Opus(피치) | 잔여 $50 of $500 이하면 새 작업 중단 — 2장·스크립트 마무리용으로 남긴다 | 한 문제 재시도 3회 · 총 30분 |
| Sales(태진) | 2 (log sales-buyer_1 11:16 · _2 12:55) | Claude Code · 행사 계정(Console 크레딧) · 권장 Sonnet(검사·시뮬레이션) | 잔여 $50 of $500 이하면 새 작업 중단 — submit-gate final용으로 남긴다 | 한 문제 재시도 3회 · 총 30분 |

## 슬롯

| 시각 | 남은 슬롯 | 출처 |
|---|---|---|
| 10:00 | 미관측 | - |
| 11:00 | 미관측 | - |
| 12:00 | 8 | 화면 직접 관측 · Sales(태진) (12:55 늦게 기록 · HANDOFF 「체크포인트」 줄을 PM이 15:35 옮김 — Sales 14:31 시각 정정본 기준) |
| 13:00 | 미관측 | - |
| 13:30 | 미관측 | - |
| 14:00 | 미관측 | - |
| 14:30 | 미관측 | - |
| 15:00 | 미관측 | - |
