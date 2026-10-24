---
mode: event
stage: decide
---
# HANDOFF — HTHn 팀 상태

> 팀 상태의 정본이다. Discord는 대화, 이 파일은 상태다. 읽기 전에 `git pull --rebase --autostash`, 쓰고 나서 바로 push. git이 없으면 GitHub 웹에서 이 파일을 연다.
> 쓰기 권한: 맨 위 `mode`·`stage` 두 줄과 「현재 단계」「결정」은 PM만 고친다. 「체크포인트」「제안」「블로커」는 누구나 **그 절의 끝에 덧붙이기만** 한다 — 파일 맨 끝이 아니라 그 절의 마지막 줄 뒤(다음 `##` 바로 위)다. 예: 체크포인트 줄은 `## 결정` 바로 위에 (남의 줄 수정 금지).
> 사람은 역할명이나 이름(성 없이)으로만 적는다. 연락처는 쓰지 않는다.
> 이 파일은 git union 병합이다(`.gitattributes`): 두 사람이 동시에 덧붙여도 양쪽 줄이 모두 남는다. pull 뒤에는 내 줄이 남았는지, 같은 줄이 두 번 생기지 않았는지만 본다.

## 현재 단계

> 사용법: PM이 단계가 바뀔 때마다 이 세 줄을 고쳐 쓴다. 단계 번호는 `CONTRACT.md` 시간표의 #(0–9).
> 맨 위 머리(front matter) 두 줄 — CI·`scripts/check.sh`·구조 테스트가 이 두 줄만 읽는다. 다른 줄에 `mode:`·`stage:`를 쓰지 않는다.
> - `mode`: `pre_event`(행사 전·리허설 준비) | `event`(09:00 미션 공개부터 제출까지). PM만 바꾼다.
> - `stage`: 지금 완성돼 있어야 하는 마지막 단계 — `intake`(09:55 MISSION.md · 후보 행 0 허용) → `decide`(G1 10:20) → `board`(G2 10:35 · `mission/BOARD.md`) → `evidence`(EVIDENCE v1 11:00, v2 14:45) → `pitch`(G5 15:30) → `submit`(15:30~ · 앞 단계 전부 재검사). 기본값은 `intake`다 — 행사 전에도 `intake`로 두고, `mode: pre_event`인 동안 stage는 검사에 쓰이지 않는다.
> - `mode: event`이면 `scripts/check.sh`와 CI(`scripts/ci.sh`)가 실제 `mission/`을 stage까지 검증기로 검사하고 결과 줄에 커밋·단계를 적는다. `mode: pre_event`이면 `mission/`에 README.md만 있어야 한다(구조 테스트).
> - 09:00 미션 공개 직후 PM이 `mode: event`로 바꾸고(stage는 `intake` 그대로) MISSION.md와 함께 커밋한다. 게이트를 통과할 때마다 PM이 stage를 한 칸 올린다.
> - 리허설: 행사일이 아닌 날 `mode: event`로 연습할 때 PM이 머리에 `rehearsal: true` 한 줄을 더한다 (행사 모드 줄과 submit-gate 체크 10이 리허설 형식을 쓴다 — `CONTRACT.md` §C 10). 행사일(10/24)에는 이 줄이 있으면 `scripts/check.sh`가 FAIL이다.
> - 리허설이 끝나면 `mission/`을 README.md만 남기고 비운 뒤 `mode: pre_event` · `stage: intake`로 되돌리고 `rehearsal:` 줄을 지운다. 행사 준비 완료 체크는 `docs/READINESS.md`.

- 단계: 행사 전 준비 — 하네스 상태 specified (리허설 전)
- 다음 게이트: 없음 (행사 당일 G1 10:20부터)
- 갱신: PM

- 2026-10-24 09:35 · 오늘 아침 하네스 업데이트는 `docs/UPDATE_2026-10-24.md`(가져오기·변경·역할별 1분 확인) → `docs/event-day-official.md`(공식 규칙 정본) 순서로 읽는다. 10:00 새 공개 레포로 이동한다.

## 체크포인트

> 사용법: 자리를 뜰 때 `/hthn-start close`가 한 블록을 덧붙인다 — `시각 · 역할 · 바뀐 파일 · 검증(명령과 결과) · 블로커 · 다음 한 줄 · 커밋 해시`(git 없으면 수정 시각).
> 작업 행 상태는 담당이 여기에 한 줄로 알린다 — `T<n> <todo|doing|done|blocked> · 커밋 <hash> · <역할>`. PM이 BOARD 「작업」 상태 칸으로 옮긴다 (BOARD의 쓰기 주체는 PM 하나).
- 2026-10-24 09:25 · Claude(행사 전 정비, Roy 세션) · 주최 공식 공지(10/23 밤)·제출 페이지·발표자료 키트를 하네스에 반영: `docs/event-day-official.md`(정본) · CONTRACT 시간표 1·2·3·3'·9 + §E · templates MISSION/SUBMISSION/DEMODAY · submit-gate·pitch-compile 부록 · `scripts/bootstrap_public_repo.sh`(10:00 새 공개 레포) · `templates/slide-kit/`. 핵심: 미션 09:40쯤 · 10:00 새 공개 레포 · 10:30 주제·레포 선언 · 제출 양식 9칸 · PDF 로고 띠 · 결선 3분 영어+7분 한국어 · 앱 21:00까지. PM 결정 4건은 문서 §5. 이 뒤로 행사 작업은 Console 로그인 Claude Code에서만.

