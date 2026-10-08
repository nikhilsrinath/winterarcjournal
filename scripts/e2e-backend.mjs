// End-to-end backend test against a running Supabase (local by default).
// Usage: node scripts/e2e-backend.mjs
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";

const env = Object.fromEntries(
  readFileSync(new URL("../.env.local", import.meta.url), "utf8")
    .split(/\r?\n/)
    .filter((l) => l.includes("="))
    .map((l) => [l.slice(0, l.indexOf("=")), l.slice(l.indexOf("=") + 1)]),
);
const URL_ = env.NEXT_PUBLIC_SUPABASE_URL;
const KEY = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

let pass = 0;
let fail = 0;
const ok = (cond, name, extra = "") => {
  cond ? pass++ : fail++;
  console.log(`${cond ? "PASS" : "FAIL"}  ${name}${cond ? "" : "  → " + extra}`);
};

const day = (offset) => new Date(Date.now() + offset * 864e5).toISOString().slice(0, 10);
const mk = () => createClient(URL_, KEY, { auth: { persistSession: false, autoRefreshToken: false } });
const tag = Math.random().toString(36).slice(2, 8);

async function signup(name) {
  const c = mk();
  const { data, error } = await c.auth.signUp({
    email: `${name}_${tag}@example.com`,
    password: "password123",
    options: { data: { username: `${name}_${tag}`, timezone: "UTC" } },
  });
  if (error || !data.session) throw new Error("signup failed: " + (error?.message ?? "no session"));
  return { c, id: data.user.id };
}

const A = await signup("alice");
const B = await signup("bob");
const anon = mk();

// profiles
const { data: pa } = await A.c.from("profiles").select("*").eq("id", A.id).single();
ok(pa?.username === `alice_${tag}`, "profile auto-created with username from signup");
ok(pa?.timezone === "UTC", "profile timezone stored");
const { error: tzErr } = await A.c.from("profiles").update({ timezone: "Mars/Olympus" }).eq("id", A.id);
ok(!!tzErr, "invalid timezone rejected", JSON.stringify(tzErr));
const { error: usernameChange } = await A.c.from("profiles").update({ username: "hacker" }).eq("id", A.id);
ok(!!usernameChange, "username column is not user-updatable");
await B.c.from("profiles").update({ bio: "pwned" }).eq("id", A.id);
const { data: pa2 } = await A.c.from("profiles").select("bio").eq("id", A.id).single();
ok(pa2.bio !== "pwned", "cannot edit another user's profile");

// create + dedupe
const today = day(0);
const ins = await A.c.from("journal_entries").insert({ user_id: A.id, entry_date: today, content: "first" }).select().single();
ok(!ins.error, "create today's entry", ins.error?.message);
const dup = await A.c.from("journal_entries").insert({ user_id: A.id, entry_date: today, content: "dup" });
ok(dup.error?.code === "23505", "duplicate entry for same day rejected", dup.error?.message);
const empty = await A.c.from("journal_entries").insert({ user_id: A.id, entry_date: day(-1), content: "   " });
ok(!!empty.error, "blank content rejected");
const long = await A.c.from("journal_entries").insert({ user_id: A.id, entry_date: day(-1), content: "x".repeat(2001) });
ok(!!long.error, "content > 2000 chars rejected");
const fut = await A.c.from("journal_entries").insert({ user_id: A.id, entry_date: day(2), content: "future" });
ok(fut.error?.message?.includes("entry_in_future"), "future date rejected", fut.error?.message);
const old = await A.c.from("journal_entries").insert({ user_id: A.id, entry_date: day(-30), content: "old" });
ok(old.error?.message?.includes("entry_too_old"), "date older than 7 days rejected", old.error?.message);
const spoof = await A.c.from("journal_entries").insert({ user_id: B.id, entry_date: day(-1), content: "spoof" });
ok(!!spoof.error, "cannot insert entry as another user");
const anonIns = await anon.from("journal_entries").insert({ user_id: A.id, entry_date: day(-1), content: "anon" });
ok(!!anonIns.error, "anonymous insert rejected");

