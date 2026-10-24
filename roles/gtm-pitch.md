# 역할 키트 — GTM·피치 (기본 담당: 곤살로)

> 이 파일은 GTM·피치의 하루 전체다. `/hthn-start`가 이 파일을 읽고 `me/common.md`에 내 스킬·내 파일을 옮긴다. 계약의 정본은 `CONTRACT.md`이고, 당일 최종 파일 소유는 `mission/BOARD.md` 「파일 소유」표가 정한다 (BOARD 정본은 `mission/BOARD.md` 하나 — 루트 BOARD.md는 없다).

## 나의 R&R

- **시장 근거.** `mission/EVIDENCE.md` 「주장」 절의 주인이다 (절 소유 — 「Buyer simulation」 절은 Sales). 10:20–11:00에 시장·경쟁 주장을 `ID(E<n>) · 출처 · 연도 · 지역·단위 · 라벨 · 신뢰`로 채운다.
- **12:30 뼈대.** `pitch-compile skeleton`으로 Slide 1·2 뼈대와 쓸 주장 ID 목록(「라벨 점검」)을 `mission/PITCH.md` v0으로 먼저 둔다 — 마감이 앞당겨져도 2장을 낼 수 있게. 15분 안에 끝낸다.
- **2장 + 90초.** G5(15:30)까지 `mission/PITCH.md`와 2장 발표 파일, 90초 스크립트를 확정한다. 리비전은 v1 → review(반론 4개) → final.
- **데모데이.** 1차 통과 시 10분 피치(`mission/DEMODAY.md`)를 준비하고 발표한다.
- **하지 않는 것.** 라벨 없는 숫자 금지. 하지 않은 인터뷰·계약·후기·사용자 수를 traction으로 쓰지 않는다. 세 번째 슬라이드를 만들지 않는다 — 안 들어가면 자른다.

## 환경 세팅 (행사 전)

행사 전(10/22~23)에 한 번 끝까지 통과한다. 권고는 A(Claude Code CLI)다 — 네 명의 환경이 같아지고 검증기를 바로 돌릴 수 있다.

**A. Claude Code CLI (권고)**

1. 설치는 공식 문서만 따른다: https://code.claude.com/docs/en/setup — 블로그·남이 준 스크립트로 설치하지 않는다.
2. 팀 repo를 받는다: `git clone https://github.com/Roykoo83/hthn.git` (private — 초대 수락 후. repo 생성·초대는 승인 대기 중이며, 열리면 팀 채널에 공지된다).
3. 받은 폴더에서 한 번만: `git config pull.rebase true && git config rebase.autoStash true` (커밋 안 한 변경이 있어도 pull이 멈추지 않게). 그다음 `claude`를 실행한다. `CLAUDE.md`가 자동으로 읽힌다.
4. `/hthn-start`를 입력하고 역할 질문에 `gtm-pitch`를 고른다. `me/` 아래에 3블록이 생긴다.
5. GTM 검증: `python3 scripts/validate_mission.py tests/fixtures/missions/good-01 --stage pitch` → `FAIL` 0줄. 이어서 `--stage pitch`를 `tests/fixtures/missions/bad-01`에 돌려 라벨 없는 숫자·세 번째 슬라이드가 `FAIL`로 잡히는 것을 눈으로 본다. 발표 파일을 만들 도구(슬라이드 앱)로 2장 PDF를 내보낼 수 있는지도 확인한다.

**B. Claude Desktop 대안**

1. 공식 다운로드 페이지에서 설치: https://claude.ai/download
2. 앱의 Code 탭에서 받은 repo 폴더를 연다 (git이 없으면 GitHub 웹에서 ZIP으로 받아 푼다).
3. `/hthn-start`가 목록에 없으면 "`.claude/skills/hthn-start/SKILL.md`를 읽고 따라"라고 입력한다 (Desktop의 슬래시 자동 인식은 아직 미검증).
4. python이 없으면 검증기 대신 `templates/PITCH.md` 머리 주석의 라벨 규칙과 `tests/fixtures/missions/good-01/PITCH.md`를 읽고 비교한다 — "수동 점검"으로 표기.

