# tests — HTHn 하네스 테스트

> 테스트의 유일한 근거는 계약이다: `CONTRACT.md` + 산출물 계약(`docs/HTHN_DESIGN.md` §4, v1.1 수정안 §A2–A4·§B 반영).
> 테스트가 먼저 있고(red), 하네스 파일이 그것을 green으로 만든다. 구현을 보고 테스트를 고치지 않는다 — 계약과 다르면 틀린 쪽을 고친다.

## 실행

repo 루트에서:

```bash
python3 -m unittest discover -s tests -v      # 전체
python3 -m unittest discover -s tests -p "test_validators.py" -v   # 하나만
bash scripts/check.sh                          # 테스트 + 검증기 + PII 스캔 + 앱 테스트 (+ mode: event면 실제 mission/)
bash scripts/ci.sh                             # CI와 같은 것: check.sh --strict + 커밋·mode·stage를 첫 줄·끝 줄에
```

- 표준 라이브러리만 쓴다. 설치할 것이 없다.
- 모든 검사는 `PASS / FAIL / NOT_RUN` 셋 중 하나다. `check.sh`는 검사마다 `RESULT <id> <상태>` 한 줄(id: `unittest` · `validate-good` · `validate-bad` · `pii` · `node-tests` · `event-mission`)을 내고 exit **1** = FAIL 있음, **2** = 필수 검사(`unittest`·`pii`·`mode: event`일 때 `event-mission`)가 NOT_RUN, **0** = 필수 전부 PASS. 돌지 않은 검사는 PASS가 아니다.
- python이 없는 사람(T0)은 돌리지 못한다 — `check.sh`가 그 사실을 `NOT_RUN`(exit 2)으로 말한다. push하면 CI(`scripts/ci.sh`)가 같은 검사를 돌린다. CI는 하네스·fixture를 검사하고, `HANDOFF.md` 머리의 `mode: event`일 때만 실제 `mission/`을 `stage:`까지 검사한다 (결과: GitHub repo → Actions → check, 요약에 커밋·stage·RESULT 줄). submit-gate의 NOT_RUN은 **같은 커밋의 CI 결과 링크**로만 해소된다.

## 무엇을 지키나

| 파일 | 층 | 지키는 것 |
|---|---|---|
| `test_structure.py` | L1 구조 | 아래 12항목 + mode 분기(A2) |
| `test_validators.py` | L2 검증기 | `scripts/validate_mission.py`가 v1.1 §B 규칙을 실제로 검사하는가 — 규칙별 변이 테스트 포함 |
| `test_templates.py` | L2 템플릿 | 템플릿을 그대로 복사한 mission/이 "구조 PASS · 내용은 `C-empty` 등 C-/X- FAIL만"으로 판정되는가 |
| `test_pii_scan.py` | 위생 | `scripts/pii_scan.py`가 실제로 파일을 읽는가(`scanned=` > 0), 이메일·전화를 잡고 가려서 출력하는가, 0개를 읽으면 FAIL하는가, 못 읽은 바이너리(슬라이드 PDF)를 `SKIPPED`로 말하고 `--strict`면 FAIL하는가 |
| `test_check_sh.py` | 위생 | `scripts/check.sh`의 RESULT 줄·exit 0/1/2, python3를 PATH로 가려(없음 · 있지만 못 도는 stub) `NOT_RUN`·exit 2가 나오는가, `mode: event`면 실제 `mission/`을 `stage`까지 검사하는가, `scripts/ci.sh`가 커밋·mode·stage를 적는가 |
| `test_rules.py` | L1 규칙 | 안전·진실 규칙 문구(09:00 타 AI 금지 · 팀당 1회 · 재제출 불가 · 라벨 4종 · 승인 목록 · 16:50 · 면제 불가 F1–F5 · 타임아웃 재전송 금지)가 계약에 그대로 있는가, 어떤 SKILL.md도 AI에게 제출·게시를 시키지 않는가 |

### test_structure.py — 12항목

