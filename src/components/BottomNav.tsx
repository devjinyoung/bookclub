'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState, type ReactNode } from 'react';
import { getCurrentUser } from '@/lib/profile';

type Tab = {
  href: string;
  label: string;
  icon: ReactNode;
};

const tabs: Tab[] = [
  { href: '/', label: 'Home', icon: 'home.png' },
  { href: '/nominations', label: 'Books', icon: 'star.png' },
  { href: '/members', label: 'Members', icon: 'cat.png' },
  { href: '/archive', label: 'Archives', icon: 'menus.png' },
];

export function BottomNav() {
  const pathname = usePathname();
  const router = useRouter();
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  useEffect(() => {
    getCurrentUser().then(({ data }) => {
      if (data.user) {
        setCurrentUserId(data.user.id);
      }
    });
  }, []);

  const isProfileActive = pathname.startsWith('/profile');

  return (
    <nav className="w-full sticky bottom-0 left-0 right-0 border-t border-slate-800 bg-black">
      <div className="mx-auto flex w-full items-stretch justify-around px-2 py-2 text-xs text-white">
        {tabs.map((tab) => {
          const isActive = tab.href === '/' ? pathname === '/' : pathname.startsWith(tab.href);

          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`flex flex-col items-center justify-center gap-0.5 rounded-md px-2 py-1 transition-colors ${
                isActive ? 'text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              <img src={`/icons/${tab.icon}`} alt={tab.label} className="h-5 w-5 invert" />
              <span className="leading-none">{tab.label}</span>
            </Link>
          );
        })}

        <button
          type="button"
          onClick={() => {
            if (currentUserId) {
              router.push(`/profile/${currentUserId}`);
            } else {
              router.push('/login');
            }
          }}
          className={`flex flex-col items-center justify-center gap-0.5 rounded-md px-2 py-1 text-xs transition-colors ${
            isProfileActive ? 'text-white' : 'text-slate-400 hover:text-white'
          }`}
        >
          <span className="leading-none">
            <img src="/icons/person.png" alt="Profile" className="h-5 w-5 invert" />
          </span>
          <span className="leading-none">Profile</span>
        </button>
      </div>
    </nav>
  );
}
