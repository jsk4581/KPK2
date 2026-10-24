# Second Draft 결정 뇌(Decision Brain) 설계 — 공개 문서 · 2026-10-24 · 팀 Second Draft (KPK2)

- [ARCHITECTURE.md](ARCHITECTURE.md) — 6층 전체 아키텍처(커넥터 → 게이트웨이 → 파싱 → 온톨로지 → Brain → 인터페이스)와 v1.1 확정 결정
- [BRAIN_ARCH.md](BRAIN_ARCH.md) — `app/logic.js` 위에 얹는 `brain/` 모듈(person·state·goal·constraint·monitor·policy·messages·explain)과 think() 흐름
- [ALGORITHM_DESIGN.md](ALGORITHM_DESIGN.md) — 행동과학 근거 공식(모멘텀·자기효능·용량·이탈 위험), 하루 루프, 메시지 정책, 주간 리뷰
- [MCP_DESIGN.md](MCP_DESIGN.md) — Brain을 MCP 서버(Resources·Tools·Prompts)로 노출하는 설계와 데이터 모델

원칙: 판단은 규칙, 문장만 LLM. 코어 하나(`app/logic.js` + `brain/`)를 웹·REST·MCP가 공유한다. 모든 예시 데이터는 합성(`"_label": "synthetic"`, "Sample persona — synthetic").
