# RECOVERY — 5분 복구

> 배포 URL에서 `app/SMOKE.md` 단계가 실패하거나 페이지가 안 열릴 때 이 파일만 보고 움직인다.
> 소유: Build. 막힘 3회(합쳐 30분 상한 — `CONTRACT.md` §C 9)면 고치기를 멈추고 PM에게 한 결정을 묻는다 (CONTRACT §승인 형식).
> 순서: **① 전체 배포물 복구(태그·ZIP) → ② 5분 재배포 → ③ 로컬 파일 열기.** `fallback.html`은 마지막 수단이다.
> **예외 — 호스팅 장애**(배포 서비스가 죽음, 코드 문제 아님)면 ②가 먼저다: 아래 「0. 판단」 4.
> 시간 예산: 판단 1분 · 되돌리기 2분 · 태그·ZIP 복구 5분 · 경로 전환 5분 — 합쳐 30분 상한(`CONTRACT.md` §C 9). 경로 전환은 같은 실패에 대한 **2번째 시도**로 센다.

## 지금 상태 (Build가 갱신)

| 항목 | 값 |
|---|---|
| 배포 URL | `<배포 URL>` |
| 배포 경로 | `<GitHub Pages / Vercel / 로컬 파일>` |
| 기본 경로 | `<A Pages / B Vercel>` — 지금 데모 URL이 도는 경로 |
| 대체 경로 | `<A Pages / B Vercel>` · 사전 실측 `<날짜 HH:MM · 걸린 분>` · 첫 공개 배포 승인 `<HANDOFF 「결정」 시각 또는 READINESS R8>` |
| 마지막 정상 커밋 | `<커밋 해시>` · `<시각>` · SMOKE `<n>/3` · 확인 `<이름>` |
| 복구 태그 | `good-<HHMM>` (G3 직후 · 14:00 freeze 직후) |
| 복구 ZIP | `<경로>/app_good-<HHMM>.zip` · `<시각>` (`app/` 밖 — repo 안이면 `snapshots/`, `.gitignore`의 `*.zip`이라 커밋되지 않는다) |
| fallback 갱신 커밋 | `<커밋 해시>` · `<시각>` |

"마지막 정상 커밋"은 배포 URL에서 SMOKE 3/3을 통과한 커밋만 적는다. G3 통과 직후와 14:00 freeze 직후에 반드시 갱신하고, 같은 커밋에 복구 태그와 ZIP을 만든다 (아래 「전체 배포물 복구」).

### 재배포 실측

행사 전에 한 번(`docs/READINESS.md` R4, 빈 앱), 당일 G2에 한 번 — 실제로 걸린 시간을 적는다. 실측이 없는 경로는 "5분"이라고 믿지 않는다.

| 회차 | 날짜·시각 | 경로 (A Pages / B Vercel) | 커밋 | 걸린 시간 | 다른 기기 SMOKE | 확인 |
|---|---|---|---|---|---|---|

## 0. 판단 (1분)

1. 브라우저에서 `<배포 URL>/tests/`를 연다 → 몇 번 단계가 FAIL인지 본다 (Vercel·Pages 모두 `app/`이 사이트 루트다).
2. 원인 한 줄을 HANDOFF.md 「블로커」에 적는다.
3. 직전 커밋이 원인이면 → 아래 「되돌리기」. 원인을 바로 못 찾으면 → 아래 「전체 배포물 복구」(태그·ZIP). 다 막히면 → 「로컬 파일 열기」로 시연을 지킨다 (마지막 수단).
4. **호스팅 장애**(`/tests/`가 아예 안 열림 · 같은 커밋이 어제는 됐음 · 배포 서비스 상태 화면이 장애)면: 기본 경로에서 마지막 정상 커밋을 **한 번만** 다시 배포한다 (1회 시도). 증상이 같으면 5분 안에 「대체 경로」로 옮긴다 (2회 시도로 센다). 대체 경로가 사전에 실측·승인돼 있으면(「지금 상태」 표) 새 🚨 없이 배포한다 — 아니면 그 배포가 새 외부 게시라 🚨 한 결정을 먼저 묻는다. 그다음 아래 「경로 전환 뒤 알리기」를 한다. 돌아오는 것은 PM 결정이 있을 때만.

