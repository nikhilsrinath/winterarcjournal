"use client";

import { useActionState } from "react";
import { updateProfile } from "@/app/actions";
import { Field } from "./auth-form";
import { SubmitButton } from "./submit-button";

export function SettingsForm({
  displayName,
  bio,
  timezone,
  zones,
}: {
  displayName: string;
  bio: string;
  timezone: string;
  zones: string[];
}) {
  const [state, action] = useActionState(updateProfile, undefined);
  const fe = state?.fieldErrors ?? {};
  return (
    <form action={action} className="space-y-5">
      <Field label="Display name" name="display_name" defaultValue={displayName} maxLength={40} error={fe.display_name} />
      <div>
        <label htmlFor="bio" className="mb-1.5 block text-sm font-semibold">
          Bio
        </label>
        <textarea id="bio" name="bio" defaultValue={bio} maxLength={160} rows={3} className="field" />
        {fe.bio && <p role="alert" className="mt-2 text-sm font-semibold text-ember">{fe.bio}</p>}
      </div>
      <div>
        <label htmlFor="timezone" className="mb-1.5 block text-sm font-semibold">
          Timezone
        </label>
        <select id="timezone" name="timezone" defaultValue={timezone} className="field">
          {zones.map((z) => (
            <option key={z} value={z}>
              {z}
            </option>
          ))}
        </select>
        <p className="mt-2 text-sm text-mute">Decides when your day ends — and when your streak rolls over.</p>
      </div>
      {state?.error && <p role="alert" className="rounded-2xl border border-ember/40 bg-ember/10 p-3 text-sm font-semibold">{state.error}</p>}
      {state?.notice && <p role="status" className="rounded-2xl border border-aurora/40 bg-aurora/10 p-3 text-sm font-semibold">{state.notice}</p>}
      <SubmitButton pendingLabel="Saving…">Save profile</SubmitButton>
    </form>
  );
}
