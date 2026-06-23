const { Resend } = require('resend');

const sendResendEmail = async ({ to, subject, html, fromName, fromEmail, replyTo }) => {
  if (!process.env.RESEND_API_KEY) {
    console.log('[Email] Skipped — RESEND_API_KEY not set');
    return;
  }

  const resend = new Resend(process.env.RESEND_API_KEY);

  const from = fromName && fromEmail
    ? `${fromName} <${fromEmail}>`
    : fromEmail || `Arebianveda <${process.env.FROM_EMAIL}>`;

  const payload = { from, to, subject, html };
  if (replyTo) payload.replyTo = replyTo;

  const { data, error } = await resend.emails.send(payload);

  if (error) throw new Error(`Resend error: ${JSON.stringify(error)}`);

  return data;
};

module.exports = { sendResendEmail };
