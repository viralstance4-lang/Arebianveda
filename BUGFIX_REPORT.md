# QA Bug Fix Round — Final Report

All 6 bugs from `QA_REPORT.md` are fixed, verified against the live backend/DB, and all QA test data has been removed. Production data is intact (clean baseline: 0 orders, 0 categories, 0 products, 0 coupons beyond the seed admin user).

---

## 1. Bugs Fixed

| # | Severity | Bug | Fix |
|---|----------|-----|-----|
| 1 | HIGH | Revenue always ₹0 on dashboard | COD orders now auto-transition `paymentStatus: pending → paid` when marked `delivered`, so they're counted by the existing revenue aggregations |
| 2 | MEDIUM | Category delete orphaned products | `deleteCategory` now checks product count; if products reference the category, returns `409` requiring the admin to choose **Reassign** or **Remove category from products**; UI shows a 3-option modal |
| 3 | MEDIUM | Media Library rejected PDFs | `application/pdf` is now accepted, stored as Cloudinary `raw` resource with a `.pdf`-suffixed URL, tagged `type: 'pdf'`, with its own stats/filter tab and preview link in Admin Media |
| 4 | MEDIUM | Benefits repeater grid broke on mobile | `grid-cols-6` → responsive `grid-cols-1 sm:grid-cols-2 lg:grid-cols-6` (1 col mobile, 2 cols tablet, 6 cols desktop) |
| 5 | MEDIUM | Policy footer links 404 | New public `/policy/:slug` route + `PolicyPage.jsx`; Footer now fetches `GET /policies` and renders real links dynamically |
| 6 | LOW | Invalid ObjectId → raw 500 | Global error handler now catches `CastError` and returns `400 {"success": false, "message": "Invalid ID"}` |

---

## 2. Files Modified

**Backend**
- `backend/src/controllers/orderController.js` — Bug #1 (auto `paymentStatus='paid'` on COD delivery)
- `backend/src/controllers/categoryController.js` — Bug #2 (`deleteCategory` rewrite: count check, 409 + `requiresAction`, `reassign`/`unassign` actions)
- `backend/src/models/Media.js` — Bug #3 (`type` enum: added `'pdf'`)
- `backend/src/config/cloudinary.js` — Bug #3 (PDF `fileFilter`, `raw` resource type, `.pdf`-suffixed `public_id`)
- `backend/src/controllers/mediaController.js` — Bug #3 (PDF type detection, stats, delete with `resource_type: 'raw'`)
- `backend/server.js` — Bug #6 (global `CastError` → 400 handler)

**Frontend**
- `frontend/src/pages/admin/AdminCategories.jsx` — Bug #2 (conflict-resolution modal: Cancel / Reassign / Remove from products)
- `frontend/src/pages/admin/AdminMedia.jsx` — Bug #3 (PDF tab, stats card, icon, preview link)
- `frontend/src/pages/admin/AdminProductForm.jsx` — Bug #4 (responsive Benefits grid)
- `frontend/src/pages/PolicyPage.jsx` — Bug #5 (new file: public policy page)
- `frontend/src/App.jsx` — Bug #5 (new `/policy/:slug` route)
- `frontend/src/components/layout/Footer.jsx` — Bug #5 (dynamic policy links via `GET /policies`)

---

## 3. Database Changes

