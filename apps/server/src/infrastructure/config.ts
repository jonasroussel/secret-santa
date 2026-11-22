import type { SmtpConfig } from './mail/smtp-mailer.ts';

const production = Bun.env.NODE_ENV === 'production';

export const config = {
  port: Number(Bun.env.PORT ?? 3629),
  databasePath: Bun.env.DATABASE_PATH ?? 'data/secret-santa.sqlite',
  /** Built client (`apps/client/dist`) to serve next to the API, so one port is enough. Unset in development. */
  clientDistPath: Bun.env.CLIENT_DIST_PATH ?? null,
  /** Public address of the client, used in the emailed links. */
  appUrl: (production ? required('APP_URL') : (Bun.env.APP_URL ?? 'http://localhost:5173')).replace(/\/+$/, ''),
  adminEmails: new Set(
    (Bun.env.ADMIN_EMAILS ?? '')
      .split(',')
      .map((email) => email.trim().toLowerCase())
      .filter(Boolean),
  ),
  /** Without SMTP (development), mails are printed in the log. */
  smtp: Bun.env.SMTP_HOST
    ? ({
        host: Bun.env.SMTP_HOST,
        port: Number(Bun.env.SMTP_PORT ?? 587),
        user: Bun.env.SMTP_USER || null,
        password: Bun.env.SMTP_PASSWORD || null,
        from: required('MAIL_FROM'),
      } satisfies SmtpConfig)
    : null,
};

function required(name: string): string {
  const value = Bun.env[name];
  if (!value) throw new Error(`Missing environment variable ${name}`);
  return value;
}
