# Dream Achieve Moments Brain — 연결 가이드 (CONNECT)

> 제품명 Dream Achieve Moments, 코드명 Second Draft.

> 브레인 서버 하나가 두 얼굴을 가진다: **MCP** (`/mcp`, Streamable HTTP) 와 **REST** (`/v1/*`).
> 로컬은 `http://127.0.0.1:8787`, 공개 URL 은 cloudflared quick tunnel 로 연다.
> 데모 데이터는 전부 합성(`"_label": "synthetic"`, "Sample persona — synthetic") 이다.

## 지금 공개 URL

```
https://stayed-stock-advancement-taxi.trycloudflare.com
```

- **quick tunnel URL 은 cloudflared 를 재시작할 때마다 바뀐다.** 바뀌면 이 파일의 URL 과 웹의 `VITE_BRAIN_URL` 을 갱신하고 팀에 다시 공유해야 한다.
- 현재 URL 확인: `bash brain/scripts/status.sh` (cloudflared 로그 `context/tunnel/cloudflared.log` 에서 마지막 `*.trycloudflare.com` 을 읽어 보여 준다).
- 서버가 죽어 있으면: `bash brain/scripts/start.sh` (pid 는 `brain/.brain.pid`, 로그는 `brain/brain.log`).

### 검증 결과 (2026-10-24, 공개 URL 로 curl)

| 단계 | 요청 | 결과 |
|---|---|---|
| health | `GET /v1/health` | 200, tools 7개 |
| CORS preflight | `OPTIONS /mcp` (Origin: `https://kpk2-demo.vercel.app`) | 204, `access-control-allow-origin: https://kpk2-demo.vercel.app` + allow-methods/headers |
| think | `POST /v1/think` (dana-14d.json 28KB) | 200, `intervention` + `explain` 포함 |
| MCP initialize | `POST /mcp` JSON-RPC | 200, `serverInfo.name = dream-achieve-moments-brain` |
| MCP tools/list | `POST /mcp` JSON-RPC | 200, think · rank_roles · plan_week · check_in · analyze_state · explain · get_scenario |
| SDK 클라이언트 | `StreamableHTTPClientTransport` → listTools → callTool(think) | initialize 189ms · tools/list 115ms · think 233ms |

지연시간(터널 경유, 5회 측정): health 63–219ms · think 75–118ms · MCP tools/list 89–99ms. 로컬 직결은 ~1ms.

---

## ① 웹 (Vite 앱)

### 환경 변수

```bash
# web/.env.local (또는 Vercel 프로젝트 환경 변수)
VITE_BRAIN_URL=https://stayed-stock-advancement-taxi.trycloudflare.com
```

### 예시 fetch 코드

```ts
// src/api/brain.ts — REST call to the brain. No network inside the brain itself;
// the web app just sends the current state and receives a judgment.
const BRAIN_URL = import.meta.env.VITE_BRAIN_URL ?? 'http://127.0.0.1:8787';

interface ThinkInput {
  fields?: { career?: string; now?: string; pull?: string };
  lifelog?: unknown[];
  checkins?: { actionId: string; kind: 'done' | 'not_today'; day: string }[];
  week?: Record<string, unknown>;
  condition?: number; // 1-5, user input
  today?: string;     // demo day, never the real clock
}

export async function think(input: ThinkInput): Promise<Record<string, unknown>> {
  const res = await fetch(`${BRAIN_URL}/v1/think`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input)
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body?.error?.message ?? `brain ${res.status}`);
  }
  return res.json(); // { person, state, goal, constraint, monitor, intervention, explain, trace, trace_layers, labels, context }
}

export async function health(): Promise<boolean> {
  const res = await fetch(`${BRAIN_URL}/v1/health`);
  return res.ok;
}
```

### REST 경로

