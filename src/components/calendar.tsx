import Link from "next/link";
import { addMonths, formatMonth, monthGrid } from "@/lib/dates";
import { CheckIcon, ChevronLeft, ChevronRight } from "./icons";

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function level(n: number) {
  return n === 0 ? 0 : n < 3 ? 1 : n < 10 ? 2 : n < 25 ? 3 : 4;
}
/** Heat fill per activity level, as % of accent mixed into the cell. */
const HEAT = [0, 14, 26, 42, 60];

export function Calendar({
  month,
  today,
  selected,
  counts,
  hrefFor,
  monthHref,
  unit = "entries",
  personal = false,
  large = false,
}: {
  month: string;
  today: string;
  selected: string;
  counts: Record<string, number>;
  hrefFor: (date: string) => string;
  monthHref: (month: string) => string;
  unit?: string;
  /** One person's calendar: show a check on logged days instead of a count. */
  personal?: boolean;
  /** Full-page calendar: taller cells with written counts on wider screens. */
  large?: boolean;
}) {
  const cells = monthGrid(month);
  const todayMonth = today.slice(0, 7);
  const navBtn =
    "grid h-10 w-10 place-items-center rounded-full border border-line bg-surface text-ink transition hover:border-accent hover:text-accent active:scale-90";

  return (
    <section aria-label="Calendar" className="card p-3 sm:p-5">
      <div className="flex items-center justify-between gap-3 px-1 pb-4 pt-1">
        <h1 className="font-display text-[clamp(1.35rem,4.5vw,1.9rem)] font-extrabold leading-none tracking-tight">{formatMonth(month)}</h1>
        <div className="flex shrink-0 items-center gap-1.5">
          {month !== todayMonth && (
            <Link href={monthHref(todayMonth)} className="chip !min-h-10 !px-4">
              Today
            </Link>
          )}
          <Link href={monthHref(addMonths(month, -1))} className={navBtn} aria-label="Previous month" prefetch>
            <ChevronLeft size={18} />
          </Link>
          <Link href={monthHref(addMonths(month, 1))} className={navBtn} aria-label="Next month" prefetch>
            <ChevronRight size={18} />
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-1 pb-1.5 sm:gap-1.5">
        {WEEKDAYS.map((w) => (
          <div key={w} className="text-center text-[11px] font-bold text-mute">
            <span className="sm:hidden">{w.slice(0, 2)}</span>
            <span className="hidden sm:inline">{w}</span>
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1 sm:gap-1.5" role="grid">
        {cells.map(({ date, inMonth }) => {
          const n = counts[date] ?? 0;
          const isSel = date === selected;
          const isToday = date === today;
          const future = date > today;
          const lv = personal ? (n > 0 ? 3 : 0) : level(n);
          const style = !isSel && lv > 0 ? { background: `color-mix(in oklab, var(--accent) ${HEAT[lv]}%, var(--surface))` } : undefined;
          const shape = large
            ? "aspect-square md:aspect-auto md:h-28 md:items-start md:justify-between md:p-3 md:text-left lg:h-32"
            : "aspect-square";
          const base = `relative flex ${shape} flex-col items-center justify-center rounded-xl text-center transition sm:rounded-2xl ${
            isSel
              ? "bg-accent text-accent-ink shadow-[0_8px_22px_-8px_var(--accent)]"
              : lv > 0
                ? "text-ink"
                : "bg-line/40 text-ink"
          } ${!inMonth ? "opacity-35" : ""} ${isToday && !isSel ? "ring-2 ring-accent ring-offset-2 ring-offset-surface" : ""}`;
          const inner = (
            <>
              <span
                className={`text-[15px] leading-none sm:text-lg ${large ? "md:font-display md:text-2xl" : ""} ${
                  isToday || isSel ? "font-extrabold" : "font-semibold"
                }`}
              >
                {Number(date.slice(8))}
                {large && isToday && <span className="ml-2 hidden align-middle text-[11px] font-bold text-accent md:inline">Today</span>}
              </span>
              {large && n > 0 && !personal && (
                <span className={`tabular hidden rounded-full px-2 py-0.5 text-[12px] font-bold md:inline-block ${isSel ? "bg-white/20" : "bg-surface/80 text-accent"}`}>
                  {n} {n === 1 ? "entry" : "entries"}
                </span>
              )}
              {n > 0 &&
                (personal ? (
                  <CheckIcon size={13} strokeWidth={3} className={`mt-0.5 ${isSel ? "" : "text-accent"}`} />
                ) : (
                  <span
                    className={`tabular mt-1 text-[10px] font-bold leading-none sm:text-[11px] ${large ? "md:hidden" : ""} ${isSel ? "" : "text-accent"}`}
                  >
                    {n}
                  </span>
                ))}
            </>
          );
          const label = `${date}${n ? `, ${n} ${unit}` : ""}${isToday ? ", today" : ""}`;
          return future ? (
            <div key={date} role="gridcell" aria-label={label} className={`${base} !bg-transparent opacity-30`}>
              {inner}
            </div>
          ) : (
            <Link
              key={date}
              href={hrefFor(date)}
              role="gridcell"
              scroll={large ? undefined : false}
              aria-label={label}
              aria-current={isSel ? "date" : undefined}
              style={style}
              className={`${base} ${isSel ? "" : "hover:scale-[1.06] hover:ring-2 hover:ring-accent/60"} active:scale-95`}
            >
              {inner}
            </Link>
          );
        })}
      </div>

      {!personal && (
        <div className="mt-4 flex items-center justify-end gap-2 px-1 text-[11px] font-semibold text-mute" aria-hidden>
          Fewer
          {HEAT.slice(1).map((h) => (
            <span key={h} className="h-3 w-3 rounded" style={{ background: `color-mix(in oklab, var(--accent) ${h}%, var(--surface))` }} />
          ))}
          More entries
        </div>
      )}
    </section>
  );
}
