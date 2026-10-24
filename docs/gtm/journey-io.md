# Second Draft — 저니 · 인풋/아웃풋 범위 · Buyer simulation 초안

> 작성: Sales 2026-10-24 · 기준: `mission/PRD.md` v1 (11:30) · 이 문서의 모든 페르소나는 **[SIMULATION] 합성 데이터**다. 실제 인물·팀원·지인을 참조하지 않는다. 연락처 없음.
> 범위 고정: PRD 5번 문장대로 **오늘 데모는 텍스트 3칸 → 경로 3개 → 이번 주 행동 3개 → Not today** 까지. 라이프로깅·연동·SNS는 로드맵.

---

## 대표 저니 (Sample persona — synthetic)

**[SIMULATION] Sample persona — synthetic**: "Dana" · 미국 중서부 · 프리랜서 카피라이터 7년차 · 주 고객은 DTC 이커머스·SaaS 3~5곳 · 최근 18개월 의뢰 건수 약 40% 감소(합성 수치) · 대체재는 LinkedIn 글 읽기·노트 앱·유튜브 "pivot" 영상.

### 6순간 저니 (PRD UX 흐름과 1:1)

| # | 순간 | 사용자의 마음 | 사용자가 입력하는 것 | 에이전트가 돌려주는 것 |
|---|---|---|---|---|
| 1 | 어느 날 밤 | "클라이언트가 ChatGPT로 초안을 쓴다. 7년이 쓸모없어진 건가?" | [Load sample persona] 클릭 (또는 [Start]) | 한 줄 공감 *My clients use ChatGPT now.* · "Nothing you type is stored." |
| 2 | 털어놓기 | 이력서 말고 내 얘기를 하고 싶다 | 아래 3칸 텍스트 (각 2~3문장, 5분 이내) | 칸별 placeholder, 글자 수 제한 없음, 저장 안 함 표시 |
| 3 | 길이 보이는 순간 | "버릴 필요가 없구나" | 카드 3장 비교 → [Choose this path] | 카드 맨 위에 **What transfers**, 그 아래 What's missing · First 2 weeks |
| 4 | 시작 | 거창한 계획 말고 이번 주만 | 행동 3개 확인 | 12주 아크 1줄(접힘) + 이번 주 3개(각 ≤30분, 요일 배정) |
| 5 | 못 한 날 | 죄책감, 그만두고 싶다 | [Not today] | *Today was a rest day, not a missed day.* → 인정 → 재해석 → 10분짜리 대체 행동 → 원래 행동은 다음 요일로 이동(삭제 없음) · "1/3 done · 1 moved" |
| 6 | 다음 주 | 계속할 수 있겠다 | — | (로드맵) 주간 재계획 · 알림 · 커뮤니티 — 오늘 안 함, 화면에는 "Next week: coming soon" 1줄만 |

### 샘플 입력 (데모 시드 · 영어)

**칸 1 — Career / what you were good at**
> Seven years as a freelance copywriter for DTC and SaaS brands — email flows, landing pages, product launches. My clients kept me because I could turn a messy founder interview into a message their customers actually repeated back. I know how to run a 45-minute discovery call and come out with a positioning line.

**칸 2 — Now / what's bothering you**
> Since last year three of my five retainer clients started drafting with ChatGPT and only send me "polish" jobs at a third of the rate. I've started two online courses on "AI consulting" and quit both halfway. I don't want to start from zero at 38, and I'm scared the answer is "learn to code."

**칸 3 — What pulls you (1–3 things)**
> I actually enjoy the discovery calls more than the writing itself. I've been reading about how companies write their AI prompts and most of them are terrible. I also like teaching — I ran a small email-copy workshop once and people kept asking for more.

### 샘플 출력 — 경로 3개 (LLM 1회 호출 JSON의 사람 읽기용)

| 경로 | What transfers | What's missing | First 2 weeks |
|---|---|---|---|
| **A. Messaging & Positioning Consultant** (쓰기보다 "무엇을 말할지"를 파는 역할) | 45분 discovery call로 포지셔닝 한 줄을 뽑는 기술 · 창업자 언어 → 고객 언어 번역 · 7년치 브랜드 사례 | 워크숍형 산출물 템플릿(메시지 맵) · "시간당 글쓰기"가 아닌 프로젝트 단가 설정 · 사례 연구 2개 | 기존 고객 1곳에 90분 메시징 세션을 유료 파일럿으로 제안 · 과거 프로젝트 2개를 "before/after 메시지" 1페이지로 재포장 |
| **B. Brand Voice & Prompt Systems Designer** (팀이 AI로 쓸 때 브랜드 목소리가 안 무너지게 하는 사람) | 톤·보이스 가이드 작성 경험 · 고객 세그먼트별 문장 감각 · 나쁜 카피를 즉시 알아보는 눈 | 프롬프트/스타일 시스템 문서 구조 · 간단한 평가 루브릭 만들기 · AI 도구 2~3개 실제 사용 경험 | ChatGPT를 쓰는 고객 1곳의 실제 AI 초안 10개를 모아 "왜 어색한지" 메모 → 보이스 가이드 + 프롬프트 세트 초안 1개 |
| **C. Copy Educator / Workshop Lead** (소규모 팀·창업자에게 카피 사고법을 가르치는 역할) | 워크숍 운영 경험 · 설명 잘하는 글 · 신뢰받는 실무 사례 | 커리큘럼 60~90분 단위 설계 · 모집 채널 · 가격 실험 | 이전 워크숍 참가자에게 "다음 회차 원하냐" 메시지 5통 · 60분짜리 "AI 초안 고치는 법" 세션 개요 1장 |