| 경로 | 메서드 | 설명 |
|---|---|---|
| `/v1/health` | GET | `{ ok, name, version, tools, uptimeSec }` |
| `/v1/scenario` | GET | 합성 시나리오 JSON (`brain/data/dana-14d.json`) |
| `/v1/think` | POST | 브레인 한 바퀴 (person → state → goal → constraint → intervention → explain) |
| | | **[Why?] 패널용**: 응답에 `trace_layers`(L1–L4 13단계, `{ layer, stage, label, status: 'ran'\|'designed', input_summary, output_summary, ms }` — `/v1/interview` 등 compat trace와 같은 모양, `designed`는 `ms: null`)와 |
| | | `labels`(`fields`: `state.selfEfficacy` → "Confidence" 등 내부 필드 표시 이름, `values`: `shrink` → "Smaller step", `opportunity-time` → "Time", `M1` → "Fit check" 등 enum 표시 이름)가 함께 온다. |
| | | 둘 다 `think()` 출력 그대로이며(MCP `think` 도구도 동일), 모든 문장은 금지어 lint를 통과한다. 라벨 전체는 `brain/labels.js`. |
| `/v1/rank-roles` | POST | 역할 랭킹 |
| `/v1/plan-week` | POST | 이번 주 3개 액션 |
| `/v1/check-in` | POST | done / not_today 처리 |
| `/v1/analyze-state` | POST | 상태 추정 |
| `/v1/explain` | POST | 근거·규칙 설명 |

### curl 로 바로 확인

```bash
BRAIN=https://stayed-stock-advancement-taxi.trycloudflare.com

curl -s "$BRAIN/v1/health"

curl -s -i -X OPTIONS "$BRAIN/mcp" \
  -H 'Origin: https://kpk2-demo.vercel.app' \
  -H 'Access-Control-Request-Method: POST' | grep -i access-control

curl -s -X POST "$BRAIN/v1/think" \
  -H 'Content-Type: application/json' \
  --data-binary @brain/data/dana-14d.json | head -c 600
```

- CORS: 기본은 모든 Origin 허용(`BRAIN_CORS_ORIGINS` 미설정 = `*`). 제한하려면 서버 쪽에서 `BRAIN_CORS_ORIGINS=https://kpk2-demo.vercel.app` 로 띄운다.
- 요청 본문 상한 64KB, IP 당 120 req/min. 에러 본문은 `{ error: { code, message } }`.

---

## ② Claude Code / Claude Desktop 연결 (원격 MCP)

### Claude Code

```bash
claude mcp add --transport http dam-brain https://stayed-stock-advancement-taxi.trycloudflare.com/mcp

# 확인
claude mcp list
claude mcp get dam-brain
```

연결되면 Claude Code 안에서 `think`, `rank_roles`, `plan_week`, `check_in`, `analyze_state`, `explain`, `get_scenario` 도구와 `brain://scenario/dana` 리소스를 쓸 수 있다.

### Claude Desktop

설정 → Connectors → "Add custom connector" 에 아래 URL 을 넣는다 (인증 없음).

```
https://stayed-stock-advancement-taxi.trycloudflare.com/mcp
```

JSON 설정 파일(`claude_desktop_config.json`)로 넣어야 할 때는 stdio 브리지를 거친다 (Desktop 의 JSON 설정은 stdio 서버만 받는다):

```json
{
  "mcpServers": {
    "dam-brain": {
      "command": "npx",
      "args": [
        "-y",
        "mcp-remote",
        "https://stayed-stock-advancement-taxi.trycloudflare.com/mcp"
      ]
    }
  }
}
```

### 수동 JSON-RPC 확인 (curl)

```bash
BRAIN=https://stayed-stock-advancement-taxi.trycloudflare.com

curl -s -X POST "$BRAIN/mcp" \
  -H 'Accept: application/json, text/event-stream' \
  -H 'Content-Type: application/json' \
  -H 'MCP-Protocol-Version: 2025-06-18' \
  -d '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2025-06-18","capabilities":{},"clientInfo":{"name":"curl","version":"0.0.1"}}}'

curl -s -X POST "$BRAIN/mcp" \
  -H 'Accept: application/json, text/event-stream' \
  -H 'Content-Type: application/json' \
  -H 'MCP-Protocol-Version: 2025-06-18' \
  -d '{"jsonrpc":"2.0","id":2,"method":"tools/list","params":{}}'
```

서버는 stateless 라 세션 ID 가 없다. `GET /mcp` 는 405 (SSE 스트림 없음) — 정상이다.

### SDK 클라이언트로 확인 (Node 22, brain/ 에서)

