/**
 * Bolls.life Bible API client. Chapters are cached in-memory and persisted to
 * AsyncStorage so any chapter you've opened is available offline afterwards.
 *
 * Raw verse text carries structural markup we parse before stripping:
 *   - `<br/>` separates poetic lines and pulls headings off the front of a verse
 *   - leading segments can be section titles, structural labels ("Psalm 3",
 *     "BOOK I") or a Psalm superscription ("A psalm of David…")
 *   - "Selah" is a liturgical marker set on its own right-aligned line
 *   - `<S>1234</S>` / `<sup>…</sup>` are Strong's-number / footnote markers
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

export type VerseLine = { text: string; selah: boolean };
export type Heading = { text: string; kind: 'section' | 'superscription' | 'divider' };

export type Verse = {
  verse: number;
  /** Plain body text (headings removed, Selah kept inline) for copy / search / notes / compare. */
  text: string;
  /** Display lines — poetry breaks honoured; empty when the verse is only a heading. */
  lines: VerseLine[];
  /** Section titles / superscriptions that precede this verse. */
  headings: Heading[];
};

export type SearchHit = { bookId: number; chapter: number; verse: number; text: string };

const BASE = 'https://bolls.life';
// Bump the namespace whenever parsing changes shape so older cached entries are ignored.
const CACHE_NS = 'bolls:v3';
const memory = new Map<string, Verse[]>();

function cacheKey(translation: string, bookId: number, chapter: number): string {
  return `${CACHE_NS}:${translation}:${bookId}:${chapter}`;
}

/** Storage-key prefix for one translation's cached chapters (offline download). */
export const cachePrefix = (translation: string) => `${CACHE_NS}:${translation}:`;

