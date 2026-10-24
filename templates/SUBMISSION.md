# SUBMISSION — <YYYY-MM-DD>

검사자: <역할>(<이름>)
확정: PM(<이름>)
시각: <HH:MM>
소스 커밋: <커밋 해시 | git 없음: 내용 sha256 64자리 (no git)>
배포 버전: <배포 ID | 배포 시각 + 커밋 해시>
발표 파일 sha256: <sha256 64자리>

<!-- submit-gate 영수증. 머리의 `검사자:`는 영수증 작성자(기본 Sales)다 — 보통 확정자(PM)와 다른 사람이지만 검증하지 않는다 (행 단위 규칙은 X-5. PM은 체크 3·5·6을 검사하고 확정도 한다). 사람 표기는 `역할(이름)`. 이 주석은 지우지 않아도 된다 (검증기는 주석을 읽지 않는다).
리허설 영수증이면 머리 줄 아래에 `[SIMULATION] 리허설 — 실제 제출 아님` 한 줄을 둔다. 리허설에서 생길 수 없는 행(체크 10의 행사 계정)은 결과 NOT_RUN · 증거 첫머리 `[SIMULATION 대체]` (PASS 금지 — C-S1).
회차: 14:45 precheck = 체크 1–9 드라이런(제출 없음, 결과는 「체크」 행과 「테스트」 한 행 둘 다 · 체크 9는 HANDOFF stage까지만 · 체크 3·PITCH 빈칸 FAIL은 예상된 것) · 15:30 final = 10행 전부. 16:00이 목표·상한 — PASS면 16:00 전에도 낸다. 16:50이 최종 한계이고 F1–F5(체크 1·3·4·5·10)가 PASS일 때만 그때까지 낸다. 그 뒤에는 내지 않는다.
「체크」: 10행의 # · 확인 문구는 바꾸지 않는다 (C-S1). 결과는 PASS · FAIL · NOT_RUN 중 하나 — 돌리지 못한 검사는 NOT_RUN이고 FAIL과 같이 다룬다 (같은 커밋의 CI 결과 링크로만 해소). 증거 칸에는 확인한 방법과 결과를 적는다.
검사자 칸(X-5): 그 행이 검사하는 산출물의 소유자(mission/BOARD.md 「파일 소유」)가 아닌 사람. 기본 배정 1·2·8·9 Sales · 3·5·6 PM · 4·7·10 Build, 확정은 PM. 행 1·2·8·9 ≠ `app/` 소유자, 행 3·5·6 ≠ `mission/PITCH.md` 소유자, 행 5는 `mission/EVIDENCE.md#Buyer simulation` 소유자도 아니어야 한다.
「판정」: approve = 10행 전부 PASS · approve-with-defects = 면제 불가 1·3·4·5·10이 PASS이고(C-S2) 나머지 FAIL/NOT_RUN 행 번호가 「알려진 결함」에 `#<번호>`로 전부 있고 `PM 승인:` 줄이 있을 때(C-S6) · revise · fail. 어느 approve든 mission/BOARD.md G1–G5가 전부 done이어야 한다 (X-3).
해시 3종(소스 커밋 · 배포 버전 · 발표 파일 sha256) 중 하나라도 바뀌면 판정은 무효 — 다시 돌린다. 발표 파일 sha256: macOS·Linux `shasum -a 256 pitch/slides.pdf` · Windows `certutil -hashfile pitch\slides.pdf SHA256`. git이 없으면 소스 커밋·배포 URL의 sha256 칸은 `내용 sha256 64자리 (no git)` (submit-gate 「git 없음」의 명령) — 그때 체크 9의 git diff 부분은 NOT_RUN.
배포 URL 행의 파일/링크는 `https://`로 시작하는 주소만 (없으면 C-S3 FAIL = 체크 1 FAIL).
「테스트」 통과 단계: `3/3 (배포 URL · 브라우저)`처럼 대상(배포 URL · 로컬 · fallback)과 방식(브라우저 · node · 판독)을 붙인다. 체크 2·F1의 근거는 배포 URL 행뿐, 판독은 실행이 아니다 (그 단계는 NOT_RUN). 기록은 Sales — Sales가 없으면 Build가 `기록 대행 Build`로 적고 precheck 전에 Sales가 확인한다.
「제출」의 양식 줄: 체크 7 검사자가 MISSION 「제출물」의 `양식 필드`대로 미리 채운다. 사전 준비물 문장(정본, 다른 곳도 이 문장 그대로): "사전 준비물: 팀 프로세스 하네스(계약·스킬·템플릿·검증기)와 빈 앱 골격(제품 기능 0) — 10:00 새 공개 레포의 첫 커밋(pre-event 태그)으로 가져옴, 그 이후가 당일 작업 (제출 양식 「기존 코드 가져왔어요」 체크 + 「무엇을 가져왔나요」에 이 문장)". 양식에 설명 칸이 없으면 이 문장을 Slide 2 맨 아래 한 줄로 넣고 `양식 사전 준비물: Slide 2 하단`으로 적는다.
「제출」의 담당·시각·접수 확인·타임아웃 네 줄은 제출 전에는 `미제출`로 두고 PM이 제출한 뒤 채운다. 응답 없음·타임아웃은 실패가 아니다 — 재전송하지 않고 접수 상태를 먼저 확인한다 (C-S7). `[예시]` 행·줄은 지운다. -->

## 체크

