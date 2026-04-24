#!/usr/bin/env python3
"""
Step 4: Assemble the final brain database from all extracted data.
Merges episode discovery, transcripts, NLP entities, and LLM intelligence
into the final project-signal-brain.json that powers the frontend.
Also generates playbooks by synthesizing across episodes using Ollama.
"""
import json
import os
import sys
import re
import hashlib
import requests

DATA_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "..", "data")
EXTRACTED_DIR = os.path.join(DATA_DIR, "extracted")
SRC_DATA_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "..", "src", "data")

OLLAMA_URL = "http://127.0.0.1:11434/api/generate"
OLLAMA_MODEL = "llama3.1:8b"

# Verified founder tools per category (from web research)
FOUNDER_TOOLS = {
    "D2C": [
        {"name": "Shopify India", "url": "https://www.shopify.com/in", "description": "D2C storefront builder — most Indian D2C brands start here"},
        {"name": "Razorpay", "url": "https://razorpay.com/", "description": "Payment gateway used by 8M+ Indian businesses"},
        {"name": "Shiprocket", "url": "https://www.shiprocket.in/", "description": "Multi-carrier shipping aggregator for D2C logistics"},
        {"name": "Unicommerce", "url": "https://unicommerce.com/", "description": "Warehouse and inventory management for omnichannel brands"},
        {"name": "Meesho Supplier Hub", "url": "https://supplier.meesho.com/", "description": "Tier-2/3 marketplace — zero commission model"},
    ],
    "Consumer": [
        {"name": "Amazon Brand Analytics", "url": "https://brandservices.amazon.in/", "description": "Search data and demand insights for marketplace sellers"},
        {"name": "Flipkart Seller Hub", "url": "https://seller.flipkart.com/", "description": "India's largest domestic marketplace for consumer brands"},
        {"name": "Zoho CRM", "url": "https://www.zoho.com/crm/", "description": "Indian-built CRM with regional language support"},
        {"name": "Google Trends India", "url": "https://trends.google.co.in/", "description": "Free demand sensing tool — track category interest over time"},
    ],
    "Capital": [
        {"name": "LetsVenture", "url": "https://www.letsventure.com/", "description": "Indian angel investing platform"},
        {"name": "Qapita", "url": "https://www.qapita.com/", "description": "Cap table management and ESOP administration"},
        {"name": "Tracxn", "url": "https://tracxn.com/", "description": "Startup intelligence — research investors and competitors"},
        {"name": "Blume Ventures", "url": "https://blume.vc/", "description": "Early-stage VC — portfolio includes Unacademy, slice, Purplle"},
        {"name": "Peak XV Partners", "url": "https://www.peakxv.com/", "description": "Formerly Sequoia India — largest India-focused VC fund"},
    ],
    "Health": [
        {"name": "Cult.fit", "url": "https://www.cult.fit/", "description": "Fitness and wellness platform by Mukesh Bansal"},
        {"name": "Practo", "url": "https://www.practo.com/", "description": "India's largest health platform — doctor discovery"},
        {"name": "PharmEasy", "url": "https://pharmeasy.in/", "description": "Online pharmacy and diagnostic tests"},
        {"name": "HealthifyMe", "url": "https://www.healthifyme.com/", "description": "AI nutrition and fitness — India-specific food database"},
    ],
    "Content": [
        {"name": "YouTube Studio", "url": "https://studio.youtube.com/", "description": "Analytics and content management for creators"},
        {"name": "Notion", "url": "https://www.notion.so/", "description": "All-in-one workspace for content planning"},
        {"name": "ConvertKit", "url": "https://convertkit.com/", "description": "Email marketing for creators"},
        {"name": "Graphy", "url": "https://graphy.com/", "description": "Launch and sell courses — Unacademy's creator platform"},
    ],
    "AI": [
        {"name": "Hugging Face", "url": "https://huggingface.co/", "description": "Open-source AI model hub"},
        {"name": "Sarvam AI", "url": "https://www.sarvam.ai/", "description": "Indian-language AI foundation models"},
        {"name": "Postman", "url": "https://www.postman.com/", "description": "API testing — essential for AI integration"},
    ],
    "EV": [
        {"name": "Ather Energy", "url": "https://www.atherenergy.com/", "description": "Indian electric scooter maker"},
        {"name": "Statiq", "url": "https://statiq.in/", "description": "EV charging network — 7000+ chargers across India"},
        {"name": "ChargeZone", "url": "https://chargezone.co.in/", "description": "High-speed public charging for highways"},
    ],
    "Founders": [
        {"name": "Amaha", "url": "https://www.amahahealth.com/", "description": "Online therapy — founder burnout support"},
        {"name": "Y Combinator Library", "url": "https://www.ycombinator.com/library", "description": "Free founder education and essays"},
        {"name": "First Round Review", "url": "https://review.firstround.com/", "description": "Tactical advice from experienced operators"},
    ],
    "Education": [
        {"name": "UpGrad", "url": "https://www.upgrad.com/", "description": "Online higher education — outcome-linked programs"},
        {"name": "Scaler Academy", "url": "https://www.scaler.com/", "description": "Tech education with job guarantee"},
    ],
    "Hospitality": [
        {"name": "Zomato for Business", "url": "https://www.zomato.com/business", "description": "Restaurant listing, delivery, advertising"},
        {"name": "Swiggy Partner", "url": "https://partner.swiggy.com/", "description": "Food delivery partnership and analytics"},
        {"name": "Petpooja", "url": "https://www.petpooja.com/", "description": "Restaurant POS and management — Indian-built"},
    ],
    "RealEstate": [
        {"name": "Strata", "url": "https://www.strataprop.com/", "description": "Fractional real estate ownership from ₹25L"},
        {"name": "NoBroker", "url": "https://www.nobroker.in/", "description": "India's largest brokerage-free property platform"},
    ],
    "Climate": [
        {"name": "Ecofy", "url": "https://www.ecofy.in/", "description": "Green loans for solar, EV, efficiency"},
    ],
    "Gaming": [
        {"name": "Loco", "url": "https://loco.gg/", "description": "Indian game streaming platform"},
        {"name": "Unity", "url": "https://unity.com/", "description": "Game development engine"},
    ],
}

