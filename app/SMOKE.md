# SMOKE · 2026-10-24

> 심사위원이 배포 URL을 열고 하는 3단계다. 사이트 첫 화면(`/`)은 Dream Achieve Moments 소개 페이지이고, 아래 데모 구역의 CSS 폰 안에 앱(`/app.html`)이 iframe으로 들어 있다. 화면의 페르소나(Dana)와 라이프로그는 전부 가상(synthetic, `[SIMULATION]`)이다.
> 2단계 맨 앞은 `mission/PRD.md` v2 3번 문장의 빈칸, 「완료 조건」 첫 줄은 6번 문장의 빈칸을 글자 그대로 옮긴 것이다 (X-2 · X-4, `node --test app/tests`가 확인). PRD 버전이 오르면 이 파일을 다시 맞추고 HANDOFF 「체크포인트」에 ✓.
> 2단계 입력칸 문장은 `app/tests/smoke-input.js`의 `SMOKE_INPUT`과 같다 (`app/data/persona-dana.json` `fields.career` 첫 문장).
> LLM 키가 없으면 `/api/paths`가 표시된 폴백을 돌려준다. 경로 카드 아래 출처 표시가 `Sample result`이면 폴백, `AI-drafted`면 LLM 응답이다. 둘 다 통과로 본다.
> Progress 탭의 "Where you stand" 패널(`Rules-based, no AI` 표시)은 brain 서버가 규칙(결정론, AI 아님)으로 낸 판단(Energy · Momentum · Confidence · Risk of stalling, 다음 마일스톤, 막는 것, 다음 한 걸음)을 `[SIMULATION] synthetic history` 표시와 함께 보여 준다. 서버에 닿지 못하면 패널 자리에 `Live analysis is unavailable, so this shows the signals from this device.` 한 줄이 나온다. 둘 다 통과로 본다.

대상 URL: https://kpk2-second-draft.vercel.app · PRD v2
앱 직접 주소: https://kpk2-second-draft.vercel.app/app.html (브라우저가 iframe을 막아 폰 안 앱이 비어 보이면 이 주소에서 2 · 3단계를 그대로 한다. 결과는 같고 통과로 본다)
자동 실행: 터미널 `npm --prefix web test` (화면 · 서버 함수 단위 시험) · `npm --prefix web run test:e2e` (로컬 개발 서버 + `/api/paths` 대역, 폰 · 노트북 너비) · `node --test app/tests` (판단 함수 `app/logic.js` · 하네스 규칙)

## 단계

1. 대상 URL(`/`)을 연다 (로그인 없이 · 폰 너비와 노트북 너비에서 한 번씩). 아래로 스크롤하거나 「Try the demo」를 눌러 데모 구역의 폰으로 간다.
   - 기대: 위쪽 내비게이션에 브랜드 "Dream Achieve Moments"와 「Try the demo」 버튼이 보이고, 소개 페이지에 "Simulation · synthetic data" 표시가 있다. 「Try the demo」를 누르면 데모 구역으로 이동하고, 폰 화면 안에 앱의 Landing이 보인다: 「Load sample persona」 · 「Start」 버튼, 위쪽 「Reset」 버튼, "Nothing you type is stored." 문구, `[SIMULATION] Sample persona: synthetic` 표시. 로그인 화면이나 오류 배너는 없다.
2. 사용자의 경력과 쌓인 라이프로그를 읽어 전문성이 이어지는 커리어 경로 3개와 지금 상태에 맞춘 이번 주 행동 3개로 바꾸는 것: 폰 안에서 「Load sample persona」를 누른다 → 라이프로그 카드(Connected data)를 보고 「Continue」 → 「Show my paths」 → 경로 카드 하나에서 「Choose this path」. 이어서 입력칸으로 한 번 더: 「Reset」 → 「Start」 → 경력 칸(Your work and what you're good at)에 `Seven years as a freelance copywriter for DTC and SaaS brands: email flows, landing pages, product launches.`를 넣고 「Show my paths」 → 「Choose this path」.
   - 기대: 라이프로그 카드에 가상 라이프로그 목록과 미리 채워진 3칸이 보인다. 두 번 모두 경로 카드 3장이 나오고 카드마다 What carries over · What you'd need to build · How you'd start가 있으며, 카드 아래에 출처 표시(키 없음 `Sample result` · 키 있음 `AI-drafted`)가 보인다. 경로를 고르면 This week 화면에 이번 주 행동 3개가 보인다. 소개 페이지와 폰 안 앱 모두 새로고침되지 않는다.
3. This week 화면에서 행동 하나의 「Not today」를 누른다 → 「See progress」 → 「Reset」.
   - 기대: "Today was a rest day, not a missed day."와 10분 행동 한 줄(`If you have 10 minutes: …`), `Moved to <요일>` 줄이 보인다. 행동은 그대로 3개이고 지워진 것이 없다 (요약 `0/3 done · 1 moved`). 빨간 경고색이나 실패 표현은 없다. 「See progress」를 누르면 Progress 탭에 "Where you stand" 패널(`Rules-based, no AI` 표시)이 보이거나, brain 서버에 닿지 못하면 그 자리에 `Live analysis is unavailable, so this shows the signals from this device.` 한 줄이 보인다. 「Reset」을 누르면 Landing(「Load sample persona」)으로 돌아가고, 「Start」의 입력칸 3개는 비어 있다.

## 완료 조건

- 배포 URL에서 샘플 페르소나의 라이프로그 카드 또는 입력칸으로 경로 3개가 나오고 하나를 고르면 이번 주 행동 3개와 Not today 응답이 이동만 하고 삭제 없이 작동 (위 3단계가 배포 URL에서 3/3 PASS, 기록은 아래 「실행 기록」)
- 「Reset」을 누르면 Landing으로 돌아가고 입력이 남지 않는다 (다음 심사자를 위한 것).

## 실행 기록

Build가 적는다. 「통과 단계」 칸 끝에 대상과 방식을 붙인다: `3/3 (배포 URL · 브라우저)` · `3/3 (로컬 · 브라우저)`. G3 · 체크 2 · F1의 근거는 `(배포 URL …)` 행뿐이다. 14:00–14:45 테스트 회차는 Sales가 `mission/SUBMISSION.md` 「테스트」에 따로 적는다.

| 회차 | 시각 | 통과 단계 | 실패 | 조치 |
|---|---|---|---|---|
| 1 | 13:12 | 3/3 (배포 URL · 브라우저) | 없음 | 없음 · Playwright chromium 자동 실행, 폰 390x844 3/3 · 노트북 1280x800 3/3, `/api/paths` 대역 없이 실제 함수(키 없음, 출처 `Sample output (offline)`), 화면 사진 `web/e2e/screens/smoke-*.png` |
