# DEPLOY — 스택과 배포

> 당일 Build 일정: **10:35 골격을 고치지 않은 채 배포해 URL부터 만든다**(G2 — 새 앱 코드가 아니다) → 10:45 `SMOKE.md` → 11:00 `tests/` red → 코드 (demo-build 0~3단계). 첫 공개 배포는 PM 🚨 승인이고, 행사 전에 한 번 실측해 둔다.
> 스택을 바꾸는 결정은 PM이 `mission/BOARD.md`에 적는다. 12:00 이후에는 새 의존성을 넣지 않는다.

## 기본 스택

| 층 | 기본값 | 이유 |
|---|---|---|
| 화면 | 정적 HTML + JS (ES 모듈) · `index.html` · `app.js` · `styles.css` | 빌드 단계 없음. `index.html`은 http(s)에서만 동작 — 더블클릭(file://)은 `fallback.html`만. 로컬에서는 `node scripts/serve.mjs` |
| 로직 | `logic.js` 순수 함수 | 브라우저와 `node --test`에서 똑같이 돈다 |
| 데이터 ① | `data/fixture.json` 가상 데이터 (`synthetic`) | 네트워크 없이 시연 가능. 기본 모드 |
| 데이터 ② | Google Sheet + Apps Script Web App (`sheet/README.md`, 5분 세팅) | 행 추가·조회가 데모 장면일 때. `config.js`의 `SHEET_API_URL`만 채운다 |
| 배포 | GitHub Pages(`app/`만 게시) 또는 Vercel(Root Directory `app`) (`RECOVERY.md` 경로 A·B) | 둘 다 빌드 없이 `app/`만 올린다 — 사이트 루트 = `app/`, 러너 = `<URL>/tests/` |
| 복구 | `fallback.html` 정적 스냅샷 | 배포가 전부 막혀도 더블클릭으로 시연 |
| 테스트 | `SMOKE.md` → `tests/scaffold-core.test.mjs`(핵심 행동, 당일 교체) · `tests/logic.test.mjs`(하네스 불변식) · `tests/smoke-input.js`(입력 한 곳) · `<배포 URL>/tests/`(브라우저) | TDD: SMOKE를 먼저 쓴다 |

외부 라이브러리·CDN·패키지 설치 없이 동작한다. 필요해지면 그 결정 자체를 `mission/BOARD.md`에 적는다.

### 데이터 소스 전환 (fixture ↔ sheet)

1. `sheet/README.md`대로 Apps Script를 배포하고 웹 앱 URL을 복사한다. 웹 앱 공개 배포는 외부 게시다 → 🚨 PM 승인 한 결정 (CONTRACT 안전 규칙 5).
2. `config.js`의 `SHEET_API_URL = "<웹 앱 URL>"`을 채우고 커밋한다.
3. 배포 URL에서 표시기가 `sheet`인지 본다. sheet가 실패하면 앱이 fixture로 대신 돌고 표시기에 `sheet 실패 → fixture 대체`라고 쓴다 — 조용히 넘어가지 않는다.
4. 되돌릴 때는 `SHEET_API_URL = ""`.

웹 앱 URL은 인증 없는 공개 주소이고 `config.js`에 커밋되므로 **데모와 함께 공개된다** — synthetic 데이터만 넣는다. 실제 이름·연락처·계정 정보는 어떤 경우에도 넣지 않는다.

## 공개 데모 운영

심사위원은 우리 노트북이 아니라 **자기 기기에서, 로그인 없이** 링크를 연다. 제출 요건 F1(데모 URL 외부 접근)은 면제되지 않는다 (`CONTRACT.md` 「제출 시각과 면제 불가 요건」).

| 규칙 | 무엇을 | 골격에 있는 것 |
|---|---|---|
| **로그인 없음** | 데모 URL은 계정·비밀번호·초대 없이 열린다. 로그인이 핵심 장면이면 심사자용 가상 계정을 화면에 적지 말고, 로그인 없이 보는 경로를 따로 둔다 | 정적 페이지 · 인증 없음 |
| **심사자용 초기화 버튼** | 다음 심사자가 처음 화면에서 시작하게 「초기화」 하나로 입력·출력을 처음 상태로. 쓰기 데이터가 있으면 가상(synthetic) 시드로 되돌린다 | `#app-reset` (`app.js` `resetView`) |
| **오류 배너** | 데이터·호출이 실패하면 화면 맨 위 빨간 배너에 이유 한 줄과 "새로고침 또는 초기화". 조용히 빈 화면이 되지 않는다 | `#app-error` (`app.js` `showError`) · 데이터 표시기 `sheet 실패 → fixture 대체` |
| **다른 기기 확인** | 배포할 때마다 팀 노트북이 아닌 기기(휴대폰 등)의 시크릿 창에서 SMOKE 3단계를 한 번 돈다 — 캐시·로그인·로컬 파일 의존을 잡는다 | SMOKE 1단계 · 러너 `<배포 URL>/tests/` |
| **브라우저에 API 키 금지** | 키는 브라우저로 내려가는 어떤 파일에도 없다. AI 호출이 필요하면 **Apps Script 프록시**(키는 Script Properties) 또는 **사전 생성** 출력(`synthetic` 라벨)으로 보여 준다 — 아래 「AI 호출이 필요할 때」 | `config.js`에는 공개 URL만 |
| **지연·차단 대응** | 외부 호출은 시간 제한(`SHEET_TIMEOUT_MS`) 뒤 fixture로 대체하고 그 사실을 표시한다 | `loadRows` 대체 + 표시기 |
| **사전 코드 불허 시 빈 앱 경로** | 행사 전 코드가 불허로 확인되면(`docs/event-rules.md` U4) Build가 red 테스트 전에 `decideNextAction`을 echo stub으로 되돌리고, 그 빈 앱을 10:35에 배포해 URL부터 만든다. 그 뒤는 같은 TDD 순서 | `pre-event` 태그 + `git diff --stat pre-event..HEAD -- app/` |

## AI 호출이 필요할 때

정적 사이트(GitHub Pages·Vercel)는 `.env`를 읽지 못한다. 브라우저로 내려가는 파일은 전부 공개다.

1. **API 키를 브라우저 JS·`app/config.js`·`data/fixture.json`·커밋되는 어떤 파일에도 넣지 않는다.** 데모 URL에 키가 그대로 공개되고, 크레딧이 소진되며, 유료 API 승인도 건너뛰게 된다.
2. 호출은 **Apps Script 프록시**로 한다 — 키는 Apps Script의 Script Properties에만 두고(`Code.gs` 본문에 쓰지 않는다) 앱은 웹 앱 URL만 부른다. 또는 **미리 만든 출력**을 `synthetic` 라벨로 보여 준다.
3. 첫 실제 AI 호출을 연결하는 것은 **🚨 PM 한 결정**이다 (유료 API · CONTRACT 안전 규칙 5). 답이 오기 전에는 연결하지 않는다.

submit-gate 체크 4가 `app/`과 배포 페이지 소스에서 Anthropic 키 모양(`sk-` 다음에 `ant-`, 그 뒤 긴 문자열)을 검색한다 — 이 문서에는 그 문자열을 그대로 쓰지 않는다 (검색이 이 줄에 걸리지 않게).

### 배포 대상 선택

| 조건 | 고른다 |
|---|---|
| repo가 public이거나 GitHub 유료 계정 | GitHub Pages — `app/`만 게시 (`.github/workflows/pages.yml`, `https://<계정>.github.io/<repo>/`) |
| repo가 private이고 무료 계정 | Vercel (Root Directory `app`) |
| 둘 다 막힘 | `fallback.html` 로컬 시연 + 화면 녹화, SUBMISSION 「알려진 결함」에 기록 |

배포 대상과 계정은 **행사 전에** PM이 정하고 HANDOFF 「결정」에 적는다 (당일 G2에 `mission/BOARD.md`로 옮긴다). 행사 전 실측 1회는 `docs/READINESS.md` R4. 계정 생성은 승인 대상이다 (CONTRACT 안전 규칙 5). 행사 당일 계정을 새로 만들지 않는다.

## Firebase 전환 조건

아래 중 **하나 이상이 PRD 3번 문장(핵심 행동) 자체에 필요할 때만** Firebase(Auth + Firestore/Realtime DB + Hosting)로 바꾼다.

1. **로그인·사용자별 권한**이 핵심 장면이다 — 사람마다 자기 데이터만 보고 고쳐야 한다.
2. **실시간 동기화**가 핵심 장면이다 — 새로고침 없이 여러 화면에 즉시 반영돼야 한다.
3. **동시 쓰기**가 잦다 — 여러 사람이 동시에 써서 Sheet에서 덮어쓰기·잠금 충돌이 난다.
4. **Sheet 한계**가 시연을 깨뜨린다 — 요청당 약 1초 지연·일일 할당량·10KB 본문 제한 때문에 핵심 장면이 안 된다.

전환 절차와 제약:

- PM이 `mission/BOARD.md`에 "Firebase 전환 — 조건 <번호>"로 적고 결정한다. **12:00 이후에는 전환하지 않는다** — 그 시각 이후면 핵심 장면을 좁힌다.
- Firebase 프로젝트 생성·결제 연결은 승인 대상이다 (🚨 한 결정). 행사 크레딧 외 비용이 생기는 플랜은 쓰지 않는다.
- 설정 값(API 키 등)은 커밋하지 않는다. `app/.env*`는 `.gitignore` 대상이다.
- 전환해도 `SMOKE.md` 3단계와 `app/tests`는 그대로 통과해야 한다. `fallback.html`도 다시 만든다 (`RECOVERY.md`).

전환하지 않는 이유가 되는 것: "멋있어 보여서", "나중에 필요할 것 같아서", "Sheet가 느린 것 같아서(측정 없이)".