| # | 확인 | 결과 | 증거 | 검사자 | 시각 |
|---|---|---|---|---|---|
| 1 | 데모 URL 접근 | <PASS\|FAIL\|NOT_RUN> | <다른 기기 브라우저로 로그인 없이 연 결과> | Sales(<이름>) | <HH:MM> |
| 2 | 핵심 행동 실행 (SMOKE 3/3) | <PASS\|FAIL\|NOT_RUN> | <배포 URL /tests/ n/3 · node --test 결과> | Sales(<이름>) | <HH:MM> |
| 3 | 2장 파일 (페이지 ≤ 2) | <PASS\|FAIL\|NOT_RUN> | <파일 경로 · 쪽수 · Slide 3 없음> | PM(<이름>) | <HH:MM> |
| 4 | 개인정보 0 | <PASS\|FAIL\|NOT_RUN> | <pii_scan SUMMARY 줄 · 슬라이드 텍스트 검색 방법> | Build(<이름>) | <HH:MM> |
| 5 | 라벨·시뮬레이션 표기 | <PASS\|FAIL\|NOT_RUN> | <C-T2·C-T5·C-E3·C-E4·X-1 결과> | PM(<이름>) | <HH:MM> |
| 6 | 심사기준 매핑 | <PASS\|FAIL\|NOT_RUN> | <매핑 행 수 = 심사기준 수> | PM(<이름>) | <HH:MM> |
| 7 | 제출 양식 필드 | <PASS\|FAIL\|NOT_RUN> | <팀명·링크·파일·설명(사전 준비물 줄)> | Build(<이름>) | <HH:MM> |
| 8 | 복구 경로 | <PASS\|FAIL\|NOT_RUN> | <RECOVERY 마지막 정상 커밋·태그 · 재배포 실측 · fallback 동기화> | Sales(<이름>) | <HH:MM> |
| 9 | 해시·커밋 | <PASS\|FAIL\|NOT_RUN> | <check.sh RESULT 줄 · 같은 커밋 CI 링크 · 해시 3종 일치> | Sales(<이름>) | <HH:MM> |
| 10 | 시각·슬롯 | <PASS\|FAIL\|NOT_RUN> | <창구 열림 · 최신 슬롯 행 · 행사 모드 log 4/4 (타 AI 미사용)> | Build(<이름>) | <HH:MM> |
| 1 | 데모 URL 접근 | PASS | [예시] 휴대폰 브라우저(로그인 없음)로 배포 URL을 열어 첫 화면 확인 | Sales(태진) | 15:35 |

## 산출물

| 종류 | 파일/링크 | 버전 | 크기 | sha256 |
|---|---|---|---|---|
| 소스 커밋 | main | <커밋 해시> | 커밋 | 커밋 <커밋 해시> |
| 배포 URL | <배포 URL> | <배포 ID 또는 배포 시각+커밋> | URL | 커밋 <배포한 커밋 해시> |
| 발표 파일 | pitch/slides.<pdf\|pptx> | v<n> | <바이트> | <sha256 64자리> |
| 발표 파일 | [예시] pitch/slides.pdf | v3 | 412000 | 0f1e2d3c4b5a69788796a5b4c3d2e1f00f1e2d3c4b5a69788796a5b4c3d2e1f0 |

## 테스트

| 회차 | 시각 | 통과 단계 | 실패 | 조치 |
|---|---|---|---|---|
| 1 | 14:10 | [예시] 3/3 (배포 URL · 브라우저) | 없음 | 없음 |
| precheck | 14:50 | [예시] 체크 PASS 7/9 | #3,#9 (precheck 예상) | 소유자 전달 |

## 알려진 결함

- <없으면 "(없음)" · 결함마다 한 줄 "#번호 FAIL 또는 NOT_RUN — 무엇 · 담당 역할" · precheck 행이 없으면 "precheck 미실행" 한 줄>
- [예시] #8 NOT_RUN — 재배포 실측 미완 · 담당 Build

PM 승인: <PM(이름) HH:MM — approve-with-defects일 때만 쓰고, 아니면 이 줄을 지운다>

## 판정

<approve | approve-with-defects | revise | fail 중 하나>

## 제출

- 담당: PM
- 시각: 미제출
- 접수 확인: 미제출
- 타임아웃 시: 재전송 금지, 접수 상태 확인
- 양식 팀명: <MISSION 「제출물」 팀명>
- 양식 데모 링크: <배포 URL — 「산출물」 배포 URL 행과 같게>
- 양식 파일: pitch/slides.pdf (<바이트> · 양식 용량 제한 <n> 이하)
- 양식 설명·소개: <양식의 설명 칸 내용 — 글자 수 제한 확인>
- 양식 사전 준비물: <「기존 코드 가져왔어요」 체크 + 「무엇을 가져왔나요」에 사전 준비물 문장 | Slide 2 하단>
- 양식 서비스 이름: <PITCH Slide 1 서비스 이름>
- 양식 한 줄 소개: <PITCH Slide 1 원라이너 — 영어 권장>
- 양식 타깃 해외 시장: <PRD 1번 문장의 국가·고객>
- 양식 데모 사용법: <3줄 — ① 첫 화면에서 누를 것 ② 입력 예시 ③ 기대 결과 · 테스트 계정이 있으면 함께 · 로그인 없음이면 그렇게 적는다>
- 양식 오늘 새로 만든 부분: <한 줄 — `git diff --stat pre-event..HEAD -- app/` 요약>
- 양식 공개 레포: <새 공개 레포 URL — 선언(10:30)과 같은 것>
