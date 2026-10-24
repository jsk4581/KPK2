# logic-contract: `app/logic.js` 판단 함수 입출력 규격

> 웹 화면(`web/`)과 MCP stdio 래퍼가 같은 `app/logic.js`를 씁니다. 이 문서가 두 쪽의 입출력 기준입니다.
> 모든 함수는 순수 함수입니다: DOM·네트워크·시계를 쓰지 않고, 입력을 바꾸지 않으며, 같은 입력에는 같은 출력을 냅니다. 예외를 던지지 않습니다(잘못된 입력은 빈 값이나 `ok: false`).
> 판단(역할 선택, 겹침 비율, 체크인 결과, 진척 신호)은 이 함수들만 냅니다. LLM과 폴백은 문장만 채웁니다.
> 아래 예시는 모두 합성 데이터이며, 실제로 함수를 돌린 출력입니다.

## 불러오기

```js
// 브라우저(Vite): import * as logic from '@app/logic.js';
// Node(MCP 래퍼):  import * as logic from '../app/logic.js';
```

## 공통 값

| 이름 | 값 |
|---|---|
| `WEEK_DAYS` | `["Mon","Tue","Wed","Thu","Fri","Sat","Sun"]` |
| `NEXT_WEEK` | `"NextWeek"` |
| `ACTION_STATUSES` | `["todo","done","moved"]` |
| `FIELD_KEYS` | `["career","now","pull"]` (경력·잘했던 것 / 지금 상황·고민 / 끌리는 것) |
| `MAX_ACTION_MINUTES` | `30` |
| `SHORT_ACTION_MINUTES` | `10` |
| `SOURCE_FIELD` | 출처 → 미리 채울 칸. `calendar`·`document`·`photo` → `career`, `note`·`sms`·`messenger` → `now`, `saved_link` → `pull` |
| `REST_DAY_LINE` · `REFRAME_LINE` · `COMEBACK_LINE` | Not today 첫 줄, 재해석 한 줄, 복귀 한 줄 (화면 문구, 영어) |
| `PROGRESS_RULES` | 진척 신호 규칙 설명 문자열 (아래 `progressSignals`) |

- 요일(`day`)은 `WEEK_DAYS` 7개와 `NextWeek`뿐입니다. 데모의 '오늘'(`today`)은 페르소나 JSON의 `today`를 넘깁니다. 실제 시계를 쓰지 않습니다.
- 행동 상태(`status`)는 `todo | done | moved`입니다.

## 함수 목록

| 함수 | 입력 | 출력 |
|---|---|---|
| `summarizeLifelog(items, enabledSources)` | 라이프로그 항목 배열, 켜진 출처 배열 | `{career, now, pull}` 문자열 3개 |
| `mergePrefill(current, summary, editedKeys)` | 지금 3칸, 새 요약, 사용자가 고친 칸(배열 또는 Set) | `{career, now, pull}` |
| `extractSkills(fields, items, skills)` | 3칸(객체 또는 문자열), 켜진 항목, 스킬 사전 | 스킬 id 배열(알파벳순, 중복 없음) |
| `skillOverlap(userSkillIds, role)` | 스킬 id 배열, 역할 | `{ratio, transfers[], missing[]}` |
| `rankRoles(userSkillIds, roles)` | 스킬 id 배열, 역할 카탈로그 | 상위 3개 `[{id, title, ratio, transfers, missing}]` |
| `buildWeek(pathDraft, today)` | 경로 초안(행동 3개), 오늘 요일 | 이번 주 상태 `week` |
| `checkableActions(week)` | `week` | 버튼을 보일 행동 배열 |
| `applyCheckin(week, actionId, kind, today)` | `kind: "done" \| "not_today"` | `{ok, reason, week, message, adjustment, shareCard, comeback}` |
| `weekSummary(actions)` | 행동 배열 | `"1/3 done · 1 moved"` 형식 문자열 |
| `sizeForCondition(week, condition)` | `week`, 컨디션 1~5 | 보여 줄 행동 배열 |
| `progressSignals(checkins, lifelog)` | 체크인 기록, 켜진 라이프로그 | `{momentum, momentumScore, dropoutRisk, daysShownUp, evidence[], rules}` |
| `withTrace(name, fn, options?)` | 함수 이름, 함수, 요약 방법 | 감싼 함수: `(...args) => {result, trace}` |
| `summarizeForTrace(value)` | 아무 값 | 240자 이하 요약 문자열 |

