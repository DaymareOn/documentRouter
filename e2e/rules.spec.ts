import { test, expect, type Page } from '@playwright/test';

/**
 * Helper: inject a fake auth token into localStorage so the app
 * treats the user as authenticated, bypassing the need for a real API.
 */
async function mockAuthenticated(page: Page) {
  await page.addInitScript(() => {
    const fakeStore = {
      state: {
        token: 'fake-jwt-token',
        user: { id: '1', email: 'test@example.com', name: 'Test User', role: 'user' },
        isAuthenticated: true,
      },
      version: 0,
    };
    localStorage.setItem('auth-storage', JSON.stringify(fakeStore));
  });
}

/**
 * Helper: stub the rules API endpoint.
 */
async function mockRulesApi(page: Page, items: object[] = []) {
  await page.route('**/api/rules**', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        data: { items, totalItems: items.length, totalPages: 1, page: 1, pageSize: 20 },
      }),
    })
  );
}

const fakeRules = [
  {
    id: 'rule-1',
    name: 'Invoice Router',
    description: 'Routes invoices to accounting',
    logic: 'AND',
    priority: 1,
    isActive: true,
    conditions: [
      { id: 'cond-1', field: 'filename', operator: 'contains', value: 'invoice' },
    ],
    actions: [
      { id: 'act-1', type: 'email', config: { to: 'accounting@example.com' } },
    ],
    tenantId: 'tenant-1',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'rule-2',
    name: 'Contract Archive',
    description: 'Archives all contracts',
    logic: 'OR',
    priority: 2,
    isActive: false,
    conditions: [
      { id: 'cond-2', field: 'filename', operator: 'contains', value: 'contract' },
    ],
    actions: [
      { id: 'act-2', type: 'archive', config: {} },
    ],
    tenantId: 'tenant-1',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

test.describe('Rules Page — unauthenticated', () => {
  test('redirects to /login when not authenticated', async ({ page }) => {
    await page.goto('/rules');
    await expect(page).toHaveURL(/\/login/);
  });
});

test.describe('Rules Page — empty state', () => {
  test.beforeEach(async ({ page }) => {
    await mockAuthenticated(page);
    await mockRulesApi(page, []);
    await page.goto('/rules');
  });

  test('renders the Rules page heading', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /rules/i })).toBeVisible();
  });

  test('shows the Create Rule button', async ({ page }) => {
    await expect(page.getByRole('button', { name: /create rule/i })).toBeVisible();
  });

  test('shows the empty state message when no rules exist', async ({ page }) => {
    await expect(page.getByText(/no rules found/i)).toBeVisible();
  });
});

test.describe('Rules Page — with rules', () => {
  test.beforeEach(async ({ page }) => {
    await mockAuthenticated(page);
    await mockRulesApi(page, fakeRules);
    await page.goto('/rules');
  });

  test('renders a card for each rule', async ({ page }) => {
    await expect(page.getByText('Invoice Router')).toBeVisible();
    await expect(page.getByText('Contract Archive')).toBeVisible();
  });

  test('displays rule descriptions', async ({ page }) => {
    await expect(page.getByText('Routes invoices to accounting')).toBeVisible();
  });
});

test.describe('Rules Page — Create Rule modal', () => {
  test.beforeEach(async ({ page }) => {
    await mockAuthenticated(page);
    await mockRulesApi(page, []);
    await page.goto('/rules');
  });

  test('opens the Create Rule modal when the button is clicked', async ({ page }) => {
    await page.getByRole('button', { name: /create rule/i }).click();
    await expect(page.getByRole('dialog', { name: /create rule/i })).toBeVisible();
  });

  test('modal contains Rule Name input', async ({ page }) => {
    await page.getByRole('button', { name: /create rule/i }).click();
    await expect(page.getByLabel(/rule name/i)).toBeVisible();
  });

  test('modal contains Description input', async ({ page }) => {
    await page.getByRole('button', { name: /create rule/i }).click();
    await expect(page.getByLabel(/description/i)).toBeVisible();
  });

  test('modal contains logic selector', async ({ page }) => {
    await page.getByRole('button', { name: /create rule/i }).click();
    await expect(page.getByLabel(/logic/i)).toBeVisible();
  });

  test('modal contains Add Condition and Add Action buttons', async ({ page }) => {
    await page.getByRole('button', { name: /create rule/i }).click();
    await expect(page.getByRole('button', { name: /add condition/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /add action/i })).toBeVisible();
  });

  test('can add a condition row', async ({ page }) => {
    await page.getByRole('button', { name: /create rule/i }).click();
    await page.getByRole('button', { name: /add condition/i }).click();
    // A select for the condition field should now appear
    const conditionSelects = page.locator('select');
    await expect(conditionSelects.first()).toBeVisible();
  });

  test('can add an action row', async ({ page }) => {
    await page.getByRole('button', { name: /create rule/i }).click();
    await page.getByRole('button', { name: /add action/i }).click();
    const actionSelects = page.locator('select');
    await expect(actionSelects.first()).toBeVisible();
  });

  test('shows error toast when saving an empty rule name', async ({ page }) => {
    await page.getByRole('button', { name: /create rule/i }).click();
    // Click Save without filling in the rule name
    await page.getByRole('button', { name: /^save$/i }).click();
    await expect(page.getByText(/this field is required/i)).toBeVisible({ timeout: 5_000 });
  });

  test('closes the modal when Cancel is clicked', async ({ page }) => {
    await page.getByRole('button', { name: /create rule/i }).click();
    await expect(page.getByRole('dialog', { name: /create rule/i })).toBeVisible();
    await page.getByRole('button', { name: /cancel/i }).click();
    await expect(page.getByRole('dialog')).not.toBeVisible();
  });

  test('successfully saves a new rule and closes the modal', async ({ page }) => {
    await page.route('**/api/rules', (route) => {
      if (route.request().method() === 'POST') {
        return route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify({ data: { id: 'rule-new', name: 'My Test Rule' } }),
        });
      }
      return route.continue();
    });
    // Re-stub GET to return the newly created rule after save
    let callCount = 0;
    await page.route('**/api/rules**', (route) => {
      callCount++;
      const items = callCount > 1 ? [{ ...fakeRules[0], id: 'rule-new', name: 'My Test Rule' }] : [];
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: { items, totalItems: items.length, totalPages: 1 } }),
      });
    });

    await page.getByRole('button', { name: /create rule/i }).click();
    await page.fill('[id*="rule-name" i], [id*="rulename" i], input[aria-label*="Rule Name" i], label:has-text("Rule Name") + * input, input[placeholder*="Rule Name" i]', 'My Test Rule').catch(() => null);
    // Target by label association
    await page.getByLabel(/rule name/i).fill('My Test Rule');
    await page.getByRole('button', { name: /^save$/i }).click();
    await expect(page.getByRole('dialog')).not.toBeVisible({ timeout: 10_000 });
  });
});

test.describe('Rules Page — navigation', () => {
  test.beforeEach(async ({ page }) => {
    await mockAuthenticated(page);
    await mockRulesApi(page, fakeRules);
    await page.goto('/rules');
  });

  test('can navigate from rules page to documents via nav', async ({ page }) => {
    const docsLink = page.getByRole('link', { name: /documents/i });
    if (await docsLink.isVisible()) {
      await page.route('**/api/documents**', (route) =>
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ data: { items: [], totalItems: 0, totalPages: 1 } }),
        })
      );
      await docsLink.click();
      await expect(page).toHaveURL(/\/documents/);
    } else {
      test.skip();
    }
  });
});
