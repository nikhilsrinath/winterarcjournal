import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getStreaks, getToday, getViewer } from "@/lib/data";
import { addDays, formatLong, isValidDate, weekdayOf } from "@/lib/dates";
import { BACKFILL_DAYS } from "@/lib/validation";
import { BADGE_NAMES, nextMilestone } from "@/lib/badges";
import { EntryForm } from "@/components/entry-form";
import { FlameIcon } from "@/components/icons";

export const metadata = { title: "Log your day" };

export default async function WritePage({ searchParams }: { searchParams: Promise<{ d?: string }> }) {
  const viewer = await getViewer();
  if (!viewer) redirect("/login?next=/write");
  const { d } = await searchParams;
  const today = await getToday();
  const oldest = addDays(today, -BACKFILL_DAYS);
  const date = isValidDate(d) && d <= today && d >= oldest ? d : today;

  const supabase = await createClient();
  const [{ data: recent }, streaks] = await Promise.all([
    supabase.from("journal_entries").select("entry_date,content").eq("user_id", viewer.id).gte("entry_date", oldest).lte("entry_date", today),
    getStreaks(viewer.id),
  ]);
  const have = new Map((recent ?? []).map((r) => [r.entry_date, r.content]));
  const days = Array.from({ length: BACKFILL_DAYS + 1 }, (_, i) => addDays(today, -i));
  const next = nextMilestone(streaks.current_streak);
  const status = have.has(date) ? "Editing your entry" : date === today ? "Today" : "Filling in a missed day";

  return (
    <div className="mx-auto max-w-3xl space-y-5 py-6 md:py-10">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-accent">{status}</p>
          <h1 className="font-display text-[clamp(1.5rem,5vw,2.4rem)] font-extrabold leading-tight">{formatLong(date)}</h1>
        </div>
        <p className="inline-flex items-center gap-2 rounded-full border border-line bg-surface px-3.5 py-2 text-sm font-semibold">
          <FlameIcon size={16} className="text-ember" />
          <span>
            <span className="tabular">{streaks.current_streak}</span>-day streak
            {next && <span className="text-mute">, {next - streaks.current_streak} to {BADGE_NAMES[next]}</span>}
          </span>
        </p>
      </div>

      <nav aria-label="Choose day" className="-mx-4 overflow-x-auto px-4 md:mx-0 md:px-0">
        <ul className="flex gap-1.5 pb-1">
          {days.map((day) => {
            const on = day === date;
            const done = have.has(day);
            return (
              <li key={day} className="shrink-0">
                <Link
                  href={`/write?d=${day}`}
                  aria-current={on ? "date" : undefined}
                  aria-label={`${formatLong(day)}${done ? ", logged" : ""}`}
                  className={`flex h-16 w-14 flex-col items-center justify-center gap-0.5 rounded-2xl border text-center transition ${
                    on
                      ? "border-accent bg-accent text-accent-ink shadow-[0_8px_20px_-8px_var(--accent)]"
                      : "border-line bg-surface hover:border-accent"
                  }`}
                >
                  <span className={`text-[11px] font-semibold ${on ? "" : "text-mute"}`}>{day === today ? "Today" : weekdayOf(day).slice(0, 3)}</span>
                  <span className="text-lg font-extrabold leading-none">{Number(day.slice(8))}</span>
                  <span
                    aria-hidden
                    className={`h-1.5 w-1.5 rounded-full ${done ? (on ? "bg-accent-ink" : "bg-aurora") : "bg-transparent"}`}
                  />
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="card p-4 md:p-6">
        <EntryForm key={date} date={date} initial={have.get(date) ?? ""} isEdit={have.has(date)} />
      </div>
      <p className="text-center text-sm text-mute">Entries are public. You can log today or fill in any of the past {BACKFILL_DAYS} days.</p>
    </div>
  );
}
