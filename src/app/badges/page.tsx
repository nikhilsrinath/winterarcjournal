import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getStreaks, getViewer } from "@/lib/data";
import { MILESTONES, nextMilestone, BADGE_NAMES, type Milestone } from "@/lib/badges";
import { BadgeCarousel, type VaultBadge } from "@/components/badge-carousel";
import { FlameIcon } from "@/components/icons";
import type { ShareStats } from "@/lib/share-card";

export const metadata = { title: "Badges" };

export default async function BadgesPage({ searchParams }: { searchParams: Promise<{ b?: string }> }) {
  const viewer = await getViewer();
  const { b } = await searchParams;

  let earnedAt = new Map<number, string>();
  let current = 0;
  let share: ShareStats | undefined;
  if (viewer) {
    const supabase = await createClient();
    const [{ data }, streaks] = await Promise.all([
      supabase.from("user_badges").select("milestone,earned_at").eq("user_id", viewer.id),
      getStreaks(viewer.id),
    ]);
    earnedAt = new Map((data ?? []).map((r) => [r.milestone, r.earned_at]));
    current = streaks.current_streak;
    share = {
      username: viewer.username,
      current,
      longest: streaks.longest_streak,
      total: streaks.total,
      earned: MILESTONES.filter((m) => earnedAt.has(m)),
    };
  }

  const badges: VaultBadge[] = MILESTONES.map((m) => ({ milestone: m, earnedAt: earnedAt.get(m) ?? null }));
  const count = badges.filter((x) => x.earnedAt).length;
  const asked = MILESTONES.indexOf(Number(b) as Milestone);
  const lastEarned = badges.findLastIndex((x) => x.earnedAt);
  const start = asked >= 0 ? asked : Math.max(0, lastEarned);
  const next = nextMilestone(current);

  return (
    <div className="py-6 md:py-10">
      <section className="vault rounded-[32px] px-3 pb-8 pt-7 sm:px-8 md:pb-10 md:pt-10">
        <div className="vault-aurora" aria-hidden />
        <div className="vault-stars" aria-hidden />

        <div className="flex flex-wrap items-end justify-between gap-4 px-2">
          <div>
            <h1 className="font-display text-[clamp(1.9rem,7vw,3.25rem)] font-black leading-none">Badge vault</h1>
            <p className="mt-2 text-[15px] text-[#b9c6e4]">
              {viewer ? `${count} of ${MILESTONES.length} unlocked` : "Keep a daily streak to unlock all seven."}
            </p>
          </div>
          {viewer && (
            <p className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 py-2 text-sm font-bold">
              <FlameIcon size={16} className="text-[#ff8a4c]" />
              <span className="tabular">{current}-day streak</span>
            </p>
          )}
        </div>

        <div className="mt-4">
          <BadgeCarousel badges={badges} current={current} start={start} share={share} />
        </div>
      </section>

      <div className="mt-6 flex flex-col items-center gap-3 text-center">
        {viewer ? (
          next ? (
            <>
              <p className="text-mute">
                Next up: <strong className="text-ink">{BADGE_NAMES[next]}</strong> in {next - current}{" "}
                {next - current === 1 ? "day" : "days"}.
              </p>
              <Link href="/write" className="btn">
                Log today
              </Link>
            </>
          ) : (
            <p className="text-mute">Every badge unlocked. You reached absolute zero.</p>
          )
        ) : (
          <>
            <p className="text-mute">Sign in to see your own badges.</p>
            <div className="flex gap-2">
              <Link href="/signup" className="btn">
                Create account
              </Link>
              <Link href="/login?next=/badges" className="btn-ghost">
                Sign in
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
