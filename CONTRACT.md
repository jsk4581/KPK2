# CONTRACT — HTHn 팀 계약

상태: specified (리허설 전) · v1.1 (레드팀 반영, 2026-10-20)

> 이 파일은 ①층 계약이다. 팀 전원과 각자의 Claude가 가장 먼저 읽는다.
> 누가 무엇을 결정하고, 언제 무엇을 확인하며, 무엇이 "완료"인지를 정한다. 당일에는 바꾸지 않는다.
> 상태 승격(specified → manual-pilot)은 사람 4명이 동시에 도는 리허설 1회를 통과해야 한다. 시뮬레이션 eval은 승격 근거가 아니다. 행사 준비 완료 체크는 `docs/READINESS.md` (마감 10/23 20:00).

## 목표

**2026-10-24(토) 09:00 미션 공개부터 16:00 제출까지, 어떤 미션이 와도 4명이 같은 7단계·6게이트로 움직여 submit-gate PASS 상태의 데모 링크 + 2장 발표자료를 한 번에 제출한다.**

- 제품은 미리 정하지 않는다. 미션이 정한다. 사전 가설은 `docs/prior-hypothesis.md`에만 있고 자동으로 승격되지 않는다.
- 이 repo는 세 구역이다: **코어**(계약·스킬·템플릿·검증기 — 당일 바꾸지 않음) · **오버레이** `mission/`(09:00 이후 생성) · **제품** `app/`(그날 만든 데모).
- 상태의 정본은 git이다(HANDOFF.md · `mission/BOARD.md` · `mission/`). Discord는 대화, git은 상태.
- **작업판 정본은 `mission/BOARD.md` 하나다.** 루트 `BOARD.md`는 만들지 않는다(있으면 삭제). G2(10:35) 전에는 보드가 없다 — 브리핑은 "보드 없음 (G2 전)".
- **팀명:** 행사 등록 팀명 — 미확인 (`docs/READINESS.md` R9에서 PM이 확인해 이 줄을 고친다. 당일 mission-intake가 MISSION 「제출물」 `팀명:` 줄로 옮기고, submit-gate 체크 7이 그 줄을 쓴다).

## 역할·권한표

권한은 네 층이다. 한 사람이 여러 층을 가질 수 있다 (예: 우영은 결정자이자 PM 리드).

| 권한 | 누가 | 결정 | 실행 | 검사 |
|---|---|---|---|---|
| 결정자 | PM(우영) | G1 제품 결정 · G6 제출 확정 · 「제안」→「결정」 승격 | — | — |
| 리드 | 워크스트림별 리드 (아래 기본 배치) | 자기 영역 범위 | 자기 소유 파일 | 남의 영역에 대한 submit-gate 검사 |
| 실행 | 사람 + 그의 AI | — | `mission/BOARD.md`에서 내 이름이 적힌 소유 파일만 | — |
| 코파일럿 | 각자의 Claude | 제안만 (HANDOFF.md 「제안」) | 지시받은 파일만 | 자기 산출물 self-check (검증기·체크리스트) |

### 기본 배치 (당일 병렬 실행의 출발점. 고정 직무가 아니다)

| 역할 | 기본 담당 | 주 스킬 | 역할 키트 | 기본 소유 파일 |
|---|---|---|---|---|
| PM | 우영 | hthn-start · mission-intake · sprint-board · submit-gate(확정) | `roles/pm.md` | `mission/MISSION.md` · `mission/DECISION.md` · `mission/PRD.md` · `mission/BOARD.md`(「슬롯」 행 추가만 Sales) · HANDOFF.md `mode`·`stage` 머리와 「현재 단계」「결정」 · 제출(§C 8) |
| Build | 준서 | hthn-start · demo-build · submit-gate | `roles/build.md` | `app/` 전체 (`app/SMOKE.md` · `app/tests/` · `app/RECOVERY.md` 포함) |
| GTM·피치 | 곤살로 | hthn-start · evidence-research(market) · pitch-compile | `roles/gtm-pitch.md` | `mission/EVIDENCE.md#주장`(제목 줄 포함) · `mission/PITCH.md` · `mission/DEMODAY.md` · 2장 발표 파일 `pitch/slides.pdf` (MISSION 「제출물」이 PPTX를 요구하면 `pitch/slides.pptx`) |
| Sales·구매자 | 태진 | hthn-start · evidence-research(simulation) · submit-gate(검사) | `roles/sales-buyer.md` | `mission/EVIDENCE.md#Buyer simulation` · `mission/SUBMISSION.md` · `mission/BOARD.md` 「슬롯」 행 추가 (append-only · 10:00부터 매시, 13:00부터 30분마다) |

