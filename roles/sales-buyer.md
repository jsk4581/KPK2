# 역할 키트 — Sales·구매자 (기본 담당: 태진)

> 이 파일은 Sales·구매자의 하루 전체다. `/hthn-start`가 이 파일을 읽고 `me/common.md`에 내 스킬·내 파일을 옮긴다. 계약의 정본은 `CONTRACT.md`이고, 당일 최종 파일 소유는 `mission/BOARD.md` 「파일 소유」표가 정한다 (BOARD 정본은 `mission/BOARD.md` 하나 — 루트 BOARD.md는 없다).

## 나의 R&R

- **시뮬레이션 절 소유.** `mission/EVIDENCE.md` 「Buyer simulation」 절의 주인이다 (절 소유 — 「주장」 절은 GTM). 10:20–11:00에는 구매자 관점 주장 후보를 GTM에게 HANDOFF 「제안」으로 넘기고, v2(14:00–14:45)에서 내 절을 채운다.
- **구매자 시뮬레이션.** 14:00–14:45에 배포된 데모로 가상 구매자 2~3명을 돌려 보고, 결과를 전부 `simulation` 라벨과 `[SIMULATION]` 표기로 남긴다.
- **슬롯 관측.** 10:00부터 매시, 13:00부터 30분마다 남은 1차 통과 슬롯 수를 어디서 봤는지(출처)와 함께 `mission/BOARD.md` 「슬롯」표 맨 아래에 한 행 덧붙인다 (append-only — 머리줄·기존 행·BOARD의 다른 절은 PM 소유라 고치지 않는다). **보드가 생기기 전(10:00 — 보드는 10:20–10:35에 생긴다)** 기록은 HANDOFF 「체크포인트」에 `슬롯 <n> · 10:00 · <출처>` 한 줄로 두고, PM이 G2에서 「슬롯」 첫 행으로 옮긴다. 출처는 내가 직접 본 것만(`화면 직접 관측` · `운영진 공지`) — 전해 들은 숫자는 「체크포인트」에 `슬롯 전언 <n> · <시각> · <누구에게서>`. 늦게 적으면 그 회차 시각 그대로 쓰고 출처 끝에 `(HH:MM 늦게 기록)`, 놓친 회차는 `<HH:MM> | 미관측 | -`. 남은 슬롯 ≤ 2이면 즉시 PM에게 🚨 한 결정을 묻는다. 판단은 PM의 몫이다.
- **제출 검사자.** submit-gate 영수증 `mission/SUBMISSION.md`의 작성자(머리 `검사자:`)다. **14:45 precheck**(체크 1–9 드라이런, 제출 없음 — 결과는 「체크」 행과 「테스트」 한 행 둘 다, 예상 FAIL(체크 3·PITCH 빈칸)이 아닌 FAIL은 소유자에게)와 **15:30 final**(10행 전부)을 돌린다. 내 기본 행은 1·2·8·9(데모 URL · SMOKE 3/3 · 복구 경로 · 해시·커밋), 3·5·6은 PM, 4·7·10은 Build가 검사하고 확정·제출은 PM이 한다. PASS면 16:00 전이라도 바로 PM에게 넘긴다.
- **하지 않는 것.** 시뮬레이션을 고객 인터뷰·파일럿·사용자 수로 부르지 않는다. 남의 말만 듣고 체크를 PASS로 적지 않는다 — 열고, 돌리고, 검색한다.

## 환경 세팅 (행사 전)

행사 전(10/22~23)에 한 번 끝까지 통과한다. 권고는 A(Claude Code CLI)다 — submit-gate의 검증기·PII 스캔을 바로 돌릴 수 있다.

**A. Claude Code CLI (권고)**

1. 설치는 공식 문서만 따른다: https://code.claude.com/docs/en/setup — 블로그·남이 준 스크립트로 설치하지 않는다.
2. 팀 repo를 받는다: `git clone https://github.com/Roykoo83/hthn.git` (private — 초대 수락 후. repo 생성·초대는 승인 대기 중이며, 열리면 팀 채널에 공지된다).
3. 받은 폴더에서 한 번만: `git config pull.rebase true && git config rebase.autoStash true` (커밋 안 한 변경이 있어도 pull이 멈추지 않게). 그다음 `claude`를 실행한다. `CLAUDE.md`가 자동으로 읽힌다.
4. `/hthn-start`를 입력하고 역할 질문에 `sales-buyer`를 고른다. `me/` 아래에 3블록이 생긴다.
5. Sales 검증 (submit-gate 연습): `python3 scripts/validate_mission.py tests/fixtures/missions/good-01 --stage submit` → `FAIL` 0줄 (제출 직전 영수증). 같은 명령을 `tests/fixtures/missions/bad-01`에 돌려 `FAIL` 줄이 나오는 것을 본다 — 검사자는 FAIL을 찾는 사람이다. 마지막으로 `python3 scripts/pii_scan.py .` → `hits=0` (SKIPPED 줄이 있으면 그 파일은 미검사다).

