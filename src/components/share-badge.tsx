"use client";

import { useEffect, useRef, useState } from "react";
import { BADGE_NAMES } from "@/lib/badges";
import { TIERS } from "@/lib/badge-art";
import { renderShareCard, type ShareCardData } from "@/lib/share-card";
import { DownloadIcon, ShareIcon } from "./icons";

type State = { status: "idle" | "rendering" } | { status: "ready"; file: File; url: string } | { status: "error" };

export function ShareBadge({ data, className = "" }: { data: ShareCardData; className?: string }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [state, setState] = useState<State>({ status: "idle" });
  const [canShare, setCanShare] = useState(false);
  const tier = TIERS[data.milestone];
  const name = BADGE_NAMES[data.milestone];
  const key = `${data.milestone}|${data.earnedAt}|${data.current}|${data.longest}|${data.total}|${data.earned.join(",")}`;

  // a fresh image whenever the badge (or stats) change
  useEffect(() => {
    setState((s) => {
      if (s.status === "ready") URL.revokeObjectURL(s.url);
      return { status: "idle" };
    });
  }, [key]);

  async function open() {
    dialog.current?.showModal();
    if (state.status === "ready" || state.status === "rendering") return;
    setState({ status: "rendering" });
    try {
      const blob = await renderShareCard(data);
      const file = new File([blob], `winterarc-${name.toLowerCase().replace(/\s+/g, "-")}.png`, { type: "image/png" });
      setCanShare(typeof navigator.canShare === "function" && navigator.canShare({ files: [file] }));
      setState({ status: "ready", file, url: URL.createObjectURL(blob) });
    } catch {
      setState({ status: "error" });
    }
  }

  async function share() {
    if (state.status !== "ready") return;
    try {
      await navigator.share({
        files: [state.file],
        title: `${name} unlocked`,
        text: `I just unlocked ${name} on WinterArc Journal: ${data.milestone} days in a row. ❄️`,
      });
    } catch {
      // user cancelled the share sheet
    }
  }

  function download() {
    if (state.status !== "ready") return;
    const a = document.createElement("a");
    a.href = state.url;
    a.download = state.file.name;
    a.click();
  }

  return (
    <>
      <button
        type="button"
        onClick={open}
        className={`share-btn btn !text-[#04101f] ${className}`}
        style={{ "--glow": tier.glow, background: tier.glow, boxShadow: `0 0 30px -4px ${tier.glow}` } as React.CSSProperties}
      >
        <ShareIcon size={17} /> Share badge
      </button>

      <dialog
        ref={dialog}
        className="share-dialog m-auto w-[min(92vw,420px)] rounded-[28px] border border-white/15 bg-[#081026] p-0 text-[#e8f0ff] backdrop:bg-[#020615]/80 backdrop:backdrop-blur-sm"
        onClick={(e) => e.target === e.currentTarget && dialog.current?.close()}
        aria-label={`Share ${name}`}
      >
        <div className="p-4">
          <div className="relative mx-auto aspect-[9/16] max-h-[62vh] overflow-hidden rounded-2xl bg-[#040817]">
            {state.status === "ready" ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={state.url} alt={`Share card for ${name}`} className="rise h-full w-full object-contain" />
            ) : (
              <div className="grid h-full place-items-center text-sm text-[#8b9aba]">
                {state.status === "error" ? "Couldn't make the image. Try again." : (
                  <span className="flex flex-col items-center gap-3">
                    <span className="share-spinner" style={{ "--glow": tier.glow } as React.CSSProperties} />
                    Polishing your badge…
                  </span>
                )}
              </div>
            )}
          </div>

          <div className="mt-4 flex gap-2">
            {canShare && (
              <button
                type="button"
                onClick={share}
                disabled={state.status !== "ready"}
                className="btn flex-1 !text-[#04101f] disabled:opacity-50"
                style={{ background: tier.glow }}
              >
                <ShareIcon size={17} /> Share
              </button>
            )}
            <button
              type="button"
              onClick={download}
              disabled={state.status !== "ready"}
              className={`flex-1 disabled:opacity-50 ${canShare ? "btn-ghost !border-white/20 !bg-white/5 !text-white" : "btn !text-[#04101f]"}`}
              style={canShare ? undefined : { background: tier.glow }}
            >
              <DownloadIcon size={17} /> Download
            </button>
          </div>
          <p className="mt-3 text-center text-[12px] text-[#8b9aba]">
            {canShare ? "Pick Instagram, WhatsApp or anywhere from the share sheet." : "Sized for Instagram Stories (1080×1920)."}
          </p>
          <button
            type="button"
            onClick={() => dialog.current?.close()}
            className="mt-2 w-full rounded-full py-2 text-sm font-semibold text-[#8b9aba] hover:text-white"
          >
            Close
          </button>
        </div>
      </dialog>
    </>
  );
}