- **최종 파일 소유는 당일 `mission/BOARD.md` 「파일 소유」표가 정한다.** 위 표는 기본값이다. 섹션 단위 소유는 §C 3.
- 소유하지 않은 파일은 쓰지 않는다. 고칠 것이 있으면 HANDOFF.md 「제안」에 적는다.
- 모두가 덧붙일 수 있는 곳: HANDOFF.md 「체크포인트」「제안」「블로커」(덧붙이기만 — **그 절의 끝**, 다음 `##` 바로 위. 파일 맨 끝이 아니다 · 남의 줄 수정 금지 · 「제안」은 `작성:<역할> <HH:MM>`) · `log/`의 자기 파일.

## 당일 시간표·게이트표

### 시간표 (7단계 + 진입·제출·데모데이 = 10행)

| # | 단계 | 목표 시각 | 스킬 | 주 담당 → 참여 | 산출물 |
|---|---|---|---|---|---|
| 0 | 체크인·진입 | 08:30–09:00 | hthn-start | 전원 | 브리핑 · `log/` 1건 · 행사 크레딧 계정 확인 |
| 0' | 개회·Anthropic 세션 | 09:00–09:40 | — | 전원 | 환경 최종 점검 · `docs/prior-hypothesis.md` 재독 · **공식 미션 공개는 09:40쯤**(`docs/event-day-official.md`) |
| 1 | 미션 | 09:40–10:05 (공개 즉시) | mission-intake (intake) | 우영 → 전원 | `mission/MISSION.md` (VC 6곳 주제 중 선택) |
| 2 | 아이데이션 | 10:05–10:12 | mission-intake (options) | 전원 | 후보 3개 (MISSION.md 「후보」) |
| 3 | PMF 필터 → 결정 | 10:12–10:20 | mission-intake (decide) | 전원 → 우영 결정 | `mission/DECISION.md` · `mission/PRD.md` (6문장 + C·U·T) |
| 3' | **공개 레포 + 주제 선언** | 10:00 레포 · **10:30 선언 마감** | `scripts/bootstrap_public_repo.sh` → 제출 페이지 「1. 주제 선언」 | 우영 (준서 보조) | 새 공개 레포 URL(첫 커밋 = pre-event 태그) · 선언 3칸: 한 줄 아이디어 · 타깃 해외 시장(국가·고객) · 공개 GitHub 레포 |
| 4 | PRD 확정 + 보드 ‖ 시장 근거 | 10:20–11:00 | sprint-board ‖ evidence-research (market) | 우영·준서 ‖ 곤살로·태진 | `mission/BOARD.md` · 빈 배포 URL · `mission/EVIDENCE.md` v1 |
| 5 | 빌드 | 10:30–14:00 | demo-build (build) | 준서 → 우영 | `app/SMOKE.md` → `app/tests/` → 코드 → 배포 URL · `app/RECOVERY.md` |
| 6 | MVP 테스트 + 구매자 시뮬레이션 | 14:00–14:45 | demo-build (test) ‖ evidence-research (simulation) | 태진 (준서 테스트 실행 보조) | `mission/EVIDENCE.md` v2 (시뮬레이션 표기) · `mission/SUBMISSION.md` 「테스트」 |
| 7 | 피치 | 12:30 뼈대 · 14:00–15:30 | pitch-compile (skeleton → v1 → review → final) | 곤살로 → 전원 반론 1개씩 | 12:30 2장 뼈대 + 주장 ID 목록 → `mission/PITCH.md` → 2장 파일 + 90초 스크립트 |
| 8 | 제출 | 14:45 precheck · 15:30–16:00 final | submit-gate (precheck → final) | 항목별 검사자(§C 5) → 우영 확정·제출 | `mission/SUBMISSION.md` (체크·해시·판정·접수 확인) |
| 9 | 데모데이 = 샤크탱크 (결선 8팀) | 17:00–19:00 준비 → 19:00–20:30 | pitch-compile (demoday) | 곤살로 → 전원 | `mission/DEMODAY.md` — **발표 3분 영어 + Q&A 7분 한국어**, VC 6곳, 각자 노트북·HDMI 어댑터, **앱은 21:00까지 켜 둔다** |

### 게이트표 (G1–G6 + 비트)

G 행이 게이트(BOARD 「게이트」 행과 같다), `비트` 행은 게이트가 아닌 고정 점검 시각이다. 상태 칸은 BOARD에만 있다.

