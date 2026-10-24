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
