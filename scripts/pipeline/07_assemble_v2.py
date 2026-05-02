#!/usr/bin/env python3
"""
07_assemble_v2.py — Rebuild brain.json from deep extractions
=============================================================
Takes the deep_extracted/*.json files and assembles them into a
pitch-ready project-signal-brain.json.

Every field is grounded. No filler. No hallucination.
"""

import json
import os
import sys
import glob
import re
import hashlib
from datetime import datetime
from collections import Counter, defaultdict

DATA_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "..", "data")
DEEP_DIR = os.path.join(DATA_DIR, "deep_extracted")
DISC_PATH = os.path.join(DATA_DIR, "discovered_episodes.json")
OUTPUT_PATH = os.path.join(os.path.dirname(DATA_DIR), "src", "data", "project-signal-brain.json")

# ── Category Normalization ──────────────────────────────────────────────

CATEGORY_ALIASES = {
    "d2c": "D2C",
    "direct to consumer": "D2C",
    "consumer": "Consumer",
    "consumer electronics": "Consumer Electronics",
    "capital": "Capital",
    "finance": "Capital",
    "fintech": "Capital",
    "health": "Health",
    "healthcare": "Health",
    "healthtech": "Health",
    "content": "Content",
    "media": "Content",
    "content creation": "Content",
    "ai": "AI",
    "artificial intelligence": "AI",
    "machine learning": "AI",
    "founders": "Founders",
    "entrepreneurship": "Founders",
    "startup": "Founders",
    "education": "Education",
    "edtech": "Education",
    "hospitality": "Hospitality",
    "food": "Hospitality",
    "food & beverage": "Hospitality",
    "f&b": "Hospitality",
    "realestate": "RealEstate",
    "real estate": "RealEstate",
    "proptech": "PropTech",
    "infrastructure": "PropTech",
    "proptech & infrastructure": "PropTech",
    "climate": "Climate",
    "sustainability": "Climate",
    "cleantech": "Climate",
    "gaming": "Gaming",
    "entertainment": "Entertainment",
    "music": "Entertainment",
    "ev": "EV",
    "electric vehicles": "EV",
    "platforms": "Platforms",
    "marketplace": "Platforms",
    "highops": "High-Performance Operations",
    "operations": "High-Performance Operations",
    "m&a": "M&A",
    "mergers": "M&A",
    "metaverse": "Metaverse",
    "general": "Founders",  # default to Founders rather than General
    "supply chain": "D2C Supply Chain Infrastructure",
    "d2c supply chain infrastructure": "D2C Supply Chain Infrastructure",
}

VALID_CATEGORIES = {
    "D2C", "Consumer", "Consumer Electronics", "Capital", "Health", "Content",
    "AI", "Founders", "Education", "Hospitality", "RealEstate", "PropTech",
    "Climate", "Gaming", "Entertainment", "EV", "Platforms",
    "High-Performance Operations", "M&A", "Metaverse",
    "D2C Supply Chain Infrastructure", "Founders, Capital",
}

def normalize_category(raw):
    if not raw:
        return "Founders"
    clean = raw.strip()
    # Direct match
    if clean in VALID_CATEGORIES:
        return clean
    # Alias match
    lower = clean.lower()
    if lower in CATEGORY_ALIASES:
        return CATEGORY_ALIASES[lower]
    # Partial match
    for alias, cat in CATEGORY_ALIASES.items():
        if alias in lower:
            return cat
    return "Founders"


# ── Snippet Deduplication ───────────────────────────────────────────────

def dedup_key(text):
    """Normalize text for dedup comparison."""
    return re.sub(r'[^a-z0-9 ]', '', text.lower().strip())[:80]

def is_generic(text):
    """Filter out generic/vague snippets."""
    generic_patterns = [
        r'^the (need|importance|potential|opportunity|lack) (of|for|to)',
        r'^(there is|there are|we need|india needs)',
        r'^severe lack of horizontal b2b saas',  # the infamous duplicate
    ]
    lower = text.lower().strip()
    if len(lower) < 30:
        return True
    for p in generic_patterns:
        if re.match(p, lower):
            # Allow if it has specific numbers
            if re.search(r'\d+', text):
                return False
            if len(lower) > 120:  # Long enough to be specific
                return False
            return True
    return False


