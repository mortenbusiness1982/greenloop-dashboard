// The iframe must also have an empty sandbox attribute: CSP alone is not the
// origin boundary protecting the dashboard's DOM and authenticated storage.
export function buildIsolatedEmailPreview(html: string): string {
  return `<!doctype html>
<html><head><meta charset="utf-8">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'none'; style-src 'unsafe-inline'; img-src https://greenloop-api.onrender.com/assets/greenloop-email-turtle.png; base-uri 'none'; form-action 'none'; frame-src 'none'">
<meta name="referrer" content="no-referrer">
<style>html{color-scheme:light}body{margin:0;padding:24px;overflow-wrap:anywhere;font-family:Arial,sans-serif;color:#123127;background:white}img{max-width:100%;height:auto}</style>
</head><body>${html}</body></html>`;
}
