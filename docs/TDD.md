# TDD — HTHn 팀 테스트 체계

상태: specified (리허설 전) · v1.1 · 원천: 야간 빌드 계획 §5 (2026-10-20) + v1.1 수정안 §A3·§B4 · 근거 계약: `CONTRACT.md` + `docs/HTHN_DESIGN.md` §18 산출물 계약 · §19 v1.1 수정

> **한 줄.** 무엇이 "완료"인지는 테스트가 먼저 정하고, 일은 그 테스트를 통과시키는 것이다.
> 오늘 밤에는 하네스 자체를, 행사 당일에는 우리 산출물(`mission/`)과 데모(`app/`)를 같은 방식으로 검사한다.

## 1. 원칙 5개

1. **테스트가 먼저다.** 테스트(또는 체크리스트)를 먼저 쓰고, 처음에는 실패(red)하는 것을 확인한 뒤, 만들어서 통과(green)시킨다.
2. **계약이 유일한 근거다.** 테스트는 `CONTRACT.md`와 산출물 계약(`docs/HTHN_DESIGN.md` §18 + §19 v1.1)만 보고 쓴다. 남이 만든 구현을 보고 테스트를 맞추지 않는다.
3. **테스트와 구현이 다르면 계약을 본다.** 계약 기준으로 틀린 쪽을 고친다. 계약이 애매하면 PM이 한 결정으로 계약을 고치고, 그다음 양쪽을 맞춘다.
4. **"완료했습니다"는 완료가 아니다.** 파일이 있고, 검사 기록(검증기 출력·SMOKE 실행 기록·SUBMISSION 「테스트」)이 있어야 완료다 (`CONTRACT.md` 안전·진실 규칙 7).
5. **돌지 않은 검사는 통과가 아니다.** 모든 검사 결과는 `PASS` · `FAIL` · `NOT_RUN` 셋 중 하나다 (§2-3). `NOT_RUN`을 `PASS`로 적지 않는다.

## 2. 다섯 단계 (L0–L4)

```
L4  하네스 eval      시뮬레이션 미션 3 · 실패복구 1 · 승인정지 1   (역할 에이전트, [SIMULATION])   → tests/sim/
L3  앱 TDD           SMOKE.md → app/tests 먼저 → 코드 → 배포 URL에서 통과                       → app/tests/
L2  산출물 검증기     mission/ 계약 기계 검사 — submit-gate·integrate·CI가 호출                  → scripts/validate_mission.py + tests/test_validators.py
L1  구조 테스트       스킬 헤더·T0·PII·비밀·템플릿↔계약·게이트↔스킬                                → tests/test_structure.py
L0  계약              산출물 계약 + CONTRACT.md — 테스트의 유일한 근거
```

아래로 갈수록 기반이고, 위로 갈수록 실제 사용에 가깝다. 아래 단계가 red이면 위 단계를 돌리지 않는다. 단 L1의 "`mission/`에 README.md만" 검사는 `HANDOFF.md`가 `mode: event`이면 건너뛴다(skip으로 보고) — 그때부터 `mission/`은 L2가 `stage`까지 검사한다(`check.sh`·CI의 `event-mission`).

