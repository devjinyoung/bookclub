import { supabaseBrowserClient } from "./supabaseClient";

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
    .from("nominations")
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
    .order("created_at", { ascending: false });

  if (error) {
    throw error;
  }

  return (data ?? []).map((row: any) => ({
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
  })).sort((a, b) => b.vote_count - a.vote_count);
}

