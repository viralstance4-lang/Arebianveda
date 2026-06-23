const { SiteSettings } = require('../models/ShippingSettings');
const { sendResendEmail } = require('./resendMailer');

const sendOrderConfirmationEmail = async (order, email) => {
  if (!process.env.RESEND_API_KEY) {
    console.log('[Email] Skipped — RESEND_API_KEY not set');
    return;
  }

  // ── Fetch brand logo + name from DB ──────────────────────────────────────────
  const site = await SiteSettings.findOne().lean();
  const brandName = site?.logoAlt || process.env.FROM_NAME || 'Arebianveda';

  // Convert relative logo path → absolute URL so email clients can load it
  let logoUrl = site?.logoUrl || '';
  if (logoUrl && !logoUrl.startsWith('http')) {
    const backendBase = process.env.BACKEND_URL || `http://localhost:${process.env.PORT || 5000}`;
    logoUrl = `${backendBase}${logoUrl}`;
  }

  // Build logo block: real image if available, initials circle as fallback
  const initials = brandName.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
  const logoBlock = logoUrl
    ? `<img src="${logoUrl}" alt="${brandName}" style="max-height:70px;max-width:220px;object-fit:contain;display:block;margin:0 auto;" />`
    : `<div style="display:inline-block;width:56px;height:56px;border-radius:50%;background:linear-gradient(135deg,#D4AF37,#F5E17A);line-height:56px;font-weight:bold;color:#0a0a0a;font-size:18px;">${initials}</div>`;

  const itemsHtml = order.items.map(item => `
    <tr>
      <td style="padding:8px;border-bottom:1px solid #2a2a2a;">
        ${item.name}
        ${item.isFreeGift ? '<span style="display:inline-block;margin-left:6px;padding:2px 8px;font-size:10px;font-weight:bold;text-transform:uppercase;letter-spacing:0.5px;color:#0a0a0a;background:#D4AF37;border-radius:999px;">🎁 Free Gift</span>' : ''}
      </td>
      <td style="padding:8px;border-bottom:1px solid #2a2a2a;text-align:center;">${item.quantity}</td>
      <td style="padding:8px;border-bottom:1px solid #2a2a2a;text-align:right;">
        ${item.isFreeGift
          ? `<span style="color:rgba(255,255,255,0.3);text-decoration:line-through;margin-right:6px;">₹${(item.originalPrice || 0).toLocaleString('en-IN')}</span><span style="color:#4ade80;">FREE</span>`
          : `₹${(item.price * item.quantity).toLocaleString('en-IN')}`}
      </td>
    </tr>
  `).join('');

  const html = `
    <!DOCTYPE html>
    <html>
    <head><meta charset="utf-8"><title>Order Confirmed — Arebianveda</title></head>
    <body style="margin:0;padding:0;background:#0a0a0a;font-family:Arial,sans-serif;color:#fff;">
      <div style="max-width:600px;margin:0 auto;padding:40px 20px;">

        <!-- Logo -->
        <div style="text-align:center;margin-bottom:32px;">
          ${logoBlock}
          <h1 style="margin:12px 0 0;font-size:20px;color:#D4AF37;letter-spacing:2px;text-transform:uppercase;">${brandName}</h1>
        </div>

        <!-- Banner -->
        <div style="background:linear-gradient(135deg,#1a1a1a,#2a2a2a);border:1px solid rgba(212,175,55,0.2);border-radius:16px;padding:32px;text-align:center;margin-bottom:24px;">
          <div style="font-size:48px;margin-bottom:16px;">🌿</div>
          <h2 style="margin:0 0 8px;font-size:22px;color:#fff;">Order Confirmed!</h2>
          <p style="margin:0;color:rgba(255,255,255,0.6);font-size:14px;">Thank you for your order. Your Ayurvedic wellness essentials are being prepared with care.</p>
          <div style="display:inline-block;background:rgba(212,175,55,0.1);border:1px solid rgba(212,175,55,0.3);border-radius:8px;padding:8px 20px;margin-top:16px;">
            <span style="color:#D4AF37;font-weight:bold;font-size:16px;">#${order.orderId}</span>
          </div>
        </div>

        <!-- Order Details -->
        <div style="background:#1a1a1a;border-radius:12px;padding:24px;margin-bottom:24px;">
          <h3 style="margin:0 0 16px;font-size:14px;color:rgba(255,255,255,0.5);text-transform:uppercase;letter-spacing:1px;">Order Details</h3>
          <table style="width:100%;border-collapse:collapse;">
            <thead>
              <tr style="border-bottom:1px solid #333;">
                <th style="padding:8px;text-align:left;font-size:12px;color:rgba(255,255,255,0.4);">ITEM</th>
                <th style="padding:8px;text-align:center;font-size:12px;color:rgba(255,255,255,0.4);">QTY</th>
                <th style="padding:8px;text-align:right;font-size:12px;color:rgba(255,255,255,0.4);">TOTAL</th>
              </tr>
            </thead>
            <tbody style="font-size:14px;">${itemsHtml}</tbody>
          </table>
          <div style="border-top:1px solid #333;margin-top:16px;padding-top:16px;">
            ${order.discount > 0 ? `<div style="display:flex;justify-content:space-between;margin-bottom:8px;color:#4ade80;font-size:14px;"><span>Discount (${order.couponCode})</span><span>-₹${order.discount.toLocaleString('en-IN')}</span></div>` : ''}
            <div style="display:flex;justify-content:space-between;font-size:16px;font-weight:bold;color:#fff;">
              <span>Total</span><span style="color:#D4AF37;">₹${order.total.toLocaleString('en-IN')}</span>
            </div>
          </div>
        </div>

        <!-- Shipping Address -->
        <div style="background:#1a1a1a;border-radius:12px;padding:24px;margin-bottom:24px;">
          <h3 style="margin:0 0 12px;font-size:14px;color:rgba(255,255,255,0.5);text-transform:uppercase;letter-spacing:1px;">Delivering To</h3>
          <p style="margin:0;font-size:14px;line-height:1.6;color:rgba(255,255,255,0.7);">
            ${order.shippingAddress.name}<br>
            ${order.shippingAddress.line1}${order.shippingAddress.line2 ? ', ' + order.shippingAddress.line2 : ''}<br>
            ${order.shippingAddress.city}, ${order.shippingAddress.state} — ${order.shippingAddress.pincode}<br>
            📱 ${order.shippingAddress.phone}
          </p>
          <div style="margin-top:12px;padding:8px 12px;background:rgba(212,175,55,0.1);border-radius:8px;display:inline-block;font-size:13px;color:#D4AF37;">
            ${order.paymentMethod === 'cod' ? '💰 Payment: Cash on Delivery' : order.paymentMethod === 'partial_cod' ? '⚡ Partial COD — Advance paid, remaining due on delivery' : '✅ Payment: Paid Online'}
          </div>
        </div>

        <!-- Footer -->
        <div style="text-align:center;color:rgba(255,255,255,0.3);font-size:12px;">
          <p>Questions? WhatsApp us at <a href="https://wa.me/919911100480" style="color:#D4AF37;">+91 991 110 0480</a></p>
          <p style="margin-top:8px;">© ${new Date().getFullYear()} Arebianveda. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  const subject = `✨ Order Confirmed — #${order.orderId} | ${brandName}`;

  await sendResendEmail({
    to: email,
    subject,
    html,
    fromName: brandName,
    fromEmail: process.env.FROM_EMAIL,
  });
  console.log(`[Email] Confirmation sent to ${email} via Resend`);
};

module.exports = { sendOrderConfirmationEmail };
