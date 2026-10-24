// config.js — the only file to edit when switching the data source.
// SHEET_API_URL empty  -> fixture mode: rows come from data/fixture.json (synthetic).
// SHEET_API_URL filled -> sheet mode: rows come from the Apps Script Web App (see sheet/README.md).
// The Web App URL is a public endpoint: synthetic data only, never a secret or a real person's data.
export const SHEET_API_URL = "";

// Resolved against the page URL (index.html lives next to data/).
export const FIXTURE_URL = "data/fixture.json";

// How long to wait for the sheet before falling back to the fixture (Apps Script cold start ~1s+).
export const SHEET_TIMEOUT_MS = 6000;
