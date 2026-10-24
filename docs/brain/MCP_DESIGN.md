# MCP 설계안 v1 — Second Brain Decision MCP (2026-10-24, 로컬 초안)

> PRD v1 문장 5("생체·센서 데이터 수집 … 하지 않는다")에 따라 **오늘 빌드 범위가 아니다.**
> 용도: 피치 로드맵(확장 단계) 근거 + 행사 뒤 구현 출발점. 오늘 쓰려면 PM이 「결정」에 범위 변경을 남겨야 한다.

## 1. 한 줄 정의

라이프로깅 데이터를 받아 **상태 정의 → 선택지 3개 → 이번 주 행동 3개 → 체크인 → 습관 가이드**로 돌리는 의사결정 엔진을 MCP 서버로 노출한다.
Second Draft의 코어 루프(입력 → 경로 3 → 행동 3 → Done/Not today)를 "커리어 1회 설계"에서 "매일 데이터로 도는 루프"로 넓힌 것이다.

| Second Draft (오늘) | Brain MCP (확장) |
|---|---|
| 텍스트 3칸 | 라이프로그 이벤트 스트림 (텍스트 + 캘린더 + 수면·활동 + 화면시간) |
| LLM 1회 → 경로 3개 | `analyze_state` → `propose_options` (선택지 3개) |
| 이번 주 행동 3개 | `commit_plan` (12주 아크 → 주 3개 → 오늘 1개) |
| Done / Not today | `check_in` + `monitor` (이탈 감지) |
| Rest day 톤 | `guide` 톤 규칙 (인정 → 재해석 → 10분 행동, 이동만·삭제 없음) |

## 2. 설계 원칙 4개

1. **서버 = 데이터 + 규칙, 추론 = 호스트 LLM.** 서버 도구는 결정적(deterministic)이고 테스트 가능하게 둔다. 자연어 추론(경로 설명·재해석 문장)은 호스트(Claude)가 하거나 MCP sampling으로 요청한다. → 모델 교체·비용 통제·TDD가 쉽다.
2. **로컬 우선 + 출처별 동의.** 원본 라이프로그는 사용자 기기의 SQLite에만. 소스마다 `consent_scope`를 두고, 호스트로 나가는 것은 필터를 거친 요약뿐이다 (= 로드맵의 "MCP 필터").
3. **결정은 항상 3개 + 근거.** 단일 정답을 내리지 않는다. 각 선택지에 `transfers`(이어지는 것) · `missing`(비는 것) · `first_step`(첫 행동)을 붙인다 — Second Draft 카드 구조 그대로.
4. **야단치지 않는다.** 실패 상태가 없다. 행동 상태는 `todo | done | moved`뿐, 삭제·빨간색·연속 기록(streak) 압박 없음.

## 3. 아키텍처

```
[소스 어댑터]                [Brain MCP 서버 (로컬)]                         [호스트]
 텍스트 저널 ─┐   ┌─ Ingest ── Filter/Redact ── Event Store(SQLite, append-only)
 캘린더 ICS  ─┼──▶│                                   │
 수면·걸음   ─┤   │  State Engine (규칙: 수면·부하·기분 → 상태 라벨)
 화면시간    ─┘   │  Decision Engine (선택지 3 스코어링: fit·energy·effort)      ◀──▶ Claude
                  │  Planner (12주 아크 → 주 3 → 오늘 1)                         (Code/Desktop/
                  │  Monitor (이행률·이탈·과부하 감지)                            앱 백엔드)
                  └─ Guide (톤 규칙 + 넛지 문장 템플릿, 필요 시 sampling)
```

계층별 책임:

| 계층 | 입력 | 출력 | LLM |
|---|---|---|---|
| Ingest | 원시 이벤트 | 정규화 `LifeEvent` | 없음 |
| Filter | `LifeEvent` | 동의 범위 내 필드만, PII 제거 | 없음 |
| State | 최근 N일 이벤트 | `DailyState` (energy·focus·load·mood → label) | 없음 (규칙) |
| Decision | 상태 + 목표 + 프로필 | 선택지 3개 + 점수 | 문장만 sampling |
| Planner | 고른 선택지 | `Plan` (아크·주·일) | 문장만 sampling |
| Monitor | 체크인 + 상태 | 이탈 신호 | 없음 |
| Guide | 신호 + 톤 규칙 | 메시지 + 다음 10분 행동 | sampling 또는 템플릿 |

## 4. MCP 표면 (Resources · Tools · Prompts)

### Resources (읽기 전용 컨텍스트)

| URI | 내용 |
|---|---|
| `brain://profile` | 경력·가치·제약 (Second Draft 입력 3칸) |
| `brain://state/today` | 오늘 `DailyState` |
| `brain://timeline/{date}` | 그날 필터된 이벤트 요약 |
| `brain://plan/current` | 현재 아크·이번 주 행동·상태 |
| `brain://habits` | 습관 목록과 최근 4주 이행 |

### Tools

