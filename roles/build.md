# 역할 키트 — Build (기본 담당: 준서)

> 이 파일은 Build의 하루 전체다. `/hthn-start`가 이 파일을 읽고 `me/common.md`에 내 스킬·내 파일을 옮긴다. 계약의 정본은 `CONTRACT.md`이고, 당일 최종 파일 소유는 `mission/BOARD.md` 「파일 소유」표가 정한다 (BOARD 정본은 `mission/BOARD.md` 하나 — 루트 BOARD.md는 없다).

## 나의 R&R

- **핵심 장면 하나.** PRD 3번 문장의 핵심 행동 하나가 배포 URL에서 G3(13:00)까지 작동하게 만든다. 기능을 더하는 것이 아니라 그 장면 하나를 끝내는 것이 일이다.
- **테스트 먼저.** 10:35 골격을 그대로 배포해 URL을 만들고, `app/SMOKE.md` 3단계(10:45)와 `app/tests/` red(11:00)를 코드보다 먼저 쓴다.
- **복구 경로.** `app/RECOVERY.md`(5분 재배포 · 마지막 정상 커밋 · 정적 fallback)를 freeze(14:00) 전에 최신으로 둔다.
- **검사.** submit-gate 체크 **4·7·10**(개인정보 0 · 제출 양식 필드 · 시각·슬롯)의 기본 검사자다. 1·2·8·9는 내 `app/`을 보는 행이라 검사할 수 없다 (X-5). 14:45 precheck에서 4·7을 드라이런하고, 15:30 final에서 4·7·10을 확정한다.
- **PRD 버전 따라가기.** PRD `버전`이 오르면(G2 뒤 변경) `app/SMOKE.md` 2단계·「완료 조건」을 새 문장에 맞추고 HANDOFF 「체크포인트」에 `SMOKE ✓ PRD v<n>` 한 줄을 남긴다.
- **하지 않는 것.** 실제 개인 데이터 연결 금지 — 가상 데이터(`"_label": "synthetic"`)나 현장 공개 API만. 키·토큰을 repo에 넣지 않는다(`app/.env*`는 gitignore). **AI 호출이 필요해도 API 키를 브라우저 JS·`app/config.js`·`fixture.json` 등 커밋되는 파일에 넣지 않는다** — 정적 사이트는 키를 그대로 공개한다. Apps Script 프록시(키는 Script Properties에)나 미리 만든 `synthetic` 출력을 쓰고, 첫 실제 AI 호출 연결은 PM 🚨 한 결정(유료 API)이다 (`app/DEPLOY.md` 「AI 호출이 필요할 때」). 14:00 이후 기능 추가 금지.

## 환경 세팅 (행사 전)

행사 전(10/22~23)에 한 번 끝까지 통과한다. 권고는 A(Claude Code CLI)다 — 슬래시 스킬·git·셸·node가 한 번에 되어 Build에게 가장 빠르다.

**A. Claude Code CLI (권고)**

