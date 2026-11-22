import { COLORS, MailLayout, NBSP, SANS, SERIF } from './mail-layout.ts';
import type { Mail } from './ports.ts';

const INTRO = `Voici ton code pour te connecter à l’organisation du Secret${NBSP}Santa${NBSP}:`;
const VALIDITY = 'Il est valable 15 minutes et ne fonctionne qu’une seule fois.';
const IGNORE = 'Si tu n’as pas demandé ce code, ignore ce message.';
/** Georgia's old-style figures bounce up and down: a code reads better with even digits. */
const MONO = "'SF Mono', Menlo, Consolas, 'Courier New', monospace";

export class LoginCodeMail {
  static build(email: string, code: string): Mail {
    const e = MailLayout.escape;
    return {
      to: email,
      subject: 'Ton code de connexion — Secret Santa',
      text: ['Bonjour,', '', INTRO, '', code, '', VALIDITY, IGNORE].join('\n'),
      html: MailLayout.page({
        title: 'Ton code de connexion — Secret Santa',
        preheader: VALIDITY,
        rows: `<tr><td style="padding:16px 32px 0">
      <h1 style="margin:0 0 12px;font:normal 26px/1.3 ${SERIF};color:${COLORS.ink}">Bonjour,</h1>
      <p style="margin:0;font:17px/1.6 ${SANS};color:${COLORS.ink}">${e(INTRO)}</p>
    </td></tr>
    ${MailLayout.highlight(code, `font:bold 38px/1.2 ${MONO};letter-spacing:10px;padding-left:26px`)}
    <tr><td style="padding:0 32px 28px">
      <p style="margin:0 0 16px;font:17px/1.6 ${SANS};color:${COLORS.ink}">${e(VALIDITY)}</p>
      <p style="margin:0;font:13px/1.5 ${SANS};color:${COLORS.muted}">${e(IGNORE)}</p>
    </td></tr>`,
      }),
    };
  }
}
