# 발표자료 초안 v4 (Sales, 2026-10-24 14:52) — GTM 인수용

- v4: PM 13:58 결정 반영 — 제품명 **Dream Achieve Moments** · 새 랜딩(`/`, 라이트·보라 브랜드)에 맞춰 라이트 테마 + `footer-for-light-slides.png` · 1장에 랜딩 브라우저 샷(`shot-landing-web.png`) + 앱 폰 샷 · 2장 플로우·브레인 다이어그램 보라 톤. 앱 폰 샷은 아직 "Second Draft" 제목(배포본 기준) — 재배포 후 재캡처 필요.

- v3: 시각 중심 재구성 — 1장 폰 목업 2대(Landing·Paths) + WHO/PAIN 필 + 큰 숫자 타일 3개 / 2장 폰 목업 3대 플로우(→) + "One brain · two doors" SVG 다이어그램 + Why us + Market·Next 7 days. 키트 규칙(2장·로고 띠·팀명·28px↑·행사 외 로고 없음) 준수.
- v3 PDF: 2쪽 · 1,472,773바이트 · sha256 `be8051beb8929546b1351a3ccf2bfd69c3da4f9df38f1bed67f9292c31a2817b`

- v2: 2장에 **실제 배포 스크린샷 3장** 삽입 (`shot-landing.png` · `shot-paths.png` · `shot-nottoday.png`, Playwright headless Chrome 430×932 @2x, 14:22 SMOKE 3/3 실행 중 캡처) · 우상단에 데모 URL `kpk2-second-draft.vercel.app` · `defect-phone-390.png`는 Build 전달용 결함 캡처(덱에 없음)
- v2 PDF: 2쪽 · 488,472바이트 · sha256 `d4d3835e84c06a67f515e86147a966379d88d54ac35e9ff181f108cf86151b7a`

- `slides.html` — 주최 키트 규칙(16:9 · 2장 · 로고 띠 · 팀명 좌상단 · 본문 28px↑)을 지키되 레이아웃은 재설계: 1장 히어로 + 큰 숫자 3개(출처명 표기) + 타깃·문제 2박스 / 2장 3단계 플로우 카드 + How·Why·Market 3박스. `pitch/slides.html`로 복사해 쓰면 된다 (소유: GTM).
- 라벨 표기: PDF에는 **출처명**(`Hui, Reshef & Zhou 2023` · `Challenger` · `BLS 2025` · `Intoo, RiseSmart` · 가설은 `estimates`)만. E번호·라벨은 `mission/PITCH.md`에만 적는다(검증기는 PITCH.md를 본다).
- `slides.pdf` — Chrome headless 2쪽 · 373,673바이트 · sha256 `3da2c58887cfce5040d62d4eb322905995fe05b4efd568b2c72533b34cf0e4ac`. 제출본 아님(스크린샷·URL 빈 상태).
- `preview.png` — 두 장 렌더 확인(로고 띠·팀명·글꼴 정상, 넘침 없음).

## 채운 것 / 판단해서 넣은 것

| 칸 | 내용 | 근거 |
|---|---|---|
| TOPIC | SAVE 10M JOBS FROM AI (SCHMIDT) | MISSION |
| One line | Your expertise, redrafted for the AI era… week by week | 세일즈 가이드 §0 + VP 3기둥 |
| TARGET MARKET | US freelance copywriters & writers 3–10y · 140,300 · 65% self-employed | E1 |
| PROBLEM | 소득 −5.2% (E11 verified) · 고용주·아웃플레이스먼트 없음 · 혼자 하다 멈춤 | E11 · PRD 2 |
| WHY NOW (추가 박스) | AI 사유 감원 120,136 (E59) · BLS가 작가 직군에 AI 명시 (E40) | E59 · E40 |
| SCREEN 2·3 (스크린샷 자리) | 텍스트 목업 — 경로 3 · 이번 주 행동 · Not today 문구, [SIMULATION] 표기 | journey-io 「대표 저니」 |
| HOW IT WORKS | 3칸 입력 → Claude 1회 → 경로 3 + 행동 3 · 이동만 삭제 없음 · 같은 브레인 웹+MCP | PRD v2 · 결정 12:25 |
| WHY US | Career Dreamer·Coursera Coach는 지도에서 멈춤 · 벤더 $600–2,600/인 (E70) · AI 대체 직군 특화 + 주간 습관 루프는 없음 | competitors · verify-payers |
| 10M path | 700K (E25) → 3M (E67) → 11.8M (E66) — 전부 hypothesis 표기 | ai-displaced-occupations |
| NEXT 7 DAYS (Sales 판단) | 동의받은 베타 라이터 10명 · 2주차 체크인 잔존율 측정 · MCP 서버 공개 · 아웃플레이스먼트 첫 통화 | PM·GTM 확정 필요 |
| Ask (Sales 판단) | 소개 3건 — 아웃플레이스먼트 구매자 · Upwork · 커리어테크 투자자 | PM 확정 필요 |

## 제출 전 바꿔야 하는 것

1. SCREEN 2·3 텍스트 목업 → 실제 배포 데모 스크린샷 2장 (`<img src="shot1.png">`), 제목의 "PENDING" 문구 삭제
2. 데모 URL 1줄 추가 (Slide 2) — 없으면 submit-gate 체크 1 FAIL
3. E 번호·라벨이 `mission/EVIDENCE.md` 「주장」과 일치해야 함 (X-1) — EVIDENCE.md 아직 없음
4. NEXT 7 DAYS · Ask — PM 확정
5. 내보내기(Windows): `& "C:\Program Files\Google\Chrome\Application\chrome.exe" --headless=new --disable-gpu --no-pdf-header-footer --no-margins --virtual-time-budget=4000 "--print-to-pdf=<abs>\slides.pdf" "file:///<abs>/slides.html"` → `Get-FileHash` → PITCH 「제출 파일」·SUBMISSION 머리 줄
