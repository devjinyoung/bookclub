import { supabaseBrowserClient } from './supabaseClient';

export interface ArchivedBookWithMeta {
  id: string;
  month: number;
  year: number;
  book: {
    id: string;
    title: string;
    author: string;
    cover_image_url: string | null;
  };
}

export async function fetchArchivedBooks(): Promise<ArchivedBookWithMeta[]> {
  const { data, error } = await supabaseBrowserClient
    .from('archived_books')
    .select(
      `
        id,
        month,
        year,
        book:books (
          id,
          title,
          author,
          cover_image_url
        )
      `,
    )
    .order('year', { ascending: false })
    .order('month', { ascending: false })
    .order('archived_at', { ascending: false });

  if (error) {
    throw error;
  }

  return (data ?? []).map((row: any) => ({
    id: row.id as string,
    month: row.month as number,
    year: row.year as number,
    book: {
      id: row.book.id as string,
      title: row.book.title as string,
      author: row.book.author as string,
      cover_image_url: (row.book.cover_image_url as string | null | undefined) ?? null,
    },
  }));
}
