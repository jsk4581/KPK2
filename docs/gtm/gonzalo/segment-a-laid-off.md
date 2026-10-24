# Segment A — Recently laid-off US white-collar workers (draft v1, 2026-10-24)

Owner: Gonzalo (GTM). Status: draft for team review. Companion files: `docs/gtm/gonzalo/market.md` (freelance beachhead), `docs/gtm/gonzalo/journey-writer.md`.
Labels: `verified` (official or primary source + year + link) / `single-source` (one secondary or commercial source, or sources disagree) / `hypothesis` (our assumption, one line of reasoning) / `simulation` / `calc` (arithmetic on labeled inputs).

**Unit of count: annual INFLOW, not stock.** The crisis moment is the layoff email and the product window is the severance-plus-savings runway (about 14–16 weeks, see section 5). A person is a prospect for one window, so we count people laid off per year and treat each year's cohort as new demand. Stocks (people currently unemployed) appear only as a top-down check.

## 1. Summary

- **TAM (US, B2C):** about 2.47M displaced workers per year × USD 144 = **USD 355M/year** (calc on verified counts; ARPA hypothesis).
- **SAM (US, B2C):** 136,000 reachable long-tenured management/professional workers aged 25–54 per year × USD 144 = **USD 19.6M/year** (calc; filters are hypotheses).
- **SOM (year 3) and revenue:** 2,250 paying customers (channel-limited, hypothesis) × USD 144 = **USD 324K**; employer-paid (outplacement) line is sized separately at USD 115M SAM and about USD 1.4M year-3 (section 4).
- **Top-down check:** USD 28M (life coaching × share of unemployed management/professional), 1.4x of SAM, within 3x.
- **ICP:** a US management or professional employee, 25–54, 3+ years with the employer, earning about USD 85K, whose position was abolished, who has 14–16 weeks of severance and savings and wants to decide what the next step is before the money runs out.

## 2. Inflow data

