import { describe, expect, it } from 'vitest';
import { brainUrl, brainUrls } from '../api/brain';

// Unit tests must never reach the live brain server, even when a developer copied
// .env.example to .env.local. Tests that need a brain URL stub one (vi.stubEnv).
describe('test environment', () => {
  it('has no brain URL unless a test stubs one', () => {
    expect(import.meta.env.VITE_BRAIN_URL ?? '').toBe('');
    expect(import.meta.env.VITE_BRAIN_URL_BACKUP ?? '').toBe('');
    expect(brainUrl()).toBeNull();
    expect(brainUrls()).toEqual([]);
  });
});
