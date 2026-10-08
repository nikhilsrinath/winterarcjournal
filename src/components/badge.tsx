import Link from "next/link";
import { BADGE_NAMES, MILESTONES, type Milestone } from "@/lib/badges";
import { TIERS } from "@/lib/badge-art";
import { badgeSvgInner } from "@/lib/badge-svg";
import { LockIcon } from "./icons";

/**
 * Crystal medallion. Every tier has its own outline and colourway. Earned badges blaze: light rays,
 * a pulsing glow, a sweeping shimmer, orbiting motes and sparks. Locked badges keep their colour
 * under a layer of dark ice, with a padlock.
 */
export function Badge({
  milestone: m,
  earned = true,
  size = 88,
  animate = true,
  loud = false,
}: {
  milestone: Milestone;
  earned?: boolean;
  size?: number;
  animate?: boolean;
  loud?: boolean;
}) {
  const tier = TIERS[m];
  const rays = earned && size >= 80;
  const html = badgeSvgInner(m, {
    id: `wab${m}${earned ? "e" : "l"}${rays ? "r" : ""}`,
    earned,
    motion: animate,
    text: true,
    rays,
  });

  return (
    <span
      className={`badge ${earned ? "is-earned" : "is-locked"} ${loud ? "is-loud" : ""}`}
      style={
        {
          "--glow": tier.glow,
          "--sweep-delay": `${(MILESTONES.indexOf(m) * 0.45).toFixed(2)}s`,
          animationPlayState: animate ? undefined : "paused",
        } as React.CSSProperties
      }
    >
      <svg
        width={size}
        height={size}
        viewBox="0 0 100 100"
        role="img"
        aria-label={`${BADGE_NAMES[m]} — ${m} day streak${earned ? "" : " (locked)"}`}
        overflow="visible"
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </span>
  );
}

/** Flat silhouette of a badge, stacked behind the face to give 3D coins their thickness. */
export function BadgeEdge({ milestone, earned }: { milestone: Milestone; earned: boolean }) {
  const edge = TIERS[milestone].edge;
  return (
    <svg viewBox="0 0 100 100" width="100%" height="100%" aria-hidden>
      <path d={TIERS[milestone].shape} fill={edge} style={earned ? undefined : { fill: `color-mix(in oklab, ${edge} 55%, #050a17)` }} />
    </svg>
  );
}

export function BadgeShelf({ earned, current, href }: { earned: number[]; current: number; href?: string }) {
  const set = new Set(earned);
  return (
    <ul className="grid grid-cols-4 gap-2 sm:grid-cols-7 sm:gap-3" aria-label="Badges">
      {MILESTONES.map((m) => {
        const has = set.has(m);
        const body = (
          <>
            <Badge milestone={m} earned={has} size={60} />
            <span className={`text-[12px] font-bold leading-tight ${has ? "text-ink" : "text-mute"}`}>{BADGE_NAMES[m]}</span>
            <span className="flex items-center gap-1 text-[11px] text-mute">
              {has ? (
                `${m} days`
              ) : (
                <>
                  <LockIcon size={11} /> {Math.max(1, m - current)} to go
                </>
              )}
            </span>
          </>
        );
        const cls = `flex h-full flex-col items-center gap-1.5 rounded-2xl border px-1 py-3 text-center transition ${
          has ? "border-line bg-surface" : "border-dashed border-line bg-sunken/60"
        }`;
        return (
          <li key={m}>
            {href ? (
              <Link href={`${href}?b=${m}`} className={`${cls} hover:-translate-y-0.5 hover:border-accent`}>
                {body}
              </Link>
            ) : (
              <div className={cls}>{body}</div>
            )}
          </li>
        );
      })}
    </ul>
  );
}