**B. Claude Desktop 대안**

1. 공식 다운로드 페이지에서 설치: https://claude.ai/download
2. 앱의 Code 탭에서 받은 repo 폴더를 연다 (git이 없으면 GitHub 웹에서 ZIP으로 받아 푼다).
3. `/hthn-start`가 목록에 없으면 "`.claude/skills/hthn-start/SKILL.md`를 읽고 따라"라고 입력한다 (Desktop의 슬래시 자동 인식은 아직 미검증).
4. python이 없으면 `.claude/skills/submit-gate/SKILL.md`의 체크리스트 10항목을 `tests/fixtures/missions/good-01/`에 대해 직접 읽어 판정하고, 그 사실을 「체크」 증거 칸에 "수동 점검"으로 적는 연습을 한다.

**Windows** — 명령은 Claude에게 시키거나(Claude Code는 Git Bash를 쓴다) `CLAUDE.md` 「Windows 대응 명령」 표의 PowerShell 명령을 쓴다 (`python3` 대신 `py -3`, 해시는 `certutil -hashfile <파일> SHA256`, `curl` 대신 `curl.exe`).

**T0 — 파일 읽기만으로 (셸·git 없음)**

- claude.ai 웹 등 파일 접근이 없으면 `CLAUDE.md` 「웹(T0) 붙여넣기 세트」를 대화에 붙여넣는다 (claude.ai Project 지식에 한 번 올려 두면 매번 붙이지 않아도 된다). 이 역할에서 쓰려는 스킬: hthn-start · evidence-research · submit-gate (+ `templates/SUBMISSION.md`).
- AI가 첫 응답 맨 위에 degrade 블록을 내야 정상이다. 아무 말 없이 건너뛰면 다시 묻는다. 발표 파일 해시는 사람이 터미널에서 구한다 — macOS `shasum -a 256 <파일>` · Windows `certutil -hashfile <파일> SHA256`. 해시 도구를 전혀 못 쓸 때만 크기·수정 시각을 쓰고 그 사실을 증거 칸에 적는다.
- 결과 파일은 GitHub 웹 편집기로 커밋한다 — 브라우저에서 repo → 파일 → 연필(Edit) → Commit changes → `main` (새 파일은 Add file → Create new file). 웹 편집이 막힐 때만 팀 채널에 붙이고 PM이 커밋한다. `mission/SUBMISSION.md`·`mission/EVIDENCE.md`는 Discord 2000자 제한을 넘기 쉬우니 웹 편집이 기본이다.
- **T0 중계 4항목 (CONTRACT §C 7).** 웹 편집이 막혀 팀 채널(Discord)에 변경을 붙여 넣어 소유자에게 반영을 부탁할 때는 맨 위에 네 줄을 반드시 둔다 — `기준 버전:` 커밋 해시 또는 ZIP 받은 시각 · `대상 경로:` 파일과 절(예: `mission/EVIDENCE.md#주장`) · `변경 ID:` 보드 작업 `T<n>` 또는 주장 `E<n>`·`S<n>` · `반영 확인 요청:` 받을 소유자 역할. 소유자가 검토해 그 부분만 반영하고(전체 파일 덮어쓰기 금지) 반영 커밋을 답한다. 넷 중 하나라도 없으면 반영하지 않고 되묻는다.

**왕복 검증 1건 (필수)**

- `/hthn-start`가 `log/<날짜>_sales-buyer_1.md`를 쓰고 다시 읽은 뒤 `git push`까지 한다.
- 다른 팀원 한 명이 `git pull` 후 그 파일이 보인다고 팀 채널에 답하면 끝이다.
- git이 없으면(T0): `/hthn-start`가 준 log 3줄을 GitHub 웹 편집기로 `log/<날짜>_sales-buyer_1.md`에 커밋한다 (막히면 팀 채널에 붙이고 PM이 대행 커밋). GitHub 웹에 그 파일이 보이면 끝이다.
- 추가로 GitHub 웹에서 파일 1개 수정·커밋을 1회 해 본다 (당일 T0 쓰기 경로 연습).

## 행사 모드 진입 조건 (당일 08:30)