```bash
cd brain && node -e '
import("@modelcontextprotocol/sdk/client/index.js").then(async ({ Client }) => {
  const { StreamableHTTPClientTransport } = await import("@modelcontextprotocol/sdk/client/streamableHttp.js");
  const { readFileSync } = await import("node:fs");
  const client = new Client({ name: "verifier", version: "0.0.1" });
  await client.connect(new StreamableHTTPClientTransport(
    new URL("https://stayed-stock-advancement-taxi.trycloudflare.com/mcp")));
  console.log(client.getServerVersion());
  const { tools } = await client.listTools();
  console.log(tools.map(t => t.name));
  const scenario = JSON.parse(readFileSync("data/dana-14d.json", "utf8"));
  const res = await client.callTool({ name: "think", arguments: scenario });
  console.log(Object.keys(res.structuredContent));
  await client.close();
});'
```

### 토큰을 켠 경우

서버를 `BRAIN_TOKEN=<secret>` 으로 띄웠다면 `/mcp` 와 `/v1/*` (health 제외) 에 `Authorization: Bearer <secret>` 이 필요하다.
Claude Code: `claude mcp add --transport http dam-brain <url>/mcp --header "Authorization: Bearer <secret>"`.
토큰 값은 파일에 적지 않는다.

---

## ③ 로컬 stdio (터널 없이)

```bash
cd brain
node mcp/bin.js --stdio
```

stdout 이 프로토콜 채널이므로 상태 메시지는 stderr 로만 나온다 (`dream-achieve-moments-brain 0.1.0 ready on stdio`).

### Claude Code

```bash
claude mcp add dam-brain -- node /ABSOLUTE/PATH/KPK2/brain/mcp/bin.js --stdio
```

### Claude Desktop (`claude_desktop_config.json`)

```json
{
  "mcpServers": {
    "dam-brain": {
      "command": "node",
      "args": ["/ABSOLUTE/PATH/KPK2/brain/mcp/bin.js", "--stdio"]
    }
  }
}
```

### 로컬 HTTP (터널 없이 브라우저/웹에서)

```bash
cd brain && bash scripts/start.sh     # 127.0.0.1:8787, 로그 brain/brain.log
bash scripts/status.sh                # health + 터널 URL
bash scripts/stop.sh
```

환경 변수: `PORT`(8787) · `HOST`(127.0.0.1) · `BRAIN_CORS_ORIGINS`(기본 `*`) · `BRAIN_TOKEN`(선택).

---

## ④ Build 규격 경로(/v1/interview·paths·plan·checkin·voice/token)

Build 의 web↔brain 계약(spec §3.2–3.4, §4)을 같은 서버가 `brain/mcp/compat.js` 로 받는다. 무상태다: 매 호출이 `scenario_id`·`persona`·`lifelog[]`(Build 모양, `date` 대신 `ts`)·`history[]` 를 전부 들고 온다. LLM·시계·네트워크 없이 `app/logic.js` + 브레인 모듈로만 판단하고, 200 응답마다 `trace[]`(L1–L4, `status: ran|designed`)가 붙는다. 오류는 `{ error: { code, message } }` 뿐이다. CORS·64KB 상한·rate limit·토큰은 ①과 같다.

| 경로 | 본문 | 응답 |
|---|---|---|
| `POST /v1/interview` | `{ scenario_id, persona, lifelog[], history[], user_turn }` | `{ reply: { text }, ready_for_paths, trace[] }` — user 턴 3개면 `ready_for_paths: true` |
| `POST /v1/paths` | `{ scenario_id, persona, lifelog[], history[] }` | `{ paths: [p1, p2, p3], trace[] }` — 항상 3개 |
| `POST /v1/plan` | `{ …, path, today }` (`today` 는 `Mon..Sun` 또는 ISO 날짜) | `{ plan: { path_id, north_star, quarter, week: { start, actions[3] }, summary, pending_comeback, milestones }, trace[] }` |
| `POST /v1/checkin` | `{ …, path, plan, today, action_id, kind: done\|not_today }` | `{ plan, message: { text, ten_minute_action }, adjustment, share_card, trace[] }` — done/NextWeek 행동은 409 `not_checkable`, 모르는 id 는 400 `unknown_action` |
| `POST /v1/voice/token` | 아무거나 | 501 `voice_not_enabled` |

