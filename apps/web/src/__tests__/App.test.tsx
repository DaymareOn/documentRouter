import { describe, it, expect } from 'vitest';

describe('App', () => {
  it('exists as a module', async () => {
    const mod = await import('../App');
    expect(mod.default).toBeDefined();
  });
});
