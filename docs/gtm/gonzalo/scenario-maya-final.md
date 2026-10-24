# Final scenario — Maya: "AI can't bake her bread. It can do everything else." (v3, 2026-10-24)

Owner: Gonzalo (GTM). For Roy and JSK (demo). Builds on `scenario-dream.md` (Maya) + the best of Dana (`docs/gtm/journey-io.md`, `app/data/persona-dana.json`). Comparison: `dana-vs-maya.md`.
Labels: Maya and all her numbers are `[SIMULATION]` (fictional). Law and price facts are labeled in "Sources".

> **한국어 요약 (JSK용):** Maya 시나리오에 Dana의 장점을 합친 최종본. 데모 흐름(입력 3칸 → 경로 카드 3장 → 이번 주 행동 3개 → Not today)은 Dana와 동일하게 유지하고, 카드 맨 위에 "What transfers"를 둔다. 차이점: 경로 중 하나가 AI가 대신할 수 없는 **꿈(홈 베이커리)** 이고, 현실 점검(비용·법·박스 수)과 매일 넛지가 들어간다. 아래 "Demo data" 섹션은 `persona-dana.json`과 같은 구조로 작성했으므로 시드 파일로 옮기기 쉽다.

## What we kept from Dana, what we kept from Maya

| From Dana (Roy) | From Maya (Gonzalo) |
|---|---|
| Same demo flow: 3 text boxes → 3 path cards → 3 actions this week → "Not today" | A real dream AI can't do: reopening her parents' bakery, small |
| "What transfers" at the top of every card, then "What's missing" and "First 2 weeks" | Reality check with MBA logic: law, cost, boxes per weekend |
| Actions of 30 minutes or less, each on a day of the week | Lean business plan: home kitchen → shared kitchen → delivery and cafés |
| "Today was a rest day, not a missed day." The step moves, nothing is deleted, plus a 10-minute version | Daily nudges against fear, and time moving from job-search worry to the dream |
| "Nothing you type is stored." Lifelog only from sources she allows | The "vaccine": a fix for a known barrier before it makes her quit |
| Real fear in her own words | Brand: crisis → opportunity, AI as ally |

## Persona

Maya R., 38, Austin, Texas. Freelance copywriter for 8 years (DTC and SaaS brands). Good at it, never her passion. Needs at least USD 4,000/month. 10–12 free hours a week, one son. Her parents ran a family bakery for 25 years. It closed in 2019. She still has her mother's recipe notebook.

Her real problem is fear, not skills. She spends about 2 hours a day on Upwork and LinkedIn looking for gigs, gets almost no replies, and goes to bed worried.

## The 6 moments (same flow as the demo)

| # | Moment | What Maya feels | What she does | What the agent returns |
|---|---|---|---|---|
| 1 | One night | "My clients use ChatGPT now. Were 8 years for nothing?" | Clicks [Start] | One line of empathy + "Nothing you type is stored." |
| 2 | Tells her story | "I want to talk about me, not my resume." | Fills the 3 boxes (below), 5 minutes | Allows lifelog sources one by one (notes, saved links, messages, calendar) |
| 3 | Sees a way | "I don't have to throw my career away… and the dream is possible." | Compares 3 cards → [Choose this path] on the bakery | Each card: **What transfers** on top. The dream card adds a reality check: legal at home in Texas, about 11 boxes a weekend, under USD 200 to start |
| 4 | Starts | "Not a big plan. Just this week." | Confirms 3 actions | 12-week arc in 1 line + 3 actions of 30 minutes or less, one per day. Her job search is reduced to 15 minutes: the agent watches for gigs |
| 5 | A hard day | Guilt, wants to quit | [Not today] | "Today was a rest day, not a missed day." → 10-minute version → the step moves to Friday · "1/3 done · 1 moved" |
| 6 | Next weeks | "This is taking shape." | — | (Roadmap screen) the vaccine, before/after time table, week 4 sold out |

## Moment 3 in detail: the dream card's reality check

| Question | Answer |
|---|---|
| Legal at home? | Yes. The Texas cottage food law allows selling homemade bread directly to customers, with no city permit, up to USD 150K a year. She needs a food handler card and labels. Pickup or in-person delivery, no mail (verified, see Sources) |
| What does she sell? | A "Saturday box": 1 sourdough loaf + 4 pastries from her mother's recipes, USD 35 |
| Margin | About USD 12 cost, so USD 23 per box |
| First goal | USD 1,000/month = 44 boxes a month, about 11 per weekend: fits one home oven and about 10 hours |
| To replace the lost USD 2,500/month | About 27 boxes per weekend, which needs a shared kitchen (about USD 400/month for 20 hours, single-source) |
| Cost to start | Under USD 200 |
| Verdict | Yellow → green if 15 neighbors pre-order in week 3 |

Lean plan, no big investment: **Stage 1** home kitchen, pickup and her own delivery → **Stage 2** shared kitchen night slot when the home oven is full → **Stage 3** cafés (needs state registration) and farmers market. A storefront only if the data says so.

