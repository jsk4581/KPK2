# PITCH — 2026-10-24 · v2

> 초안 (DRAFT) · 소유 GTM(곤살로) · 저장 위치 `context/drafts/mission/PITCH.md` — `mission/PITCH.md`에는 GTM이 옮긴다.
> 기준: 덱 v4.2 (Sales, `docs/gtm/slides-draft/slides.html`) + 곤살로 합산 제안(`docs/gtm/gonzalo/combined-proposal/`) + `docs/brain/VC_QA.md` + `docs/brain/architecture-vc.html` + PRD v2 (12:25) + DECISION (11:30).
> 제품명: **Dream Achieve Moments** (PM 13:58 확정 · Sales 15:30 "Second Draft" 재검토 제안은 PM 결정 대기 — 바뀌면 Slide 1 제목 줄과 스크립트 첫 문장만 교체).
> 라벨 규칙: 슬라이드의 숫자 줄은 전부 `(E번호 · 라벨)` — E 번호와 라벨은 `docs/gtm/market-claims.md`(E1–E27 · E70)와 `docs/gtm/ai-displaced-occupations.md`(E28–E69) 그대로. 시뮬레이션 화면은 [SIMULATION]. 실적(계약·인터뷰·사용자 수)은 없다 — 쓰지 않는다.
> 금지어(`brain/messages.js` lint): 청중용 영어 문장에 fail · missed(단 "not a missed day"는 허용) · broken · streak · behind · lazy · should · must · excuse · just · "because you"를 쓰지 않는다. 스크립트·슬라이드 영어 줄 lint 15:45 통과.

## Slide 1

> 키트 매핑 — 「무엇을, 누구에게」: 팀명 좌상단 · 서비스 이름 + 한 줄 · 타깃 해외 시장(국가·고객) · 문제 1–2줄 · 선택 주제. 라이트 테마 · `footer-for-light-slides.png` · 1920×1080 · 본문 28px 이상. 우측에 랜딩 브라우저 샷 + 앱 폰 샷 1대.

- 팀명 · 주제: 팀 김박구이 · TOPIC — SAVE 10M JOBS FROM AI (SCHMIDT · 선언 주제 원문은 MISSION 「사실」) · 선언 레포 https://github.com/jsk4581/KPK2
- 서비스 이름 · 한 줄: **Dream Achieve Moments** — *Your expertise, redrafted for the AI era.* An AI career agent that turns what you already know into your next career — and walks it with you, week by week.
- 고객 (WHO): US freelance copywriters & writers, 3–10 years in — losing clients to generative AI (PRD 1)
- 타깃 해외 시장: United States first (Canada next) · freelance copywriters and writers whose clients now draft with ChatGPT
- 문제 (PAIN): "My clients draft with ChatGPT now." — alone, from zero, quits halfway. They do not know where their expertise transfers, prepare by themselves, and stop in the middle (PRD 2)
- 숫자 타일 1: **−5.2%** monthly income of Upwork writing freelancers after ChatGPT · Hui, Reshef & Zhou 2023 (E11 · verified)
- 숫자 타일 2: **120,136** US job cuts that named AI as the reason, Jan–Sep 2026 · Challenger (E59 · single-source)
- 숫자 타일 3: **65%** of 140,300 US writers are self-employed — no employer pays for their transition · BLS 2025 (E1 · single-source)
- 왜 지금: BLS 2025–35 outlook for writers is 0% growth (−500) while the field is rewritten by AI (E1 · single-source); the US government now publishes official AI-exposure categories for 831 occupations (E40 · verified)
- 하지 않는 것: No real biometric, sensor or personal-data collection · no Notion or cloud connectors · no social or community features today — the demo runs on a synthetic persona, labelled [SIMULATION] (PRD 5)

## Slide 2

> 키트 매핑 — 「오늘 만든 것」: 실제 스크린샷 1–2장 · 작동 방식과 Claude가 쓰이는 곳 · 왜 우리 팀인가 · 다음 7일. 우상단 데모 URL. 폰 샷 3대 플로우(→) + "ONE BRAIN · TWO DOORS" 다이어그램 + WHY US + MARKET · NEXT 7 DAYS 박스.

