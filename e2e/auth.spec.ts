import { test, expect } from '@playwright/test';

/**
 * Auth E2E tests
 *
 * Input IDs are derived by the Input component from the label text:
 *   label.toLowerCase().replace(/\s+/g, '-')
 *
 * English labels used by the app (from en.json):
 *   "Email"            → #email
 *   "Password"         → #password
 *   "Full Name"        → #full-name
 *   "Confirm Password" → #confirm-password
 *   "Enter your 6-digit code" → #enter-your-6-digit-code
 */

test.describe('Login Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
  });

  test('renders the login form with all required elements', async ({ page }) => {
    await expect(page).toHaveTitle(/DocRouter|Vite/i);
    await expect(page.locator('h1')).toContainText('DocRouter');
    await expect(page.locator('#email')).toBeVisible();
    await expect(page.locator('#password')).toBeVisible();
    await expect(page.getByRole('button', { name: /sign in/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /sign up/i })).toBeVisible();
  });

  test('shows validation errors for empty form submission', async ({ page }) => {
    await page.getByRole('button', { name: /sign in/i }).click();
    await expect(page.getByRole('alert').first()).toBeVisible();
    await expect(page.getByText(/this field is required/i).first()).toBeVisible();
  });

  test('shows validation error for invalid email format', async ({ page }) => {
    await page.fill('#email', 'not-an-email');
    await page.fill('#password', 'somepassword');
    await page.getByRole('button', { name: /sign in/i }).click();
    await expect(page.getByText(/valid email/i)).toBeVisible();
  });

  test('shows validation error for missing password', async ({ page }) => {
    await page.fill('#email', 'user@example.com');
    await page.getByRole('button', { name: /sign in/i }).click();
    await expect(page.getByText(/this field is required/i)).toBeVisible();
  });

  test('navigates to register page via sign up link', async ({ page }) => {
    await page.getByRole('link', { name: /sign up/i }).click();
    await expect(page).toHaveURL(/\/register/);
  });

  test('shows network error toast on failed login attempt', async ({ page }) => {
    await page.fill('#email', 'user@example.com');
    await page.fill('#password', 'wrongpassword123');
    await page.getByRole('button', { name: /sign in/i }).click();
    // Expect either a toast error or a TOTP prompt (both are valid server responses)
    await expect(
      page.getByText(/network error|two-factor/i).first()
    ).toBeVisible({ timeout: 15_000 });
  });

  test('shows TOTP input when server responds with 403', async ({ page }) => {
    // Mock the API to return a 403 to trigger the TOTP flow
    await page.route('**/api/auth/login', (route) =>
      route.fulfill({ status: 403, body: JSON.stringify({ message: 'TOTP required' }) })
    );
    await page.fill('#email', 'user@example.com');
    await page.fill('#password', 'Password123!');
    await page.getByRole('button', { name: /sign in/i }).click();
    await expect(page.locator('#enter-your-6-digit-code')).toBeVisible({ timeout: 5_000 });
  });

  test('redirects unauthenticated user from protected route to login', async ({ page }) => {
    await page.goto('/documents');
    await expect(page).toHaveURL(/\/login/);
  });
});

test.describe('Register Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/register');
  });

  test('renders the registration form with all required fields', async ({ page }) => {
    await expect(page.locator('h1')).toContainText('DocRouter');
    await expect(page.locator('#full-name')).toBeVisible();
    await expect(page.locator('#email')).toBeVisible();
    await expect(page.locator('#password')).toBeVisible();
    await expect(page.locator('#confirm-password')).toBeVisible();
    await expect(page.getByRole('button', { name: /sign up/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /sign in/i })).toBeVisible();
  });

  test('shows validation errors for empty form submission', async ({ page }) => {
    await page.getByRole('button', { name: /sign up/i }).click();
    await expect(page.getByText(/this field is required/i).first()).toBeVisible();
  });

  test('shows error for invalid email on registration', async ({ page }) => {
    await page.fill('#full-name', 'Test User');
    await page.fill('#email', 'bad-email');
    await page.fill('#password', 'Password123!');
    await page.fill('#confirm-password', 'Password123!');
    await page.getByRole('button', { name: /sign up/i }).click();
    await expect(page.getByText(/valid email/i)).toBeVisible();
  });

  test('shows error when password is too short', async ({ page }) => {
    await page.fill('#full-name', 'Test User');
    await page.fill('#email', 'user@example.com');
    await page.fill('#password', 'short');
    await page.fill('#confirm-password', 'short');
    await page.getByRole('button', { name: /sign up/i }).click();
    await expect(page.getByText(/at least 8 characters/i)).toBeVisible();
  });

  test('shows error when passwords do not match', async ({ page }) => {
    await page.fill('#full-name', 'Test User');
    await page.fill('#email', 'user@example.com');
    await page.fill('#password', 'Password123!');
    await page.fill('#confirm-password', 'DifferentPassword!');
    await page.getByRole('button', { name: /sign up/i }).click();
    await expect(page.getByText(/do not match/i)).toBeVisible();
  });

  test('shows password strength indicator when typing', async ({ page }) => {
    await page.fill('#password', 'weak');
    await expect(page.getByText(/weak/i)).toBeVisible();

    await page.fill('#password', 'StrongPass1!');
    await expect(page.getByText(/strong|good/i)).toBeVisible();
  });

  test('navigates back to login via sign in link', async ({ page }) => {
    await page.getByRole('link', { name: /sign in/i }).click();
    await expect(page).toHaveURL(/\/login/);
  });

  test('shows network error toast on failed registration', async ({ page }) => {
    await page.route('**/api/auth/register', (route) =>
      route.fulfill({ status: 500, body: JSON.stringify({ message: 'Server error' }) })
    );
    await page.fill('#full-name', 'Test User');
    await page.fill('#email', 'user@example.com');
    await page.fill('#password', 'Password123!');
    await page.fill('#confirm-password', 'Password123!');
    await page.getByRole('button', { name: /sign up/i }).click();
    await expect(page.getByText(/network error/i)).toBeVisible({ timeout: 10_000 });
  });
});

test.describe('Auth Flow', () => {
  test('root path redirects to login when not authenticated', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveURL(/\/login/);
  });

  test('login page is accessible from root redirect', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('#email')).toBeVisible();
    await expect(page.locator('#password')).toBeVisible();
  });
});
