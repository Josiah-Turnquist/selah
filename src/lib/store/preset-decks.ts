/**
 * Curated "starter" decks for learning the basics — added from the Study tab and
 * used to seed new installs. Defined as plain data; `presetToDeck` stamps fresh
 * ids and SRS state so a copy is fully owned by the user.
 */

import { uid } from '@/lib/util/id';

import type { Card, Deck, DeckKind } from './types';

export type PresetCard = { front: string; back: string };

export type PresetDeck = {
  key: string;
  title: string;
  kind: DeckKind;
  description: string;
  cards: PresetCard[];
};

export const PRESET_DECKS: PresetDeck[] = [
  {
    key: 'apostles',
    title: 'The Twelve Apostles',
    kind: 'fact',
    description: 'Get to know the twelve men Jesus called.',
    cards: [
      { front: 'Which apostle was a tax collector?', back: 'Matthew (also called Levi)' },
      { front: 'Who walked on water toward Jesus?', back: 'Peter' },
      { front: 'Who is called “the disciple whom Jesus loved”?', back: 'John' },
      { front: 'Which apostle doubted until he saw the risen Jesus?', back: 'Thomas' },
      { front: 'Who replaced Judas Iscariot among the Twelve?', back: 'Matthias (Acts 1:26)' },
      { front: 'Who betrayed Jesus for thirty pieces of silver?', back: 'Judas Iscariot' },
      { front: 'Which two brothers, sons of Zebedee, were among the Twelve?', back: 'James and John' },
      { front: 'What did Jesus nickname James and John?', back: 'Boanerges — “Sons of Thunder”' },
      { front: 'Who brought his brother Simon Peter to Jesus?', back: 'Andrew' },
      { front: 'Which apostle is also known as Nathanael?', back: 'Bartholomew' },
      { front: 'Which apostle was called “the Zealot”?', back: 'Simon the Zealot' },
      { front: 'What trade did Peter, Andrew, James, and John share?', back: 'They were fishermen' },
      { front: 'Who asked Jesus, “Show us the Father”?', back: 'Philip' },
    ],
  },
  {
    key: 'nt-books',
    title: 'Books of the New Testament',
    kind: 'fact',
    description: 'Find your way around the New Testament.',
    cards: [
      { front: 'How many books are in the New Testament?', back: '27' },
      { front: 'Name the four Gospels.', back: 'Matthew, Mark, Luke, and John' },
      { front: 'Which book records the acts of the early church?', back: 'Acts' },
      { front: 'Who wrote most of the New Testament letters?', back: 'Paul' },
      { front: 'What is the last book of the Bible?', back: 'Revelation' },
      { front: 'Which Gospel writer was a physician?', back: 'Luke' },
      { front: 'Which is the longest of Paul’s letters?', back: 'Romans' },
      { front: 'What three letters are named for their recipients Timothy and Titus called?', back: 'The Pastoral Epistles' },
    ],
  },
  {
    key: 'key-people',
    title: 'Key People of the Bible',
    kind: 'fact',
    description: 'The major figures of the biblical story.',
    cards: [
      { front: 'Who built an ark to survive the flood?', back: 'Noah' },
      { front: 'Who led Israel out of slavery in Egypt?', back: 'Moses' },
      { front: 'Which shepherd boy became king and wrote many psalms?', back: 'David' },
      { front: 'Who was the wisest king of Israel?', back: 'Solomon' },
      { front: 'Who was unharmed in the lions’ den?', back: 'Daniel' },
      { front: 'Who was swallowed by a great fish?', back: 'Jonah' },
      { front: 'Who was the mother of Jesus?', back: 'Mary' },
      { front: 'Who baptized Jesus in the Jordan River?', back: 'John the Baptist' },
      { front: 'Who was the first man God created?', back: 'Adam' },
      { front: 'To whom did God promise descendants as numerous as the stars?', back: 'Abraham' },
    ],
  },
  {
    key: 'bible-basics',
    title: 'Bible Basics',
    kind: 'fact',
    description: 'Big-picture facts about the Bible itself.',
    cards: [
      { front: 'How many books are in the whole Bible?', back: '66 — 39 Old Testament, 27 New Testament' },
      { front: 'What are the first five books of the Bible called?', back: 'The Pentateuch (the Law / Torah)' },
      { front: 'What is the first book of the Bible?', back: 'Genesis' },
      { front: 'What is the shortest verse in the Bible?', back: '“Jesus wept.” (John 11:35)' },
      { front: 'What is the longest chapter in the Bible?', back: 'Psalm 119' },
      { front: 'What language was most of the Old Testament written in?', back: 'Hebrew' },
      { front: 'What language was the New Testament written in?', back: 'Greek' },
    ],
  },
  {
    key: 'miracles',
    title: 'Miracles of Jesus',
    kind: 'fact',
    description: 'Signs and wonders from the Gospels.',
    cards: [
      { front: 'What was Jesus’ first recorded miracle?', back: 'Turning water into wine at Cana (John 2)' },
      { front: 'How many men did Jesus feed with five loaves and two fish?', back: 'About 5,000 (plus women and children)' },
      { front: 'Whom did Jesus raise after four days in the tomb?', back: 'Lazarus' },
      { front: 'What did Jesus calm with a word on the sea?', back: 'A storm — the wind and the waves' },
      { front: 'Whose mother-in-law did Jesus heal of a fever?', back: 'Peter’s' },
    ],
  },
];

function makeCard(c: PresetCard, now: number): Card {
  return { id: uid('cd_'), front: c.front, back: c.back, box: 1, due: now, reviews: 0, createdAt: now };
}

/** Materialise a preset into an owned deck with fresh ids + fresh SRS state. */
export function presetToDeck(p: PresetDeck, now: number): Deck {
  return {
    id: uid('dk_'),
    title: p.title,
    description: p.description,
    kind: p.kind,
    createdAt: now,
    cards: p.cards.map((c) => makeCard(c, now)),
  };
}
