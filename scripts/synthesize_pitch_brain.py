#!/usr/bin/env python3
"""
Pitch-Ready Brain Synthesizer
==============================

Re-builds `src/data/project-signal-brain.json` so the app is ready to put in
front of Nikhil Kamath and Shantanu Deshpande:

    1.  Promotes the 12 hand-curated dossiers (data/dossiers/) to the
        position the AI-extracted "master playbooks" used to occupy. The
        dossiers are sourced, framework-driven, and link-verified — they
        replace the generic "Phase 1, Phase 2" filler.

    2.  Replaces the topic clusters (currently labelled with garbage
        keywords like "Using" / "Focus" / "Creating") with deterministic,
        category-led clusters that surface the highest-signal episodes,
        the verified dossiers, and the named operators per category.

    3.  Filters the strategy / opportunity snippets that feed the Alpha
        Matrix, removing any that fail the quality bar (vague, too short,
        or missing a named referent).

    4.  Folds in `data/curated/founder_library.json` as `founderLibrary`,
        a hand-curated, link-verified resource catalogue specific to
        Indian founders (gov rails, capital, books, compliance, tooling).

    5.  Filters founderToolsByCategory the same way: only entries with a
        URL and a non-trivial description survive.

    6.  Marks cross-show guests (those who appear on both WTF and
        BarberShop) so the UI can promote the most-validated operators.

The script is *purely* deterministic. No network, no LLM. Run before
`npm run build` to regenerate the canonical pitch payload.
"""

from __future__ import annotations

import json
import re
from collections import Counter, defaultdict
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parents[1]
DATA_DIR = ROOT / "data"
DOSSIER_DIR = DATA_DIR / "dossiers"
CURATED_DIR = DATA_DIR / "curated"
SOURCE_BRAIN = ROOT / "src" / "data" / "project-signal-brain.json"
OUTPUT_BRAIN = SOURCE_BRAIN

CREATOR_DOSSIER_DIRS = {
    "nikhil-kamath": "nikhil-kamath",
    "shantanu-deshpande": "shantanu-deshpande",
}

# ---------------------------------------------------------------------------
# Quality filters — deterministic, no LLM
# ---------------------------------------------------------------------------

VAGUE_OPENERS = re.compile(
    r"^(be|being|become|becoming|do|use|using|utilise|utilize|create|creating"
    r"|focus|focusing|understand|understanding|seek|seeking|get|getting|stay"
    r"|staying|make|making|it\s+is|this\s+is|the|a|an|you\s+can|you\s+should"
    r"|always|never|try|trying|consider|considering|think|thinking|identify"
    r"|identifying|build\s+a|build\s+the|prioritize|prioritise|leverage"
    r"|leveraging|implement|implementing|adopt|adopting|recognize|recognise"
    r"|develop\s+a|develop\s+the|understand\s+the|maintain|maintaining)\b",
    re.I,
)

VAGUE_NOUNS = {
    "things", "stuff", "people", "everyone", "anyone", "someone",
    "everything", "anything", "something",
}

# Generic action phrases that read fine as English but tell a founder nothing
PLATITUDES = re.compile(
    r"\b(be\s+(curious|analytical|patient|prepared|ready|aware|disciplined|thick"
    r"|persistent|consistent|resilient|kind|honest|humble|hungry|focused)"
    r"|seek\s+guidance|stay\s+(focused|disciplined|positive|grounded|hungry)"
    r"|invest\s+in\s+yourself|trust\s+the\s+process|do\s+the\s+work"
    r"|enjoy\s+the\s+journey|make\s+the\s+right\s+decision|build\s+a\s+brand"
    r"|handle\s+pressure|push\s+through|stay\s+the\s+course|don[’']t\s+give\s+up)\b",
    re.I,
)

# "CEO", "CXO", "MD" etc. by themselves don't carry signal; treat them as bland
BLAND_ROLE_ACRONYMS = {"CEO", "CXO", "CTO", "CFO", "COO", "CMO", "MD"}

