import { redirect } from "next/navigation";
import { AuthForm } from "@/components/auth-form";
import { getViewer } from "@/lib/data";

export const metadata = { title: "Sign in" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  if (await getViewer()) redirect("/");
  const { next } = await searchParams;
  return (
    <div className="mx-auto max-w-md py-8 md:py-16">
      <div className="card p-6 md:p-8">
        <h1 className="font-display text-3xl font-black leading-tight">Welcome back</h1>
        <p className="mb-6 mt-1 text-mute">Sign in to log today and keep your streak.</p>
        <AuthForm mode="login" next={next} />
      </div>
    </div>
  );
}
