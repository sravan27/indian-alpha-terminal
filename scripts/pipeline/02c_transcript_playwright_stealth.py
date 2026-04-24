#!/usr/bin/env python3
"""
Step 2c: Playwright Stealth Extractor
Bypasses YouTube API rate limits by utilizing a headless Chromium instance to 
visually interact with the DOM and extract transcripts like a human user.
"""
import json
import os
import time
from playwright.sync_api import sync_playwright

DATA_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "..", "data")
TRANSCRIPT_DIR = os.path.join(DATA_DIR, "transcripts")
os.makedirs(TRANSCRIPT_DIR, exist_ok=True)

def extract_transcript(page, video_id, title):
    try:
        page.goto(f"https://www.youtube.com/watch?v={video_id}", wait_until="domcontentloaded")
        time.sleep(3) # Wait for page structure
        
        # 1. Handle consent dialog if in EU/uk
        try:
            reject_all = page.query_selector('button[aria-label="Reject all"]')
            if reject_all:
                reject_all.click()
                time.sleep(1)
        except Exception:
            pass

        # 2. Click "More" on the description
        try:
            # YouTube description expander
            more_btn = page.query_selector('#description-inline-expander')
            if more_btn:
                more_btn.click()
                time.sleep(2)
        except Exception:
            print("   [!] Could not expand description")

        # 3. Click "Show transcript" button
        try:
            # Sometimes it's a primary button, sometimes inside structured description
            buttons = page.query_selector_all('button')
            transcript_clicked = False
            for btn in buttons:
                aria = btn.get_attribute("aria-label")
                if aria and "transcript" in aria.lower():
                    btn.click()
                    transcript_clicked = True
                    break
            
            if not transcript_clicked:
                # Fallback to text match
                for btn in buttons:
                    if btn.inner_text() and "Show transcript" in btn.inner_text():
                        btn.click()
                        transcript_clicked = True
                        break

            if not transcript_clicked:
                return None
                
            time.sleep(3) # Yield for transcript panel to load
        except Exception as e:
            return None

        # 4. Read the transcript segments
        try:
            segments = page.query_selector_all('ytd-transcript-segment-renderer .segment-text')
            if not segments:
                # Try fallback selector
                segments = page.query_selector_all('ytd-transcript-segment-renderer yt-formatted-string')
                
            if not segments:
                return None
                
            full_text = []
            for s in segments:
                text = s.inner_text().strip()
                if text:
                    full_text.append(text)
            
            joined = " ".join(full_text)
            if len(joined) < 500:
                return None
                
            return {
                "video_id": video_id,
                "title": title,
                "full_text": joined,
                "word_count": len(joined.split()),
                "method": "playwright-stealth",
            }
        except Exception as e:
            return None

    except Exception as e:
        print(f"Exception on {video_id}: {e}")
        return None

def main():
    discovered_path = os.path.join(DATA_DIR, "discovered_episodes.json")
    if not os.path.exists(discovered_path):
        print("❌ Run 01_discover.py first!")
        return

    with open(discovered_path, "r") as f:
        discovered = json.load(f)
    
    have = set(f.replace('.json', '') for f in os.listdir(TRANSCRIPT_DIR) if f.endswith('.json'))
    need = [e for e in discovered if e['video_id'] not in have]
    
    print(f"🕵️  Playwright Stealth executing on {len(need)} missing episodes...")
    
    success = 0
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True, args=["--mute-audio"])
        context = browser.new_context(
            user_agent="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            viewport={"width": 1280, "height": 720}
        )
        
        for i, ep in enumerate(need):
            print(f"   [{i+1}/{len(need)}] {ep['title'][:60]}...")
            
            page = context.new_page()
            result = extract_transcript(page, ep['video_id'], ep['title'])
            page.close()
            
            if result:
                out_path = os.path.join(TRANSCRIPT_DIR, f"{ep['video_id']}.json")
                with open(out_path, 'w') as f:
                    json.dump(result, f, indent=2)
                success += 1
                print(f"      ✅ Success: {result['word_count']} words")
            else:
                print(f"      ❌ Failed to locate DOM selectors")
                
            time.sleep(2) # Prevent extreme bot-behavior triggers
            
        browser.close()
        
    print(f"\n✅ Acquired {success} / {len(need)} episodes via Playwright Stealth.")

if __name__ == "__main__":
    main()
