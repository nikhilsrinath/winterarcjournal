"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { BADGE_LINES, BADGE_NAMES, type Milestone } from "@/lib/badges";
import { TIERS } from "@/lib/badge-art";
import { Badge } from "./badge";
import { FlameIcon, LockIcon } from "./icons";

/** "Here's what it takes" popup for a badge that hasn't been earned yet. */
export function LockedBadgeDialog({
  milestone: m,
  current,
  signedIn,
  onClose,
}: {
  milestone: Milestone;
  current: number;
  signedIn: boolean;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const tier = TIERS[m];
  const left = Math.max(1, m - current);
  const pct = Math.min(100, Math.round((current / m) * 100));

  useEffect(() => {
    ref.current?.showModal();
  }, []);

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={(e) => e.target === e.currentTarget && ref.current?.close()}
      aria-labelledby="locked-title"
      className="locked-dialog m-auto w-[min(92vw,380px)] overflow-visible rounded-[28px] border border-white/15 bg-[#081026] p-0 text-[#e8f0ff] backdrop:bg-[#020615]/80 backdrop:backdrop-blur-sm"
      style={{ "--glow": tier.glow } as React.CSSProperties}
    >
      <div className="locked-glow" aria-hidden />
      <div className="relative flex flex-col items-center px-6 pb-6 pt-8 text-center">
        <div className="locked-badge">
          <div className="locked-shake">
            <Badge milestone={m} earned={false} size={132} />
          </div>
        </div>

        <p
          className="unlock-up mt-4 inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-[12px] font-bold text-[#c4d0ea]"
          style={{ animationDelay: "0.35s" }}
        >
          <LockIcon size={13} /> Locked
        </p>
        <h2
          id="locked-title"
          className="unlock-up mt-3 font-display text-[1.7rem] font-black leading-none"
          style={{ animationDelay: "0.42s" }}
        >
          {BADGE_NAMES[m]}
        </h2>
        <p className="unlock-up mt-3 text-[16px] font-semibold leading-snug text-white" style={{ animationDelay: "0.5s" }}>
          This unlocks when you complete a{" "}
          <span className="whitespace-nowrap font-display font-black" style={{ color: tier.glow, textShadow: `0 0 16px ${tier.glow}` }}>
            {m}-day
          </span>{" "}
          streak!
        </p>
        <p className="unlock-up mt-1.5 text-[14px] text-[#8b9aba]" style={{ animationDelay: "0.56s" }}>
          {BADGE_LINES[m]}
        </p>

        {signedIn && (
          <div className="unlock-up mt-5 w-full" style={{ animationDelay: "0.64s" }}>
            <div className="flex justify-between text-[13px] font-semibold text-[#b9c6e4]">
              <span className="inline-flex items-center gap-1.5">
                <FlameIcon size={14} className="text-[#ff8a4c]" /> Current streak
              </span>
              <span className="tabular">
                {current} / {m} days
              </span>
            </div>
            <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-white/10">
              <div
                className="locked-bar h-full rounded-full"
                style={
                  {
                    "--w": `${pct}%`,
                    background: `linear-gradient(90deg, ${tier.face[1]}, ${tier.glow})`,
                    boxShadow: `0 0 12px ${tier.glow}`,
                  } as React.CSSProperties
                }
              />
            </div>
            <p className="mt-2 text-[13px] text-[#8b9aba]">
              {left} more {left === 1 ? "day" : "days"} in a row to go
            </p>
          </div>
        )}

        <div className="unlock-up mt-6 flex w-full gap-2" style={{ animationDelay: "0.72s" }}>
          <button type="button" onClick={() => ref.current?.close()} className="btn-ghost flex-1 !border-white/20 !bg-white/5 !text-white">
            Close
          </button>
          <Link
            href={signedIn ? "/write" : "/signup"}
            className="btn flex-1 !text-[#04101f]"
            style={{ background: tier.glow, boxShadow: `0 0 26px -4px ${tier.glow}` }}
          >
            {signedIn ? "Log today" : "Start a streak"}
          </Link>
        </div>
      </div>
    </dialog>
  );
}