- 데모: https://kpk2-second-draft.vercel.app · 스크린샷: `docs/gtm/slides-draft/shot-landing-web.png` (랜딩, Slide 1) · `shot-paths.png` · `shot-nottoday.png` (폰 샷, 15:19 재캡처 · 앱 제목 Dream Achieve Moments 반영본)
- 핵심 장면: 1 · Tell your story — Load sample persona or Start · no login · nothing stored · [SIMULATION] persona → 2 · Three paths that transfer — what transfers · what's missing · first 2 weeks → 3 · This week · Not today — "a rest day, not a missed day" · moved, never deleted (제품 사양)
- 작동 방식 (ONE BRAIN · TWO DOORS): Judgment is deterministic rules in `app/logic.js` + `brain/` — paths → week → check-in → explain; Claude writes only the words (one call drafts the path copy, a labelled `Sample result` fallback shows when no key is present). The same core serves the web demo and the MCP/REST brain server (제품 사양)
- 오늘 실제로 도는 것 (LIVE TODAY): web demo at the URL above with a synthetic persona · brain REST + MCP server with 8 read-only tools (think · rank_roles · plan_week · check_in · analyze_state · explain · job_readiness · get_scenario) reachable over a quick tunnel · 619 automated tests passing, none red (app 147 + brain 472, run 15:40) (제품 사양)
- 다음 (NEXT — not built, all hypothesis): consented phone/cloud connectors · storage and sessions · voice · community · per-occupation brain packs · B2B billing. On screen today the "Connected data" lifelog cards are simulated [SIMULATION] (제품 사양)
- 차별점 (WHY US): Career Dreamer and Coursera Coach stop at a map; outplacement vendors resell résumés at $600–2,600 per employee for a 3-month program · Intoo, RiseSmart (E70 · single-source). None of the mapped competitors pairs expertise-transfer paths with a non-judging weekly habit loop — our wedge is AI-displaced occupations plus the weekly follow-up after the program ends
- 시장 (MARKET): 700K core creative workers, US + Canada (E25 · hypothesis) → 3M payable mid-career (E67 · hypothesis) → 11.8M in BLS-declining AI/automation occupations, 2025–35 (E66 · hypothesis) — "10M" is a labelled hypothesis, not a validated number
- 비즈니스 모델: We sell the brain — an inference API, usage-billed, user-consented; raw logs never leave the caller. Consumer Pro at $29–79 per month (E24 · hypothesis), anchored below one human coaching hour at a $139 median (E17 · verified)
- 첫 GTM (NEXT 7 DAYS — plan, nothing started yet · PM 확정 대기): recruit 10 consented beta writers · measure the week-2 check-in return rate · publish the MCP server · first outplacement-vendor conversation
- 요청 (ASK · PM 확정 대기): three intros — an outplacement buyer · Upwork · a career-tech investor

## 스크립트 (90초)

Hi, we are team Kim-Park-Gu-Yi, and this is Dream Achieve Moments.
Freelance copywriters' work is being rewritten by AI first. After ChatGPT, their monthly income on Upwork fell five point two percent — peer-reviewed. Sixty-five percent of America's one hundred forty thousand writers are self-employed, so no employer pays for their transition. They prepare alone, from zero, and most stop halfway.
Dream Achieve Moments starts from what they already know. Load your story — in the demo, a synthetic persona — and a decision brain, not a prompt, returns three career paths where your expertise transfers: what carries over, what is missing, the first two weeks. Pick one and you get this week's three actions. On a hard day you press Not today: a rest day, not a missed day — the action moves, nothing is deleted.
Rules make every call and can explain it; Claude only writes the words. The same brain runs the web demo and an MCP server, so any app can embed it.
Our beachhead is seven hundred thousand creative workers in the US and Canada; ten million is a labelled hypothesis. We ask for three intros: an outplacement buyer, Upwork, and a career-tech investor. The demo is live at kpk2-second-draft.vercel.app.

낭독: 사람 측정 대기

## 심사기준 매핑

