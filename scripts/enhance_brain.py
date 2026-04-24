#!/usr/bin/env python3
"""
Build the full Indian Alpha brain with relationships, topic clusters, 
guest network, live URLs, and synthesized master playbooks.
"""
import json
import hashlib

# Load the existing brain (built by build_brain.py)
with open("./src/data/project-signal-brain.json", "r") as f:
    brain = json.load(f)

episodes = brain["sourceCatalog"]

# ========================================
# 1. Build Topic Clusters
# ========================================
# Group episodes by category and synthesize insights
category_episodes = {}
for ep in episodes:
    cat = ep.get("category", "General")
    if cat not in category_episodes:
        category_episodes[cat] = []
    category_episodes[cat].append(ep)

topic_clusters = []
for cat, eps in category_episodes.items():
    # Synthesize strategies across all episodes in this category
    all_strategies = []
    all_gaps = []
    all_guests = set()
    all_resources = set()
    ep_ids = []
    
    for ep in eps:
        ep_ids.append(ep["id"])
        for s in ep.get("strategySnippets", []):
            all_strategies.append(s["text"])
        for o in ep.get("opportunitySnippets", []):
            all_gaps.append(o["text"])
        for g in ep.get("guests", []):
            all_guests.add(g)
        if ep.get("resourceString"):
            for r in ep["resourceString"].split(", "):
                all_resources.add(r.strip())
    
    # Create synthesized playbook (top 5 strategies, top 3 gaps)
    cluster = {
        "id": f"cluster-{cat.lower().replace(' ', '-')}",
        "category": cat,
        "episodeCount": len(eps),
        "episodeIds": ep_ids,
        "guests": sorted(list(all_guests)),
        "guestCount": len(all_guests),
        "topStrategies": all_strategies[:5],
        "marketGaps": all_gaps[:3],
        "resources": sorted(list(all_resources))[:8],
        "color": {
            "Platforms": "#6366f1",
            "Content": "#8b5cf6",
            "D2C": "#3b82f6",
            "AI": "#06b6d4",
            "Education": "#14b8a6",
            "Health": "#10b981",
            "Consumer": "#f59e0b",
            "Capital": "#a855f7",
            "Founders": "#ef4444",
            "Hospitality": "#f97316",
            "EV": "#22c55e",
            "Climate": "#059669",
            "Gaming": "#ec4899",
            "RealEstate": "#78716c",
            "M&A": "#dc2626",
        }.get(cat, "#6366f1"),
    }
    topic_clusters.append(cluster)

# ========================================
# 2. Build Guest Network
# ========================================
# Map every guest to their episodes
guest_map = {}
for ep in episodes:
    for g in ep.get("guests", []):
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
        guest_map[g]["categories"].add(ep.get("category", "General"))
        
        # Track co-guests
        for other_g in ep.get("guests", []):
            if other_g != g:
                guest_map[g]["coGuests"].add(other_g)

# Find guests who appeared on BOTH shows
cross_show_guests = []
for name, gdata in guest_map.items():
    if len(gdata["shows"]) > 1:
        cross_show_guests.append(name)

guest_network = []
for name, gdata in guest_map.items():
    guest_network.append({
        "id": gdata["id"],
        "name": name,
        "episodeIds": gdata["episodeIds"],
        "episodeCount": len(gdata["episodeIds"]),
        "shows": sorted(list(gdata["shows"])),
        "categories": sorted(list(gdata["categories"])),
        "coGuests": sorted(list(gdata["coGuests"])),
        "isCrossShow": name in cross_show_guests,
    })

# Sort by episode count (most appearances first)
guest_network.sort(key=lambda x: x["episodeCount"], reverse=True)

