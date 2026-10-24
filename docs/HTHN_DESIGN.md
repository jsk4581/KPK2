---
title: "HTHn 설계서 — v1.1 (v0.1 본문 + v1.0 변경표 + 산출물 계약 + v1.1 수정)"
버전: "v1.1 (2026-10-20 레드팀 반영)"
원본: "BE 작업 저장소의 HTHn v0.1 설계안(2026-10-20) + v1.0 야간 빌드 계획 §2·§4"
상태: "specified — 사람 리허설 전. 증거 없이 승격하지 않는다"
---

# HTHn 설계서 (팀 repo 사본)

> 이 문서는 팀 repo에서 읽는 설계서다. 원본 설계안 v0.1 본문을 그대로 옮기고, 앞에 v1.0 변경표를, 끝에 §18 산출물 계약을 붙였다.
> **우선순위: §19(v1.1) > v1.0 변경표 · §18 > 아래 v0.1 본문.** 충돌하면 앞의 것이 이긴다. (예: v0.1 §4의 "templates/는 v0.2에서 추출"은 v1.0에서 이미 `templates/` 8종으로 구현됐다.)
>
> 개인정보 확인 (2026-10-21): 연락처(이메일·전화)는 원본에도 없고 여기에도 없다. 팀원은 성 없이 이름만 쓴다(우영·준서·곤살로·태진). 외부 강사 실명과 Discord 채널 ID는 옮기지 않았다.

## v1.0 (2026-10-21) — v0.1에서 바뀐 것

v0.1 그대로: 4층(①계약 ②스킬 ③관측 ④실행) · 코어/오버레이/제품 · 전원 필수 스킬 2 + 역할별 5 · 7단계 10행 시간표(09:00 미션, 16:00 제출) · 능력 선언 헤더 · 조용한 degrade 금지 · 진실 계약(git).

v1.0에서 더하는 것 (Roy 지시 "환경 세팅·기획·개발·통합"에 대응):

| 추가 | 무엇 | 왜 |
|---|---|---|
| **역할 키트** `roles/<role>.md` 4종 | R&R · 행사 전 환경 세팅(CLI 권고/Desktop 대안/T0) · 내 스킬 · 내 파일 · 내 시간표 · **내 TDD** · 막히면 | "각자의 R&R에 맞게 환경을 세팅" |
| **통합 규약** CONTRACT §git | trunk 1개 · 파일 소유 · 쓰기 전 `pull --rebase` · 쓰고 나서 `push` · 충돌은 소유자 · 커밋 메시지 `type(scope): what` | "통합까지" |
| `/sprint-board integrate` 모드 | G3·G4·G5에서 PM이 PRD↔데모↔근거↔피치 정합을 검사하고 「제안」으로 조정 | 통합의 사람 절차 |
| **검증기** `scripts/validate_mission.py` | mission/ 산출물 계약(§18)을 기계로 검사. submit-gate·CI·integrate가 쓴다 | TDD의 실체 |
| **app TDD 골격** | `app/SMOKE.md` → `app/tests/` 먼저, 코드는 뒤. 브라우저 러너(T0)+`node --test`(T2) | "tdd를 명확히" |
| **CI** `.github/workflows/check.yml` | push마다 tests + validators. 팀원은 로컬에 python 없어도 CI가 돈다 (T0) | 환경 격차 흡수 |
| `docs/event-rules.md` | 공식 페이지 사실 + 미확인 목록 | mission-intake 입력 |

v1.0에서 함께 정해진 것:

- **TDD 5단계(L0 계약 → L1 구조 → L2 산출물 검증기 → L3 앱 TDD → L4 하네스 eval)** — `docs/TDD.md`.
- **승격 규칙** — 시뮬레이션 eval은 설계 검증이지 `manual-pilot` 승격 근거가 아니다. 사람 리허설 1회가 필요하다 (§12 · `docs/TDD.md` §5).
- **산출물 계약** — `mission/` 파일별 필수 헤딩·표 열·내용 규칙. 검증기·템플릿·스킬·테스트의 공통 기준 (§18).

---

## v0.1 원본 메타

| 항목 | 값 |
|---|---|
| title | HTHn v0.1 — Hackathon Team Harness (Ambition for Korea 4인 팀) |
| 분류 | [kernel] 설계 |
| 작성 | 2026-10-20 · claudex |
| 상태 | 설계안 v0.1 — Roy 검토 대기. 모든 구성요소 상태 = specified (증거 없이 승격하지 않는다) |
| 승계 | BE_HARNESS_v1(4층·능력 선언·T0~T3·관문 A/B) · HARNESS_REGISTRY 상태 머신 · Urban_Harness v4(온보딩 3단계·개인 지침 3블록·리허설 5항목) · H-001(brief gate·proof gates·repair policy) |
| 입력 | wiki/entities/hthn.md · wiki/entities/ambition-for-korea-hackathon-team.md · SB-RD-20261020-001 · context/SYNC_CONTRACT.md v0.1 · BE_LLMWiki 전체 스윕(§17) |

# HTHn v0.1 — Hackathon Team Harness

> **이 문서가 정하는 것.** 4인 팀이 2026-10-24 09:00 미션 공개부터 제출(목표 16:00)까지, 각자 환경에서 **같은 절차로** 움직이게 하는 팀 repo의 구조·스킬·게이트·분담.
> 제품(Personal Growth OS 등)은 정하지 않는다. 그것은 당일 미션이 정한다.

## 0. 한 문장

> **HTHn은 "팀 repo를 여는 것"이다.** 설치할 것이 없다. `CLAUDE.md` 한 파일이 나머지를 끌어오고, 미션이 무엇이든 09:00 공개 → 제출을 같은 7단계·6게이트로 돈다.

BE_HARNESS_v1 §0("`git clone` 하나로 시작하고, 진입 스킬이 나머지를 끌어온다")의 팀 적용이다.

## 1. 전제

### 1-1. 확정된 것 (근거: 공식 행사 페이지 `bloomworld.ai/community/ambition` · GOAL.md · SYNC_CONTRACT v0.1 · 팀 엔티티)

| 항목 | 값 | 출처 |
|---|---|---|
| 행사 | 2026-10-24(토) 09:00–21:00 · 서울 AI 허브(서초구 태봉로 108) · 체크인 08:30 | 공식 |
| 당일 일정 | 09:00 개회 → 09:20 Anthropic 세션 → **09:00 미션 공개** → **10:00 개발 시작** → 10:00–17:00 빌드 + VC 1차 심사(도착순) → 17:00–19:00 저녁·데모데이 준비 → 19:00–20:30 Shark Tank(8팀 × 10분 피치 + Q&A) → 20:30 VC 매칭·결과 | 공식 |
| 제출 | 창구 17:00까지 · **팀당 1회, 재제출 불가** · **도착순 심사 · 8팀이 1차를 통과하면 조기 마감**(남은 슬롯 화면 표시) · "일찍 내도 준비 안 됐으면 통과 못 함" | 공식 |
| 제출물 | 데모 링크 + **2장 이내 발표자료** | 공식 |
| 심사 | 1차 VC 서면(당일 도착순) → 저녁 6개 VC 합동(AttentionX · BASS · Goodwater · Schmidt · Springcamp · SV). **심사기준·루브릭 미공개** | 공식 |
| 크레딧 | **1인당 Claude 크레딧 $500**(팀 $2,000) · 그 안에서만 개발 · 개인/회사 계정으로 이어 쓸 수 없음 · **지급 형태(API 키 / Console / claude.ai) 미공개** | 공식 |
| 도구 규칙 | **타 AI 금지 · 행사 제공 Claude 크레딧만** (Roy 확정 2026-10-20). 공식 페이지에는 타 AI·사전 코드·외부 API 규칙이 **명시돼 있지 않다** — 주최 측 확인 대상(R5) | Roy · 공식 |
| 팀 제출 목표 | **16:00 유지** (Roy 확정 2026-10-20). 도착순·조기 마감 규칙은 "submit-gate PASS 즉시 제출, 16:00이 상한"으로 반영. 남은 슬롯 수는 태진이 기록만 한다 (§5) | Roy · 공식 |
| 팀 · 기본 배치 | 우영(PM·PRD·제약·하네스) · 준서(풀스택·AI 연동) · 곤살로(GTM·마케팅·피치) · 태진(판매·구매자·**제출 타이밍 = 슬롯 감시**). 역할은 당일 병렬 실행의 **기본 배치**이지 고정 직무가 아니다 | 팀 |
| 데이터 | 실제 개인정보 연결 대신 가상 데이터·현장 API로 핵심 판단 장면 증명. Sheet 우선, 필요가 명확할 때 Firebase | 팀 |

