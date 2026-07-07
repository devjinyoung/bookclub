'use client';
import { useEffect, useState } from 'react';
import { BookCard } from './BookCard';
import { updateCurrentBookStatus } from '@/lib/readingStatus';
import { supabaseBrowserClient } from '@/lib/supabaseClient';

interface ReadBook {
  id: string;
  title: string;
  author: string;
  coverImageUrl: string | null;
}

export function ReadBooks({ userId, handleUnread }: { userId: string; handleUnread?: () => void }) {
  const [readBooks, setReadBooks] = useState<ReadBook[]>([]);
  const [readBooksLoading, setReadBooksLoading] = useState(true);
  const [updatingStatus, setUpdatingStatus] = useState(false);

  useEffect(() => {
    //TODO: move to different file.
    async function loadReadBooks() {
      try {
        const { data, error } = await supabaseBrowserClient
          .from('reading_statuses')
          .select(
            `
            book:books (
              id,
              title,
              author,
              cover_image_url
            )
          `,
          )
          .eq('user_id', userId)
          .eq('status', 'read');

        if (error) {
          throw error;
        }

        const rows = (data ?? []) as any[];
        const mapped: ReadBook[] = rows
          .map((row) => row.book)
          .filter(Boolean)
          .map((book) => ({
            id: book.id as string,
            title: book.title as string,
            author: book.author as string,
            coverImageUrl: (book.cover_image_url as string | null | undefined) ?? null,
          }));

        setReadBooks(mapped);
      } catch {
        console.error('Unable to load books this member has read.');
      } finally {
        setReadBooksLoading(false);
      }
    }

    loadReadBooks();
  }, [userId]);

  async function handleUnreadClick(bookId: string) {
    setUpdatingStatus(true);
    try {
      await updateCurrentBookStatus(userId, bookId, 'reading');
      setReadBooks((prev) => prev.filter((book) => book.id !== bookId));
      handleUnread!();
    } catch {
      console.error('Unable to update reading status.');
    } finally {
      setUpdatingStatus(false);
    }
  }

  return (
    <section className="rounded-xl border border-slate-800 bg-slate-900/40 p-4">
      <h1 className="mb-2 text-lg">
        Books
        {readBooks.length > 0 && !readBooksLoading && <span> ({readBooks.length})</span>}
      </h1>

      {readBooksLoading && <p className="text-slate-500">Loading reading history…</p>}

      {!readBooksLoading && readBooks.length === 0 && (
        <p className="text-xs text-slate-500">No books read yet.</p>
      )}

      {!readBooksLoading && readBooks.length > 0 && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {readBooks.map((book) => (
            <BookCard
              key={book.id}
              title={book.title}
              author={book.author}
              coverImageUrl={book.coverImageUrl}
              actionButtonLabel={handleUnread ? 'Mark as unread' : undefined}
              onActionButtonClick={handleUnread ? () => handleUnreadClick(book.id) : undefined}
              actionButtonDisabled={updatingStatus}
              actionButtonLoading={updatingStatus}
              className="bg-slate-950/60"
            />
          ))}
        </div>
      )}
    </section>
  );
}
