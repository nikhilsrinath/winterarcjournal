import { createClient } from "@/lib/supabase/server";
import { getToday } from "@/lib/data";
import { isValidMonth, monthGrid } from "@/lib/dates";
import { Calendar } from "@/components/calendar";

export default async function Home({ searchParams }: { searchParams: Promise<{ m?: string }> }) {
  const sp = await searchParams;
  const today = await getToday();
  const month = isValidMonth(sp.m) ? sp.m : today.slice(0, 7);
  const grid = monthGrid(month);

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("calendar_counts", { p_from: grid[0].date, p_to: grid[grid.length - 1].date });
  const counts: Record<string, number> = {};
  (data as { entry_date: string; entries: number }[] | null)?.forEach((r) => (counts[r.entry_date] = r.entries));

  return (
    <div className="mx-auto max-w-5xl pb-8 pt-5 md:pt-8">
      <Calendar
        month={month}
        today={today}
        selected=""
        counts={counts}
        hrefFor={(d) => `/logs?d=${d}`}
        monthHref={(m) => `/?m=${m}`}
        large
      />
      <p className="mt-4 text-center text-sm text-mute">
        {error ? "Couldn't load entry counts. Refresh to try again." : "Pick a day to read what everyone logged."}
      </p>
    </div>
  );
}
