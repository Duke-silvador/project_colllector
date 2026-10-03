/* Spotify Mobile Prototype — content.js
 * Entry point. Mounts the custom mobile UI on top of open.spotify.com.
 * Spotify keeps handling playback; we only drive its existing controls
 * through window.SpotMobile.spotify (spotifyAdapter.js).
 */

(function () {
  "use strict";

  var MOUNT_RETRIES = 60;
  var MOUNT_DELAY_MS = 500;

  function getSpotify() {
    return window.SpotMobile && window.SpotMobile.spotify;
  }

  function mount(attempt) {
    attempt = attempt || 0;
    var spotify = getSpotify();
    var factory = window.SpotMobile && window.SpotMobile.createMobilePlayer;

    if (!spotify || !factory) {
      if (attempt < 5) {
        setTimeout(function () {
          mount(attempt + 1);
        }, 300);
      } else {
        console.warn("[spm] adapter/UI scripts not loaded yet.");
      }
      return;
    }

    if (document.getElementById("spm-root")) return; // already mounted (SPA nav)

    try {
      var player = factory(spotify);
      player.mount(document.body);
      console.info("[spm] mobile player mounted.", "build", (spotify && spotify.build) || "?");
    } catch (err) {
      console.warn("[spm] mount failed:", err);
      if (attempt < MOUNT_RETRIES) {
        setTimeout(function () {
          mount(attempt + 1);
        }, MOUNT_DELAY_MS);
      }
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", function () {
      mount(0);
    });
  } else {
    mount(0);
  }

  // Spotify is an SPA: URL changes don't reload content scripts.
  // Re-ensure our UI is still mounted after client-side navigation.
  var lastUrl = location.href;
  setInterval(function () {
    if (location.href !== lastUrl) {
      lastUrl = location.href;
      if (!document.getElementById("spm-root")) mount(0);
    }
  }, 2000);
})();
