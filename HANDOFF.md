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

- 슬롯 8 · 12:00 · 화면 직접 관측 (12:55 늦게 기록) · Sales — 11:00 | 미관측 | - (보드 없음 → PM이 G2 「슬롯」으로 옮김)
- 2026-10-24 12:55 · Sales(태진) · 행사 모드 ① 행사 계정 yes(사람 확인 12:55, Console 크레딧 충분) · ② 최초 허용 호출 11:10 · ③ off → `log/2026-10-24_sales-buyer_2.md` · 산출물 `docs/gtm/` 5건(journey-io · market-claims · ai-displaced-occupations · verify-e68-e59 · competitors) · 「제안」 9줄 · 검증 pii hits=0 · 블로커 없음 · 다음: 14:00 배포 URL에서 S1–S3 실행 → SUBMISSION 「테스트」 · 커밋 974451a

## 결정

> 사용법: PM(결정자)이 「제안」이나 🚨 승인 답을 승격할 때만 쓴다 — `시각 · 결정 한 줄 · 결정자 · 근거(파일 경로나 제안 번호)`.
> G2 뒤 PRD를 바꾸면 여기 `PRD v<n> → v<n+1>` 한 줄을 남기고, 영향받는 `app/SMOKE.md`·`mission/PITCH.md` 소유자가 다시 ✓한다 (`CONTRACT.md` §C 4).
- 11:30 · G1: 후보 A(미국 프리랜서 카피라이터 · Second Draft) 선택, PRD v1 · 결정자 PM(우영) · 근거 mission/DECISION.md · mission/PRD.md
- 12:25 · PRD v1 → v2: 문장 3·4·5·6 변경 — 3 "경력·고민·관심사를 … 경로 3개와 이번 주 행동 3개로" → "경력과 쌓인 라이프로그를 읽어 … 지금 상태에 맞춘 이번 주 행동 3개로" · 4 입력에 시뮬레이션 라이프로그, 출력에 진척과 이탈 위험 추가 · 5 "생체·센서 데이터 수집, Notion·클라우드 연동, SNS·커뮤니티" → "실제 생체·센서·개인 데이터 수집, …" · 6 라이프로그 카드 또는 입력칸, Not today는 이동만·삭제 없음 · 결정자 PM(우영) · SMOKE(Build)·PITCH(GTM) 소유자 ✓ 필요
- 12:25 · 데모 줄기 = 하이브리드(B): 시나리오 A 1개, P0 경로 3 → 주 3 → Not today · P1 라이프로그 카드·컨디션 크기 조정·스킬 겹침 함수 · P2 Progress 탭·MCP stdio 래퍼(노트북 시연) · 컷: 채팅·보이스·시나리오 B·C·영상 · 코어는 app/logic.js 하나를 웹과 MCP가 공유 · 결정자 PM(우영)
- 12:25 · 시장 그래프·AI 노출도·시장 이탈: 시장 그래프는 P1 함수 1개(스킬 겹침 비율), 노출도는 피치에만 보강/대체 두 줄(GTM 근거 ID), 시장 이탈은 로드맵 한 줄 · 결정자 PM(우영)
- 12:25 · 미션 공개 뒤 만든 타 AI 산출물은 쓰지 않는다 — 참고·인용 0, 레포·문서에 반영 금지, 로컬 사본 삭제 · 결정자 PM(우영)
- 12:25 · 서버측 Claude 키: 행사 크레딧 조직 키만, 배포 환경변수에만(레포·브라우저 금지), 실패 시 폴백 응답과 표시 · 승인 PM(우영) · 키 발급·등록은 Build와 PM이 손으로
- 12:25 · 게이트 유지(G3 13:00 · freeze 14:00 · G4 14:45 · G5 15:30) · 제출 목표 15:00, 상한 16:00 · G3는 P0만 · 결정자 PM(우영)
- 13:58 · 제품명 확정: **Dream Achieve Moments** — 제출 양식 「서비스 이름」·덱·랜딩·앱 제목에 이 이름을 쓴다. "Second Draft"는 개발 코드명·파일명으로만 남긴다(바꾸지 않음) · 결정자 PM(우영) · 영향: PITCH(GTM) · slides-draft(Sales) · web 제목(Build) · brain 서버 이름(PM)

## 제안

