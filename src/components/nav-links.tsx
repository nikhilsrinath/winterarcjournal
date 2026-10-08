"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function NavLinks({ username }: { username: string | null }) {
  const path = usePathname();
  const links = [
    { href: "/", label: "Calendar", active: path === "/" },
    { href: "/logs", label: "Logs", active: path === "/logs" },
    { href: "/badges", label: "Badges", active: path === "/badges" },
    ...(username ? [{ href: `/u/${username}`, label: `@${username}`, active: path === `/u/${username}` }] : []),
  ];
  return (
    <div className="mr-1 hidden items-center gap-1 md:flex">
      {links.map((l) => (
        <Link
          key={l.href}
          href={l.href}
          aria-current={l.active ? "page" : undefined}
          className={`rounded-full px-3.5 py-2 text-sm font-semibold transition ${
            l.active ? "bg-surface text-ink shadow-[var(--shadow)]" : "text-mute hover:text-ink"
          }`}
        >
          {l.label}
        </Link>
      ))}
    </div>
  );
}