> "미션 공개 09:00"은 행사 시작 시각이었다. Roy 확인(2026-10-20) 후 GOAL.md·SYNC_STATE.yaml을 **09:00**으로 갱신했다.

### 1-2. 가정 (미확정 — 설계는 분기로 처리, §15에서 결정 요청)

| # | 가정 | 대안 | 영향 범위 |
|---|---|---|---|
| A1 | **확정 2026-10-20 (Roy)** — 중앙 repo = 신규 `hthn` (Roykoo83 소유, 팀원 collaborator). 생성 자체는 🚨 승인 후 | — | §4 · §8 |
| A2 | 팀원 Claude 클라이언트 — **Roy가 행사 전 전원을 Claude Code CLI 또는 Claude Desktop 앱 중 하나로 통일 세팅 예정 (미결, Roy 2026-10-20)**. 설계는 셋(CLI/Desktop/웹) 다 T0 경로를 유지 | — | §7 · §8 |
| A3 | 웹 스택 기본값 = 정적 HTML+JS + Google Sheet(Apps Script) — 팀이 행사 전 확정하면 교체 | React+Firebase 등 | demo-build 절차만 |
| A4 | 행사 크레딧 형태 미확인 (API 키 vs claude.ai 계정 크레딧) | — | §11 예산 2분기 |

## 2. 경계 — 코어 · 오버레이 · 제품

위키 `hthn.md` §1을 파일로 옮기면 세 구역이 된다. (아이디어 출처: `portable-workspace-kit`의 kernel / overlay / asset 3분할)

```
코어      core — 절차·스킬·양식·게이트·계약.  행사 전에 만들고 당일에는 바꾸지 않는다
오버레이  mission/ — 당일 09:00 미션 공개 이후 생성되는 미션·결정·PRD·근거·피치·제출 기록
제품      app/ — 그날 HTHn으로 만든 데모 웹앱
```

사전 제품 가설(Personal Growth OS / Life Compass AI)은 `docs/prior-hypothesis.md`에 **"미션 전 가설"**로 표기해 둔다. 미션이 맞으면 오버레이의 출발점으로 쓰고, 안 맞으면 버린다. 코어는 어느 쪽이든 그대로다.

## 3. 4층 매핑 — BE_HARNESS_v1 §2 → HTHn

```
① 계약    CLAUDE.md(진입) · CONTRACT.md(목표·역할·마감·완료정의·승인/안전)      전원 · 도구 요구 0
② 스킬    .claude/skills/*/SKILL.md 7개 — 전원 필수 2 · 역할별 5               전원 · 능력 선언 필수 · T0
③ 관측    HANDOFF.md · mission/BOARD.md · mission/*.md · log/                          읽기 전원 · 쓰기는 담당 역할
④ 실행    cmux · claudex · codexx · agyx · Hermes relay                        Roy 맥 전용 · 이식 안 함
          (④층 — 운영자 맥 전용 · 팀원은 설치·사용하지 않음 · 09:00 이후 꺼짐)
```

**①②는 반드시 이식되고 ④는 이식하지 않는다.** BE와 같다. HTHn만의 차이 두 가지:

- **③ 쓰기 주체가 "기계"가 아니라 "담당 역할"이다.** 팀에는 launchd가 없다. 각 워크스트림 소유자(사람+그의 AI)가 자기 파일에 쓴다. 파일 소유표는 `mission/BOARD.md`에 둔다(v1.1 §19) (출처: `cozyclay` `.omo/` — 워커는 분리된 파일을 소유하고 중앙 레지스트리는 건드리지 않는다).
- **④는 행사 당일 미션 공개(09:00) 이후 규칙상 꺼진다.** 타 AI 금지 때문에 codexx·agyx·Hermes 추론은 사용 불가. ④층은 **행사 전 준비(스킬 제작·리허설·Discord 동기화)에서만 켜진다.** claudex 자체도 행사 크레딧 경로가 확인될 때까지 "당일 사용 미확인"이다 (SYNC_STATE `pending_for_claudex`).

### 진실 계약 (BE_HARNESS_v1 §3 "신선도·소유·해시")

| 항목 | HTHn 구현 | T0 경로 (git 없음) |
|---|---|---|
| 신선도 | **읽기 전 `git pull`, 쓰기 후 `commit + push`.** HANDOFF 체크포인트에 커밋 해시 기록 | ZIP 재다운로드 시각을 적고, 변경은 Discord에 붙여넣어 PM이 커밋한다 — **degraded로 고지** |
| 소유 | `mission/BOARD.md` 파일 소유표. 남의 파일은 제안(`HANDOFF.md` 「제안」)으로만 | 동일 |
| 해시 | 제출물(데모 URL·2장 파일)의 해시·크기를 `mission/SUBMISSION.md`에 기록 | 파일 크기·수정 시각으로 대체 |

## 4. 팀 repo 구조 (코어)

```
hthn/
├── CLAUDE.md                ① 진입점. 읽는 순서·지금 단계·규칙 3줄. AGENTS.md는 포인터
├── CONTRACT.md              ① 목표 · 역할·권한표 · 마감·게이트 · 완료 정의 · 승인/안전/진실 규칙
├── HANDOFF.md               ③ 현재 단계 · 체크포인트(커밋 해시) · 결정 · 제안 · 블로커
├── .claude/skills/          ② 7개 — Claude Code는 자동 인식(슬래시), 다른 클라이언트는 경로로 읽는다
│   ├── hthn-start/SKILL.md          전원 필수 · 진입·복귀·마감
│   ├── mission-intake/SKILL.md      전원 · 미션 → 후보 → PMF 필터 → 결정 기록
│   ├── sprint-board/SKILL.md        PM · 역산 보드 · 파일 소유 · 예산
│   ├── evidence-research/SKILL.md   GTM·판매 · 시장/경쟁/구매자 근거 + buyer simulation 표기
│   ├── demo-build/SKILL.md          빌드 · 핵심 장면 1개 → 배포 → 복구 경로
│   ├── pitch-compile/SKILL.md       피치 · 2장 + 스크립트
│   └── submit-gate/SKILL.md         전원 필수 · 최종 관문 (작성자 ≠ 검사자)
├── templates/               ② 빈 양식 — v0.2에서 SKILL.md 출력 절을 추출 (v0.1은 SKILL.md 안에 내장)
├── mission/                 오버레이 — 09:00 미션 공개 전에는 README만(09:00은 행사 시작 시각). MISSION·DECISION·PRD·BOARD(③ 작업판 정본, G2)·EVIDENCE·PITCH·SUBMISSION
├── app/                     제품 — 스택 확정 후 골격 (A3)
├── docs/prior-hypothesis.md 미션 전 가설 (표기 필수)
├── log/                     ③ 역할별 작업 로그 YYYY-MM-DD_<role>_<n>.md — "상태 → 이유 → 바뀐 상태" 3줄
└── me/                      개인 지침 3블록 [HTHn 공통]·[내 환경]·[나의 방식] — .gitignore (환경·개인 차이는 repo에 안 올린다)
```

**규약에 도구 이름을 넣지 않는다** (BE_HARNESS_v1 §8). `cmux`·`codexx`·`agyx`·`hermes`는 Roy의 `me/`에만 있다.

## 5. 운영 흐름 — 7단계 × 스킬 × 역할 × 시간 역산

