import type { SmtpConfig } from './mail/smtp-mailer.ts';

/** Set by the Docker image. Outside production the sign-in code is always 123456. */
const production = Bun.env.NODE_ENV === 'production';

export const config = {
  production,
  port: Number(Bun.env.PORT ?? 3629),
  databasePath: Bun.env.DATABASE_PATH ?? 'data/secret-santa.sqlite',
  /** Built client (`apps/client/dist`) to serve next to the API, so one port is enough. Unset in development. */
  clientDistPath: Bun.env.CLIENT_DIST_PATH ?? null,
  /** Public address of the app, for the mail open-tracking pixel. Vite proxies `/api` in development. */
  appUrl: (production ? required('APP_URL') : (Bun.env.APP_URL ?? 'http://localhost:5173')).replace(/\/+$/, ''),
  adminEmails: new Set(
    (Bun.env.ADMIN_EMAILS ?? '')
      .split(',')
      .map((email) => email.trim().toLowerCase())
      .filter(Boolean),
  ),
  /** For a real test in production: participant mails go to the admins. */
  mailTestMode: ['1', 'true'].includes(Bun.env.MAIL_TEST_MODE ?? ''),
  /** Without SMTP (development only: the mails hold who gives to whom), mails are printed in the log. */
  smtp:
    production || Bun.env.SMTP_HOST
      ? ({
          host: required('SMTP_HOST'),
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
