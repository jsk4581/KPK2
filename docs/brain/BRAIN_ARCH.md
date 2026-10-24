# 뇌 코어 아키텍처 v2 — Build의 logic.js 위에 얹는 Decision Brain (2026-10-24 13:00, PM · 로컬 초안)

> v1 대체. 12:55 Build가 `app/logic.js`에 기본 판단 함수(요약·스킬 겹침·순위·주간 계획·체크인·컨디션 축소·진척 신호·trace)와 테스트 141개, `docs/logic-contract.md`를 올렸다. **그 파일은 건드리지 않는다.** 우리는 그 위에 "뇌"를 얹는다.

## 0. 나눔

| 층 | 누가 | 무엇 | 파일 |
|---|---|---|---|
| 기본 판단 (이미 있음) | Build | 라이프로그 요약·필터, 스킬 겹침·순위, buildWeek, applyCheckin(spec 3.4), sizeForCondition, progressSignals(단순 규칙), withTrace | `app/logic.js` (읽기 전용으로 import) |
| **Decision Brain (우리)** | PM + 에이전트 | 사람 모델·상태 추정, 목표 명확화(TheGoal), 근본 제약 판별, 계획 대비 실제 모니터링, 개입 정책, 주간 리뷰, 설명 | **`brain/`** (레포 최상위 신규 폴더 — app·web과 겹치지 않음) |
| LLM 경로 문장 | PM | `/api/paths` 프롬프트·검증·폴백 (화면은 이미 `fetchPaths` 자리만 있음) | `brain/llm/` + Build와 합의한 함수 위치 |
| 임베딩 증명 | PM | MCP 서버 — `app/logic.js` + `brain/`을 도구로 노출 | `brain/mcp/server.js` |

화면은 Build가 원할 때 `brain/`의 함수를 골라 쓴다. 강제하지 않는다 → 제안은 HANDOFF 「제안」으로만.

## 1. Decision Brain 모듈

```
brain/
  person.js      사람 모델     buildPersonModel(fields, lifelog, rankedRoles)
                               → { traits: {careerCapital, archetype, stageOfChange}, evidence[] }
  state.js       상태 추정     estimateState(lifelog, checkins, today)
                               → { energy(1–5), momentum(EWMA 0–1), selfEfficacy(0–1),
                                   capacityMin, dataGapDays, risk:{points, level, reasons[]} }
  goal.js        목표 명확화   goalState(person, chosenPath, checkins) → 'ambiguous'|'provisional'|'validated'
                 (TheGoal)     nextQuestion(person, goalState) → 정보이득이 가장 큰 질문 1개
                               milestones(path) → 12주 게이트 4개(Fit·Proof·Market·Ready)
  constraint.js  근본 제약     classifyBlocker(evidence) → COM-B 5종(capability·opportunity-time·
                 (TOC·COM-B)   opportunity-social·motivation-reflective·motivation-automatic)
                               rootConstraint(history) → 최근성 가중 1개만
  monitor.js     계획 대 실제   compareWeek(week, checkins, lifelog) → { onTrack, drift[], plateau }
                               weeklyReview(...) → { resize(±, 증가 ≤20%), replan?, escalate? }
  policy.js      개입 정책     decideIntervention(state, constraint, week, today)
                 (JITAI·EAST)  → { kind: 'full'|'shrink'|'rest'|'reconnect'|'comeback'|'gate',
                                   actionId, minutes, choices[2], messageKey }
  messages.js    문장 정책     render(messageKey, slots) — 인정→재해석→10분 행동, 금지어·인과 단정 0
  explain.js     설명          explain(decision) → 근거 lifelog/checkin id + 규칙 이름 (trace 형식은 logic.js withTrace와 같게)
  index.js       브레인 1회 호출 think({fields, lifelog, enabledSources, rankedRoles, path, week, checkins, condition, today})
                               → { person, state, goal, constraint, intervention, explain[] }
  llm/paths.js   프롬프트·검증 buildPrompt · validate (3개, ≤30분, 금지어 0) · 폴백 선택
  mcp/server.js  stdio MCP     tools: think · rank_roles · plan_week · check_in · analyze_state · explain
```

모두 순수 함수(DOM·네트워크·시계 없음). `today`·`condition`은 입력으로 받는다. 숫자 공식은 `ALGORITHM_DESIGN.md` §4.3, 개입 규칙은 §4.4–§4.6, 메시지는 §5, 주간 리뷰는 §6을 따른다.

## 2. think() 한 번의 흐름