| # | 검사 | 깨지면 |
|---|---|---|
| 1 | `.claude/skills/` 아래 스킬 정확히 7개 · 헤더 `requires`가 `(없음)` 하나뿐 · `name`(폴더명과 같음)·`enhanced_by`·`degraded`·`verified_on` 존재 | 어떤 팀원 환경에서는 스킬이 안 돈다 (T0 위반) |
| 2 | 각 SKILL.md에 `## 사람이 하는 일` 절과 degrade 블록 예시(`[이 환경에는`) | 조용한 degrade · 사람이 할 일이 빠짐 |
| 3 | `CLAUDE.md`·`AGENTS.md`·`CONTRACT.md`·`HANDOFF.md`·`README.md` 존재 · **루트 `BOARD.md` 없음**(정본은 `mission/BOARD.md` 하나, A4) · CLAUDE.md가 CONTRACT·HANDOFF·`mission/BOARD.md`·`roles/`·`.claude/skills/`를 가리킴 · AGENTS.md가 CLAUDE.md를 가리킴 · HANDOFF 머리에 `mode: pre_event\|event`와 `stage:` | 진입점에서 길을 잃음 · 보드가 두 곳 |
| 4 | `roles/{pm,build,gtm-pitch,sales-buyer}.md` 각각에 `## 환경 세팅`·`## 내 TDD`·`## 내 파일` | 역할별 세팅·검증·소유가 비어 있음 |
| 5 | `templates/` 8종의 H2 헤딩이 계약과 **순서까지** 같음 · 첫 줄 `# <NAME> — ` | 템플릿과 검증기가 다른 말을 함 |
| 6 | `mode: pre_event`이면 `mission/`에는 `README.md`만 (점 파일 제외). `mode: event`이면 이 검사는 비켜서고 `check.sh`·CI가 `mission/`을 `stage`까지 검증기로 검사한다(A2) | 미션 전에 산출물이 미리 들어감 · 행사 중에 CI가 하루 종일 red |
| 7 | repo 전체(`.git`·`node_modules` 제외) 이메일 패턴·한국 전화번호 패턴 0건 | 팀원 연락처 유출 |
| 8 | 비밀 표지(Anthropic 키 접두·Google 키 접두·GitHub 토큰 접두·PEM 시작 줄) 0건 | 비밀 유출 |
| 9 | `CONTRACT.md` 게이트표에 G1~G6 행이 있고 각 행에 소관 스킬 이름 | 게이트에 주인이 없음 |
| 10 | `app/SMOKE.md`·`app/RECOVERY.md`·`app/index.html`·`app/tests/` | 앱 TDD 골격 없음 |
| 11 | `.github/workflows/check.yml`이 있고 `scripts/ci.sh`를 돈다 | python 없는 팀원의 안전망이 없음 · 행사 중 mission/이 검사되지 않음 |
| 12 | `docs/TDD.md`·`docs/HTHN_DESIGN.md`·`docs/event-rules.md`·`docs/prior-hypothesis.md` · prior-hypothesis 첫 20줄에 `미션 전 가설` | 사전 가설이 미션처럼 읽힘 |

- 추가: 팀 파일(`.claude/`·`CLAUDE.md`·`AGENTS.md`·`CONTRACT.md`·`HANDOFF.md`·`roles/`·`templates/`·`app/`)에 운영자 전용 도구 이름이 0건 · `.gitattributes`(LF 줄바꿈 · `HANDOFF.md merge=union`).
- 7·8번 스캔은 이 테스트 파일 자신도 검사한다. 그래서 비밀 표지 문자열은 코드 안에서 조각을 이어 붙여 만든다. 다른 파일에서도 같은 방식을 쓴다.
- 스캔이 아무 파일도 안 읽고 통과하는 일을 막으려고 "스캐너가 파일을 보았다" 검사가 따로 있다.

### test_validators.py — 검증기 계약

검증기 진입점은 둘이다.

- Python: `run(mission_dir, stage)` → `(status, stage, rule_id, message)` 목록
- CLI: `python3 scripts/validate_mission.py <dir> --stage <intake|decide|board|evidence|pitch|submit|demoday|all>`
  → 한 줄에 한 규칙 `PASS|FAIL|WARN <stage> <rule-id> <message>`, 마지막 줄 `SUMMARY pass=<n> fail=<n> warn=<n>`, FAIL 없으면 exit 0, 있으면 1 (WARN은 exit에 영향 없음)

