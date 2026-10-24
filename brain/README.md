# brain/ — Dream Achieve Moments Decision Brain (판단 코어 + REST + MCP)

> 제품명 **Dream Achieve Moments**, 코드명 Second Draft (파일·폴더 이름은 코드명 그대로).

> 판단은 규칙, 문장만 LLM. 코어 하나(`app/logic.js` + `brain/`)를 웹·REST·MCP가 그대로 공유한다.
> 모든 데모 데이터는 합성(`"_label": "synthetic"`, "Sample persona — synthetic")이다. 실제 사람 데이터는 없다.

## 무엇인가

- Build의 `app/logic.js`(요약·스킬 겹침·순위·주간 계획·체크인·컨디션 축소)를 **읽기 전용으로 import**해 그 위에 "뇌"를 얹는다. 덮어쓰지 않는다.
- 뇌는 사람 모델 → 상태 추정 → 목표 상태 → 근본 제약 → 계획 대 실제 → 오늘의 개입 → 문장 → 설명을 한 번(`think()`)에 낸다.
- 코어는 전부 순수 함수다: DOM·네트워크·시계 없음. `today`·`condition`은 입력으로 받고, 모르는 값은 `unknown`/`null`로 두며 추정하지 않는다.
- LLM은 판단에 관여하지 않는다. 경로 문장(`/api/paths`)은 Build의 `web/api/paths.js`가 맡는다.

## 폴더 구조

```
brain/
  index.js        think · rankRoles · planWeek · checkIn · analyzeState · explain · jobReadiness · loadScenario(id)
  person.js       buildPersonModel — 아키타입·변화 단계·커리어 자본(근거 id·인용 포함)·자기 선언 제약·4C
  state.js        estimateState — 에너지·모멘텀(EWMA)·자기효능·용량(분, 추세 ×0.8)·공백일·위험 점수표
  goal.js         goalState(today 재검사) · goalHistory(버전 이력) · milestones(12주 게이트 4개) · nextQuestion · evaluateGate
  constraint.js   classifyBlocker(COM-B 5종) · rootConstraint(최근성 가중, 1개만)
  monitor.js      compareWeek(drift·plateau) · weeklyReview(resize ↑≤20%·재계획 질문·에스컬레이션 4종)
  policy.js       decideIntervention — full/shrink/rest/reconnect/comeback/gate/none/pause + 선택지 2개
  plan.js         withIfThen — 행동마다 if-then 문장·milestone·evidenceProduced (앵커는 추정하지 않음)
  evidence.js     buildLedger — done 체크인 → 증거 선반 항목(이력서형 bullet, 게이트·artifact 분류)
  jobs.js         readinessScore — Job-readiness 0–100·단계(explore/build-proof/reach-out/apply)·다음 게이트
  messages.js     render(messageKey, slots) — 인정→재해석→10분 행동, 금지어 lint
  explain.js      explain(decision, inputs) — 규칙 이름 + 근거 id (logic.withTrace와 같은 trace 모양)
  mcp/server.js   MCP 도구 8개·리소스 1·프롬프트 1 (코어를 주입받음; index.js를 직접 import하지 않음)
  mcp/http.js     node:http — POST /mcp(Streamable HTTP) + REST /v1/* + Explorer 정적 페이지
  mcp/static.js   GET / · /explorer · /public/* → mcp/public/ (경로 탈출 차단)
  mcp/compat.js   Build 규격 /v1/interview·paths·plan·checkin·voice/token
  mcp/bin.js      진입점: HTTP(기본) 또는 --stdio
  agent/          선택 계층: Claude Tool Runner 코치 + 토큰 장부 (ANTHROPIC_API_KEY 있을 때만)
  data/           dana-14d.json(14일) · maya-21d.json(21일, 꿈 경로) 합성 시나리오 + README
  scripts/        start.sh · stop.sh · status.sh
  tests/          *.test.mjs (node --test)
```

## 함수 계약 (`index.js`) — 입력은 객체 하나, 출력은 JSON

