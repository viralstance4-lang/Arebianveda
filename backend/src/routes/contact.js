const express = require('express');
const router = express.Router();
const { sendBrevoEmail } = require('../services/brevoMailer');

// POST /api/contact — public, no auth required
router.post('/', async (req, res) => {
  const { name, email, subject, message } = req.body;

  if (!name?.trim() || !email?.trim() || !message?.trim()) {
    return res.status(400).json({ success: false, message: 'Name, email and message are required.' });
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ success: false, message: 'Please provide a valid email address.' });
  }

  if (!process.env.BREVO_API_KEY) {
    console.warn('[Contact] BREVO_API_KEY not configured — contact form submission skipped');
    return res.json({ success: true, message: 'Message received. We will get back to you shortly.' });
  }

  const businessEmail = process.env.CONTACT_EMAIL || process.env.SMTP_USER;
  const fromEmail = process.env.FROM_EMAIL || process.env.SMTP_USER;

  await sendBrevoEmail({
    to: businessEmail,
    replyTo: email,
    fromName: 'Arebianveda Contact',
    fromEmail,
    subject: `[Contact Form] ${subject?.trim() || 'New Message'} — from ${name}`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#0a0a0a;color:#fff;padding:32px;border-radius:12px;">
        <h2 style="color:#D4AF37;margin-bottom:24px;">New Contact Form Submission</h2>
        <table style="width:100%;border-collapse:collapse;">
          <tr><td style="padding:8px 0;color:rgba(255,255,255,0.5);width:100px;">Name</td><td style="padding:8px 0;color:#fff;">${name}</td></tr>
          <tr><td style="padding:8px 0;color:rgba(255,255,255,0.5);">Email</td><td style="padding:8px 0;"><a href="mailto:${email}" style="color:#D4AF37;">${email}</a></td></tr>
          <tr><td style="padding:8px 0;color:rgba(255,255,255,0.5);">Subject</td><td style="padding:8px 0;color:#fff;">${subject || '—'}</td></tr>
        </table>
        <div style="margin-top:20px;padding:16px;background:#1a1a1a;border-radius:8px;border-left:3px solid #D4AF37;">
          <p style="color:rgba(255,255,255,0.5);font-size:12px;margin:0 0 8px;text-transform:uppercase;letter-spacing:1px;">Message</p>
          <p style="color:#fff;line-height:1.6;margin:0;">${message.replace(/\n/g, '<br>')}</p>
        </div>
        <p style="margin-top:24px;color:rgba(255,255,255,0.3);font-size:12px;">
          Reply directly to this email to respond to ${name}.
        </p>
      </div>
    `,
  });

  // Auto-reply to the sender
  await sendBrevoEmail({
    to: email,
    fromName: 'Arebianveda',
    fromEmail,
    subject: 'We received your message — Arebianveda',
    html: `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#0a0a0a;color:#fff;padding:32px;border-radius:12px;">
        <h2 style="color:#D4AF37;">Thank you, ${name}! 🙏</h2>
        <p style="color:rgba(255,255,255,0.7);line-height:1.6;">
          We've received your message and will get back to you within 24 hours.
        </p>
        <div style="margin:20px 0;padding:16px;background:#1a1a1a;border-radius:8px;border-left:3px solid #D4AF37;">
          <p style="color:rgba(255,255,255,0.4);font-size:12px;margin:0 0 8px;">Your message:</p>
          <p style="color:rgba(255,255,255,0.8);margin:0;line-height:1.6;">${message.replace(/\n/g, '<br>')}</p>
        </div>
        <p style="color:rgba(255,255,255,0.4);font-size:12px;">
          © ${new Date().getFullYear()} Arebianveda. All rights reserved.
        </p>
      </div>
    `,
  });

  res.json({ success: true, message: "Message sent! We'll reply within 24 hours. ✨" });
});

module.exports = router;
