/**
 * Selah API — anonymous accounts, friends, reading-progress snapshots, and
 * weekly full-app backups for the local-first mobile app.
 *
 * Identity is deliberately PII-free: a device gets a uuid + random secret on
 * first sync ("Bearer <id>.<secret>") and a short human friend-code. There are
 * no emails, no passwords, nothing to breach beyond what a user chose to sync.
 */

import { serve } from '@hono/node-server';
import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';
import { Hono } from 'hono';

import { q } from './db.js';

const app = new Hono();

const MAX_BACKUPS_PER_USER = 8;
const MAX_BACKUP_BYTES = 2_000_000; // ~2 MB JSON — far above a heavy user's data
const MAX_FRIENDS = 50;

// Friend codes avoid ambiguous glyphs (0/O, 1/I/L) so they survive being read aloud.
const CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
const newFriendCode = () =>
  Array.from(randomBytes(6), (b) => CODE_ALPHABET[b % CODE_ALPHABET.length]).join('');

const hash = (secret) => createHash('sha256').update(secret).digest('hex');
const safeEqualHex = (a, b) => {
  const ba = Buffer.from(a, 'hex');
  const bb = Buffer.from(b, 'hex');
  return ba.length === bb.length && timingSafeEqual(ba, bb);
};

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Minimal per-IP limiter for account creation (the only unauthenticated write).
const createHits = new Map();
function allowCreate(ip) {
  const now = Date.now();
  const hits = (createHits.get(ip) ?? []).filter((t) => now - t < 3_600_000);
  hits.push(now);
  createHits.set(ip, hits);
  return hits.length <= 20;
}

/** Resolve the authenticated user or null. */
async function auth(c) {
  const header = c.req.header('authorization') ?? '';
  const token = header.replace(/^Bearer\s+/i, '').trim();
  const dot = token.indexOf('.');
  if (dot < 1) return null;
  const id = token.slice(0, dot);
  const secret = token.slice(dot + 1);
  if (!UUID_RE.test(id) || !secret) return null;
  const { rows } = await q('select id, secret_hash, display_name, friend_code from users where id = $1', [id]);
  const user = rows[0];
  if (!user || !safeEqualHex(user.secret_hash, hash(secret))) return null;
  q('update users set last_seen_at = now() where id = $1', [id]).catch(() => {});
  return user;
}

const requireAuth = async (c, next) => {
  const user = await auth(c);
  if (!user) return c.json({ error: 'unauthorized' }, 401);
  c.set('user', user);
  await next();
};

app.get('/health', (c) => c.json({ ok: true }));

// --- accounts ---------------------------------------------------------------

app.post('/v1/users', async (c) => {
  const ip = c.req.header('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
  if (!allowCreate(ip)) return c.json({ error: 'rate_limited' }, 429);
  const body = await c.req.json().catch(() => ({}));
  const displayName = String(body.displayName ?? 'Friend').slice(0, 60) || 'Friend';
  const secret = randomBytes(24).toString('base64url');
  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      const { rows } = await q(
        'insert into users (secret_hash, display_name, friend_code) values ($1, $2, $3) returning id, friend_code',
        [hash(secret), displayName, newFriendCode()],
      );
      return c.json({ id: rows[0].id, secret, friendCode: rows[0].friend_code });
    } catch (e) {
      if (e?.code !== '23505') throw e; // retry only on friend_code collision
    }
  }
  return c.json({ error: 'could_not_allocate_code' }, 500);
});

// --- progress + profile (one combined heartbeat from the client) ------------

app.put('/v1/progress', requireAuth, async (c) => {
  const user = c.get('user');
  const b = await c.req.json().catch(() => ({}));
  const displayName = String(b.displayName ?? '').slice(0, 60);
  if (displayName && displayName !== user.display_name) {
    await q('update users set display_name = $1 where id = $2', [displayName, user.id]);
  }
  const int = (v) => (Number.isFinite(Number(v)) ? Math.max(0, Math.trunc(Number(v))) : null);
  await q(
    `insert into progress (user_id, plan_title, plan_duration_days, completed_days, read_streak, last_active_day, updated_at)
     values ($1, $2, $3, $4, $5, $6, now())
     on conflict (user_id) do update set
       plan_title = excluded.plan_title,
       plan_duration_days = excluded.plan_duration_days,
       completed_days = excluded.completed_days,
       read_streak = excluded.read_streak,
       last_active_day = excluded.last_active_day,
       updated_at = now()`,
    [
      user.id,
      b.planTitle ? String(b.planTitle).slice(0, 120) : null,
      int(b.planDurationDays),
      int(b.completedDays),
      int(b.readStreak),
      b.lastActiveDay ? String(b.lastActiveDay).slice(0, 10) : null,
    ],
  );
  return c.json({ ok: true });
});