- `plan` 의 추가 필드(`short`, `pending_comeback`, `milestones`)는 웹이 **그대로** 되돌려 보내야 한다 (무상태라 서버가 기억하지 않는다). 빼면 `ten_minute_action` 이 행동 제목으로 대체되고 comeback 줄이 사라진다.
- `week.start` 는 요청의 `week_start`/`arc_start`/`persona.arc_start`/ISO `today` 중 있는 것의 그 주 월요일, 하나도 없으면 `2026-10-20`.
- `share_card` 는 그 주 **첫 Done** 에만 온다(경로명·행동·`1/3 done` 만). Not today 메시지 첫 줄은 항상 `Today was a rest day, not a missed day.`

### curl 로 바로 확인

```bash
BRAIN=https://stayed-stock-advancement-taxi.trycloudflare.com

# interview — first call (user_turn null): greets with the lifelog count + question 1, ready_for_paths false
curl -s -w '\nHTTP %{http_code}\n' -X POST "$BRAIN/v1/interview" \
  -H 'Content-Type: application/json' \
  -d '{"scenario_id":"dana-14d","persona":{"name":"Dana","role":"freelance copywriter"},"lifelog":[{"id":"l01","ts":"2026-10-05T09:00:00-05:00","source":"note","title":"Starting the two-week arc","summary":"Picked the messaging consultant path. Discovery calls give me energy."},{"id":"l02","ts":"2026-10-05T11:00:00-05:00","source":"calendar","title":"Discovery call: meal-kit launch","summary":"45-minute discovery call with a founder. Left with two phrases customers actually use."}],"history":[],"user_turn":null}'

# interview — third user turn (2 in history + user_turn): ready_for_paths true
curl -s -w '\nHTTP %{http_code}\n' -X POST "$BRAIN/v1/interview" \
  -H 'Content-Type: application/json' \
  -d '{"scenario_id":"dana-14d","persona":{"name":"Dana"},"lifelog":[],"history":[{"role":"agent","text":"What changed in your work this year?"},{"role":"user","text":"Three of five retainer clients now draft with AI and send polish-only jobs.","source":"script"},{"role":"agent","text":"When clients kept you on, what were they really keeping you for?"},{"role":"user","text":"They kept me because I could run a discovery call and turn founder talk into a positioning line.","source":"script"}],"user_turn":{"source":"script","text":"The discovery calls and the workshop questions pull me more than writing the drafts."}}'

# paths — exactly 3 (p1..p3) with transfers[{skill, skill_id, evidence: lifelog ids}] and missing[]
curl -s -w '\nHTTP %{http_code}\n' -X POST "$BRAIN/v1/paths" \
  -H 'Content-Type: application/json' \
  -d '{"scenario_id":"dana-14d","persona":{"name":"Dana"},"lifelog":[{"id":"l02","ts":"2026-10-05T11:00:00-05:00","source":"calendar","title":"Discovery call: meal-kit launch","summary":"45-minute discovery call with a founder. Left with two phrases customers actually use."}],"history":[{"role":"user","text":"Three of five retainer clients now draft with AI and send polish-only jobs.","source":"script"},{"role":"user","text":"They kept me because I could run a discovery call and turn founder talk into a positioning line.","source":"script"},{"role":"user","text":"The discovery calls and the workshop questions pull me more than writing the drafts.","source":"script"}]}' | head -c 900; echo

# plan — path p1, today Thu: 3 actions (a1 Tue · a2 Thu · a3 Sat), north_star, quarter, week.start
curl -s -w '\nHTTP %{http_code}\n' -X POST "$BRAIN/v1/plan" \
  -H 'Content-Type: application/json' \
  -d '{"scenario_id":"dana-14d","persona":{"name":"Dana"},"lifelog":[],"history":[],"path":{"id":"p1","role_id":"messaging-consultant","title":"Messaging & Positioning Consultant","one_liner":"Turn discovery calls into positioning clients repeat back.","transfers":[],"missing":[],"first_two_weeks":[]},"today":"Thu"}' | head -c 900; echo

# checkin not_today — a2 (Thu) moves to Fri; message first line "Today was a rest day, not a missed day."
curl -s -w '\nHTTP %{http_code}\n' -X POST "$BRAIN/v1/checkin" \
  -H 'Content-Type: application/json' \
  -d '{"scenario_id":"dana-14d","persona":{"name":"Dana"},"path":{"id":"p1","title":"Messaging & Positioning Consultant"},"plan":{"path_id":"p1","week":{"start":"2026-10-19","actions":[{"id":"a1","title":"Turn one past project into a one-page before/after message story","minutes":30,"day":"Tue","status":"todo","moves":0,"short":"Write the first sentence."},{"id":"a2","title":"Draft a pilot offer email to one former client","minutes":25,"day":"Thu","status":"todo","moves":0,"short":"Write only the subject line of the pilot offer email."},{"id":"a3","title":"Write three lines on what the first two steps taught you","minutes":20,"day":"Sat","status":"todo","moves":0,"short":"Write one line."}]},"summary":"0/3 done","pending_comeback":false},"today":"Thu","action_id":"a2","kind":"not_today"}' | head -c 900; echo

# checkin done — first Done of the week → share_card {headline, body, copy_text}; comeback line after a Not today
curl -s -w '\nHTTP %{http_code}\n' -X POST "$BRAIN/v1/checkin" \
  -H 'Content-Type: application/json' \
  -d '{"scenario_id":"dana-14d","persona":{"name":"Dana"},"path":{"id":"p1","title":"Messaging & Positioning Consultant"},"plan":{"path_id":"p1","week":{"start":"2026-10-19","actions":[{"id":"a1","title":"Turn one past project into a one-page before/after message story","minutes":30,"day":"Tue","status":"todo","moves":0,"short":"Write the first sentence."},{"id":"a2","title":"Draft a pilot offer email to one former client","minutes":25,"day":"Fri","status":"moved","moves":1,"short":"Write only the subject line of the pilot offer email."},{"id":"a3","title":"Write three lines on what the first two steps taught you","minutes":20,"day":"Sat","status":"todo","moves":0,"short":"Write one line."}]},"summary":"0/3 done · 1 moved","pending_comeback":true},"today":"Thu","action_id":"a1","kind":"done"}' | head -c 900; echo

# checkin on an action that is already done → 409 not_checkable
curl -s -w '\nHTTP %{http_code}\n' -X POST "$BRAIN/v1/checkin" \
  -H 'Content-Type: application/json' \
  -d '{"path":{"id":"p1","title":"Messaging & Positioning Consultant"},"plan":{"path_id":"p1","week":{"actions":[{"id":"a1","title":"Done already","minutes":30,"day":"Tue","status":"done","moves":0},{"id":"a2","title":"Still open","minutes":25,"day":"Fri","status":"todo","moves":0}]},"summary":"1/2 done"},"today":"Thu","action_id":"a1","kind":"done"}'

# voice/token → 501 voice_not_enabled
curl -s -w '\nHTTP %{http_code}\n' -X POST "$BRAIN/v1/voice/token" \
  -H 'Content-Type: application/json' -d '{}'
```

