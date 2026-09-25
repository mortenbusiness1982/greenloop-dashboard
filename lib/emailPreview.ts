function openWebLinksOutsidePreview(html: string): string {
  return html.replace(/<a\b([^>]*)>/gi, (tag, attributes: string) => {
    const hrefMatch = attributes.match(/\bhref\s*=\s*(?:(["'])(.*?)\1|([^\s>]+))/i);
    const href = (hrefMatch?.[2] || hrefMatch?.[3] || "").trim();
    const withoutNavigationAttributes = attributes
      .replace(/\s+target\s*=\s*(?:["'][^"']*["']|[^\s>]+)/gi, "")
      .replace(/\s+rel\s*=\s*(?:["'][^"']*["']|[^\s>]+)/gi, "");
    if (!/^https?:\/\//i.test(href)) return `<a${withoutNavigationAttributes}>`;

    return `<a${withoutNavigationAttributes} target="_blank" rel="noopener noreferrer">`;
  });
}

// The iframe sandbox remains the origin boundary protecting the dashboard's
// DOM and authenticated storage. Its only allowances are user-clicked popups,
// which escape the sandbox so the destination application's scripts can run.
export function buildIsolatedEmailPreview(html: string): string {
  return `<!doctype html>
<html><head><meta charset="utf-8">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'none'; style-src 'unsafe-inline'; img-src https://greenloop-api.onrender.com/assets/greenloop-email-turtle.png; base-uri 'none'; form-action 'none'; frame-src 'none'">
<meta name="referrer" content="no-referrer">
<style>html{color-scheme:light}body{margin:0;padding:24px;overflow-wrap:anywhere;font-family:Arial,sans-serif;color:#123127;background:white}img{max-width:100%;height:auto}</style>
</head><body>${openWebLinksOutsidePreview(html)}</body></html>`;
}