### 샘플 출력 — 이번 주 행동 3개 (경로 A 선택 가정 · 12주 아크: "글쓰기 시간 → 메시징 세션 수입 50%")

| 요일 | 행동 (≤30분) | 왜 이번 주인가 |
|---|---|---|
| Tue | 과거 프로젝트 1개를 "before → after 메시지" 1페이지로 정리하기 (템플릿 제공) | 세션 제안 때 보여 줄 증거가 필요 |
| Thu | 현재 retainer 고객 1곳에 90분 메시징 세션 파일럿 제안 이메일 초안 쓰기 (보내지 않아도 됨) | 글쓰기 단가가 아니라 세션 단가로 대화 바꾸기 |
| Sat | 20분 타이머 켜고 "내가 discovery call에서 실제로 하는 질문 7개" 적기 | 다음 주 세션 포맷의 뼈대 |

### 샘플 출력 — "Not today" 응답 1개 (Thu 행동에 대해)

> **Today was a rest day, not a missed day.**
> Writing a pitch to a client who already cut your rate is heavier than it looks — skipping it makes sense.
> If you have 10 minutes: open a blank note and write just the subject line of that email. Nothing else.
> The full draft moved to Fri. · 1/3 done · 1 moved

---

## 시나리오 3개 (데모 스크립트 · 전부 [SIMULATION])

**A. 카피라이터 (대표 페르소나 Dana · 기본 데모)**
- 입력 요지: DTC/SaaS 카피 7년 · 고객이 ChatGPT로 초안 → 단가 1/3 · discovery call과 가르치는 걸 좋아함
- 경로 3개: Messaging & Positioning Consultant · Brand Voice & Prompt Systems Designer · Copy Educator / Workshop Lead
- 이번 주 행동 예: before/after 1페이지 · 세션 파일럿 제안 초안 · discovery 질문 7개 적기
- 보여 주려는 셀링 포인트: "What transfers"가 카드 맨 위 — 경력을 버리지 않고 잇는다 + Not today가 야단치지 않고 이동만 한다

**B. 번역가 (EN↔ES 마케팅·법률 번역 9년 · [SIMULATION])**
- 입력 요지: 기계번역 후 "검수만" 의뢰 · 단가 반토막 · 특정 산업(의료기기) 용어 깊이 · 두 문화권 사이 뉘앙스 조정이 강점
- 경로 3개: Localization QA & Terminology Lead · Bilingual UX Writer (스페인어권 제품) · MT Post-editing Standards Consultant (팀용 가이드·평가 기준)
- 이번 주 행동 예: 최근 MT 오류 10개를 유형별로 분류(30분) · 의료기기 용어집 샘플 1페이지 · 로컬라이제이션 팀 채용 공고 3개 읽고 "내가 이미 가진 것" 표시
- 보여 주려는 셀링 포인트: 같은 파이프라인이 **직군이 바뀌어도** 전문성 전이를 찾아낸다 (LLM 1회 호출, 구조 동일)

**C. 일러스트레이터 / 2D 디자이너 (프리랜서 5년 · [SIMULATION])**
- 입력 요지: 이미지 생성 AI로 썸네일·소셜 이미지 의뢰 소멸 · 캐릭터 일관성·스토리보드가 강점 · 사람 가르치는 것과 게임 쪽에 끌림
- 경로 3개: Art Director for AI-assisted Pipelines (일관성·품질 기준 소유) · Storyboard & Visual Narrative Designer · Illustration Mentor / Portfolio Reviewer
- 이번 주 행동 예: 포트폴리오에서 "일관성" 사례 3개 고르기 · 소규모 게임 스튜디오 공고 5개에서 반복 키워드 적기 · 1:1 포트폴리오 리뷰 30분 세션 개요 1장
- 보여 주려는 셀링 포인트: Not today 체크인 데모 — 행동 하나를 못 하면 10분짜리로 쪼개고 다음 요일로 이동, 빨간색·실패 표현 0