# ========================================
# 3. Live Resource URLs
# ========================================
resource_url_map = {
    "Oculus/Meta Quest": "https://www.meta.com/quest/",
    "Meesho Supplier Hub": "https://supplier.meesho.com/",
    "Udaan B2B Platform": "https://udaan.com/",
    "Amazon India Brand Analytics": "https://brandservices.amazon.in/",
    "OpenAI API (reference only)": "https://platform.openai.com/",
    "UpGrad platform": "https://www.upgrad.com/",
    "Unacademy": "https://unacademy.com/",
    "Graphy by Unacademy": "https://graphy.com/",
    "Cult.fit platform by Mukesh Bansal": "https://www.cult.fit/",
    "Biocon Ltd": "https://www.biocon.com/",
    "Ather Energy": "https://www.atherenergy.com/",
    "BluSmart Mobility": "https://www.blusmart.in/",
    "Zepto (10-min delivery)": "https://www.zeptonow.com/",
    "Mensa Brands (Ananth Narayanan)": "https://www.mensabrands.com/",
    "Blue Tokai Coffee": "https://bluetokaicoffee.com/",
    "Nothing Phone (Carl Pei)": "https://nothing.tech/",
    "Tira Beauty (Bhakti Modi/Reliance)": "https://www.tirabeauty.com/",
    "Bombay Shaving Company (Shantanu)": "https://www.bombayshavingcompany.com/",
    "Inde Wild (Diipa Khosla)": "https://indewild.com/",
    "boAt Lifestyle (₹10K+ Cr brand)": "https://www.boat-lifestyle.com/",
    "ConvertKit for creator newsletters": "https://convertkit.com/",
    "Shopify API": "https://www.shopify.com/",
    "Blinkit Seller Hub": "https://blinkit.com/",
    "Razorpay Payment Links": "https://razorpay.com/",
    "SUGAR Cosmetics distribution playbook": "https://www.sugarcosmetics.com/",
    "Swiggy": "https://www.swiggy.com/",
    "'Venture Deals' by Brad Feld": "https://www.venturedeals.com/",
    "Blume Ventures": "https://blume.vc/",
    "Peak XV Partners (Sequoia India)": "https://www.peakxv.com/",
    "Accel Partners India": "https://www.accel.com/",
    "Titan Capital (Rohit Bansal)": "https://www.titancapital.in/",
    "Loco (Indian game streaming)": "https://loco.gg/",
    "PayTM (Vijay Shekhar's fintech perspective)": "https://paytm.com/",
    "Dream11": "https://www.dream11.com/",
    "WeWork India (Karan Virwani)": "https://www.wework.com/l/india",
}

# Add URLs to resource items
for family in brain["resourceFamilies"]:
    for item in family["items"]:
        if item["title"] in resource_url_map:
            item["url"] = resource_url_map[item["title"]]

# Also create a flat resources list with URLs for the episode cards
all_resource_urls = {}
for title, url in resource_url_map.items():
    key = title.split("(")[0].strip().lower()
    all_resource_urls[key] = url

# ========================================
# 4. Master Playbooks (Multi-Episode Synthesis)
# ========================================
master_playbooks = []

# D2C Playbook (from episodes about D2C, consumer brands, e-commerce)
d2c_eps = [e for e in episodes if e.get("category") in ["D2C", "Consumer", "Content"]]
if d2c_eps:
    master_playbooks.append({
        "id": "playbook-d2c",
        "title": "The Indian D2C Brand Playbook",
        "subtitle": "Synthesized from 12+ episodes across WTF & BarberShop",
        "episodeIds": [e["id"] for e in d2c_eps],
        "steps": [
            {"step": 1, "title": "Find the Supply Gap", "detail": "India is supply-starved. Don't invent new needs — provide high-quality, accessible supply in large categories that lack organized players. (Source: Aman Gupta, boAt)", "source": "s-01"},
            {"step": 2, "title": "Nail ONE Hero SKU", "detail": "Survive purely on hero product retention before adding catalog depth. Most founders scale SKUs instead of depth — resist this. (Source: Ep #11, Fashion/Beauty)", "source": "n-11"},
            {"step": 3, "title": "Choose Channel-Product Fit", "detail": "What sells offline won't sell online. The channel changes consumer behavior. Start with marketplace (80%) + D2C (20%). Use D2C for learning, not ego. (Source: Kishore Biyani, Ep #3)", "source": "n-03"},
            {"step": 4, "title": "Build Distribution, Not Just Brand", "detail": "Don't go the Performance Marketing route — it skews numbers and you'll never make money. Build organic distribution through content and community. (Source: Ranveer/Tanmay, Ep #13)", "source": "n-13"},
            {"step": 5, "title": "Own the Community", "detail": "Products can be copied, communities cannot. Build authenticity through relatable voices. Content is trust-building infrastructure. (Source: Warikoo, Vineeta Singh)", "source": "s-05"},
            {"step": 6, "title": "Go Omnichannel", "detail": "D2C alone won't scale in India. Master both digital AND deep offline retail penetration simultaneously. SUGAR's growth came from mastering both. (Source: Vineeta Singh, S1 Finale)", "source": "s-11"},
        ],
        "resources": [
            {"name": "Amazon India Brand Analytics", "url": "https://brandservices.amazon.in/"},
            {"name": "Meesho Supplier Hub", "url": "https://supplier.meesho.com/"},
            {"name": "Shopify India", "url": "https://www.shopify.com/in"},
            {"name": "Blinkit Seller Hub", "url": "https://blinkit.com/"},
            {"name": "Razorpay Payment Links", "url": "https://razorpay.com/"},
        ],
    })

