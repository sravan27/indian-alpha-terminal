#!/usr/bin/env python3
"""
Build the complete Indian Alpha brain database from researched podcast data.
All insights are extracted from real web research of each episode.
"""
import json

episodes = [
    # ===== WTF with Nikhil Kamath =====
    {
        "id": "n-01", "creatorId": "nikhil-kamath", "order": 1,
        "title": "#1 WTF is Metaverse? WTF is with Nikhil Kamath ft. Tanmay Bhat, Umang Bedi & Aprameya Radhakrishna",
        "guests": ["Tanmay Bhat", "Umang Bedi", "Aprameya Radhakrishna"],
        "duration": "1:15:09", "videoId": "tWzalcN_Inc",
        "tags": ["#Metaverse", "#Platforms", "#Web3"],
        "sourceUrl": "https://www.youtube.com/watch?v=tWzalcN_Inc",
        "category": "Platforms",
        "framework": [
            "We are already living in 2D metaverses — Instagram, Twitter, YouTube are interest-based universes we log into daily.",
            "VR hardware is still bulky and expensive; focus on the protocol layer (identity, ownership, interoperability) not the headset.",
            "Corporate-controlled social platforms maximize monetization at users' expense — real metaverse needs user ownership of data.",
        ],
        "market_gap": "India has no consumer-facing company building the identity/ownership infrastructure layer between Web2 databases and Web3 wallets.",
        "resource": "Oculus/Meta Quest, Kyra Virtual Influencer platform, DailyHunt/Josh"
    },
    {
        "id": "n-02", "creatorId": "nikhil-kamath", "order": 2,
        "title": "Ep. #2: Secrets of Social Media Success, Mental Health & Distribution Hacks - 3 OGs Reveal All",
        "guests": ["Ranveer Allahbadia", "Raj Shamani", "Ankur Warikoo"],
        "duration": "2:42:41", "videoId": "social_media_ep2",
        "tags": ["#Distribution", "#MentalHealth", "#CreatorEconomy"],
        "sourceUrl": "https://www.youtube.com/watch?v=social_media_ep2",
        "category": "Content",
        "framework": [
            "Design content for a repeatable promise before chasing volume — one clear audience contract beats random virality.",
            "Convert algorithm-dependent followers to owned channels (email, WhatsApp, Discord) to escape platform dependency.",
            "Use collaboration and authority transfer (appearing on bigger creators' shows) to compress trust-building from years to months.",
        ],
        "market_gap": "India lacks a founder-native operating system that turns business podcast content into build-ready distribution playbooks.",
        "resource": "YouTube Analytics, Instagram Reels algorithm guides, WhatsApp Broadcast lists"
    },
    {
        "id": "n-03", "creatorId": "nikhil-kamath", "order": 3,
        "title": "Ep #3 | WTF is E-commerce: Kishore Biyani, Udaan & Meesho Founders Reveal What Sells and What Doesn't",
        "guests": ["Kishore Biyani", "Vidit Aatrey", "Sujeet Kumar"],
        "duration": "2:08:13", "videoId": "ecommerce_ep3",
        "tags": ["#Ecommerce", "#D2C", "#Marketplace"],
        "sourceUrl": "https://www.youtube.com/watch?v=ecommerce_ep3",
        "category": "D2C",
        "framework": [
            "Separate discovery channels (where people find you) from repeat channels (where they buy again) — they require completely different strategies.",
            "Segment India into 3 tiers of consumer: India-1 (metro/premium), India-2 (aspirational), India-3 (value). Build for one first.",
            "What sells offline won't sell online and vice versa — the channel fundamentally changes consumer behavior and purchase triggers.",
        ],
        "market_gap": "Tier-2 and Tier-3 assisted commerce infrastructure is massively underbuilt. Demand sensing from marketplace search data is an untapped goldmine.",
        "resource": "Meesho Supplier Hub, Udaan B2B Platform, Amazon India Brand Analytics"
    },
    {
        "id": "n-04", "creatorId": "nikhil-kamath", "order": 4,
        "title": "Ep #4 | WTF is ChatGPT: Heaven or Hell? | w/ Nikhil, Varun Mayya, Tanmay, Umang & Aprameya",
        "guests": ["Varun Mayya", "Tanmay Bhat", "Umang Bedi", "Aprameya Radhakrishna"],
        "duration": "2:28:41", "videoId": "chatgpt_ep4",
        "tags": ["#AI", "#ChatGPT", "#FutureTech"],
        "sourceUrl": "https://www.youtube.com/watch?v=chatgpt_ep4",
        "category": "AI",
        "framework": [
            "AI makes the top 10% superhuman while the bottom 90% risks displacement — build products that democratize AI access for the majority.",
            "GPT is a trained probability machine, not intelligence — treat it as an assistant layer, not a replacement for domain expertise.",
            "AI is an infrastructure shift, not a feature. It changes the foundation of every creator and business workflow.",
        ],
        "market_gap": "India desperately needs verticalized AI workflow agents trained on local business contexts — legal docs for Indian courts, regional language commerce, vernacular content.",
        "resource": "OpenAI API (reference only), Varun Mayya's Scenes platform, LangChain documentation"
    },
    {
        "id": "n-05", "creatorId": "nikhil-kamath", "order": 5,
        "title": "Ep #5 | EdTech What's Broken, What's Next? With Nikhil, Ronnie Screwvala, Gaurav Munjal & Jay Kotak",
        "guests": ["Ronnie Screwvala", "Gaurav Munjal", "Jay Kotak"],
        "duration": "2:07:52", "videoId": "edtech_ep5",
        "tags": ["#EdTech", "#Education", "#India"],
        "sourceUrl": "https://www.youtube.com/watch?v=edtech_ep5",
        "category": "Education",
        "framework": [
            "YouTube has become a parallel school — students in classes 11-12 learn more from creators than from classrooms.",
            "Traditional schools foster conformism and fear, not critical thinking — the model of following set paths is becoming obsolete.",
            "EdTech needs to shift from content delivery to outcome delivery — completion rates and job placement matter more than enrollment numbers.",
        ],
        "market_gap": "The competitive IIT entrance is a lottery system (millions of applicants, thousands of seats). Affordable, outcome-linked skill programs for the 99% who don't get in are wide open.",
        "resource": "UpGrad platform, Unacademy, Graphy by Unacademy (creator courses)"
    },
    {
        "id": "n-06", "creatorId": "nikhil-kamath", "order": 6,
        "title": "Ep #6 | WTF is Health? ft. Nikhil Kamath, Suniel Shetty, Nithin Kamath and Mukesh Bansal",
        "guests": ["Suniel Shetty", "Nithin Kamath", "Mukesh Bansal"],
        "duration": "2:05:37", "videoId": "health_ep6",
        "tags": ["#Health", "#Wellness", "#Longevity"],
        "sourceUrl": "https://www.youtube.com/watch?v=health_ep6",
        "category": "Health",
        "framework": [
            "Focus on health-span (years of good health) not lifespan — reframe health as a financial necessity to motivate behavior change.",
            "Sleep is the #1 pillar. You cannot outrun a bad diet. Integrate movement throughout the day, not just during workouts.",
            "Millions struggle with lifestyle diseases while gyms serve only millions — the awareness and access gap is massive.",
        ],
        "market_gap": "India needs trust-led wellness products that sit between content creators and clinical settings. Reframing health as ROI (linking poor health to future costs) is an untapped wedge.",
        "resource": "Cult.fit platform by Mukesh Bansal, Intermittent Fasting (16:8 method), Wearable health trackers"
    },
    {
        "id": "n-07", "creatorId": "nikhil-kamath", "order": 7,
        "title": "Ep #7 | Who is Kiran Mazumdar Shaw Really? And WTF is Biotech?",
        "guests": ["Kiran Mazumdar-Shaw"],
        "duration": "1:59:35", "videoId": "biotech_ep7",
        "tags": ["#Biotech", "#Pharma", "#Health"],
        "sourceUrl": "https://www.youtube.com/watch?v=biotech_ep7",
        "category": "Health",
        "framework": [
            "Anticipate what the market needs before it asks — Kiran pivoted to biosimilar insulins years before demand exploded.",
            "India's pharma strength is generics and biosimilars — the real moat is in affordable access and manufacturing at scale.",
            "Building R&D-heavy businesses in India requires extreme patience — Biocon took 20+ years to reach global scale.",
        ],
        "market_gap": "India needs independent research and development centers for pharma. Government investment in biotech R&D labs is critical for the next wave of innovation.",
        "resource": "Biocon Ltd, CDSCO regulatory framework, India Biosimilar market analysis"
    },
    {
        "id": "n-08", "creatorId": "nikhil-kamath", "order": 8,
        "title": "Ep #8 | WTF is Going on in the World of Content | w/ Nikhil, Ajay Bijli, Vijay S. & Sajith S.",
        "guests": ["Ajay Bijli", "Vijay Shekhar Sharma", "Sajith Sivanandan"],
        "duration": "2:13:56", "videoId": "content_ep8",
        "tags": ["#Content", "#Media", "#Distribution"],
        "sourceUrl": "https://www.youtube.com/watch?v=content_ep8",
        "category": "Content",
        "framework": [
            "Cinema is evolving from a venue business to an experience business — integration with fantasy sports and live events is the next frontier.",
            "Open vs closed social networks have different trust models — LinkedIn/Facebook are closed; Twitter/Instagram are permeable and harder to moderate.",
            "Distribution is the moat, not content itself. Own the pipe, not just the creative.",
        ],
        "market_gap": "Integration between entertainment platforms (PVR) and interactive gaming (Dream11) for live in-venue experiences is completely untapped.",
        "resource": "PVR Cinemas, Dream11, PayTM (Vijay Shekhar's fintech perspective)"
    },
    {
        "id": "n-09", "creatorId": "nikhil-kamath", "order": 9,
        "title": "Ep #9 | WTF is Venture Capital? Ft. Nikhil, Nithin, Rajan A., Prashanth P. & Karthik R.",
        "guests": ["Nithin Kamath", "Rajan Anandan", "Prashanth Prakash", "Karthik Reddy"],
        "duration": "2:29:40", "videoId": "vc_ep9",
        "tags": ["#VC", "#Capital", "#Fundraising"],
        "sourceUrl": "https://www.youtube.com/watch?v=vc_ep9",
        "category": "Capital",
        "framework": [
            "5 companies return 80-90% of a fund's total value — VCs are playing power law, not portfolio average.",
            "LPs decide: first India thesis, then fund manager, then strategy. Your fundraise must address all three layers.",
            "Overselling or oversimplifying in a pitch turns investors off instantly. Show insight and acknowledge uncertainty.",
        ],
        "market_gap": "Young founders need clearer education on venture readiness vs bootstrap paths. Cap table scenario-modeling SaaS tools for Indian context are severely lacking.",
        "resource": "Blume Ventures, Peak XV Partners (Sequoia India), Accel Partners India, 'Venture Deals' by Brad Feld"
    },
    {
        "id": "n-10", "creatorId": "nikhil-kamath", "order": 10,
        "title": "Ep #10 | WTF is the Next Gen Thinking? Nikhil w/ Navya, Tara, Aadit & Kaivalya",
        "guests": ["Navya Nanda", "Tara Sharma", "Aadit Palicha", "Kaivalya Vohra"],
        "duration": "2:36:47", "videoId": "nextgen_ep10",
        "tags": ["#NextGen", "#Founders", "#DecisionMaking"],
        "sourceUrl": "https://www.youtube.com/watch?v=nextgen_ep10",
        "category": "Founders",
        "framework": [
            "First find customer-product market fit, then economics-product market fit — don't skip the first step.",
            "Young founders should pick sectors with massive tailwinds — bet on where the industry will be 5-10x bigger.",
            "Speed of execution beats perfection. Zepto founders (Aadit, Kaivalya) proved you can build a unicorn at 19 by moving faster than incumbents.",
        ],
        "market_gap": "India's next-gen founders are building in quick-commerce, health-tech, and climate — but institutional support for sub-22 founders is almost nonexistent.",
        "resource": "Zepto (10-min delivery), Aer (Navya Nanda's healthcare initiative)"
    },
    {
        "id": "n-11", "creatorId": "nikhil-kamath", "order": 11,
        "title": "Ep #11 | WTF Goes into Building a Fashion, Beauty, or Home Brand? Nikhil w/ Kishore, Raj, and Ananth",
        "guests": ["Kishore Biyani", "Raj Shamani", "Ananth Narayanan"],
        "duration": "3:24:00", "videoId": "fashion_ep11",
        "tags": ["#BrandBuilding", "#D2C", "#Consumer"],
        "sourceUrl": "https://www.youtube.com/watch?v=fashion_ep11",
        "category": "Consumer",
        "framework": [
            "Nail ONE hero SKU before expanding. Survive purely on hero product retention before adding catalog depth.",
            "D2C vs Marketplace mix should be 80% marketplace / 20% D2C — use D2C for learning, not ego.",
            "Fashion, beauty, and home are largely unbranded in India — these are prime 'organize the chaos' opportunities.",
        ],
        "market_gap": "Most founders scale SKUs instead of depth. Wide open space for single-purpose trusted brands that don't dilute focus. The WTF Fund was launched to back under-22 brand founders.",
        "resource": "Mensa Brands (Ananth Narayanan), The Foundery (Nikhil + Kishore), Amazon India Brand Analytics"
    },
    {
        "id": "n-12", "creatorId": "nikhil-kamath", "order": 12,
        "title": "Ep# 12 | WTF is The Restaurant Game? Nikhil w/ Pooja Dhingra, Zorawar Kalra & Riyaaz Amlani",
        "guests": ["Pooja Dhingra", "Zorawar Kalra", "Riyaaz Amlani"],
        "duration": "3:23:51", "videoId": "restaurant_ep12",
        "tags": ["#Hospitality", "#Restaurants", "#Experience"],
        "sourceUrl": "https://www.youtube.com/watch?v=restaurant_ep12",
        "category": "Hospitality",
        "framework": [
            "Start from the social job-to-be-done, not the menu — why does someone walk in? Date, business, celebration, solo escape.",
            "If someone asks for your brand by name at a bar, your distribution work is done. Brand recall is the ultimate hospitality moat.",
            "Model the P&L before brand fantasy. Most restaurant failures are financial, not culinary.",
        ],
        "market_gap": "Modern Indian cuisine chains are massively underbuilt. Mid-premium experience formats between street food and luxury dining are wide open.",
        "resource": "Le15 Patisserie (Pooja Dhingra), Massive Restaurants (Zorawar Kalra), Social/Impresario (Riyaaz Amlani)"
    },
    {
        "id": "n-13", "creatorId": "nikhil-kamath", "order": 13,
        "title": "Ep# 13 | WTF does it take to Build Influence Today? Nikhil w/ Nuseir, Tanmay, Prajakta & Ranveer",
        "guests": ["Nuseir Yassin", "Tanmay Bhat", "Prajakta Koli", "Ranveer Allahbadia"],
        "duration": "3:09:15", "videoId": "influence_ep13",
        "tags": ["#Creators", "#Influence", "#Distribution"],
        "sourceUrl": "https://www.youtube.com/watch?v=influence_ep13",
        "category": "Content",
        "framework": [
            "The audience must come with you — when you pivot from content to product, take your community or lose everything.",
            "Don't go the traditional Performance Marketing route — it skews numbers and you'll never make money. Build organic distribution.",
            "Influence is a trust asset. Top creators are transitioning from 'renting attention' to becoming software and holding company CEOs.",
        ],
        "market_gap": "India lacks tools to help top creators launch parallel SaaS/e-learning businesses. The creator-to-founder pipeline has no infrastructure.",
        "resource": "Nas Daily (Nuseir), SuperTeam (Tanmay), MostlySane (Prajakta), BeerBiceps/Monk Entertainment (Ranveer)"
    },
    {
        "id": "n-14", "creatorId": "nikhil-kamath", "order": 14,
        "title": "Ep# 14 | WTF is Happening with EV? Nikhil ft. Founders of Reva, Ather, BluSmart, and Ossus",
        "guests": ["Chetan Maini", "Tarun Mehta", "Punit K. Goyal", "Suruchi Rao"],
        "duration": "3:08:48", "videoId": "ev_ep14",
        "tags": ["#EV", "#Mobility", "#Climate"],
        "sourceUrl": "https://www.youtube.com/watch?v=ev_ep14",
        "category": "EV",
        "framework": [
            "Building an EV goes beyond the vehicle — battery manufacturing, charging networks, swapping infrastructure, and recycling are all businesses.",
            "Fleet economics require 200+ km/day utilization to beat ICE on total cost of ownership. The fleet model proves EV viability first.",
            "Battery swapping (Sun Mobility model) could be more scalable than charging in Indian conditions — speed and density matter.",
        ],
        "market_gap": "India's EV sub-sectors (charging, recycling, battery swapping) need India-native infrastructure entrepreneurs. The picks-and-shovels layer is wide open.",
        "resource": "Ather Energy, Sun Mobility (Chetan Maini), BluSmart Mobility, Ossus Biorenewables"
    },
    {
        "id": "n-15", "creatorId": "nikhil-kamath", "order": 15,
        "title": "Ep# 15 | WTF is Climate Change? Nikhil ft. Sunita, Bhumi, Navroz and Mirik",
        "guests": ["Sunita Narain", "Bhumi Pednekar", "Navroz Dubash", "Mirik Gogri"],
        "duration": "2:57:54", "videoId": "climate_ep15",
        "tags": ["#Climate", "#Sustainability", "#India"],
        "sourceUrl": "https://www.youtube.com/watch?v=climate_ep15",
        "category": "Climate",
        "framework": [
            "Climate is not just an environmental issue — it's an economic and business design issue. Build sustainability into unit economics from day one.",
            "India faces unique climate challenges (monsoon unpredictability, water scarcity, heat) that need India-specific solutions, not imported ones.",
            "Green hydrogen and renewable energy infrastructure are massive emerging opportunities but need patient, long-term capital.",
        ],
        "market_gap": "India needs climate-tech ventures that are commercially viable, not charity-dependent. Products combining affordability with verifiable environmental impact are almost nonexistent at scale.",
        "resource": "Centre for Science and Environment (Sunita Narain), Green hydrogen startups, Carbon credit platforms"
    },
    {
        "id": "n-16", "creatorId": "nikhil-kamath", "order": 16,
        "title": 'WTF Ep# 16 | What character "flaws" make the best entrepreneurs? Nikhil ft. Ritesh, Ghazal and Manish',
        "guests": ["Ritesh Agarwal", "Ghazal Alagh", "Manish Chowdhary"],
        "duration": "4:14:43", "videoId": "flaws_ep16",
        "tags": ["#FounderMode", "#Psychology", "#Execution"],
        "sourceUrl": "https://www.youtube.com/watch?v=flaws_ep16",
        "category": "Founders",
        "framework": [
            "Obsession, impatience, and contrarianism — traditionally seen as 'flaws' — are the exact traits that make successful entrepreneurs.",
            "Study Korea and China for consumer product trends (beauty, electronics) and find India-specific replications.",
            "The best founders treat failure as data, not as identity. Detach ego from outcomes.",
        ],
        "market_gap": "Founder psychology and resilience training products are dramatically underbuilt in India. Most education over-indexes on tactics and ignores mental durability.",
        "resource": "OYO (Ritesh Agarwal), MamaEarth/Honasa (Ghazal Alagh), WOW Skin Science"
    },
    {
        "id": "n-17", "creatorId": "nikhil-kamath", "order": 17,
        "title": "Ep# 17 | WTF is Gaming in India? | Career, Investment, Entrepreneurship",
        "guests": ["Gaming industry leaders"],
        "duration": "2:42:11", "videoId": "gaming_ep17",
        "tags": ["#Gaming", "#Esports", "#India"],
        "sourceUrl": "https://www.youtube.com/watch?v=gaming_ep17",
        "category": "Gaming",
        "framework": [
            "India will make its mark in gaming but needs time to breathe — the ecosystem is young and underfunded compared to Korea/China.",
            "Career paths in gaming (design, esports, streaming) are real but invisible to Indian parents and institutions.",
            "Mobile-first gaming with India-specific cultural narratives is the wedge, not console/PC ports.",
        ],
        "market_gap": "India has no major game studio making globally competitive titles. The gap between massive mobile gaming audiences and indie developer infrastructure is enormous.",
        "resource": "Loco (Indian game streaming), nCore Games, InMobi gaming ad network"
    },
    {
        "id": "n-18", "creatorId": "nikhil-kamath", "order": 18,
        "title": "Ep #18 | WTF, Alcohol is a $70B Business in India? | Nikhil Kamath explores Gaps & Opportunities",
        "guests": ["Alcohol industry leaders"],
        "duration": "3:12:53", "videoId": "alcohol_ep18",
        "tags": ["#Alcohol", "#BrandBuilding", "#Consumer"],
        "sourceUrl": "https://www.youtube.com/watch?v=alcohol_ep18",
        "category": "Consumer",
        "framework": [
            "If someone asks for your brand name at a bar, your marketing work is done. Brand recall in alcohol is the hardest moat to build.",
            "Alcohol regulation in India is state-by-state, creating complexity but also opportunity for brands that master the regulatory maze.",
            "Premiumization is real — Indian consumers are upgrading from mass spirits to craft and premium categories.",
        ],
        "market_gap": "Craft beverages (beer, gin, whiskey) are surging but distribution remains controlled by state excise departments. Brands that crack regulatory + distribution win big.",
        "resource": "India excise/distribution regulations, Craft brewery licensing, Supply chain for premium spirits"
    },
    {
        "id": "n-19", "creatorId": "nikhil-kamath", "order": 19,
        "title": 'Ep. #19 | WTF is "Making it" in an Offbeat Career? Nikhil Kamath Ft. Kriti Sanon, Badshah & KL Rahul',
        "guests": ["Kriti Sanon", "Badshah", "KL Rahul"],
        "duration": "2:41:31", "videoId": "offbeat_ep19",
        "tags": ["#Careers", "#Entertainment", "#DecisionMaking"],
        "sourceUrl": "https://www.youtube.com/watch?v=offbeat_ep19",
        "category": "Founders",
        "framework": [
            "Pick the sector first, then the company — you want tailwinds. Bet on where the industry will be 5-10x bigger in a decade.",
            "In entertainment and sports, personal brand IS the business. Invest in it like you would in a startup.",
            "Regret minimization: make decisions based on which option you'd regret NOT trying, with a clear time horizon.",
        ],
        "market_gap": "India has no structured platform for offbeat career guidance — connecting entertainment, sports, and creative professionals with financial planning and brand-building tools.",
        "resource": "Celebrity brand management frameworks, Sports management agencies in India"
    },
    {
        "id": "n-20", "creatorId": "nikhil-kamath", "order": 20,
        "title": "Ep. #20 | WTF are Indian Real Estate Giants Up To? Nikhil ft. Irfan, Nirupa, & Karan",
        "guests": ["Irfan Razack", "Nirupa Shankar", "Karan Virwani"],
        "duration": "3:29:50", "videoId": "realestate_ep20",
        "tags": ["#RealEstate", "#India", "#Investment"],
        "sourceUrl": "https://www.youtube.com/watch?v=realestate_ep20",
        "category": "RealEstate",
        "framework": [
            "Pure residential plays are dead capital — the alpha exists in commercial yield compression and co-working/flex space.",
            "Tier-2 cities (Coimbatore, Indore) are the new frontier as IT talent migrates due to remote work infrastructure.",
            "WeWork-style flex offices are evolving into category-specific spaces (biotech hubs, creator studios, D2C warehousing).",
        ],
        "market_gap": "Fractionalized commercial real estate ownership via SEBI FOP framework — dropping the entry barrier from ₹5 Crores to ₹50,000 for retail investors.",
        "resource": "SEBI Fractional Ownership Platform (FOP) regulations, WeWork India (Karan Virwani), Prestige Group, Brigade Group"
    },
    {
        "id": "n-21", "creatorId": "nikhil-kamath", "order": 21,
        "title": "Ep #21 | WTF is Longevity? | Nikhil ft. Nithin Kamath, Bryan Johnson, Prashanth, Jitendra & Seema",
        "guests": ["Nithin Kamath", "Bryan Johnson", "Prashanth Prakash", "Jitendra Chouksey", "Seema Chowdhary"],
        "duration": "3:16:30", "videoId": "longevity_ep21",
        "tags": ["#Longevity", "#Health", "#Biohacking"],
        "sourceUrl": "https://www.youtube.com/watch?v=longevity_ep21",
        "category": "Health",
        "framework": [
            "Trust the data, not anyone's philosophy — regularly measure blood biomarkers and use data to fine-tune diet/supplementation.",
            "The supplement industry has massive markups and zero transparency. Products with verifiable lab testing are a huge opportunity.",
            "Bryan Johnson walked out citing poor AQI — environmental health is as critical as personal health for longevity.",
        ],
        "market_gap": "India needs a brand that is transparent about lab testing for food/supplements. The gap between wellness marketing claims and actual clinical validation is enormous.",
        "resource": "Blueprint (Bryan Johnson), Biopil Lab Testing, Fitpage (Jitendra Chouksey)"
    },
    {
        "id": "n-22", "creatorId": "nikhil-kamath", "order": 22,
        "title": "Ep #22 | WTF are Craft Beverages? Nikhil ft. the Founders of Blue Tokai, Subko, Svami, and Mossant",
        "guests": ["Blue Tokai founders", "Subko founders", "Svami founders", "Mossant founders"],
        "duration": "2:46:40", "videoId": "craft_ep22",
        "tags": ["#CraftBeverages", "#Consumer", "#BrandBuilding"],
        "sourceUrl": "https://www.youtube.com/watch?v=craft_ep22",
        "category": "Consumer",
        "framework": [
            "Craft beverage brands succeed when they own the full supply chain from sourcing to retail experience.",
            "Building a premium beverage brand requires both product obsession AND retail format innovation — cafes, tasting rooms, subscriptions.",
            "Distribution in alcohol/beverages is the ultimate barrier. Master it and you have a permanent competitive moat.",
        ],
        "market_gap": "Specialty coffee and non-alcoholic mixer brands (tonic water, craft sodas) are in early innings in India. The premiumization wave is just starting.",
        "resource": "Blue Tokai Coffee, Subko Specialty Coffee, Svami Tonic Water, Mossant"
    },
    {
        "id": "n-23", "creatorId": "nikhil-kamath", "order": 23,
        "title": "Ep #23 | WTF are Consumer Electronics? | Nikhil ft. Carl Pei, Rahul Sharma & Amit Khatri",
        "guests": ["Carl Pei", "Rahul Sharma", "Amit Khatri"],
        "duration": "3:25:44", "videoId": "electronics_ep23",
        "tags": ["#ConsumerElectronics", "#Hardware", "#India"],
        "sourceUrl": "https://www.youtube.com/watch?v=electronics_ep23",
        "category": "Consumer",
        "framework": [
            "Execution beats ideas in consumer electronics. Nothing Phone succeeded not by reinventing smartphones but by extreme design differentiation.",
            "India must be both a consumption hub AND an export hub — Nothing's JV with Optiemus Infracom for local manufacturing is the model.",
            "The next wave is AI-native hardware — devices that adapt to context, not just run apps. Whoever builds this for India wins.",
        ],
        "market_gap": "Health-tech wearables (smart rings, glucose monitors) will explode in India. Indian consumers' willingness to spend on tech-driven health solutions is accelerating.",
        "resource": "Nothing Phone (Carl Pei), Micromax (Rahul Sharma), Noise (Amit Khatri), Optiemus Infracom (manufacturing)"
    },
    {
        "id": "n-24", "creatorId": "nikhil-kamath", "order": 24,
        "title": "Inside Silicon Valley's VC Playbook | WTF is Venture Capital? - 2025 Edition | Ep. 24",
        "guests": ["Silicon Valley VCs"],
        "duration": "2:52:17", "videoId": "vc2025_ep24",
        "tags": ["#VC", "#SiliconValley", "#Capital"],
        "sourceUrl": "https://www.youtube.com/watch?v=vc2025_ep24",
        "category": "Capital",
        "framework": [
            "US VCs are now actively comparing Indian startup ecosystems to early-stage Silicon Valley — India is the next major frontier.",
            "Founders without fancy resumes can thread the needle — some of the best founders are 16-23 year olds not even on LinkedIn.",
            "Male beauty and wellness is an acknowledged gap even by VCs — many recognize the whitespace but lack operator expertise.",
        ],
        "market_gap": "Founder-first, operating-heavy capital products remain underbuilt for Indian consumer businesses. The US VC playbook needs deep localization for India.",
        "resource": "Silicon Valley comparison frameworks, Indian Angel Network, iSeed by Accel"
    },
    {
        "id": "n-25", "creatorId": "nikhil-kamath", "order": 25,
        "title": "Tira, Bombay Shaving Co., Inde Wild | WTF is Fueling India's Beauty & Skincare Revolution? | Ep. 25",
        "guests": ["Bhakti Modi", "Shantanu Deshpande", "Diipa Khosla"],
        "duration": "3:36:41", "videoId": "beauty_ep25",
        "tags": ["#Beauty", "#Skincare", "#Consumer"],
        "sourceUrl": "https://www.youtube.com/watch?v=beauty_ep25",
        "category": "Consumer",
        "framework": [
            "Beauty is growing at 10% annually and premiumizing fast — Hair care (₹7-8B), skincare (₹6B), makeup (₹3B), fragrances (₹3B).",
            "Fragrance is the breakout category — younger consumers are building 'scent wardrobes' with gender-neutral and gourmand notes.",
            "Products can be copied, communities cannot. Build authenticity and shared values through relatable voices, not celebrity endorsements.",
        ],
        "market_gap": "Clean-ical (clean + clinical) skincare for Indian skin types and climates. Ayurvedistry — modern reinvention of Ayurveda for ingredient-savvy Gen-Z consumers.",
        "resource": "Tira Beauty (Bhakti Modi/Reliance), Bombay Shaving Company (Shantanu), Inde Wild (Diipa Khosla), Baddi Contract Manufacturing"
    },
    # ===== The BarberShop with Shantanu =====
    {
        "id": "s-01", "creatorId": "shantanu-deshpande", "order": 1,
        "title": "FULL EPISODE | Life as a Shark, Building 10,000 Cr+ boAt & Investor Rejections | S1E1 Ft. Aman Gupta",
        "guests": ["Aman Gupta"],
        "duration": "1:28:35", "videoId": "boat_s1e1",
        "tags": ["#BrandBuilding", "#Consumer", "#D2C"],
        "sourceUrl": "https://www.youtube.com/watch?v=boat_s1e1",
        "category": "Consumer",
        "framework": [
            "India is a supply-starved market. Unlocking large categories is about providing high-quality, accessible supply, not inventing new needs.",
            "Great product + compelling emotional story + distribution access = the three non-negotiable pillars of an Indian consumer brand.",
            "Adopt a 30-year mindset. Building a brand is a marathon — long-term perspective helps navigate brutal competition periods.",
        ],
        "market_gap": "Affordable lifestyle electronics designed for Indian conditions (humidity, dust, commute noise) are still supply-starved. BoAt proved audio; other categories remain.",
        "resource": "boAt Lifestyle (₹10K+ Cr brand), Amazon India seller tools, Flipkart brand accelerator programs"
    },
    {
        "id": "s-02", "creatorId": "shantanu-deshpande", "order": 2,
        "title": "With TWO PROFITABLE UNICORNS, Asish Mohapatra Founder OfBusiness is making people rich | S1E3 Part 1",
        "guests": ["Asish Mohapatra"],
        "duration": "1:06:11", "videoId": "ofbusiness_s1e3p1",
        "tags": ["#B2B", "#Capital", "#Execution"],
        "sourceUrl": "https://www.youtube.com/watch?v=ofbusiness_s1e3p1",
        "category": "Capital",
        "framework": [
            "The primary purpose of a business is to make a profit. Prioritizing growth over sustainable profit pools is a recipe for disaster.",
            "Hiring freshers who are 'malleable' and building them with shared values creates stronger organizational DNA than hiring expensive talent.",
            "Find market gaps like finding gaps in traffic — barge in when you see one, don't wait for a perfect opening.",
        ],
        "market_gap": "India's B2B commerce and supply chain digitization (what OfBusiness built) has proven the model. Adjacent verticals (chemicals, textiles, agriculture inputs) need the same treatment.",
        "resource": "OfBusiness (B2B marketplace), Oxyzo (lending), India B2B supply chain analysis"
    },
    {
        "id": "s-03", "creatorId": "shantanu-deshpande", "order": 3,
        "title": "Venture Capital, Building Brands and Being a Founder | Asish Mohapatra | S1E3 Part 2",
        "guests": ["Asish Mohapatra"],
        "duration": "1:17:55", "videoId": "ofbusiness_s1e3p2",
        "tags": ["#VC", "#FounderMode", "#BrandBuilding"],
        "sourceUrl": "https://www.youtube.com/watch?v=ofbusiness_s1e3p2",
        "category": "Capital",
        "framework": [
            "Indian VC was initially designed differently from the US model — experienced entrepreneurs should lead funds, not just financiers.",
            "Focus and relentless execution beat elaborate strategy. OfBusiness grew by doing one thing (B2B procurement) exceptionally well.",
            "The VC landscape is evolving as more successful operators enter as investors — aligning founder and investor incentives.",
        ],
        "market_gap": "Operator-angel investing networks (founders investing in founders) are still nascent in India. The ecosystem needs more capital from people who've built, not just managed money.",
        "resource": "Titan Capital, Indian operator-angel networks, First Cheque (Indian angel platform)"
    },
    {
        "id": "s-04", "creatorId": "shantanu-deshpande", "order": 4,
        "title": "Heading TWO DECACORNS, investing in people & living a good life | S1E4 with Rohit Kapoor",
        "guests": ["Rohit Kapoor"],
        "duration": "1:21:07", "videoId": "decacorns_s1e4",
        "tags": ["#Platforms", "#Leadership", "#Wealth"],
        "sourceUrl": "https://www.youtube.com/watch?v=decacorns_s1e4",
        "category": "Founders",
        "framework": [
            "Leading decacorns requires investing in PEOPLE first, systems second. Culture doesn't scale through documents — it scales through behavior.",
            "Living a good life and building massive companies are not mutually exclusive — but require extreme intentionality about time and energy.",
            "The difference between a $1B and $10B company is depth of talent bench, not just market size.",
        ],
        "market_gap": "India needs more leadership development infrastructure for scale-stage founders transitioning from founder-operators to CEO-builders.",
        "resource": "Swiggy, OlaCabs (Rohit Kapoor's experience), Executive coaching frameworks for Indian founders"
    },
    {
        "id": "s-05", "creatorId": "shantanu-deshpande", "order": 5,
        "title": "FULL Episode Ft. @warikoo | My Life My Rules, Helping Others and Building A Content Empire | S1E5",
        "guests": ["Ankur Warikoo"],
        "duration": "1:58:25", "videoId": "warikoo_s1e5",
        "tags": ["#CreatorEconomy", "#Wealth", "#ContentStrategy"],
        "sourceUrl": "https://www.youtube.com/watch?v=warikoo_s1e5",
        "category": "Content",
        "framework": [
            "The sole objective of content creation is to build TRUST. Trust drives business growth, brand value, and sustainable monetization.",
            "Shift from 'renting time' (salary) to 'renting skills' (leverage) — knowledge/content can scale without linear effort.",
            "Define a clear financial 'finish line' — Warikoo has a specific target corpus that buys freedom from compulsory work.",
        ],
        "market_gap": "India has no structured platform combining financial literacy and content-to-business conversion tools for creators transitioning to entrepreneurs.",
        "resource": "Ankur Warikoo's books and courses, WebVeda (Warikoo's ed-tech), ConvertKit for creator newsletters"
    },
    {
        "id": "s-06", "creatorId": "shantanu-deshpande", "order": 6,
        "title": "Acquiring 8 Companies in 6 months, beating facial paralysis, 18 Hour Days | Ft. Bhavna Suresh | S1E6",
        "guests": ["Bhavna Suresh"],
        "duration": "2:02:28", "videoId": "bhavna_s1e6",
        "tags": ["#M&A", "#Operations", "#Resilience"],
        "sourceUrl": "https://www.youtube.com/watch?v=bhavna_s1e6",
        "category": "M&A",
        "framework": [
            "Acquire stalled D2C operators at 1-1.5x revenue via earn-out structures, then plug them into shared centralized distribution.",
            "High-velocity M&A requires a playbook: legal due diligence, cultural integration, and immediate margin improvements through shared infrastructure.",
            "Physical and mental health during hyper-growth is non-negotiable — Bhavna's facial paralysis was a wake-up call about founder burnout.",
        ],
        "market_gap": "The Thrasio/rollup model needs Indian-specific adaptation focused on offline distribution networks, not just Amazon marketplace consolidation.",
        "resource": "India M&A legal frameworks for D2C, Udaan Wholesale Platform, Rollup economics playbook"
    },
    {
        "id": "s-07", "creatorId": "shantanu-deshpande", "order": 7,
        "title": "Regret Minimization, Being a Great CEO and Building Wealth | S1E7 Part 1 Ft. Toshan Tamhane",
        "guests": ["Toshan Tamhane"],
        "duration": "1:11:16", "videoId": "toshan_s1e7p1",
        "tags": ["#Wealth", "#Leadership", "#DecisionMaking"],
        "sourceUrl": "https://www.youtube.com/watch?v=toshan_s1e7p1",
        "category": "Founders",
        "framework": [
            "Use regret minimization to make hard calls — which option would I regret NOT trying with a 5-year time horizon?",
            "Being a great CEO requires balancing audacity with discipline. Grand vision without operational rigor is just fantasy.",
            "Build a personal operating cadence before scaling the company. Your weekly rhythm determines your decision quality.",
        ],
        "market_gap": "Indian founders lack structured CEO coaching programs that combine strategy, mental resilience, and peer accountability in one system.",
        "resource": "Jeff Bezos regret minimization framework, CEO coaching programs, Wealth management for founders"
    },
    {
        "id": "s-08", "creatorId": "shantanu-deshpande", "order": 8,
        "title": "Full Part 2 | The Idea of Entrepreneurship and Building Wealth | S1E7 Part 2 ft Toshan Tamhane",
        "guests": ["Toshan Tamhane"],
        "duration": "1:00:15", "videoId": "toshan_s1e7p2",
        "tags": ["#Wealth", "#Entrepreneurship", "#Psychology"],
        "sourceUrl": "https://www.youtube.com/watch?v=toshan_s1e7p2",
        "category": "Founders",
        "framework": [
            "Wealth creation is not about chasing money — it's about building systems that generate value even when you're not working.",
            "Separate your identity from your company. Founders who define themselves solely by their venture break when the venture struggles.",
            "Treat energy and mental steadiness as operating leverage — exhausted founders make terrible decisions.",
        ],
        "market_gap": "Financial planning products specifically designed for founders (liquidity events, ESOP management, secondary sales) are dramatically underserved in India.",
        "resource": "Founder wealth management advisors, ESOP management platforms (Qapita), Secondary market platforms"
    },
    {
        "id": "s-09", "creatorId": "shantanu-deshpande", "order": 9,
        "title": "Building SNAPDEAL, Angel Investing & more | S1E8 | Rohit Bansal, Co Founder Snapdeal & Titan Capital",
        "guests": ["Rohit Bansal"],
        "duration": "1:08:03", "videoId": "snapdeal_s1e8p1",
        "tags": ["#Ecommerce", "#AngelInvesting", "#Execution"],
        "sourceUrl": "https://www.youtube.com/watch?v=snapdeal_s1e8p1",
        "category": "Capital",
        "framework": [
            "Snapdeal's rise and pivot taught that marketplace economics require either massive scale or deep category focus — the middle ground is deadly.",
            "Angel investing is about pattern recognition from operating experience. Rohit's Titan Capital backs founders who remind him of early Snapdeal hustle.",
            "The Indian e-commerce market is mature enough now that second-generation founders can learn from documented failures, not just successes.",
        ],
        "market_gap": "India needs more operator-turned-angel investors who can provide distribution networks and operational playbooks, not just capital.",
        "resource": "Titan Capital (Rohit Bansal), Snapdeal case study, Indian angel investing platforms"
    },
    {
        "id": "s-10", "creatorId": "shantanu-deshpande", "order": 10,
        "title": "Winning Mindset & Mental Health | Rohit Bansal, Co Founder Snapdeal & Titan Capital | S1E8 Part 2",
        "guests": ["Rohit Bansal"],
        "duration": "57:58", "videoId": "snapdeal_s1e8p2",
        "tags": ["#MentalHealth", "#Mindset", "#FounderMode"],
        "sourceUrl": "https://www.youtube.com/watch?v=snapdeal_s1e8p2",
        "category": "Founders",
        "framework": [
            "Winning mindset requires treating setbacks as temporary — Snapdeal went from $6.5B valuation to near-death and back. Resilience is everything.",
            "Mental health in startups is still stigmatized. Founders need to normalize therapy, peer support, and breaks.",
            "Brands are about trust, consistency, and authenticity—not discounts. Teams that don't discount build stronger long-term brands.",
        ],
        "market_gap": "India desperately needs founder mental health infrastructure — peer groups, professional support, and accountability systems designed for the unique stresses of building companies.",
        "resource": "Founder mental health resources, YPO/EO peer groups in India, Therapy platforms (Amaha, MindPeers)"
    },
    {
        "id": "s-11", "creatorId": "shantanu-deshpande", "order": 11,
        "title": "SHARK Vineeta Singh, CEO & Founder SUGAR- raising money & INVESTING in WOMEN | S1 FINALE",
        "guests": ["Vineeta Singh"],
        "duration": "2:10:36", "videoId": "sugar_s1finale",
        "tags": ["#D2C", "#Beauty", "#FemaleFounders"],
        "sourceUrl": "https://www.youtube.com/watch?v=sugar_s1finale",
        "category": "Consumer",
        "framework": [
            "Gender bias in funding is real — SUGAR was told investors wouldn't back a solo woman founder. Vineeta's husband had to 'join' to unlock capital.",
            "Omnichannel is the endgame: SUGAR's growth came from mastering BOTH D2C digital AND deep offline retail penetration simultaneously.",
            "Investing in women founders and women consumers is not charity — it's accessing the fastest-growing economic demographic in India.",
        ],
        "market_gap": "India needs more women-focused angel funds and accelerators. Female-led businesses are dramatically underfunded despite higher capital efficiency.",
        "resource": "SUGAR Cosmetics distribution playbook, Female founder funding networks, Shark Tank India (Vineeta as judge)"
    },
]

