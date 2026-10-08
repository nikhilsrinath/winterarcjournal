import { TIERS } from "./badge-art";
import { BADGE_LINES, BADGE_NAMES, MILESTONES, type Milestone } from "./badges";
import { badgeSvgDocument } from "./badge-svg";

export interface ShareStats {
  username: string;
  current: number;
  longest: number;
  total: number;
  earned: Milestone[];
}

export interface ShareCardData extends ShareStats {
  milestone: Milestone;
  earnedAt: string | null;
}

const W = 1080;
const H = 1920;
const PAD = 40; // badge svg viewBox padding, in badge units

function loadSvg(svg: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
  });
}

function fontVar(name: string, fallback: string) {
  const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return v ? `${v}, ${fallback}` : fallback;
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
}

/** Shrink `font` until `text` fits `max` px wide. */
function fit(ctx: CanvasRenderingContext2D, text: string, weight: number, size: number, family: string, max: number) {
  let s = size;
  do {
    ctx.font = `${weight} ${s}px ${family}`;
  } while (ctx.measureText(text).width > max && (s -= 4) > 20);
  return s;
}

function wrap(ctx: CanvasRenderingContext2D, text: string, max: number): string[] {
  const lines: string[] = [];
  let line = "";
  for (const word of text.split(" ")) {
    const next = line ? `${line} ${word}` : word;
    if (ctx.measureText(next).width > max && line) {
      lines.push(line);
      line = word;
    } else line = next;
  }
  if (line) lines.push(line);
  return lines;
}

