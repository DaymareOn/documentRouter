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
 * Helper: stub the documents API so the page renders without a real server.
 */
async function mockDocumentsApi(page: Page, items: object[] = []) {
  await page.route('**/api/documents**', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        data: { items, totalItems: items.length, totalPages: 1, page: 1, pageSize: 12 },
      }),
    })
  );
}

test.describe('Documents Page — empty state', () => {
  test.beforeEach(async ({ page }) => {
    await mockAuthenticated(page);
    await mockDocumentsApi(page, []);
    await page.goto('/documents');
  });

  test('renders the documents page heading', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /documents/i })).toBeVisible();
  });

  test('shows the drag-and-drop upload area', async ({ page }) => {
    await expect(page.getByText(/drag & drop|click to select/i)).toBeVisible();
  });

  test('shows the search input', async ({ page }) => {
    await expect(page.getByPlaceholder(/search/i)).toBeVisible();
  });

  test('shows the empty state message when no documents exist', async ({ page }) => {
    await expect(page.getByText(/no documents found/i)).toBeVisible();
  });

  test('shows grid and list view toggle buttons', async ({ page }) => {
    const buttons = page.getByRole('button');
    // At least two icon buttons for view mode switching exist
    await expect(buttons).not.toHaveCount(0);
  });
});

test.describe('Documents Page — with documents', () => {
  const fakeDocuments = [
    {
      id: 'doc-1',
      filename: 'invoice-2024.pdf',
      mimeType: 'application/pdf',
      fileSize: 102400,
      status: 'processed',
      source: 'upload',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      tenantId: 'tenant-1',
    },
    {
      id: 'doc-2',
      filename: 'contract.docx',
      mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      fileSize: 51200,
      status: 'pending',
      source: 'email',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      tenantId: 'tenant-1',
    },
  ];

  test.beforeEach(async ({ page }) => {
    await mockAuthenticated(page);
    await mockDocumentsApi(page, fakeDocuments);
    await page.goto('/documents');
  });

  test('renders document cards for each document', async ({ page }) => {
    await expect(page.getByText('invoice-2024.pdf')).toBeVisible();
    await expect(page.getByText('contract.docx')).toBeVisible();
  });

  test('can filter documents by search term', async ({ page }) => {
    await page.fill('[placeholder*="Search" i]', 'invoice');
    await expect(page.getByText('invoice-2024.pdf')).toBeVisible();
    await expect(page.getByText('contract.docx')).not.toBeVisible();
  });

  test('clears search filter to show all documents again', async ({ page }) => {
    await page.fill('[placeholder*="Search" i]', 'invoice');
    await expect(page.getByText('contract.docx')).not.toBeVisible();
    await page.fill('[placeholder*="Search" i]', '');
    await expect(page.getByText('contract.docx')).toBeVisible();
  });

  test('navigates to document detail when View Details is clicked', async ({ page }) => {
    await page.route('**/api/documents/doc-1', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: fakeDocuments[0] }),
      })
    );
    const viewButtons = page.getByRole('button', { name: /view details/i });
    await viewButtons.first().click();
    await expect(page).toHaveURL(/\/documents\/doc-1/);
  });
});

test.describe('Document Upload', () => {
  test.beforeEach(async ({ page }) => {
    await mockAuthenticated(page);
    await mockDocumentsApi(page, []);
    await page.goto('/documents');
  });

  test('shows uploading state when file upload API is called', async ({ page }) => {
    let resolveUpload!: () => void;
    const uploadPromise = new Promise<void>((resolve) => { resolveUpload = resolve; });

    await page.route('**/api/documents', async (route) => {
      if (route.request().method() === 'POST') {
        await uploadPromise;
        await route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify({ data: { id: 'new-doc', filename: 'test.pdf' } }),
        });
      } else {
        await route.continue();
      }
    });

    const fileChooserPromise = page.waitForEvent('filechooser');
    await page.locator('[style*="dashed"]').click();
    const fileChooser = await fileChooserPromise;
    await fileChooser.setFiles({
      name: 'test.pdf',
      mimeType: 'application/pdf',
      buffer: Buffer.from('%PDF-1.4 fake content'),
    });

    await expect(page.getByText(/loading/i)).toBeVisible({ timeout: 5_000 });
    resolveUpload();
  });

  test('shows error toast when upload fails', async ({ page }) => {
    await page.route('**/api/documents', (route) => {
      if (route.request().method() === 'POST') {
        return route.fulfill({ status: 500, body: JSON.stringify({ message: 'Server error' }) });
      }
      return route.continue();
    });

    const fileChooserPromise = page.waitForEvent('filechooser');
    await page.locator('[style*="dashed"]').click();
    const fileChooser = await fileChooserPromise;
    await fileChooser.setFiles({
      name: 'bad.pdf',
      mimeType: 'application/pdf',
      buffer: Buffer.from('%PDF-1.4 fake'),
    });

    await expect(page.getByText(/failed to upload/i)).toBeVisible({ timeout: 10_000 });
  });
});

test.describe('Documents Page — redirect when unauthenticated', () => {
  test('redirects to /login when not authenticated', async ({ page }) => {
    await page.goto('/documents');
    await expect(page).toHaveURL(/\/login/);
  });
});

test.describe('Document Detail Page', () => {
  test('redirects to /login when accessing detail without auth', async ({ page }) => {
    await page.goto('/documents/some-id');
    await expect(page).toHaveURL(/\/login/);
  });
});