AI를 처음 부르기 전에 사람이 직접 세 가지를 확인한다 (CONTRACT §C 10 「행사 모드 진입 조건」). `/hthn-start` OPEN이 따로 묻지 않고 확인해 브리핑 첫 줄에 결과를 적고, `log/<날짜>_sales-buyer_1.md`의 `행사 모드:` 줄로 남긴다 (← `templates/log-entry.md`).

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
| evidence-research (market 보조 · simulation) | 10:20–11:00 · 14:00–14:45 | 구매자 주장 후보 → GTM 「제안」 · 구매자 시뮬레이션 v2 (내 절) |
| submit-gate | 14:45 precheck · 15:30–16:00 final | 영수증 작성 · 체크 1·2·8·9 검사 (전원 필수) |

## 내 파일

| 파일 | 언제 쓰나 |
|---|---|
| `mission/EVIDENCE.md` 「Buyer simulation」 절 | v2 14:00–14:45 — 첫 줄 인용문 유지 · ID `S<n>` (← `templates/EVIDENCE.md`) |
| `mission/SUBMISSION.md` | 「테스트」 14:00부터 · 14:45 precheck 결과 · 「체크」 이하 15:30–16:00 (← `templates/SUBMISSION.md`) |
| `mission/BOARD.md` 「슬롯」표 행 추가 (append-only) | 10:00부터 매시 · 13:00부터 30분마다 · 열 시각·남은 슬롯·출처 — 머리줄·기존 행·다른 절은 PM 소유 |
| `log/<날짜>_sales-buyer_<n>.md` | 체크포인트마다 (← `templates/log-entry.md`) |

## 내 시간표

| 시각 | 단계 | 내가 하는 일 | 스킬 | 산출물 · 게이트 |
|---|---|---|---|---|
| 08:30–09:00 | 0 체크인·진입 | `/hthn-start` · 행사 모드 진입 조건 3개 확인 | hthn-start | `log/` 1건 (`행사 모드:` 줄) |
| 09:00–09:00 | 0' 개회·세션 | 환경 최종 점검 · 제출 창구·슬롯 표시 위치 확인 | — | — |
| 09:00–09:55 | 1 미션 | 원문의 제출물·마감 조건을 읽는다 | mission-intake intake | — |
| 09:55–10:10 | 2 아이데이션 | 후보마다 "누가 왜 돈을 내나" 한 문장 | mission-intake options | — |
| 10:10–10:20 | 3 결정 | 구매 이유 점수에 의견 | mission-intake decide | (G1 10:20) |
| 10:20–11:00 | 4 근거 v1 | 구매자 관점 주장 후보를 GTM에게 HANDOFF 「제안」으로 (`작성:Sales <HH:MM>`) · 가상 페르소나 2~3개 초안 | evidence-research market (보조) | GTM의 `mission/EVIDENCE.md#주장` v1 |
| 10:00 | 슬롯 관측 1 | 보드가 아직 없다 → HANDOFF 「체크포인트」에 `슬롯 <n> · 10:00 · <출처>` (G2에서 PM이 옮긴다) | — | HANDOFF 「체크포인트」 |
| 11:00–16:00 | 슬롯 관측 | 11:00 · 12:00 · 13:00 · 13:30 · 14:00 · 14:30 · 15:00 · 15:30 · 16:00에 남은 슬롯 수와 출처 한 행 추가 · ≤ 2이면 즉시 PM에게 🚨 | — | `mission/BOARD.md` 「슬롯」 |
| 14:00–14:45 | 6 테스트·시뮬레이션 | 준서(Build)가 배포 URL에서 SMOKE 3회 실행 → 내가 SUBMISSION 「테스트」에 기록 · 가상 구매자 2~3명 시뮬레이션 | demo-build test · evidence-research simulation | SUBMISSION 「테스트」 · EVIDENCE v2 |
| 14:45 | 6' 제출 사전 점검 | submit-gate precheck — 체크 1–9 드라이런(제출 없음 · 체크 9는 HANDOFF stage까지만) · 결과를 「체크」 행 + 「테스트」 한 행 · FAIL·NOT_RUN은 소유자에게 `#<번호> — <무엇> — <누가>` | submit-gate precheck | **G4 14:45 보고** |
| 14:30 · 15:00 | 슬롯 (잊지 않기) | 테스트·precheck 중에도 「슬롯」 한 행씩 — 14:30, 15:00 | — | `mission/BOARD.md` 「슬롯」 |
| 14:45–15:00 | 7 피치 review | 반론 1개 — 시뮬레이션 결과로 본 구매 이유 (precheck 소유자 전달 뒤, 15:00까지 GTM에게) | pitch-compile review | PITCH 「반론과 수정」 |
| 15:30–16:00 | 8 제출 | submit-gate final — 체크 1·2·8·9는 내가, 3·5·6은 PM, 4·7·10은 Build가 검사 → 영수증 → PM에게 (PASS면 16:00 전이라도) | submit-gate final | `mission/SUBMISSION.md` · (G6 16:00) |
| 17:00–20:30 | 9 데모데이 (1차 통과 시) | 예상 질문 중 구매자·가격 질문 답 준비 | pitch-compile demoday | DEMODAY 「예상 질문 10」 참여 |