```
입력(화면 상태 그대로)
 → logic.summarizeLifelog / extractSkills / rankRoles      (Build 함수 재사용)
 → person.buildPersonModel                                   "이 사람은 누구인가"
 → state.estimateState                                       "지금 어떤 상태인가"
 → goal.goalState · milestones · nextQuestion                "무엇을 원하나, 어디까지 왔나"
 → constraint.rootConstraint                                 "지금 막는 것 하나"
 → monitor.compareWeek                                       "계획대로 가나"
 → policy.decideIntervention                                 "오늘 무엇을, 얼마나"
 → messages.render · explain.explain                         "어떻게 말하고, 왜 그런가"
출력: Brain 리포트 1개 (Progress 탭·[Why?]·MCP think 도구가 같은 것을 받는다)
```

## 3. Build 함수와의 관계 (덮어쓰지 않고 위에 얹기)

| Build `logic.js` | Brain이 더하는 것 |
|---|---|
| `progressSignals` — 규칙 점수(Done 2·Not today 1·로그 일수) | `estimateState` — EWMA 모멘텀·자기효능·컨디션 추세·데이터 공백 → 위험 점수표와 **이유 목록** |
| `sizeForCondition` — 컨디션으로 10분판 | `decideIntervention` — 상태 + 근본 제약 + 위험으로 full/shrink/rest/reconnect/comeback 결정, 선택지 2개 |
| `applyCheckin` — 이동·NextWeek·공유카드 | `monitor.compareWeek` — 같은 행동 반복 이동·정체·드리프트 감지 → 주간 재계획 제안 |
| `rankRoles` — 겹침 비율 | `goal.milestones` · `nextQuestion` — 고른 경로를 12주 게이트로, 다음 질문 1개 |
| `withTrace` | `explain` — 근거 ID + 규칙 이름 (같은 trace 형식) |

## 4. 데이터 (Build 형식 재사용)

- 라이프로그 항목·체크인 기록은 `docs/logic-contract.md`의 모양 그대로 받는다 (`{id, date, source, title, ...}`, `{actionId, kind, day}`).
- Brain에 필요한 추가 필드(선택): 항목 `condition`(1–5, 자기보고), `blocker_reason`(Not today 이유 칩: time·energy·skill·people·mood). 없으면 추정하지 않고 `unknown`.
- 데모 14일 합성 시나리오: Dana — day 1–8 정상, 9–11 컨디션 2·Not today 2회(위험 amber), 12 10분 행동으로 복귀(comeback), 14 Fit 게이트 통과(green). `[SIMULATION]`, `_label: synthetic`.

## 5. 테스트 (먼저 — `brain/tests/*.test.mjs`, node --test)

1. estimateState: Dana day 11 = amber + 이유 [consec_rest, low_condition], day 14 = green
2. dataGapDays: 로그 공백 3일 → +1점, 이유 'data_gap'
3. rootConstraint: Not today 이유 time×2·energy×1 → opportunity-time
4. decideIntervention: condition ≤2 → 'shrink'(≤10분, 선택지 2) · 공백 ≥4일 → 'reconnect' · rest 다음 done → 'comeback'
5. compareWeek: 같은 행동 2회 이동 → drift 'repeated_move' → 재계획 질문 1개
6. goalState: 경로 미선택 ambiguous → 선택 provisional → Fit 게이트 통과 validated
7. messages.render: 모든 키 금지어 0 · 'because you' 0 · 첫 줄 규칙
8. think(): 같은 입력 → 같은 출력(결정론) · explain 근거 ID가 입력에 실제로 있음
9. llm/paths.validate: 깨진 응답 → fallback
10. mcp/server: 도구 목록 6개, think 결과가 index.think와 같음

## 6. 순서 (13:00 → freeze 14:00)

| 시각 | 무엇 |
|---|---|
| 13:00–13:10 | 시나리오 Dana 14일(Brain 필드 포함) · 테스트 1–10 red |
| 13:10–13:35 | state · constraint · policy · messages · explain → green |
| 13:35–13:50 | goal · monitor · think() · llm/paths 폴백 |
| 13:50–14:00 | mcp/server (도구 6) · Build에 「제안」 1줄: "Progress 탭에서 brain.think() 결과를 쓸 수 있음" |

## 7. 확인

1. 최상위 `brain/` 폴더를 PM 소유로 BOARD 「파일 소유」에 적는다 (app·web은 Build).
2. `/api/paths` 서버 함수는 Build 화면이 부르는 위치(Root `web` → `web/api/`)가 Build 영역이다 → **프롬프트·검증 함수만 `brain/llm/paths.js`로 제공**하고, 서버 파일 위치·작성은 Build와 합의.
3. Brain 결과를 화면에 쓸지는 Build가 정한다. 안 쓰면 MCP 시연과 피치 아키텍처로 증명한다.
