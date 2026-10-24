# 라이프로깅 테스트 셋 `[SIMULATION]`

> 모든 인물·고객·링크·메시지는 지어낸 것입니다 (`"_label": "synthetic"`). 실제 인터뷰·사용자 데이터가 아닙니다.
> 원천: Sales `docs/gtm/journey-io.md` 시나리오 B(번역가)·C(일러스트) · Gonzalo Discord 10:29 메시지(`1563363868787474495`)의 경로 3개(AI content editor · UX writer · content/prompt strategist). Dana는 `brain/data/dana-14d.json`에 이미 있으므로 여기서는 만들지 않았습니다.

## 무엇을 시험하나

```
정적 원시 데이터 (scenarios/*.json: 21일 라이프로그 · 체크인 · 주간 계획 · 드림 어치브 모먼트)
  → L2 필터 (noise 제거)
  → 온톨로지 (Person · Skill · Role · DreamMoment · LifeEvent · Constraint · State 노드, has_skill / interested_in / required_by / serves_dream / evidences / observed_in 관계)
  → 상태 (brain/state.js estimateState — 에너지 · 모멘텀 · 자기효능 · 용량 · 이탈 위험)
  → 가이드 (드림 모먼트 → 12주 게이트 M1–M4 → 다음 게이트 → 오늘 개입과 메시지)
  → 모니터링 (매일 아침 개입 · 주간 리뷰 · 시장 이탈 · 목표 재확인 질문)
```

판단은 전부 뇌 모듈(`brain/*.js`, `app/logic.js`)이 하고, `build.mjs`는 연결만 합니다. 뇌에 아직 없는 규칙 2개(아키텍처 v1.1 c "시장 이탈"과 "목표 재확인")만 `proposal: true`로 표시해 여기서 계산합니다. 시계·네트워크·LLM은 쓰지 않습니다.

## 시나리오 3개 (아크 2026-09-28 월 → 오늘 2026-10-18 일, 3주)

| id | 사람 | 아키타입(자동) | 이야기 | 드림 어치브 모먼트 | 모니터링에서 나와야 하는 것 |
|---|---|---|---|---|---|
| `marco-translator` | 번역가 EN-ES 9년 | pivot-with-runway | 꾸준히 진행. 2주차에 현지화 리드와 대화하고 용어집 샘플을 만듦. 3주차 한 단계가 상대 답장을 기다림 | 의료기기 회사의 스페인어 출시에서 용어 책임자로 계약하고, 규제 검토에서 용어 지적이 0건 | 21일 모두 green · 10-13 **GATE_PASS(M1 Fit)** → 목표 `validated` · 근본 제약 `opportunity-social` · 주간 리뷰 3회 모두 크기 키움 |
| `priya-contentwriter` | B2B 콘텐츠 작가 5년 (Gonzalo 경로) | income-pressure | 수입 때문에 AI content editor를 고름. 1주차를 30분×3으로 과하게 계획함. 에이전시 야간 일이 시간을 먹음 | SaaS 온보딩 문구가 출시되고, 지원팀이 "how do I" 문의가 줄었다고 말하며, UX Writer로 월급을 받음 | 1주차 shrink → 같은 단계가 2번 밀려 **재계획 질문** · 주당 최대 2단계(수입 압박 prior) · 제약 `opportunity-time` · 고른 직무 공고 **−16%** + 드림은 UX Writer 쪽 → **목표 재확인 질문(자동 변경 없음)** |
| `riley-illustrator` | 일러스트·2D 5년 | identity-grief | 보드 작업이 2번 밀림(skill → mood). 4일 동안 기록 없음. 2주 내내 컨디션 2 | 인디 게임 트레일러가 Riley의 스토리보드로 출시되고 크레딧에 "Storyboard: Riley" | 10-03 CARRIED + 재계획 질문 · 10-10 **reconnect**, 위험 **red** · 2주차 리뷰는 10분짜리 1단계 · 3주차 리뷰 **에스컬레이션 `low_condition_10_of_14`**(사람 연결 제안) — 그날 일일 위험은 green |

각 시나리오는 정해진 역할 카탈로그 3개(직무별 필요 스킬, AI 노출도 augment/replace, 4주 공고 지수)와 스킬 사전 12개를 함께 가집니다.

## 실행

