/**
 * Home-screen widget data. The app precomputes everything the widgets show —
 * a rotation of prayer prompts and the current memory verse in its
 * fading-recall state — and hands it to the widget extension through the
 * shared App Group. The Swift side only renders; the logic lives here where
 * it ships over OTA.
 *
 * This shape is a frozen contract with the Swift TimelineProviders — bump
 * `v` and keep the old fields on any breaking change, since older installed
 * builds keep reading whatever the current JS writes.
 */

import { isPrayedThisCycle } from '@/lib/cycle';
import { isDue, stageLabel } from '@/lib/store/srs';
import type { AppData, Card } from '@/lib/store/types';
import { clozeKind, pickHiddenIndices, splitPunct, words } from '@/lib/study/cloze';
import { localDayKey } from '@/lib/util/date';

export type PrayerSlotItem = { id: string; text: string; prayed: boolean };

export type PrayerSlot = {
  at: number;
  listId: string;
  listTitle: string;
  /** First item's text — kept so the single-request widget from build 15
   *  keeps rendering after the app updates the snapshot over OTA. */
  text: string;
  /** The list's window: up to 4 items, not-yet-prayed-this-cycle first. */
  items: PrayerSlotItem[];
};

/** A list in full: every unanswered item, not-prayed-this-cycle first. The
 *  large widget shows ~8 and pages through the rest, so it needs more than
 *  a slot's window. */
export type PrayerListSnapshot = { id: string; title: string; items: PrayerSlotItem[] };

export type WidgetSnapshot = {
  v: 1;
  updatedAt: number;
  prayer: { empty: boolean; slots: PrayerSlot[]; lists: PrayerListSnapshot[] };
  memory: {
    empty: boolean;
    deckId: string | null;
    ref: string | null;
    cloze: string | null;
    stage: string | null;
    dueCount: number;
  };
};

/** Slots every 2 hours covering ~2 days, so the widget keeps rotating even
 *  if the app isn't opened tomorrow. */
const SLOT_MS = 2 * 3_600_000;
const SLOT_COUNT = 24;

function hashString(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = ((h << 5) - h + s.charCodeAt(i)) | 0;
  return h >>> 0;
}

/** Deterministic PRNG: widget content stays put within a day (the snapshot
 *  rewrites on every edit) and rotates fresh the next. */
