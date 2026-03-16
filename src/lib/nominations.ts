import { supabaseBrowserClient } from './supabaseClient';

export interface SearchBookPayload {
  googleBooksId: string;
  title: string;
  author: string;
  coverImageUrl: string | null;
  genre?: string | null;
  pageCount?: number | null;
  description?: string | null;
}

export interface NominationWithMeta {
  id: string;
  pitch: string;
  created_at: string;
  updated_at: string;
  book: {
    id: string;
    title: string;
    author: string;
    cover_image_url: string | null;
  };
  nominator: {
    id: string;
    name: string;
  } | null;
  vote_count: number;
}

export async function fetchNominationsWithVotes(): Promise<NominationWithMeta[]> {
  const { data, error } = await supabaseBrowserClient
    .from('nominations')
    .select(
      `
        id,
        pitch,
        created_at,
        updated_at,
        book:books (
          id,
          title,
          author,
          cover_image_url
        ),
        nominator:profiles!nominations_nominated_by_fkey (
          id,
          name
        ),
        votes:votes ( id )
      `,
    )
    .order('created_at', { ascending: false });

  if (error) {
    throw error;
  }

  return (data ?? [])
    .map((row: any) => ({
      id: row.id as string,
      pitch: row.pitch as string,
      created_at: row.created_at as string,
      updated_at: row.updated_at as string,
      book: {
        id: row.book.id as string,
        title: row.book.title as string,
        author: row.book.author as string,
        cover_image_url: (row.book.cover_image_url as string | null) ?? null,
      },
      nominator: row.nominator
        ? ({
            id: row.nominator.id as string,
            name: row.nominator.name as string,
          } as const)
        : null,
      vote_count: Array.isArray(row.votes) ? row.votes.length : 0,
    }))
    .sort((a, b) => b.vote_count - a.vote_count);
}

export async function ensureBookFromSearchPayload(book: SearchBookPayload): Promise<string> {
  // First, see if the book is already cached.
  const existing = await supabaseBrowserClient
    .from('books')
    .select('id')
    .eq('google_books_id', book.googleBooksId)
    .maybeSingle();

  if (existing.error) {
    throw existing.error;
  }

  if (existing.data) {
    return existing.data.id as string;
  }

  // Otherwise, insert a new cached book record.
  const { data, error } = await supabaseBrowserClient
    .from('books')
    .insert({
      google_books_id: book.googleBooksId,
      title: book.title,
      author: book.author,
      cover_image_url: book.coverImageUrl,
      genre: book.genre ?? null,
      page_count: book.pageCount ?? null,
      description: book.description ?? null,
    })
    .select('id')
    .single();

  if (error) {
    throw error;
  }

  return data.id as string;
}

export async function assertBookCanBeNominated(bookId: string): Promise<void> {
  const [{ data: existingNom }, { data: existingArchive }] = await Promise.all([
    supabaseBrowserClient.from('nominations').select('id').eq('book_id', bookId).maybeSingle(),
    supabaseBrowserClient.from('archived_books').select('id').eq('book_id', bookId).maybeSingle(),
  ]);

  if (existingNom) {
    throw new Error('This book has already been nominated. Vote for it instead!');
  }

  if (existingArchive) {
    throw new Error('This book has already been read by the club.');
  }
}

export async function createNominationFromSearchPayload(
  book: SearchBookPayload,
  pitch: string,
  userId: string,
): Promise<NominationWithMeta> {
  const bookId = await ensureBookFromSearchPayload(book);
  await assertBookCanBeNominated(bookId);

  const { data, error } = await supabaseBrowserClient
    .from('nominations')
    .insert({
      book_id: bookId,
      nominated_by: userId,
      pitch,
    })
    .select(
      `
        id,
        pitch,
        created_at,
        updated_at,
        book:books (
          id,
          title,
          author,
          cover_image_url
        ),
        nominator:profiles!nominations_nominated_by_fkey (
          id,
          name
        ),
        votes:votes ( id )
      `,
    )
    .single();

  if (error) {
    // Unique constraint fallback, just in case.
    if (error.code === '23505') {
      throw new Error('This book has already been nominated. Vote for it instead!');
    }
    throw error;
  }

  return {
    id: data.id as string,
    pitch: data.pitch as string,
    created_at: data.created_at as string,
    updated_at: data.updated_at as string,
    book: {
      id: data.book.id as string,
      title: data.book.title as string,
      author: data.book.author as string,
      cover_image_url: (data.book.cover_image_url as string | null | undefined) ?? null,
    },
    nominator: data.nominator
      ? ({
          id: data.nominator.id as string,
          name: data.nominator.name as string,
        } as const)
      : null,
    vote_count: Array.isArray(data.votes) ? data.votes.length : 0,
  };
}

export async function fetchUserVoteNominationIds(userId: string): Promise<string[]> {
  const { data, error } = await supabaseBrowserClient
    .from('votes')
    .select('nomination_id')
    .eq('user_id', userId);

  if (error) {
    throw error;
  }

  return (data ?? []).map((row: any) => row.nomination_id as string);
}

export async function toggleVote(
  nominationId: string,
  hasVoted: boolean,
  userId: string,
): Promise<void> {
  if (hasVoted) {
    const { error } = await supabaseBrowserClient
      .from('votes')
      .delete()
      .eq('nomination_id', nominationId)
      .eq('user_id', userId);

    if (error) {
      throw error;
    }
  } else {
    const { error } = await supabaseBrowserClient.from('votes').insert({
      nomination_id: nominationId,
      user_id: userId,
    });

    if (error) {
      throw error;
    }
  }
}