stage → 검사 파일(B0): intake = MISSION(C-M1~M3, 후보 0행 허용) · decide = MISSION 전체 다시 + C-M4(후보 3행) + DECISION + PRD · board = `mission/BOARD.md` + X-6(WARN) · evidence = EVIDENCE(시뮬레이션 0행 허용) · pitch = PITCH(+ EVIDENCE가 있으면 X-1) · submit = 앞 단계 전부 재검사 + SUBMISSION + X-1~X-5 + DEMODAY(있을 때만) · demoday = DEMODAY.

규칙 ID: `S-*` 구조(헤딩·표·열) → `C-*` 내용(프레임·enum·빈 값) → `X-*` 교차. 같은 파일에 S 실패가 있으면 그 파일의 C·X 결과 메시지에 `[구조 실패로 신뢰 불가]`가 붙는다.

| 검사 | 내용 |
|---|---|
| fixture 위생 | fixture 파일 전부에 `[SIMULATION]` · good-01은 9개 파일 전부 보유 |
| 결과 모양 | 행은 4칸 · status ∈ PASS/FAIL · rule-id는 `S-`·`C-`·`X-`로 시작 |
| good-01 | 8개 stage 모두 FAIL 0 · `--stage all`에서 계약 규칙 47개(S-dup-heading · C-empty · C-M1…C-Y3 · X-1…X-5)가 **전부 보고됨** · 제출 직전 상태(G6 `approved`, 「제출」 미제출)로 바꿔도 PASS |
| stage → 파일 (B0) | 단일 파일 stage는 자기 파일 규칙만 · intake는 후보 0행 허용, decide는 3행 필요 · evidence는 시뮬레이션 0행 허용 · submit은 앞 단계 재검사 · DEMODAY는 submit에서 선택, demoday에서 필수 · 정본 보드는 `mission/BOARD.md` 하나 (루트 보드 폴백 없음) · `app/SMOKE.md`는 mission/ 안 또는 옆 |
| Markdown 해석 (B1) | 필수 H2 사이 추가 H2 허용 · 헤딩 공백 trim · 순서 위반 FAIL · 구분선 없는 표는 표가 아님 · 헤더 셀 trim 후 완전 일치 · `\|` 이스케이프 · `[예시]` 행·줄 건너뛰기 · `[SIMULATION]` 부분 문자열 · 구조 실패 시 신뢰 불가 표시 |
| 변이 (B4) | good-01을 복사해 **한 곳만** 깨고 **그 규칙만** FAIL하는지(빈 값 변이는 `C-empty` 동반 허용). 규칙: S-dup-heading · C-M4 · C-D1·D2·D5·D6 · C-P1(문장 4 통과형 `음성을 넣으면 요약을 보여줍니다.` / 실패형 `4. 음성 요약`)·P2·P3·P4 · C-B1(G6 enum)·B2(순환·담당 2명·없는 의존·형식·중복)·B3·B4·B5 · C-E1·E2·E3·E4 · C-T1(`## Slide 4`)·T2·T3·T4·T5·T6·T7·T8 · C-S1·S2(면제 불가 1·3·4·5·10)·S3·S4·S6(결함 번호·`PM 승인:`)·S7 · X-1(라벨 상향·없는 ID)·X-2·X-3(G6는 보지 않음)·X-4·X-5(BOARD 「파일 소유」로 소유자 조회) · C-empty(`<…>`·`______`·`TBD`·빈 칸) · C-Y2 · BOM |
| bad-01 (복합) | 서로 다른 FAIL 8종 이상 · PRD·EVIDENCE·PITCH·SUBMISSION·BOARD 다섯 파일 모두에서 FAIL · 심어 둔 위반 23개 각각 검출 · 멀쩡한 부분 19규칙은 FAIL 없음(오탐 방지) · S- FAIL 없음 · stage별 필터가 맞음 |
| CLI | 줄 형식 · SUMMARY가 마지막 줄이고 숫자가 맞음 · exit 0/1 · API와 CLI의 FAIL 집합이 같음 · 빈 폴더는 `S-` FAIL |
| 콘솔 인코딩 | `PYTHONIOENCODING=cp949`(한국어 Windows)에서도 CLI가 traceback 없이 SUMMARY를 낸다 |

### test_templates.py — 템플릿