기존 골격 함수(`normalizeInput`, `decideNextAction` 등)는 그대로이며 이 문서의 대상이 아닙니다.

---

## `summarizeLifelog(items, enabledSources)`

켜진 출처의 항목만 날짜순(같은 날은 `id`순)으로 보고, 항목마다 칸 하나에 넣습니다. 칸은 항목의 `field`(`career|now|pull`)가 있으면 그것, 없으면 `SOURCE_FIELD`로 정합니다. 각 칸은 최근 항목 4개의 `summary`(없으면 `title`)를 마침표로 끝나는 문장으로 이어 붙입니다. 켜진 항목이 없는 칸은 `""`입니다.

입력:
```json
{
  "items": [
    { "id": "l1", "date": "2026-10-12", "source": "calendar", "title": "Client discovery call", "summary": "Ran a discovery call for a launch.", "tags": ["discovery-call"], "url": null },
    { "id": "l2", "date": "2026-10-13", "source": "note", "title": "Rate cut", "summary": "A client asked for polish only at a lower rate.", "tags": ["pricing"], "url": null },
    { "id": "l3", "date": "2026-10-14", "source": "saved_link", "title": "Article on prompt libraries", "summary": "Saved a piece on how teams write prompts.", "tags": ["prompting"], "url": null },
    { "id": "l4", "date": "2026-10-15", "source": "sms", "title": "Workshop question", "summary": "Someone asked when the next workshop runs.", "tags": ["teaching"], "url": null }
  ],
  "enabledSources": ["note", "saved_link", "calendar"]
}
```
출력 (`sms`는 기본 꺼짐이라 빠짐):
```json
{ "career": "Ran a discovery call for a launch.", "now": "A client asked for polish only at a lower rate.", "pull": "Saved a piece on how teams write prompts." }
```

## `mergePrefill(current, summary, editedKeys)`

토글이 바뀌어 요약을 다시 계산했을 때, 사용자가 직접 고친 칸은 지금 글을 지키고 나머지 칸만 새 요약으로 바꿉니다.

입력: `current = {"career":"My own words.","now":"x","pull":"y"}`, `summary` = 위 출력, `editedKeys = ["career"]`
출력:
```json
{ "career": "My own words.", "now": "A client asked for polish only at a lower rate.", "pull": "Saved a piece on how teams write prompts." }
```

## `extractSkills(fields, items, skills)`

3칸 글과 켜진 항목의 `title`·`summary`·`tags`에서 스킬 사전의 키워드를 찾습니다. 대소문자를 가리지 않고 단어 시작에서만 맞춥니다(`interview`는 `interviews`에 맞고, `ai`는 `maintain`에 맞지 않음). 항목의 태그가 스킬 id와 같아도 그 스킬로 셉니다.

입력: `fields = {"career":"I run a discovery call and write a message map.","now":"","pull":""}`, `items` = 위 `l1`~`l3`, `skills`:
```json
[
  { "id": "discovery-call", "name": "Discovery interviews", "keywords": ["discovery call", "interview"] },
  { "id": "positioning", "name": "Positioning", "keywords": ["positioning", "message map"] },
  { "id": "pricing", "name": "Project pricing", "keywords": ["pricing", "rate card"] },
  { "id": "prompting", "name": "Prompt writing", "keywords": ["prompt"] }
]
```
출력: `["discovery-call", "positioning", "pricing", "prompting"]` (`pricing`은 `l2`의 태그로 들어옴)

## `skillOverlap(userSkillIds, role)`

