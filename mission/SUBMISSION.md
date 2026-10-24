# SUBMISSION — 2026-10-24

검사자: Sales(태진)
확정: PM(우영)
시각: 14:15
소스 커밋: 38627aa
배포 버전: 배포 시각 미확인(14:12 접근 확인) + 커밋 미확인 — Build 기입
발표 파일 sha256: 미제출 — 초안 v2 docs/gtm/slides-draft/slides.pdf d4d3835e84c06a67f515e86147a966379d88d54ac35e9ff181f108cf86151b7a (pitch/slides.pdf 생성 후 교체)

<!-- submit-gate 영수증. 머리의 `검사자:`는 영수증 작성자(기본 Sales)다 — 보통 확정자(PM)와 다른 사람이지만 검증하지 않는다 (행 단위 규칙은 X-5. PM은 체크 3·5·6을 검사하고 확정도 한다). 사람 표기는 `역할(이름)`.
회차: 14:45 precheck = 체크 1–9 드라이런(제출 없음) · 15:30 final = 10행 전부. 16:00이 목표·상한 — PASS면 16:00 전에도 낸다. 16:50이 최종 한계이고 F1–F5(체크 1·3·4·5·10)가 PASS일 때만 그때까지 낸다.
「체크」: 결과는 PASS · FAIL · NOT_RUN 중 하나 — 돌리지 못한 검사는 NOT_RUN이고 FAIL과 같이 다룬다. 「테스트」 통과 단계: `3/3 (배포 URL · 브라우저)`처럼 대상과 방식을 붙인다. -->

## 체크