| 도구 | 단계 | 하는 일 | 부작용 |
|---|---|---|---|
| `log_event` | 입력 | 이벤트 1건 기록 (텍스트·수치) | 쓰기 |
| `import_source` | 입력 | 어댑터로 일괄 가져오기 (`ics`·`healthkit_export`·`csv`) | 쓰기 |
| `analyze_state` | 분석 | 기간의 상태 라벨·추세·근거 | 없음 |
| `propose_options` | 의사결정 | 질문 하나에 선택지 3개 + transfers/missing/first_step + 점수 | 없음 |
| `commit_plan` | 계획 | 선택지를 12주 아크·이번 주 3개(≤30분, 요일)로 확정 | 쓰기 |
| `check_in` | 모니터링 | `done` / `not_today` → not_today면 다음 요일로 이동 + 10분 대안 | 쓰기 |
| `weekly_review` | 모니터링 | 이행률·이동 수·상태 추세 → 다음 주 조정안 | 없음 |
| `guide` | 습관 | 현재 신호에 맞는 넛지 1개 (톤 규칙 강제) | 없음 |
| `explain` | 신뢰 | 직전 결정의 근거 이벤트·규칙 ID 반환 | 없음 |

### Prompts (사용자 진입점)

- `brain-dump` — 프로필 3칸 채우기 → `propose_options`
- `morning` — `analyze_state(today)` → 오늘 1개 행동 제안
- `not-today` — `check_in(not_today)` → rest day 메시지
- `weekly-review` — `weekly_review` → `commit_plan` 갱신

## 5. 데이터 모델

```ts
interface LifeEvent {
  id: string;
  ts: string;                 // ISO 8601
  source: 'journal' | 'calendar' | 'sleep' | 'activity' | 'screen' | 'checkin';
  kind: string;               // e.g. 'sleep_hours', 'meeting', 'note'
  value: number | string;
  consentScope: 'local_only' | 'summary_ok';
  label?: 'synthetic';        // required on demo data (safety rule 2)
}

interface DailyState {
  date: string;
  energy: 1 | 2 | 3 | 4 | 5;
  load: 1 | 2 | 3 | 4 | 5;    // calendar density + open tasks
  mood?: 1 | 2 | 3 | 4 | 5;   // self-report only, never inferred
  label: 'recharge' | 'steady' | 'push';
  evidence: string[];         // LifeEvent ids
}

interface Option {
  title: string;
  transfers: string[];
  missing: string[];
  firstStep: string;
  score: { fit: number; energy: number; effort: number };
}

interface PlannedAction {
  id: string;
  text: string;
  minutes: number;            // <= 30
  day: 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun';
  status: 'todo' | 'done' | 'moved';
  movedFrom?: string;
}
```

상태 규칙 예 (State Engine, 결정적):
- 수면 < 6h 2일 연속 **또는** load ≥ 4 → `recharge` (행동을 10분짜리로 축소 제안)
- energy ≥ 4 **그리고** load ≤ 2 → `push` (이번 주 가장 큰 행동을 오늘로)
- 그 외 `steady`

## 6. 대표 흐름 (시퀀스)

1. 아침: 호스트 `morning` → `analyze_state` = `recharge` (수면 5.5h·회의 6개, 근거 이벤트 ID 반환)
2. → `guide` = "오늘은 충전일. 포트폴리오 글 1단락만, 10분."
3. 저녁: `check_in(action_id, not_today)` → 목요일로 이동, "1/3 done · 1 moved"
4. 일요일: `weekly_review` → 이행 1/3·recharge 3일 → 다음 주 행동 2개로 축소 제안 → 사용자 승인 → `commit_plan`

## 7. 안전·윤리

- 의료·진단 표현 금지 (수면·활동은 "에너지 신호"로만, 우울·질병 추정 없음).
- mood는 자기 보고만, 추정하지 않는다.
- 모든 결정에 `explain` 근거 제공 — 블랙박스 넛지 금지.
- 데모·피치 데이터는 전부 합성 (`label: 'synthetic'`, 화면 "Sample persona — synthetic").

## 8. 구현 순서 (행사 뒤)

1. TS MCP SDK, stdio 서버 + SQLite. 도구 3개만: `log_event` · `check_in` · `analyze_state` (규칙 테스트 먼저)
2. `propose_options` · `commit_plan` — 지금 `app/logic.js`·Second Draft 프롬프트 재사용
3. `import_source` 어댑터 (ICS → Apple Health export → CSV)
4. Monitor·Guide + `weekly_review`
5. 원격(HTTP) 전송·멀티 디바이스는 마지막 (로컬 우선 원칙 유지)

## 9. 오늘(해커톤) 쓰는 법

- **빌드하지 않는다** (PRD v1 문장 5, DECISION 기각 C).
- 피치 2장 로드맵 한 줄: "Next: Second Draft becomes an MCP decision engine that runs on your own life data — local-first." — 라벨 `hypothesis`/로드맵.
- G3(13:00) 뒤 Build에 여유가 생기면 §8-1 스텁(stdio, 도구 2개, 합성 데이터)을 시연용으로 검토 가능 — PM이 「결정」에 남긴 뒤에만.
