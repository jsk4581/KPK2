// smoke-input.js — the ONE place the SMOKE step-2 input lives (event day: change it here only).
// Added in the 2026-10-21 dry-run fix pass ([SIMULATION] findings); holds no simulated results.
// Imported by logic.test.mjs, scaffold-core.test.mjs, fallback.test.mjs (node) and tests/index.html
// (browser runner). app/SMOKE.md step 2 must contain SMOKE_INPUT verbatim (a structure test checks it).
// Multi-field input: keep one string and separate the fields with ' / ' in SMOKE.md and here; split
// it in app.js the same way (templates/SMOKE.md 「입력이 여러 칸이면」).

// Second Draft (PRD v2): the first sentence of fields.career in app/data/persona-dana.json [SIMULATION].
// SMOKE step 2 types it into the career box after Start (the PRD sentence 6 input-box path).
export const SMOKE_INPUT = 'Seven years as a freelance copywriter for DTC and SaaS brands: email flows, landing pages, product launches.';

// Extra inputs the fallback parity test replays through BOTH the live app and fallback.html.
// When the core action changes, put inputs here that reach the new core scene (not only error paths).
export const PARITY_INPUTS = ['', SMOKE_INPUT, 'pitch deck', 'agent', 'synthetic', 'viewport layout', '  wireframe  '];
