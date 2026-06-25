import type { Appearance, HighlightColor, PaletteId } from '@/constants/theme';
import type { Cycle } from '@/lib/cycle';

export type { Cycle };

export type ReaderWeight = '300' | '400' | '500' | '600';

export type Settings = {
  translation: string;
  compareTranslation: string | null; // second translation shown beneath each verse, or null
  readerFontScale: number; // 0.85 – 1.5
  readerWeight: ReaderWeight; // weight of the scripture text
  paragraphMode: boolean; // flow verses as a paragraph instead of one per line
  displayName: string;
  theme: PaletteId;
  appearance: Appearance;
  reminderHour: number | null; // 0–23, or null when off
  onboarded: boolean;
};

export type Highlight = { color: HighlightColor; createdAt: number };

export type Note = {
  id: string;
  bookId: number;
  chapter: number;
  verse: number;
  text: string;
  createdAt: number;
  updatedAt: number;
};

/** A reading plan the user has started. The day-by-day schedule lives in the
 *  PlanTemplate referenced by `templateId`; here we only track progress. */
export type PlanProgress = {
  id: string;
  templateId: string;
  title: string;
  durationDays: number;
  startedAt: string; // YYYY-MM-DD
  completedDays: Record<number, string>; // dayNumber -> dayKey it was completed
};

/** A friend's shared progress snapshot (local-first: seeded or imported by code). */
export type Friend = {
  id: string;
  name: string;
  planTitle: string;
  completedDays: number;
  durationDays: number;
  lastActiveDayKey: string;
};

export type PrayerItem = {
  id: string;
  text: string;
  note?: string;
  createdAt: number;
  prayed: string[]; // YYYY-MM-DD days the item was prayed
};

export type PrayerList = {
  id: string;
  title: string;
  cycle: Cycle;
  items: PrayerItem[];
  createdAt: number;
  sharedFrom?: string;
};

export type CardRef = { bookId: number; chapter: number; verse: number };

export type Card = {
  id: string;
  front: string;
  back: string;
  ref?: CardRef;
  box: number; // Leitner box 1–5
  due: number; // timestamp when next due
  reviews: number;
  createdAt: number;
};

export type DeckKind = 'verse' | 'fact';

export type Deck = {
  id: string;
  title: string;
  description?: string;
  kind: DeckKind;
  cards: Card[];
  createdAt: number;
};

export type AppData = {
  version: number;
  settings: Settings;
  lastRead: { bookId: number; chapter: number } | null;
  highlights: Record<string, Highlight>; // refKey -> highlight
  notes: Note[];
  plans: PlanProgress[];
  prayerLists: PrayerList[];
  decks: Deck[];
  friends: Friend[];
  readDays: string[]; // YYYY-MM-DD days a chapter was opened
};

export const DATA_VERSION = 1;
