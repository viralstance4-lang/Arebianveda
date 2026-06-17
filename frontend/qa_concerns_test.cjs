const { chromium } = require('playwright');
const axios = require('axios');
const fs = require('fs');
const path = require('path');

const BASE = 'http://localhost:5173';
const API = 'http://localhost:5001/api';
const SHOT_DIR = path.join(__dirname, '..', 'qa_storefront_screenshots', 'concerns');
fs.mkdirSync(SHOT_DIR, { recursive: true });

const CARD_IMG = path.join(__dirname, '..', 'qa_concern_assets', 'concern-card.png');

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

    let { data: allData } = await axios.get(`${API}/concerns`, authHeader);
    for (const c of allData.concerns.filter(c => c.label.startsWith('QA Concern'))) {
      await axios.delete(`${API}/concerns/${c._id}`, authHeader);
    }

    browser = await chromium.launch();
    const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    const page = await context.newPage();
    page.setDefaultNavigationTimeout(60000);
    page.on('console', msg => { if (msg.type() === 'error') consoleErrors.push(`[desktop] ${page.url()} :: ${msg.text()}`); });
    page.on('pageerror', err => consoleErrors.push(`[desktop pageerror] ${page.url()} :: ${err.message}`));

    // ── Phase 0: backward compatibility — default concern cards when 0 active ──
    await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(800);
    let bodyText = await page.textContent('body');
    log('Backward-compat: default concern cards shown when 0 active concerns', bodyText.includes('Energy & Stamina') && bodyText.includes('Sugar Management') && bodyText.includes('Women\'s Health'));
    await page.screenshot({ path: path.join(SHOT_DIR, '00-homepage-default-concerns.png') });

    // ── Admin login via UI ────────────────────────────────────────────────────
    await page.goto(`${BASE}/login`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(500);
    await page.fill('input[type="email"]', ADMIN_EMAIL);
    await page.fill('input[type="password"]', ADMIN_PASS);
    await page.click('button[type="submit"]');
    await page.waitForTimeout(1200);
    log('Admin login via UI succeeds + redirects to admin dashboard', page.url() === `${BASE}/admin/dashboard`, page.url());

    // ── Navigate to Admin > Health Concerns ─────────────────────────────────────
    await page.goto(`${BASE}/admin/concerns`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(800);
    bodyText = await page.textContent('body');
    log('Admin sidebar: "Health Concerns" link present', bodyText.includes('Health Concerns'));
    log('Admin list: correct column headers', bodyText.includes('Preview') && bodyText.includes('Label') && bodyText.includes('Theme') && bodyText.includes('Status') && bodyText.includes('Order'));
    await page.screenshot({ path: path.join(SHOT_DIR, '01-admin-concerns-empty.png') });

    // ── Test: Add Concern One (icon only, active) ───────────────────────────────
    await page.click('button:has-text("Add Concern")');
    await page.waitForTimeout(400);
    await page.fill('input[name="label"]', 'QA Concern Icon');
    await page.fill('input[name="icon"]', '🔥');
    await page.selectOption('select[name="colorTheme"]', 'gold');
    await page.fill('input[name="displayOrder"]', '0');
    await page.click('button:has-text("Create Concern")');
    await page.waitForTimeout(1200);
    bodyText = await page.textContent('body');
    log('Add Concern: "QA Concern Icon" created (icon only)', bodyText.includes('QA Concern Icon'));

    // ── Test: Add Concern Two (image upload, overrides icon) ────────────────────
    await page.click('button:has-text("Add Concern")');
    await page.waitForTimeout(400);
    await page.fill('input[name="label"]', 'QA Concern Image');
    await page.fill('input[name="icon"]', '🌟');
    await page.setInputFiles('input[type="file"]', CARD_IMG);
    await page.selectOption('select[name="colorTheme"]', 'blue');
    await page.fill('input[name="link"]', 'https://example.com/qa-concern');
    await page.fill('input[name="displayOrder"]', '1');
    await page.click('button:has-text("Create Concern")');
    await page.waitForTimeout(1800);
    bodyText = await page.textContent('body');
    log('Add Concern: "QA Concern Image" created (image upload + external link)', bodyText.includes('QA Concern Image'));
    await page.screenshot({ path: path.join(SHOT_DIR, '02-admin-after-create.png') });

    // ── Test: Add Concern Three (hidden) ────────────────────────────────────────
    await page.click('button:has-text("Add Concern")');
    await page.waitForTimeout(400);
    await page.fill('input[name="label"]', 'QA Concern Hidden');
    await page.fill('input[name="icon"]', '🙈');
    await page.fill('input[name="displayOrder"]', '2');
    await page.click('label:has-text("Active (visible on homepage)")');
    await page.click('button:has-text("Create Concern")');
    await page.waitForTimeout(1200);
    bodyText = await page.textContent('body');
    log('Add Concern: "QA Concern Hidden" created (inactive)', bodyText.includes('QA Concern Hidden'));
    log('Admin list: "QA Concern Hidden" shows Hidden badge', await page.locator('tr:has-text("QA Concern Hidden") >> text=Hidden').count() > 0);
    log('Admin list: "QA Concern Icon" shows Active badge', await page.locator('tr:has-text("QA Concern Icon") >> text=Active').count() > 0);

    // ── API: verify data persisted correctly ────────────────────────────────────
    const { data: activeData1 } = await axios.get(`${API}/concerns/active`);
    const activeLabels1 = activeData1.concerns.map(c => c.label);
    log('API /concerns/active: only Icon + Image concerns active (Hidden excluded)',
      activeLabels1.includes('QA Concern Icon') && activeLabels1.includes('QA Concern Image') && !activeLabels1.includes('QA Concern Hidden'),
      JSON.stringify(activeLabels1));

    const concernImage = activeData1.concerns.find(c => c.label === 'QA Concern Image');
    log('API: uploaded card image stored on Cloudinary', (concernImage?.image || '').includes('res.cloudinary.com'), concernImage?.image);
    log('API: link override stored', concernImage?.link === 'https://example.com/qa-concern', concernImage?.link);
    const concernIcon = activeData1.concerns.find(c => c.label === 'QA Concern Icon');
    log('API: icon-only concern has empty image field', !concernIcon?.image, concernIcon?.image);
    log('API: icon stored correctly', concernIcon?.icon === '🔥', concernIcon?.icon);

    // ── Test: Homepage shows the 2 active QA concern cards ──────────────────────
    await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(800);
    bodyText = await page.textContent('body');
    log('Homepage: shows "QA Concern Icon" card', bodyText.includes('QA Concern Icon'));
    log('Homepage: shows "QA Concern Image" card', bodyText.includes('QA Concern Image'));
    log('Homepage: hidden concern "QA Concern Hidden" NOT shown', !bodyText.includes('QA Concern Hidden'));
    log('Homepage: default concern cards no longer shown (replaced by active set)', !bodyText.includes('Energy & Stamina'));

    // Image card renders an <img>, icon card renders emoji text
    const concernSection = page.locator('section:has-text("Shop by Health Concern")');
    const imageCardImg = concernSection.locator('a[href="https://example.com/qa-concern"] img, a:has-text("QA Concern Image") img');
    log('Homepage: "QA Concern Image" card renders <img> from Cloudinary', (await imageCardImg.count()) > 0);
    const imgSrc = await imageCardImg.first().getAttribute('src').catch(() => null);
    log('Homepage: concern card image served from Cloudinary', (imgSrc || '').includes('res.cloudinary.com'), imgSrc);

    // External link card should be an <a target="_blank">, not internal <Link>
    const externalCard = concernSection.locator('a[href="https://example.com/qa-concern"]');
    log('Homepage: external link concern renders as <a target="_blank">', await externalCard.getAttribute('target') === '_blank');

    // Icon-only card with no link override falls back to /shop?concern=label
    const iconCardLink = await concernSection.locator('a:has-text("QA Concern Icon")').getAttribute('href');
    log('Homepage: icon concern with no link uses /shop?concern= fallback', iconCardLink === `/shop?concern=${encodeURIComponent('QA Concern Icon')}`, iconCardLink);
    await page.screenshot({ path: path.join(SHOT_DIR, '03-homepage-with-concerns.png') });

    // ── Admin: hide/show toggle, drag-drop reorder, edit, delete ────────────────
    await page.goto(`${BASE}/admin/concerns`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(800);

    // Hide/Show toggle
    await page.click('tr:has-text("QA Concern Icon") >> text=Active');
    await page.waitForTimeout(800);
    log('Admin: Hide toggle flips "QA Concern Icon" to Hidden', await page.locator('tr:has-text("QA Concern Icon") >> text=Hidden').count() > 0);

    await page.click('tr:has-text("QA Concern Icon") >> text=Hidden');
    await page.waitForTimeout(800);
    log('Admin: Show toggle flips "QA Concern Icon" back to Active', await page.locator('tr:has-text("QA Concern Icon") >> text=Active').count() > 0);

    // Edit: change label, theme, and remove image (revert to icon)
    await page.click('tr:has-text("QA Concern Image") button[title="Edit"]');
    await page.waitForTimeout(400);
    await page.fill('input[name="label"]', 'QA Concern Image Edited');
    await page.click('button:has-text("Remove image (use icon instead)")');
    await page.selectOption('select[name="colorTheme"]', 'pink');
    await page.click('button:has-text("Update Concern")');
    await page.waitForTimeout(1500);
    bodyText = await page.textContent('body');
    log('Admin: Edit updates label to "QA Concern Image Edited"', bodyText.includes('QA Concern Image Edited'));

    const { data: afterEdit } = await axios.get(`${API}/concerns`, authHeader);
    const editedConcern = afterEdit.concerns.find(c => c.label === 'QA Concern Image Edited');
    log('Admin: removing image clears image field (reverts to icon)', !editedConcern?.image, editedConcern?.image);
    log('Admin: icon "🌟" still present after image removal', editedConcern?.icon === '🌟', editedConcern?.icon);
    log('Admin: theme updated to "pink"', editedConcern?.colorTheme === 'pink', editedConcern?.colorTheme);
    await page.screenshot({ path: path.join(SHOT_DIR, '04-admin-after-edit.png') });

    // Drag & drop reorder — drag last row to first position
    const rows = page.locator('table tbody tr');
    const rowCount = await rows.count();
    await rows.nth(rowCount - 1).dragTo(rows.nth(0));
    await page.waitForTimeout(1200);
    await page.screenshot({ path: path.join(SHOT_DIR, '05-admin-after-reorder.png') });

    const { data: afterReorder } = await axios.get(`${API}/concerns`, authHeader);
    const qaOrdered = afterReorder.concerns
      .filter(c => c.label.startsWith('QA Concern'))
      .sort((a, b) => a.displayOrder - b.displayOrder)
      .map(c => c.label);
    log('Admin: drag-and-drop reorder updates displayOrder (last row moved to first)', qaOrdered[0] === 'QA Concern Hidden', JSON.stringify(qaOrdered));

    // ── Cleanup: delete all QA concerns, confirm default cards restored ────────
    const { data: finalList } = await axios.get(`${API}/concerns`, authHeader);
    const qaConcerns = finalList.concerns.filter(c => c.label.startsWith('QA Concern'));
    for (const c of qaConcerns) {
      await axios.delete(`${API}/concerns/${c._id}`, authHeader);
    }
    log('Cleanup: all QA concerns deleted via API', qaConcerns.length === 3, `deleted ${qaConcerns.length}`);

    const { data: postCleanup } = await axios.get(`${API}/concerns`, authHeader);
    log('Cleanup: zero "QA Concern*" records remain', postCleanup.concerns.filter(c => c.label.startsWith('QA Concern')).length === 0);

    await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(800);
    bodyText = await page.textContent('body');
    log('Backward-compat: default concern cards restored after deleting all', bodyText.includes('Energy & Stamina') && bodyText.includes('Women\'s Health'));
    await page.screenshot({ path: path.join(SHOT_DIR, '06-homepage-after-cleanup.png') });

    await context.close();
  } catch (err) {
    log('SCRIPT ERROR', false, err.message);
    console.error(err);
  } finally {
    if (browser) await browser.close();
    fs.writeFileSync(path.join(__dirname, '..', 'qa_concerns_results.json'), JSON.stringify({ results, consoleErrors }, null, 2));
    console.log('\n=== Console errors captured ===');
    consoleErrors.forEach(e => console.log(e));
    console.log(`\nTotal: ${results.length}, Passed: ${results.filter(r => r.ok).length}, Failed: ${results.filter(r => !r.ok).length}`);
  }
})();
