'use client';

import { usePathname, useRouter } from 'next/navigation';

function BackIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M19 12H5M12 19l-7-7 7-7" />
    </svg>
  );
}

function getScreenLabel(pathname: string): string {
  if (pathname === '/') return 'Home';
  if (pathname.startsWith('/nominations')) return 'Books';
  if (pathname.startsWith('/members')) return 'Members';
  if (pathname.startsWith('/archive')) return 'Archives';
  if (pathname.startsWith('/profile')) return 'Profile';
  if (pathname.startsWith('/login')) return 'Log in';
  if (pathname.startsWith('/signup')) return 'Sign up';
  return 'BookClub';
}

export function AppHeader() {
  const router = useRouter();
  const pathname = usePathname();
  const label = getScreenLabel(pathname);

  return (
    <header className="sticky top-0 z-10 flex w-full max-w-md items-center justify-between gap-2 border-b border-slate-800 bg-slate-950/95 px-2 backdrop-blur supports-[backdrop-filter]:bg-slate-950/80">
      <button
        type="button"
        onClick={() => router.back()}
        className="ml-2 flex shrink-0 items-center gap-2 py-3 pr-4 text-slate-400 transition-colors hover:text-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-500 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
        aria-label="Go back"
      >
        <BackIcon />
      </button>
      <h1 className="truncate text-center text-sm font-semibold text-slate-50">{label}</h1>
      <div className="w-[52px] shrink-0" aria-hidden />
    </header>
  );
}