```bash
node testset/lifelog/build.mjs                    # out/<id>.analysis.json + out/summary.json 생성, 요약 표 출력
node --test testset/lifelog/testset.test.mjs      # 이야기 의도 10개 단언 (데이터를 고치면 여기서 깨짐)
```

`out/<id>.analysis.json` 구조:

| 키 | 내용 |
|---|---|
| `person` | 아키타입 · 변화 단계 · 커리어 자본(knowHow / knowWhom / knowWhy) |
| `ontology` | `l2_filter` · `know_how_start/now` · `interests` · 역할별 겹침(시작 → 오늘) · 빠진 스킬 · 드림 정렬도 · `nodes[]` · `edges[]` |
| `state_today` | 에너지 · 모멘텀 · 자기효능 · 용량(분) · 위험 수준과 이유 · 근본 제약과 근거 id |
| `guide` | 드림 모먼트 · 목표 상태 · 경로(이어지는 것 / 빠진 것) · 게이트 4개(날짜 · 증거 · 드림 신호 · 통과 여부) · 다음 게이트 · 오늘 개입과 메시지 · 다음 주 크기 · 목표 재확인 |
| `monitoring.timeline[]` | 매일: 아침 상태(전날까지의 데이터 + 그날 컨디션) → 개입 종류 · messageKey · 분 · 선택지 · 이유 · 렌더된 메시지 · 톤 lint |
| `monitoring.weekly_reviews[]` | 일요일마다: 계획 대비 실제 · 크기 조정 · 재계획 질문 · 에스컬레이션 · 다음 주 씨앗 |
| `monitoring.market_drift` | 고른 직무의 최신 공고 지수 vs 이전 평균 (−15% 이하면 flag) |

## 데이터 규칙 (리즈너블하게 만든 기준)

- 체크인은 Build의 `applyCheckin`으로 재생합니다. 규칙에 어긋나는 체크인은 빌드가 실패합니다 (예: 이번 주 마지막 행동에 Not today를 누르면 NextWeek로 가므로, 같은 주에는 다시 체크인할 수 없음).
- 체크인 요일과 날짜가 맞아야 합니다. 라이프로그는 아크 기간 안에만 있습니다.
- **스킬 vs 관심**: 직접 만든 것(문서·일정·메시지·자기 작업 노트)만 스킬 증거로 칩니다. 저장한 링크, `field: "pull"` 노트(공고 읽기 포함), fields의 pull은 관심(`interested_in`)으로만 칩니다.
- 노이즈(실수 사진·광고 문자)는 시나리오마다 1–2개입니다. L2에서 걸러지므로 컨디션 값은 노이즈 항목에 붙이지 않습니다.
- 출처는 note·calendar·document·saved_link 위주이고, sms·messenger는 적게 둡니다 (기본 꺼짐 토글과 맞춤).
- 위기 언어는 쓰지 않았습니다. Riley는 위기 경로가 아니라 저컨디션 에스컬레이션을 시험합니다.

## 뇌 쪽에 알릴 발견 (테스트 셋을 돌리며 드러난 동작)

1. **GATE_PASS가 행동 없는 날에는 묻힙니다.** `decideIntervention`은 오늘 행동이 없으면 게이트 분기 전에 `none`을 반환합니다. 일요일 주간 리뷰에서 게이트를 확인하면 메시지가 나가지 않습니다. 이 셋은 확인 날짜를 화요일로 옮겨 우회했습니다.
2. **1주차 Not today 2번이면 5일째에 red가 됩니다** (`consec_rest` +2, `low_self_efficacy` +1, `first_week` +1 = 4). Priya·Riley 10-03이 그렇습니다. 의도한 강도인지 확인이 필요합니다.
3. **2주 내내 저조해도 일일 위험은 green입니다** (Riley 10-14~18). `low_condition`은 +1뿐이라, 오래가는 저조는 주간 리뷰의 에스컬레이션만 잡습니다. 데모에서 "위험 green + 사람 연결 제안"이 함께 보이면 설명이 필요합니다.
4. **`extractSkills`는 저장한 링크와 공고 읽기도 스킬로 셉니다.** 이 셋의 온톨로지는 관심으로 분리했고, 그러면 Priya의 UX Writer 겹침이 1.0에서 0.83(빠진 것: user-research)으로 현실적으로 바뀝니다. `rankRoles`에도 같은 구분을 넣을지 검토가 필요합니다.
