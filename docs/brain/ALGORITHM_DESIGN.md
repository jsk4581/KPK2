# ALGORITHM_DESIGN v1 — Second Draft 행동 시스템 설계

> 2026-10-24 11:40 작성 · 대상: PM · Build(13:00 G3 코어) · GTM(피치).
> 모든 예시 데이터·페르소나는 `[SIMULATION]` 합성이다. 실제 인물 데이터 없음.
> 인용은 저자+연도. 숫자·출처가 불확실한 것은 `(확인 필요)`로 표시했다.

---

## 0. 한 장 요약

```
[입력 3칸: 경력 · 지금 상황 · 끌리는 것]
        │  LLM 1회 = TheGoal Phase 0–3 + 7 (mirror → 경로 3 → 12주 게이트 → 이번 주 3행동)
        ▼
[경로 카드 3]  What transfers · What's missing(=WOOP의 Obstacle) · First 2 weeks
        │  사용자가 고른다 (Ambiguous → Provisional)
        ▼
┌─────────────────────── 하루 루프 (결정론 JS, LLM 없음) ───────────────────────┐
│ 1분 로그 → 특징 추출 → 제약 1개 판별(TOC·COM-B) → 오늘 행동 1개 · 크기 · 시기 │
│   (P 진행 · C 꾸준함 · Mo 모멘텀 · Cap 에너지조정 용량 · SE 자기효능 · R 이탈위험) │
│   Done → 증거 선반(evidence ledger)      Not today → 다음 슬롯으로 이동(삭제 없음)│
│   메시지 = 인정 → 재해석 → 가장 작은 다음 행동(≤10–15분), 선택지 2개           │
└──────────────────────────────────────────────────────────────────────────────┘
        │  주간 리뷰 (fresh start · 실행→관찰→재정의) → 게이트 통과 / 축소 / 재계획 / 사람에게
        ▼
[증거 누적 → Job-readiness 점수 → 지원 단계 게이트 → 취업]  (Provisional → Validated-for-now)
```

1. **목표가 도구보다 먼저**(TheGoal): 입력은 이력서가 아니라 이야기, 출력은 "경로 3 + 이번 주 3"이지 "배울 AI 툴"이 아니다.
2. **제약 하나만 코칭**(Goldratt 1984): 로그에서 지금 병목(Capability/Opportunity/Motivation) 하나를 고르고, 그것만 건드린다.
3. **크기는 에너지가 정한다**(Fogg 2009): 컨디션이 낮으면 행동을 없애지 않고 10분짜리로 줄인다. 행동은 이동만, 삭제 없음.
4. **쉰 날은 실패가 아니다**(Lally et al. 2010; Marlatt & Gordon 1985): 하루 빠짐은 습관 형성에 영향이 없고, "망쳤다" 프레임이 진짜 이탈을 만든다. 연속 스트릭 대신 누적 "showed-up days".
5. **주간 루프가 제품의 심장**(TheGoal Phase 8): 기대 vs 관찰 → 제약 재판별 → 목표 버전 갱신. 활동이 아니라 **증거**가 쌓일 때만 게이트를 통과한다.

---

## 1. 설계 원칙 — 프레임워크 → 모듈 → 제품 변화

