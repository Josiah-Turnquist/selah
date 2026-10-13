/**
 * Which decks to offer when a reader selection is added to a deck, and whether
 * a deck already holds it. Pure functions — the picker owns rendering.
 */

import type { CardRef, Deck } from '@/lib/store/types';

/** A reader selection on its way into a deck. */
export type Passage = { label: string; ref: CardRef; verses: number };

/** "Psalm 23:1" names one verse; "John 3:16-18" and "John 3:3, 5" don't. */
const singleVerseLabel = (front: string) => /:\s*\d+\s*$/.test(front);

/**
 * Whether the deck already holds this passage: a card starting on the same
 * verse with the same span. Single verses match on the reference alone, so the
 * starter deck's "Psalm 23:1" still counts against the reader's "Psalms 23:1".
 */
export function hasPassage(deck: Deck, p: Passage): boolean {
  return deck.cards.some(
    (c) =>
      !!c.ref &&
      c.ref.bookId === p.ref.bookId &&
      c.ref.chapter === p.ref.chapter &&
      c.ref.verse === p.ref.verse &&
      (c.front === p.label || (p.verses === 1 && singleVerseLabel(c.front))),
  );
}

export type DeckChoice = { deck: Deck; added: boolean };

/**
 * Decks worth offering for a verse: verse decks, plus any other deck that
 * already holds Scripture so it isn't stranded. Fact decks (Books of the Bible
 * and friends) stay out of the way. The deck you added to most recently leads.
 */
export function deckChoices(decks: Deck[], p: Passage | null): DeckChoice[] {
  const lastAdded = (d: Deck) => d.cards.reduce((m, c) => Math.max(m, c.createdAt), d.createdAt);
  return decks
    .filter((d) => d.kind === 'verse' || d.cards.some((c) => c.ref))
    .map((d) => ({ deck: d, added: p ? hasPassage(d, p) : false, at: lastAdded(d) }))
    .sort((a, b) => b.at - a.at)
    .map(({ deck, added }) => ({ deck, added }));
}
