const nodemailer = require('nodemailer');

const emailDisabled =
  process.env.NODE_ENV === 'test' || process.env.EMAIL_ENABLED === 'false';

let etherealTransporter = null;
const getEtherealTransporter = async () => {
  if (etherealTransporter) return etherealTransporter;
  const testAccount = await nodemailer.createTestAccount();
  etherealTransporter = nodemailer.createTransport({
    host: 'smtp.ethereal.email',
    port: 587,
    secure: false,
    auth: { user: testAccount.user, pass: testAccount.pass },
  });
  return etherealTransporter;
};

/**
 * Send an email via configured SMTP, or an Ethereal test inbox in dev.
 * A no-op when NODE_ENV=test or EMAIL_ENABLED=false.
 * @param {object} options { email, subject, message }
 */
const sendEmail = async (options) => {
  if (emailDisabled) {
    return { skipped: true };
  }

  let transporter;
  if (process.env.SMTP_HOST && process.env.SMTP_USER) {
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: process.env.SMTP_PORT,
      secure: process.env.SMTP_SECURE === 'true',
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    });
  } else {
    transporter = await getEtherealTransporter();
  }

  const message = {
    from: `${process.env.FROM_NAME || 'Generator Monitoring System'} <${
      process.env.FROM_EMAIL || 'noreply@gensys.com'
    }>`,
    to: options.email,
    subject: options.subject,
    text: options.message,
  };

  const info = await transporter.sendMail(message);
  console.log('Message sent: %s', info.messageId);
  if (!process.env.SMTP_HOST) {
    console.log('Preview URL: %s', nodemailer.getTestMessageUrl(info));
  }
  return info;
};

module.exports = sendEmail;
