"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/", label: "Home" },
  { href: "/library", label: "My Library" },
  { href: "/stats", label: "Stats" },
  { href: "/books", label: "Books" },
];

export function NavLinks() {
  const pathname = usePathname();

  return (
    <nav aria-label="Main" className="flex items-center gap-1">
      {LINKS.map(({ href, label }) => {
        const active = pathname === href;
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={`relative rounded-lg px-3 py-1.5 text-sm font-semibold transition hover:bg-surface-2 ${
              active ? "text-foreground" : "text-muted hover:text-foreground"
            } after:absolute after:-bottom-0.5 after:left-3 after:right-3 after:h-0.5 after:rounded-full after:bg-accent after:transition-opacity after:duration-200 ${
              active
                ? "after:opacity-100"
                : "after:opacity-0 hover:after:opacity-40"
            }`}
          >
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
