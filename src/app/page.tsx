export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
        <p className="text-sm text-slate-400">
          Overview of your club&apos;s current read, nominations, and progress.
        </p>
      </header>

      {/* Current Book section */}
      <section className="space-y-3 rounded-xl border border-slate-800 bg-slate-900/40 p-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-200">
            Current Book
          </h2>
          <button
            type="button"
            className="text-xs font-medium text-sky-400 hover:text-sky-300"
          >
            Set current book
          </button>
        </div>
        <div className="flex gap-3">
          <div className="flex h-20 w-14 items-center justify-center rounded-md bg-slate-800 text-xs text-slate-500">
            Cover
          </div>
          <div className="flex-1 space-y-2">
            <div>
              <p className="text-sm font-medium text-slate-200">
                No book selected
              </p>
              <p className="text-xs text-slate-500">
                When the club picks a book, it will appear here.
              </p>
            </div>
            <p className="text-xs text-slate-500">
              Status: 0 Read · 0 Reading · 0 Not Started
            </p>
          </div>
        </div>
      </section>

      {/* Top Nominations */}
      <section className="space-y-3 rounded-xl border border-slate-800 bg-slate-900/40 p-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-200">
            Top Nominations
          </h2>
          <span className="text-xs text-slate-500">See all nominations →</span>
        </div>
        <p className="text-xs text-slate-500">
          Nominated books with the most votes will appear here.
        </p>
      </section>

      {/* Your Progress */}
      <section className="space-y-3 rounded-xl border border-slate-800 bg-slate-900/40 p-4">
        <h2 className="text-sm font-semibold text-slate-200">
          Your Progress
        </h2>
        <p className="text-xs text-slate-500">
          Your current level, books read, and progress to the next level will
          appear here.
        </p>
      </section>

      {/* Activity Feed */}
      <section className="space-y-3 rounded-xl border border-slate-800 bg-slate-900/40 p-4">
        <h2 className="text-sm font-semibold text-slate-200">
          Activity Feed
        </h2>
        <p className="text-xs text-slate-500">
          Recent activity from your club (current book changes, nominations, and
          finished reads) will appear here.
        </p>
      </section>
    </div>
  );
}