## 되돌리기 (공통, 2분)

```bash
git pull --rebase --autostash
git revert --no-edit <깨뜨린 커밋 해시>   # 남의 커밋을 지우지 않는다. reset·force-push 금지
git push
```

git이 없는 사람(T0): 깨진 변경을 팀 채널에 알리고 PM(또는 Build)이 대신 되돌린다.

## 전체 배포물 복구 (태그 · ZIP)

배포물 전체(`app/` 폴더)를 "마지막으로 3/3 PASS였던 상태"로 되돌리는 경로다. 커밋 하나를 되돌리는 「되돌리기」보다 넓고, `fallback.html`보다 원본에 가깝다.

**만들기 (G3 직후 · 14:00 freeze 직후, 배포 URL에서 SMOKE 3/3 확인 뒤):**

```bash
git tag good-1400                 # 시각을 이름에: good-<HHMM>
git push origin good-1400
```

git이 없거나 막혔으면 `app/` 폴더를 통째로 압축해 `app/` 밖에 둔다 — `app_good-<HHMM>.zip`. 경로는 어디든 되지만(빌린 노트북·샌드박스면 repo 안 `snapshots/`가 낫다 — `.gitignore`의 `*.zip`이라 커밋되지 않는다) 위 「지금 상태」 표에 경로를 적는다. 위 「지금 상태」 표에 태그·ZIP을 적는다.

**되돌리기 (깨진 원인을 바로 못 찾을 때):**

```bash
git pull --rebase --autostash
git checkout good-1400 -- app/     # app/만 그 태그 상태로 (다른 파일은 그대로)
git commit -m "fix(app): restore app/ to good-1400"
git push                           # 배포가 다시 돈다 → 배포 URL에서 SMOKE 3단계
```

ZIP 경로: ZIP을 풀어 `app/`을 덮고 커밋 → push (T0는 GitHub 웹 → Add file → Upload files로 `app/` 파일 업로드). 복구 뒤 **재배포를 실측**해 「재배포 실측」 표에 한 줄 적는다.

**`fallback.html`은 마지막 수단이다** — 태그·ZIP 복구와 다른 경로 재배포가 모두 실패했을 때만 쓴다. 제출 요건 F1(데모 URL 외부 접근)은 `fallback.html`로 채워지지 않는다.

## 경로 전환 뒤 알리기 (URL이 바뀌었을 때만, 3줄)

데모 URL을 조용히 바꾸지 않는다. 전환이 끝나면 Build가 바로:

1. 팀 채널에 한 줄 — 아래 degrade 블록을 그대로 붙인다.
2. 피치 담당(GTM)에게 새 URL을 직접 알린다 (Slide 2 `데모:` 줄).
3. HANDOFF 「체크포인트」에 `데모 URL <새 URL> · <HH:MM> · Build`, 「제안」에 소유자별 한 줄씩 — PM: `mission/BOARD.md` `데모 URL:` 줄 · GTM: `mission/PITCH.md` Slide 2 · Sales: `mission/SUBMISSION.md` 「산출물」 배포 URL 행 (각 소유자가 자기 파일을 고친다).

```
[배포 경로 전환] <HH:MM>부터 <이전 경로> 사용 불가 → 새 데모 URL <URL> (<대체 경로>)
 → 이전 링크는 쓰지 않는다. 되돌아가는 것은 PM 결정이 있을 때만.
 → 마지막 수단: app/fallback.html + 화면 녹화 (F1은 이것으로 채워지지 않는다)
```

## 5분 재배포 — 경로 3개

### A. GitHub Pages — `app/`만 게시

repo 루트를 게시하면 HANDOFF.md·`mission/`·`log/`·`roles/`(이름 포함)·`docs/`까지 공개된다. **`app/`만 올린다.**

