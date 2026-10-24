# brain/data — 14일 합성 데모 시나리오 `[SIMULATION]`

`dana-14d.json`은 Dream Achieve Moments(코드명 Second Draft) Decision Brain의 테스트·REST·MCP가 함께 쓰는 **합성(synthetic) 데이터**입니다.
Dana는 실존 인물이 아니며, 클라이언트·동료·링크·메시지 전부가 지어낸 것입니다. 파일 안의 `"_label": "synthetic"`과 `_note`가 이를 표시하고, 화면·발표에서는 항상 "시뮬레이션"으로 부릅니다.

신원 블록(`id`·`persona`·`fields`·`skills`·`roles`·`fallback`)은 `app/data/persona-dana.json`을 그대로 복사했습니다. 새 페르소나를 만들지 않습니다. 이 파일을 고칠 때도 그 블록은 손대지 말고, 원본이 바뀌면 다시 복사합니다(`tests/data.test.mjs`가 동일성을 검사합니다).

## 필드 설명

| 필드 | 뜻 |
|---|---|
| `_label` · `_note` | 합성 데이터 표시. `_label`은 항상 `"synthetic"` |
| `id` | 페르소나 id (`dana-copywriter`, 원본과 동일) |
| `arc_start` · `today` | 아크 시작일(2026-10-05, 월)과 데모의 '오늘'(2026-10-18, 일). 브레인은 시계를 쓰지 않고 이 값을 입력으로 받습니다 |
| `persona` · `fields` · `skills` · `roles` · `fallback` | 원본 페르소나에서 복사한 신원·스킬 사전·역할 카탈로그·폴백 경로 |
| `path` | 선택한 경로 = `roles[0]`(Messaging & Positioning Consultant). `one_liner`·`arc_12w`는 `fallback.paths[0]`에서 가져옴 |
| `week` | `buildWeek` 출력 모양(`docs/logic-contract.md`). 행동 3개: a1 화 25분 · a2 목 30분 · a3 토 20분. 모두 `todo`, `moves 0`. 체크인을 재생하기 전 초기 상태 |
| `lifelog[]` | 14일 × 2–4개 항목. Build 모양 `{id,date,source,title,summary,tags,url,field?}` + 브레인 필드(아래) |
| `checkins[]` | 두 주에 걸친 체크인 기록, 시간순. `{actionId, kind, day, date, blocker_reason?}` |
| `expected` | 통합 테스트가 단언할 이야기의 결과값 |

### lifelog 항목의 브레인 필드

| 필드 | 값 | 뜻 |
|---|---|---|
| `condition` | 1–5 | 그날의 자기보고 컨디션. 하루에 최소 1개 항목에 있음. 선언값이 항상 우선 |
| `signal` | `career` / `noise` / `rest` | `career`: 경로와 관련된 증거. `noise`: 실수로 찍은 사진·광고 문자처럼 걸러야 할 것(정확히 2개). `rest`: 쉼·회복·클라이언트 밀림 같은 기록 |
| `blocker_reason` | `time` / `energy` / `skill` / `people` / `mood` | Not today가 있었던 날의 이유 칩. 없으면 브레인은 추정하지 않고 `unknown` |
| `field` | `career` / `now` / `pull` | 출처 기본 매핑(`SOURCE_FIELD`) 대신 넣을 칸을 직접 지정할 때만 |

출처는 대부분 `note`·`saved_link`·`calendar`입니다. `sms`·`messenger`는 **3개 이하**(l12 messenger, l20 sms 광고, l24 sms)라서 기본 꺼짐 토글의 효과가 보입니다. `photo` 1개(l06)는 노이즈용입니다.

### checkins 항목

| 필드 | 뜻 |
|---|---|
| `actionId` | `week.actions`의 id(a1–a3) |
| `kind` | `done` / `not_today` |
| `day` · `date` | 체크인한 요일과 날짜(둘 다 기록해 두어 Build 함수(`day`)와 브레인(`date`)이 각자 씀) |
| `blocker_reason` | `not_today`일 때만 |
| `variant` | `"micro"`면 10분 축소판으로 끝낸 것(day 12 한 번) |

### expected

```json
{ "day11": { "date": "2026-10-15", "riskLevel": "amber", "reasons": ["consec_rest", "low_condition"] },
  "day14": { "date": "2026-10-18", "riskLevel": "green" },
  "rootConstraint": "opportunity-time" }
```

