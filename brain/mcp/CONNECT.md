# Second Draft Brain — 연결 가이드 (CONNECT)

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
| MCP initialize | `POST /mcp` JSON-RPC | 200, `serverInfo.name = second-draft-brain` |
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
  return res.json(); // { person, state, goal, constraint, monitor, intervention, explain, trace, context }
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
claude mcp add --transport http second-draft-brain \
  https://stayed-stock-advancement-taxi.trycloudflare.com/mcp

# 확인
claude mcp list
claude mcp get second-draft-brain
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
    "second-draft-brain": {
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
Claude Code: `claude mcp add --transport http second-draft-brain <url>/mcp --header "Authorization: Bearer <secret>"`.
토큰 값은 파일에 적지 않는다.

---

## ③ 로컬 stdio (터널 없이)

```bash
cd brain
node mcp/bin.js --stdio
```

stdout 이 프로토콜 채널이므로 상태 메시지는 stderr 로만 나온다 (`second-draft-brain 0.1.0 ready on stdio`).

### Claude Code

```bash
claude mcp add second-draft-brain -- node /ABSOLUTE/PATH/KPK2/brain/mcp/bin.js --stdio
```

### Claude Desktop (`claude_desktop_config.json`)

```json
{
  "mcpServers": {
    "second-draft-brain": {
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

## 터널 재시작 시

```bash
cloudflared tunnel --url http://localhost:8787 --no-autoupdate 2>&1 | tee context/tunnel/cloudflared.log
```

새 `https://<random>.trycloudflare.com` 이 찍히면:

1. 이 파일의 URL 세 곳(상단, ①, ②)을 바꾼다.
2. 웹 `VITE_BRAIN_URL` 을 바꾸고 재배포한다.
3. Claude Code 는 `claude mcp remove second-draft-brain` 후 다시 `add` 한다.
4. 팀 채널에 새 URL 을 공유한다.