# Fundraising Playbook
cap_eps = [e for e in episodes if e.get("category") in ["Capital"]]
if cap_eps:
    master_playbooks.append({
        "id": "playbook-fundraising",
        "title": "The Indian Fundraising Playbook",
        "subtitle": "Synthesized from VC episodes with Blume, Peak XV, Accel, Titan Capital",
        "episodeIds": [e["id"] for e in cap_eps],
        "steps": [
            {"step": 1, "title": "Determine If You Should Raise", "detail": "Don't raise VC if your growth requires linear human headcount. Raise for speed and distribution monopolies, never for validation. (Source: Asish Mohapatra, S1E3)", "source": "s-02"},
            {"step": 2, "title": "Build Before You Pitch", "detail": "5 companies return 80-90% of a fund's total value — VCs play power law. You must demonstrate you could be one of those 5. (Source: Karthik Reddy, Blume)", "source": "n-09"},
            {"step": 3, "title": "Know Your VC's LP Structure", "detail": "LPs decide India→Fund Manager→Strategy. Your fundraise must address all three layers. Understand who's behind the fund. (Source: Rajan Anandan, Peak XV)", "source": "n-09"},
            {"step": 4, "title": "Protect the Cap Table", "detail": "Dilution limits future pivots. Protect the cap table like your operational life depends on it. Use Carta/cap table modeling before term sheets. (Source: Shantanu Deshpande)", "source": "s-03"},
            {"step": 5, "title": "Show Insight, Not Sales", "detail": "Overselling or oversimplifying turns investors off instantly. Show genuine insight into your market and acknowledge uncertainty. (Source: Prashanth Prakash, Accel)", "source": "n-09"},
        ],
        "resources": [
            {"name": "Blume Ventures", "url": "https://blume.vc/"},
            {"name": "Peak XV Partners", "url": "https://www.peakxv.com/"},
            {"name": "Accel Partners India", "url": "https://www.accel.com/"},
            {"name": "Titan Capital", "url": "https://www.titancapital.in/"},
            {"name": "'Venture Deals' by Brad Feld", "url": "https://www.venturedeals.com/"},
        ],
    })

# Founder Psychology Playbook
founder_eps = [e for e in episodes if e.get("category") in ["Founders"]]
if founder_eps:
    master_playbooks.append({
        "id": "playbook-founder-os",
        "title": "The Founder Operating System",
        "subtitle": "Mental models for durability from OYO, Snapdeal, Zepto, and OfBusiness founders",
        "episodeIds": [e["id"] for e in founder_eps],
        "steps": [
            {"step": 1, "title": "Use Regret Minimization", "detail": "Make hard calls based on which option you'd regret NOT trying with a 5-year time horizon. (Source: Toshan Tamhane, S1E7)", "source": "s-07"},
            {"step": 2, "title": "Separate Identity from Company", "detail": "Founders who define themselves solely by their venture break when the venture struggles. Build an identity outside work. (Source: S1E7 Part 2)", "source": "s-08"},
            {"step": 3, "title": "Treat Energy as Leverage", "detail": "Mental steadiness is operating leverage. Build a personal operating cadence before scaling the company. (Source: Multiple episodes)", "source": "s-10"},
            {"step": 4, "title": "Embrace Your Flaws", "detail": "Obsession, impatience, contrarianism — traditionally 'flaws' — are the exact traits that make successful entrepreneurs. (Source: Ritesh Agarwal, OYO)", "source": "n-16"},
            {"step": 5, "title": "Build Resilience Infrastructure", "detail": "Normalize therapy, peer support, and breaks. Snapdeal went from $6.5B to near-death and back. Resilience is everything. (Source: Rohit Bansal)", "source": "s-10"},
        ],
        "resources": [
            {"name": "Founder therapy resources (Amaha)", "url": "https://www.amahahealth.com/"},
            {"name": "YPO/EO India peer groups", "url": "https://www.eonetwork.org/"},
            {"name": "Qapita (ESOP management)", "url": "https://www.qapita.com/"},
        ],
    })