// public read
const { data: pub } = await anon.from("journal_entries").select("id,content,profiles(username)").eq("entry_date", today);
ok(pub?.some((e) => e.content === "first" && e.profiles?.username === `alice_${tag}`), "anonymous can read public entries with author");
const { data: cc } = await anon.rpc("calendar_counts", { p_from: today, p_to: today });
ok(cc?.[0]?.entries >= 1, "calendar_counts works for anon", JSON.stringify(cc));

// edit / delete ownership
const eid = ins.data.id;
await B.c.from("journal_entries").update({ content: "hacked" }).eq("id", eid);
await B.c.from("journal_entries").delete().eq("id", eid);
const { data: still } = await A.c.from("journal_entries").select("content").eq("id", eid).single();
ok(still?.content === "first", "other users cannot edit or delete my entry");
const edit = await A.c.from("journal_entries").update({ content: "first (edited)" }).eq("id", eid).select().single();
ok(edit.data?.content === "first (edited)" && edit.data.updated_at >= edit.data.created_at, "owner can edit");
const redate = await A.c.from("journal_entries").update({ entry_date: day(-1) }).eq("id", eid);
ok(!!redate.error, "entry_date cannot be changed by editing", "no error");

// streaks + badges
const streak = async (u) => (await u.c.rpc("user_streaks", { p_user: u.id }).single()).data;
let s = await streak(A);
ok(s.total === 1 && s.current_streak === 1 && s.longest_streak === 1 && s.wrote_today, "streak after 1 entry", JSON.stringify(s));
for (const o of [-1, -2, -3]) await A.c.from("journal_entries").insert({ user_id: A.id, entry_date: day(o), content: `day ${o}` });
s = await streak(A);
ok(s.current_streak === 4, "4 consecutive days → streak 4", JSON.stringify(s));
let badges = (await A.c.from("user_badges").select("milestone").eq("user_id", A.id)).data.map((b) => b.milestone);
ok(badges.length === 0, "no badge at 4 days");
await A.c.from("journal_entries").insert({ user_id: A.id, entry_date: day(-4), content: "day -4" });
badges = (await anon.from("user_badges").select("milestone").eq("user_id", A.id)).data.map((b) => b.milestone);
ok(badges.join() === "5", "5th consecutive day unlocks the 5-day badge (publicly visible)", badges.join());
const badgeIns = await A.c.from("user_badges").insert({ user_id: A.id, milestone: 100 });
ok(!!badgeIns.error, "users cannot grant themselves badges");
const mid = (await A.c.from("journal_entries").select("id").eq("user_id", A.id).eq("entry_date", day(-2)).single()).data.id;
await A.c.from("journal_entries").delete().eq("id", mid);
s = await streak(A);
ok(s.current_streak === 2 && s.longest_streak === 2 && s.total === 4, "skipped day splits streak", JSON.stringify(s));
badges = (await A.c.from("user_badges").select("milestone").eq("user_id", A.id)).data;
ok(badges.length === 0, "badge revoked when streak no longer supports it");
await A.c.from("journal_entries").insert({ user_id: A.id, entry_date: day(-2), content: "restored" });
badges = (await A.c.from("user_badges").select("milestone").eq("user_id", A.id)).data;
ok(badges.length === 1, "restoring the day restores the badge");

// streak stays alive until end of tomorrow: user B logs only yesterday
await B.c.from("journal_entries").insert({ user_id: B.id, entry_date: day(-1), content: "yesterday only" });
const sb = await streak(B);
ok(sb.current_streak === 1 && !sb.wrote_today, "yesterday-only streak is still alive (grace until end of today)", JSON.stringify(sb));
await B.c.from("journal_entries").delete().eq("user_id", B.id);
await B.c.from("journal_entries").insert({ user_id: B.id, entry_date: day(-3), content: "stale" });
ok((await streak(B)).current_streak === 0, "streak is 0 after missing a full day");

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);

