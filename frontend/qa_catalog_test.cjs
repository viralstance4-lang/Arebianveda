const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const BASE = 'http://localhost:5173';
const SHOT_DIR = path.join(__dirname, '..', 'qa_storefront_screenshots');
fs.mkdirSync(SHOT_DIR, { recursive: true });

const results = [];
const log = (label, ok, detail) => {
  results.push({ label, ok, detail });
  console.log(`${ok ? 'PASS' : 'FAIL'} | ${label}${detail ? ' | ' + detail : ''}`);
};

const consoleErrors = [];
const brokenImages = [];

(async () => {
  const browser = await chromium.launch();
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await context.newPage();
  page.setDefaultNavigationTimeout(60000);
  page.on('console', msg => { if (msg.type() === 'error') consoleErrors.push(`${page.url()} :: ${msg.text()}`); });
  page.on('pageerror', err => consoleErrors.push(`pageerror ${page.url()} :: ${err.message}`));
  page.on('response', res => {
    const req = res.request();
    if (req.resourceType() === 'image' && res.status() >= 400) {
      brokenImages.push(`${res.status()} ${req.url()}`);
    }
  });

  // ── 1. Homepage ────────────────────────────────────────────────────────────
  await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1500);
  await page.screenshot({ path: path.join(SHOT_DIR, '20-homepage-top.png') });
  let bodyText = await page.textContent('body');

  log('Homepage: Hero heading present', bodyText.includes('Premium') && bodyText.includes('Ayurvedic') && bodyText.includes('Wellness Products'));
  log('Homepage: Trust badges present', bodyText.includes('100% Authentic') && bodyText.includes('Fast Delivery'));
  log('Homepage: "Shop by Health Concern" section present', bodyText.includes('Shop by Health Concern'));
  log('Homepage: all 6 concern tiles present', ['Energy & Stamina','Sugar Management','Gym & Fitness','Immunity','Skin & Hair',"Women's Health"].every(c => bodyText.includes(c)));
  log('Homepage: "Best Selling Products" section present', bodyText.includes('Best Selling Products'));
  log('Homepage: 4 featured products rendered', (await page.locator('a[href^="/shop/"]').count()) >= 4);
  log('Homepage: "Sourced from the Heart of Himalayas" section present', bodyText.includes('Sourced from the Heart of Himalayas'));
  log('Homepage: testimonials section present', bodyText.includes('10,000+ Customers Trust Arebianveda'));
  log('Homepage: certifications strip present', bodyText.includes('Certified & Trusted') && bodyText.includes('ISO 9001:2015'));
  log('Homepage: newsletter section present', bodyText.includes('Get Ayurvedic Wisdom in Your Inbox'));

  // "New Arrivals" section check (required by Phase 9 spec)
  log('Homepage: "New Arrivals" section present', bodyText.includes('New Arriv'), bodyText.includes('New Arriv') ? '' : 'MISSING — no New Arrivals section in HomePage.jsx');

  // Category/Subcategory sections (admin-driven) check
  log('Homepage: dedicated admin-driven Category sections present', false, 'MISSING — "Shop by Health Concern" uses hardcoded CONCERNS array, not admin Category/Subcategory data');

  // Seeded QA products should NOT appear (confirms hardcoded data, not API-driven)
  log('Homepage: seeded backend QA products NOT shown (confirms hardcoded data)', !bodyText.includes('QA Arebianveda Shilajit Resin') && !bodyText.includes('QA Black Tower'));

  // View All link → /shop
  const viewAllHref = await page.locator('a:has-text("View All")').first().getAttribute('href');
  log('Homepage: "View All" link points to /shop', viewAllHref === '/shop', `href=${viewAllHref}`);
  await page.click('a:has-text("View All")');
  await page.waitForTimeout(800);
  log('Homepage: "View All" navigates to /shop', page.url() === `${BASE}/shop`, `url=${page.url()}`);
  await page.goBack({ waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(800);

  // Concern tile → /shop?concern=...
  await page.click('a[href*="concern=Gym"]');
  await page.waitForTimeout(800);
  log('Homepage: concern tile navigates to /shop with concern filter applied', page.url().includes('/shop?concern=Gym'), `url=${page.url()}`);
  bodyText = await page.textContent('body');
  log('Homepage→Shop concern filter: only "Gym & Fitness" product shown', bodyText.includes('Black Tower') && !bodyText.includes('Shilajit Lump') && !bodyText.includes('D99 Kwath'));

  // ── 2. Newsletter form (non-functional check) ───────────────────────────────
  await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(800);
  await page.locator('section:has-text("Get Ayurvedic Wisdom") input[type="email"]').fill('qa.newsletter@example.com');
  let networkCalled = false;
  page.on('request', req => { if (req.url().includes('/newsletter')) networkCalled = true; });
  await page.locator('section:has-text("Get Ayurvedic Wisdom") button[type="submit"]').click();
  await page.waitForTimeout(800);
  bodyText = await page.textContent('body');
  log('Newsletter form: clicking Subscribe does NOT call backend (non-functional, e.preventDefault() only)', !networkCalled, networkCalled ? 'API WAS called' : 'no /newsletter request fired — form is a stub');
  log('Newsletter form: no success/error toast shown', !bodyText.includes('Subscribed') && !bodyText.toLowerCase().includes('thank you for subscribing'));

  // ── 3. Navbar search (non-functional check) ──────────────────────────────────
  await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(600);
  const searchBtn = page.locator('header button[aria-label*="earch" i], header button:has(svg)').first();
  // Find the search toggle by icon button near navbar
  const searchIcon = await page.locator('header').locator('button').all();
  let searchOpened = false;
  for (const btn of searchIcon) {
    const html = await btn.innerHTML();
    if (html.toLowerCase().includes('search') || (await btn.getAttribute('class') || '').includes('search')) {
      await btn.click();
      searchOpened = true;
      break;
    }
  }
  // fallback: try clicking via lucide-search svg parent
  if (!searchOpened) {
    const svgSearch = page.locator('header svg.lucide-search').first();
    if (await svgSearch.count() > 0) { await svgSearch.click({ force: true }); searchOpened = true; }
  }
  await page.waitForTimeout(500);
  const searchInput = page.locator('header input[type="text"], header input[placeholder*="earch" i]').first();
  let searchTestNote = 'search toggle/input not found';
  if (await searchInput.count() > 0) {
    await searchInput.fill('Shilajit');
    await searchInput.press('Enter');
    await page.waitForTimeout(800);
    searchTestNote = `url after Enter = ${page.url()}`;
  }
  log('Navbar search: pressing Enter does NOT navigate to search results (non-functional)', page.url() === `${BASE}/`, searchTestNote);
  await page.screenshot({ path: path.join(SHOT_DIR, '21-navbar-search-open.png') });

  // ── 4. Shop page — listing, filters, sort, search ────────────────────────────
  await page.goto(`${BASE}/shop`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1000);
  await page.screenshot({ path: path.join(SHOT_DIR, '22-shop-default.png') });
  bodyText = await page.textContent('body');
  log('Shop page: header "Our Products" present', bodyText.includes('Our Products'));
  log('Shop page: shows "4 products found" by default', bodyText.includes('4') && bodyText.includes('products found'));
  log('Shop page: all 4 hardcoded products rendered', ['Arebianveda Shilajit Resin','Black Tower Shilajit Capsules','Arebianveda Shilajit Lump','Arebianveda D99 Kwath'].every(n => bodyText.includes(n)));
  log('Shop page: seeded backend QA products NOT shown (no API connection)', !bodyText.includes('QA Arebianveda') && !bodyText.includes('QA Out Of Stock') && !bodyText.includes('QA Free Gift'));
  log('Shop page: no pagination controls (only 4 static products)', (await page.locator('text=/page \\d/i, nav[aria-label*="pagination" i]').count()) === 0);

  // Search filter
  await page.fill('input[placeholder="Search products..."]', 'Black Tower');
  await page.waitForTimeout(400);
  bodyText = await page.textContent('body');
  log('Shop filter — search "Black Tower": shows 1 product found', bodyText.includes('1') && bodyText.includes('product found') && bodyText.includes('Black Tower Shilajit Capsules'));
  log('Shop filter — search "Black Tower": other products hidden', !bodyText.includes('Shilajit Resin') && !bodyText.includes('Shilajit Lump') && !bodyText.includes('D99 Kwath'));
  await page.fill('input[placeholder="Search products..."]', '');

  // Concern filter
  await page.click('button:has-text("Gym & Fitness")');
  await page.waitForTimeout(400);
  bodyText = await page.textContent('body');
  log('Shop filter — concern "Gym & Fitness": shows only Black Tower Capsules', bodyText.includes('Black Tower Shilajit Capsules') && !bodyText.includes('D99 Kwath') && !bodyText.includes('Shilajit Resin'));
  await page.click('button:has-text("All")').catch(() => {});
  // reset via Reset Filters button if present
  const resetBtn = page.locator('button:has-text("Reset Filters")');
  if (await resetBtn.count() > 0) await resetBtn.first().click();
  await page.waitForTimeout(400);

  // Form filter
  await page.click('button.capitalize:has-text("resin")');
  await page.waitForTimeout(400);
  bodyText = await page.textContent('body');
  log('Shop filter — form "resin": shows only Shilajit Resin product', bodyText.includes('Arebianveda Shilajit Resin') && !bodyText.includes('Lump') && !bodyText.includes('Capsules') && !bodyText.includes('Kwath'));
  const resetBtn2 = page.locator('button:has-text("Reset Filters")');
  if (await resetBtn2.count() > 0) await resetBtn2.first().click();
  await page.waitForTimeout(400);

  // Sort: Price Low-High
  await page.selectOption('select', 'price_asc');
  await page.waitForTimeout(400);
  const namesAsc = await page.locator('h3.font-semibold').allTextContents();
  log('Shop sort — Price Low→High: D99 Kwath (₹699) appears first', namesAsc[0]?.includes('D99 Kwath'), `order=${JSON.stringify(namesAsc)}`);

  // Sort: Price High-Low
  await page.selectOption('select', 'price_desc');
  await page.waitForTimeout(400);
  const namesDesc = await page.locator('h3.font-semibold').allTextContents();
  log('Shop sort — Price High→Low: Shilajit Lump (₹900) appears first', namesDesc[0]?.includes('Shilajit Lump'), `order=${JSON.stringify(namesDesc)}`);
  await page.selectOption('select', 'popular');

  // Max price slider — set to 700, only D99 Kwath (₹699) should remain
  await page.evaluate(() => {
    const slider = document.querySelector('input[type="range"]');
    const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
    setter.call(slider, '700');
    slider.dispatchEvent(new Event('input', { bubbles: true }));
  });
  await page.waitForTimeout(400);
  bodyText = await page.textContent('body');
  log('Shop filter — max price ₹700: only D99 Kwath (₹699) remains', bodyText.includes('D99 Kwath') && !bodyText.includes('Shilajit Resin') && !bodyText.includes('Capsules') && !bodyText.includes('Lump'));
  await page.screenshot({ path: path.join(SHOT_DIR, '23-shop-filtered.png') });

  // Max price slider — set to 300, "No products found" message
  await page.evaluate(() => {
    const slider = document.querySelector('input[type="range"]');
    const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
    setter.call(slider, '300');
    slider.dispatchEvent(new Event('input', { bubbles: true }));
  });
  await page.waitForTimeout(400);
  bodyText = await page.textContent('body');
  log('Shop filter — max price ₹300: "No products found" + Show All button shown', bodyText.includes('No products found') && bodyText.includes('Show All Products'));
  await page.screenshot({ path: path.join(SHOT_DIR, '24-shop-empty-state.png') });
  await page.click('button:has-text("Show All Products")');
  await page.waitForTimeout(400);
  bodyText = await page.textContent('body');
  log('Shop filter — "Show All Products" resets back to 4 products', bodyText.includes('4') && bodyText.includes('products found'));

  // ── 5. Product detail page ───────────────────────────────────────────────────
  await page.goto(`${BASE}/shop/shilajit-resin`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1000);
  await page.screenshot({ path: path.join(SHOT_DIR, '25-product-detail.png') });
  bodyText = await page.textContent('body');
  log('Product detail (shilajit-resin): product name shown', bodyText.includes('Shilajit Resin'));
  log('Product detail: price shown', /₹\s?\d/.test(bodyText));
  log('Product detail: Add to Cart button present', bodyText.toLowerCase().includes('add to cart'));
  log('Product detail: Buy Now button present', bodyText.toLowerCase().includes('buy now'));
  log('Product detail: NO "In Stock" / "Out of Stock" badge (stock-status UI missing)', !bodyText.includes('In Stock') && !bodyText.includes('Out of Stock'), 'confirmed gap — ProductPage has no stock badge or button-disable logic');
  log('Product detail: Related products section present', (await page.locator('a[href^="/shop/"]').count()) > 1);

  // Add to cart from product page
  const cartCountBefore = await page.locator('header').textContent();
  await page.click('button:has-text("Add to Cart")');
  await page.waitForTimeout(800);
  bodyText = await page.textContent('body');
  log('Product detail: "Add to Cart" shows success toast', bodyText.toLowerCase().includes('added to cart'));
  const cartBadge = await page.locator('header a[href="/cart"]').textContent();
  log('Product detail: cart icon badge updates after Add to Cart', /[1-9]/.test(cartBadge), `badge text="${cartBadge.trim()}"`);

  // Non-existent product slug
  await page.goto(`${BASE}/shop/non-existent-product-xyz`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(800);
  bodyText = await page.textContent('body');
  log('Product detail: non-existent slug handled gracefully (no blank crash)', bodyText.trim().length > 50, `bodyLength=${bodyText.trim().length}`);
  await page.screenshot({ path: path.join(SHOT_DIR, '26-product-not-found.png') });

  // ── 6. Mobile quick check (375px) ────────────────────────────────────────────
  await context.close();
  const mobileCtx = await browser.newContext({ viewport: { width: 375, height: 812 } });
  const mPage = await mobileCtx.newPage();
  mPage.setDefaultNavigationTimeout(60000);
  mPage.on('console', msg => { if (msg.type() === 'error') consoleErrors.push(`[mobile375] ${mPage.url()} :: ${msg.text()}`); });

  await mPage.goto(`${BASE}/`, { waitUntil: 'domcontentloaded' });
  await mPage.waitForTimeout(1000);
  let overflow = await mPage.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  log('Mobile (375px) Homepage: no horizontal overflow', overflow <= 0, `overflow=${overflow}px`);
  await mPage.screenshot({ path: path.join(SHOT_DIR, '27-mobile-homepage-375.png'), fullPage: true });

  await mPage.goto(`${BASE}/shop`, { waitUntil: 'domcontentloaded' });
  await mPage.waitForTimeout(1000);
  overflow = await mPage.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  log('Mobile (375px) Shop page: no horizontal overflow', overflow <= 0, `overflow=${overflow}px`);
  await mPage.screenshot({ path: path.join(SHOT_DIR, '28-mobile-shop-375.png'), fullPage: true });

  await mPage.goto(`${BASE}/shop/shilajit-resin`, { waitUntil: 'domcontentloaded' });
  await mPage.waitForTimeout(1000);
  overflow = await mPage.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  log('Mobile (375px) Product detail: no horizontal overflow', overflow <= 0, `overflow=${overflow}px`);
  await mPage.screenshot({ path: path.join(SHOT_DIR, '29-mobile-product-375.png'), fullPage: true });

  await mobileCtx.close();
  await browser.close();

  // ── Write results ─────────────────────────────────────────────────────────────
  fs.writeFileSync(path.join(__dirname, '..', 'qa_phase2_results.json'), JSON.stringify({ results, consoleErrors, brokenImages }, null, 2));
  console.log('\n=== Console errors captured ===');
  consoleErrors.forEach(e => console.log(e));
  console.log('\n=== Broken images (HTTP >= 400) ===');
  brokenImages.forEach(e => console.log(e));
  console.log(`\nTotal: ${results.length}, Passed: ${results.filter(r => r.ok).length}, Failed: ${results.filter(r => !r.ok).length}`);
})();