| 심사기준 | 어디서 다루나 |
|---|---|
| VC PASS | Slide 1 숫자 타일 3개(E11 verified · E59 · E1)로 절박함 → Slide 2 데모 URL + 핵심 장면 3단계(SMOKE 3/3, 15:19) + 시장 사다리(E25→E67→E66, 전부 hypothesis) + 요청. VC 3곳 PASS 기준을 "문제·데모·확장" 한 장씩으로 배치 |
| Mission Fit | Slide 1 TOPIC 줄 + WHO/PAIN — AI로 일이 줄어든 직군의 전문성을 버리지 않고 이어 쓰는 제품(MISSION 「해석」) · Slide 2 시장 줄 700K→3M→11.8M(가설)이 「1,000만 명」 확장 경로, 비치헤드 B2C → B2B 아웃플레이스먼트 |
| 시장 크기 (MISSION 「미확인」 가정) | Slide 2 시장 줄 (E25 · E67 · E66 hypothesis) · Q&A 4 (E68 상한, "노출 ≠ 감소" E40) |
| 문제의 절박함 (가정) | Slide 1 PAIN + 숫자 타일 (E11 verified · E59 single-source · E1 single-source) · 왜 지금 줄 |
| 데모 완성도 (가정) | Slide 2 데모 줄 · 핵심 장면 3단계 · 「오늘 실제로 도는 것」 줄 (테스트 619 · MCP 8도구) · 「다음」 줄로 범위 정직 표기 |
| 확장 경로 (가정) | Slide 2 작동 방식(ONE BRAIN · TWO DOORS) · 차별점(E70) · 비즈니스 모델(E24 · E17) · 첫 GTM |

## 라벨 점검

| 주장 ID | 슬라이드 | 라벨 |
|---|---|---|
| E25 | Slide 2 시장 — 700K core creative (US+CA) | hypothesis |
| E67 | Slide 2 시장 — 3M payable mid-career | hypothesis |
| E66 | Slide 2 시장 — 11.8M BLS-declining AI/automation occupations | hypothesis |
| E24 | Slide 2 비즈니스 모델 — Pro $29–79/mo | hypothesis |
| E11 | Slide 1 숫자 타일 1 — Upwork writing income −5.2% | verified |
| E40 | Slide 1 왜 지금 — BLS official AI-exposure categories, 831 occupations | verified |
| E17 | Slide 2 비즈니스 모델 — human coaching hour median $139 | verified |
| E59 | Slide 1 숫자 타일 2 — 120,136 AI-cited US job cuts Jan–Sep 2026 | single-source |
| E1 | Slide 1 숫자 타일 3 + 왜 지금 — 140,300 writers · 65% self-employed · 0% outlook | single-source |
| E70 | Slide 2 차별점 — outplacement $600–2,600 per employee | single-source |

## 반론과 수정

| 역할 | 반론 | 수정 |
|---|---|---|
| PM | 범위 정직성 — 데모는 B2C인데 「1,000만 명」은 B2B 확장에서 나온다 (DECISION 「수용 리스크」) | Slide 2 시장 줄을 700K→3M→11.8M 세 단 전부 hypothesis로 표기하고 "10M is a labelled hypothesis"를 같은 줄에 명시 · 비치헤드 B2C → B2B 순서를 스크립트에도 고정 |
| Build | 데모 주장이 URL에서 도는 것보다 넓다 — MCP/REST는 quick tunnel(재시작 시 URL 변경)이고, 경로 문장은 키 없으면 폴백 `Sample result`가 뜬다 (CONNECT.md · SMOKE 기록) · (초안 — Build 확인 대기) | 「오늘 실제로 도는 것」 줄에 tunnel·폴백·테스트 수를 그대로 적고 tunnel URL은 슬라이드에 싣지 않음 · 핵심 장면은 SMOKE 3단계만 |
| GTM | 시장 라벨 — 구 앵커 "$1,660/인"은 재검증 실패(HANDOFF Sales 13:38) · 합산 제안의 WEF 83M · Goldman 10–12M · Straits $1.7B · $12/mo는 market-claims에 E-id가 없다 | $600–2,600(E70 · single-source)로 교체 · E-id 없는 숫자는 슬라이드·스크립트에서 제거, 가격은 E24(hypothesis)·E17(verified)만 사용 |
| Sales | 구매 이유·시뮬레이션 문구 — 구매자 시뮬레이션 S행은 슬라이드에 직접 인용 불가, "Nobody does this"식 절대 표현은 5대 벤더 중 4곳이 이미 AI 전환을 마케팅 중이라 틀림 (verify-payers.md) | 차별점을 "AI 대체 직군 특화 + 프로그램 뒤 주간 비판단 루프"로 좁힘 · NEXT 7 DAYS는 "plan, nothing started"로 표기 · S행 인용 없음, 화면 데이터는 [SIMULATION] |