SPECIFIC_TOKENS = re.compile(
    r"(₹|\$|%|\b\d{2,}|\bcr\b|\bcrore|\blakh|\bbillion|\bmillion"
    r"|\bd2c\b|\bgst\b|\bsebi\b|\brbi\b|\bcdsco\b|\bfssai\b|\bondc\b|\bmsme\b|\bsidbi\b|\bdpiit\b"
    r"|\bbengaluru|\bmumbai|\bdelhi|\bbangalore|\btier[- ]?[23]"
    r"|\bipo\b|\barr\b|\bgmv\b|\bsku\b|\bpe\s+ratio|\befi\b)",
    re.I,
)

# Multi-word proper-noun (full names, brands) — strongest signal
PROPER_PHRASE = re.compile(r"\b[A-Z][a-zA-Z'&-]{2,}(?:\s+[A-Z][a-zA-Z'&0-9-]{2,}){1,3}\b")

# All-caps acronyms (AI, EV, IPO, SaaS, D2C, ARR, GMV)
ACRONYM = re.compile(r"\b(?:[A-Z]{2,5}|[A-Z][a-z][A-Z][a-z][A-Z])\b")

# Generic-acronym sentences (just AI / EV / VC) without other anchors are still platitudes
GENERIC_ACRONYM_ONLY = re.compile(
    r"^(?:Use|Using|Leverage|Leveraging|Adopt|Adopting|Implement|Implementing"
    r"|Apply|Applying|Bet\s+on|Focus\s+on|Focusing\s+on)\s+AI\b",
    re.I,
)


def has_named_signal(text: str) -> bool:
    """Return True if the text carries an entity strong enough to count as
    'specific'. AI / EV / VC alone are treated as weak — they only count if
    the sentence also has a number, currency, or another proper noun."""
    words = text.split()
    rest = " ".join(words[1:]) if words else ""
    if PROPER_PHRASE.search(text):
        return True
    # Acronym anywhere except the leading word
    acronyms = ACRONYM.findall(rest)
    if not acronyms:
        return False
    # If the only acronyms are bland generics ({"AI", "EV", "VC"}) and the
    # sentence reads like "Using AI to …", it's a platitude in disguise.
    bland_tech = {"AI", "EV", "VC"}
    if all(a in bland_tech for a in acronyms) and GENERIC_ACRONYM_ONLY.search(text):
        return False
    # "Be thick-skinned … as CEO" — role-acronym alone isn't enough signal
    if all(a in BLAND_ROLE_ACRONYMS for a in acronyms):
        return False
    return True


def is_specific(text: str) -> bool:
    """Strategy quality gate. Reject vague AI-slop, keep specifics."""
    if not text:
        return False
    text = text.strip()
    word_count = len(text.split())
    if word_count < 8:
        return False
    if PLATITUDES.search(text):
        return False
    if VAGUE_OPENERS.match(text) and not SPECIFIC_TOKENS.search(text) and not has_named_signal(text):
        return False
    lower = text.lower()
    if any(f" {n} " in f" {lower} " for n in VAGUE_NOUNS) and word_count < 16:
        return False
    if SPECIFIC_TOKENS.search(text):
        return True
    if has_named_signal(text):
        return True
    # Long, multi-clause sentences usually carry signal even without entities
    return word_count >= 16


# ---------------------------------------------------------------------------
# Dossier loader — turns markdown dossiers into MasterPlaybooks
# ---------------------------------------------------------------------------

DOSSIER_FIELD = re.compile(r"^- (?P<key>[\w/ ]+):\s*(?P<value>.+)$")
SECTION = re.compile(r"^## (?P<title>.+)$")
NUMBERED = re.compile(r"^\s*\d+\.\s*(?P<text>.+)$")
BULLET = re.compile(r"^\s*-\s*(?P<text>.+)$")