`ratio = |사용자 스킬 ∩ 필수 스킬| / |필수 스킬|`, 0~1, 소수 둘째 자리 반올림(0.125 → 0.13, 0.625 → 0.63, 1/3 → 0.33). 필수 스킬이 없으면 0. `transfers`(What transfers)와 `missing`(What's missing)은 역할의 `requires` 순서를 따릅니다.

입력: 위 스킬 4개, `role = {"id":"messaging-consultant","title":"Messaging & Positioning Consultant","requires":["discovery-call","positioning","pricing"]}`
출력:
```json
{ "ratio": 1, "transfers": ["discovery-call", "positioning", "pricing"], "missing": [] }
```
다른 예: `skillOverlap(["pricing","discovery-call","teaching"], {requires:["discovery-call","positioning","pricing"]})` → `{"ratio":0.67,"transfers":["discovery-call","pricing"],"missing":["positioning"]}`

## `rankRoles(userSkillIds, roles)`

카탈로그의 역할마다 `skillOverlap`을 계산해 `ratio`가 높은 순으로 3개를 냅니다. 같으면 카탈로그 순서입니다. 역할이 3개보다 적으면 있는 만큼 냅니다.

입력: 위 스킬 4개, 카탈로그 `[messaging-consultant(1.0), voice(prompting·positioning → 1.0), edu(teaching → 0), x(pricing → 1.0)]`
출력:
```json
[
  { "id": "messaging-consultant", "title": "Messaging & Positioning Consultant", "ratio": 1, "transfers": ["discovery-call", "positioning", "pricing"], "missing": [] },
  { "id": "voice", "title": "Brand Voice Designer", "ratio": 1, "transfers": ["prompting", "positioning"], "missing": [] },
  { "id": "x", "title": "Other", "ratio": 1, "transfers": ["pricing"], "missing": [] }
]
```

## `buildWeek(pathDraft, today)`

경로 초안(LLM 응답이나 폴백의 경로 하나)에서 이번 주 상태를 만듭니다. 행동은 `pathDraft.week.actions`(없으면 `pathDraft.actions`)의 앞 3개, id는 `a1`~`a3`, 분은 1~30으로 자릅니다(30 초과는 30). 요일이 7개 요일이 아니면 `today`로 둡니다. 모두 `todo`, `moves: 0`. 경로를 다시 고르면 이 함수를 다시 부르므로 체크인·이동·공유 카드·복귀 표시 상태가 모두 지워집니다.

입력:
```json
{
  "pathDraft": { "role_id": "messaging-consultant", "title": "Messaging & Positioning Consultant",
    "week": { "actions": [
      { "title": "Write a before/after page", "minutes": 25, "day": "Tue", "short": "Write only the headline" },
      { "title": "Draft a pilot offer email", "minutes": 30, "day": "Thu", "short": "Write only the subject line" },
      { "title": "List seven discovery questions", "minutes": 20, "day": "Sat", "short": "Write two questions" } ] } },
  "today": "Thu"
}
```
출력 (`week`):
```json
{
  "actions": [
    { "id": "a1", "title": "Write a before/after page", "minutes": 25, "day": "Tue", "status": "todo", "moves": 0, "short": "Write only the headline" },
    { "id": "a2", "title": "Draft a pilot offer email", "minutes": 30, "day": "Thu", "status": "todo", "moves": 0, "short": "Write only the subject line" },
    { "id": "a3", "title": "List seven discovery questions", "minutes": 20, "day": "Sat", "status": "todo", "moves": 0, "short": "Write two questions" }
  ],
  "summary": "0/3 done",
  "pathId": "messaging-consultant",
  "pathTitle": "Messaging & Positioning Consultant",
  "today": "Thu",
  "pendingComeback": false
}
```
- `pathTitle`은 초안의 `title`(없으면 `role_title`)입니다. 공유 카드가 씁니다. 화면은 초안에 역할 제목을 넣어 넘깁니다.
- `pendingComeback`은 Not today 뒤 아직 Done이 없다는 표시입니다. `applyCheckin`이 관리하므로 화면이 바꾸지 않습니다.

## `checkableActions(week)`

Done·Not today 버튼을 보일 행동: `status`가 `todo` 또는 `moved`이고 `day`가 `NextWeek`가 아닌 것.

## `applyCheckin(week, actionId, kind, today)`

체크인 하나를 적용한 새 `week`를 돌려줍니다(입력 `week`는 그대로).

**거절** (`ok: false`, `week`는 입력 그대로, 나머지는 빈 값): `invalid-kind`(kind가 두 값이 아님), `invalid-today`(today가 7개 요일이 아님), `unknown-action`, `not-checkable`(done이거나 NextWeek인 행동).

**Done**: 상태 `done`(moved 행동도 가능). 이번 주 첫 Done이면 `shareCard`, `pendingComeback`이 참이었으면(Not today 뒤 첫 Done) `comeback` 한 줄. 둘 다 한 번만 나옵니다.

**Not today** (지우지 않고 옮김, 동의 없이 자동):
1. 옮기는 날 = (행동 요일과 `today` 중 늦은 쪽)의 다음 날.
2. 이번 주 마지막 행동(체크인 가능한 행동 중 요일이 가장 늦은 것, 같은 요일이면 모두)이거나 옮기는 날이 일요일을 넘으면 `NextWeek`.
3. 옮긴 날에 다른 행동이 있어도 둘 다 둡니다. 횟수 제한 없음. 상태 `moved`, `moves` +1, `pendingComeback: true`.
4. `message`는 네 줄: `REST_DAY_LINE` → `REFRAME_LINE` → 10분 대체 행동(행동의 `short`) → `Moved to Fri` 또는 `Moved to next week`.

Not today 예시: 위 `week`에서 `applyCheckin(week, "a2", "not_today", "Thu")`
```json
{
  "ok": true, "reason": "moved",
  "week": { "actions": [
      { "id": "a1", "title": "Write a before/after page", "minutes": 25, "day": "Tue", "status": "todo", "moves": 0, "short": "Write only the headline" },
      { "id": "a2", "title": "Draft a pilot offer email", "minutes": 30, "day": "Fri", "status": "moved", "moves": 1, "short": "Write only the subject line" },
      { "id": "a3", "title": "List seven discovery questions", "minutes": 20, "day": "Sat", "status": "todo", "moves": 0, "short": "Write two questions" } ],
    "summary": "0/3 done · 1 moved", "pathId": "messaging-consultant", "pathTitle": "Messaging & Positioning Consultant", "today": "Thu", "pendingComeback": true },
  "message": "Today was a rest day, not a missed day.\nEnergy goes up and down; the plan bends with it and keeps going.\nIf you have 10 minutes: Write only the subject line.\nMoved to Fri",
  "adjustment": { "actionId": "a2", "fromDay": "Thu", "toDay": "Fri", "moves": 1, "reason": "next-day",
    "restLine": "Today was a rest day, not a missed day.",
    "reframe": "Energy goes up and down; the plan bends with it and keeps going.",
    "tenMinute": "If you have 10 minutes: Write only the subject line.",
    "movedLine": "Moved to Fri" },
  "shareCard": null, "comeback": null
}
```
`adjustment.reason`: `next-day` | `last-action`(마지막 행동이라 NextWeek) | `past-sunday`(일요일을 넘겨 NextWeek).

Done 예시: 이어서 `applyCheckin(week, "a1", "done", "Thu")` (첫 Done이자 Not today 뒤 첫 Done)
```json
{
  "ok": true, "reason": "done",
  "week": { "...": "a1 status done, summary \"1/3 done · 1 moved\", pendingComeback false" },
  "message": "Done: Write a before/after page.\nWelcome back. Showing up again is the hard part.",
  "adjustment": null,
  "shareCard": { "pathTitle": "Messaging & Positioning Consultant", "actionTitle": "Write a before/after page", "progress": "1/3 done",
    "text": "Working on: Messaging & Positioning Consultant. Just did: Write a before/after page. 1/3 done." },
  "comeback": "Welcome back. Showing up again is the hard part."
}
```
공유 카드에는 경로 이름, 끝낸 행동, `n/3 done`만 들어갑니다(개인 정보·분·다른 수치 없음).

거절 예시: 같은 `a1`에 다시 Done → `{"ok":false,"reason":"not-checkable","week":(그대로),"message":"","adjustment":null,"shareCard":null,"comeback":null}`

## `weekSummary(actions)`

`"<done>/<전체> done"`, moved가 1개 이상이면 뒤에 `" · <n> moved"`. NextWeek로 옮긴 행동도 상태가 `moved`라 moved로 셉니다. 예: `"0/3 done"`, `"1/3 done · 2 moved"`. `buildWeek`와 `applyCheckin`이 `week.summary`를 늘 이 값으로 맞춥니다.

## `sizeForCondition(week, condition)`

컨디션 1~2이면 행동마다 `title`을 `short`(10분 축소판)로, `minutes`를 10 이하로 바꿔 보여 줍니다(`reduced: true`, 원래 제목은 `fullTitle`). 3~5나 값 없음은 원래 크기(`reduced: false`). `id`·`status`·`day`는 그대로라 체크인은 같은 `id`로 합니다. `week` 자체는 바꾸지 않습니다(보여 주기 전용).

예: 위 `week`, 컨디션 2 → 첫 행동
```json
{ "id": "a1", "title": "Write only the headline", "minutes": 10, "day": "Tue", "status": "todo", "moves": 0, "short": "Write only the headline", "fullTitle": "Write a before/after page", "reduced": true }
```

## `progressSignals(checkins, lifelog)` (P2)

입력 `checkins`는 체크인 기록 배열 `[{actionId, kind, day}]`(순서대로, `day`는 체크인한 날의 데모 '오늘'), `lifelog`는 켜진 출처의 항목입니다.

| 신호 | 규칙 |
|---|---|
| `momentumScore` | 2 × Done + 1 × Not today + 라이프로그 날 수(가장 늦은 항목 날짜까지 7일 안의 서로 다른 날짜, 최대 3) |
| `momentum` | 6 이상 `strong`, 3 이상 `building`, 그 밖 `starting` |
| `dropoutRisk` | 체크인 없음 `medium`, 마지막 체크인들이 Not today 2번 이상 연속 `high`, 1번 `medium`, 그 밖 `low` |
| `daysShownUp` | 체크인(Done·Not today)이 있었던 서로 다른 날 수. 스트릭이 아닙니다 |
| `evidence` | 실제로 센 것만: 체크인 전부(`weight` Done 2, Not today 1) + 센 라이프로그 날마다 그날의 마지막 항목 하나(`weight` 1) |
| `rules` | 위 규칙의 영어 설명(`PROGRESS_RULES`), [Why?]에 그대로 보여 줄 수 있음 |

예: `checkins = [{a2, not_today, Thu}, {a1, done, Thu}]`, `lifelog` = 위 `l1`~`l4`
```json
{
  "momentum": "strong", "momentumScore": 6, "dropoutRisk": "low", "daysShownUp": 1,
  "evidence": [
    { "type": "checkin", "actionId": "a2", "kind": "not_today", "day": "Thu", "weight": 1 },
    { "type": "checkin", "actionId": "a1", "kind": "done", "day": "Thu", "weight": 2 },
    { "type": "lifelog", "id": "l4", "date": "2026-10-15", "source": "sms", "title": "Workshop question", "weight": 1 },
    { "type": "lifelog", "id": "l3", "date": "2026-10-14", "source": "saved_link", "title": "Article on prompt libraries", "weight": 1 },
    { "type": "lifelog", "id": "l2", "date": "2026-10-13", "source": "note", "title": "Rate cut", "weight": 1 }
  ],
  "rules": { "momentum": "...", "dropoutRisk": "...", "daysShownUp": "..." }
}
```

## `withTrace(name, fn, options?)` 와 `summarizeForTrace(value)`

[Why?] 처리 과정용 도우미입니다. 함수를 감싸면 결과는 그대로(`fn(...args)`와 같음) 두고, 실제로 부른 호출마다 `trace` 한 줄을 붙여 줍니다. 부르지 않은 단계는 trace가 생기지 않습니다.

```js
const traced = logic.withTrace('skillOverlap', logic.skillOverlap);
const { result, trace } = traced(skills, role);
```
```json
{
  "result": { "ratio": 1, "transfers": ["discovery-call", "positioning", "pricing"], "missing": [] },
  "trace": { "fn": "skillOverlap",
    "input": "[4: discovery-call, positioning, pricing, prompting], {id: \"messaging-consultant\", title: \"Messaging & Positioning Consultant\", requires: [3]}",
    "output": "{ratio: 1, transfers: [3], missing: [0]}",
    "via": "logic" }
}
```
- `options.input(...args)`·`options.output(result)`로 요약 문자열을 직접 정할 수 있습니다. `options.via`는 기본 `"logic"`이고, LLM 호출 결과를 적을 때 화면이 `"llm"` 또는 `"fallback"`을 넣습니다.
- `input`·`output`은 240자 이하입니다. `summarizeForTrace`는 값 종류와 관계없이 예외 없이 짧은 문자열을 돌려줍니다.