| 함수 | 입력(모두 선택) | 출력 |
|---|---|---|
| `think(input)` | `fields, lifelog, enabledSources, rankedRoles, path, week, checkins, condition, today, skills?, roles?, arcStart?, confirmedGates?, freeText?, goalHistory?, notNow?, constraints?, adaptability4c?, market?` (REST/MCP도 같은 키) | `{ person, state, goal{state, milestones, version, history, notNow, nextQuestion}, constraint, monitor, ledger, readiness, intervention{kind, actionId, minutes, choices, messageKey, message}, explain{rules, evidence, trace, text}, trace, context }` |
| `rankRoles(input)` | `fields, lifelog, enabledSources, userSkillIds?, skills?, roles?` | `{ fields, skillIds, roles(상위 3), enabledSources, trace }` |
| `planWeek(input)` | `path, today, condition?, anchor?` | `{ week, view(컨디션 크기 조정판), today, condition }` — 행동마다 `ifThen`("On Tue, I will …", 앵커는 넘긴 것만)·`milestone`(기본 M1) |
| `jobReadiness(input)` | think 입력과 동일 | `{ readiness{score 0–100, level, components, next_gate, next_level, explain}, ledger{entries, count, byGate, byType}, goal{state, version, milestones}, today, trace }` — 설계 prior, 결과 주장 아님 |
| `checkIn(input)` | `week, actionId, kind('done'\|'not_today'), today, checkins, lifelog, condition?` | Build `applyCheckin` 결과 + `checkins`(기록 추가) + `brain`(새 week로 think 재실행) |
| `analyzeState(input)` | `lifelog, checkins, today?, condition?` | `estimateState` 출력 `{ energy, momentum, selfEfficacy, capacityMin, dataGapDays, risk{points, level, reasons, checks}, features[] … }` |
| `explain(input)` | `decision?` + think 입력 | `{ rules[], evidence[], trace[], text }` — 근거 id는 입력에 실제로 있는 것만 |

Build `app/logic.js`와의 관계 — 덮어쓰지 않고 위에 얹는다:

| Build `logic.js` | Brain이 더하는 것 |
|---|---|
| `progressSignals` 규칙 점수 | `estimateState` EWMA 모멘텀·자기효능·공백일 → 위험 점수표와 **이유 목록** |
| `sizeForCondition` 10분판 | `decideIntervention` 상태 + 근본 제약 + 위험으로 개입 종류와 선택지 2개 |
| `applyCheckin` 이동·NextWeek | `compareWeek` 반복 이동·정체·드리프트 → `weeklyReview` 재계획 질문 1개 |
| `rankRoles` 겹침 비율 | `goal.milestones` 12주 게이트 4개(Fit·Proof·Market·Ready) + `nextQuestion` 1개 |
| `withTrace` | `explain` 같은 trace 모양으로 규칙 이름 + 근거 id |

## REST 경로 (`mcp/http.js`, 기본 `http://127.0.0.1:8787`)

| 메서드·경로 | 무엇 |
|---|---|
| `GET /` · `GET /explorer` · `GET /public/*` | **Brain Explorer** 페이지(`mcp/public/explorer.html`, 자체 포함, CDN 없음) — 토큰 없이 열림, GET/HEAD만 |
| `GET /v1/health` | `{ ok, name, version, tools[8], uptimeSec }` — 토큰 없이 항상 열림 |
| `GET /v1/scenario[?id=dana\|maya]` | 합성 시나리오 JSON (기본 dana 14일, `?id=maya` 21일 꿈 경로; 모르는 id는 400) |
| `POST /v1/think` · `/v1/rank-roles` · `/v1/plan-week` · `/v1/check-in` · `/v1/analyze-state` · `/v1/explain` · `/v1/job-readiness` | 같은 이름의 MCP 도구와 동일한 zod 검증·동일한 코어 호출 |
| `POST /v1/interview` · `/v1/paths` · `/v1/plan` · `/v1/checkin` · `/v1/voice/token` | Build 웹 규격(`mcp/compat.js`, `mcp/CONNECT.md` ④). 첫 Done의 share card 문구는 "Done today: …" |
| `POST /mcp` | MCP Streamable HTTP(JSON 응답, 무상태). `GET /mcp`는 405 |

오류 본문은 항상 `{ error: { code, message } }` (400 invalid_json/invalid_input · 401 · 404 · 405 · 413 · 429 · 500). 스택 트레이스는 내보내지 않는다.

## MCP 도구 8개 (`mcp/server.js`, 서버 이름 `dream-achieve-moments-brain`, title `Dream Achieve Moments Brain`)

