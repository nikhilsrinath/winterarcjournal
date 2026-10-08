import { TIERS } from "./badge-art";
import type { Milestone } from "./badges";

const SNOW = "M0,-6V6M-5.2,-3L5.2,3M-5.2,3L5.2,-3";
const STAR = (x: number, y: number, r: number) =>
  `M${x},${y - r}Q${x},${y} ${x + r},${y}Q${x},${y} ${x},${y + r}Q${x},${y} ${x - r},${y}Q${x},${y} ${x},${y - r}Z`;

export interface BadgeSvgOptions {
  /** Unique prefix for gradient/clip ids (several badges share one page). */
  id: string;
  earned: boolean;
  /** Attach animation classes (rays spin, shimmer, sparks, orbit). */
  motion?: boolean;
  /** Draw the milestone number as SVG text. Off for the share image, which draws it on canvas. */
  text?: boolean;
  /** Light rays + halo behind earned badges. */
  rays?: boolean;
}

/**
 * Inner markup of a badge in a 100×100 viewBox (content spills outside for rays and sparks,
 * so render with overflow visible). One source of truth for the UI and the share image.
 */
export function badgeSvgInner(m: Milestone, o: BadgeSvgOptions): string {
  const t = TIERS[m];
  const id = o.id;
  const k = (s: number) => `translate(50 50) scale(${s}) translate(-50 -50)`;
  const cls = (c: string) => (o.motion ? ` class="${c}"` : "");
  const out: string[] = [];

  out.push(`<defs>
<linearGradient id="${id}r" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${t.rim[0]}"/><stop offset="0.55" stop-color="${t.glow}"/><stop offset="1" stop-color="${t.rim[1]}"/></linearGradient>
<linearGradient id="${id}f" x1="0.2" y1="0" x2="0.8" y2="1"><stop offset="0" stop-color="${t.face[0]}"/><stop offset="0.5" stop-color="${t.glow}"/><stop offset="1" stop-color="${t.face[1]}"/></linearGradient>
<radialGradient id="${id}h" cx="0.34" cy="0.22" r="0.75"><stop offset="0" stop-color="#fff" stop-opacity="0.75"/><stop offset="0.45" stop-color="#fff" stop-opacity="0.12"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient>
<linearGradient id="${id}s" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#fff" stop-opacity="0"/><stop offset="0.5" stop-color="#fff" stop-opacity="0.85"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient>
<radialGradient id="${id}g"><stop offset="0.25" stop-color="${t.glow}" stop-opacity="0.95"/><stop offset="1" stop-color="${t.glow}" stop-opacity="0"/></radialGradient>
<radialGradient id="${id}d"><stop offset="0" stop-color="#020615" stop-opacity="0.15"/><stop offset="1" stop-color="#020615" stop-opacity="0.6"/></radialGradient>
<clipPath id="${id}c"><path d="${t.shape}"/></clipPath>
</defs>`);

  if (o.rays && o.earned) {
    const rays: string[] = [];
    for (let i = 0; i < 16; i++) {
      const a = (i * 360) / 16;
      const w = i % 2 ? 3 : 5.5;
      const len = i % 2 ? 66 : 80;
      rays.push(`<path d="M50,50L${50 - w},${50 - len}L${50 + w},${50 - len}Z" transform="rotate(${a} 50 50)"/>`);
    }
    out.push(`<circle cx="50" cy="50" r="62" fill="url(#${id}g)" opacity="0.55"${cls("badge-halo")}/>`);
    out.push(`<g fill="url(#${id}g)" opacity="0.7"${cls("badge-rays")}>${rays.join("")}</g>`);
  }

  out.push(`<g${m === 100 && o.earned ? cls("badge-prism") : ""}>`);
  out.push(`<path d="${t.shape}" fill="url(#${id}r)"/>`);
  out.push(`<path d="${t.shape}" transform="${k(0.8)}" fill="url(#${id}f)" stroke="rgba(255,255,255,0.6)" stroke-width="1"/>`);
  out.push(`<path d="${t.shape}" transform="${k(0.66)}" fill="none" stroke="rgba(255,255,255,0.3)" stroke-width="1"/>`);
  out.push(`</g>`);

  // gloss, facets and the shimmer sweep stay inside the outline
  out.push(`<g clip-path="url(#${id}c)">`);
  out.push(`<path d="M50,50L0,0M50,50L100,0M50,50L0,100M50,50L100,100" stroke="#fff" stroke-opacity="0.12" stroke-width="0.8"/>`);
  out.push(`<rect x="0" y="0" width="100" height="100" fill="url(#${id}h)"/>`);
  if (o.motion) {
    out.push(`<g transform="rotate(22 50 50)"><rect class="badge-sweep" x="-10" y="-30" width="22" height="160" fill="url(#${id}s)"/></g>`);
  }
  if (!o.earned) {
    // frosted-over: colour shows through dark ice with a few cracks
    out.push(`<rect x="0" y="0" width="100" height="100" fill="url(#${id}d)"/>`);
    out.push(
      `<path d="M8,30L28,38L34,52M28,38L42,30M92,64L72,58L66,46M72,58L60,70" stroke="#fff" stroke-opacity="0.22" stroke-width="0.7" fill="none"/>`,
    );
  }
  out.push(`</g>`);

  if (o.earned && o.motion) {
    out.push(
      `<circle cx="50" cy="50" r="30" fill="none" stroke="#fff" stroke-opacity="0.45" stroke-width="0.8" stroke-dasharray="1.5 4.2" class="badge-spin"/>`,
    );
  }

  if (o.earned) {
    out.push(`<path d="${SNOW}" transform="translate(50 32)" stroke="#fff" stroke-width="1.8" stroke-linecap="round"/>`);
    if (o.text) {
      out.push(
        `<text x="50" y="66" text-anchor="middle" font-size="${m === 100 ? 23 : 27}" font-weight="900" font-family="var(--font-unbounded), Arial Black, sans-serif" fill="#fff" stroke="${t.edge}" stroke-width="3" paint-order="stroke">${m}</text>`,
      );
    }
  } else {
    out.push(`<g transform="translate(38 30)" stroke="#fff" stroke-opacity="0.92" stroke-width="2.6" fill="none" stroke-linecap="round">
<rect x="2" y="10" width="20" height="15" rx="3.5" fill="${t.edge}" fill-opacity="0.85"/>
<path d="M6 10V6.5a6 6 0 0 1 12 0V10"/>
<circle cx="12" cy="17.5" r="1.7" fill="#fff" stroke="none"/></g>`);
    if (o.text) {
      out.push(
        `<text x="50" y="76" text-anchor="middle" font-size="12" font-weight="800" font-family="var(--font-unbounded), sans-serif" fill="#fff" fill-opacity="0.85" stroke="${t.edge}" stroke-width="2" paint-order="stroke">${m}</text>`,
      );
    }
  }

  if (o.earned && o.motion) {
    out.push(`<g class="badge-orbit"><circle cx="50" cy="-6" r="1.6" fill="#fff"/><circle cx="106" cy="50" r="1.1" fill="${t.face[0]}"/><circle cx="10" cy="90" r="1.3" fill="#fff"/></g>`);
    const sparks: [number, number, number, string][] = [
      [88, 12, 6, "0.2s"],
      [10, 80, 4.5, "1.1s"],
      [94, 74, 3.5, "1.9s"],
      [16, 16, 3.5, "2.6s"],
    ];
    for (const [x, y, r, d] of sparks) {
      out.push(`<path class="badge-spark" style="--spark-delay:${d}" d="${STAR(x, y, r)}" fill="#fff"/>`);
    }
  }

  return out.join("");
}

/** Standalone SVG document (for rasterising onto a canvas). Viewbox is padded so rays aren't clipped. */
export function badgeSvgDocument(m: Milestone, earned: boolean, rays: boolean, pad = 40): string {
  const inner = badgeSvgInner(m, { id: `x${m}${earned ? "e" : "l"}`, earned, rays });
  const s = 100 + pad * 2;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${-pad} ${-pad} ${s} ${s}" width="${s * 8}" height="${s * 8}">${inner}</svg>`;
}
