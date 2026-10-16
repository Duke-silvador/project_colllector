// Full-length playback through the listener's own Apple Music subscription
// (MusicKit on the Web v3). Both radio players use it when musickit.json (a developer
// token from scripts/musickit_token.py) is published next to them and the listener has
// signed in; otherwise they keep playing Apple's 30-second previews.
// Playback states (playbackStateDidChange e.state): 5 = ended, 10 = completed.
(function () {
  const AM = { ready: false, music: null, active: false, onEnded: null, onTime: null };
  let playToken = 0, endedFor = -1;
  globalThis.AM = AM;

  AM.load = async function () {
    let token = null;
    try { token = (await (await fetch("musickit.json", { cache: "no-cache" })).json()).token; } catch (e) { return false; }
    if (!token) return false;
    try {
      await new Promise((resolve, reject) => {
        if (globalThis.MusicKit) return resolve();
        document.addEventListener("musickitloaded", resolve, { once: true });
        const s = document.createElement("script");
        s.src = "https://js-cdn.music.apple.com/musickit/v3/musickit.js";
        s.async = true;
        s.onerror = reject;
        document.head.appendChild(s);
      });
      await MusicKit.configure({ developerToken: token, app: { name: "Geo Radio", build: "1.0" } });
      AM.music = MusicKit.getInstance();
    } catch (e) { return false; }
    AM.music.addEventListener("playbackStateDidChange", (e) => {
      // Fire onEnded once per song, whether MusicKit reports "ended" or "completed".
      if ((e.state === 5 || e.state === 10) && AM.active && endedFor !== playToken) {
        endedFor = playToken;
        if (AM.onEnded) AM.onEnded();
      }
    });
    AM.music.addEventListener("playbackTimeDidChange", () => {
      if (AM.onTime) AM.onTime(AM.music.currentPlaybackTime, AM.music.currentPlaybackDuration);
    });
    AM.ready = true;
    return true;
  };

  AM.authorized = () => !!(AM.music && AM.music.isAuthorized);
  AM.signIn = async () => { await AM.music.authorize(); return AM.authorized(); };
  AM.signOut = async () => { try { await AM.music.unauthorize(); } catch (e) {} };
  AM.play = async (id) => {
    playToken += 1;
    AM.active = true;
    await AM.music.setQueue({ song: String(id), startPlaying: true });
  };
  AM.stop = () => { AM.active = false; try { AM.music.stop(); } catch (e) {} };
  AM.toggle = () => { if (!AM.music) return; AM.music.isPlaying ? AM.music.pause() : AM.music.play(); };
  AM.isPlaying = () => !!(AM.music && AM.music.isPlaying);
})();
