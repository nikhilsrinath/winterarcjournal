"use client";

import { useEffect, useRef } from "react";
import { logout } from "@/app/actions";
import { SettingsForm } from "./settings-form";
import { ChevronRight, GearIcon } from "./icons";

/** Collapsible settings card on your own profile. Opens itself when the URL hash is #settings. */
export function ProfileSettings(props: { displayName: string; bio: string; timezone: string; zones: string[] }) {
  const ref = useRef<HTMLDetailsElement>(null);
  useEffect(() => {
    const sync = () => {
      if (window.location.hash === "#settings" && ref.current) {
        ref.current.open = true;
        ref.current.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    };
    sync();
    window.addEventListener("hashchange", sync);
    return () => window.removeEventListener("hashchange", sync);
  }, []);

  return (
    <details ref={ref} id="settings" className="card group scroll-mt-24 overflow-hidden">
      <summary className="flex cursor-pointer list-none items-center gap-3 p-4 md:p-6 [&::-webkit-details-marker]:hidden">
        <span className="grid h-10 w-10 place-items-center rounded-full bg-accent/12 text-accent">
          <GearIcon size={18} />
        </span>
        <span className="flex-1">
          <span className="block font-display text-lg font-extrabold leading-tight">Profile settings</span>
          <span className="text-sm text-mute">Name, bio, timezone, sign out</span>
        </span>
        <ChevronRight size={18} className="text-mute transition group-open:rotate-90" />
      </summary>
      <div className="border-t border-line p-4 md:p-6">
        <SettingsForm {...props} />
        <form action={logout} className="mt-6 border-t border-line pt-5">
          <button type="submit" className="btn-ghost w-full !text-ember hover:!border-ember sm:w-auto">
            Sign out
          </button>
        </form>
      </div>
    </details>
  );
}