| 게이트 | 시각 | 확인하는 것 | 소관 스킬 | 확인자 |
|---|---|---|---|---|
| 관측 | 10:00부터 매시 → 13:00부터 30분마다 | 화면의 남은 1차 통과 슬롯 수 1행 — `mission/BOARD.md` 「슬롯」(`시각\|남은 슬롯\|출처`). 출처는 직접 본 것만(`화면 직접 관측` · `운영진 공지`) — 전해 들은 숫자("3개래")는 행이 아니라 HANDOFF 「체크포인트」에 `슬롯 전언 <n> · <시각> · <누구에게서>`로 두고, 누가 화면을 보면 행으로 적는다. 늦게 적으면 출처 끝에 `(HH:MM 늦게 기록)`, 놓친 회차는 `<HH:MM> \| 미관측 \| -`. 보드가 없는 10:00 기록은 HANDOFF 「체크포인트」에 `슬롯 <n> · <시각> · <출처>`로 두고 G2에서 PM이 첫 행으로 옮긴다. 남은 슬롯 ≤ 2이면 즉시 PM에게 🚨 | sprint-board (Sales append) | 태진 기록 → 우영 판단 |
| G1 | 10:20 | 후보 3 → 결정 1 · PRD 6문장이 C·U·T 전부 PASS · PRD `버전: v1` · `validate_mission.py --stage decide` | mission-intake | 우영(결정자) |
| G2 | 10:35 | `mission/BOARD.md` 작업표·파일 소유표 확정 (한 파일 한 소유자, 섹션 소유 §C 3) · 사람별 예산표 · **빈 배포 URL 존재**(demo-build가 골격을 먼저 배포 — 첫 공개 배포는 행사 전 사전 승인(READINESS R8)이 있으면 그것으로, 없으면 🚨 승인 — 아래 「승인 형식」의 PM 요청 규칙) · `--stage board` | sprint-board | 우영(PM) |
| 비트 | 12:30 | `pitch-compile skeleton` — 2장 뼈대 + 쓰일 주장 ID 목록(EVIDENCE `E<n>`). 제출이 일찍 필요해져도 피치가 0에서 시작하지 않게 한다 | pitch-compile | 곤살로 → 우영 확인 |
| G3 | 13:00 | 핵심 장면(PRD 3번 문장) 1개가 배포 URL에서 작동 · `app/tests` 통과 · `RECOVERY.md` 「지금 상태」 갱신 | demo-build | 준서 보고 → 우영 확인 |
| 비트 | 14:00 | **빌드 freeze** — 이후 고치기만 · `fallback.html` 재동기화 · `git tag good-<HHMM>` | demo-build | 준서 → 우영 확인 |
| G4 | 14:45 | MVP 테스트 기록(SUBMISSION 「테스트」) + EVIDENCE v2의 시뮬레이션 표기 (`--stage evidence`) | demo-build | 태진 보고 → 우영 확인 |
| 비트 | 14:45 | `submit-gate precheck` — 체크 1~9 드라이런, 제출 없음. FAIL·NOT_RUN 목록을 소유자에게 「제안」으로 | submit-gate | 항목별 검사자(§C 5) → 우영 |
| G5 | 15:30 | 2장 + 90초 스크립트 확정 · 숫자마다 라벨 · Slide 3 없음 · `--stage pitch` → 이어서 `submit-gate final` 시작 | pitch-compile | 곤살로 보고 → 우영 확인 |
| G6 | 16:00 | submit-gate final 10항목 · **G1~G5 전부 done**(X-3, G6 자신은 요구하지 않는다) · 판정 approve(10항목 PASS) 또는 approve-with-defects(F1–F5 PASS + 알려진 결함 + `PM 승인:`) · 검사자 ≠ 작성자(X-5) · `--stage submit` → 제출 1회. G6 상태는 `ready → approved → submitted` | submit-gate | 항목별 검사자 → 우영 확정·제출 |

게이트 운영 규칙:

- **14:00 빌드 freeze.** 이후는 고치기만 한다. G3 이후 기능을 더하지 않는다.
- **G1이 10:20을 넘기면** 우영이 후보 중 "8h 데모 가능성" 점수가 가장 높은 것을 강제 선택한다.
- **G3가 13:00을 넘기면** 핵심 장면을 더 좁힌다. 기능을 더하지 않는다.
- 게이트가 15분 이상 밀리면 sprint-board를 다시 돌린다. 범위를 줄이지, 제출 시각을 늦추지 않는다.
- **submit-gate PASS 즉시 제출, 16:00이 목표·상한.** 아래 「제출 시각과 면제 불가 요건 (A6)」.
- **남은 슬롯 ≤ 2이면** Sales가 즉시 PM에게 🚨 한 결정을 묻는다 — A: 지금 submit-gate를 돌려 F1–F5가 PASS면 approve-with-defects로 바로 제출 · B: 계속 진행. 답은 HANDOFF 「결정」에 시각과 함께 적는다.
- 16:00–16:50은 예외 구간이지 계획이 아니다. 버퍼를 계획에 쓰지 않는다.
- 통합 점검: G3·G4·G5에서 PM이 `/sprint-board integrate`로 PRD ↔ 데모 ↔ 근거 ↔ 피치 정합을 확인하고, 어긋남은 「제안」으로 해당 소유자에게 보낸다.

