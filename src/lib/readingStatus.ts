import { supabaseBrowserClient } from './supabaseClient';

export type ReadingStatus = 'reading' | 'read' | 'not_started';

export interface CurrentBookStatusSummary {
  userStatus: ReadingStatus;
  counts: {
    reading: number;
    read: number;
    not_started: number;
  };
}

export async function fetchCurrentBookStatusSummary(
  userId: string,
  currentBookId: string | null,
): Promise<CurrentBookStatusSummary> {
  if (!currentBookId) {
    return {
      userStatus: 'not_started',
      counts: { reading: 0, read: 0, not_started: 0 },
    };
  }

  const [userRes, countsRes, membersRes] = await Promise.all([
    supabaseBrowserClient
      .from('reading_statuses')
      .select('status')
      .eq('user_id', userId)
      .eq('book_id', currentBookId)
      .maybeSingle(),
    supabaseBrowserClient
      .from('reading_statuses')
      .select('status, user_id')
      .eq('book_id', currentBookId),
    supabaseBrowserClient.from('profiles').select('id'),
  ]);

  if (userRes.error) throw userRes.error;
  if (countsRes.error) throw countsRes.error;
  if (membersRes.error) throw membersRes.error;

  const userRow = userRes.data;
  const userStatus: ReadingStatus = userRow ? (userRow.status as ReadingStatus) : 'not_started';

  const totalMembers = membersRes.data?.length ?? 0;
  let reading = 0;
  let read = 0;

  (countsRes.data ?? []).forEach((row: any) => {
    if (row.status === 'reading') reading += 1;
    if (row.status === 'read') read += 1;
  });

  const not_started = totalMembers > 0 ? Math.max(totalMembers - reading - read, 0) : 0;

  return {
    userStatus,
    counts: {
      reading,
      read,
      not_started,
    },
  };
}

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