위키 운영 모델 7단계(`Mission → ideation → PMF filtering → PRD + GTM/sales → build → MVP test → pitch`)에 진입(0)·제출(8)·데모데이(9, 조건부)를 더해 10행, 게이트 6개. 제출 목표는 **16:00**(Roy 확정 2026-10-20 · 공식 마감 17:00). 공식 규칙(도착순 심사 · 8팀 통과 시 조기 마감 · 재제출 불가)은 **"submit-gate PASS 즉시 제출, 16:00이 상한"**으로 반영한다. 시각은 `mission/BOARD.md`가 당일 갱신한다.

| # | 단계 | 목표 시각 | 스킬 | 주 담당 → 참여 | 산출물 (`mission/`) | 게이트 |
|---|---|---|---|---|---|---|
| 0 | 체크인·진입 | 08:30–09:00 | **hthn-start** | 전원 | 브리핑 · `log/` 1건 · **행사 크레딧 연결 확인** | 4명 pull·브리핑·크레딧 OK |
| 0' | 개회·Anthropic 세션 | 09:00–09:00 | — | 전원 | 환경 최종 점검 · `docs/prior-hypothesis.md` 재독 | — |
| 1 | Mission | 09:00–09:55 | mission-intake ①intake | 우영 → 전원 | MISSION.md (사실/해석/미확인 · 심사기준 · 금지) | — |
| 2 | ideation | 09:55–10:10 | mission-intake ②options | 전원 | 후보 3개 | — |
| 3 | PMF filtering → 결정 | 10:10–10:20 | mission-intake ③decide | 전원 → **우영 결정** | DECISION.md · PRD.md(6문장) | **G1 10:20** |
| 4 | PRD 확정 + 보드 ‖ GTM/sales | 10:20–11:00 | sprint-board ‖ evidence-research ①market | 우영·준서 ‖ 곤살로·태진 | mission/BOARD.md · EVIDENCE.md v1 | **G2 10:35 보드·소유표** |
| 5 | build | 10:30–14:00 | demo-build ①build | 준서 → 우영 | `app/` 배포 URL · RECOVERY · SMOKE | **G3 13:00 핵심 장면 작동** · freeze 14:00 |
| 6 | MVP test + buyer simulation | 14:00–14:45 | demo-build ②test ‖ evidence-research ②simulation | 태진·곤살로 | EVIDENCE.md v2 (**시뮬레이션 표기**) | **G4 14:45** |
| 7 | pitch | 14:00–15:30 | pitch-compile v1·review·final | 곤살로 → 전원 반론 1개씩 | PITCH.md → 2장 파일 + 90초 스크립트 | **G5 15:30 2장 확정** |
| 8 | submit | 15:30–16:00 | **submit-gate** | 작성자 아닌 1명 검사 → 우영 확정·제출 | SUBMISSION.md (체크·해시·receipt) | **G6 16:00 제출** · ~~하드스톱 16:30~~ → 최종 한계 16:50 (v1.1 A6) |
| 9 | 데모데이 (1차 통과 시) | 17:00–19:00 준비 → 19:00–20:30 | pitch-compile demoday | 곤살로 → 전원 | 10분 피치 + 예상 질문 10 | — |

- **슬롯 기록.** 태진이 10:00부터 매시, 13:00부터 30분마다 화면의 남은 1차 통과 슬롯 수를 `mission/BOARD.md` 「슬롯」에 한 행 덧붙인다(v1.1). 판단은 PM의 몫이고 16:00 상한은 그대로다 — 기록은 "일찍 낼 수 있으면 낸다"의 근거일 뿐이다.
- **G1이 10:20을 넘기면** 우영이 후보 중 "8h 데모 가능성" 최상을 강제 선택한다. 아이데이션은 끝나지 않는다. 끝내는 것이다.
- **G3가 13:00을 넘기면** 핵심 장면을 더 좁힌다. 기능을 더하지 않는다.
- **제출은 한 번뿐이다.** submit-gate PASS 없이는 어떤 시각에도 내지 않는다. PASS가 15:00에 나오면 15:00에 낸다. ~~16:30 하드스톱에만 알려진 결함을 적고 낸다.~~ → v1.1 A6로 대체: 면제 불가 F1–F5(체크 1·3·4·5·10) PASS + 알려진 결함 + PM 승인이면 `approve-with-defects`, 최종 한계 16:50 (`CONTRACT.md` 게이트 운영 규칙이 정본).
- 4·5단계가 겹치는 10:30–11:00은 준서가 PRD ③핵심 행동 한 문장만 받고 바로 골격에 들어가는 구간이다.
- 16:00–17:00은 버퍼다. 버퍼를 계획에 쓰지 않는다.

## 6. 스킬 세트 — 7개 (위키 8후보 → 7)

BE_HARNESS_v1 §5 "전원 필수는 둘"을 그대로 쓴다. 팀의 둘은 **들어가는 문(hthn-start)**과 **나가는 문(submit-gate)**이다. 나머지 다섯은 역할에 따라 켠다 — 한 사람이 당일 읽는 스킬은 최대 3개다.

| 스킬 | 전원/역할 | 위키 후보 | 입력 → 출력 | 비고 |
|---|---|---|---|---|
| **hthn-start** | **전원 필수** | handoff-sync 흡수 | repo → 환경 감지·역할·브리핑·`log/` | Discord 결정 → HANDOFF 반영은 **담당자가 직접**(T0). 행사 전 Hermes relay는 enhanced_by |
| **mission-intake** | 전원 (우영 주도) | mission-intake + pmf-sprint | 미션 원문 → MISSION·DECISION | 3모드 intake / options / filter+decide. 분리하면 30분 안에 못 돈다 |
| sprint-board | PM | hackathon-planner | DECISION → BOARD (역산·소유·예산) | 계획이 밀리면 다시 돌린다 |
| evidence-research | GTM·판매 | evidence-market-research | 시장·경쟁·구매자 주장 → EVIDENCE (출처·confidence) | buyer simulation을 **시뮬레이션으로 표기**하는 곳 |
| demo-build | 빌드 | demo-builder | PRD 핵심 장면 → `app/` 배포 + 복구 경로 | repair policy 3회 (H-001) |
| pitch-compile | 피치 | pitch-compiler | DECISION·PRD·EVIDENCE·데모 → 2장 + 스크립트 | 리비전 루프 v1→v3 (semtech 패턴) |
| **submit-gate** | **전원 필수** | submission-gate | 전부 → SUBMISSION (체크리스트·해시·receipt) | **작성자와 다른 사람이 돌린다** (H-001 verifier 분리) |

PRD는 스킬이 아니라 **양식**이다 (mission-intake ③의 마지막 출력이자 sprint-board의 첫 작업). **BE AIC 강의의 6문장 AI PRD**(2026-09-05 원데이클래스 · 강사 10칸 → 5칸 → 6문장 계보)를 그대로 쓴다 — ①사용자 한 명 ②불편 한 가지 ③핵심 행동 하나 ④입력→출력 ⑤오늘 하지 않을 것 셋 ⑥완료 조건. 범위 게이트 **C·U·T**(Clear 10초 안에 이해 · Usable 입출력과 완료 장면이 보임 · Tiny 핵심 행동 하나로 오늘 끝). 시장 주장은 PRD가 아니라 DECISION·EVIDENCE에 둔다.

헤더·절차 골격은 `skills/<name>/SKILL.md`에 있다. 스킬 지시문은 **영어**(BE 프롬프트 언어 정책 2026-08-28), 사람이 실행하는 게이트 체크리스트는 **한국어**, 산출물 언어는 각 스킬이 명시한다.

## 7. 능력 선언 — 모든 SKILL.md의 헤더 (BE_HARNESS_v1 §4 그대로)

```yaml
requires:        # 비어 있어야 ②층에 들어온다
  - (없음)
enhanced_by:     # 있으면 빨라진다
  - 셸 · git · node/python · Claude Code 슬래시 자동 인식
degraded:        # 없을 때 무엇이 빠지고 대신 무엇을 하는가 — 반드시 말한다
verified_on:     # 실측만. v0.1은 전부 "(미검증)"
```

### 세 클라이언트의 T0 경로