def parse_dossier(path: Path) -> dict[str, Any]:
    """Robust parser for the curated markdown dossiers."""
    raw = path.read_text(encoding="utf-8")
    lines = raw.splitlines()

    title = ""
    fields: dict[str, str] = {}
    sections: dict[str, list[str]] = defaultdict(list)
    current_section: str | None = None

    for line in lines:
        if line.startswith("# ") and not title:
            title = line[2:].strip()
            continue
        m = SECTION.match(line)
        if m:
            current_section = m.group("title").strip()
            continue
        if not current_section:
            mf = DOSSIER_FIELD.match(line)
            if mf:
                fields[mf.group("key").strip().lower()] = mf.group("value").strip()
            continue
        if line.strip():
            sections[current_section].append(line)

    def collect_lines(section: str) -> list[str]:
        """Return non-empty stripped lines from a section."""
        return [ln.strip() for ln in sections.get(section, []) if ln.strip()]

    def collect_bullets(section: str) -> list[str]:
        out = []
        for ln in collect_lines(section):
            mb = BULLET.match(ln)
            if mb:
                out.append(mb.group("text").strip())
        return out

    def collect_numbered(section: str) -> list[str]:
        out = []
        for ln in collect_lines(section):
            mn = NUMBERED.match(ln)
            if mn:
                out.append(mn.group("text").strip())
        return out

    framework = collect_numbered("Framework")
    takeaways = collect_bullets("High-signal takeaways")
    market_gap_lines = collect_lines("Market white-space")
    market_gap = " ".join(market_gap_lines).strip() if market_gap_lines else ""
    summary_lines = collect_lines("Summary")
    summary = " ".join(summary_lines).strip()
    audience_lines = collect_lines("Audience fit")
    audience = " ".join(audience_lines).strip()
    thesis_lines = collect_lines("Thesis")
    thesis = " ".join(thesis_lines).strip()
    resources = collect_bullets("Resource stack")

    # Source URL
    source_url = fields.get("source", "").strip()
    video_id_m = re.search(r"watch\?v=([\w-]+)", source_url)
    video_id = video_id_m.group(1) if video_id_m else None

    return {
        "title": title.strip(),
        "creator": fields.get("creator", ""),
        "published": fields.get("published", ""),
        "duration": fields.get("duration", ""),
        "category": fields.get("category", "General"),
        "tags": fields.get("tags", "").split() if fields.get("tags") else [],
        "sourceUrl": source_url,
        "videoId": video_id,
        "thesis": thesis,
        "summary": summary,
        "audience": audience,
        "framework": framework,
        "takeaways": takeaways,
        "marketGap": market_gap,
        "resources": resources,
        "filename": path.name,
    }


def parse_resource_line(line: str) -> dict[str, Any] | None:
    """`Name: description (https://url)` → dict."""
    m = re.match(r"^([^:]+):\s*(.+?)(?:\s*\((https?://[^)]+)\))?\s*$", line)
    if not m:
        return None
    name, desc, url = m.group(1).strip(), m.group(2).strip(), (m.group(3) or "").strip()
    return {"name": name, "description": desc, "url": url}


# ---------------------------------------------------------------------------
# Master-playbook synthesis
# ---------------------------------------------------------------------------

CATEGORY_NORMALIZE = {
    "Brand building": "Brand Building",
    "Brand Building": "Brand Building",
    "Category creation": "Category Creation",
    "Baby care": "Consumer",
    "E-commerce": "E-commerce",
    "Creator economy": "Creator Economy",
    "Skincare": "Beauty",
    "Beauty and skincare": "Beauty",
    "Hospitality": "Hospitality",
    "Scale-up design": "Scale-Up",
}


