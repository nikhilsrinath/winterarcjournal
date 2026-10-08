"use client";

import { useState } from "react";
import { deleteEntry } from "@/app/actions";
import { SubmitButton } from "./submit-button";
import { TrashIcon } from "./icons";

export function DeleteButton({ id }: { id: string }) {
  const [confirming, setConfirming] = useState(false);
  if (!confirming) {
    return (
      <button
        type="button"
        onClick={() => setConfirming(true)}
        className="inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-[13px] font-semibold text-mute transition hover:bg-sunken hover:text-ember"
      >
        <TrashIcon size={14} />
        Delete
      </button>
    );
  }
  return (
    <form action={deleteEntry} className="rise flex flex-wrap items-center gap-2 pl-2">
      <input type="hidden" name="id" value={id} />
      <span className="text-[13px] font-semibold">Delete this entry?</span>
      <SubmitButton pendingLabel="Deleting…" className="btn !min-h-9 !bg-ember !px-4 !text-[13px] !shadow-none">
        Yes, delete
      </SubmitButton>
      <button type="button" onClick={() => setConfirming(false)} className="btn-ghost !min-h-9 !px-4 !text-[13px]">
        Cancel
      </button>
    </form>
  );
}
