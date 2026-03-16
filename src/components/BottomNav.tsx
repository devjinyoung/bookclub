import Link from "next/link";
import { usePathname } from "next/navigation";

const tabs = [
  { href: "/", label: "Home", icon: "🏠" },
  { href: "/nominations", label: "Nominations", icon: "📚" },
  { href: "/members", label: "Members", icon: "👥" },
  // We’ll later route this to /profile/[currentUserId]; for now /profile/me
  { href: "/profile/me", label: "Profile", icon: "👤" },
];

export function BottomNav() {
  const pathname = usePathname();

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
      </div>
    </nav>
  );
}