| 프레임워크 (출처) | 쓰는 모듈 | 제품에서 바뀌는 것 |
|---|---|---|
| **TheGoal** (B:Essential, v0.3) — 목표 3상태 · 9 Phase · 문제 5분류 · 근본제약 · AI중립 비교 · milestone gate · 실행→관찰→재정의 · 한 번에 질문 1개 | 전체 뼈대: §3 목표/계획, §6 주간 리뷰 | 입력 = Phase 0 mirror, 경로 = Phase 3 routes, 아크 = Phase 7 roadmap, 체크인 = Phase 8. "최종 목표" 대신 "validated-for-now" |
| Theory of Constraints (Goldratt 1984) | §3.4 제약 판별, §4 오늘 행동 선택 | 하루에 행동 1개, 코칭 주제 1개. 비병목 최적화 금지 |
| COM-B / Behaviour Change Wheel (Michie, van Stralen & West 2011) | §3.4 제약 분류 → 개입 매핑 | "왜 못 했나"를 능력/기회/동기로 분류, 각각 다른 처방(교육·환경 재구성·설득) |
| Fogg Behavior Model B=MAP (Fogg 2009; Tiny Habits 2019) | §4 크기 결정 | 동기 낮을 때 능력 요구를 낮춘다 → `micro` 10분 버전, 프롬프트는 앵커 뒤 |
| Implementation intentions (Gollwitzer 1999; Gollwitzer & Sheeran 2006 메타 d≈.65) | 행동 스키마 `if_then` | 모든 행동에 "요일 · 앵커 · 장소" if-then 문장 |
| WOOP / Mental contrasting (Oettingen 2014; MCII: Duckworth et al. 2011) | 경로 카드 구조 | Wish=경로, Outcome=What transfers, Obstacle=What's missing, Plan=First 2 weeks |
| Self-Determination Theory (Deci & Ryan 2000) | §5 메시지 정책 | 자율성(선택지 2개, "~할 수 있어요") · 유능감(구체 진행 언급) · 관계성("we") |
| Self-efficacy (Bandura 1977, 1997) | SE 추정, 행동 순서 | 첫 2주는 성공 확률 높은 mastery 행동부터; 쉰 뒤 micro 성공에 가중치 |
| 습관 형성 (Lally et al. 2010: 중앙값 66일, 범위 18–254; 하루 누락은 영향 없음) | 12주 아크 길이, rest-day 규칙 | 12주 = 84일 ≈ 66일 + 여유. "하루 빠짐 ≠ 리셋" |
| Abstinence-violation effect (Marlatt & Gordon 1985) · what-the-hell effect (Cochran & Tesser 1996 (확인 필요)) | §4.5 rest-day | 금지어(fail/missed/broken), 연속 스트릭 표시 금지 |
| Self-compassion (Neff 2003; Breines & Chen 2012) | §5 톤 | 자기연민 조건이 개선 동기를 높인다 → 인정→재해석 순서 고정 |
| Fresh-start effect (Dai, Milkman & Riis 2014) | §6 주간 리뷰 시점 | 월요일·새 달·게이트 통과를 재시작 랜드마크로 사용 |
| Goal-gradient · endowed progress (Hull 1932; Kivetz, Urminsky & Zheng 2006; Nunes & Drèze 2006) | 대시보드, 게이트 표시 | "M2까지 증거 2/3" — 다음 게이트까지 거리를 보여준다 |
| Planning fallacy (Kahneman & Tversky 1979; Buehler, Griffin & Ross 1994) | 주간 계획 크기 | 주 3개 · 각 ≤30분 상한, 다음 주 크기는 관찰된 완료율로 산정(+20% 상한) |
| Nudge · EAST (Thaler & Sunstein 2008; Behavioural Insights Team 2014) | 기본값·타이밍 | Easy(기본값=micro) Attractive(전문성 전이 맨 위) Social(로드맵) Timely(fresh start·JITAI) |
| JITAI (Nahum-Shani et al. 2018) | §4.6 결정 시점·tailoring 변수 | 결정 시점 4개, tailoring 변수 6개, 개입 옵션 6개의 결정 규칙표 |
| Transtheoretical Model (Prochaska & DiClemente 1983) | 사람 모델 stage | contemplation 사용자에겐 행동 대신 재해석·탐색 질문 |
| Career construction · adaptability 4C (Savickas 1997, 2005; Savickas & Porfeli 2012) | 사람 모델 traits, 경로 카드 | concern/control/curiosity/confidence 추정 → 약한 C에 맞춘 첫 행동 |
| Career capital (DeFillippi & Arthur 1994: knowing-how/whom/why) | 사람 모델 | 입력 3칸에서 how/whom/why 추출 → "What transfers" |
| Hope theory (Snyder 2002) · possible selves (Markus & Nurius 1986) | 경로 3개 설계 | pathways(경로) + agency(이번 주 행동)를 동시에 제공 |
| Choice overload (Iyengar & Lepper 2000) | UI | 경로 3, 선택지 2, 하루 행동 1 |
| Progress principle (Amabile & Kramer 2011) | 메시지·대시보드 | 작은 진행을 매일 명시 ("1/3 done · 1 moved") |
| 실직·구직 심리 (Paul & Moser 2009 메타; Wanberg 2012; Wanberg, Zhu & van Hooft 2010 일기연구 (확인 필요)) | §6 에스컬레이션, §7 | 장기 저조는 코칭이 아니라 사람 연결 신호 |
| 수면·HRV 생리 (Roenneberg et al. 2003 MCTQ; Thayer & Lane 2009; Shaffer & Ginsberg 2017) | §2 센서 플러그 | 수면 길이·규칙성·RMSSD z-score → 컨디션 prior (로드맵) |

---

## 2. 사람 모델 — Who is this person

### 2.1 상태 모델

```json
{
  "traits": {
    "career_capital": { "knowing_how": [], "knowing_whom": [], "knowing_why": [] },
    "adaptability_4c": { "concern": 1, "control": 1, "curiosity": 1, "confidence": 1 },
    "constraints": { "hours_per_week": null, "runway_months": null, "care_duties": null },
    "chronotype": "unknown|morning|evening",
    "values_priority": "income_now|craft|stability|autonomy",
    "stage_of_change": "contemplation|preparation|action|maintenance"
  },
  "states": {
    "energy": 3, "mood": null, "motivation": null,
    "self_efficacy": 0.5, "momentum": 0.5, "dropout_risk": "green"
  },
  "goal_version": { "state": "ambiguous|provisional|validated_for_now", "history": [] }
}
```

### 2.2 추정 방법 — 지금(수동 로그) vs 나중(센서·연동)

| 변수 | MVP 추정 | 센서·연동 후 (로드맵) |
|---|---|---|
| energy | 로그의 condition 1–5 (사용자 선언) | 수면 길이·규칙성(Phillips et al. 2017 SRI (확인 필요))·야간 HRV RMSSD의 개인 z-score 가중합 → 1–5 prior. **선언값이 항상 우선**, 센서는 제안만 |
| mood | 없음 (inspiration 한 줄 감성은 주간 LLM 분석, 로드맵) | — |
| motivation | 로그 존재 여부 · "did" 길이 · 앱 열람 | 앱 열람 시각 분포 |
| self_efficacy | 시도 대비 완료 EWMA (§4.3) | 동일 |
| momentum | 일별 점수 EWMA (§4.3) | 동일 |
| stage_of_change | LLM이 입력 텍스트에서 분류(근거 인용 필수) + 행동 규칙: 4주 연속 주 1회 이상 done → action, 8주 → maintenance 후보 | 동일 |
| chronotype | 질문 1개 "언제 글이 가장 잘 써지나요?" (로드맵) · 체크인 시각 분포로 추정 | 수면 중간시각(MCTQ) |
| hours_per_week, runway | 선택 입력 (빈칸 허용 — "측정 안 됨 ≠ 0", TheGoal Phase 2) | 캘린더 빈 블록 |
| career_capital | LLM이 3칸에서 추출, 원문 인용 보존 | 포트폴리오·LinkedIn 가져오기 |
| adaptability_4c | LLM 1–5 추정, `interpretation` 라벨 (fact와 분리) | — |

### 2.3 타깃 아키타입 `[SIMULATION]` — 프리랜서 카피라이터가 직장인과 다른 점: 고정 일정 없음, 수입 변동, 혼자 일함(사회적 기회 제약), 자기 브랜드가 곧 자산