**Windows** — 명령은 Claude에게 시키거나(Claude Code는 Git Bash를 쓴다) `CLAUDE.md` 「Windows 대응 명령」 표의 PowerShell 명령을 쓴다 (`python3` 대신 `py -3`, 해시는 `certutil -hashfile <파일> SHA256`, `curl` 대신 `curl.exe`).

**T0 — 파일 읽기만으로 (셸·git 없음)**

- claude.ai 웹 등 파일 접근이 없으면 `CLAUDE.md` 「웹(T0) 붙여넣기 세트」를 대화에 붙여넣는다 (claude.ai Project 지식에 한 번 올려 두면 매번 붙이지 않아도 된다). 이 역할에서 쓰려는 스킬: hthn-start · evidence-research · pitch-compile (+ `templates/PITCH.md`).
- AI가 첫 응답 맨 위에 degrade 블록을 내야 정상이다. 아무 말 없이 건너뛰면 다시 묻는다.
- 결과 파일은 GitHub 웹 편집기로 커밋한다 — 브라우저에서 repo → 파일 → 연필(Edit) → Commit changes → `main` (새 파일은 Add file → Create new file). 웹 편집이 막힐 때만 팀 채널에 붙이고 PM이 커밋한다. `mission/PITCH.md`는 Discord 2000자 제한을 넘기 쉬우니 웹 편집이 기본이다.
- **T0 중계 4항목 (CONTRACT §C 7).** 웹 편집이 막혀 팀 채널(Discord)에 변경을 붙여 넣어 소유자에게 반영을 부탁할 때는 맨 위에 네 줄을 반드시 둔다 — `기준 버전:` 커밋 해시 또는 ZIP 받은 시각 · `대상 경로:` 파일과 절(예: `mission/EVIDENCE.md#주장`) · `변경 ID:` 보드 작업 `T<n>` 또는 주장 `E<n>`·`S<n>` · `반영 확인 요청:` 받을 소유자 역할. 소유자가 검토해 그 부분만 반영하고(전체 파일 덮어쓰기 금지) 반영 커밋을 답한다. 넷 중 하나라도 없으면 반영하지 않고 되묻는다.

**왕복 검증 1건 (필수)**

- `/hthn-start`가 `log/<날짜>_gtm-pitch_1.md`를 쓰고 다시 읽은 뒤 `git push`까지 한다.
- 다른 팀원 한 명이 `git pull` 후 그 파일이 보인다고 팀 채널에 답하면 끝이다.
- git이 없으면(T0): `/hthn-start`가 준 log 3줄을 GitHub 웹 편집기로 `log/<날짜>_gtm-pitch_1.md`에 커밋한다 (막히면 팀 채널에 붙이고 PM이 대행 커밋). GitHub 웹에 그 파일이 보이면 끝이다.
- 추가로 GitHub 웹에서 파일 1개 수정·커밋을 1회 해 본다 (당일 T0 쓰기 경로 연습).

## 행사 모드 진입 조건 (당일 08:30)

AI를 처음 부르기 전에 사람이 직접 세 가지를 확인한다 (CONTRACT §C 10 「행사 모드 진입 조건」). `/hthn-start` OPEN이 따로 묻지 않고 확인해 브리핑 첫 줄에 결과를 적고, `log/<날짜>_gtm-pitch_1.md`의 `행사 모드:` 줄로 남긴다 (← `templates/log-entry.md`).

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
| evidence-research (market) | 10:20–11:00 | 시장·경쟁 주장 → 출처·라벨 |
| pitch-compile | 12:30 (skeleton) · 14:00–15:30 (v1 · review · final) · 17:00–19:00 (demoday) | 2장 뼈대 · 2장 + 90초 스크립트 · 10분 피치 |
| submit-gate | 14:45 precheck · 15:30–16:00 final | 기본 검사 행은 없다 — 검사자가 빠지면 PM 지정으로 대체 검사(내 PITCH를 보는 3·5·6은 불가) · 발표 파일 해시 전달 (전원 필수) |

