'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabaseBrowserClient } from '@/lib/supabaseClient';

interface MemberRow {
  id: string;
  name: string;
  avatar_url: string | null;
}

export default function MembersPage() {
  const [members, setMembers] = useState<MemberRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadMembers() {
      try {
        const { data, error } = await supabaseBrowserClient
          .from('profiles')
          .select('id, name, avatar_url')
          .order('name', { ascending: true });

        if (error) throw error;

        const baseMembers: MemberRow[] =
          (data ?? []).map((row: any) => ({
            id: row.id as string,
            name: row.name as string,
            avatar_url: (row.avatar_url as string | null) ?? null,
          })) ?? [];

        setMembers(baseMembers);
      } catch {
        setError('Unable to load members.');
      } finally {
        setLoading(false);
      }
    }

    loadMembers();
  }, []);

  return (
    <div className="space-y-4">
      <header>
        <p className="mt-1 text-sm text-slate-400">
          Meet your fellow club members and see their reading progress.
        </p>
      </header>

      {loading && (
        <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-4 text-xs text-slate-500">
          Loading members…
        </div>
      )}

      {error && (
        <div className="rounded-xl border border-red-900 bg-red-950/40 p-4 text-xs text-red-300">
          {error}
        </div>
      )}

      {!loading && !error && members.length === 0 && (
        <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-4 text-sm text-slate-400">
          No members found yet.
        </div>
      )}

      {!loading && !error && members.length > 0 && (
        <ul className="space-y-2">
          {members.map((member) => {
            const initials =
              member.name
                .split(' ')
                .filter(Boolean)
                .map((part) => part[0]?.toUpperCase())
                .slice(0, 2)
                .join('') || '?';

            return (
              <li
                key={member.id}
                className="rounded-xl border border-slate-800 bg-slate-950/40 p-3"
              >
                <Link href={`/profile/${member.id}`} className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-sky-500 text-xs font-semibold text-slate-950">
                    {initials}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-slate-200">{member.name}</p>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