| 아키타입 | 신호 (입력 텍스트·초기 로그) | 예측 행동 | 기본 튜닝 |
|---|---|---|---|
| A. 여유 있는 피벗러 | runway ≥ 4개월, "콘텐츠 전략/UX writing으로", 호기심 높음 | 초반 과잉 계획 → 3주차 급락 (planning fallacy) | 행동 상한 엄격(3개·30분), 2주 게이트 증거 요구 |
| B. 수입 압박형 | "당장 돈", 어떤 의뢰든 받음, hours ≤ 5 | Opportunity(시간) 제약, 로그 빈번 누락 | 모든 행동 micro 기본, 수입 인접 경로 우선, 주 2개 |
| C. 정체성 애도기 | "AI가 내 일을 가져갔다", 분노·상실 언어, contemplation | 행동 지시에 저항, 재해석 필요 | 첫 2주는 탐색·대화 행동, 질문 1개씩, 성과 언급 자제 |
| D. 툴 호기심형 | 이미 AI 사용, "프롬프트 전문가" 희망 | 도구 전전 (목표 전에 툴) | TheGoal 원칙 1 적용: "그 도구가 어떤 변화를 만들죠?" 질문으로 되돌림 |

아키타입은 라벨이 아니라 **초기 prior**다. 2주 로그가 쌓이면 §3.4 제약 판별이 prior를 덮어쓴다.

---

## 3. 목표 → 계획 (TheGoal 적용)

### 3.1 목표 3상태와 제품 화면

| TheGoal 상태 | 제품 순간 | 전이 조건 |
|---|---|---|
| Ambiguous | 입력 3칸 제출 직후 (경쟁 방향 여러 개, 증거·기한 없음) | LLM mirror 2문장 + 경로 3 제시 |
| Provisional | 경로 1개 선택 | 사용자가 목표 문장을 **자기 말로 수정**(Phase 1 gate; MVP는 선택 클릭으로 대체) |
| Validated-for-now | M1(2주) 게이트 통과 + 사용자 confirm | 증거 1개 존재 + continue 결정. 이후 게이트마다 재검증 |

목표 문장 형식(LLM이 초안, 사용자가 편집): *I want to **[observable change]** for **[beneficiary]** by **[week 12]**, because **[why]**, while preserving **[boundary]**. I'll know it's working when **[evidence]**.*

### 3.2 경로(Route) = WOOP 카드

경로마다 LLM이 채운다: `mechanism`(어떻게 목표를 만드는가) · `what_transfers[3]`(Outcome, 경력에서 이어지는 것, 원문 인용) · `whats_missing[1–2]`(Obstacle) · `assumptions_at_risk[1–2]` · `predictable_problems[1–2]` · `reversible_first_step` · `first_two_weeks`. 순위·추천 점수는 넣지 않는다 — **사용자가 고른다**(TheGoal 원칙 2). 3개는 서로 메커니즘이 달라야 한다(예: 인접 직무 전환 / 같은 기술의 새 고객군 / AI-보강 서비스 재포장).

### 3.3 12주 → 주 → 하루

```
12주 아크 (경로당 1줄) ─ 게이트 4개 ─ 주간 행동 3개(≤30분, 요일+if-then) ─ 오늘 행동 1개(full 또는 micro ≤10분)
```

| 게이트 | 주차 | Outcome | Problem gate(풀어야 할 불확실성) | Evidence(통과 기준) | Decision |
|---|---|---|---|---|---|
| M1 Fit | 2 | 이 경로가 나와 맞는지 첫 증거 | "이 일이 실제로 어떤 일인가?" | 현직자 대화 1 **또는** 타깃 형식 샘플 1 | continue → validated-for-now / change path |
| M2 Proof | 6 | 전이 증명물 | "내 과거 작업이 타깃 형식으로 번역되는가?" | 재작성 포트폴리오 2–3 + 외부 피드백 1 | continue / reframe scope |
| M3 Market | 9 | 시장 접촉 | "누가 이것에 돈·시간을 쓰는가?" | 타깃 아웃리치 10 · 대화 3 · 파일럿/지원 1 | continue / change route |
| M4 Ready | 12 | 지원 가능 상태 | "내 이야기가 한 번에 전달되는가?" | 내러티브 + 포트폴리오 + 지원/피치 5 · JR ≥ 70 (§7) | 지원 단계로 / 연장 |

게이트 순서는 흥미가 아니라 **의존성과 제약** 순(TheGoal Phase 7). 통과 못 해도 "실패"가 아니라 `decision: reframe` + 이유를 버전 이력에 남긴다. 밀린 아이디어는 `not_now[]` 리스트로 보존.

### 3.4 문제 5분류 + 근본 제약 판별 (로그 → 규칙)

**5분류 규칙 (매주 자동 생성, 사용자에게는 제약 1개만 보여줌)**

| 분류 | 로그 데이터 규칙 | 예 |
|---|---|---|
| Current | 같은 action이 2회 이상 이동 · condition ≤2가 최근 7일 중 ≥3일 | "아웃리치 메시지 쓰기"가 2주째 이동 |
| Predictable | 경로의 `predictable_problems`를 해당 게이트 2주 전에 활성화 | M3 전 "답장 없음에 좌절" |
| Assumptions at risk | 경로의 `assumptions_at_risk`를 M1·M3 게이트에서 증거와 대조, 반증 시 플래그 | "UX writing 수요가 내 네트워크에 있다" ↔ 아웃리치 5건 무응답 |
| Blind-spot | 렌즈 자동 점검: 시간(계획 분 > 선언 가용 분) · 현금(runway < 남은 주) · 에너지(3일 평균 하락 ≥1) · 의존(행동이 타인 응답 대기) | 주 90분 계획인데 가용 60분 |
| Noise | inspiration 줄의 툴·뉴스 언급 중 연결된 행동이 없는 것 → `not_now[]` | "새 AI 글쓰기 툴 써봐야지" |

**근본 제약 판별 (COM-B 점수, 최근 14일)**