### 제출 시각과 면제 불가 요건 (A6)

| 시각 | 규칙 |
|---|---|
| ~16:00 | **16:00이 목표이자 상한이다.** submit-gate 판정이 approve 또는 approve-with-defects가 되는 순간 낸다 — 15:00에 PASS면 15:00에 낸다 |
| 16:00–16:50 | 예외 구간이지 계획이 아니다. F1–F5가 모두 PASS인 경우에만, 판정이 나오는 즉시 낸다. 늦은 시각 자체는 FAIL이 아니라 「알려진 결함」으로 적는다 |
| 16:50 | **최종 한계** (창구 17:00). 그 뒤에는 내지 않는다 |

**면제 불가 F1–F5** (요건) — 어떤 시각에도, 누구의 승인으로도 면제하지 않는다. 하나라도 FAIL 또는 NOT_RUN이면 판정은 revise 또는 fail이다.

| 요건 | 내용 | submit-gate 체크 |
|---|---|---|
| F1 | 데모 URL이 외부에서 접근된다 (로그인 없이, 팀 노트북이 아닌 다른 기기에서) | 1 데모 URL 접근 |
| F2 | 발표 파일이 2장 이내다 (페이지 ≤ 2) | 3 2장 파일 |
| F3 | 개인정보(PII) 0 | 4 개인정보 0 |
| F4 | 시뮬레이션·라벨 표기 (화면·2장·문서) | 5 라벨·시뮬레이션 표기 |
| F5 | 타 AI 미사용 — 행사 모드 4/4 (§C 10) · 16:50 이전 · 창구 열림 | 10 시각·슬롯 |

- **approve-with-defects**: 기능 결함(체크 2·6·7·8·9)이 FAIL 또는 NOT_RUN이면 그 번호를 SUBMISSION `## 알려진 결함`에 전부 적고, PM이 `PM 승인:` 줄을 쓰면 판정 `approve-with-defects`로 제출할 수 있다.
- **NOT_RUN은 PASS가 아니다.** submit-gate는 NOT_RUN을 FAIL과 같이 취급한다. 로컬에서 못 돌린 검사는 **같은 커밋**의 CI 결과(GitHub Actions 로그 링크)를 증거 칸에 붙여야만 PASS로 바뀐다.

## 완료 정의

"완료했습니다"는 완료가 아니다. **파일이 있고 검증 기록이 있어야 완료다.**

| 대상 | 완료 조건 |
|---|---|
| 게이트 1개 | 게이트표의 "확인하는 것"을 만족하는 파일이 커밋되어 있고, `mission/BOARD.md` 「게이트」 행 상태가 `done`(G6은 `submitted`)이며 확인자가 확인했다 |
| 작업 1행 | `mission/BOARD.md` 작업 행의 소유 파일이 커밋되어 있고 상태가 `done` (담당이 HANDOFF 「체크포인트」에 `T<n> done · 커밋`을 알리고 PM이 옮긴다) |
| 데모 | 배포 URL에서 `app/SMOKE.md` 3단계가 통과하고, 그 기록이 SUBMISSION 「테스트」에 있다 |
| 발표자료 | 2장 이내 · 모든 숫자에 라벨 또는 `[시뮬레이션]` · PITCH.md와 내용이 같다 |
| **제출** | `mission/SUBMISSION.md` 판정 `approve`(체크 10행 전부 PASS) 또는 `approve-with-defects`(F1–F5 = 체크 1·3·4·5·10 PASS · 나머지 FAIL·NOT_RUN 전부 「알려진 결함」 · `PM 승인:`) · BOARD G1~G5 done · 항목별 검사자 ≠ 작성자 · 해시 3종 기록(§C 6) · PM이 1회 제출하고 접수 확인 저장(§C 8) · 16:50 최종 한계 |
| 하네스 (오늘 밤 기준) | `scripts/check.sh` 마지막 줄 `CHECK 상태: PASS`(exit 0 — 필수 검사 NOT_RUN은 exit 2, PASS 아님) 또는 같은 커밋의 CI(`scripts/ci.sh`) 통과. 단 상태는 사람 4명 동시 리허설 전까지 `specified` |
| 행사 준비 완료 | `docs/READINESS.md` 체크 전부 ✓ (마감 10/23 20:00). 야간 로컬 green은 행사 준비 완료가 아니다 |

