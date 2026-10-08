import Link from "next/link";
import { getViewer } from "@/lib/data";
import { logout } from "@/app/actions";
import { ThemeToggle } from "./theme-toggle";
import { MobileTabs } from "./mobile-tabs";
import { PlusIcon, SnowIcon } from "./icons";
import { NavLinks } from "./nav-links";

export function Logo() {
  return (
    <Link href="/" className="flex items-center gap-2" aria-label="WinterArc Journal — calendar">
      <span className="grid h-9 w-9 place-items-center rounded-xl bg-accent text-accent-ink shadow-[0_6px_20px_-6px_var(--accent)]">
        <SnowIcon size={20} />
      </span>
      <span className="font-display text-[17px] font-extrabold leading-none tracking-tight">
        Winter<span className="text-accent">Arc</span>
      </span>
    </Link>
  );
}

export async function Header() {
  const viewer = await getViewer();
  return (
    <header className="sticky top-0 z-30 border-b border-line/70 bg-bg/80 backdrop-blur-xl">
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between gap-3 px-4 md:px-8">
        <Logo />
        <nav className="flex items-center gap-1 md:gap-2" aria-label="Primary">
          <NavLinks username={viewer?.username ?? null} />
          {viewer ? (
            <>
              <Link href="/write" className="btn hidden !min-h-10 !px-5 md:inline-flex">
                <PlusIcon size={18} /> Log today
              </Link>
              <form action={logout} className="hidden md:block">
                <button className="rounded-full px-3 py-2 text-sm font-semibold text-mute hover:text-ink" type="submit">
                  Sign out
                </button>
              </form>
            </>
          ) : (
            <>
              <Link href="/login" className="rounded-full px-3 py-2 text-sm font-semibold hover:text-accent">
                Sign in
              </Link>
              <Link href="/signup" className="btn !min-h-10 !px-5">
                Join
              </Link>
            </>
          )}
          <ThemeToggle />
        </nav>
      </div>
    </header>
  );
}

export async function MobileNav() {
  const viewer = await getViewer();
  return <MobileTabs username={viewer?.username ?? null} />;
}