## 내 파일

| 파일 | 언제 쓰나 |
|---|---|
| `mission/EVIDENCE.md` 「주장」 절 | 10:20–11:00 · 14:45까지 v2 보강 (← `templates/EVIDENCE.md` — 파일을 처음 만드는 사람이 템플릿에서 복사) |
| `mission/PITCH.md` | 12:30 skeleton(v0) · 14:00–15:30 v1→v3 · 「제출 파일」은 15:30 전 (← `templates/PITCH.md`) |
| `pitch/slides.<pdf\|pptx>` 2장 발표 파일 (형식은 MISSION.md 「제출물」) | 15:10–15:30 확정 · 경로 고정 · 파일명·크기·sha256은 HANDOFF 「체크포인트」 → SUBMISSION 「산출물」 `발표 파일` 행 |
| `mission/DEMODAY.md` | 1차 통과 시 17:00–19:00 (← `templates/DEMODAY.md`) |
| `log/<날짜>_gtm-pitch_<n>.md` | 체크포인트마다 (← `templates/log-entry.md`) |

`mission/EVIDENCE.md` 「Buyer simulation」 절은 Sales 소유다. 그 절에 고칠 점은 HANDOFF.md 「제안」으로 보낸다 (항목마다 `작성:GTM <HH:MM>`).

## 내 시간표

| 시각 | 단계 | 내가 하는 일 | 스킬 | 산출물 · 게이트 |
|---|---|---|---|---|
| 08:30–09:00 | 0 체크인·진입 | `/hthn-start` · 행사 모드 진입 조건 3개 확인 | hthn-start | `log/` 1건 (`행사 모드:` 줄) |
| 09:00–09:00 | 0' 개회·세션 | 환경 최종 점검 · `docs/prior-hypothesis.md` 재독 | — | — |
| 09:00–09:55 | 1 미션 | 원문의 심사기준을 그대로 뽑는 것을 돕는다 | mission-intake intake | — |
| 09:55–10:10 | 2 아이데이션 | 후보마다 "구매 이유" 한 문장 | mission-intake options | — |
| 10:10–10:20 | 3 결정 | 구매 이유·근거 점수에 의견 | mission-intake decide | (G1 10:20) |
| 10:20–11:00 | 4 시장 근거 | 시장·경쟁 주장 수집 → ID·출처·연도·지역·단위·라벨 → EVIDENCE 「주장」 v1 | evidence-research market | `mission/EVIDENCE.md#주장` v1 (내 절) |
| 12:30–12:45 | 5' 피치 뼈대 | Slide 1·2 뼈대 + 쓸 주장 ID 목록 (빌드와 병행) | pitch-compile skeleton | `mission/PITCH.md` v0 |
| 14:00–14:45 | 7 피치 v1 | 2장 텍스트 · 90초 스크립트(한국어 약 130–150어절 · `낭독: <n>초 (추정)`) · 심사기준 매핑 | pitch-compile v1 | `mission/PITCH.md` v1 |
| 14:45–15:10 | 7 피치 review | 반론 4개(역할별 1개 — Sales는 시뮬레이션 결과로 15:00까지)와 수정 기록 → v2 · Sales가 S 행을 넘기면 EVIDENCE 제목 줄을 v2로 | pitch-compile review | PITCH 「반론과 수정」 |
| 15:10–15:30 | 7 피치 final | EVIDENCE v2 반영 → v3 · 2장 파일 내보내기 · 「제출 파일」 파일·페이지·크기 | pitch-compile final | **G5 15:30 보고** |
| 15:30–16:00 | 8 제출 | 검사자 질문에 답 · 발표 파일 해시 전달 | submit-gate | (G6 16:00) |
| 17:00–20:30 | 9 데모데이 (1차 통과 시) | 10분 피치 준비 · 리허설 2회 · 발표 | pitch-compile demoday | `mission/DEMODAY.md` |

## 내 TDD

GTM의 테스트는 "모든 숫자에 라벨이 있는가"와 "반론을 거쳤는가"다. 검사를 먼저 정하고 문장을 쓴다.

