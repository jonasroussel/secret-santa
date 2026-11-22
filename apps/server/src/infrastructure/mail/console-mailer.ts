import type { Mailer } from '../../application/ports.ts';

/**
 * Development without SMTP: mails go to the server log, so the sign-in code can be copied from there and the
 * open-tracking pixel can be visited by hand.
 */
export const consoleMailer: Mailer = {
  send: async (mail) => {
    const pixel = mail.html?.match(/src="([^"]*\/api\/mail\/open\/[^"]+)"/)?.[1];
    const opening = pixel ? `\n\nOpen-tracking pixel: ${pixel}` : '';
    console.log(`\n--- Mail to ${mail.to}: ${mail.subject}\n${mail.text}${opening}\n---\n`);
  },
};