| 클라이언트 | 스킬 호출 | 파일 쓰기 | git | 등급 |
|---|---|---|---|---|
| Claude Code CLI | `/hthn-start` 자동 인식 | 직접 | 직접 | T1~T2 |
| Claude Desktop · Code 탭 | 자동 인식(미검증) 또는 "`.claude/skills/hthn-start/SKILL.md`를 읽고 따라" | 직접 | 있으면 직접 | T0~T2 |
| claude.ai 웹 (파일 없음) | SKILL.md 본문을 붙여넣는다 | **없음** → 결과를 사람이 repo에 저장·커밋 | 없음 | **T0** (degraded 고지 필수) |

**조용한 degrade 금지.** 첫 응답에 한 블록으로 알린다 — BE_HARNESS_v1 §4의 블록 형식 그대로.

```
[이 환경에는 git이 없습니다]
 → 변경 내용을 Discord #팀채널에 붙여넣습니다. PM이 커밋합니다. 결과는 같고 느립니다.
 → 건너뛴 것: 커밋 해시 체크포인트(수정 시각으로 대체)
```

## 8. 온보딩 3단계 (Urban v4 §5 승계) · 환경 매트릭스

설치는 없다. 세 번 하면 끝난다. **행사 전(10/22~23)에 4명 전원이 한 번 통과한다.**

| 단계 | 누가 | 시간 | 내용 |
|---|---|---|---|
| 1 | 사람 | 5분 | repo를 받는다 — `git clone` / GitHub Desktop / **ZIP 다운로드**(git 없음) |
| 2 | 사람 | 1분 | 그 폴더에서 Claude를 연다 (CLI `claude` / Desktop Code 탭 → 폴더) — `CLAUDE.md`가 읽힌다. **이것이 하네스의 전부다** |
| 3 | AI | 10분 | `hthn-start`가 돈다 — OS·클라이언트·셸·git·node 감지(**묻지 않는다**) → 역할 선택 1문 → 브리핑 → `me/` 3블록 생성 → **왕복 검증**(`log/` 1건 쓰고 다시 읽고, 가능하면 push) |

개인 지침 3블록 (`me/`, gitignore):

```
[HTHn 공통]   repo 경로 · CONTRACT 포인터 · 내 역할      ← hthn-start가 생성·재생성
[내 환경]     OS · 클라이언트 · 셸/git/node 유무 · 등급  ← 기기 바뀌면 버리고 다시
[나의 방식]   답변 언어 · 형식 · 되묻기 선호              ← 사람 소유
```

### 환경 매트릭스 (Discord 팀 채널 질의 답변 대기)

| 팀원 | OS | Claude 클라이언트 | 셸 | git | node/python | 예상 등급 | 확인일 |
|---|---|---|---|---|---|---|---|
| 우영 | macOS | Claude Code CLI | zsh | ○ | ○ | T3 가능 — **당일은 T0~T2만**(규칙) | 2026-10-20 |
| 준서 | ? | ? | ? | ? | ? | ? | — |
| 곤살로 | ? | ? | ? | ? | ? | ? | — |
| 태진 | ? | ? | ? | ? | ? | ? | — |

Roy 계획(2026-10-20): 행사 전 **전원을 Claude Code CLI 또는 Claude Desktop 앱 중 하나로 통일 세팅**(미결). **권고는 CLI** — 슬래시 스킬 자동 인식·git·셸이 한 번에 되어 네 환경이 T1~T2로 같아지고, degrade 분기가 사라진다. Desktop 앱은 Code 탭에서 같은 폴더를 열면 동등하나 슬래시 인식은 미검증. 어느 쪽이든 OS는 Discord 답변이 필요하다(Windows면 PowerShell 경로). 빈칸이 채워져야 각 SKILL.md `verified_on`을 적을 수 있다.

## 9. Hermes ↔ claudex 분담 (SYNC_CONTRACT v0.1 요약 + HTHn 관점)

> ④층 — 운영자 맥 전용 · 팀원은 설치·사용하지 않음 · 09:00 이후 꺼짐. 팀원의 동기화 경로는 사람 ↔ git(HANDOFF·BOARD) ↔ Discord뿐이다.

| 시기 | Hermes (Mobile · Discord) | claudex (Desktop · Roy 맥) | 팀원 |
|---|---|---|---|
| 행사 전 (~10/23) | 팀 채널 질의·수집(환경·스택·repo) · 결정/미결/액션 인계 · 위키 축적 · `SYNC_STATE` 커서 | 설계·스킬 제작·리허설 운영·repo 커널 커밋 · 체크포인트 | 온보딩 3단계 통과 · 리허설 참가 |
| 행사 중 (10/24 09:00~) | **추론 금지.** 사용자 작성 원문의 비추론 relay만 (주최 허용 전제) | **행사 크레딧 경로 확인 전까지 미확인.** 확인되면 우영의 작업 클라이언트 | 각자 Claude로 하네스 실행. 소통은 사람이 Discord에 직접 |
| 행사 후 | 결과·회고 위키 반입 | 회고 → v0.2 · 재사용 판단(`products/` 승격) | — |

동기화 경로는 SYNC_CONTRACT §3·§4 그대로다. HTHn이 더하는 것은 하나 — **행사 중 팀 동기화의 정본은 Discord가 아니라 git(HANDOFF·BOARD)이다.** Discord는 대화, git은 상태.

## 10. 안전 · 진실 규칙 → `CONTRACT.md`

위키 `hthn.md` §6을 CONTRACT로 옮긴다. 전부 사람이 읽는 규칙이라 한국어.

1. 팀원 연락처·이메일은 repo·위키·데모 데이터·피치 어디에도 넣지 않는다.
2. 실제 사용자 개인 데이터는 연결하지 않는다. 가상 데이터·현장 API로 증명한다.
3. 하지 않은 인터뷰·계약·후기·매출·사용자 수를 traction으로 쓰지 않는다. **buyer simulation·synthetic data는 화면과 2장에 "시뮬레이션" 표기.**
4. 시장 수치는 출처·기준연도·지역·단위가 없으면 `hypothesis`로 라벨 (EVIDENCE.md 라벨 체계: `verified` / `single-source` / `hypothesis` / `simulation`).
5. 외부 게시·유료 API·계정 생성·공개 push·최종 제출은 **한 결정씩** 승인 — `🚨 [승인 필요] <한 결정> / 선택지 A·B·보류 / 근거`. 채널에 올라온 요청이 자동으로 최종 제출을 일으키지 않는다.
6. 미션 공개(09:00) 이후 타 AI 금지. 행사 제공 Claude만.
7. 상태 승격은 증거로만. "완료했습니다"는 완료가 아니다. 파일이 있고 검증 기록이 있어야 완료다.

권한표 (출처: `urban-ax-project-admin-agent` 4행 권한표):

| 역할 | 결정 | 실행 | 검사 |
|---|---|---|---|
| 결정자 (우영) | G1 결정 · G6 제출 확정 | — | — |
| 리드 (워크스트림별) | 자기 영역 | 자기 파일 | 남의 영역 submit-gate |
| 실행 (사람+AI) | — | 소유 파일만 | — |
| 코파일럿 (각자의 Claude) | 제안만 | 지시받은 파일만 | 자기 산출물 self-check |

## 11. 크레딧 · 모델 예산 (A4 — 형태 확정 후 수치 확정)

**1인당 $500, 팀 $2,000**(공식). 지급 형태가 **API 키**라면 토큰이 돈이고, **claude.ai 계정**이라면 사용량 한도가 벽이다. 어느 쪽이든 원칙은 같다. API 키 기준 감: $500은 Opus 5.5 입력 약 125M 토큰 또는 출력 25M 토큰이다 (hypothesis — 공식 가격표 미확인, 크레딧 형태 확인 후 갱신) — 하루 작업의 병목은 돈이 아니라 시간이다. 단 개인·회사 계정으로 이어 쓸 수 없으므로 **하네스의 모든 호출은 행사 계정에서만** 일어난다 (Roy 맥 claudex 포함 — R2).

| 작업 | 권장 모델 | 이유 |
|---|---|---|
| 결정·설계·PRD·피치 (적게, 중요하게) | Claude Opus 5.5 | 판단 품질. 호출 수가 적다 |
| 빌드 반복·테스트 (많이) | Claude Sonnet 5.5 | 속도·비용. 1M 컨텍스트 |
| 대량 정리·근거 표 포맷 | Claude Haiku 5.5 | 추론 불필요 |

