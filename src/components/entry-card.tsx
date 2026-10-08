import Link from "next/link";
import type { FeedEntry } from "@/lib/data";
import { formatShort, weekdayOf } from "@/lib/dates";
import { DeleteButton } from "./delete-button";
import { ExternalIcon, PenIcon } from "./icons";

const HUES = [210, 190, 165, 260, 290, 330, 25, 45];

export function Avatar({ name, size = 40 }: { name: string; size?: number }) {
  let h = 0;
  for (const ch of name) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  const hue = HUES[h % HUES.length];
  return (
    <span
      aria-hidden
      className="grid shrink-0 place-items-center rounded-full font-display font-extrabold text-white"
      style={{
        width: size,
        height: size,
        fontSize: size * 0.42,
        background: `linear-gradient(135deg, hsl(${hue} 90% 66%), hsl(${hue + 30} 75% 45%))`,
      }}
    >
      {name.slice(0, 1).toUpperCase()}
    </span>
  );
}

export function EntryCard({
  entry,
  viewerId,
  showDate = false,
  expanded = false,
}: {
  entry: FeedEntry;
  viewerId?: string | null;
  showDate?: boolean;
  expanded?: boolean;
}) {
  const mine = viewerId === entry.user_id;
  const name = entry.profiles?.username ?? "unknown";
  const edited = new Date(entry.updated_at).getTime() - new Date(entry.created_at).getTime() > 60_000;
  const meta = [showDate && `${weekdayOf(entry.entry_date).slice(0, 3)}, ${formatShort(entry.entry_date)}`, edited && "edited"]
    .filter(Boolean)
    .join(", ");
  const action = "inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-[13px] font-semibold text-mute transition hover:bg-sunken hover:text-ink";

  return (
    <article className={`card p-4 md:p-5 ${mine ? "!border-accent/50" : ""}`}>
      <header className="flex items-center gap-3">
        <Avatar name={name} />
        <div className="min-w-0 flex-1">
          <Link href={`/u/${name}`} className="block truncate font-bold leading-tight hover:text-accent">
            {entry.profiles?.display_name || `@${name}`}
          </Link>
          <p className="truncate text-[13px] text-mute">
            {entry.profiles?.display_name ? `@${name}` : ""}
            {entry.profiles?.display_name && meta ? ", " : ""}
            {meta}
          </p>
        </div>
        {mine && <span className="rounded-full bg-accent/12 px-2.5 py-1 text-[11px] font-bold text-accent">You</span>}
      </header>
      <p
        className={`mt-3 whitespace-pre-wrap break-words text-[16px] leading-relaxed md:text-[17px] ${expanded ? "" : "line-clamp-[10]"}`}
      >
        {entry.content}
      </p>
      <footer className="-mx-2 mt-3 flex flex-wrap items-center gap-1">
        <Link href={`/entry/${entry.id}`} className={action}>
          Open <ExternalIcon size={14} />
        </Link>
        {mine && (
          <>
            <Link href={`/write?d=${entry.entry_date}`} className={action}>
              <PenIcon size={14} />
              Edit
            </Link>
            <DeleteButton id={entry.id} />
          </>
        )}
      </footer>
    </article>
  );
}
