"use client";

import { useEffect, useState } from "react";
import { ShieldCheck, Wifi, Database } from "lucide-react";
import { detectNative, getOfflineStatus } from "@/lib/tauri-client";
import type { OfflineStatus } from "@/lib/brain-types";

/**
 * Live indicator that reads the bundled SQLite brain and prints its
 * provenance — the "100% Offline" claim made visible. The user sees, in
 * realtime, that the local index is loaded, where it is, how big it is,
 * and how many transcript segments are searchable.
 *
 * Falls back to a quieter "running on web" pill when the page is opened
 * without the Tauri shell so the demo never throws.
 */
export function OfflineBadge() {
  const [status, setStatus] = useState<OfflineStatus | null>(null);
  const [native, setNative] = useState<"native" | "web" | "unknown">(
    "unknown",
  );

  useEffect(() => {
    setNative(detectNative());
    getOfflineStatus().then(setStatus).catch(() => setStatus(null));
  }, []);

  const isNative = native === "native";

  return (
    <div className="app-no-drag flex items-center gap-2 px-2.5 py-1.5 rounded-full bg-white/[0.03] border border-white/[0.06] hover:bg-white/[0.05] transition-colors group">
      <span className="relative flex items-center justify-center w-2 h-2">
        <span
          className={`absolute inset-0 rounded-full ${isNative ? "bg-emerald-400" : "bg-amber-400"} signal-pulse`}
        />
        <span
          className={`relative w-1.5 h-1.5 rounded-full ${isNative ? "bg-emerald-400" : "bg-amber-400"}`}
        />
      </span>

      <div className="flex items-center gap-1.5 text-[10px] font-bold tracking-[0.14em] uppercase">
        {isNative ? (
          <>
            <ShieldCheck className="w-3 h-3 text-emerald-300" />
            <span className="text-emerald-300">100% Offline · Native</span>
          </>
        ) : (
          <>
            <Wifi className="w-3 h-3 text-emerald-300" />
            <span className="text-emerald-300">Live · Web Edition</span>
          </>
        )}
      </div>

      {status && (
        <>
          <span className="text-stone-700">·</span>
          <span
            className="flex items-center gap-1 text-[10px] font-medium tracking-wide text-stone-400"
            title={status.db_path}
          >
            <Database className="w-3 h-3 text-stone-500" />
            {status.episode_count} episodes · {formatChunks(status.fts_documents)} indexed
          </span>
          {status.bundled && (
            <>
              <span className="text-stone-700">·</span>
              <span className="text-[9px] font-bold uppercase tracking-[0.14em] text-indigo-300/70">
                Bundled
              </span>
            </>
          )}
        </>
      )}
    </div>
  );
}

function formatChunks(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return `${n}`;
}