- **Schema**: `Media.type` enum extended from `['image','video']` to `['image','video','pdf']`.
- **Sentinel value**: products with their category removed (via Bug #2's "remove from products" action) get `category: 'uncategorized'` (satisfies the existing `required: true` String field — no schema change needed).
- No migrations needed for existing data — both changes are additive/backward compatible.
- **QA test data removed** (post-verification): 3 test products (incl. one with an orphaned `category: 'qa-skincare'` reference pre-dating this fix), 4 test coupons, 1 test order (`AV41261837`), 2 test users, 1 test newsletter subscriber, and all test categories created during this round. Final state verified clean: 0 orders, 0 categories, 0 products, 0 coupons, totalRevenue=0.

---

## 4. API Changes

- **`DELETE /api/categories/:id`**
  - If the category has 0 products → deletes directly (unchanged behavior), now returns `{ success, message, productsUpdated: 0 }`.
  - If the category has products and no `action` in body → **409** `{ success: false, requiresAction: true, message, productCount, categoryName, categorySlug }`.
  - `{ action: 'reassign', targetSlug }` → moves all products to `targetSlug`, then deletes. 400 if `targetSlug` missing/same as current; 404 if target category doesn't exist.
  - `{ action: 'unassign' }` → sets all products' `category` to `'uncategorized'`, then deletes.

- **`POST /api/media/upload`** — now accepts `application/pdf` (previously rejected with 400). Response `media[].type` can now be `'pdf'`.
- **`GET /api/media`** — `type` query param now accepts `pdf`; `stats` response includes a new `pdfs` count.

- **Global error handler** — any route hitting `Model.findById()`/etc. with a malformed ObjectId now returns `400 { success: false, message: "Invalid ID" }` instead of a raw Mongoose 500 stack trace. (Existing `/products/:id` 404-for-invalid-id behavior is unaffected — it validates before querying.)

- No changes to existing response shapes for success cases other than the additive `productsUpdated`/`pdfs` fields above.

---

## 5. Test Results

All tests run live against backend (`:5001`) + local MongoDB + frontend (`:5173`).

| Area | Test | Result |
|---|---|---|
| Revenue | COD order re-marked `delivered` → `paymentStatus` pending→paid | ✅ `paid` |
| Revenue | Dashboard `totalRevenue` / `todayRevenue` | ✅ ₹0 → ₹899 |
| Revenue | `monthlyRevenue` chart includes the order | ✅ June 2026: revenue=899, orders=1 |
| Categories | Delete category with 2 products, no action | ✅ 409 `requiresAction`, `productCount: 2` |
| Categories | `action: reassign` → target category | ✅ products moved, category deleted |
| Categories | `action: unassign` | ✅ products → `category: 'uncategorized'`, category deleted |
| Categories | Delete category with 0 products | ✅ direct 200 delete (unchanged) |
| Categories | `reassign` missing/same `targetSlug` | ✅ 400 |
| Categories | `reassign` nonexistent `targetSlug` | ✅ 404 |
| Media/PDF | Upload `.pdf` | ✅ `type: 'pdf'`, `format: 'pdf'`, URL ends in `.pdf` |
| Media/PDF | `GET /media?type=pdf` + stats | ✅ listed, `stats.pdfs: 1` |
| Media/PDF | Delete PDF | ✅ removed from DB + Cloudinary |
| Policies | `GET /policies` (footer source) | ✅ returns active policies |
| Policies | `GET /policies/:slug` | ✅ 200 with content; unknown slug → 404 |
| Policies | Frontend `/policy/:slug` (existing & unknown) | ✅ 200 (SPA renders page or "not found" UI) |
| API Validation | Invalid ObjectId on categories/media/orders/policies | ✅ all return `400 {"message":"Invalid ID"}` |
| API Validation | `/products/:id` invalid id (existing pattern) | ✅ still 404 (unaffected) |
| Mobile | Benefits repeater responsive classes | ✅ code-verified (`grid-cols-1 sm:grid-cols-2 lg:grid-cols-6`); not visually tested (no browser automation available) |
| Build | `npm run build` (frontend) | ✅ succeeds, 1841 modules transformed |

---

## 6. Remaining Issues

- **Bug #3 / PDF "Preview"**: Upload, listing, metadata, and delete all work correctly, and Cloudinary returns the correct `Content-Type: application/pdf`. However, the test Cloudinary account currently returns **401 Unauthorized** when fetching `raw`-type delivery URLs directly — this is Cloudinary's account-level **"Allow delivery of PDF and ZIP files"** security setting (disabled by default on newer accounts), not a code issue. To fully enable PDF preview in the Media Library, enable that setting in the Cloudinary dashboard (Settings → Security).
- **Bug #4 / Mobile**: Fixed via responsive Tailwind classes and confirmed via production build, but not visually verified in a real browser at 320/375/768px (no browser automation tool available in this environment).
- Pre-existing items noted in `QA_REPORT.md` but out of scope for this round (unchanged): Homepage Builder not implemented; `deleteProduct` is a soft-delete (`isActive:false`) with no UI to view/restore inactive products; `discountPercent` virtual missing on single-product GET; `paymentMethod` filter unused in `getAllOrders`.
