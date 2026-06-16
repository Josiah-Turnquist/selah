# Selah

A deliberately simple Bible app built around four ideas: read, plan, pray, and memorize.
Expo (React Native) + expo-router, local-first, with scripture from the
[Bolls](https://bolls.life) API. _Selah_ is a working name — rename freely.

## The four features

1. **Read** — Browse any of the 66 books, read in a clean serif layout, and select a
   verse to **highlight** (5 colors), attach a **personal note** (shown inline), copy,
   share, or send it straight to a study deck. Full-text search and a translation picker
   are built in. Chapters you open are cached on-device for offline reading.
2. **Plans** — Shareable, Bible-reading-only devotional plans (Bible in a Year, NT in 90
   Days, Gospels in 30, Psalms & Proverbs in 31, John in 21). Track day-by-day progress,
   your **% complete**, whether you're on track, and see **friends' progress**. Share a
   plan with a code/link.
3. **Pray** — Shareable prayer lists that **reset daily or weekly**. Checking an item
   marks it prayed for the current cycle; it resets automatically at rollover. Per-item
   streaks included.
4. **Study** — Quizlet-style memorization. Add a verse to a deck from the reader, then
   review with flashcards and self-graded spaced repetition (Leitner). The card model is
   generic (`verse` and `fact` decks), so **V2** fact decks — the apostles, how they
   died, etc. — already work; one sample is seeded.

## Run it

```bash
npm install
npx expo start        # then press i (iOS), a (Android), or w (web)
# or: npm run ios | npm run android | npm run web
```

Requires Node 22.13+. First launch seeds sample data (a plan in progress, prayer lists,
decks, friends) so every screen is alive; reset anytime in **Settings → Reset all app data**.

## How it's built

- **Expo SDK 56**, expo-router (custom `expo-router/ui` tab bar), React 19 + React Compiler, TypeScript.
- **Local-first store** — a single typed `AppData` object in `src/lib/store`, hydrated
  from and persisted to AsyncStorage. No backend, no login.
- **Bible text** — `src/lib/bible/bolls.ts` wraps the Bolls API (markup stripped, chapters
  cached). Defaults to public-domain **WEB**; 15 translations available in the picker.
- **Sharing** — `src/lib/share.ts` encodes a plan or prayer list into a compact
  `selah://import/<code>` link (dependency-free base64url), importable on the Import screen.

```
src/
  app/                 # expo-router routes (tabs + reader/plan/prayer/deck/… screens)
  components/          # UI kit (Screen, Button, Card, Sheet, ProgressRing, …) + sheets
  constants/theme.ts   # colors (light "paper" + dark), spacing, type, highlight palette
  lib/
    bible/             # 66-book metadata, translations, Bolls client, ref helpers
    plans/             # plan templates (generated from book data) + progress math
    store/             # types, seed data, SRS, the persisted Context store
    cycle.ts share.ts  # prayer-cycle logic, share codecs
```

## What's deliberately not here (yet)

Local-first means **sharing and "friends" are on-device** for now: plans/lists move by
share-code, and the friends shown are seeded examples. A real account + sync backend
(e.g. the Hono/Drizzle/Neon stack) is the natural next step to make sharing live.
