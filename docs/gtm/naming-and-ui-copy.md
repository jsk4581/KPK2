# 제품명 피드백 + 앱 UI 영어 문구 분석 (Sales, 2026-10-24 14:58)

> 작성: Sales(태진) 보조 세션 분석 → Sales 세션이 옮김. 기준 origin/main `ee8e7f0` · `web/src/screens` 문자열 · `app/data/persona-dana.json`. 제안이며 결정은 PM(제품명)·Build(UI 문구) 소유.

## A. 제품명 (→ PM · `mission/PRD.md` · 덱)

1. **Dream Achieve Moments** — 제출용으로는 유지. 출시 브랜드로는 약함: 일반명사 3개 나열이라 식별력 낮고, 명사구 안의 동사 *Achieve*가 원어민에게 어색. 핵심 가치(경력 전이 · 같은 AI가 끊고 잇는 역설)를 담지 못함 → **제출 후 재검토 항목**.
2. **Second Draft는 출시 브랜드 불가** — 동명 AI 글쓰기 제품 3개 존재: SecondDraft Media 웹 AI 편집기(2026-02 공식 출시), iOS "Second Draft - Rewrite Smarter", iOS "Reword Text: Second Draft". 같은 고객(글 쓰는 사람)·같은 카테고리라 혼동 가능성 높음. USPTO 등록 여부는 **미조회**.
3. 대안 조회: *Second Wind*는 USPTO 041류(리더십 교육) 선등록 live · *Red Thread*는 RedThread Research(HR 애널리틱스)와 B2B 구매자 겹침. 세 이름 모두 .com/.app/.co/.io/.ai 등록됨(RDAP·DNS 확인 2026-10-24). → 새 이름은 제출 뒤 과제.
4. **출시 브랜드 후보 (15:10 추가 조회 — 브랜드·앱·팟캐스트·SNS 핸들·상표 집계 DB 4단계, USPTO 공식 DB 직접 조회는 미실시 → 변호사 검토 전 가설)**
   - **1순위 *Not From Zero*** — 확인된 충돌 0. 인접 마크 "FROM ZERO TO IPO"(Attio, 009/042류 등록) 존재 → 변호사 검토 필요. notfromzero.com은 2017년 타인 등록·빈 페이지(2026-12 만료), .app/.co/.io 레지스트리 기준 미등록. 제품 메시지("처음부터 다시가 아니다")와 직결.
   - **2순위 *Draft Two*** — 충돌 없음, .com 등록·.app/.co/.io 미등록. 글쓰기 은유라 확장 직군(디자이너·CS)에 한계.
   - 탈락: *Redraft*(판타지풋볼 용어·도메인 전부 등록) · *Keepwork*(Keep 계열 HR 제품 다수) · *Nextline*(도메인 전부 등록) · *Carryover*(회계 용어, 미조회).
   - 제출명 **Dream Achieve Moments 유지** 의견 그대로. 전체 조회 기록: 로컬 `C:\Users\mrpar\kpk2-share\naming-ui-feedback.md`(레포 밖).

## B. 앱 UI 영어 문구 (→ Build · `web/src/screens`)

**P1 — 뜻이 안 통하거나 오독되는 것**

| 위치 | 현재 | 제안 | 이유 |
|---|---|---|---|
| Paths | What's missing | What you'd need to build | 스킬 칩만 나열돼 결함 목록처럼 읽힘 |
| Paths | What transfers | What carries over | 리드 문장과 통일 |
| Paths | Skill overlap: 67% | 67% skill match | 자연스러운 표현 |
| Week | How is your energy today? (1 low, 5 high) | How's your energy today? + Low/High 끝라벨 + "Low days get the 10-minute version of each action." | 왜 묻는지 설명 |
| Week aria-label | Condition n | Energy n | *condition*은 영어로 질병·상태 |
| Week | Progress 1/4 | 0 of 3 done | 행동 3개인데 분모 4 |
| Week | 12-week arc | The 12-week plan | *arc*는 내부 용어 |
| LifelogCard | Lifelog | Your activity / Connected apps | 사용자 어휘 |
| Inputs | Career and what you were good at | Your work and what you're good at | 과거형이 경력 종료로 읽힘 |
| Inputs | What pulls you | What you're drawn to | 자연스러운 표현 |
| Inputs placeholder | what people kept you for | why clients kept coming back | 자연스러운 표현 |
| app/logic.js 98·101행 | 한국어 fallback 문구 | 영어 | 영어 UI에 노출 가능 |

**P2 — 중복**
- Week.tsx 195행 eyebrow `data-text="This week"` + 196행 h2 "This week" 겹침 → eyebrow를 "Week 1 of 12"로
- 시간 단위 3개 혼재: 카드 "First 2 weeks" / "This week" / "12-week arc" → 카드는 "How you'd start"
- 입력칸 라벨이 Inputs/LifelogCard 두 벌 → 통일
- App.tsx "Nothing you type is stored." + "[SIMULATION] Demo · nothing is stored" 중복
- "Back to my story" / "Edit my story" → 하나로 · "Copy text" → "Copy" · "Sample output (offline)" → "Sample result"

**P3 — 개발자 용어 노출 (BrainPanel · Progress)**
- "Self-efficacy" → "Confidence" · "Drop-off risk" → "Risk of stalling"(또는 숨김) · "Decision brain: rules, no AI" 삭제
- "How it was worked out" / "Only the steps that actually ran" / "Based on" / "Out:" → "How we got this" 하나로 · "M1 Fit" → "First sign this path fits"

**유지 권장**: "My clients use ChatGPT now." · "Today was a rest day, not a missed day." · "Welcome back. Showing up again is the hard part." · "Days you showed up" · "Not today" · "Moved to Fri · 1/3 done · 1 moved"

## C. 랜딩 (→ Build · PM)

`web/index.html` 범용 업무 카피 vs 앱 "Your expertise, redrafted for the AI era" 불일치 — HANDOFF 「제안」 Sales 14:52와 동일. *redrafted*는 옛 이름 Second Draft에 건 말장난이라 새 이름 아래서는 고리가 약함(급하지 않음, 제출 후).
