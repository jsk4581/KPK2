# 역할 키트 — PM (기본 담당: 우영)

> 이 파일은 PM의 하루 전체다. `/hthn-start`가 이 파일을 읽고 `me/common.md`에 내 스킬·내 파일을 옮긴다. 계약의 정본은 `CONTRACT.md`이고, 당일 최종 파일 소유는 `mission/BOARD.md` 「파일 소유」표가 정한다 (BOARD 정본은 `mission/BOARD.md` 하나 — 루트 BOARD.md는 없다).

## 나의 R&R

- **결정자.** G1(10:20) 제품 결정 하나와 G6(16:00) 제출 확정 하나는 내가 내린다. HANDOFF.md 「제안」을 「결정」으로 올리는 것도 나다.
- **역산 보드.** G2(10:35)까지 `mission/BOARD.md`를 만든다 — 작업 `T<n>` 한 행에 담당 1명, 파일(또는 절) 하나에 소유자 1명과 쓰기 규칙, 사람별 예산(잔여 중단선 · 시간 상한).
- **PRD 버전.** G2 뒤에 PRD를 바꾸면 `버전: v<n> (<HH:MM>)`의 n을 올리고, HANDOFF 「결정」에 바뀐 문장을 적고, 영향받는 `app/SMOKE.md`(Build)·`mission/PITCH.md`(GTM) 소유자의 다시 확인(✓)을 받는다. ✓가 없으면 integrate를 통과시키지 않는다.
- **통합.** G3·G4·G5에서 `/sprint-board integrate`로 PRD ↔ 데모 ↔ 근거 ↔ 피치가 같은 이야기를 하는지 본다. 어긋남은 내가 고치지 않고 「제안」으로 소유자에게 보낸다.
- **검사자 배정·확정.** submit-gate 행별 검사자 기본값은 1·2·8·9 Sales · 3·5·6 PM(나) · 4·7·10 Build이고 확정은 내가 한다. 사람이 빠지면 X-5(검사자 ≠ 그 행 산출물 소유자)를 지키는 대체자를 내가 정한다.
- **하지 않는 것.** 남의 파일을 직접 고치지 않는다. 영수증 작성자(SUBMISSION 머리 `검사자:`)가 되지 않는다 — 나는 확정자다. 제출은 AI가 아니라 내가 손으로 한다.

## 환경 세팅 (행사 전)

행사 전(10/22~23)에 한 번 끝까지 통과한다. 권고는 A(Claude Code CLI)다 — 슬래시 스킬·git·셸이 한 번에 되어 네 명의 환경이 같아진다.

**A. Claude Code CLI (권고)**

1. 설치는 공식 문서만 따른다: https://code.claude.com/docs/en/setup — 블로그·남이 준 스크립트로 설치하지 않는다.
2. 팀 repo를 받는다: `git clone https://github.com/Roykoo83/hthn.git` (private — 초대 수락 후. repo 생성·초대는 승인 대기 중이며, 열리면 팀 채널에 공지된다).
3. 받은 폴더에서 한 번만: `git config pull.rebase true && git config rebase.autoStash true` (커밋 안 한 변경이 있어도 pull이 멈추지 않게). 그다음 `claude`를 실행한다. `CLAUDE.md`가 자동으로 읽힌다.
4. `/hthn-start`를 입력하고 역할 질문에 `pm`을 고른다. `me/` 아래에 3블록(`[HTHn 공통]`·`[내 환경]`·`[나의 방식]`)이 생긴다.
5. PM 검증: `bash scripts/check.sh` → 마지막 줄 `CHECK 상태: PASS` (`NOT_RUN`이 뜨면 PASS가 아니다 — 무엇이 안 돌았는지 본다). 그리고 `python3 scripts/validate_mission.py tests/fixtures/missions/good-01 --stage submit` → 마지막 줄 `SUMMARY ... fail=0` (제출 직전 영수증 모양을 눈으로 익힌다).

**B. Claude Desktop 대안**

