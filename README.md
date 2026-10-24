> **Disclosure (Ambition for Korea, 2026-10-24).** This repository was created at 10:23 on event day. Its first commit (tag `pre-event`, pushed at 10:52) imports our team's **process harness** prepared before the event — contract, role guides, skill prompts, templates, validators, CI — and an **empty app skeleton with no product features** (`app/`). All product code is written after 10:00 in the commits that follow that tag: `git diff --stat pre-event..HEAD -- app/`. The same statement is entered in the submission form ("기존에 만들어 둔 코드나 제품을 일부 가져왔어요").
>
> **사전 준비물 공개.** 이 레포는 행사 당일 10:23에 만들었다. 첫 커밋(`pre-event` 태그, 10:52 push)은 행사 전에 준비한 **팀 프로세스 하네스**(계약·역할 가이드·스킬·템플릿·검증기·CI)와 **제품 기능이 없는 빈 앱 골격**이다. 제품 코드는 전부 그 뒤 커밋에서 썼다.

# HTHn — Hackathon Team Harness

**어떤 미션이 와도 4명이 각자의 역할로 환경을 세팅하고, 기획·개발·통합을 같은 7단계·6게이트로 돌아 데모 링크 + 2장을 한 번에 제출하게 하는 팀 repo.**

설치할 것이 없다. 이 폴더에서 Claude를 열면 `CLAUDE.md`가 나머지를 끌어온다. 제품은 미리 정하지 않는다 — 미션이 정한다.

상태: specified (리허설 전 · v1.1) · 행사 준비 완료 체크: [`docs/READINESS.md`](docs/READINESS.md) (마감 10/23 20:00) · 전체 그림: [`docs/overview.html`](docs/overview.html) (브라우저로 연다)

```
① 계약   CLAUDE.md · CONTRACT.md                 누가 무엇을 언제 결정하고 무엇이 완료인가
② 스킬   .claude/skills/*/SKILL.md (7)          같은 절차 — 도구가 없어도 돈다 (T0)
③ 관측   HANDOFF.md · mission/BOARD.md · log/    팀 상태의 정본은 git
④ 검증   tests/ · scripts/ · app/tests/          계약 → 테스트 먼저 → 빌드 → green
```

## 온보딩 3단계 (행사 전, 한 사람 15분)

| 단계 | 누가 | 하는 일 |
|---|---|---|
| 1 | 사람 | repo를 받는다 — `git clone` / GitHub Desktop / ZIP 다운로드(git 없음). **사람마다 자기 clone** 하나 (한 clone의 쓰기 주체는 한 번에 하나 — `CONTRACT.md` §C 2) |
| 2 | 사람 | 그 폴더에서 Claude를 연다 (Claude Code CLI 권고 · Desktop 앱 Code 탭도 가능) — `CLAUDE.md`가 읽힌다 |
| 3 | AI | `/hthn-start` — 환경 감지 → 역할 1문 → 역할 키트 읽기 → `me/` 3블록 → 브리핑 → `log/` 1건 왕복 검증 (git이 있으면 push, 없으면 GitHub 웹 편집기로 커밋 — 막히면 PM 대행 커밋) |

내 역할의 환경 세팅·스킬·파일·시간표·TDD는 역할 키트에 있다:
[`roles/pm.md`](roles/pm.md) · [`roles/build.md`](roles/build.md) · [`roles/gtm-pitch.md`](roles/gtm-pitch.md) · [`roles/sales-buyer.md`](roles/sales-buyer.md)

## 당일 흐름 (2026-10-24)