### 검증 결과 (2026-10-24, 공개 URL 로 curl, Dana 합성 라이프로그 18건)

| 단계 | 요청 | 결과 |
|---|---|---|
| interview ×4 | `user_turn: null` → script 턴 1 → 2 → 3 | 200 ×4, `ready_for_paths` false → false → false → **true** |
| paths | 18건 lifelog + user 턴 3개 | 200, 정확히 3개 (p1 Messaging & Positioning Consultant 0.83 · p2 Brand Voice & Prompt Systems Designer 0.8 · p3 Copy Educator / Workshop Lead 0.6) |
| plan | p1, `today: "Thu"` | 200, 행동 3개 (a1 Tue 30m · a2 Thu 25m · a3 Sat 20m), `summary "0/3 done"` |
| checkin not_today | a2 (Thu) | 200, `adjustment {from: Thu, to: Fri}`, 첫 줄 `Today was a rest day, not a missed day.`, 4줄, `summary "0/3 done · 1 moved"`, `share_card null` |
| checkin done | a1 (첫 Done) | 200, `share_card` 있음, `summary "1/3 done · 1 moved"`, 메시지에 `Welcome back.` 줄 |
| checkin done 재시도 | 이미 done 인 a1 | **409** `not_checkable` |
| voice/token | `{}` | **501** `voice_not_enabled` |
| CORS preflight | `OPTIONS /v1/checkin` (Origin: `https://kpk2-second-draft.vercel.app`) | 204, `access-control-allow-origin` 에 그 Origin 을 echo + `vary: Origin` + allow-methods/headers (기본 `*` 모드는 정상 Origin 을 그대로 돌려준다) |
| MCP | initialize · tools/list | 200, `serverInfo.name = dream-achieve-moments-brain` · 도구 7개 |

