/**
 * Offline download: sweep every chapter of a translation through the existing
 * getChapter() cache (memory → AsyncStorage → network), so previously visited
 * logic needs no changes — offline reading is just "everything is cached".
 * Re-running skips chapters already saved, so pause/resume is free.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

import { BOOKS } from './books';
import { cachePrefix, getChapter } from './bolls';

export const TOTAL_CHAPTERS = BOOKS.reduce((n, b) => n + b.chapters, 0); // 1,189

export async function countCachedChapters(translation: string): Promise<number> {
  try {
    const prefix = cachePrefix(translation);
    const keys = await AsyncStorage.getAllKeys();
    return keys.filter((k) => k.startsWith(prefix)).length;
  } catch {
    return 0;
  }
}

export type OfflineDownload = {
  promise: Promise<{ saved: number; failed: number; cancelled: boolean }>;
  cancel: () => void;
};

/**
 * Download every not-yet-cached chapter with modest concurrency (4 — polite to
 * Bolls' free API; the full Bible takes roughly a minute or two on wifi).
 * Failures are counted, not fatal: a re-run picks up whatever was missed.
 */
export function downloadTranslation(
  translation: string,
  onProgress: (saved: number) => void,
): OfflineDownload {
  let cancelled = false;

  const promise = (async () => {
    const prefix = cachePrefix(translation);
    let have: Set<string>;
    try {
      have = new Set((await AsyncStorage.getAllKeys()).filter((k) => k.startsWith(prefix)));
    } catch {
      have = new Set();
    }

    const todo: { bookId: number; chapter: number }[] = [];
    for (const b of BOOKS) {
      for (let ch = 1; ch <= b.chapters; ch++) {
        if (!have.has(`${prefix}${b.id}:${ch}`)) todo.push({ bookId: b.id, chapter: ch });
      }
    }

    let saved = have.size;
    let failed = 0;
    onProgress(saved);

    let next = 0;
    const worker = async () => {
      while (!cancelled) {
        const idx = next++;
        if (idx >= todo.length) return;
        const { bookId, chapter } = todo[idx];
        try {
          await getChapter(translation, bookId, chapter);
          saved++;
          onProgress(saved);
        } catch {
          failed++;
        }
      }
    };
    await Promise.all(Array.from({ length: 4 }, worker));
    return { saved, failed, cancelled };
  })();

  return { promise, cancel: () => (cancelled = true) };
}