```
for each action with status in {moved, carried}:
  reason = user_tap_reason (로드맵: Not today 화면 선택지 1탭) 
           ?? infer:
             cond <= 2                       → CAP_physical  (에너지)
             cond >= 3 && others_done_today  → MOT (이 행동만 피함) or CAP_psych (시작법 모름) → 질문 1개로 분기
             cond >= 3 && nothing_done       → OPP_time
             action.depends_on_person        → OPP_social
  score[reason] += weight(recency)   // 오늘 1.0, 7일 전 0.5, 14일 전 0.25

constraint = argmax(score); 동점이면 "한 번에 질문 1개"로 사용자에게 묻는다.
TOC 테스트: 이 제약이 사라지면 진행이 눈에 띄게 빨라지는가? 여러 증상을 동시에 설명하는가? 아니면 질문으로 돌아간다.
```

| 제약 | BCW 개입 기능 | 다음 주 행동이 바뀌는 방식 |
|---|---|---|
| CAP_physical (에너지) | enablement | 모든 행동 micro 기본, 요일을 컨디션 높은 날로 |
| CAP_psych (방법 모름) | education · modelling | 행동을 "예시 1개 보고 10분 따라 하기"로 쪼갬 |
| OPP_time | environmental restructuring | 주 2개로 축소, if-then 앵커를 기존 루틴에 부착 |
| OPP_social (타인 대기) | enablement | 메시지 템플릿 제공, 병렬 대안 행동 |
| MOT (회피·의미 상실) | persuasion · 재대조(WOOP) | 경로의 "why"와 과거 성취 인용, 더 작은 mastery 행동, 선택지 2개 |

**병목 규칙: 한 번에 제약 하나만 코칭한다.** 두 번째 제약은 첫 번째가 풀리거나(2주 연속 해당 이유 0건) 제약이 이동했을 때만.

---

## 4. 하루 루프 알고리즘

### 4.1 입력 스키마 — 일일 로그 (1분)

```json
{
  "date": "2026-10-24",
  "did": "Rewrote the old insurance landing copy as UX microcopy — 20 min",
  "condition": 3,
  "actions": [
    { "id": "w1a2", "status": "done", "minutes": 20, "variant": "full" },
    { "id": "w1a3", "status": "todo" }
  ],
  "inspiration": "A UX writer's portfolio that used before/after screens",
  "checkin_time": "21:10",
  "not_today_reason": null,
  "_label": "synthetic"
}
```
`status ∈ {todo, done, moved, carried, rest}` · `variant ∈ {full, micro}` · `not_today_reason ∈ {null, no_time, dont_know_how, didnt_feel, waiting_on_someone, low_energy}` (로드맵, MVP는 null).

행동 스키마(LLM 1회 출력에 포함): `{ id, title, minutes ≤30, day: "Mon|Wed|Fri", if_then, micro: {title, minutes ≤10}, evidence_produced, milestone: "M1", constraint_targeted: "CAP_psych", depends_on_person: false }`

### 4.2 특징 추출 (주간 윈도우 7일, 추세 14일)

| 기호 | 정의 |
|---|---|
| `planned_w`, `done_w`, `moved_w` | 이번 주 행동 수 (moved는 "이동됨"이지 "미완"이 아님) |
| `showed_up` | 로그가 있는 날의 **누적** 수 (절대 리셋되지 않음 — 스트릭 대체) |
| `gap_days` | 마지막 로그 이후 일수 |
| `consec_rest` | 연속 Not today 수 |
| `cond_mean3`, `cond_trend` | 최근 3일 컨디션 평균, (최근3일 − 이전3일) |
| `attempts` | due 요일이 지난 행동 수; `successes` = 그중 done |

### 4.3 점수 공식

```
진행      P_w  = done_w / planned_w                       (분 가중 변형: Σdone.min / Σplanned.min)
꾸준함    C_7  = (최근 7일 중 로그 있는 날) / 7            ← 로그 자체를 보상 (한 일 없어도 showed up)
모멘텀    Mo_t = 0.3·s_t + 0.7·Mo_{t-1},  Mo_0 = 0.5
          s_t  = 1.0 (행동 1개 이상 done) · 0.5 (로그만, rest/moved) · 0.0 (로그 없음)
자기효능  SE_t = 0.2·(successes/attempts) + 0.8·SE_{t-1},  SE_0 = 0.5
          보너스: rest 다음 날 micro 완료 → SE += 0.05 (좌절 후 mastery, Bandura 1997)
용량      Cap_t = base(30분) × g(cond_t) × h(cond_trend)
          g = {1: 0.2, 2: 0.4, 3: 0.7, 4: 1.0, 5: 1.0}   ← 5에서도 늘리지 않는다 (과잉 약속 방지)
          h = 0.8 if cond_trend ≤ −1 else 1.0
이탈위험  R_t 점수표 (결정론, 테스트 가능):
          gap_days ≥ 2 → +2 (≥4 → +3) · consec_rest ≥ 2 → +2 · Mo < 0.35 → +1
          cond_mean3 ≤ 2 → +1 · SE < 0.4 → +1 · 아크 1주차 → +1 (초기 취약기)
          level: 0–1 green · 2–3 amber · ≥4 red
```
계수는 설계 prior다 `(확인 필요 — 실데이터로 로지스틱 보정)`. 센서가 붙으면 `cond_t`의 prior만 바뀌고 공식은 그대로다.

### 4.4 오늘 행동 결정 규칙

```
pickToday(week, todayIdx, cond, R):
  a = 오늘 요일에 배정된 action (없으면 가장 가까운 carried/moved → 없으면 none → "오늘은 계획 없음, 쉬는 날")
  if cond <= 2 or R == red:
      return { action: a, variant: "micro", lead: "rest_first",
               choices: ["Rest today — moves to <next slot>", "<micro.title> (≤10 min)"] }
  if Cap_t < a.minutes:
      return { action: a, variant: "micro", lead: "do",
               choices: ["<micro.title> (≤10 min)", "Full version (<a.minutes> min)"] }
  return { action: a, variant: "full", lead: "do",
           choices: ["Done", "Not today"] }
```
- 하루에 행동은 **1개**만 보여준다(TOC·choice overload). 나머지는 접힘.
- 시기(when): `if_then`의 앵커("after my first coffee" 등). MVP는 LLM이 생성한 문장 그대로; 로드맵에서 chronotype으로 앵커 추천.
- 크기는 늘릴 때 +20%/주 상한, 줄일 때는 즉시.