CLUSTER_COLORS = {
    "Platforms": "#6366f1", "Content": "#8b5cf6", "D2C": "#3b82f6", "AI": "#06b6d4",
    "Education": "#14b8a6", "Health": "#10b981", "Consumer": "#f59e0b", "Capital": "#a855f7",
    "Founders": "#ef4444", "Hospitality": "#f97316", "EV": "#22c55e", "Climate": "#059669",
    "Gaming": "#ec4899", "RealEstate": "#78716c", "M&A": "#dc2626", "General": "#64748b",
    "Technology": "#06b6d4", "Finance": "#a855f7", "Entertainment": "#f97316",
    "Sports": "#22c55e", "Philosophy": "#8b5cf6", "Politics": "#ef4444",
    "Science": "#14b8a6", "Crypto": "#f59e0b", "Beauty": "#ec4899",
}

def ollama_generate(prompt, max_tokens=2000):
    """Call local Ollama."""
    try:
        resp = requests.post(OLLAMA_URL, json={
            "model": OLLAMA_MODEL,
            "prompt": prompt,
            "stream": False,
            "options": {"num_predict": max_tokens, "temperature": 0.3}
        }, timeout=180)
        if resp.status_code == 200:
            return resp.json().get("response", "")
    except:
        pass
    return ""

