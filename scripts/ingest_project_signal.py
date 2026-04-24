#!/usr/bin/env python3

from __future__ import annotations

import json
import re
import subprocess
import sys
from collections import Counter, defaultdict
from datetime import datetime, timezone
from pathlib import Path
from typing import Any


ROOT = Path(__file__).resolve().parents[1]
DATA_DIR = ROOT / "data"
INGEST_DIR = DATA_DIR / "ingest"
TRANSCRIPT_DIR = DATA_DIR / "transcripts"
GENERATED_PATH = ROOT / "src" / "data" / "project-signal-brain.json"
SNAPSHOT_PATH = INGEST_DIR / "live-source-snapshot.json"


CREATORS = [
    {
        "id": "nikhil-kamath",
        "name": "Nikhil Kamath",
        "show": "WTF with Nikhil Kamath",
        "handle": "WTF",
        "description": "Long-form Indian business conversations across venture, distribution, health, consumer brands, hospitality, and future sectors.",
        "sourceUrl": "https://www.youtube.com/channel/UCnC8SAZzQiBGYVSKZ_S3y4Q/videos",
    },
    {
        "id": "shantanu-deshpande",
        "name": "Shantanu Deshpande",
        "show": "The BarberShop with Shantanu",
        "handle": "The BarberShop",
        "description": "Operator-grade founder conversations focused on D2C, founder psychology, wealth, investing, and building durable brands in India.",
        "sourceUrl": "https://www.youtube.com/channel/UCWx7JXxm2xkTabER32I0GZg/videos",
    },
]


TOPIC_SEEDS = [
    {
        "id": "audience-distribution",
        "title": "Audience and distribution systems",
        "type": "build-system",
        "summary": "The shared logic of how attention turns into trust, distribution, and revenue across both podcast universes.",
        "whyItMatters": "This is where content, community, recall, and low-cost demand generation collapse into one repeatable edge.",
        "tags": ["#Distribution", "#Audience", "#Creators", "#Growth"],
        "strategies": [
            "Design for repeatable promise before volume.",
            "Convert audience into owned channels so platforms stop being the only source of demand.",
            "Use collaboration and authority transfer to compress trust-building time.",
        ],
        "marketGaps": [
            "India still lacks a founder-native operating system that turns business content into build-ready distribution playbooks.",
            "There is room for creator-led education products that sit between inspiration and implementation.",
        ],
        "x": 23,
        "y": 26,
        "starterRoadmap": [
            "Pick one audience promise and one owned channel.",
            "Map every content format to discovery, trust, or conversion.",
            "Build recurring distribution loops instead of campaign bursts.",
        ],
    },
    {
        "id": "ecommerce-d2c",
        "title": "E-commerce and D2C operating systems",
        "type": "build-system",
        "summary": "How Indian commerce actually moves through marketplaces, owned stores, wholesale rails, and category-specific funnels.",
        "whyItMatters": "Almost every modern Indian brand touches this system, and the best operators separate learning channels from profit channels.",
        "tags": ["#D2C", "#Ecommerce", "#Marketplace", "#Consumer"],
        "strategies": [
            "Separate discovery channels from repeat channels.",
            "Use D2C for learning, not ego.",
            "Let category economics decide whether you lean marketplace, wholesale, or owned store first.",
        ],
        "marketGaps": [
            "Tier-2 and Tier-3 assisted commerce infrastructure is still underbuilt.",
            "Indian brands still need better tooling for demand sensing from marketplace search and reviews.",
        ],
        "x": 24,
        "y": 52,
        "starterRoadmap": [
            "Identify the first profitable channel-product fit.",
            "Instrument retention before expanding assortment.",
            "Add distribution depth only after one wedge works.",
        ],
    },
    {
        "id": "brand-premiumization",
        "title": "Brand building and premiumization",
        "type": "industry",
        "summary": "How Indian consumer brands earn trust, command margin, and move from commodity behavior to affinity behavior.",
        "whyItMatters": "This is where packaging, hero products, story, trust density, and distribution meet.",
        "tags": ["#BrandBuilding", "#Premiumization", "#Consumer", "#HeroSKU"],
        "strategies": [
            "Lead with one sharp product wedge before building a house of SKUs.",
            "Use premium signals only where the product truth can support them.",
            "Package trust, not just aesthetics.",
        ],
        "marketGaps": [
            "Localized premium categories for Indian climates, routines, and price sensitivities are still wide open.",
            "Many categories still lack brands that can bridge mass aspiration and actual product quality.",
        ],
        "x": 39,
        "y": 72,
        "starterRoadmap": [
            "Pick a visible, painful, high-repeat use case.",
            "Design the hero product and its trust proof.",
            "Expand only after branded demand starts forming.",
        ],
    },
    {
        "id": "venture-capital",
        "title": "Venture capital and capital strategy",
        "type": "industry",
        "summary": "How founders should think about grants, venture, dilution, timing, and the real job capital is supposed to do.",
        "whyItMatters": "Capital is useful only when it amplifies an already sound operating system.",
        "tags": ["#VC", "#Capital", "#Fundraising", "#Ownership"],
        "strategies": [
            "Raise for speed or asymmetry, not validation.",
            "Understand what kind of company needs venture and what kind just needs discipline.",
            "Treat dilution as a strategic trade, not a vanity badge.",
        ],
        "marketGaps": [
            "Founder-first, operating-heavy capital products remain underbuilt for Indian consumer businesses.",
            "Young founders still need clearer education on venture readiness versus bootstrap paths.",
        ],
        "x": 50,
        "y": 18,
        "starterRoadmap": [
            "Decide whether the market truly rewards speed.",
            "Model how capital changes distribution, hiring, or product depth.",
            "Choose capital partners who sharpen the company, not just the headline.",
        ],
    },
    {
        "id": "founder-psychology",
        "title": "Founder psychology and decision-making",
        "type": "roadmap",
        "summary": "Character, wealth, regret minimization, mental health, and the hidden costs of ambition.",
        "whyItMatters": "Execution breaks when the founder breaks. This cluster is about durability, not motivation porn.",
        "tags": ["#FounderMode", "#MentalHealth", "#DecisionMaking", "#Wealth"],
        "strategies": [
            "Use regret minimization to make hard calls with clearer time horizons.",
            "Treat energy and mental steadiness as operating leverage.",
            "Separate public identity from actual decision quality.",
        ],
        "marketGaps": [
            "India still lacks founder products that combine strategy, mental resilience, and peer accountability in one system.",
            "Most founder education over-indexes on tactics and underbuilds psychological durability.",
        ],
        "x": 50,
        "y": 84,
        "starterRoadmap": [
            "Audit what is draining signal from your weekly decisions.",
            "Build a personal operating cadence before scaling the company.",
            "Create peer and mentor checkpoints for major decisions.",
        ],
    },
    {
        "id": "health-longevity",
        "title": "Health, wellness, and longevity",
        "type": "industry",
        "summary": "Performance, prevention, wellness behaviors, and the rising premium consumers place on healthspan.",
        "whyItMatters": "This is one of the clearest Indian opportunity zones because it combines aspiration, repeat, and trust.",
        "tags": ["#Health", "#Longevity", "#Wellness", "#Consumer"],
        "strategies": [
            "Build around repeat behavior, not one-time treatment behavior.",
            "Use education and credible operators to increase willingness to pay.",
            "Focus on measurable outcomes and rituals.",
        ],
        "marketGaps": [
            "India still needs stronger trust-led wellness products that sit between content and clinics.",
            "Longevity infrastructure is early and fragmented, which creates room for education plus product stacks.",
        ],
        "x": 74,
        "y": 25,
        "starterRoadmap": [
            "Pick a clear health behavior with visible repeat.",
            "Map the trust signals required before first purchase.",
            "Build with expert credibility and routine logic.",
        ],
    },
    {
        "id": "hospitality-experience",
        "title": "Hospitality, restaurants, and experience businesses",
        "type": "industry",
        "summary": "The experience economy built around taste, space, social behavior, and operations discipline.",
        "whyItMatters": "This cluster is about more than food. It is really about habit, culture, and asset-heavy versus asset-light design.",
        "tags": ["#Hospitality", "#Restaurants", "#Experience", "#RealEstate"],
        "strategies": [
            "Start from the social job to be done, not from a menu or aesthetic alone.",
            "Make economics and culture visible in the same operating system.",
            "Know whether the moat is taste, place, community, or service ritual.",
        ],
        "marketGaps": [
            "Modern Indian cuisine chains remain underbuilt.",
            "Mid-premium experience formats between standard hospitality and luxury remain wide open.",
        ],
        "x": 77,
        "y": 52,
        "starterRoadmap": [
            "Define the social use case and city behavior.",
            "Model the P and L before brand fantasy.",
            "Scale only after one format proves repeat and margin.",
        ],
    },
    {
        "id": "future-tech-platforms",
        "title": "AI, EV, metaverse, gaming, and climate platforms",
        "type": "industry",
        "summary": "Platform shifts where infrastructure, adoption timing, and category education matter more than hype cycles.",
        "whyItMatters": "These sectors create founder opportunity only when technology is translated into an India-specific wedge.",
        "tags": ["#AI", "#EV", "#Climate", "#Gaming", "#Platforms"],
        "strategies": [
            "Localize the wedge instead of copying the global narrative.",
            "Look for rails and picks-and-shovels, not only consumer hype.",
            "Treat education as part of go-to-market in immature categories.",
        ],
        "marketGaps": [
            "Indian AI workflow products remain underbuilt compared to demand.",
            "EV, climate, and gaming still need more India-native infrastructure layers.",
        ],
        "x": 66,
        "y": 71,
        "starterRoadmap": [
            "Choose the specific behavior shift you believe will happen.",
            "Find the infrastructure choke point.",
            "Build the simplest India-specific product around it.",
        ],
    },
    {
        "id": "consumer-opportunity-radar",
        "title": "Indian market-gap radar",
        "type": "market-gap",
        "summary": "A live layer of recurring white spaces surfaced across both podcast networks for the ambitious Indian builder.",
        "whyItMatters": "This is the payoff layer: not just what they said, but where they collectively imply the next companies should be built.",
        "tags": ["#MarketGaps", "#India", "#Opportunities", "#Execution"],
        "strategies": [
            "Watch for categories where trust, convenience, and aspiration are changing together.",
            "Look for sectors where distribution has changed faster than incumbents.",
            "Prefer wedges with repeat behavior and narrative leverage.",
        ],
        "marketGaps": [
            "Tier-2 assisted commerce enablement.",
            "Trust-led beauty and wellness brands for Indian contexts.",
            "Founder-native knowledge systems and implementation products.",
            "Modern Indian experience formats with stronger unit economics.",
        ],
        "x": 34,
        "y": 36,
        "starterRoadmap": [
            "Pick one market gap with visible user pull.",
            "Map existing supply, distribution, and trust failures.",
            "Prototype the wedge with a fast learning loop.",
        ],
    },
]


