"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { BADGE_LINES, BADGE_NAMES, type Milestone } from "@/lib/badges";
import { TIERS } from "@/lib/badge-art";
import type { ShareCardData } from "@/lib/share-card";
import { Badge } from "./badge";
import { ShareBadge } from "./share-badge";

const SHARDS = 28;
const CONFETTI = 46;

/** Pseudo-random but stable per index, so server and client markup agree. */
const r = (i: number, salt: number) => {
  const x = Math.sin(i * 12.9898 + salt * 78.233) * 43758.5453;
  return x - Math.floor(x);
};

/** Plays the ceremony once per badge per browser session (used right after a badge is earned). */
export function BadgeUnlock({ milestone, share }: { milestone: Milestone; share?: ShareCardData }) {
  const [open, setOpen] = useState(false);
  const key = `wa_unlock_${milestone}_${share?.earnedAt ?? ""}`;

  useEffect(() => {
    let seen = false;
    try {
      seen = sessionStorage.getItem(key) === "1";
      sessionStorage.setItem(key, "1");
    } catch {}
    if (!seen) setOpen(true);
  }, [key]);

  return open ? <BadgeCeremony milestone={milestone} share={share} onClose={() => setOpen(false)} /> : null;
}

/**
 * Full-screen unlock ceremony: the badge flies in from a pin-prick, light bursts out,
 * shockwaves and ice shards fly, confetti falls, then the congratulations reveal.
 */
export function BadgeCeremony({
  milestone: m,
  share,
  onClose,
  vaultLink = true,
}: {
  milestone: Milestone;
  share?: ShareCardData;
  onClose: () => void;
  /** Offer a "View in vault" link (pointless when already in the vault). */
  vaultLink?: boolean;
}) {
  const [closing, setClosing] = useState(false);
  const tier = TIERS[m];

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && !document.querySelector("dialog[open]") && close();
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function close() {
    setClosing(true);
    setTimeout(onClose, 380);
  }

  const colours = [tier.glow, tier.face[0], tier.rim[0], "#ffffff", tier.face[1]];
  const congrats = "CONGRATULATIONS";

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="unlock-title"
      className={`unlock ${closing ? "is-closing" : ""}`}
      style={{ "--glow": tier.glow, "--glow2": tier.face[1] } as React.CSSProperties}
    >
      <div className="unlock-bg" aria-hidden />
      <div className="vault-stars" aria-hidden />

      {/* falling confetti */}
      <div className="unlock-confetti" aria-hidden>
        {Array.from({ length: CONFETTI }, (_, i) => (
          <i
            key={i}
            style={
              {
                left: `${r(i, 1) * 100}%`,
                background: colours[i % colours.length],
                "--d": `${1 + r(i, 2) * 1.6}s`,
                "--t": `${2.6 + r(i, 3) * 2.4}s`,
                "--x": `${(r(i, 4) - 0.5) * 160}px`,
                "--rot": `${r(i, 5) * 720 - 360}deg`,
                width: `${6 + r(i, 6) * 6}px`,
                height: `${10 + r(i, 7) * 8}px`,
              } as React.CSSProperties
            }
          />
        ))}
      </div>

      <div className="relative flex w-full max-w-md flex-col items-center px-6 text-center">
        <div className="unlock-stage">
          <div className="unlock-rays" aria-hidden />
          <div className="unlock-flash" aria-hidden />
          {[0, 1, 2].map((i) => (
            <div key={i} className="unlock-ring" style={{ animationDelay: `${0.75 + i * 0.22}s` }} aria-hidden />
          ))}
          {Array.from({ length: SHARDS }, (_, i) => (
            <span
              key={i}
              className="unlock-shard"
              aria-hidden
              style={
                {
                  "--a": `${(360 / SHARDS) * i + r(i, 8) * 10}deg`,
                  "--dist": `${130 + r(i, 9) * 120}px`,
                  "--s": `${0.5 + r(i, 10)}`,
                  background: colours[i % colours.length],
                  animationDelay: `${0.78 + r(i, 11) * 0.15}s`,
                } as React.CSSProperties
              }
            />
          ))}
          <div className="unlock-badge">
            <div className="unlock-float">
              <Badge milestone={m} size={220} loud />
            </div>
          </div>
        </div>

        <p className="unlock-congrats font-display" aria-label="Congratulations">
          {congrats.split("").map((ch, i) => (
            <span key={i} aria-hidden style={{ animationDelay: `${1.25 + i * 0.045}s` }}>
              {ch}
            </span>
          ))}
        </p>
        <h2
          id="unlock-title"
          className="unlock-up mt-3 font-display text-[clamp(1.6rem,7vw,2.3rem)] font-black leading-tight text-white"
          style={{ animationDelay: "1.9s" }}
        >
          You own this badge
        </h2>
        <p
          className="unlock-name unlock-up mt-3 font-display text-[clamp(1.3rem,5.5vw,1.8rem)] font-black"
          style={{ animationDelay: "2.15s" }}
        >
          {BADGE_NAMES[m]}
        </p>
        <p className="unlock-up mt-2 text-[15px] text-[#c4d0ea]" style={{ animationDelay: "2.35s" }}>
          {BADGE_LINES[m]}
        </p>

        <div className="unlock-up mt-6 flex w-full flex-col items-center gap-2" style={{ animationDelay: "2.6s" }}>
          {share && <ShareBadge data={share} className="w-full max-w-xs" />}
          <div className="flex w-full max-w-xs gap-2">
            {vaultLink && (
              <Link href={`/badges?b=${m}`} className="btn-ghost flex-1 !border-white/20 !bg-white/5 !text-white">
                View in vault
              </Link>
            )}
            <button type="button" onClick={close} className="btn-ghost flex-1 !border-white/20 !bg-white/5 !text-white" autoFocus>
              Continue
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
