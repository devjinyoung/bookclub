import { supabaseBrowserClient } from './supabaseClient';
import { ensureBookFromSearchPayload, type SearchBookPayload } from './nominations';

export interface CurrentBookWithMeta {
  book_id: string;
  title: string;
  author: string;
  cover_image_url: string | null;
}

export async function fetchCurrentBook(): Promise<CurrentBookWithMeta | null> {
  const { data, error } = await supabaseBrowserClient
    .from('current_book')
    .select(
      `
      book_id,
      book:books (
        id,
        title,
        author,
        cover_image_url
      )
    `,
    )
    .limit(1)
    .single();

  if (error) {
    // If no row exists yet, treat as null.
    if (error.code === 'PGRST116') {
      return null;
    }
    throw error;
  }

  if (!data.book) {
    return null;
  }

  return {
    book_id: data.book.id as string,
    title: data.book.title as string,
    author: data.book.author as string,
    cover_image_url: (data.book.cover_image_url as string | null | undefined) ?? null,
  };
}

export async function updateCurrentBookFromSearchPayload(
  book: SearchBookPayload,
  userId: string,
): Promise<CurrentBookWithMeta> {
  const bookId = await ensureBookFromSearchPayload(book);

  const { error } = await supabaseBrowserClient
    .from('current_book')
    .update({
      book_id: bookId,
      set_by: userId,
      set_at: new Date().toISOString(),
      singleton: true,
    })
    .eq('singleton', true);

  if (error) {
    throw error;
  }

  return {
    book_id: bookId,
    title: book.title,
    author: book.author,
    cover_image_url: book.coverImageUrl ?? null,
  };
}
