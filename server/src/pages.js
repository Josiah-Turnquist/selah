/**
 * Static pages for the App Store listing: privacy policy and support.
 * Served by the API so no extra hosting is needed. Plain HTML, no assets,
 * styled to match the app's quiet serif aesthetic.
 */

const shell = (title, body) => `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${title} — Selah</title>
<style>
  :root { color-scheme: light dark; }
  body {
    margin: 0 auto; padding: 48px 24px 96px; max-width: 640px;
    font-family: Georgia, 'Times New Roman', serif;
    line-height: 1.65; font-size: 17px;
    color: #1b1b1d; background: #fdfdfc;
  }
  h1 { font-size: 28px; font-weight: 500; letter-spacing: -0.2px; margin: 0 0 4px; }
  h2 { font-size: 19px; font-weight: 500; margin: 36px 0 8px; }
  p, li { margin: 0 0 14px; }
  ul { padding-left: 22px; }
  a { color: #1b1b1d; }
  .muted { opacity: 0.55; font-size: 14px; }
  .brand { text-transform: uppercase; letter-spacing: 1.2px; font-size: 12px; opacity: 0.5; margin-bottom: 28px; }
  /* Dark overrides come last: same specificity as the base rules, so source
     order is what makes them win. */
  @media (prefers-color-scheme: dark) {
    body { color: #ececea; background: #131315; }
    a { color: #ececea; }
  }
</style>
</head>
<body>
<div class="brand">Selah</div>
${body}
</body>
</html>`;

export const privacyHtml = shell(
  'Privacy Policy',
  `
<h1>Privacy Policy</h1>
<p class="muted">Effective July 15, 2026</p>

<p>Selah is built to be quiet — including about you. This page describes
everything the app stores and everything it doesn't, in plain language.</p>

<h2>Your data lives on your device</h2>
<p>Your reading history, plans, prayer lists, prayer history, notes,
highlights, and memorization progress are stored locally on your phone.
The app works fully offline. We have no user accounts in the usual sense:
no email, no name, no password.</p>

<h2>Anonymous sync</h2>
<p>On first launch the app creates an anonymous identity — a random ID and
secret — so two optional features can work:</p>
<ul>
  <li><strong>Friends.</strong> If you share your friend code, mutual friends
  see a small progress snapshot: the display name you chose in the app, your
  current plan's title and progress, and your reading streak. Nothing else —
  never your prayers, notes, or highlights.</li>
  <li><strong>Backups.</strong> About once a week the app uploads a backup of
  your app data (prayer lists, notes, plans, decks) to our server, so you can
  restore it on a new phone with your recovery code. We keep only your most
  recent backups. Backups are transmitted over HTTPS and are readable only
  with your recovery code — keep it safe.</li>
</ul>

<h2>What we never do</h2>
<ul>
  <li>No analytics or tracking of any kind.</li>
  <li>No advertising, and no ad identifiers.</li>
  <li>No selling or sharing of data with third parties.</li>
  <li>No collection of your name, email, contacts, or location.</li>
</ul>

<h2>Scripture text</h2>
<p>Bible text is fetched from the bolls.life Bible API when you read a
chapter (and cached on your device, including for full offline download).
Like any web request, those requests include your IP address; no other
information about you is sent.</p>

<h2>Deleting your data</h2>
<p>Deleting the app removes all local data. To remove server-side backups
and your anonymous account, use "Reset everything" in Settings, or email us
your friend code and we'll delete the account's data promptly.</p>

<h2>Children</h2>
<p>Selah does not knowingly collect personal information from anyone,
including children; the app has no accounts and no data entry beyond what
stays on the device.</p>

<h2>Changes & contact</h2>
<p>If this policy changes, the current version will always live at this
address. Questions or deletion requests:
<a href="mailto:josiahturnq@gmail.com">josiahturnq@gmail.com</a>.</p>
`,
);

export const supportHtml = shell(
  'Support',
  `
<h1>Selah Support</h1>
<p class="muted">Selah: Bible &amp; Prayer</p>

<p>Selah is a quiet place to read Scripture, follow a plan, pray, and hide
verses in your heart. If something isn't working, email
<a href="mailto:josiahturnq@gmail.com">josiahturnq@gmail.com</a> and a human
will get back to you.</p>

<h2>Common questions</h2>
<ul>
  <li><strong>Moving to a new phone?</strong> On your old phone, open
  Settings → Backup and copy your recovery code. On the new phone, open
  Settings → Restore and paste it. Your prayer lists, notes, plans, and
  decks come back.</li>
  <li><strong>Widgets.</strong> Long-press your home screen → Edit → Add
  Widget → search "Selah". The Pray widget can pin a specific list (long-press
  the widget → Edit Widget), page through long lists, and hide already-prayed
  requests. Checking a request on the widget syncs into the app next time it
  opens.</li>
  <li><strong>Reading offline.</strong> Settings → Offline → download your
  translation once; every chapter then works with no connection.</li>
  <li><strong>Friends.</strong> Plans tab → add a friend with their 6-letter
  code. Friends see only your plan progress and streak — never prayers or
  notes.</li>
</ul>

<p><a href="/privacy">Privacy policy</a></p>
`,
);
