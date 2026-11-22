import { createTransport } from 'nodemailer';

import type { Mailer } from '../../application/ports.ts';

export type SmtpConfig = { host: string; port: number; user: string | null; password: string | null; from: string };

export function createSmtpMailer(smtp: SmtpConfig): Mailer {
  const transport = createTransport({
    host: smtp.host,
    port: smtp.port,
    // 465 is TLS from the start; other ports upgrade with STARTTLS.
    secure: smtp.port === 465,
    auth: smtp.user ? { user: smtp.user, pass: smtp.password ?? '' } : undefined,
  });
  return {
    send: async (mail) => {
      await transport.sendMail({ from: smtp.from, ...mail });
    },
  };
}