| 도구 | 코어 함수 | 한 줄 |
|---|---|---|
| `think` | `think` | 뇌 1회 통과: 사람·상태·목표(버전 이력)·제약·증거 선반·readiness·오늘의 개입·설명 |
| `rank_roles` | `rankRoles` | 3칸 + 라이프로그 → 스킬 → 역할 상위 3 (transfers / missing) |
| `plan_week` | `planWeek` | 경로 초안 → 이번 주 3행동(≤30분, if-then 문장 포함), 컨디션 크기 조정 |
| `check_in` | `checkIn` | done / not_today 적용. Not today는 이동이지 삭제가 아님 |
| `analyze_state` | `analyzeState` | 에너지·모멘텀·자기효능·용량·공백일·위험 점수 |
| `explain` | `explain` | 결정의 근거 id + 규칙 이름 |
| `job_readiness` | `jobReadiness` | 증거 선반(done만) + Job-readiness 0–100·단계·다음 게이트가 아직 필요한 것 |
| `get_scenario` | (파일) | 합성 시나리오 — `{ id: 'dana' }`(기본, 14일) 또는 `{ id: 'maya' }`(21일) |

리소스 `brain://scenario/dana` 1개, 프롬프트 `brain-dump` 1개. 모든 도구는 `readOnlyHint · idempotentHint`.

### 판단 동작 메모 (think)

- **목표 상태 재검사**: `goalState`가 `today`를 받아, 기한이 지난 게이트가 통과되지 않았으면 `validated` → `provisional`로 되돌린다. 게이트는 증거 **그리고** 사용자 confirm(`confirmedGates`)이 둘 다 있어야 통과한다.
- **목표 버전 이력**: 상태가 바뀔 때만 `goal.history`에 `{ at: today, from, to, reason, gateId? }` 한 줄을 덧붙인다(`version` = 길이). 이전 이력은 `goalHistory`로 넘기고, `notNow`는 중복 없이 `goal.notNow`에 쌓인다. 시계는 쓰지 않는다.
- **위기 일시정지(§6.5)**: `freeText`에 위기 표현이 있으면 `intervention.kind = 'pause'`, 선택지 없음, 메시지는 `policy.CRISIS_TEXT` 고정문(988 안내, 진단·판단 문구 없음). 입력 원문은 어디에도 복사되지 않는다.
- **경제 압박 에스컬레이션(§6.5-4)**: 집세·퇴거·"can't pay" 표현이면 코칭은 계속하되 `message.text` 마지막 줄에 실업급여·American Job Center 안내 문장을 덧붙이고(`message.escalation`), 주간 계획은 최대 2단계로 묶는다. 저컨디션 10/14일·red 2주도 같은 방식으로 문장을 덧붙인다.
- **if-then(§3.3)**: `plan_week`의 모든 행동은 `ifThen`("On Thu, I will …")을 갖는다. 앵커는 호출자가 `anchor`로 준 것만 쓴다 — 추정하지 않는다.

## 실행

```bash
cd brain && npm install          # 의존성: @modelcontextprotocol/sdk, @anthropic-ai/sdk, zod (Node >= 22)
npm test                         # = node --test tests/   (2026-10-24 15:10 기준 469 tests: 468 pass / 1 skipped(실호출 스모크) / 0 fail)
bash scripts/start.sh            # HTTP 백그라운드 기동 → /v1/health 출력 (pid: .brain.pid, log: brain.log)
bash scripts/status.sh           # health + 터널 URL(있으면) · 종료는 bash scripts/stop.sh
node mcp/bin.js --stdio          # Claude Desktop / Claude Code 용 stdio MCP
curl -s localhost:8787/v1/scenario | curl -s -X POST localhost:8787/v1/think -H 'content-type: application/json' -d @-
```

환경변수: `PORT`(8787) · `HOST`(127.0.0.1) · `BRAIN_CORS_ORIGINS`(쉼표 목록, 기본 `*`) · `BRAIN_TOKEN`(선택 bearer) · `ANTHROPIC_API_KEY`(선택, `.env`; 에이전트 계층 켬) · `BRAIN_AGENT=off`(에이전트 끄기).
공개 URL(터널)로 Claude에 연결하는 절차는 `mcp/CONNECT.md`를 본다.

## 에이전트 계층 (`agent/`, 선택)