### 4.5 Rest-day 로직 (abstinence-violation 방지)

```
applyNotToday(week, actionId, todayIdx):
  a.status = "moved"; a.moved_to = 다음 빈 슬롯
     규칙: 다음 날부터 탐색, 이미 행동이 있는 날은 건너뜀(하루 2개 금지), 주 끝이면 다음 주 슬롯 1 → status "carried"
  a.variant 추천 = "micro"  (이동한 행동은 기본적으로 작아진다)
  메시지 = ack → reframe → next (§5 템플릿 REST)
  consec_rest == 2 → 추가 선택지 "Shrink this week to 2 steps?" (기본값: 유지, 강요 없음)
  동일 action carried ≥ 2주 → 재계획 질문 1개: "이 단계가 계속 밀리네요 — 잘못된 단계일까요, 잘못된 크기일까요?"
  gap_days ≥ 4 (로그 자체 없음) → RECONNECT 템플릿 (fresh start 프레임, 질문 1개, 행동은 micro 1개)
```
금지: 삭제, 빨간색, "missed/failed/streak", 연속 카운터. 허용: "moved", 누적 showed_up, "1/3 done · 1 moved".

### 4.6 JITAI — 결정 시점 · tailoring 변수 · 개입 옵션

| 결정 시점 | tailoring 변수 | 개입 옵션 (결정 규칙) |
|---|---|---|
| D1 아침 계획 (chronotype 기준, 로드맵 push) | cond(전날), R, 오늘 배정 여부 | 배정 있음 → 오늘 행동 1개 + if-then 리마인드 · R red → rest_first 카드 |
| D2 앵커 −15분 (로드맵) | if_then 앵커 시각 | 짧은 프롬프트 1회만 (EAST: Timely). 무응답 시 재발송 없음 |
| D3 저녁 체크인 | Done/Not today, cond | Done → 진행 메시지 + 증거 저장 · Not today → REST 템플릿 |
| D4 48시간 침묵 | gap_days, 요일 | gap ≥ 2 → 조용한 1줄 ("No pressure — one 10-minute step is waiting") · gap ≥ 4 → RECONNECT |
| **MVP 결정 시점 = 앱 열 때 1개** | 위 변수 전부를 열람 시 계산 | D1+D3 결합: 오늘 카드 + 체크인 버튼 |

개입 강도 사다리: none → 1줄 nudge → 크기 축소 → rest 제안 → 재계획 질문 → 사람 연결(§6.5). 한 단계씩만 올라간다.

---

## 5. 코칭 메시지 생성

### 5.1 메시지 정책

1. **구조 고정**: 인정(사실 1문장) → 재해석(진행 근거 1문장) → 가장 작은 다음 행동(1문장, ≤10–15분). 3문장 이내.
2. **자율성 지지 언어**(SDT): "you could / would you like / your call" · 선택지 항상 2개 · 명령문·"should/must" 금지.
3. **유능감**: 추상 칭찬 대신 구체 사실 ("2 of 3 done, 9 days showed up").
4. **금지어**: fail, failed, missed, broke/broken, streak, behind, lazy, should, must, excuse, "just".
5. **수치 표현**: moved는 분모에 넣지 않는다 — "1/3 done · 1 moved" (not "1/3, 2 undone").
6. **질문은 1개**만, 그것도 재계획·RECONNECT 상태에서만.
7. 빨간색·경고 아이콘 없음. rest 상태는 중립색.

### 5.2 상태별 템플릿 (MVP는 결정론 문자열, `{}`만 치환)

| 상태 | 템플릿 (EN) |
|---|---|
| DONE | "{action} — done. {done}/{planned} this week · {showed_up} days showed up. Next: {next_day}, {next_action} ({next_min} min)." |
| REST (Not today) | "Today was a rest day, not a missed day. {done}/{planned} are already done this week. {moved_day}'s step moves to {next_day} — {micro_min} minutes is enough." |
| REST ×2 | "Two rest days in a row usually means the week is heavier than the plan, not that you are. Keep 3 steps, or shrink to 2 this week? Your call." |
| CARRIED ≥2주 | "{action} has moved for two weeks. One question: is it the wrong step, or the wrong size?" |
| RECONNECT (gap ≥4) | "Welcome back. Nothing was lost — {showed_up} days still count. Monday is a fresh page: one 10-minute step, {micro_title}?" |
| GATE_PASS | "{gate} passed: {evidence}. Your goal just moved from draft to validated-for-now. Next gate: {next_gate} in {weeks} weeks." |
| PLATEAU | "You've done {done_4w} steps in 4 weeks — real work. None turned into evidence yet, so next week's steps are reshaped to produce one." |
| LOW_ENERGY (cond ≤2) | "Energy {cond}/5 today. Two options: rest and move {action} to {next_day}, or the 5-minute version — {micro_title}." |

### 5.3 LLM 프롬프트 계약 — 호출 1회 (경로 생성 시점)

**입력 JSON**
```json
{
  "locale": "en-US", "today": "2026-10-24",
  "career": "<칸1 원문>", "situation": "<칸2 원문>", "interests": "<칸3 원문>",
  "constraints": { "hours_per_week": null, "runway_months": null },
  "rules": { "paths": 3, "actions_per_week": 3, "max_minutes": 30, "micro_max_minutes": 10,
             "days": ["Mon","Wed","Fri"], "banned_words": ["fail","missed","streak","should","must","behind"] }
}
```
**시스템 지시 요지**: TheGoal Phase 0–3·7을 수행한다. (1) 원문을 고치지 말고 mirror 2문장 (2) 목표 초안 8필드, 불확실한 필드는 `null` (3) 메커니즘이 다른 경로 3개, 추천 순위 금지, `what_transfers`는 입력 원문을 인용 (4) 경로마다 12주 게이트 4개와 1주차 행동 3개(각 ≤30분, 요일, if-then, micro ≤10분, evidence_produced, milestone, constraint_targeted) (5) 정보이득이 가장 큰 질문 1개 (6) 위기 언어 감지 시 `safety.flag=true` (7) 금지어 사용 금지, JSON만 출력.

