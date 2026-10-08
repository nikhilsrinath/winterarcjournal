"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { BADGE_LINES, BADGE_NAMES, MILESTONES, type Milestone } from "@/lib/badges";
import { TIERS } from "@/lib/badge-art";
import { Badge, BadgeEdge } from "./badge";
import { ShareBadge } from "./share-badge";
import { BadgeCeremony } from "./badge-unlock";
import { LockedBadgeDialog } from "./locked-badge-dialog";
import type { ShareStats } from "@/lib/share-card";
import { CheckIcon, ChevronLeft, ChevronRight, LockIcon } from "./icons";

const N = MILESTONES.length;
const STEP = 360 / N;
const THICKNESS = 10; // coin edge layers, 1px apart

export interface VaultBadge {
  milestone: Milestone;
  earnedAt: string | null;
}

const mod = (n: number, m: number) => ((n % m) + m) % m;

export function BadgeCarousel({
  badges,
  current,
  start,
  share,
}: {
  badges: VaultBadge[];
  current: number;
  start: number;
  /** Present for the signed-in owner of these badges; enables the share card. */
  share?: ShareStats;
}) {
  // `pos` is unbounded so wrapping from the last badge to the first keeps spinning the same way.
  const [pos, setPos] = useState(start);
  const active = mod(pos, N);
  const [popup, setPopup] = useState<VaultBadge | null>(null);
  const drag = useRef<{ x: number } | null>(null);
  const swiped = useRef(false);

  const go = useCallback((d: number) => setPos((p) => p + d), []);
  const goTo = useCallback(
    (i: number) =>
      setPos((p) => {
        let d = mod(i - mod(p, N), N);
        if (d > N / 2) d -= N;
        return p + d;
      }),
    [],
  );

  useEffect(() => {
    const url = new URL(window.location.href);
    url.searchParams.set("b", String(MILESTONES[active]));
    window.history.replaceState(null, "", url);
  }, [active]);

  const b = badges[active];
  const tier = TIERS[b.milestone];
  const earned = !!b.earnedAt;
  const pct = Math.min(100, Math.round((current / b.milestone) * 100));

  return (
    <div>
      <div
        role="region"
        aria-roledescription="carousel"
        aria-label="Badges"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "ArrowLeft") go(-1);
          if (e.key === "ArrowRight") go(1);
          if (e.key === "Enter" && e.target === e.currentTarget) setPopup(badges[active]);
        }}
        onPointerDown={(e) => {
          drag.current = { x: e.clientX };
          swiped.current = false;
        }}
        onPointerUp={(e) => {
          const s = drag.current;
          drag.current = null;
          if (!s) return;
          const dx = e.clientX - s.x;
          if (Math.abs(dx) > 40) {
            swiped.current = true;
            go(dx < 0 ? 1 : -1);
          }
        }}
        onClickCapture={(e) => {
          if (swiped.current) {
            swiped.current = false;
            e.stopPropagation();
          }
        }}
        onPointerCancel={() => (drag.current = null)}
        className="carousel-stage relative mx-auto h-[300px] w-full touch-pan-y select-none outline-none [--coin:168px] focus-visible:ring-2 focus-visible:ring-white/40 sm:h-[360px] sm:[--coin:220px]"
      >
        <div
          className="carousel-ring absolute inset-x-0 top-8 h-[var(--coin)]"
          style={{ transform: `translateZ(calc(var(--coin) * -1.05)) rotateY(${-pos * STEP}deg)` }}
        >
          {badges.map((x, i) => {
            let off = mod(i - active, N);
            if (off > N / 2) off -= N;
            const dist = Math.abs(off);
            const isActive = off === 0;
            return (
              <div
                key={x.milestone}
                className="carousel-item"
                aria-hidden={!isActive}
                style={{
                  transform: `rotateY(${i * STEP}deg) translateZ(calc(var(--coin) * 1.05))`,
                  opacity: dist === 0 ? 1 : dist === 1 ? 0.75 : dist === 2 ? 0.25 : 0,
                  filter: dist === 0 ? "none" : `blur(${dist}px)`,
                  pointerEvents: dist > 1 ? "none" : undefined,
                }}
              >
                <button
                  type="button"
                  tabIndex={-1}
                  onClick={() => (isActive ? setPopup(x) : goTo(i))}
                  className="coin-btn block h-full w-full"
                  aria-label={
                    isActive
                      ? `${x.earnedAt ? "Celebrate" : "How to unlock"} ${BADGE_NAMES[x.milestone]}`
                      : `Show ${BADGE_NAMES[x.milestone]}`
                  }
                >
                  <div className={`coin ${isActive ? "is-active" : ""}`}>
                    {Array.from({ length: THICKNESS }, (_, k) => (
                      <div key={k} className="coin-layer" style={{ transform: `translateZ(${-(k + 1)}px)` }}>
                        <BadgeEdge milestone={x.milestone} earned={!!x.earnedAt} />
                      </div>
                    ))}
                    <div className="coin-layer" style={{ transform: "translateZ(0.5px)" }}>
                      <Badge milestone={x.milestone} earned={!!x.earnedAt} size={220} animate={dist <= 1} loud={isActive} />
                    </div>
                  </div>
                </button>
              </div>
            );
          })}
        </div>
        <div className="coin-floor" style={{ "--glow": earned ? tier.glow : "#2a3658" } as React.CSSProperties} aria-hidden />

        <button
          type="button"
          onClick={() => go(-1)}
          aria-label="Previous badge"
          className="absolute left-1 top-[calc(2rem+var(--coin)/2)] z-10 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-full border border-white/15 bg-white/10 text-white backdrop-blur transition hover:bg-white/20 active:scale-90 sm:left-4"
        >
          <ChevronLeft />
        </button>
        <button
          type="button"
          onClick={() => go(1)}
          aria-label="Next badge"
          className="absolute right-1 top-[calc(2rem+var(--coin)/2)] z-10 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-full border border-white/15 bg-white/10 text-white backdrop-blur transition hover:bg-white/20 active:scale-90 sm:right-4"
        >
          <ChevronRight />
        </button>
      </div>

      <p className="tap-hint -mt-2 mb-3 text-center text-[12px] font-semibold text-[#8b9aba]" key={active}>
        {earned ? "Tap the badge to celebrate again" : "Tap the badge to see how to unlock it"}
      </p>

      {/* details for the badge in front */}
      <div aria-live="polite" className="mx-auto max-w-md px-2 text-center">
        <p
          className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[12px] font-bold ${
            earned ? "text-[#04101f]" : "border border-white/15 bg-white/5 text-[#a9b6d3]"
          }`}
          style={earned ? { background: tier.glow, boxShadow: `0 0 24px ${tier.glow}` } : undefined}
        >
          {earned ? <CheckIcon size={14} /> : <LockIcon size={13} />}
          {earned ? "Unlocked" : "Locked"}
        </p>
        <h2
          className="mt-3 font-display text-[clamp(1.6rem,6vw,2.4rem)] font-black leading-none"
          style={earned ? { textShadow: `0 0 28px ${tier.glow}` } : undefined}
        >
          {BADGE_NAMES[b.milestone]}
        </h2>
        <p className="mt-2 text-[15px] text-[#b9c6e4]">{BADGE_LINES[b.milestone]}</p>

        {earned ? (
          <>
            <p className="mt-4 text-sm text-[#8b9aba]">
              Unlocked {new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "long", year: "numeric" }).format(new Date(b.earnedAt!))}
            </p>
            {share && <ShareBadge className="mt-4" data={{ ...share, milestone: b.milestone, earnedAt: b.earnedAt }} />}
          </>
        ) : (
          <div className="mx-auto mt-5 max-w-xs">
            <div className="flex justify-between text-[13px] font-semibold text-[#b9c6e4]">
              <span>Current streak</span>
              <span className="tabular">
                {current} / {b.milestone} days
              </span>
            </div>
            <div
              className="mt-2 h-2.5 overflow-hidden rounded-full bg-white/10"
              role="progressbar"
              aria-label={`Progress to ${BADGE_NAMES[b.milestone]}`}
              aria-valuemin={0}
              aria-valuemax={b.milestone}
              aria-valuenow={Math.min(current, b.milestone)}
            >
              <div
                className="h-full rounded-full transition-[width] duration-700"
                style={{
                  width: `${pct}%`,
                  background: `linear-gradient(90deg, ${tier.face[1]}, ${tier.glow})`,
                  boxShadow: `0 0 12px ${tier.glow}`,
                }}
              />
            </div>
            <p className="mt-2 text-[13px] text-[#8b9aba]">
              {b.milestone - current} more {b.milestone - current === 1 ? "day" : "days"} in a row to unlock
            </p>
          </div>
        )}
      </div>

      {popup &&
        (popup.earnedAt ? (
          <BadgeCeremony
            milestone={popup.milestone}
            share={share && { ...share, milestone: popup.milestone, earnedAt: popup.earnedAt }}
            onClose={() => setPopup(null)}
            vaultLink={false}
          />
        ) : (
          <LockedBadgeDialog milestone={popup.milestone} current={current} signedIn={!!share} onClose={() => setPopup(null)} />
        ))}

      {/* index */}
      <div className="mt-6 flex justify-center gap-2" role="tablist" aria-label="Choose badge">
        {badges.map((x, i) => (
          <button
            key={x.milestone}
            type="button"
            role="tab"
            aria-selected={i === active}
            aria-label={`${BADGE_NAMES[x.milestone]}${x.earnedAt ? "" : " (locked)"}`}
            onClick={() => goTo(i)}
            className="grid h-8 min-w-8 place-items-center rounded-full px-1"
          >
            <span
              className={`block h-2.5 rounded-full transition-all ${i === active ? "w-7" : "w-2.5"}`}
              style={{
                background: x.earnedAt ? TIERS[x.milestone].glow : "rgb(255 255 255 / 0.22)",
                boxShadow: x.earnedAt ? `0 0 10px ${TIERS[x.milestone].glow}` : undefined,
              }}
            />
          </button>
        ))}
      </div>
    </div>
  );
}