- day 11: Not today 2회 연속(+2) + 최근 3일 컨디션 평균 2(+1) = 3점 → `amber` (`ALGORITHM_DESIGN_v1.md` §4.3 점수표).
- day 14: 3일 연속 Done, 컨디션 4, 공백 없음 → `green`.
- 근본 제약: 이유 칩이 time×2(day 10 체크인, day 11 기록)·energy×1(day 9)이고 최근성 가중으로도 time이 앞서므로 `opportunity-time` (`BRAIN_ARCH_v2.md`의 예시와 동일).

## 이야기 타임라인

| Day | 날짜(요일) | 컨디션 | 체크인 | 무슨 일 |
|---|---|---|---|---|
| 1 | 10-05 월 | 4 | — | 아크 시작. 메시징 컨설턴트 경로 선택, 디스커버리 콜 1건 |
| 2 | 10-06 화 | 4 | a1 done | before/after 한 장 완성(25분). 실수로 찍힌 사진(noise) |
| 3 | 10-07 수 | 3 | — | 또 polish-only 의뢰(3분의 1 단가) |
| 4 | 10-08 목 | 3 | a2 done | 파일럿 제안 메일 초안 |
| 5 | 10-09 금 | 4 | — | 디스커버리 콜, 동료 스레드(세션 단가 전환 사례) |
| 6 | 10-10 토 | 3 | a3 done | 디스커버리 질문 7개 정리. **1주차 3/3** |
| 7 | 10-11 일 | 3 | — | 주간 리뷰, 산책(rest) |
| 8 | 10-12 월 | 3 | — | 클라이언트가 제품 페이지 마감을 목요일로 당김. 광고 문자(noise) |
| 9 | 10-13 화 | **2** | a1 not_today (energy) | 수면 부족 + 급한 일 8시간. **딥 시작** |
| 10 | 10-14 수 | **2** | a1 not_today (time) | 수정 2라운드가 저녁을 삼킴 |
| 11 | 10-15 목 | **2** | — | 마감일. 두 번 연속 쉼 → 위험 **amber**. "그만두진 않는다" 메모 |
| 12 | 10-16 금 | 3 | a1 done (micro 10분) | before 한 줄·after 한 줄만. **복귀(comeback)** |
| 13 | 10-17 토 | 3 | a2 done | 파일럿 제안 메일 실제 발송, 전 에이전시 전략가와 커피 |
| 14 | 10-18 일 | 4 | a3 done | 클라이언트가 파일럿 세션 수락. 질문 v2. **2주차 3/3 · green** |

## 사용

```js
import { readFileSync } from 'node:fs';
const scenario = JSON.parse(readFileSync(new URL('./dana-14d.json', import.meta.url), 'utf8'));
// scenario.lifelog, scenario.checkins, scenario.week, scenario.expected
```

검사: `cd brain && node --test tests/` (`tests/data.test.mjs`가 모양·이야기·원본 동일성을 확인합니다).

**이 폴더의 모든 데이터는 `[SIMULATION]`입니다.** 실제 인터뷰·계약·사용자 수가 아닙니다.

---

# `maya-21d.json` — 21일 합성 데모 시나리오 (꿈 경로) `[SIMULATION]`

두 번째 데모 데이터셋. GTM의 최종 페르소나(`docs/gtm/gonzalo/scenario-dream.md`, `journey-writer.md`)를 브레인 입력 모양으로 옮긴 것입니다.
Maya R.는 가상 인물이며 클라이언트·이웃·형제·링크·문자 전부 지어낸 것입니다 (`"_label": "synthetic"`, `_note`에 `[SIMULATION]`). `app/data/persona-*.json`에는 원본이 없으므로 이 파일이 Maya 신원의 정본입니다 (`persona.photo`는 아직 없는 경로 — 웹팀이 넣거나 무시).

