"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/** Stores the browser's IANA timezone in a cookie so the server can compute the visitor's "today". */
export function TzSync() {
  const router = useRouter();
  useEffect(() => {
    try {
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
      const current = document.cookie.match(/(?:^|; )wa_tz=([^;]*)/)?.[1];
      if (tz && decodeURIComponent(current ?? "") !== tz) {
        document.cookie = `wa_tz=${encodeURIComponent(tz)}; path=/; max-age=31536000; samesite=lax`;
        router.refresh();
      }
    } catch {}
  }, [router]);
  return null;
}
