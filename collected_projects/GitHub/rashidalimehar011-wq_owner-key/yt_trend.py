import subprocess
import json

def get_youtube_trends():
    print("🎬 Fetching YouTube Trending Videos (Pakistan)...\n")
    
    # yt_dlp ke saath YouTube trending page se data fetch karna
    try:
        # YouTube Trending page ka URL (Pakistan ke liye)
        url = "https://www.youtube.com/feed/trending?gl=PK"
        
        # yt_dlp use karke data fetch karna
        result = subprocess.run(
            ["yt-dlp", "--flat-playlist", "-J", url],
            capture_output=True, text=True, timeout=30
        )
        
        if result.returncode != 0:
            print("❌ Error: YouTube se data nahi aaya")
            print("Pehle yt-dlp install karein: pip install yt-dlp")
            return
        
        data = json.loads(result.stdout)
        videos = data.get("entries", [])[:5]
        
        print(f"{'#':<4}{'Video Title':<50}")
        print("─" * 60)
        
        for i, video in enumerate(videos, 1):
            title = video.get("title", "Unknown")
            if len(title) > 45:
                title = title[:42] + "..."
            print(f"{i:<4}{title}")
        
        print("\n" + "═" * 60)
        print("✅ Live YouTube analysis complete!")
        
    except Exception as e:
        print(f"❌ Error: {e}")
        print("Pehle ye install karein: pip install yt-dlp")

if __name__ == "__main__":
    get_youtube_trends()
