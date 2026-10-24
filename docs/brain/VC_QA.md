# Next Chapter Brain — VC Q&A Sheet (EN / KO)

> Product **Next Chapter** (code name Second Draft) · Public repo · 2026-10-24
> Scope: the **brain** (decision core + REST + MCP) and the business around it. 12 questions a VC is likely to ask, each with a crisp EN answer and a KO one-liner.
> Evidence rules: every number carries an existing E-id from `docs/gtm/market-claims.md` / `docs/gtm/ai-displaced-occupations.md` with its label (`verified` / `single-source` / `hypothesis`). Anything without an E-id is marked **(hypothesis)**. All demo data is synthetic (`"_label": "synthetic"`, "Sample persona — synthetic"). No real users, no interviews, no contracts exist.
> First sentence on any money question: **"We sell the brain — an inference API, billed per token, user-consented."**
> Sources read: `docs/gtm/competitors.md` · `payers.md` · `verify-payers.md` · `market-claims.md` · `docs/research/product-concept-report.md` · `lifelog-papers.md` · `nudge-theories.md` · `docs/brain/ARCHITECTURE.md` · `ALGORITHM_DESIGN.md` §1, §8–10 · `brain/README.md` · `brain/mcp/CONNECT.md`.

---

## Q1. Why rules instead of letting the LLM judge?

**EN.** The brain separates judgment from language: state estimation, risk scoring, the 12-week gates, the root-constraint pick and the intervention policy are deterministic rules (COM-B, Theory of Constraints, Fogg B=MAP, implementation intentions, JITAI decision tables), and the LLM only writes sentences — path copy and the coaching message. That makes every decision testable (190 node tests passing as of 2026-10-24), explainable (`explain` returns rule names plus the evidence ids that were actually in the input), and safe for a sales conversation: a buyer can audit *why* the brain said "rest day," which no prompt can promise. It also means the same judgment is identical across web, REST and MCP, and that skipped checks are reported as `skipped` rather than silently passed.
**KO.** 판단은 규칙, 문장만 LLM — 그래서 모든 결정이 테스트·설명 가능하고(규칙 이름 + 근거 id), 웹·REST·MCP 어디서 불러도 같은 답이 나온다.

## Q2. What exactly does the MCP server sell, and how is it billed?

**EN.** We sell the brain — an inference API, billed per token, user-consented. The server exposes seven read-only MCP tools (`think`, `rank_roles`, `plan_week`, `check_in`, `analyze_state`, `explain`, `get_scenario`) and the same functions over REST `/v1/*`; a partner app sends the user's current state and gets back a judgment — intervention, two choices, a non-judgmental message, and the explanation. Raw logs never leave the caller; the brain is stateless and stores nothing. Pricing is usage-based (per call / per token); we deliberately show no unit price yet because no buyer has been interviewed **(hypothesis)**.
**KO.** 파는 것은 브레인(추론 API, 토큰 과금, 사용자 동의 기반)이다 — 파트너 앱이 상태를 보내면 판단만 돌려받고, 원본 로그는 우리 쪽에 남지 않는다. 단가는 미정(가설).

## Q3. What if Google (Career Dreamer) does this?

**EN.** Career Dreamer (Feb 2025, free, US-only, "early-stage experiment") produces a Career Identity Statement and a one-shot exploration; its own page confirms there is no reminder, habit loop, action plan or progress tracking — progress is saved only in the browser (`verify-payers.md` §3, PASS). Across ~40 companies mapped in `competitors.md`, nobody combines (1) expertise-transfer paths, (2) a weekly non-judgmental habit loop, (3) a consent-based lifelog brain and (4) a third-party inference API. If Google ships the loop, our defensible layer is still the domain-specific decision policy and the explain trace that a B2B buyer (outplacement vendor, employer) can embed — Google sells a consumer experiment, not an embeddable brain. That said, Google's free distribution is the single biggest direct threat and we say so.
**KO.** Career Dreamer는 1회성 탐색이고(공식 페이지 확인: 리마인더·습관·진척 추적 없음, 미국 한정), 우리는 전환 뒤 매주 따라오는 임베딩 가능한 판단 엔진이다 — 다만 구글의 무료 유통력이 최대 위협임은 인정한다.

## Q4. How do you reach 10M users? (TAM / SAM / beachhead)

