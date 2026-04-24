from playwright.sync_api import sync_playwright
import time

def extract_transcript(video_id):
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        page.goto(f"https://www.youtube.com/watch?v={video_id}")
        
        # Click "More" button to expand description
        try:
            page.wait_for_selector('tp-yt-paper-button#expand', timeout=5000)
            page.click('tp-yt-paper-button#expand')
        except:
            pass
            
        # Click "Show transcript" button
        try:
            page.wait_for_selector('button[aria-label="Show transcript"]', timeout=5000)
            page.click('button[aria-label="Show transcript"]')
        except:
            print("Failed to find show transcript button")
            browser.close()
            return None
            
        # Wait for transcript to load
        try:
            page.wait_for_selector('ytd-transcript-segment-renderer', timeout=5000)
            segments = page.query_selector_all('ytd-transcript-segment-renderer')
            text = " ".join([s.inner_text().replace('\n', ' ') for s in segments])
            print(f"✅ Extracted {len(text.split())} words")
            browser.close()
            return text
        except:
            print("Failed to find transcript segments")
            browser.close()
            return None

print("Testing Playwright Extraction...")
extract_transcript("gIhdMxEce0M")
