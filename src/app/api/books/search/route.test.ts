import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const getUser = vi.fn();

vi.mock('@/lib/supabaseServer', () => ({
  createSupabaseServerClient: vi.fn(async () => ({
    auth: { getUser },
  })),
}));

import { GET } from './route';

function makeRequest(query?: string) {
  const url = query
    ? `http://localhost/api/books/search?q=${encodeURIComponent(query)}`
    : 'http://localhost/api/books/search';
  return new Request(url);
}

function mockedFetch() {
  return fetch as unknown as ReturnType<typeof vi.fn>;
}

describe('GET /api/books/search', () => {
  const originalApiKey = process.env.GOOGLE_BOOKS_API_KEY;

  beforeEach(() => {
    process.env.GOOGLE_BOOKS_API_KEY = 'test-key';
    getUser.mockReset();
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    if (originalApiKey === undefined) {
      delete process.env.GOOGLE_BOOKS_API_KEY;
    } else {
      process.env.GOOGLE_BOOKS_API_KEY = originalApiKey;
    }
    vi.unstubAllGlobals();
  });

  it('rejects unauthenticated requests before touching Google Books', async () => {
    getUser.mockResolvedValue({ data: { user: null } });

    const res = await GET(makeRequest('dune'));

    expect(res.status).toBe(401);
    expect(fetch).not.toHaveBeenCalled();
  });

  it('rejects a missing query', async () => {
    getUser.mockResolvedValue({ data: { user: { id: 'u1' } } });

    const res = await GET(makeRequest());

    expect(res.status).toBe(400);
    expect(fetch).not.toHaveBeenCalled();
  });

  it('rejects a blank/whitespace-only query', async () => {
    getUser.mockResolvedValue({ data: { user: { id: 'u1' } } });

    const res = await GET(makeRequest('   '));

    expect(res.status).toBe(400);
  });

  it('returns 500 when the Google Books API key is not configured', async () => {
    getUser.mockResolvedValue({ data: { user: { id: 'u1' } } });
    delete process.env.GOOGLE_BOOKS_API_KEY;

    const res = await GET(makeRequest('dune'));

    expect(res.status).toBe(500);
    expect(fetch).not.toHaveBeenCalled();
  });

  it('maps Google Books results for an authenticated request', async () => {
    getUser.mockResolvedValue({ data: { user: { id: 'u1' } } });
    mockedFetch().mockResolvedValue({
      ok: true,
      json: async () => ({
        items: [
          {
            id: 'abc123',
            volumeInfo: {
              title: 'Dune',
              authors: ['Frank Herbert', 'Someone Else'],
              imageLinks: { thumbnail: 'https://example.com/cover.jpg' },
              categories: ['Fiction'],
              pageCount: 412,
              description: 'A sci-fi epic.',
            },
          },
        ],
      }),
    });

    const res = await GET(makeRequest('dune'));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.results).toEqual([
      {
        googleBooksId: 'abc123',
        title: 'Dune',
        author: 'Frank Herbert',
        coverImageUrl: 'https://example.com/cover.jpg',
        genre: 'Fiction',
        pageCount: 412,
        description: 'A sci-fi epic.',
      },
    ]);
  });

  it('degrades sparse Google Books items to safe defaults instead of throwing', async () => {
    getUser.mockResolvedValue({ data: { user: { id: 'u1' } } });
    mockedFetch().mockResolvedValue({
      ok: true,
      json: async () => ({ items: [{ id: 'no-metadata' }] }),
    });

    const res = await GET(makeRequest('mystery'));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.results).toEqual([
      {
        googleBooksId: 'no-metadata',
        title: '',
        author: '',
        coverImageUrl: null,
        genre: null,
        pageCount: null,
        description: null,
      },
    ]);
  });

  it('returns 502 when Google Books responds with a non-OK status', async () => {
    getUser.mockResolvedValue({ data: { user: { id: 'u1' } } });
    mockedFetch().mockResolvedValue({ ok: false });

    const res = await GET(makeRequest('dune'));

    expect(res.status).toBe(502);
  });

  it('returns 500 when the fetch to Google Books throws', async () => {
    getUser.mockResolvedValue({ data: { user: { id: 'u1' } } });
    mockedFetch().mockRejectedValue(new Error('network down'));

    const res = await GET(makeRequest('dune'));

    expect(res.status).toBe(500);
  });
});
