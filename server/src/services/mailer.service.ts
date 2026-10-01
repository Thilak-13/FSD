import nodemailer, { Transporter } from 'nodemailer';
import { config } from '../config/env';

let activeTransporter: Transporter | null = null;
let lastSentMail: any = null;

/**
 * Initializes and returns the active Nodemailer transporter.
 * In testing or development without custom credentials, uses test / JSON transport.
 */
export const getTransporter = async (): Promise<Transporter> => {
  if (activeTransporter) {
    return activeTransporter;
  }

  // In test environment, default to JSON transport for fast, offline, and reliable assertions
  if (process.env.NODE_ENV === 'test') {
    activeTransporter = nodemailer.createTransport({
      jsonTransport: true,
    });
    return activeTransporter;
  }

  try {
    // If ethereal default test account is specified in development, attempt createTestAccount
    if (config.smtp.user === 'test@ethereal.email') {
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
    }
  } catch (err) {
    // Fall back to configured SMTP settings if ethereal test account generation fails
  }

  activeTransporter = nodemailer.createTransport({
    host: config.smtp.host,
    port: config.smtp.port,
    secure: config.smtp.port === 465,
    auth: {
      user: config.smtp.user,
      pass: config.smtp.pass,
    },
    tls: {
      rejectUnauthorized: false,
    },
  });

  return activeTransporter;
};

/**
 * Override or inject a custom transporter for testing.
 */
export const setTransporter = (transporter: Transporter | null): void => {
  activeTransporter = transporter;
};

/**
 * Reset transporter back to uninitialized state.
 */
export const resetTransporter = (): void => {
  activeTransporter = null;
  lastSentMail = null;
};

/**
 * Retrieve the last sent mail info (helpful in unit/integration testing).
 */
export const getLastSentMail = (): any => {
  return lastSentMail;
};

/**
 * Sends a reminder email via the active Nodemailer transporter.
 */
export const sendReminderEmail = async (
  to: string,
  subject: string,
  html: string,
  text?: string
): Promise<any> => {
  const transporter = await getTransporter();
  const mailOptions = {
    from: config.smtp.from,
    to,
    subject,
    text: text || html.replace(/<[^>]*>?/gm, '').trim(),
    html,
  };

  const result = await transporter.sendMail(mailOptions);
  lastSentMail = {
    options: mailOptions,
    result,
  };
  return result;
};