**EN.** We build the ladder from government data and label every rung. Beachhead: core creative occupations in US + Canada ≈ 704,300 (E25, hypothesis — sum of BLS 2025 / Job Bank 2023 figures E1–E8, each single-source, confidence 4–5); of which US freelancers ≈ 193,000 (E10, hypothesis). SAM: BLS occupations projected to decline with AI/automation cited ≈ 11.8M (E66, hypothesis, confidence 4), filtered to mid-career and ≥$45k median pay ≈ 3M (E67, hypothesis, confidence 3). TAM ceiling: BLS "Very high" AI-exposure occupations employ 53.2M (E68, single-source, confidence 5) — with the mandatory footnote that BLS says exposure is *not* a forecast of decline (E40, verified). So "10M" is the E66 decline-based floor, not a claim we have validated.
**KO.** 비치헤드 약 70만(E25 가설) → 지불 가능 약 300만(E67 가설) → BLS 감소 전망 직업 약 1,180만(E66 가설) → 노출 상한 5,321만(E68, "노출 ≠ 대체" 각주 필수). 1,000만은 검증된 숫자가 아니라 가설이라고 먼저 말한다.

## Q5. Privacy — what actually leaves the device?

**EN.** Today: nothing real, because nothing real is collected — the demo runs on a synthetic 14-day scenario and the brain core has no clock, network or storage. By design (ARCHITECTURE L1–L2, ALGORITHM_DESIGN §8): raw sources are processed on-device, garbage and PII are filtered, and only text summaries plus consent-scoped `LifeEvent` records reach the brain; every source is opt-in, revocable, and declared values always override sensed ones. The B2B contract is the same shape: a partner receives a judgment and an explanation, never the user's raw logs, and employers in the outplacement case see aggregate metrics only with separate consent. We also name the regulatory exposure openly — CCPA/CPRA "sale" definition, the California Delete Act, Korean third-party-provision consent (`competitors.md`) — and the design answer is "inference out, raw data never."
**KO.** 오늘은 합성 데이터뿐이라 나가는 것이 없고, 설계상으로는 원본은 기기에, 브레인에는 동의 범위의 요약만, 파트너에는 판단 결과만 간다. CCPA·Delete Act 같은 규제 리스크도 먼저 말한다.

## Q6. Is this therapy?

**EN.** No, and the product says so on the first screen and in settings. The brain is a career-coaching decision engine; it never runs clinical scales, never displays inferred emotion ("you seemed unmotivated" is banned), and its only mental-health behavior is an escalation rule: crisis language triggers a resource referral (988 in the US) and coaching is scaled down, with the text not stored. Our behavioral evidence is about goal progress, not clinical outcomes — e.g. the Claude-based goal coach RCT (N=517, d=0.33, A1 in `lifelog-papers.md`) and the 61,293-person megastudy where rewarding a return after a miss ranked first (N2 in `nudge-theories.md`). We never say "proven to get you hired."
**KO.** 치료·진단이 아니다 — 임상 척도 없음, 감정 추론 표시 금지, 위기 표현은 자원 안내(988)로 에스컬레이션만 한다. 근거는 목표 진척 연구이지 임상 결과가 아니다.

## Q7. Why freelance writers first?

**EN.** Because the damage is already measurable and the buyer pays for themselves. After ChatGPT, Upwork writing freelancers' monthly income fell 5.2% (E11, verified, peer-reviewed + two independent reports) and writing job posts fell ~30% (E12, single-source); US Writers and Authors number 140,300 with 65% self-employed — the highest freelance share of our target occupations — and a $76,910 median wage, above the all-occupation median (E1, E16, single-source, BLS 2025). Writers also leave the richest text lifelog (portfolio, drafts, saved links), which is what the brain's expertise-transfer logic needs. The ladder then runs translators → illustrators → graphic designers → voice actors (E2–E5, E14–E15), then office roles (E66).
**KO.** 피해가 이미 숫자로 확인됐고(Upwork 글쓰기 소득 −5.2%, E11 verified), 65%가 자영업이라 본인이 결제하며, 텍스트 라이프로그가 가장 풍부한 직군이다.

## Q8. What is live today vs. roadmap?

**EN.** Live and running on real logic (synthetic data): the brain core (`think` → person, state, goal, root constraint, monitor, intervention, explain), seven MCP tools + REST, the 3 paths → 3 weekly actions → "Not today" (move, never delete) loop, condition-based action sizing, and the Dana 14-day scenario — verified over a public tunnel with `initialize` / `tools/list` / `think` round-trips (CONNECT.md). Simulated on screen: the connected lifelog cards. Roadmap (all hypothesis, none built): real phone/cloud connectors with consent management, multimodal parsing agents, the growing personal ontology, session/storage, voice, community, domain-specific brain packs, and B2B billing. Known limits are written down in `brain/README.md` (REST boundary drops some in-process keys; history must be cut at `today` by the caller).
**KO.** 오늘 실제로 도는 것: 브레인 코어 + MCP 7도구/REST + 경로 3 → 주 3행동 → Not today 루프(합성 데이터). 커넥터·온톨로지 성장·저장·보이스·커뮤니티·B2B 과금은 전부 로드맵(가설)이다.

## Q9. How do you measure success? (evidence ledger, job-readiness)

