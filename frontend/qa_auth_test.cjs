const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const BASE = 'http://localhost:5173';
const SHOT_DIR = path.join(__dirname, '..', 'qa_storefront_screenshots');
fs.mkdirSync(SHOT_DIR, { recursive: true });

const TS = Date.now();
const TEST_EMAIL = `qa.customer.${TS}@example.com`;
const TEST_PASS = 'Test@1234';
const TEST_NAME = 'QA Customer';
const TEST_PHONE = '9876543210';

const results = [];
const log = (label, ok, detail) => {
  results.push({ label, ok, detail });
  console.log(`${ok ? 'PASS' : 'FAIL'} | ${label}${detail ? ' | ' + detail : ''}`);
};

const consoleErrors = [];

(async () => {
  const browser = await chromium.launch();
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await context.newPage();
  page.setDefaultNavigationTimeout(60000);
  page.on('console', msg => {
    if (msg.type() === 'error') consoleErrors.push(`[desktop] ${page.url()} :: ${msg.text()}`);
  });
  page.on('pageerror', err => consoleErrors.push(`[desktop pageerror] ${page.url()} :: ${err.message}`));

  // ── 1. Register page — password too short (client validation) ─────────────
  await page.goto(`${BASE}/register`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(500);
  await page.fill('input[type="text"]', TEST_NAME);
  await page.fill('input[type="email"]', TEST_EMAIL);
  await page.fill('input[type="tel"]', TEST_PHONE);
  await page.fill('input[type="password"]', '123');
  await page.click('button[type="submit"]');
  await page.waitForTimeout(600);
  let toastText = await page.locator('[role=status], .go2072408551, [class*="toast"]').allTextContents().catch(() => []);
  let bodyText = await page.textContent('body');
  log('Register: short password rejected client-side', bodyText.includes('Password must be at least 6 characters'),
    bodyText.includes('Password must be at least 6 characters') ? 'toast shown' : 'toast NOT found');
  await page.screenshot({ path: path.join(SHOT_DIR, '01-register-short-pw.png') });

  // ── 2. Register successfully ───────────────────────────────────────────────
  await page.fill('input[type="password"]', TEST_PASS);
  await page.click('button[type="submit"]');
  await page.waitForTimeout(1200);
  bodyText = await page.textContent('body');
  const url1 = page.url();
  log('Register: success toast shown', bodyText.includes(`Welcome to Arebianveda, ${TEST_NAME}`), bodyText.slice(0,0));
  log('Register: redirected to home', url1 === `${BASE}/`, `url=${url1}`);
  const authState1 = await page.evaluate(() => localStorage.getItem('av-auth'));
  const parsed1 = authState1 ? JSON.parse(authState1) : null;
  log('Register: token + user stored in localStorage (av-auth)', !!(parsed1?.state?.token && parsed1?.state?.user), JSON.stringify(parsed1?.state?.user || {}));
  await page.screenshot({ path: path.join(SHOT_DIR, '02-register-success-home.png') });

  // ── 3. Profile page shows correct user info ────────────────────────────────
  await page.goto(`${BASE}/profile`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(600);
  bodyText = await page.textContent('body');
  log('Profile: shows registered name', bodyText.includes(TEST_NAME));
  log('Profile: shows registered email', bodyText.includes(TEST_EMAIL));
  await page.screenshot({ path: path.join(SHOT_DIR, '03-profile-page.png') });

  // ── 4. Logout ────────────────────────────────────────────────────────────────
  await page.click('button:has-text("Logout")');
  await page.waitForTimeout(800);
  bodyText = await page.textContent('body');
  const urlAfterLogout = page.url();
  log('Logout: success toast shown', bodyText.includes('Logged out successfully'));
  log('Logout: redirected to home', urlAfterLogout === `${BASE}/`, `url=${urlAfterLogout}`);
  const authState2 = await page.evaluate(() => localStorage.getItem('av-auth'));
  const parsed2 = authState2 ? JSON.parse(authState2) : null;
  log('Logout: localStorage cleared (user=null, token=null)', parsed2?.state?.user === null && parsed2?.state?.token === null);
  await page.screenshot({ path: path.join(SHOT_DIR, '04-after-logout.png') });

  // ── 5. Invalid login (wrong password) ──────────────────────────────────────
  await page.goto(`${BASE}/login`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(500);
  await page.fill('input[type="email"]', TEST_EMAIL);
  await page.fill('input[type="password"]', 'WrongPassword999');
  await page.click('button[type="submit"]');
  await page.waitForTimeout(1000);
  bodyText = await page.textContent('body');
  log('Invalid login: error message shown', bodyText.includes('Invalid credentials') || bodyText.toLowerCase().includes('login failed'),
    bodyText.includes('Invalid credentials') ? 'Invalid credentials' : 'Login failed (generic)');
  const urlAfterBadLogin = page.url();
  log('Invalid login: stays on /login (no redirect)', urlAfterBadLogin === `${BASE}/login`, `url=${urlAfterBadLogin}`);
  await page.screenshot({ path: path.join(SHOT_DIR, '05-invalid-login.png') });

  // ── 6. Correct login ─────────────────────────────────────────────────────────
  await page.fill('input[type="password"]', TEST_PASS);
  await page.click('button[type="submit"]');
  await page.waitForTimeout(1200);
  bodyText = await page.textContent('body');
  const urlAfterLogin = page.url();
  log('Login: success toast shown', bodyText.includes(`Welcome back, ${TEST_NAME}`));
  log('Login: redirected to home (non-admin)', urlAfterLogin === `${BASE}/`, `url=${urlAfterLogin}`);
  await page.screenshot({ path: path.join(SHOT_DIR, '06-login-success.png') });

  // ── 7. Session persistence across reload ────────────────────────────────────
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(800);
  await page.goto(`${BASE}/profile`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(600);
  bodyText = await page.textContent('body');
  log('Session persistence: still logged in after reload (profile shows name)', bodyText.includes(TEST_NAME));
  await page.screenshot({ path: path.join(SHOT_DIR, '07-session-persist-profile.png') });

  // ── 8. Duplicate registration ───────────────────────────────────────────────
  await page.click('button:has-text("Logout")');
  await page.waitForTimeout(600);
  await page.goto(`${BASE}/register`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(500);
  await page.fill('input[type="text"]', 'Another Name');
  await page.fill('input[type="email"]', TEST_EMAIL);
  await page.fill('input[type="password"]', 'AnotherPass123');
  await page.click('button[type="submit"]');
  await page.waitForTimeout(1000);
  bodyText = await page.textContent('body');
  log('Duplicate registration: error message shown', bodyText.includes('Email already registered') || bodyText.toLowerCase().includes('registration failed'),
    bodyText.includes('Email already registered') ? 'Email already registered' : 'generic failure msg');
  const urlAfterDup = page.url();
  log('Duplicate registration: stays on /register (no account created)', urlAfterDup === `${BASE}/register`, `url=${urlAfterDup}`);
  await page.screenshot({ path: path.join(SHOT_DIR, '08-duplicate-register.png') });

  // ── 9. Forgot password link ──────────────────────────────────────────────────
  await page.goto(`${BASE}/login`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(500);
  await page.click('a:has-text("Forgot password?")');
  await page.waitForTimeout(800);
  const forgotUrl = page.url();
  bodyText = await page.textContent('body');
  log('Forgot password: navigates to /forgot-password', forgotUrl.includes('/forgot-password'), `url=${forgotUrl}`);
  log('Forgot password: page renders SOME content (not a blank crash)', bodyText.trim().length > 0, `bodyLength=${bodyText.trim().length}`);
  await page.screenshot({ path: path.join(SHOT_DIR, '09-forgot-password.png') });

  await context.close();

  // ── 10. Mobile login (375px) ─────────────────────────────────────────────────
  const mobileCtx = await browser.newContext({ viewport: { width: 375, height: 812 } });
  const mPage = await mobileCtx.newPage();
  mPage.setDefaultNavigationTimeout(60000);
  mPage.on('console', msg => { if (msg.type() === 'error') consoleErrors.push(`[mobile375] ${mPage.url()} :: ${msg.text()}`); });
  await mPage.goto(`${BASE}/login`, { waitUntil: 'domcontentloaded' });
  await mPage.waitForTimeout(600);
  await mPage.fill('input[type="email"]', TEST_EMAIL);
  await mPage.fill('input[type="password"]', TEST_PASS);
  await mPage.screenshot({ path: path.join(SHOT_DIR, '10-mobile-login-375.png') });
  const overflow375 = await mPage.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  log('Mobile login (375px): no horizontal overflow', overflow375 <= 0, `overflow=${overflow375}px`);
  await mPage.click('button[type="submit"]');
  await mPage.waitForTimeout(1200);
  const mUrl = mPage.url();
  log('Mobile login (375px): login succeeds + redirects home', mUrl === `${BASE}/`, `url=${mUrl}`);
  await mPage.screenshot({ path: path.join(SHOT_DIR, '11-mobile-login-success-375.png') });
  await mobileCtx.close();

  await browser.close();

  // ── Write results ─────────────────────────────────────────────────────────────
  fs.writeFileSync(path.join(__dirname, '..', 'qa_phase1_results.json'), JSON.stringify({ results, consoleErrors, testEmail: TEST_EMAIL, testPass: TEST_PASS, testName: TEST_NAME }, null, 2));
  console.log('\n=== Console errors captured ===');
  consoleErrors.forEach(e => console.log(e));
  console.log(`\nTotal: ${results.length}, Passed: ${results.filter(r => r.ok).length}, Failed: ${results.filter(r => !r.ok).length}`);
})();
