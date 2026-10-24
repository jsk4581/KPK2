import { expect, test, type Page } from '@playwright/test';
import { fileURLToPath } from 'node:url';

// Full demo flow against the dev server and the real /api/paths handler with a
// Claude double: sample persona -> lifelog card -> paths -> choose -> Done (share
// card) -> Not today (rest-day reply, moved) -> Done (comeback) -> Progress, Why?
// -> Reset. Runs once per project: LLM double or no-key fallback, laptop or phone width.

const SCREENS_DIR = fileURLToPath(new URL('./screens/', import.meta.url));
const SOURCE_LABEL = { llm: 'AI-drafted', fallback: 'Sample result' } as const;
const SIMULATION = '[SIMULATION] Sample persona: synthetic';
const REST_LINE = 'Today was a rest day, not a missed day.';
const COMEBACK_LINE = 'Welcome back. Showing up again is the hard part.';

type Source = keyof typeof SOURCE_LABEL;

// Any visible element whose text, background or border color is in the red family.
async function redColoredElements(page: Page): Promise<string[]> {
  return page.evaluate(() => {
    const parse = (value: string) => {
      const m = value.match(/rgba?\(([\d.]+),\s*([\d.]+),\s*([\d.]+)(?:,\s*([\d.]+))?\)/);
      if (!m) return null;
      return { r: +m[1], g: +m[2], b: +m[3], a: m[4] === undefined ? 1 : +m[4] };
    };
    const isRed = (value: string) => {
      const c = parse(value);
      if (!c || c.a === 0) return false;
      return c.r >= 150 && c.r - c.g >= 70 && c.r - c.b >= 70;
    };
    const hits: string[] = [];
    for (const el of Array.from(document.querySelectorAll<HTMLElement>('body *'))) {
      if (el.offsetParent === null && getComputedStyle(el).position !== 'fixed') continue;
      const s = getComputedStyle(el);
      for (const prop of ['color', 'backgroundColor', 'borderTopColor', 'borderLeftColor'] as const) {
        if (prop.startsWith('border') && parseFloat(s.borderTopWidth) === 0 && parseFloat(s.borderLeftWidth) === 0) continue;
        if (isRed(s[prop])) hits.push(`${el.tagName.toLowerCase()}.${el.className} ${prop}=${s[prop]}`);
      }
    }
    return hits;
  });
}

// Failure framing is not allowed on screen; "not a missed day" is the one allowed phrase.
async function failureWords(page: Page): Promise<string[]> {
  const text = (await page.locator('body').innerText()).replace(/not a missed day/gi, '');
  return text.match(/\b(fail|fails|failed|failing|failure|missed)\b/gi) ?? [];
}