---

## ⑤ 에이전트 계층(Claude 에이전트 + 토큰 계량)

같은 서버가 `ANTHROPIC_API_KEY`(`brain/.env`, gitignored)가 있을 때만 켜는 선택 계층이다(`brain/agent/` + `brain/mcp/agent-routes.js`). `claude-opus-5-5` Tool Runner가 브레인 도구 7개(think·rank_roles·plan_week·check_in·analyze_state·explain·get_scenario)를 호출해 코치 문장을 쓰고 — 사람에 대한 판단은 **도구만** 내린다 — 호출마다 토큰·비용을 `X-Partner-Key`별로 합산한다. 키가 없거나 `BRAIN_AGENT=off`면 `/v1/agent/chat`은 503 `agent_disabled`, `/v1/interview`는 ④의 스크립트 답(`source: 'script'`)이다. CORS·64KB 상한·rate limit·bearer 토큰은 ①과 같다. 기동 로그 끝에 `agent: enabled (model claude-opus-5-5)`가 찍히면 켜진 것이다(키 값은 어디에도 출력되지 않는다).

| 경로 | 본문 / 헤더 | 응답 |
|---|---|---|
| `POST /v1/agent/chat` | `{ user_turn: {source: script\|voice, text} \| string, history?: [{role: agent\|user, text}], lifelog?, persona?, scenario_id?, today? }` · 헤더 `X-Partner-Key: <키>`(없거나 형식 오류면 `demo`) | `{ reply: {text}, ready_for_paths, tool_calls: [{name, ms, ok}], usage: {model, input_tokens, output_tokens, cache_read_input_tokens, cache_creation_input_tokens, cost_usd}, trace[], stop_reason }` |
| `GET /v1/usage` | — | `{ enabled, partners: {<키>: {calls, input_tokens, output_tokens, cache_read_input_tokens, cache_creation_input_tokens, cost_usd, last_at}}, total, pricing: {model, usd_per_mtok} }` — 메모리 장부라 서버 재시작 시 0 |
| `POST /v1/interview` | ④와 같은 Build 규격 | 에이전트가 켜져 있으면 `source: 'agent'` + `usage`·`tool_calls`·에이전트 trace, 에이전트가 던지거나 빈 답이면 `source: 'script'`로 자동 대체(5xx 없음; 사유는 서버 로그 `AGENT_FALLBACK`) |

- 빠진 본문 필드는 서버의 합성 시나리오(`dana-copywriter`, `_label: synthetic`)로 채운다. 도구 입력도 대화의 라이프로그·체크인·주간·오늘로 기본 채워지므로 모델이 라이프로그를 되돌려 보내지 않는다. Build 규격 라이프로그(`ts`)는 ④와 같은 매핑(`date`·source)으로 도구에 들어간다.
- `ready_for_paths`는 코드가 정한다: user 턴(`source: script|voice`) 3개 이상이거나 답에 `[READY_FOR_PATHS]` 표식(본문에서 제거됨). `source`가 그 외(예: `checkin`)인 턴은 이벤트로 넘기고 세지 않는다.
- 모델이 `stop_reason: 'refusal'`로 멈추면 고정 문장으로 답하고 도구를 더 돌리지 않는다. 답은 금지어 lint(`failed · streak · should have · lazy · because you` …)를 통과해야 한다.
- 단가(USD/1M 토큰): input 4 · output 20 · cache read 0.20 · cache write 5(5분). 시스템 프롬프트+도구 정의(≈7.4K 토큰)는 캐시되어 첫 턴만 cache write, 이후 턴은 cache read다. 오류 본문은 ①과 같은 `{ error: { code, message } }`(400 invalid_json/invalid_input · 405 · 503 agent_disabled · 502 agent_error — 상세는 서버 로그에만).