| 단계 | 무엇을 지키나 | 어디에 있나 | 누가 쓰나 | 언제 돌리나 | 실패하면 |
|---|---|---|---|---|---|
| **L0 계약** | 산출물 파일별 필수 헤딩·표 열·내용 규칙, 게이트·역할·시간표 | `CONTRACT.md` · `docs/HTHN_DESIGN.md` §18 | PM (당일에는 바꾸지 않는다) | 행사 전 확정 | 계약을 고치는 것은 PM의 한 결정 → 그 뒤 L1·L2를 계약에 맞춘다 |
| **L1 구조 테스트** | 스킬 7개의 능력 선언 헤더(`requires`가 `(없음)`뿐)·degrade 블록·사람 절, 진입 파일, 역할 키트 4, 템플릿 8의 헤딩, PII 0·비밀 0, 게이트↔스킬 표, app·CI·docs 존재, `mode: pre_event`일 때 `mission/` 비어 있음, 팀 파일에 운영자 전용 도구 이름 없음, `.gitattributes`, 안전 규칙 문구, `check.sh` 3값 출력 | `tests/test_structure.py` · `tests/test_templates.py` · `tests/test_rules.py` · `tests/test_check_sh.py` | 하네스 관리자 | 코어를 바꿀 때마다 · CI push마다 | 코어 파일(스킬·템플릿·역할 키트)을 고친다. 테스트를 지우지 않는다 |
| **L2 산출물 검증기** | `mission/*.md`가 계약을 지키는가 — 구조(`S-`)·내용(`C-`)·교차(`X-1`~`X-5`) 규칙. good-01에서 규칙마다 **변이(mutation)**를 만들어 그 규칙만 FAIL하는지 본다 (§2-4) | `scripts/validate_mission.py` · `tests/test_validators.py` · `tests/fixtures/missions/` | 검증기 관리자 (규칙은 계약에서만) | 당일 각 게이트 · submit-gate · integrate · CI | 해당 파일 소유자가 고친다. 검증기를 끄지 않는다 |
| **L3 앱 TDD** | 데모의 핵심 장면 1개가 작동하는가 — SMOKE 3단계(페이지 열림 · 입력→출력 · 가상 데이터 로드) + 「완료 조건」(PRD 6번) · 공개 데모 운영(초기화 버튼·오류 배너) · 골격 PRD ↔ SMOKE의 X-2·X-4 | `app/SMOKE.md` · `app/tests/` (`logic.test.mjs` 하네스 불변식 + `scaffold-core.test.mjs` 핵심 행동(당일 교체) + `smoke-input.js` + 브라우저 러너 `index.html`) | Build (준서) | 10:30 테스트 먼저 → 코드 → 배포 URL에서 · G3 · 14:00 freeze 후 | 핵심 장면을 좁힌다. 기능을 더하지 않는다 (repair 3회 → PM 한 결정) |
| **L4 하네스 eval** | 하네스가 처음부터 끝까지 도는가 — 미션 3건 완주 · 실패 복구 · 승인 정지. **순차 역할 에이전트라 4명 동시 작업(push 경쟁·다른 OS·계정 한도·전달 지연)은 재현하지 못한다** — 그것은 사람 리허설(§5)의 몫 | `tests/sim/` · `tests/sim/RESULTS.md` (전부 `[SIMULATION]`) | 하네스 관리자 (역할 에이전트) | 행사 전 야간 빌드 · 코어를 크게 바꾼 뒤 | 스킬·템플릿·검증기를 고치고 L1·L2부터 다시 green |

### 2-1. L2 검증기 출력 읽는 법

```
<PASS|FAIL|WARN> <stage> <rule-id> <message>     ← 규칙마다 한 줄
SUMMARY pass=<n> fail=<n> warn=<n>              ← 마지막 줄

예) FAIL decide C-D1 점수 표 합계가 맞지 않음
```

- 한 줄에 한 규칙: `PASS|FAIL|WARN <stage> <rule-id> <message>`. 마지막 줄 `SUMMARY`. FAIL이 하나라도 있으면 exit 1. `WARN`은 실패가 아니라 사람이 볼 것이다 (사람 기입·측정 대기 값, 체크포인트 ↔ BOARD 상태 차이 X-6, 슬롯 ≤ 2·오래된 슬롯 행, 대상 없는 테스트 행).
- 오류 순서는 `S-` → `C-` → `X-`. 같은 파일에 `S-` FAIL이 있으면 그 파일의 `C-`·`X-` 결과는 "구조 실패로 신뢰 불가"로 보고 구조부터 고친다.
- `S-` = 구조(헤딩·표·프레임이 틀렸다) → 템플릿을 다시 복사해 구조부터 맞춘다.
- `C-` = 내용(빈 값·라벨·금지어) → 내용을 채우거나 라벨을 단다.
- `X-` = 교차(파일끼리 안 맞는다) → 주로 `--stage submit` — X-1 피치 라벨 ↔ EVIDENCE (`--stage pitch`에서도) · X-2 PRD 3번 ↔ SMOKE · X-3 G1~G5 done · X-4 PRD 6번 ↔ SMOKE 「완료 조건」 · X-5 검사자 ≠ 소유자 · X-6 HANDOFF 체크포인트 T 상태 ↔ BOARD 작업 상태 (`--stage board`, WARN만). PM이 integrate로 소유자에게 「제안」을 보낸다.
- 단계: `intake` · `decide` · `board` · `evidence` · `pitch` · `submit` · `all`. `submit`은 앞 단계를 전부 다시 검사한다. `HANDOFF.md`의 `stage:`가 CI가 어디까지 검사할지 정한다.

