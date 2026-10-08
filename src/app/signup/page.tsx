import { redirect } from "next/navigation";
import { AuthForm } from "@/components/auth-form";
import { getViewer } from "@/lib/data";

export const metadata = { title: "Join" };

export default async function SignupPage() {
  if (await getViewer()) redirect("/");
  return (
    <div className="mx-auto max-w-md py-8 md:py-16">
      <div className="card p-6 md:p-8">
        <h1 className="font-display text-3xl font-black leading-tight">Start your arc</h1>
        <p className="mb-6 mt-1 text-mute">Log one thing a day, keep the streak alive and unlock badges. Free, and every entry is public.</p>
        <AuthForm mode="signup" />
      </div>
    </div>
  );
}
