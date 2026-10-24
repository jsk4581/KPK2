# 랜딩(`/`) 카피 — 미션·PRD 정합 교체안 (Sales, 2026-10-24 15:06)

> 현재 랜딩(`web/index.html`)은 "메모·파일을 붙여 넣으면 다음 행동 하나"라는 **범용 업무 도구**를 설명한다. 선언 주제(AI로 사라질 직업 1,000만 명)·PRD v2·덱·제출 양식은 **AI로 일감이 줄어든 전문가의 커리어 전환 에이전트**다. 심사위원이 랜딩을 먼저 보고 iframe 안 앱(커리어)을 보면 다른 제품으로 읽는다 → Mission Fit 감점 위험. 구조·디자인·애니메이션은 그대로 두고 **문구만** 바꾸면 된다 (섹션별 1:1 대응).

| 섹션 (현재 문구) | 교체안 (EN) | 근거 |
|---|---|---|
| eyebrow `AI DEMO` | `AI CAREER AGENT · DEMO` | PRD 3 |
| 히어로 h1 `Turn scattered material into your next move` | **`Your expertise, redrafted for the AI era`** | 덱·PRD 태그라인 |
| 히어로 sub `Drop in one line. The demo turns it into the next action worth taking. Everything on this page runs on synthetic data.` | `Tell it what you did and what hurts. It returns three career paths that carry your expertise forward — and this week's three actions. Everything on this page runs on synthetic data.` | PRD 4·6 |
| 플로팅 카드 `Sources sorted · 3 FILES` / `Key points · 12 ITEMS` / `1 next action` | `What carries over · 4 SKILLS` / `Paths · 3` / `This week · 3 actions` | 앱 Paths·Week 화면 |
| 마키 `Built for everyday work: Meeting notes · Quote drafts · Support triage · Task extraction · Report summaries · Scheduling` | `Built for work AI is rewriting: Copywriters · Translators · Illustrators · Designers · Customer support · Bookkeepers` | 확장 사다리 (E1–E8, E66) |
| WHY 리빌 `Every workday starts the same way. Notes, files and threads pile up, and the next step quietly gets lost somewhere between them. This demo changes that.` | `Your clients draft with ChatGPT now. Seven years of expertise didn't disappear — but nobody shows you where it goes next, and preparing alone stalls halfway. This demo changes that.` | PRD 1·2, E11 |
| 머지 칩 `Meeting_Notes.pdf · Pricing_Deck.pptx · Client_Call.mp4 · Proposal_Draft.docx` | `Portfolio.pdf · 14 PAGES` · `Client_Emails · 3 YEARS` · `Discovery_Call.mp4 · 45 MIN` · `Saved_Links · 12 ITEMS` | PRD v2 라이프로그(시뮬레이션) |
| 머지 결과 `One input turns into a clear summary, the key points, and the next step to take.` | `What you've done becomes three paths that fit — and the first small step this week.` | PRD 3 |
| 피처 1 `Instant clarity — Long notes and messy threads become a summary you can read in seconds.` | `Transfer, don't restart — Each path shows what carries over, what's missing, and the first two weeks.` | 앱 Paths 카드 |
| 피처 2 `One clear next step — Not a list of ten. The single action that moves things forward.` | `This week, not someday — Three actions under 30 minutes, each with a day.` | 앱 Week 화면 |
| 피처 3 `Visible progress — See what is done and what still needs attention.` | `A rest day, not a missed day — Skip one and it moves. Nothing is deleted, nobody scolds.` | 앱 Not today |
| 인용 `"I paste in my notes and get the one thing to do next. That is all I wanted."` | `"I didn't have to start from zero. It showed me where seven years of copy actually go next."` · cite `Simulated persona "Dana" · not a real user` | 합성 페르소나 (SIMULATION 유지) |
| How it works h2 `From scattered input to one next action, in three steps` | `From your story to this week's first step, in three screens` | SMOKE 3단계 |
| 스텝 `Input — Describe the situation in one line.` | `Tell your story — Your work, what hurts, what you're drawn to. Three fields, five minutes.` | PRD 4 |
| 스텝 `Organize — Key points and priorities are pulled out.` | `Three paths — Each one carries your expertise forward, closest match first.` | 앱 Paths |
| 스텝 `Next action — You get the one thing to do now.` | `This week — Three small actions and a check-in that never shames you.` | 앱 Week |
| 목업 앱 `Today's summary · Type one line, get the next action · NEXT ACTION · EXAMPLE Send the quote draft · Files added 3 files · 12 items` | `Your paths · Three directions where your experience carries over · TOP MATCH · EXAMPLE Messaging & Positioning Consultant · What carries over 4 skills · This week 3 actions` | 앱 Paths 화면 |
| 푸터 `Next Chapter · simulated screens, synthetic data` | 유지 | — |

**바꾸지 않아도 되는 것**: 레이아웃·애니메이션·색·`Simulation · synthetic data` 표기·「Try the demo」 버튼·iframe 데모 구역.
**소요**: 문자열 교체만 — Build 10~15분. freeze(14:00) 뒤라 **PM 승인 필요**(🚨). 승인 없으면 덱·피치 스크립트에서 "랜딩은 콘셉트 페이지, 제품은 폰 안의 데모"라고 한 문장 선언으로 방어.
