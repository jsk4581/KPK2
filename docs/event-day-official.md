# 당일 공식 공지 반영 — 2026-10-24

> 출처: 주최 공지 「내일 꼭 알아야 할 것들」(2026-10-23 밤, Discord @everyone) · 제출 페이지 https://ambition-for-korea.vercel.app/submit · 발표자료 키트 https://ambition-for-korea.vercel.app/kit/ (`templates/slide-kit/`). 이 문서가 `CONTRACT.md` §E·`docs/event-rules.md`보다 새롭다 — 충돌하면 이 문서.

## 1. 공식 사실 (하네스와 다른 것은 굵게)

| 항목 | 공식 | 하네스 조치 |
|---|---|---|
| 입장 | 08:30 입장 · 08:45 착석 · 09:00 서울시 개회사 · 1층 명단 확인(신분증) | — |
| 미션 | **09:40쯤 공개** · VC 6곳이 낸 주제 중 선택 | 시간표 1단계 09:40–10:05, G1 10:20 유지 |
| 선언 | **10:30까지 제출 페이지 「1. 주제 선언」**: 한 줄 아이디어 · 타깃 해외 시장(국가와 고객) · 공개 GitHub 레포 | 시간표 3' (PM) |
| 레포 | **새 공개(Public) 레포 하나로 시작** · 코드는 10:00 이후 그 레포에서만 · 기존 코드 금지 · 커밋은 `main` · 모든 팀 커밋 기록 현장 공개 · 레포·커밋으로 위반 판단 | 10:00 `scripts/bootstrap_public_repo.sh <이름>` — 첫 커밋 = 하네스 반입(`pre-event` 태그), README·제출 양식에 반입 공개 |
| 키 | **API 키 커밋 금지** — `.env` + `.gitignore` (공개 레포 키는 몇 분 안에 털림) | `.gitignore` 기존 규칙 · 브라우저 JS에 키 금지(`app/DEPLOY.md`) · AI 호출은 서버측(Vercel Functions 환경변수 또는 Apps Script) |
| 크레딧 | 개발·AI 기능은 지급 Claude 크레딧으로 · **Claude Code와 배포 앱 API 호출 모두 가능** · 30일 · 각자 조직 또는 한 조직 합산 가능 | Claude Code는 `claude auth login --console` · 합산 비권장(Start 티어 월 $500 상한) |
| 주변 툴 | 디자인·영상 같은 **주변 툴은 자유, 비용 자부담** | 팀 규칙(타 AI 금지)은 유지 — 완화는 PM 「결정」 |
| 제출 | 10:00–17:00 · 팀당 1회 · **제출 순서대로 VC 심사 · VC 3곳 PASS = 결선, 3곳 FAIL = 탈락** · 결선 8팀 차면 마감 · VC 심사 늦어도 15:00부터 본격 · 결과는 현장 화면·Discord에 팀·팀원 이름 공개 | Sales 슬롯 기록 = 제출 페이지 「실시간 현황 보기」 · 제출 목표 시각은 PM 결정(§5) |
| 제출 항목 | 서비스 이름 · 한 줄 소개 · 타깃 해외 시장 · 데모 링크 · **데모 사용법**(VC가 먼저 볼 것 3줄, 테스트 계정) · 발표자료 PDF 2장 이내(업로드 또는 링크) · **오늘 새로 만든 부분(한 줄)** · **기존 코드 가져옴 체크 + 무엇을** · 재제출 불가 확인 | `templates/MISSION.md` 「제출물」 · `templates/SUBMISSION.md` 「제출」 양식 줄 |
| 발표자료 | **16:9 1920×1080 · 2장 이내 · PDF · 모든 장 하단 로고 띠(가로 90%, 아래 여백 3%)** · 왼쪽 위 팀 이름 · 본문 28px 이상 · 핵심 문구 영어 권장 · 1장 = 무엇을·누구에게, 2장 = 오늘 만든 것(실제 스크린샷) | `templates/slide-kit/` (GUIDE.md · template.html · footer PNG 2종) · pitch-compile 「Event slide kit」 |
| 결선 | **19:00 샤크탱크: 8팀 × 발표 3분(영어) + Q&A 7분(한국어)**, VC 6곳 · 각자 노트북 발표·데모(HDMI 어댑터) · **VC가 데모 링크를 직접 열어 봄 → 앱 최소 21:00까지 켜 둠** | `templates/DEMODAY.md` · pitch-compile demoday |
| 팀 | 2~4인 · 상금 없음(결선 팀은 VC 후속 미팅) · Discord 닉네임 실명 | — |

## 2. 10:00 공개 레포 절차 (PM, 준서 보조 · 5분)

