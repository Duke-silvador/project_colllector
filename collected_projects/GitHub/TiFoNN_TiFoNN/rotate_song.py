import json
import random
import re
import urllib.parse
from pathlib import Path

def main():
    repo_dir = Path(__file__).parent
    songs_file = repo_dir / "songs.json"
    readme_file = repo_dir / "readme.md"
    if not readme_file.exists():
        readme_file = repo_dir / "README.md"

    if not songs_file.exists() or not readme_file.exists():
        print("songs.json or readme.md not found.")
        return

    with open(songs_file, "r", encoding="utf-8") as f:
        songs = json.load(f)

    if not songs:
        print("No songs found in songs.json")
        return

    song = random.choice(songs)
    track = song.get("track", "")
    artist = song.get("artist", "")
    album = song.get("album", "")
    image = song.get("image", "")

    search_query = urllib.parse.quote(f"{track} {artist}")
    spotify_url = f"https://open.spotify.com/search/{search_query}"
    youtube_url = f"https://music.youtube.com/search?q={search_query}"

    new_card = f"""<!-- SONG_START -->
  <table border="0">
    <tr>
      <td align="center" width="180" valign="middle">
        <img src="{image}" width="170" height="170" style="border-radius: 14px; border: 2px solid #E60012;" alt="{artist} - {album}" />
      </td>
      <td valign="middle" align="left">
        <h2>{track}</h2>
        <p>
          <b>Artist / Band:</b> {artist} <br/>
          <b>Album:</b> {album}
        </p>
        <img src="https://raw.githubusercontent.com/DenverCoder1/DenverCoder1/master/assets/equalizer.gif" width="35" height="18" alt="Equalizer" />
        &nbsp;&nbsp;
        <a href="{spotify_url}" target="_blank">
          <img src="https://img.shields.io/badge/Spotify-1DB954?style=for-the-badge&logo=spotify&logoColor=white" height="26" alt="Spotify" />
        </a>
        &nbsp;
        <a href="{youtube_url}" target="_blank">
          <img src="https://img.shields.io/badge/YouTube_Music-FF0000?style=for-the-badge&logo=youtubemusic&logoColor=white" height="26" alt="YouTube Music" />
        </a>
      </td>
    </tr>
  </table>
  <!-- SONG_END -->"""

    with open(readme_file, "r", encoding="utf-8") as f:
        content = f.read()

    pattern = r"<!-- SONG_START -->.*?<!-- SONG_END -->"
    if re.search(pattern, content, flags=re.DOTALL):
        updated_content = re.sub(pattern, new_card, content, flags=re.DOTALL)
        with open(readme_file, "w", encoding="utf-8") as f:
            f.write(updated_content)
        print(f"Updated song to: {track} by {artist}")
    else:
        print("Pattern <!-- SONG_START -->...<!-- SONG_END --> not found in readme.md")

if __name__ == "__main__":
    main()