## 제출 파일

- 파일: pitch/slides.pdf
- 페이지: 2
- 크기: 사람 기입 대기
- sha256: 사람 기입 대기 — 내보낸 뒤 `shasum -a 256 pitch/slides.pdf` 값으로 교체하고, 같은 값을 SUBMISSION 머리 줄 `발표 파일 sha256:`과 「산출물」 행에 적는다 (이 줄은 검증기 대상이 아니라 팀 메모다)
- 내보내기 경로: `mkdir -p pitch` → `cp docs/gtm/slides-draft/slides.html pitch/slides.html` (+ `footer-for-light-slides.png` 같은 폴더) → `bash scripts/export_slides.sh pitch/slides.html pitch/slides.pdf` → 출력의 페이지·크기·sha256을 위 세 줄에 옮김 → 제목 줄을 `· v3`로 올림

## 결선 스크립트 (3분 영어)

> 데모데이(19:00, 결선 8팀) 전용 — 3분 영어 발표, 약 400단어, 차분한 속도. 숫자 뒤 대괄호는 발표자 메모(읽지 않음). 리허설 2회 기록은 `mission/DEMODAY.md` 「리허설 기록」에.

Good evening. We are team Kim-Park-Gu-Yi, and this is Dream Achieve Moments — your expertise, redrafted for the AI era.

Start with one person: a freelance copywriter, seven years in, who opens her inbox and reads, "Can you polish the draft our AI wrote?" After ChatGPT, Upwork writing freelancers lost five point two percent of monthly income — peer-reviewed [E11 · verified]. Sixty-five percent of America's one hundred forty thousand writers are self-employed, so there is no HR team and no outplacement budget for them [E1 · single-source]. This year, through September, US employers named AI as the reason for one hundred twenty thousand job cuts [E59 · single-source]. These people prepare alone, from zero, and most stop halfway.

Dream Achieve Moments starts from what she already knows. Here is the live demo. She loads her story — today a synthetic persona, clearly labelled. A decision brain reads her work history and returns three career paths where her expertise transfers: what carries over, what she would need to build, and the first two weeks. She chooses one and gets this week's three actions. On a hard day she presses Not today. The app says: today was a rest day, not a missed day. The action moves to another day; nothing is deleted.

Why is this hard to copy? Rules make every call, and every answer ships with the rule and the evidence that produced it. Claude writes the words, never the verdict. Auditable, so an HR buyer can sign off. We built it once and sell it three ways: the web app, a REST API, and an MCP server any AI agent can call — all live today on synthetic data. Nothing you type is stored.

The market. Career Dreamer and Coursera Coach stop at a map. Outplacement vendors charge six hundred to twenty-six hundred dollars per employee for three months, then stop [E70 · single-source]. Our beachhead is seven hundred thousand creative workers in the US and Canada [E25 · hypothesis]; three million are mid-career and can pay [E67 · hypothesis]; the path to ten million runs through occupations BLS projects to decline [E66 · hypothesis]. Each is a labelled hypothesis, and we say so. Consumers pay a subscription below one coaching hour; employers pay per employee for the brain [E24 · E17].

Real today: the demo you saw, the brain server, six hundred nineteen passing tests, and zero users. Next: consented connectors, brain packs per occupation, the first ten beta writers.

We ask for three introductions: an outplacement buyer, Upwork, and a career-tech investor. Thank you.

## Q&A 준비 (7분 한국어)

> 답은 한국어, 숫자마다 라벨을 입으로 말한다 ("가설입니다"를 먼저). 상세 EN/KO 답안은 `docs/brain/VC_QA.md` Q1–Q12. S행(구매자 시뮬레이션)은 "시뮬레이션 결과"라고만 말하고 수치로 쓰지 않는다.

