import { NextResponse } from 'next/server';

const GOOGLE_BOOKS_BASE_URL = 'https://www.googleapis.com/books/v1/volumes';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('q');

  if (!query || query.trim().length === 0) {
    return NextResponse.json({ error: 'Missing search query (?q=...)' }, { status: 400 });
  }

  const apiKey = process.env.GOOGLE_BOOKS_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'Google Books API key is not configured.' }, { status: 500 });
  }

  try {
    const url = new URL(GOOGLE_BOOKS_BASE_URL);
    url.searchParams.set('q', query);
    url.searchParams.set('key', apiKey);
    url.searchParams.set('maxResults', '10');

    const res = await fetch(url.toString());

    if (!res.ok) {
      return NextResponse.json({ error: 'Failed to fetch from Google Books.' }, { status: 502 });
    }

    const json = await res.json();

    const items = Array.isArray(json.items) ? json.items : [];

    const results = items.map((item: any) => {
      const volumeInfo = item.volumeInfo ?? {};
      const imageLinks = volumeInfo.imageLinks ?? {};

      return {
        googleBooksId: item.id as string,
        title: volumeInfo.title ?? '',
        author: Array.isArray(volumeInfo.authors) ? (volumeInfo.authors[0] as string) : '',
        coverImageUrl: (imageLinks.thumbnail as string | undefined) ?? null,
        genre: Array.isArray(volumeInfo.categories) ? (volumeInfo.categories[0] as string) : null,
        pageCount:
          typeof volumeInfo.pageCount === 'number' ? (volumeInfo.pageCount as number) : null,
        description: (volumeInfo.description as string | undefined) ?? null,
      };
    });

    return NextResponse.json({ results });
  } catch (error) {
    console.error('Error searching Google Books', error);
    return NextResponse.json(
      { error: 'Unexpected error searching Google Books.' },
      { status: 500 },
    );
  }
}