1. 공식 다운로드 페이지에서 설치: https://claude.ai/download
2. 앱의 Code 탭에서 받은 repo 폴더를 연다 (git이 없으면 GitHub 웹에서 ZIP으로 받아 푼다).
3. `/hthn-start`가 목록에 없으면 "`.claude/skills/hthn-start/SKILL.md`를 읽고 따라"라고 입력한다 (Desktop의 슬래시 자동 인식은 아직 미검증).
4. 위 A의 5번 검증을 Code 탭에서 그대로 돌린다. python이 없으면 검증기 대신 `tests/fixtures/missions/good-01/`을 열어 계약 규칙을 눈으로 읽는다 — "수동 점검"으로 표기.

**Windows** — 명령은 Claude에게 시키거나(Claude Code는 Git Bash를 쓴다) `CLAUDE.md` 「Windows 대응 명령」 표의 PowerShell 명령을 쓴다 (`python3` 대신 `py -3`, 해시는 `certutil -hashfile <파일> SHA256`, `curl` 대신 `curl.exe`).

**T0 — 파일 읽기만으로 (셸·git 없음)**

- claude.ai 웹 등 파일 접근이 없으면 `CLAUDE.md` 「웹(T0) 붙여넣기 세트」를 대화에 붙여넣는다 (claude.ai Project 지식에 한 번 올려 두면 매번 붙이지 않아도 된다). 이 역할에서 쓰려는 스킬: hthn-start · mission-intake · sprint-board · submit-gate. 그리고 "hthn-start OPEN을 해줘"라고 한다.
- AI가 첫 응답 맨 위에 degrade 블록(`[이 환경에는 git이 없습니다]` …)을 내야 정상이다. 아무 말 없이 건너뛰면 다시 묻는다.
- 결과 파일은 GitHub 웹 편집기로 커밋한다 — 브라우저에서 repo → 파일 → 연필(Edit) → Commit changes → `main` (새 파일은 Add file → Create new file). 웹 편집이 막힐 때만 팀 채널에 붙이고 PM이 커밋한다. 웹 편집도 못 하는 팀원의 변경은 팀 채널로 받아 PM인 내가 대신 커밋한다 (14:00–16:00은 내가 가장 바쁘다 — 그 전에 팀원들이 웹 편집을 연습하게 한다).
- **T0 중계 4항목 (CONTRACT §C 7).** 웹 편집이 막혀 팀 채널(Discord)에 변경을 붙여 넣어 소유자에게 반영을 부탁할 때는 맨 위에 네 줄을 반드시 둔다 — `기준 버전:` 커밋 해시 또는 ZIP 받은 시각 · `대상 경로:` 파일과 절(예: `mission/EVIDENCE.md#주장`) · `변경 ID:` 보드 작업 `T<n>` 또는 주장 `E<n>`·`S<n>` · `반영 확인 요청:` 받을 소유자 역할. 소유자가 검토해 그 부분만 반영하고(전체 파일 덮어쓰기 금지) 반영 커밋을 답한다. 넷 중 하나라도 없으면 반영하지 않고 되묻는다.

**왕복 검증 1건 (필수)**

- `/hthn-start`가 `log/<날짜>_pm_1.md`를 쓰고 다시 읽은 뒤 `git push`까지 한다.
- 다른 팀원 한 명이 `git pull` 후 그 파일이 보인다고 팀 채널에 답하면 끝이다.
- git이 없으면(T0): `/hthn-start`가 준 log 3줄을 GitHub 웹 편집기로 `log/<날짜>_pm_1.md`에 커밋한다 (막히면 팀 채널에 붙이고 PM이 대행 커밋). GitHub 웹에 그 파일이 보이면 끝이다.
- 추가로 GitHub 웹에서 파일 1개 수정·커밋을 1회 해 본다 (당일 T0 쓰기 경로 연습).

## 행사 모드 진입 조건 (당일 08:30)

AI를 처음 부르기 전에 사람이 직접 세 가지를 확인한다 (CONTRACT §C 10 「행사 모드 진입 조건」). `/hthn-start` OPEN이 따로 묻지 않고 확인해 브리핑 첫 줄에 결과를 적고, `log/<날짜>_pm_1.md`의 `행사 모드:` 줄로 남긴다 (← `templates/log-entry.md`).