- **무엇**: Claude Opus 5.5(`claude-opus-5-5`) Tool Runner가 브레인 도구 7개(think·rank_roles·plan_week·check_in·analyze_state·explain·get_scenario)를 도구로 호출해 코치 대화를 쓴다. 사람에 대한 판단(위험·에너지·용량·오늘의 행동)은 **도구를 통해서만** 나오고 모델은 문장만 맡는다. 도구 입력은 대화의 라이프로그·체크인·주간으로 기본 채워진다.
- **첫 턴은 think부터**: 시스템 프롬프트가 "세션 첫 턴에 think 도구를 한 번 호출해 상태를 확인한 뒤 답하고, 진척·위험·경로·이번 주 질문에는 해당 도구 호출 뒤에만 답하라"고 지시한다. 금지어 목록은 `messages.js`의 `BANNED_WORDS`를 그대로 가져와 lint와 어긋나지 않는다.
- **도구 결과 압축**: 도구 결과가 12KB를 넘으면 `context`의 fields·rankedRoles·week와 `monitor.review`의 compare·nextWeekSeed를 빼고 넘긴다(판단 필드는 그대로). trace는 항상 뺀다.
- **경로**: `POST /v1/agent/chat`(`{ user_turn, history?, lifelog?, persona?, scenario_id?, today? }` → `{ reply, ready_for_paths, tool_calls, usage, trace, stop_reason }`) · `GET /v1/usage`(파트너별 토큰·비용 합계). `POST /v1/interview`는 에이전트가 켜져 있으면 에이전트 답(`source: 'agent'`), 실패하면 스크립트 답(`source: 'script'`)으로 자동 대체한다.
- **계량**: 요청 헤더 `X-Partner-Key: <키>`(없으면 `demo`)별로 호출 수·input/output/cache 토큰·`cost_usd`를 메모리 장부에 합산한다(재시작 시 초기화). 모든 에이전트 응답의 `usage`에 그 턴의 토큰·비용이 붙는다.
- **단가(USD/1M 토큰)**: input 4 · output 20 · cache read 0.20 · cache write 5(5분 캐시). 시스템 프롬프트+도구 정의(≈7.4K 토큰)는 캐시되어 둘째 턴부터 cache read로 떨어진다(실측: 첫 턴 $0.0499, 둘째 턴 $0.0148).
- **키**: `ANTHROPIC_API_KEY`는 `brain/.env`(gitignored)에만 둔다. `mcp/bin.js`가 기동 시 읽어 `process.env`에만 넣고 어디에도 출력하지 않는다. 키가 없으면 에이전트 없이(`agent: off`) 스크립트 인터뷰로만 동작한다.
- **끄기**: `BRAIN_AGENT=off`로 기동하면 `/v1/agent/chat`은 503 `agent_disabled`, `/v1/interview`는 스크립트로 답한다. 테스트는 네트워크를 쓰지 않는다(실호출 스모크만 `RUN_LIVE=1 node --test tests/agent.test.mjs`).

## 안전

- 합성 데이터만: `data/dana-14d.json`은 `_label: synthetic`, 신원 블록은 `app/data/persona-dana.json` 복사본(테스트가 동일성 검사). 실제 수집·저장 없음.
- `BRAIN_TOKEN`을 주면 `/mcp`·`/v1/*`(health 제외)가 bearer 토큰을 요구한다(timing-safe 비교). 안 주면 공개 — 데모 터널에서는 토큰을 켠다.
- CORS는 `BRAIN_CORS_ORIGINS`로 제한 가능(기본 `*`). rate limit은 IP당 120 req/분(429 + Retry-After). 본문 64KB 제한(413).
- 메시지는 금지어 lint를 통과해야 한다(`failed · streak · should have · lazy · because you` 등). 위기 표현은 988 안내로 에스컬레이션하고 원문을 저장하지 않는다.
- 건너뛴 검사는 `risk.checks[].status: 'skipped'`로 남고 explain에 `…:skipped` 규칙으로 나온다. 통과로 표시하지 않는다.

## 한계와 로드맵

- **실수집 없음**: 라이프로그·체크인은 호출자가 넘긴다. 커넥터·저장소·세션은 이 폴더 밖이다.
- **LLM 문장은 Build의 `/api/paths`(`web/api/paths.js`) 담당** — `BRAIN_ARCH_v2`의 `brain/llm/paths.js`는 만들지 않았다.
- **이력은 `today`까지만 넘긴다**: `estimateState`는 `today` 이후 날짜의 체크인을 걸러내지 않는다(`consecRest`가 목록 끝을 본다). 과거 시점 재생은 호출자가 잘라서 넣는다.
- **readiness 가중치는 설계 prior**(`(확인 필요)` 표기): 20점 × 5요소. 데이터로 검증된 값이 아니며 결과(취업)를 주장하지 않는다.
- 로드맵: `today` 이후 이벤트 필터 → 세션·저장(MCP 쓰기 도구; goal 이력은 지금은 호출자가 되돌려 넘긴다) → 동의 기반 실데이터 커넥터.