### 2-2. 실행 등급별 경로 (T0 = 도구 없음도 같은 결과)

| 등급 | 무엇이 있나 | 어떻게 검사하나 |
|---|---|---|
| T2 | 셸 + python3 + node | `bash scripts/check.sh` 한 번 (unittest + 검증기 + PII 스캔 + 앱 테스트) |
| T1 | 셸 + git, python/node 없음 | `bash scripts/check.sh`가 degrade 블록과 `RESULT … NOT_RUN`을 내고 exit 2로 끝난다 (PASS 아님). push하면 CI(`scripts/ci.sh`)가 하네스·fixture를 검사하고, `HANDOFF.md`가 `mode: event`일 때만 `mission/`을 `stage`까지 검사한다. 결과: GitHub repo → Actions → check |
| T0 | 웹 클라이언트, 셸 없음 | 앱은 배포 URL의 `/tests/`(Vercel·Pages 모두 `app/`이 루트)에서 3/3 PASS를 본다 — 배포 전 로컬은 `app/fallback.html` 더블클릭 후 SMOKE 3단계를 손으로. 산출물은 submit-gate 체크리스트를 사람이 직접 읽고 표를 채운다. 검사가 느린 대신 결과 표 형식은 같다 |

조용한 degrade는 금지다. 도구가 없어서 건너뛴 검사는 반드시 이렇게 말한다.

```
[이 환경에는 python이 없습니다]
 → CI는 하네스 구조·fixture를 검사하고, HANDOFF.md가 mode: event일 때만 mission/ 산출물을 stage까지 검사합니다. 그 전에는 이 수동 점검이 유일한 검사입니다. 결과: GitHub repo → Actions → check
 → 건너뛴 것: 로컬 unittest · 검증기 · PII 스캔 (NOT_RUN — PASS가 아닙니다)
```

### 2-3. 검사 결과 3값 — PASS / FAIL / NOT_RUN

| 값 | 뜻 | 다음 행동 |
|---|---|---|
| `PASS` | 검사가 **실제로 돌았고** 통과했다 | 기록하고 넘어간다 |
| `FAIL` | 검사가 돌았고 실패했다 | 그 파일 소유자가 고친다. 검사를 끄지 않는다 |
| `NOT_RUN` | 검사가 **돌지 않았다** (도구 없음·중첩 실행·시간 부족) | PASS가 아니다. 이유를 적고, 같은 커밋의 CI 결과나 수동 체크리스트로 대신한다 |

- `bash scripts/check.sh`는 검사마다 `RESULT <id> PASS|FAIL|NOT_RUN [이유]` 한 줄을 낸다. id: `unittest` · `validate-good` · `validate-bad` · `pii` · `node-tests` · `event-mission`.
- 종료 코드: **0** = 필수 검사 전부 PASS · **1** = FAIL이 하나라도 있다 · **2** = 필수 검사(`unittest` · `pii` · `mode: event`일 때 `event-mission`)가 NOT_RUN. CI(`scripts/ci.sh` = `check.sh --strict`)에서는 모든 검사가 필수다(행사 전 `event-mission`만 예외).
- **submit-gate는 NOT_RUN을 FAIL과 같이 취급한다.** NOT_RUN은 **같은 커밋**의 CI 결과(GitHub Actions 로그 링크)를 SUBMISSION 「체크」 증거 칸에 붙여야만 PASS로 바뀐다. 다른 커밋의 green은 증거가 아니다.
- 면제 불가 F1–F5(체크 1·3·4·5·10)가 NOT_RUN이면 판정은 approve도 approve-with-defects도 아니다 (`CONTRACT.md` 「제출 시각과 면제 불가 요건 (A6)」).

### 2-4. 변이(mutation) 테스트 — 검사기가 정말 잡는가

통과하는 fixture만으로는 "검사기가 아무것도 안 봐도 green"을 막지 못한다. 그래서 규칙마다 **멀쩡한 good-01을 한 군데만 망가뜨린 사본**을 프로그램으로 만들고, 그 규칙(만)이 FAIL하는지 본다.