### curl 로 바로 확인

```bash
BRAIN=https://stayed-stock-advancement-taxi.trycloudflare.com

# chat turn 1 — partner demo-vc; reply is 2-4 sentences that end in ONE question
curl -s -w '\nHTTP %{http_code}\n' -X POST "$BRAIN/v1/agent/chat" \
  -H 'Content-Type: application/json' -H 'X-Partner-Key: demo-vc' \
  -d '{"user_turn":{"source":"script","text":"My clients now draft with ChatGPT and only send me polish work at a third of the rate."}}'

# chat turn 2 — same partner; history carries turn 1 (role agent = the coach's line, apostrophes dropped for the shell)
curl -s -w '\nHTTP %{http_code}\n' -X POST "$BRAIN/v1/agent/chat" \
  -H 'Content-Type: application/json' -H 'X-Partner-Key: demo-vc' \
  -d '{"history":[{"role":"user","source":"script","text":"My clients now draft with ChatGPT and only send me polish work at a third of the rate."},{"role":"agent","text":"Polish jobs at a third of the rate is a real change, and it makes sense that it is on your mind. Before we get to what is next, I would like to start with what has worked for you. In seven years of copywriting, which moments gave you the most energy?"}],"user_turn":{"source":"script","text":"The discovery calls. Sitting with a founder for 45 minutes and finding the two phrases their customers actually use, then watching that line show up on their homepage."}}'

# usage — per partner + total + pricing (free: no model call)
curl -s -w '\nHTTP %{http_code}\n' "$BRAIN/v1/usage"

# interview (Build shape, user_turn null) — source agent + one question; no partner key → ledger row "demo"
curl -s -w '\nHTTP %{http_code}\n' -X POST "$BRAIN/v1/interview" \
  -H 'Content-Type: application/json' \
  -d '{"scenario_id":"dana-14d","persona":{"name":"Dana","role":"freelance copywriter"},"lifelog":[{"id":"l01","ts":"2026-10-05T09:00:00-05:00","source":"note","title":"Starting the two-week arc","summary":"Picked the messaging consultant path. Discovery calls give me energy."},{"id":"l02","ts":"2026-10-05T11:00:00-05:00","source":"calendar","title":"Discovery call: meal-kit launch","summary":"45-minute discovery call with a founder. Left with two phrases customers actually use."}],"history":[],"user_turn":null}'

# agent off (no key, or BRAIN_AGENT=off at start) → 503 agent_disabled; /v1/interview then answers from the script
curl -s -w '\nHTTP %{http_code}\n' -X POST "$BRAIN/v1/agent/chat" \
  -H 'Content-Type: application/json' -d '{"user_turn":"hi"}'
```

### 검증 결과 (2026-10-24, 공개 URL 로 curl, 실호출 3회 ≈ $0.07)

| 단계 | 요청 | 결과 |
|---|---|---|
| chat 1 | `X-Partner-Key: demo-vc`, user_turn 1개 | 200 · 3.7s · 3문장 + 질문 1개(`…which moments gave you the most energy?`) · `tool_calls []` · `stop_reason end_turn` · usage 2552 in / 136 out / cache write 7397 · `cost_usd 0.049913` |
| chat 2 | history 2개(user + agent) + user_turn | 200 · 2.6s · 질문 1개(`…what pulls at you now, even if it's only a hunch?`) · usage 2682 in / 129 out / **cache read 7397** · `cost_usd 0.014787` |
| usage | `GET /v1/usage` | 200 · `partners.demo-vc.calls 2` · `cost_usd 0.0647` |
| interview | Build 규격, `user_turn: null`, 파트너 키 없음 | 200 · 2.8s · `source: 'agent'` · 질문 1개 · `ready_for_paths false` · usage 812 in / 151 out / cache read 7397 · `cost_usd 0.007747` · trace: L3 `Agent turn` → L3 `model turn 1: end_turn` → L1 scrub(designed) → L2 graph(designed) |
| lint | 답 3개를 `brain/messages.js` `lint()`로 | 금지어 0 · `because you` 0 |

