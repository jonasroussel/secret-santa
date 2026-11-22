export const COLORS = {
  red: '#9E1B24',
  fir: '#1F4D3A',
  cream: '#FBF6EC',
  paper: '#FFFDF8',
  ink: '#2B211C',
  muted: '#5C4A3F',
  gold: '#B8862B',
  line: '#E8DCC6',
};
export const SERIF = "Georgia, 'Times New Roman', serif";
export const SANS = "-apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";
export const NBSP = '\u00a0';

/** The Classique look of every mail: inline styles and tables, as mail clients need. */
export class MailLayout {
  /** The whole document: a paper card under the « Secret Santa » header, holding `rows` (table rows). */
  static page({
    title,
    preheader,
    rows,
    pixelUrl,
  }: {
    title: string;
    preheader: string;
    rows: string;
    pixelUrl?: string;
  }): string {
    const e = MailLayout.escape;
    const pixel = pixelUrl
      ? `<img src="${e(pixelUrl)}" width="1" height="1" alt="" style="display:block;width:1px;height:1px;border:0">`
      : '';
    return `<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="light">
<title>${e(title)}</title>
</head>
<body style="margin:0;padding:0;background:${COLORS.cream}">
<div style="display:none;max-height:0;overflow:hidden;opacity:0">${e(preheader)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${COLORS.cream}">
<tr><td align="center" style="padding:24px 12px">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:${COLORS.paper};border:1px solid ${COLORS.line};border-top:6px solid ${COLORS.red};border-radius:8px">
    <tr><td style="padding:28px 32px 8px">
      <p style="margin:0;font:italic 20px/1.3 ${SERIF};color:${COLORS.fir}">🎁 Secret Santa</p>
    </td></tr>
    ${rows}
  </table>
</td></tr>
</table>
${pixel}
</body>
</html>`;
  }

  /** The dashed, centred box around what the mail is about (a name, a code); `content` is escaped here. */
  static highlight(content: string, style: string): string {
    return `<tr><td style="padding:20px 32px">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${COLORS.cream};border:2px dashed ${COLORS.gold};border-radius:8px">
        <tr><td align="center" style="padding:24px 16px;color:${COLORS.red};word-break:break-word;${style}">${MailLayout.escape(content)}</td></tr>
      </table>
    </td></tr>`;
  }

  static escape(value: string): string {
    return value
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#39;');
  }
}