# Health & Longevity Playbook
health_eps = [e for e in episodes if e.get("category") in ["Health"]]
if health_eps:
    master_playbooks.append({
        "id": "playbook-health",
        "title": "The Health & Longevity Playbook",
        "subtitle": "From Bryan Johnson, Cult.fit, Biocon, and Suniel Shetty's perspectives",
        "episodeIds": [e["id"] for e in health_eps],
        "steps": [
            {"step": 1, "title": "Prioritize Sleep", "detail": "Sleep is the #1 pillar. Optimize for 7-8 hours of quality sleep — it's essential for both physical performance and mental well-being. (Source: Ep #6)", "source": "n-06"},
            {"step": 2, "title": "Trust Data, Not Philosophy", "detail": "Regularly measure blood biomarkers and use data to fine-tune diet and supplementation. Don't follow trends blindly. (Source: Bryan Johnson, Ep #21)", "source": "n-21"},
            {"step": 3, "title": "Reframe Health as ROI", "detail": "Link poor health to significant future costs. Health is a financial necessity, not a luxury. (Source: Nithin Kamath, Ep #6)", "source": "n-06"},
            {"step": 4, "title": "Build for India's Gap", "detail": "Millions struggle with lifestyle diseases while the solution ecosystem serves only millions. The awareness and access gap is massive. (Source: Mukesh Bansal)", "source": "n-06"},
        ],
        "resources": [
            {"name": "Cult.fit", "url": "https://www.cult.fit/"},
            {"name": "Blueprint (Bryan Johnson)", "url": "https://blueprint.bryanjohnson.com/"},
            {"name": "Biocon", "url": "https://www.biocon.com/"},
        ],
    })

# ========================================
# 5. Add Related Episodes to Each Episode
# ========================================
for ep in episodes:
    related = []
    cat = ep.get("category", "")
    for other in episodes:
        if other["id"] == ep["id"]:
            continue
        # Same category = related
        if other.get("category") == cat:
            related.append({"id": other["id"], "title": other["title"], "reason": f"Same topic: {cat}"})
        # Shared guests
        shared_guests = set(ep.get("guests", [])) & set(other.get("guests", []))
        if shared_guests:
            for g in shared_guests:
                related.append({"id": other["id"], "title": other["title"], "reason": f"Shared guest: {g}"})
    
    # Deduplicate and limit
    seen = set()
    unique_related = []
    for r in related:
        if r["id"] not in seen:
            seen.add(r["id"])
            unique_related.append(r)
    ep["relatedEpisodes"] = unique_related[:5]

# ========================================
# 6. Stats
# ========================================
total_guests = len(guest_network)
total_resources = sum(len(f["items"]) for f in brain["resourceFamilies"])
total_categories = len(topic_clusters)

brain["topicClusters"] = topic_clusters
brain["guestNetwork"] = guest_network
brain["masterPlaybooks"] = master_playbooks
brain["crossShowGuests"] = cross_show_guests
brain["meta"]["guestCount"] = total_guests
brain["meta"]["categoryCount"] = total_categories
brain["meta"]["playbookCount"] = len(master_playbooks)
brain["meta"]["crossShowGuestCount"] = len(cross_show_guests)

with open("./src/data/project-signal-brain.json", "w") as f:
    json.dump(brain, f, indent=2)

print(f"✅ Enhanced brain built:")
print(f"   {len(episodes)} episodes")
print(f"   {len(topic_clusters)} topic clusters")
print(f"   {total_guests} unique guests")
print(f"   {len(cross_show_guests)} cross-show guests: {cross_show_guests}")
print(f"   {len(master_playbooks)} master playbooks")
print(f"   {total_resources} resources")