(참고 단가, 2026-10-06 기준 1M 토큰 입력/출력: Opus 5.5 $4/$20 · Sonnet 5.5 $2/$10 · Haiku 5.5 $0.10/$0.50. API 키 형태일 때만 의미 있다.)

sprint-board가 `mission/BOARD.md` 「예산」에 **사람별 세션 수·모델·잔여 중단선·시간 상한**을 적고, hthn-start가 각자 `[내 환경]`에 실제 사용 클라이언트를 적는다. 컨텍스트 압축·모델 라우팅은 하네스 관심사이지 제품 가치가 아니다 (SB-RD §3).

## 12. manual-pilot — 시뮬레이션 미션 1건 (리허설)

**언제** 10/22 또는 10/23, 2시간. **무엇** 가상 미션 1건("프리랜서의 주간 목표 관리" 같은 당일 공개형 미션을 Roy가 봉인해 뒀다가 시작 시 공개). **표기** 전 산출물 상단에 `[SIMULATION — 리허설, 실제 미션 아님]`.

7단계를 각 10~15분으로 압축해 돈다. 성공 기준 5:

| # | 확인 | 합격 |
|---|---|---|
| 1 | 4명이 온보딩 3단계만으로 시작했는가 | 추가 질문 0건 |
| 2 | `hthn-start`가 각 환경에서 브리핑을 냈는가 | T0 경로 포함 전원 |
| 3 | degrade 때 무엇이 빠졌는지 말했는가 | 침묵 0건 |
| 4 | G1~G6이 압축 시간표 안에서 전부 통과했는가 | 6/6 (산출물 파일 존재) |
| 5 | submit-gate를 작성자 아닌 사람이 돌려 PII 0·시뮬레이션 표기 ✓ 였는가 | ✓ |

리허설 결과는 `log/`와 이 문서 §13에 기록한다. **통과해야 `manual-pilot`으로 승격한다.** 지금은 전부 `specified`다.

## 13. 검증 · 상태