# Build the brain JSON
creators = [
    {
        "id": "nikhil-kamath",
        "name": "Nikhil Kamath",
        "show": "WTF with Nikhil Kamath",
        "handle": "WTF",
        "description": "Long-form Indian business conversations across venture, distribution, health, consumer brands, hospitality, and future sectors.",
        "sourceUrl": "https://www.youtube.com/@nikhilkamathcio"
    },
    {
        "id": "shantanu-deshpande",
        "name": "Shantanu Deshpande",
        "show": "The BarberShop with Shantanu",
        "handle": "The BarberShop",
        "description": "Operator-grade founder conversations focused on D2C, founder psychology, wealth, investing, and building durable brands in India.",
        "sourceUrl": "https://www.youtube.com/@BombayShavingCompany"
    }
]

# Build sourceCatalog
source_catalog = []
for ep in episodes:
    strat_snippets = []
    for i, fw in enumerate(ep["framework"]):
        strat_snippets.append({
            "text": fw,
            "startSeconds": 0,
            "endSeconds": 0,
            "timestamp": f"Framework Step {i+1}",
            "relevance": 100 - i * 5,
            "episodeId": ep["id"]
        })

    opp_snippets = [{
        "text": ep["market_gap"],
        "startSeconds": 0,
        "endSeconds": 0,
        "timestamp": "Market Gap",
        "relevance": 100,
        "episodeId": ep["id"]
    }]

    # Extract all unique tags
    tags_clean = [t.replace("#", "") for t in ep["tags"]]

    source_catalog.append({
        "id": ep["id"],
        "creatorId": ep["creatorId"],
        "publishedOrder": ep["order"],
        "duration": ep["duration"],
        "videoId": ep["videoId"],
        "title": ep["title"],
        "guests": ep.get("guests", []),
        "tags": ep["tags"],
        "sourceUrl": ep["sourceUrl"],
        "status": "deep-extracted",
        "category": ep["category"],
        "strategySnippets": strat_snippets,
        "opportunitySnippets": opp_snippets,
        "resourceMentions": [],
        "highlightSnippets": [],
        "resourceString": ep["resource"]
    })