1. **LLM이 판단하면 되지 않나?** 판단은 규칙(COM-B · 제약 이론 · Fogg · if-then), LLM은 문장만. 그래서 모든 결정이 테스트·설명 가능(규칙 이름 + 근거 id)하고 웹·REST·MCP 어디서 불러도 같은 답. 테스트 619개 통과(15:40 측정) (제품 사양). VC_QA Q1.
2. **뭘 팔고 어떻게 과금하나?** 첫 문장 고정: "브레인을 판다 — 추론 API, 사용량 과금, 사용자 동의 기반." 파트너는 판단만 받고 원본 로그는 받지 않는다. 단가 미정(hypothesis, 구매자 인터뷰 0건). "데이터 판매"라는 말은 절대 쓰지 않는다. VC_QA Q2.
3. **Google Career Dreamer가 하면?** Career Dreamer(2025-02, 무료, 미국 한정 실험)는 1회성 탐색 — 리마인더·습관·진척 추적 없음(verify-payers §3). 우리는 전환 뒤 매주 따라오는 임베딩 가능한 판단 엔진. 다만 구글의 무료 유통력이 최대 위협임을 먼저 인정. VC_QA Q3.
4. **1,000만 명은 어디서?** 비치헤드 약 70만(E25 · hypothesis) → 지불 가능 약 300만(E67 · hypothesis) → BLS 감소 전망 직업 약 1,180만(E66 · hypothesis) → 노출 상한 5,321만(E68 · single-source) — 단 BLS 원문 "노출은 감소 예측이 아니다"(E40 · verified)를 반드시 같이 말한다. 1,000만은 검증된 숫자가 아니라 가설. VC_QA Q4.
5. **개인정보 — 뭐가 기기 밖으로 나가나?** 오늘은 합성 데이터뿐이라 나가는 것이 없다(`"_label": "synthetic"`). 설계상 원본은 기기에, 브레인에는 동의 범위의 요약만, 파트너에는 판단 결과만. CCPA/CPRA "sale" 정의 · Delete Act 리스크는 우리가 먼저 말한다. VC_QA Q5.
6. **이거 치료 아닌가?** 아니다 — 임상 척도 없음, 감정 추론 표시 금지(`brain/messages.js` 금지어 lint), 위기 표현은 988 안내로 에스컬레이션만. 근거는 목표 진척 연구(RCT N=517, d=0.33)이지 임상 결과가 아니며 "취업 보장"은 말하지 않는다. VC_QA Q6.
7. **왜 프리랜서 작가부터?** 피해가 이미 숫자로 있고(Upwork 소득 −5.2%, E11 · verified; 글쓰기 공고 −30%, E12 · single-source), 65%가 자영업이라 본인이 결제하며(E1 · single-source), 텍스트 라이프로그가 가장 풍부한 직군. 사다리: 번역가 → 일러스트 → 그래픽 → 성우(E2–E5 · single-source; E14 · verified; E15 · single-source) → 사무직(E66 · hypothesis). VC_QA Q7.
8. **오늘 실제로 도는 것 vs 로드맵?** 도는 것: 웹 데모(합성 페르소나) · 코어 `app/logic.js` + `brain/` · MCP 8도구 + REST(quick tunnel) · 경로 3 → 주 3행동 → Not today 루프 · 경로 문장은 Claude 1회 호출(키 없으면 표시된 폴백). 화면의 Connected data 카드는 시뮬레이션. 로드맵(전부 가설·미구현): 커넥터·저장·보이스·커뮤니티·도메인 팩·B2B 과금. 사용자 0명. VC_QA Q8.
9. **성공을 어떻게 재나?** 활동이 아니라 증거 — 완료 행동 → 증거 선반 → 12주 게이트 4개(Fit · Proof · Market · Ready) → 준비도 점수. 선행지표는 모멘텀·자기효능·이탈 위험. 다음 7일의 첫 지표는 "2주차 체크인 복귀율"(계획, 측정 전). "취업률"은 검증 안 된 가설. VC_QA Q9.
10. **해자는?** ① 테스트·설명 가능한 판단 정책 ② 대체 직군별 도메인 브레인 팩(가설) ③ 전환 뒤에도 이어지는 동의 기반 주간 증거 루프(가설). 오늘은 사용자 0명이라 데이터 해자를 주장하지 않는다. VC_QA Q10.
11. **가격 앵커?** 벤더 공개가 $600–2,600/인·3개월(E70 · single-source) · 인간 코치 중위 $139/시간(E17 · verified) · Pro 월 $29–79(E24 · hypothesis). 구 "$1,660/인"은 재확인 실패로 폐기(E18). 5대 벤더 중 4곳이 이미 "AI 커리어 전환"을 마케팅 — 우리 쐐기는 AI 대체 직군 특화 + 프로그램 뒤 주간 팔로업, 첫 B2B는 API 플러그인이 아니라 리셀·화이트라벨. VC_QA Q11.
12. **오늘 만든 것 vs 사전 준비물?** 행사 전: 팀 운영 하네스(계약·스킬·템플릿·검증기)와 PM의 기존 코칭 프레임워크 설계 — 제품 코드 아님. 미션 공개(09:40) 후: 미션 선택·PRD·`app/logic.js`와 테스트·웹 데모·`brain/` 판단 모듈·MCP/REST 서버·합성 14일 시나리오·시장 근거 E1–E70 전부. 타 AI 산출물 미사용, 행사 Claude 크레딧만. 제품명은 13:58 확정. VC_QA Q12.
13. **제품명이 왜 Dream Achieve Moments인가?** PM 13:58 확정, 개발 코드명 Second Draft. 출시 브랜드는 제출 후 재검토 대상(`docs/gtm/naming-and-ui-copy.md` §A — 동명 AI 글쓰기 앱 충돌, USPTO 미조회) — "working title"이라고 답한다.

