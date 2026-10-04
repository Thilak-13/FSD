const nodemailer = require('nodemailer');
const env = require('../config/env');

let activeTransporter = null;
let lastSentMail = null;

/**
 * Returns or initializes the active Nodemailer transporter.
 * In test environments (NODE_ENV === 'test'), uses JSON transport unless explicitly overridden.
 * When NODE_ENV !== 'test', requires SMTP configuration (SMTP_HOST and SMTP_USER).
 * If SMTP configuration is missing, fails loudly by logging an explicit error and throwing.
 */
const getTransporter = async () => {
  if (activeTransporter) {
    return activeTransporter;
  }

  const isTest = process.env.NODE_ENV === 'test';

  if (isTest) {
    activeTransporter = nodemailer.createTransport({
      jsonTransport: true,
    });
    return activeTransporter;
  }

  // Outside test environment: strictly validate required SMTP configuration
  const host =
    (process.env.SMTP_HOST !== undefined
      ? process.env.SMTP_HOST.trim()
      : env.SMTP_HOST && env.SMTP_HOST !== 'smtp.ethereal.email'
      ? env.SMTP_HOST.trim()
      : '');
  const user =
    (process.env.SMTP_USER !== undefined
      ? process.env.SMTP_USER.trim()
      : env.SMTP_USER
      ? env.SMTP_USER.trim()
      : '');
  const port = parseInt(
    process.env.SMTP_PORT || env.SMTP_PORT || '587',
    10
  );
  const pass = process.env.SMTP_PASS || env.SMTP_PASS || '';

  if (!host || !user) {
    const missing = [];
    if (!host) missing.push('SMTP_HOST');
    if (!user) missing.push('SMTP_USER');
    const errorMsg = `FATAL: SMTP configuration missing (${missing.join(
      ', '
    )}). When NODE_ENV is not 'test', SMTP configuration is required.`;
    console.error(errorMsg);
    throw new Error(errorMsg);
  }

  // If dummy test ethereal account specified in dev, create real test account on the fly
  if (user === 'test@ethereal.email') {
    try {
      const testAccount = await nodemailer.createTestAccount();
      activeTransporter = nodemailer.createTransport({
        host: testAccount.smtp.host,
        port: testAccount.smtp.port,
        secure: testAccount.smtp.secure,
        auth: {
          user: testAccount.user,
          pass: testAccount.pass,
        },
      });
      return activeTransporter;
    } catch (err) {
      console.error('Failed to create Ethereal test account:', err);
    }
  }

  activeTransporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: {
      user,
      pass,
    },
    tls: {
      rejectUnauthorized: false,
    },
  });

  return activeTransporter;
};

/**
 * Custom override for tests.
 */
const setTransporter = (transporter) => {
  activeTransporter = transporter;
};

/**
 * Reset transporter state (for tests).
 */
const resetTransporter = () => {
  activeTransporter = null;
  lastSentMail = null;
};

/**
 * Get info of last sent mail.
 */
const getLastSentMail = () => lastSentMail;

/**
 * Sends an email using Nodemailer.
 *
 * @param {object|string} optionsOrTo - Options object { to, subject, html, text, from } or recipient email
 * @param {string} [subject] - Subject if first argument is string
 * @param {string} [html] - HTML content if first argument is string
 * @param {string} [text] - Plain text content if first argument is string
 * @returns {Promise<any>} Result from transporter.sendMail
 */
const sendEmail = async (optionsOrTo, subject, html, text) => {
  const defaultFrom =
    env.SMTP_USER || process.env.SMTP_USER || 'no-reply@payverify.local';

  let mailOptions;
  if (typeof optionsOrTo === 'object' && optionsOrTo !== null) {
    mailOptions = {
      from: optionsOrTo.from || defaultFrom,
      to: optionsOrTo.to,
      subject: optionsOrTo.subject,
      html: optionsOrTo.html,
      text:
        optionsOrTo.text ||
        (optionsOrTo.html
          ? optionsOrTo.html.replace(/<[^>]*>?/gm, '').trim()
          : ''),
    };
  } else {
    mailOptions = {
      from: defaultFrom,
      to: optionsOrTo,
      subject,
      html,
      text: text || (html ? html.replace(/<[^>]*>?/gm, '').trim() : ''),
    };
  }

  const transporter = await getTransporter();
  const result = await transporter.sendMail(mailOptions);
  lastSentMail = {
    options: mailOptions,
    result,
  };
  return result;
};

module.exports = {
  sendEmail,
  sendReminderEmail: sendEmail,
  getTransporter,
  setTransporter,
  resetTransporter,
  getLastSentMail,
};
