# Market — AI Career Agent (draft v3, 2026-10-24)

Owner: Gonzalo (GTM). Status: draft for team review. Companion file: `docs/gtm/gonzalo/journey-writer.md`.
Labels: `verified` (official or primary source + year) / `single-source` (one secondary or commercial source, or sources disagree) / `hypothesis` (our assumption) / `simulation` (VOC or model estimate) / `calc` (arithmetic on labeled inputs).

**Product:** a personal AI agent that learns the user's domain knowledge, portfolio, resume, published work and lifelog (with permission). When work dries up because of AI, it interviews the user, redesigns the career path, and guides it with flexible milestones and habits. Web first.
**Scope:** US + Canada. **Target:** 3–10 years of domain experience, work hit by AI.
**Payer:** the worker (B2C) for creative and professional roles; employers and public programs (B2B2C) for office roles.

---

## 1. How many people are in the target (task 1)

### 1a. Workers in AI-exposed jobs, and the path to 10M

US = BLS Employment Projections, 2025 base year. Canada = ESDC COPS, 2023 base year. Both `verified`. North America (NA) totals are `calc`.

| Stage | Segment | US | Canada | NA | Cumulative | AI signal (label) |
|---|---|---|---|---|---|---|
| 1 Beachhead | Writers and authors (incl. copywriters) | 140,300 | 27,200 | 167,500 | 167,500 | 40% of US freelance writers say AI cut their income (single-source); Upwork writing earnings −5.2% (verified) |
| 2 Creative | Interpreters and translators | 73,900 | 24,500 | 98,400 | 265,900 | UK: 36% lost work (single-source) |
| 2 Creative | 2D / graphic designers and illustrators | 282,000 | 93,200 | 375,200 | 641,100 | Canada: "strong risk of labour surplus" 2024–33 (verified) |
| 2 Creative | Voice artists (counted inside actors) | 67,500 | 14,900 | 82,400 | 723,500 | NAVA 2026: 21% lost work to AI (single-source) |
| 3 Professional | Editors | 105,000 | 14,000 | 119,000 | 842,500 | BLS −1% to 2035 (verified) |
| 3 Professional | Technical writers | 46,400 | 8,000 | 54,400 | 896,900 | BLS +1% (verified) |
| 3 Professional | Computer programmers | 110,800 | 45,700 | 156,500 | 1,053,400 | BLS −7%, AI named as cause (verified) |
| 3 Professional | Paralegals | 404,900 | 36,000 | 440,900 | 1,494,300 | BLS 0%, AI named (verified) |
| 3 Professional | PR specialists (US) / advertising, marketing, PR professionals (CA) | 314,500 | 233,600 | 548,100 | 2,042,400 | BLS: AI "may soften demand" (verified) |
| 3 Professional | Claims adjusters and examiners | 376,100 | n/a | 376,100 | 2,418,500 | BLS −5.5% (verified) |
| 4 Office (B2B2C) | Customer service representatives | 2,666,000 | 253,200 | 2,919,200 | 5,337,700 | Canada: 77% in high-exposure, low-complementarity jobs (verified) |
| 4 Office (B2B2C) | Data entry | 131,800 | 36,000 | 167,800 | 5,505,500 | BLS −25.5% (verified) |
| 4 Office (B2B2C) | General office clerks | 2,600,000 | 129,200 | 2,729,200 | 8,234,700 | Canada: 76% of office support exposed (verified) |
| 4 Office (B2B2C) | Secretaries and admin assistants | 1,889,800 | 233,800 | 2,123,600 | **10,358,300 → 10M reached** | BLS −6.0% (verified) |
| 4 Office (B2B2C) | Bookkeeping and accounting clerks | 1,532,400 | 151,100 | 1,683,500 | 12,041,800 | BLS −5.6% (verified) |

Cross-check: Goldman Sachs says 6–7% of US workers could be displaced over 10 years (verified, 2025; a later secondary report says about 15M). Statistics Canada counts 4.2M Canadian workers in high-exposure, low-complementarity jobs (verified, 2021 data). Our 12.0M is in the same range.

### 1b. Applying the target filters