0. Pages 활성화는 외부 게시다 — 첫 공개 배포 1회 🚨 PM 승인 (CONTRACT 안전 규칙 5). 행사 전에 빈 앱으로 한 번 실측해 둔다.
1. repo → Settings → Pages → Source: `GitHub Actions`. 그리고 Settings → Secrets and variables → Actions → Variables에 `HTHN_PAGES` = `on`.
2. `app/`에 push하면 `.github/workflows/pages.yml`이 `app/` 폴더만 올린다 (손으로 돌리려면 Actions → pages → Run workflow). 1~2분 뒤 `https://<계정>.github.io/<repo>/`에서 SMOKE 3단계를 돌린다 (러너: `.../tests/`).
3. 반영이 안 되면 repo → Actions 탭에서 `pages` 실행 결과를 본다.
4. 대안 (Actions를 못 쓸 때): `app/`만 담은 `gh-pages` 브랜치 — `git subtree push --prefix app origin gh-pages` 후 Pages Source = `Deploy from a branch` · `gh-pages` · `/ (root)`.
5. 주의: private repo는 무료 계정에서 Pages를 쓸 수 없다 → 경로 B.

### B. Vercel

1. vercel.com → Add New → Project → 이 repo를 Import.
2. Root Directory: `app` · Framework Preset: `Other` · Build Command 비움 · Output Directory 비움 → Deploy.
3. 1분 안에 `https://<프로젝트>.vercel.app/`에서 SMOKE 3단계를 돌린다 (러너: `.../tests/`).
4. 깨진 배포 되돌리기: Deployments 탭 → 직전 정상 배포 → `Promote to Production`(또는 Instant Rollback). 무료 플랜에서 더 이전 배포로 못 가면 위 「되돌리기」로 git revert 후 push.
5. 새 계정·새 프로젝트 생성은 승인 대상이다 (CONTRACT 안전 규칙 5) — 행사 전에 만들어 둔다.

### C. 로컬 파일 열기 (배포가 전부 막혔을 때)

1. `app/fallback.html`을 더블클릭한다. 모듈·네트워크 없이 열리고, 가상 데이터가 안에 들어 있다.
2. SMOKE 3단계를 손으로 돌리고 `app/SMOKE.md` 「실행 기록」에 `3/3 (fallback · 브라우저)`로 적는다 (표시기에 `정적 fallback 스냅샷`이 보인다). 이 행은 G3·체크 2·F1의 근거가 아니다.
3. 원본 `index.html`로 시연해야 하면 로컬 서버가 필요하다 (Chrome·Edge는 `file://`에서 ES 모듈을 막는다 — 그래서 `index.html`을 더블클릭하면 빨간 안내만 뜬다): repo 루트에서 `node scripts/serve.mjs` (또는 `cd app && python3 -m http.server 8000`) → `http://localhost:8000/` · 러너 `http://localhost:8000/tests/`.
4. 시연은 화면 공유 또는 화면 녹화로 한다. `mission/SUBMISSION.md` 「알려진 결함」에 "배포 URL 대신 로컬 시연"이라고 적는다.

## 정적 fallback 절차

`app/fallback.html`은 `index.html`의 복사본 스냅샷이다. CSS·JS·가상 데이터를 한 파일에 넣어 백엔드 없이 열린다.

언제 갱신하나: **14:00 freeze 직후 1회는 필수**(submit-gate 체크 8), G3 직후 1회는 권장. 빌드 중(10:30–14:00)에는 `logic.js`가 바뀌므로 `node --test app/tests`의 fallback 동기화 테스트가 **SKIP**으로 끝난다 — 빌드를 멈추지 않으려는 의도이고 빨간불이 아니다. freeze 뒤에는 SKIP이 남아 있으면 안 된다.

**기본 = 명령 하나 (node가 있으면):** repo 루트에서 `node scripts/build_fallback.mjs` → `app/fallback.html`을 다시 쓰고 `synced` 줄을 출력한다. 아래 1~5를 그대로 한다. 그다음 6(확인)만 한다.

