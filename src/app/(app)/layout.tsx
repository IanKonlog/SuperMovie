import { requireSession } from "@/lib/auth";
import { logout } from "@/app/login/actions";
import { NavLinks } from "./nav-links";
import { MobileNav } from "./mobile-nav";
import { NavSearch } from "@/modules/media/components/nav-search";
import { ThemeToggle } from "./theme-toggle";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await requireSession();

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-10 border-b border-line/60 bg-gradient-to-b from-background to-background/80 backdrop-blur">
        <div className="flex w-full items-center gap-6 px-4 py-3 sm:px-8 lg:px-12">
          <span className="text-lg font-black tracking-tighter text-accent uppercase sm:text-xl">
            Supermovie
          </span>
          <div className="hidden md:block">
            <NavLinks />
          </div>
          <div className="ml-auto flex items-center gap-3 text-sm sm:gap-4">
            <NavSearch />
            <ThemeToggle />
            <span className="hidden text-muted sm:inline">
              {session.username}
            </span>
            <form action={logout}>
              <button
                type="submit"
                className="rounded-lg border border-line px-2.5 py-1 transition hover:bg-surface-2 sm:px-3"
              >
                Sign out
              </button>
            </form>
          </div>
        </div>
      </header>
      <main className="w-full flex-1 px-4 pb-24 pt-4 sm:px-8 sm:pt-6 md:pb-12 lg:px-12">
        {children}
      </main>
      <MobileNav />
    </div>
  );
}
