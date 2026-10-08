export const MILESTONES = [5, 10, 20, 35, 50, 75, 100] as const;
export type Milestone = (typeof MILESTONES)[number];

export const BADGE_NAMES: Record<Milestone, string> = {
  5: "First Frost",
  10: "Cold Start",
  20: "Deep Freeze",
  35: "Ice Wall",
  50: "Glacier",
  75: "Permafrost",
  100: "Absolute Zero",
};

export const BADGE_LINES: Record<Milestone, string> = {
  5: "Five days in a row. The first frost has settled.",
  10: "Ten straight days. The habit has started to stick.",
  20: "Twenty days without a gap. You are deep in it now.",
  35: "Thirty-five days. Nothing gets through this wall.",
  50: "Fifty days. Slow, heavy, unstoppable.",
  75: "Seventy-five days. This doesn't thaw.",
  100: "One hundred days in a row. The coldest, rarest badge there is.",
};

export function nextMilestone(streak: number): Milestone | null {
  return MILESTONES.find((m) => m > streak) ?? null;
}
