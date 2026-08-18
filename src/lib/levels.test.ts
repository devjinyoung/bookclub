import { describe, expect, it, vi } from 'vitest';

vi.mock('./supabaseClient', () => ({
  supabaseBrowserClient: {},
}));

import { getLevelBand, getLevelInfo, levelRank } from './levels';

describe('getLevelInfo', () => {
  it('is Grasshopper below the Bookworm threshold', () => {
    expect(getLevelInfo(0)).toEqual({
      level: 'Grasshopper',
      booksRead: 0,
      booksToNextLevel: levelRank.Bookworm,
    });
    expect(getLevelInfo(3)).toEqual({
      level: 'Grasshopper',
      booksRead: 3,
      booksToNextLevel: 1,
    });
  });

  it('is Bookworm exactly at the Bookworm threshold', () => {
    expect(getLevelInfo(levelRank.Bookworm)).toEqual({
      level: 'Bookworm',
      booksRead: levelRank.Bookworm,
      booksToNextLevel: levelRank.Librarian - levelRank.Bookworm,
    });
  });

  it('is Librarian exactly at the Librarian threshold', () => {
    expect(getLevelInfo(levelRank.Librarian)).toEqual({
      level: 'Librarian',
      booksRead: levelRank.Librarian,
      booksToNextLevel: levelRank.Shakespeare - levelRank.Librarian,
    });
  });

  it('is Shakespeare at and beyond the top threshold, with no next level', () => {
    expect(getLevelInfo(levelRank.Shakespeare)).toEqual({
      level: 'Shakespeare',
      booksRead: levelRank.Shakespeare,
      booksToNextLevel: null,
    });
    expect(getLevelInfo(levelRank.Shakespeare + 50)).toEqual({
      level: 'Shakespeare',
      booksRead: levelRank.Shakespeare + 50,
      booksToNextLevel: null,
    });
  });
});

describe('getLevelBand', () => {
  it('returns the books range for a non-terminal level', () => {
    expect(getLevelBand('Grasshopper')).toEqual({
      bandStart: levelRank.Grasshopper,
      bandEnd: levelRank.Bookworm,
    });
    expect(getLevelBand('Librarian')).toEqual({
      bandStart: levelRank.Librarian,
      bandEnd: levelRank.Shakespeare,
    });
  });

  it('returns null for the terminal level', () => {
    expect(getLevelBand('Shakespeare')).toBeNull();
  });
});