---

## 인풋·아웃풋 범위 (제안)

### 인풋 — 3단계로 닫는다

| 단계 | 포함 | 제외/보류 | 비고 |
|---|---|---|---|
| **오늘 데모 (텍스트 3칸만)** | ① 경력·잘했던 것 ② 지금 상황·고민 ③ 끌리는 것 1~3개 — 모두 직접 친 텍스트 | 링크·파일·계정 연동·센서 전부 | PRD 4·5·6번 문장. 저장 안 함. 샘플 페르소나 버튼으로 시연 |
| **MVP (+포트폴리오 링크 · 데일리 체크인)** | 포트폴리오/Notion/클라우드 **링크 1~3개**(텍스트 추출) · 영감 받은 링크 · 매일 1탭 체크인(Done/Not today + 컨디션 1~5) · 주간 "이번 주 어땠나" 2문장 | 자동 수집, 생체, 위치 | 암묵지(tacit knowledge)는 "자주 받는 질문 3개"처럼 **질문으로 끌어낸다** — 자유 서술만으로는 안 나옴 |
| **로드맵 (라이프로깅 자동 수집 · 생체 · SNS)** | 캘린더·수면·운동·활동 로그(권한 전제) · 웨어러블 생체 · SNS/커뮤니티 활동 · 학습 플랫폼 진행률 | — | 컨디션 기반 계획 유연화의 재료. **오늘·MVP와 분리해 "미래 입력"으로만 말한다** |

### 아웃풋 — 같은 3단계

