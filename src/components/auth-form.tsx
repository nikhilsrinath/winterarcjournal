"use client";

import { useActionState, useEffect, useState } from "react";
import Link from "next/link";
import { login, signup } from "@/app/actions";
import { SubmitButton } from "./submit-button";

export function Field({
  label,
  name,
  error,
  hint,
  ...props
}: { label: string; name: string; error?: string; hint?: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div>
      <label htmlFor={name} className="mb-1.5 block text-sm font-semibold">
        {label}
      </label>
      <input
        id={name}
        name={name}
        className="field"
        aria-invalid={!!error}
        aria-describedby={error ? `${name}-err` : hint ? `${name}-hint` : undefined}
        {...props}
      />
      {error ? (
        <p id={`${name}-err`} role="alert" className="mt-2 text-sm font-semibold text-ember">
          {error}
        </p>
      ) : (
        hint && (
          <p id={`${name}-hint`} className="mt-2 text-sm text-mute">
            {hint}
          </p>
        )
      )}
    </div>
  );
}

export function AuthForm({ mode, next }: { mode: "login" | "signup"; next?: string }) {
  const [state, action] = useActionState(mode === "login" ? login : signup, undefined);
  const [tz, setTz] = useState("UTC");
  // Controlled so a failed attempt doesn't wipe them (React resets uncontrolled fields after a form action).
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  useEffect(() => {
    try {
      setTz(Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC");
    } catch {}
  }, []);
  const fe = state?.fieldErrors ?? {};
  const isSignup = mode === "signup";

  return (
    <form action={action} className="space-y-5" noValidate>
      {next && <input type="hidden" name="next" value={next} />}
      {isSignup && <input type="hidden" name="timezone" value={tz} />}
      {isSignup && (
        <Field
          label="Username"
          name="username"
          autoComplete="username"
          autoCapitalize="none"
          spellCheck={false}
          required
          minLength={3}
          maxLength={20}
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          error={fe.username}
          hint="Public. Letters, numbers, underscore."
        />
      )}
      <Field
        label="Email"
        name="email"
        type="email"
        autoComplete="email"
        inputMode="email"
        required
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        error={fe.email}
      />
      <Field
        label="Password"
        name="password"
        type="password"
        autoComplete={isSignup ? "new-password" : "current-password"}
        required
        error={fe.password}
        hint={isSignup ? "At least 8 characters." : undefined}
      />
      {state?.error && (
        <p role="alert" className="rounded-2xl border border-ember/40 bg-ember/10 p-3 text-sm font-semibold">
          {state.error}
        </p>
      )}
      {state?.notice && (
        <p role="status" className="rounded-2xl border border-aurora/40 bg-aurora/10 p-3 text-sm font-semibold">
          {state.notice}
        </p>
      )}
      <SubmitButton className="btn w-full" pendingLabel={isSignup ? "Creating…" : "Signing in…"}>
        {isSignup ? "Create account" : "Sign in"}
      </SubmitButton>
      <p className="text-center text-sm">
        {isSignup ? (
          <>
            Already in?{" "}
            <Link href="/login" className="font-bold text-accent hover:underline">
              Sign in
            </Link>
          </>
        ) : (
          <>
            New here?{" "}
            <Link href="/signup" className="font-bold text-accent hover:underline">
              Create an account
            </Link>
          </>
        )}
      </p>
    </form>
  );
}
