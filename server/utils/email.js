import nodemailer from 'nodemailer';

let cachedTransporter = null;

function getTransporter() {
  if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) return null;
  if (cachedTransporter) return cachedTransporter;
  cachedTransporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: String(process.env.SMTP_SECURE || '').toLowerCase() === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
  return cachedTransporter;
}

export async function sendPasswordOtpEmail({ to, otp, accountType }) {
  const appName = process.env.APP_NAME || 'Shoppy';
  const transporter = getTransporter();
  const subject = `${appName} password change OTP`;
  const text = `Your ${appName} ${accountType} password change OTP is ${otp}. This code will expire in 10 minutes. If you did not request this, please ignore this email.`;
  const html = `<div style="font-family:Arial,sans-serif;line-height:1.6;color:#111827"><h2>${appName} password change OTP</h2><p>Your verification code is:</p><p style="font-size:28px;font-weight:800;letter-spacing:6px;margin:16px 0">${otp}</p><p>This code will expire in <strong>10 minutes</strong>.</p><p>If you did not request this, please ignore this email.</p></div>`;

  if (!transporter) {
    console.log(`[DEV OTP] ${accountType} ${to}: ${otp}`);
    return { sent: false, reason: 'SMTP is not configured' };
  }

  await transporter.sendMail({
    from: process.env.SMTP_FROM || process.env.SMTP_USER,
    to,
    subject,
    text,
    html,
  });
  return { sent: true };
}