## git 통합 규약 (§C)

> v1.1에서 C 1–10으로 다시 묶었다. 스킬·역할 키트가 말하는 "CONTRACT §git"은 이 절이다.

1. **동기화 루프.** 처음 한 번: `git config pull.rebase true && git config rebase.autoStash true`. 그 뒤 매번: 쓰기 전 `git pull --rebase --autostash`(읽기 전에도) → 편집 → `git add <내 파일>` → `git commit` → `git push`. push가 거절되면(non-fast-forward) `pull --rebase` 후 다시 push — **최대 3회**. 그래도 충돌이면 멈추고 **그 파일 소유자가 푼다** (소유자가 아니면 내 변경을 버리고 HANDOFF 「제안」으로 옮긴다). 로컬에 쌓아 두지 않는다. AI는 force-push·`git add -A`·`git add .`을 쓰지 않는다.
2. **clone당 쓰기 주체 하나.** 사람마다 자기 clone(작업 폴더)을 따로 쓴다. 한 clone의 쓰기·커밋 주체는 한 번에 하나다 — 사람이 직접 편집할 때는 그 clone의 AI를 멈추고, AI가 쓰는 동안 사람은 편집하지 않는다. 상대의 미완성 변경을 같이 커밋하지 않기 위해서다.
3. **섹션 소유.** 기본은 한 파일 한 소유자(`mission/BOARD.md` 「파일 소유」표, 쓰기 규칙 `소유자만|append-only`). 섹션 단위 예외: `mission/EVIDENCE.md#주장` = GTM · `mission/EVIDENCE.md#Buyer simulation` = Sales · `mission/BOARD.md` = PM (단 `## 슬롯` 행 추가는 Sales, append-only — 머리줄·기존 행 수정 금지) · `HANDOFF.md#제안` = 전원 append-only (각 항목에 `작성:<역할> <HH:MM>` · 충돌 시 양쪽 다 보존 — `.gitattributes` union 병합). HANDOFF 「체크포인트」「블로커」도 전원 append-only.
4. **PRD 버전.** `mission/PRD.md` 첫 줄 뒤 `버전: v<n> (<HH:MM>)`. G2(10:35) 뒤 PRD를 바꾸면 PM이 n을 올리고 HANDOFF 「결정」에 기록하며, 영향받는 `app/SMOKE.md`(Build)·`mission/PITCH.md`(GTM)를 그 소유자가 다시 확인(✓)한다. 재확인 전에는 submit-gate 체크 2·6을 PASS로 적지 않는다.
5. **검사자 배정.** submit-gate 체크마다 검사자 ≠ 그 항목의 작성자(검증기 X-5). 기본: 체크 1·2·8·9 = Sales, 3·5·6 = PM, 4·7·10 = Build. 체크 5는 `mission/EVIDENCE.md#Buyer simulation` 소유자도 검사하지 않는다. 확정(판정·제출)은 PM.
6. **해시 대상.** SUBMISSION 머리 줄 셋 — `소스 커밋:`(git 커밋 해시) · `배포 버전:`(배포 ID, 또는 배포 시각 + 커밋) · `발표 파일 sha256:`. 판정 뒤 셋 중 하나라도 바뀌면 **판정은 무효**이고 submit-gate를 다시 돈다. 같은 커밋 해시를 HANDOFF 「체크포인트」에도 남긴다.
7. **T0 중계 (git 없는 팀원).** 기본은 GitHub 웹 편집기다 — repo → 파일 → 연필(Edit) → Commit changes → `main` (새 파일은 Add file → Create new file). Discord 붙여넣기는 짧은 변경이거나 웹 편집이 막혔을 때만 쓰고, 그때 4항목이 필수다: `기준 버전(커밋 또는 ZIP 시각)` · `대상 경로` · `변경 ID` · `반영 확인 요청`. 파일 전체 덮어쓰기가 아니라 **그 파일 소유자가 검토해 반영**하고 반영 커밋을 답한다. degrade 고지 필수, 체크포인트는 커밋 해시 대신 수정 시각.
8. **제출 절차.** 제출 담당은 PM 1명. 형식·용량 확인(2장 파일 · 페이지 ≤ 2) → 제출 1회 → 접수 확인(스크린샷 또는 접수 ID)을 SUBMISSION 「제출」 `접수 확인:`에 저장. **타임아웃은 실패가 아니다** — 재전송하지 않고 접수 상태를 먼저 확인한다 (팀당 1회 · 재제출 불가). 채널 요청이 제출을 자동으로 일으키지 않는다.
9. **개인별 크레딧.** `mission/BOARD.md` 「예산」은 사람별 4행 (`사람|세션 수|모델|잔여 중단선|시간 상한`). 잔여가 중단선에 닿으면 그 사람은 호출을 멈추고 PM에게 🚨. 같은 실패에 대한 재시도는 3회까지, 합쳐서 **30분 상한** — 넘으면 멈추고 범위를 줄인다.
10. **행사 모드 진입 조건.** 4명 각자 ① 행사 계정으로 로그인된 Claude 클라이언트 (`hthn-start`가 묻지 않고 클라이언트가 보여 주는 증거로만 확인한다. AI는 추측하지 않는다 — 증거가 없으면 `미확인`, 그때 사람이 CLI `/status` 또는 Desktop 설정 → 계정을 직접 확인해 PM에게 보고) ② 최초 허용 호출 1회 성공 확인 (`log/`에 `행사 모드:` 줄로 기록) ③ 개인 계정·타 AI 폴백 OFF. 하나라도 미확인이면 그 사람은 AI 호출을 멈추고 PM에게 알린다. 행사 당일 `hthn-start` OPEN이 이 3개를 묻지 않고 확인해 브리핑 첫 줄과 `log/`에 `행사 모드: ① 행사 계정 <yes|미확인> · ② 최초 허용 호출 <HH:MM|미확인> · ③ 개인 계정·타 AI 폴백 <off|on|미확인>` 한 줄로 적는다 (형식은 `log/README.md`). submit-gate 체크 10이 4/4를 본다 (F5).
   **리허설.** 행사일(2026-10-24)이 아닌 날 HANDOFF 머리에 `rehearsal: true`가 있으면 리허설이다 (행사일에는 이 줄을 쓰지 않는다 — check.sh가 FAIL). 리허설에는 행사 계정이 없으므로 ①은 생길 수 없다. 줄은 `행사 모드: 리허설 — ① 행사 계정 해당 없음 · ② 최초 허용 호출 <HH:MM|미확인> · ③ 개인 계정·타 AI 폴백 <off|on|미확인> (판정만 기록, 호출 중단 없음)`이고, ③이 `on`일 때만 호출을 멈춘다. submit-gate 체크 10은 리허설에서 `NOT_RUN` · 증거 `[SIMULATION 대체] 리허설 — 행사 모드 줄 n/4`이다 (검증기가 이 표시의 PASS를 막는다). 그래서 리허설 판정은 approve가 될 수 없다 — **리허설 합격 = 체크 10 말고 전부 PASS + 정직한 판정 `revise`.**

