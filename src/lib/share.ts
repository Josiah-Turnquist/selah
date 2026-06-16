/**
 * Local-first sharing. Devotional plans and prayer lists are encoded into a
 * compact, dependency-free base64url token that can be copied, texted, or opened
 * as a `selah://import/<code>` deep link and imported on another device.
 */

import type { Cycle } from '@/lib/cycle';

const ALPHA = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';

function utf8Bytes(str: string): number[] {
  const out: number[] = [];
  for (let i = 0; i < str.length; i++) {
    const c = str.charCodeAt(i);
    if (c < 0x80) {
      out.push(c);
    } else if (c < 0x800) {
      out.push(0xc0 | (c >> 6), 0x80 | (c & 0x3f));
    } else if (c >= 0xd800 && c <= 0xdbff) {
      const c2 = str.charCodeAt(++i);
      const cp = 0x10000 + ((c & 0x3ff) << 10) + (c2 & 0x3ff);
      out.push(0xf0 | (cp >> 18), 0x80 | ((cp >> 12) & 0x3f), 0x80 | ((cp >> 6) & 0x3f), 0x80 | (cp & 0x3f));
    } else {
      out.push(0xe0 | (c >> 12), 0x80 | ((c >> 6) & 0x3f), 0x80 | (c & 0x3f));
    }
  }
  return out;
}

function utf8FromBytes(bytes: number[]): string {
  let out = '';
  let i = 0;
  while (i < bytes.length) {
    const b = bytes[i++];
    if (b < 0x80) {
      out += String.fromCharCode(b);
    } else if (b < 0xe0) {
      out += String.fromCharCode(((b & 0x1f) << 6) | (bytes[i++] & 0x3f));
    } else if (b < 0xf0) {
      const b1 = bytes[i++];
      const b2 = bytes[i++];
      out += String.fromCharCode(((b & 0x0f) << 12) | ((b1 & 0x3f) << 6) | (b2 & 0x3f));
    } else {
      const b1 = bytes[i++];
      const b2 = bytes[i++];
      const b3 = bytes[i++];
      let cp = ((b & 0x07) << 18) | ((b1 & 0x3f) << 12) | ((b2 & 0x3f) << 6) | (b3 & 0x3f);
      cp -= 0x10000;
      out += String.fromCharCode(0xd800 + (cp >> 10), 0xdc00 + (cp & 0x3ff));
    }
  }
  return out;
}

function b64urlEncode(bytes: number[]): string {
  let out = '';
  for (let i = 0; i < bytes.length; i += 3) {
    const b0 = bytes[i];
    const b1 = bytes[i + 1];
    const b2 = bytes[i + 2];
    const has1 = b1 !== undefined;
    const has2 = b2 !== undefined;
    const n = (b0 << 16) | ((has1 ? b1 : 0) << 8) | (has2 ? b2 : 0);
    out += ALPHA[(n >> 18) & 63] + ALPHA[(n >> 12) & 63];
    if (has1) out += ALPHA[(n >> 6) & 63];
    if (has2) out += ALPHA[n & 63];
  }
  return out;
}

function b64urlDecode(str: string): number[] {
  const bytes: number[] = [];
  let buffer = 0;
  let bits = 0;
  for (const ch of str) {
    const val = ALPHA.indexOf(ch);
    if (val === -1) continue;
    buffer = (buffer << 6) | val;
    bits += 6;
    if (bits >= 8) {
      bits -= 8;
      bytes.push((buffer >> bits) & 0xff);
    }
  }
  return bytes;
}

// --- payloads -------------------------------------------------------------

export type SharePlanPayload = {
  t: 'plan';
  from?: string;
  templateId: string;
  title: string;
};

export type SharePrayerPayload = {
  t: 'prayer';
  from?: string;
  title: string;
  cycle: Cycle;
  items: { text: string; note?: string }[];
};

export type SharePayload = SharePlanPayload | SharePrayerPayload;

export const SHARE_LINK_PREFIX = 'selah://import/';

export function encodeShare(payload: SharePayload): string {
  return b64urlEncode(utf8Bytes(JSON.stringify(payload)));
}

export function shareLink(payload: SharePayload): string {
  return SHARE_LINK_PREFIX + encodeShare(payload);
}

/** Accepts a raw code, a `selah://import/<code>` link, or an `?code=`/`?d=` query. */
export function decodeShare(input: string): SharePayload | null {
  let code = input.trim();
  if (code.startsWith(SHARE_LINK_PREFIX)) code = code.slice(SHARE_LINK_PREFIX.length);
  const q = code.match(/[?&](?:code|d)=([^&]+)/);
  if (q) code = q[1];
  code = code.replace(/^selah:\/\/import\/?/, '');
  try {
    const obj = JSON.parse(utf8FromBytes(b64urlDecode(code)));
    if (obj && (obj.t === 'plan' || obj.t === 'prayer')) return obj as SharePayload;
    return null;
  } catch {
    return null;
  }
}