## 내 TDD

Sales의 테스트는 "시뮬레이션이 시뮬레이션으로 보이는가"와 "제출 전 검사가 실제로 돌았는가"다.

1. **시뮬레이션 표기.** EVIDENCE 「Buyer simulation」 절 첫 줄은 `> 구매 의사의 증거가 아님 — 발표에서도 simulation 라벨 유지` 그대로다 (C-E4). 표의 모든 행은 ID `S<n>` · 페르소나 칸에 `[SIMULATION]` · 라벨 `simulation`이다 (C-E3). T2: `python3 scripts/validate_mission.py mission --stage evidence` → `FAIL` 0줄.
2. **슬롯 관측.** 10:00부터 매시, 13:00부터 30분마다 빠짐없이 「슬롯」표에 `시각 | 남은 슬롯 | 출처` 한 행씩 덧붙인다 (출처 = 어디서 본 숫자인가 — 접수 화면·운영진 공지 등). 10:00은 보드가 없으니 HANDOFF 「체크포인트」에 `슬롯 <n> · 10:00 · <출처>`. 빈 회차는 `<HH:MM> | 미관측 | -` 행으로, 늦은 기록은 출처 끝 `(HH:MM 늦게 기록)`으로 적는다 (검증기 C-B5가 HH:MM 순서와 0–8 또는 `미관측`을 본다). 기록은 판단이 아니다 — 단 ≤ 2이면 바로 PM에게 🚨.
3. **테스트 기록 (G4).** 배포 URL에서 SMOKE 3단계를 돌린 회차를 SUBMISSION 「테스트」에 1행 이상 남긴다 — 회차 · 시각 · 통과 단계 · 실패 · 조치.
4. **submit-gate — precheck(14:45) → final(15:30).** precheck는 체크 1–9를 드라이런만 하고 제출하지 않는다 — 결과를 「체크」 행과 「테스트」 한 행에 둘 다 남기고, 14:45에 예상된 FAIL(체크 3 — 2장 파일은 G5에 내보냄 · PITCH 빈칸)을 뺀 FAIL·NOT_RUN을 소유자에게 보낸다. 체크 9는 HANDOFF `stage:`까지만 검사한다(`RESULT event-mission`). final은 10행 전부. 기본 행별 검사자: 1·2·8·9 나(내가 만들지 않은 `app/`) · 3·5·6 PM · 4·7·10 Build, 확정은 PM. #5 라벨은 내가 검사하지 않는다 — 「Buyer simulation」 절 소유자는 #5 검사자가 될 수 없다 (X-5). 나는 영수증 작성자(머리 `검사자:`)이고 PM은 확정자다 — 보통 다른 사람이지만 검증하지는 않는다 (행 단위 규칙은 X-5). NOT_RUN은 FAIL과 같다 — 같은 커밋의 CI 결과 링크로만 해소한다. T2: `python3 scripts/validate_mission.py mission --stage submit` → `FAIL` 0줄 · `python3 scripts/pii_scan.py .` → 0건. T0: 체크리스트를 직접 읽고 증거 칸에 "수동 점검". 첫 FAIL에서 멈추고 소유자에게 `#<번호> FAIL — <무엇> — <누가 고치나>` 한 줄. FAIL이 하나라도 있으면 판정은 approve가 아니다.

5. **보드 상태.** 작업 행을 끝내거나 막히면 HANDOFF 「체크포인트」에 `T<n> <상태> · 커밋 <hash> · Sales` 한 줄. PM이 BOARD에 옮긴다 (나는 BOARD의 「슬롯」 행만 덧붙인다).

## 막히면

- 같은 문제로 **3번** 막히면(예: 데모 URL이 계속 안 열림, 라벨 근거가 끝내 없음) 멈춘다.
- PM에게 아래 형식으로 **한 결정**만 묻는다 — 대개 "알려진 결함으로 적고 approve-with-defects로 낼까 / 더 고칠까"다. 면제 불가 1·3·4·5·10은 어떤 경우에도 PASS여야 한다. 16:00 이후에도 판정이 나오면 즉시 내고, 16:50이 최종 한계다.

```
🚨 [승인 필요] <한 결정>
선택지: A <…> · B <…> · 보류
근거: <한두 줄 — 체크 번호와 증거>
```