1. 이 클라이언트가 **행사 계정**으로 로그인되어 있다.
2. 행사 계정으로 **최초 허용 호출 1회**가 통과했다 — 시각을 `log/`에 적는다.
3. **개인 계정·타 AI 폴백이 OFF**다.

하나라도 미확인이면 AI 호출을 멈추고 팀 채널에 알린다 — 확인될 때까지 손으로 할 수 있는 일(원문 붙여넣기·표 채우기)만 한다.

**내 크레딧.** `mission/BOARD.md` 「예산」의 내 행이 내 한도다 (사람별). 잔여 크레딧이 「잔여 중단선」에 닿으면 새 호출을 멈추고 PM에게 🚨 — 나머지는 마지막 수정·검증용으로 남긴다 (CONTRACT §C 9). 한 문제에 재시도 3회라도 총 30분(「시간 상한」)을 넘기지 않는다. 다른 사람의 크레딧·계정을 빌려 쓰지 않는다.

**동기화.** 쓰기 전 `git pull --rebase` → 쓰기 → 내 파일만 `git add <파일>` → commit → push. push가 거절되면 `pull --rebase` 후 다시 — 최대 3회, 그래도 충돌이면 그 파일 소유자가 푼다. AI에게 force-push·`git add -A`를 시키지 않는다. 내가 직접 편집하는 동안에는 이 clone의 AI를 멈춘다 (clone당 쓰기 주체 하나).

## 내 스킬

| 스킬 | 언제 | 무엇을 |
|---|---|---|
| hthn-start | 08:30 · 자리 복귀 · 떠날 때 | 진입·복귀·체크포인트 (전원 필수) |
| mission-intake | 09:00–10:20 | intake → options → decide · G1 결정 |
| sprint-board | 10:20–10:35 · G3·G4·G5 integrate · 게이트 15분 지연 시 | 역산 보드 · 파일(절) 소유 · 사람별 예산 · 정합 점검 · PRD 버전 ✓ 확인 |
| submit-gate | 14:45 precheck 확인 · 15:30–16:00 final | 체크 3·5·6 검사 · 영수증 확정·제출 (전원 필수 · 나는 확정자) |

## 내 파일

| 파일 | 언제 쓰나 |
|---|---|
| `mission/MISSION.md` | 09:00–10:10 (← `templates/MISSION.md`) |
| `mission/DECISION.md` | 10:10–10:20 (← `templates/DECISION.md`) |
| `mission/PRD.md` | 10:10–10:20, G1 이후에는 범위 좁히기만 · G2 뒤 변경은 버전 규칙(버전 n+1 · HANDOFF 「결정」 · SMOKE·PITCH 소유자 ✓) (← `templates/PRD.md`) |
| `mission/BOARD.md` (정본 — 루트 BOARD.md는 만들지 않는다) | 10:20–10:35, 재계획 때, integrate 때 작업 상태 옮기기 (← `templates/BOARD.md`) — 예외: 「슬롯」 행 추가는 Sales (append-only) |
| `HANDOFF.md` `mode`·`stage` 줄 · 「현재 단계」「결정」 | 09:00 `mode: event` · 게이트마다 `stage` (intake → decide → board → evidence → pitch → submit) · 리허설 뒤 `pre_event`로 되돌림 |
| `log/<날짜>_pm_<n>.md` | 체크포인트마다 (← `templates/log-entry.md`) |

## 내 시간표

