import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { ENTRY_COLUMNS, FEED_PAGE, getStreaks, getToday, getViewer, type FeedEntry, type Profile, type Streaks } from "@/lib/data";
import { addDays, formatLong, isValidDate } from "@/lib/dates";
import { BACKFILL_DAYS } from "@/lib/validation";
import { BADGE_NAMES, nextMilestone, type Milestone } from "@/lib/badges";
import { TIERS } from "@/lib/badge-art";
import { Badge } from "@/components/badge";
import { FeedList } from "@/components/feed-list";
import { ShareBadge } from "@/components/share-badge";
import { BadgeUnlock } from "@/components/badge-unlock";
import type { ShareStats } from "@/lib/share-card";
import { EntryForm } from "@/components/entry-form";
import { DatePicker } from "@/components/date-picker";
import { CalendarIcon, CheckIcon, ChevronLeft, ChevronRight, FlameIcon, PenIcon, PlusIcon } from "@/components/icons";

export const metadata = { title: "Logs" };

type SP = Promise<{
  d?: string;
  saved?: string;
  badge?: string;
  error?: string;
}>;

export default async function LogsPage({ searchParams }: { searchParams: SP }) {
  const sp = await searchParams;
  const [today, viewer] = await Promise.all([getToday(), getViewer()]);
  const day = isValidDate(sp.d) ? sp.d : null;
  const supabase = await createClient();

  const feedQuery = () => {
    const q = supabase.from("journal_entries").select(ENTRY_COLUMNS);
    return (day ? q.eq("entry_date", day) : q.order("entry_date", { ascending: false }))
      .order("created_at", { ascending: false })
      .limit(FEED_PAGE)
      .returns<FeedEntry[]>();
  };

  const [feedRes, totalRes, mineRes, streaks, badgesRes] = await Promise.all([
    feedQuery(),
    day
      ? supabase.from("journal_entries").select("id", { count: "exact", head: true }).eq("entry_date", day)
      : Promise.resolve({ count: null }),
    viewer && day
      ? supabase.from("journal_entries").select("id").eq("user_id", viewer.id).eq("entry_date", day).maybeSingle()
      : Promise.resolve({ data: null }),
    viewer ? getStreaks(viewer.id) : Promise.resolve(null),
    viewer && sp.badge
      ? supabase.from("user_badges").select("milestone,earned_at").eq("user_id", viewer.id)
      : Promise.resolve({ data: null }),
  ]);

  const entries = feedRes.data ?? [];
  const total = totalRes.count ?? entries.length;
  const canLog = !!day && day <= today && day >= addDays(today, -BACKFILL_DAYS);
  const hasMine = !!mineRes.data;
  const isToday = day === today;
  const here = day ? `/logs?d=${day}` : "/logs";
  const myBadges = (badgesRes.data ?? []) as {
    milestone: Milestone;
    earned_at: string;
  }[];
  const share: ShareStats | undefined =
    viewer && streaks
      ? {
          username: viewer.username,
          current: streaks.current_streak,
          longest: streaks.longest_streak,
          total: streaks.total,
          earned: myBadges.map((x) => x.milestone).sort((a, b) => a - b),
        }
      : undefined;
  const earnedAt = myBadges.find((x) => String(x.milestone) === sp.badge)?.earned_at ?? null;
  const filters = [
    { label: "All days", href: "/logs", on: !day },
    { label: "Today", href: `/logs?d=${today}`, on: isToday },
    {
      label: "Yesterday",
      href: `/logs?d=${addDays(today, -1)}`,
      on: day === addDays(today, -1),
    },
  ];

  return (
    <div className="mx-auto max-w-3xl space-y-5 pb-8 pt-5 md:pt-8">
      <Flash saved={sp.saved} badge={sp.badge} error={sp.error} clearHref={here} share={share} earnedAt={earnedAt} />

      {viewer && streaks ? <TodayPanel viewer={viewer} streaks={streaks} today={today} /> : <Intro />}

      <section aria-live="polite" className="space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-3 pt-2">
          <div>
            <h1 className="font-display text-[clamp(1.6rem,5vw,2.25rem)] font-black leading-none">Logs</h1>
            <p className="mt-1.5 text-sm text-mute">
              {day ? `${formatLong(day)}, ${total} ${total === 1 ? "entry" : "entries"}` : "Everyone's entries, newest first"}
            </p>
          </div>
          {canLog && !(isToday && viewer && !hasMine) && (
            <Link href={viewer ? `/write?d=${day}` : "/signup"} className={hasMine ? "btn-ghost !min-h-10" : "btn !min-h-10"}>
              {hasMine ? <PenIcon size={16} /> : <PlusIcon size={16} />}
              {hasMine ? "Edit your entry" : viewer ? `Log ${isToday ? "today" : "this day"}` : "Join to log this day"}
            </Link>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          {filters.map((f) => (
            <Link
              key={f.label}
              href={f.href}
              aria-current={f.on ? "page" : undefined}
              className={`chip ${f.on ? "!border-accent !bg-accent !text-accent-ink" : ""}`}
            >
              {f.label}
            </Link>
          ))}
          <DatePicker value={day ?? ""} max={today} />
          {day && (
            <span className="ml-auto flex gap-1.5">
              <Link href={`/logs?d=${addDays(day, -1)}`} className="chip !px-2.5" aria-label="Previous day">
                <ChevronLeft size={16} />
              </Link>
              {day < today && (
                <Link href={`/logs?d=${addDays(day, 1)}`} className="chip !px-2.5" aria-label="Next day">
                  <ChevronRight size={16} />
                </Link>
              )}
            </span>
          )}
        </div>

        {feedRes.error ? (
          <div role="alert" className="card p-6">
            <p className="font-display text-lg font-extrabold">Couldn&apos;t load entries</p>
            <p className="mt-1 text-mute">The database didn&apos;t respond. Your entries are safe.</p>
            <Link href={here} className="btn mt-4">
              Try again
            </Link>
          </div>
        ) : entries.length === 0 ? (
          <Empty day={day} today={today} canLog={canLog} signedIn={!!viewer} />
        ) : (
          <FeedList
            key={day ?? "all"}
            initial={entries}
            filter={day ? { kind: "date", date: day } : { kind: "all" }}
            viewerId={viewer?.id ?? null}
            showDate={!day}
          />
        )}
      </section>
    </div>
  );
}

function TodayPanel({ viewer, streaks, today }: { viewer: Profile; streaks: Streaks; today: string }) {
  const next = nextMilestone(streaks.current_streak);
  const s = streaks.current_streak;
  const atRisk = s > 0 && !streaks.wrote_today;
  return (
    <section aria-label="Today" className="card overflow-hidden">
      <div className="flex flex-wrap items-center gap-x-6 gap-y-3 border-b border-line bg-sunken/60 px-4 py-3 md:px-6">
        <div className="flex items-center gap-3">
          <span
            className={`grid h-11 w-11 place-items-center rounded-2xl ${s > 0 ? "bg-ember/15 text-ember" : "bg-line/60 text-mute"}`}
            style={s > 0 ? { boxShadow: "0 0 26px -6px var(--ember)" } : undefined}
          >
            <FlameIcon size={22} />
          </span>
          <p className="leading-tight">
            <span className="tabular font-display text-2xl font-black">{s}</span>
            <span className="ml-1.5 text-[13px] font-semibold text-mute">day streak</span>
          </p>
        </div>
        {next && (
          <Link href={`/badges?b=${next}`} className="group ml-auto flex min-w-48 flex-1 items-center gap-3 sm:max-w-72">
            <Badge milestone={next} earned={false} size={38} />
            <div className="min-w-0 flex-1">
              <p className="flex justify-between gap-2 text-[13px] font-bold">
                <span className="truncate group-hover:text-accent">{BADGE_NAMES[next]}</span>
                <span className="shrink-0 font-semibold text-mute">{next - s} to go</span>
              </p>
              <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-line">
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${(s / next) * 100}%`,
                    background: TIERS[next].glow,
                    boxShadow: `0 0 8px ${TIERS[next].glow}`,
                  }}
                />
              </div>
            </div>
          </Link>
        )}
      </div>

      <div className="p-4 md:p-6">
        {streaks.wrote_today ? (
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <span className="grid h-11 w-11 place-items-center rounded-full bg-aurora/15 text-aurora">
                <CheckIcon size={22} strokeWidth={2.6} />
              </span>
              <div>
                <p className="font-display text-lg font-extrabold leading-tight">Today is logged</p>
                <p className="text-sm text-mute">Come back tomorrow to keep the streak going.</p>
              </div>
            </div>
            <Link href={`/write?d=${today}`} className="btn-ghost !min-h-10">
              <PenIcon size={16} /> Edit today&apos;s entry
            </Link>
          </div>
        ) : (
          <>
            <p className="mb-3 font-display text-lg font-extrabold leading-tight">
              {atRisk ? (
                <>
                  Log today to keep your <span className="text-ember">{s}-day streak</span>
                </>
              ) : (
                <>What did you do today, {viewer.display_name || viewer.username}?</>
              )}
            </p>
            <EntryForm date={today} initial="" isEdit={false} autoFocus={false} compact />
          </>
        )}
      </div>
    </section>
  );
}

function Intro() {
  return (
    <section className="card flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between md:p-6">
      <div>
        <p className="font-display text-xl font-extrabold leading-tight">Log one thing a day. Keep the streak going.</p>
        <p className="mt-1 text-mute">Every entry here is public. Join to add your own.</p>
      </div>
      <Link href="/signup" className="btn shrink-0">
        Start your streak
      </Link>
    </section>
  );
}

function Empty({ day, today, canLog, signedIn }: { day: string | null; today: string; canLog: boolean; signedIn: boolean }) {
  const future = !!day && day > today;
  return (
    <div className="rounded-3xl border-2 border-dashed border-line p-8 text-center md:p-12">
      <p className="font-display text-2xl font-extrabold">{future ? "Not yet." : "Silence."}</p>
      <p className="mx-auto mt-2 max-w-sm text-mute">
        {!day
          ? "Nobody has logged anything yet."
          : future
            ? "This day hasn't happened yet."
            : canLog
              ? "Nobody has logged this day yet. You could be first."
              : "Nobody logged this day, and it's too far back to add an entry now."}
      </p>
      {canLog && !(signedIn && day === today) && (
        <Link href={signedIn ? `/write?d=${day}` : "/signup"} className="btn mt-5">
          {signedIn ? "Log this day" : "Join WinterArc"}
        </Link>
      )}
      {!canLog && (
        <Link href="/" className="btn-ghost mt-5">
          <CalendarIcon size={16} /> Pick another day
        </Link>
      )}
    </div>
  );
}

function Flash({
  saved,
  badge,
  error,
  clearHref,
  share,
  earnedAt,
}: {
  saved?: string;
  badge?: string;
  error?: string;
  clearHref: string;
  share?: ShareStats;
  earnedAt: string | null;
}) {
  const m = Number(badge) as Milestone;
  const earned = m in BADGE_NAMES;
  const msg =
    error === "delete"
      ? "Couldn't delete that entry. Try again."
      : saved === "new"
        ? "Logged. The calendar just moved."
        : saved === "edited"
          ? "Entry updated."
          : saved === "deleted"
            ? "Entry deleted."
            : null;
  if (!msg) return null;

  if (earned) {
    const glow = TIERS[m].glow;
    return (
      <>
        <BadgeUnlock milestone={m} share={share && share.earned.includes(m) ? { ...share, milestone: m, earnedAt } : undefined} />
        <div
          role="status"
          className="vault rise flex flex-col items-center gap-5 rounded-[28px] p-6 text-center sm:flex-row sm:text-left md:p-8"
        >
          <div className="vault-aurora" aria-hidden />
          <div className="vault-stars" aria-hidden />
          <div className="burst pop-in shrink-0" style={{ "--glow": glow } as React.CSSProperties}>
            <Badge milestone={m} size={120} loud />
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold text-[#b9c6e4]">{msg}</p>
            <p className="mt-1 font-display text-2xl font-black leading-tight md:text-3xl" style={{ textShadow: `0 0 24px ${glow}` }}>
              Badge unlocked: {BADGE_NAMES[m]}
            </p>
            <p className="mt-1 text-[#b9c6e4]">{m} days in a row. It&apos;s in your vault now.</p>
            <div className="mt-4 flex flex-wrap justify-center gap-2 sm:justify-start">
              {share && share.earned.includes(m) ? (
                <>
                  <ShareBadge data={{ ...share, milestone: m, earnedAt }} />
                  <Link href={`/badges?b=${m}`} className="btn-ghost !border-white/20 !bg-white/5 !text-white">
                    See it in the vault
                  </Link>
                </>
              ) : (
                <Link
                  href={`/badges?b=${m}`}
                  className="btn"
                  style={{
                    background: glow,
                    color: "#04101f",
                    boxShadow: `0 0 30px -4px ${glow}`,
                  }}
                >
                  See it in the vault
                </Link>
              )}
              <Link href={clearHref} className="btn-ghost !border-white/20 !bg-white/5 !text-white" aria-label="Dismiss">
                Dismiss
              </Link>
            </div>
          </div>
        </div>
      </>
    );
  }

  const bad = error === "delete";
  return (
    <div
      role="status"
      className={`rise flex items-center justify-between gap-4 rounded-2xl border p-3 pl-4 ${
        bad ? "border-ember/40 bg-ember/10" : "border-aurora/40 bg-aurora/10"
      }`}
    >
      <p className="flex items-center gap-2 font-semibold">
        {!bad && <CheckIcon size={18} strokeWidth={2.6} className="text-aurora" />}
        {msg}
      </p>
      <Link
        href={clearHref}
        className="shrink-0 rounded-full px-3 py-1.5 text-sm font-semibold text-mute hover:text-ink"
        aria-label="Dismiss"
      >
        Dismiss
      </Link>
    </div>
  );
}
