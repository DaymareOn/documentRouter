import { describe, it, expect } from 'vitest';

describe('LoginPage', () => {
  it('exists as a module', async () => {
    const mod = await import('../pages/LoginPage');
    expect(mod.LoginPage).toBeDefined();
  });
});