| 시각 | 단계 | 내가 하는 일 | 스킬 | 산출물 · 게이트 |
|---|---|---|---|---|
| 08:30–09:00 | 0 체크인·진입 | `/hthn-start` · 4명 브리핑이 같은 단계·다음 게이트를 가리키는지, 4명 모두 행사 모드 진입 조건 3개를 확인했는지(브리핑 첫 줄·`log/` `행사 모드:` 줄) 본다 · 미확인자는 호출 중지 | hthn-start | `log/` 1건 (`행사 모드:` 줄) |
| 09:00–09:00 | 0' 개회·세션 | 환경 최종 점검 · `docs/prior-hypothesis.md` 재독 | — | — |
| 09:40–10:05 | 1 미션 | HANDOFF `mode: event` · 원문 그대로 붙여넣기 · 사실/해석/미확인 분리 (주도) · **10:00 `scripts/bootstrap_public_repo.sh <이름>`으로 새 공개 레포 생성(첫 커밋 = pre-event 태그) → 팀원 재clone** · **10:30까지 제출 페이지 「주제 선언」**(한 줄 아이디어·타깃 해외 시장·레포 URL) | mission-intake intake | `mission/MISSION.md` |
| 09:55–10:10 | 2 아이데이션 | 진행자 — 라운드 3회, 후보 정확히 3개 | mission-intake options | MISSION 「후보」 |
| 10:10–10:20 | 3 결정 | 점수 → 결정 · PRD 6문장 · C·U·T 3 PASS | mission-intake decide | `DECISION.md` · `PRD.md` · **G1 10:20** |
| 10:20–11:00 | 4 보드 | 역산 보드 · 파일(절) 소유 · 사람별 예산 (Build와 PRD 3번 문장 맞추기) · 빈 배포 URL 확인 | sprint-board | `mission/BOARD.md` · **G2 10:35** |
| 10:30–14:00 | 5 빌드 | Build 질문에 범위 결정만 · 12:30 GTM 피치 뼈대 확인 · 13:00 integrate | sprint-board integrate | **G3 13:00 확인** · 14:00 freeze 선언 |
| 14:00–14:45 | 6 테스트·시뮬레이션 | 테스트 기록·시뮬레이션 표기 확인 · 14:45 submit-gate precheck(체크 1–9 드라이런) 결과 확인 · 내 행 3·5·6 드라이런 · integrate | sprint-board integrate · submit-gate precheck | **G4 14:45 확인** |
| 14:00–15:30 | 7 피치 | 반론 1개(범위 정직성) · 15:30 integrate | pitch-compile review | **G5 15:30 확인** |
| 15:30–16:00 | 8 제출 | submit-gate final에서 체크 3·5·6 검사 → 검사자 영수증 확인 → approve(또는 approve-with-defects + 내 `PM 승인:`)면 G6 `approved` → 즉시 손으로 제출 → G6 `submitted`. 응답 없음·타임아웃은 실패가 아니다 — 재전송 금지, 접수 화면·운영진에게 상태를 먼저 확인하고 접수 확인(스크린샷 또는 번호)을 SUBMISSION 「제출」에 적는다 | submit-gate | **G6 16:00 목표** · 최종 한계 16:50 |
| 17:00–20:30 | 9 데모데이 (1차 통과 시) | 요청·팀 구간 발표 · Q&A 보조 | pitch-compile demoday | `mission/DEMODAY.md` 참여 |

## 내 TDD

PM의 테스트는 "결정과 보드가 계약을 만족하는가"다. 확인을 먼저 정하고 그다음 쓴다.