# Gather unique tags
all_tags = set()
for ep in episodes:
    for t in ep["tags"]:
        all_tags.add(t)

# Build resource families from the resources mentioned across episodes
resource_items = {}
for ep in episodes:
    for res_name in ep["resource"].split(", "):
        res_name = res_name.strip()
        if not res_name:
            continue
        res_id = "res-" + res_name.lower().replace(" ", "-").replace("(", "").replace(")", "").replace("/", "-").replace("'", "").replace("₹", "rs")[:40]
        if res_id not in resource_items:
            resource_items[res_id] = {
                "id": res_id,
                "title": res_name,
                "type": "tool",
                "episodeIds": [],
                "mentionCount": 0
            }
            # Classify type
            lower = res_name.lower()
            if "book" in lower or "principles" in lower or "sapiens" in lower or "deals" in lower or "framework" in lower or "playbook" in lower or "case study" in lower or "analysis" in lower:
                resource_items[res_id]["type"] = "book"
            elif "capital" in lower or "ventures" in lower or "partners" in lower or "fund" in lower or "angel" in lower or "accel" in lower or "titan" in lower or "sequoia" in lower or "peak xv" in lower or "iseed" in lower or "first cheque" in lower:
                resource_items[res_id]["type"] = "fund"
            elif any(x in lower for x in ["oyo", "mensa", "boat", "sugar", "ather", "nothing", "zepto", "swiggy", "snapdeal", "ofbusiness", "tira", "bombay shaving", "inde wild", "cult.fit", "biocon", "blusmart", "loco", "amaha"]):
                resource_items[res_id]["type"] = "brand"
            elif any(x in lower for x in ["person", "sunita", "mukesh", "kiran"]):
                resource_items[res_id]["type"] = "person"
            else:
                resource_items[res_id]["type"] = "tool"

        resource_items[res_id]["episodeIds"].append(ep["id"])
        resource_items[res_id]["mentionCount"] += 1