| 시각 | 단계 | 스킬 | 주 담당 | 게이트 |
|---|---|---|---|---|
| 08:30 | 체크인·진입 · 행사 모드 진입 조건 3개 (`CONTRACT.md` §C 10) | hthn-start | 전원 | — |
| 09:40쯤 | 미션 → 후보 3 (HANDOFF `mode: event` · `stage: intake`) · 10:00 새 공개 레포 · 10:30 주제·레포 선언 — `docs/event-day-official.md` | mission-intake | PM → 전원 | — |
| 10:00 | 슬롯 관측 시작 — 매시, 13:00부터 30분마다 | — | Sales | 관측 |
| 10:20 | 결정 · PRD 6문장 (`버전: v1`) | mission-intake | PM 결정 | **G1** |
| 10:35 | 보드 `mission/BOARD.md` · 파일 소유 · 빈 배포 URL ‖ 시장 근거 | sprint-board · demo-build ‖ evidence-research | PM·Build ‖ GTM·Sales | **G2** |
| 10:30–14:00 | 빌드 (SMOKE → tests → 코드 → 배포) | demo-build | Build | **G3** 13:00 · freeze 14:00 |
| 12:30 | 피치 뼈대 — 2장 뼈대 + 주장 ID 목록 | pitch-compile (skeleton) | GTM | 비트 |
| 14:00–14:45 | MVP 테스트 ‖ 구매자 시뮬레이션 | demo-build ‖ evidence-research | Sales (Build 실행 보조) | **G4** 14:45 |
| 14:45 | 제출 사전 점검 — 체크 1~9 드라이런, 제출 없음 | submit-gate (precheck) | 항목별 검사자 | 비트 |
| 14:00–15:30 | 2장 + 90초 스크립트 | pitch-compile | GTM | **G5** 15:30 |
| 15:30–16:00 | 최종 검사 → 제출 1회 (PASS면 16:00 전에도 · 16:50 최종 한계는 F1–F5 PASS일 때만) | submit-gate (final) | 검사자 → PM 확정·제출 | **G6** 16:00 |
| 19:00 | 데모데이 (1차 통과 시) | pitch-compile | GTM → 전원 | — |

작업판 정본은 `mission/BOARD.md` 하나다 (루트 `BOARD.md` 없음 · G2 전에는 "보드 없음"). 통합: G3·G4·G5에서 PM이 `/sprint-board integrate`로 PRD ↔ 데모 ↔ 근거 ↔ 피치가 맞는지 본다. 자세한 시간표·게이트·권한·git 규약은 [`CONTRACT.md`](CONTRACT.md).

## 검사 (TDD)

```
bash scripts/check.sh      # 검사마다 RESULT <id> PASS|FAIL|NOT_RUN, 마지막 줄 CHECK 상태
                           # exit 0 PASS · 1 FAIL 있음 · 2 필수 검사 NOT_RUN (NOT_RUN은 PASS가 아니다)
```

테스트가 먼저 쓰이고 빌드가 green으로 만든다 — 계층과 당일 절차는 [`docs/TDD.md`](docs/TDD.md). push마다 CI(`scripts/ci.sh`)가 같은 검사를 돌고, `HANDOFF.md`가 `mode: event`이면 실제 `mission/`도 `stage`까지 검사한다 (결과: GitHub repo → Actions → check).

## 규칙 3줄

1. 팀원 연락처는 어디에도 쓰지 않는다. 사람은 역할명이나 이름(성 없이)으로.
2. 시뮬레이션·가상 데이터는 `[SIMULATION]` / `synthetic` / "시뮬레이션"으로 표기한다. 하지 않은 검증을 사실처럼 쓰지 않는다.
3. 09:00 이후 타 AI 금지 — 행사 제공 Claude 크레딧만, 행사 계정에서만.

## 더 읽을 것

- [`CLAUDE.md`](CLAUDE.md) — 읽는 순서 · 스킬 목록 · 쓰기 규칙
- [`HANDOFF.md`](HANDOFF.md) · `mission/BOARD.md`(당일 G2부터) — 지금 상태와 작업판
- [`docs/READINESS.md`](docs/READINESS.md) — 행사 준비 완료 체크와 실패 시 대체 경로
- [`docs/event-rules.md`](docs/event-rules.md) — 대회 공식 규칙과 미확인 목록
- [`docs/prior-hypothesis.md`](docs/prior-hypothesis.md) — 미션 전 가설 (자동 승격 없음)
- [`docs/HTHN_DESIGN.md`](docs/HTHN_DESIGN.md) — 설계 전문