**EN.** Inside the product, success is not activity but evidence: completed actions become evidence items, evidence passes four 12-week milestone gates (Fit · Proof · Market · Ready), and gates roll up into a job-readiness score that drives the application stage (ALGORITHM_DESIGN §7, §10). Leading indicators the brain already computes: momentum (EWMA), self-efficacy, consecutive rest days, data-gap days and a dropout-risk score with reasons. The honest caveat: the strongest external evidence measures goal progress (A1, RCT N=517, d=0.33) and short-term habit effects (N2), not placement; "gets you hired" is a hypothesis we will test only with real users, which we do not yet have.
**KO.** 활동이 아니라 증거 — 완료 행동 → 증거 선반 → 12주 게이트 4개 → 준비도 점수. 선행지표는 모멘텀·자기효능·이탈 위험. "취업률"은 아직 검증되지 않은 가설이라고 말한다.

## Q10. What is the moat? (domain packs, data loop)

**EN.** Three layers, in order of defensibility. (1) The decision policy itself — a constraint-first coaching framework encoded as testable rules with explain traces, which is what a B2B buyer embeds and audits. (2) Domain brain packs: one framework, but the thresholds, milestone gates and constraint priors specialize per displaced occupation (writers → translators → illustrators → office roles), and each pack gets sharper as that domain's trial-and-error accumulates **(hypothesis — no users yet)**. (3) The consented evidence loop: weekly check-in outcomes are the training signal nobody else has, because Career Dreamer and Coursera Coach stop at recommendation and outplacement vendors stop at the 3-month program (E70). We do not claim a data moat today — the loop is zero users deep.
**KO.** 해자는 ① 테스트·설명 가능한 판단 정책, ② 대체 직군별로 다듬어지는 도메인 브레인 팩, ③ 전환 뒤에도 이어지는 동의 기반 주간 증거 루프(가설) — 오늘은 사용자 0명이므로 데이터 해자를 주장하지 않는다.

## Q11. Pricing anchors — $600–2,600 vendors vs. ~$100 employer-sponsored?

**EN.** The anchor is published outplacement pricing: Intoo $600–1,300 and Randstad RiseSmart $899–2,599 per person for a 3-month program (E70, single-source, official vendor pages). Our employer-sponsored plan is a 12-month subscription at roughly $100 per departing employee **(hypothesis — from the sales guide, no buyer interview)**, i.e. a fraction of the vendor price for a longer loop; consumer Pro is $29–79/month **(E24, hypothesis)**, anchored below one human coaching hour (median $139, E17, verified). We retired the earlier "$1,660 per head" figure after it failed re-verification (E18, corrected). Two honest corrections from `verify-payers.md`: four of the five major vendors already market "AI career transition," so our wedge is displaced-occupation specialization plus post-program weekly follow-up; and none of the five has a public API, so the first B2B motion is resale / white-label, not an MCP plug-in.
**KO.** 앵커는 벤더 공개가 $600–2,600/인(3개월, E70); 고용주 스폰서 12개월 약 $100/인과 Pro 월 $29–79는 모두 가설이다. 구 "$1,660" 앵커는 재확인 실패로 폐기했다.

## Q12. What did you build in the 5 hours, and what was pre-event? (disclosure)

**EN.** Pre-event: the team's hackathon harness (CLAUDE.md / CONTRACT / HANDOFF / role kits / gate scripts) and the PM's prior coaching framework "TheGoal" (B:Essential, v0.3) that the brain's goal-state and milestone-gate logic is derived from — both are process and design assets, not product code. After the mission reveal (approx. 09:40): the mission choice, PRD, the `app/logic.js` core and its tests, the web demo, the `brain/` decision modules (person · state · goal · constraint · monitor · policy · messages · explain), the MCP server, HTTP/REST wrapper, the synthetic 14-day scenario, and all GTM research (E1–E70). By team rule, output from other AI tools created after the reveal was not used, and all AI calls ran on the event's Claude credits. The product name Next Chapter was fixed at 13:58 today.
**KO.** 행사 전 자산은 팀 운영 하네스와 PM의 기존 코칭 프레임워크(TheGoal)뿐이고, 로직·웹·브레인·MCP·시나리오·시장 근거는 전부 미션 공개 후 만들었다. 타 AI 산출물은 쓰지 않았다.

---

## Guardrails for the answerer

- Say "hypothesis" out loud before any number without a `verified` / `single-source` label (E10, E23–E27, E66, E67, pricing).
- Never present the Dana scenario, the 14-day log or any screen as real user data — it is synthetic and labeled.
- Never say "we sell data." Data credits / data license exist only as a Q&A appendix in the sales guide; the first sentence is always "We sell the brain."
- Never say "proven to get you hired," "guaranteed," or quote a nudge effect size (the meta-analytic debate is noted in `nudge-theories.md` N6–N7).
- Vendor and platform names are illustrative examples only — no contact, no contract.