```bash
# 10:00 이후에만 (스크립트가 그 전에는 거부한다)
bash scripts/bootstrap_public_repo.sh <레포이름>          # 기본 owner Roykoo83
# → ~/<레포이름> 에 단일 커밋(pre-event 태그) + GitHub 공개 레포 생성 + push
# 팀원: git clone https://github.com/Roykoo83/<레포이름>.git  → 그 clone에서 /hthn-start
```

- 반입되는 것: 계약·스킬·템플릿·역할·검증기·CI·빈 `app/` 골격(제품 기능 0). 빠지는 것: `tests/sim/`(리허설 기록) · `me/` · `mission/`(README만).
- README 맨 위에 **반입 공개문**(영·한)이 자동으로 들어간다. 제출 양식 「기존 코드 가져왔어요」에 체크하고 같은 문장을 적는다 (`templates/SUBMISSION.md` 「제출」 `양식 사전 준비물`).
- 이후 모든 작업은 새 레포에서. 기존 private `hthn` 레포는 읽기 전용 참고.

## 3. 10:30 주제 선언 (PM)

제출 페이지 → 신청 이메일로 팀 찾기(안 되면 팀 이름) → 「1. 주제 선언」 세 칸: 한 줄 아이디어(DECISION의 선택안) · 타깃 해외 시장(PRD 1번 문장의 국가·고객) · 공개 레포 URL. **G1(10:20) 결정 → 10:30 선언**이므로 결정이 늦으면 선언을 먼저 하고 PRD를 다듬는다.

## 4. 제출 항목 ↔ 우리 파일

| 양식 칸 | 어디서 가져오나 | 검사 |
|---|---|---|
| 서비스 이름 · 한 줄 소개 | `mission/PITCH.md` Slide 1 | 체크 7 |
| 타깃 해외 시장 | `mission/PRD.md` 1번 문장 | 체크 7 |
| 데모 링크 | `mission/BOARD.md` 배포 URL = SUBMISSION 「산출물」 | 체크 1 (다른 기기) |
| 데모 사용법 3줄 | `app/SMOKE.md` 3단계를 VC 말로 (첫 클릭 · 입력 예 · 기대 결과 · 테스트 계정/로그인 없음) | 체크 2 |
| PDF 2장 | `pitch/slides.pdf` (키트 규칙) | 체크 3 (쪽수·로고 띠·한글 글꼴) |
| 오늘 새로 만든 부분 | `git diff --stat pre-event..HEAD -- app/` 한 줄 요약 | 체크 9 |
| 기존 코드 가져옴 | 체크 ✓ + 사전 준비물 문장 | 체크 7 |

## 5. PM 결정 필요 (10:35 G2까지)

1. **제출 목표 시각.** 계약은 16:00 목표·상한. 공식 "제출 순서대로 심사 · 15:00부터 본격 · 8팀 차면 마감"이면 15:00 이후 접수분은 뒤로 밀린다. 권고: **15:00 목표**(precheck 14:00 · final 14:40), 16:00을 상한으로 — G3 13:00 그대로, freeze 13:30. 결정은 HANDOFF 「결정」 한 줄 + BOARD 게이트 시각 수정.
2. **빈 앱 골격 반입 여부.** 기본은 반입 + 공개(README·양식). 반입하지 않으려면 bootstrap 전에 `app/`을 비우고 Build가 10:35부터 새로 쓴다(약 30분 추가).
3. **주변 디자인 툴.** 공식은 자유(자부담). 팀 규칙 완화 여부 — 완화하면 HANDOFF 「결정」에 범위(예: 이미지 생성 도구 OK, 코드·문서 생성은 Claude만)를 적는다.
4. **크레딧 합산.** 비권장(티어 상한). 각자 조직 유지.

## 6. 현장 체크리스트 (사람)

- 신분증 · 노트북 · 충전기 · **HDMI 어댑터** · Discord 닉네임 실명 · 행사장 Wi-Fi(공지 참조, 비밀번호는 레포에 적지 않는다)
- 4명 모두 `claude auth login --console` 뒤 `/status`에 `Profile`(또는 `API key`) 행 + Organization = 크레딧 조직 → `log/` 「행사 모드」 줄
- Build: 배포 계정 로그인 확인(Vercel) · AI 호출이 필요하면 서버측 함수 + 환경변수(키는 레포 밖)
- GTM: `templates/slide-kit/README.md` 절차대로 — `template.html` → `pitch/slides.html` → `bash scripts/export_slides.sh` (쪽수·크기·sha256 자동 보고, 한글 글꼴은 눈으로 확인)
- Sales: 제출 페이지 「실시간 현황 보기」 북마크 · 10:00부터 슬롯 기록
