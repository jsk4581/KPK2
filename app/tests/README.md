# app/tests — 앱 TDD

> 순서: **`app/SMOKE.md` → 이 폴더의 테스트(red) → 코드(green) → 배포 URL에서 다시 통과.**
> 테스트가 없는 기능은 만들지 않는다. G3(13:00)는 배포 URL에서 3/3 PASS가 조건이다.

## 무엇이 있나

| 파일 | 등급 | 하는 일 |
|---|---|---|
| `index.html` | T0 (브라우저만) | 실제 화면(`../index.html`)을 iframe으로 열고 SMOKE 3단계를 자동으로 돌려 `N/3 PASS`를 표시한다. 의존성 없음. http(s)에서만 돈다 |
| `logic.test.mjs` | T2 (node) | **하네스 불변식** — 입력 정리 · 데이터 로드(fixture/sheet/실패 대체) · 가짜 DOM에서 SMOKE 3단계의 모양(새로고침 없음·출력이 바뀜) · 초기화 버튼·오류 배너 · file:// 안내 · 문서 구조(SMOKE·RECOVERY·DEPLOY) · PRD ↔ SMOKE의 X-2·X-4 (+ 변이 테스트) · 연락처·비밀 스캔. 핵심 행동이 바뀌어도 지우지 않는다 |
| `scaffold-core.test.mjs` | T2 (node) | **골격의 핵심 행동 전용** — `tokenize`·`sortByUrgency`·`decideNextAction`·골격 fixture 열·버튼 이름 「핵심 행동」「초기화」. 당일 Build가 PRD 3번 핵심 행동의 테스트로 **이 파일을 통째로 바꾼다** (같은 파일 이름, 새 내용 — red 먼저) |
| `smoke-input.js` | 데이터 | `SMOKE_INPUT`(SMOKE 2단계 입력)과 `PARITY_INPUTS`(fallback 동기화 비교 입력)의 **유일한 원본**. node 테스트 셋과 브라우저 러너가 모두 여기서 읽는다 |
| `scaffold-prd.md` | 데이터 | 골격 앱의 6문장 PRD 예시 `[SIMULATION]`. `mission/PRD.md`가 **없을 때만** 3번·6번 빈칸 텍스트가 `app/SMOKE.md` 2단계·「완료 조건」에 그대로 있는지 `logic.test.mjs`가 이 파일로 본다. `mission/PRD.md`가 생기면 그 파일을 대신 읽는다 |
| `fallback.test.mjs` | T2 (node) | 항상: `fallback.html`이 혼자(네트워크 없이) 자기 안의 데이터로 열리고 버튼이 출력을 바꾸는지 · file:// 안내 블록이 없는지. `synced` 줄이 맞을 때만: index.html과 같은 id·제목·fixture, 같은 입력(`SMOKE_INPUT`·`PARITY_INPUTS`)에 실제 앱과 같은 화면 출력 (안 맞으면 SKIP + 다시 만드는 명령) |
| `serve.test.mjs` | T2 (node) | `scripts/serve.mjs`가 `app/`만 http로 내보내는지 |

## T0 — 브라우저로 여는 법

러너는 `http(s)`로 열어야 한다. `file://`(더블클릭)로 열면 Chrome·Edge가 모듈 import를 막는다 — 러너는 그때 멈추지 않고 맨 위에 빨간 `FAIL — file://로 열었습니다`를 띄우고, 모듈이 5초 안에 시작하지 않으면 `FAIL — 러너가 시작되지 않음`을 띄운다.

**T0 = 배포 URL의 `/tests/`** (Vercel·GitHub Pages 모두 `app/`이 사이트 루트라 `<배포 URL>/tests/`). **배포 전 로컬 = `app/fallback.html` 더블클릭 후 SMOKE 3단계를 손으로.**

1. 배포 URL에서: `<배포 URL>/tests/`.
2. 로컬에서 (node가 있으면): repo 루트에서 `node scripts/serve.mjs` → `http://localhost:8000/tests/`. python만 있으면 `cd app && python3 -m http.server 8000`.
3. 화면 맨 위에 `3/3 PASS`가 초록색으로 나오면 통과. 실패한 단계는 빨간 줄에 이유가 적힌다.
4. fallback 확인: `.../tests/?target=../fallback.html&expect=fixture`.
5. sheet 모드 강제 확인: `.../tests/?expect=sheet` (기본값은 `config.js`의 `SHEET_API_URL`로 정해진다).

배포 URL 결과는 Build가 `app/SMOKE.md` 「실행 기록」에, 14:00–14:45 테스트 회차는 Sales가 `mission/SUBMISSION.md` 「테스트」에 적는다. 로컬·red 실행은 커밋 메시지나 `log/`에만.

## T2 — node로 돌리는 법

repo 루트에서:

```bash
node --test app/tests
```

node 22 이상. 설치할 패키지는 없다 (`node:test`·`node:assert`만 쓴다). 디렉터리 인자는 `index.js`를 통해 모든 `*.test.mjs`를 불러온다 (`logic.test.mjs`의 마지막 테스트가 빠진 파일이 없는지 지킨다). `scripts/check.sh`와 CI는 같은 파일들을 목록으로 넘긴다 — 결과는 같다. 노트북에 node가 없으면 CI 결과(GitHub repo → Actions → check)를 본다 — 그 사실을 degrade 블록으로 알린다.