test('sample persona runs end to end and resets', async ({ page }, testInfo) => {
  const source = testInfo.project.metadata.source as Source;
  const width = testInfo.project.metadata.width as string;

  await page.goto('/app.html');

  // Landing
  await expect(page.getByText('My clients use ChatGPT now.')).toBeVisible();
  await expect(page.getByText('Nothing you type is stored.')).toBeVisible();
  await expect(page.getByText(SIMULATION)).toBeVisible();
  await page.getByRole('button', { name: 'Load sample persona' }).click();

  // Lifelog card: privacy defaults and prefilled story
  await expect(page.getByRole('heading', { name: 'Connected data' })).toBeVisible();
  await expect(page.getByText(SIMULATION).first()).toBeVisible();
  await expect(page.getByRole('switch', { name: /Notes/ })).toBeChecked();
  await expect(page.getByRole('switch', { name: /Saved links/ })).toBeChecked();
  await expect(page.getByRole('switch', { name: /Calendar/ })).toBeChecked();
  await expect(page.getByRole('switch', { name: /Text messages/ })).not.toBeChecked();
  await expect(page.getByRole('switch', { name: /Messenger/ })).not.toBeChecked();
  const story = page.locator('.prefill textarea');
  await expect(story).toHaveCount(3);
  for (let i = 0; i < 3; i += 1) await expect(story.nth(i)).not.toHaveValue('');
  await expect(page.getByRole('list', { name: 'Your activity' }).getByRole('listitem').first()).toBeVisible();
  await page.getByRole('button', { name: 'Continue' }).click();

  // Inputs -> Paths through the real handler
  await expect(page.getByRole('heading', { name: 'Tell your story' })).toBeVisible();
  const answer = page.waitForResponse((r) => r.url().endsWith('/api/paths') && r.request().method() === 'POST');
  await page.getByRole('button', { name: 'Show my paths' }).click();
  const response = await answer;
  expect(response.status()).toBe(200);
  expect(response.headers()['x-e2e-paths-mode']).toBe(source);
  const body = (await response.json()) as { source: string; paths: { role_id: string; one_liner: string }[] };
  expect(body.source).toBe(source);
  expect(body.paths).toHaveLength(3);

  await expect(page.getByRole('heading', { name: 'Your paths' })).toBeVisible();
  const cards = page.locator('article.p0-path');
  await expect(cards).toHaveCount(3);
  for (let i = 0; i < 3; i += 1) {
    await expect(cards.nth(i).getByText("What you'd need to build")).toBeVisible();
    await expect(cards.nth(i).getByText('What carries over')).toBeVisible();
    await expect(cards.nth(i).getByText("How you'd start")).toBeVisible();
    await expect(cards.nth(i).getByText(/\d+% skill match/)).toBeVisible();
  }
  await expect(cards.first().getByText(body.paths[0].one_liner)).toBeVisible();
  if (source === 'llm') await expect(cards.first().getByText(/^E2E draft:/)).toBeVisible();
  await expect(page.locator('.p0-source')).toHaveText(SOURCE_LABEL[source]);
  await expect(page.locator('.p0-source')).toHaveAttribute('data-source', source);
  const chosenTitle = (await cards.first().getByRole('heading', { level: 3 }).innerText()).trim();
  await cards.first().getByRole('button', { name: 'Choose this path' }).click();

  // This week: three actions, progress starts at 0 of 3 done
  await expect(page.getByRole('heading', { name: 'This week' })).toBeVisible();
  await expect(page.locator('.week-path')).toHaveText(chosenTitle);
  await expect(page.getByText('0 of 3 done')).toBeVisible();
  const a1 = page.getByTestId('action-a1');
  const a2 = page.getByTestId('action-a2');
  await expect(page.locator('.week-actions > li')).toHaveCount(3);
  await expect(page.locator('.week-summary')).toHaveText('0/3 done');

  // First Done: share card
  await a1.getByRole('button', { name: 'Done' }).click();
  const shareCard = page.getByRole('region', { name: 'Share card' });
  await expect(shareCard).toBeVisible();
  await expect(shareCard.getByText('1/3 done')).toBeVisible();
  await expect(shareCard.getByRole('button', { name: 'Copy' })).toBeVisible();
  await expect(a1.getByRole('button')).toHaveCount(0);
  await expect(page.getByText('1 of 3 done')).toBeVisible();

  // Not today on a Thursday action (demo today is Thu): rest-day reply, moved to Fri
  const a2Day = (await a2.locator('.week-action-meta span').first().innerText()).trim();
  await a2.getByRole('button', { name: 'Not today' }).click();
  const reply = page.locator('.week-reply');
  await expect(reply.locator('li').first()).toHaveText(REST_LINE);
  await expect(reply.locator('li')).toHaveCount(4);
  const movedLine = (await reply.locator('.week-reply-moved').innerText()).trim();
  expect(movedLine).toMatch(/^Moved to (Mon|Tue|Wed|Thu|Fri|Sat|Sun|next week)$/);
  if (a2Day === 'Thu') expect(movedLine).toBe('Moved to Fri');
  await expect(a2.locator('.week-action-meta')).toContainText(movedLine === 'Moved to next week' ? 'Next week' : movedLine);
  await expect(page.locator('.week-summary')).toHaveText('1/3 done · 1 moved');
  await expect(shareCard).toHaveCount(0);

  // Done after Not today: comeback line, no second share card
  await a2.getByRole('button', { name: 'Done' }).click();
  await expect(reply.getByText(COMEBACK_LINE)).toBeVisible();
  await expect(page.getByRole('region', { name: 'Share card' })).toHaveCount(0);
  await expect(page.locator('.week-summary')).toHaveText('2/3 done');
  await expect(page.getByText('2 of 3 done')).toBeVisible();

  expect(await redColoredElements(page)).toEqual([]);
  expect(await failureWords(page)).toEqual([]);
  if (source === 'llm') {
    await page.screenshot({ path: `${SCREENS_DIR}${width}.png`, fullPage: width === 'laptop' });
  }

  // Progress and Why?: the steps shown are the steps that ran, in order
  await page.getByRole('button', { name: 'See progress' }).click();
  await expect(page.getByRole('heading', { name: 'Progress' })).toBeVisible();
  await expect(page.getByTestId('signal-momentum')).toBeVisible();
  await expect(page.getByTestId('signal-risk')).toContainText(/Low|Medium|High/);
  await expect(page.getByTestId('signal-days')).toContainText('Not a streak.');
  await expect(page.getByTestId('evidence-list').getByText('Not today (moved, kept)')).toBeVisible();
  await page.getByRole('button', { name: 'Why?' }).click();
  const why = page.getByTestId('why-panel');
  await expect(why).toBeVisible();
  await expect(why.getByTestId('step-fn')).toHaveText([
    'summarizeLifelog',
    'extractSkills',
    'rankRoles',
    'POST /api/paths',
    'buildWeek',
    'applyCheckin',
    'applyCheckin',
    'applyCheckin',
    'progressSignals',
  ]);
  const llmStep = why.locator('.progress-step').nth(3);
  await expect(llmStep).toContainText(SOURCE_LABEL[source]);
  await expect(llmStep).toContainText(`source ${source}`);
  expect(await redColoredElements(page)).toEqual([]);
  expect(await failureWords(page)).toEqual([]);

  // Reset: back to Landing with nothing kept
  await page.getByRole('button', { name: 'Reset' }).click();
  await expect(page.getByRole('button', { name: 'Load sample persona' })).toBeVisible();
  await page.getByRole('button', { name: 'Start' }).click();
  const empty = page.locator('textarea');
  await expect(empty).toHaveCount(3);
  for (let i = 0; i < 3; i += 1) await expect(empty.nth(i)).toHaveValue('');
});

