#!/usr/bin/env python3
"""
Step 3: Extract intelligence from transcripts using:
  - spaCy NER for entities (people, companies, products)
  - Ollama (local LLM) for deep intelligence extraction (frameworks, strategies, market gaps)
"""
import json
import os
import sys
import re
import requests
import spacy

DATA_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "..", "data")
TRANSCRIPT_DIR = os.path.join(DATA_DIR, "transcripts")
EXTRACTED_DIR = os.path.join(DATA_DIR, "extracted")
os.makedirs(EXTRACTED_DIR, exist_ok=True)

OLLAMA_URL = "http://127.0.0.1:11434/api/generate"
OLLAMA_MODEL = "llama3.1:8b"

# Load spaCy
print("Loading spaCy model...")
nlp = spacy.load("en_core_web_sm")

def ollama_generate(prompt, max_tokens=2000):
    """Call local Ollama for intelligence extraction."""
    try:
        resp = requests.post(OLLAMA_URL, json={
            "model": OLLAMA_MODEL,
            "prompt": prompt,
            "stream": False,
            "options": {
                "num_predict": max_tokens,
                "temperature": 0.3,  # Low temperature for factual extraction
            }
        }, timeout=120)
        
        if resp.status_code == 200:
            return resp.json().get("response", "")
        return ""
    except Exception as e:
        print(f"      ⚠️ Ollama error: {e}")
        return ""

def extract_entities(text):
    """Use spaCy NER to extract named entities."""
    # Process in chunks (spaCy has memory limits)
    chunk_size = 100000
    all_entities = {"PERSON": set(), "ORG": set(), "PRODUCT": set(), "MONEY": set(), "GPE": set()}
    
    for i in range(0, len(text), chunk_size):
        chunk = text[i:i+chunk_size]
        doc = nlp(chunk)
        for ent in doc.ents:
            if ent.label_ in all_entities:
                cleaned = ent.text.strip()
                if len(cleaned) > 1 and not cleaned.isdigit():
                    all_entities[ent.label_].add(cleaned)
    
    return {k: sorted(list(v)) for k, v in all_entities.items()}

def extract_intelligence_with_llm(title, text_sample):
    """Use Ollama to extract structured intelligence from transcript."""
    
    # Truncate to ~6000 words for context window
    words = text_sample.split()
    if len(words) > 6000:
        # Take first 2000 + middle 2000 + last 2000
        sample = " ".join(words[:2000]) + " [...] " + " ".join(words[len(words)//2 - 1000:len(words)//2 + 1000]) + " [...] " + " ".join(words[-2000:])
    else:
        sample = text_sample
    
    prompt = f"""You are analyzing a podcast transcript. Extract ONLY information that is explicitly stated or clearly implied in the transcript. Do NOT invent or hallucinate any information.

PODCAST TITLE: {title}

TRANSCRIPT (excerpts):
{sample}

Extract the following in JSON format. For each field, only include information that is DIRECTLY from the transcript:

{{
  "category": "one word: the main topic/industry discussed (e.g., D2C, Health, AI, Capital, Content, Gaming, EV, Education, Founders, Consumer, Hospitality, RealEstate, Climate)",
  "guests": ["list of guest names mentioned as being on the show"],
  "key_insights": ["3-5 specific, actionable insights or advice given in the discussion"],
  "market_gaps": ["1-3 specific market opportunities or gaps identified"],
  "companies_discussed": ["companies, brands, or startups discussed with context"],
  "books_mentioned": ["any books, reports, or publications mentioned"],
  "tools_mentioned": ["any specific tools, platforms, or apps mentioned"],
  "strategies": ["2-4 specific business strategies or frameworks discussed"],
  "quotable_moments": ["1-2 memorable or impactful quotes from the discussion"],
  "target_audience": "who would benefit most from this episode"
}}

IMPORTANT: Only include information from the transcript. If something isn't mentioned, use an empty array []. Be specific and factual."""

    response = ollama_generate(prompt, max_tokens=2000)
    
    # Parse JSON from response
    try:
        # Find JSON block in response
        json_match = re.search(r'\{[\s\S]*\}', response)
        if json_match:
            return json.loads(json_match.group())
    except json.JSONDecodeError:
        pass
    
    return None

def process_episode(video_id, title):
    """Full extraction pipeline for one episode."""
    transcript_path = os.path.join(TRANSCRIPT_DIR, f"{video_id}.json")
    output_path = os.path.join(EXTRACTED_DIR, f"{video_id}.json")
    
    # Skip if already extracted
    if os.path.exists(output_path):
        return json.load(open(output_path))
    
    if not os.path.exists(transcript_path):
        return None
    
    with open(transcript_path, "r") as f:
        transcript = json.load(f)
    
    text = transcript.get("full_text", "")
    if len(text) < 500:
        return None
    
    # Step 1: spaCy NER
    print(f"      NER extraction...")
    entities = extract_entities(text)
    
    # Step 2: LLM intelligence
    print(f"      LLM intelligence extraction...")
    intelligence = extract_intelligence_with_llm(title, text)
    
    if not intelligence:
        intelligence = {
            "category": "General",
            "guests": [],
            "key_insights": [],
            "market_gaps": [],
            "companies_discussed": [],
            "books_mentioned": [],
            "tools_mentioned": [],
            "strategies": [],
            "quotable_moments": [],
            "target_audience": "founders and entrepreneurs",
        }
    
    result = {
        "video_id": video_id,
        "title": title,
        "word_count": transcript.get("word_count", 0),
        "entities": entities,
        "intelligence": intelligence,
        "extraction_method": "spacy+ollama",
    }
    
    with open(output_path, "w") as f:
        json.dump(result, f, indent=2)
    
    return result

def main():
    # Load discovered episodes
    episodes_path = os.path.join(DATA_DIR, "discovered_episodes.json")
    if not os.path.exists(episodes_path):
        print("❌ Run 01_discover.py first!")
        sys.exit(1)
    
    with open(episodes_path, "r") as f:
        episodes = json.load(f)
    
    # Filter to episodes that have transcripts
    episodes_with_transcripts = []
    for ep in episodes:
        tp = os.path.join(TRANSCRIPT_DIR, f"{ep['video_id']}.json")
        if os.path.exists(tp):
            episodes_with_transcripts.append(ep)
    
    print(f"🧠 Extracting intelligence from {len(episodes_with_transcripts)} episodes...")
    print(f"   Using Ollama model: {OLLAMA_MODEL}")
    print(f"   Using spaCy for NER")
    
    success = 0
    
    for i, ep in enumerate(episodes_with_transcripts):
        out_path = os.path.join(EXTRACTED_DIR, f"{ep['video_id']}.json")
        if os.path.exists(out_path):
            print(f"   [{i+1}/{len(episodes_with_transcripts)}] {ep['title'][:50]}... (cached)")
            success += 1
            continue
        
        print(f"   [{i+1}/{len(episodes_with_transcripts)}] {ep['title'][:50]}...")
        
        result = process_episode(ep["video_id"], ep["title"])
        if result:
            success += 1
            guests = result.get("intelligence", {}).get("guests", [])
            insights = result.get("intelligence", {}).get("key_insights", [])
            print(f"      ✅ {len(guests)} guests, {len(insights)} insights, {result.get('word_count', 0)} words")
        else:
            print(f"      ❌ Extraction failed")
    
    print(f"\n✅ Intelligence extraction complete: {success}/{len(episodes_with_transcripts)} episodes")

if __name__ == "__main__":
    main()