- **페르소나**: 프리랜스 카피라이터 8년(B2B SaaS), 텍사스 오스틴, 38세, 아이 1명. 꿈 = 부모님 빵집 되살리기 (`persona.dream`). 한 줄: "AI는 내 빵을 굽지 못한다."
- **기간**: 21일, `arc_start` 2026-09-28(월) → `today` 2026-10-18(일). Dana와 같은 '오늘'.
- **역할 카탈로그 3개** (`roles`): `roles[0]` = 꿈 경로 **home-bakery**(`"dream": true`; recipe-costing·local-marketing·food-safety-cert·sourdough-baking·storytelling·community-building·ops-scheduling) + 전문성 이전 경로 2개 **content-strategist**·**brand-voice-editor**. `fallback.paths`는 세 역할 모두 행동 3개(≤30분).
- **선택 경로**: `path`/`week`는 home-bakery. a1 화 20분(식품취급자 교육) · a2 목 30분(노트북 레시피 1개 굽고 원가 계산) · a3 토 25분(사전주문 페이지 이야기).
- **모양**: Dana와 동일 (`persona`·`fields`·`skills`·`roles`·`fallback`·`path`·`week`·`lifelog`·`checkins`·`expected`). lifelog 44개 = 21일 × 2–4개, 브레인 필드 `condition`/`signal`/`blocker_reason`/`field` 동일 규칙.

### Dana와 다른 점

| 항목 | 내용 |
|---|---|
| `app_usage` 출처 | 구직 사이트 스크롤 기록 8개(전부 `signal: "noise"`, 태그 `app_usage`). 1주차 하루 2시간 → 3주차 10분. **기본 켜진 출처가 아니므로** 브레인은 이 날들을 "로그 없음"으로 본다 — 스크롤은 showed-up이 아니다 |
| `interest:bakery` 태그 | 12개 항목(사진·형제 메시지·시험 굽기·시식회). 세 주 모두에 있음 |
| `sms`/`messenger` | 3개(m09 형제 메시지, m27 약국 문자(noise), m37 클라이언트 문자) |
| `photo` | 2개(m07 옛 가게 사진, m41 미니 빵 20개) |
| 이유 칩 | 전부 `mood`(09-29, 10-08, 10-09) → 근본 제약 `motivation-automatic` |
| `roles[].dream` | 꿈 경로 표시용 선택 필드(브레인은 읽지 않음) |

### expected

```json
{ "day4":  { "date": "2026-10-01", "riskLevel": "red",   "reasons": ["gap_days", "low_momentum", "first_week", "data_gap"] },
  "day7":  { "date": "2026-10-04", "riskLevel": "green" },
  "day12": { "date": "2026-10-09", "riskLevel": "amber", "reasons": ["consec_rest"] },
  "day13": { "date": "2026-10-10", "riskLevel": "amber", "reasons": ["consec_rest", "low_condition"] },
  "day14": { "date": "2026-10-11", "riskLevel": "green" },
  "day21": { "date": "2026-10-18", "riskLevel": "green" },
  "rootConstraint": "motivation-automatic", "rankedFirst": "home-bakery",
  "m1": { "id": "M1", "name": "Fit", "passedWhenConfirmed": true, "evidence": "m34" } }
```

- day 4: 09-30·10-01 이틀이 `app_usage`/`photo`/`messenger`뿐 → 켜진 출처 기준 로그 공백 2일(+2) + 데이터 공백(+1) + 모멘텀 0.245(+1) + 아크 1주차(+1) = 5 → **red**. 점수표상 이틀 침묵은 항상 ≥4이므로 amber가 아니라 red다. 데모 포인트: "노이즈는 출석이 아니다."
- day 12–13: Not today 2회 연속(mood) +2, day 13은 최근 3일 컨디션 2(+1) → **amber**. 아들 아픔 + "40 좋아요, 사전주문 3건".
- day 14: micro 완료(빵 1개, 10분) → consec_rest 0 → **green**(comeback).
- day 21: 3주차 3/3 done, 컨디션 5, 시식회 뒤 사전주문 18건 → **green**. M1 Fit은 done 7 ≥ 2라 증거는 충분하지만 `confirmedGates: ["M1"]`을 줘야 통과(`goal.state` → `validated`). M1 증거 항목 = m34(판매 중인 홈 베이커와 커피).
- 역할 순위: home-bakery 1.0 · content-strategist 0.6 · brand-voice-editor 0.6.

### 이야기 타임라인