def dossier_to_playbook(d: dict[str, Any], idx: int, source_catalog: list[dict[str, Any]]) -> dict[str, Any]:
    """Turn a parsed dossier into a MasterPlaybook with verified cross-links."""
    canonical_cat = CATEGORY_NORMALIZE.get(d["category"], d["category"])

    # Steps: combine framework + takeaways into structured playbook stages
    steps = []
    for i, frame in enumerate(d["framework"], start=1):
        steps.append(
            {
                "step": i,
                "title": f"Step {i}",
                "detail": frame,
            }
        )
    if d["takeaways"]:
        steps.append(
            {
                "step": len(steps) + 1,
                "title": "What separates winners",
                "detail": " · ".join(d["takeaways"]),
            }
        )

    resources = []
    for r in d["resources"]:
        parsed = parse_resource_line(r)
        if parsed and (parsed.get("url") or parsed.get("description")):
            resources.append(parsed)

    # Cross-link to indexed episodes that share guests / category
    related_episode_ids = []
    if d["videoId"] and any(ep["id"] == d["videoId"] for ep in source_catalog):
        related_episode_ids.append(d["videoId"])
    for ep in source_catalog:
        if ep["id"] == d["videoId"]:
            continue
        ep_cat = ep.get("category", "")
        if ep_cat and ep_cat.lower() in canonical_cat.lower():
            related_episode_ids.append(ep["id"])
        if len(related_episode_ids) >= 4:
            break

    return {
        "id": f"playbook-dossier-{idx:02d}",
        "title": d["title"],
        "subtitle": d["thesis"] or d["summary"][:180],
        "thesis": d["thesis"],
        "summary": d["summary"],
        "audience": d["audience"],
        "marketGap": d["marketGap"],
        "category": canonical_cat,
        "tags": d["tags"],
        "creator": d["creator"],
        "published": d["published"],
        "duration": d["duration"],
        "sourceUrl": d["sourceUrl"],
        "videoId": d["videoId"],
        "steps": steps,
        "resources": resources,
        "episodeIds": related_episode_ids,
        "verified": True,
    }


# ---------------------------------------------------------------------------
# Topic-cluster rebuild — replace garbage AI keywords with named entities
# ---------------------------------------------------------------------------

def rebuild_clusters(
    source_catalog: list[dict[str, Any]],
    playbooks: list[dict[str, Any]],
) -> list[dict[str, Any]]:
    by_cat: dict[str, list[dict[str, Any]]] = defaultdict(list)
    for ep in source_catalog:
        cat = ep.get("category") or "General"
        by_cat[cat].append(ep)

    out = []
    for cat, eps in by_cat.items():
        # Top guests by mention volume in this category
        guest_counter: Counter[str] = Counter()
        for ep in eps:
            for g in ep.get("guests", []):
                if g and len(g) > 2:
                    guest_counter[g.strip()] += 1
        top_guests = [g for g, _ in guest_counter.most_common(8)]

        # Top strategies — filter through quality gate, dedupe
        strategies = []
        seen = set()
        for ep in eps:
            for s in ep.get("strategySnippets", []):
                t = (s.get("text") or "").strip()
                if not is_specific(t):
                    continue
                k = t.lower()[:80]
                if k in seen:
                    continue
                seen.add(k)
                strategies.append(t)
            if len(strategies) >= 6:
                break

        # Market gaps — same filter
        gaps = []
        seen_g = set()
        for ep in eps:
            for o in ep.get("opportunitySnippets", []):
                t = (o.get("text") or "").strip()
                if not is_specific(t):
                    continue
                k = t.lower()[:80]
                if k in seen_g:
                    continue
                seen_g.add(k)
                gaps.append(t)
            if len(gaps) >= 4:
                break

        # Linked playbooks for this category
        cat_playbooks = [pb for pb in playbooks if pb.get("category", "").lower().split()[0] in cat.lower() or cat.lower() in pb.get("category", "").lower()]

        out.append(
            {
                "id": f"cluster-{cat.lower().replace(' ', '-').replace('&', 'and')}",
                "category": cat,
                "label": cat,
                "episodeIds": [ep["id"] for ep in eps],
                "episodeCount": len(eps),
                "guests": top_guests,
                "guestCount": len(guest_counter),
                "topStrategies": strategies[:4],
                "marketGaps": gaps[:3],
                "playbookIds": [pb["id"] for pb in cat_playbooks],
                "size": len(eps),
            }
        )

    out.sort(key=lambda c: -c["episodeCount"])
    return out


# ---------------------------------------------------------------------------
# Cross-show guests
# ---------------------------------------------------------------------------

