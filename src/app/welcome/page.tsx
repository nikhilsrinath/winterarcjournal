import Link from "next/link";
import { redirect } from "next/navigation";
import { getViewer } from "@/lib/data";
import { BadgeShelf } from "@/components/badge";
import { PlusIcon } from "@/components/icons";

export const metadata = { title: "Welcome" };

export default async function Welcome() {
  const viewer = await getViewer();
  if (!viewer) redirect("/login");
  const steps = [
    ["Log one thing", "Write what you did today. A single line is enough, up to 2000 characters."],
    ["Keep the chain", "Every day in a row adds to your streak. Miss a day and it starts again from zero."],
    ["Unlock badges", "Seven badges unlock at 5, 10, 20, 35, 50, 75 and 100 days in a row."],
  ];
  return (
    <div className="mx-auto max-w-4xl space-y-6 py-8 md:py-14">
      <div>
        <p className="text-sm font-semibold text-accent">You&apos;re in, @{viewer.username}</p>
        <h1 className="mt-1 font-display text-[clamp(2rem,7vw,3.75rem)] font-black leading-[1.02]">Your winter arc starts today.</h1>
      </div>
      <ol className="grid gap-3 md:grid-cols-3">
        {steps.map(([t, d], i) => (
          <li key={t} className="card p-5">
            <span className="grid h-9 w-9 place-items-center rounded-full bg-accent/12 font-display text-sm font-extrabold text-accent">{i + 1}</span>
            <p className="mt-3 font-display text-lg font-extrabold">{t}</p>
            <p className="mt-1 text-mute">{d}</p>
          </li>
        ))}
      </ol>
      <div className="card p-4 md:p-6">
        <BadgeShelf earned={[]} current={0} />
      </div>
      <div className="flex flex-col gap-3 sm:flex-row">
        <Link href="/write" className="btn sm:min-w-64">
          <PlusIcon size={18} /> Log your first day
        </Link>
        <Link href="/" className="btn-ghost">
          Browse the calendar
        </Link>
      </div>
    </div>
  );
}