### git 세부 규칙

- **트렁크 하나.** 브랜치는 `main` 하나만 쓴다. 기능 브랜치·PR 없음 (당일 8시간에는 머지 비용이 더 크다).
- **커밋 메시지 `type(scope): what`.** type ∈ `feat` `fix` `docs` `test` `chore`. 예: `feat(mission): G1 decision` · `test(app): smoke 3 steps` · `chore(log): open pm`.
- **force-push 금지.** `git push --force`·`git reset --hard origin/...`로 남의 커밋을 지우지 않는다. 되돌릴 때는 `git revert`.
- **작업 상태.** `mission/BOARD.md` 「작업」 행의 상태(todo→doing→done·blocked)는 그 행의 담당이 HANDOFF 「체크포인트」에 `T<n> <상태> · 커밋 <hash> · <역할>` 한 줄로 알리고, PM이 BOARD에 옮긴다 (`/sprint-board integrate`와 PM 복귀 때). BOARD의 쓰기 주체는 PM 하나다 (「슬롯」 행만 Sales).
- **사전 준비물 기록.** 행사 당일 10:00에 PM이 `scripts/bootstrap_public_repo.sh <repo-name>`으로 **새 공개 레포**를 만든다(단일 첫 커밋 = 하네스 반입, 그 커밋에 `pre-event` 태그). 제품 코드는 그 뒤에만 쓴다. 제출 영수증 체크 9가 `git diff --stat pre-event..HEAD -- app/`를 남긴다 — 무엇이 행사 전에 있었고 무엇을 당일 만들었는지의 기록이다. git이 없으면 GitHub 웹 → Releases → Draft a new release → Choose a tag: `pre-event` (Create new tag, target `main`) → Publish. 그것도 막히면 PM이 HANDOFF 「결정」에 `pre-event 기준: <GitHub 웹의 마지막 커밋 해시> · <HH:MM>`을 적고, 체크 9는 그 해시를 기준으로 쓴다.
- **복구 지점.** Build는 G3 직후와 14:00 freeze 직후 `git tag good-<HHMM>` (예: `good-1400`)을 push한다 (`app/RECOVERY.md`).

