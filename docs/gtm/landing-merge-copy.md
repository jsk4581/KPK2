# 랜딩 "merge" 구간(흩어진 자료 → 브레인) 교체안 — Sales 2026-10-24

대상 `web/index.html` §why `.merge` · 소유 Build · PM 승인. 적용: `git apply docs/gtm/landing-merge.patch` (문자열 6곳 + CSS 2줄 + JS 2줄).

## 왜
- 300vh 스크롤 고정 구간의 앞 40%는 칩 4개와 아이콘만 보이고 제목·설명이 없다 → 빈 화면처럼 읽힘(캡처 15:28).
- 칩 문구가 내부 메모 수준("Polish-job rate note", "3 BOXES")이라 심사위원이 2초 안에 못 읽는다.

## 바꾸는 것
| 현재 | 제안 |
|---|---|
| Polish-job rate note | Rate cut to 1/3 for “polish” jobs |
| Discovery call, skincare | Discovery call that went great |
| AI drafts sound the same | Why AI drafts all sound the same |
| Career: 7 yrs of copy · YOUR STORY · 3 BOXES | 7 years of copy, in my own words · YOUR STORY · 3 SHORT ANSWERS |
| (없음) | 아이콘 위 상시 문구 `.merge-lead`: "The agent reads what you already have: your notes, calls, saved links and your story." — 칩이 흡수될 때 함께 사라짐 |
| Your notes and story go in. Out come three paths… | Out come three paths that keep your skills, and three actions for this week. (입력 설명은 lead로 이동, 중복 제거) |
| `.merge` height 300vh | 220vh (빈 스크롤 구간 단축) |

[SIMULATION] 태그·칩 좌표·애니메이션 로직은 그대로. 모바일 칩 폭(50vw)에서 제목 2줄 허용됨(.chip b line-height 1.3).
