"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  {
    href: "/",
    label: "Home",
    icon: "M3 11 12 3l9 8M5 10v10h5v-6h4v6h5V10",
  },
  {
    href: "/library",
    label: "Library",
    icon: "M4 5h7v14H4zM13 5h7v14h-7z",
  },
];

export function MobileNav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Main"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden"
    >
      <div className="flex">
        {LINKS.map(({ href, label, icon }) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? "page" : undefined}
              className={`flex flex-1 flex-col items-center gap-0.5 py-2 text-[11px] transition ${
                active ? "text-accent" : "text-muted hover:text-foreground"
              }`}
            >
              <svg
                aria-hidden
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-6 w-6"
              >
                <path d={icon} />
              </svg>
              {label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
