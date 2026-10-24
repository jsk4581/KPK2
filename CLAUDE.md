# HTHn — 팀 repo 진입점

> 이 파일은 이 폴더에서 Claude를 열면 자동으로 읽힌다. **이것이 하네스의 전부다** — 설치할 것이 없다.
> HTHn(Hackathon Team Harness)은 4명이 어떤 미션이 와도 같은 7단계·6게이트로 움직여 한 번에 제출하게 하는 팀 운영 틀이다. 제품은 미션이 정한다.

## 읽는 순서

1. `CONTRACT.md` — 목표 · 역할·권한 · 시간표·게이트(G1–G6) · 완료 정의 · git 규약 · 안전·진실 규칙. **당일에는 바꾸지 않는다.**
2. `HANDOFF.md` — 맨 위 `mode`·`stage` 머리 · 지금 단계 · 체크포인트 · 결정 · 제안 · 블로커. 팀 상태의 정본이다.
3. `mission/BOARD.md` — 작업 · 파일 소유 · 예산 · 슬롯. 내 행과 내 파일만 본다. **작업판 정본은 이것 하나다** (루트 `BOARD.md`는 없다). G2(10:35) 전에는 없으므로 브리핑에 "보드 없음 (G2 전)"이라고 쓴다.
4. `roles/<내 역할>.md` — 내 R&R · 환경 세팅 · 내 스킬 · 내 파일 · 내 시간표 · 내 TDD · 막히면.
   역할: `roles/pm.md` · `roles/build.md` · `roles/gtm-pitch.md` · `roles/sales-buyer.md`
5. 개인 지침 `me/` (git에 올라가지 않음) — 있으면 `me/common.md` · `me/env.md` · `me/style.md`를 읽는다.

현재 상태를 채팅 기억으로 판단하지 않는다. 판단 전에 위 파일을 다시 읽는다 (git이 있으면 `git pull --rebase --autostash` 먼저. git이 없으면 ZIP을 새 폴더에 다시 받거나 GitHub 웹에서 HANDOFF.md·`mission/BOARD.md`를 본다).

## 스킬

스킬은 `.claude/skills/<name>/SKILL.md`에 있다. 7개:

| 스킬 | 누가 | 언제 |
|---|---|---|
| `hthn-start` | 전원 필수 | 열 때 · 복귀할 때 · 자리 뜰 때 |
| `mission-intake` | 전원 (PM 주도) | 09:00 미션 → 후보 3 → G1 결정 |
| `sprint-board` | PM | G2 보드 · 재계획 · G3·G4·G5 `integrate` |
| `evidence-research` | GTM·Sales | 시장 근거 · 구매자 시뮬레이션 |
| `demo-build` | Build | SMOKE → tests → 코드 → 배포 · 복구 |
| `pitch-compile` | GTM·피치 | 2장 + 90초 스크립트 · 데모데이 |
| `submit-gate` | 전원 필수 | 제출 전 마지막 관문 (작성자 ≠ 검사자) |

- Claude Code에서는 `/<name>`으로 부른다. 모드가 있는 스킬은 뒤에 붙인다: `/sprint-board integrate` · `/demo-build test` · `/mission-intake decide` · `/hthn-start close`.
- **슬래시가 안 되면** "`.claude/skills/<name>/SKILL.md`를 읽고 그대로 따라 해"라고 말한다. 모드도 같이 말한다 — 예: "`.claude/skills/sprint-board/SKILL.md`를 읽고 integrate 모드로 따라 해".
- `.claude/`는 숨김 폴더다. macOS Finder에서는 Cmd+Shift+. 로 숨김 폴더를 보이게 하거나, GitHub 웹에서 연다.
- 도구가 없어 무언가를 건너뛰면 첫 응답 맨 위에 degrade 블록으로 알린다 (`CONTRACT.md` 「degrade 고지」). 조용히 건너뛰지 않는다.
- Windows에서는 `python3` 대신 `me/env.md`의 `python_cmd`(`python` 또는 `py -3`)로 검증기를 돌린다.

### 웹(T0) 붙여넣기 세트

파일을 못 읽는 환경(claude.ai 웹)에서는 이 세트를 대화에 붙여넣는다 — 모든 역할 공통:
`CLAUDE.md` · `CONTRACT.md` · `HANDOFF.md` · `mission/BOARD.md`(G2 뒤) · `roles/<내 역할>.md` · `templates/me-common.md` · `templates/me-env.md` · `templates/me-style.md` · 쓰려는 스킬의 `SKILL.md`(처음에는 `.claude/skills/hthn-start/SKILL.md`).
claude.ai Project의 지식(Knowledge)에 한 번 올려 두면 세션마다 붙여넣지 않아도 된다 (HANDOFF.md·`mission/BOARD.md`는 바뀌므로 그때그때 새로 붙인다).

### Windows 대응 명령

명령은 Claude에게 시키는 것이 가장 쉽다 (Claude Code는 Git Bash를 쓴다). 직접 칠 때:

| 하려는 것 | macOS · Linux · Git Bash | Windows PowerShell |
|---|---|---|
| 전체 검사 | `bash scripts/check.sh` | Git Bash에서 같은 명령 (Git for Windows에 들어 있다). Git Bash가 없으면 아래 검증기를 하나씩 |
| python 확인 | `python3 --version` | `py -3 --version` 또는 `python --version` → 되는 것을 `me/env.md`의 `python_cmd`에 |
| 검증기 | `python3 scripts/validate_mission.py mission --stage <단계>` | `py -3 scripts\validate_mission.py mission --stage <단계>` |
| 파일 해시 | `shasum -a 256 <파일>` | `certutil -hashfile <파일> SHA256` 또는 `Get-FileHash -Algorithm SHA256 <파일>` |
| URL 확인 | `curl -sI <url>` | `curl.exe -sI <url>` (PowerShell 5.1의 `curl`은 다른 명령이다) |
| 앱 로컬 서버 | `node scripts/serve.mjs` | 같은 명령 → `http://localhost:8000/tests/` |

## 행사 당일 첫 행동

08:30 체크인 직후, 전원 **자기 clone**(사람마다 따로 받은 폴더)에서 Claude를 열고 **`/hthn-start`**를 실행한다.

행사 모드 진입 조건 (`CONTRACT.md` §C 10) — 셋 다 확인되기 전에는 (2번의 확인용 첫 호출 말고는) AI를 호출하지 않는다. `hthn-start`가 결과를 브리핑 첫 줄에 적고 `log/`에 `행사 모드:` 줄로 남긴다.

1. 행사 계정으로 로그인된 클라이언트인지 **사람이 직접** 확인한다 (CLI `/status`, Desktop 설정 → 계정 — AI는 추측하지 않는다).
2. 최초 허용 호출 1회가 행사 계정으로 성공했는지 확인한다.
3. 개인 계정·타 AI 폴백이 꺼져 있는지 확인한다.

미확인이 하나라도 있으면 호출을 멈추고 PM에게 알린다. 그다음 브리핑이 HANDOFF.md와 같은 단계·같은 다음 게이트를 가리키는지 본다.

### 당일 시각 (고정)

**공식 미션 공개 09:40쯤 → 10:00 새 공개 레포 → 10:30 주제·레포 선언 마감** (`docs/event-day-official.md`) · 10:00 슬롯 관측 시작(매시, 13:00부터 30분마다) · **G1** 10:20 · **G2** 10:35(빈 배포 URL 포함) · 12:30 피치 뼈대(`pitch-compile skeleton`) · **G3** 13:00 · 14:00 freeze · **G4** 14:45 + `submit-gate precheck`(제출 없음) · **G5** 15:30 + `submit-gate final` · **G6** 16:00 제출 목표·상한 (16:50 최종 한계 — F1–F5 PASS일 때만). 제출은 1회.

## 규칙 3줄

1. **개인정보 0** — 팀원 연락처(이메일·전화)를 어떤 파일에도 쓰지 않는다. 사람은 역할명(PM·Build·GTM·Sales)이나 이름(성 없이)으로만 부른다.
2. **시뮬레이션은 시뮬레이션이라고 쓴다** — 가상 데이터·구매자 시뮬레이션은 문서에 `[SIMULATION]`, 데이터에 `"_label": "synthetic"`, 화면·발표에 "시뮬레이션"을 붙인다. 하지 않은 인터뷰·계약·사용자 수를 사실처럼 쓰지 않는다.
3. **09:00 이후 타 AI 금지** — 행사 제공 Claude 크레딧만, 행사 계정에서만 쓴다.

## 쓰기 규칙

- 내 소유 파일만 쓴다 (`mission/BOARD.md` 「파일 소유」 · 섹션 소유는 `CONTRACT.md` §C 3). 남의 파일은 `HANDOFF.md` 「제안」에 `작성:<역할> <HH:MM>`으로 적는다.
- clone 하나에 쓰는 주체는 한 번에 하나다. 사람이 직접 편집할 때는 그 clone의 AI를 멈춘다 (§C 2).
- 쓰기 전 `git pull --rebase --autostash`, 쓰고 나서 바로 `git add <내 파일>` + commit + push (거절되면 다시 pull 후 최대 3회, 그래도 충돌이면 그 파일 소유자가 푼다 — §C 1). 커밋 메시지 `type(scope): what`. force-push·`git add -A` 금지. git이 없으면 GitHub 웹 편집기로 커밋하고, Discord로 넘길 때는 기준 버전·대상 경로·변경 ID·반영 확인 요청 4항목을 붙인다 (`CONTRACT.md` §C 7).
- 기존 파일을 통째로 덮어쓰지 않는다. 사람이 고친 것을 되돌리지 않는다.
- 외부 게시·유료 API·계정 생성·공개 push·최종 제출은 `🚨 [승인 필요]` 형식으로 한 결정씩 묻는다.

## 언어

- 팀이 읽는 것(문서·템플릿·역할 키트·게이트 체크리스트·브리핑·답변)은 **한국어**.
- 스킬 절차 지시문(SKILL.md 본문)은 영어, 코드 주석은 영어, 파일·폴더 이름은 영어.