| 계층 | 무엇을 변이하나 | 기대 |
|---|---|---|
| L2 `tests/test_validators.py` | 규칙별 최소 1개 — S-dup-heading · C-M4 · C-D1 · C-D5 · C-P1(문장 4: 통과 `음성을 넣으면 요약을 보여줍니다.` / 실패 `4. 음성 요약`) · C-P2 · C-P3 · C-P4 · C-B1(G6 enum) · C-B2(순환) · C-B3 · C-E2 · C-E3 · C-E4 · C-T1(`## Slide 4`) · C-T2 · C-T7 · C-T8 · C-S1 · C-S2 · C-S6 · C-S7 · X-1 · X-2 · X-3 · X-4 · X-5 · 빈 값(`[예시]` 건너뛰기 포함) | 그 rule-id만 FAIL. bad-01(복합 사례)은 그대로 둔다 |
| L1 `tests/test_check_sh.py` | python이 없는 PATH를 흉내 낸다 | `RESULT … NOT_RUN` · exit 2 |
| L3 `app/tests/logic.test.mjs` | SMOKE에서 골격 PRD 3번·6번 텍스트를 지운 사본 | X-2·X-4 검사가 실패를 잡는다 |

### 2-5. ID 동일 — 자동·수동·T0가 같은 번호로 말한다

- submit-gate 체크 1~10 ↔ 규칙 ID 매핑표는 `.claude/skills/submit-gate/SKILL.md`에 있다. 검증기가 내는 rule-id, 사람이 손으로 채우는 체크리스트, T0(웹·도구 없음) 경로가 **같은 체크 번호·같은 rule-id**로 `PASS / FAIL / NOT_RUN`을 적는다.
- 그래서 "자동으로는 X-2 FAIL, 수동으로는 체크 2 PASS" 같은 엇갈림은 바로 보인다 — 같은 번호에 두 값이 있으면 FAIL 쪽을 따른다.
- `check.sh`의 RESULT id와 CI 로그의 id도 같다. 증거 칸에는 id와 커밋을 함께 적는다 (예: `event-mission PASS · CI <커밋>`).

## 3. 오늘 밤 절차 (2026-10-20 → 10-21 야간 빌드, 하네스 자체의 TDD)

| 순서 | 단계 | 결과 |
|---|---|---|
| 1 | **L0 확정** — 야간 빌드 계획 §4 산출물 계약을 유일한 근거로 고정 | 계약표 (이 repo에서는 `docs/HTHN_DESIGN.md` §18) |
| 2 | **L1·L2 테스트를 먼저 작성 (red)** — `tests/test_structure.py` · `tests/test_validators.py` · `tests/test_templates.py` · fixtures `good-01`(전 단계 PASS) · `bad-01`(최소 8종 FAIL). 테스트 작성자는 다른 그룹의 구현을 보지 않는다 | 실행하면 실패하는 테스트 묶음 |
| 3 | **빌드** — 커널 문서 · 스킬 7 · 템플릿 8 + 역할 키트 4 · 검증기 · 앱 골격 · CI · 문서를 그룹별 파일 소유로 병렬 작성 | repo 파일 |
| 4 | **green** — `python3 -m unittest discover -s tests -v` 전부 PASS · `validate_mission.py good-01 --stage all` PASS · `pii_scan.py .` 0건 · 앱 테스트 PASS | `scripts/check.sh` 마지막 줄 `CHECK 상태: PASS` |
| 5 | **L4 시뮬레이션** — 역할 에이전트(PM → Build → GTM → Sales → 검사자)가 가상 미션 3건 완주 + 실패 복구 1 + 승인 정지 1. 산출물 전부 `[SIMULATION]` 표기 | `tests/sim/RESULTS.md` |
| 6 | **실패는 코어를 고친다** — 스킬·템플릿·검증기 중 틀린 쪽을 계약 기준으로 수정 → 1단계 테스트부터 다시 green | 수정 기록 |
| 7 | **보고** — 숫자(통과/실패 수)와 라벨을 그대로 적는다. 시뮬레이션은 시뮬레이션이라고 쓴다 | 보고서 |

## 4. 당일 루프 (2026-10-24, 산출물·데모의 TDD)

게이트마다 "먼저 검사 기준을 보고 → 만들고 → 검사 → 기록" 한 바퀴를 돈다.

