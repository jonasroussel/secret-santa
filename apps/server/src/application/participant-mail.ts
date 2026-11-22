import type { EventDetails } from '@secret-santa/shared';

import { COLORS, MailLayout, NBSP, SANS, SERIF } from './mail-layout.ts';
import type { Mail } from './ports.ts';

export type ParticipantMailInput = {
  event: EventDetails;
  giverName: string;
  giverEmail: string;
  receiverName: string;
  receivedCancelledDraw: boolean;
  pixelUrl: string;
  /** Mail test mode: the admins receive the mail instead of the participant. */
  testRecipients: string[] | null;
};

const REDRAW_NOTICE = `Le tirage a été refait${NBSP}: oublie le prénom reçu dans le mail précédent.`;
const SECRET = `C’est un secret${NBSP}: ne dis à personne à qui tu offres ton cadeau${NBSP}!`;

/** The receiver's name is only in the body: subjects and previews show on lock screens. */
export class ParticipantMail {
  static build({
    event,
    giverName,
    giverEmail,
    receiverName,
    receivedCancelledDraw,
    pixelUrl,
    testRecipients,
  }: ParticipantMailInput): Mail {
    const date = new Intl.DateTimeFormat('fr-FR', { dateStyle: 'full', timeZone: 'UTC' }).format(new Date(event.date));
    const details: [string, string][] = [['Date', date]];
    if (event.budget !== null) details.push(['Budget', `${event.budget}${NBSP}€`]);
    const intro = `Le tirage au sort de «${NBSP}${event.name}${NBSP}» a eu lieu. Tu offres un cadeau${NBSP}à${NBSP}:`;
    const testNotice = testRecipients && `Mode test${NBSP}: ce mail était destiné à ${giverName} (${giverEmail}).`;

    const text = [
      ...(testNotice ? [testNotice, ''] : []),
      ...(receivedCancelledDraw ? [REDRAW_NOTICE, ''] : []),
      `Bonjour ${giverName},`,
      '',
      intro,
      '',
      `    ${receiverName}`,
      '',
      ...(event.message ? [`Le mot de l’organisateur${NBSP}:`, event.message, ''] : []),
      ...details.map(([label, value]) => `${label}${NBSP}: ${value}`),
      '',
      SECRET,
      '',
      'Joyeuses fêtes,',
      'Secret Santa',
    ].join('\n');

    const e = MailLayout.escape;
    const notice = (content: string, color: string) => `<tr><td style="padding:0 32px 8px">
      <div style="background:#FBF1DC;border-left:4px solid ${color};border-radius:4px;padding:12px 16px;font:600 15px/1.5 ${SANS};color:${COLORS.ink}">${e(content)}</div>
    </td></tr>`;
    const message = event.message
      ? `<tr><td style="padding:0 32px 20px">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${COLORS.cream};border:1px solid ${COLORS.line};border-left:4px solid ${COLORS.red};border-radius:8px">
        <tr><td style="padding:18px 20px">
          <p style="margin:0 0 8px;font:600 12px/1.4 ${SANS};letter-spacing:.08em;text-transform:uppercase;color:${COLORS.muted}">Le mot de l’organisateur</p>
          <p style="margin:0;font:19px/1.55 ${SERIF};color:${COLORS.ink};word-break:break-word">${e(event.message).replaceAll('\n', '<br>')}</p>
        </td></tr>
      </table>
    </td></tr>`
      : '';
    const detailRows = details
      .map(
        ([label, value]) => `<tr>
          <td style="padding:6px 0;font:14px/1.5 ${SANS};color:${COLORS.muted};width:90px;vertical-align:top">${e(label)}</td>
          <td style="padding:6px 0;font:600 16px/1.5 ${SANS};color:${COLORS.ink}">${e(value)}</td>
        </tr>`,
      )
      .join('');

    const html = MailLayout.page({
      title: `Secret Santa — ${event.name}`,
      preheader: `Le tirage au sort a eu lieu${NBSP}: découvre à qui tu offres un cadeau.`,
      pixelUrl,
      rows: `${testNotice ? notice(testNotice, COLORS.red) : ''}
    ${receivedCancelledDraw ? notice(REDRAW_NOTICE, COLORS.gold) : ''}
    <tr><td style="padding:16px 32px 0">
      <h1 style="margin:0 0 12px;font:normal 26px/1.3 ${SERIF};color:${COLORS.ink}">Bonjour ${e(giverName)},</h1>
      <p style="margin:0;font:17px/1.6 ${SANS};color:${COLORS.ink}">${e(intro)}</p>
    </td></tr>
    ${MailLayout.highlight(receiverName, `font:bold 34px/1.2 ${SERIF}`)}
    ${message}
    <tr><td style="padding:0 32px 8px">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-top:1px solid ${COLORS.line}">${detailRows}</table>
    </td></tr>
    <tr><td style="padding:24px 32px 28px">
      <p style="margin:0 0 16px;font:13px/1.5 ${SANS};color:${COLORS.muted}">🤫 ${e(SECRET)}</p>
      <p style="margin:0;font:italic 17px/1.5 ${SERIF};color:${COLORS.muted}">Joyeuses fêtes${NBSP}!</p>
    </td></tr>`,
    });

    return {
      to: testRecipients?.join(', ') ?? giverEmail,
      subject: `${testNotice ? '[TEST] ' : ''}🎁 Secret Santa — ${event.name}`,
      text,
      html,
    };
  }
}
