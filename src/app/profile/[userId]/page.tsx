interface ProfilePageProps {
  params: {
    userId: string;
  };
}

export default function ProfilePage({ params }: ProfilePageProps) {
  const { userId } = params;

  return (
    <div className="space-y-4">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Profile</h1>
        <p className="mt-1 text-sm text-slate-400">
          Public profile for member <span className="font-mono">{userId}</span>.
        </p>
      </header>
      <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-4 text-sm text-slate-400">
        Profile details, reading history, and nominations will be implemented in
        a later phase.
      </div>
    </div>
  );
}