/** fetch with an abort timeout so a hung request fails fast instead of loading forever. */
async function fetchWithTimeout(url: string, ms = 12000): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  try {
    return await fetch(url, { signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Strip inline markup and normalise whitespace. Strong's-number and footnote
 * markers (`<S>1234</S>`, `<sup>1</sup>`) are removed *with their contents*;
 * formatting tags (`<i>`, `<b>`) are removed but their words kept.
 */
export function cleanVerseText(raw: string): string {
  return raw
    .replace(/<S>.*?<\/S>/gi, '')
    .replace(/<sup>.*?<\/sup>/gi, '')
    .replace(/<[^>]+>/g, '')
    .replace(/\s+([,.;:!?])/g, '$1')
    .replace(/ /g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// ── Structural parsing ──────────────────────────────────────────────────────

const BR = /<br\s*\/?>/i;

// A bare "Psalm 3" label duplicates our own chapter title — always dropped.
const REDUNDANT_LABEL = /^psalms?\s+\d+\.?$/i;
// Psalter structural dividers worth keeping ("BOOK I", "Psalms 1–41").
const BOOK_DIVIDER = /^(?:book\s+[ivxlcdm]+|psalms?\s+\d+\s*[–—-]\s*\d+)\.?$/i;

// Distinctive vocabulary of Psalm/prophetic superscriptions. Only consulted on
// verse 1 (where superscriptions occur) so body lines mentioning "David" etc.
// are never mistaken for a title.
const SUPERSCRIPTION_HINT =
  /(?:director of music|chief musician|for the music director|to the chief musician|a psalm|a song|a maskil|a miktam|a mikhtam|a shiggaion|a prayer|a petition|a contemplation|songs? of ascents|of david|of asaph|of solomon|of moses|of heman|of ethan|of jeduthun|of the sons of korah|of the descendants of korah|sons of korah|according to|stringed instruments|with stringed|do not destroy|sheminith|gittith|muth-?labben|mahalath|aijeleth|shoshannim|on shigionoth)/i;

// Lowercase function words allowed inside an otherwise title-cased heading.
const SMALL_WORD = /^(?:a|an|the|and|or|nor|of|to|in|on|for|with|at|by|from|as|but)$/i;

/**
 * Heuristic: a short, title-cased segment with no terminal punctuation is an
 * editorial heading ("The Beginning", "Trials and Temptations", "ב Beth").
 * Title case (every word capitalised or a small function word) is the key
 * signal — it distinguishes "The Beginning" from prose like "Blessed is the
 * man", where the lowercase verb "is" gives it away. A miss only restyles a
 * line, never drops text.
 */
function isSectionTitle(seg: string): boolean {
  if (/[.?!:;,”"'—]$/.test(seg)) return false;
  const words = seg.split(/\s+/).filter((w) => /[A-Za-z]/.test(w));
  if (words.length === 0 || words.length > 8) return false;
  let capped = 0;
  for (const w of words) {
    if (/^[A-Z0-9]/.test(w)) capped++;
    else if (!SMALL_WORD.test(w)) return false; // a lowercase content word ⇒ prose, not a title
  }
  return capped >= 1;
}

/** Pull a trailing "Selah" off a line, returning the body and whether it was present. */
function splitSelah(seg: string): VerseLine {
  const m = seg.match(/^(.*?)\s*\bSelah\.?\s*$/i);
  if (m) return { text: m[1].trim(), selah: true };
  return { text: seg, selah: false };
}

function parseVerse(verseNum: number, raw: string): Verse {
  const headings: Heading[] = [];

  // WEB-style superscription is a leading <b>…</b> run rather than a <br/> segment.
  let work = raw;
  const boldLead = work.match(/^\s*<b>([\s\S]*?)<\/b>\s*([\s\S]*)$/i);
  if (boldLead) {
    const boldText = cleanVerseText(boldLead[1]);
    if (boldText && (verseNum === 1 || SUPERSCRIPTION_HINT.test(boldText) || isSectionTitle(boldText))) {
      headings.push({ text: boldText, kind: SUPERSCRIPTION_HINT.test(boldText) ? 'superscription' : 'section' });
      work = boldLead[2];
    }
  }

  const segs = work
    .split(BR)
    .map((s) => cleanVerseText(s))
    .filter((s) => s.length > 0);

  let bodyStart = 0;
  if (segs.length > 1) {
    for (let i = 0; i < segs.length; i++) {
      const seg = segs[i];
      if (REDUNDANT_LABEL.test(seg)) {
        bodyStart = i + 1; // drop the "Psalm N" that duplicates our chapter title
        continue;
      }
      if (BOOK_DIVIDER.test(seg)) {
        headings.push({ text: seg, kind: 'divider' });
        bodyStart = i + 1;
        continue;
      }
      if (verseNum === 1 && SUPERSCRIPTION_HINT.test(seg)) {
        headings.push({ text: seg, kind: 'superscription' });
        bodyStart = i + 1;
        continue;
      }
      if (isSectionTitle(seg)) {
        headings.push({ text: seg, kind: 'section' });
        bodyStart = i + 1;
        continue;
      }
      break; // first body line — stop scanning
    }
  }

  const bodySegs = segs.slice(bodyStart);
  const lines = bodySegs.map(splitSelah);
  const text = bodySegs.join(' ').replace(/\s+/g, ' ').trim();

  return { verse: verseNum, text, lines, headings };
}

function parseChapter(rawVerses: { verse: number; text: string }[]): Verse[] {
  return rawVerses
    .map((v) => parseVerse(v.verse, v.text))
    .filter((v) => v.lines.length > 0 || v.headings.length > 0);
}

// ── Fetch / cache ───────────────────────────────────────────────────────────

export function peekChapter(translation: string, bookId: number, chapter: number): Verse[] | undefined {
  return memory.get(cacheKey(translation, bookId, chapter));
}

export async function getChapter(
  translation: string,
  bookId: number,
  chapter: number,
): Promise<Verse[]> {
  const key = cacheKey(translation, bookId, chapter);
  const hot = memory.get(key);
  if (hot) return hot;

  try {
    const stored = await AsyncStorage.getItem(key);
    if (stored) {
      const parsed = JSON.parse(stored) as Verse[];
      if (Array.isArray(parsed) && parsed.every((v) => Array.isArray(v.lines))) {
        memory.set(key, parsed);
        return parsed;
      }
    }
  } catch {
    // fall through to network
  }

  const url = `${BASE}/get-text/${encodeURIComponent(translation)}/${bookId}/${chapter}/`;
  let res: Response;
  try {
    res = await fetchWithTimeout(url);
  } catch {
    res = await fetchWithTimeout(url); // one retry for a transient drop or timeout
  }
  if (!res.ok) throw new Error(`Couldn't load that chapter (${res.status})`);
  const json = (await res.json()) as unknown;
  if (!Array.isArray(json)) throw new Error("Couldn't load that chapter");
  const verses = parseChapter(json as { verse: number; text: string }[]);

  memory.set(key, verses);
  AsyncStorage.setItem(key, JSON.stringify(verses)).catch(() => {});
  return verses;
}

/** Best-effort warming of a chapter (e.g. the next one). Never throws. */
export function prefetchChapter(translation: string, bookId: number, chapter: number): void {
  getChapter(translation, bookId, chapter).catch(() => {});
}

export async function getVerseText(
  translation: string,
  bookId: number,
  chapter: number,
  verse: number,
): Promise<string> {
  const verses = await getChapter(translation, bookId, chapter);
  return verses.find((v) => v.verse === verse)?.text ?? '';
}

/** Full-text search via Bolls. Resilient to the response shape; returns [] on failure. */
export async function searchBible(translation: string, query: string): Promise<SearchHit[]> {
  const q = query.trim();
  if (q.length < 2) return [];
  try {
    const res = await fetch(
      `${BASE}/find/${encodeURIComponent(translation)}/?search=${encodeURIComponent(q)}&limit=60`,
    );
    if (!res.ok) return [];
    const json: any = await res.json();
    const arr: any[] = Array.isArray(json) ? json : (json.results ?? json.data ?? []);
    return arr
      .map((r) => ({
        bookId: r.book ?? r.book_id,
        chapter: r.chapter,
        verse: r.verse,
        text: cleanVerseText(r.text ?? ''),
      }))
      .filter((h) => h.bookId && h.chapter && h.verse);
  } catch {
    return [];
  }
}
