"use client";

import { useActionState, useRef, useState } from "react";
import { saveEntry } from "@/app/actions";
import { SubmitButton } from "./submit-button";
import { ENTRY_MAX } from "@/lib/validation";
import { CheckIcon } from "./icons";

const STARTERS = ["Trained:", "Studied:", "Built:", "Read:", "Win of the day:"];

export function EntryForm({
  date,
  initial,
  isEdit,
  autoFocus = true,
  compact = false,
}: {
  date: string;
  initial: string;
  isEdit: boolean;
  autoFocus?: boolean;
  compact?: boolean;
}) {
  const [state, action] = useActionState(saveEntry, undefined);
  const [text, setText] = useState(initial);
  const formRef = useRef<HTMLFormElement>(null);
  const areaRef = useRef<HTMLTextAreaElement>(null);
  const left = ENTRY_MAX - text.length;
  const err = state?.fieldErrors?.content ?? state?.fieldErrors?.entry_date ?? state?.error;

  function addStarter(s: string) {
    setText((t) => (t.trim() ? `${t.replace(/\s+$/, "")}\n${s} ` : `${s} `));
    requestAnimationFrame(() => {
      const el = areaRef.current;
      if (!el) return;
      el.focus();
      el.setSelectionRange(el.value.length, el.value.length);
    });
  }

  return (
    <form
      ref={formRef}
      action={action}
      className="space-y-3"
      onKeyDown={(e) => {
        if ((e.metaKey || e.ctrlKey) && e.key === "Enter") formRef.current?.requestSubmit();
      }}
    >
      <input type="hidden" name="entry_date" value={date} />
      <label htmlFor="content" className="sr-only">
        What did you do?
      </label>
      <textarea
        ref={areaRef}
        id="content"
        name="content"
        value={text}
        onChange={(e) => setText(e.target.value)}
        autoFocus={autoFocus}
        rows={compact ? 3 : 8}
        maxLength={ENTRY_MAX + 200}
        placeholder="What did you get done today? One line is enough."
        className={`field resize-y leading-relaxed ${compact ? "min-h-28 text-base" : "min-h-56 text-lg"}`}
        aria-invalid={!!err}
        aria-describedby="entry-help"
      />
      <div className="flex flex-wrap gap-1.5" aria-label="Quick starters">
        {STARTERS.map((s) => (
          <button key={s} type="button" onClick={() => addStarter(s)} className="chip">
            + {s.replace(":", "")}
          </button>
        ))}
      </div>
      {err && (
        <p role="alert" className="rounded-2xl border border-ember/40 bg-ember/10 p-3 text-sm font-semibold">
          {err}
        </p>
      )}
      <div id="entry-help" className="flex flex-wrap items-center justify-between gap-3 pt-1">
        <p className={`text-[13px] ${left < 0 ? "font-bold text-ember" : "text-mute"}`}>
          {left < 0 ? `${-left} characters over the limit` : `${left} characters left`}
          <span className="hidden sm:inline"> · Ctrl + Enter to save</span>
        </p>
        <SubmitButton className="btn w-full sm:w-auto sm:min-w-44" pendingLabel="Saving…">
          <CheckIcon size={18} strokeWidth={2.6} />
          {isEdit ? "Save changes" : "Log it"}
        </SubmitButton>
      </div>
    </form>
  );
}