/** Deterministic star field so every card for the same badge looks the same. */
function stars(ctx: CanvasRenderingContext2D, seed: number) {
  let x = seed * 9301 + 49297;
  const rnd = () => ((x = (x * 9301 + 49297) % 233280) / 233280);
  for (let i = 0; i < 140; i++) {
    const r = rnd() * 2.2 + 0.4;
    ctx.globalAlpha = rnd() * 0.7 + 0.2;
    ctx.fillStyle = rnd() > 0.7 ? "#bfe8ff" : "#ffffff";
    ctx.beginPath();
    ctx.arc(rnd() * W, rnd() * H, r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

function glowBlob(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, color: string, alpha: number) {
  const g = ctx.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, color);
  g.addColorStop(1, "transparent");
  ctx.globalAlpha = alpha;
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
  ctx.globalAlpha = 1;
}

function snowflake(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, color: string) {
  ctx.save();
  ctx.translate(x, y);
  ctx.strokeStyle = color;
  ctx.lineWidth = r / 4;
  ctx.lineCap = "round";
  for (let i = 0; i < 3; i++) {
    ctx.beginPath();
    ctx.moveTo(0, -r);
    ctx.lineTo(0, r);
    ctx.stroke();
    ctx.rotate(Math.PI / 3);
  }
  ctx.restore();
}

/** Render an Instagram-story sized (1080×1920) PNG celebrating one badge. */
export async function renderShareCard(d: ShareCardData): Promise<Blob> {
  const display = fontVar("--font-unbounded", "'Arial Black', sans-serif");
  const body = fontVar("--font-figtree", "system-ui, sans-serif");
  await Promise.all([
    document.fonts.load(`900 100px ${display}`),
    document.fonts.load(`800 100px ${display}`),
    document.fonts.load(`700 40px ${body}`),
    document.fonts.load(`500 40px ${body}`),
  ]).catch(() => {});

  const tier = TIERS[d.milestone];
  const earnedSet = new Set(d.earned);
  const [hero, ...minis] = await Promise.all([
    loadSvg(badgeSvgDocument(d.milestone, true, true, PAD)),
    ...MILESTONES.map((m) => loadSvg(badgeSvgDocument(m, earnedSet.has(m), false, 6))),
  ]);

  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d")!;
  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";

  // night sky
  ctx.fillStyle = "#040817";
  ctx.fillRect(0, 0, W, H);
  glowBlob(ctx, 540, 820, 900, tier.glow, 0.42);
  glowBlob(ctx, 80, 300, 620, "#4ff0b9", 0.22);
  glowBlob(ctx, 1020, 420, 620, "#b778ff", 0.26);
  glowBlob(ctx, 540, 1900, 700, "#5b8cff", 0.25);
  stars(ctx, d.milestone);

  // header
  ctx.font = `800 32px ${display}`;
  ctx.fillStyle = "#e8f0ff";
  ctx.letterSpacing = "6px";
  const brand = "WINTERARC JOURNAL";
  const bw = ctx.measureText(brand).width;
  ctx.fillText(brand, 540 + 26, 150);
  snowflake(ctx, 540 - bw / 2 - 10, 139, 16, tier.glow);

  // "badge unlocked" pill
  ctx.font = `800 28px ${display}`;
  ctx.letterSpacing = "5px";
  const pill = "BADGE UNLOCKED";
  const pw = ctx.measureText(pill).width + 80;
  ctx.save();
  ctx.shadowColor = tier.glow;
  ctx.shadowBlur = 40;
  ctx.fillStyle = tier.glow;
  roundRect(ctx, 540 - pw / 2, 210, pw, 72, 36);
  ctx.fill();
  ctx.restore();
  ctx.fillStyle = "#04101f";
  ctx.fillText(pill, 540 + 2, 257);
  ctx.letterSpacing = "0px";

  // hero badge — viewBox is 180 units across the full width → 6px per unit
  const unit = W / (100 + PAD * 2);
  const top = 840 - (50 + PAD) * unit;
  ctx.save();
  ctx.shadowColor = tier.glow;
  ctx.shadowBlur = 90;
  ctx.drawImage(hero, 0, top, W, W);
  ctx.shadowBlur = 30;
  ctx.drawImage(hero, 0, top, W, W);
  ctx.restore();
  // number, drawn here so it uses the real display font
  ctx.font = `900 ${(d.milestone === 100 ? 23 : 27) * unit}px ${display}`;
  ctx.lineJoin = "round";
  ctx.lineWidth = 3 * unit;
  ctx.strokeStyle = tier.edge;
  const ny = top + (66 + PAD) * unit;
  ctx.strokeText(String(d.milestone), 540, ny);
  ctx.fillStyle = "#fff";
  ctx.fillText(String(d.milestone), 540, ny);

  // name + line
  const name = BADGE_NAMES[d.milestone].toUpperCase();
  fit(ctx, name, 900, 112, display, 960);
  ctx.save();
  ctx.shadowColor = tier.glow;
  ctx.shadowBlur = 50;
  ctx.fillStyle = "#fff";
  ctx.fillText(name, 540, 1290);
  ctx.restore();

  ctx.font = `500 38px ${body}`;
  ctx.fillStyle = "#c4d0ea";
  wrap(ctx, BADGE_LINES[d.milestone], 860).forEach((l, i) => ctx.fillText(l, 540, 1365 + i * 50));

  // stats panel
  const sy = 1480;
  ctx.save();
  ctx.fillStyle = "rgba(255,255,255,0.06)";
  ctx.strokeStyle = "rgba(255,255,255,0.14)";
  ctx.lineWidth = 2;
  roundRect(ctx, 80, sy, 920, 190, 40);
  ctx.fill();
  ctx.stroke();
  ctx.restore();
  const stats: [string, string][] = [
    [String(d.current), "DAY STREAK"],
    [String(d.longest), "BEST STREAK"],
    [String(d.total), "DAYS LOGGED"],
  ];
  stats.forEach(([v, label], i) => {
    const cx = 80 + (920 / 3) * (i + 0.5);
    ctx.font = `800 68px ${display}`;
    ctx.fillStyle = i === 0 ? tier.glow : "#fff";
    ctx.fillText(v, cx, sy + 100);
    ctx.font = `700 24px ${body}`;
    ctx.letterSpacing = "3px";
    ctx.fillStyle = "#8b9aba";
    ctx.fillText(label, cx, sy + 145);
    ctx.letterSpacing = "0px";
    if (i) {
      ctx.fillStyle = "rgba(255,255,255,0.12)";
      ctx.fillRect(80 + (920 / 3) * i - 1, sy + 40, 2, 110);
    }
  });

  // badge collection
  const size = 104;
  const gap = 26;
  const rowW = MILESTONES.length * size + (MILESTONES.length - 1) * gap;
  const ry = 1712;
  MILESTONES.forEach((m, i) => {
    const x = 540 - rowW / 2 + i * (size + gap);
    const has = earnedSet.has(m);
    ctx.save();
    if (has) {
      ctx.shadowColor = TIERS[m].glow;
      ctx.shadowBlur = 24;
    } else ctx.globalAlpha = 0.55;
    ctx.drawImage(minis[i], x, ry, size, size);
    ctx.restore();
  });

  // footer
  const when = d.earnedAt ? new Date(d.earnedAt) : new Date();
  const date = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric" }).format(when);
  const host = location.hostname === "localhost" || location.hostname.startsWith("127.") ? "" : ` · ${location.host}`;
  ctx.font = `700 30px ${body}`;
  ctx.fillStyle = "#b9c6e4";
  ctx.fillText(`@${d.username} · ${earnedSet.size} of ${MILESTONES.length} badges · ${date}${host}`, 540, 1868, 960);

  return new Promise((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("toBlob failed"))), "image/png"));
}
