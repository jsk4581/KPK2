# 발표자료 초안 v0 (Sales, 2026-10-24 14:35) — GTM 인수용

- `slides.html` — 주최 키트 `templates/slide-kit/template.html` 기반, 2장. `pitch/slides.html`로 복사해 쓰면 된다 (소유: GTM).
- `slides.pdf` — Chrome headless 내보내기 2쪽 · 215,574바이트 · sha256 `d21ba98122f03721f702e9d26b4ad9512e35f386be2100c58589a0faa2eee6a96`. 제출본 아님(스크린샷·URL 빈 상태).
- `preview.png` — 두 장 렌더 확인(로고 띠·팀명·글꼴 정상).

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
