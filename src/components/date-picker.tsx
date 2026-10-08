"use client";

import { useRouter } from "next/navigation";
import { CalendarIcon } from "./icons";

/** Jump the logs feed to any past day. */
export function DatePicker({ value, max }: { value: string; max: string }) {
  const router = useRouter();
  return (
    <label className={`chip relative cursor-pointer ${value ? "" : "text-mute"}`}>
      <CalendarIcon size={15} />
      <span className="sr-only">Pick a date</span>
      <input
        type="date"
        value={value}
        max={max}
        onChange={(e) => e.target.value && router.push(`/logs?d=${e.target.value}`)}
        className="w-[8.5rem] cursor-pointer bg-transparent text-[13px] font-semibold outline-none [color-scheme:light] [[data-theme=dark]_&]:[color-scheme:dark]"
      />
    </label>
  );
}