def generate_playbook(category, episodes_data):
    """Use Ollama to synthesize a playbook from multiple episodes."""
    
    # Build context from all episodes in this category
    context = ""
    for ep in episodes_data[:8]:  # Limit context
        intel = ep.get("intelligence", {})
        context += f"\nEPISODE: {ep.get('title', 'Unknown')}\n"
        for insight in intel.get("key_insights", [])[:3]:
            context += f"- {insight}\n"
        for strat in intel.get("strategies", [])[:2]:
            context += f"- Strategy: {strat}\n"
        for gap in intel.get("market_gaps", [])[:1]:
            context += f"- Market Gap: {gap}\n"
    
    prompt = f"""Based on these podcast episode insights about {category}, create a practical playbook for Indian founders.

{context}

Generate a JSON playbook with exactly this format:
{{
  "title": "The Indian {category} Playbook",
  "subtitle": "Synthesized from {len(episodes_data)} episodes",
  "steps": [
    {{"step": 1, "title": "step title", "detail": "2-3 sentence explanation with specific advice from the episodes"}},
    {{"step": 2, "title": "step title", "detail": "..."}},
    ...up to 5-6 steps
  ]
}}

ONLY use information from the podcast insights above. Do not invent facts."""

    response = ollama_generate(prompt, max_tokens=1500)
    try:
        json_match = re.search(r'\{[\s\S]*\}', response)
        if json_match:
            return json.loads(json_match.group())
    except:
        pass
    return None

