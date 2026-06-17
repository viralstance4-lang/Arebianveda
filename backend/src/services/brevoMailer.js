// Sends transactional email via Brevo's HTTPS API instead of SMTP.
// Render (and several other PaaS hosts) block outbound SMTP ports (587/465/25),
// so the SMTP relay times out in production even though it works locally.
// The HTTP API uses port 443, which is never blocked.
const BREVO_API_URL = 'https://api.brevo.com/v3/smtp/email';

const sendBrevoEmail = async ({ to, subject, html, fromName, fromEmail, replyTo }) => {
  if (!process.env.BREVO_API_KEY) {
    console.log('[Email] Skipped — BREVO_API_KEY not set');
    return;
  }

  const payload = {
    sender: { name: fromName, email: fromEmail },
    to: [{ email: to }],
    subject,
    htmlContent: html,
  };
  if (replyTo) payload.replyTo = { email: replyTo };

  const response = await fetch(BREVO_API_URL, {
    method: 'POST',
    headers: {
      accept: 'application/json',
      'api-key': process.env.BREVO_API_KEY,
      'content-type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errBody = await response.text();
    throw new Error(`Brevo API ${response.status}: ${errBody}`);
  }

  return response.json();
};

module.exports = { sendBrevoEmail };
