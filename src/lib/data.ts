import { cache } from "react";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { todayIn } from "@/lib/dates";

export interface Profile {
  id: string;
  username: string;
  display_name: string | null;
  bio: string | null;
  timezone: string;
  created_at: string;
}

export interface FeedEntry {
  id: string;
  user_id: string;
  entry_date: string;
  content: string;
  created_at: string;
  updated_at: string;
  profiles: { username: string; display_name: string | null } | null;
}

export interface Streaks {
  total: number;
  current_streak: number;
  longest_streak: number;
  last_entry: string | null;
  wrote_today: boolean;
}

export const FEED_PAGE = 20;
export const ENTRY_COLUMNS = "id,user_id,entry_date,content,created_at,updated_at,profiles(username,display_name)";

export const getViewer = cache(async () => {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const id = data?.claims?.sub;
  if (!id) return null;
  const { data: profile } = await supabase.from("profiles").select("*").eq("id", id).single<Profile>();
  return profile ?? null;
});

/** The viewer's "today": their profile timezone, else the browser-provided cookie, else UTC. */
export const getToday = cache(async () => {
  const viewer = await getViewer();
  const store = await cookies();
  const tz = viewer?.timezone ?? store.get("wa_tz")?.value ?? "UTC";
  return todayIn(decodeURIComponent(tz));
});

export async function getStreaks(userId: string): Promise<Streaks> {
  const supabase = await createClient();
  const { data } = await supabase.rpc("user_streaks", { p_user: userId }).single<Streaks>();
  return data ?? { total: 0, current_streak: 0, longest_streak: 0, last_entry: null, wrote_today: false };
}
