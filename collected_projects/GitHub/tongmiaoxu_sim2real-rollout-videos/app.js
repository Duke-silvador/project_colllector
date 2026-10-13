(function () {
  "use strict";

  var TASKS = [
    { key: "book_shelving", label: "Book Shelving", episode: "episode_008", checkpoint: "ACT 20k" },
    { key: "pick_shoe", label: "Pick Shoe", episode: "episode_004", checkpoint: "pi0.5 1k" },
    { key: "place_mug", label: "Place Mug", episode: "episode_004", checkpoint: "ACT 20k" },
    { key: "pouring", label: "Pouring", episode: "episode_000", checkpoint: "Diffusion 8k" },
  ];

  // The Pix2Pix variants view uses its own checkpoint/episode per task (videos/pix2pix_tab/).
  var PIX2PIX_TASKS = [
    { key: "book_shelving", label: "Book Shelving", episode: "episode_000", checkpoint: "GR00T 10k" },
    { key: "pick_shoe", label: "Pick Shoe", episode: "episode_003", checkpoint: "Diffusion 4k" },
    { key: "place_mug", label: "Place Mug", episode: "episode_000", checkpoint: "ACT 20k" },
    { key: "pouring", label: "Pouring", episode: "episode_002", checkpoint: "ACT 20k" },
  ];

  var BASELINES = [
    { key: "raw_sim", label: "Raw Sim", sub: "skip-GS MuJoCo render" },
    { key: "kaifeng", label: "Classical", sub: "color alignment" },
    { key: "pix2pix", label: "Pix2Pix", sub: "GAN translation" },
    { key: "turbo", label: "STRIPE", sub: "pix2pix-turbo" },
    { key: "real_world", label: "Real World", sub: "real robot eval" },
  ];

  var PIX2PIX_VARIANTS = [
    { key: "pix2pix_shared", label: "Pix2Pix", sub: "shared UNet, pixel + GAN" },
    { key: "pix2pix_dino", label: "Pix2Pix-DINO", sub: "shared UNet, pixel + GAN + DINOv3" },
    { key: "pix2pix_dino_wo_pixel", label: "Pix2Pix-DINO w/o Pixel", sub: "shared UNet, GAN + DINOv3" },
    { key: "pix2pix_gan_only", label: "Pix2Pix GAN-Only", sub: "shared UNet, GAN only" },
    { key: "real_world", label: "Real World", sub: "real robot eval" },
  ];

  var VIEWS = [
    { key: "baselines", label: "Baselines", columns: BASELINES, tasks: TASKS, root: "videos/" },
    { key: "pix2pix", label: "Pix2Pix variants", columns: PIX2PIX_VARIANTS, tasks: PIX2PIX_TASKS, root: "videos/pix2pix_tab/" },
  ];

  var CAMERAS = [
    { key: "stationary", label: "Stationary cam" },
    { key: "wrist", label: "Wrist cam" },
  ];

  var viewTabsEl = document.getElementById("view-tabs");
  var taskTabsEl = document.getElementById("task-tabs");
  var taskSubEl = document.getElementById("task-sub");
  var gridEl = document.getElementById("video-grid");
  var restartBtn = document.getElementById("restart-btn");

  var currentTaskKey = TASKS[0].key;
  var currentViewKey = VIEWS[0].key;

  function currentView() {
    return VIEWS.filter(function (v) { return v.key === currentViewKey; })[0];
  }

  function currentColumns() {
    return currentView().columns;
  }

  function buildViewTabs() {
    viewTabsEl.innerHTML = "";
    VIEWS.forEach(function (view) {
      var btn = document.createElement("button");
      btn.textContent = view.label;
      btn.className = view.key === currentViewKey ? "active" : "";
      btn.addEventListener("click", function () {
        if (view.key === currentViewKey) return;
        currentViewKey = view.key;
        buildViewTabs();
        buildTabs();
        buildGrid();
      });
      viewTabsEl.appendChild(btn);
    });
  }

  function videoPath(taskKey, baselineKey, cameraKey) {
    return currentView().root + taskKey + "/" + baselineKey + "/" + cameraKey + ".mp4";
  }

  // Per-video "ignore the next event of this kind" flags, set right before we
  // programmatically drive a video from sync code, so its resulting native
  // play/pause/seeking event doesn't re-trigger another sync round (which
  // previously caused a runaway play<->play feedback loop across all 8
  // videos and froze the tab).
  function markIgnore(video, kind) {
    video["_ignore_" + kind] = true;
  }
  function consumeIgnore(video, kind) {
    if (video["_ignore_" + kind]) {
      video["_ignore_" + kind] = false;
      return true;
    }
    return false;
  }

  function buildTabs() {
    taskTabsEl.innerHTML = "";
    currentView().tasks.forEach(function (task) {
      var btn = document.createElement("button");
      btn.textContent = task.label;
      btn.className = task.key === currentTaskKey ? "active" : "";
      btn.addEventListener("click", function () {
        if (task.key === currentTaskKey) return;
        currentTaskKey = task.key;
        buildTabs();
        buildGrid();
      });
      taskTabsEl.appendChild(btn);
    });
  }

  function currentVideos() {
    return Array.prototype.slice.call(gridEl.querySelectorAll("video"));
  }

  function syncFrom(sourceVideo, action) {
    currentVideos().forEach(function (v) {
      if (v === sourceVideo) return;
      try {
        if (action === "seek") {
          markIgnore(v, "seeking");
          v.currentTime = sourceVideo.currentTime;
        } else if (action === "play") {
          if (v.paused) {
            if (Math.abs(v.currentTime - sourceVideo.currentTime) > 0.05) {
              markIgnore(v, "seeking");
              v.currentTime = sourceVideo.currentTime;
            }
            markIgnore(v, "play");
            var p = v.play();
            if (p && p.catch) p.catch(function () { v["_ignore_play"] = false; });
          }
        } else if (action === "pause") {
          if (!v.paused) {
            markIgnore(v, "pause");
            v.pause();
          }
        }
      } catch (e) { /* ignore */ }
    });
  }

  function attachSync(video) {
    video.addEventListener("play", function () {
      if (consumeIgnore(video, "play")) return;
      syncFrom(video, "play");
    });
    video.addEventListener("pause", function () {
      if (consumeIgnore(video, "pause")) return;
      // A shorter clip reaching its own end shouldn't drag the other (still-playing,
      // longer) videos in the row to a stop — let it freeze on its last frame instead.
      if (video.ended) return;
      syncFrom(video, "pause");
    });
    video.addEventListener("seeking", function () {
      if (consumeIgnore(video, "seeking")) return;
      syncFrom(video, "seek");
    });
  }

  function buildGrid() {
    var task = currentView().tasks.filter(function (t) { return t.key === currentTaskKey; })[0];
    taskSubEl.innerHTML =
      "<b>" + task.label + "</b> &mdash; " + task.checkpoint +
      " checkpoint, " + task.episode + ". Sim baselines show the full per-step rollout " +
      "(sim2real translation re-applied to every simulation frame, not just once per " +
      "policy-prediction chunk); Real World is the actual robot eval, same checkpoint and " +
      "same seeded episode as the sim columns.";

    gridEl.innerHTML = "";
    var columns = currentColumns();
    gridEl.style.gridTemplateColumns = "120px repeat(" + columns.length + ", minmax(220px, 1fr))";

    var corner = document.createElement("div");
    corner.className = "grid-corner";
    gridEl.appendChild(corner);

    columns.forEach(function (baseline) {
      var head = document.createElement("div");
      head.className = "col-head";
      head.innerHTML = baseline.label + '<span class="col-sub">' + baseline.sub + "</span>";
      gridEl.appendChild(head);
    });

    CAMERAS.forEach(function (camera) {
      var rowHead = document.createElement("div");
      rowHead.className = "row-head";
      rowHead.textContent = camera.label;
      gridEl.appendChild(rowHead);

      columns.forEach(function (baseline) {
        var cell = document.createElement("div");
        cell.className = "cell";
        var video = document.createElement("video");
        video.src = videoPath(task.key, baseline.key, camera.key);
        video.muted = true;
        video.loop = false;
        video.autoplay = true;
        video.playsInline = true;
        video.controls = true;
        video.preload = "auto";
        attachSync(video);
        cell.appendChild(video);
        gridEl.appendChild(cell);
      });
    });

    // Kick off a synced start once the first video can play.
    var videos = currentVideos();
    if (videos.length) {
      var leader = videos[0];
      var start = function () {
        restartAll();
      };
      if (leader.readyState >= 2) start();
      else leader.addEventListener("loadeddata", start, { once: true });
    }
  }

  function restartAll() {
    currentVideos().forEach(function (v) {
      markIgnore(v, "seeking");
      try { v.currentTime = 0; } catch (e) {}
      markIgnore(v, "play");
      var p = v.play();
      if (p && p.catch) p.catch(function () { v["_ignore_play"] = false; });
    });
  }

  restartBtn.addEventListener("click", restartAll);

  buildViewTabs();
  buildTabs();
  buildGrid();
})();