> 사용법: 남의 파일·팀 방향에 대한 제안은 여기 덧붙인다 (전원 append-only — `CONTRACT.md` §C 3) — `작성:<역할> <HH:MM> · 대상 파일 · 제안 한 줄 · 출처(Discord 링크 등)`. 충돌이 나면 양쪽 줄을 다 남긴다. PM이 읽고 「결정」으로 올리거나 기각한다.
> T0 중계(git 없는 팀원이 Discord로 보낸 변경)는 4항목을 붙여 여기 옮긴다 — `기준 버전(커밋 또는 ZIP 시각) · 대상 경로 · 변경 ID · 반영 확인 요청`. 그 파일 소유자가 검토해 반영한다 (`CONTRACT.md` §C 7).
- 작성:Sales 11:35 · `mission/EVIDENCE.md#Buyer simulation` · S1–S3 초안(14:00 실행 전 예상 표기) + 합성 페르소나 저니·시나리오 3개(카피라이터·번역가·일러스트) → `docs/gtm/journey-io.md` · 출처: 팀 채널 11:11–11:20 논의
- 작성:Sales 11:35 · `mission/PRD.md` → PM · 인풋 범위를 3단계로 닫는 제안 — 오늘: 텍스트 3칸만 / MVP: 포트폴리오 링크 1~3개 + 1탭 체크인 / 로드맵: 라이프로깅·생체·SNS (`docs/gtm/journey-io.md` 「인풋·아웃풋 범위」)
- 작성:Sales 11:35 · `app/` 시드 데이터 → Build · 샘플 페르소나 "Dana" [SIMULATION] 입력 3칸·경로 3개·이번 주 행동 3개·Not today 문구를 [Load sample persona] 시드로 제안 (`docs/gtm/journey-io.md` 「대표 저니」)
- 작성:Sales 11:35 · `mission/PITCH.md` → GTM · 아키텍처 문구 1줄 제안 "오늘 URL에서 도는 것은 filter·planner·monitor의 최소 버전, gateway·status·자동 수집은 설계 주장" + VC 지표 가설 "2주차 체크인 잔존율" (`docs/gtm/journey-io.md` 「GTM 한 줄」)
- 작성:Sales 11:40 · `mission/EVIDENCE.md#주장` → GTM · E1–E27 후보 `docs/gtm/market-claims.md` — 강한 근거: BLS 2025 직군 규모(E1–E4) · Upwork 소득 −5.2%/−9.4% 연구(E11 verified) · 코치 시급 $139·아웃플레이스먼트 1인당 $1,660(E17·E18 verified) / 약한 가설: 10M 도달(E27, 비율 출처 없음) · 지불 전환율(E23·E24) — 슬라이드엔 공식 합계 70만 명(E25) + "10M은 가설"로 쓰길 제안
- 작성:Sales 12:12 · `mission/EVIDENCE.md#주장` → GTM · AI 피해 전 직무 스캔 E28–E69 `docs/gtm/ai-displaced-occupations.md` — 사이징 3층 제안: TAM = 고노출 직업 종사자 3,240만(Eloundou 19%)~5,110만(Brookings 30%, E65) · SAM = BLS 2025–35 감소·정체 + 자동화/AI 사유 직업 ≈1,180만(E66, hypothesis 4; OOH가 AI 직접 명시한 직업만 ≈460만) · SOM = 25–44세·연봉 ≥$45k 필터 ≈300만(E67) + 창작 5직군 70만(E25). 확장 순위: 작가(비치헤드) → 고객서비스 266만 → 비서·행정 352만 → 경리 153만 → 그래픽디자이너 → PR → 프로그래머 → 통번역. 주의: "BLS가 AI 때문"이라는 표현은 작가·비서·패러리걸·프로그래머·그래픽디자이너·통번역·PR·테크라이터에만(고객서비스·경리 OOH는 '자동화'만 명시). Stanford Canaries(E43 verified)는 초년차 감소만 입증 — 3–10년차 대체는 프리랜스 소득 증거(E11)로만
- 작성:Sales 12:25 · `mission/EVIDENCE.md#주장` → GTM · E68·E59 1차 출처 검증 완료 `docs/gtm/verify-e68-e59.md` — TAM 상한을 BLS 공식 수치로 교체 가능: **Very high 노출 206개 직업 2025 고용 5,321만 명**(XLSX 직접 집계, 단 "노출 ≠ 감소" BLS 원문 병기 필수) · Challenger AI 사유 감원 2026년 9월까지 **120,136명**(원문 PDF Table 4, 5월 87,714 → 갱신). 둘 다 single-source 5 (동일 기관 1차 자료라 verified 아님)
- 작성:Sales 12:50 · `mission/PITCH.md` → GTM · 경쟁 지도 40여 곳 `docs/gtm/competitors.md` — 전문성 전이 경로 + 비판단 습관 루프 + 동의 기반 라이프로그 MCP + 제3자 토큰 과금을 다 결합한 곳 없음. 직접 최근접 Google Career Dreamer(무료·1회성)·Coursera Coach, 비전 최근접 BetterUp Grow(B2B 전용). 수익 모델 문구 제안: "데이터 판매" 아님 → "원시 데이터 반출 없는 추론 API + 호출 단위 동의"로 쓰고 CCPA 'sale' 정의 선제 언급(Datacoup 종료 선례). 2x2 축 제안은 문서 §4
- 작성:Sales 12:52 · `mission/PITCH.md` Slide 2 → GTM · 팀 채널 12:32·12:42(JSK) 비즈니스 모델을 근거 ID와 묶는 제안 — B2C 무료 라이프로깅 앱(기술 증명) → 상위 유료 목표 프레임워크($12/월 가설, S1–S3 지불 조건 $5–15) → B2B: 기업이 자사 앱에 MCP 브레인 연동, API·토큰 과금(이커머스·헬스케어·스포츠·출판). 원본 데이터는 온디바이스, 비식별·자발 제공분만 → 경쟁 문서 §3의 CCPA "비식별 데이터 예외" 논리와 일치하므로 피치에 "데이터 판매 아님, 추론 API" 1줄 필수. 가격 앵커 E17(코치 $139/시간)·E18(아웃플레이스먼트 $1,660/인). 주의: 채널의 Gemini 공유 링크(12:05)는 PM 결정(타 AI 산출물 금지)에 따라 열지 않음 · 출처: 팀 채널 12:00–12:42
- 작성:Sales 13:20 · `docs/research/product-concept-report.md` §11 PM 결정 2·3 → PM · 구매자 관점 의견 — (결정 3) 피치 B2B 대표 예시는 **HR·아웃플레이스먼트**: 예산이 이미 있고(E18 1인당 $1,660) 모수가 숫자로 있으며(E59 AI 사유 감원 120,136명) 미션 문장과 직결. 도서 플랫폼은 비전 한 줄로. (결정 2) 데이터 크레딧·Data License는 2장 덱에서 빼고 Q&A 답변용으로만 — 데이터 판매 선례(Datacoup 종료)와 CCPA 금전적 인센티브 고지 리스크가 VC 첫 반론이 되기 쉬움(`docs/gtm/competitors.md` §3). 첫 문장은 "브레인을 판다" 유지. 돈을 낼 기업 우선순위표는 다음 커밋 `docs/gtm/payers.md`
- 작성:Sales 13:38 · `docs/research/product-concept-report.md`(Roy) · `mission/PITCH.md`(GTM) → 정정 — **"아웃플레이스먼트 1인당 $1,660(E18)" 사용 금지**: 14:05 재검증에서 공식 출처 재확인 실패(E18 → single-source 2). 대신 **E70 벤더 공개가 $600–2,600/인**(Intoo·RiseSmart, 3개월) 사용. 또 LHH·Careerminds·Intoo·RiseSmart가 이미 "AI 커리어 전환"을 마케팅 중이라 차별점은 "AI 대체 직군 특화 + 주간 습관 팔로업"으로 좁힐 것. 세일즈 가이드 §3 Employer-sponsored ~$100/인 비교문·§6·§10 세 곳에 $1,660이 있음 · 상세 `docs/gtm/verify-payers.md`
- 작성:Sales 13:50 · `pitch/slides.html` → GTM · 발표자료 초안 v0 `docs/gtm/slides-draft/`(slides.html · slides.pdf 2쪽 · preview.png · README) — 키트 템플릿에 Slide 1(타깃·문제·Why now, E1·E11·E59·E40 라벨)·Slide 2(화면 목업·How it works·Why us·10M path E25/E67/E66·Next 7 days·Ask) 채움. 스크린샷·URL은 PENDING 표기. NEXT 7 DAYS·Ask는 Sales 판단 → PM 확정 필요. GTM이 `pitch/`로 복사해 이어 쓰면 됨. Windows 내보내기 명령은 README에
- 작성:Sales 14:18 · `web/` Landing → Build · 폰 폭 390px에서 소개 문단("Your expertise, redrafted… Tell us what you di…")이 오른쪽으로 잘림 — 노트북 폭의 폰 프레임에선 정상. 실제 폰으로 여는 심사위원에게 보임. 기능 영향 없음(SMOKE 3/3 PASS 15:15, `mission/SUBMISSION.md` 「테스트」 회차 1) · 캡처 `docs/gtm/slides-draft/` 예정
- 작성:Sales 14:52 · `web/` 랜딩(`/`) → Build · PM · 랜딩 카피가 미션·PRD와 어긋남 — 히어로 "Turn scattered material into your next move", "Built for everyday work: Meeting notes · Quote drafts · Support triage…", "Every workday starts the same way. Notes, files and threads pile up"는 **범용 업무 도구** 메시지. 덱·PRD·제출 양식은 "AI로 일감이 줄어든 프리랜서 카피라이터의 커리어 전환". 심사위원이 랜딩과 덱을 다른 제품으로 읽을 위험 → 히어로 1문장·태그라인을 PRD 1·2번 문장 톤("Your expertise, redrafted for the AI era" + 카피라이터 페르소나)으로 맞추길 제안. 또 배포 앱(`/app.html`) 제목이 아직 "Second Draft"(13:58 결정 Dream Achieve Moments 미반영) · 덱 v4는 제품명 반영 완료(`docs/gtm/slides-draft/`, sha256 8f4fa725…)
- 작성:Sales 14:58 · `mission/PRD.md` 제품명 → PM · Dream Achieve Moments는 제출용 유지, 출시 브랜드로는 재검토 권고(일반명사 나열·*Achieve* 어색·핵심 가치 미반영). Second Draft는 동명 AI 글쓰기 제품 3개(SecondDraft Media 2026-02 등)로 출시 브랜드 불가 — USPTO 미조회 · 상세 `docs/gtm/naming-and-ui-copy.md` §A
- 작성:Sales 14:58 · `web/src/screens` 영어 문구 → Build · P1 오독 12건(What's missing→What you'd need to build · Progress 1/4→0 of 3 done · Condition→Energy · Career and what you were good at→Your work and what you're good at · logic.js 98·101행 한국어 fallback 등) · P2 중복 6건 · P3 개발자 용어 노출(Self-efficacy·Drop-off risk·"Decision brain: rules, no AI") — 유지 권장 문구 6개 포함 · 상세 `docs/gtm/naming-and-ui-copy.md` §B · freeze 뒤라 P1만 14:45 이후 수정 가능 여부는 PM 판단
- 작성:Sales 15:06 · `web/index.html` 랜딩 문구 → Build · 🚨 PM 승인 필요 · 랜딩 전체가 범용 업무 도구("Meeting notes · Quote drafts · Support triage", "Send the quote draft", PDF/PPT/MP4 머지)로 쓰여 있어 커리어 전환 제품(PRD·덱·앱)과 **다른 제품으로 읽힘** → Mission Fit 위험. 레이아웃·애니메이션 유지, 섹션별 문자열 16개만 교체하는 1:1 교체안 `docs/gtm/landing-copy.md` (히어로 "Your expertise, redrafted for the AI era" · 마키 직군 · WHY "Your clients draft with ChatGPT now" · 피처 3 = Transfer/This week/Rest day · 스텝 3 = SMOKE 화면). 승인 안 되면 피치에서 "랜딩은 콘셉트, 제품은 폰 안 데모" 한 문장으로 방어
- 작성:GTM 15:10 · `web/index.html` 랜딩 문구 → Build · PM 승인 필요 · 첫 화면을 사용자 핵심 가치로: h1 "Turn the AI crisis into your opportunity." · sub "AI handles the small stuff, so you can do what you love. Double down on your profession, or pivot to your dream." · Why it matters = 코칭 + 실제 자동화 + 심리 기반 체크인 · One input·피처 3개는 유지 · 문자열 3개 교체 · 상세 `docs/gtm/gonzalo/landing-feedback.md`

## 블로커

> 사용법: 같은 문제로 3회 막히면 고치기를 멈추고 여기 적은 뒤 PM에게 🚨 한 결정을 묻는다 — `시각 · 역할 · 막힌 것 · 시도한 것 · 필요한 결정`. 답을 기다리는 🚨(승인 대기로 실행이 멈춘 것)도 여기에 한 번만 적는다 — `시각 · 역할 · 🚨 <한 결정> · 대기: 승인 · 수신: PM(<이름>)` (「제안」에 또 적지 않는다). 풀리면 줄 끝에 `→ 해결 <시각>`을 덧붙인다.
