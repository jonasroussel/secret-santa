import type { Mailer } from '../../application/ports.ts';

/** Development without SMTP: mails go to the server log, so the login link can be copied from there. */
export const consoleMailer: Mailer = {
  send: async (mail) => {
    console.log(`\n--- Mail to ${mail.to}: ${mail.subject}\n${mail.text}\n---\n`);
  },
};
