"use client";

import { SunMoonIcon } from "./icons";

export function ThemeToggle() {
  function toggle() {
    const next = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
    document.documentElement.dataset.theme = next;
    try {
      localStorage.setItem("wa_theme", next);
    } catch {}
  }
  return (
    <button
      type="button"
      onClick={toggle}
      aria-label="Switch light or dark theme"
      title="Switch theme"
      className="grid h-10 w-10 place-items-center rounded-full border border-line bg-surface text-ink transition hover:border-accent hover:text-accent active:scale-90"
    >
      <SunMoonIcon size={18} />
    </button>
  );
}
