import nodemailer from 'nodemailer';

export interface GmailEmailProviderConfig {
  kind: 'gmail';
  user: string;
  appPassword: string;
  from: string;
}

export interface ResendEmailProviderConfig {
  kind: 'resend';
  apiKey: string;
  from: string;
}

export interface MisconfiguredEmailProvider {
  kind: 'misconfigured';
  message: string;
}

export type EmailProviderConfig =
  | GmailEmailProviderConfig
  | ResendEmailProviderConfig
  | MisconfiguredEmailProvider;

export function resolveEmailProviderConfig(
  env: Record<string, string | undefined>
): EmailProviderConfig | null {
  const gmailUser = env.GMAIL_USER?.trim().toLowerCase() || '';
  const gmailPasswordRaw = env.GMAIL_APP_PASSWORD || '';
  const gmailAppPassword = gmailPasswordRaw.replace(/\s+/g, '');

  // If either Gmail variable is present, Gmail is the intentional provider.
  // Do not silently fall back to Resend when the Gmail configuration is partial.
  if (gmailUser || gmailPasswordRaw) {
    if (!gmailUser || !gmailAppPassword) {
      return {
        kind: 'misconfigured',
        message: 'إعداد Gmail غير مكتمل. يجب ضبط GMAIL_USER و GMAIL_APP_PASSWORD معًا.',
      };
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(gmailUser)) {
      return {
        kind: 'misconfigured',
        message: 'قيمة GMAIL_USER ليست عنوان بريد إلكتروني صالحًا.',
      };
    }
    return {
      kind: 'gmail',
      user: gmailUser,
      appPassword: gmailAppPassword,
      from: `HUKM MEDIA <${gmailUser}>`,
    };
  }

  const apiKey = env.RESEND_API_KEY?.trim() || '';
  const from = env.EMAIL_FROM?.trim() || '';
  if (apiKey || from) {
    if (!apiKey || !from) {
      return {
        kind: 'misconfigured',
        message: 'إعداد Resend غير مكتمل. يجب ضبط RESEND_API_KEY و EMAIL_FROM معًا.',
      };
    }
    return { kind: 'resend', apiKey, from };
  }

  return null;
}

export function createGmailTransporter(config: GmailEmailProviderConfig) {
  return nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 465,
    secure: true,
    auth: {
      user: config.user,
      pass: config.appPassword,
    },
    connectionTimeout: 10_000,
    greetingTimeout: 10_000,
    socketTimeout: 20_000,
    pool: true,
    maxConnections: 1,
    maxMessages: 50,
  });
}