## 당일 고치는 법 (핵심 행동이 정해진 뒤)

> `logic.test.mjs`의 X-2·X-4 검사는 repo에 `mission/PRD.md`가 있으면 **그 PRD**를, 없으면 `scaffold-prd.md`를 읽는다. `scaffold-prd.md`는 당일 고치지 않는다. `mission/PRD.md`가 생긴 뒤(G1 10:20) HANDOFF `stage`가 intake·decide·board이고 `app/SMOKE.md` 대상 URL 줄에 그 PRD 버전(`PRD v<n>`)이 아직 없으면 X-2·X-4는 **NOT_RUN으로 SKIP**된다 (PM의 G1·G2 커밋이 빨개지지 않게 — 예상된 상태, 버그 아님). Build가 T3(10:45)에서 SMOKE를 맞추고 `PRD v<n>`을 적으면 다시 돈다. `stage: evidence` 이후에는 SKIP하지 않는다. 핵심 행동 테스트를 바꾸는 동안(11:00 red 커밋까지)은 `scaffold-core.test.mjs`가 red인 것이 정상이다 (TDD red).
>
> **당일 핵심 행동을 바꿀 때 손대는 파일 전부** (하나라도 빠지면 테스트·러너·fallback이 서로 다른 것을 본다): `app/SMOKE.md`(2단계·「완료 조건」·`PRD v<n>`) · `app/tests/smoke-input.js`(`SMOKE_INPUT`·`PARITY_INPUTS` — 새 핵심 장면에 닿는 입력으로) · `app/tests/scaffold-core.test.mjs`(통째로 새 핵심 행동 테스트로) · `app/logic.js`(핵심 함수) · `app/app.js`(`decideNextAction(input, rows)` 호출부·결과 표시·`renderRows`) · `app/tests/index.html`(사전 점검 줄 `decideNextAction(SMOKE_INPUT, [])` — 함수 이름·인자가 바뀌면) · `app/index.html`(제목·안내 문장·버튼 이름) · `app/data/fixture.json`(열이 바뀌면 — 그때 `app/sheet/Code.gs`의 `seedSyntheticSheet` 머리줄도 같은 열로 바꾸거나, sheet 모드를 쓰지 않는다고 BOARD에 적고 `config.js`의 `SHEET_API_URL`을 비워 둔다). 입력이 두 칸 이상이면 `SMOKE_INPUT` 한 문자열에 ` / `로 이어 쓰고 `app.js`에서 같은 구분자로 나눈다.

1. `app/SMOKE.md` 2단계의 핵심 장면 줄에 `mission/PRD.md` 3번 빈칸 텍스트를, 「완료 조건」 첫 줄에 6번 빈칸 텍스트를 **글자 그대로** 옮기고(X-2·X-4 — 검증기 `--stage submit`이 본다), 2단계의 입력·기대를 바꾼다.
2. 같은 입력을 `smoke-input.js`의 `SMOKE_INPUT` 한 곳에 넣는다 (`PARITY_INPUTS`도 새 핵심 장면에 닿는 입력으로).
3. `scaffold-core.test.mjs`를 새 핵심 행동의 테스트로 바꾼다 → `node --test app/tests`가 **FAIL(red)** 인지 먼저 본다. 아직 없는 함수는 `import * as logic from '../logic.js'`로 부른다 — 없는 이름을 `import { 새함수 }`로 부르면 파일 전체가 SyntaxError로 사라져 red가 아니라 "테스트 없음"이 된다.
4. `logic.js`를 고쳐 green으로 만든다. 화면 연결이 바뀌면 `app.js`도.
5. 배포 → `<배포 URL>/tests/`에서 3/3 PASS → 기록 → `RECOVERY.md` 「지금 상태」 갱신.
6. `logic.js`·`fixture.json`·id가 바뀌는 동안 fallback 비교 테스트는 SKIP으로 끝난다 (빌드를 막지 않는다 — 항상 도는 테스트는 fallback 자기 안의 데이터만 본다). **14:00 freeze 때** `node scripts/build_fallback.mjs`로 `fallback.html`을 다시 만든다 (`RECOVERY.md` 「정적 fallback 절차」) — submit-gate 체크 8은 SKIP 없이 PASS해야 한다.

## 지켜야 할 것

- 테스트 데이터는 전부 가상(`synthetic`)이다. 실제 이름·연락처·계정은 넣지 않는다 (privacy 테스트가 막는다).
- 테스트를 지워서 green을 만들지 않는다. 기대가 바뀌었으면 SMOKE.md부터 바꾼다. `scaffold-core.test.mjs`를 새 핵심 행동 테스트로 **바꾸는 것**은 지우기가 아니라 TDD 단계다 — `logic.test.mjs`(하네스 불변식)는 지우지 않는다.
- 같은 실패 3회면 고치기를 멈추고 PM에게 한 결정을 묻는다.
