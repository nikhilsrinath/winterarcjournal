import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { ENTRY_COLUMNS, getViewer, type FeedEntry } from "@/lib/data";
import { formatLong } from "@/lib/dates";
import { EntryCard } from "@/components/entry-card";
import { ChevronLeft } from "@/components/icons";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function load(id: string) {
  if (!UUID.test(id)) return null;
  const supabase = await createClient();
  const { data } = await supabase.from("journal_entries").select(ENTRY_COLUMNS).eq("id", id).maybeSingle<FeedEntry>();
  return data;
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const entry = await load((await params).id);
  if (!entry) return { title: "Not found" };
  return {
    title: `@${entry.profiles?.username} — ${entry.entry_date}`,
    description: entry.content.slice(0, 160),
  };
}

export default async function EntryPage({ params }: { params: Promise<{ id: string }> }) {
  const entry = await load((await params).id);
  if (!entry) notFound();
  const viewer = await getViewer();
  return (
    <div className="mx-auto max-w-3xl py-6 md:py-12">
      <Link href={`/?d=${entry.entry_date}&m=${entry.entry_date.slice(0, 7)}`} className="chip">
        <ChevronLeft size={14} /> Everyone on this day
      </Link>
      <h1 className="mb-5 mt-4 font-display text-[clamp(1.5rem,5vw,2.4rem)] font-extrabold leading-tight">{formatLong(entry.entry_date)}</h1>
      <EntryCard entry={entry} viewerId={viewer?.id} expanded />
    </div>
  );
}
