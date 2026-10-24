# Key statistics — fact sheet (2026-10-24)

Owner: Gonzalo (GTM). One place for the numbers we quote in the pitch. Details and full source lists: `docs/gtm/gonzalo/market.md`, `docs/gtm/gonzalo/segment-a-laid-off.md`.
Labels: `verified` / `single-source` / `hypothesis` / `calc` (arithmetic on labeled inputs).

## 1. Baseline: how many people lose their job in a normal month (no AI)

| Figure | Value | Source | Label |
|---|---|---|---|
| US layoffs and discharges, 2019 (pre-ChatGPT) | 21.7M/year → about 1.8M/month | [BLS JOLTS, Mar 2020 release](https://www.bls.gov/news.release/archives/jolts_03172020.htm) | verified; monthly = calc |
| US layoffs and discharges, 2025 | 21.24M/year → about 1.77M/month | [BLS JOLTS, Mar 2026 release, Table 23](https://www.bls.gov/news.release/archives/jolts_03132026.htm) | verified; monthly = calc |
| US layoffs and discharges, January 2026 | about 1.7M | same | verified |
| US hires and total separations, July 2026 | about 5.1M each | [BLS JOLTS](https://www.bls.gov/news.release/jolts.nr0.htm) | verified |
| AI-cited announced cuts, Jan–Aug 2026 | 116,175 → about 14,500/month | Challenger, Gray & Christmas | single-source; monthly = calc |
| AI-cited cuts as a share of monthly layoffs | 14,500 / 1.77M ≈ **0.8%** | | calc (different measures: announced vs actual) |

**Reading:** the "normal" level of layoffs is about 1.8M people a month and has barely moved since 2019. Hires roughly equal separations, so the economy as a whole is in balance. AI-cited cuts are under 1% of monthly layoffs. AI's real damage is structural: some jobs (writers, data entry, customer service) are not coming back, so the people who lose them have to find a new path instead of a similar job.

**Pitch implication (crisis → opportunity):** every month about 1.8M Americans have a "layoff email" moment, with or without AI. AI is the reason to act now. The crisis moment is the market.

### Can we prove layoffs are caused by AI? (WARN notices)

| Figure | Value | Source | Label |
|---|---|---|---|
| Only state whose WARN form asks about AI | New York, since March 2025: "technological innovation or automation" checkbox, then the type (AI, robots) | [Hunton](https://www.hunton.com/hunton-employment-labor-perspectives/new-york-warn-act-no-ai-related-layoffs-reported-in-first-year-of-adding-ai-related-disclosure-to-the-system), [Bloomberg Law](https://news.bloomberglaw.com/daily-labor-report/ai-related-layoffs-test-new-yorks-ability-to-track-job-losses) | single-source (law firm and press, citing NY DOL) |
| NY result after one year | 160+ companies filed; **0** checked the AI or automation box | same | single-source |
| Other states with their own WARN laws | 12–15 states (sources disagree); none ask for the reason | [SHRM](https://shrm.org/topics-tools/employment-law-compliance/ny-proposes-ai-layoff-disclosure-rule-under-warn-act), Bloomberg Law | single-source |
| AI-cited cuts nationally, 2025 | about 48,400 | Challenger, via [SoftwareSeni](https://www.softwareseni.com/why-ai-layoff-disclosure-laws-are-not-working-and-what-would-actually-fix-them/) | single-source |

**Reading:** WARN data cannot prove AI layoffs. Extrapolating from New York gives zero, which is not believable when companies cite AI publicly (Challenger). Employers avoid the checkbox (bad press, legal risk), and WARN only covers mass layoffs (50+ workers at one site). Use group-level evidence instead: Challenger "AI-cited" cuts and before/after studies (Upwork). In the pitch say "AI-cited" or "in AI-exposed jobs," never "fired by AI."

## 2. Target size (US + Canada)

| Figure | Value | Label |
|---|---|---|
| Workers in 15 AI-exposed jobs | 12.0M (10M reached at secretaries and admin assistants) | calc on verified BLS 2025 + ESDC |
| Core target, 3–10 years experience (age 25–44 proxy) | 5.1M | data verified; proxy hypothesis |
| Professional roles in the core target | 1.2M (24%) | calc |
| Creative roles (writers, translators, designers, voice) | 723,500 | calc on verified |
| Self-employed US writers | about 91,200 | verified (BLS 2025) |
| US workers displaced per year (Displaced Worker Survey 2023–25 average) | about 2.47M | calc on verified |

## 3. Pain evidence

| Figure | Value | Label |
|---|---|---|
| Upwork writing earnings after ChatGPT | −5.2%/month; jobs −2% | verified (peer-reviewed) |
| US freelance writers saying AI cut their income | 40% | single-source |
| Voice actors who lost work to AI | 21% (NAVA 2026) | single-source |
| BLS writer job outlook 2025–35 | 0%, AI named as a cause | verified |
| Goldman Sachs: US workforce AI could displace over 10 years | 6–7% (range 3–14%) | verified |
| Canadian workers in jobs AI can largely do | 4.2M (31%) | verified (StatCan) |

## 4. Ability to pay and price

| Figure | Value | Label |
|---|---|---|
| Median pay: writers / designers / translators | USD 76,910 / 62,960 / 60,170 | verified (BLS) |
| Competitor floor: Teal, Rezi | USD 29/month | single-source |
| Human career coach (ceiling) | USD 230/hour | single-source |
| Low-touch outplacement (employer pays) | USD 1,000–1,500 per employee | single-source |
| Our price | USD 24/month | hypothesis |
| AI cost per active user | about USD 1.60/month (Sonnet 5.5) | price verified; usage hypothesis |

## 5. Market sizing (headline)

| Figure | Value | Label |
|---|---|---|
| B2C SAM, professionals (US + CA) | USD 26.0M | calc on hypotheses |
| Year-3 B2C revenue | 1,500 × USD 180 = USD 270K | hypothesis |
| B2B2C, US AI-cited layoffs × USD 300 | about USD 52M/year | calc on single-source |
| Segment A (laid off) B2C SAM | USD 19.6M/year | calc; filters hypothesis |

## Not verified yet (do not quote)

- US independent workers about 72M (MBO Partners 2024) — from memory
- Share of US workers worried about AI about 52% (Pew 2025) — from memory