## 결정

> 사용법: PM(결정자)이 「제안」이나 🚨 승인 답을 승격할 때만 쓴다 — `시각 · 결정 한 줄 · 결정자 · 근거(파일 경로나 제안 번호)`.
> G2 뒤 PRD를 바꾸면 여기 `PRD v<n> → v<n+1>` 한 줄을 남기고, 영향받는 `app/SMOKE.md`·`mission/PITCH.md` 소유자가 다시 ✓한다 (`CONTRACT.md` §C 4).
- 11:30 · G1: 후보 A(미국 프리랜서 카피라이터 · Second Draft) 선택, PRD v1 · 결정자 PM(우영) · 근거 mission/DECISION.md · mission/PRD.md

## 제안

> 사용법: 남의 파일·팀 방향에 대한 제안은 여기 덧붙인다 (전원 append-only — `CONTRACT.md` §C 3) — `작성:<역할> <HH:MM> · 대상 파일 · 제안 한 줄 · 출처(Discord 링크 등)`. 충돌이 나면 양쪽 줄을 다 남긴다. PM이 읽고 「결정」으로 올리거나 기각한다.
> T0 중계(git 없는 팀원이 Discord로 보낸 변경)는 4항목을 붙여 여기 옮긴다 — `기준 버전(커밋 또는 ZIP 시각) · 대상 경로 · 변경 ID · 반영 확인 요청`. 그 파일 소유자가 검토해 반영한다 (`CONTRACT.md` §C 7).
- 작성:Sales 11:55 · `mission/EVIDENCE.md#Buyer simulation` · S1–S3 초안(14:00 실행 전 예상 표기) + 합성 페르소나 저니·시나리오 3개(카피라이터·번역가·일러스트) → `docs/gtm/journey-io.md` · 출처: 팀 채널 11:11–11:20 논의
- 작성:Sales 11:55 · `mission/PRD.md` → PM · 인풋 범위를 3단계로 닫는 제안 — 오늘: 텍스트 3칸만 / MVP: 포트폴리오 링크 1~3개 + 1탭 체크인 / 로드맵: 라이프로깅·생체·SNS (`docs/gtm/journey-io.md` 「인풋·아웃풋 범위」)
- 작성:Sales 11:55 · `app/` 시드 데이터 → Build · 샘플 페르소나 "Dana" [SIMULATION] 입력 3칸·경로 3개·이번 주 행동 3개·Not today 문구를 [Load sample persona] 시드로 제안 (`docs/gtm/journey-io.md` 「대표 저니」)
- 작성:Sales 11:55 · `mission/PITCH.md` → GTM · 아키텍처 문구 1줄 제안 "오늘 URL에서 도는 것은 filter·planner·monitor의 최소 버전, gateway·status·자동 수집은 설계 주장" + VC 지표 가설 "2주차 체크인 잔존율" (`docs/gtm/journey-io.md` 「GTM 한 줄」)
- 작성:Sales 12:05 · `mission/EVIDENCE.md#주장` → GTM · E1–E27 후보 `docs/gtm/market-claims.md` — 강한 근거: BLS 2025 직군 규모(E1–E4) · Upwork 소득 −5.2%/−9.4% 연구(E11 verified) · 코치 시급 $139·아웃플레이스먼트 1인당 $1,660(E17·E18 verified) / 약한 가설: 10M 도달(E27, 비율 출처 없음) · 지불 전환율(E23·E24) — 슬라이드엔 공식 합계 70만 명(E25) + "10M은 가설"로 쓰길 제안

## 블로커

> 사용법: 같은 문제로 3회 막히면 고치기를 멈추고 여기 적은 뒤 PM에게 🚨 한 결정을 묻는다 — `시각 · 역할 · 막힌 것 · 시도한 것 · 필요한 결정`. 답을 기다리는 🚨(승인 대기로 실행이 멈춘 것)도 여기에 한 번만 적는다 — `시각 · 역할 · 🚨 <한 결정> · 대기: 승인 · 수신: PM(<이름>)` (「제안」에 또 적지 않는다). 풀리면 줄 끝에 `→ 해결 <시각>`을 덧붙인다.