**출력 JSON 스키마**
```json
{
  "mirror": "string (2 sentences, client's own words preserved)",
  "goal_state": "ambiguous | provisional",
  "goal_draft": { "owner": "", "beneficiary": "", "desired_change": "", "why": "",
                  "evidence": "", "horizon": "12 weeks", "boundary": "", "priority": "" },
  "stage_of_change": { "value": "contemplation|preparation|action", "quote": "" },
  "career_capital": { "knowing_how": [], "knowing_whom": [], "knowing_why": [] },
  "paths": [
    {
      "id": "p1", "name": "", "mechanism": "",
      "what_transfers": ["", "", ""], "whats_missing": [""],
      "assumptions_at_risk": [""], "predictable_problems": [""],
      "reversible_first_step": "", "first_two_weeks": "",
      "arc_one_line": "",
      "milestones": [
        { "id": "M1", "week": 2, "outcome": "", "problem_gate": "", "evidence": "", "decision_options": ["continue","change"] }
      ],
      "week1_actions": [
        { "id": "p1w1a1", "title": "", "minutes": 25, "day": "Mon",
          "if_then": "On Monday after my first coffee, I will ... at my desk",
          "micro": { "title": "", "minutes": 10 },
          "evidence_produced": "", "milestone": "M1",
          "constraint_targeted": "CAP_psych", "depends_on_person": false }
      ]
    }
  ],
  "one_question": "string",
  "not_now": [""],
  "safety": { "flag": false, "reason": "" },
  "_label": "synthetic"
}
```
경로당 행동 3개 × 3경로 = 9개 행동이 한 번에 나오므로 체크인·rest-day·micro 전환에 **추가 LLM 호출이 필요 없다**. 주간 재계획(로드맵)만 주 1회 호출.

---

## 6. 모니터링 · 지속성

### 6.1 주간 리뷰 알고리즘 (월요일 = fresh start)

```
weeklyReview(weekLog, arc):
  obs = { done, moved, carried, cond_mean, showed_up_days, evidence_items, constraint }
  expected = { done: 3, evidence_items: ≥1 if gate_week else ≥0 }
  // 1. 기대 vs 관찰 (TheGoal Phase 8.1)
  if done == 3 and cond_mean >= 3: next.count = 3; next.minutes = min(cur*1.2, 30)
  elif done >= 2:                  next = same
  elif done == 1:                  next.count = 2; rerun constraintDetect()
  else:                            next.count = 1 (micro); ask one_question (reframe, not blame)
  // 2. 패턴 → 구조 (Phase 5)
  if any action carried >= 2 weeks: replan(action)  // 잘못된 단계 vs 잘못된 크기
  if constraint changed: swap intervention table row (§3.4)
  // 3. 활동 ≠ 움직임 (TheGoal failure mode)
  if evidence_items_4w == 0 and done_4w >= 6: PLATEAU → reshape next actions to evidence-producing
  // 4. 게이트 주
  if gate_week: evaluateGate() → decision ∈ {continue, change, stop, reframe}; log reason; goal_version++
  // 5. 목표 재검증 (Phase 8.5) — 사용자 confirm 1탭
```

### 6.2 드리프트 · 정체 감지

- **드리프트**: 최근 2주 done 중 현재 milestone 태그가 아닌 비율 ≥ 50% → "좋은 일을 하고 있지만 경로 밖이에요 — 경로를 옮길까요, 일을 옮길까요?" (경로 변경도 학습이지 실패가 아님).
- **정체**: 위 PLATEAU 규칙. 활동량이 아니라 증거 수로 판단.
- **제약 이동**: 2주 연속 동일 이유 0건 → 제약 해제, 다음 argmax로.

### 6.3 재계획 트리거 (LLM 주 1회 허용, 로드맵)

게이트 decision = change/reframe · 동일 action carried ≥2주 · R red 2주 연속 · 사용자가 경로 변경 요청 · 선언 제약 변화(hours/runway).

### 6.4 게이트 통과 기준

증거 artifact가 ledger에 존재(§7) **그리고** 사용자 confirm **그리고** decision 기록. 자동 통과 없음 — 사용자가 "Yes, this is working" 증거를 자기 말로 확인(TheGoal 목표 필드 Evidence).

### 6.5 에스컬레이션 — 사람에게 넘길 때

| 신호 | 동작 |
|---|---|
| 자유 텍스트에 위기 언어(자해·절망 표현) | 코칭 즉시 중단, 지역 위기 자원 표시(미국·캐나다 988), 판단·진단 문구 없음 |
| cond ≤2가 14일 중 ≥10일 | "코치 앱이 할 수 있는 범위를 넘었을 수 있어요 — 의사나 상담사와 이야기해 볼까요?" + 계획 자동 축소 |
| R red 2주 연속 | 사람 코치/동료 연결 제안(로드맵), 계획 1 micro로 |
| 경제 위기 언어(집세·퇴거) | 실업급여·지역 커리어 센터 자원 안내, 수입 인접 경로 우선 |
장기 실직은 정신건강에 실질적 영향을 준다(Paul & Moser 2009) — 이 앱은 치료가 아니며, 그 경계를 화면에 명시한다.

### 6.6 대시보드 (보여주는 것만)

이번 주 바("2/3 done · 1 moved") · 누적 showed-up days · 14일 에너지 스파크라인(사용자 선언값) · **현재 제약 카드 1장** · 다음 게이트와 거리("M2 evidence 2/3", goal-gradient) · 증거 선반 · not-now 리스트 · 목표 버전 이력. 보여주지 않는 것: 연속 스트릭, 순위, 타인 비교, 추론된 감정.

---

## 7. 성공 → 취업

### 7.1 로그 → 증거 선반 (evidence ledger)