// --- friends -----------------------------------------------------------------

const FRIEND_SELECT = `
  select u.id, u.display_name, p.plan_title, p.plan_duration_days, p.completed_days, p.read_streak, p.last_active_day
  from friendships f
  join users u on u.id = f.friend_id
  left join progress p on p.user_id = u.id
  where f.user_id = $1
  order by u.display_name`;

const friendShape = (r) => ({
  id: r.id,
  name: r.display_name,
  planTitle: r.plan_title ?? '',
  completedDays: r.completed_days ?? 0,
  durationDays: r.plan_duration_days ?? 0,
  readStreak: r.read_streak ?? 0,
  lastActiveDayKey: r.last_active_day ?? '',
});

app.get('/v1/friends', requireAuth, async (c) => {
  const { rows } = await q(FRIEND_SELECT, [c.get('user').id]);
  return c.json({ friends: rows.map(friendShape) });
});

app.post('/v1/friends', requireAuth, async (c) => {
  const user = c.get('user');
  const body = await c.req.json().catch(() => ({}));
  const code = String(body.code ?? '').toUpperCase().replace(/[^A-Z0-9]/g, '');
  if (!code) return c.json({ error: 'bad_code' }, 400);
  const { rows } = await q('select id from users where friend_code = $1', [code]);
  const target = rows[0];
  if (!target) return c.json({ error: 'not_found' }, 404);
  if (target.id === user.id) return c.json({ error: 'cannot_add_self' }, 400);
  const { rows: countRows } = await q('select count(*)::int as n from friendships where user_id = $1', [user.id]);
  if (countRows[0].n >= MAX_FRIENDS) return c.json({ error: 'too_many_friends' }, 400);
  await q(
    `insert into friendships (user_id, friend_id) values ($1, $2), ($2, $1)
     on conflict do nothing`,
    [user.id, target.id],
  );
  const { rows: friends } = await q(FRIEND_SELECT, [user.id]);
  return c.json({ friends: friends.map(friendShape) });
});

app.delete('/v1/friends/:id', requireAuth, async (c) => {
  const user = c.get('user');
  const id = c.req.param('id');
  if (!UUID_RE.test(id)) return c.json({ error: 'bad_id' }, 400);
  await q('delete from friendships where (user_id = $1 and friend_id = $2) or (user_id = $2 and friend_id = $1)', [
    user.id,
    id,
  ]);
  return c.json({ ok: true });
});

// --- backups ------------------------------------------------------------------

app.put('/v1/backup', requireAuth, async (c) => {
  const user = c.get('user');
  const text = await c.req.text();
  if (text.length > MAX_BACKUP_BYTES) return c.json({ error: 'too_large' }, 413);
  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch {
    return c.json({ error: 'bad_json' }, 400);
  }
  if (!parsed || typeof parsed !== 'object' || !parsed.data) return c.json({ error: 'bad_shape' }, 400);
  await q('insert into backups (user_id, data) values ($1, $2)', [user.id, JSON.stringify(parsed.data)]);
  await q(
    `delete from backups where user_id = $1 and created_at not in
       (select created_at from backups where user_id = $1 order by created_at desc limit $2)`,
    [user.id, MAX_BACKUPS_PER_USER],
  );
  return c.json({ ok: true });
});

app.get('/v1/backup', requireAuth, async (c) => {
  const { rows } = await q(
    'select created_at, data from backups where user_id = $1 order by created_at desc limit 1',
    [c.get('user').id],
  );
  if (!rows[0]) return c.json({ backup: null });
  return c.json({ backup: { createdAt: rows[0].created_at, data: rows[0].data } });
});

// --- boot ---------------------------------------------------------------------

const port = Number(process.env.PORT ?? 8080);
serve({ fetch: app.fetch, port }, () => console.log(`selah-api listening on :${port}`));
