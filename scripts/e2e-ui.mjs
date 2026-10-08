// Browser end-to-end test. Needs the app on :3000 (npm run start) and local Supabase running.
// Usage: node scripts/e2e-ui.mjs [screenshotDir]
import { chromium } from "playwright-core";
import { mkdirSync } from "node:fs";

const BASE = process.env.BASE_URL ?? "http://localhost:3000";
const OUT = process.argv[2] ?? "./e2e-shots";
mkdirSync(OUT, { recursive: true });
const CHROME = process.env.CHROME_PATH ?? "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";

let pass = 0, fail = 0;
const ok = (c, n, x = "") => { c ? pass++ : fail++; console.log(`${c ? "PASS" : "FAIL"}  ${n}${c ? "" : "  → " + x}`); };

const tag = Math.random().toString(36).slice(2, 7);
const user = `tester_${tag}`;
const browser = await chromium.launch({ executablePath: CHROME, headless: true });
const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
const page = await ctx.newPage();
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
const shot = (n) => page.screenshot({ path: `${OUT}/${n}.png`, fullPage: true, caret: "initial" });

const iso = (off) => {
  const d = new Date(); d.setDate(d.getDate() + off);
  return new Intl.DateTimeFormat("en-CA", { year: "numeric", month: "2-digit", day: "2-digit" }).format(d);
};

// 1. Landing = global calendar
await page.goto(BASE);
await page.waitForSelector('[role="grid"]');
ok(await page.locator("h1").first().first().waitFor({ timeout: 8000 }).then(() => true, () => false), "first screen shows the calendar with month heading");
ok((await page.locator('[role="gridcell"]').count()) >= 28, "calendar grid renders");
await shot("01-home-anon");

// month navigation
const monthBefore = await page.locator("h1").first().textContent();
await page.getByRole("link", { name: "Previous month" }).click();
await page.waitForFunction((m) => document.querySelector("h1")?.textContent !== m, monthBefore);
ok(true, "previous month navigates (" + (await page.locator("h1").first().textContent()) + ")");
await page.getByRole("link", { name: "Next month" }).click();
await page.waitForFunction((m) => document.querySelector("h1")?.textContent === m, monthBefore);

// 2. Signup
await page.goto(BASE + "/signup");
await page.fill("#username", user);
await page.fill("#email", `${user}@example.com`);
await page.fill("#password", "password123");
await shot("02-signup");
await page.getByRole("button", { name: "Create account" }).click();
await page.waitForURL("**/welcome");
ok(true, "signup → onboarding page");
await shot("03-welcome");

// signup validation: duplicate username
const p2 = await ctx.newPage();
await p2.goto(BASE + "/signup"); // already signed in → redirected (client-side once the stream lands)
ok(await p2.waitForURL(BASE + "/", { waitUntil: "commit", timeout: 8000 }).then(() => true, () => false), "signed-in users are redirected away from /signup", p2.url());
await p2.close();

// 3. Create today's entry
await page.goto(BASE + "/write");
await page.fill("#content", "   ");
await page.getByRole("button", { name: "Log it" }).click();
await page.waitForSelector('[role="alert"]:not(#__next-route-announcer__)');
ok(/Write something/.test(await page.locator('[role="alert"]:not(#__next-route-announcer__)').first().innerText()), "empty entry shows validation error");
const text = `Shipped the WinterArc test ${tag}.\nSecond line.`;
await page.fill("#content", text);
await page.getByRole("button", { name: "Log it" }).click();
await page.waitForURL(/saved=new/);
ok(await page.getByText("Logged. The calendar just moved.").first().waitFor({ timeout: 8000 }).then(() => true, () => false), "success banner after logging");
ok(await page.getByText(`Shipped the WinterArc test ${tag}`).first().waitFor({ timeout: 8000 }).then(() => true, () => false), "entry appears in the day's feed");
const today = iso(0);
await shot("04-after-log");
await page.goto(BASE);
const cell = page.locator(`[role="gridcell"][aria-label^="${today}"]`);
ok(/\d+ entr/.test((await cell.getAttribute("aria-label")) ?? ""), "calendar cell for today now shows an entry count", await cell.getAttribute("aria-label"));
await cell.click();
await page.waitForURL(/\/logs\?d=/);
ok(true, "clicking a calendar day opens that day's logs");

