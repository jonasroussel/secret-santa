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
    // Well below the HTTP idle timeout (main.ts): a slow server fails here and is recorded, not dropped mid-request.
    connectionTimeout: 15_000,
    greetingTimeout: 15_000,
    socketTimeout: 30_000,
  });
  return {
    send: async (mail) => {
      await transport.sendMail({ from: smtp.from, ...mail });
    },
  };
}
