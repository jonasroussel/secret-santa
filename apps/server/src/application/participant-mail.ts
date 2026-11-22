import type { EventDetails } from '@secret-santa/shared';

import type { Mail } from './ports.ts';

export type ParticipantMailInput = {
  event: EventDetails;
  giverName: string;
  giverEmail: string;
  receiverName: string;
  receivedCancelledDraw: boolean;
  pixelUrl: string;
};

const COLORS = {
  red: '#9E1B24',
  fir: '#1F4D3A',
  cream: '#FBF6EC',
  paper: '#FFFDF8',
  ink: '#2B211C',
  muted: '#5C4A3F',
  gold: '#B8862B',
  line: '#E8DCC6',
};
const SERIF = "Georgia, 'Times New Roman', serif";
const SANS = "-apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";
const NBSP = '\u00a0';
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
  }: ParticipantMailInput): Mail {
    const date = new Intl.DateTimeFormat('fr-FR', { dateStyle: 'full', timeZone: 'UTC' }).format(new Date(event.date));
    const details: [string, string][] = [['Date', date]];
    if (event.budget !== null) details.push(['Budget', `${event.budget}${NBSP}€`]);
    const intro = `Le tirage au sort de «${NBSP}${event.name}${NBSP}» a eu lieu. Tu offres un cadeau${NBSP}à${NBSP}:`;

    const text = [
      ...(receivedCancelledDraw ? [REDRAW_NOTICE, ''] : []),
      `Bonjour ${giverName},`,
      '',
      intro,
      '',
      `    ${receiverName}`,
      '',
      ...details.map(([label, value]) => `${label}${NBSP}: ${value}`),
      ...(event.message ? ['', `Le mot de l’organisateur${NBSP}:`, event.message] : []),
      '',
      SECRET,
      '',
      'Joyeuses fêtes,',
      'Secret Santa',
    ].join('\n');

    return {
      to: giverEmail,
      subject: `🎁 Secret Santa — ${event.name}`,
      text,
      html: ParticipantMail.#html({ event, giverName, receiverName, receivedCancelledDraw, pixelUrl, details, intro }),
    };
  }

  static #html(input: {
    event: EventDetails;
    giverName: string;
    receiverName: string;
    receivedCancelledDraw: boolean;
    pixelUrl: string;
    details: [string, string][];
    intro: string;
  }): string {
    const e = ParticipantMail.#escape;
    const notice = input.receivedCancelledDraw
      ? `<tr><td style="padding:0 32px 8px">
          <div style="background:#FBF1DC;border-left:4px solid ${COLORS.gold};border-radius:4px;padding:12px 16px;font:600 15px/1.5 ${SANS};color:${COLORS.ink}">${e(REDRAW_NOTICE)}</div>
        </td></tr>`
      : '';
    const details = input.details
      .map(
        ([label, value]) => `<tr>
          <td style="padding:6px 0;font:14px/1.5 ${SANS};color:${COLORS.muted};width:90px;vertical-align:top">${e(label)}</td>
          <td style="padding:6px 0;font:600 16px/1.5 ${SANS};color:${COLORS.ink}">${e(value)}</td>
        </tr>`,
      )
      .join('');
    const message = input.event.message
      ? `<tr><td style="padding:8px 32px 0">
          <p style="margin:0 0 6px;font:600 13px/1.4 ${SANS};letter-spacing:.08em;text-transform:uppercase;color:${COLORS.muted}">Le mot de l’organisateur</p>
          <p style="margin:0;font:italic 17px/1.6 ${SERIF};color:${COLORS.ink}">${e(input.event.message).replaceAll('\n', '<br>')}</p>
        </td></tr>`
      : '';

    return `<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="light">
<title>${e(`Secret Santa — ${input.event.name}`)}</title>
</head>
<body style="margin:0;padding:0;background:${COLORS.cream}">
<div style="display:none;max-height:0;overflow:hidden;opacity:0">Le tirage au sort a eu lieu${NBSP}: découvre à qui tu offres un cadeau.</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${COLORS.cream}">
<tr><td align="center" style="padding:24px 12px">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:${COLORS.paper};border:1px solid ${COLORS.line};border-top:6px solid ${COLORS.red};border-radius:8px">
    <tr><td style="padding:28px 32px 8px">
      <p style="margin:0;font:italic 20px/1.3 ${SERIF};color:${COLORS.fir}">🎁 Secret Santa</p>
    </td></tr>
    ${notice}
    <tr><td style="padding:16px 32px 0">
      <h1 style="margin:0 0 12px;font:normal 26px/1.3 ${SERIF};color:${COLORS.ink}">Bonjour ${e(input.giverName)},</h1>
      <p style="margin:0;font:17px/1.6 ${SANS};color:${COLORS.ink}">${e(input.intro)}</p>
    </td></tr>
    <tr><td style="padding:20px 32px">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${COLORS.cream};border:2px dashed ${COLORS.gold};border-radius:8px">
        <tr><td align="center" style="padding:24px 16px;font:bold 34px/1.2 ${SERIF};color:${COLORS.red};word-break:break-word">${e(input.receiverName)}</td></tr>
      </table>
    </td></tr>
    <tr><td style="padding:0 32px 8px">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-top:1px solid ${COLORS.line}">${details}</table>
    </td></tr>
    ${message}
    <tr><td style="padding:24px 32px 0">
      <p style="margin:0;padding:14px 16px;background:${COLORS.fir};border-radius:6px;font:600 15px/1.5 ${SANS};color:${COLORS.paper}">🤫 ${e(SECRET)}</p>
    </td></tr>
    <tr><td style="padding:24px 32px 28px">
      <p style="margin:0;font:italic 17px/1.5 ${SERIF};color:${COLORS.muted}">Joyeuses fêtes${NBSP}!</p>
    </td></tr>
  </table>
</td></tr>
</table>
<img src="${e(input.pixelUrl)}" width="1" height="1" alt="" style="display:block;width:1px;height:1px;border:0">
</body>
</html>`;
  }

  static #escape(value: string): string {
    return value
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#39;');
  }
}