| 시각 | 게이트 | 먼저 정해진 기준 (red 상태) | 만들기 | 검사 (T2 / T0) | 기록 |
|---|---|---|---|---|---|
| 09:00–10:20 | **G1** | PRD 6문장 프레임(fullmatch) + `버전: v1` + C·U·T 세 줄(근거 포함) · DECISION 점수표 합계 | mission-intake → `mission/MISSION.md` · `DECISION.md` · `PRD.md` | `validate_mission.py mission --stage decide` / PRD 6줄을 프레임과 한 줄씩 대조 + C·U·T 판정 | PRD 「C·U·T」 세 줄 PASS · HANDOFF `stage: decide` |
| 10:20–10:35 | **G2** | `mission/BOARD.md` 게이트·작업·파일 소유·예산(사람별)·슬롯 표 · 빈 배포 URL | sprint-board → `mission/BOARD.md` ‖ demo-build 0단계(골격 그대로 배포) | `--stage board` / 표 열·한 파일 한 소유자 눈 확인 · 다른 기기에서 URL 열기 | BOARD 「게이트」 G2 done · HANDOFF `stage: board` |
| 10:35–11:00 | (L3 시작) | 10:45 **Build가 코드보다 먼저** `app/SMOKE.md` 3단계(각 `기대:`) + 「완료 조건」 — 2단계에 PRD 3번, 완료 조건에 PRD 6번 빈칸 텍스트 그대로 → 11:00 `app/tests/`를 쓰고 실행해서 red 확인 | — | `node --test app/tests` / `<배포 URL>/tests/` | red 실행은 커밋 메시지·`log/`에 (SMOKE 「실행 기록」은 배포 URL 결과만) |
| 11:00 | evidence v1 | EVIDENCE 주장 표 `E<n>` · 라벨 4종 (시뮬레이션 표 행 0 허용) | evidence-research market | `--stage evidence` | HANDOFF `stage: evidence` |
| 12:30 | 비트 | 2장 뼈대 + 쓰일 주장 ID 목록 | pitch-compile skeleton | 뼈대의 ID가 EVIDENCE에 있는지 눈 확인 | `mission/PITCH.md` 뼈대 커밋 |
| 10:30–13:00 | **G3** | SMOKE 3단계가 **배포 URL에서** 통과 | demo-build 코드 → 배포 | 앱 테스트 green + 배포 URL에서 SMOKE 3단계 + 다른 기기 | SMOKE 「실행 기록」 · `git tag good-<HHMM>` · PM integrate (PRD ↔ 데모) |
| 14:00 | freeze | 이후 기능 추가 없음, 고치기만 | `fallback.html` 재동기화 | `node --test app/tests`가 SKIP 없이 PASS | HANDOFF 체크포인트 (커밋 해시) · `git tag good-1400` |
| 14:00–14:45 | **G4** | EVIDENCE 주장 표 라벨 · 시뮬레이션 표 label = simulation · 경고 줄 | demo-build test 모드 ‖ evidence-research simulation | `--stage evidence` / 라벨 4종 집합 대조 | SUBMISSION 「테스트」 표 ≥ 1행 · PM integrate (근거 ↔ 피치) |
| 14:45 | 비트 | submit-gate 체크 1~9 (제출 없음) | submit-gate precheck | 체크 9는 HANDOFF stage까지(`RESULT event-mission`) / 체크리스트 수동 · 결과마다 PASS/FAIL/NOT_RUN (체크 3·PITCH 빈칸 FAIL은 예상) | FAIL·NOT_RUN 목록 → 소유자 「제안」 |
| 14:00–15:30 | **G5** | Slide 1·2만 · 숫자·실적 줄마다 라벨 · 스크립트 220어절 이하 · 라벨 점검 표 | pitch-compile v1 → review → final | `--stage pitch` / 라벨 점검 표 직접 확인 | PITCH 「라벨 점검」 · PM integrate · HANDOFF `stage: pitch` |
| 15:30–16:00 | **G6** | submit-gate 10항목 · 교차 규칙 X-1~X-5 · G1~G5 done · F1–F5 PASS | 항목별 검사자(§C 5)가 submit-gate final 실행 | `--stage submit` / 체크리스트 10항목 수동 (같은 체크 번호·같은 rule-id) | SUBMISSION 판정 `approve` 또는 `approve-with-defects` · 해시 3종 → 우영 확정 → **제출 1회** · HANDOFF `stage: submit` |

