"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { getCurrentUser } from "@/lib/profile";

const tabs = [
  { href: "/", label: "Home", icon: "🏠" as const },
  { href: "/nominations", label: "Nominations", icon: "📚" as const },
  { href: "/members", label: "Members", icon: "👥" as const },
] as const;

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

  const isProfileActive = pathname.startsWith("/profile");

  return (
    <nav className="sticky bottom-0 left-0 right-0 border-t border-slate-800 bg-slate-950/80 backdrop-blur-md">
      <div className="mx-auto flex max-w-md items-stretch justify-between px-2 py-2 text-xs">
        {tabs.map((tab) => {
          const isActive =
            tab.href === "/"
              ? pathname === "/"
              : pathname.startsWith(tab.href);

          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`flex flex-1 flex-col items-center justify-center gap-0.5 rounded-md px-2 py-1 transition-colors ${
                isActive
                  ? "text-sky-300"
                  : "text-slate-400 hover:text-slate-100"
              }`}
            >
              <span className="text-lg leading-none">{tab.icon}</span>
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
              router.push("/login");
            }
          }}
          className={`flex flex-1 flex-col items-center justify-center gap-0.5 rounded-md px-2 py-1 text-xs transition-colors ${
            isProfileActive
              ? "text-sky-300"
              : "text-slate-400 hover:text-slate-100"
          }`}
        >
          <span className="text-lg leading-none">👤</span>
          <span className="leading-none">Profile</span>
        </button>
      </div>
    </nav>
  );
}