| Day | 날짜(요일) | 컨디션 | 체크인 | 무슨 일 |
|---|---|---|---|---|
| 1 | 09-28 월 | 3 | — | 푸시 메일(USD 3,300→800). 드림 덤프, 빵집 경로 선택. 구직 사이트 2h |
| 2 | 09-29 화 | 2 | a1 not_today (mood) | 자정까지 스크롤 2h20. 코티지 푸드 법 링크 저장 |
| 3 | 09-30 수 | 2 | — | 스크롤만 1h50. 옛 가게 사진 발견(photo) |
| 4 | 10-01 목 | 2 | — | 스크롤 2h. 형제가 레시피 노트 사진(messenger). 브레인엔 침묵 이틀 → **red** |
| 5 | 10-02 금 | 3 | a1 done | 교육 20분 시작. 브릿지 클라이언트와 light-edit 범위 합의 |
| 6 | 10-03 토 | 3 | a2 done | 첫 시험 굽기(토요일 롤), 원가 USD 2.80. 스크롤 40분 |
| 7 | 10-04 일 | 3 | — | 1주 리뷰 **2/3**. 산책(rest) |
| 8 | 10-05 월 | 4 | — | 식품취급자 시험 통과. 라벨 문구는 에이전트가 초안 |
| 9 | 10-06 화 | 4 | a1 done | 라벨 인쇄. "첫 고객 20명" 글 저장 |
| 10 | 10-07 수 | 3 | — | 크루아상 2번 실패. 인스타 게시 |
| 11 | 10-08 목 | **2** | a2 not_today (mood) | 좋아요 40, 사전주문 3. "내가 나를 속이는 것 같다". **딥 시작** |
| 12 | 10-09 금 | **2** | a2 not_today (mood) | 아들 발열. 스크롤 55분 → **amber** |
| 13 | 10-10 토 | **2** | — | 쉼. 노트 여백의 "bread forgives" → **amber** |
| 14 | 10-11 일 | 3 | a2 done (micro) | 빵 1개, 10분. 에이전트 "실패가 아니라 멈춤". 백신: 시식회 계획 → **green** |
| 15 | 10-12 월 | 3 | — | 미니 빵 20개 시식회 계획, 사전주문 페이지 템플릿 |
| 16 | 10-13 화 | 3 | a1 done | 사전주문 페이지 오픈 + 빵집 이야기 |
| 17 | 10-14 수 | 4 | — | 주말 30박스 파는 홈 베이커와 커피 (**M1 증거**) |
| 18 | 10-15 목 | 4 | a2 done | 토요일 박스 원가 USD 12 / 가격 35 / 마진 23 |
| 19 | 10-16 금 | 4 | — | 장보기·굽기 일정은 에이전트가. 스크롤 10분 |
| 20 | 10-17 토 | 4 | a3 done | 미니 빵 20개 굽기(photo) |
| 21 | 10-18 일 | 5 | — | 시식회. 사전주문 3→18. **M1 Fit 통과 · 3/3 · green** |

## `maya-21d.build.json` — 웹팀용 Build 모양

같은 이야기를 `docs/brain/MCP_DESIGN.md` §5 `LifeEvent` 모양으로 바꾼 것. `lifelog`·`checkins` 대신 **`events[]`** 54개(라이프로그 44 + 체크인 10), `ts` 오름차순.

| 필드 | 값 |
|---|---|
| `ts` | ISO 8601, `-05:00`(오스틴). 라이프로그는 하루 안에서 08:00·11:00·14:00…, 체크인은 20:30 |
| `source` | Build 이름: `journal`(note·saved_link·sms·messenger) · `calendar` · `screen`(app_usage) · `activity`(photo) · `checkin` |
| `kind` | 원래 브레인 출처 이름(`note`·`saved_link`·`app_usage`…) 또는 체크인 `done`/`not_today` |
| `value` | 라이프로그 = `summary`, 체크인 = `actionId` |
| `consentScope` | sms·messenger·photo = `local_only`, 나머지 `summary_ok` |
| `label` | 항상 `"synthetic"` |
| 그 외 | `title`·`tags`·`url`·`condition`·`signal`·`blocker_reason`·`field`·`day`·`variant`는 그대로 |

`persona`·`fields`·`skills`·`roles`·`fallback`·`path`·`week`·`expected`는 브레인 파일과 동일. 브레인 입력으로 쓰려면 `events`를 `kind`→`source`, `ts.slice(0,10)`→`date`로 되돌리면 된다.

검사: `cd brain && node --test tests/data-maya.test.mjs` (모양·이야기·`think()` 재생·Build 쌍둥이 동일성).
