# Selah API

Tiny Hono + Postgres backend for the Selah app: anonymous accounts (no email/PII),
friend codes, reading-progress snapshots, and weekly full-app backups.

## Architecture

- **Auth:** `Authorization: Bearer <userId>.<secret>` — created once per device via
  `POST /v1/users`; the secret is stored hashed (sha256). No emails, no passwords.
- **Friends:** short human codes (e.g. `K7MPQ2`), mutual link, max 50.
- **Progress:** one snapshot per user (plan title, completed/duration, streak) — what
  friends see on the Plans tab.
- **Backups:** the app uploads its full local `AppData` weekly; the server keeps the
  latest 8 per user, 2 MB cap.

## Deploy (Railway + Neon)

1. Create a Neon project → copy the **pooled** connection string.
2. `railway init` in this directory (or point a Railway service at the repo with
   root directory `server/`).
3. `railway variables --set DATABASE_URL=<neon pooled url>`
4. `railway up`
5. Apply the schema once: `DATABASE_URL=<url> npm run migrate` (local) — it's
   idempotent and safe to re-run on deploys.
6. Put the public URL into `src/lib/api/client.ts` (`API_URL`) in the app and OTA.

## Local dev

```sh
cd server && npm install
DATABASE_URL=postgres://localhost/selah npm run migrate
DATABASE_URL=postgres://localhost/selah npm run dev
```