| Layer | Value | Label |
|---|---|---|
| Workers in AI-exposed jobs (all 15 segments) | 12.0M | calc on verified |
| × 3–10 years of experience (proxy: share aged 25–44 per occupation, BLS CPS 2025) | **5.1M** | data verified; age-as-experience proxy is hypothesis |
| × work already hit by AI (40%, anchored on the US freelance writer survey) | 2.0M | hypothesis |

The core target is about **5.1M people** in US + Canada with 3–10 years of experience in AI-exposed jobs. **12.0M** is the wider pool used for the 10M story.

### Sources for section 1
[BLS writers](https://www.bls.gov/ooh/media-and-communication/writers-and-authors.htm) · [translators](https://www.bls.gov/ooh/media-and-communication/interpreters-and-translators.htm) · [graphic designers](https://www.bls.gov/ooh/arts-and-design/graphic-designers.htm) · [craft and fine artists](https://www.bls.gov/ooh/arts-and-design/craft-and-fine-artists.htm) · [actors](https://www.bls.gov/ooh/entertainment-and-sports/actors.htm) · [editors](https://www.bls.gov/ooh/media-and-communication/editors.htm) · [technical writers](https://www.bls.gov/ooh/media-and-communication/technical-writers.htm) · [computer programmers](https://www.bls.gov/ooh/computer-and-information-technology/computer-programmers.htm) · [paralegals](https://www.bls.gov/ooh/legal/paralegals-and-legal-assistants.htm) · [PR specialists](https://www.bls.gov/ooh/media-and-communication/public-relations-specialists.htm) · [BLS largest declines](https://www.bls.gov/emp/tables/occupations-largest-job-declines.htm) · [BLS CPS age table 11b](https://www.bls.gov/cps/cpsaat11b.htm) · [ESDC COPS employment file](https://open.canada.ca/data/en/dataset/e80851b8-de68-43bd-a85c-c72e1b3a3890) · [StatCan AI exposure](https://www150.statcan.gc.ca/n1/pub/11f0019m/11f0019m2024005-eng.htm) · [Goldman Sachs](https://www.goldmansachs.com/insights/articles/how-will-ai-affect-the-global-workforce) · [Writers survey via ASJA (Bernoff / Gotham Ghostwriters, fall 2025, n=1,481)](https://www.asja.org/?p=21770) · [NAVA via press](https://lifestyle.kbew98country.com/story/259505/navas-day-of-play-to-celebrate-video-game-industry-and-rally-support-to-protect-human-voices/) · [Society of Authors (UK)](https://thebookseller.com/news/a-third-of-translators-report-losing-work-to-generative-ai-systems-soa-survey-reveals)

## 2. Share of professional roles (task 2)

"Professional" here = roles built on domain expertise (stages 1–3: creative and professional). "Office" = support roles (stage 4).

| Group | Workers (NA) | Share | 3–10 yrs target | Share | Label |
|---|---|---|---|---|---|
| Creative (stages 1–2) | 723,500 | 6% | 374,600 | 7% | calc |
| Other professional (stage 3) | 1,695,000 | 14% | 829,800 | 16% | calc |
| **Professional total** | **2,418,500** | **20%** | **1,204,400** | **24%** | calc |
| Office support (stage 4) | 9,623,300 | 80% | 3,896,500 | 76% | calc |
| **Total** | 12,041,800 | 100% | 5,100,900 | 100% | calc |

Reading: professional roles are about **1 in 4** of the target (1.2M people). They are the best fit for B2C: higher income, rich domain knowledge and portfolios for the agent to learn from. Office roles are 3 in 4 and are the volume for the 10M story through employers.

## 3. Can they pay? (task 3)

### Income (median pay, employees, May 2025)

| Segment | US median pay / year | Label |
|---|---|---|
| Computer programmers | USD 100,390 | verified (BLS) |
| Writers and authors | USD 76,910 | verified (BLS) |
| PR specialists | USD 74,750 | verified (BLS) |
| Graphic designers | USD 62,960 | verified (BLS) |
| Paralegals | USD 62,890 | verified (BLS) |
| Interpreters and translators | USD 60,170 | verified (BLS) |
| Fine artists incl. illustrators | USD 55,490 | verified (BLS) |
| Actors (hourly only) | USD 29.05/hour | verified (BLS) |
| Customer service representatives | USD 44,770 | verified (BLS) |
| Canada: authors and writers | CAD 43.89/hour | single-source (Job Bank, Nov 2025; pages disagree) |

Caution: these are mostly employee wages. Freelancers earn less and more unevenly. US Authors Guild: median full-time writer income USD 23,000 (2022, single-source via NPR). Aggregators: about half of freelance writers earn under USD 2,000/month (single-source, unnamed survey).

### What they already spend (price anchors)

| Spend today | Price | Label |
|---|---|---|
| AI job-search / resume tools (Teal, Rezi) | USD 29/month | single-source |
| LinkedIn Premium Career | USD 30–40/month | single-source |
| Courses (Coursera Plus) | USD 399/year | single-source |
| Human career coach | Median USD 230/hour; packages USD 2,000–7,500 | single-source (ICF 2021) |
| Employer-paid outplacement | USD 1,000–1,500 per employee (low-touch) | single-source |
| Annual freelancer spend on tools and training | No public survey found | [check needed] → ask in VOC |

### Reading
- USD 24/month = USD 288/year = **0.4% of a writer's median pay** (calc). Below what they already pay for Teal or LinkedIn.
- Writers who use AI heavily earn on average USD 47,000 more than writers who don't (Bernoff / Gotham Ghostwriters survey, single-source). The move pays for itself if it works. This is the value story.
- Office workers (median about USD 45K) are less able to pay and are still employed: the employer or a workforce program is the payer.
- Risk: freelancers whose income has already collapsed may not pay. Mitigation: free tier that gives real value (the 2–3 paths), paid tier tied to the first income milestone.

## 4. Acquisition and journey into the career path (task 4)

### Channels

| Channel | Reach | Label | Why it works |
|---|---|---|---|
| r/copywriting | 231K–257K members | single-source (GummySearch snapshot, closed Nov 2025) | Daily "AI took my clients" threads |
| r/freelanceWriters | 62K–166K | single-source | Same pain, writing-only |
| r/graphic_design | about 2.8M | single-source | Large; designers stage 2 |
| r/VoiceActing | about 130K | single-source | Voice stage 2 |
| r/TranslationStudies | about 54K | single-source | Translators stage 2 |
| r/freelance | about 636K | single-source | Cross-segment |
| LinkedIn writer and creator groups | [check needed] | | Professional identity; where the new path is shown |
| Associations: ASJA, Editorial Freelancers Association, American Translators Association, Graphic Artists Guild, NAVA; Canada: PWAC, OTTIAQ | [check needed] | | Trusted voice; webinar or member offer |
| Upwork / Fiverr community forums | [check needed] | | Where income loss is visible first |

### Entry hook
"Free AI-proof career check: paste your portfolio link and tell us what changed. Get 2–3 new paths built on what you already know, in 10 minutes." Output is a shareable path card.

### Journey (B2C, AARRR)

| Step | What happens | Exit criterion | Funnel assumption (hypothesis) |
|---|---|---|---|
| Acquisition | Founder story or user story posted in community; link to free check | Visits landing page | 200,000 visitors in year 3 |
| Activation | Brain dump + portfolio link → agent interview → 2–3 paths | Sees paths with evidence from own work | 15% of visitors |
| Retention | Picks one path, gets week-1 plan, does first daily check-in | Completes 3 actions in week 1 | 50% of activated |
| Revenue | Paid trigger: unlock full 12-week plan, adaptive milestones, weekly review | Pays USD 24/month | 5% of sign-ups |
| Referral | Milestone card shared to LinkedIn or community | One share per paying user | [check needed] |

B2B2C (office tier): employer HR or public workforce board → paid pilot (one layoff cohort, 8 weeks, success = % with a new path and first step done) → per-employee contract.

## 5. Market sizing (USD per year)

ARPA (B2C) = USD 180/year: USD 24/month × about 7.5 paid months. `hypothesis`

### B2C — professional roles (stages 1–3)

| Layer | Formula | Value | Label |
|---|---|---|---|
| N | professional workers, 3–10 yrs proxy | 1,204,400 | calc |
| × work hit by AI now | 40% | 481,800 | hypothesis (anchor: 40% of US freelance writers) |
| × reachable by our channels | 30% (lower than creatives: fewer open communities for paralegals, adjusters) | 144,500 | hypothesis |
| **SAM** | 144,500 × 180 | **USD 26.0M** | calc |
| SOM — channel capacity (year 3) | 200,000 × 15% × 5% | 1,500 customers | hypothesis |
| SOM — share cap | 5% of 144,500 | 7,200 customers | hypothesis |
| **SOM (year 3)** | min | **1,500 customers** | calc — channel-limited |
| **Year-3 B2C revenue** | 1,500 × 180 | **USD 270K** | calc |
| Top-down check | US life coaching USD 2.6B ([IBISWorld](https://www.ibisworld.com/united-states/industry/life-coaches-in-the-us/4184/), 2025) × US professional share of labor force (1.92M / 170.8M = 1.1%) | USD 29.2M | single-source × verified |

Check: top-down USD 29.2M vs SAM USD 26.0M = 1.1x, within 3x. (Life coaching is a broad proxy; treat as order-of-magnitude only.)

### B2B2C — office tier, for scale

| Layer | Formula | Value | Label |
|---|---|---|---|
| US AI-cited layoffs | 116,175 (Jan–Aug 2026) × 12/8 | about 174,000/year | calc; assumes the pace continues (hypothesis); Challenger, single-source |
| Price per covered employee | below low-touch outplacement | USD 300 | hypothesis |
| **US annual market** | 174,000 × 300 | **about USD 52M/year** | calc |

### Beachhead — creatives who have already lost work (recalculated 2026-10-24)

Narrowest version of the beachhead: self-employed creatives in US + Canada who have already lost work or income to AI.

| Segment | Jobs (NA) | Self-employed | Already lost work | 3–10 yrs (age 25–44 proxy) |
|---|---|---|---|---|
| Writers / copywriters | 167,500 | 65% → 108,900 | 40% → 43,600 | 46% → 19,900 |
| Translators | 98,400 | 28% → 27,600 | 36% → 9,900 | 44% → 4,400 |
| 2D / graphic designers | 346,300 | 20% → 69,300 | 26% → 18,000 | 55% → 9,900 |
| Illustrators / fine artists (US) | 28,900 | 58% → 16,800 | 26% → 4,400 | 52% → 2,300 |
| Voice artists (inside actors) | 82,400 | 23% → 19,000 | 21% → 4,000 | 60% → 2,400 |
| **Total** | **723,500** | **241,400** | **79,800** | **38,800** |

Labels: job counts and self-employed shares verified (BLS 2025, ESDC COPS 2023). Applying the US self-employed shares to Canada is a hypothesis (Canadian provincial data show higher shares for translators and designers, so this is conservative). Lost-work shares: writers 40% (US survey, single-source), translators 36% and illustrators 26% (UK survey, single-source), designers 26% (illustrator figure used as a proxy, hypothesis), voice 21% (NAVA 2026, single-source). Age proxy: data verified, mapping is a hypothesis. Totals are calc.

| Layer | Value | Label |
|---|---|---|
| Already hit, 3–10 years | 38,800 | calc |
| × reachable (50%) | 19,400 | hypothesis |
| SOM — channel capacity | 1,500 | hypothesis |
| SOM — share cap (5%) | 970 | hypothesis |
| **SOM (year 3)** | **970 customers (limited by the share cap)** | calc |

| Price scenario | ARPA | SAM | Year-3 revenue | Label |
|---|---|---|---|---|
| USD 12/month × 7.5 months | USD 90 | USD 1.75M | USD 87K | hypothesis |
| USD 24/month × 6 months | USD 144 | USD 2.80M | USD 140K | hypothesis |
| USD 24/month × 7.5 months (base) | USD 180 | USD 3.50M | USD 175K | hypothesis |
| USD 29/month × 7.5 months | USD 218 | USD 4.22M | USD 211K | hypothesis |

Reading: the people already hurting are a sharp, reachable group of about 39K in US + Canada. They are the right group to prove the product and collect stories, but too small to be the business on their own. Scale comes from the wider exposed pool and employer-paid channels.

## 6. Privacy: top objections from US customers (task 6)

Context: 81% of US adults are concerned about how companies use the data they collect; 70% of those who have heard of AI have little or no trust in companies to use AI responsibly ([Pew, Oct 2023](https://www.pewresearch.org/short-reads/2023/10/18/key-findings-about-americans-and-data-privacy/), verified). 84% of GenAI users worry data they enter could go public; 59% say strong privacy laws make them more comfortable ([Cisco 2024, 12 countries](https://investor.cisco.com/news/news-details/2024/New-Cisco-Survey-Shows-Strong-Relationship-Between-Privacy-Awareness-and-Trust-in-AI/), single-source for US).

| # | Objection | One-line trust answer |
|---|---|---|
| 1 | "You want to read my messages and photos." | Every source is off by default and opt-in one by one; the career plan works with your portfolio and interview alone. |
| 2 | "You'll train AI on my work or sell my data." | We never sell your data and never use it to train models. [check needed: confirm model provider's API terms before saying this publicly] |
| 3 | "My portfolio has clients' confidential work." | You choose which files the agent reads; client material stays private and is never shown to anyone else. |
| 4 | "What if you get hacked?" | Raw lifelog data is summarized and then deleted; we keep only the short summaries the plan needs, encrypted. |
| 5 | "My employer will see my struggles" (B2B2C) | Sponsors see only anonymous group progress, never your content or check-ins. |
| 6 | "Can I leave and take my data?" | One click exports or deletes everything, in line with US state privacy laws and Canada's PIPEDA. |

Product implication: lifelog auto-collection is the biggest trust risk. Recommend for the demo and launch: portfolio + interview + manual daily check-in first; lifelog sources as an optional later level.

## 7. Pricing, model, motion, deck lines

| Item | Choice | Label |
|---|---|---|
| Model | Freemium + monthly subscription (B2C); per covered employee (B2B2C) | |
| Strategy | Freemium with conversion trigger: free = 2–3 paths; paid = full plan with adaptive milestones | |
| Price | USD 24/month | hypothesis; floor USD 29 (Teal, Rezi), ceiling USD 230/coach hour |
| AI/API cost per active user per month | about USD 1.60 (Claude Sonnet 5.5, USD 2 in / 10 out per 1M tokens, Anthropic Oct 2026; 8 sessions × 10 turns × 6K in + 800 out). Lifelog processing adds cost [check needed] | price verified; usage hypothesis |
| Motion | Self-serve for professionals; partner/channel for employers and workforce programs | |

1. **Market:** "1,500 paying professionals × USD 180 = USD 270K year-3 revenue in the US and Canada via writer, designer and translator communities; 5.1M experienced workers are in AI-exposed jobs, and employers pay per employee to reach the 10M (about USD 52M a year from US AI-cited layoffs alone)."
2. **Sales motion:** "Free AI-proof career check in a community post → 2–3 paths from your own portfolio in 10 minutes → pick a path, paid trigger unlocks the adaptive plan → USD 24/month; employers: 8-week paid pilot, then per-employee contract."

## 8. Weakest claims — fix first

1. **Filters and conversion are hypotheses.** "Hit by AI now" (40%), reachable (30%), funnel rates and the USD 180 ARPA drive SAM and SOM; the age 25–44 proxy for "3–10 years" is an assumption. Fix: Jin's buyer simulation; one real interview (writer scenario); a live post to measure click-through.
2. **Ability to pay for freelancers is not measured.** BLS pay is for employees; no public data on what freelancers spend on tools or training. Fix: add "What do you pay per month for tools, courses, coaching?" to VOC.

Also: voice artists and illustrators have no separate official count; Canada claims adjusters not found; the 40% writer figure is from one commercial survey; the 10M is workers in exposed jobs, not jobs lost.