1. 설치는 공식 문서만 따른다: https://code.claude.com/docs/en/setup — 블로그·남이 준 스크립트로 설치하지 않는다.
2. 팀 repo를 받는다: `git clone https://github.com/Roykoo83/hthn.git` (private — 초대 수락 후. repo 생성·초대는 승인 대기 중이며, 열리면 팀 채널에 공지된다).
3. 받은 폴더에서 한 번만: `git config pull.rebase true && git config rebase.autoStash true` (커밋 안 한 변경이 있어도 pull이 멈추지 않게). 그다음 `claude`를 실행한다. `CLAUDE.md`가 자동으로 읽힌다.
4. `/hthn-start`를 입력하고 역할 질문에 `build`를 고른다. `me/` 아래에 3블록이 생긴다.
5. Build 검증: `node --test app/tests` → 전부 pass. 그리고 `node scripts/serve.mjs` → 브라우저로 `http://localhost:8000/tests/`를 열어 3/3 PASS 표시를 본다 (`app/tests/index.html`을 더블클릭(file://)하면 FAIL 안내가 뜨는 것이 정상이다 — 모듈은 http에서만 돈다). 배포 대상(정적 호스팅) 계정 로그인이 되는지, 골격 배포를 한 번 실측할 수 있는지도 확인한다 — 계정 생성·첫 공개 배포는 PM에게 먼저 묻는다.

**B. Claude Desktop 대안**

1. 공식 다운로드 페이지에서 설치: https://claude.ai/download
2. 앱의 Code 탭에서 받은 repo 폴더를 연다 (git이 없으면 GitHub 웹에서 ZIP으로 받아 푼다).
3. `/hthn-start`가 목록에 없으면 "`.claude/skills/hthn-start/SKILL.md`를 읽고 따라"라고 입력한다 (Desktop의 슬래시 자동 인식은 아직 미검증).
4. node가 없으면 T0 경로를 쓴다: 배포 URL의 `/tests/` (Vercel·Pages 모두 `app/`이 사이트 루트라 `<URL>/tests/`) · 배포 전 로컬은 `app/fallback.html`을 더블클릭한 뒤 SMOKE 3단계를 손으로.

**Windows** — 명령은 Claude에게 시키거나(Claude Code는 Git Bash를 쓴다) `CLAUDE.md` 「Windows 대응 명령」 표의 PowerShell 명령을 쓴다 (`python3` 대신 `py -3`, 해시는 `certutil -hashfile <파일> SHA256`, `curl` 대신 `curl.exe`).

**T0 — 파일 읽기만으로 (셸·git 없음)**

- claude.ai 웹 등 파일 접근이 없으면 `CLAUDE.md` 「웹(T0) 붙여넣기 세트」를 대화에 붙여넣는다 (claude.ai Project 지식에 한 번 올려 두면 매번 붙이지 않아도 된다). 이 역할에서 쓰려는 스킬: hthn-start · demo-build · submit-gate.
- AI가 첫 응답 맨 위에 degrade 블록을 내야 정상이다. 아무 말 없이 건너뛰면 다시 묻는다.
- 코드는 GitHub 웹 편집기로 커밋하고, 테스트는 배포 URL의 `/tests/`에서 돌린다 (배포 전에는 `app/fallback.html` 더블클릭 + SMOKE 3단계 손으로). 웹 편집이 막힐 때만 팀 채널에 붙이고 PM이 커밋한다. Build는 T0로 당일을 보내면 느리다 — 행사 전에 A로 맞추는 것을 권한다.
- **T0 중계 4항목 (CONTRACT §C 7).** 웹 편집이 막혀 팀 채널(Discord)에 변경을 붙여 넣어 소유자에게 반영을 부탁할 때는 맨 위에 네 줄을 반드시 둔다 — `기준 버전:` 커밋 해시 또는 ZIP 받은 시각 · `대상 경로:` 파일과 절(예: `mission/EVIDENCE.md#주장`) · `변경 ID:` 보드 작업 `T<n>` 또는 주장 `E<n>`·`S<n>` · `반영 확인 요청:` 받을 소유자 역할. 소유자가 검토해 그 부분만 반영하고(전체 파일 덮어쓰기 금지) 반영 커밋을 답한다. 넷 중 하나라도 없으면 반영하지 않고 되묻는다.

**왕복 검증 1건 (필수)**

- `/hthn-start`가 `log/<날짜>_build_1.md`를 쓰고 다시 읽은 뒤 `git push`까지 한다.
- 다른 팀원 한 명이 `git pull` 후 그 파일이 보인다고 팀 채널에 답하면 끝이다.
- git이 없으면(T0): `/hthn-start`가 준 log 3줄을 GitHub 웹 편집기로 `log/<날짜>_build_1.md`에 커밋한다 (막히면 팀 채널에 붙이고 PM이 대행 커밋). GitHub 웹에 그 파일이 보이면 끝이다.
- 추가로 GitHub 웹에서 파일 1개 수정·커밋을 1회 해 본다 (당일 T0 쓰기 경로 연습).

## 행사 모드 진입 조건 (당일 08:30)

AI를 처음 부르기 전에 사람이 직접 세 가지를 확인한다 (CONTRACT §C 10 「행사 모드 진입 조건」). `/hthn-start` OPEN이 따로 묻지 않고 확인해 브리핑 첫 줄에 결과를 적고, `log/<날짜>_build_1.md`의 `행사 모드:` 줄로 남긴다 (← `templates/log-entry.md`).

1. 이 클라이언트가 **행사 계정**으로 로그인되어 있다.
2. 행사 계정으로 **최초 허용 호출 1회**가 통과했다 — 시각을 `log/`에 적는다.
3. **개인 계정·타 AI 폴백이 OFF**다.

하나라도 미확인이면 AI 호출을 멈추고 PM에게 알린다 — 확인될 때까지 손으로 할 수 있는 일(원문 읽기·표 채우기)만 한다.

**내 크레딧.** `mission/BOARD.md` 「예산」의 내 행이 내 한도다 (사람별). 잔여 크레딧이 「잔여 중단선」에 닿으면 새 호출을 멈추고 PM에게 🚨 — 나머지는 마지막 수정·검증용으로 남긴다 (CONTRACT §C 9). 한 문제에 재시도 3회라도 총 30분(「시간 상한」)을 넘기지 않는다. 다른 사람의 크레딧·계정을 빌려 쓰지 않는다.

**동기화.** 쓰기 전 `git pull --rebase` → 쓰기 → 내 파일만 `git add <파일>` → commit → push. push가 거절되면 `pull --rebase` 후 다시 — 최대 3회, 그래도 충돌이면 그 파일 소유자가 푼다. AI에게 force-push·`git add -A`를 시키지 않는다. 내가 직접 편집하는 동안에는 이 clone의 AI를 멈춘다 (clone당 쓰기 주체 하나).

## 내 스킬

| 스킬 | 언제 | 무엇을 |
|---|---|---|
| hthn-start | 08:30 · 자리 복귀 · 떠날 때 | 진입·복귀·체크포인트 (전원 필수) |
| demo-build | 10:30–14:00 build · 14:00–14:45 test | SMOKE → tests → 코드 → 배포 → 복구 경로 |
| submit-gate | 14:45 precheck · 15:30–16:00 final | 체크 4·7·10 검사 — 내 `app/`을 보는 1·2·8·9는 하지 않는다 (전원 필수) |

## 내 파일

| 파일 | 언제 쓰나 |
|---|---|
| `app/` 골격 배포 | 10:35 — 고치지 않은 골격 그대로 (URL 먼저) |
| `app/SMOKE.md` | 10:45 (← `templates/SMOKE.md`) — 3단계 각 `기대:` · 2단계에 PRD 3번, 「완료 조건」에 PRD 6번 빈칸 텍스트 그대로 · 「실행 기록」은 배포 URL 결과만 |
| `app/tests/` | 10:45–11:00 — 코드보다 먼저 (`scaffold-core.test.mjs`를 새 핵심 행동 테스트로 교체 · 입력은 `smoke-input.js` 한 곳 · `logic.test.mjs`는 하네스 불변식이라 그대로) |
| `app/` 코드 (`index.html` · `app.js` · `logic.js` · `styles.css` · `data/fixture.json`) | 11:00–14:00 |
| `app/RECOVERY.md` · `app/fallback.html` | G3 직후 RECOVERY 갱신 · 14:00 freeze 때 `node scripts/build_fallback.mjs`로 fallback 재생성 (그 전 fallback 비교 테스트 SKIP은 정상) |
| `app/DEPLOY.md` | 배포 대상이 바뀔 때만 |
| `log/<날짜>_build_<n>.md` | 체크포인트마다 (← `templates/log-entry.md`) |

## 내 시간표

| 시각 | 단계 | 내가 하는 일 | 스킬 | 산출물 · 게이트 |
|---|---|---|---|---|
| 08:30–09:00 | 0 체크인·진입 | `/hthn-start` · 행사 모드 진입 조건 3개 확인 · `node --test app/tests` 한 번 | hthn-start | `log/` 1건 (`행사 모드:` 줄) |
| 09:00–09:00 | 0' 개회·세션 | 환경 최종 점검 · 배포 대상 로그인 확인 | — | — |
| 09:00–09:55 | 1 미션 | 원문 읽기 · 기술 제약(외부 API·사전 코드)을 「미확인」에 제안 | mission-intake intake | — |
| 09:55–10:10 | 2 아이데이션 | 후보마다 "8h 데모 장면"이 13:00까지 되는지 판단 | mission-intake options | — |
| 10:10–10:20 | 3 결정 | 8h 데모 가능성 점수에 의견 | mission-intake decide | (G1 10:20) |
| 10:20–11:00 | 4 보드 | PM과 PRD 3번 문장 확정 → 바로 SMOKE·tests | sprint-board | (G2 10:35) |
| 10:30–14:00 | 5 빌드 | 10:35 골격 배포(빈 배포 URL — G2 조건) → 10:45 SMOKE.md → 11:00 app/tests(red) → 코드(green) → 배포 URL에서 통과 → 14:00 fallback 재생성·RECOVERY | demo-build build | **G3 13:00 보고** · 14:00 freeze |
| 14:00–14:45 | 6 테스트 | 배포 URL에서 SMOKE 3단계 3회 실행 — 실행은 나, 기록은 Sales · 고치기만 · 14:45 submit-gate precheck에서 체크 4·7 드라이런 | demo-build test · submit-gate precheck | (G4 14:45) |
| 14:00–15:30 | 7 피치 | 반론 1개 — 데모 설명이 실제로 도는 것과 같은가 · 스크린샷 1장 전달 | pitch-compile review | (G5 15:30) |
| 15:30–16:00 | 8 제출 | submit-gate final — 체크 4·7·10을 검사해 SUBMISSION 「체크」 검사자 칸에 내 이름 · 해시 3종 중 배포 버전 전달 | submit-gate final | (G6 16:00) |
| 17:00–20:30 | 9 데모데이 (1차 통과 시) | 라이브 데모 4분 · 실패 시 정적 fallback | pitch-compile demoday | `app/RECOVERY.md` |

## 내 TDD

Build의 순서는 고정이다: **SMOKE.md → app/tests → 코드 → 배포 URL에서 통과**. 코드를 먼저 쓰지 않는다.

0. **골격 URL (10:35).** 고치지 않은 골격을 그대로 배포한다 — 새 앱 코드가 아니므로 TDD 순서를 어기지 않는다. 주최 측이 사전 작성 코드를 허용하지 않으면(MISSION 「사실」/「미확인」) 먼저 `app/logic.js`의 `decideNextAction`을 입력을 그대로 돌려주는 echo stub으로 되돌려 커밋한다.
1. **SMOKE 먼저 (10:45).** `templates/SMOKE.md`를 `app/SMOKE.md`로 옮겨 3단계를 쓴다 — ① 페이지가 열린다 ② 입력 → 출력(PRD 4번 문장) ③ 가상 데이터가 로드된다. 각 단계에 `기대:` 한 줄. 2단계 본문에 PRD 3번 문장의 빈칸(핵심 행동) 텍스트를, 「완료 조건」에 PRD 6번 문장의 빈칸 텍스트를 글자 그대로 쓴다 (X-2·X-4). PRD 버전이 오르면 이 둘을 다시 맞춘다.
2. **테스트 red (11:00).** `app/tests/scaffold-core.test.mjs`를 새 핵심 행동 테스트로 바꾸고(T2 `node --test app/tests`) 입력은 `app/tests/smoke-input.js` 한 곳에 넣는다 (브라우저 러너 `app/tests/index.html`도 그 파일을 읽는다). 고칠 파일 전체 목록은 `app/tests/README.md` 「당일 고치는 법」. 이 시점에 실패하는 것이 정상이다 — 실패를 확인하고 커밋한다 (`test(app): smoke 3 steps (red)`). red 실행은 커밋 메시지나 `log/`에 남기고, SMOKE 「실행 기록」에는 배포 URL 결과만 적는다.
3. **코드 green (11:00–13:00).** 순수 로직은 `app/logic.js`, 화면은 `app/app.js`. 테스트가 통과하는 만큼만 쓴다. 테스트가 없는 기능은 만들지 않는다.
4. **배포 URL에서 통과 (G3 13:00).** 로컬 통과는 완료가 아니다. 배포 URL에서 SMOKE 3단계가 통과해야 G3다. 결과를 PM에게 보고하고 커밋 해시를 HANDOFF 「체크포인트」에 남긴다.
5. **freeze (14:00).** `node scripts/build_fallback.mjs`로 `app/fallback.html`을 다시 만들어 fallback 비교 테스트가 SKIP 없이 PASS하게 한다 (submit-gate 체크 8 — node가 없으면 `app/RECOVERY.md` 손 절차, 1b의 file:// 안내 삭제 포함). 이후는 고치기만 한다. 고칠 때마다 테스트 전체를 다시 돌린다. 테스트 회차는 내가 실행하고 Sales가 SUBMISSION 「테스트」에 기록한다.
6. **보드 상태.** 작업 행을 끝내거나 막히면 HANDOFF 「체크포인트」에 `T<n> <상태> · 커밋 <hash> · Build` 한 줄. PM이 BOARD에 옮긴다.

## 막히면

- 같은 문제로 **3번** 고쳐도 실패하면 멈춘다 (repair 3회 규칙). 네 번째 시도는 하지 않는다.
- PM에게 아래 형식으로 **한 결정**만 묻는다 — 대개 "핵심 장면을 더 좁힐까 / 정적 fallback으로 갈까"다. G3가 13:00을 넘기면 기능을 더하지 않고 장면을 좁힌다.

```
🚨 [승인 필요] <한 결정>
선택지: A <…> · B <…> · 보류
근거: <한두 줄 — 실패한 테스트 이름과 세 번의 시도>
```
