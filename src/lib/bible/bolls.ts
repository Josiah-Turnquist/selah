/**
 * Bolls.life Bible API client. Chapters are cached in-memory and persisted to
 * AsyncStorage so any chapter you've opened is available offline afterwards.
 * Verse text is sanitised of Strong's-number / formatting markup.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

export type Verse = { verse: number; text: string };
export type SearchHit = { bookId: number; chapter: number; verse: number; text: string };

const BASE = 'https://bolls.life';
const memory = new Map<string, Verse[]>();

function cacheKey(translation: string, bookId: number, chapter: number): string {
  return `bolls:${translation}:${bookId}:${chapter}`;
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
    .replace(/ /g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

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
      memory.set(key, parsed);
      return parsed;
    }
  } catch {
    // fall through to network
  }

  const res = await fetch(`${BASE}/get-text/${encodeURIComponent(translation)}/${bookId}/${chapter}/`);
  if (!res.ok) throw new Error(`Couldn't load that chapter (${res.status})`);
  const json = (await res.json()) as { verse: number; text: string }[];
  const verses: Verse[] = json
    .map((v) => ({ verse: v.verse, text: cleanVerseText(v.text) }))
    .filter((v) => v.text.length > 0);

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