| 구분 | 검사 | 방법 | 상태 |
|---|---|---|---|
| 구조 1 | 모든 SKILL.md `requires`가 비어 있다 + 헤더 4키 존재 | 기계 (grep, 2026-10-20 19:03) | **7/7 PASS** |
| 구조 2 | 7단계 전부 담당 스킬이 있다 | §5 표 | 10/10 행 매핑 (0'·9는 스킬 외 행동 명시) |
| 리허설 | §12 성공 기준 5 | 사람 (10/22~23) | 미실시 |
| 관문 B 축소판 | 팀원 1명이 설계서·스킬만 읽고 자기 환경에서 `hthn-start` 완료 | 사람 | 미실시 — 환경 답변 후 |

상태 머신은 HARNESS_REGISTRY 그대로: `specified → manual-pilot → implemented → verified`. HTHn 등록 후보 ID `H-010` (be-agi-studio 레지스트리 — Roy 결정).

## 14. 하지 않는 것

| | 왜 |
|---|---|
| 팀원에게 도구 설치 요구 | 설치가 조건이면 하네스가 아니라 개발환경이다 (BE §8) |
| ④층 이식 · 행사 중 사용 | Roy 맥 전용 + 대회 규칙 |
| 제품을 미리 고정 | 미션이 정한다. 코어만 고정 |
| 스킬 8개 이상 | 전원 필수 둘. 한 사람이 당일 읽는 스킬 최대 3 |
| 규약에 도구 이름 | `me/`에만 |
| 가상 검증을 실제처럼 | 규칙 3·4 |
| 상태 부풀리기 | 리허설 전에는 전부 `specified` |

## 15. 결정 (Roy 2026-10-20) · 미결

| # | 항목 | 결과 | 영향 |
|---|---|---|---|
| R1 | 중앙 repo | **확정 — 신규 `hthn` (Roykoo83, 팀원 collaborator).** 생성은 🚨 승인 후 `gh repo create Roykoo83/hthn --private` | §4 · §8 · §16-1 |
| R2 | 행사 크레딧 지급 형태 · claudex 허용 경로 | **보류** (주최 측 질의 보류). 설계 가정 A4 유지 — 행사 계정에서만 호출 | §9 · §11 |
| R3 | 팀원 환경 | **클라이언트: 전원 CLI 또는 Desktop 앱으로 통일 예정(미결, CLI 권고).** OS: Discord 팀 채널 질의 답변 대기 | §7 · §8 · `verified_on` |
| R4 | 웹 스택·배포 대상 | 미결 — A3 기본값(정적 HTML+JS + Sheet) | demo-build |
| R5 | 타 AI · 사전 코드 · 외부 API 허용 범위 | **보류** — Roy 확정 "타 AI 금지" 유지, 나머지는 미확인으로 설계 | mission-intake 금지사항 |
| R6 | 리허설 일시 | 미결 — 10/22 저녁 또는 10/23, 2시간 | §12 |
| R7 | 제출 목표 시각 | **확정 — 16:00 단일 유지.** 조기 프리셋 없음. PASS 즉시 제출·슬롯 수 기록만 | §5 · 스킬 시간표 |
| R8 | 미션 공개 시각 | **확정 — 09:00 반영 완료** (GOAL.md · SYNC_STATE.yaml 갱신) | §1-1 · §5 |

## 16. 다음 수순 (v0.2)

1. 🚨 [B:E 승인 필요] `gh repo create Roykoo83/hthn --private` → 코어 커밋 (CLAUDE.md · CONTRACT.md · HANDOFF.md · (`mission/BOARD.md`는 G2에 생성 — 루트 보드 없음) · `.claude/skills/` 7개 · `mission/README` · `docs/prior-hypothesis.md` · `me/.gitignore`) → 팀원 collaborator 초대(외부 전송 — 승인)
2. 클라이언트 통일 결정(CLI 권고) + OS 답변 → §8 매트릭스 · 각 SKILL.md `verified_on`
3. 리허설(R6) → `manual-pilot` 승격 또는 수정
4. `templates/` 추출 · CONTRACT.md 본문 · 행사 후 `products/` 승격 판단

## 17. 계보 — LLMWiki 아이디어 반영표 (가중치 최상, 2026-10-20 스윕)

| 출처 (wiki/) | 아이디어 | 들어간 곳 |
|---|---|---|
| concepts/portable-workspace-kit | kernel / overlay / asset 3분할 · 30분 설치 | §2 코어·오버레이·제품 · §8 |
| comparisons/shared-operating-kernel | 파일 기반 핸드오프 — 상태는 채팅이 아니라 파일에 | §3 ③층 · §9 "git이 상태" |
| entities/beworks | 복귀 브리핑은 기존 파일에서만 · 덮어쓰기 금지 · 작업지시 4요소 | hthn-start |
| entities/be-portfolio | 로그 = "상태 → 이유 → 바뀐 상태" | §4 `log/` |
| concepts/ai-consulting-intake | P0 = 저위험·반복·가시적 before/after | mission-intake 필터 "8h 데모 가능성" |
| concepts/cozyclay-ai-previs-mcp | contract freeze → 병렬 wave · 워커 파일 분리 소유 · 메인이 머지+결정적 게이트+ledger · "레시피를 남겨라" | §3 소유표 · sprint-board · submit-gate ledger |
| concepts/multi-agent-party-mode | facilitator가 2~3 voice 선택 · 직접 질문이 나오면 라운드 종료 | mission-intake ② ideation 라운드 규칙 |
| entities/urban-ax-project-admin-agent | 4행 권한표 | §10 권한표 |
| comparisons/frontier-labs-model-app-agent-cli-guide §4·§6·§8 | 같은 프롬프트가 다른 결과를 내는 10가지 · 14필드 run card · "검증된 파일이 있어야 완료" | §7 능력 선언 보조 · submit-gate 양식 · 규칙 7 |
| concepts/governance-approval-gates · agent-infra | 🚨 한 결정씩 · 5 불변식 | §10 규칙 5 |
| entities/people/* · concepts/intent-adaptive-personal-publishing | Status 라벨 · evidence_level(memory/original/verified/hypothesis) · evidence boundary | EVIDENCE.md 라벨 4종 |
| docs/client-context-recency-policy (people 페이지 경유) | Discord → 제안(CONTEXT_UPDATES) → 정본 2단계 | HANDOFF 「제안」→「결정」 |
| concepts/urban-ax-shared-copilot-workflow | 채널 요청이 최종 제출을 자동 트리거하지 않음 | submit-gate 사람 확정 |
| entities/semtech | 거절 사유 → 검증 → v1~v3 → final 루프 | pitch-compile 리비전 |
| be-agi-studio/harnesses/one-brief-near-final (H-001) | brief gate 5 · proof gates · repair 3회 · verifier 분리 | mission-intake 입력 게이트 · demo-build · submit-gate |
| harness-reference/Urban_Harness_설계_v4_이식 | 온보딩 3단계 · 개인 지침 3블록 · 리허설 5항목 | §8 · §12 |
| BE_AX_Infra/workstreams/community/onedayclass (2026-09-05 AIC 원데이클래스 덱·워크북) | 6문장 AI PRD · C·U·T 범위 게이트 · 제작 루프 기록(시킨 일/기대/실제) | PRD 양식 · mission-intake ③ · `log/` |
| 공식 행사 페이지 bloomworld.ai/community/ambition (2026-10-20 확인) | 09:00 공개 · 도착순 심사 · 8팀 조기 마감 · 1회 제출 · $500/인 · 2장 이내 · 데모데이 10분 | §1-1 · §5 · §11 · submit-gate · pitch-compile demoday |

## 18. 산출물 계약 (v1.0)

> **v1.1 수정안이 우선한다 (§19).** 이 절은 v1.0 기록이고, 충돌하면 §19의 v1.1 델타가 정본이다.
> 원천: v1.0 야간 빌드 계획 §4. `scripts/validate_mission.py`·`templates/`·`.claude/skills/`·`tests/`는 이 표 위에 §19(v1.1)를 덮어 쓴 기준을 따른다. 이 절을 바꾸는 것은 PM의 한 결정이며, 바꾸면 테스트부터 맞춘다 (`docs/TDD.md` §1).

공통: 파일 첫 줄은 `# <NAME> — <YYYY-MM-DD>` (추가 꼬리 허용). 라벨 집합 `verified | single-source | hypothesis | simulation`. 모든 시뮬레이션 산출물·fixtures는 본문 어딘가에 `[SIMULATION]` 문자열을 가진다.

| 파일 | 필수 H2 (순서 고정) | 내용 규칙 (rule-id) |
|---|---|---|
| `MISSION.md` | `## 원문` `## 사실` `## 해석` `## 미확인` `## 심사기준` `## 금지사항 · 도구 규칙` `## 제출물` `## 후보` | C-M1 원문 비어 있지 않음 · C-M2 해석 각 줄 끝에 `(해석: <이름/역할>)` · C-M3 미확인 각 줄에 `가정:` 포함 · C-M4 후보 표 정확히 3행, 열 `고객\|문제\|구매 이유\|8h 데모 장면\|라운드` |
| `DECISION.md` | `## 선택` `## 점수` `## 기각` `## 시장 주장` `## 수용 리스크` `## 결정` | C-D1 점수 표 3행, 열 `후보\|Mission Fit\|8h 데모 가능성\|구매 이유\|근거\|합계`, 값 1–5 정수·합계 일치 · C-D2 기각 2행 각 이유 · C-D3 시장 주장 줄에 라벨 1개 · C-D4 결정 줄에 `결정자:`와 `시각:` |
| `PRD.md` | (H2 없음) 번호 줄 6개 → `## C·U·T` | C-P1 6줄이 정확히 프레임 매치: `1. 사용자는 .+ 한 명입니다.` / `2. 이 사람은 .+ 때문에 불편합니다.` / `3. 이 도구의 핵심 행동은 .+ 하나입니다.` / `4. .+(을\|를) 넣으면 .+(을\|를) 보여줍니다.` / `5. 오늘은 .+, .+, .+(을\|를) 하지 않습니다.` / `6. .+하면 완료입니다.` · C-P2 빈칸(`______`) 잔존 0 · C-P3 C·U·T 세 줄 `Clear: PASS\|FAIL` `Usable: ...` `Tiny: ...` 전부 PASS |
| `mission/BOARD.md` | `## 게이트` `## 작업` `## 파일 소유` `## 예산` `## 슬롯` | C-B1 게이트 표에 G2·G3·G4·G5·G6 행, 열 `게이트\|시각\|확인\|상태` · C-B2 작업 표 열 `#\|작업\|담당\|소유 파일\|마감\|게이트\|의존\|상태`, 상태 ∈ todo/doing/done/blocked, 담당 1명(쉼표 금지) · C-B3 파일 소유 표에 `mission/`의 7파일 전부 · C-B4 예산 표 열 `워크스트림\|세션 수\|모델\|중단선` · C-B5 슬롯 표 열 `시각\|남은 슬롯` (행 0 허용) |
| `EVIDENCE.md` | `## 주장` `## Buyer simulation [SIMULATION — 실제 고객 아님]` | C-E1 주장 표 열 `#\|주장\|출처\|라벨\|신뢰\|쓰이는 곳`, 라벨 ∈ 집합, 신뢰 1–5 · C-E2 라벨 `verified`인 행은 출처에 연도(4자리) 포함 · C-E3 시뮬레이션 표 열 `페르소나\|시도\|결과\|반론\|지불 조건\|라벨`, 모든 라벨 = simulation (행 0 허용 = v1) |
| `PITCH.md` | `## Slide 1` `## Slide 2` `## 스크립트 (90초)` `## 심사기준 매핑` `## 라벨 점검` `## 반론과 수정` | C-T1 `## Slide 3` 없음 · C-T2 Slide 1·2 본문에서 숫자(%·원·$·명·건 등 단위 동반 또는 3자리 이상)가 있는 줄은 같은 줄에 라벨 또는 `[시뮬레이션]` · C-T3 스크립트 220단어(공백 기준) 이하 · C-T4 매핑 표 열 `심사기준\|어디서 다루나` · C-T5 금지어: `계약 체결`·`고객 인터뷰 결과`·`실사용자 N명` 류가 라벨 simulation/hypothesis 없이 등장하면 FAIL |
| `SUBMISSION.md` | 머리 줄 `검사자:` `확정:` `시각:` `최종 커밋:` → `## 체크` `## 산출물` `## 테스트` `## 알려진 결함` `## 판정` `## 제출` | C-S1 체크 표 10행, 열 `#\|확인\|결과\|증거\|시각`, 결과 ∈ PASS/FAIL · C-S2 판정 ∈ approve/revise/fail, FAIL이 하나라도 있으면 approve 금지 · C-S3 산출물 표 열 `파일/링크\|크기\|sha256` 행 ≥ 2 · C-S4 테스트 표 열 `회차\|시각\|통과 단계\|실패\|조치` 행 ≥ 1 · C-S5 검사자 ≠ 확정자 |
| `DEMODAY.md` (조건부) | `## 타임라인 (10분)` `## 데모 경로` `## 예상 질문 10` `## 복구` `## 리허설 기록` | C-Y1 예상 질문 표 10행, 열 `질문\|답\|라벨` · C-Y2 리허설 기록 행 ≥ 2 |

교차 규칙(`--stage submit`): X-1 PITCH 라벨 점검의 모든 주장이 EVIDENCE 주장 표에 있다(문자열 포함) · X-2 PRD 3번 문장의 핵심 행동 키워드(명사 1개 이상)가 `app/SMOKE.md`에 등장 · X-3 BOARD 게이트 상태가 전부 done이 아니면 SUBMISSION 판정 approve 금지.

공식 사실(`docs/event-rules.md` 원천, 2026-10-20 확인): 2026-10-24(토) 09:00–21:00 서울 AI 허브 · 체크인 08:30 · 09:00 미션 공개 · 10:00 개발 시작 · 17:00 창구 마감 · 도착순 심사 · 8팀 통과 시 조기 마감 · 팀당 1회 · 데모 링크 + 2장 이내 · 1인 $500 Claude 크레딧(개인 계정 이어쓰기 불가) · 19:00–20:30 데모데이 8팀×10분 · 심사기준·크레딧 형태·타 AI/사전 코드/외부 API 규칙 **미공개**. 팀 확정: 제출 목표 16:00 · 타 AI 금지(Roy).

### 18-1. v1.1 적용분 (2026-10-21, 리뷰 반영 — 위 표보다 우선)

> 원천: `HTHN_v1.1_AMENDMENT.md`의 해당 항목과 리뷰 지적. v1.1 전체 요약과 우선 규칙은 §19.

| 대상 | 바뀐 규칙 |
|---|---|
| 템플릿 지시문 | 인용(`>`)이 아니라 HTML 주석(`<!-- -->`) — 채운 뒤 지시문을 남겨도 빈칸(placeholder) FAIL이 나지 않는다 |
| `mission/BOARD.md` | 제목 꼬리에 슬롯 수 없음 (`· 재계획 <n>회`) · C-B1 G2–G5 상태 ∈ todo/doing/done/blocked, **G6 ∈ ready/approved/submitted** · 「슬롯」 행 추가는 Sales (append-only) |
| `EVIDENCE.md` | C-E1 주장 표 첫 열 `ID` (`E<n>`, 유일) · C-E2 verified는 연도 있는 **실제** 출처만 (`[SIMULATION]`·가상·시뮬레이션·추론·없음 불가) · C-E3 페르소나 칸마다 `[SIMULATION]` |
| `PITCH.md` | C-T2 숫자·실적 줄은 `(E<n> · <라벨>)` — EVIDENCE와 같은 라벨, verified·single-source는 ID 필수, 제품 설명은 `(제품 사양)` · C-T5 실적 표현(계약·인터뷰·실사용자·매출·파일럿·MOU·결제·구매 의향·고객 n)은 simulation/hypothesis 또는 verified ID와 함께만 (Slide 1·2·스크립트) · C-T7 「라벨 점검」 표 `주장 ID\|슬라이드\|라벨` (없으면 `없음`) |
| `SUBMISSION.md` | 머리 줄 `<역할>(<이름>)` · C-S1 체크 10행 확인 문구 고정, 결과 ∈ PASS/FAIL/NOT_RUN · C-S2 판정 ∈ approve/approve-with-defects/revise/fail, 면제 불가 1·3·4·5·10 · C-S3 산출물 `종류\|파일/링크\|버전\|크기\|sha256` (소스 커밋·배포 URL·발표 파일, URL 행 sha256 = `커밋 <hash>`) · (v1.0 C-S5 검사자 ≠ 확정자는 폐기 — §C 5: 3·5·6 검사자 PM이 확정도 한다. 항목별 검사자 ≠ 소유자는 X-5, 역할·이름을 같은 사람으로 비교) · C-S6 approve-with-defects = 결함 행 번호 전부 + `PM 승인:` · C-S7 「제출」 4줄 (제출 전 `미제출`) · (C-S8 없음 — 체크 10의 행사 모드 확인은 submit-gate 수동 항목) |
| `DEMODAY.md` | C-Y3 예상 질문 답의 실적 표현은 라벨 simulation/hypothesis 또는 verified ID |
| 교차 | X-1 라벨 점검 ID가 EVIDENCE에 있고 라벨이 같다 · X-3 G1–G5만 done이면 approve/approve-with-defects 가능 (G6은 제출 자체) |
| 운영 | 최종 한계 16:50 (16:30 하드스톱 대체) · HANDOFF `mode`/`stage` → CI가 행사 중 실제 `mission/` 검사 · `check.sh` PASS/FAIL/NOT_RUN |

## 19. v1.1 수정 (codexx 레드팀 반영)

> 원천: `HTHN_v1.1_AMENDMENT.md` (2026-10-20 22:20) · 근거: 레드팀 리뷰 `review/codexx_plan_redteam.md` (2026-10-20 21:59). 이 절이 §18·v1.0 변경표·v0.1 본문보다 우선한다.
> **Roy 고정 결정은 바꾸지 않았다**: 미션 09:00 · 제출 목표·상한 16:00 (최종 한계 16:50은 F1–F5 PASS일 때만) · 제출 1회 · 작업판 정본 `mission/BOARD.md` · G1 10:20 · G2 10:35 · G3 13:00 · freeze 14:00 · G4 14:45 · G5 15:30 · G6 16:00.
> 판정: 레드팀은 v1.0을 "당일 운영 투입 불가 — 제출 순환 의존, 실제 미션을 검증하지 않는 CI, 늦은 제출 준비"로 봤다. v1.1은 그 셋을 고친 설계이고, **상태는 여전히 `specified`다** — 사람 4명 동시 리허설 전까지 승격하지 않는다.

### 19-1. 치명 결함 7건 → 결정 (§A)

| # | 결함 | v1.1 결정 | 반영 위치 |
|---|---|---|---|
| A1 | 제출 승인이 제출 완료(G6 done)를 요구하는 순환 | X-3은 **G1~G5 done**만 요구. G6 상태는 `ready → approved → submitted` | 검증기 X-3 · `mission/BOARD.md` 게이트표 · CONTRACT 게이트표 G6 행 |
| A2 | 행사 중 `mission/` 생성이 구조 테스트를 깨고 CI는 fixture만 본다 | HANDOFF 머리 `mode: pre_event\|event` · `stage: intake\|decide\|board\|evidence\|pitch\|submit`(기본 `intake`). "mission/에 README만" 검사는 pre_event일 때만. `scripts/ci.sh`가 mode=event면 실제 `mission/`을 stage까지 검사하고 커밋·단계를 출력. CI(`.github/workflows/check.yml`)는 `scripts/ci.sh`를 돈다 | `HANDOFF.md` · `tests/test_structure.py` · `scripts/check.sh`·`ci.sh` · `check.yml` |
| A3 | 검사 미실행이 PASS로 끝난다 | 모든 검사는 `PASS / FAIL / NOT_RUN`. `check.sh`는 `RESULT <id> <status>` 줄(id: unittest · validate-good · validate-bad · pii · node-tests · event-mission), exit 1 = FAIL 있음 · 2 = 필수 NOT_RUN · 0 = 전부 PASS. submit-gate는 NOT_RUN을 FAIL로 취급하고 **같은 커밋의 CI 결과**로만 해소 | `scripts/check.sh` · `docs/TDD.md` §2-3 · CONTRACT 「제출 시각과 면제 불가 요건」 |
| A4 | BOARD 정본 두 곳 | 정본은 `mission/BOARD.md` 하나. 루트 `BOARD.md`는 삭제·생성 금지. G2 전 브리핑은 "보드 없음 (G2 전)" | 전 문서·스킬·검증기·템플릿 |
| A5 | 조기 마감에 대응할 준비 시각이 없다 | 제출 목표 16:00 유지, 준비를 앞당긴다: ① G2(10:35)에 빈 배포 URL ② 12:30 `pitch-compile skeleton`(2장 뼈대 + 주장 ID 목록) ③ 14:45 `submit-gate precheck`(체크 1~9 드라이런, 제출 없음) ④ 15:30 `submit-gate final` ⑤ 슬롯 관측 10:00부터 매시, 13:00부터 30분. PASS면 16:00 전에도 낸다 | CONTRACT 시간표·게이트표(관측·비트 행) · README · CLAUDE.md |
| A6 | 16:30 "결함 안고 제출" 예외가 규칙과 충돌 | **면제 불가 F1~F5**(F1 데모 URL 외부 접근 · F2 2장 이내 · F3 PII 0 · F4 시뮬레이션·라벨 표기 · F5 타 AI 미사용)는 어떤 시각에도 면제 없음. 기능 결함(체크 2·6·7·8·9)은 `## 알려진 결함` + `approve-with-defects` + PM 승인. 16:00 목표·상한, **16:50 최종 한계**(창구 17:00) | CONTRACT 「제출 시각과 면제 불가 요건 (A6)」 · submit-gate · SUBMISSION 템플릿 |
| A7 | 행사 Claude 사용 전제가 닫히지 않음 | 행사 모드 진입 조건 — 4명 각자 ① 행사 계정 로그인 클라이언트 ② 최초 허용 호출 1회 확인(`log/` 기록) ③ 개인 계정·타 AI 폴백 OFF. 미확인자는 호출 중단 → PM. hthn-start OPEN이 확인하고 브리핑 첫 줄에 적는다 | CONTRACT §C 10 · CLAUDE.md 「행사 당일 첫 행동」 · `log/README.md` |

### 19-2. 산출물 계약 보강 (§B — §18 위에 덮어쓴다)

- **단계별 필수 파일 (B0)**: intake = MISSION(후보 행 0 허용) · decide = MISSION 후보 3행 + DECISION + PRD · board = `mission/BOARD.md` · evidence = EVIDENCE(시뮬레이션 표 행 0 허용 = v1) · pitch = PITCH · submit = SUBMISSION + 앞 단계 전부 재검사 + X-1~X-5 (+ DEMODAY는 있을 때만) · demoday = DEMODAY.
- **Markdown 해석 (B1)**: 필수 H2는 순서대로·완전 일치, 사이·뒤 추가 H2 허용, 필수 H2 중복은 `S-dup-heading`. 표는 GFM(구분선 필수, `\|` 이스케이프). 빈 값 = 빈 칸·`<…>`·`______`·`TBD`·`[예시]`, `[예시]` 행은 건너뛴다. `[SIMULATION]`은 부분 문자열. 오류 분류 `S-*` → `C-*` → `X-*`, S 실패 파일의 C·X는 "신뢰 불가" 표시.
- **파일별 (B2)**: PRD 둘째 줄 `버전: v<n> (<HH:MM>)`(C-P4) · 6문장 fullmatch 프레임 · C·U·T 근거 필수 · DECISION 점수 합계·`선택:`·동점 처리 · BOARD 게이트 G1~G6(G6만 ready/approved/submitted)·작업 `T<n>` 의존 순환 금지·파일 소유 필수 10행(`소유자만\|append-only`)·예산 사람별 4행·슬롯 `시각\|남은 슬롯\|출처` · EVIDENCE 주장 `E<n>`(verified·single-source는 출처·연도)·Buyer simulation 경고 줄·`S<n>` 전부 simulation · PITCH Slide 1·2만·숫자/실적 줄 라벨·라벨 점검·제출 파일 `페이지: ≤2` · SUBMISSION 해시 머리 줄 3종·체크 10행 고정 문구·PASS/FAIL/NOT_RUN·판정 4종·`PM 승인:`·「제출」 4줄 · DEMODAY 리허설 기록 ≥ 2 · **`app/SMOKE.md`** = `# SMOKE` → 3단계(각 `기대:`) → `## 완료 조건` → `## 실행 기록`, 2단계에 PRD 3번 빈칸 텍스트, 「완료 조건」에 PRD 6번 빈칸 텍스트가 그대로.
- **교차 (B3)**: X-1 PITCH 라벨 점검 ID ⊂ EVIDENCE·라벨 동일 · X-2 PRD 3번 캡처 ⊂ SMOKE · X-3 G1~G5 done · X-4 PRD 6번 캡처 ⊂ SMOKE 「완료 조건」 · X-5 체크 행 검사자 ≠ 해당 소유자(1·2·8·9 ↔ `app/`, 3·5·6 ↔ `mission/PITCH.md`, 5는 Buyer simulation 소유자도 아님).
- **테스트 (B4)**: good-01에서 규칙별 변이(mutation)를 만들어 그 규칙만 FAIL하는지 · `check.sh` NOT_RUN·exit 2 (PATH 조작) · submit-gate 체크 1~10 ↔ 규칙 ID 매핑표(자동·수동·T0 같은 ID). 골격 앱은 `app/tests/scaffold-prd.md`[SIMULATION]와 `app/SMOKE.md`로 X-2·X-4를 node 테스트에서 시연한다.

### 19-3. 통합 규약 보강 (§C → `CONTRACT.md` 「git 통합 규약 (§C)」)

| # | 규약 | 한 줄 |
|---|---|---|
| C1 | 동기화 루프 | pull --rebase → 쓰기 → add 내 파일 → commit → push, 거절 시 재시도 최대 3회, 그래도 충돌이면 소유자가 푼다. AI는 force-push·`add -A` 금지 |
| C2 | clone당 쓰기 주체 하나 | 사람별 독립 clone, 사람이 편집할 때는 그 clone의 AI를 멈춘다 |
| C3 | 섹션 소유 | `EVIDENCE#주장`=GTM · `#Buyer simulation`=Sales · `mission/BOARD.md`=PM(「슬롯」 append는 Sales) · `HANDOFF#제안`=전원 append-only(`작성:<역할> <HH:MM>`) |
| C4 | PRD 버전 | G2 뒤 변경은 버전 증가 + HANDOFF 「결정」 + SMOKE·PITCH 소유자 재확인 |
| C5 | 검사자 배정 | 1·2·8·9 Sales · 3·5·6 PM · 4·7·10 Build, 확정 PM |
| C6 | 해시 대상 | 소스 커밋 · 배포 버전 · 발표 파일 sha256 — 하나라도 바뀌면 판정 무효 |
| C7 | T0 중계 | 기준 버전 · 대상 경로 · 변경 ID · 반영 확인 요청 4항목, 소유자가 검토·반영 |
| C8 | 제출 절차 | PM 1명 · 형식·용량 확인 · 접수 확인 저장 · 타임아웃 = 재전송 금지, 상태 확인 |
| C9 | 개인별 크레딧 | BOARD 예산 사람별(잔여 중단선 + 시간 상한), 재시도 3회 합쳐 30분 상한 |
| C10 | 행사 모드 진입 조건 | A7 |

### 19-4. 누락 보강 (§D)

| 파일 | 내용 |
|---|---|
| `docs/READINESS.md` (신규) | 행사 준비 완료 체크 R1~R7 (마감 10/23 20:00): 4명 repo 접근 · 4 환경 hthn-start · CI green · 배포 경로 1회 실측(빈 앱, 다른 기기) · **사람 4명 동시 리허설** · 행사 계정 경로 · 복구 지점. 실패 시 대체: ZIP 배포 · 로컬 파일 데모 · PM 대행 커밋 |
| `app/DEPLOY.md` | 「공개 데모 운영」 — 로그인 없음 · 심사자용 초기화 버튼(`#app-reset`) · 오류 배너(`#app-error`) · 다른 기기 확인 · 브라우저에 API 키 금지(Apps Script 프록시 또는 사전 생성 데이터) · 지연·차단 대응 · 사전 코드 불허 시 빈 앱 경로 |
| `app/RECOVERY.md` | 「전체 배포물 복구」 — `git tag good-<HHMM>` 또는 `app/` ZIP(Desktop) · 「재배포 실측」 기록 표 · `fallback.html`은 마지막 수단 |
| 시각 잔재 | 설계 원본의 "09:00 미션" 잔재는 행사 시작 시각이다 — 미션 공개는 09:00 (이 사본 §2·§4 정정) |
| `docs/TDD.md` | PASS/FAIL/NOT_RUN 의미 · 변이 테스트 · ID 동일 · "시뮬레이션 ≠ manual-pilot, 4명 동시 리허설 필수" |

### 19-5. 적용 순서 (§E)

1. v1.0 야간 빌드 완료 뒤 이 수정을 repo 전체(검증기·테스트·템플릿·스킬·CONTRACT·역할 키트·문서)에 적용 → `bash scripts/check.sh` green.
2. 그 뒤 L4 시뮬레이션 eval(`[SIMULATION]`). 시각화의 게이트 시각은 바뀌지 않는다(제출 16:00 유지). `docs/overview.html`의 당일 흐름에 12:30 skeleton·14:45 precheck를 더하는 것은 선택.
3. 승격(`specified → manual-pilot`)은 `docs/READINESS.md` R5 — 사람 4명 동시 리허설 통과로만.