CONNECTIONS = [
    ("audience-distribution", "ecommerce-d2c", 0.9, "Distribution is the front door for modern D2C growth."),
    ("audience-distribution", "brand-premiumization", 0.88, "Attention becomes brand only when it becomes remembered trust."),
    ("audience-distribution", "consumer-opportunity-radar", 0.8, "Where attention shifts, new opportunity often appears first."),
    ("ecommerce-d2c", "brand-premiumization", 0.94, "Brand and distribution are inseparable in Indian consumer categories."),
    ("ecommerce-d2c", "venture-capital", 0.74, "Capital only works if the commerce engine can absorb it."),
    ("brand-premiumization", "consumer-opportunity-radar", 0.92, "Consumer white spaces emerge where trust and aspiration change together."),
    ("brand-premiumization", "hospitality-experience", 0.78, "The best experience businesses still behave like brands."),
    ("venture-capital", "founder-psychology", 0.82, "Capital decisions are psychological decisions as much as financial ones."),
    ("venture-capital", "consumer-opportunity-radar", 0.7, "VC often follows category shifts after operators notice them first."),
    ("founder-psychology", "audience-distribution", 0.72, "Personal clarity affects how founders communicate and lead."),
    ("founder-psychology", "health-longevity", 0.69, "Sustainable performance and founder durability are tightly linked."),
    ("health-longevity", "consumer-opportunity-radar", 0.75, "Rising wellness intent creates repeatable consumer businesses."),
    ("hospitality-experience", "consumer-opportunity-radar", 0.73, "New formats emerge where social rituals change faster than incumbents."),
    ("future-tech-platforms", "consumer-opportunity-radar", 0.81, "Emerging tech only matters when it opens an India-specific wedge."),
]


ROADMAP_RESOURCES = [
    {
        "id": "roadmap-distribution-loop",
        "title": "Distribution loop blueprint",
        "type": "roadmap",
        "subtitle": "Turn discovery, trust, and conversion into a weekly operating rhythm.",
        "topicIds": ["audience-distribution"],
    },
    {
        "id": "roadmap-d2c-wedge",
        "title": "D2C wedge map",
        "type": "roadmap",
        "subtitle": "Choose the first profitable channel-product fit before channel sprawl.",
        "topicIds": ["ecommerce-d2c"],
    },
    {
        "id": "roadmap-hero-sku",
        "title": "Hero SKU roadmap",
        "type": "roadmap",
        "subtitle": "Prove one hero product and its trust signals before expanding the catalog.",
        "topicIds": ["brand-premiumization", "consumer-opportunity-radar"],
    },
    {
        "id": "roadmap-capital-readiness",
        "title": "Capital readiness checklist",
        "type": "roadmap",
        "subtitle": "Decide whether speed, dilution, and market timing genuinely justify outside capital.",
        "topicIds": ["venture-capital"],
    },
    {
        "id": "roadmap-founder-operating-system",
        "title": "Founder operating system",
        "type": "roadmap",
        "subtitle": "Protect decision quality with energy, reflection, and peer accountability.",
        "topicIds": ["founder-psychology"],
    },
    {
        "id": "roadmap-health-ritual-brand",
        "title": "Health ritual playbook",
        "type": "roadmap",
        "subtitle": "Build around repeat behavior, credible education, and measurable outcomes.",
        "topicIds": ["health-longevity"],
    },
    {
        "id": "roadmap-hospitality-format",
        "title": "Experience format model",
        "type": "roadmap",
        "subtitle": "Validate the social use case and unit economics before scaling locations.",
        "topicIds": ["hospitality-experience"],
    },
    {
        "id": "roadmap-india-ai-wedge",
        "title": "India-first AI wedge",
        "type": "roadmap",
        "subtitle": "Pick one workflow, one user pain, and one clear local advantage.",
        "topicIds": ["future-tech-platforms"],
    },
    {
        "id": "roadmap-gap-to-wedge",
        "title": "Gap-to-wedge sprint",
        "type": "roadmap",
        "subtitle": "Translate a market gap into a narrow proof-of-demand experiment in two weeks.",
        "topicIds": ["consumer-opportunity-radar"],
    },
]