test('browser falls back to the labelled sample when the function is unreachable', async ({ page }, testInfo) => {
  test.skip(testInfo.project.metadata.source !== 'fallback', 'browser-side fallback runs once per width');
  await page.route('**/api/paths', (route) => route.abort('connectionrefused'));

  await page.goto('/app.html');
  await page.getByRole('button', { name: 'Load sample persona' }).click();
  await page.getByRole('button', { name: 'Continue' }).click();
  await page.getByRole('button', { name: 'Show my paths' }).click();

  await expect(page.locator('article.p0-path')).toHaveCount(3);
  await expect(page.locator('.p0-source')).toHaveText(SOURCE_LABEL.fallback);
  await page.locator('article.p0-path').first().getByRole('button', { name: 'Choose this path' }).click();
  await expect(page.locator('.week-actions > li')).toHaveCount(3);
  await page.getByRole('button', { name: 'See progress' }).click();
  await page.getByRole('button', { name: 'Why?' }).click();
  await expect(page.getByTestId('why-panel').locator('.progress-step').nth(3)).toContainText(
    'server unreachable, browser used the sample output',
  );
});

test('landing page is the phone kit with the app inside its phone', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveTitle('Dream Achieve Moments');
  await expect(page.locator('nav .brand')).toHaveText('Dream Achieve Moments');
  await expect(page.locator('#why')).toBeAttached();
  // The See the demo card holds the promo video: poster first, nothing downloads until it scrolls into view.
  const reelVideo = page.locator('#reel video');
  await expect(reelVideo).toHaveAttribute('poster', '/media/promo-poster.jpg');
  await expect(reelVideo).toHaveAttribute('preload', 'none');
  await expect(reelVideo).not.toHaveAttribute('autoplay', /.*/);
  await expect(reelVideo.locator('source')).toHaveAttribute('src', '/media/promo.mp4');
  const play = page.getByRole('button', { name: 'Play the 40-second Dream Achieve Moments video' });
  await expect(play).toHaveText('See the demo');

  // Scrolled into view, a muted preview plays without controls; pressing the button plays it in place
  // with sound and controls; Escape pauses and brings the button back.
  await page.locator('#reel').scrollIntoViewIfNeeded();
  await expect(page.locator('#reel')).toHaveClass(/is-preview/);
  await expect.poll(() => reelVideo.evaluate((v: HTMLVideoElement) => !v.paused && v.muted && !v.controls), { timeout: 15_000 }).toBe(true);
  await play.click();
  await expect(play).toBeHidden();
  await expect.poll(() => reelVideo.evaluate((v: HTMLVideoElement) => v.currentTime), { timeout: 15_000 }).toBeGreaterThan(0.3);
  await expect(reelVideo).toHaveJSProperty('controls', true);
  await page.keyboard.press('Escape');
  await expect(play).toBeFocused();
  await expect(reelVideo).toHaveJSProperty('paused', true);

  const iframe = page.locator('#demo .phone__screen iframe.phone__iframe');
  await expect(iframe).toHaveAttribute('src', '/app.html');
  await iframe.scrollIntoViewIfNeeded();

  // The app inside renders full-bleed: no outer frame label, Reset and the notice visible.
  const app = page.frameLocator('#demo iframe.phone__iframe');
  await expect(app.getByText('Nothing you type is stored.')).toBeVisible();
  await expect(app.getByRole('button', { name: 'Reset' })).toBeVisible();
  await expect(app.locator('.stage-frame')).toBeHidden();
});