**AI does / Maya does:** AI writes the business plan, builds the pre-order website, plans the marketing (tasting day, Nextdoor, Instagram, the story of her parents' bakery), checks the rules and writes the labels, and plans shopping, baking and delivery. Maya bakes, talks to neighbors, and approves the plan each week.

## Moments 5–6 in detail

**Not today (Thursday action):**
> **Today was a rest day, not a missed day.**
> Opening your mother's notebook can be heavier than it looks. Skipping it makes sense.
> If you have 10 minutes: pick just one recipe. Nothing else.
> The rest moved to Fri. · 1/3 done · 1 moved

**Roadmap screen (weeks 2–4):**
- **Vaccine:** Instagram brings 40 likes but only 3 pre-orders. Pattern from many similar plans (aggregated, anonymized): a home bakery's first customers come from tasting. *"Bake 20 mini loaves and give them to your neighbors on Sunday, with a QR card for pre-orders."*
- **Week 4:** 18 boxes, sold out, USD 630. A café asks for her bread, so the plan adds the shared kitchen in month 2.
- **Time shift:**

| | Week 0 | Week 4 |
|---|---|---|
| Copywriting job search | About 2 h/day, anxious | About 15 min/day, the agent watches for gigs |
| Copywriting work | 2 clients | Same 2 clients, as a bridge |
| Bakery | 0 h, "someday" | About 1 h/day + Friday night baking |
| Feeling | Worried every night | "It's starting to take shape." |

## Demo data (same structure as `persona-dana.json`)

**persona**
- name: Maya · role: Freelance copywriter · years: 8 · location: Austin, Texas
- headline: "My clients use ChatGPT now."

**fields (the 3 boxes)**
- **career:** "Eight years as a freelance copywriter for DTC and SaaS brands: email flows, landing pages, launches. Clients kept me because I could turn a founder interview into a story their customers repeated. I'm good at it, but it was never my passion."
- **now:** "This year three of my five clients started drafting with ChatGPT and only send me polish jobs at a third of the rate. I spend two hours a day on Upwork and get almost no replies. I'm scared, and I can't lose more money."
- **pull:** "My parents ran a bakery for 25 years until it closed in 2019. I still have my mother's recipe notebook and I bake her bread on Sundays. I'd love a small place where neighbors meet again, but I know nothing about running a food business."

**lifelog (sources the demo already supports)**

| source | date | title | summary |
|---|---|---|---|
| note | 2026-10-09 | Rate note after a polish job | A client sent a polish-only job at a third of the usual fee |
| note | 2022-04-17 | "Bakery?" | First of 4 notes since 2022 with the same one-word idea |
| note | 2026-09-28 | "Bakery?" again | "Mom's rye + Saturday boxes for the street?" |
| saved_link | 2026-09-14 | How I run a weekend micro-bakery from home | Video about pre-orders and Saturday pickup |
| sms | 2026-10-05 | Message from her sister | "Your bread at lunch tasted exactly like Dad's." |
| messenger | 2026-10-12 | Neighbor | "Could I buy one of those loaves next week?" |
| calendar | 2026-10 | Sunday 7–10am "Bake" | Repeats every Sunday for 6 weeks |

**3 paths (cards)**

| role_id | title | one_liner | What transfers | What's missing | first_two_weeks | arc_12w |
|---|---|---|---|---|---|---|
| lean-home-bakery | Lean Home Bakery Founder | Bring your parents' bakery back, small: weekend pre-order boxes from your home kitchen, with AI running the business side. | Storytelling that sells; customer interviews; launch campaigns; pricing her own work | Food handler card; labels; recipe costing; baking at volume | Finish the food handler course and cost 3 recipes; give a tasting to 10 neighbors | From 0 to 25 Saturday boxes a weekend, with 2 copywriting clients as a bridge |
| ai-marketing-workshops | AI Marketing Workshop Lead for small businesses | Teach local owners to use AI for their own marketing, using 8 years of real copy. | Copy judgment; explaining clearly; brand voice | Curriculum in 60–90 min blocks; recruiting channel; price test | Outline one 60-minute session; message 5 local owners | 2 paid workshops a month |
| messaging-consultant | Messaging & Positioning Consultant | Sell what to say, not hours of writing. (Dana's card, as is) | Discovery calls; positioning; case studies | Session template; project pricing | Offer one client a 90-minute paid pilot | Messaging sessions bring half of her income |

**This week's 3 actions (bakery path)**

| day | minutes | title | short (10-minute version) |
|---|---|---|---|
| Tue | 20 | Do part 1 of the online food handler course | Watch only the first video |
| Thu | 25 | Pick the 3 recipes from your mother's notebook you'd sell to a stranger | Pick just one recipe |
| Sat | 30 | Bake one loaf and send a photo | Take a photo of the notebook page |

## Sources

- Texas SB 541, cottage food rules effective 2025-09-01 (USD 150K cap, no local permits, no mail order, registration for selling to stores or cafés): [Forrager](https://forrager.com/bill/texas-sb-541/), [Hotplate](https://www.blog.hotplate.com/blog/the-new-texas-cottage-food-law-sb541-everything-you-need-to-know-cc97k), [NewsChannel 10](https://www.newschannel10.com/2025/09/03/changes-texas-cottage-food-law-benefit-panhandle-vendors/). Label: verified (3 secondary sources agree; the Texas DSHS page was not checked). No E-number yet.
- Austin shared kitchen (K6: night access USD 400/month for 20 hours, listing undated): [Kitchen Door](https://www.thekitchendoor.com/kitchen-rental/baking-kitchen-hourly). Label: single-source. No E-number yet.
