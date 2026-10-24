# 발표자료 키트 (주최 제공 · 2026-10-24) — 하네스에서 쓰는 법

원본: https://ambition-for-korea.vercel.app/kit/ (`ambition-slide-kit.zip`, 2026-10-24 09:10 내려받음). 규칙은 `GUIDE.md`가 정본이다.

| 파일 | 용도 |
|---|---|
| `GUIDE.md` | 공식 규칙: 16:9 1920×1080 · 최대 2장 · PDF · 모든 장 하단 로고 띠(가로 90%, 아래 여백 3%) · 왼쪽 위 팀 이름 · 본문 28px 이상 · 핵심 문구 영어 권장 · 1장 = 무엇을·누구에게, 2장 = 오늘 만든 것 |
| `template.html` | 2장 HTML 템플릿(어두운 배경, Pretendard 웹폰트, `@page 1920px 1080px`) — 이걸 `pitch/slides.html`로 복사해 채운다 |
| `footer-for-dark-slides.png` / `footer-for-light-slides.png` | 로고 띠(어두운 배경용 흰 로고 / 밝은 배경용 어두운 로고). 비율·색을 바꾸지 않고, 위에 아무것도 겹치지 않는다 |
| `logos/` | 개별 스폰서 로고(흰/어두운 2종). 로고 띠 대신 쓰지 않는다 — 띠는 필수 |

## 절차 (GTM · pitch-compile `final`)

```bash
mkdir -p pitch && cp templates/slide-kit/template.html pitch/slides.html   # 1) 템플릿 복사
#   2) pitch/slides.html의 TEAM NAME · TOPIC · Service Name · One line · TARGET MARKET · PROBLEM · 스크린샷 2장(<img src="shot1.png">) ·
#      HOW IT WORKS · WHY US · NEXT 7 DAYS 를 mission/PITCH.md Slide 1·2 내용으로 채운다. 숫자에는 라벨 그대로.
bash scripts/export_slides.sh pitch/slides.html pitch/slides.pdf          # 3) PDF 내보내기 + 쪽수·크기·sha256 보고
#   4) 보고된 세 줄(파일·페이지·크기)을 mission/PITCH.md `## 제출 파일`에, sha256을 mission/SUBMISSION.md 머리 줄에 적는다.
#   5) 사람이 PDF를 열어 본다: 두 장 모두 로고 띠가 보이는가 · 한글이 깨지지 않았는가 · 왼쪽 위 팀 이름 · 3장 없음
```

- 내보내기 스크립트는 로고 띠 PNG를 `pitch/`에 자동 복사하고, Chrome이 없으면 수동 인쇄 방법을 안내한다(⌘P → PDF 저장 · 여백 없음 · 배경 그래픽 켜기). 수동으로 만든 PDF도 `bash scripts/export_slides.sh pitch/slides.html pitch/slides.pdf`로 쪽수·sha256 보고를 받을 수 있다.
- 웹폰트(Pretendard CDN)는 인터넷이 필요하다. 끊기면 시스템 글꼴로 대체되며 깨지지 않는다 — 내보낸 뒤 눈으로 확인한다(리허설 결함 H3).
- 밝은 배경으로 바꾸면 `footer-for-light-slides.png`로 교체한다.
- `pitch/`는 당일 생성되는 폴더다 — 행사 전에는 만들지 않는다.