def rebuild_guest_network(source_catalog: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """Re-derive the guest network from episode.guests, dropping single-token
    names that are almost always tokenization errors ("Rohit" instead of
    "Rohit Bansal" / "Rohit Kapoor")."""
    bucket: dict[str, dict[str, Any]] = {}
    for ep in source_catalog:
        for raw in ep.get("guests", []):
            name = (raw or "").strip()
            # Reject empty, single-token (ambiguous), all-lower, or LLM truncation artefacts
            if not name or len(name) < 4:
                continue
            if " " not in name:
                continue
            if name.endswith("&") or name.endswith("&  Nikhi"):
                continue
            entry = bucket.setdefault(
                name,
                {
                    "id": f"guest-{abs(hash(name)) % 10**8:08x}",
                    "name": name,
                    "episodeIds": [],
                    "categories": set(),
                    "creatorIds": set(),
                    "coGuests": set(),
                },
            )
            if ep["id"] not in entry["episodeIds"]:
                entry["episodeIds"].append(ep["id"])
            entry["creatorIds"].add(ep.get("creatorId", ""))
            if ep.get("category"):
                entry["categories"].add(ep["category"])
            for co in ep.get("guests", []):
                if co and co != name:
                    entry["coGuests"].add(co)

    out: list[dict[str, Any]] = []
    for name, entry in bucket.items():
        creators = {c for c in entry["creatorIds"] if c}
        out.append(
            {
                "id": entry["id"],
                "name": name,
                "episodeIds": entry["episodeIds"],
                "episodeCount": len(entry["episodeIds"]),
                "shows": sorted(creators),
                "categories": sorted(entry["categories"]),
                "coGuests": sorted(entry["coGuests"]),
                "isCrossShow": len(creators) >= 2,
            }
        )
    out.sort(key=lambda g: (-g["episodeCount"], g["name"]))
    return out


# ---------------------------------------------------------------------------
# Episode strategy filtering — clean up the ones that feed pitch mode
# ---------------------------------------------------------------------------

DEEP_DIR = DATA_DIR / "deep_extracted"
INGEST_SCRIPT = ROOT / "scripts" / "ingest_project_signal.py"


def _load_seed_episodes() -> dict[str, dict[str, Any]]:
    """Pull the curated `EPISODES = [...]` records out of
    scripts/ingest_project_signal.py. Each record has videoId, title, creator,
    guests, duration, category-tags. Used for two things:

      1. Union into deep-extracted episode guest lists (LLM extractions miss).
      2. Surface STUB entries for episodes that haven't been deep-extracted yet
         (e.g. IP-blocked) — so name lookups for Aman Gupta / Vineeta Singh /
         Asish Mohapatra still hit something instead of dead-ending.
    """
    if not INGEST_SCRIPT.exists():
        return {}
    src = INGEST_SCRIPT.read_text()
    out: dict[str, dict[str, Any]] = {}
    block_re = re.compile(
        r'\{"id":\s*"([ns]-\d+)"[^{}]*?\}', re.S
    )
    for block_match in block_re.finditer(src):
        block = block_match.group(0)
        get = lambda k, default=None: (
            (re.search(rf'"{k}":\s*"([^"]*)"', block) or [None, default])[1]
        )
        get_list = lambda k: re.findall(r'"([^"]+)"', (re.search(rf'"{k}":\s*\[([^\]]*)\]', block) or ["", ""])[1])
        vid = get("videoId")
        if not vid:
            continue
        out[vid] = {
            "id": vid,
            "title": get("title"),
            "creatorId": get("creatorId"),
            "duration": get("duration") or "",
            "guests": get_list("guests"),
            "tags": get_list("tags"),
        }
    return out


SEED_EPISODES = _load_seed_episodes()
SEED_GUESTS = {vid: rec["guests"] for vid, rec in SEED_EPISODES.items() if rec.get("guests")}


def _category_for_seed_tags(tags: list[str]) -> str:
    """Map curated seed tags to canonical category names used elsewhere."""
    pri = [
        ("#D2C", "D2C"),
        ("#Skincare", "Beauty"),
        ("#Beauty", "Beauty"),
        ("#BrandBuilding", "Brand Building"),
        ("#Ecommerce", "E-commerce"),
        ("#VC", "Capital"),
        ("#Capital", "Capital"),
        ("#Fundraising", "Capital"),
        ("#Wealth", "Capital"),
        ("#AI", "AI"),
        ("#Health", "Health"),
        ("#Longevity", "Health"),
        ("#Climate", "Climate"),
        ("#EV", "EV"),
        ("#Hospitality", "Hospitality"),
        ("#Restaurants", "Hospitality"),
        ("#CraftBeverages", "Hospitality"),
        ("#Content", "Content"),
        ("#SocialMedia", "Content"),
        ("#Creators", "Creator Economy"),
        ("#Influence", "Creator Economy"),
        ("#Education", "Education"),
        ("#EdTech", "Education"),
        ("#Gaming", "Gaming"),
        ("#FounderMode", "Founders"),
        ("#MentalHealth", "Founders"),
        ("#Entrepreneurship", "Founders"),
        ("#Acquisitions", "M&A"),
        ("#RealEstate", "RealEstate"),
        ("#Metaverse", "Metaverse"),
        ("#Platforms", "Platforms"),
    ]
    for tag, cat in pri:
        if tag in tags:
            return cat
    return "General"


def add_stub_episodes(catalog: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """Append seed-list episodes that were never deep-extracted as STUBS, so
    their guests + titles surface in search even without strategies/gaps."""
    have = {ep["id"] for ep in catalog}
    out = list(catalog)
    for vid, rec in SEED_EPISODES.items():
        if vid in have:
            continue
        if not rec.get("title") or not rec.get("creatorId"):
            continue
        category = _category_for_seed_tags(rec.get("tags", []))
        out.append({
            "id": vid,
            "title": rec["title"],
            "creatorId": rec["creatorId"],
            "duration": rec.get("duration", ""),
            "guests": rec.get("guests", []),
            "tags": rec.get("tags", []),
            "category": category,
            "sourceUrl": f"https://www.youtube.com/watch?v={vid}",
            "status": "indexed",
            "strategySnippets": [],
            "opportunitySnippets": [],
            "quotableMoments": [],
            "founderTools": [],
            "stub": True,
        })
    return out


def reload_from_deep(ep: dict[str, Any]) -> dict[str, Any]:
    """Re-inject the deep-extracted strategies/opportunities so the script is
    idempotent. Reads `data/deep_extracted/<videoId>.json` if present.

    Also unions guest lists with the curated seed in `ingest_project_signal.py`
    so search lookups against well-known operators don't dead-end on
    truncated LLM extractions.
    """
    deep_path = DEEP_DIR / f"{ep['id']}.json"
    ep = dict(ep)
    if deep_path.exists():
        deep = json.loads(deep_path.read_text())
        intel = deep.get("intelligence", {})
        raw_strategies = intel.get("strategies", []) or []
        raw_gaps = intel.get("market_gaps", []) or []
        ep["strategySnippets"] = [
            {"text": s.get("text", ""), "speaker": s.get("speaker", "")} for s in raw_strategies
        ]
        ep["opportunitySnippets"] = [
            {
                "text": g.get("text", ""),
                "evidence": g.get("evidence", ""),
                "evidenceQuote": g.get("evidence_quote", ""),
                "evidenceSpeaker": g.get("evidence_speaker", ""),
                "confidence": g.get("evidence_confidence", "MEDIUM"),
            }
            for g in raw_gaps
        ]
        ep["quotableMoments"] = intel.get("quotable_moments", []) or []

    # Union the seed-list guests onto whatever the LLM extracted
    seed = SEED_GUESTS.get(ep["id"], [])
    if seed:
        existing = ep.get("guests", []) or []
        merged = list(existing)
        for name in seed:
            if name not in merged:
                merged.append(name)
        ep["guests"] = merged
    return ep


def clean_episode(ep: dict[str, Any]) -> dict[str, Any]:
    ep = reload_from_deep(ep)
    ep["strategySnippets"] = [
        s
        for s in ep.get("strategySnippets", [])
        if is_specific(s.get("text", ""))
    ]
    ep["opportunitySnippets"] = [
        o
        for o in ep.get("opportunitySnippets", [])
        if is_specific(o.get("text", ""))
    ]
    # Drop tools without URL or with vague description from per-episode list
    ep["founderTools"] = [
        t
        for t in ep.get("founderTools", [])
        if t.get("url") and len(t.get("description", "")) > 20
    ]
    return ep


def episode_from_deep_only(video_id: str, discovered_index: dict[str, Any]) -> dict[str, Any] | None:
    """Build an Episode-shaped record from a deep_extracted JSON for a video
    that isn't already in sourceCatalog. Pulls metadata from
    discovered_episodes.json so guests, title, duration, source URL all line
    up with the existing schema."""
    deep_path = DEEP_DIR / f"{video_id}.json"
    if not deep_path.exists():
        return None
    deep = json.loads(deep_path.read_text())
    intel = deep.get("intelligence", {}) or {}
    disc = discovered_index.get(video_id) or {}

    raw_strategies = intel.get("strategies", []) or []
    raw_gaps = intel.get("market_gaps", []) or []

    return {
        "id": video_id,
        "creatorId": disc.get("creator_id", ""),
        "publishedOrder": 0,
        "duration": disc.get("duration_str", ""),
        "title": deep.get("title") or disc.get("title", ""),
        "guests": intel.get("guests", []) or [],
        "tags": [],
        "sourceUrl": disc.get("url") or f"https://www.youtube.com/watch?v={video_id}",
        "status": "deep-extracted",
        "category": intel.get("category", "General") or "General",
        "strategySnippets": [
            {"text": s.get("text", ""), "speaker": s.get("speaker", "")}
            for s in raw_strategies
        ],
        "opportunitySnippets": [
            {
                "text": g.get("text", ""),
                "evidence": g.get("evidence", ""),
                "evidenceQuote": g.get("evidence_quote", ""),
                "evidenceSpeaker": g.get("evidence_speaker", ""),
                "confidence": g.get("evidence_confidence", "MEDIUM"),
            }
            for g in raw_gaps
        ],
        "highlightSnippets": [],
        "resourceMentions": [],
        "resourceString": "",
        "founderTools": [],
        "booksMentioned": [],
        "toolsMentioned": [],
        "quotableMoments": intel.get("quotable_moments", []) or [],
        "targetAudience": intel.get("target_audience", "") or "",
        "wordCount": deep.get("word_count", 0),
        "extractionMethod": deep.get("extraction_version", "deep_v2"),
        "entitiesPersons": [],
        "entitiesOrgs": [],
        "entitiesProducts": [],
        "entitiesMoney": [],
        "relatedEpisodes": [],
    }


# ---------------------------------------------------------------------------
# Founder-tools-by-category cleanup
# ---------------------------------------------------------------------------

def clean_founder_tools(tools_by_cat: dict[str, list[dict[str, Any]]]) -> dict[str, list[dict[str, Any]]]:
    cleaned: dict[str, list[dict[str, Any]]] = {}
    for cat, tools in tools_by_cat.items():
        kept = []
        seen = set()
        for t in tools:
            if not isinstance(t, dict):
                continue
            url = (t.get("url") or "").strip()
            desc = (t.get("description") or "").strip()
            name = (t.get("name") or "").strip()
            if not url:
                continue
            if not desc or len(desc) < 25:
                continue
            if name.lower() in seen:
                continue
            seen.add(name.lower())
            kept.append(t)
        if kept:
            cleaned[cat] = kept
    return cleaned


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main() -> None:
    if not SOURCE_BRAIN.exists():
        raise SystemExit(f"Source brain not found at {SOURCE_BRAIN}")

    brain = json.loads(SOURCE_BRAIN.read_text())

    # Build discovered-episode index so we can build new entries from disk
    discovered_path = DATA_DIR / "discovered_episodes.json"
    discovered_index: dict[str, Any] = {}
    if discovered_path.exists():
        for entry in json.loads(discovered_path.read_text()):
            discovered_index[entry["video_id"]] = entry

    # 1.  Clean episodes already in the catalog
    cleaned_catalog = [clean_episode(ep) for ep in brain.get("sourceCatalog", [])]
    cleaned_catalog = add_stub_episodes(cleaned_catalog)
    have_ids = {ep["id"] for ep in cleaned_catalog}

    # 1b. Pull in any deep_extracted episode that isn't in the catalog yet —
    #     this is what lets a fresh ingest run light up new episodes without
    #     needing to also touch the upstream ingest_project_signal.py.
    for deep_path in sorted(DEEP_DIR.glob("*.json")):
        vid = deep_path.stem
        if vid.startswith("_") or vid in have_ids:
            continue
        ep = episode_from_deep_only(vid, discovered_index)
        if ep:
            cleaned_catalog.append(clean_episode(ep))
            have_ids.add(vid)

    # 2.  Parse all dossiers from the two podcast hosts only
    parsed_dossiers: list[dict[str, Any]] = []
    for cid, dirname in CREATOR_DOSSIER_DIRS.items():
        host_dir = DOSSIER_DIR / dirname
        if not host_dir.exists():
            continue
        for path in sorted(host_dir.glob("*.md")):
            d = parse_dossier(path)
            d["creatorId"] = cid
            parsed_dossiers.append(d)

    # 3.  Build canonical playbooks from dossiers
    playbooks = [
        dossier_to_playbook(d, i + 1, cleaned_catalog)
        for i, d in enumerate(parsed_dossiers)
    ]

    # 4.  Rebuild topic clusters
    clusters = rebuild_clusters(cleaned_catalog, playbooks)

    # 5.  Re-derive guest network and mark cross-show guests
    guest_network = rebuild_guest_network(cleaned_catalog)
    cross_show_guests = [g["name"] for g in guest_network if g.get("isCrossShow")]

    # 6.  Clean founderToolsByCategory
    tools_clean = clean_founder_tools(brain.get("founderToolsByCategory", {}))

    # 7.  Load curated founder library
    library_path = CURATED_DIR / "founder_library.json"
    founder_library = json.loads(library_path.read_text()) if library_path.exists() else None

    # 8.  Counter-stats
    total_strategies = sum(len(ep.get("strategySnippets", [])) for ep in cleaned_catalog)
    total_gaps = sum(len(ep.get("opportunitySnippets", [])) for ep in cleaned_catalog)
    library_resource_count = (
        sum(len(s["items"]) for s in founder_library["sections"]) if founder_library else 0
    )

    out = dict(brain)
    out["meta"] = {
        **brain.get("meta", {}),
        "productName": "India Alpha",
        "generatedAt": datetime.now(timezone.utc).strftime("%Y-%m-%d"),
        "indexedEpisodeCount": len(cleaned_catalog),
        "verifiedPlaybookCount": len(playbooks),
        "playbookCount": len(playbooks),
        "guestCount": len(guest_network),
        "categoryCount": len(clusters),
        "crossShowGuestCount": len(cross_show_guests),
        "totalStrategies": total_strategies,
        "totalMarketGaps": total_gaps,
        "totalLibraryResources": library_resource_count,
        "extractionMethod": "deterministic (no LLM at synthesis time)",
        "note": (
            f"Synthesised from {len(cleaned_catalog)} indexed episodes and "
            f"{len(playbooks)} hand-curated dossiers. AI-extracted strategies that "
            f"failed the specificity gate were dropped. Founder Library is "
            f"hand-curated and link-verified."
        ),
    }
    out["sourceCatalog"] = cleaned_catalog
    out["masterPlaybooks"] = playbooks
    out["topicClusters"] = clusters
    out["guestNetwork"] = guest_network
    out["crossShowGuests"] = cross_show_guests
    out["founderToolsByCategory"] = tools_clean
    if founder_library:
        out["founderLibrary"] = founder_library

    OUTPUT_BRAIN.write_text(json.dumps(out, ensure_ascii=False, indent=2))

    print(
        json.dumps(
            {
                "episodes": len(cleaned_catalog),
                "playbooks": len(playbooks),
                "clusters": len(clusters),
                "crossShowGuests": len(cross_show_guests),
                "strategies": total_strategies,
                "marketGaps": total_gaps,
                "libraryResources": library_resource_count,
                "outputPath": str(OUTPUT_BRAIN.relative_to(ROOT)),
            },
            indent=2,
        )
    )


if __name__ == "__main__":
    main()