| 검사 | 내용 |
|---|---|
| 파일 | 산출물 템플릿 8종 + `log-entry`·`me-common`·`me-env`·`me-style` |
| 슬롯 | 산출물 템플릿마다 `<...>` 자리 표시가 있음 · 표의 데이터 행은 `[예시]`·`<...>`·계약 고정 「파일 소유」 행 중 하나 |
| 그대로 복사 | 임시 `mission/`(`mission/BOARD.md` 포함) + 옆 `app/SMOKE.md`에서 어느 stage도 `S-` FAIL 없음 · FAIL은 `C-`/`X-`만 · 8종 모두 `C-empty` 보고 · 빈 PRD는 C-P1~C-P4 중 하나 이상 FAIL |
| 채운 템플릿 | 빈칸을 채우고 `[예시]` 행과 지시문(HTML 주석)은 남긴 상태에서 `C-empty` FAIL 0 — 지시문은 인용(`>`)이 아니라 주석이다 |

## fixtures

| 폴더 | 의도 |
|---|---|
| `fixtures/missions/good-01/` | [SIMULATION] 가상 미션 "냉장고 재료로 저녁 메뉴 추천". **제출이 끝난 뒤** 상태(G6 `submitted`, 「제출」 채움). 모든 stage PASS. `DEMODAY.md`(조건부)까지 포함. 제출 직전 상태와 규칙별 변이는 테스트가 이 폴더를 복사·변이해 만든다 |
| `fixtures/missions/bad-01/` | [SIMULATION] 가상 미션 "영수증 사진 분류". 여러 규칙을 한꺼번에 깬 복합 사례. 각 파일 머리의 인용 블록에 심어 둔 위반이 적혀 있다 |

fixture 폴더 하나가 곧 `mission/` 폴더다. `BOARD.md`(= 정본 `mission/BOARD.md`)와 `app/SMOKE.md`는 fixture 안에 둔다. 실제 repo에서는 `app/SMOKE.md`가 `mission/` 옆에 있고, 검증기는 `<dir>/app/SMOKE.md`를 먼저 보고 없으면 `<dir>/../app/SMOKE.md`를 본다. BOARD는 `<dir>/BOARD.md`만 본다.

bad-01에 심어 둔 위반:

| 파일 | 위반 | 규칙 |
|---|---|---|
| PRD.md | 1번 문장 틀 위반 · 5번에 `______` 잔존 · `Tiny: FAIL` · 버전 줄 없음 | C-P1 · C-P2 · C-P3 · C-P4 |
| BOARD.md (= `mission/BOARD.md`) | 게이트표에 G6 없음 · 담당 칸 2명 · 파일 소유표에 `mission/EVIDENCE.md#Buyer simulation` 없음 · G5 `doing` | C-B1 · C-B2 · C-B3 · X-3 |
| EVIDENCE.md | 라벨 오타 `verifed` · verified 행 연도 없음 · 시뮬레이션 표 라벨 hypothesis · 시뮬레이션 고지 줄 없음 | C-E1 · C-E2 · C-E3 · C-E4 |
| PITCH.md | `## Slide 3` · 라벨 없는 숫자 · 스크립트 220어절 초과 · 라벨 없는 `계약` · 제출 파일 3쪽 | C-T1 · C-T2 · C-T3 · C-T5 · C-T8 |
| SUBMISSION.md | 체크 9행 · FAIL 있는데 approve · 산출물에 배포 URL·발표 파일 행 없음 · 앱 소유자가 앱 행 검사 | C-S1 · C-S2 · C-S3 · X-5 |
| app/SMOKE.md | PRD 3번 캡처 텍스트 없음 · `## 완료 조건` 없음 | X-2 · X-4 |

규칙: fixture는 전부 가상이다. 실명(성 포함)·연락처를 넣지 않고, 사람은 역할명이나 이름(성 없이)으로만 쓴다. 새 fixture를 만들면 모든 파일에 `[SIMULATION]`을 넣는다.

## 테스트를 바꾸고 싶을 때

계약(§4·v1.1 수정안·CONTRACT.md)이 먼저 바뀌어야 한다. 계약이 그대로인데 테스트만 고치면 하네스가 거짓말을 한다. 바꿀 것은 HANDOFF.md 「제안」에 적고 PM이 정한다.
