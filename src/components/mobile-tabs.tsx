"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarIcon, ListIcon, MedalIcon, PlusIcon, UserIcon } from "./icons";

export function MobileTabs({ username }: { username: string | null }) {
  const path = usePathname();
  const me = username
    ? { href: `/u/${username}`, label: "Me", active: path === `/u/${username}` }
    : { href: "/login", label: "Sign in", active: path === "/login" || path === "/signup" };
  const tab = (t: { href: string; label: string; active: boolean }, Icon: typeof CalendarIcon) => (
    <Link
      key={t.href}
      href={t.href}
      aria-current={t.active ? "page" : undefined}
      className={`relative flex h-16 flex-col items-center justify-center gap-1 text-[11px] font-bold transition active:scale-95 ${
        t.active ? "text-accent" : "text-mute"
      }`}
    >
      <Icon size={22} strokeWidth={t.active ? 2.4 : 2} />
      {t.label}
      {t.active && <span aria-hidden className="absolute top-1.5 h-1 w-1 rounded-full bg-accent shadow-[0_0_8px_var(--accent)]" />}
    </Link>
  );

  return (
    <nav
      aria-label="Mobile"
      className="fixed inset-x-3 bottom-[max(0.75rem,env(safe-area-inset-bottom))] z-40 grid grid-cols-5 items-center rounded-[26px] border border-line bg-surface/90 px-1 shadow-[0_18px_40px_-12px_rgb(0_0_0/0.45)] backdrop-blur-xl md:hidden"
    >
      {tab({ href: "/", label: "Calendar", active: path === "/" }, CalendarIcon)}
      {tab({ href: "/logs", label: "Logs", active: path === "/logs" }, ListIcon)}
      <Link
        href="/write"
        aria-current={path === "/write" ? "page" : undefined}
        className="mx-auto -mt-7 flex h-16 w-16 flex-col items-center justify-center rounded-full bg-accent text-[11px] font-bold text-accent-ink shadow-[0_10px_30px_-6px_var(--accent)] ring-4 ring-bg transition active:scale-90"
      >
        <PlusIcon size={22} strokeWidth={2.6} />
        Log
      </Link>
      {tab({ href: "/badges", label: "Badges", active: path === "/badges" }, MedalIcon)}
      {tab(me, UserIcon)}
    </nav>
  );
}