// 4. Public view (logged out, fresh context)
const anonCtx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
const anon = await anonCtx.newPage();
await anon.goto(`${BASE}/logs?d=${today}`);
ok(await anon.getByText(`Shipped the WinterArc test ${tag}`).first().waitFor({ timeout: 8000 }).then(() => true, () => false), "logged-out visitor sees the public entry");
ok((await anon.getByRole("link", { name: "Edit" }).count()) === 0, "no edit/delete controls for visitors");
await anon.getByRole("link", { name: /^Open/ }).first().click();
await anon.waitForURL(/\/entry\//);
ok(await anon.getByText(`@${user}`).first().first().waitFor({ timeout: 8000 }).then(() => true, () => false), "permalink page shows author");
await anon.goto(`${BASE}/write`);
ok(new URL(anon.url()).pathname === "/login", "protected /write redirects anon to /login");
await anonCtx.close();

// 5. Edit
await page.goto(`${BASE}/logs?d=${today}`);
await page.getByRole("link", { name: "Edit", exact: true }).first().click();
await page.waitForURL(/\/write/);
ok((await page.inputValue("#content")).includes("Second line"), "edit form is prefilled");
await page.fill("#content", `Edited entry ${tag}`);
await page.getByRole("button", { name: "Save changes" }).click();
await page.waitForURL(/saved=edited/);
ok(await page.getByText(`Edited entry ${tag}`).first().waitFor({ timeout: 8000 }).then(() => true, () => false) && (await page.getByText(`Shipped the WinterArc test ${tag}`).count()) === 0, "edit replaces content (still one entry for the day)");

// 6. Delete
await page.getByRole("button", { name: "Delete" }).first().click();
await page.getByRole("button", { name: "Yes, delete" }).click();
await page.waitForURL(/saved=deleted/);
ok((await page.getByText(`Edited entry ${tag}`).count()) === 0, "delete removes entry");
await page.goto(`${BASE}/logs?d=2001-01-01`);
ok(await page.getByText("Silence.").first().waitFor({ timeout: 8000 }).then(() => true, () => false), "empty state shown for empty day");
await shot("05-empty-day");

// 7. Streak + badge: log today and 4 previous days
for (let i = 0; i >= -4; i--) {
  await page.goto(`${BASE}/write?d=${iso(i)}`);
  await page.fill("#content", `Day ${i} work ${tag}`);
  await page.getByRole("button", { name: /Log it|Save changes/ }).click();
  await page.waitForURL(/saved=/);
}
ok(await page.getByText(/Badge unlocked/).first().waitFor({ timeout: 8000 }).then(() => true, () => false), "5th consecutive day triggers badge-unlocked banner");
await shot("06-badge-unlocked");

// 8. Profile
await page.goto(`${BASE}/me`);
await page.waitForURL(`**/u/${user}`);
await page.getByText("Current streak").first().waitFor();
const body = await page.locator("main").innerText();
ok(/CURRENT STREAK\s*5/i.test(body.replace(/\n+/g, " ")) || /5\s*days/i.test(body), "profile shows current streak 5");
ok((await page.locator('svg[aria-label*="First Frost"][aria-label*="locked"]').count()) === 0 && (await page.locator('svg[aria-label^="First Frost"]').count()) >= 1, "First Frost badge earned on profile");
ok((await page.locator('svg[aria-label*="(locked)"]').count()) === 6, "6 remaining badges shown locked");
await shot("07-profile");
// select a day in the profile calendar
await page.locator(`[role="gridcell"][aria-label^="${iso(-1)}"]`).click();
await page.waitForURL(/d=/);
ok(await page.getByText(`Day -1 work ${tag}`).first().waitFor({ timeout: 8000 }).then(() => true, () => false), "profile calendar filters history to the selected day");

// 9. Logout / login
await page.getByRole("button", { name: "Sign out" }).click();
await page.waitForURL(BASE + "/", { waitUntil: "commit" });
await page.goto(BASE + "/login");
await page.fill("#email", `${user}@example.com`);
await page.fill("#password", "wrongpassword");
await page.getByRole("button", { name: "Sign in" }).click();
await page.waitForSelector('[role="alert"]:not(#__next-route-announcer__)');
ok(/Wrong email or password/.test(await page.locator('[role="alert"]:not(#__next-route-announcer__)').first().innerText()), "bad password shows error");
await page.fill("#password", "password123");
await page.getByRole("button", { name: "Sign in" }).click();
await page.waitForURL(BASE + "/", { waitUntil: "commit" });
ok(true, "login works");

// 10. Mobile
const m = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
const mp = await m.newPage();
await mp.goto(`${BASE}/signup`);
const mu = `mobile_${tag}`;
await mp.fill("#username", mu);
await mp.fill("#email", `${mu}@example.com`);
await mp.fill("#password", "password123");
await mp.getByRole("button", { name: "Create account" }).click();
await mp.waitForURL("**/welcome");
const overflow = async (name) => {
  const o = await mp.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  ok(o <= 0, `no horizontal overflow on mobile: ${name}`, `${o}px`);
};
await overflow("welcome");
await mp.goto(`${BASE}/`);
await mp.waitForSelector('[role="grid"]');
await overflow("home");
await mp.screenshot({ path: `${OUT}/08-mobile-home.png`, fullPage: true, caret: "initial" });
ok(await mp.getByRole("navigation", { name: "Mobile" }).first().waitFor({ timeout: 8000 }).then(() => true, () => false), "mobile bottom tab bar visible");
const logTab = mp.getByRole("navigation", { name: "Mobile" }).getByRole("link", { name: "Log", exact: true });
const tabBox = await logTab.boundingBox();
ok(tabBox.height >= 48, "mobile tab touch target >= 48px", String(tabBox.height));
await logTab.click();
await mp.waitForURL(/\/write/);
await overflow("write");
await mp.fill("#content", `Mobile entry ${tag}`);
await mp.getByRole("button", { name: "Log it" }).click();
await mp.waitForURL(/saved=new/);
await mp.screenshot({ path: `${OUT}/09-mobile-after-log.png`, fullPage: true, caret: "initial" });
await mp.goto(`${BASE}/me`);
await overflow("profile");
await mp.screenshot({ path: `${OUT}/10-mobile-profile.png`, fullPage: true, caret: "initial" });
await mp.goto(`${BASE}/write`);
await mp.screenshot({ path: `${OUT}/11-mobile-write.png`, fullPage: true, caret: "initial" });

// 11. 404
const r = await page.goto(`${BASE}/entry/00000000-0000-0000-0000-000000000000`);
ok(r.status() === 404, "unknown entry → 404 page");
await shot("12-404");

const real = errors.filter((e) => !/favicon|Failed to load resource.*40[134]/.test(e));
ok(real.length === 0, "no browser console errors", real.slice(0, 3).join(" | "));

console.log(`\n${pass} passed, ${fail} failed`);
await browser.close();
process.exit(fail ? 1 : 0);

