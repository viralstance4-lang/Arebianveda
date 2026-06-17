# Arebianveda Admin Dashboard — QA Audit Report

**Date:** 2026-06-12
**Scope:** Full-stack QA of the MERN admin dashboard (Products, Categories, Orders, Users, Reviews, Coupons, FAQs, Policies, Media, Logos, Settings) plus storefront integration points (Checkout, Order Tracking, Contact, Newsletter, Policy pages).
**Method:** Live testing against the running backend (`localhost:5001`) and local MongoDB instance via authenticated API calls (admin JWT + regular-user JWT), combined with source review to confirm root causes and frontend wiring. No browser automation was available, so every "working" item below was verified end-to-end at the API/DB layer and cross-checked against the React code that calls it.

---

## A. Working Features (Verified)

| Module | What was verified |
|---|---|
| **Auth** | Register, login, JWT issuance, `protect`/`adminOnly` middleware, profile update. Role cannot be set via register/profile (no privilege escalation). |
| **Products** | Full CRUD, Cloudinary image upload (`/products/upload/images`, field `images`, max 5, 5MB limit, image-only filter), slug auto-generation, auto-pricing from `comparePrice` + `discountType`/`discountValue` (percentage capped 99%, fixed capped at comparePrice-1), soft delete, search, category filter, pagination. |
| **Categories** | CRUD, duplicate-slug rejection, slug rename auto-propagates to all products referencing the old slug. |
| **Reviews** | Create, approve (admin), delete, automatic rating recalculation via `Review.recalculateForProduct`. |
| **FAQs** | CRUD + drag-reorder (fixed in prior session — see commit notes). |
| **Policies** | CRUD with rich-text editor (bold/italic/lists/headings). |
| **Logos** | CRUD with multipart image upload. |
| **Media Library** | Image + video upload to Cloudinary, regex-escaped search, delete (Cloudinary + DB), pagination, size/type stats. |
| **Coupons** | Percentage / fixed / free-gift types, auto-apply and manual-apply modes, full validation rules, atomic `findOneAndUpdate` usage-limit enforcement (race-condition safe), free-gift item auto-injected into order with `price:0, isFreeGift:true`. |
| **Orders — creation** | COD and Razorpay order creation, dynamic shipping (`codChargeBelow`/`codChargeAbove` vs `codThreshold`), stock decrement (free gifts decrement stock but not `sold`), out-of-stock validation (HTTP 400 with clear message), guest checkout. |
| **Orders — admin management** | `GET /orders/admin/all` (search by orderId/name/phone/email, `status` filter, pagination), `GET /orders/admin/:id` detail, `PUT /orders/admin/:id/status` (confirmed→shipped→delivered→cancelled, tracking number/URL, `statusHistory` append), `DELETE /orders/admin/:id` (stock restoration, with guard against double-restoration on already-cancelled orders). |
| **Order tracking** | `GET /orders/track/:orderId` — public, returns order + statusHistory for valid IDs, 404 for invalid. |
| **Dashboard (counts)** | `totalOrders`, `todayOrders`, `pendingOrders`, `recentOrders`, `topProducts`, `categorySales` all return correct, verified values. |
| **Contact form** | Validation (required fields, email format), graceful no-op + success response when `BREVO_API_KEY` is blank. |
| **Newsletter** | Subscribe with upsert (re-subscribe doesn't error), validation for missing email. |
| **Customers (AdminUsers)** | `/admin/customers` correctly merges registered users + guest buyers (from orders) + newsletter subscribers; `type` filter and `search` both work. |
| **Security** | Every admin route returns 401 (no token), 401 (malformed token / no `Bearer` prefix), or 403 (valid non-admin token) as appropriate. Frontend `AdminRoute.jsx` mirrors this with a 403 page. No IDOR found (regular user cannot fetch another user's/guest's order by `_id`). |
| **Razorpay (unconfigured)** | `POST /payments/razorpay/create` returns a clean `500 "Payment gateway not configured. Please contact support."` instead of crashing — graceful degradation confirmed. |

---

## B. Broken Features

### B1. Dashboard "Total Revenue" / "Today's Revenue" always show ₹0
- **Module:** Admin Dashboard / Orders
- **Issue:** `GET /orders/admin/stats` returns `totalRevenue: 0` and `todayRevenue: 0` regardless of how many orders exist or are delivered. Verified with 3 real test orders (₹899 + ₹277 + ₹178), one of which was progressed all the way to `orderStatus: "delivered"` — revenue stayed ₹0.
- **Root Cause:** `getDashboardStats` computes revenue via `Order.aggregate([{ $match: { paymentStatus: 'paid' } }, ...])`. For COD orders (currently the *only* functional payment method, since Razorpay keys are blank), `paymentStatus` is set to `'pending'` at creation and **never transitioned to `'paid'` anywhere in the codebase** — not even when `orderStatus` becomes `'delivered'`. Since this is a COD-first store, total/today revenue will permanently read ₹0.
- **Severity:** **HIGH** — this is the headline metric on the admin dashboard and is meaningless for the store's primary payment method.
- **Files To Fix:**
  - `backend/src/controllers/orderController.js` — `updateOrderStatus` (~line 213): when `orderStatus` transitions to `delivered` for a COD order, set `paymentStatus = 'paid'`. Alternatively, add an explicit admin "Mark Payment Received" action for COD orders.
  - `backend/src/controllers/orderController.js` — `getDashboardStats` (~lines 283–290): revenue aggregation relies on this flag, so it self-corrects once the above is fixed.

### B2. Deleting a Category orphans its products' `category` field
- **Module:** Categories / Products / Database integrity
- **Issue:** Deleting a category that products still reference leaves those products with a `category` value pointing to a slug that no longer exists anywhere.
- **Root Cause:** `deleteCategory` (`categoryController.js:51-55`) does `Category.findByIdAndDelete(req.params.id)` with **no check** for products referencing that category and no reassignment/cleanup.
- **Reproduction (live):** Created category "QA Skincare" (slug `qa-skincare`), assigned 2 products to it, deleted the category via `DELETE /categories/:id` → succeeded with `200 {success:true}`. Afterward `GET /products?category=qa-skincare` still returned both products with `category: "qa-skincare"`, but `GET /categories/admin` returns an empty list — the category metadata (name, emoji, color) is gone while the products still "belong" to it.
- **Severity:** **MEDIUM** — no crash today (no public CategoryPage consumes this), but it's a real data-integrity bug that will surface the moment a category-based storefront page or Homepage Builder (currently missing — see D1) is built, and pollutes the DB with dangling references.
- **Files To Fix:** `backend/src/controllers/categoryController.js` — `deleteCategory`: either (a) block deletion with a 400 if `Product.countDocuments({ category: category.slug }) > 0`, or (b) reassign affected products to a default/"uncategorized" category before deleting.

### B3. Media Library rejects PDF uploads ("print book" assets)
- **Module:** Media Library / File Uploads
- **Issue:** Uploading a PDF via `POST /media/upload` fails with `400 {"success":false,"message":"Only image and video files are allowed"}`.
- **Reproduction (live):** Uploaded a minimal valid `.pdf` (mimetype `application/pdf`) → rejected by the multer `fileFilter`.
- **Root Cause:** `backend/src/config/cloudinary.js` — `uploadMedia`'s `fileFilter` (lines 76-82) only accepts `image/*` and `video/*` mimetypes; `mediaStorage`'s Cloudinary `resource_type` logic (line 68) also only branches between `video`/`image`, with no `raw` (PDF/document) handling.
- **Severity:** **MEDIUM** — this is an explicit requirement in the QA brief ("print book PDFs"). The error message is at least clear/graceful (no crash), but the capability itself is missing.
- **Files To Fix:** `backend/src/config/cloudinary.js` (`uploadMedia` fileFilter + `mediaStorage` params — add `application/pdf` → `resource_type: 'raw'`), `backend/src/controllers/mediaController.js` (`uploadMedia` — handle `type: 'document'`/`pdf` in the saved `Media` doc), `backend/src/models/Media.js` (`type` enum), and `frontend/src/pages/admin/AdminMedia.jsx` (preview/icon handling for non-image/video types).

---

## C. Partial / Inconsistent Features

### C1. `discountPercent` virtual missing from single-product API response
- **Module:** Products API
- **Issue:** `GET /products` (list) includes `discountPercent` on each item; `GET /products/:id` (single product — used by the Product Detail Page) does **not** include it.
- **Root Cause:** `Product.js` defines `discountPercent` as a virtual with `toJSON: { virtuals: true }` but **not** `toObject: { virtuals: true }`. `getProduct` (single) calls `.toObject()`, stripping the virtual; `getAllProducts` returns raw Mongoose documents (virtuals included via `toJSON`).
- **Severity:** LOW — cosmetic ("X% OFF" badge may be missing/different on PDP vs. listing pages).
- **Files To Fix:** `backend/src/models/Product.js` (add `toObject: { virtuals: true }` to schema options) **or** `backend/src/controllers/productController.js` `getProduct` (remove the `.toObject()` call).

### C2. `confirmationEmailSent` flag is set even when no email is actually sent
- **Module:** Orders / Email
- **Issue:** Every COD order in the DB shows `confirmationEmailSent: true`, even though `BREVO_API_KEY` is blank and `sendOrderConfirmationEmail` silently no-ops (logs `[Email] Skipped — BREVO_API_KEY not set` and returns).
- **Root Cause:** `orderController.js` (~lines 116-121) sets `confirmationEmailSent: true` via an atomic claim **before** calling `sendOrderConfirmationEmail`, and the email function doesn't report success/failure back to update the flag.
- **Severity:** LOW — doesn't break functionality (the atomic-claim pattern correctly prevents duplicate sends *once Brevo is configured*), but the field name is misleading for anyone debugging "why didn't the customer get an email" — the DB will say "sent" when nothing was sent.
- **Files To Fix:** `backend/src/controllers/orderController.js` (`createOrder`) — only set `confirmationEmailSent: true` after `sendOrderConfirmationEmail` resolves successfully (or rename the field to reflect "claimed" vs. "delivered" semantics).

### C3. `categorySales.revenue` vs. `totalRevenue` use different, inconsistent logic
- **Module:** Admin Dashboard
- **Issue:** On the same dashboard payload, `stats.totalRevenue` = ₹0 while `categorySales[0].revenue` = ₹1176 for the *same* set of orders.
- **Root Cause:** `totalRevenue`/`todayRevenue` are computed from `Order.aggregate` filtered by `paymentStatus:'paid'` (see B1), while `categorySales.revenue` is computed independently from `Product.aggregate` using `price * sold` with **no payment-status filter at all**.
- **Severity:** LOW (consequence of B1, but worth fixing as its own consistency item so both numbers use the same definition of "revenue" once B1 is resolved).
- **Files To Fix:** `backend/src/controllers/orderController.js` — `getDashboardStats` (`categorySales` aggregation, ~lines 311-315).

---

## D. Missing Features

### D1. Homepage Builder is not implemented
- **Module:** Homepage Builder
- **Issue:** No admin UI, route, or backend model/controller exists for managing homepage sections (hero, featured categories, featured products, banners, etc.). The admin sidebar has no "Homepage" nav item, and no `HomepageSection`-type model exists in `backend/src/models/`.
- **Severity:** N/A (scope/feature-completeness item, not a bug) — flagged per QA Phase 10 requirement.
- **Files To Fix (if building):** New model (e.g., `backend/src/models/HomepageSection.js`), controller + routes, admin page (`frontend/src/pages/admin/AdminHomepage.jsx`), and `HomePage.jsx` would need to consume it dynamically instead of hardcoded sections.

### D2. No public Policy pages — Footer links are dead
- **Module:** Policies / Footer / Storefront routing
- **Issue:** `AdminPolicies` CRUD works fully (create/edit/delete policies with rich text), but there is no public route to view them. `Footer.jsx` hardcodes links to `/privacy-policy`, `/terms`, `/return-policy`, `/shipping-policy`, `/disclaimer` — **none of these routes exist** in `App.jsx`, so every footer policy link 404s on the storefront.
- **Severity:** MEDIUM — every visitor-facing legal link is broken.
- **Files To Fix:** Add `PolicyPage.jsx` + a `/policy/:slug` (or matching the hardcoded paths) route in `App.jsx`; update `Footer.jsx` to source links dynamically from `GET /policies` (published only) instead of hardcoding paths.

### D3. Order tracking has a working API but no frontend page
- **Module:** Order Tracking
- **Issue:** `GET /orders/track/:orderId` is fully functional (verified: returns order summary + statusHistory + tracking info for valid IDs, 404 for invalid), but no page in `frontend/src/pages` calls it — a customer has no way to look up their order by ID from the storefront UI.
- **Severity:** LOW-MEDIUM — feature exists at API layer only.
- **Files To Fix:** New `frontend/src/pages/TrackOrderPage.jsx` + route in `App.jsx`, likely linked from `Footer.jsx` or the order-confirmation email.

---

## E. Security Issues

No exploitable security issues were found. Specifically verified:

| Test | Result |
|---|---|
| Admin route, no token | `401 "Not authorized, no token"` ✅ |
| Admin route, malformed JWT | `401 "Token invalid or expired"` ✅ |
| Admin route, header without `Bearer` prefix | `401 "Not authorized, no token"` ✅ |
| Admin route, valid token but `role:"user"` | `403 "Admin access required"` ✅ (tested on Orders, Categories, Coupons, Products) |
| `role:"admin"` injected into register/profile body | Ignored — user created with `role:"user"` ✅ |
| Regular user fetching another guest's order by `_id` | `404 "Order not found"` (no data leak) ✅ |
| Frontend `/admin/*` routes, non-admin user | `AdminRoute.jsx` renders a 403 page client-side, mirroring backend ✅ |

**One related (non-exploitable) finding** is documented under G1 — invalid `ObjectId` inputs leak internal Mongoose model/field names in error messages (information disclosure, not an access-control bypass).

---

## F. Database Issues

### F1. Orphaned `category` references after category deletion
- See **B2** above — duplicated here per the report structure. Root cause and fix are identical.

### F2. Soft-deleted products are permanently invisible (by design, but undocumented)
- **Module:** Products / Database
- **Issue:** `deleteProduct` sets `isActive: false` (soft delete) rather than removing the document — appropriate for preserving order history — but `getAllProducts` (used by both the storefront and `AdminProducts.jsx` via `GET /products?limit=100`) **always filters `isActive: true`**. The result: soft-deleted products vanish from *every* admin view with no way to list, restore, or permanently purge them. They remain in MongoDB indefinitely.
- **Severity:** LOW (data isn't lost, but it's invisible and will accumulate). Cross-referenced with **H2** (dead "Inactive" badge code in the admin UI).
- **Files To Fix:** `backend/src/controllers/productController.js` (`getAllProducts` — add an admin-only `includeInactive`/`status=inactive` query option), `frontend/src/pages/admin/AdminProducts.jsx` (add a "Trash"/"Inactive" tab using that option, with restore + permanent-delete actions).

---

## G. API Issues

### G1. Invalid ObjectId inputs return raw Mongoose `CastError` with HTTP 500
- **Module:** Global error handling (affects multiple admin endpoints)
- **Issue:** Passing a non-ObjectId string as `:id` to certain endpoints returns the raw Mongoose error message with status 500.
- **Reproduction (live):**
  - `GET /orders/admin/not-a-valid-objectid` → `500 {"success":false,"message":"Cast to ObjectId failed for value \"not-a-valid-objectid\" (type string) at path \"_id\" for model \"Order\""}`
  - `PUT /categories/not-a-valid-objectid` → same pattern, `model "Category"`
  - (By contrast, `GET /products/:id` handles this gracefully and returns a clean `404 "Product not found"` — so the fix pattern already exists elsewhere in the codebase.)
- **Root Cause:** `server.js`'s global error handler (lines 201-219) explicitly handles `ValidationError`, duplicate-key (`11000`), and `JsonWebTokenError`, but **not** `CastError` — it falls through to the generic `res.status(err.status || 500).json({ message: err.message })`, which both (a) returns the wrong status code (500 instead of 400) and (b) leaks internal Mongoose model/field names to the client.
- **Severity:** LOW-MEDIUM — information disclosure + incorrect status codes (could trigger false-positive 5xx alerts in monitoring for what is really a client input error).
- **Files To Fix:** `backend/server.js` — add a `CastError` branch to the global error handler returning `400 {"success":false,"message":"Invalid ID format"}`.

### G2. `paymentMethod` filter is silently ignored on `GET /orders/admin/all`
- **Module:** Orders API
- **Issue:** Passing `?paymentMethod=razorpay` to `GET /orders/admin/all` returns **all** orders regardless of payment method (verified: 3/3 orders returned including 2 `cod` orders).
- **Root Cause:** `getAllOrders` (`orderController.js:176-202`) destructures only `{ status, page, limit, search }` from `req.query` — `paymentMethod` is never read or applied to the Mongo query.
- **Severity:** LOW — `AdminOrders.jsx` doesn't currently send this param (no UI filter for payment method exists), so there's no user-facing breakage today. Flagged as an API completeness gap for anyone building a payment-method filter UI later, or for direct API consumers.
- **Files To Fix:** `backend/src/controllers/orderController.js` — `getAllOrders` (add `if (paymentMethod) query.paymentMethod = paymentMethod;`).

### G3. Intermittent Cloudinary "Request Timeout" on multi-file media uploads
- **Module:** Media Library / Cloudinary
- **Issue:** A 2-file media upload occasionally failed in ~5s with `{"success":false,"message":"Request Timeout"}` (HTTP-equivalent `499`), then succeeded on immediate retry (2.4s).
- **Root Cause:** Cloudinary SDK's default 60s upload timeout combined with a transient network blip; `mediaController.js`'s `uploadMedia` has no retry logic and surfaces the raw Cloudinary error string.
- **Severity:** LOW — appears to be a transient/environmental issue, not a consistent bug, but the error message ("Request Timeout") is unhelpful to an admin trying to upload files.
- **Files To Fix:** `backend/src/config/cloudinary.js` (consider an explicit, longer `timeout` option for media uploads), `backend/src/controllers/mediaController.js` (`uploadMedia` — catch and return a friendlier "Upload timed out, please retry" message; consider per-file try/catch so one slow file doesn't fail the whole batch).

---

## H. UI / UX Issues

### H1. AdminProductForm "Benefits" repeater is not mobile-responsive
- **Module:** Admin → Products → Add/Edit → Benefits section
- **Issue:** The Benefits repeater uses `grid-cols-6` with **no responsive breakpoints** — every other grid in the same file (and across all 9 admin pages with tables) correctly uses `grid-cols-1 sm:grid-cols-N` or wraps tables in `overflow-x-auto`. At 320–375px viewport widths, the "Benefit title" and "Description" inputs (`col-span-2` each, ~6 columns total) compress to roughly 45-50px wide — too narrow to type or read text like "100% Pure Himalayan Shilajit".
- **Root Cause:** `frontend/src/pages/admin/AdminProductForm.jsx:399` — `<div key={i} className="grid grid-cols-6 gap-2 items-start">` lacks `sm:`/breakpoint variants.
- **Severity:** MEDIUM — directly impacts editing product Benefits on a phone/tablet, a core admin task.
- **Files To Fix:** `frontend/src/pages/admin/AdminProductForm.jsx:399` — change to e.g. `grid grid-cols-1 sm:grid-cols-6 gap-2` (stack rows vertically on mobile) or restructure as flex with wrapping.

### H2. "Inactive" product badge is dead code
- **Module:** Admin → Products list
- **Issue:** `AdminProducts.jsx:109-110` renders an "Inactive"/red badge when `p.isActive === false`, but this can never trigger — `GET /products` (the endpoint this page calls) always filters `isActive: true` server-side, so no inactive product ever reaches this component.
- **Root Cause:** Same as **F2** — soft-deleted products are filtered out before reaching the UI, leaving orphaned conditional-rendering code that implies a "restore" workflow which doesn't exist.
- **Severity:** LOW — dead code / misleading to future developers, no user-facing impact today.
- **Files To Fix:** Resolve alongside F2 (`frontend/src/pages/admin/AdminProducts.jsx`).

---

## Summary Table — All Bugs by Severity

| # | Severity | Module | Issue |
|---|---|---|---|
| B1 | **HIGH** | Dashboard / Orders | Total/Today Revenue always ₹0 for COD orders |
| B2 / F1 | MEDIUM | Categories / Products | Deleting a category orphans product `category` references |
| B3 | MEDIUM | Media Library | PDF ("print book") uploads rejected |
| D2 | MEDIUM | Policies / Footer | Public policy links 404 (no PolicyPage/route) |
| H1 | MEDIUM | AdminProductForm | Benefits repeater unusable at 320-375px |
| D3 | LOW-MED | Order Tracking | Working API, no frontend page |
| G1 | LOW-MED | Global error handler | Raw Mongoose CastError + wrong status code |
| C1 | LOW | Products API | `discountPercent` missing on single-product GET |
| C2 | LOW | Orders / Email | `confirmationEmailSent` misleading when Brevo unconfigured |
| C3 | LOW | Dashboard | `categorySales.revenue` inconsistent with `totalRevenue` |
| F2 / H2 | LOW | Products | Soft-deleted products invisible forever; dead "Inactive" badge |
| G2 | LOW | Orders API | `paymentMethod` filter ignored (unused by UI) |
| G3 | LOW | Media / Cloudinary | Intermittent multi-file upload timeout |
| D1 | — | Homepage Builder | Not implemented (feature gap, per QA scope) |

---

## Test Data Note
This audit created live test records prefixed `QA*` (products "QA Test Shilajit Resin" / "QA Free Gift Sachet", category "QA Skincare" — now deleted to reproduce B2, coupon "QAFREEGIFT", 1 surviving order `AV41261837`, users `qaregular@example.com` / `qaescalate@example.com`, newsletter subscriber `qanewsletter@example.com`). Recommend cleaning these up (or running a DB reset) before any client demo or production deploy.