RESOURCE_SEEDS = [
    {"id": "book-principles", "title": "Principles", "type": "book", "subtitle": "Operating system for decisions, incentives, and truth-seeking.", "aliases": ["principles"], "url": "https://www.principles.com/"},
    {"id": "book-zero-to-one", "title": "Zero to One", "type": "book", "subtitle": "Framework for monopolies, wedges, and building the non-obvious.", "aliases": ["zero to one"], "url": "https://www.penguinrandomhouse.com/books/232363/zero-to-one-by-peter-thiel-with-blake-masters/"},
    {"id": "book-hard-thing", "title": "The Hard Thing About Hard Things", "type": "book", "subtitle": "A field guide for hard calls under pressure.", "aliases": ["the hard thing about hard things", "hard thing about hard things"], "url": "https://www.harpercollins.com/products/the-hard-thing-about-hard-things-ben-horowitz"},
    {"id": "book-poor-charlies-almanack", "title": "Poor Charlie's Almanack", "type": "book", "subtitle": "Mental models and decision quality for compounding builders.", "aliases": ["poor charlie's almanack", "poor charlies almanack"], "url": "https://www.stripe.press/poor-charlies-almanack"},
    {"id": "book-psychology-of-money", "title": "The Psychology of Money", "type": "book", "subtitle": "How behavior and incentives shape wealth outcomes.", "aliases": ["psychology of money", "the psychology of money"], "url": "https://www.harriman-house.com/the-psychology-of-money"},
    {"id": "book-blue-ocean", "title": "Blue Ocean Strategy", "type": "book", "subtitle": "Category creation and differentiated market positioning.", "aliases": ["blue ocean strategy"], "url": "https://www.blueoceanstrategy.com/book/"},
    {"id": "book-sapiens", "title": "Sapiens", "type": "book", "subtitle": "Long-range context for belief systems, culture, and institutions.", "aliases": ["sapiens"], "url": "https://www.ynharari.com/book/sapiens-2/"},
    {"id": "fund-wtfund", "title": "WTFund", "type": "fund", "subtitle": "Grant-first founder capital for young Indian builders.", "aliases": ["wtfund"], "url": "https://wtfund.com/"},
    {"id": "fund-titan-capital", "title": "Titan Capital", "type": "fund", "subtitle": "Founder-led angel and seed investing across Indian startups.", "aliases": ["titan capital"], "url": "https://www.titancapital.vc/"},
    {"id": "fund-peak-xv", "title": "Peak XV", "type": "fund", "subtitle": "Large India and Southeast Asia venture platform.", "aliases": ["peak xv", "sequoia"], "url": "https://www.peakxv.com/"},
    {"id": "fund-accel", "title": "Accel", "type": "fund", "subtitle": "Venture firm repeatedly referenced in Indian startup scaling conversations.", "aliases": ["accel"], "url": "https://www.accel.com/"},
    {"id": "fund-blume", "title": "Blume Ventures", "type": "fund", "subtitle": "India-focused early-stage venture capital.", "aliases": ["blume ventures", "blume"], "url": "https://blume.vc/"},
    {"id": "fund-matrix", "title": "Matrix Partners India", "type": "fund", "subtitle": "Seed-to-growth capital for Indian startups.", "aliases": ["matrix partners", "matrix"], "url": "https://www.matrixpartners.in/"},
    {"id": "fund-fireside", "title": "Fireside Ventures", "type": "fund", "subtitle": "Consumer brand-focused venture capital in India.", "aliases": ["fireside", "fireside ventures"], "url": "https://firesideventures.com/"},
    {"id": "fund-alteria", "title": "Alteria Capital", "type": "fund", "subtitle": "Venture debt and alternative financing for startups.", "aliases": ["alteria", "alteria capital"], "url": "https://www.alteriacapital.com/"},
    {"id": "tool-chatgpt", "title": "ChatGPT", "type": "tool", "subtitle": "AI assistant for workflows, research, and product ideation.", "aliases": ["chatgpt"], "url": "https://chatgpt.com/"},
    {"id": "tool-perplexity", "title": "Perplexity", "type": "tool", "subtitle": "AI-native search and answer engine.", "aliases": ["perplexity"], "url": "https://www.perplexity.ai/"},
    {"id": "tool-shopify", "title": "Shopify", "type": "tool", "subtitle": "Owned-store operating system for D2C brands.", "aliases": ["shopify"], "url": "https://www.shopify.com/in"},
    {"id": "tool-meta-ads", "title": "Meta Ads Manager", "type": "tool", "subtitle": "Fastest feedback loop for creative testing and paid acquisition.", "aliases": ["meta ads", "facebook ads", "instagram ads"], "url": "https://www.facebook.com/business/tools/meta-ads-manager"},
    {"id": "tool-youtube", "title": "YouTube", "type": "tool", "subtitle": "High-trust distribution channel for long form and clips.", "aliases": ["youtube"], "url": "https://www.youtube.com/"},
    {"id": "tool-linkedin", "title": "LinkedIn", "type": "tool", "subtitle": "Professional attention graph for founder-led distribution.", "aliases": ["linkedin"], "url": "https://www.linkedin.com/"},
    {"id": "tool-instagram", "title": "Instagram", "type": "tool", "subtitle": "Short-form discovery and creator-led demand channel.", "aliases": ["instagram"], "url": "https://www.instagram.com/"},
    {"id": "tool-whatsapp", "title": "WhatsApp", "type": "tool", "subtitle": "Retention, support, and commerce coordination layer in India.", "aliases": ["whatsapp"], "url": "https://www.whatsapp.com/"},
    {"id": "tool-amazon", "title": "Amazon", "type": "tool", "subtitle": "Intent-rich marketplace for demand and review intelligence.", "aliases": ["amazon"], "url": "https://www.amazon.in/"},
    {"id": "tool-flipkart", "title": "Flipkart", "type": "tool", "subtitle": "Marketplace rail for Indian e-commerce demand capture.", "aliases": ["flipkart"], "url": "https://www.flipkart.com/"},
    {"id": "brand-boat", "title": "boAt", "type": "brand", "subtitle": "Consumer electronics and brand-building case study.", "aliases": ["boAt", "boat"], "url": "https://www.boat-lifestyle.com/"},
    {"id": "brand-sugar", "title": "SUGAR", "type": "brand", "subtitle": "Beauty brand case study for women-focused consumer trust.", "aliases": ["sugar"], "url": "https://in.sugarcosmetics.com/"},
    {"id": "brand-snapdeal", "title": "Snapdeal", "type": "brand", "subtitle": "Marketplace scaling and turnaround reference.", "aliases": ["snapdeal"], "url": "https://www.snapdeal.com/"},
    {"id": "brand-meesho", "title": "Meesho", "type": "brand", "subtitle": "Social commerce and value-driven distribution case study.", "aliases": ["meesho"], "url": "https://www.meesho.com/"},
    {"id": "brand-udaan", "title": "Udaan", "type": "brand", "subtitle": "Wholesale distribution benchmark for retailer access.", "aliases": ["udaan"], "url": "https://www.udaan.com/"},
    {"id": "brand-bombay-shaving-company", "title": "Bombay Shaving Company", "type": "brand", "subtitle": "GTM and premiumization case study in personal care.", "aliases": ["bombay shaving", "bombay shaving company"], "url": "https://bombayshavingcompany.com/"},
    {"id": "brand-tira", "title": "Tira", "type": "brand", "subtitle": "Specialty retail benchmark for beauty discovery.", "aliases": ["tira"], "url": "https://www.tirabeauty.com/"},
    {"id": "brand-blue-tokai", "title": "Blue Tokai", "type": "brand", "subtitle": "Craft beverage and cafe-format reference.", "aliases": ["blue tokai"], "url": "https://bluetokaicoffee.com/"},
    {"id": "brand-subko", "title": "Subko", "type": "brand", "subtitle": "Premium experience-led food and beverage brand.", "aliases": ["subko"], "url": "https://www.subko.coffee/"},
    {"id": "brand-svami", "title": "Svami", "type": "brand", "subtitle": "Craft beverage and mixer brand with category education.", "aliases": ["svami"], "url": "https://svamidrinks.com/"},
    {"id": "brand-mossant", "title": "Mossant", "type": "brand", "subtitle": "Sparkling wine and craft beverage category example.", "aliases": ["mossant"], "url": "https://mossant.com/"},
    {"id": "brand-ather", "title": "Ather", "type": "brand", "subtitle": "EV product and infrastructure wedge in India.", "aliases": ["ather"], "url": "https://www.atherenergy.com/"},
    {"id": "brand-blusmart", "title": "BluSmart", "type": "brand", "subtitle": "EV-first mobility and infrastructure case study.", "aliases": ["blusmart"], "url": "https://www.blusmart.com/"},
    {"id": "brand-10club", "title": "10club", "type": "brand", "subtitle": "Roll-up and acquisition-heavy commerce strategy reference.", "aliases": ["10club"], "url": "https://www.10club.in/"},
    {"id": "brand-mosaic-wellness", "title": "Mosaic Wellness", "type": "brand", "subtitle": "Consumer health and digital wellness operating model.", "aliases": ["mosaic wellness"], "url": "https://www.mosaicwellness.in/"},
    {"id": "person-aman-gupta", "title": "Aman Gupta", "type": "person", "subtitle": "boAt co-founder; brand, hiring, and scale-up operator.", "aliases": ["aman gupta"]},
    {"id": "person-asish-mohapatra", "title": "Asish Mohapatra", "type": "person", "subtitle": "OfBusiness founder; growth, profitability, and capital strategy voice.", "aliases": ["asish mohapatra"]},
    {"id": "person-rohit-kapoor", "title": "Rohit Kapoor", "type": "person", "subtitle": "Marketplace operator with OYO and Swiggy scaling context.", "aliases": ["rohit kapoor"]},
    {"id": "person-ankur-warikoo", "title": "Ankur Warikoo", "type": "person", "subtitle": "Content-led audience building and education-business operator.", "aliases": ["ankur warikoo", "warikoo"]},
    {"id": "person-bhavna-suresh", "title": "Bhavna Suresh", "type": "person", "subtitle": "10club founder; acquisitions and high-velocity operations.", "aliases": ["bhavna suresh"]},
    {"id": "person-toshan-tamhane", "title": "Toshan Tamhane", "type": "person", "subtitle": "Decision-making and CEO quality lens from McKinsey and UPL.", "aliases": ["toshan tamhane", "toshan"]},
    {"id": "person-rohit-bansal", "title": "Rohit Bansal", "type": "person", "subtitle": "Snapdeal co-founder and Titan Capital investor.", "aliases": ["rohit bansal"]},
    {"id": "person-vineeta-singh", "title": "Vineeta Singh", "type": "person", "subtitle": "SUGAR founder and consumer-brand fundraising operator.", "aliases": ["vineeta singh", "vineeta"]},
    {"id": "person-kishore-biyani", "title": "Kishore Biyani", "type": "person", "subtitle": "Indian retail and demand behavior legend.", "aliases": ["kishore biyani"]},
    {"id": "person-kiran-mazumdar-shaw", "title": "Kiran Mazumdar-Shaw", "type": "person", "subtitle": "Biotech pioneer and long-horizon company builder.", "aliases": ["kiran mazumdar shaw", "kiran mazumdar-shaw"]},
    {"id": "person-bryan-johnson", "title": "Bryan Johnson", "type": "person", "subtitle": "Longevity systems builder and measurable healthspan evangelist.", "aliases": ["bryan johnson"]},
    {"id": "person-mukesh-bansal", "title": "Mukesh Bansal", "type": "person", "subtitle": "Consumer internet and health founder with product-building range.", "aliases": ["mukesh bansal"]},
    {"id": "person-pooja-dhingra", "title": "Pooja Dhingra", "type": "person", "subtitle": "Experience-led hospitality and premium dessert brand operator.", "aliases": ["pooja dhingra"]},
    {"id": "person-riyaaz-amlani", "title": "Riyaaz Amlani", "type": "person", "subtitle": "Restaurant format builder across café and dining concepts.", "aliases": ["riyaaz amlani"]},
]


