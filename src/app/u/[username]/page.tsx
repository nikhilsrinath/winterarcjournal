import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { ENTRY_COLUMNS, FEED_PAGE, getStreaks, getToday, getViewer, type FeedEntry, type Profile } from "@/lib/data";
import { formatLong, formatShort, isValidDate, isValidMonth, monthGrid } from "@/lib/dates";
import { BADGE_NAMES, MILESTONES, nextMilestone } from "@/lib/badges";
import { TIERS } from "@/lib/badge-art";
import { BadgeShelf } from "@/components/badge";
import { Calendar } from "@/components/calendar";
import { FeedList } from "@/components/feed-list";
import { ProfileSettings } from "@/components/profile-settings";
import { Avatar } from "@/components/entry-card";
import { FlameIcon, GearIcon, PenIcon, PlusIcon } from "@/components/icons";

export async function generateMetadata({ params }: { params: Promise<{ username: string }> }): Promise<Metadata> {
  return { title: `@${(await params).username}` };
}

export default async function ProfilePage({
  params,
  searchParams,
}: {
  params: Promise<{ username: string }>;
  searchParams: Promise<{ d?: string; m?: string }>;
}) {
  const { username } = await params;
  const sp = await searchParams;
  const supabase = await createClient();
  const { data: profile } = await supabase.from("profiles").select("*").ilike("username", username).maybeSingle<Profile>();
  if (!profile) notFound();

  const [viewer, today, streaks] = await Promise.all([getViewer(), getToday(), getStreaks(profile.id)]);
  const mine = viewer?.id === profile.id;
  const selected = isValidDate(sp.d) ? sp.d : "";
  const month = isValidMonth(sp.m) ? sp.m : (selected || today).slice(0, 7);
  const grid = monthGrid(month);

  const [datesRes, badgesRes, feedRes] = await Promise.all([
    supabase
      .from("journal_entries")
      .select("entry_date")
      .eq("user_id", profile.id)
      .gte("entry_date", grid[0].date)
      .lte("entry_date", grid[grid.length - 1].date),
    supabase.from("user_badges").select("milestone").eq("user_id", profile.id),
    (() => {
      let q = supabase.from("journal_entries").select(ENTRY_COLUMNS).eq("user_id", profile.id);
      if (selected) q = q.eq("entry_date", selected);
      return q.order("entry_date", { ascending: false }).limit(FEED_PAGE).returns<FeedEntry[]>();
    })(),
  ]);

  const counts: Record<string, number> = {};
  datesRes.data?.forEach((r) => (counts[r.entry_date] = 1));
  const earned = (badgesRes.data ?? []).map((b) => b.milestone);
  const entries = feedRes.data ?? [];
  const next = nextMilestone(streaks.current_streak);
  const atRisk = mine && streaks.current_streak > 0 && !streaks.wrote_today;

  const zones = mine ? Intl.supportedValuesOf("timeZone") : [];
  if (mine && !zones.includes("UTC")) zones.unshift("UTC");
  if (mine && !zones.includes(profile.timezone)) zones.unshift(profile.timezone);

  const base = `/u/${profile.username}`;
  const hrefFor = (d: string) => `${base}?d=${d}&m=${d.slice(0, 7)}`;
  const monthHref = (m: string) => `${base}?m=${m}${selected ? `&d=${selected}` : ""}`;

  const tiles = [
    { label: "Current streak", value: streaks.current_streak, unit: "days", hot: streaks.current_streak > 0 },
    { label: "Longest streak", value: streaks.longest_streak, unit: "days" },
    { label: "Days logged", value: streaks.total, unit: "in total" },
    { label: "Badges", value: earned.length, unit: `of ${MILESTONES.length}` },
  ];

  return (
    <div className="space-y-6 pb-8 pt-5 md:pt-8">
      <section className="card flex flex-col gap-5 p-5 md:flex-row md:items-center md:justify-between md:p-7">
        <div className="flex min-w-0 items-center gap-4">
          <Avatar name={profile.username} size={72} />
          <div className="min-w-0">
            <h1 className="break-words font-display text-[clamp(1.5rem,5vw,2.4rem)] font-extrabold leading-tight">@{profile.username}</h1>
            {profile.display_name && <p className="font-semibold">{profile.display_name}</p>}
            {profile.bio && <p className="mt-0.5 max-w-xl text-mute">{profile.bio}</p>}
            <p className="mt-1 text-[13px] text-mute">Joined {formatShort(profile.created_at.slice(0, 10))}</p>
          </div>
        </div>
        {mine && (
          <div className="flex gap-2">
            <Link href="/write" className="btn flex-1 md:flex-none">
              {streaks.wrote_today ? <PenIcon size={16} /> : <PlusIcon size={16} />}
              {streaks.wrote_today ? "Edit today" : "Log today"}
            </Link>
            <a href="#settings" className="btn-ghost" aria-label="Settings">
              <GearIcon size={18} />
              <span className="hidden sm:inline">Settings</span>
            </a>
          </div>
        )}
      </section>

      {atRisk && (
        <p role="status" className="flex items-center gap-2 rounded-2xl border border-ember/40 bg-ember/10 p-3 pl-4 font-semibold">
          <FlameIcon size={18} className="shrink-0 text-ember" />
          Your {streaks.current_streak}-day streak ends tonight unless you log today.
        </p>
      )}

      {mine && (
        <ProfileSettings displayName={profile.display_name ?? ""} bio={profile.bio ?? ""} timezone={profile.timezone} zones={zones} />
      )}

      <section aria-label="Stats" className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {tiles.map((t) => (
          <div
            key={t.label}
            className={`card p-4 md:p-5 ${t.hot ? "!border-ember/40" : ""}`}
            style={t.hot ? { boxShadow: "0 0 40px -18px var(--ember)" } : undefined}
          >
            <p className="label">{t.label}</p>
            <p className={`tabular mt-1 font-display text-4xl font-black leading-none md:text-5xl ${t.hot ? "text-ember" : ""}`}>{t.value}</p>
            <p className="mt-1 text-[13px] text-mute">{t.unit}</p>
          </div>
        ))}
      </section>

      <section className="card p-4 md:p-6">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-2">
          <h2 className="font-display text-xl font-extrabold">Badges</h2>
          {mine && (
            <Link href="/badges" className="text-sm font-semibold text-accent hover:underline">
              Open the badge vault
            </Link>
          )}
        </div>
        {next ? (
          <div className="mb-5">
            <div className="flex justify-between text-[13px] font-semibold">
              <span>
                Next: {BADGE_NAMES[next]} at {next} days
              </span>
              <span className="tabular text-mute">
                {streaks.current_streak}/{next}
              </span>
            </div>
            <div
              className="mt-2 h-2.5 overflow-hidden rounded-full bg-sunken"
              role="progressbar"
              aria-label={`Progress to ${BADGE_NAMES[next]}`}
              aria-valuemin={0}
              aria-valuemax={next}
              aria-valuenow={streaks.current_streak}
            >
              <div
                className="h-full rounded-full"
                style={{
                  width: `${(streaks.current_streak / next) * 100}%`,
                  background: `linear-gradient(90deg, ${TIERS[next].face[1]}, ${TIERS[next].glow})`,
                  boxShadow: `0 0 10px ${TIERS[next].glow}`,
                }}
              />
            </div>
          </div>
        ) : (
          <p className="mb-5 font-semibold">Every badge unlocked. Absolute zero reached.</p>
        )}
        <BadgeShelf earned={earned} current={streaks.current_streak} href={mine ? "/badges" : undefined} />
      </section>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)] lg:items-start">
        <div className="lg:sticky lg:top-24">
          <Calendar
            month={month}
            today={today}
            selected={selected}
            counts={counts}
            hrefFor={hrefFor}
            monthHref={monthHref}
            unit="entries"
            personal
          />
        </div>

        <section>
          <div className="mb-4 flex items-end justify-between gap-4">
            <h2 className="font-display text-xl font-extrabold">{selected ? formatLong(selected) : "All entries"}</h2>
            {selected && (
              <Link href={`${base}?m=${month}`} className="text-sm font-semibold text-accent hover:underline">
                Show all
              </Link>
            )}
          </div>
          {entries.length === 0 ? (
            <div className="rounded-3xl border-2 border-dashed border-line p-10 text-center">
              <p className="font-display text-2xl font-extrabold">Nothing yet.</p>
              <p className="mt-2 text-mute">
                {mine ? "Your first entry starts the streak." : selected ? "No entry on this day." : "This person hasn't logged anything yet."}
              </p>
              {mine && (
                <Link href="/write" className="btn mt-5">
                  Log today
                </Link>
              )}
            </div>
          ) : (
            <FeedList
              key={selected || "all"}
              initial={entries}
              filter={{ kind: "user", userId: profile.id, date: selected || undefined }}
              viewerId={viewer?.id ?? null}
              showDate
            />
          )}
        </section>
      </div>

    </div>
  );
}
