const { chromium } = require('playwright');
const axios = require('axios');
const fs = require('fs');
const path = require('path');

const BASE = 'http://localhost:5173';
const API = 'http://localhost:5001/api';
const SHOT_DIR = path.join(__dirname, '..', 'qa_storefront_screenshots', 'banners');
fs.mkdirSync(SHOT_DIR, { recursive: true });

const ASSET_DIR = path.join(__dirname, '..', 'qa_banner_assets');
const DESKTOP_IMG = path.join(ASSET_DIR, 'desktop.png');
const MOBILE_IMG = path.join(ASSET_DIR, 'mobile.png');

const ADMIN_EMAIL = 'admin@arebianveda.com';
const ADMIN_PASS = 'Admin@123';

const results = [];
const log = (label, ok, detail) => {
  results.push({ label, ok: !!ok, detail });
  console.log(`${ok ? 'PASS' : 'FAIL'} | ${label}${detail ? ' | ' + detail : ''}`);
};
const consoleErrors = [];

(async () => {
  let browser;
  try {
    // ── API: admin login + cleanup leftovers from previous runs ────────────────
    const { data: loginData } = await axios.post(`${API}/auth/login`, { email: ADMIN_EMAIL, password: ADMIN_PASS });
    const token = loginData.token;
    const authHeader = { headers: { Authorization: `Bearer ${token}` } };
    log('API: admin login returns token', !!token);

    let { data: allData } = await axios.get(`${API}/banners`, authHeader);
    for (const b of allData.banners.filter(b => b.title.startsWith('QA Banner'))) {
      await axios.delete(`${API}/banners/${b._id}`, authHeader);
    }

    browser = await chromium.launch();
    const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    const page = await context.newPage();
    page.setDefaultNavigationTimeout(60000);
    page.on('console', msg => { if (msg.type() === 'error') consoleErrors.push(`[desktop] ${page.url()} :: ${msg.text()}`); });
    page.on('pageerror', err => consoleErrors.push(`[desktop pageerror] ${page.url()} :: ${err.message}`));

    // ── Phase 0: backward compatibility — StaticHero when zero active banners ──
    await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(800);
    let bodyText = await page.textContent('body');
    log('Backward-compat: StaticHero shown when 0 banners exist', bodyText.includes('Premium') && bodyText.includes('Wellness Products'));
    let heroImgSrc = await page.locator('section img').first().getAttribute('src').catch(() => null);
    log('Backward-compat: static hero uses original hardcoded image', (heroImgSrc || '').includes('unsplash.com'), heroImgSrc);
    await page.screenshot({ path: path.join(SHOT_DIR, '00-homepage-static-hero.png') });

    // ── Admin login via UI ────────────────────────────────────────────────────
    await page.goto(`${BASE}/login`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(500);
    await page.fill('input[type="email"]', ADMIN_EMAIL);
    await page.fill('input[type="password"]', ADMIN_PASS);
    await page.click('button[type="submit"]');
    await page.waitForTimeout(1200);
    log('Admin login via UI succeeds + redirects to admin dashboard', page.url() === `${BASE}/admin/dashboard`, page.url());

    // ── Navigate to Admin > Homepage Banners ────────────────────────────────────
    await page.goto(`${BASE}/admin/banners`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(800);
    bodyText = await page.textContent('body');
    log('Admin sidebar: "Homepage Banners" link present', bodyText.includes('Homepage Banners'));
    log('Admin list: correct column headers', bodyText.includes('Image Preview') && bodyText.includes('Title') && bodyText.includes('Status') && bodyText.includes('Order') && bodyText.includes('Created'));
    await page.screenshot({ path: path.join(SHOT_DIR, '01-admin-banners-empty.png') });

    // ── Helper: open Add Banner modal and fill core fields ──────────────────────
    async function addBanner({ title, subtitle, buttonText, buttonUrl, secondaryButtonText, secondaryButtonUrl, clickUrl, displayOrder, isActive = true, startDate = '', endDate = '', withMobile = true }) {
      await page.click('button:has-text("Add Banner")');
      await page.waitForTimeout(400);
      await page.fill('input[name="title"]', title);
      if (subtitle) await page.fill('input[name="subtitle"]', subtitle);
      if (buttonText) await page.fill('input[name="buttonText"]', buttonText);
      if (buttonUrl) await page.fill('input[name="buttonUrl"]', buttonUrl);
      if (secondaryButtonText) await page.fill('input[name="secondaryButtonText"]', secondaryButtonText);
      if (secondaryButtonUrl) await page.fill('input[name="secondaryButtonUrl"]', secondaryButtonUrl);
      if (clickUrl) await page.fill('input[name="clickUrl"]', clickUrl);
      await page.fill('input[name="displayOrder"]', String(displayOrder));
      if (startDate) await page.fill('input[name="startDate"]', startDate);
      if (endDate) await page.fill('input[name="endDate"]', endDate);

      const fileInputs = page.locator('input[type="file"]');
      await fileInputs.nth(0).setInputFiles(DESKTOP_IMG);
      if (withMobile) await fileInputs.nth(1).setInputFiles(MOBILE_IMG);

      if (!isActive) await page.click('input[name="isActive"]');

      await page.click('button:has-text("Create Banner")');
      await page.waitForTimeout(1800);
    }

    // ── Test: Add Banner One (active, order 0, all CTAs + clickUrl) ─────────────
    await addBanner({
      title: 'QA Banner One', subtitle: 'QA Subtitle One',
      buttonText: 'Shop Now', buttonUrl: '/shop',
      secondaryButtonText: 'Learn More', secondaryButtonUrl: '/contact',
      clickUrl: '/about', displayOrder: 0, isActive: true,
    });
    bodyText = await page.textContent('body');
    log('Add Banner: "QA Banner One" created (desktop+mobile upload)', bodyText.includes('QA Banner One'));
    await page.screenshot({ path: path.join(SHOT_DIR, '02-banner-one-created.png') });

    // ── Test: Add Banner Two (active but scheduled for tomorrow) ────────────────
    const tomorrow = new Date(Date.now() + 86400000).toISOString().slice(0, 10);
    await addBanner({
      title: 'QA Banner Two', subtitle: 'QA Subtitle Two',
      buttonText: 'Discover', buttonUrl: '/shop',
      displayOrder: 1, isActive: true, startDate: tomorrow,
    });
    bodyText = await page.textContent('body');
    log('Add Banner: "QA Banner Two" created (scheduled, startDate=tomorrow)', bodyText.includes('QA Banner Two'));

    // ── Test: Add Banner Three (hidden, desktop-only image) ─────────────────────
    await addBanner({
      title: 'QA Banner Three', subtitle: 'QA Subtitle Three',
      buttonText: 'Explore', buttonUrl: '/shop',
      displayOrder: 2, isActive: false, withMobile: false,
    });
    bodyText = await page.textContent('body');
    log('Add Banner: "QA Banner Three" created (hidden, desktop-only)', bodyText.includes('QA Banner Three'));
    await page.screenshot({ path: path.join(SHOT_DIR, '03-three-banners-list.png') });

    log('Admin list: "QA Banner One" shows Active badge', await page.locator('tr:has-text("QA Banner One") >> text=Active').count() > 0);
    log('Admin list: "QA Banner Three" shows Hidden badge', await page.locator('tr:has-text("QA Banner Three") >> text=Hidden').count() > 0);

    // ── Test: /banners/active — visibility + scheduling logic ───────────────────
    let { data: activeData1 } = await axios.get(`${API}/banners/active`);
    let activeTitles = activeData1.banners.map(b => b.title);
    log('API /banners/active: only "QA Banner One" active (Two scheduled, Three hidden)',
      activeTitles.includes('QA Banner One') && !activeTitles.includes('QA Banner Two') && !activeTitles.includes('QA Banner Three'),
      JSON.stringify(activeTitles));

    const bannerOne = activeData1.banners.find(b => b.title === 'QA Banner One');
    log('API: desktopImage uploaded to Cloudinary', (bannerOne?.desktopImage || '').includes('res.cloudinary.com'), bannerOne?.desktopImage);
    log('API: mobileImage is a separate Cloudinary upload', (bannerOne?.mobileImage || '').includes('res.cloudinary.com') && bannerOne.mobileImage !== bannerOne.desktopImage, bannerOne?.mobileImage);

    // ── Test: Homepage shows HeroBannerSlider with single active banner ─────────
    await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(800);
    bodyText = await page.textContent('body');
    log('Homepage: hero shows "QA Banner One" title', bodyText.includes('QA Banner One'));
    log('Homepage: hero shows subtitle "QA Subtitle One"', bodyText.includes('QA Subtitle One'));
    log('Homepage: primary CTA "Shop Now" renders', bodyText.includes('Shop Now'));
    log('Homepage: secondary CTA "Learn More" renders', bodyText.includes('Learn More'));

    const heroSection = page.locator('section.bg-forest-900').first();
    const heroImg = heroSection.locator('img').first();
    const heroImgSrc2 = await heroImg.getAttribute('src');
    log('Homepage: hero image is no longer the hardcoded Unsplash image', !(heroImgSrc2 || '').includes('unsplash.com'), heroImgSrc2);
    log('Homepage: hero image served from Cloudinary', (heroImgSrc2 || '').includes('res.cloudinary.com'), heroImgSrc2);
    log('Homepage: hero image has non-empty alt attribute', !!(await heroImg.getAttribute('alt')));
    log('Homepage: hero image has non-empty title attribute', !!(await heroImg.getAttribute('title')));
    log('Homepage: nav arrows hidden with single active slide', await page.locator('button[aria-label="Next slide"]').count() === 0);
    log('Homepage: pagination dots hidden with single active slide', await page.locator('[aria-label^="Go to slide"]').count() === 0);
    await page.screenshot({ path: path.join(SHOT_DIR, '04-homepage-single-banner.png') });

    // ── Test: whole-banner clickUrl navigation (away from buttons) ──────────────
    await page.locator('section.bg-forest-900 > div.cursor-pointer').click({ position: { x: 20, y: 20 } });
    await page.waitForTimeout(600);
    log('Homepage: clicking banner area navigates to clickUrl (/about)', page.url() === `${BASE}/about`, page.url());

    // ── Test: secondary CTA navigates to its own URL, not clickUrl ───────────────
    await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(800);
    await page.click('section.bg-forest-900 button:has-text("Learn More")');
    await page.waitForTimeout(600);
    log('Homepage: secondary CTA navigates to its own URL (/contact)', page.url() === `${BASE}/contact`, page.url());

    // ── Test: primary CTA navigates to its own URL ──────────────────────────────
    await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(800);
    await page.click('section.bg-forest-900 button:has-text("Shop Now")');
    await page.waitForTimeout(600);
    log('Homepage: primary CTA navigates to its own URL (/shop)', page.url() === `${BASE}/shop`, page.url());

    // ── Edit: clear "QA Banner Two" start date so it becomes immediately active ──
    await page.goto(`${BASE}/admin/banners`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(800);
    await page.click('tr:has-text("QA Banner Two") button[title="Edit"]');
    await page.waitForTimeout(400);
    await page.fill('input[name="startDate"]', '');
    await page.click('button:has-text("Update Banner")');
    await page.waitForTimeout(1500);
    bodyText = await page.textContent('body');
    log('Edit Banner: cleared start date on "QA Banner Two"', bodyText.includes('Banner updated'));

    const { data: activeData2 } = await axios.get(`${API}/banners/active`);
    const activeTitles2 = activeData2.banners.map(b => b.title);
    log('API /banners/active: 2 active banners sorted by displayOrder', JSON.stringify(activeTitles2) === JSON.stringify(['QA Banner One', 'QA Banner Two']), JSON.stringify(activeTitles2));

    // ── Test: multi-slide homepage — dots, arrows, manual nav, autoplay ─────────
    await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(800);
    log('Homepage (2 slides): pagination dots = 2', await page.locator('[aria-label^="Go to slide"]').count() === 2);
    log('Homepage (2 slides): prev/next arrows present', await page.locator('button[aria-label="Next slide"]').count() === 1 && await page.locator('button[aria-label="Previous slide"]').count() === 1);

    bodyText = await page.textContent('body');
    log('Homepage (2 slides): shows first slide "QA Banner One" initially', bodyText.includes('QA Banner One') && !bodyText.includes('QA Banner Two'));

    await page.click('button[aria-label="Next slide"]');
    await page.waitForTimeout(500);
    bodyText = await page.textContent('body');
    log('Homepage (2 slides): Next arrow advances to "QA Banner Two"', bodyText.includes('QA Banner Two'));
    await page.screenshot({ path: path.join(SHOT_DIR, '05-homepage-slide-two.png') });

    await page.click('[aria-label="Go to slide 1"]');
    await page.waitForTimeout(500);
    bodyText = await page.textContent('body');
    log('Homepage (2 slides): pagination dot 1 returns to "QA Banner One"', bodyText.includes('QA Banner One') && !bodyText.includes('QA Banner Two'));

    // Autoplay — move mouse off the slider (prior clicks left it "hovered"),
    // then confirm the slide advances on its own after ~5s with no interaction
    await page.mouse.move(10, 750);
    bodyText = await page.textContent('body');
    const beforeAutoplay = bodyText.includes('QA Banner Two') ? 'two' : 'one';
    await page.waitForTimeout(5800);
    bodyText = await page.textContent('body');
    const afterAutoplay = bodyText.includes('QA Banner Two') ? 'two' : 'one';
    log('Homepage (2 slides): autoplay advances slide after ~5s idle', beforeAutoplay !== afterAutoplay, `${beforeAutoplay} -> ${afterAutoplay}`);

    // Pause-on-hover — hover over the slider and confirm it does NOT advance further
    await page.hover('section.bg-forest-900');
    bodyText = await page.textContent('body');
    const beforeHover = bodyText.includes('QA Banner Two') ? 'two' : 'one';
    await page.waitForTimeout(5800);
    bodyText = await page.textContent('body');
    const afterHover = bodyText.includes('QA Banner Two') ? 'two' : 'one';
    log('Homepage (2 slides): autoplay pauses on hover', beforeHover === afterHover, `${beforeHover} -> ${afterHover}`);

    await context.close();

    // ── Mobile (375px): responsive picture source + touch swipe ────────────────
    const mobileCtx = await browser.newContext({ viewport: { width: 375, height: 812 }, hasTouch: true });
    const mPage = await mobileCtx.newPage();
    mPage.setDefaultNavigationTimeout(60000);
    mPage.on('console', msg => { if (msg.type() === 'error') consoleErrors.push(`[mobile375] ${mPage.url()} :: ${msg.text()}`); });
    await mPage.goto(`${BASE}/`, { waitUntil: 'domcontentloaded' });
    await mPage.waitForTimeout(800);

    const mHero = mPage.locator('section.bg-forest-900').first();
    const mImg = mHero.locator('img').first();
    const sourceSrcset = await mHero.locator('picture source').getAttribute('srcset').catch(() => null);
    const currentSrcMobile = await mImg.evaluate(el => el.currentSrc);
    log('Mobile (375px): <picture><source> present with mobileImage', !!sourceSrcset, sourceSrcset);
    log('Mobile (375px): rendered image resolves to the separate mobile upload', currentSrcMobile === sourceSrcset, currentSrcMobile);

    const overflowMobile = await mPage.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    log('Mobile (375px): no horizontal overflow on homepage', overflowMobile <= 0, `overflow=${overflowMobile}px`);
    await mPage.screenshot({ path: path.join(SHOT_DIR, '06-homepage-mobile-375.png') });

    // Touch swipe left -> advance to next slide
    bodyText = await mPage.textContent('body');
    const beforeSwipe = bodyText.includes('QA Banner Two') ? 'two' : 'one';
    await mHero.evaluate((el) => {
      const start = new Touch({ identifier: 1, target: el, clientX: 300, clientY: 400 });
      el.dispatchEvent(new TouchEvent('touchstart', { touches: [start], changedTouches: [start], bubbles: true }));
      const end = new Touch({ identifier: 1, target: el, clientX: 40, clientY: 400 });
      el.dispatchEvent(new TouchEvent('touchend', { touches: [], changedTouches: [end], bubbles: true }));
    });
    await mPage.waitForTimeout(600);
    bodyText = await mPage.textContent('body');
    const afterSwipe = bodyText.includes('QA Banner Two') ? 'two' : 'one';
    log('Mobile (375px): touch swipe changes active slide', beforeSwipe !== afterSwipe, `${beforeSwipe} -> ${afterSwipe}`);

    await mobileCtx.close();

    // ── Admin: hide/show, duplicate, drag-drop reorder, delete, edit ────────────
    const context2 = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    const page2 = await context2.newPage();
    page2.setDefaultNavigationTimeout(60000);
    page2.on('console', msg => { if (msg.type() === 'error') consoleErrors.push(`[admin] ${page2.url()} :: ${msg.text()}`); });
    await page2.goto(`${BASE}/login`, { waitUntil: 'domcontentloaded' });
    await page2.waitForTimeout(500);
    await page2.fill('input[type="email"]', ADMIN_EMAIL);
    await page2.fill('input[type="password"]', ADMIN_PASS);
    await page2.click('button[type="submit"]');
    await page2.waitForTimeout(1000);
    await page2.goto(`${BASE}/admin/banners`, { waitUntil: 'domcontentloaded' });
    await page2.waitForTimeout(800);

    // Hide/Show toggle
    await page2.click('tr:has-text("QA Banner One") >> text=Active');
    await page2.waitForTimeout(800);
    log('Admin: Hide toggle flips "QA Banner One" to Hidden', await page2.locator('tr:has-text("QA Banner One") >> text=Hidden').count() > 0);

    await page2.click('tr:has-text("QA Banner One") >> text=Hidden');
    await page2.waitForTimeout(800);
    log('Admin: Show toggle flips "QA Banner One" back to Active', await page2.locator('tr:has-text("QA Banner One") >> text=Active').count() > 0);

    // Duplicate
    await page2.click('tr:has-text("QA Banner Two") button[title="Duplicate"]');
    await page2.waitForTimeout(1200);
    bodyText = await page2.textContent('body');
    log('Admin: Duplicate creates "QA Banner Two (Copy)"', bodyText.includes('QA Banner Two (Copy)'));
    log('Admin: duplicated banner is Hidden by default', await page2.locator('tr:has-text("QA Banner Two (Copy)") >> text=Hidden').count() > 0);
    await page2.screenshot({ path: path.join(SHOT_DIR, '07-admin-after-duplicate.png') });

    // Drag & drop reorder — drag last row to first position
    const rows = page2.locator('table tbody tr');
    const rowCount = await rows.count();
    await rows.nth(rowCount - 1).dragTo(rows.nth(0));
    await page2.waitForTimeout(1200);
    await page2.screenshot({ path: path.join(SHOT_DIR, '08-admin-after-reorder.png') });

    const { data: afterReorder } = await axios.get(`${API}/banners`, authHeader);
    const orderedTitles = [...afterReorder.banners].sort((a, b) => a.displayOrder - b.displayOrder).map(b => b.title);
    log('Admin: drag-and-drop reorder updates displayOrder', orderedTitles[0] === 'QA Banner Two (Copy)', JSON.stringify(orderedTitles));

    // Delete the duplicate
    await page2.click('tr:has-text("QA Banner Two (Copy)") button[title="Delete"]');
    await page2.waitForTimeout(400);
    await page2.click('button:has-text("Delete")');
    await page2.waitForTimeout(1200);
    bodyText = await page2.textContent('body');
    log('Admin: Delete removes "QA Banner Two (Copy)"', !bodyText.includes('QA Banner Two (Copy)'));

    // Edit "QA Banner Three" — title + reactivate
    await page2.click('tr:has-text("QA Banner Three") button[title="Edit"]');
    await page2.waitForTimeout(400);
    await page2.fill('input[name="title"]', 'QA Banner Three Edited');
    await page2.click('input[name="isActive"]');
    await page2.click('button:has-text("Update Banner")');
    await page2.waitForTimeout(1500);
    bodyText = await page2.textContent('body');
    log('Admin: Edit updates title + Active status', bodyText.includes('QA Banner Three Edited') && await page2.locator('tr:has-text("QA Banner Three Edited") >> text=Active').count() > 0);

    // ── Cleanup: delete all QA banners, confirm StaticHero restored ─────────────
    const { data: finalList } = await axios.get(`${API}/banners`, authHeader);
    for (const b of finalList.banners.filter(b => b.title.startsWith('QA Banner'))) {
      await axios.delete(`${API}/banners/${b._id}`, authHeader);
    }

    await page2.goto(`${BASE}/`, { waitUntil: 'domcontentloaded' });
    await page2.waitForTimeout(800);
    bodyText = await page2.textContent('body');
    log('Backward-compat: StaticHero restored after deleting all banners', bodyText.includes('Premium') && bodyText.includes('Wellness Products'));
    await page2.screenshot({ path: path.join(SHOT_DIR, '09-homepage-after-cleanup.png') });

    await context2.close();
  } catch (err) {
    log('SCRIPT ERROR', false, err.message);
    console.error(err);
  } finally {
    if (browser) await browser.close();
    fs.writeFileSync(path.join(__dirname, '..', 'qa_banner_results.json'), JSON.stringify({ results, consoleErrors }, null, 2));
    console.log('\n=== Console errors captured ===');
    consoleErrors.forEach(e => console.log(e));
    console.log(`\nTotal: ${results.length}, Passed: ${results.filter(r => r.ok).length}, Failed: ${results.filter(r => !r.ok).length}`);
  }
})();
