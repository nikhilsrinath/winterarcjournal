import type { Milestone } from "./badges";

/** Regular polygon / star outline in a 100×100 box. Alternate radii make a star. */
function poly(points: number, radii: number[], rotDeg = -90): string {
  const out: string[] = [];
  for (let i = 0; i < points; i++) {
    const a = ((rotDeg + (360 / points) * i) * Math.PI) / 180;
    const r = radii[i % radii.length];
    out.push(`${(50 + r * Math.cos(a)).toFixed(2)},${(50 + r * Math.sin(a)).toFixed(2)}`);
  }
  return `M${out.join("L")}Z`;
}

export interface Tier {
  /** Outline path in a 100×100 box. */
  shape: string;
  /** Rim gradient (bevel), light → dark. */
  rim: [string, string];
  /** Face gradient, light → dark. */
  face: [string, string];
  /** Glow colour. */
  glow: string;
  /** Edge colour for the 3D coin thickness. */
  edge: string;
}

export const TIERS: Record<Milestone, Tier> = {
  5: {
    shape: poly(6, [47]),
    rim: ["#e6f7ff", "#5aa8d6"],
    face: ["#a8e6ff", "#2b7fd0"],
    glow: "#7fd4ff",
    edge: "#1f5f9e",
  },
  10: {
    shape: poly(8, [47], -90 + 22.5),
    rim: ["#e0fffb", "#2fb3a6"],
    face: ["#7ff5e4", "#0e8f99"],
    glow: "#4ff0d8",
    edge: "#0b6a72",
  },
  20: {
    shape: "M50,3 L92,18 L88,58 Q82,84 50,97 Q18,84 12,58 L8,18 Z",
    rim: ["#e3e9ff", "#4a5fe0"],
    face: ["#8fa6ff", "#2a36c9"],
    glow: "#6f8cff",
    edge: "#1d2896",
  },
  35: {
    shape: poly(16, [47, 40]),
    rim: ["#f1e8ff", "#7d4fe6"],
    face: ["#c3a3ff", "#5a2ad6"],
    glow: "#a77bff",
    edge: "#3f1ba0",
  },
  50: {
    shape: poly(24, [47, 42]),
    rim: ["#e6fff3", "#21b67c"],
    face: ["#8bffc6", "#0f9a6a"],
    glow: "#4ff0b9",
    edge: "#0b6d4b",
  },
  75: {
    shape: poly(12, [48, 36]),
    rim: ["#ffe9f8", "#d1339f"],
    face: ["#ff9fe0", "#a8188a"],
    glow: "#ff6fd2",
    edge: "#7a0f63",
  },
  100: {
    shape: poly(32, [48, 39]),
    rim: ["#fffbe6", "#e09a1a"],
    face: ["#fff2b0", "#f0a22a"],
    glow: "#ffd166",
    edge: "#9c5d06",
  },
};
