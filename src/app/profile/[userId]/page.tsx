"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { getProfileById } from "@/lib/profile";

interface Profile {
  id: string;
  name: string;
  bio: string | null;
  avatar_url: string | null;
}
export default function ProfilePage() {
  const params = useParams<{ userId: string }>();
  const userId = params.userId;
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getProfileById(userId)
      .then((data) => {
        setProfile(data);
      })
      .catch(() => {
        setError("Unable to load profile.");
      })
      .finally(() => {
        setLoading(false);
      });
  }, [userId]);
  
  const initials =
    profile?.name
      ?.split(" ")
      .filter(Boolean)
      .map((part) => part[0]?.toUpperCase())
      .slice(0, 2)
      .join("") ?? "?";

  return (
    <div className="space-y-4">
      <header className="flex items-center gap-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-sky-500 text-base font-semibold text-slate-950">
          {initials}
        </div>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            {profile?.name ?? "Member"}
          </h1>
          <p className="mt-1 text-xs text-slate-500">
            Profile ID: <span className="font-mono">{userId}</span>
          </p>
        </div>
      </header>

      <section className="space-y-2 rounded-xl border border-slate-800 bg-slate-900/40 p-4 text-sm">
        <h2 className="text-sm font-semibold text-slate-200">About</h2>
        {loading && <p className="text-slate-500">Loading profile…</p>}
        {error && <p className="text-red-400">{error}</p>}
        {!loading && !error && (
          <p className="text-slate-300">
            {profile?.bio || "This member hasn’t written a bio yet."}
          </p>
        )}
      </section>

      <section className="space-y-2 rounded-xl border border-slate-800 bg-slate-900/40 p-4 text-sm text-slate-400">
        Reading history and nominations will be added in a later phase.
      </section>
    </div>
  );
}