손으로 할 때 (node가 없을 때):

1. `cp app/index.html app/fallback.html` — 화면 구조(id 포함)를 그대로 가져온다.
1b. `fallback.html`에서 `<p id="file-guard" …>…</p>`와 **바로 뒤의 일반 `<script>`(file:// 안내)** 를 지운다. 남기면 fallback을 더블클릭할 때 빨간 "file://에서는 동작하지 않습니다"가 뜨고, `fallback.test.mjs`가 그 안내 스크립트를 앱 스크립트로 잘못 돌린다.
2. `fallback.html`에서 `<link rel="stylesheet" href="styles.css">`를 지우고 `styles.css` 내용을 `<style>` 안에 붙인다.
3. `<script type="module" src="app.js"></script>`를 지우고 일반 `<script>` 하나에 `(function () { 'use strict'; … })();`로 감싸 다음 순서로 붙인다. 블록 표시 주석을 그대로 쓴다 (테스트가 이 표시로 비교한다):
   - `/* BEGIN config */` `var SHEET_API_URL = ''; var FIXTURE_URL = 'data/fixture.json'; var SHEET_TIMEOUT_MS = 0;` `/* END config */` (fallback은 항상 fixture)
   - `/* BEGIN fixture */` `var FIXTURE = <data/fixture.json 내용>;` `/* END fixture */`
   - `/* BEGIN logic */` `logic.js` 전체에서 `export ` 만 뺀 것 `/* END logic */`
   - `/* BEGIN app */` `app.js`의 `--- BEGIN app` ~ `--- END app` 사이에서 `export ` 만 뺀 것 `/* END app */`
   - 마지막에 정확히 이 꼬리 (표시기에 `정적 fallback 스냅샷`을 붙이는 `.then`이 없으면 테스트가 FAIL):

```js
function inlineFetch() {
  return Promise.resolve({ ok: true, status: 200, json: function () { return Promise.resolve(FIXTURE); } });
}
boot(document, { sheetUrl: SHEET_API_URL, fixtureUrl: FIXTURE_URL, fetchImpl: inlineFetch, timeoutMs: SHEET_TIMEOUT_MS })
  .then(function (booted) { var el = booted.els.source; el.textContent = el.textContent + ' · 정적 fallback 스냅샷'; })
  .catch(function (err) { showError(document.getElementById(OPTIONAL_IDS.error), err && err.message ? err.message : String(err)); });
```
4. 배지 문구 끝에 `· 정적 fallback`을 붙인다.
5. 동기화 줄: `node --test app/tests`를 돌리면 SKIP 메시지에 `<!-- synced: logic.js sha256=… · fixture.json sha256=… -->` 한 줄이 나온다. 그 줄로 `fallback.html` 머리의 `synced` 줄을 바꾼다 (node가 없으면 CI 로그의 SKIP 메시지에서 가져온다).
6. 확인: `fallback.html`을 더블클릭해 SMOKE 3단계 → `node --test app/tests`(fallback 비교 테스트가 SKIP 없이 PASS) → 커밋 `fix(app): refresh fallback snapshot` → 위 「지금 상태」 표의 fallback 갱신 커밋을 적는다.

손으로 하기 어려우면 Claude에게 그대로 시킨다:

```
app/RECOVERY.md "정적 fallback 절차"대로 app/fallback.html을 다시 만들어줘.
node가 있으면 node scripts/build_fallback.mjs를 돌리고, 없으면 1~5단계를 손으로 (1b의 file:// 안내 블록 삭제 포함).
그다음 node --test app/tests에서 fallback 테스트가 SKIP 없이 통과하는지 확인해.
```

## 하지 않는 것

- `git push --force` · `git reset --hard origin/...` 금지. 되돌릴 때는 `git revert`.
- 복구 중에 기능을 더하지 않는다. 핵심 장면을 좁힌다.
- 실제 개인 데이터·비밀 키를 넣어서 "일단 돌게" 만들지 않는다.