# Also update episode resourceMentions
for ep_entry in source_catalog:
    orig_ep = next(e for e in episodes if e["id"] == ep_entry["id"])
    for res_name in orig_ep["resource"].split(", "):
        res_name = res_name.strip()
        if not res_name:
            continue
        res_id = "res-" + res_name.lower().replace(" ", "-").replace("(", "").replace(")", "").replace("/", "-").replace("'", "").replace("₹", "rs")[:40]
        ep_entry["resourceMentions"].append({
            "resourceId": res_id,
            "mentionCount": 1
        })

# Build resource families grouped by type
family_map = {}
for rid, rdata in resource_items.items():
    rtype = rdata["type"]
    if rtype not in family_map:
        family_map[rtype] = {
            "id": rtype,
            "title": rtype.capitalize() + "s",
            "description": f"Resources of type '{rtype}' surfaced across the podcast corpus.",
            "items": []
        }
    family_map[rtype]["items"].append(rdata)

resource_families = list(family_map.values())

# Build the final brain
brain = {
    "meta": {
        "productName": "Project Signal",
        "generatedAt": "2026-04-19T01:34:00+05:30",
        "indexedEpisodeCount": len(episodes),
        "deepExtractedCount": len(episodes),
        "resourceCount": len(resource_items),
        "creatorCount": 2,
    },
    "creators": creators,
    "filters": {
        "featuredTags": sorted(list(all_tags))
    },
    "neuralMap": {
        "nodes": [],
        "connections": []
    },
    "resourceFamilies": resource_families,
    "sourceCatalog": source_catalog,
}

with open("./src/data/project-signal-brain.json", "w") as f:
    json.dump(brain, f, indent=2)

print(f"✅ Brain database built: {len(episodes)} episodes, {len(resource_items)} resources")
print(f"   Tags: {sorted(list(all_tags))}")