done 행동의 `evidence_produced`가 비어 있지 않으면 항목 생성:
```json
{ "date": "", "milestone": "M2", "artifact_type": "portfolio_piece|conversation|feedback|application|pitch",
  "skill_tags": ["conversion copy", "voice & tone"], "source_action": "p1w3a2",
  "bullet_draft": "Redrafted a 2021 insurance landing page into UX microcopy (3 screens), cutting word count 40% while keeping the brand voice — demonstrates transferable voice-and-tone systems work." }
```
bullet 형식: *Redrafted [과거 작업] into [타깃 형식], [측정치], demonstrating [transferable skill]* (MVP 템플릿 문자열, LLM 다듬기는 로드맵). 스킬 증명 매트릭스 = `skill_tag × artifact 수`.

### 7.2 Job-readiness 점수 JR (0–100, 설계 prior `(확인 필요)`)

| 구성 | 배점 | 산식 |
|---|---|---|
| Proof artifacts | 30 | 타깃 형식 포트폴리오 1개당 10, 최대 3 |
| Market signal | 25 | 현직자 대화 5/건(최대 15) + 외부 피드백 10 |
| Narrative | 15 | 목표 문장 validated 5 + what-transfers 자기 말 3줄 5 + 60초 피치 5 |
| Consistency | 15 | 최근 4주 C 평균 × 15 |
| Pipeline | 15 | 지원/피치 1건당 3, 최대 5 |

### 7.3 지원 단계 게이트

| 단계 | 진입 조건 | 주간 행동의 무게중심 |
|---|---|---|
| Explore | JR < 25 | 대화·샘플 (M1) |
| Build proof | 25–50 | 재작성 포트폴리오 (M2) |
| Reach out | 50–70 | 아웃리치·피드백 (M3) |
| Apply | ≥ 70 | 지원·피치 5+, 인터뷰 준비 |
| Interview → Offer | 지원 응답 추적 | 각 인터뷰를 증거로 역입력(피드백 → 다음 주 행동) |
구직은 양보다 **질과 자기조절**이 결과를 예측한다(Kanfer, Wanberg & Kantrowitz 2001; Van Hooft et al. 2013) — 지원 건수를 KPI로 밀지 않고 JR의 15점으로만 둔다.

---

## 8. 윤리 · 안전

- **정신건강 경계**: 치료·진단 아님을 첫 화면과 설정에 명시. §6.5 트리거는 "자원 안내 + 코칭 축소"까지만. 임상 척도(PHQ 등)는 앱이 실시하지 않는다.
- **데이터 최소화**: MVP는 저장 0("Nothing you type is stored"). 로드맵은 local-first(기기 내), 내보내기·전체 삭제 1탭, 서버 전송은 명시 opt-in.
- **감시감 제거**: 화면의 모든 상태는 **사용자 선언값**이 기본. 센서값은 `sensed` 배지로 분리, 신호별 opt-in, 언제든 끄기, 선언값이 항상 센서값을 덮어쓴다. 추론된 감정·동기("you seemed unmotivated")는 절대 표시하지 않는다 — 사용자의 말만 되돌려준다(TheGoal 원칙 5).
- **B2B(아웃플레이스먼트)**: 고용주에게 개인 로그·메시지 비공개, 집계 지표만, 개인 동의 별도.
- **합성 데이터 라벨**: 모든 샘플 행 `"_label": "synthetic"`, 화면 배지 "Sample persona — synthetic", 문서 `[SIMULATION]`. 실제 인물 데이터(동의 여부 무관) 사용 금지(CONTRACT §C 2).
- **AI 중립**: 행동 추천에서 AI 툴은 세 가지 옵션 클래스(사람/프로세스/기술) 중 하나일 뿐, 기본값이 아니다.

---

## 9. MVP 구현 범위 (오늘 13:00 G3까지)

### 9.1 데모에서 실제로 도는 것

| 우선 | 구성 | 구현 | 담당 시각(제안) |
|---|---|---|---|
| P0 | `applyNotToday`, `weekBar`, `restDayMessage` + 테스트 | `app/logic.js` 순수 함수 (DOM·네트워크 없음) | ~12:05 |
| P0 | LLM 1회 호출 + §5.3 스키마 + `data/sample_response.json` 폴백 | `app/app.js` fetch 1개, 실패 시 폴백 | ~12:30 |
| P0 | 화면 4상태: Landing → Input → Paths → This week(+체크인) | `index.html` + 상태 변수 1개 | ~12:50 |
| P1 | 오늘 컨디션 1–5 슬라이더 → `capacityMinutes` → micro 자동 제안 | logic.js 함수 1개 + UI 1줄 | 시간 남으면 |
| P2 | 14일 합성 로그로 `momentum`·`dropoutRisk` 계산해 "Progress" 탭 표시 | 데이터셋은 테스트용으로 먼저, 화면은 피치 스크린샷용 | 13:00 이후 |

**logic.js 시그니처 (Build가 그대로 쓰도록)**
```js
// week = { actions: [{id,title,minutes,day,status,micro,moved_to}], days: ["Mon","Tue",...,"Sun"] }
export function applyNotToday(week, actionId, todayIdx)      // → { week, movedTo: "Thu", carried: bool }; never deletes
export function weekBar(week)                                 // → { done, moved, planned, text: "1/3 done · 1 moved" }
export function restDayMessage({ action, movedTo, bar, showedUp }) // → { ack, reframe, next } (banned words 0)
export function capacityMinutes(condition, base = 30)         // → 6 | 12 | 21 | 30 | 30
export function pickToday({ week, todayIdx, condition })      // → { action, variant: "full"|"micro", choices: [2] }
export function momentum(dailyScores, alpha = 0.3)            // → number 0..1
export function dropoutRisk({ gapDays, consecRest, mo, condMean3, se, weekIdx }) // → { points, level }
```
**테스트(먼저 쓴다, `app/tests/logic.test.mjs`)**: ① Not today → 다음 날로 이동, 길이 불변(삭제 없음) ② 다음 날 이미 행동 있으면 그 다음 날로(하루 2개 금지) ③ 금요일 Not today → `carried: true` ④ `weekBar` 텍스트 정확히 "1/3 done · 1 moved" ⑤ `restDayMessage` 출력에 금지어 0 ⑥ `capacityMinutes(2) === 12` ⑦ 합성 14일로 `dropoutRisk` day 11 = amber(3점), day 14 = green.

