/**
 * Local-first app store. A single AppData object is the source of truth, held in
 * React state, hydrated from AsyncStorage on launch and persisted (debounced) on
 * every change. Actions are stable for the life of the app.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { ActivityIndicator, AppState, StyleSheet, useColorScheme, View } from 'react-native';

import { Colors, DEFAULT_PALETTE, type Appearance, type HighlightColor, type PaletteId } from '@/constants/theme';
import { refKey } from '@/lib/bible/refs';
import type { Cycle } from '@/lib/cycle';
import type { PlanTemplate } from '@/lib/plans/templates';
import { presetToDeck, type PresetDeck } from '@/lib/store/preset-decks';
import { defaultData } from '@/lib/store/seed';
import { applyGrade, type Grade } from '@/lib/store/srs';
import {
  DATA_VERSION,
  type Account,
  type AppData,
  type CardRef,
  type Deck,
  type DeckKind,
  type Friend,
  type PrayerList,
  type ReaderWeight,
} from '@/lib/store/types';
import { addDays, localDayKey } from '@/lib/util/date';
import { uid } from '@/lib/util/id';

const STORAGE_KEY = 'selah:data:v1';

/**
 * Forward-migrate persisted data WITHOUT ever discarding it. Because everything
 * lives on-device (no server backup), an OTA must never wipe a user: every
 * recognised field is preserved exactly, and only genuinely missing fields fall
 * back to defaults — per-field, so a single corrupt key can't take the rest with
 * it. New optional fields added in later builds simply read as `undefined` on
 * older records. Settings are the one place we deep-merge so newly added toggles
 * get sane defaults.
 */
function hydrateParsed(p: any): AppData {
  const base = defaultData();
  if (!p || typeof p !== 'object') return base;
  return {
    version: DATA_VERSION,
    settings: { ...base.settings, ...(p.settings && typeof p.settings === 'object' ? p.settings : {}) },
    lastRead: p.lastRead ?? base.lastRead,
    highlights: p.highlights && typeof p.highlights === 'object' ? p.highlights : {},
    notes: Array.isArray(p.notes) ? p.notes : [],
    plans: Array.isArray(p.plans) ? p.plans : [],
    prayerLists: Array.isArray(p.prayerLists) ? p.prayerLists : base.prayerLists,
    decks: Array.isArray(p.decks) ? p.decks : base.decks,
    // Drop the pre-backend demo friends ("fr_" ids) — real friends come from the
    // API with server uuids and are cached here.
    friends: (Array.isArray(p.friends) ? p.friends : []).filter(
      (f: any) => !String(f?.id ?? '').startsWith('fr_'),
    ),
    readDays: Array.isArray(p.readDays) ? p.readDays : [],
    account: p.account && typeof p.account === 'object' ? p.account : null,
  };
}

function hydrate(raw: string | null): AppData {
  if (!raw) return defaultData();
  try {
    return hydrateParsed(JSON.parse(raw));
  } catch {
    // Unreadable — stash the raw blob under a recovery key instead of silently
    // discarding what may be someone's notes and prayers, then start fresh.
    AsyncStorage.setItem(`${STORAGE_KEY}:corrupt`, raw).catch(() => {});
    return defaultData();
  }
}

export type Actions = {
  // settings + reading position
  setTranslation: (short: string) => void;
  setCompareTranslation: (short: string | null) => void;
  setFontScale: (scale: number) => void;
  setReaderWeight: (weight: ReaderWeight) => void;
  setParagraphMode: (on: boolean) => void;
  setDisplayName: (name: string) => void;
  setPalette: (id: PaletteId) => void;
  setAppearance: (appearance: Appearance) => void;
  setReminderHour: (hour: number | null) => void;
  setOnboarded: (value: boolean) => void;
  recordRead: () => void;
  setLastRead: (bookId: number, chapter: number) => void;
  // highlights + notes
  setHighlight: (bookId: number, chapter: number, verse: number, color: HighlightColor | null) => void;
  upsertNote: (bookId: number, chapter: number, verse: number, text: string) => void;
  deleteNote: (id: string) => void;
  // reading plans
  startPlan: (template: PlanTemplate) => string;
  togglePlanDay: (planId: string, day: number) => void;
  catchUpPlan: (planId: string) => void;
  leavePlan: (planId: string) => void;
  // prayer
  addPrayerList: (title: string, cycle: Cycle) => string;
  updatePrayerList: (id: string, patch: { title?: string; cycle?: Cycle }) => void;
  deletePrayerList: (id: string) => void;
  addPrayerItem: (listId: string, text: string, note?: string) => void;
  updatePrayerItem: (listId: string, itemId: string, patch: { text?: string; note?: string }) => void;
  deletePrayerItem: (listId: string, itemId: string) => void;
  togglePrayed: (listId: string, itemId: string) => void;
  setPrayerAnswered: (listId: string, itemId: string, answered: boolean) => void;
  setListReminder: (listId: string, hour: number | null) => void;
  importPrayerList: (list: PrayerList, fromName?: string) => string;
  // study decks
  addDeck: (title: string, kind: DeckKind, description?: string) => string;
  addPresetDeck: (preset: PresetDeck) => string;
  updateDeck: (id: string, patch: { title?: string; description?: string }) => void;
  deleteDeck: (id: string) => void;
  addCard: (deckId: string, front: string, back: string, ref?: CardRef) => void;
  updateCard: (deckId: string, cardId: string, patch: { front?: string; back?: string }) => void;
  deleteCard: (deckId: string, cardId: string) => void;
  reviewCard: (deckId: string, cardId: string, grade: Grade, maxBox?: number) => void;
  // sync (friends + backups)
  setAccount: (account: Account | null) => void;
  setFriends: (friends: Friend[]) => void;
  restoreFromBackup: (data: unknown, account: Account) => void;
  // danger zone
  resetEverything: () => void;
};

