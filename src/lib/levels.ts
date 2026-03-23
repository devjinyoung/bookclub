import { supabaseBrowserClient } from './supabaseClient';

export type Level = 'Bookworm' | 'Scholar' | 'Librarian' | 'Shakespeare';

export const levelRank: Record<Level, number> = {
  Bookworm: 0,
  Scholar: 2,
  Librarian: 4,
  Shakespeare: 10,
};

export interface LevelInfo {
  level: Level;
  booksRead: number;
  booksToNextLevel: number | null;
}

export function getLevelInfo(booksRead: number): LevelInfo {
  if (booksRead >= levelRank.Shakespeare) {
    return { level: 'Shakespeare', booksRead, booksToNextLevel: null };
  }
  if (booksRead >= levelRank.Librarian) {
    return { level: 'Librarian', booksRead, booksToNextLevel: 10 - booksRead };
  }
  if (booksRead >= levelRank.Scholar) {
    return { level: 'Scholar', booksRead, booksToNextLevel: 4 - booksRead };
  }
  return { level: 'Bookworm', booksRead, booksToNextLevel: 2 - booksRead };
}

export async function fetchBooksReadCount(userId: string): Promise<number> {
  const { data, error } = await supabaseBrowserClient
    .from('reading_statuses')
    .select('id, book_id')
    .eq('user_id', userId)
    .eq('status', 'read');

  if (error) {
    throw error;
  }

  const rows = data ?? [];
  if (rows.length === 0) return 0;

  const bookIds = rows.map((r: any) => r.book_id as string);

  const { data: current, error: currentError } = await supabaseBrowserClient
    .from('current_book')
    .select('book_id')
    .limit(1)
    .single();
  if (currentError && currentError.code !== 'PGRST116') {
    throw currentError;
  }

  const { data: archived, error: archivedError } = await supabaseBrowserClient
    .from('archived_books')
    .select('book_id');

  if (archivedError) {
    throw archivedError;
  }

  const clubBookIds = new Set<string>();
  if (current?.book_id) clubBookIds.add(current.book_id as string);
  (archived ?? []).forEach((row: any) => {
    clubBookIds.add(row.book_id as string);
  });

  return bookIds.filter((id) => clubBookIds.has(id)).length;
}
