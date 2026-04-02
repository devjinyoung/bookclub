import { supabaseBrowserClient } from './supabaseClient';

export type ReadingStatus = 'reading' | 'read' | 'not_started';

export async function updateCurrentBookStatus(
  userId: string,
  bookId: string,
  status: ReadingStatus,
): Promise<void> {
  const { error } = await supabaseBrowserClient.from('reading_statuses').upsert(
    {
      user_id: userId,
      book_id: bookId,
      status,
    },
    {
      onConflict: 'user_id,book_id',
    },
  );

  if (error) throw error;
}

export async function fetchReadBookCount(userId: string): Promise<number> {
  const { data, error } = await supabaseBrowserClient
    .from('reading_statuses')
    .select('id, book_id')
    .eq('user_id', userId)
    .eq('status', 'read');

  if (error) throw error;
  return data?.length ?? 0;
}

export async function fetchCurrentBookStatus(
  userId: string,
  bookId: string,
): Promise<ReadingStatus> {
  const { data, error } = await supabaseBrowserClient
    .from('reading_statuses')
    .select('status')
    .eq('user_id', userId)
    .eq('book_id', bookId)
    .single();

  if (error) throw error;
  return data?.status ?? 'not_started';
}
