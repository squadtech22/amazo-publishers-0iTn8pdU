/* ==========================================================================
   Enquiry handler — takes a form POST and sends it through Resend.

   Written against the Web Fetch API (Request in, Response out) so the same
   function runs on Vercel, Netlify Functions v2, Cloudflare Workers and Deno
   without an adapter. api/contact.js and netlify/functions/contact.mjs are
   both two-line re-exports of this.

   Configuration lives entirely in the environment — see .env.example. The
   API key must never be committed, and must never reach the browser: this is
   the reason the forms POST to a function at all instead of calling Resend
   directly from main.js.
   ========================================================================== */

const RESEND_ENDPOINT = 'https://api.resend.com/emails';

/* Kept deliberately short. Every one of these is a real limit on Resend's
   side or a sanity bound — they are not an attempt to guess what a genuine
   enquiry looks like, because rejecting a real one is worse than accepting
   a strange one. */
const LIMITS = { name: 200, email: 320, phone: 60, service: 120, message: 8000 };

const clean = (v, max) => String(v == null ? '' : v).trim().slice(0, max);

/* Good enough to catch a typo and nothing more. Anything stricter starts
   rejecting addresses that are perfectly valid. */
const looksLikeEmail = (v) => /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(v);
const looksLikePhone = (v) => /^\+?[0-9\s\-\(\)]{7,20}$/.test(v);

const json = (status, body) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8' }
  });

/* Escaped for the HTML part. The text part carries the same content
   unescaped, so a client that renders neither still shows something sane. */
const esc = (s) => String(s)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;');

const rows = (fields) => fields
  .filter((f) => f[1])
  .map((f) => `<tr><td style="padding:4px 14px 4px 0;color:#6b6b63;white-space:nowrap">${esc(f[0])}</td><td style="padding:4px 0;color:#141410">${esc(f[1])}</td></tr>`)
  .join('');

const handler = async (request) => {
  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: { allow: 'POST, OPTIONS' } });
  }
  if (request.method !== 'POST') {
    return json(405, { ok: false, error: 'Use POST.' });
  }

  let body;
  try {
    body = await request.json();
  } catch (err) {
    return json(400, { ok: false, error: 'Expected a JSON body.' });
  }

  /* Honeypot. A field no human sees and no human fills. Answer 200 so a bot
     gets no signal that it was caught, but send nothing. */
  if (clean(body.company, 200)) {
    return json(200, { ok: true });
  }

  const name = clean(body.name, LIMITS.name);
  const email = clean(body.email, LIMITS.email);
  const phone = clean(body.phone, LIMITS.phone);
  const service = clean(body.service, LIMITS.service);
  const message = clean(body.message, LIMITS.message);
  const source = clean(body.source, 200) || 'the website';

  if (!name) return json(422, { ok: false, error: 'Please give us your name.' });
  if (!phone) return json(422, { ok: false, error: 'Please give us your phone number.' });
  if (!looksLikePhone(phone)) return json(422, { ok: false, error: 'Please enter a valid phone number.' });
  if (!looksLikeEmail(email)) return json(422, { ok: false, error: 'That email address does not look right.' });

  // Insert into Firebase E-Book Portal
  try {
    await fetch(`https://firestore.googleapis.com/v1/projects/e-book-portal-15733/databases/(default)/documents/contacts?key=AIzaSyCjFdNgu4fKrXj5jWa0MlMi3EwnX22WLq8`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fields: {
          source: { stringValue: "amazo" },
          name: { stringValue: name || "" },
          email: { stringValue: email || "" },
          phone: { stringValue: phone || "" },
          message: { stringValue: message || "" },
          createdAt: { timestampValue: new Date().toISOString() }
        }
      })
    });
  } catch (err) {
    console.error("Firebase insertion error:", err);
  }

  return json(200, { ok: true });
};

module.exports = handler;
module.exports.default = handler;