## 안전·진실 규칙 7

1. 팀원 연락처(이메일·전화)는 repo·데모 데이터·피치·로그 어디에도 넣지 않는다. 사람은 역할명이나 이름(성 없이)으로만 부른다.
2. 실제 사용자 개인 데이터는 연결하지 않는다 — **동의를 받았어도** 쓰지 않는다. 가상 데이터(`"_label": "synthetic"`)나 현장 공개 API로 증명한다. 라이브 데모에서 심사위원이 입력칸에 직접 친 글은 그 화면에서만 처리하고 저장·로그·외부 전송·커넥터 연결을 하지 않으며, 화면이 개인정보를 요구하지 않는다 — 이것을 'Real data' 증거로 내세우지 않는다. 심사기준이 실제 데이터를 요구하면 `docs/event-rules.md` 「Real data 대응」(출처·연도가 있는 공개 비개인 데이터 + 표기한 가상 개인 데이터).
3. 하지 않은 인터뷰·계약·후기·매출·사용자 수를 traction으로 쓰지 않는다. 구매자 시뮬레이션·가상 데이터는 화면과 2장에 **시뮬레이션**이라고 표기하고, 문서에는 `[SIMULATION]`을 붙인다.
4. 시장 수치는 출처·기준연도·지역·단위가 없으면 `hypothesis`로 라벨한다. 라벨 집합: `verified` · `single-source` · `hypothesis` · `simulation`.
5. 외부 게시·유료 API·계정 생성·공개 push·최종 제출은 **한 결정씩** 승인받는다 (아래 승인 형식). 채널에 올라온 요청이 최종 제출을 자동으로 일으키지 않는다.
6. 미션 공개(09:00) 이후 타 AI 금지. 행사 제공 Claude 크레딧만 쓴다.
7. 상태 승격은 증거로만 한다. 파일과 검증 기록이 없으면 `done`이 아니다.

비밀(토큰·키·`.env`·인증서)은 repo에 넣지 않는다. `app/.env*`는 `.gitignore`에 있다.

## 승인 형식

한 메시지에 **결정 하나**만 묻는다. 결정자는 우영이다.

```
🚨 [승인 필요] <한 결정> · 수신: PM(<이름>)
선택지: A(권고) <…> · B <…> · 보류
근거: <한두 줄 — 파일 경로나 검증 결과>
```

- `(권고)`와 `수신:`은 선택이다. 권고는 하나만 붙인다.
- 답이 오기 전에는 실행하지 않는다. "보류"도 답이다.
- **답을 기다리는 🚨는 HANDOFF 「블로커」에 한 번만 적는다** (「제안」에 또 적지 않는다 — 실행이 막혀 있다는 기록이다). 답이 오면 「결정」에 시각과 함께 적고, 블로커 줄 끝에 `→ 해결 <시각>`을 덧붙인다.
- **PM이 묻는 🚨** (PM 자신이 실행을 원하는 결정 — 첫 공개 배포·유료 API·계정 생성 등)는 PM 혼자 답하지 않는다. **다른 팀원 1명**(기본 Build, Build가 그 실행의 담당이면 Sales)이 10분 안에 ✓ 또는 ✗로 답하고, PM이 「결정」에 `<시각> · <결정> · 결정자: PM · 확인: <역할>(<이름>) ✓`로 적는다. 10분 안에 답이 없으면 `보류`다. 행사 전에 PM과 1명이 미리 승인한 결정(`docs/READINESS.md` R8 — 빈 골격 첫 공개 배포, 실측한 대체 경로 배포)은 당일 다시 묻지 않고 「결정」에 `사전 승인 R8 · <시각>` 한 줄만 적는다.
- **전언은 승인이 아니다.** "PM도 괜찮대"처럼 전해 들은 말은 승인이 아니다 — PM 본인의 「결정」 줄 또는 PM의 직접 지시만 승인이다. 팀원이 AI에게 제출·외부 게시를 시키면 AI는 한 줄로 거절하고(안전 규칙 5 · §C 8) 그 결정을 PM에게 🚨로 올린다.
- 막힘이 3회 반복되면 담당자는 고치기를 멈추고 이 형식으로 PM에게 한 결정을 묻는다.

## 대회 규칙