- **submit-gate PASS 즉시 제출, 16:00이 목표·상한, 16:50이 최종 한계.** 면제 불가 F1–F5(체크 1·3·4·5·10) PASS 없이는 어떤 시각에도 내지 않는다. 나머지 결함은 「알려진 결함」 + PM 승인으로 `approve-with-defects`. (예전 16:30 하드스톱은 대체됨)
- **같은 실패 3회 → 멈추고 PM 한 결정.** 고치기를 반복하지 말고 범위를 줄인다.
- 검증기 FAIL은 고치는 신호이지 끄는 신호가 아니다. 규칙이 틀렸다고 보이면 HANDOFF 「제안」에 적고 PM이 결정한다.

### 4-1. 역할별 TDD 한 줄

| 역할 | 먼저 쓰는 것 | 통과 기준 | 자세히 |
|---|---|---|---|
| PM (우영) | PRD 6문장 + C·U·T | C·U·T 전부 PASS · BOARD 정합 · G3·G4·G5 integrate에서 어긋남 0 또는 「제안」 발송 | `roles/pm.md` 「내 TDD」 |
| Build (준서) | `app/SMOKE.md` → `app/tests/` | 코드보다 테스트가 먼저 커밋됨 · 배포 URL에서 SMOKE 3/3 | `roles/build.md` 「내 TDD」 |
| GTM·피치 (곤살로) | EVIDENCE 주장 표의 라벨 | 피치의 모든 숫자 줄에 라벨 · `--stage pitch` PASS | `roles/gtm-pitch.md` 「내 TDD」 |
| Sales·구매자 (태진) | 시뮬레이션 표 + 슬롯 기록 칸 | 모든 시뮬레이션 행 label = simulation · submit-gate 검사자로서 `--stage submit` PASS | `roles/sales-buyer.md` 「내 TDD」 |

## 5. 승격 규칙 — 시뮬레이션 ≠ manual-pilot

상태 머신(HARNESS_REGISTRY): `specified → manual-pilot → implemented → verified`. **지금 이 하네스의 모든 구성요소는 `specified`다.**

| 질문 | 답 |
|---|---|
| L1·L2·L3가 전부 green이면 승격인가? | 아니다. 하네스가 **설계대로 만들어졌다**는 뜻일 뿐이다 |
| L4 시뮬레이션 미션 3건이 완주했으면 승격인가? | **아니다.** 시뮬레이션은 설계 검증이지 승격 근거가 아니다. 역할 에이전트가 돌린 것이지 사람 4명이 돈 것이 아니다. 결과는 `[SIMULATION]`으로 표기하고 보고서에도 그렇게 적는다 |
| 그럼 무엇이 `manual-pilot` 승격 근거인가? | **사람 4명이 동시에 도는 리허설 1회.** 팀원 4명이 각자 환경에서 **같은 시간에** 가상 미션 1건을 압축 시간표로 실제로 돌고, 아래 성공 기준 7개를 통과해야 한다 (`docs/READINESS.md` R5) |
| 한 사람씩 차례로 돌린 리허설은? | 승격 근거가 아니다. 순차 실행은 push 경쟁·다른 OS·계정별 한도·전달 지연을 재현하지 못한다. **시뮬레이션 ≠ manual-pilot, 순차 리허설 ≠ 동시 리허설** |

사람 리허설 성공 기준 (설계서 §12 + v1.1):

| # | 확인 | 합격 |
|---|---|---|
| 1 | 4명이 온보딩 3단계만으로 시작했는가 | 추가 질문 0건 |
| 2 | `hthn-start`가 각 환경에서 브리핑을 냈는가 | T0 경로 포함 전원 |
| 3 | degrade 때 무엇이 빠졌는지 말했는가 | 침묵 0건 |
| 4 | G1~G6이 압축 시간표 안에서 전부 통과했는가 | 6/6 (산출물 파일 존재 + 검증기 기록) |
| 5 | submit-gate를 작성자 아닌 사람이 돌려 PII 0 · 시뮬레이션 표기 확인이었는가 (검사자 배정 §C 5) | 확인 |
| 6 | 4명이 **동시에** push했을 때 동기화 루프(§C 1)로 충돌 없이, 또는 소유자 해결로 끝났는가 | 유실 커밋 0 · 재시도 ≤ 3 |
| 7 | T0 중계 1건이 4항목(기준 버전·대상 경로·변경 ID·반영 확인)으로 소유자에게 반영됐는가 · NOT_RUN이 PASS로 적힌 곳이 없는가 | 확인 |

