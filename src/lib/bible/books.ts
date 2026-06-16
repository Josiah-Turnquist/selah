/**
 * Canonical 66-book metadata. `id` matches the Bolls book numbering (Genesis = 1
 * ... Revelation = 66), so it doubles as the API book id.
 */

export type Testament = 'OT' | 'NT';

export type Book = {
  id: number;
  name: string;
  abbr: string;
  testament: Testament;
  chapters: number;
};

export const BOOKS: Book[] = [
  { id: 1, name: 'Genesis', abbr: 'Gen', testament: 'OT', chapters: 50 },
  { id: 2, name: 'Exodus', abbr: 'Exo', testament: 'OT', chapters: 40 },
  { id: 3, name: 'Leviticus', abbr: 'Lev', testament: 'OT', chapters: 27 },
  { id: 4, name: 'Numbers', abbr: 'Num', testament: 'OT', chapters: 36 },
  { id: 5, name: 'Deuteronomy', abbr: 'Deu', testament: 'OT', chapters: 34 },
  { id: 6, name: 'Joshua', abbr: 'Jos', testament: 'OT', chapters: 24 },
  { id: 7, name: 'Judges', abbr: 'Jdg', testament: 'OT', chapters: 21 },
  { id: 8, name: 'Ruth', abbr: 'Rut', testament: 'OT', chapters: 4 },
  { id: 9, name: '1 Samuel', abbr: '1Sa', testament: 'OT', chapters: 31 },
  { id: 10, name: '2 Samuel', abbr: '2Sa', testament: 'OT', chapters: 24 },
  { id: 11, name: '1 Kings', abbr: '1Ki', testament: 'OT', chapters: 22 },
  { id: 12, name: '2 Kings', abbr: '2Ki', testament: 'OT', chapters: 25 },
  { id: 13, name: '1 Chronicles', abbr: '1Ch', testament: 'OT', chapters: 29 },
  { id: 14, name: '2 Chronicles', abbr: '2Ch', testament: 'OT', chapters: 36 },
  { id: 15, name: 'Ezra', abbr: 'Ezr', testament: 'OT', chapters: 10 },
  { id: 16, name: 'Nehemiah', abbr: 'Neh', testament: 'OT', chapters: 13 },
  { id: 17, name: 'Esther', abbr: 'Est', testament: 'OT', chapters: 10 },
  { id: 18, name: 'Job', abbr: 'Job', testament: 'OT', chapters: 42 },
  { id: 19, name: 'Psalms', abbr: 'Psa', testament: 'OT', chapters: 150 },
  { id: 20, name: 'Proverbs', abbr: 'Pro', testament: 'OT', chapters: 31 },
  { id: 21, name: 'Ecclesiastes', abbr: 'Ecc', testament: 'OT', chapters: 12 },
  { id: 22, name: 'Song of Solomon', abbr: 'Sng', testament: 'OT', chapters: 8 },
  { id: 23, name: 'Isaiah', abbr: 'Isa', testament: 'OT', chapters: 66 },
  { id: 24, name: 'Jeremiah', abbr: 'Jer', testament: 'OT', chapters: 52 },
  { id: 25, name: 'Lamentations', abbr: 'Lam', testament: 'OT', chapters: 5 },
  { id: 26, name: 'Ezekiel', abbr: 'Eze', testament: 'OT', chapters: 48 },
  { id: 27, name: 'Daniel', abbr: 'Dan', testament: 'OT', chapters: 12 },
  { id: 28, name: 'Hosea', abbr: 'Hos', testament: 'OT', chapters: 14 },
  { id: 29, name: 'Joel', abbr: 'Joe', testament: 'OT', chapters: 3 },
  { id: 30, name: 'Amos', abbr: 'Amo', testament: 'OT', chapters: 9 },
  { id: 31, name: 'Obadiah', abbr: 'Oba', testament: 'OT', chapters: 1 },
  { id: 32, name: 'Jonah', abbr: 'Jon', testament: 'OT', chapters: 4 },
  { id: 33, name: 'Micah', abbr: 'Mic', testament: 'OT', chapters: 7 },
  { id: 34, name: 'Nahum', abbr: 'Nah', testament: 'OT', chapters: 3 },
  { id: 35, name: 'Habakkuk', abbr: 'Hab', testament: 'OT', chapters: 3 },
  { id: 36, name: 'Zephaniah', abbr: 'Zep', testament: 'OT', chapters: 3 },
  { id: 37, name: 'Haggai', abbr: 'Hag', testament: 'OT', chapters: 2 },
  { id: 38, name: 'Zechariah', abbr: 'Zec', testament: 'OT', chapters: 14 },
  { id: 39, name: 'Malachi', abbr: 'Mal', testament: 'OT', chapters: 4 },
  { id: 40, name: 'Matthew', abbr: 'Mat', testament: 'NT', chapters: 28 },
  { id: 41, name: 'Mark', abbr: 'Mrk', testament: 'NT', chapters: 16 },
  { id: 42, name: 'Luke', abbr: 'Luk', testament: 'NT', chapters: 24 },
  { id: 43, name: 'John', abbr: 'Jhn', testament: 'NT', chapters: 21 },
  { id: 44, name: 'Acts', abbr: 'Act', testament: 'NT', chapters: 28 },
  { id: 45, name: 'Romans', abbr: 'Rom', testament: 'NT', chapters: 16 },
  { id: 46, name: '1 Corinthians', abbr: '1Co', testament: 'NT', chapters: 16 },
  { id: 47, name: '2 Corinthians', abbr: '2Co', testament: 'NT', chapters: 13 },
  { id: 48, name: 'Galatians', abbr: 'Gal', testament: 'NT', chapters: 6 },
  { id: 49, name: 'Ephesians', abbr: 'Eph', testament: 'NT', chapters: 6 },
  { id: 50, name: 'Philippians', abbr: 'Php', testament: 'NT', chapters: 4 },
  { id: 51, name: 'Colossians', abbr: 'Col', testament: 'NT', chapters: 4 },
  { id: 52, name: '1 Thessalonians', abbr: '1Th', testament: 'NT', chapters: 5 },
  { id: 53, name: '2 Thessalonians', abbr: '2Th', testament: 'NT', chapters: 3 },
  { id: 54, name: '1 Timothy', abbr: '1Ti', testament: 'NT', chapters: 6 },
  { id: 55, name: '2 Timothy', abbr: '2Ti', testament: 'NT', chapters: 4 },
  { id: 56, name: 'Titus', abbr: 'Tit', testament: 'NT', chapters: 3 },
  { id: 57, name: 'Philemon', abbr: 'Phm', testament: 'NT', chapters: 1 },
  { id: 58, name: 'Hebrews', abbr: 'Heb', testament: 'NT', chapters: 13 },
  { id: 59, name: 'James', abbr: 'Jas', testament: 'NT', chapters: 5 },
  { id: 60, name: '1 Peter', abbr: '1Pe', testament: 'NT', chapters: 5 },
  { id: 61, name: '2 Peter', abbr: '2Pe', testament: 'NT', chapters: 3 },
  { id: 62, name: '1 John', abbr: '1Jn', testament: 'NT', chapters: 5 },
  { id: 63, name: '2 John', abbr: '2Jn', testament: 'NT', chapters: 1 },
  { id: 64, name: '3 John', abbr: '3Jn', testament: 'NT', chapters: 1 },
  { id: 65, name: 'Jude', abbr: 'Jud', testament: 'NT', chapters: 1 },
  { id: 66, name: 'Revelation', abbr: 'Rev', testament: 'NT', chapters: 22 },
];

const BY_ID = new Map(BOOKS.map((b) => [b.id, b]));

export function bookById(id: number): Book | undefined {
  return BY_ID.get(id);
}

export function bookName(id: number): string {
  return BY_ID.get(id)?.name ?? `Book ${id}`;
}

export const TOTAL_CHAPTERS = BOOKS.reduce((n, b) => n + b.chapters, 0); // 1189