1. **PRD — G1 전에 green.** `mission/PRD.md` 6문장이 틀 그대로이고 빈칸 0, `## C·U·T` 세 줄이 전부 `PASS`. T2: `python3 scripts/validate_mission.py mission --stage decide` → `FAIL` 0줄. T0: mission-intake 「Self-check」의 규칙 15개(S-dup-heading · C-M1–M4 · C-D1–D6 · C-P1–P4)를 읽어서 "수동 점검 n/15"로 적는다. 하나라도 FAIL이면 3번 문장을 좁히거나 5번 문장에 더하고 다시 돌린다.
2. **BOARD 정합 — G2 전에 green.** `--stage board` → 게이트 G1~G6 행(G1–G5는 todo/doing/done/blocked, G6은 `ready`) · 작업 `#`가 `T<n>`으로 겹치지 않고 행마다 담당 1명(이름) · 의존이 `-` 또는 있는 T 번호이고 순환 없음 · 「파일 소유」 필수 행(`mission/EVIDENCE.md#주장`·`#Buyer simulation`·`HANDOFF.md#제안` 같은 절 행 포함)과 쓰기 규칙(`소유자만`·`append-only`) · 「예산」 사람별 4행 · 「슬롯」 열 `시각|남은 슬롯|출처`. 같은 파일(절)에 소유자가 둘이면 red다 (예외: 「슬롯」 행 추가는 Sales).
3. **통합 — G3·G4·G5에서 `/sprint-board integrate`.**
   - G3: PRD 3번 문장의 빈칸 텍스트가 `app/SMOKE.md`에, 6번 빈칸 텍스트가 SMOKE 「완료 조건」에 그대로 있다 (X-2·X-4) · 배포 URL에서 `app/tests` 통과 보고가 있다 · PRD 버전이 올랐다면 SMOKE·PITCH 소유자 ✓가 HANDOFF에 있다.
   - G4: SUBMISSION 「테스트」에 1회 이상 기록 · EVIDENCE 시뮬레이션 표의 라벨이 전부 `simulation`.
   - G5: PITCH 「라벨 점검」의 모든 주장이 EVIDENCE 「주장」 표에 있다 (X-1) · `--stage pitch` FAIL 0.
   - 먼저 HANDOFF 「체크포인트」의 `T<n> <상태>` 줄을 BOARD 「작업」 상태 칸으로 옮긴다 (BOARD의 쓰기 주체는 나 하나).
   - 어긋나면 내가 고치지 않는다. HANDOFF.md 「제안」에 `파일 · 어긋난 점 · 소유자`를 한 줄로 적고, 팀 채널로 소유자에게 `[integrate G<n>] <파일> → <역할>` 한 줄을 보낸다.
4. **제출 — G6.** BOARD 「게이트」 G1~G5가 전부 `done`이 아니면 approve를 확정하지 않는다 (X-3). G6은 게이트가 아니라 제출 자체다 — 판정이 나오면 내가 `approved`, 제출한 뒤 `submitted`로 바꾼다. 체크 3·5·6은 내가 검사하고 확정도 내가 한다 (CONTRACT §C 5 — 검사자 ≠ 확정자 규칙은 v1.1에서 폐기). 대신 체크 행마다 검사자 칸이 그 행 산출물 소유자와 다른지 본다 (X-5, 역할명이든 이름이든 같은 사람으로 본다). 해시 3종(소스 커밋 · 배포 버전 · 발표 파일 sha256) 중 하나라도 바뀌었으면 판정을 다시 받는다. approve-with-defects는 면제 불가 1·3·4·5·10이 PASS이고 나머지 결함이 전부 「알려진 결함」에 있을 때만 `PM 승인:` 줄을 쓴다.

## 막히면

- 같은 문제로 **3번** 막히면 고치기를 멈춘다. 결정자는 나이므로, 선택지를 둘로 줄여 HANDOFF.md 「결정」에 시각과 함께 바로 적고 팀 채널에 한 줄 알린다.
- 게이트가 15분 이상 밀리면 `/sprint-board`를 다시 돌린다. 범위를 줄이지, 제출 시각(16:00)을 늦추지 않는다.
- Sales가 "남은 슬롯 ≤ 2"로 🚨를 보내면 바로 답한다 — A: 지금 submit-gate → F1–F5 PASS면 approve-with-defects로 제출 · B: 계속. 답은 HANDOFF 「결정」에.
- 외부 게시·유료 API·계정 생성·공개 push는 혼자 정하지 않는다 — 아래 형식으로 한 결정씩 묻고, 답이 오기 전에는 실행하지 않는다. **내가 묻는 🚨의 답은 다른 팀원 1명**(기본 Build, Build가 그 실행 담당이면 Sales)이 10분 안에 ✓/✗로 한다. 「결정」에 `결정자: PM · 확인: <역할>(<이름>) ✓`로 적고, 10분 안에 답이 없으면 `보류`다 (`CONTRACT.md` 「승인 형식」). T2 첫 공개 배포(sprint-board 7단계)는 행사 전 `docs/READINESS.md` R8로 미리 승인해 두면 당일 다시 묻지 않는다. 답을 기다리는 🚨는 HANDOFF 「블로커」에 한 번만 적는다.

```
🚨 [승인 필요] <한 결정>
선택지: A <…> · B <…> · 보류
근거: <한두 줄 — 파일 경로나 검증 결과>
```