- 리허설 산출물은 상단에 `[SIMULATION — 리허설, 실제 미션 아님]`을 단다. 미션은 가상이지만 **실행하는 사람은 실제**라는 점이 시뮬레이션 eval과 다르다.
- 리허설 시작 때 PM이 `HANDOFF.md`를 `mode: event`(stage는 `intake`)로, 끝나면 `mission/`을 README.md만 남기고(`mission/BOARD.md` 포함) 비운 뒤 `mode: pre_event` · `stage: intake`로 되돌린다 (`/hthn-start close` 5단계).
- 리허설 결과는 `log/`에 남기고, 통과해야 `CONTRACT.md` 상태 줄과 각 SKILL.md `verified_on`을 고친다. 실측한 환경만 적는다.
- 리허설 일시는 미결이다 (행사 전 2시간, 승인 대기). 행사 준비 완료 마감은 10/23 20:00 (`docs/READINESS.md`).

## 6. 하지 않는 것

| 하지 않는 것 | 왜 |
|---|---|
| 실패하는 테스트를 지우거나 건너뛰기 | 테스트는 계약의 사본이다. 바꾸려면 계약부터 바꾼다 |
| 구현을 보고 테스트를 맞추기 | 계약이 유일한 근거다 |
| 시뮬레이션 결과를 실제 검증처럼 쓰기 | 안전·진실 규칙 3·4. `[SIMULATION]` 표기 필수 |
| 시뮬레이션만으로 상태 승격 | 사람 4명 동시 리허설 1회가 필요하다 |
| NOT_RUN을 PASS로 적기 | 돌지 않은 검사는 통과가 아니다. 같은 커밋의 CI 결과로만 해소한다 |
| 통과 fixture만 보고 검사기를 믿기 | 변이 테스트로 그 규칙이 실제로 FAIL을 내는지 본다 |
| 도구가 없어서 검사를 조용히 건너뛰기 | degrade 블록으로 무엇이 빠졌는지 말하고 CI 또는 수동 체크리스트로 대신한다 |
| 14:00 freeze 이후 기능 추가 | 고치기만 한다 |

## 7. 명령 모음

```bash
# 전부 한 번에 (검사마다 RESULT <id> PASS|FAIL|NOT_RUN · exit 0 PASS / 1 FAIL / 2 필수 검사 NOT_RUN — NOT_RUN은 PASS가 아니다)
bash scripts/check.sh

# CI와 같은 검사 (strict · 커밋·HANDOFF stage 출력)
bash scripts/ci.sh

# L1·L2 테스트
python3 -m unittest discover -s tests -v

# L2 산출물 검증 (당일: mission/, 하네스 확인: fixture)
python3 scripts/validate_mission.py mission --stage decide
python3 scripts/validate_mission.py mission --stage submit
python3 scripts/validate_mission.py tests/fixtures/missions/good-01 --stage all

# PII 스캔 (이메일·전화 패턴 0건이어야 한다)
python3 scripts/pii_scan.py .

# L3 앱 테스트 (디렉터리 인자는 app/tests/index.js를 통해 모든 *.test.mjs를 부른다 — 파일 목록·glob도 결과는 같다)
node --test app/tests
# 브라우저 러너는 http에서만: 배포 URL의 /tests/ · 로컬은 node scripts/serve.mjs → http://localhost:8000/tests/
# T0 배포 전: app/fallback.html 더블클릭 후 SMOKE 3단계를 손으로
```

CI(`.github/workflows/check.yml` → `scripts/ci.sh` → `scripts/check.sh --strict`)는 push·pull request마다 unittest · good-01 전 단계 · bad-01 거부 · PII 스캔 · 앱 테스트를 Python 3.12 · Node 22에서 돌리고, `HANDOFF.md`가 `mode: event`이면 실제 `mission/`을 `stage`까지 검증한다. 출력은 `RESULT <id> PASS|FAIL|NOT_RUN`. 로컬에 도구가 없는 팀원은 push 후 GitHub repo → Actions → check에서 결과를 본다.
