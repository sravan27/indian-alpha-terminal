#!/usr/bin/env python3
"""
Step 2: Extract transcripts from YouTube using youtube-transcript-api.
Falls back to yt-dlp subtitles if needed.
"""
import json
import os
import sys
import time

DATA_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "..", "data")
TRANSCRIPT_DIR = os.path.join(DATA_DIR, "transcripts")
os.makedirs(TRANSCRIPT_DIR, exist_ok=True)

def extract_transcript(video_id, title):
    """Extract transcript using youtube-transcript-api."""
    try:
        from youtube_transcript_api import YouTubeTranscriptApi
        
        ytt_api = YouTubeTranscriptApi()
        transcript = ytt_api.fetch(video_id, languages=["en", "en-IN", "hi"])
        
        # Convert to our format
        chunks = []
        full_text = []
        for entry in transcript.snippets:
            chunks.append({
                "start": round(entry.start, 1),
                "duration": round(entry.duration, 1),
                "text": entry.text,
            })
            full_text.append(entry.text)
        
        return {
            "video_id": video_id,
            "title": title,
            "chunks": chunks,
            "full_text": " ".join(full_text),
            "word_count": len(" ".join(full_text).split()),
            "method": "youtube-transcript-api",
        }
    except Exception as e:
        print(f"      ⚠️ Transcript API failed: {e}")
        return try_ytdlp_fallback(video_id, title)

def try_ytdlp_fallback(video_id, title):
    """Fallback: use yt-dlp to download auto-generated subtitles."""
    import subprocess
    import tempfile
    
    try:
        with tempfile.TemporaryDirectory() as tmpdir:
            cmd = [
                sys.executable, "-m", "yt_dlp",
                "--write-auto-sub",
                "--sub-lang", "en",
                "--skip-download",
                "--sub-format", "json3",
                "-o", os.path.join(tmpdir, "%(id)s.%(ext)s"),
                f"https://www.youtube.com/watch?v={video_id}",
            ]
            subprocess.run(cmd, capture_output=True, timeout=60)
            
            # Find the subtitle file
            for f in os.listdir(tmpdir):
                if f.endswith(".json3") or f.endswith(".json"):
                    with open(os.path.join(tmpdir, f), "r") as fh:
                        sub_data = json.load(fh)
                    
                    chunks = []
                    full_text = []
                    for event in sub_data.get("events", []):
                        text = ""
                        for seg in event.get("segs", []):
                            text += seg.get("utf8", "")
                        if text.strip():
                            chunks.append({
                                "start": event.get("tStartMs", 0) / 1000,
                                "duration": event.get("dDurationMs", 0) / 1000,
                                "text": text.strip(),
                            })
                            full_text.append(text.strip())
                    
                    return {
                        "video_id": video_id,
                        "title": title,
                        "chunks": chunks,
                        "full_text": " ".join(full_text),
                        "word_count": len(" ".join(full_text).split()),
                        "method": "yt-dlp-autosub",
                    }
        
        return None
    except Exception as e:
        print(f"      ❌ yt-dlp fallback also failed: {e}")
        return None

def main():
    # Load discovered episodes
    episodes_path = os.path.join(DATA_DIR, "discovered_episodes.json")
    if not os.path.exists(episodes_path):
        print("❌ Run 01_discover.py first!")
        sys.exit(1)
    
    with open(episodes_path, "r") as f:
        episodes = json.load(f)
    
    print(f"📝 Extracting transcripts for {len(episodes)} episodes...")
    
    success = 0
    failed = 0
    skipped = 0
    
    for i, ep in enumerate(episodes):
        vid = ep["video_id"]
        out_path = os.path.join(TRANSCRIPT_DIR, f"{vid}.json")
        
        # Skip if already extracted
        if os.path.exists(out_path):
            skipped += 1
            continue
        
        print(f"   [{i+1}/{len(episodes)}] {ep['title'][:60]}...")
        
        transcript = extract_transcript(vid, ep["title"])
        
        if transcript and transcript.get("word_count", 0) > 100:
            with open(out_path, "w") as f:
                json.dump(transcript, f, indent=2)
            print(f"      ✅ {transcript['word_count']} words ({transcript['method']})")
            success += 1
        else:
            print(f"      ❌ Failed or too short")
            failed += 1
        
        # Rate limit
        time.sleep(1)
    
    print(f"\n✅ Transcription complete:")
    print(f"   Success: {success}")
    print(f"   Failed: {failed}")
    print(f"   Skipped (cached): {skipped}")

if __name__ == "__main__":
    main()