const DataContext = createContext<AppData | null>(null);
const ActionsContext = createContext<Actions | null>(null);
const PaletteContext = createContext<PaletteId>(DEFAULT_PALETTE);
const AppearanceContext = createContext<Appearance>('system');

export function StoreProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<AppData | null>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dataRef = useRef<AppData | null>(null);
  dataRef.current = data;
  const scheme = useColorScheme();

  useEffect(() => {
    let active = true;
    (async () => {
      let raw: string | null = null;
      try {
        raw = await AsyncStorage.getItem(STORAGE_KEY);
      } catch {
        // storage read failed — fall back to defaults without crashing
      }
      if (active) setData(hydrate(raw));
    })();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!data) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      saveTimer.current = null;
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(data)).catch(() => {});
    }, 250);
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, [data]);

  // Flush any pending debounced write the moment the app leaves the foreground —
  // a force-quit right after an edit must not lose it.
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state !== 'background' && state !== 'inactive') return;
      if (!saveTimer.current) return;
      clearTimeout(saveTimer.current);
      saveTimer.current = null;
      const d = dataRef.current;
      if (d) AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(d)).catch(() => {});
    });
    return () => sub.remove();
  }, []);

  const actions = useMemo<Actions>(() => {
    const update = (fn: (prev: AppData) => AppData) => setData((p) => (p ? fn(p) : p));

    return {
      setTranslation: (translation) =>
        update((p) => ({ ...p, settings: { ...p.settings, translation } })),
      setCompareTranslation: (compareTranslation) =>
        update((p) => ({ ...p, settings: { ...p.settings, compareTranslation } })),
      setFontScale: (readerFontScale) =>
        update((p) => ({ ...p, settings: { ...p.settings, readerFontScale } })),
      setReaderWeight: (readerWeight) =>
        update((p) => ({ ...p, settings: { ...p.settings, readerWeight } })),
      setParagraphMode: (paragraphMode) =>
        update((p) => ({ ...p, settings: { ...p.settings, paragraphMode } })),
      setDisplayName: (displayName) =>
        update((p) => ({ ...p, settings: { ...p.settings, displayName } })),
      setPalette: (theme) => update((p) => ({ ...p, settings: { ...p.settings, theme } })),
      setAppearance: (appearance) => update((p) => ({ ...p, settings: { ...p.settings, appearance } })),
      setReminderHour: (reminderHour) =>
        update((p) => ({ ...p, settings: { ...p.settings, reminderHour } })),
      setOnboarded: (onboarded) => update((p) => ({ ...p, settings: { ...p.settings, onboarded } })),
      recordRead: () =>
        update((p) => {
          const today = localDayKey();
          if (p.readDays.includes(today)) return p;
          return { ...p, readDays: [...p.readDays, today].slice(-400) };
        }),
      setLastRead: (bookId, chapter) => update((p) => ({ ...p, lastRead: { bookId, chapter } })),

      setHighlight: (bookId, chapter, verse, color) =>
        update((p) => {
          const key = refKey(bookId, chapter, verse);
          const highlights = { ...p.highlights };
          if (color) highlights[key] = { color, createdAt: Date.now() };
          else delete highlights[key];
          return { ...p, highlights };
        }),

      upsertNote: (bookId, chapter, verse, text) =>
        update((p) => {
          const trimmed = text.trim();
          const existing = p.notes.find(
            (n) => n.bookId === bookId && n.chapter === chapter && n.verse === verse,
          );
          if (!trimmed) {
            return { ...p, notes: p.notes.filter((n) => n !== existing) };
          }
          const now = Date.now();
          if (existing) {
            return {
              ...p,
              notes: p.notes.map((n) =>
                n === existing ? { ...n, text: trimmed, updatedAt: now } : n,
              ),
            };
          }
          return {
            ...p,
            notes: [
              { id: uid('nt_'), bookId, chapter, verse, text: trimmed, createdAt: now, updatedAt: now },
              ...p.notes,
            ],
          };
        }),
      deleteNote: (id) => update((p) => ({ ...p, notes: p.notes.filter((n) => n.id !== id) })),

      startPlan: (template) => {
        const existing = dataRef.current?.plans.find((pl) => pl.templateId === template.id);
        if (existing) return existing.id;
        const id = uid('plan_');
        update((p) => ({
          ...p,
          plans: [
            {
              id,
              templateId: template.id,
              title: template.title,
              durationDays: template.durationDays,
              startedAt: localDayKey(),
              completedDays: {},
            },
            ...p.plans,
          ],
        }));
        return id;
      },
      togglePlanDay: (planId, day) =>
        update((p) => ({
          ...p,
          plans: p.plans.map((pl) => {
            if (pl.id !== planId) return pl;
            const completedDays = { ...pl.completedDays };
            if (completedDays[day]) delete completedDays[day];
            else completedDays[day] = localDayKey();
            return { ...pl, completedDays };
          }),
        })),
      // Reset the pace expectation so today is the next reading day. History
      // (startedAt, completedDays) is untouched — only the schedule anchor moves.
      catchUpPlan: (planId) =>
        update((p) => ({
          ...p,
          plans: p.plans.map((pl) => {
            if (pl.id !== planId) return pl;
            let nextDay = 1;
            while (nextDay <= pl.durationDays && pl.completedDays[nextDay]) nextDay++;
            return { ...pl, scheduleAnchor: localDayKey(addDays(new Date(), -(nextDay - 1))) };
          }),
        })),
      leavePlan: (planId) =>
        update((p) => ({ ...p, plans: p.plans.filter((pl) => pl.id !== planId) })),

      addPrayerList: (title, cycle) => {
        const id = uid('pl_');
        update((p) => ({
          ...p,
          prayerLists: [{ id, title, cycle, items: [], createdAt: Date.now() }, ...p.prayerLists],
        }));
        return id;
      },
      updatePrayerList: (id, patch) =>
        update((p) => ({
          ...p,
          prayerLists: p.prayerLists.map((l) => (l.id === id ? { ...l, ...patch } : l)),
        })),
      deletePrayerList: (id) =>
        update((p) => ({ ...p, prayerLists: p.prayerLists.filter((l) => l.id !== id) })),
      addPrayerItem: (listId, text, note) =>
        update((p) => ({
          ...p,
          prayerLists: p.prayerLists.map((l) =>
            l.id === listId
              ? {
                  ...l,
                  items: [
                    ...l.items,
                    { id: uid('pi_'), text: text.trim(), note: note?.trim() || undefined, createdAt: Date.now(), prayed: [] },
                  ],
                }
              : l,
          ),
        })),
      updatePrayerItem: (listId, itemId, patch) =>
        update((p) => ({
          ...p,
          prayerLists: p.prayerLists.map((l) =>
            l.id === listId
              ? {
                  ...l,
                  items: l.items.map((it) =>
                    it.id === itemId
                      ? { ...it, ...patch, note: patch.note?.trim() || it.note }
                      : it,
                  ),
                }
              : l,
          ),
        })),
      deletePrayerItem: (listId, itemId) =>
        update((p) => ({
          ...p,
          prayerLists: p.prayerLists.map((l) =>
            l.id === listId ? { ...l, items: l.items.filter((it) => it.id !== itemId) } : l,
          ),
        })),
      togglePrayed: (listId, itemId) => {
        const today = localDayKey();
        update((p) => ({
          ...p,
          prayerLists: p.prayerLists.map((l) => {
            if (l.id !== listId) return l;
            return {
              ...l,
              items: l.items.map((it) => {
                if (it.id !== itemId) return it;
                const has = it.prayed.includes(today);
                const prayed = has
                  ? it.prayed.filter((d) => d !== today)
                  : [...it.prayed, today].slice(-90);
                return { ...it, prayed };
              }),
            };
          }),
        }));
      },
      setPrayerAnswered: (listId, itemId, answered) =>
        update((p) => ({
          ...p,
          prayerLists: p.prayerLists.map((l) =>
            l.id === listId
              ? {
                  ...l,
                  items: l.items.map((it) =>
                    it.id === itemId
                      ? { ...it, answered, answeredAt: answered ? localDayKey() : undefined }
                      : it,
                  ),
                }
              : l,
          ),
        })),
      setListReminder: (listId, hour) =>
        update((p) => ({
          ...p,
          prayerLists: p.prayerLists.map((l) => (l.id === listId ? { ...l, reminderHour: hour } : l)),
        })),
      importPrayerList: (list, fromName) => {
        const id = uid('pl_');
        update((p) => ({
          ...p,
          prayerLists: [
            {
              ...list,
              id,
              createdAt: Date.now(),
              sharedFrom: fromName ?? list.sharedFrom,
              items: list.items.map((it) => ({ ...it, id: uid('pi_'), prayed: [] })),
            },
            ...p.prayerLists,
          ],
        }));
        return id;
      },

      addDeck: (title, kind, description) => {
        const id = uid('dk_');
        update((p) => ({
          ...p,
          decks: [{ id, title, kind, description, cards: [], createdAt: Date.now() }, ...p.decks],
        }));
        return id;
      },
      addPresetDeck: (preset) => {
        const deck = presetToDeck(preset, Date.now());
        update((p) => ({ ...p, decks: [deck, ...p.decks] }));
        return deck.id;
      },
      updateDeck: (id, patch) =>
        update((p) => ({ ...p, decks: p.decks.map((d) => (d.id === id ? { ...d, ...patch } : d)) })),
      deleteDeck: (id) => update((p) => ({ ...p, decks: p.decks.filter((d) => d.id !== id) })),
      addCard: (deckId, front, back, ref) =>
        update((p) => ({
          ...p,
          decks: p.decks.map((d) =>
            d.id === deckId
              ? {
                  ...d,
                  cards: [
                    { id: uid('cd_'), front: front.trim(), back: back.trim(), ref, box: 1, due: Date.now(), reviews: 0, createdAt: Date.now() },
                    ...d.cards,
                  ],
                }
              : d,
          ),
        })),
      updateCard: (deckId, cardId, patch) =>
        update((p) => ({
          ...p,
          decks: p.decks.map((d) =>
            d.id === deckId
              ? { ...d, cards: d.cards.map((c) => (c.id === cardId ? { ...c, ...patch } : c)) }
              : d,
          ),
        })),
      deleteCard: (deckId, cardId) =>
        update((p) => ({
          ...p,
          decks: p.decks.map((d) =>
            d.id === deckId ? { ...d, cards: d.cards.filter((c) => c.id !== cardId) } : d,
          ),
        })),
      reviewCard: (deckId, cardId, grade, maxBox) =>
        update((p) => ({
          ...p,
          decks: p.decks.map((d) =>
            d.id === deckId
              ? { ...d, cards: d.cards.map((c) => (c.id === cardId ? applyGrade(c, grade, Date.now(), maxBox) : c)) }
              : d,
          ),
        })),

      setAccount: (account) => update((p) => ({ ...p, account })),
      setFriends: (friends) => update((p) => ({ ...p, friends })),
      // Replace this device's data with a server backup, keeping the account the
      // restore was performed with. Runs through the same field-by-field guards
      // as launch hydration so a malformed backup can't corrupt the store.
      restoreFromBackup: (data, account) => setData({ ...hydrateParsed(data), account }),

      resetEverything: () => setData(defaultData()),
    };
    // setData is stable; `data` is only read for the dedupe check in startPlan,
    // which is acceptable for this one-off guard.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!data) {
    const palette = Colors[scheme === 'dark' ? 'dark' : 'light'];
    return (
      <View style={[styles.loading, { backgroundColor: palette.background }]}>
        <ActivityIndicator color={palette.accent} />
      </View>
    );
  }

  return (
    <AppearanceContext.Provider value={data.settings.appearance ?? 'system'}>
      <PaletteContext.Provider value={data.settings.theme ?? DEFAULT_PALETTE}>
        <ActionsContext.Provider value={actions}>
          <DataContext.Provider value={data}>{children}</DataContext.Provider>
        </ActionsContext.Provider>
      </PaletteContext.Provider>
    </AppearanceContext.Provider>
  );
}

export function useData(): AppData {
  const data = useContext(DataContext);
  if (!data) throw new Error('useData must be used within StoreProvider');
  return data;
}

export function useActions(): Actions {
  const actions = useContext(ActionsContext);
  if (!actions) throw new Error('useActions must be used within StoreProvider');
  return actions;
}

export function usePaletteId(): PaletteId {
  return useContext(PaletteContext);
}

export function useAppearance(): Appearance {
  return useContext(AppearanceContext);
}

const styles = StyleSheet.create({
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