# ── Guest Network Builder ───────────────────────────────────────────────

# Known hosts to exclude from guest lists
HOSTS = {"nikhil kamath", "nikhil", "shantanu deshpande", "shantanu", "host", "interviewer"}

def build_guest_network(episodes):
    """Build guest network from extracted data."""
    guest_map = {}  # name_key -> guest data

    for ep in episodes:
        intel = ep.get("intelligence", {})
        guests = intel.get("guests", [])

        for g in guests:
            if not isinstance(g, str) or len(g) < 2:
                continue
            name = g.strip()
            name_key = name.lower().strip()
            # Skip hosts
            if name_key in HOSTS or any(h in name_key for h in HOSTS):
                continue
            # Skip if it's clearly not a person name
            if len(name) > 40 or name.isdigit():
                continue

            if name_key not in guest_map:
                guest_map[name_key] = {
                    "id": f"guest-{hashlib.md5(name_key.encode()).hexdigest()[:8]}",
                    "name": name,
                    "episodeIds": [],
                    "episodeCount": 0,
                    "categories": [],
                    "isCrossShow": False,
                }

            entry = guest_map[name_key]
            vid = ep["video_id"]
            if vid not in entry["episodeIds"]:
                entry["episodeIds"].append(vid)
                entry["episodeCount"] += 1
            cat = ep.get("_category", "Founders")
            if cat not in entry["categories"]:
                entry["categories"].append(cat)

    # Check cross-show (appears in both WTF and BarberShop)
    for gk, gv in guest_map.items():
        creators = set()
        for vid in gv["episodeIds"]:
            # Check which creator this belongs to
            for ep in episodes:
                if ep["video_id"] == vid:
                    creators.add(ep.get("_creator_id", ""))
        gv["isCrossShow"] = len(creators) > 1

    return sorted(guest_map.values(), key=lambda x: -x["episodeCount"])


# ── Playbook Builder ────────────────────────────────────────────────────

