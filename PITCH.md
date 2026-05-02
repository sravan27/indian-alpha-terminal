# India Alpha — Pitch Cheat Sheet

> **Audience:** Nikhil Kamath · Shantanu Deshpande
> **Goal:** Sell the product as a ready-made founder OS built on top of their two podcast universes.
> **Demo asset:** `India Alpha.app` (18 MB native macOS bundle, sitting at project root).

---

## Cold-open numbers (memorise these)

```
57 deep-extracted episodes        — both shows, transcript-grade
8 verified founder playbooks       — 100% hand-curated dossiers
51 high-signal strategies          — every line traceable to a speaker
29 market gaps                     — sourced, ranked, severity-tagged
71 link-verified resources         — Indian Founder Library
2 cross-show operators             — Shantanu & Mukesh Bansal
14 topic clusters                  — across Capital, D2C, AI, Health, etc.
```

These are in the footer — let them appear before you say a word.

---

## 90-second walkthrough script

| Time  | Action | What you say |
|---|---|---|
| 0:00  | Double-click `India Alpha.app` | "100% offline. Zero network. The app reads its own SQLite brain." |
| 0:05  | Boot sequence (~2 s) finishes; **Alpha Matrix** loads by default | "29 ranked market gaps from your transcripts. Severity, TAM, capital tier." |
| 0:15  | Click any **CRITICAL** row — detail panel slides in from the right | "Each row clicks through to the source episode. *Watch Source Stream* opens YouTube." |
| 0:30  | Click **GRID** in the top toggle | "8 verified playbooks. Each one is a hand-curated dossier — thesis, framework, market whitespace, resource stack." |
| 0:45  | Click **LIBRARY** | "71 verified resources. Government rails, capital sources, books, compliance, communities. Every link checked." |
| 0:55  | Click **Capital · Private funds** pill | "Rainmatter is in here. WTFund is in here. Flagged as `★ WTF host fund` so a young founder sees them first." |
| 1:05  | Click **NEURAL** | "Knowledge graph. Hosts at the centre. 8 violet playbook nodes anchored to source episodes. Two amber nodes — Shantanu and Mukesh Bansal — bridging both shows." |
| 1:15  | Toggle **Strategies** in the Lens panel | "51 specific, sourced claims. Hover any rose dot — speaker, full text, episode." |
| 1:25  | Hit **`Cmd .`** (Pitch Mode) | "11-slide deck for any audience that doesn't have time for the full app." |
| 1:30  | "**Built for** *Nikhil Kamath · Shantanu Deshpande*" appears as slide one | *Pause. Let it land.* |

---

## The Three Sentences (use these verbatim)

1. **What it is:** "India Alpha is a sovereign, offline founder OS that turns the WTF and BarberShop transcripts into searchable strategies, sourced market gaps, and an Indian-specific resource library."

2. **Why it matters:** "The signal in your conversations is currently inspiration. This product turns it into infrastructure — every claim traceable to a guest, a timestamp, and a verified source link."

3. **Why now:** "The corpus is finite. The resources are stable. The dossier-grade synthesis is hand-curated, not AI slop. It's ready."

---

## What to demo, what NOT to demo

✅ **Demo every time:**
- Cold-boot animation
- Alpha Matrix → click a CRITICAL row
- Grid view → hover a Verified Playbook card
- Library → click a section pill (Capital · Private funds is the strongest)
- Neural → toggle Cross-show only
- `Cmd .` → first 3 slides of Pitch Mode

⚠️ **Optional — only if asked:**
- Cmd+K omni search (works, but slows the demo)
- Cmd+J Copilot Chat (offline synthesis on the curated brain)
- Theses view (more dense, better for follow-up)
- Workspace overlay (90-day plan generator)

❌ **Do not promise:**
- 100% episode coverage — corpus is currently **57 of 171** (114 IP-blocked, ingestion script is checked-in and idempotent; runs overnight)
- Real-time updates — the brain regenerates by re-running `synthesize_pitch_brain.py`
- Multi-user / web — the offline-native pitch is the moat

---

## Ten Lookups They Will Try (rehearse all)

| Lookup | Where | What surfaces |
|---|---|---|
| "Aman Gupta" | Cmd+K | BarberShop S1E1 + boAt content |
| "Asish Mohapatra" | Cmd+K | OfBusiness arc · 3 episodes |
| "Vineeta Singh" | Cmd+K | SUGAR · S1 finale |
| "Rohit Bansal" | Cmd+K | Snapdeal + Titan Capital · 2 episodes |
| "Mukesh Bansal" | Cmd+K | Cross-show ★ — Cure.Fit + WTF Health |
| "Shantanu Deshpande" | Cmd+K | Cross-show ★ — Beauty/skincare WTF + own podcast |
| "Rainmatter" | Cmd+K | Library entry + tag |
| "WTFund" | Cmd+K | Library entry + tag |
| "MCA" | Cmd+K | Govt registration rail |
| "Mudra" | Cmd+K | PM Mudra Yojana — non-VC capital |

If **any** of these lands flat, fix the brain entry before pitching.

---

## When something breaks live

| Breaks | Recovery |
|---|---|
| App crashes on boot | Run from terminal: `"/path/to/India Alpha.app/Contents/MacOS/app"` to see the error, but **say**: "I'll show you the web preview — same engine, same data" → `npm run dev` and open `localhost:3000` |
| Cmd+. doesn't trigger Pitch Mode | Click the **PITCH** button in the top bar — same effect |
| Library section pill doesn't switch | Already shipped fix in this session — but if it does: the underlying data is right, just refresh (Cmd+R inside the Tauri window) |
| YouTube blocked when clicking Source Stream | The source URL is shown, copy-paste into a different browser. The point is provenance, not playback |
| Neural graph stutters | First load is heavy. Wait 3 seconds; toggle Cross-show only to drop to 4 nodes |

---

## The Ask

> "What I want from this conversation is one of three:
>   1. **Buy it as-is** — sovereign, offline, the brain you already created, productised.
>   2. **License the synthesis pipeline** — keep your shows, run this layer on every new episode.
>   3. **Tell me what's missing** — I'll close the gap in 30 days and come back."

Pick one before you walk in. Don't end without naming it.

---

## File map for the actual pitch laptop

```
/Applications/India Alpha.app                  ← drag & drop
~/indian-alpha/PITCH.md                        ← this file
~/indian-alpha/data/curated/founder_library.json   ← every resource shown is here
~/indian-alpha/data/dossiers/                  ← every playbook source is here
~/indian-alpha/src/data/project-signal-brain.json ← the canonical brain
```

If they ask "show me a single source of truth", point at the dossiers folder. 8 markdown files = 8 verified playbooks.

---

## Last 60 seconds before walking in

1. Disable Wi-Fi. Make them watch you do it.
2. Re-open `India Alpha.app`.
3. Confirm the footer says **57 episodes · 90 operators · 8 playbooks**.
4. Confirm `bash scripts/ingest_status.sh` shows the 114 missing transcripts as a roadmap, not a gap.
5. Breathe.