EPISODES = [
    {"id": "n-01", "creatorId": "nikhil-kamath", "publishedOrder": 1, "duration": "1:15:09", "videoId": "tWzalcN_Inc", "title": "#1 WTF is Metaverse? WTF is with Nikhil Kamath ft. Tanmay Bhat, Umang Bedi & Aprameya Radhakrishna", "guests": ["Tanmay Bhat", "Umang Bedi", "Aprameya Radhakrishna"], "topicIds": ["future-tech-platforms"], "tags": ["#Metaverse", "#Platforms", "#AI"]},
    {"id": "n-02", "creatorId": "nikhil-kamath", "publishedOrder": 2, "duration": "2:42:41", "videoId": "SkU3J2vWUK8", "title": "Ep. #2: Secrets of Social Media Success, Mental Health & Distribution Hacks - 3 OGs Reveal All", "guests": ["Prajakta Koli", "Tanmay Bhat", "Kanan Gill"], "topicIds": ["audience-distribution", "founder-psychology"], "tags": ["#Distribution", "#SocialMedia", "#MentalHealth"]},
    {"id": "n-03", "creatorId": "nikhil-kamath", "publishedOrder": 3, "duration": "2:08:13", "videoId": "UKag4LVAEdU", "title": "Ep #3 | WTF is E-commerce: Kishore Biyani, Udaan & Meesho Founders Reveal What Sells and What Doesn’t", "guests": ["Kishore Biyani", "Sujeet Kumar", "Vidit Aatrey"], "topicIds": ["ecommerce-d2c", "consumer-opportunity-radar"], "tags": ["#Ecommerce", "#Marketplace", "#Tier2India"]},
    {"id": "n-04", "creatorId": "nikhil-kamath", "publishedOrder": 4, "duration": "2:28:41", "videoId": "-HkBwSazZsM", "title": "Ep #4 | WTF is ChatGPT: Heaven or Hell? | w/ Nikhil, Varun Mayya, Tanmay, Umang & Aprameya", "guests": ["Varun Mayya", "Tanmay Bhat", "Umang Bedi", "Aprameya Radhakrishna"], "topicIds": ["future-tech-platforms"], "tags": ["#AI", "#ChatGPT", "#Platforms"]},
    {"id": "n-05", "creatorId": "nikhil-kamath", "publishedOrder": 5, "duration": "2:07:52", "videoId": "01qfxLY2rhQ", "title": "Ep #5 | EdTech What’s Broken, What’s Next? With Nikhil, Ronnie Screwvala , Gaurav Munjal & Jay Kotak", "guests": ["Ronnie Screwvala", "Gaurav Munjal", "Jay Kotak"], "topicIds": ["consumer-opportunity-radar", "future-tech-platforms"], "tags": ["#EdTech", "#Education", "#Opportunity"]},
    {"id": "n-06", "creatorId": "nikhil-kamath", "publishedOrder": 6, "duration": "2:05:37", "videoId": "6HE6d0lKh4o", "title": "Ep #6 | WTF is Health? ft. Nikhil Kamath, Suniel Shetty, Nithin Kamath and Mukesh Bansal", "guests": ["Suniel Shetty", "Nithin Kamath", "Mukesh Bansal"], "topicIds": ["health-longevity"], "tags": ["#Health", "#Wellness", "#Consumer"]},
    {"id": "n-07", "creatorId": "nikhil-kamath", "publishedOrder": 7, "duration": "1:59:35", "videoId": "58i057QXl1A", "title": "Ep #7 | Who is Kiran Mazumdar Shaw Really? And WTF is Biotech?", "guests": ["Kiran Mazumdar-Shaw"], "topicIds": ["health-longevity", "future-tech-platforms"], "tags": ["#Biotech", "#Health", "#Innovation"]},
    {"id": "n-08", "creatorId": "nikhil-kamath", "publishedOrder": 8, "duration": "2:13:56", "videoId": "hNV6urpwrk8", "title": "Ep #8 | WTF is Going on in the World of Content | w/ Nikhil, Ajay Bijli, Vijay S. & Sajith S.", "guests": ["Ajay Bijli", "Vijay Subramaniam", "Sajith Sivanandan"], "topicIds": ["audience-distribution"], "tags": ["#Content", "#Distribution", "#Media"]},
    {"id": "n-09", "creatorId": "nikhil-kamath", "publishedOrder": 9, "duration": "2:29:40", "videoId": "zCTm1wHcfkI", "title": "Ep #9 | WTF is Venture Capital? Ft. Nikhil, Nithin, Rajan A., Prashanth P. & Karthik R.", "guests": ["Nithin Kamath", "Rajan Anandan", "Prashanth Prakash", "Karthik Reddy"], "topicIds": ["venture-capital"], "tags": ["#VC", "#Capital", "#Fundraising"]},
    {"id": "n-10", "creatorId": "nikhil-kamath", "publishedOrder": 10, "duration": "2:36:47", "videoId": "nGpir4oUfJI", "title": "Ep #10 | WTF is the Next Gen Thinking? Nikhil w/ Navya, Tara, Aadit & Kaivalya", "guests": ["Navya Naveli Nanda", "Tara Sutaria", "Aadit Palicha", "Kaivalya Vohra"], "topicIds": ["consumer-opportunity-radar", "founder-psychology"], "tags": ["#GenZ", "#India", "#Opportunity"]},
    {"id": "n-11", "creatorId": "nikhil-kamath", "publishedOrder": 11, "duration": "3:24:00", "videoId": "hjiZ11lKCrU", "title": "Ep #11 | WTF Goes into Building a Fashion, Beauty, or Home Brand? Nikhil w/ Kishore, Raj, and Ananth", "guests": ["Kishore Biyani", "Raj Shamani", "Ananth Narayanan"], "topicIds": ["brand-premiumization", "ecommerce-d2c", "consumer-opportunity-radar"], "tags": ["#BrandBuilding", "#Beauty", "#D2C"]},
    {"id": "n-12", "creatorId": "nikhil-kamath", "publishedOrder": 12, "duration": "3:23:51", "videoId": "M72Wu2rZE7Y", "title": "Ep# 12 | WTF is The Restaurant Game? Nikhil w/ Pooja Dhingra, Zorawar Kalra & Riyaaz Amlani", "guests": ["Pooja Dhingra", "Zorawar Kalra", "Riyaaz Amlani"], "topicIds": ["hospitality-experience"], "tags": ["#Restaurants", "#Hospitality", "#Consumer"]},
    {"id": "n-13", "creatorId": "nikhil-kamath", "publishedOrder": 13, "duration": "3:09:15", "videoId": "JjDjDvNgkFo", "title": "Ep# 13 | WTF does it take to Build Influence Today? Nikhil w/ Nuseir, Tanmay, Prajakta & Ranveer", "guests": ["Nuseir Yassin", "Tanmay Bhat", "Prajakta Koli", "Ranveer Allahbadia"], "topicIds": ["audience-distribution"], "tags": ["#Influence", "#Creators", "#Distribution"]},
    {"id": "n-14", "creatorId": "nikhil-kamath", "publishedOrder": 14, "duration": "3:08:48", "videoId": "iuyy1bIgR1s", "title": "Ep# 14 | WTF is Happening with EV? Nikhil ft. Founders of Reva, Ather, Blusmart, and Ossus", "guests": ["Chetan Maini", "Tarun Mehta", "Anmol Singh Jaggi", "Raghav Arora"], "topicIds": ["future-tech-platforms"], "tags": ["#EV", "#Mobility", "#Climate"]},
    {"id": "n-15", "creatorId": "nikhil-kamath", "publishedOrder": 15, "duration": "2:57:54", "videoId": "2q7-cTPwf-g", "title": "Ep# 15 | WTF is Climate Change? Nikhil ft. Sunita, Bhumi, Navroz and Mirik", "guests": ["Sunita Narain", "Bhumi Pednekar", "Navroz Dubash", "Mirik Gogri"], "topicIds": ["future-tech-platforms", "consumer-opportunity-radar"], "tags": ["#Climate", "#Sustainability", "#India"]},
    {"id": "n-16", "creatorId": "nikhil-kamath", "publishedOrder": 16, "duration": "4:14:43", "videoId": "FPV5fAkqyBs", "title": "WTF Ep# 16 | What character \"flaws\" make the best entrepreneurs? Nikhil ft.Ritesh, Ghazal and Manish", "guests": ["Ritesh Agarwal", "Ghazal Alagh", "Manish Poddar"], "topicIds": ["founder-psychology"], "tags": ["#FounderMode", "#DecisionMaking", "#MentalModels"]},
    {"id": "n-17", "creatorId": "nikhil-kamath", "publishedOrder": 17, "duration": "2:42:11", "videoId": "VIlfHB7Jk2s", "title": "Ep# 17 | WTF is Gaming in India? | Career, Investment, Entrepreneurship", "guests": ["Anuj Tandon", "Akshat Rathee", "Sean Hyunil Sohn"], "topicIds": ["future-tech-platforms", "consumer-opportunity-radar"], "tags": ["#Gaming", "#Investment", "#Platforms"]},
    {"id": "n-18", "creatorId": "nikhil-kamath", "publishedOrder": 18, "duration": "3:12:53", "videoId": "0JDsFpU6pGQ", "title": "Ep #18 | WTF, Alcohol is a $70B Business in India? | Nikhil Kamath explores Gaps & Opportunities", "guests": ["Aneesh Bhasin", "Vikram Achanta", "Aditya Chand"], "topicIds": ["brand-premiumization", "consumer-opportunity-radar"], "tags": ["#Alcohol", "#Consumer", "#MarketGaps"]},
    {"id": "n-19", "creatorId": "nikhil-kamath", "publishedOrder": 19, "duration": "2:41:31", "videoId": "2_yA6GoqUnY", "title": "Ep. #19 | WTF is “Making it” in an Offbeat Career? Nikhil Kamath Ft. Kriti Sanon, Badshah & KL Rahul", "guests": ["Kriti Sanon", "Badshah", "KL Rahul"], "topicIds": ["founder-psychology"], "tags": ["#Careers", "#DecisionMaking", "#Ambition"]},
    {"id": "n-20", "creatorId": "nikhil-kamath", "publishedOrder": 20, "duration": "3:16:30", "videoId": "LqSEfz4YUFA", "title": "Ep. #20 | WTF are Indian Real Estate Giants Up To? Nikhil ft. Irfan, Nirupa, & Karan", "guests": ["Irfan Razack", "Nirupa Shankar", "Karan Virwani"], "topicIds": ["hospitality-experience", "consumer-opportunity-radar"], "tags": ["#RealEstate", "#Experience", "#India"]},
    {"id": "n-21", "creatorId": "nikhil-kamath", "publishedOrder": 21, "duration": "3:29:50", "videoId": "fEUoJSTYtyc", "title": "Ep #21 | WTF is Longevity? | Nikhil ft. Nithin Kamath, Bryan Johnson, Prashanth, Jitendra & Seema", "guests": ["Nithin Kamath", "Bryan Johnson", "Prashanth Prakash", "Jitendra Chouksey", "Seema Singh"], "topicIds": ["health-longevity"], "tags": ["#Longevity", "#Wellness", "#Health"]},
    {"id": "n-22", "creatorId": "nikhil-kamath", "publishedOrder": 22, "duration": "3:25:44", "videoId": "wHQiewz8k9g", "title": "Ep #22 | WTF are Craft Beverages? Nikhil ft. the Founders of Blue Tokai, Subko, Svami, and Mossant", "guests": ["Matt Chitharanjan", "Rahul Reddy", "Aneesh Bhasin", "Adithya Balasubramanian"], "topicIds": ["hospitality-experience", "brand-premiumization"], "tags": ["#CraftBeverages", "#BrandBuilding", "#Hospitality"]},
    {"id": "n-23", "creatorId": "nikhil-kamath", "publishedOrder": 23, "duration": "2:46:40", "videoId": "lRjprPQHuXw", "title": "Ep #23 | WTF are Consumer Electronics? | Nikhil ft. Carl Pei, Rahul Sharma & Amit Khatri", "guests": ["Carl Pei", "Rahul Sharma", "Amit Khatri"], "topicIds": ["brand-premiumization", "ecommerce-d2c", "future-tech-platforms"], "tags": ["#Electronics", "#Consumer", "#BrandBuilding"]},
    {"id": "n-24", "creatorId": "nikhil-kamath", "publishedOrder": 24, "duration": "2:52:17", "videoId": "g0CjWbgsdTQ", "title": "Inside Silicon Valley’s VC Playbook | WTF is Venture Capital? - 2025 Edition | Ep. 24", "guests": ["Rajan Anandan", "Prashant Gulati", "Karthik Reddy"], "topicIds": ["venture-capital"], "tags": ["#VC", "#SiliconValley", "#Capital"]},
    {"id": "n-25", "creatorId": "nikhil-kamath", "publishedOrder": 25, "duration": "3:36:41", "videoId": "AdI_XWv-ZTk", "title": "Tira, Bombay Shaving Co., Inde Wild | WTF is Fueling India’s Beauty & Skincare Revolution? | Ep. 25", "guests": ["Bhakti Modi", "Shantanu Deshpande", "Diipa Khosla"], "topicIds": ["brand-premiumization", "consumer-opportunity-radar"], "tags": ["#Beauty", "#Skincare", "#D2C"]},
    {"id": "s-01", "creatorId": "shantanu-deshpande", "publishedOrder": 1, "duration": "1:24:22", "videoId": "5EXdVDEpWIs", "title": "FULL EPISODE | Life as a Shark, Building 10,000 Cr+ boAt & Investor Rejections | S1E1 Ft. Aman Gupta", "guests": ["Aman Gupta"], "topicIds": ["ecommerce-d2c", "brand-premiumization", "founder-psychology"], "tags": ["#boAt", "#BrandBuilding", "#FounderMode"]},
    {"id": "s-02", "creatorId": "shantanu-deshpande", "publishedOrder": 2, "duration": "1:06:11", "videoId": "gIhdMxEce0M", "title": "With TWO PROFITABLE UNICORNS, Asish Mohapatra Founder OfBusiness is making people rich | S1E3 Part 1", "guests": ["Asish Mohapatra"], "topicIds": ["venture-capital", "brand-premiumization"], "tags": ["#VC", "#Scale", "#Profitability"]},
    {"id": "s-03", "creatorId": "shantanu-deshpande", "publishedOrder": 3, "duration": "1:17:55", "videoId": "VwEG4LYf0ag", "title": "Venture Capital, Building Brands and Being a Founder | Asish Mohapatra | S1E3 Part 2", "guests": ["Asish Mohapatra"], "topicIds": ["venture-capital", "brand-premiumization", "founder-psychology"], "tags": ["#VC", "#BrandBuilding", "#FounderMode"]},
    {"id": "s-04", "creatorId": "shantanu-deshpande", "publishedOrder": 4, "duration": "1:21:07", "videoId": "7Hgjat4MVeM", "title": "Heading TWO DECACORNS, investing in people & living a good life | S1E4 with Rohit Kapoor", "guests": ["Rohit Kapoor"], "topicIds": ["venture-capital", "founder-psychology"], "tags": ["#Leadership", "#Capital", "#Wealth"]},
    {"id": "s-05", "creatorId": "shantanu-deshpande", "publishedOrder": 5, "duration": "1:58:25", "videoId": "5HLxbOMXCck", "title": "FULL Episode Ft. @warikoo | My Life My Rules, Helping Others and Building A Content Empire | S1E5", "guests": ["Ankur Warikoo"], "topicIds": ["audience-distribution", "founder-psychology"], "tags": ["#Creators", "#Audience", "#DecisionMaking"]},
    {"id": "s-06", "creatorId": "shantanu-deshpande", "publishedOrder": 6, "duration": "2:02:28", "videoId": "xjuvJK5Jm44", "title": "Acquiring 8 Companies in 6 months, beating facial paralysis,18 Hour Days | Ft. Bhavna Suresh | S1E6", "guests": ["Bhavna Suresh"], "topicIds": ["ecommerce-d2c", "venture-capital"], "tags": ["#Acquisitions", "#Operations", "#Scale"]},
    {"id": "s-07", "creatorId": "shantanu-deshpande", "publishedOrder": 7, "duration": "1:11:16", "videoId": "h-TJU3LenZk", "title": "Regret Minimization, Being a Great CEO and Building Wealth | S1E7 Part 1 Ft. Toshan Tamhane", "guests": ["Toshan Tamhane"], "topicIds": ["founder-psychology"], "tags": ["#DecisionMaking", "#CEO", "#Wealth"]},
    {"id": "s-08", "creatorId": "shantanu-deshpande", "publishedOrder": 8, "duration": "1:00:15", "videoId": "iTeZ_lEGfi8", "title": "Full Part 2 | The Idea of Entrepreneurship and Building Wealth | S1E7 Part 2 ft Toshan Tamhane", "guests": ["Toshan Tamhane"], "topicIds": ["founder-psychology"], "tags": ["#Entrepreneurship", "#Wealth", "#MentalModels"]},
    {"id": "s-09", "creatorId": "shantanu-deshpande", "publishedOrder": 9, "duration": "1:08:03", "videoId": "DvL1bJMB_p4", "title": "Building SNAPDEAL, Angel Investing & more | S1E8 | Rohit Bansal, Co Founder Snapdeal & Titan Capital", "guests": ["Rohit Bansal"], "topicIds": ["venture-capital", "ecommerce-d2c"], "tags": ["#Snapdeal", "#Investing", "#Scale"]},
    {"id": "s-10", "creatorId": "shantanu-deshpande", "publishedOrder": 10, "duration": "57:58", "videoId": "UbRzbCIMXdI", "title": "Winning Mindset & Mental Health | Rohit Bansal, Co Founder Snapdeal & Titan Capital | S1E8 Part 2", "guests": ["Rohit Bansal"], "topicIds": ["venture-capital", "founder-psychology"], "tags": ["#MentalHealth", "#Mindset", "#Wealth"]},
    {"id": "s-11", "creatorId": "shantanu-deshpande", "publishedOrder": 11, "duration": "2:10:36", "videoId": "C1pQE1aLX7A", "title": "SHARK Vineeta Singh, CEO & Founder SUGAR- raising money & INVESTING in WOMEN | S1 FINALE", "guests": ["Vineeta Singh"], "topicIds": ["brand-premiumization", "ecommerce-d2c", "venture-capital"], "tags": ["#SUGAR", "#Fundraising", "#Women"]},
]