## 오늘 도는 것 · 다음 (정직 표기)

| 구분 | 내용 | 근거 |
|---|---|---|
| LIVE — 배포 URL | https://kpk2-second-draft.vercel.app · 랜딩(`/`) + 폰 안 앱(`/app.html`) · 로그인 없음 · 저장 없음 · SMOKE 3/3 (배포 URL · 15:19) · 페르소나 Dana는 [SIMULATION] 합성 | `app/SMOKE.md` · SUBMISSION 「테스트」 회차 3 |
| LIVE — 브레인 서버 | REST `/v1/*` + MCP `/mcp` 8도구 · quick tunnel https://stayed-stock-advancement-taxi.trycloudflare.com (15:40 `/v1/health` ok · 재시작 시 URL 변경 — 슬라이드에 싣지 않음) · Explorer `/explorer` | `brain/mcp/CONNECT.md` |
| LIVE — 테스트 | app 147 pass + brain 472 pass · red 0 (15:40 `node --test`) | 이 초안 작성 시 실행 |
| 화면상 시뮬레이션 | Connected data 라이프로그 카드 · Dana 14일 시나리오 · 경로 문장은 키 없으면 `Sample result` 폴백 표시 | PRD 「사용자 경험」 · SMOKE |
| NEXT — 미구현 (가설) | 실제 커넥터·동의 관리 · 저장/세션 · 보이스 · 커뮤니티 · 도메인 브레인 팩 · B2B 과금 · 베타 라이터 10명(계획) | VC_QA Q8 · DECISION 「기각」 |

## EVIDENCE 조율 메모 (GTM → EVIDENCE 초안)

- 슬라이드가 쓰는 E-id 10개: E1 · E11 · E17 · E24 · E25 · E40 · E59 · E66 · E67 · E70. 이 중 **E40 · E59 · E66 · E67은 `docs/gtm/ai-displaced-occupations.md`에만 있다** — `mission/EVIDENCE.md#주장`에 같은 ID·라벨로 옮겨야 X-1이 통과한다 (라벨: E40 verified · E59 single-source · E66 hypothesis · E67 hypothesis).
- Q&A에서만 쓰는 E-id: E2 · E3 · E4 · E5 · E12 · E14 · E15 · E18 · E68 — EVIDENCE에 있으면 좋지만 검증기 대상은 아니다.
- 합산 제안(combined-proposal v2)의 WEF 83M · Goldman 10–12M · Straits $1.7B · $12/mo · "1.8M layoffs/mo" · "91,200"은 market-claims에 E-id가 없어 **쓰지 않았다** (91,200은 E10 내부 계산값 — 필요하면 E10 · hypothesis로만).
- 이 초안은 `python3 scripts/validate_mission.py --stage submit`을 임시 사본(mission/* + 이 파일 + 두 claims 문서를 합친 임시 EVIDENCE 스텁)에서 돌렸다 — 결과는 RESULT에.