function mulberry32(seed: number): () => number {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Items per slot — what the small/medium widget can comfortably list. */
const WINDOW = 4;
/** Cap on items handed over per list. The large widget lists ~8 and pages
 *  through the rest; this keeps the shared store small. */
const LIST_CAP = 24;

type RankedList = { id: string; title: string; items: PrayerSlotItem[] };

/** Each list's unanswered items, not-prayed-this-cycle first, oldest first
 *  within each group. Lists with nothing left to show are dropped. */
function rankLists(data: AppData, now: number): RankedList[] {
  return data.prayerLists
    .map((list) => ({
      id: list.id,
      title: list.title,
      items: list.items
        .filter((it) => !it.answered)
        .map((it) => ({
          id: it.id,
          text: it.text,
          prayed: isPrayedThisCycle(it.prayed, list.cycle, new Date(now)),
          createdAt: it.createdAt,
        }))
        .sort((a, b) => (a.prayed !== b.prayed ? (a.prayed ? 1 : -1) : a.createdAt - b.createdAt))
        .slice(0, LIST_CAP)
        .map(({ id, text, prayed }) => ({ id, text, prayed })),
    }))
    .filter((l) => l.items.length > 0);
}

function buildPrayerSlots(ranked: RankedList[], now: number): PrayerSlot[] {
  // One slot = one list's window: its title plus up to WINDOW items. Lists
  // rotate through the day in day-seeded order; a single long list rotates
  // its own window instead so there's still variety. The full list travels
  // separately in `lists` — this window is what the small/medium widget
  // shows (and all that builds before 18 can read).
  const lists = ranked.slice();
  const rand = mulberry32(hashString(localDayKey(new Date(now))));
  for (let i = lists.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [lists[i], lists[j]] = [lists[j], lists[i]];
  }

  const start = new Date(now);
  start.setMinutes(0, 0, 0);
  const slots: PrayerSlot[] = [];
  for (let i = 0; i < SLOT_COUNT; i++) {
    const list = lists[i % lists.length];
    const round = Math.floor(i / lists.length);
    const offset = list.items.length > WINDOW ? (round * WINDOW) % list.items.length : 0;
    const items: PrayerSlotItem[] = Array.from(
      { length: Math.min(WINDOW, list.items.length) },
      (_, k) => list.items[(offset + k) % list.items.length],
    );
    slots.push({
      at: start.getTime() + i * SLOT_MS,
      listId: list.id,
      listTitle: list.title,
      text: items[0].text,
      items,
    });
  }
  return slots;
}

function cardBox(card: Card): number {
  return Number.isFinite(card.box) ? card.box : 1;
}

/** The verse most worth a glance: a due card first (lowest stage, then
 *  soonest due), otherwise the least-known card still climbing. */
function pickMemoryCard(data: AppData, now: number): { deckId: string; card: Card } | null {
  let best: { deckId: string; card: Card } | null = null;
  for (const deck of data.decks) {
    if (deck.kind !== 'verse') continue;
    for (const card of deck.cards) {
      if (!card.back?.trim()) continue;
      if (!best) {
        best = { deckId: deck.id, card };
        continue;
      }
      const a = card;
      const b = best.card;
      const dueA = isDue(a, now);
      const dueB = isDue(b, now);
      const win =
        dueA !== dueB
          ? dueA
          : cardBox(a) !== cardBox(b)
            ? cardBox(a) < cardBox(b)
            : a.due < b.due;
      if (win) best = { deckId: deck.id, card };
    }
  }
  return best;
}

/**
 * The verse as the widget shows it: blanks matching the card's stage,
 * rendered as plain text. Seeded per (card, stage, day) so the pattern is
 * stable all day. Known cards return '' — the widget shows only the
 * reference.
 */
export function widgetCloze(back: string, box: number, seedKey: string): string {
  const kind = clozeKind(box);
  if (kind === 'memory') return '';
  const tokens = words(back);
  const hidden = pickHiddenIndices(tokens, box, mulberry32(hashString(seedKey)));
  return tokens
    .map((t, i) => {
      const { lead, core, trail } = splitPunct(t);
      if (!hidden.has(i) || !core) return t;
      const blank =
        kind === 'first-letter'
          ? core[0] + '_'.repeat(Math.max(2, Math.min(4, core.length - 1)))
          : '_'.repeat(Math.max(2, Math.min(6, core.length)));
      return lead + blank + trail;
    })
    .join(' ');
}

export function buildWidgetSnapshot(data: AppData, now: number = Date.now()): WidgetSnapshot {
  const ranked = rankLists(data, now);
  const slots = ranked.length > 0 ? buildPrayerSlots(ranked, now) : [];

  const pick = pickMemoryCard(data, now);
  let dueCount = 0;
  for (const deck of data.decks) {
    if (deck.kind !== 'verse') continue;
    for (const card of deck.cards) if (isDue(card, now)) dueCount++;
  }

  return {
    v: 1,
    updatedAt: now,
    prayer: { empty: slots.length === 0, slots, lists: ranked },
    memory: pick
      ? {
          empty: false,
          deckId: pick.deckId,
          ref: pick.card.front,
          cloze: widgetCloze(
            pick.card.back,
            cardBox(pick.card),
            `${pick.card.id}:${cardBox(pick.card)}:${localDayKey(new Date(now))}`,
          ),
          stage: stageLabel(cardBox(pick.card)),
          dueCount,
        }
      : { empty: true, deckId: null, ref: null, cloze: null, stage: null, dueCount: 0 },
  };
}
