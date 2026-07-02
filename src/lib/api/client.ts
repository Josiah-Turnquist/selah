/**
 * Client for the Selah API (server/): anonymous accounts, friends, progress
 * snapshots, weekly backups. The app is local-first — every call here is an
 * enhancement, never a requirement, and callers treat failures as no-ops.
 *
 * Identity is a uuid + secret minted by the server on first sync; the recovery
 * code shown in Settings is simply `userId.secret`.
 */

import type { Account, AppData, Friend } from '@/lib/store/types';

/** Base URL of the deployed API. Empty string disables all sync features. */
export const API_URL = 'https://selah-api-production-2b51.up.railway.app';

export const apiConfigured = () => API_URL.length > 0;

async function req<T>(
  path: string,
  opts: { method?: string; body?: unknown; account?: Account | { userId: string; secret: string } } = {},
): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 10_000);
  try {
    const res = await fetch(`${API_URL}${path}`, {
      method: opts.method ?? 'GET',
      signal: controller.signal,
      headers: {
        'content-type': 'application/json',
        ...(opts.account ? { authorization: `Bearer ${opts.account.userId}.${opts.account.secret}` } : {}),
      },
      body: opts.body != null ? JSON.stringify(opts.body) : undefined,
    });
    if (!res.ok) throw new Error(`api_${res.status}`);
    return (await res.json()) as T;
  } finally {
    clearTimeout(timer);
  }
}

export async function createAccount(displayName: string): Promise<Account> {
  const r = await req<{ id: string; secret: string; friendCode: string }>('/v1/users', {
    method: 'POST',
    body: { displayName },
  });
  return { userId: r.id, secret: r.secret, friendCode: r.friendCode };
}

export type ProgressSnapshot = {
  displayName: string;
  planTitle: string | null;
  planDurationDays: number | null;
  completedDays: number | null;
  readStreak: number;
  lastActiveDay: string | null;
};

export async function pushProgress(account: Account, snapshot: ProgressSnapshot): Promise<void> {
  await req('/v1/progress', { method: 'PUT', account, body: snapshot });
}

type ServerFriend = Friend & { readStreak?: number };

export async function fetchFriends(account: Account): Promise<Friend[]> {
  const r = await req<{ friends: ServerFriend[] }>('/v1/friends', { account });
  return r.friends;
}

export async function addFriend(account: Account, code: string): Promise<Friend[]> {
  const r = await req<{ friends: ServerFriend[] }>('/v1/friends', {
    method: 'POST',
    account,
    body: { code },
  });
  return r.friends;
}

export async function removeFriend(account: Account, friendId: string): Promise<void> {
  await req(`/v1/friends/${friendId}`, { method: 'DELETE', account });
}

export async function uploadBackup(account: Account, data: AppData): Promise<void> {
  await req('/v1/backup', { method: 'PUT', account, body: { data } });
}

export async function fetchBackup(creds: {
  userId: string;
  secret: string;
}): Promise<{ createdAt: string; data: unknown } | null> {
  const r = await req<{ backup: { createdAt: string; data: unknown } | null }>('/v1/backup', {
    account: creds,
  });
  return r.backup;
}

// --- recovery codes ----------------------------------------------------------

export const recoveryCode = (account: Account) => `${account.userId}.${account.secret}`;

export function parseRecoveryCode(input: string): { userId: string; secret: string } | null {
  const trimmed = input.trim();
  const dot = trimmed.indexOf('.');
  if (dot < 8) return null;
  const userId = trimmed.slice(0, dot);
  const secret = trimmed.slice(dot + 1);
  if (!/^[0-9a-f-]{36}$/i.test(userId) || secret.length < 8) return null;
  return { userId, secret };
}
