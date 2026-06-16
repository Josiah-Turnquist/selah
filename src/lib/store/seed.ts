/** First-launch seed data so every feature is alive on day one. Dates are
 *  computed relative to "now" so the demo always looks current. */

import { DEFAULT_PALETTE } from '@/constants/theme';
import { DEFAULT_TRANSLATION } from '@/lib/bible/translations';
import { addDays, localDayKey } from '@/lib/util/date';
import { uid } from '@/lib/util/id';

import type { AppData, Card, CardRef, Deck, Friend, PlanProgress, PrayerList } from './types';
import { DATA_VERSION } from './types';

export function defaultData(): AppData {
  const now = Date.now();
  const today = new Date();

  // Seeded plan: Gospels in 30 Days, started 8 days ago, 6 days completed.
  const planStart = addDays(today, -8);
  const completedDays: Record<number, string> = {};
  for (let d = 1; d <= 6; d++) completedDays[d] = localDayKey(addDays(planStart, d - 1));
  const plan: PlanProgress = {
    id: uid('plan_'),
    templateId: 'gospels-30',
    title: 'Gospels in 30 Days',
    durationDays: 30,
    startedAt: localDayKey(planStart),
    completedDays,
  };

  const friends: Friend[] = [
    { id: uid('fr_'), name: 'Hannah', planTitle: 'Bible in a Year', completedDays: 168, durationDays: 365, lastActiveDayKey: localDayKey(today) },
    { id: uid('fr_'), name: 'Marcus', planTitle: 'New Testament in 90 Days', completedDays: 41, durationDays: 90, lastActiveDayKey: localDayKey(addDays(today, -1)) },
    { id: uid('fr_'), name: 'Grace', planTitle: 'Gospels in 30 Days', completedDays: 11, durationDays: 30, lastActiveDayKey: localDayKey(today) },
  ];

  const dailyPrayers: PrayerList = {
    id: uid('pl_'),
    title: 'Daily Prayers',
    cycle: 'daily',
    createdAt: now,
    items: [
      { id: uid('pi_'), text: 'Wisdom for today’s decisions', createdAt: now, prayed: [localDayKey(today)] },
      { id: uid('pi_'), text: 'Patience and kindness with family', createdAt: now, prayed: [localDayKey(addDays(today, -1)), localDayKey(addDays(today, -2))] },
      { id: uid('pi_'), text: 'Gratitude — name three things', createdAt: now, prayed: [] },
    ],
  };
  const peoplePrayers: PrayerList = {
    id: uid('pl_'),
    title: 'People I’m Praying For',
    cycle: 'weekly',
    createdAt: now,
    items: [
      { id: uid('pi_'), text: 'Mom’s health', note: 'Follow-up appointment this month', createdAt: now, prayed: [] },
      { id: uid('pi_'), text: 'Dani — job search', createdAt: now, prayed: [localDayKey(addDays(today, -3))] },
      { id: uid('pi_'), text: 'Our small group', createdAt: now, prayed: [] },
    ],
  };

  const makeCard = (front: string, back: string, ref?: CardRef): Card => ({
    id: uid('cd_'),
    front,
    back,
    ref,
    box: 1,
    due: now,
    reviews: 0,
    createdAt: now,
  });

  const memoryVerses: Deck = {
    id: uid('dk_'),
    title: 'Memory Verses',
    description: 'Verses to hide in your heart',
    kind: 'verse',
    createdAt: now,
    cards: [
      makeCard(
        'John 3:16',
        'For God so loved the world, that he gave his one and only Son, that whoever believes in him should not perish, but have eternal life.',
        { bookId: 43, chapter: 3, verse: 16 },
      ),
      makeCard('Philippians 4:13', 'I can do all things through Christ, who strengthens me.', {
        bookId: 50,
        chapter: 4,
        verse: 13,
      }),
      makeCard(
        'Proverbs 3:5',
        'Trust in Yahweh with all your heart, and don’t lean on your own understanding.',
        { bookId: 20, chapter: 3, verse: 5 },
      ),
    ],
  };

  const apostles: Deck = {
    id: uid('dk_'),
    title: 'The Twelve Apostles',
    description: 'A taste of V2 — study decks beyond verses',
    kind: 'fact',
    createdAt: now,
    cards: [
      makeCard('Which apostle was a tax collector?', 'Matthew (also called Levi)'),
      makeCard('Who walked on water toward Jesus?', 'Peter'),
      makeCard('Who is called “the disciple whom Jesus loved”?', 'John'),
      makeCard('Which apostle doubted until he saw the risen Jesus?', 'Thomas'),
      makeCard('Who replaced Judas Iscariot among the Twelve?', 'Matthias (Acts 1:26)'),
    ],
  };

  return {
    version: DATA_VERSION,
    settings: {
      translation: DEFAULT_TRANSLATION,
      readerFontScale: 1,
      displayName: 'You',
      theme: DEFAULT_PALETTE,
      appearance: 'system',
      reminderHour: null,
      onboarded: false,
    },
    lastRead: null,
    highlights: {},
    notes: [],
    plans: [plan],
    prayerLists: [dailyPrayers, peoplePrayers],
    decks: [memoryVerses, apostles],
    friends,
    readDays: Array.from({ length: 5 }, (_, i) => localDayKey(addDays(today, -i))),
  };
}