### 9.2 14일 합성 데이터셋 스펙 — `app/data/synthetic_14d.json` `[SIMULATION]`

```json
{ "_label": "synthetic", "persona": "Sample persona — synthetic (US freelance copywriter, 7 yrs)",
  "path": "p1 UX writing / content design", "arc_start": "2026-10-05",
  "days": [ { "day": 1, "date": "2026-10-05", "condition": 4, "logged": true,
              "actions": [{ "id": "p1w1a1", "status": "done", "variant": "full", "minutes": 25 }],
              "did": "", "inspiration": "", "not_today_reason": null } ] }
```

행동 배정은 월·수·금. 2주차 `w2a3` = "UX writer와 20분 대화" (micro = "15분 대화 요청 메시지 1통 보내기").

| Day | 날짜(요일) | cond | 로그 | 행동 결과 | 이야기 · 알고리즘 반응 |
|---|---|---|---|---|---|
| 1 | 10-05 월 | 4 | ✓ | w1a1 done (full 25분) | 강한 시작 |
| 2 | 화 | 4 | ✓ | 배정 없음 | inspiration 기록만 — showed_up +1 |
| 3 | 수 | 3 | ✓ | w1a2 done (full) | |
| 4 | 목 | — | ✗ | — | 로그 없음(gap 1) — 정상, 반응 없음 |
| 5 | 금 | 4 | ✓ | w1a3 done (full) | 1주차 3/3 · Mo 상승 |
| 6 | 토 | 3 | ✓ | — | |
| 7 | 일 | — | ✗ | — | 주간 리뷰: 3/3 → 2주차 크기 유지(+20% 상한) |
| 8 | 10-12 월 | 3 | ✓ | w2a1 done (full) | |
| **9** | 화 | **2** | ✓ | 배정 없음 | **딥 시작**: 클라이언트 거절 메일, `did` 한 줄, inspiration 공란 |
| 10 | 수 | 2 | ✓ | w2a2 **Not today** → 목으로 이동 | LOW_ENERGY 카드(rest_first) → REST 템플릿, consec_rest 1 |
| 11 | 목 | 2 | ✓ | w2a2(moved) **Not today** → 토(금은 점유) | consec_rest 2 → R = 2(consec)+1(cond_mean3=2) = **3 amber** → "Shrink to 2?" 사용자 keep · 이후 제공은 micro만 |
| 12 | 금 | 3 | ✓ | w2a3 **micro** done (메시지 1통, 10분) | 회복 시작: consec_rest 0, SE +0.05 |
| 13 | 토 | 3 | ✓ | w2a2 micro done | 2주차 3/3 (micro 2) · "3/3 done · 2 moved→done" |
| 14 | 10-18 일 | 4 | ✓ | `did`: "20-min call with a UX writer" → 증거 항목 생성 | 주간 리뷰 + **GATE_PASS M1** → validated-for-now · 제약 = CAP_physical(최근 가중) · R **green** |

데이터셋 용도: (a) 점수 함수 단위 테스트 (b) 피치용 Progress 화면 스크린샷 (c) 데모 흐름에는 필수 아님 — 데모는 "이번 주" 1주만 쓴다.

### 9.3 피치 전용 로드맵 (오늘 구현 안 함)

센서·수면·HRV prior, chronotype 앵커, push(D1/D2/D4), Not-today 이유 1탭, 주간 LLM 재계획, 제약 카드, 증거 선반·JR 점수, 에스컬레이션 UI, B2B 집계 대시보드.

---

## 10. 피치용 3줄 (EN)

1. *Second Draft turns a five-minute story into three career paths and three actions a week, using a constraint-first coaching framework (TheGoal) — we coach one bottleneck at a time, not a to-do list.*
2. *Every daily decision is grounded in behavioral science: implementation intentions and tiny-habit sizing make each step doable, and the rest-day logic is built on the evidence that one missed day does not break a habit — shame does.*
3. *Logs become evidence, evidence passes milestone gates, and gates become a job-readiness score — so the same loop that keeps a freelancer going is the loop that gets them hired.*

---

### 부록 — 참고문헌 (저자+연도, 확인 표시 포함)
Amabile & Kramer 2011 · Bandura 1977, 1997 · Behavioural Insights Team 2014 (EAST) · Breines & Chen 2012 · Buehler, Griffin & Ross 1994 · Cochran & Tesser 1996 (확인 필요) · Dai, Milkman & Riis 2014 · Deci & Ryan 2000 · DeFillippi & Arthur 1994 · Duckworth, Grant, Loew, Oettingen & Gollwitzer 2011 · Fogg 2009, 2019 · Goldratt 1984 · Gollwitzer 1999 · Gollwitzer & Sheeran 2006 · Hull 1932 · Iyengar & Lepper 2000 · Kahneman & Tversky 1979 · Kanfer, Wanberg & Kantrowitz 2001 · Kivetz, Urminsky & Zheng 2006 · Lally, van Jaarsveld, Potts & Wardle 2010 · Markus & Nurius 1986 · Marlatt & Gordon 1985 · Michie, van Stralen & West 2011 · Nahum-Shani et al. 2018 · Neff 2003 · Nunes & Drèze 2006 · Oettingen 2014 · Paul & Moser 2009 · Phillips et al. 2017 (확인 필요) · Prochaska & DiClemente 1983 · Roenneberg et al. 2003 · Savickas 1997, 2005 · Savickas & Porfeli 2012 · Shaffer & Ginsberg 2017 · Snyder 2002 · Thaler & Sunstein 2008 · Thayer & Lane 2009 · Van Hooft, Wanberg & van Hoye 2013 · Wanberg 2012 · Wanberg, Zhu & van Hooft 2010 (확인 필요).