| # | 확인 | 결과 | 증거 | 검사자 | 시각 |
|---|---|---|---|---|---|
| 1 | 데모 URL 접근 | PASS | https://kpk2-second-draft.vercel.app 을 로그인 없이 노트북 폭(1366)·폰 폭(390) 브라우저로 열어 Landing 확인 — 제목 "Second Draft" · "Nothing you type is stored." · `[SIMULATION] Sample persona: synthetic` · Load sample persona/Start/Reset 버튼, 로그인·오류 배너 없음 (캡처 landing-laptop.png · landing-phone.png) | Sales(태진) | 14:12 |
| 2 | 핵심 행동 실행 (SMOKE 3/3) | PASS | 배포 URL 브라우저 수동 실행 3/3 — Load sample persona → Connected data → Show my paths → 경로 카드 3장(What transfers · What's missing · First 2 weeks, 출처 표시 `Sample output (offline)`) → Choose this path → This week 행동 3개 → Not today → "Today was a rest day, not a missed day." · Moved to <요일> · 0/3 done · 1 moved → Reset → Landing (「테스트」 회차 1) | Sales(태진) | 14:15 |
| 3 | 2장 파일 (페이지 ≤ 2) | NOT_RUN | pitch/slides.pdf 미생성 — 초안 docs/gtm/slides-draft/slides.pdf 2쪽(참고) | PM(우영) | 14:15 |
| 4 | 개인정보 0 | NOT_RUN | Build 검사 대기 — 참고: `python scripts/pii_scan.py docs/gtm` SUMMARY hits=0 (15:05) | Build(준서) | 14:15 |
| 5 | 라벨·시뮬레이션 표기 | NOT_RUN | mission/EVIDENCE.md · mission/PITCH.md 미생성 → C-T2·C-E3·X-1 검사 불가 | PM(우영) | 14:15 |
| 6 | 심사기준 매핑 | NOT_RUN | mission/PITCH.md 미생성 | PM(우영) | 14:15 |
| 7 | 제출 양식 필드 | NOT_RUN | Build 검사 대기 — 「제출」 양식 줄 초안 아래 | Build(준서) | 14:15 |
| 8 | 복구 경로 | NOT_RUN | app/RECOVERY.md 마지막 정상 태그·재배포 실측 미확인 — Build 확인 요청 | Sales(태진) | 14:15 |
| 9 | 해시·커밋 | NOT_RUN | 배포 커밋 미기입 · pitch/slides.pdf 없음 → 해시 3종 대조 불가 | Sales(태진) | 14:15 |
| 10 | 시각·슬롯 | NOT_RUN | Build 검사 대기 — 참고: 슬롯 13:00=8 (HANDOFF 체크포인트) · 행사 모드 log PM 1/4 · Sales 1/4 확인, Build·GTM log 미확인 | Build(준서) | 14:15 |

## 산출물

| 종류 | 파일/링크 | 버전 | 크기 | sha256 |
|---|---|---|---|---|
| 소스 커밋 | main | 38627aa | 커밋 | 커밋 38627aa |
| 배포 URL | https://kpk2-second-draft.vercel.app | 배포 시각·커밋 미확인 (Build 기입) | URL | 커밋 미확인 |
| 발표 파일 | pitch/slides.pdf | 미생성 | - | - |

## 테스트

| 회차 | 시각 | 통과 단계 | 실패 | 조치 |
|---|---|---|---|---|
| 1 | 14:15 | 3/3 (배포 URL · 브라우저) | 없음 — 경로 카드 출처 `Sample output (offline)`(LLM 키 없음 폴백, SMOKE 기준 통과) | 결함(기능 영향 없음): 폰 폭 390px에서 Landing 소개 문단 오른쪽 잘림 → Build에게 HANDOFF 「제안」 |
| 2 | 14:22 | 3/3 (배포 URL · Playwright headless Chrome 430×932) | 없음 — Load sample persona → Continue → Show my paths → What transfers 카드 3장(Skill overlap 67%) → Choose this path → This week 3개 → Not today → "Today was a rest day, not a missed day." · Moved to Sat · 0/3 done · 1 moved | 캡처 5장 `docs/gtm/slides-draft/shot-*.png` → 덱 2장에 삽입 |

## 알려진 결함

- precheck 14:45 예정 — 14:12 체크 1·2 선행 실행, 3–10은 precheck에서
- #3 NOT_RUN — pitch/slides.pdf 미생성 · 담당 GTM
- #5 NOT_RUN — mission/EVIDENCE.md · PITCH.md 미생성 · 담당 GTM/PM
- #6 NOT_RUN — mission/PITCH.md 미생성 · 담당 GTM
- #8 NOT_RUN — 복구 경로 실측 미확인 · 담당 Build
- #9 NOT_RUN — 배포 커밋·발표 파일 해시 미확정 · 담당 Build/GTM
- Landing 폰 폭 문단 잘림(표시 결함, SMOKE 통과) · 담당 Build

## 판정

revise

## 제출

- 담당: PM
- 시각: 미제출
- 접수 확인: 미제출
- 타임아웃 시: 재전송 금지, 접수 상태 확인
- 양식 팀명: 팀 김박구이
- 양식 데모 링크: https://kpk2-second-draft.vercel.app
- 양식 파일: pitch/slides.pdf (미생성 · 양식 용량 제한 확인 필요)
- 양식 설명·소개: Second Draft — an AI career agent that turns a displaced professional's expertise into three career paths that transfer, this week's three actions, and a check-in that never shames.
- 양식 사전 준비물: 「기존 코드 가져왔어요」 체크 + 「무엇을 가져왔나요」에 "사전 준비물: 팀 프로세스 하네스(계약·스킬·템플릿·검증기)와 빈 앱 골격(제품 기능 0) — 10:00 새 공개 레포의 첫 커밋(pre-event 태그)으로 가져옴, 그 이후가 당일 작업"
- 양식 서비스 이름: Second Draft
- 양식 한 줄 소개: Your expertise, redrafted for the AI era — an AI career agent for workers whose jobs are being rewritten by AI.
- 양식 타깃 해외 시장: US · freelance copywriters and writers, 3–10 years of experience, losing clients to generative AI
- 양식 데모 사용법: ① Landing에서 「Load sample persona」(또는 「Start」 후 3칸 입력) ② 「Continue」 → 「Show my paths」 → 경로 카드에서 「Choose this path」 ③ This week에서 「Not today」를 눌러 "rest day" 응답과 이동(삭제 없음) 확인 · 로그인 없음 · 끝나면 「Reset」
- 양식 오늘 새로 만든 부분: `git diff --stat pre-event..HEAD -- app/ web/` 요약 — Build 기입
- 양식 공개 레포: https://github.com/jsk4581/KPK2