OUTREACH = [
    {
        "creatorId": "nikhil-kamath",
        "subject": "Your podcast corpus is now a build-ready founder brain",
        "body": "You create the blueprint. Your audience still consumes it as inspiration instead of infrastructure. I built a transcript-backed neural atlas of the first 25 WTF episodes that extracts market gaps, strategy signals, tools, funds, brands, and founder roadmaps into one searchable product for India’s next builders.",
    },
    {
        "creatorId": "shantanu-deshpande",
        "subject": "The BarberShop now behaves like an operating system, not a playlist",
        "body": "The S1 conversations now live as a searchable second brain for Indian founders. I pulled the transcripts, extracted the actual build signals, and turned them into an interactable product that maps your community’s best advice to resources, opportunities, and execution roadmaps.",
    },
]


STRATEGY_TERMS = [
    "build",
    "start",
    "focus",
    "distribution",
    "brand",
    "customer",
    "market",
    "retention",
    "profit",
    "pricing",
    "margin",
    "wealth",
    "hire",
    "team",
    "capital",
    "scale",
    "founder",
    "audience",
    "community",
    "product",
]
STRATEGY_SIGNAL_TERMS = ["should", "need", "have to", "must", "don't", "first", "then", "because", "when you"]
OPPORTUNITY_TERMS = [
    "opportunity",
    "gap",
    "problem",
    "broken",
    "missing",
    "underserved",
    "underpenetrated",
    "white space",
    "category",
    "india",
    "tier 2",
    "tier 3",
    "consumer",
]
NOISE_TERMS = ["[music]", "[applause]", "[laughter]"]
BAD_PHRASES = [
    "welcome to",
    "thank you so much",
    "what happened",
    "how are you",
    "i remember",
    "i was about to say",
    "what are you watching",
    "feels nice",
    "calling me here",
    "very good to have you",
]