def main():
    # Load discovered episodes
    episodes_path = os.path.join(DATA_DIR, "discovered_episodes.json")
    if not os.path.exists(episodes_path):
        print("❌ Run 01_discover.py first!")
        sys.exit(1)
    
    with open(episodes_path, "r") as f:
        discovered = json.load(f)
    
    # Build episode lookup
    ep_lookup = {e["video_id"]: e for e in discovered}
    
    # Load all extracted data
    print("📊 Loading extracted intelligence...")
    extracted_data = {}
    for f_name in os.listdir(EXTRACTED_DIR):
        if f_name.endswith(".json"):
            vid = f_name.replace(".json", "")
            with open(os.path.join(EXTRACTED_DIR, f_name), "r") as f:
                extracted_data[vid] = json.load(f)
    
    print(f"   Loaded {len(extracted_data)} extracted episodes")
    
    # Merge episode data
    episodes = []
    order_counter = {"nikhil-kamath": 0, "shantanu-deshpande": 0}
    
    for vid, ext in extracted_data.items():
        disc = ep_lookup.get(vid, {})
        intel = ext.get("intelligence", {})
        entities = ext.get("entities", {})
        
        creator_id = disc.get("creator_id", "unknown")
        order_counter[creator_id] = order_counter.get(creator_id, 0) + 1
        
        category = intel.get("category", "General")
        # Handle LLM returning category as list or other types
        if isinstance(category, list):
            category = category[0] if category else "General"
        if not isinstance(category, str):
            category = str(category)
        # Normalize category
        cat_map = {
            "d2c": "D2C", "health": "Health", "ai": "AI", "capital": "Capital",
            "content": "Content", "gaming": "Gaming", "ev": "EV", "education": "Education",
            "founders": "Founders", "consumer": "Consumer", "hospitality": "Hospitality",
            "realestate": "RealEstate", "real estate": "RealEstate", "climate": "Climate",
            "platforms": "Platforms", "technology": "Technology", "finance": "Finance",
            "entertainment": "Entertainment", "sports": "Sports", "philosophy": "Philosophy",
            "politics": "Politics", "science": "Science", "crypto": "Crypto",
            "beauty": "Beauty", "m&a": "M&A", "advertising": "Content",
            "entrepreneurship": "Founders", "startup": "Founders", "investing": "Capital",
            "food": "Consumer", "personal care": "Consumer", "branding": "Consumer",
            "music": "Entertainment", "media": "Content",
        }
        category = cat_map.get(category.lower().strip(), category)
        
        guests = intel.get("guests", [])
        # Handle guests being non-list
        if isinstance(guests, str):
            guests = [guests]
        if not isinstance(guests, list):
            guests = []
        # Clean guest names
        guests = [g.strip() for g in guests if isinstance(g, str) and g.strip() and len(g.strip()) > 2]
        
        # Build strategy snippets from key_insights
        strat_snippets = []
        key_insights = intel.get("key_insights", [])
        if not isinstance(key_insights, list): key_insights = []
        for i, insight in enumerate(key_insights):
            if isinstance(insight, str) and insight.strip():
                strat_snippets.append({
                    "text": insight.strip(),
                    "startSeconds": 0,
                    "endSeconds": 0,
                    "timestamp": f"Insight {i+1}",
                    "relevance": 100 - i*5,
                    "episodeId": vid,
                })
        
        # Build strategy snippets from strategies too
        strategies = intel.get("strategies", [])
        if not isinstance(strategies, list): strategies = []
        for i, strat in enumerate(strategies):
            if isinstance(strat, str) and strat.strip():
                strat_snippets.append({
                    "text": strat.strip(),
                    "startSeconds": 0,
                    "endSeconds": 0,
                    "timestamp": f"Strategy {i+1}",
                    "relevance": 90 - i*5,
                    "episodeId": vid,
                })
        
        # Build opportunity snippets from market_gaps
        opp_snippets = []
        market_gaps = intel.get("market_gaps", [])
        if not isinstance(market_gaps, list): market_gaps = [str(market_gaps)] if market_gaps else []
        for gap in market_gaps:
            if isinstance(gap, str) and gap.strip():
                opp_snippets.append({
                    "text": gap.strip(),
                    "startSeconds": 0,
                    "endSeconds": 0,
                    "timestamp": "Market Gap",
                    "relevance": 100,
                    "episodeId": vid,
                })
        
        # Collect mentioned resources
        resources = []
        companies = intel.get("companies_discussed", [])
        if not isinstance(companies, list): companies = []
        for company in companies:
            if isinstance(company, str) and company.strip():
                resources.append(company.strip())
        
        # Books mentioned
        books = intel.get("books_mentioned", [])
        if not isinstance(books, list): books = []
        books = [b for b in books if isinstance(b, str) and b.strip()]
        
        # Tools mentioned
        tools_mentioned = intel.get("tools_mentioned", [])
        if not isinstance(tools_mentioned, list): tools_mentioned = []
        tools_mentioned = [t for t in tools_mentioned if isinstance(t, str) and t.strip()]
        
        # Quotable moments
        quotes = intel.get("quotable_moments", [])
        if not isinstance(quotes, list): quotes = []
        quotes = [q for q in quotes if isinstance(q, str) and q.strip()]
        
        # Target audience
        target_audience = intel.get("target_audience", "")
        if not isinstance(target_audience, str): target_audience = str(target_audience) if target_audience else ""
        
        # Get category tools
        cat_tools = FOUNDER_TOOLS.get(category, [])
        
        ep_data = {
            "id": vid,
            "creatorId": creator_id,
            "publishedOrder": order_counter[creator_id],
            "duration": disc.get("duration_str", ""),
            "title": disc.get("title", ext.get("title", "")),
            "guests": guests,
            "tags": [f"#{category}"],
            "sourceUrl": disc.get("url", f"https://www.youtube.com/watch?v={vid}"),
            "status": "deep-extracted",
            "category": category,
            "strategySnippets": strat_snippets,
            "opportunitySnippets": opp_snippets,
            "resourceMentions": resources[:10],
            "highlightSnippets": [],
            "resourceString": ", ".join(resources[:5]) if resources else None,
            "founderTools": cat_tools,
            "booksMentioned": books,
            "toolsMentioned": tools_mentioned,
            "quotableMoments": quotes,
            "targetAudience": target_audience,
            "wordCount": ext.get("word_count", 0),
            "extractionMethod": "transcript+spacy+ollama",
            # NER entities
            "entitiesPersons": entities.get("PERSON", [])[:15],
            "entitiesOrgs": entities.get("ORG", [])[:15],
            "entitiesProducts": entities.get("PRODUCT", [])[:10],
            "entitiesMoney": entities.get("MONEY", [])[:5],
        }
        episodes.append(ep_data)
    
    # Sort by creator then order
    episodes.sort(key=lambda x: (x["creatorId"], x["publishedOrder"]))
    
    print(f"   Assembled {len(episodes)} episodes")
    
    # ===== Build topic clusters =====
    cat_eps = {}
    for ep in episodes:
        cat = ep["category"]
        if cat not in cat_eps:
            cat_eps[cat] = []
        cat_eps[cat].append(ep)
    
    topic_clusters = []
    for cat, eps in cat_eps.items():
        all_guests = set()
        for ep in eps:
            for g in ep["guests"]:
                all_guests.add(g)
        
        topic_clusters.append({
            "id": f"cluster-{cat.lower().replace(' ', '-')}",
            "category": cat,
            "episodeCount": len(eps),
            "episodeIds": [e["id"] for e in eps],
            "guests": sorted(list(all_guests)),
            "guestCount": len(all_guests),
            "topStrategies": [s["text"] for ep in eps for s in ep.get("strategySnippets", [])[:1]][:5],
            "marketGaps": [o["text"] for ep in eps for o in ep.get("opportunitySnippets", [])[:1]][:3],
            "resources": sorted(list(set(r for ep in eps for r in ep.get("resourceMentions", [])[:3])))[:8],
            "founderTools": FOUNDER_TOOLS.get(cat, []),
            "color": CLUSTER_COLORS.get(cat, "#64748b"),
        })
    
    # ===== Build guest network =====
    guest_map = {}
    for ep in episodes:
        for g in ep["guests"]:
            if g not in guest_map:
                guest_map[g] = {
                    "id": f"guest-{hashlib.md5(g.encode()).hexdigest()[:8]}",
                    "name": g,
                    "episodeIds": [],
                    "shows": set(),
                    "categories": set(),
                    "coGuests": set(),
                }
            guest_map[g]["episodeIds"].append(ep["id"])
            guest_map[g]["shows"].add(ep["creatorId"])
            guest_map[g]["categories"].add(ep["category"])
            for og in ep["guests"]:
                if og != g:
                    guest_map[g]["coGuests"].add(og)
    
    cross_show = [n for n, g in guest_map.items() if len(g["shows"]) > 1]
    guest_network = sorted([{
        "id": g["id"], "name": n,
        "episodeIds": g["episodeIds"],
        "episodeCount": len(g["episodeIds"]),
        "shows": sorted(list(g["shows"])),
        "categories": sorted(list(g["categories"])),
        "coGuests": sorted(list(g["coGuests"])),
        "isCrossShow": n in cross_show,
    } for n, g in guest_map.items()], key=lambda x: x["episodeCount"], reverse=True)
    
    # ===== Add related episodes =====
    for ep in episodes:
        related = []
        for other in episodes:
            if other["id"] == ep["id"]:
                continue
            shared_guests = set(ep.get("guests", [])) & set(other.get("guests", []))
            if shared_guests:
                for g in shared_guests:
                    related.append({"id": other["id"], "title": other["title"], "reason": f"Shared guest: {g}"})
            elif other["category"] == ep["category"]:
                related.append({"id": other["id"], "title": other["title"], "reason": f"Same topic: {ep['category']}"})
        
        seen = set()
        unique = []
        for r in related:
            if r["id"] not in seen:
                seen.add(r["id"])
                unique.append(r)
        ep["relatedEpisodes"] = unique[:5]
    
    # ===== Generate playbooks =====
    print("\n📚 Generating synthesized playbooks with Ollama...")
    # Find categories with 3+ episodes for playbook generation
    playbook_cats = [(cat, eps) for cat, eps in cat_eps.items() if len(eps) >= 2]
    playbook_cats.sort(key=lambda x: len(x[1]), reverse=True)
    
    master_playbooks = []
    for cat, eps in playbook_cats[:6]:  # Top 6 categories
        print(f"   Generating {cat} playbook from {len(eps)} episodes...")
        
        # Build extracted data for playbook generation
        eps_for_playbook = []
        for ep in eps:
            eps_for_playbook.append({
                "title": ep["title"],
                "intelligence": {
                    "key_insights": [s["text"] for s in ep.get("strategySnippets", [])],
                    "strategies": [],
                    "market_gaps": [o["text"] for o in ep.get("opportunitySnippets", [])],
                },
            })
        
        pb = generate_playbook(cat, eps_for_playbook)
        if pb:
            pb["id"] = f"playbook-{cat.lower().replace(' ', '-')}"
            pb["episodeIds"] = [e["id"] for e in eps]
            pb["resources"] = FOUNDER_TOOLS.get(cat, [])
            master_playbooks.append(pb)
            print(f"      ✅ {len(pb.get('steps', []))} steps generated")
        else:
            print(f"      ⚠️ Failed to generate playbook")
    
    # ===== Build creators =====
    creators = [
        {
            "id": "nikhil-kamath",
            "name": "Nikhil Kamath",
            "show": "WTF with Nikhil Kamath",
            "handle": "WTF",
            "description": "Long-form conversations across venture, distribution, health, consumer brands, and future sectors.",
            "sourceUrl": "https://www.youtube.com/@nikhil.kamath",
        },
        {
            "id": "shantanu-deshpande",
            "name": "Shantanu Deshpande",
            "show": "The BarberShop with Shantanu",
            "handle": "The BarberShop",
            "description": "Operator-grade founder conversations on D2C, psychology, wealth, investing, and durable brands.",
            "sourceUrl": "https://www.youtube.com/@thebarbershopwithshantanu6670",
        },
    ]
    
    # ===== Assemble final brain =====
    nikhil_count = len([e for e in episodes if e["creatorId"] == "nikhil-kamath"])
    shantanu_count = len([e for e in episodes if e["creatorId"] == "shantanu-deshpande"])
    
    brain = {
        "meta": {
            "productName": "India Alpha",
            "generatedAt": "2026-04-19",
            "indexedEpisodeCount": len(episodes),
            "deepExtractedCount": len(episodes),
            "resourceCount": sum(len(v) for v in FOUNDER_TOOLS.values()),
            "creatorCount": 2,
            "guestCount": len(guest_network),
            "categoryCount": len(topic_clusters),
            "playbookCount": len(master_playbooks),
            "crossShowGuestCount": len(cross_show),
            "totalWordsProcessed": sum(e.get("wordCount", 0) for e in episodes),
            "extractionMethod": "youtube-transcript-api + spaCy NER + Ollama llama3.1:8b",
            "note": f"Real transcripts extracted from YouTube. Intelligence generated locally via Ollama. {nikhil_count} WTF episodes + {shantanu_count} BarberShop episodes.",
        },
        "creators": creators,
        "topicClusters": topic_clusters,
        "guestNetwork": guest_network,
        "masterPlaybooks": master_playbooks,
        "crossShowGuests": cross_show,
        "sourceCatalog": episodes,
        "founderToolsByCategory": FOUNDER_TOOLS,
        "resourceFamilies": [],
    }
    
    # Save
    output_path = os.path.join(SRC_DATA_DIR, "project-signal-brain.json")
    os.makedirs(SRC_DATA_DIR, exist_ok=True)
    with open(output_path, "w") as f:
        json.dump(brain, f, indent=2)
    
    print(f"\n✅ Brain assembled and saved!")
    print(f"   {len(episodes)} episodes")
    print(f"   {len(topic_clusters)} topic clusters")
    print(f"   {len(guest_network)} unique guests")
    print(f"   {len(cross_show)} cross-show guests: {cross_show}")
    print(f"   {len(master_playbooks)} master playbooks")
    print(f"   {brain['meta']['totalWordsProcessed']:,} total words processed")
    print(f"   Output: {output_path}")

if __name__ == "__main__":
    main()