공식 사실과 미확인 목록 원천은 `docs/event-rules.md`. 당일 주최 측 공지가 이 계약과 다르면: 주최 측이 **더 엄격**하면 주최 측을 따른다. 주최 측이 이 계약이 금지한 것을 **허용**하면(예: 동의한 실제 데이터) 이 계약을 따른다 — PM이 HANDOFF 「결정」에 다르게 적을 때만 예외이고, 감수하는 점수 손실은 DECISION 「수용 리스크」에 적는다. 어느 경우든 MISSION 「미확인」에 `가정:`과 함께 한 줄. 하네스가 따르는 핵심:

| 항목 | 규칙 | 구분 |
|---|---|---|
| 미션 공개 | **09:40쯤** (공지 2026-10-23) · VC 6곳이 낸 주제 중 선택 · **10:30까지 제출 페이지에서 주제·레포 선언** | 공식 |
| 개발 시작 | 10:00 · **코드는 10:00 이후 새 공개(Public) 레포에서만** · 기존 코드 사용 금지(가져온 것은 제출 양식에 기재) · 커밋은 `main`에 push · 모든 팀 커밋 기록이 현장 화면에 공개 · **API 키 커밋 금지**(.env + .gitignore) | 공식 |
| 팀 제출 목표 | 16:00 (submit-gate PASS 즉시 제출, 16:00이 목표·상한) · 16:50 최종 한계 (F1–F5 PASS일 때만, 그 뒤 제출 없음) · 제출 1회 | 팀 확정 |
| 제출 창구 | 10:00–17:00 · 제출 순서대로 VC 심사(늦어도 15:00부터 본격) · **VC 3곳 PASS = 결선 · 3곳 FAIL = 탈락** · 결선 8팀이 차는 순간 마감 · 실시간 현황은 제출 페이지 | 공식 |
| 제출 횟수 | 팀당 1회 · 재제출 불가 · 타임아웃 시 재전송 금지 (접수 상태를 먼저 확인) | 공식 |
| 제출물 | 양식 9칸: 서비스 이름 · 한 줄 소개 · 타깃 해외 시장 · 데모 링크 · 데모 사용법(VC가 먼저 볼 것 3줄, 테스트 계정) · 발표자료 PDF 2장 이내(16:9, 모든 장 하단 로고 띠, `templates/slide-kit/`) · 오늘 새로 만든 부분(한 줄) · 기존 코드 가져옴 체크 + 내용 · 재제출 불가 확인 — 페이지 https://ambition-for-korea.vercel.app/submit | 공식 |
| 크레딧 | 1인당 Console 프로모션 크레딧 $500(30일) · **Claude Code와 배포 앱의 API 호출 모두 가능**(주최 FAQ) · 각자 조직 또는 한 조직 합산 가능(합산은 Start 티어 월 $500 상한 때문에 비권장) · 개발·AI 기능은 이 크레딧으로 | 공식 |
| 타 AI | 팀 규칙: 금지 — 행사 제공 Claude만. 공식: 개발·AI 기능은 Claude 크레딧으로, 디자인·영상 같은 **주변 툴은 자유(비용 자부담)** — 완화는 PM이 HANDOFF 「결정」에 적을 때만 | 팀 확정 |
| 행사 모드 | 진입 조건 §C 10 — 4명 각자 행사 계정 로그인(사람이 직접 확인) · 최초 허용 호출 1회 확인(`log/` `행사 모드:` 줄) · 개인 계정·타 AI 폴백 off. submit-gate 체크 10이 4/4를 본다 | 팀 확정 |

## degrade 고지

**조용한 degrade 금지.** "작동 불가"와 "통과"는 다른 보고다. 도구가 없어서 무언가를 건너뛰면, 첫 응답 맨 위에 한 블록으로 알린다.

```
[이 환경에는 <없는 것>이 없습니다]
 → <대신 하는 것>. 결과는 같고 조금 느립니다.
 → 건너뛴 것: <빠진 것>
```

- 모든 스킬은 `requires`가 비어 있다(T0). 셸·git·python·node는 있으면 빨라질 뿐이다.
- degrade 블록이 뜬 사람은 무엇이 빠졌는지 팀 채널에 한 줄 올린다.
- 검증기를 못 돌리는 환경이면 체크리스트를 직접 읽어 판정하고, 그 사실을 SUBMISSION 「체크」 증거 칸에 적는다.

## 상태

상태: specified (리허설 전)

| 단계 | 조건 | 현재 |
|---|---|---|
| specified | 설계·파일·테스트가 있다 | ✓ |
| manual-pilot | 사람 4명이 각자 환경에서 **동시에** 도는 리허설 1회 통과 (4명 온보딩 · 브리핑 · degrade 고지 · push 경쟁 · G1~G6 · submit-gate). 시뮬레이션은 근거가 아니다 | 미실시 |
| implemented | 실제 행사에서 사용 | — |
| verified | 행사 결과·회고로 확인 | — |
