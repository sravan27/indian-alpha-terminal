# Project Signal

Project Signal is a neural-style founder brain built on top of transcript-backed podcast conversations from Nikhil Kamath and Shantanu Deshpande.

Instead of dumping transcripts into a UI, the product now compiles:

- strategies
- market gaps and opportunity theses
- brands
- tools
- funds
- transcript evidence clips
- resource nodes
- build roadmaps
- creator-specific outreach copy

The current product focuses on:

- `WTF / People by WTF` from Nikhil Kamath
- `The BarberShop with Shantanu`

It currently includes:

- a central animated neural atlas of linked topics
- six resource vaults around the atlas
- transcript cache for 36 source episodes
- extracted source backbone for 36 source episodes
- route-handler APIs for the brain, catalog, search, and per-episode detail

## Stack

- `Next.js 16`
- `React 19`
- `Tailwind CSS 4`
- `framer-motion`
- `lucide-react`

## Data model

The neural data model is generated into [src/data/project-signal-brain.json](/Users/sravansridhar/indian-alpha/src/data/project-signal-brain.json), typed in [src/lib/project-signal.ts](/Users/sravansridhar/indian-alpha/src/lib/project-signal.ts), and rendered through [src/components/project-signal-app.tsx](/Users/sravansridhar/indian-alpha/src/components/project-signal-app.tsx).

Backend routes:

- brain API: [src/app/api/brain/route.ts](/Users/sravansridhar/indian-alpha/src/app/api/brain/route.ts)
- catalog API: [src/app/api/catalog/route.ts](/Users/sravansridhar/indian-alpha/src/app/api/catalog/route.ts)
- search API: [src/app/api/search/route.ts](/Users/sravansridhar/indian-alpha/src/app/api/search/route.ts)
- episode detail API: [src/app/api/episodes/[id]/route.ts](/Users/sravansridhar/indian-alpha/src/app/api/episodes/[id]/route.ts)

Supporting artifacts:

- generated brain dataset: [src/data/project-signal-brain.json](/Users/sravansridhar/indian-alpha/src/data/project-signal-brain.json)
- live-source snapshot: [data/ingest/live-source-snapshot.json](/Users/sravansridhar/indian-alpha/data/ingest/live-source-snapshot.json)
- transcript cache: [data/transcripts](/Users/sravansridhar/indian-alpha/data/transcripts)
- ingest/build script: [scripts/ingest_project_signal.py](/Users/sravansridhar/indian-alpha/scripts/ingest_project_signal.py)

## Commands

```bash
npm install
npm run signal:build
npm run dev
```

Verification:

```bash
npm run lint
npm run build
```

## Notes

- The generator now fetches YouTube auto-captions with `yt-dlp`, normalizes them into transcript segments, and builds the graph dataset from that evidence layer.
- Source refresh metadata is written to [data/ingest/live-source-snapshot.json](/Users/sravansridhar/indian-alpha/data/ingest/live-source-snapshot.json).
- Transcript artifacts are cached in [data/transcripts](/Users/sravansridhar/indian-alpha/data/transcripts) so repeat builds are fast.
- The node layer is intentionally synthesis-first while the episode layer preserves transcript evidence snippets for proof.
