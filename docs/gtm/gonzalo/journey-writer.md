# Customer journey — US freelance writer (draft v1, 2026-10-24)

Owner: Gonzalo (GTM). Companion to `docs/gtm/gonzalo/market.md`. Use for the demo script and the build.
Labels: `verified` / `single-source` / `hypothesis` / `simulation`. Persona details are `simulation` (fictional, built from the data below).

## Persona

| Item | Value | Label |
|---|---|---|
| Name | Maya R. (fictional) | simulation |
| Location | Austin, Texas | simulation |
| Experience | 8 years freelance copywriter: B2B SaaS blog posts, email sequences, case studies | simulation |
| Clients | 4 retainer clients; the largest pays 55% of her income | simulation |
| Income before | about USD 6,000/month | simulation (above BLS writer median USD 76,910/year, verified) |
| Constraints | Needs at least USD 4,000/month; 10–12 hours a week free for the change; one child | simulation |
| Why she fits | 40% of US freelance writers say AI cut their income; nearly half see less demand | single-source ([Bernoff / Gotham Ghostwriters via ASJA, fall 2025](https://www.asja.org/?p=21770)) |

## Stage 0 — Crisis moment

Her largest client emails: "We now draft blog posts in-house with AI. From next month we only need light editing: USD 800 a month instead of USD 3,300." (simulation)

Maya loses about 40% of her income in one email. That night she posts in r/copywriting. She finds a pinned post: "I lost my biggest retainer to ChatGPT. This is how I found my next path." The post links to the free **AI-proof career check**.

## Stage 1 — Brain dump and data (10 minutes)

| Input | How | Required for demo |
|---|---|---|
| Brain dump | Free text or voice: "What happened, what you're good at, what you're afraid of" | Yes |
| Resume / LinkedIn | Upload PDF or paste LinkedIn URL | Yes |
| Portfolio | Link to Notion or Google Drive folder; agent reads 5 selected pieces | Yes |
| Published work | 3 URLs of published posts | Yes |
| Saved links | Optional: bookmarks or articles that inspired her | Optional |
| Lifelog (photos, messages) | Off by default; asked only later, one source at a time | No (not in demo) |

Agent's first reply (summary in 3 lines): "You have 8 years in B2B SaaS. Your strongest pieces explain complex products using customer interviews. Your income risk is concentrated in one client."

## Stage 2 — Agent interview (15 minutes, 8 questions)

1. Which projects in the last 2 years gave you energy, and which drained you?
2. What do clients thank you for that is not the writing itself?
3. Which tools do you already use, including AI?
4. What is your minimum monthly income, and by when?
5. How many hours a week can you give to a change?
6. Would you rather stay independent or take a full-time role?
7. Which of these pieces (agent shows 5) are you proudest of, and why?
8. What would make you quit a plan after two weeks?

Key answers (simulation): she likes interviewing customers and turning data into stories; clients thank her for "understanding the product better than our PM"; she uses ChatGPT for outlines; she wants to stay independent; she quits plans that "make me feel behind."

## Stage 3 — Three paths

| Path | Why it fits her (evidence from her data) | Time to first income | Label |
|---|---|---|---|
| A. AI content editor and brand-voice lead for existing SaaS clients | Keeps her clients; sells "AI draft + expert edit + voice guide" packages. Writers who use AI heavily earn more on average | 2–4 weeks | income effect single-source; timing hypothesis |
| B. Content strategist for B2B SaaS | 8 years of domain knowledge; plans what to publish and why; harder for AI to replace judgment | 3–6 months | hypothesis |
| C. UX writer / content designer | Explains complex products clearly; needs a small portfolio of product copy | 4–8 months | hypothesis |

Maya picks **A as a bridge (income now) and B as the 6-month goal.** The agent agrees: A protects income and builds the case studies B needs.

## Stage 4 — Plan structure

- **6-month goal:** first paid content-strategy client. **Quarter goal:** 3 clients on AI-editing packages, 1 strategy pilot.
- **Weekly milestones**, each broken into daily actions of 30 minutes or less.
- **Flexible rule (core engine):** a missed day lowers next week's load instead of resetting the streak. Rest days count as part of the plan.

## Stage 5 — First 4 weeks

| Week | Milestone | Daily actions (examples) | Done when |
|---|---|---|---|
| 1 — Reposition | Offer sent to 3 past clients | Rewrite LinkedIn headline; draft one-page "AI-assisted content package"; pick 3 clients; send 3 messages | 3 offers sent |
| 2 — Proof | One public case study | Redo an old post as "AI draft vs. expert edit" with before/after; publish on LinkedIn; reply to comments | Case study live |
| 3 — First sale | First paid AI-editing job | 1 client call; set package price; write a reusable editing checklist and prompt workflow | One signed job |
| 4 — Step toward B | Strategy foundation | One content-strategy course module; audit one client's blog (topics, gaps, results); join one strategy community | Audit sent to client |

End of week 4: the agent reviews results. 80% or more of actions done → keep the pace for weeks 5–8. Under 50% → lighter plan, same goals, longer timeline.

### The "day off" moment (week 2, Wednesday)

Maya goes to a friend's birthday dinner and skips her 20-minute task. No check-in that day.

Thursday morning, the agent:

> "Yesterday was a rest day, not a failure. You've done 6 of 8 actions this week, which is on track. Want to move the case-study draft to Friday, or do a 5-minute version now: just the headline and three bullet points?"

She picks the 5-minute version. The agent lowers week 2 from 8 to 7 actions and keeps the milestone. Her streak shows "7 days active, 1 rest day."

### Milestone share (end of week 3)

After the first paid job, the agent offers an optional card: "New path started: AI content editor. First client signed." She can share it to LinkedIn or keep it private. This is the referral loop in `docs/gtm/gonzalo/market.md` section 4.

## Demo data needed

All demo data must be **synthetic or fully anonymized with written consent**. KPK2 is a public repo: no real names, client names, emails or private messages.

| # | Item | Format | Source |
|---|---|---|---|
| 1 | Persona profile (section above) | JSON / markdown | Write synthetic |
| 2 | Resume | 1-page PDF or text | Synthetic |
| 3 | Portfolio: 5 writing samples (2 blog posts, 1 email sequence, 1 case study, 1 landing page) | Markdown or Google Doc links | Synthetic, or the teammate's wife's samples only with consent and anonymized |
| 4 | 3 "published" URLs | Static pages in the demo app | Synthetic |
| 5 | Crisis email from client | Text | Synthetic |
| 6 | Brain dump | Text (about 200 words) or 60-second voice clip | Synthetic |
| 7 | Interview answers to the 8 questions | Text script | Synthetic, based on the stage 2 answers |
| 8 | Path library: 3 paths with skills, evidence, first steps, resources | JSON | Team writes |
| 9 | 4-week plan with daily actions | JSON | Generated by the agent, checked by team |
| 10 | 14 days of check-ins (done / skipped / rest, mood 1–5, minutes) including the Wednesday miss | CSV / JSON | Synthetic |
| 11 | Milestone share card | Image or HTML | Generated |
| 12 | Optional: 5 saved links that inspired her | URL list | Public articles |

Not needed for the demo: photos, messages, biometric data. Show them only as "optional sources, off by default" on the settings screen.

## Open questions for the team

1. Do we use the teammate's wife's real samples? If yes, get written consent and remove names before anything goes into the repo.
2. Interview length: 8 questions is about 15 minutes. Shorten to 5 for the live demo?
3. Which model runs the interview and plan? It affects the AI cost line in `docs/gtm/gonzalo/market.md`.