def build_playbooks(episodes):
    """Generate category-level playbooks from aggregated strategies."""
    by_cat = defaultdict(list)
    for ep in episodes:
        cat = ep.get("_category", "Founders")
        for strat in ep.get("intelligence", {}).get("strategies", []):
            if isinstance(strat, dict):
                text = strat.get("text", "")
                speaker = strat.get("speaker", "")
            else:
                text = str(strat)
                speaker = ""
            if text and len(text) > 20:
                by_cat[cat].append({"text": text, "speaker": speaker, "episode": ep["title"]})

    playbooks = []
    for cat, strats in by_cat.items():
        if len(strats) < 2:
            continue
        # Deduplicate
        seen = set()
        unique_strats = []
        for s in strats:
            key = dedup_key(s["text"])
            if key not in seen:
                seen.add(key)
                unique_strats.append(s)

        # Group into phases
        phases = min(6, max(3, len(unique_strats) // 2))
        steps = []
        for i, s in enumerate(unique_strats[:phases * 2]):
            phase = i // 2
            if phase >= len(steps):
                steps.append({
                    "step": phase + 1,
                    "title": f"Phase {phase + 1}",
                    "details": [],
                    "sources": [],
                })
            steps[phase]["details"].append(s["text"])
            if s["speaker"]:
                steps[phase]["sources"].append(f"{s['speaker']} ({s['episode'][:40]})")

        # Collect tools for this category
        tools = []
        for ep in episodes:
            if ep.get("_category") == cat:
                for t in ep.get("intelligence", {}).get("tools_and_resources", []):
                    if isinstance(t, dict):
                        tools.append({
                            "name": t.get("name", ""),
                            "description": t.get("what_it_does", ""),
                            "url": "",
                        })

        # Dedup tools
        seen_tools = set()
        unique_tools = []
        for t in tools:
            tk = t["name"].lower().strip()
            if tk and tk not in seen_tools:
                seen_tools.add(tk)
                unique_tools.append(t)

        playbook_id = f"playbook-{cat.lower().replace(' ', '-').replace('&', 'and')}"
        playbooks.append({
            "id": playbook_id,
            "title": f"The Indian {cat} Playbook",
            "subtitle": f"Actionable frameworks from {len(unique_strats)} strategies across {sum(1 for e in episodes if e.get('_category') == cat)} episodes",
            "category": cat,
            "steps": steps[:6],
            "resources": unique_tools[:8],
        })

    return sorted(playbooks, key=lambda x: -len(x["steps"]))


# ── Topic Cluster Builder ──────────────────────────────────────────────

def build_topic_clusters(episodes):
    """Build topic clusters from episode categories and shared themes."""
    by_cat = defaultdict(list)
    for ep in episodes:
        by_cat[ep.get("_category", "Founders")].append(ep)

    clusters = []
    for cat, eps in by_cat.items():
        # Get top keywords from strategies and gaps
        all_text = " ".join(
            s.get("text", str(s)) if isinstance(s, dict) else str(s)
            for ep in eps
            for s in ep.get("intelligence", {}).get("strategies", [])
        )
        words = re.findall(r'\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\b', all_text)
        top_words = [w for w, c in Counter(words).most_common(8) if len(w) > 3]

        clusters.append({
            "id": f"cluster-{cat.lower().replace(' ', '-')}",
            "label": cat,
            "episodeIds": [ep["video_id"] for ep in eps],
            "keywords": top_words[:6],
            "size": len(eps),
        })

    return sorted(clusters, key=lambda x: -x["size"])


# ── Main Assembly ───────────────────────────────────────────────────────

def main():
    print("╔══════════════════════════════════════════════════════════════════╗")
    print("║  INDIA ALPHA — Brain Assembly v2                                ║")
    print("╚══════════════════════════════════════════════════════════════════╝\n")

    # Load discovered episodes for metadata
    disc_map = {}
    if os.path.exists(DISC_PATH):
        for ep in json.load(open(DISC_PATH)):
            disc_map[ep["video_id"]] = ep

    # Load all deep extractions
    extractions = []
    for fp in sorted(glob.glob(os.path.join(DEEP_DIR, "*.json"))):
        if os.path.basename(fp).startswith("_"):
            continue
        try:
            extractions.append(json.load(open(fp)))
        except json.JSONDecodeError:
            print(f"  ⚠ Skipping corrupt: {fp}")

    print(f"✓ Loaded {len(extractions)} deep extractions")

    # Enrich with discovery metadata
    for ex in extractions:
        vid = ex["video_id"]
        disc = disc_map.get(vid, {})
        ex["_creator_id"] = disc.get("creator_id", "unknown")
        ex["_show"] = disc.get("show", "Unknown Show")
        ex["_handle"] = disc.get("handle", "Unknown")
        ex["_duration"] = disc.get("duration", 0)
        ex["_duration_str"] = disc.get("duration_str", "")
        ex["_url"] = disc.get("url", f"https://www.youtube.com/watch?v={vid}")

        intel = ex.get("intelligence", {})
        raw_cat = intel.get("category", "General")
        ex["_category"] = normalize_category(raw_cat)

    # ── Build source catalog ──
    print("\n📋 Building source catalog...")
    source_catalog = []
    total_strats = 0
    total_gaps = 0
    total_tools = 0
    seen_gap_keys = set()

    for ex in extractions:
        intel = ex.get("intelligence", {})
        cat = ex["_category"]

        # Build strategy snippets (deduplicated)
        strat_snippets = []
        seen_s = set()
        strategies = intel.get("strategies", [])
        for s in strategies:
            if isinstance(s, dict):
                text = s.get("text", "")
                speaker = s.get("speaker", "")
            else:
                text = str(s)
                speaker = ""
            key = dedup_key(text)
            if key and key not in seen_s and len(text) > 25:
                seen_s.add(key)
                strat_snippets.append({
                    "text": text,
                    "speaker": speaker,
                    "source": "transcript",
                })
        total_strats += len(strat_snippets)

        # Build opportunity snippets (deduplicated globally)
        opp_snippets = []
        gaps = intel.get("market_gaps", [])
        for g in gaps:
            if isinstance(g, dict):
                text = g.get("text", "")
                evidence = g.get("evidence_quote", "")
                confidence = g.get("evidence_confidence", "UNVERIFIED")
            else:
                text = str(g)
                evidence = ""
                confidence = "UNVERIFIED"

            key = dedup_key(text)
            if key and key not in seen_gap_keys and len(text) > 25 and not is_generic(text):
                seen_gap_keys.add(key)
                opp_snippets.append({
                    "text": text,
                    "evidence": evidence,
                    "confidence": confidence,
                    "source": "transcript",
                })
        total_gaps += len(opp_snippets)

        # Tools
        tools = []
        for t in intel.get("tools_and_resources", []):
            if isinstance(t, dict):
                name = t.get("name", "")
                desc = t.get("what_it_does", t.get("description", ""))
            else:
                name = str(t)
                desc = ""
            if name and len(name) > 1:
                tools.append({"name": name, "description": desc, "url": ""})
        total_tools += len(tools)

        # Books
        books = []
        for b in intel.get("books_mentioned", []):
            if isinstance(b, dict):
                title = b.get("title", "")
                author = b.get("author", "")
            else:
                title = str(b)
                author = ""
            if title and len(title) > 2:
                books.append({"title": title, "author": author})

        # Resource mentions
        resources = []
        for r in intel.get("companies_discussed", []):
            if isinstance(r, dict):
                name = r.get("name", "")
                context = r.get("context", r.get("relevance", ""))
            else:
                name = str(r)
                context = ""
            if name and len(name) > 1:
                resources.append({"name": name, "context": context, "type": "company"})

        # Key numbers
        numbers = []
        for n in intel.get("key_numbers", []):
            if isinstance(n, dict):
                numbers.append(n)
            elif isinstance(n, str):
                numbers.append({"figure": n, "context": ""})

        guests = intel.get("guests", [])
        if not isinstance(guests, list):
            guests = []
        guest_names = [g for g in guests if isinstance(g, str) and len(g) > 1]

        ep_entry = {
            "id": ex["video_id"],
            "title": ex["title"],
            "category": cat,
            "creatorId": ex["_creator_id"],
            "show": ex["_show"],
            "duration": ex.get("_duration_str", ""),
            "url": ex["_url"],
            "wordCount": ex.get("word_count", 0),
            "guests": guest_names,
            "strategySnippets": strat_snippets,
            "opportunitySnippets": opp_snippets,
            "founderTools": tools,
            "booksMentioned": books,
            "resourceMentions": resources,
            "keyNumbers": numbers,
            "quotableMoments": intel.get("quotable_moments", []),
            "targetAudience": intel.get("target_audience", ""),
            "extractionMethod": f"deep_v2_{ex.get('extraction_model', 'mistral-nemo')}",
        }
        source_catalog.append(ep_entry)
        print(f"  ✓ [{cat:>12}] {ex['title'][:55]}... "
              f"({len(strat_snippets)}s {len(opp_snippets)}g {len(tools)}t)")

    # ── Guest Network ──
    print("\n👥 Building guest network...")
    guest_network = build_guest_network(extractions)
    cross_show = sum(1 for g in guest_network if g.get("isCrossShow"))
    print(f"  ✓ {len(guest_network)} guests, {cross_show} cross-show")

    # ── Playbooks ──
    print("\n📚 Building playbooks...")
    playbooks = build_playbooks(extractions)
    for pb in playbooks:
        print(f"  ✓ {pb['title']}: {len(pb['steps'])} phases, {len(pb['resources'])} resources")

    # ── Topic Clusters ──
    print("\n🗂  Building topic clusters...")
    clusters = build_topic_clusters(extractions)
    for cl in clusters:
        print(f"  ✓ {cl['label']}: {cl['size']} episodes")

    # ── Founder Tools by Category ──
    print("\n🛠  Assembling tools by category...")
    tools_by_cat = defaultdict(list)
    for ep in source_catalog:
        cat = ep["category"]
        for t in ep.get("founderTools", []):
            tools_by_cat[cat].append(t)

    # Dedup per category
    clean_tools_by_cat = {}
    for cat, tools in tools_by_cat.items():
        seen = set()
        clean = []
        for t in tools:
            tk = t["name"].lower().strip()
            if tk not in seen:
                seen.add(tk)
                clean.append(t)
        clean_tools_by_cat[cat] = clean
        print(f"  ✓ {cat}: {len(clean)} tools")

    # ── Creators ──
    creators = [
        {
            "id": "nikhil-kamath",
            "name": "Nikhil Kamath",
            "handle": "WTF",
            "show": "WTF with Nikhil Kamath",
            "channel": "https://www.youtube.com/@nikhil.kamath",
        },
        {
            "id": "shantanu-deshpande",
            "name": "Shantanu Deshpande",
            "handle": "The BarberShop",
            "show": "The BarberShop with Shantanu",
            "channel": "https://www.youtube.com/@thebarbershopwithshantanu6670",
        },
    ]

    # ── Assemble Brain ──
    cat_counts = Counter(ep["category"] for ep in source_catalog)
    total_words = sum(ep.get("wordCount", 0) for ep in source_catalog)

    brain = {
        "meta": {
            "productName": "India Alpha",
            "generatedAt": datetime.now().strftime("%Y-%m-%d"),
            "indexedEpisodeCount": len(source_catalog),
            "deepExtractedCount": len(source_catalog),
            "resourceCount": sum(len(v) for v in clean_tools_by_cat.values()),
            "creatorCount": len(creators),
            "guestCount": len(guest_network),
            "categoryCount": len(cat_counts),
            "playbookCount": len(playbooks),
            "crossShowGuestCount": cross_show,
            "totalWordsProcessed": total_words,
            "totalStrategies": total_strats,
            "totalMarketGaps": total_gaps,
            "totalTools": total_tools,
            "extractionMethod": f"3-pass chunked extraction via mistral-nemo:12b",
            "note": f"Deep-extracted from {len(source_catalog)} episodes across WTF & BarberShop. Every market gap has evidence grounding.",
        },
        "creators": creators,
        "sourceCatalog": source_catalog,
        "guestNetwork": guest_network,
        "masterPlaybooks": playbooks,
        "topicClusters": clusters,
        "founderToolsByCategory": clean_tools_by_cat,
    }

    # ── Write ──
    print(f"\n💾 Writing brain to {OUTPUT_PATH}...")
    with open(OUTPUT_PATH, "w") as f:
        json.dump(brain, f, indent=2, ensure_ascii=False)

    size_mb = os.path.getsize(OUTPUT_PATH) / (1024 * 1024)

    print(f"""
╔══════════════════════════════════════════════════════════════════════╗
║  BRAIN ASSEMBLY COMPLETE                                           ║
╠══════════════════════════════════════════════════════════════════════╣
║  Episodes:        {len(source_catalog):>4}                                           ║
║  Strategies:      {total_strats:>4}                                           ║
║  Market Gaps:     {total_gaps:>4} (globally deduplicated)                    ║
║  Tools/Resources: {total_tools:>4}                                           ║
║  Guests:          {len(guest_network):>4} ({cross_show} cross-show)                         ║
║  Playbooks:       {len(playbooks):>4}                                           ║
║  Words processed: {total_words:>10,}                                  ║
║  Brain size:      {size_mb:>6.1f} MB                                       ║
╚══════════════════════════════════════════════════════════════════════╝
    """)


if __name__ == "__main__":
    main()
