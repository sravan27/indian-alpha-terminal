/**
 * Single typed entry point to the local Rust backend.
 *
 * Every component that talks to Tauri should go through here. This:
 *   1. centralises the (window as any).__TAURI__ check,
 *   2. carries the strict DTO types,
 *   3. degrades cleanly when the page is opened in a vanilla browser
 *      (e.g. `next dev` without `cargo tauri dev`), so we never throw
 *      uncaught errors during the pitch demo.
 */

import type {
  EpisodeMetadata,
  OfflineStatus,
  SearchResult,
  TranscriptExcerpt,
} from "./brain-types";

export type NativeStatus = "native" | "web" | "unknown";

let cachedInvoke: ((cmd: string, args?: unknown) => Promise<unknown>) | null =
  null;

export function detectNative(): NativeStatus {
  if (typeof window === "undefined") return "unknown";
  return (window as unknown as { __TAURI__?: unknown }).__TAURI__
    ? "native"
    : "web";
}

async function getInvoke() {
  if (cachedInvoke) return cachedInvoke;
  if (detectNative() !== "native") {
    throw new Error("WEB_FALLBACK");
  }
  const mod = await import("@tauri-apps/api/core");
  cachedInvoke = mod.invoke as typeof cachedInvoke extends infer X
    ? X extends null
      ? never
      : X
    : never;
  return cachedInvoke!;
}

export async function searchTranscripts(
  query: string,
  limit = 25,
): Promise<SearchResult[]> {
  try {
    const invoke = await getInvoke();
    const res = (await invoke("search_transcripts", { query, limit })) as
      | SearchResult[]
      | null;
    return res ?? [];
  } catch (err) {
    if ((err as Error).message === "WEB_FALLBACK") return [];
    console.warn("[tauri] search_transcripts failed:", err);
    return [];
  }
}

export async function getEpisodeIntel(
  videoId: string,
): Promise<EpisodeMetadata | null> {
  try {
    const invoke = await getInvoke();
    return (await invoke("get_episode_intel", {
      videoId,
    })) as EpisodeMetadata;
  } catch (err) {
    if ((err as Error).message === "WEB_FALLBACK") return null;
    console.warn("[tauri] get_episode_intel failed:", err);
    return null;
  }
}

export async function getEpisodeExcerpts(
  videoId: string,
  query = "",
  limit = 8,
): Promise<TranscriptExcerpt[]> {
  try {
    const invoke = await getInvoke();
    const res = (await invoke("get_episode_excerpts", {
      videoId,
      query,
      limit,
    })) as TranscriptExcerpt[] | null;
    return res ?? [];
  } catch (err) {
    if ((err as Error).message === "WEB_FALLBACK") return [];
    console.warn("[tauri] get_episode_excerpts failed:", err);
    return [];
  }
}

export async function getOfflineStatus(): Promise<OfflineStatus | null> {
  try {
    const invoke = await getInvoke();
    return (await invoke("get_offline_status")) as OfflineStatus;
  } catch (err) {
    if ((err as Error).message === "WEB_FALLBACK") return null;
    console.warn("[tauri] get_offline_status failed:", err);
    return null;
  }
}