def slugify(value: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", value.lower()).strip("-")


def ensure_dirs() -> None:
    for path in [DATA_DIR, INGEST_DIR, TRANSCRIPT_DIR, GENERATED_PATH.parent]:
        path.mkdir(parents=True, exist_ok=True)


def run_command(args: list[str], *, cwd: Path | None = None) -> subprocess.CompletedProcess[str]:
    return subprocess.run(
        args,
        cwd=cwd or ROOT,
        text=True,
        capture_output=True,
        check=False,
    )


def fetch_subtitles(episode: dict[str, Any]) -> tuple[Path | None, str]:
    episode_dir = TRANSCRIPT_DIR / episode["creatorId"] / episode["id"]
    episode_dir.mkdir(parents=True, exist_ok=True)
    preferred = sorted(episode_dir.glob("*.en-orig.json3")) or sorted(episode_dir.glob("*.en.json3")) or sorted(episode_dir.glob("*.json3"))
    if preferred:
        return preferred[0], "cached"

    url = f"https://www.youtube.com/watch?v={episode['videoId']}"
    outtmpl = str(episode_dir / "%(id)s.%(ext)s")
    result = run_command(
        [
            sys.executable,
            "-m",
            "yt_dlp",
            "--js-runtimes",
            "node",
            "--remote-components",
            "ejs:github",
            "--skip-download",
            "--write-auto-sub",
            "--sub-langs",
            "en.*",
            "--sub-format",
            "json3",
            "-o",
            outtmpl,
            url,
        ]
    )
    preferred = sorted(episode_dir.glob("*.en-orig.json3")) or sorted(episode_dir.glob("*.en.json3")) or sorted(episode_dir.glob("*.json3"))
    if preferred:
        return preferred[0], "downloaded"

    error = (result.stderr or result.stdout or "subtitle download failed").strip().splitlines()[-1]
    return None, error[:280]


def clean_text(value: str) -> str:
    value = value.replace("\u00a0", " ")
    value = re.sub(r"\[[^\]]+\]", " ", value)
    value = re.sub(r"\s+", " ", value).strip()
    return value


def format_timestamp(seconds: float) -> str:
    total = int(seconds)
    hours = total // 3600
    minutes = (total % 3600) // 60
    secs = total % 60
    if hours:
        return f"{hours}:{minutes:02d}:{secs:02d}"
    return f"{minutes}:{secs:02d}"


def parse_segments(json3_path: Path) -> list[dict[str, Any]]:
    payload = json.loads(json3_path.read_text())
    segments: list[dict[str, Any]] = []
    current: dict[str, Any] | None = None
    for event in payload.get("events", []):
        segs = event.get("segs")
        if not segs:
            continue
        text = clean_text("".join(part.get("utf8", "") for part in segs))
        if not text or text.lower() in NOISE_TERMS:
            continue
        start = event.get("tStartMs", 0) / 1000
        duration = event.get("dDurationMs", 0) / 1000
        end = start + duration
        if current:
            near_previous = start - current["endSeconds"] <= 1.1
            room_left = len(current["text"]) + len(text) <= 210
            duplicate = text.lower() in current["text"].lower()
            if near_previous and room_left and not duplicate:
                current["text"] = clean_text(f"{current['text']} {text}")
                current["endSeconds"] = max(current["endSeconds"], end)
                current["timestamp"] = format_timestamp(current["startSeconds"])
                continue
        current = {
            "text": text,
            "startSeconds": start,
            "endSeconds": end,
            "timestamp": format_timestamp(start),
        }
        segments.append(current)
    return [segment for segment in segments if len(segment["text"].split()) >= 4]


def build_transcript_files(episode: dict[str, Any], segments: list[dict[str, Any]]) -> tuple[int, int]:
    episode_dir = TRANSCRIPT_DIR / episode["creatorId"] / episode["id"]
    transcript_path = episode_dir / "transcript.json"
    transcript_text_path = episode_dir / "transcript.txt"
    transcript_path.write_text(json.dumps({"segments": segments}, ensure_ascii=False, indent=2))
    transcript_text_path.write_text("\n".join(f"[{segment['timestamp']}] {segment['text']}" for segment in segments))
    word_count = sum(len(segment["text"].split()) for segment in segments)
    return len(segments), word_count


def build_searchable_text(episode: dict[str, Any], segments: list[dict[str, Any]]) -> str:
    return clean_text(" ".join([episode["title"], *episode["guests"], *(segment["text"] for segment in segments)])).lower()


def score_segment(text: str, keywords: list[str], signal_terms: list[str]) -> int:
    lowered = text.lower()
    score = 0
    if 45 <= len(text) <= 220:
        score += 2
    score += sum(2 for term in keywords if term in lowered)
    score += sum(3 for term in signal_terms if term in lowered)
    if "," in text or " and " in lowered:
        score += 1
    if lowered.count(" i ") > 4:
        score -= 1
    return score


def business_hits(text: str) -> int:
    lowered = text.lower()
    return sum(1 for term in STRATEGY_TERMS if term in lowered)


def dedupe_snippets(snippets: list[dict[str, Any]], limit: int) -> list[dict[str, Any]]:
    seen: set[str] = set()
    selected: list[dict[str, Any]] = []
    for snippet in snippets:
        key = re.sub(r"[^a-z0-9]+", " ", snippet["text"].lower()).strip()
        if key in seen:
            continue
        seen.add(key)
        selected.append(snippet)
        if len(selected) >= limit:
            break
    return selected


def extract_strategy_snippets(episode: dict[str, Any], segments: list[dict[str, Any]]) -> list[dict[str, Any]]:
    ranked = []
    for segment in segments:
        lowered = segment["text"].lower()
        score = score_segment(segment["text"], STRATEGY_TERMS, STRATEGY_SIGNAL_TERMS)
        if any(phrase in lowered for phrase in BAD_PHRASES):
            continue
        if business_hits(segment["text"]) < 2:
            continue
        if score >= 6:
            ranked.append({**segment, "relevance": score, "episodeId": episode["id"]})
    ranked.sort(key=lambda item: (-item["relevance"], item["startSeconds"]))
    return dedupe_snippets(ranked, 4)


def extract_opportunity_snippets(episode: dict[str, Any], segments: list[dict[str, Any]]) -> list[dict[str, Any]]:
    ranked = []
    for segment in segments:
        lowered = segment["text"].lower()
        score = score_segment(segment["text"], OPPORTUNITY_TERMS, ["could", "can", "there is", "nobody", "no one"])
        if any(phrase in lowered for phrase in BAD_PHRASES):
            continue
        if not any(term in lowered for term in OPPORTUNITY_TERMS):
            continue
        if score >= 6:
            ranked.append({**segment, "relevance": score, "episodeId": episode["id"]})
    ranked.sort(key=lambda item: (-item["relevance"], item["startSeconds"]))
    return dedupe_snippets(ranked, 3)


def extract_highlights(segments: list[dict[str, Any]]) -> list[dict[str, Any]]:
    ranked = []
    for segment in segments:
        score = 0
        text = segment["text"].lower()
        if 55 <= len(segment["text"]) <= 180:
            score += 2
        score += sum(1 for term in ["india", "brand", "build", "capital", "founder", "market", "customer", "distribution"] if term in text)
        if score >= 4:
            ranked.append({**segment, "relevance": score})
    ranked.sort(key=lambda item: (-item["relevance"], item["startSeconds"]))
    return dedupe_snippets(ranked, 3)


def detect_resources(
    episode: dict[str, Any],
    searchable_text: str,
    segments: list[dict[str, Any]],
) -> dict[str, dict[str, Any]]:
    mentions: dict[str, dict[str, Any]] = {}
    title_blob = clean_text(f"{episode['title']} {' '.join(episode['guests'])}").lower()
    for resource in RESOURCE_SEEDS:
        aliases = [resource["title"], *resource.get("aliases", [])]
        matched_snippets = []
        title_hit = 0
        for alias in aliases:
            alias_clean = clean_text(alias).lower()
            if not alias_clean:
                continue
            if alias_clean in searchable_text or alias_clean in title_blob:
                if alias_clean in title_blob:
                    title_hit = 1
                for segment in segments:
                    if alias_clean in segment["text"].lower():
                        matched_snippets.append(
                            {
                                "text": segment["text"],
                                "timestamp": segment["timestamp"],
                                "startSeconds": segment["startSeconds"],
                                "episodeId": episode["id"],
                            }
                        )
        mention_count = len(dedupe_snippets(matched_snippets, 999)) + title_hit
        if mention_count:
            mentions[resource["id"]] = {
                "resourceId": resource["id"],
                "mentionCount": mention_count,
                "snippets": dedupe_snippets(matched_snippets, 2),
            }
    return mentions


def compact_summary(episode: dict[str, Any], strategy_snippets: list[dict[str, Any]], opportunity_snippets: list[dict[str, Any]]) -> str:
    del strategy_snippets, opportunity_snippets
    labels = ", ".join(tag.replace("#", "") for tag in episode["tags"][:3])
    return f"Transcript-backed extraction across {labels}."


def aggregate_nodes(episodes: list[dict[str, Any]], resource_index: dict[str, dict[str, Any]]) -> list[dict[str, Any]]:
    episodes_by_id = {episode["id"]: episode for episode in episodes}
    nodes = []
    for seed in TOPIC_SEEDS:
        linked_episodes = [episode for episode in episodes if seed["id"] in episode["topicIds"]]
        creators = sorted({episode["creatorId"] for episode in linked_episodes})
        strategy_pool = dedupe_snippets(
            sorted(
                [snippet for episode in linked_episodes for snippet in episode["strategySnippets"]],
                key=lambda item: (-item["relevance"], item["startSeconds"]),
            ),
            4,
        )
        opportunity_pool = dedupe_snippets(
            sorted(
                [snippet for episode in linked_episodes for snippet in episode["opportunitySnippets"]],
                key=lambda item: (-item["relevance"], item["startSeconds"]),
            ),
            4,
        )
        resource_scores = Counter()
        for episode in linked_episodes:
            for resource_id in episode["resourceIds"]:
                resource_scores[resource_id] += 1
        roadmap_ids = [
            roadmap["id"]
            for roadmap in ROADMAP_RESOURCES
            if seed["id"] in roadmap["topicIds"]
        ]
        resource_ids = [resource_id for resource_id, _ in resource_scores.most_common(6)]
        for roadmap_id in roadmap_ids:
            if roadmap_id not in resource_ids:
                resource_ids.append(roadmap_id)
        node = {
            "id": seed["id"],
            "title": seed["title"],
            "type": seed["type"],
            "summary": seed["summary"],
            "whyItMatters": seed["whyItMatters"],
            "creators": creators,
            "episodes": [episode["id"] for episode in linked_episodes],
            "episodeCount": len(linked_episodes),
            "tags": seed["tags"],
            "x": seed["x"],
            "y": seed["y"],
            "strategies": seed["strategies"],
            "marketGaps": seed["marketGaps"],
            "starterRoadmap": seed["starterRoadmap"],
            "resourceIds": resource_ids,
            "resourceCount": len(resource_ids),
            "evidenceSnippets": strategy_pool[:2] + opportunity_pool[:2],
        }
        node["searchIndex"] = " ".join(
            [
                node["title"],
                node["summary"],
                node["whyItMatters"],
                *node["tags"],
                *node["strategies"],
                *node["marketGaps"],
                *node["starterRoadmap"],
                *(episodes_by_id[episode_id]["title"] for episode_id in node["episodes"]),
                *(resource_index[resource_id]["title"] for resource_id in node["resourceIds"] if resource_id in resource_index),
            ]
        ).lower()
        nodes.append(node)
    return nodes


def aggregate_resources(
    episodes: list[dict[str, Any]],
    topic_lookup: dict[str, dict[str, Any]],
) -> list[dict[str, Any]]:
    resource_meta = {resource["id"]: dict(resource) for resource in RESOURCE_SEEDS}
    for roadmap in ROADMAP_RESOURCES:
        resource_meta[roadmap["id"]] = {
            **roadmap,
            "aliases": [],
        }

    aggregate: dict[str, dict[str, Any]] = {}
    for episode in episodes:
        for mention in episode["resourceMentions"]:
            resource_id = mention["resourceId"]
            meta = resource_meta[resource_id]
            entry = aggregate.setdefault(
                resource_id,
                {
                    "id": resource_id,
                    "title": meta["title"],
                    "type": meta["type"],
                    "subtitle": meta["subtitle"],
                    "url": meta.get("url"),
                    "creators": set(),
                    "topicIds": set(),
                    "episodeIds": set(),
                    "mentionCount": 0,
                    "snippets": [],
                },
            )
            entry["creators"].add(episode["creatorId"])
            entry["topicIds"].update(episode["topicIds"])
            entry["episodeIds"].add(episode["id"])
            entry["mentionCount"] += mention["mentionCount"]
            entry["snippets"].extend(mention["snippets"])

    for roadmap in ROADMAP_RESOURCES:
        entry = aggregate.setdefault(
            roadmap["id"],
            {
                "id": roadmap["id"],
                "title": roadmap["title"],
                "type": roadmap["type"],
                "subtitle": roadmap["subtitle"],
                "url": None,
                "creators": {creator["id"] for creator in CREATORS},
                "topicIds": set(roadmap["topicIds"]),
                "episodeIds": set(),
                "mentionCount": 1,
                "snippets": [],
            },
        )
        entry["topicIds"].update(roadmap["topicIds"])

    result = []
    for entry in aggregate.values():
        snippets = dedupe_snippets(entry["snippets"], 2) if entry["snippets"] else []
        topic_ids = sorted(entry["topicIds"])
        result.append(
            {
                "id": entry["id"],
                "title": entry["title"],
                "type": entry["type"],
                "subtitle": entry["subtitle"],
                "creators": sorted(entry["creators"]),
                "topicIds": topic_ids,
                "episodeIds": sorted(entry["episodeIds"]),
                "mentionCount": entry["mentionCount"],
                "url": entry["url"],
                "snippet": snippets[0]["text"] if snippets else None,
            }
        )
    result.sort(key=lambda item: (-item["mentionCount"], item["title"]))
    return result


def build_resource_families(resources: list[dict[str, Any]]) -> list[dict[str, Any]]:
    slot_map = {
        "book": ("top-left", "Books", "Referenced reading that sharpens decision quality and category thinking."),
        "fund": ("top-right", "Funds", "Capital sources, investor brands, and financing names surfaced across the corpus."),
        "tool": ("left", "Tools", "Actual operating tools and digital rails repeatedly referenced in the conversations."),
        "brand": ("right", "Brands", "Indian companies and case studies worth studying instead of just admiring."),
        "person": ("bottom-left", "People", "Operators, founders, and guests whose episodes anchor the second brain."),
        "roadmap": ("bottom-right", "Build Roadmaps", "Execution paths synthesized from the repeated patterns across the podcasts."),
    }
    families = []
    for resource_type, (slot, title, description) in slot_map.items():
        items = [resource for resource in resources if resource["type"] == resource_type][:10]
        families.append(
            {
                "id": resource_type,
                "title": title,
                "description": description,
                "slot": slot,
                "items": items,
            }
        )
    return families


def build_snapshot(records: list[dict[str, Any]]) -> None:
    SNAPSHOT_PATH.write_text(
        json.dumps(
            {
                "generatedAt": datetime.now(timezone.utc).isoformat(),
                "records": records,
            },
            ensure_ascii=False,
            indent=2,
        )
    )


def build_dataset(episodes: list[dict[str, Any]]) -> dict[str, Any]:
    resource_index = {resource["id"]: resource for resource in aggregate_resources(episodes, {})}
    nodes = aggregate_nodes(episodes, resource_index)
    resources = aggregate_resources(episodes, {node["id"]: node for node in nodes})
    resource_index = {resource["id"]: resource for resource in resources}
    nodes = aggregate_nodes(episodes, resource_index)

    featured_tags = [tag for tag, _ in Counter(tag for episode in episodes for tag in episode["tags"]).most_common(10)]
    deep_extracted = sum(1 for episode in episodes if episode["status"] == "deep-extracted")
    total_resources = len(resources)
    transcript_segments = sum(episode["transcriptSegmentCount"] for episode in episodes)
    signal_count = sum(len(episode["strategySnippets"]) + len(episode["opportunitySnippets"]) for episode in episodes)

    return {
        "meta": {
            "productName": "Project Signal",
            "generatedAt": datetime.now(timezone.utc).isoformat(),
            "indexedEpisodeCount": len(episodes),
            "deepExtractedCount": deep_extracted,
            "nodeCount": len(nodes),
            "connectionCount": len(CONNECTIONS),
            "resourceCount": total_resources,
            "creatorCount": len(CREATORS),
            "transcriptSegmentCount": transcript_segments,
            "signalCount": signal_count,
        },
        "creators": CREATORS,
        "filters": {
            "featuredTags": featured_tags,
        },
        "neuralMap": {
            "nodes": nodes,
            "connections": [
                {"from": from_id, "to": to_id, "strength": strength, "note": note}
                for from_id, to_id, strength, note in CONNECTIONS
            ],
        },
        "resourceFamilies": build_resource_families(resources),
        "sourceCatalog": episodes,
        "outreach": OUTREACH,
    }


def main() -> None:
    ensure_dirs()
    snapshot_records = []
    processed_episodes = []
    for seed in EPISODES:
        json3_path, status_detail = fetch_subtitles(seed)
        if not json3_path:
            episode = {
                **seed,
                "sourceUrl": f"https://www.youtube.com/watch?v={seed['videoId']}",
                "status": "indexed",
                "summary": "Transcript unavailable during this refresh.",
                "transcriptSource": "unavailable",
                "transcriptWordCount": 0,
                "transcriptSegmentCount": 0,
                "strategySnippets": [],
                "opportunitySnippets": [],
                "highlightSnippets": [],
                "resourceMentions": [],
                "resourceIds": [],
            }
            processed_episodes.append(episode)
            snapshot_records.append(
                {
                    "episodeId": seed["id"],
                    "creatorId": seed["creatorId"],
                    "videoId": seed["videoId"],
                    "subtitleStatus": status_detail,
                }
            )
            continue

        segments = parse_segments(json3_path)
        segment_count, word_count = build_transcript_files(seed, segments)
        searchable_text = build_searchable_text(seed, segments)
        strategy_snippets = extract_strategy_snippets(seed, segments)
        opportunity_snippets = extract_opportunity_snippets(seed, segments)
        highlight_snippets = extract_highlights(segments)
        resource_mentions = list(detect_resources(seed, searchable_text, segments).values())
        resource_ids = [mention["resourceId"] for mention in sorted(resource_mentions, key=lambda item: (-item["mentionCount"], item["resourceId"]))]
        episode = {
            **seed,
            "sourceUrl": f"https://www.youtube.com/watch?v={seed['videoId']}",
            "status": "deep-extracted",
            "summary": compact_summary(seed, strategy_snippets, opportunity_snippets),
            "transcriptSource": "auto-caption",
            "transcriptWordCount": word_count,
            "transcriptSegmentCount": segment_count,
            "strategySnippets": strategy_snippets,
            "opportunitySnippets": opportunity_snippets,
            "highlightSnippets": highlight_snippets,
            "resourceMentions": resource_mentions,
            "resourceIds": resource_ids,
        }
        processed_episodes.append(episode)
        snapshot_records.append(
            {
                "episodeId": seed["id"],
                "creatorId": seed["creatorId"],
                "videoId": seed["videoId"],
                "subtitleStatus": status_detail,
                "transcriptPath": str((TRANSCRIPT_DIR / seed["creatorId"] / seed["id"] / "transcript.json").relative_to(ROOT)),
                "segmentCount": segment_count,
                "wordCount": word_count,
            }
        )

    dataset = build_dataset(processed_episodes)
    GENERATED_PATH.write_text(json.dumps(dataset, ensure_ascii=False, indent=2))
    build_snapshot(snapshot_records)
    print(
        json.dumps(
            {
                "generatedAt": dataset["meta"]["generatedAt"],
                "episodes": dataset["meta"]["indexedEpisodeCount"],
                "deepExtracted": dataset["meta"]["deepExtractedCount"],
                "resources": dataset["meta"]["resourceCount"],
                "signals": dataset["meta"]["signalCount"],
            },
            indent=2,
        )
    )


if __name__ == "__main__":
    main()