| 단계 | 포함 | 형태 |
|---|---|---|
| **오늘 데모** | 경로 3개(What transfers · What's missing · First 2 weeks) · 선택 후 12주 아크 1줄 · 이번 주 행동 3개(≤30분, 요일) · Not today 응답(인정→재해석→10분 행동→이동) | LLM 1회 JSON + 클라이언트 로직 · 샘플 JSON 폴백 |
| **MVP** | 습관 크기 마일스톤(월·주·일) · 주간 재계획(한 일/옮긴 일 반영) · 컨디션에 따라 **행동 크기가 줄어드는** 계획 · 비판단형 응답 변형 5~10종 | 주 1회 호출 + 일일 로컬 로직 |
| **로드맵** | 연·분기·월·주·일 다층 계획 자동 조정 · 라이프로그 기반 "오늘은 쉬는 날" 선제 제안 · 동료 커뮤니티 매칭 | 모니터 에이전트 상시 |

### 아키텍처 슬라이드에 그릴 파이프라인 — **아키텍처 주장(설계 의도)이며 오늘 구현 아님**

1. **Gateway** — 입력 수집·정규화·권한/저장 정책(오늘: 텍스트 3칸, 저장 없음 / 로드맵: 링크·로그·생체 수집 지점).
2. **Filter agent** — 노이즈 제거·개인정보 마스킹·"전문성 신호" 추출(경력 문장 → 전이 가능한 기술 태그).
3. **Status agent** — 현재 상태 판단(동기·컨디션·진행률). 오늘은 Done/Not today 2값만, 로드맵은 라이프로그 반영.
4. **Planner** — 경로 3개 → 선택 경로의 12주 아크 → 이번 주 행동 3개(습관 크기)로 내려 보냄. 오늘은 이 단계가 **LLM 1회 호출**로 압축돼 있다.
5. **Monitor** — 체크인을 받아 재계획·이동·비판단 응답 생성. 오늘은 클라이언트 규칙 로직, MVP부터 MCP 도구 호출로 승격.

> 발표 문구 제안: "오늘 URL에서 도는 것은 2·4·5의 최소 버전이고, 1·3과 자동 수집은 설계 주장이다." — 이 한 줄을 슬라이드에 그대로 둔다.

---

## Buyer simulation 초안 (S1–S3)

> 구매 의사의 증거가 아님 — 발표에서도 simulation 라벨 유지
> 이 절의 행은 가상 페르소나로 데모를 돌려 본 결과다. 고객 인터뷰·파일럿·사용자 수로 쓰지 않는다.
> **아래 시도/결과는 14:00 실행 전 — 예상이다.** 14:00~14:45 실제 실행 후 관측값으로 교체하고 `(14:00 실행 전 — 예상)` 표기를 지운다.

| ID | 페르소나 | 시도 | 결과 | 반론 | 지불 조건 | 라벨 |
|---|---|---|---|---|---|---|
| S1 | [SIMULATION] 가상 페르소나 Dana — 미국 프리랜서 카피라이터 7년차, retainer 3/5곳이 ChatGPT 초안으로 전환 · 대체재: LinkedIn 글·노트 앱·유튜브 pivot 영상 · 구매 결정: 본인 | (14:00 실행 전 — 예상) 배포 URL에서 [Load sample persona] → 3칸 그대로 제출 → 경로 A 선택 → Thu 행동에 [Not today] | (14:00 실행 전 — 예상) 경로 3개가 카드 맨 위 What transfers부터 보이고, 이번 주 3개가 요일과 함께 나오며, Not today 응답이 "rest day" 문구 + 10분 행동 + "1/3 done · 1 moved"로 표시됨 | 경로 3개는 ChatGPT에 같은 걸 물어도 비슷하게 나온다 — 차이는 매주 따라오는 체크인인데 오늘은 그게 1회뿐이다 | $12–15/월. 조건: 주간 재계획이 자동으로 돌고, 첫 달 안에 유료 파일럿 세션 1건이 실제 잡히면 연 결제 고려 | simulation |
| S2 | [SIMULATION] 가상 페르소나 Marco — EN↔ES 마케팅·법률 번역가 9년차, MT 후편집 의뢰만 남음 · 대체재: ProZ 포럼·동료 번역가 단톡·종이 플래너 · 구매 결정: 본인 (배우자와 월 구독 합의) | (14:00 실행 전 — 예상) 시나리오 B 텍스트를 3칸에 직접 입력 → 경로 "Localization QA & Terminology Lead" 선택 → 행동 3개 확인 | (14:00 실행 전 — 예상) 번역 경력에서도 전이 기술(용어 관리·문화 뉘앙스)이 What transfers에 잡히고, 행동이 ≤30분 크기로 쪼개져 나옴. 경로 이름이 직무 공고 용어와 겹치는지는 실행 후 확인 | 경로 이름이 그럴듯해도 실제 채용 시장에 그 직무가 몇 개나 있는지 도구가 보여 주지 않는다 — 희망 고문일 수 있다 | $8–10/월. 조건: 경로 카드에 실제 공고/고객 사례 링크가 1개라도 붙고, 체크인 알림이 폰에 오면 | simulation |
| S3 | [SIMULATION] 가상 페르소나 Riley — 프리랜서 일러스트레이터/2D 디자이너 5년차, 썸네일·소셜 이미지 의뢰 소멸 · 대체재: Discord 아트 커뮤니티·Notion 목표 페이지·무료 습관 앱 · 구매 결정: 본인 | (14:00 실행 전 — 예상) 시나리오 C 텍스트 입력 → 경로 "Storyboard & Visual Narrative Designer" 선택 → Done 1개 · Not today 1개 눌러 보기 | (14:00 실행 전 — 예상) 텍스트 기반 도구인데도 시각 직군의 강점(일관성·스토리보드)이 전이 항목으로 잡힘. Not today 후 행동이 삭제되지 않고 다음 요일로 이동, 빨간색·"failed" 문구 0건 | 포트폴리오를 못 올리니 텍스트로 내 작업을 설명하는 것 자체가 부담 — 링크 입력 없으면 진짜 나를 모른다 | $5–8/월 또는 무료+커뮤니티 유료. 조건: 포트폴리오 링크 입력(MVP)과 동료 매칭이 들어오면 | simulation |

---

## GTM 한 줄

- **Beachhead**: 생성형 AI로 의뢰가 줄어든 **미국 프리랜서 카피라이터 3–10년차** — 고통이 이미 선명하고, 글로 자기 얘기를 하는 데 거부감이 가장 적은 직군.
- **Channel**: 이들이 이미 모여 있는 곳 — 프리랜서 라이팅 뉴스레터·Substack 커뮤니티, r/freelanceWriters·r/copywriting, Superpath/Peak Freelance류 슬랙 커뮤니티, LinkedIn "AI took my clients" 글 댓글 — 광고 아닌 **샘플 페르소나 결과 공유** 형태로 진입.
- **Price hypothesis**: $12/월(연 $99) 개인 구독 · 무료는 경로 3개까지, 주간 체크인·재계획부터 유료 — S1–S3 지불 조건 범위($5–15)와 맞춤. 검증 전 가설.
- **Expansion order**: 카피라이터 → 번역가 → 일러스트/2D 디자이너(시나리오 B·C) → 커리어 코치·부트캠프 B2B 번들 → 라이프로깅 기반 프리미엄.
- **VC에게 보여 줄 지표 하나**: **"2주차 체크인 잔존율"** — 경로를 고른 사용자 중 14일 뒤에도 Done/Not today를 누르는 비율. "혼자 준비하다 중간에 멈춘다"(PRD 2번)가 풀렸는지 보여 주는 단 하나의 숫자. (오늘은 측정 불가 — 가설 지표로 표기.)