1. **라벨 먼저.** 슬라이드에 넣을 주장을 먼저 내 EVIDENCE 「주장」 표에 ID(`E<n>`)로 올리고 거기서 고른다. 표에 없는 주장은 쓰지 않는다. verified·single-source는 출처와 연도(4자리)가 있어야 한다 (C-E2) — 가상·추론·없음 출처는 verified가 될 수 없다. PITCH 「라벨 점검」에는 `주장 ID | 슬라이드 | 라벨`을 EVIDENCE와 같은 라벨로 적는다 (X-1 — 라벨을 올리면 FAIL).
2. **숫자·실적 한 줄 = 근거 표시 하나.** Slide 1·2에서 숫자나 실적 표현이 있는 줄은 같은 줄에 `(E<n> · <라벨>)` — EVIDENCE와 같은 라벨. `verified`·`single-source`는 ID가 꼭 있어야 하고, `hypothesis`·`simulation`·`[시뮬레이션]`은 단독도 된다. 제품 설명 줄은 `(제품 사양)` (C-T2). 시뮬레이션 결과·가상 데이터 화면은 슬라이드에서도 시뮬레이션이라고 보인다. 구매자 시뮬레이션 발견(`S<n>`)을 쓰려면 「주장」에 라벨 `simulation`인 `E<n>` 행을 만들고 슬라이드·「라벨 점검」에는 그 `E<n>`만 쓴다 (`S<n>`은 C-T7·X-1에서 FAIL).
3. **실적 표현 검사.** 계약 · 인터뷰 · 실사용자 · 매출 · 파일럿 · MOU · 결제 · 구매 의향 · 지불 · "고객 n명" 류는 simulation·hypothesis 라벨이나 verified EVIDENCE ID 없이 쓰지 않는다 (C-T5).
4. **리비전 루프.** v1 → 역할별 반론 1개씩(PM 범위 정직성 · Build 데모 일치 · GTM 시장 라벨 · Sales 구매 이유) → 「반론과 수정」 표에 4행 → v2 → EVIDENCE v2 반영 → v3 final. 반론 없이 final로 가지 않는다.
5. **green 판정 (G5).** T2: `python3 scripts/validate_mission.py mission --stage pitch` → `FAIL` 0줄 (세 번째 슬라이드 없음 · 스크립트 220어절 이하 · `낭독:` 95초 이하 · 매핑 표 · 라벨 점검 표 · 「제출 파일」 페이지 ≤ 2). T0: 같은 항목을 눈으로 읽고 "수동 점검"으로 적는다. 스크립트는 소리 내어 읽고 90초 안인지 잰다.
6. **보드 상태.** 작업 행을 끝내면 HANDOFF 「체크포인트」에 `T<n> done · 커밋 <hash> · GTM` 한 줄. PM이 BOARD에 옮긴다.

## 막히면

- 같은 문제로 **3번** 막히면(예: 라벨을 붙일 근거가 끝내 없음, 2장에 안 들어감) 멈춘다.
- PM에게 아래 형식으로 **한 결정**만 묻는다 — 대개 "주장을 hypothesis로 내릴까 / 뺄까"다. 근거를 지어내 채우지 않는다.

```
🚨 [승인 필요] <한 결정>
선택지: A <…> · B <…> · 보류
근거: <한두 줄 — 해당 주장과 EVIDENCE 행 번호>
```

## 발표자료 키트 (2026-10-24 공식)

주최 키트가 `templates/slide-kit/`에 있다 (`README.md`·`GUIDE.md`). 2장은 `template.html`을 `pitch/slides.html`로 복사해 채우고 `bash scripts/export_slides.sh`로 PDF를 만든다 — 모든 장 하단 로고 띠 · 16:9 · 2장 · 왼쪽 위 팀 이름 · 본문 28px 이상 · 핵심 문구 영어. 내보낸 PDF는 눈으로 확인한다(로고 띠·한글 글꼴). 결선(19:00)은 3분 영어 발표 + 7분 한국어 Q&A — `templates/DEMODAY.md`.
