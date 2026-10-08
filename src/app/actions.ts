"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { ENTRY_COLUMNS, FEED_PAGE, type FeedEntry } from "@/lib/data";
import { isValidDate } from "@/lib/dates";
import { entrySchema, loginSchema, profileSchema, signupSchema } from "@/lib/validation";

export type FormState = { error?: string; fieldErrors?: Record<string, string>; notice?: string } | undefined;

function fieldErrors(issues: { path: PropertyKey[]; message: string }[]) {
  const out: Record<string, string> = {};
  for (const i of issues) out[String(i.path[0])] ??= i.message;
  return out;
}

const safeNext = (n: FormDataEntryValue | null) => {
  const s = typeof n === "string" ? n : "";
  return s.startsWith("/") && !s.startsWith("//") && !s.startsWith("/\\") ? s : "/";
};

// ───────────── auth ─────────────

export async function signup(_: FormState, form: FormData): Promise<FormState> {
  const parsed = signupSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { fieldErrors: fieldErrors(parsed.error.issues) };
  const { username, email, password, timezone } = parsed.data;

  const supabase = await createClient();
  const { data: taken } = await supabase.from("profiles").select("id").ilike("username", username).maybeSingle();
  if (taken) return { fieldErrors: { username: "That username is taken." } };

  const { data, error } = await supabase.auth.signUp({ email, password, options: { data: { username, timezone } } });
  if (error) {
    const msg = /registered|exists/i.test(error.message) ? "An account with this email already exists." : error.message;
    return { fieldErrors: /email/i.test(msg) ? { email: msg } : undefined, error: /email/i.test(msg) ? undefined : msg };
  }
  if (!data.session) return { notice: "Check your inbox to confirm your email, then sign in." };
  redirect("/welcome");
}

export async function login(_: FormState, form: FormData): Promise<FormState> {
  const parsed = loginSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { fieldErrors: fieldErrors(parsed.error.issues) };
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) {
    return { error: /confirm/i.test(error.message) ? "Confirm your email first." : "Wrong email or password." };
  }
  redirect(safeNext(form.get("next")));
}

export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/");
}

// ───────────── entries ─────────────

const DB_ERRORS: Record<string, string> = {
  entry_in_future: "You can't log a day that hasn't happened yet.",
  entry_too_old: "You can only log today or the past 7 days.",
};

export async function saveEntry(_: FormState, form: FormData): Promise<FormState> {
  const parsed = entrySchema.safeParse({ content: form.get("content") ?? "", entry_date: form.get("entry_date") ?? "" });
  if (!parsed.success) return { fieldErrors: fieldErrors(parsed.error.issues) };
  const { content, entry_date } = parsed.data;

  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  const uid = claims?.claims?.sub;
  if (!uid) redirect("/login?next=/write");

  const { data: before } = await supabase.from("user_badges").select("milestone").eq("user_id", uid);

  const { data: existing } = await supabase
    .from("journal_entries")
    .select("id")
    .eq("user_id", uid)
    .eq("entry_date", entry_date)
    .maybeSingle();

  let error;
  if (existing) {
    ({ error } = await supabase.from("journal_entries").update({ content }).eq("id", existing.id));
  } else {
    ({ error } = await supabase.from("journal_entries").insert({ user_id: uid, entry_date, content }));
    if (error?.code === "23505") {
      // A concurrent request created today's entry first — fold into it instead of failing.
      ({ error } = await supabase.from("journal_entries").update({ content }).eq("user_id", uid).eq("entry_date", entry_date));
    }
  }
  if (error) {
    const known = Object.entries(DB_ERRORS).find(([k]) => error!.message.includes(k));
    return { error: known?.[1] ?? "Couldn't save. Check your connection and try again." };
  }

  const { data: after } = await supabase.from("user_badges").select("milestone").eq("user_id", uid);
  const had = new Set((before ?? []).map((b) => b.milestone));
  const fresh = (after ?? []).map((b) => b.milestone).filter((m) => !had.has(m));
  const badge = fresh.length ? `&badge=${Math.max(...fresh)}` : "";

  revalidatePath("/", "layout");
  redirect(`/logs?d=${entry_date}&saved=${existing ? "edited" : "new"}${badge}`);
}

export async function deleteEntry(form: FormData) {
  const id = String(form.get("id") ?? "");
  const supabase = await createClient();
  const { data: row } = await supabase.from("journal_entries").select("entry_date").eq("id", id).maybeSingle();
  const { error } = await supabase.from("journal_entries").delete().eq("id", id);
  if (error) redirect("/logs?error=delete");
  revalidatePath("/", "layout");
  const d = row?.entry_date;
  redirect(d ? `/logs?d=${d}&saved=deleted` : "/logs");
}

export type FeedFilter = { kind: "all" } | { kind: "date"; date: string } | { kind: "user"; userId: string; date?: string };

export async function loadFeed(filter: FeedFilter, offset: number): Promise<FeedEntry[]> {
  const supabase = await createClient();
  let q = supabase.from("journal_entries").select(ENTRY_COLUMNS);
  if (filter.kind === "all") {
    q = q.order("entry_date", { ascending: false }).order("created_at", { ascending: false });
  } else if (filter.kind === "date") {
    if (!isValidDate(filter.date)) return [];
    q = q.eq("entry_date", filter.date).order("created_at", { ascending: false });
  } else {
    q = q.eq("user_id", filter.userId);
    if (filter.date && isValidDate(filter.date)) q = q.eq("entry_date", filter.date);
    q = q.order("entry_date", { ascending: false });
  }
  const start = Math.max(0, Math.floor(offset) || 0);
  const { data } = await q.range(start, start + FEED_PAGE - 1).returns<FeedEntry[]>();
  return data ?? [];
}

// ───────────── profile ─────────────

export async function updateProfile(_: FormState, form: FormData): Promise<FormState> {
  const parsed = profileSchema.safeParse({
    display_name: form.get("display_name") ?? "",
    bio: form.get("bio") ?? "",
    timezone: form.get("timezone") ?? "",
  });
  if (!parsed.success) return { fieldErrors: fieldErrors(parsed.error.issues) };
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  const uid = claims?.claims?.sub;
  if (!uid) redirect("/login?next=/me");
  const { error } = await supabase.from("profiles").update(parsed.data).eq("id", uid);
  if (error) return { error: "Couldn't save your profile." };
  revalidatePath("/", "layout");
  return { notice: "Saved." };
}
