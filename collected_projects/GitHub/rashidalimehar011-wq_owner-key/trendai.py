#!/usr/bin/env python3
# ═══════════════════════════════════════════
#     🤖  T R E N D A I  🤖
#     Smart Content Advisor
#     By: Rashid Ali Mehar
#     For: Educational Assignment
# ═══════════════════════════════════════════

import random
from datetime import datetime

BANNER = """
╔═══════════════════════════════════════════╗
║   🤖  T R E N D A I  🤖                   ║
║   Smart Content Advisor                   ║
║   By: Rashid Ali Mehar                    ║
╚═══════════════════════════════════════════╝
"""

# ─── Trend Database (Demo) ───
TRENDS = [
    {"topic": "AI Tools",         "platform": "YouTube",   "votes": 95000, "growth": 85, "type": "Tech"},
    {"topic": "#fyp",             "platform": "TikTok",    "votes": 88000, "growth": 72, "type": "General"},
    {"topic": "Cooking Hacks",    "platform": "Instagram", "votes": 76000, "growth": 68, "type": "Lifestyle"},
    {"topic": "#viral",           "platform": "Instagram", "votes": 72000, "growth": 65, "type": "General"},
    {"topic": "Study Tips",       "platform": "YouTube",   "votes": 68000, "growth": 60, "type": "Education"},
    {"topic": "#shorts",          "platform": "YouTube",   "votes": 65000, "growth": 58, "type": "General"},
    {"topic": "Money Making",     "platform": "YouTube",   "votes": 62000, "growth": 55, "type": "Business"},
    {"topic": "#reels",           "platform": "Instagram", "votes": 58000, "growth": 50, "type": "General"},
    {"topic": "Gaming Clips",     "platform": "TikTok",    "votes": 55000, "growth": 48, "type": "Gaming"},
    {"topic": "Fitness Workout",  "platform": "Instagram", "votes": 52000, "growth": 45, "type": "Health"},
    {"topic": "Tech Reviews",     "platform": "YouTube",   "votes": 48000, "growth": 42, "type": "Tech"},
    {"topic": "Travel Vlogs",     "platform": "YouTube",   "votes": 45000, "growth": 40, "type": "Travel"},
]

# ─── AI Suggestion Engine ───
def ai_suggest(topic, platform):
    """Simple AI-style suggestion based on trend"""
    ideas = {
        "Tech":       f"Make a 60-sec {platform} video: 'Top 5 {topic} you must try in 2025'",
        "Education":  f"Create a carousel post on {platform}: '5 {topic} that actually work'",
        "Lifestyle":  f"Post a before/after reel on {platform} about {topic}",
        "Business":   f"Make a talking-head video on {platform}: 'How I made money with {topic}'",
        "General":    f"Use trending audio + jump cuts on {platform} with {topic}",
        "Gaming":     f"Upload highlight reel on {platform} with {topic}",
        "Health":     f"Post a 30-day challenge reel on {platform} about {topic}",
        "Travel":     f"Make a cinematic vlog on {platform} featuring {topic}",
    }
    return ideas.get(type, f"Create content about {topic} on {platform}")

# ─── Analysis Function ───
def analyze():
    print(BANNER)
    print(f"► Analysis Date: {datetime.now().strftime('%d %B %Y, %I:%M %p')}")
    print("► Scanning social media trends...\n")
    
    # Top 5 trends
    top5 = sorted(TRENDS, key=lambda x: x["votes"], reverse=True)[:5]
    
    print("🔥 TOP 5 TRENDING TOPICS:\n")
    print(f"{'#':<4}{'Topic':<20}{'Platform':<12}{'Votes':<10}{'Growth'}")
    print("─" * 58)
    
    for i, t in enumerate(top5, 1):
        print(f"{i:<4}{t['topic']:<20}{t['platform']:<12}{t['votes']:<10}+{t['growth']}%")
    
    # AI Suggestions
    print("\n" + "═" * 58)
    print("🤖 AI CONTENT SUGGESTIONS:")
    print("═" * 58)
    
    for i, t in enumerate(top5, 1):
        suggestion = ai_suggest(t["topic"], t["platform"])
        print(f"\n{i}. 📌 {t['topic']} ({t['platform']})")
        print(f"   💡 {suggestion}")
    
    # Platform Analysis
    print("\n" + "═" * 58)
    print("📱 PLATFORM PERFORMANCE:")
    print("═" * 58)
    
    platforms = {}
    for t in TRENDS:
        platforms[t["platform"]] = platforms.get(t["platform"], 0) + t["votes"]
    
    for p, v in sorted(platforms.items(), key=lambda x: x[1], reverse=True):
        bar = "█" * (v // 15000)
        print(f"   {p:<12} {bar} {v:,}")
    
    # Best Pick
    print("\n" + "═" * 58)
    print("🏆 BEST CONTENT TO MAKE TODAY:")
    print("═" * 58)
    best = top5[0]
    print(f"\n   🎯 Topic:    {best['topic']}")
    print(f"   📱 Platform: {best['platform']}")
    print(f"   📈 Growth:   +{best['growth']}%")
    print(f"   💡 Idea:     {ai_suggest(best['topic'], best['platform'])}")
    
    print("\n" + "═" * 58)
    print("✅ Analysis Complete!")
    print("═" * 58)

if __name__ == "__main__":
    analyze()

