# India Alpha · Sovereign Intel

A 100% offline, native macOS intelligence terminal. India Alpha distills
VC-grade business strategies, market gaps, and execution playbooks from
India's highest-signal founder podcasts — and surfaces them through a
sub-millisecond local index. Nothing leaves the machine.

> Pitched to **Nikhil Kamath** and **Shantanu Deshpande** as a directory
> of the alpha hidden inside their own conversations.

## Operating principles

1. **100% offline at runtime.** Zero network calls. No cloud APIs. No
   external LLMs. Verifiable via the in-app status badge and a static
   asset audit.
2. **Native first.** Tauri-shelled macOS app with a Rust backend, SQLite
   FTS5 index, and a system-font typographic stack. No Google Fonts,
   no remote CDNs.
3. **Pre-extracted intelligence beats live LLM filler.** Synthesis is
   curated at build time; retrieval is instant.

## Stack

| Layer        | Technology                                              |
|--------------|---------------------------------------------------------|
| Shell        | Tauri 2.10 (macOS / Windows / Linux)                    |
| Backend      | Rust · `rusqlite` (bundled SQLite FTS5)                 |
| Frontend     | Next.js 16 (static export) · React 19 · Tailwind v4    |
| Visualisation| `react-force-graph-3d` · framer-motion                  |
| Pipeline     | Python · `yt-dlp` · `spaCy` · local Ollama (build only)|

Ollama and `yt-dlp` are required only when **rebuilding** the intelligence
index. The shipped `.app` has no Python or LLM runtime dependency.

## Run the demo

```bash
npm install                  # one time
npm run tauri:dev            # launches the native app
```

The first launch resolves `brain.db` from the bundled resources (in
production) or from `src-tauri/brain.db` (in dev). The offline status
badge in the top-right confirms which source is loaded and how many
transcript segments are indexed.

### Build a distributable

```bash
npm run tauri:build          # produces a signed .app / .dmg under src-tauri/target/release/bundle
```

The bundle ships `brain.db` as a Tauri resource so the binary is fully
self-contained.

### Type-check / verify

```bash
npx tsc --noEmit             # frontend types
npm run tauri:check          # rust backend
npm run build                # next.js static export
```

## Architecture

```
src/                         Frontend (Next.js, static export)
  app/                       Layout & root page
  components/                
    project-signal-app.tsx   Main shell (header, alpha matrix, neural, grid)
    omni-search.tsx          Cmd+K palette wired to native FTS5
    copilot-chat.tsx         Local synthesis assistant (Cmd+J)
    offline-badge.tsx        Live offline status indicator
    neural-brain.tsx         3D force-graph atlas
  data/
    project-signal-brain.json  Bundled curated intelligence
  lib/
    brain-types.ts           Strict types for the bundled JSON
    tauri-client.ts          Single typed entry point to the Rust backend

src-tauri/                   Native shell + Rust backend
  src/lib.rs                 Tauri commands (search, intel, excerpts, status)
  brain.db                   SQLite FTS5 index — bundled as resource
  tauri.conf.json            Window chrome, bundle config, traffic-lights

scripts/                     Build-time data pipeline (Python)
```

## Tauri command surface

| Command                  | Purpose                                                     |
|--------------------------|-------------------------------------------------------------|
| `search_transcripts`     | FTS5 search across 52K+ transcript segments. Returns rank.  |
| `get_episode_intel`      | Per-episode metadata (category, guests, gaps, strategies). |
| `get_episode_excerpts`   | Pull raw transcript chunks matching a query inside one ep. |
| `get_offline_status`     | DB path, size, episode/chunk counts, bundled-resource flag.|

Every command goes through `src/lib/tauri-client.ts`, which gracefully
degrades to a curated-JSON fallback when run in a browser preview (e.g.
`next dev` without `cargo tauri dev`), so the demo never throws.

## Data pipeline (build-time only)

```bash
npm run signal:build         # python3 scripts/ingest_project_signal.py
```

Generates `src-tauri/brain.db` and `src/data/project-signal-brain.json`
from a fresh transcript pull. Requires:
- `yt-dlp` on PATH
- `python3` with `spacy` model loaded
- a local Ollama server (`llama3.1:8b`) for VC-grade synthesis

The compiled app does not invoke any of these.

## Offline integrity audit

```bash
grep -rEn "fetch\(|axios|googleapis|gstatic|vercel\.app" src src-tauri/src
```

Should return zero hits. Any external URL in the rendered UI is a static
`<a target="_blank" href="…">` link the user clicks intentionally — never
auto-fetched.