`GET /v1/usage` 응답 예(위 호출 직후, 숫자는 실측):

```json
{
  "enabled": true,
  "partners": {
    "demo-vc": {
      "calls": 2,
      "input_tokens": 5234,
      "output_tokens": 265,
      "cache_read_input_tokens": 7397,
      "cache_creation_input_tokens": 7397,
      "cost_usd": 0.0647,
      "last_at": "2026-10-24T05:44:15.452Z"
    },
    "demo": {
      "calls": 1,
      "input_tokens": 812,
      "output_tokens": 151,
      "cache_read_input_tokens": 7397,
      "cache_creation_input_tokens": 0,
      "cost_usd": 0.007747,
      "last_at": "2026-10-24T05:44:41.724Z"
    }
  },
  "total": {
    "calls": 3,
    "input_tokens": 6046,
    "output_tokens": 416,
    "cache_read_input_tokens": 14794,
    "cache_creation_input_tokens": 7397,
    "cost_usd": 0.072447,
    "last_at": "2026-10-24T05:44:41.724Z"
  },
  "pricing": {
    "model": "claude-opus-5-5",
    "usd_per_mtok": { "input": 4, "output": 20, "cache_read": 0.2, "cache_write": 5 }
  }
}
```

---

## ⑥ Brain Explorer(브라우저) · job_readiness

같은 서버가 정적 페이지 하나를 함께 낸다(`brain/mcp/public/explorer.html`, 자체 포함·CDN 없음, 토큰 불필요). 시나리오를 고르고 think·check_in·usage 를 눌러 보며 뇌의 판단과 trace 를 읽는 용도다.

```
https://stayed-stock-advancement-taxi.trycloudflare.com/explorer
```

(`/` 와 `/public/explorer.html` 도 같은 페이지. GET/HEAD 만 받고 `brain/mcp/public/` 밖은 404.)

도구 8번째 `job_readiness`(REST `POST /v1/job-readiness`)는 think 와 같은 입력을 받아 증거 선반(done 체크인만)과 Job-readiness 점수(0–100, 설계 prior)·단계·다음 게이트가 아직 필요한 것을 돌려준다. `GET /v1/scenario?id=maya` 는 21일 합성 시나리오(꿈 경로)다.

### curl 로 바로 확인

```bash
BRAIN=https://stayed-stock-advancement-taxi.trycloudflare.com

# explorer page → 200 text/html
curl -s -o /dev/null -w 'HTTP %{http_code} %{content_type}\n' "$BRAIN/explorer"

# health → tools 8 (… explain, job_readiness, get_scenario)
curl -s "$BRAIN/v1/health"

# job-readiness on the Dana scenario → { readiness: { score, level, next_gate, … }, ledger: { count 6 … }, goal }
curl -s "$BRAIN/v1/scenario" | curl -s -X POST "$BRAIN/v1/job-readiness" -H 'content-type: application/json' -d @- \
  | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{const j=JSON.parse(s);console.log(j.readiness.score,j.readiness.level,j.readiness.next_gate.id,j.ledger.count)})'

# maya scenario (21 days) → id maya-copywriter-bakery; unknown id → 400 invalid_input
curl -s "$BRAIN/v1/scenario?id=maya" | head -c 200; echo
curl -s -w '\nHTTP %{http_code}\n' "$BRAIN/v1/scenario?id=nope"
```

---

## 터널 재시작 시

```bash
cloudflared tunnel --url http://localhost:8787 --no-autoupdate 2>&1 | tee context/tunnel/cloudflared.log
```

새 `https://<random>.trycloudflare.com` 이 찍히면:

1. 이 파일의 URL 여섯 곳(상단, ①, ②, ④, ⑤, ⑥)을 바꾼다.
2. 웹 `VITE_BRAIN_URL` 을 바꾸고 재배포한다.
3. Claude Code 는 `claude mcp remove dam-brain` 후 다시 `add` 한다.
4. 팀 채널에 새 URL 을 공유한다.
