// Convert exported Google cookies into the bot session the container loads.
// Google blocks automated logins, so you sign in manually in a normal browser
// and export the cookies — this turns that export into Playwright storageState.
//
//   1. In normal Chrome, sign in to the BOT Google account.
//   2. Install the "Cookie-Editor" extension, open it on google.com,
//      Export → JSON, save as cookies.json (here).
//   3. node cookies-to-session.mjs cookies.json
//   4. wrangler r2 object put echobit/meet-bot/google-session.json \
//        --file google-session.json --remote
//
// Also accepts a Netscape cookies.txt export.

import fs from 'node:fs';

const inPath = process.argv[2];
if (!inPath) {
  console.error('Usage: node cookies-to-session.mjs <cookies.json | cookies.txt>');
  process.exit(1);
}
const raw = fs.readFileSync(inPath, 'utf8');

const SAME_SITE = { no_restriction: 'None', unspecified: 'Lax', lax: 'Lax', strict: 'Strict', none: 'None' };
const keepGoogle = (domain) => /google\.com$/.test(String(domain).replace(/^\./, ''));

let cookies = [];
try {
  // Cookie-Editor / EditThisCookie JSON export
  const arr = JSON.parse(raw);
  cookies = arr
    .filter((c) => keepGoogle(c.domain))
    .map((c) => ({
      name: c.name,
      value: c.value,
      domain: c.domain,
      path: c.path || '/',
      expires: c.session ? -1 : Math.round(c.expirationDate ?? -1),
      httpOnly: !!c.httpOnly,
      secure: !!c.secure,
      sameSite: SAME_SITE[String(c.sameSite || '').toLowerCase()] || 'Lax',
    }));
} catch {
  // Netscape cookies.txt
  for (let line of raw.split('\n')) {
    line = line.replace(/\r$/, '');
    let httpOnly = false;
    if (line.startsWith('#HttpOnly_')) { httpOnly = true; line = line.slice(10); }
    else if (!line || line.startsWith('#')) continue;
    const p = line.split('\t');
    if (p.length < 7) continue;
    const [domain, , path, secure, expiry, name, value] = p;
    if (!keepGoogle(domain)) continue;
    cookies.push({
      name, value, domain, path: path || '/',
      expires: Number(expiry) || -1,
      httpOnly, secure: secure === 'TRUE', sameSite: 'Lax',
    });
  }
}

if (!cookies.length) {
  console.error('No google.com cookies found in the export. Make sure you exported while signed in.');
  process.exit(1);
}
fs.writeFileSync('google-session.json', JSON.stringify({ cookies, origins: [] }, null, 2));
console.log(`Wrote google-session.json with ${cookies.length} cookies.`);
