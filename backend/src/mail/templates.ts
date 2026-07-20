// Email HTML is not web HTML: clients strip <style> blocks, ignore flexbox and
// dark-mode variables, and Outlook still renders through Word. So everything
// here is inline styles on tables — ugly to read, but it survives.

const TEAL = '#1D9E75';
const INK = '#0F2438';
const MUTED = '#6B7A88';
const LINE = '#E6EDF2';

export type Cta = { label: string; url: string };

/** The shared wrapper: logo, content, footer, optional unsubscribe. */
export function shell(opts: {
  heading: string;
  body: string;
  cta?: Cta;
  footnote?: string;
  unsubscribeUrl?: string;
}): string {
  const { heading, body, cta, footnote, unsubscribeUrl } = opts;
  return `<!doctype html>
<html><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width"/>
<title>${escapeHtml(heading)}</title></head>
<body style="margin:0;padding:0;background:#F6F8F7;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F6F8F7;padding:28px 12px;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border:1px solid ${LINE};border-radius:16px;overflow:hidden;">
        <tr><td style="padding:26px 30px 0 30px;">
          <div style="font:700 20px/1 -apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:${INK};letter-spacing:-.4px;">
            Selfe<span style="color:${TEAL};">Connect</span>
          </div>
        </td></tr>
        <tr><td style="padding:22px 30px 0 30px;">
          <h1 style="margin:0;font:700 22px/1.3 -apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:${INK};">${escapeHtml(heading)}</h1>
        </td></tr>
        <tr><td style="padding:14px 30px 0 30px;font:400 15px/1.6 -apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#33475B;">
          ${body}
        </td></tr>
        ${
          cta
            ? `<tr><td style="padding:24px 30px 0 30px;">
                 <table role="presentation" cellpadding="0" cellspacing="0"><tr>
                   <td style="border-radius:12px;background:${TEAL};">
                     <a href="${cta.url}" style="display:inline-block;padding:13px 24px;font:600 15px/1 -apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#ffffff;text-decoration:none;">${escapeHtml(cta.label)}</a>
                   </td>
                 </tr></table>
                 <p style="margin:12px 0 0 0;font:400 12px/1.5 -apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:${MUTED};">
                   Or copy this link:<br/><span style="color:${MUTED};word-break:break-all;">${cta.url}</span>
                 </p>
               </td></tr>`
            : ''
        }
        ${
          footnote
            ? `<tr><td style="padding:22px 30px 0 30px;font:400 13px/1.6 -apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:${MUTED};">${footnote}</td></tr>`
            : ''
        }
        <tr><td style="padding:26px 30px 26px 30px;">
          <div style="border-top:1px solid ${LINE};padding-top:16px;font:400 12px/1.6 -apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:${MUTED};">
            SelfeConnect — find and hire trusted local professionals.<br/>
            Contact us — <a href="mailto:support@selfeconnect.com" style="color:${TEAL};text-decoration:none;">support@selfeconnect.com</a><br/>
            ${
              unsubscribeUrl
                ? `<a href="${unsubscribeUrl}" style="color:${MUTED};">Unsubscribe from these emails</a>`
                : `This is a service message about your account.`
            }
          </div>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
}

export function escapeHtml(s: string): string {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** Strip tags for the plain-text alternative. */
export function toText(html: string): string {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|tr|div|h1)>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&nbsp;/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export const p = (s: string) => `<p style="margin:0 0 12px 0;">${s}</p>`;
export const strong = (s: string) => `<strong style="color:${INK};">${escapeHtml(s)}</strong>`;