| Figure | Value | Source | Year | Label |
|---|---|---|---|---|
| Displaced workers, all tenures, Jan 2023–Dec 2025 (US) | 7.4M over 3 years = **2.47M/year** | [BLS Worker Displacement](https://www.bls.gov/news.release/archives/disp_08272026.htm) | 2026 | verified; per-year is calc |
| Long-tenured displaced (3+ years with employer), 2023–25 | 3.324M = **1.108M/year** (+746K vs 2021–23) | BLS DWS, Table 1 | 2026 | verified; per-year is calc |
| of which management, professional and related | 1.545M = **515K/year** (management, business, financial 916K; professional 629K) | BLS DWS | 2026 | verified; per-year is calc |
| of which sales and office (adjacent, lower income) | 528K = 176K/year | BLS DWS | 2026 | verified; per-year is calc |
| Long-tenured aged 25–54 | 2.193M of 3.324M = **66.0%** | BLS DWS, Table 1 | 2026 | verified; share is calc |
| Long-tenured by lost-job industry | Professional and business services 524K; financial activities 286K; information 108K | BLS DWS, Table 4 | 2026 | verified |
| Reason: position or shift abolished | 44.4% (1.477M); closings 32.6%; insufficient work 22.9% | BLS DWS | 2026 | verified |
| Reemployed by Jan 2026 (long-tenured) | 66.1% overall; 65.3% mgmt/prof; 72.9% age 25–54; 60.3% prof. and business services; 76.8% information | BLS DWS | 2026 | verified |
| New job pays as much or more (full-time to full-time) | 49% (62% in the Jan 2024 survey) | BLS DWS, Table 7 | 2026 | verified |
| Received written advance notice | about 45% | BLS DWS | 2026 | verified |
| JOLTS layoffs and discharges, 2025 (all tenures, incl. temporary and seasonal) | **21.239M** total; private 20.216M; prof. and business services 5.497M; information 447K; finance and insurance 452K | [BLS JOLTS annual, Table 23](https://www.bls.gov/news.release/archives/jolts_03132026.htm) | 2026 | verified |
| Challenger announced US cuts, Jan–Sep 2026 | **573,195** (−39% vs 2025); September 43,281 | [Challenger, Oct 1 2026](https://www.challengergray.com/blog/job-cuts-fall-in-september-hiring-plans-up-3-over-2025-on-weak-early-seasonal-hiring/) | 2026 | single-source |
| Challenger cuts citing AI, Jan–Sep 2026 | **120,136** (21% of cuts, leading reason); annualized 160,181 | Challenger | 2026 | single-source; annualized is calc (assumes pace holds, hypothesis) |
| Challenger technology sector cuts, Jan–Sep 2026 | 165,925 (+54% vs 2025) | Challenger | 2026 | single-source |
| WARN notices 2026 YTD (third-party compilation) | about 3,050 notices, about 275K workers | [LayoffTracker](https://layofftracker.us/layoffs/year/2026) | 2026 | single-source (snapshots disagree, 258K–277K) |
| Tech layoffs tracked by layoffs.fyi, 2026 to early Aug | about 173,900 (global; 2025 full year about 245K) | secondary press citing layoffs.fyi | 2026 | single-source |

Note on Challenger vs `docs/gtm/gonzalo/market.md`: market.md uses 116,175 AI-cited cuts for Jan–Aug 2026 (annualized 174K). The September report lifts the YTD to 120,136 but the annualized pace falls to 160K because September was a low AI month (3,961). Update market.md section 5 when convenient.

Canada (short note): Statistics Canada publishes job losers by permanent layoff in LFS table 14-10-0126-01 (annual); the 2025 figure was not retrieved in this pass [check needed]. Canada unemployment rate was 7.0% in May 2025 ([ESDC QP note](https://search.open.canada.ca/qpnotes/record/esdc-edsc%2CLabour_JUN2025_002), verified). Not sized here.

## 3. B2C sizing (payer = the laid-off individual)

ARPA for Segment A = **USD 144/year** = USD 24/month × 6 paid months. `hypothesis`. Why lower than market.md's 7.5 months: the median unemployment spell for management/professional workers is 14.4 weeks (verified, section 5), so most users reach reemployment or a first income milestone inside 4–6 months; we assume they keep the habit layer for a short time after. Price stays USD 24/month for consistency; the anchors in section 5 would support a higher launch price (USD 29–39) for this segment, which is the upside case, not the base.

| Layer | Formula | Value (per year) | Label | Source / logic |
|---|---|---|---|---|
| N_total (US) | displaced workers, all tenures, 2023–25 ÷ 3 | 2,467,000 | calc on verified | BLS DWS 7.4M ÷ 3; US only (market locked). JOLTS 21.2M is the upper bound incl. temporary and seasonal layoffs |
| × long-tenured (3+ years with employer) | 3.324M ÷ 7.4M = 44.9% | 1,108,000 | calc on verified | BLS DWS |
| × management, professional and related occupation | 1.545M ÷ 3.324M = 46.5% | 515,000 | calc on verified | BLS DWS; sales and office (176K) excluded for ability to pay |
| × aged 25–54 (proxy for 3–10 years of experience) | 66.0% | 340,000 | hypothesis (share is verified, applied uniformly across occupations because BLS publishes no cross-tab; 25–54 is wider than 3–10 years, so this is an upper bound) [check needed: tenure split 3–9 vs 10+ years from the CPS microdata] | BLS DWS |
| × reachable by our channels | 40% | 136,000 | hypothesis (above market.md's 30% because a layoff is a public event: LinkedIn Open to Work, WARN filings, layoff trackers, r/layoffs) | section 5 channels |
| ARPA | USD 24 × 6 months | USD 144 | hypothesis | see above |
| **TAM** | 2,467,000 × 144 | **USD 355M** | calc | |
| **SAM** | 136,000 × 144 | **USD 19.6M** | calc | at ARPA 180: USD 24.5M |
| SOM (a) channel capacity, year 3 | 250,000 visitors × 15% activation × 6% paid | 2,250 customers | hypothesis (visitors: LinkedIn + Reddit + one layoff-tracker partnership; activation as market.md; paid 6% vs 5% because urgency is higher) | |
| SOM (b) share cap | 5% of 136,000 | 6,800 customers | hypothesis | |
| **SOM (year 3)** | min(a, b) | **2,250 customers** | calc, channel-limited | |
| **Year-3 B2C revenue** | 2,250 × 144 | **USD 324K** | calc | at ARPA 180: USD 405K |
| Top-down check | US life coaching USD 2.6B ([IBISWorld 2025](https://www.ibisworld.com/united-states/industry/life-coaches-in-the-us/4184/)) × unemployed mgmt/prof stock 1.837M ÷ labor force 170.8M (1.08%) | USD 28M | single-source × verified | 1.4x of SAM, within 3x; broad proxy, order of magnitude only |

## 4. Employer-paid sizing (payer = the employer, via outplacement budget), kept separate

The user is the same laid-off employee; the payer is HR. Count unit = laid-off employees whose employer buys transition support.

| Layer | Formula | Value (per year) | Label | Source / logic |
|---|---|---|---|---|
| N: announced US cuts, annualized | 573,195 × 12/9 | 764,000 | calc on single-source (pace holds: hypothesis) | Challenger Jan–Sep 2026; JOLTS 21.2M is the upper bound but most are not mass layoffs with a budget |
| × employers offering outplacement | about 50% | 382,000 | single-source (RiseSmart 2018 survey; a 2025 vendor survey says 82% of its clients include transition support, biased sample) [check needed: SHRM or Mercer benchmark] | |
| Price per covered employee | below low-touch outplacement | USD 300 | hypothesis (market.md); benchmark USD 1,660 per employee ([IBISWorld procurement 2026](https://www.ibisworld.com/united-states/procurement/outplacement-services/53933870), single-source); USD 1,000–1,500 low-touch (market.md, single-source) | |
| **Employer SAM (US)** | 382,000 × 300 | **USD 115M** | calc | |
| AI-cited wedge | 160,181 × 50% × 300 | USD 24M | calc | the "AI layoff" story for the deck |
| SOM year 3 | 15 contracts × 300 covered employees × 300 | **USD 1.35M** | hypothesis (8-week paid pilot, then per-cohort contract; sales cycle months) | |
| Top-down check | Global outplacement USD 5.21B × North America 41.4% = USD 2.16B ([Mordor 2025](https://www.mordorintelligence.com/industry-reports/outplacement-market)); at the USD 1,660 benchmark our 382K covered employees would be USD 634M | 3.4x | single-source | just outside 3x; the gap is layoffs not announced publicly (JOLTS 21M vs Challenger 0.76M), so our N is conservative |

Utilization note: 73% of employees offered outplacement use it (RiseSmart white paper, single-source), so a pay-per-active-user model would cut the employer's bill and is a fallback if USD 300 flat is resisted.

## 5. ICP in depth

### Who

| Attribute | Value | Label |
|---|---|---|
| Occupation | Management, business and financial operations (916K displaced 2023–25); professional and related (629K) | verified (BLS DWS 2026) |
| Former industry | Professional and business services (524K), financial activities (286K), information (108K); tech is the loudest cohort (Challenger 165,925 tech cuts Jan–Sep 2026) | verified; Challenger single-source |
| Employer size | Mass layoffs with WARN notices (100+ employees) and announced cuts; about 275K workers in 2026 WARN filings | single-source |
| Seniority | Individual contributor to first-line manager; 3+ years with the lost employer (long-tenured), 3–10 years total experience | tenure verified; experience band hypothesis (BLS has no tenure cross-tab) |
| Age band | 25–54 (66% of long-tenured displaced; reemployment 72.9%) | verified |
| Income band | Median USD 1,645/week full-time = about USD 85.5K/year (management/professional, 2025) | verified ([BLS via FRED](https://fred.stlouisfed.org/data/LEU0254524600A)); annual is calc |
| Why displaced | Position or shift abolished 44.4%; 45% got written notice | verified |

### Situation (the crisis moment)

| Item | Value | Label |
|---|---|---|
| Severance, employer side | 58% of employers provided severance in the prior 12 months; 1 week per year of service most common (57%), 2 weeks (24%) | single-source ([ASE 2024](https://www.aseonline.org/News-Events/Articles/ase-releases-results-to-the-2024-severance-pay-policies-practices-survey)) |
| Severance, worker side | 1 in 3 recently laid-off workers received severance; those who did averaged 16 weeks' pay | single-source ([ZipRecruiter 2023](https://www.ziprecruiter-research.org/survey-of-recently-laid-off-workers)) |
| Severance, laid-off professionals | Median 15 weeks; 45% had 5+ months of salary saved; typical runway 5–6 months | single-source ([LHH survey via IndustryWeek, undated](https://www.industryweek.com/archive/article/21954816/survey-laidoff-workers-financially-prepared)) |
| Runway for a 5-year ICP at 1–2 weeks per year | 5–10 weeks of severance (USD 8K–16K at USD 1,645/week) plus savings | calc on single-source and verified |
| Unemployment duration, management/professional, Sep 2026 | Median 14.4 weeks, mean 29.2 weeks; 1.837M unemployed; mgmt/business/financial median 16.9 weeks | verified ([BLS A-37](https://www.bls.gov/web/empsit/cpseea37.htm)) |
| Unemployment rate, management/professional | 2.7% (Feb 2026, up from 2.4%) | verified ([BLS / FRED](https://fred.stlouisfed.org/series/LNU04032215)) |
| Pay on the next job | Only 49% earn as much or more (62% two years earlier) | verified |
| Emotional state | Over two-thirds of workers laid off after 5+ years felt blindsided; only 13.8% had a resume ready | single-source ([Careerminds, n=900, Apr 2026, via HR Executive](https://hrexecutive.com/long-tenured-workers-are-least-prepared-for-layoffs-new-research-finds/)) |
| Fragility | 19% of workers could sustain their lifestyle one week or less after a layoff; 22% two to four weeks | single-source (ResumeBuilder 2024) |

Reading: the window is real but short. Severance (median about 15–16 weeks for those who get it) roughly equals the median search (14.4 weeks). The rethink must happen in weeks 1–4, before panic-applying consumes the runway.

### Triggers and timing

| Moment | What happens | Our move | Label |
|---|---|---|---|
| Day 0–3 (the email) | Shock, blindsided; LinkedIn post, Open to Work badge | Be the first calm thing they see: "90-day runway plan" from a brain dump | hypothesis |
| Week 1–2 | Severance letter signed; resume scramble (86% have none ready) | Free check: 2–3 paths from the resume and the brain dump; runway calculator (YMOYL) | single-source input |
| Week 3–8 | Applications, silence; identity crisis ("was it AI, was it me") | Paid plan: one path, flexible milestones, missed days lower the load | hypothesis |
| Week 12–16 | Severance ends; median reemployment point | Decision point: new job, side income, or hybrid; many churn here, by design | verified duration |
| Best reach window | Day 0 to week 2 | Trigger-based outreach (WARN, Open to Work, layoff posts) | hypothesis |

### Jobs to be done, pains, gains (crisis to opportunity)

| Job to be done | Pain today | Gain with the agent |
|---|---|---|
| Decide what to do before the money runs out | No one asks what they want; outplacement pushes the same job back | 2–3 legal, ethical income paths built on what they already know, with a runway number next to each |
| Turn "replaced by AI" into a plan | 21% of 2026 cuts cite AI (single-source); shame and anger | AI as the ally for the next step; the brand line |
| Keep moving on bad days | Linear job-search trackers punish gaps | Missed day lowers the load instead of resetting |
| Protect income level | 51% take a pay cut on the next job (verified) | Paths include income stacking, not only reemployment |

### Where to find them

| Channel | Reach | Label | Why |
|---|---|---|---|
| LinkedIn Open to Work | 220M+ members with the setting on (global, early 2025); 40M public (Sep 2024) | single-source ([CNBC via NBC](https://nbcnewyork.com/news/business/money-report/on-linkedin-220-million-people-are-open-to-work-recruiters-weigh-in-if-the-feature-helps-or-hurts-job-seekers/6119784), [Fortune](https://www.fortune.com/2024/09/05/linkedin-opentowork-badge-recruiters-job-search)) | Public signal within hours of the layoff; US share [check needed] |
| r/layoffs | about 177K members | single-source (GummySearch snapshot) | Day-0 venting threads; "what now" posts |
| r/jobs | about 2.7M members | single-source (GummySearch 2026) | Volume; job-search pain |
| Blind | 12M+ verified professionals (undated) | single-source ([Blind press](https://press.teamblind.com)) | Tech and finance; layoff rumours pre-date the email |
| WARN notices | about 3,050 filings, 275K workers in 2026 YTD | single-source (LayoffTracker) | Employer and location named 60 days ahead; B2B lead list and geo-targeted B2C |
| layoffs.fyi, Challenger monthly report | 173,900 tech layoffs tracked 2026 | single-source | Press and newsletter hooks; partnership for the free check |
| Outplacement firms (LHH, Randstad RiseSmart, Careerminds) | 73% utilization when offered | single-source | Channel partner for the employer-paid line |

### Willingness to pay

| Anchor | Price | Label |
|---|---|---|
| LinkedIn Premium Career | USD 30–40/month | single-source (market.md) |
| AI resume tools (Teal, Rezi) | USD 29/month | single-source (market.md) |
| TopResume packages | USD 149–219 entry, USD 599 executive (one-off) | single-source (sources disagree on entry price) |
| Human career coach | Median USD 230/hour; packages USD 2,000–7,500 | single-source (ICF 2021, market.md) |
| Employer outplacement | USD 1,660 per employee benchmark (2026); USD 1,000–1,500 low-touch | single-source |
| Our price | USD 24/month, 6 months = USD 144 = 0.4 days of the ICP's pay (USD 329/day) | hypothesis; calc |
| Direct survey of what laid-off workers pay for tools or coaching | none found | [check needed] → add to VOC |

Reading: floor (Teal, LinkedIn) is above our price; ceiling (coach, outplacement) is 10–50x. Room to launch at USD 29–39 for this segment; keep USD 24 as the base for consistency with market.md.

### Top objections

| Objection | One-line answer |
|---|---|
| "I need a job, not a plan." | The first output is a runway number and 2–3 paths; one of them is usually a faster job search, done with your own evidence. |
| "I just lost income; I will not pay." | Free tier gives the paths; you pay USD 24 only when you pick one, less than a LinkedIn Premium month. |
| "My company gave me outplacement." | Outplacement rebuilds the old resume; we ask what you want before the severance runs out. Use both. |
| "Another AI tool, after AI took my job." | The agent does not replace you; it reads your work and argues for you. That is the point of the brand. |
| "I do not want my layoff data on a server." | Resume and interview only; no lifelog needed; export or delete in one click. |

### Disqualifiers (not the ICP)

- No severance and no savings (19% have one week or less): needs income this week, not a rethink; route to the free tier only.
- Under 3 years of experience: thin portfolio for the agent to learn from; low ability to pay.
- 55+ or executives: longer searches (57.3% reemployment at 55–64) and different needs; coach-led outplacement fits better.
- Production, construction and service occupations: lower pay, different channels; public workforce programs are the payer.
- Still employed and worried: pre-crisis, no trigger; nurture content only.

### Comparison with the freelance-writer beachhead (docs/market.md)

| Criterion | Segment A: laid-off white-collar | Freelance writers (market.md) |
|---|---|---|
| Urgency | High: dated trigger, 14–16 week window (verified) | Medium: slow income erosion, 40% hit (single-source) |
| Ability to pay | High: median USD 85.5K, severance for 1 in 3 (verified, single-source) | Low to medium: median full-time writer USD 23K (single-source) |
| Reach | High: public signals (Open to Work 40M public, WARN, r/layoffs) | Medium: niche subreddits 60K–260K |
| Data richness for the agent | Medium: resume and LinkedIn; less public portfolio | High: published portfolio |
| Fit with brand | Strong: 21% of cuts cite AI; "ally for the next step" lands | Strong: AI is the named cause |
| Churn risk | High by design: window closes at reemployment (ARPA 144) | Lower: ongoing freelance life (ARPA 180) |
| Annual inflow of ICP | 340K/year (calc) | Stock 1.2M professionals, no inflow (calc) |

## 6. Deck lines

- **Market:** "2.47M US workers are displaced every year (BLS 2026, verified); 340K of them are experienced management and professional workers aged 25–54 (calc); we reach 136K (hypothesis) for a USD 19.6M SAM (calc). Year 3: 2,250 paying users × USD 144 = USD 324K (hypothesis). Employers pay separately: USD 300 per laid-off employee (hypothesis) across 382K covered employees = USD 115M (calc)."
- **Sales motion:** "Self-serve: layoff post or Open to Work badge (day 0–2) → free 10-minute runway check: 2–3 paths from the resume (activation 15%, hypothesis) → pick a path, paid trigger unlocks the adaptive 90-day plan at USD 24/month (6% of sign-ups, hypothesis) → stays about 6 months. Employers: WARN-listed HR lead → 8-week paid pilot for one cohort → USD 300 per employee per cohort (hypothesis)."

## 7. Two weakest claims

1. **ARPA USD 144 and the 6% paid conversion are untested for people who just lost income.** No public survey of what laid-off workers spend on tools or coaching was found. Fix: VOC with 5 recently laid-off people (ask severance weeks, what they bought in week 1, would they pay USD 24 before or after picking a path); one live post in r/layoffs with the free check to measure click-through and sign-up.
2. **The "3–10 years of experience" filter is a proxy.** BLS gives 3+ years tenure and age 25–54 only, no tenure cross-tab, so 340K is an upper bound. Fix: pull the CPS Displaced Worker Supplement microdata (IPUMS) for tenure 3–9 years × age 25–44 × management/professional; or ask the agent to score experience from the resume and report the real share after 50 sign-ups.

Also: the 40% reachable filter is higher than market.md's 30% on reasoning only; the outplacement adoption share rests on a 2018 survey; Canada is not sized.

## 8. Sources

- [BLS, Worker Displacement: 2023–25 (Aug 27, 2026)](https://www.bls.gov/news.release/archives/disp_08272026.htm) · [BLS TED summary](https://www.bls.gov/opub/ted/2026/nearly-two-thirds-of-long-tenured-displaced-workers-were-reemployed-in-january-2026.htm)
- [BLS JOLTS, January 2026 release with 2025 annual tables (Mar 13, 2026), Table 23](https://www.bls.gov/news.release/archives/jolts_03132026.htm)
- [BLS A-37, unemployed by occupation and duration, Sep 2026](https://www.bls.gov/web/empsit/cpseea37.htm) · [FRED LNU04032215, unemployment rate mgmt/prof](https://fred.stlouisfed.org/series/LNU04032215) · [FRED LEU0254524600A, median weekly earnings mgmt/prof](https://fred.stlouisfed.org/data/LEU0254524600A)
- [Challenger, Gray & Christmas, September 2026 report (Oct 1, 2026)](https://www.challengergray.com/blog/job-cuts-fall-in-september-hiring-plans-up-3-over-2025-on-weak-early-seasonal-hiring/)
- [ASE 2024 Severance Pay Policies and Practices survey](https://www.aseonline.org/News-Events/Articles/ase-releases-results-to-the-2024-severance-pay-policies-practices-survey) · [ZipRecruiter, Survey of Recently Laid-Off Workers (2023)](https://www.ziprecruiter-research.org/survey-of-recently-laid-off-workers) · [LHH survey via IndustryWeek (undated)](https://www.industryweek.com/archive/article/21954816/survey-laidoff-workers-financially-prepared) · [ResumeBuilder 2024 via Allwork](https://allwork.space/?p=1029890)
- [Careerminds long-tenured layoff survey via HR Executive (May 2026)](https://hrexecutive.com/long-tenured-workers-are-least-prepared-for-layoffs-new-research-finds/) · [Careerminds 2025 transition-support report](https://careerminds.com/blog/outplacement-evolvement) · [RiseSmart utilization and 2018 offer rate via HRO Today](https://www.humanresourcesonline.net/73-of-staff-actually-utilise-outplacement-services-offered-by-firms)
- [IBISWorld outplacement procurement benchmark (2026)](https://www.ibisworld.com/united-states/procurement/outplacement-services/53933870) · [Mordor Intelligence outplacement market (2025)](https://www.mordorintelligence.com/industry-reports/outplacement-market) · [IBISWorld life coaches in the US (2025)](https://www.ibisworld.com/united-states/industry/life-coaches-in-the-us/4184/)
- [LinkedIn Open to Work 220M via CNBC/NBC](https://nbcnewyork.com/news/business/money-report/on-linkedin-220-million-people-are-open-to-work-recruiters-weigh-in-if-the-feature-helps-or-hurts-job-seekers/6119784) · [40M public via Fortune (Sep 2024)](https://www.fortune.com/2024/09/05/linkedin-opentowork-badge-recruiters-job-search) · [r/layoffs](https://gummysearch.com/r/Layoffs/) · [r/jobs](https://gummysearch.com/r/jobs) · [Blind press page](https://press.teamblind.com) · [LayoffTracker WARN 2026](https://layofftracker.us/layoffs/year/2026) · [layoffs.fyi 2026 via press](https://www.kron4.com/news/technology-ai/number-of-tech-layoffs-in-2026-already-tops-100k-report/amp/)
- [TopResume pricing 2026 (VisualCV roundup)](https://www.visualcv.com/blog/best-resume-writing-service-2026/) · [ESDC QP note, Canada LFS May 2025](https://search.open.canada.ca/qpnotes/record/esdc-edsc%2CLabour_JUN2025_002)
