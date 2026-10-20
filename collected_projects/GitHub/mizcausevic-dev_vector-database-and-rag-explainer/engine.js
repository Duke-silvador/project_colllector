/* Frame-locked schematic player.
   Same frame index always draws the same plate. No clocks, no randomness.
   Motion is opt-in when the visitor prefers reduced motion. */
(function () {
  "use strict";

  var C = {
    bg: "#0B1019",
    metal: "#344257",
    metalHi: "#9aafc4",
    bone: "#e6edf5",
    dim: "#8ea0b3",
    path: "#00E5FF",
    energy: "#FFD166",
    sense: "#9D4EDD",
    ink: "#0B1019"
  };

  function roleColor(role) {
    if (role === "energy") return C.energy;
    if (role === "sense") return C.sense;
    if (role === "path") return C.path;
    return C.metalHi;
  }

  function smooth(t) {
    t = Math.max(0, Math.min(1, t));
    return t * t * (3 - 2 * t);
  }

  function roundRect(ctx, x, y, w, h, r) {
    var rr = Math.max(0, Math.min(r, Math.min(w, h) / 2));
    ctx.beginPath();
    ctx.moveTo(x + rr, y);
    ctx.arcTo(x + w, y, x + w, y + h, rr);
    ctx.arcTo(x + w, y + h, x, y + h, rr);
    ctx.arcTo(x, y + h, x, y, rr);
    ctx.arcTo(x, y, x + w, y, rr);
    ctx.closePath();
  }

  function plate(ctx, w, h, on, accent) {
    roundRect(ctx, -w / 2, -h / 2, w, h, 8);
    var g = ctx.createLinearGradient(-w / 2, -h / 2, w / 2, h / 2);
    g.addColorStop(0, on ? "#41556d" : "#2c3a4c");
    g.addColorStop(1, "#182230");
    ctx.fillStyle = g;
    ctx.fill();
    ctx.lineWidth = on ? 2.4 : 1.6;
    ctx.strokeStyle = on ? accent : C.metalHi;
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(-w / 2 + 8, -h / 2 + 3);
    ctx.lineTo(w / 2 - 10, -h / 2 + 3);
    ctx.strokeStyle = "rgba(255,255,255,.16)";
    ctx.lineWidth = 1;
    ctx.stroke();
  }

  function paintGear(ctx, teeth, phase, on, accent) {
    teeth = Math.max(4, teeth | 0);
    ctx.save();
    ctx.rotate(phase * Math.PI * 2);
    ctx.beginPath();
    var R = 34;
    var r = 26;
    var i;
    for (i = 0; i < teeth; i++) {
      var a0 = (i / teeth) * Math.PI * 2;
      var a1 = ((i + 0.34) / teeth) * Math.PI * 2;
      var a2 = ((i + 0.62) / teeth) * Math.PI * 2;
      var a3 = ((i + 1) / teeth) * Math.PI * 2;
      ctx.lineTo(Math.cos(a0) * r, Math.sin(a0) * r);
      ctx.lineTo(Math.cos(a1) * R, Math.sin(a1) * R);
      ctx.lineTo(Math.cos(a2) * R, Math.sin(a2) * R);
      ctx.lineTo(Math.cos(a3) * r, Math.sin(a3) * r);
    }
    ctx.closePath();
    ctx.fillStyle = on ? "#314256" : "#243140";
    ctx.fill();
    ctx.strokeStyle = on ? accent : "#d5deea";
    ctx.lineWidth = 1.6;
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(0, 0, 9, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(0, 0, 3, 0, Math.PI * 2);
    ctx.fillStyle = accent;
    ctx.fill();
    ctx.restore();
  }

  function paintRotor(ctx, phase, on, accent) {
    ctx.beginPath();
    ctx.arc(0, 0, 36, 0, Math.PI * 2);
    ctx.fillStyle = "#1c2836";
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = on ? accent : C.metalHi;
    ctx.stroke();
    ctx.save();
    ctx.rotate(phase * Math.PI * 2);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.arc(0, 0, 30, -0.7, 0.9);
    ctx.closePath();
    ctx.fillStyle = on ? accent : "#8ea0b5";
    ctx.globalAlpha = 0.9;
    ctx.fill();
    ctx.restore();
    ctx.globalAlpha = 1;
    ctx.beginPath();
    ctx.arc(0, 0, 4, 0, Math.PI * 2);
    ctx.fillStyle = C.bone;
    ctx.fill();
  }

  function paintSpring(ctx, phase, on, accent) {
    plate(ctx, 78, 78, on, accent);
    ctx.beginPath();
    var a;
    for (a = 0; a < Math.PI * 8; a += 0.2) {
      var rr = 6 + a * 1.55 + phase * 2;
      var x = Math.cos(a) * rr * 0.42;
      var y = Math.sin(a) * rr * 0.42;
      if (a === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.strokeStyle = on ? C.energy : C.bone;
    ctx.lineWidth = 1.7;
    ctx.stroke();
  }

  function paintBalance(ctx, phase, on, accent) {
    var swing = Math.sin(phase * Math.PI * 2) * 0.7;
    ctx.save();
    ctx.rotate(swing);
    ctx.beginPath();
    ctx.arc(0, 0, 28, 0, Math.PI * 2);
    ctx.strokeStyle = on ? accent : C.bone;
    ctx.lineWidth = 6;
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(-34, 0);
    ctx.lineTo(34, 0);
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.restore();
    ctx.beginPath();
    var t;
    ctx.strokeStyle = on ? C.sense : C.metalHi;
    ctx.lineWidth = 1.3;
    for (t = 0; t < 5; t++) {
      ctx.beginPath();
      ctx.arc(0, 0, 8 + t * 4.2, 0.4 + swing, 1.4 + swing);
      ctx.stroke();
    }
  }

  function paintHands(ctx, frame, on, accent) {
    plate(ctx, 84, 84, on, accent);
    ctx.beginPath();
    ctx.arc(0, 0, 28, 0, Math.PI * 2);
    ctx.strokeStyle = C.bone;
    ctx.lineWidth = 1.4;
    ctx.stroke();
    var minute = ((frame % 1020) / 1020) * Math.PI * 2;
    var hour = minute / 12;
    ctx.save();
    ctx.rotate(hour - Math.PI / 2);
    ctx.strokeStyle = on ? accent : C.bone;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(-4, 0);
    ctx.lineTo(16, 0);
    ctx.stroke();
    ctx.restore();
    ctx.save();
    ctx.rotate(minute - Math.PI / 2);
    ctx.strokeStyle = C.energy;
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(-6, 0);
    ctx.lineTo(24, 0);
    ctx.stroke();
    ctx.restore();
  }

  function paintBlades(ctx, glyph, phase, on, accent) {
    var n = glyph === "turbine" ? 20 : glyph === "compressor" ? 14 : glyph === "pump" ? 6 : 8;
    var R = glyph === "pump" ? 26 : 34;
    ctx.beginPath();
    ctx.arc(0, 0, R + 8, 0, Math.PI * 2);
    ctx.strokeStyle = on ? accent : C.metalHi;
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.save();
    ctx.rotate(phase * Math.PI * 2 * (glyph === "turbine" ? -1 : 1));
    var i;
    for (i = 0; i < n; i++) {
      ctx.rotate((Math.PI * 2) / n);
      ctx.beginPath();
      ctx.moveTo(6, -2);
      ctx.quadraticCurveTo(R * 0.7, -8, R, 0);
      ctx.quadraticCurveTo(R * 0.7, 5, 6, 2);
      ctx.fillStyle = on ? "rgba(0,229,255,.55)" : "#7f93a8";
      if (glyph === "turbine") ctx.fillStyle = on ? "rgba(255,209,102,.7)" : "#8d7a45";
      ctx.fill();
    }
    ctx.restore();
    ctx.beginPath();
    ctx.arc(0, 0, 6, 0, Math.PI * 2);
    ctx.fillStyle = "#d5deea";
    ctx.fill();
  }

  function paintCan(ctx, glyph, phase, on, accent) {
    plate(ctx, glyph === "chamber" ? 92 : 74, 58, on, accent);
    var x;
    ctx.strokeStyle = on ? C.energy : "#c9a24a";
    ctx.globalAlpha = 0.85;
    ctx.lineWidth = 2;
    for (x = -28; x <= 28; x += 14) {
      ctx.beginPath();
      ctx.moveTo(x, 16);
      ctx.quadraticCurveTo(x + 6 * Math.sin(phase * 6 + x), 0, x, -16);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
    if (glyph === "combustor" || glyph === "chamber" || glyph === "preburner") {
      ctx.font = "10px ui-sans-serif, Segoe UI, sans-serif";
      ctx.fillStyle = C.dim;
      ctx.textAlign = "center";
      ctx.fillText("burn, not detonation", 0, 26);
    }
  }

  function paintBell(ctx, glyph, on, accent) {
    ctx.beginPath();
    ctx.moveTo(-16, -28);
    ctx.lineTo(16, -28);
    ctx.lineTo(34, 30);
    ctx.lineTo(-34, 30);
    ctx.closePath();
    ctx.fillStyle = "#223044";
    ctx.fill();
    ctx.strokeStyle = on ? accent : C.metalHi;
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(-8, -18);
    ctx.lineTo(8, -18);
    ctx.lineTo(18, 22);
    ctx.lineTo(-18, 22);
    ctx.closePath();
    ctx.strokeStyle = C.path;
    ctx.globalAlpha = on ? 0.9 : 0.4;
    ctx.stroke();
    ctx.globalAlpha = 1;
    if (glyph === "cyclone") {
      ctx.beginPath();
      ctx.moveTo(0, -20);
      ctx.bezierCurveTo(16, -8, -16, 8, 0, 24);
      ctx.strokeStyle = C.energy;
      ctx.stroke();
    }
  }

  function paintShaft(ctx, glyph, phase, on, accent) {
    ctx.strokeStyle = on ? accent : C.bone;
    ctx.lineWidth = glyph === "busbar" ? 8 : 4;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(-40, 0);
    ctx.lineTo(40, 0);
    ctx.stroke();
    if (glyph === "cam") {
      ctx.save();
      ctx.translate(Math.sin(phase * Math.PI * 2) * 4, 0);
      ctx.beginPath();
      ctx.ellipse(10, -8, 10, 6, 0.4, 0, Math.PI * 2);
      ctx.fillStyle = C.energy;
      ctx.fill();
      ctx.restore();
    }
    if (glyph === "conveyor") {
      ctx.strokeStyle = C.path;
      ctx.setLineDash([6, 5]);
      ctx.lineDashOffset = -phase * 20;
      ctx.stroke();
      ctx.setLineDash([]);
    }
    ctx.fillStyle = C.metalHi;
    ctx.fillRect(-42, -8, 6, 16);
    ctx.fillRect(36, -8, 6, 16);
  }

  function paintDuct(ctx, glyph, phase, on, accent) {
    roundRect(ctx, -46, -18, 92, 36, 16);
    ctx.fillStyle = "#1a2533";
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = on ? accent : C.metalHi;
    ctx.stroke();
    ctx.save();
    roundRect(ctx, -46, -18, 92, 36, 16);
    ctx.clip();
    var i;
    ctx.fillStyle = on ? "rgba(0,229,255,.35)" : "rgba(158,176,196,.25)";
    for (i = 0; i < 4; i++) {
      var x = -60 + ((phase * 120 + i * 30) % 120);
      ctx.beginPath();
      ctx.ellipse(x, 0, 8, 5, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
    if (glyph === "inlet") {
      ctx.beginPath();
      ctx.moveTo(-30, -18);
      ctx.lineTo(10, -4);
      ctx.strokeStyle = C.energy;
      ctx.stroke();
    }
  }

  function paintOptic(ctx, glyph, phase, on, accent) {
    if (glyph === "wafer" || glyph === "reticle") {
      ctx.beginPath();
      ctx.arc(0, 0, 32, 0, Math.PI * 2);
      ctx.fillStyle = "#243246";
      ctx.fill();
      ctx.strokeStyle = on ? accent : C.bone;
      ctx.lineWidth = 2;
      ctx.stroke();
      var k;
      ctx.strokeStyle = "rgba(0,229,255,.45)";
      for (k = -24; k <= 24; k += 8) {
        ctx.beginPath();
        ctx.moveTo(k, -24);
        ctx.lineTo(k, 24);
        ctx.moveTo(-24, k);
        ctx.lineTo(24, k);
        ctx.stroke();
      }
      return;
    }
    if (glyph === "plasma" || glyph === "photon") {
      ctx.beginPath();
      ctx.arc(0, 0, 10 + Math.sin(phase * Math.PI * 2) * 2, 0, Math.PI * 2);
      ctx.fillStyle = on ? C.energy : "#c9a24a";
      ctx.fill();
      ctx.beginPath();
      ctx.arc(0, 0, 26, phase * 4, phase * 4 + 1.4);
      ctx.strokeStyle = accent;
      ctx.lineWidth = 2;
      ctx.stroke();
      return;
    }
    if (glyph === "laser" || glyph === "lidar") {
      plate(ctx, 78, 28, on, accent);
      ctx.strokeStyle = C.path;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(-10, 0);
      ctx.lineTo(48, 0);
      ctx.stroke();
      return;
    }
    if (glyph === "hex") {
      hex(ctx, 0, 0, 30, on ? accent : C.bone);
      return;
    }
    if (glyph === "splitter" || glyph === "coupler") {
      ctx.strokeStyle = on ? accent : C.bone;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(-36, -16);
      ctx.lineTo(0, 0);
      ctx.lineTo(36, -16);
      ctx.moveTo(0, 0);
      ctx.lineTo(36, 18);
      ctx.stroke();
      ctx.fillStyle = C.energy;
      ctx.fillRect(-4, -4, 8, 8);
      return;
    }
    ctx.beginPath();
    ctx.ellipse(0, 0, 36, 18, -0.4, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(0,229,255,.08)";
    ctx.fill();
    ctx.strokeStyle = on ? accent : C.bone;
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(-40, 8);
    ctx.lineTo(40, -8);
    ctx.strokeStyle = C.path;
    ctx.stroke();
  }

  function hex(ctx, x, y, r, color) {
    ctx.beginPath();
    var i;
    for (i = 0; i < 6; i++) {
      var a = (Math.PI / 3) * i - Math.PI / 6;
      var px = x + Math.cos(a) * r;
      var py = y + Math.sin(a) * r;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.6;
    ctx.stroke();
  }

  function paintStack(ctx, glyph, on, accent) {
    var n = glyph === "nanosheet" || glyph === "film" || glyph === "mli" ? 5 : 4;
    var i;
    for (i = 0; i < n; i++) {
      var y = -28 + i * 14;
      roundRect(ctx, -36, y, 72, 10, 2);
      ctx.fillStyle = i % 2 ? "#31445c" : "#243246";
      ctx.fill();
      ctx.strokeStyle = on && i === 1 ? accent : C.metalHi;
      ctx.stroke();
    }
    if (glyph === "gate" || glyph === "nanosheet") {
      ctx.strokeStyle = C.sense;
      ctx.lineWidth = 2;
      ctx.strokeRect(-42, -32, 84, n * 14 + 8);
    }
  }

  function paintCell(ctx, on, accent) {
    roundRect(ctx, -16, -36, 32, 72, 10);
    ctx.fillStyle = "#243246";
    ctx.fill();
    ctx.strokeStyle = on ? accent : C.metalHi;
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.beginPath();
    var y;
    ctx.strokeStyle = C.energy;
    ctx.lineWidth = 1.2;
    for (y = -24; y <= 24; y += 6) {
      ctx.moveTo(-10, y);
      ctx.lineTo(10, y + 3);
    }
    ctx.stroke();
  }

  function paintCard(ctx, glyph, on, accent) {
    plate(ctx, 86, 54, on, accent);
    var i;
    ctx.strokeStyle = glyph === "bms" || glyph === "telemetry" ? C.sense : C.path;
    ctx.lineWidth = 1.4;
    for (i = 0; i < 4; i++) {
      ctx.beginPath();
      ctx.moveTo(-30, -14 + i * 8);
      ctx.lineTo(20 - (i % 3) * 8, -14 + i * 8);
      ctx.stroke();
    }
    if (glyph === "hsm" || glyph === "policy") {
      ctx.strokeStyle = C.energy;
      ctx.strokeRect(-8, -6, 16, 14);
      ctx.beginPath();
      ctx.arc(0, -6, 6, Math.PI, 0);
      ctx.stroke();
    }
    if (glyph === "inverter") {
      ctx.strokeStyle = C.energy;
      ctx.beginPath();
      ctx.moveTo(-30, 8);
      ctx.lineTo(-10, 8);
      ctx.lineTo(-10, -8);
      ctx.lineTo(10, -8);
      ctx.lineTo(10, 8);
      ctx.lineTo(30, 8);
      ctx.stroke();
    }
  }

  function paintGraph(ctx, on, accent) {
    var pts = [[-30, -18], [0, -28], [28, -8], [-8, 8], [24, 22], [-26, 18]];
    var i;
    ctx.strokeStyle = on ? accent : C.metalHi;
    ctx.lineWidth = 1.3;
    ctx.beginPath();
    ctx.moveTo(pts[0][0], pts[0][1]);
    ctx.lineTo(pts[1][0], pts[1][1]);
    ctx.lineTo(pts[2][0], pts[2][1]);
    ctx.moveTo(pts[1][0], pts[1][1]);
    ctx.lineTo(pts[3][0], pts[3][1]);
    ctx.lineTo(pts[4][0], pts[4][1]);
    ctx.moveTo(pts[3][0], pts[3][1]);
    ctx.lineTo(pts[5][0], pts[5][1]);
    ctx.stroke();
    for (i = 0; i < pts.length; i++) {
      ctx.beginPath();
      ctx.arc(pts[i][0], pts[i][1], i === 1 ? 5 : 3.5, 0, Math.PI * 2);
      ctx.fillStyle = i < 2 ? C.path : C.bone;
      ctx.fill();
    }
  }

  function paintDoc(ctx, glyph, on, accent) {
    plate(ctx, 64, 74, on, accent);
    ctx.fillStyle = glyph === "warning" ? C.energy : C.dim;
    var i;
    for (i = 0; i < 4; i++) {
      ctx.fillRect(-20, -22 + i * 12, 40 - (i === 3 ? 14 : 0), 3);
    }
    if (glyph === "brake" || glyph === "curve") {
      ctx.beginPath();
      ctx.moveTo(-22, 18);
      ctx.quadraticCurveTo(0, 20, 22, -8);
      ctx.strokeStyle = C.energy;
      ctx.lineWidth = 2;
      ctx.stroke();
    }
  }

  function paintLink(ctx, glyph, phase, on, accent) {
    ctx.strokeStyle = on ? accent : C.bone;
    ctx.lineWidth = 6;
    ctx.lineCap = "round";
    var ang = glyph === "swash" ? Math.sin(phase * Math.PI * 2) * 0.3 : 0;
    ctx.save();
    ctx.rotate(ang);
    ctx.beginPath();
    if (glyph === "delta") {
      ctx.moveTo(-30, 24);
      ctx.lineTo(0, -28);
      ctx.lineTo(30, 24);
    } else if (glyph === "finger" || glyph === "probe" || glyph === "needle" || glyph === "afm") {
      ctx.moveTo(0, 30);
      ctx.lineTo(0, -20);
      ctx.lineTo(glyph === "afm" || glyph === "probe" ? 8 : 0, -34);
    } else if (glyph === "jaw") {
      ctx.moveTo(-20, 10);
      ctx.lineTo(0, -10);
      ctx.lineTo(22, 12);
    } else {
      ctx.moveTo(-34, 0);
      ctx.lineTo(34, 0);
    }
    ctx.stroke();
    ctx.restore();
    ctx.fillStyle = on ? C.energy : C.metalHi;
    ctx.beginPath();
    ctx.arc(-20, 0, 5, 0, Math.PI * 2);
    ctx.arc(18, 0, 5, 0, Math.PI * 2);
    ctx.fill();
  }

  function paintBio(ctx, glyph, on, accent) {
    ctx.beginPath();
    ctx.ellipse(0, 0, 34, 24, 0, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(52,66,87,.9)";
    ctx.fill();
    ctx.strokeStyle = on ? accent : C.metalHi;
    ctx.lineWidth = 2;
    ctx.stroke();
    if (glyph === "membrane") {
      ctx.beginPath();
      ctx.ellipse(0, 0, 34, 24, 0.2, 0.4, 2.4);
      ctx.strokeStyle = C.path;
      ctx.stroke();
    } else if (glyph === "ribosome") {
      ctx.beginPath();
      ctx.arc(-6, 2, 10, 0, Math.PI * 2);
      ctx.arc(8, -2, 7, 0, Math.PI * 2);
      ctx.fillStyle = on ? C.energy : "#8d7a45";
      ctx.fill();
    } else if (glyph === "neuron") {
      ctx.beginPath();
      ctx.moveTo(-20, 0);
      ctx.lineTo(0, -8);
      ctx.lineTo(22, 4);
      ctx.strokeStyle = C.sense;
      ctx.stroke();
    } else if (glyph === "protein") {
      ctx.strokeStyle = C.path;
      ctx.beginPath();
      ctx.moveTo(-20, 8);
      ctx.bezierCurveTo(-8, -16, 8, 16, 22, -8);
      ctx.stroke();
    } else {
      ctx.beginPath();
      ctx.arc(0, 0, 8, 0, Math.PI * 2);
      ctx.fillStyle = on ? C.path : C.bone;
      ctx.fill();
    }
  }

  function paintHull(ctx, glyph, on, accent) {
    ctx.beginPath();
    if (glyph === "airframe" || glyph === "plane") {
      ctx.moveTo(-46, 4);
      ctx.lineTo(30, 4);
      ctx.lineTo(46, 0);
      ctx.lineTo(30, -4);
      ctx.lineTo(6, -4);
      ctx.lineTo(-4, -22);
      ctx.lineTo(-14, -4);
      ctx.lineTo(-46, -2);
      ctx.closePath();
    } else if (glyph === "train" || glyph === "locomotive") {
      roundRect(ctx, -40, -16, 80, 32, 6);
    } else if (glyph === "amr") {
      roundRect(ctx, -28, -22, 56, 40, 8);
    } else if (glyph === "chassis") {
      roundRect(ctx, -42, -16, 84, 32, 4);
    } else {
      ctx.moveTo(-44, -8);
      ctx.lineTo(36, -8);
      ctx.quadraticCurveTo(48, 0, 36, 16);
      ctx.lineTo(-44, 16);
      ctx.quadraticCurveTo(-52, 4, -44, -8);
    }
    ctx.fillStyle = "#1c2836";
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = on ? accent : C.metalHi;
    ctx.stroke();
  }

  function paintRing(ctx, glyph, phase, on, accent) {
    ctx.beginPath();
    ctx.arc(0, 0, 30, 0, Math.PI * 2);
    ctx.strokeStyle = on ? accent : C.metalHi;
    ctx.lineWidth = 6;
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(0, 0, 30, phase * Math.PI * 2, phase * Math.PI * 2 + 0.8);
    ctx.strokeStyle = C.path;
    ctx.lineWidth = 3;
    ctx.stroke();
    if (glyph === "gantry" || glyph === "detector" || glyph === "ct") {
      ctx.fillStyle = C.energy;
      ctx.fillRect(22, -4, 10, 8);
      ctx.fillStyle = C.sense;
      ctx.fillRect(-32, -4, 8, 8);
    }
    if (glyph === "gimbal") {
      ctx.strokeStyle = C.energy;
      ctx.lineWidth = 2;
      ctx.strokeRect(-16, -16, 32, 32);
    }
  }

  function paintColumn(ctx, glyph, phase, on, accent) {
    roundRect(ctx, -22, -40, 44, 80, 8);
    ctx.fillStyle = "#1d2938";
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = on ? accent : C.metalHi;
    ctx.stroke();
    var i;
    ctx.strokeStyle = C.path;
    ctx.globalAlpha = 0.8;
    for (i = 0; i < 5; i++) {
      var y = -26 + i * 12;
      ctx.beginPath();
      ctx.moveTo(-14, y);
      ctx.bezierCurveTo(0, y + 6 * Math.sin(phase * 6 + i), 8, y - 4, 14, y);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
    if (glyph === "boiler" || glyph === "tank") {
      ctx.fillStyle = "rgba(255,209,102,.25)";
      ctx.fillRect(-14, 8, 28, 22);
    }
    if (glyph === "distill" || glyph === "tray") {
      ctx.strokeStyle = C.energy;
      ctx.strokeRect(-16, -30, 32, 60);
    }
  }

  function paintLattice(ctx, glyph, phase, on, accent) {
    var s = 16;
    var i, j;
    ctx.strokeStyle = on ? accent : C.bone;
    ctx.lineWidth = 1.6;
    for (j = 0; j < 3; j++) {
      for (i = 0; i < 3; i++) {
        var x = (i - 1) * s * 1.6;
        var y = (j - 1) * s * 1.3;
        var bow = glyph === "auxetic" ? (phase > 0.5 ? 6 : 0) : 0;
        ctx.strokeRect(x - 6, y - 5 - bow * 0.1, 12, 10);
        if (i < 2) {
          ctx.beginPath();
          ctx.moveTo(x + 6, y);
          ctx.lineTo(x + s * 1.6 - 6, y);
          ctx.stroke();
        }
      }
    }
    if (glyph === "srr") {
      ctx.beginPath();
      ctx.arc(0, 0, 18, 0.4, 5.4);
      ctx.strokeStyle = C.energy;
      ctx.lineWidth = 2;
      ctx.stroke();
    }
  }

  function paintCoil(ctx, glyph, phase, on, accent) {
    ctx.strokeStyle = on ? accent : C.bone;
    ctx.lineWidth = 2;
    var i;
    ctx.beginPath();
    for (i = 0; i < 28; i++) {
      var a = i / 4 + phase * 2;
      var x = -32 + i * 2.3;
      var y = Math.sin(a) * 14;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
    if (glyph === "qubit" || glyph === "transmon") {
      ctx.strokeStyle = C.sense;
      ctx.strokeRect(-10, -16, 20, 32);
    }
  }

  function paintPipe(ctx, glyph, phase, on, accent) {
    ctx.lineCap = "round";
    ctx.strokeStyle = "#314256";
    ctx.lineWidth = glyph === "tendon" || glyph === "nanowire" ? 3 : 10;
    ctx.beginPath();
    ctx.moveTo(-40, 10);
    ctx.bezierCurveTo(-10, 10, 10, -16, 40, -10);
    ctx.stroke();
    ctx.strokeStyle = on ? accent : C.path;
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 7]);
    ctx.lineDashOffset = -phase * 24;
    ctx.stroke();
    ctx.setLineDash([]);
  }

  function paintValve(ctx, phase, on, accent) {
    ctx.strokeStyle = on ? accent : C.bone;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-36, 0);
    ctx.lineTo(-12, 0);
    ctx.moveTo(12, 0);
    ctx.lineTo(36, 0);
    ctx.moveTo(-12, -12);
    ctx.lineTo(12, 12);
    ctx.moveTo(-12, 12);
    ctx.lineTo(12, -12);
    ctx.stroke();
    ctx.save();
    ctx.rotate(phase * 1.2);
    ctx.fillStyle = C.energy;
    ctx.fillRect(-2, -16, 4, 16);
    ctx.restore();
  }

  function paintArray(ctx, glyph, on, accent) {
    var i, j;
    for (j = 0; j < 4; j++) {
      for (i = 0; i < 4; i++) {
        ctx.beginPath();
        ctx.arc(-22 + i * 15, -22 + j * 15, glyph === "shank" ? 2 : 3.2, 0, Math.PI * 2);
        ctx.fillStyle = (i + j) % 3 === 0 && on ? accent : "#9fb0c2";
        ctx.fill();
      }
    }
    if (glyph === "antenna" || glyph === "mimo") {
      ctx.strokeStyle = C.path;
      ctx.strokeRect(-30, -30, 60, 60);
    }
  }

  function paintExchanger(ctx, on, accent) {
    var i;
    for (i = 0; i < 6; i++) {
      ctx.fillStyle = i % 2 ? "#31445c" : "#243246";
      ctx.fillRect(-34, -30 + i * 10, 68, 7);
    }
    ctx.strokeStyle = on ? accent : C.metalHi;
    ctx.lineWidth = 1.6;
    ctx.strokeRect(-36, -32, 72, 64);
    ctx.strokeStyle = C.energy;
    ctx.beginPath();
    ctx.moveTo(-42, 20);
    ctx.lineTo(-34, 20);
    ctx.moveTo(34, -20);
    ctx.lineTo(42, -20);
    ctx.stroke();
    ctx.strokeStyle = C.path;
    ctx.beginPath();
    ctx.moveTo(-42, -20);
    ctx.lineTo(-34, -20);
    ctx.moveTo(34, 20);
    ctx.lineTo(42, 20);
    ctx.stroke();
  }

  var PAINT = {
    gear: function (c, f, g, on, a) { paintGear(c, g === "pallet" ? 8 : 14, f, on, a); },
    pallet: function (c, f, g, on, a) { paintGear(c, 8, f, on, a); },
    rotor: function (c, f, g, on, a) { paintRotor(c, f, on, a); },
    spring: function (c, f, g, on, a) { paintSpring(c, f, on, a); },
    barrel: function (c, f, g, on, a) { paintSpring(c, f, on, a); },
    balance: function (c, f, g, on, a) { paintBalance(c, f, on, a); },
    hands: function (c, f, g, on, a) { paintHands(c, f * 90, on, a); },
    plate: function (c, f, g, on, a) { plate(c, 84, 52, on, a); },
    bridge: function (c, f, g, on, a) { plate(c, 96, 36, on, a); },
    blades: paintBladesFamily,
    fan: paintBladesFamily,
    turbine: paintBladesFamily,
    compressor: paintBladesFamily,
    pump: paintBladesFamily,
    can: function (c, f, g, on, a) { paintCan(c, g, f, on, a); },
    combustor: function (c, f, g, on, a) { paintCan(c, "combustor", f, on, a); },
    chamber: function (c, f, g, on, a) { paintCan(c, "chamber", f, on, a); },
    preburner: function (c, f, g, on, a) { paintCan(c, "preburner", f, on, a); },
    bell: function (c, f, g, on, a) { paintBell(c, g, on, a); },
    nozzle: function (c, f, g, on, a) { paintBell(c, g, on, a); },
    cyclone: function (c, f, g, on, a) { paintBell(c, "cyclone", on, a); },
    shaft: function (c, f, g, on, a) { paintShaft(c, g, f, on, a); },
    cam: function (c, f, g, on, a) { paintShaft(c, "cam", f, on, a); },
    busbar: function (c, f, g, on, a) { paintShaft(c, "busbar", f, on, a); },
    conveyor: function (c, f, g, on, a) { paintShaft(c, "conveyor", f, on, a); },
    axle: function (c, f, g, on, a) { paintShaft(c, g, f, on, a); },
    duct: function (c, f, g, on, a) { paintDuct(c, g, f, on, a); },
    inlet: function (c, f, g, on, a) { paintDuct(c, "inlet", f, on, a); },
    optic: paintOpticFamily,
    mirror: paintOpticFamily,
    laser: paintOpticFamily,
    lidar: paintOpticFamily,
    wafer: paintOpticFamily,
    reticle: paintOpticFamily,
    plasma: paintOpticFamily,
    photon: paintOpticFamily,
    hex: paintOpticFamily,
    splitter: paintOpticFamily,
    coupler: paintOpticFamily,
    stack: function (c, f, g, on, a) { paintStack(c, g, on, a); },
    nanosheet: function (c, f, g, on, a) { paintStack(c, "nanosheet", on, a); },
    film: function (c, f, g, on, a) { paintStack(c, "film", on, a); },
    mli: function (c, f, g, on, a) { paintStack(c, "mli", on, a); },
    gate: function (c, f, g, on, a) { paintStack(c, "gate", on, a); },
    module: function (c, f, g, on, a) { paintStack(c, g, on, a); },
    cell: function (c, f, g, on, a) { paintCell(c, on, a); },
    card: paintCardFamily,
    bms: paintCardFamily,
    hsm: paintCardFamily,
    policy: paintCardFamily,
    inverter: paintCardFamily,
    telemetry: paintCardFamily,
    ethernet: paintCardFamily,
    chip: paintCardFamily,
    processor: paintCardFamily,
    graph: function (c, f, g, on, a) { paintGraph(c, on, a); },
    doc: paintDocFamily,
    prompt: paintDocFamily,
    certificate: paintDocFamily,
    warning: paintDocFamily,
    brake: paintDocFamily,
    curve: paintDocFamily,
    audit: paintDocFamily,
    authority: paintDocFamily,
    link: paintLinkFamily,
    tendon: paintLinkFamily,
    wrist: paintLinkFamily,
    jaw: paintLinkFamily,
    probe: paintLinkFamily,
    afm: paintLinkFamily,
    needle: paintLinkFamily,
    finger: paintLinkFamily,
    delta: paintLinkFamily,
    joint: paintLinkFamily,
    actuator: paintLinkFamily,
    swash: paintLinkFamily,
    bio: paintBioFamily,
    vesicle: paintBioFamily,
    membrane: paintBioFamily,
    ribosome: paintBioFamily,
    protein: paintBioFamily,
    neuron: paintBioFamily,
    atom: paintBioFamily,
    hull: paintHullFamily,
    airframe: paintHullFamily,
    plane: paintHullFamily,
    train: paintHullFamily,
    locomotive: paintHullFamily,
    amr: paintHullFamily,
    chassis: paintHullFamily,
    ship: paintHullFamily,
    ring: paintRingFamily,
    gantry: paintRingFamily,
    detector: paintRingFamily,
    ct: paintRingFamily,
    gimbal: paintRingFamily,
    loop: paintRingFamily,
    column: paintColumnFamily,
    boiler: paintColumnFamily,
    tank: paintColumnFamily,
    vessel: paintColumnFamily,
    distill: paintColumnFamily,
    tray: paintColumnFamily,
    lattice: paintLatticeFamily,
    auxetic: paintLatticeFamily,
    srr: paintLatticeFamily,
    loom: paintLatticeFamily,
    coil: paintCoilFamily,
    qubit: paintCoilFamily,
    transmon: paintCoilFamily,
    pipe: paintPipeFamily,
    coolant: paintPipeFamily,
    fiber: paintPipeFamily,
    nanowire: paintPipeFamily,
    waveguide: paintPipeFamily,
    harness: paintPipeFamily,
    valve: function (c, f, g, on, a) { paintValve(c, f, on, a); },
    contactor: function (c, f, g, on, a) { paintValve(c, f, on, a); },
    damper: function (c, f, g, on, a) { paintValve(c, f, on, a); },
    leaflet: function (c, f, g, on, a) { paintValve(c, f, on, a); },
    array: paintArrayFamily,
    antenna: paintArrayFamily,
    mimo: paintArrayFamily,
    shank: paintArrayFamily,
    exchanger: function (c, f, g, on, a) { paintExchanger(c, on, a); },
    clutch: function (c, f, g, on, a) { paintGear(c, 12, f, on, a); },
    distributor: function (c, f, g, on, a) { paintRotor(c, f, on, a); },
    engine: function (c, f, g, on, a) { plate(c, 96, 60, on, a); paintShaft(c, "cam", f, on, a); },
    carb: function (c, f, g, on, a) { paintColumn(c, g, f, on, a); },
    bulkhead: function (c, f, g, on, a) { plate(c, 18, 78, on, a); },
    bay: function (c, f, g, on, a) { plate(c, 70, 40, on, a); ctxStrokeDoor(c, on, a); },
    camera: paintOpticFamily,
    sensor: paintCardFamily,
    radio: paintArrayFamily,
    server: function (c, f, g, on, a) { paintStack(c, "module", on, a); },
    foil: function (c, f, g, on, a) { plate(c, 70, 16, on, a); },
    spindle: function (c, f, g, on, a) { paintRotor(c, f, on, a); },
    mill: function (c, f, g, on, a) { paintColumn(c, g, f, on, a); },
    powder: function (c, f, g, on, a) { paintColumn(c, g, f, on, a); },
    hotend: function (c, f, g, on, a) { paintBell(c, g, on, a); },
    uv: paintOpticFamily,
    sorter: function (c, f, g, on, a) { plate(c, 80, 48, on, a); },
    coldplate: function (c, f, g, on, a) { plate(c, 84, 40, on, a); paintPipe(c, g, f, on, a); },
    immersion: function (c, f, g, on, a) { paintColumn(c, "tank", f, on, a); },
    aisle: function (c, f, g, on, a) { paintStack(c, "module", on, a); },
    pdu: paintCardFamily,
    switch: paintLinkFamily,
    bagger: function (c, f, g, on, a) { plate(c, 70, 78, on, a); },
    carton: function (c, f, g, on, a) { plate(c, 64, 64, on, a); },
    radar: paintRingFamily,
    stent: paintLatticeFamily,
    electrode: paintArrayFamily,
    heatpipe: paintPipeFamily,
    sunshield: function (c, f, g, on, a) { paintStack(c, "mli", on, a); },
    potential: paintCoilFamily,
    phase: paintOpticFamily,
    loss: paintDocFamily,
    surface: function (c, f, g, on, a) { plate(c, 80, 28, on, a); },
    bulk: function (c, f, g, on, a) { plate(c, 70, 70, on, a); },
    magnet: paintCoilFamily,
    adc: paintCardFamily,
    oxygenator: paintPipeFamily,
    filter: function (c, f, g, on, a) { plate(c, 70, 44, on, a); },
    mixer: function (c, f, g, on, a) { paintCan(c, g, f, on, a); },
    relay: paintCardFamily,
    memory: paintCardFamily,
    dot: paintBioFamily,
    cat: paintCoilFamily,
    rail: paintPipeFamily,
    interferometer: paintOpticFamily,
    terminal: paintCardFamily,
    precursor: paintColumnFamily,
    purge: paintDuctFamily,
    etch: paintColumnFamily,
    interposer: function (c, f, g, on, a) { paintStack(c, g, on, a); },
    die: paintCardFamily,
    package: function (c, f, g, on, a) { plate(c, 88, 56, on, a); },
    hydrogen: paintColumnFamily,
    water: paintPipeFamily,
    proton: paintPipeFamily,
    electron: paintPipeFamily,
    load: paintCardFamily,
    store: paintColumnFamily,
    wavelength: paintOpticFamily,
    mux: paintOpticFamily,
    ont: paintCardFamily,
    user: paintDocFamily,
    resource: function (c, f, g, on, a) { plate(c, 64, 48, on, a); },
    key: paintCardFamily,
    device: paintCardFamily,
    log: paintDocFamily,
    sinter: function (c, f, g, on, a) { paintCan(c, g, f, on, a); },
    brine: paintPipeFamily,
    carbon: paintColumnFamily,
    resin: paintColumnFamily,
    lamp: paintOpticFamily,
    irrigation: paintPipeFamily,
    span: paintLinkFamily,
    phenotyping: paintRingFamily,
    rack: function (c, f, g, on, a) { paintStack(c, "module", on, a); },
    ups: paintCardFamily,
    recovery: paintExchangerFamily,
    envelope: paintDocFamily,
    wayside: paintLinkFamily,
    office: paintCardFamily,
    crusher: paintColumnFamily,
    slurry: paintPipeFamily,
    froth: paintColumnFamily,
    classifier: function (c, f, g, on, a) { paintBell(c, "cyclone", on, a); },
    ahu: paintDuctFamily,
    zone: function (c, f, g, on, a) { paintValve(c, f, on, a); },
    occupancy: paintCardFamily,
    product: paintPipeFamily,
    packagebox: function (c, f, g, on, a) { plate(c, 64, 64, on, a); },
    steam: paintDuctFamily,
    droplet: paintBioFamily,
    filmroll: function (c, f, g, on, a) { paintRotor(c, f, on, a); },
    seal: function (c, f, g, on, a) { plate(c, 70, 18, on, a); },
    bag: function (c, f, g, on, a) { plate(c, 60, 72, on, a); },
    wrapper: function (c, f, g, on, a) { paintStack(c, "film", on, a); },
    blank: function (c, f, g, on, a) { plate(c, 64, 64, on, a); },
    casebox: function (c, f, g, on, a) { plate(c, 78, 58, on, a); },
    robot: paintLinkFamily,
    yarn: paintPipeFamily,
    twist: function (c, f, g, on, a) { paintRotor(c, f, on, a); },
    jet: function (c, f, g, on, a) { paintBell(c, g, on, a); },
    warp: paintLatticeFamily,
    weft: paintPipeFamily,
    shed: paintLatticeFamily,
    knit: paintLinkFamily,
    binder: function (c, f, g, on, a) { plate(c, 72, 24, on, a); },
    lithium: function (c, f, g, on, a) { paintCell(c, on, a); },
    cathode: function (c, f, g, on, a) { paintStack(c, g, on, a); },
    air: paintDuctFamily,
    coldbox: paintExchangerFamily,
    adsorbent: paintColumnFamily,
    nitrogen: paintColumnFamily,
    oxygen: paintColumnFamily,
    sar: paintRingFamily,
    insar: paintRingFamily,
    pointcloud: paintArrayFamily,
    opticalscene: paintOpticFamily,
    cantilever: paintLinkFamily,
    tip: paintLinkFamily,
    sample: function (c, f, g, on, a) { plate(c, 70, 18, on, a); },
    feedback: paintCardFamily,
    topography: paintDocFamily,
    amplitude: paintDocFamily,
    deflection: paintLinkFamily,
    current: paintCardFamily,
    bias: paintCoilFamily,
    potentialmap: function (c, f, g, on, a) { plate(c, 74, 74, on, a); },
    graphene: function (c, f, g, on, a) { plate(c, 80, 28, on, a); },
    cloak: paintRingFamily,
    flux: paintPipeFamily,
    snap: paintLatticeFamily,
    crystal: paintLatticeFamily,
    electrolyzer: function (c, f, g, on, a) { paintStack(c, g, on, a); },
    fuelcell: function (c, f, g, on, a) { paintStack(c, g, on, a); },
    capsule: paintBioFamily,
    fin: paintArrayFamily,
    emitter: paintArrayFamily,
    grating: paintArrayFamily,
    polarizer: paintOpticFamily,
    microled: paintArrayFamily,
    vortex: paintOpticFamily,
    diamond: paintOpticFamily,
    vapor: paintColumnFamily,
    cavity: paintOpticFamily,
    ion: paintBioFamily,
    position: paintDocFamily,
    soil: function (c, f, g, on, a) { plate(c, 74, 40, on, a); },
    seed: paintBioFamily,
    crop: function (c, f, g, on, a) { plate(c, 70, 40, on, a); },
    windowfilm: function (c, f, g, on, a) { paintStack(c, "film", on, a); },
    pivot: paintLinkFamily,
    flex: paintRingFamily,
    blade: paintBladesFamily,
    vectornozzle: function (c, f, g, on, a) { paintBell(c, g, on, a); },
    heat: paintExchangerFamily,
    gas: paintDuctFamily,
    cylinder: paintColumnFamily,
    wave: paintCoilFamily,
    trap: paintRingFamily,
    transceiver: paintCardFamily
  };

  function paintBladesFamily(c, f, g, on, a) { paintBlades(c, g, f, on, a); }
  function paintOpticFamily(c, f, g, on, a) { paintOptic(c, g, f, on, a); }
  function paintCardFamily(c, f, g, on, a) { paintCard(c, g, on, a); }
  function paintDocFamily(c, f, g, on, a) { paintDoc(c, g, on, a); }
  function paintLinkFamily(c, f, g, on, a) { paintLink(c, g, f, on, a); }
  function paintBioFamily(c, f, g, on, a) { paintBio(c, g, on, a); }
  function paintHullFamily(c, f, g, on, a) { paintHull(c, g, on, a); }
  function paintRingFamily(c, f, g, on, a) { paintRing(c, g, f, on, a); }
  function paintColumnFamily(c, f, g, on, a) { paintColumn(c, g, f, on, a); }
  function paintLatticeFamily(c, f, g, on, a) { paintLattice(c, g, f, on, a); }
  function paintCoilFamily(c, f, g, on, a) { paintCoil(c, g, f, on, a); }
  function paintPipeFamily(c, f, g, on, a) { paintPipe(c, g, f, on, a); }
  function paintDuctFamily(c, f, g, on, a) { paintDuct(c, g, f, on, a); }
  function paintArrayFamily(c, f, g, on, a) { paintArray(c, g, on, a); }
  function paintExchangerFamily(c, f, g, on, a) { paintExchanger(c, on, a); }
  function ctxStrokeDoor(ctx, on, accent) {
    ctx.strokeStyle = on ? accent : C.metalHi;
    ctx.strokeRect(-18, -12, 36, 24);
  }

  function worldOf(n) {
    return { x: 90 + n.x * 1020, y: 78 + n.y * 560 };
  }

  function stageIndex(scene, frame) {
    var i;
    for (i = 0; i < scene.stages.length; i++) {
      if (frame <= scene.stages[i].f1) return i;
    }
    return scene.stages.length - 1;
  }

  function camera(scene, frame) {
    var si = stageIndex(scene, frame);
    var st = scene.stages[si];
    var span = Math.max(1, st.f1 - st.f0);
    var local = (frame - st.f0) / span;
    var ids = scene.emphasis[si] || [];
    var nodes = scene.nodes.filter(function (n) { return ids.indexOf(n.id) >= 0; });
    if (!nodes.length) nodes = scene.nodes;
    var prevIds = scene.emphasis[Math.max(0, si - 1)] || ids;
    var prev = scene.nodes.filter(function (n) { return prevIds.indexOf(n.id) >= 0; });
    if (!prev.length) prev = nodes;
    function cen(list) {
      var sx = 0, sy = 0, k;
      for (k = 0; k < list.length; k++) { sx += list[k].x; sy += list[k].y; }
      return { x: sx / list.length, y: sy / list.length };
    }
    var a = cen(prev);
    var b = cen(nodes);
    var e = si === 0 ? smooth(Math.min(1, local / 0.45)) : smooth(Math.min(1, local / 0.32));
    var z1 = si === 4 ? 1.02 : 1.12;
    var z0 = si === 0 ? 1.0 : 1.06;
    return {
      x: a.x + (b.x - a.x) * e,
      y: a.y + (b.y - a.y) * e,
      z: z0 + (z1 - z0) * e,
      si: si
    };
  }

  function drawSilhouette(ctx, kind) {
    ctx.save();
    ctx.strokeStyle = "rgba(158,176,196,.18)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    if (kind === "watch") ctx.arc(600, 360, 250, 0, Math.PI * 2);
    else if (kind === "axial") { roundRect(ctx, 120, 250, 960, 200, 90); }
    else if (kind === "ship") {
      ctx.moveTo(160, 400); ctx.lineTo(980, 400); ctx.quadraticCurveTo(1080, 470, 960, 520); ctx.lineTo(200, 520); ctx.quadraticCurveTo(120, 470, 160, 400);
    } else if (kind === "aircraft") {
      ctx.moveTo(160, 360); ctx.lineTo(860, 360); ctx.lineTo(1040, 340); ctx.lineTo(860, 320); ctx.lineTo(620, 250); ctx.lineTo(520, 320); ctx.lineTo(160, 340); ctx.closePath();
    } else if (kind === "stack") { roundRect(ctx, 430, 80, 340, 580, 18); }
    else if (kind === "loop") ctx.arc(600, 360, 230, 0, Math.PI * 2);
    else if (kind === "lattice") { roundRect(ctx, 280, 120, 640, 460, 12); }
    else if (kind === "vehicle") { roundRect(ctx, 140, 250, 920, 180, 16); }
    else if (kind === "rack") {
      var i; for (i = 0; i < 5; i++) ctx.rect(180 + i * 180, 140, 140, 420);
    } else if (kind === "plant") { roundRect(ctx, 250, 70, 220, 580, 20); ctx.rect(560, 180, 420, 300); }
    else if (kind === "layers") {
      var y; for (y = 0; y < 4; y++) ctx.rect(220, 120 + y * 120, 760, 70);
    }
    ctx.stroke();
    ctx.restore();
  }

  function wrap(ctx, text, max) {
    var words = String(text).split(/\s+/);
    var lines = [];
    var line = "";
    var i;
    for (i = 0; i < words.length; i++) {
      var trial = line ? line + " " + words[i] : words[i];
      if (ctx.measureText(trial).width > max && line) {
        lines.push(line);
        line = words[i];
      } else line = trial;
    }
    if (line) lines.push(line);
    return lines.slice(0, 3);
  }

  function drawLabel(ctx, node, p, on) {
    ctx.font = "600 12px ui-sans-serif, Segoe UI, sans-serif";
    var lines = wrap(ctx, node.label, 148);
    var w = 0;
    var i;
    for (i = 0; i < lines.length; i++) w = Math.max(w, ctx.measureText(lines[i]).width);
    w = Math.min(156, w + 14);
    var h = lines.length * 15 + 8;
    var lx = p.x - w / 2;
    var ly = p.y + 48;
    if (ly + h > 680) ly = p.y - 48 - h;
    ctx.fillStyle = "rgba(11,16,25,.86)";
    roundRect(ctx, lx, ly, w, h, 5);
    ctx.fill();
    ctx.lineWidth = 1;
    ctx.strokeStyle = on ? roleColor(node.role) : "rgba(154,175,196,.45)";
    ctx.stroke();
    ctx.fillStyle = on ? C.bone : C.dim;
    ctx.textAlign = "left";
    ctx.textBaseline = "top";
    for (i = 0; i < lines.length; i++) ctx.fillText(lines[i], lx + 7, ly + 5 + i * 15);
  }

  function drawEdge(ctx, a, b, edge, frame, index) {
    if (frame < edge.start) return;
    var fade = Math.min(1, (frame - edge.start) / 18);
    var pa = worldOf(a);
    var pb = worldOf(b);
    var dx = pb.x - pa.x;
    var dy = pb.y - pa.y;
    var len = Math.hypot(dx, dy) || 1;
    var bend = 36 * (index % 2 === 0 ? 1 : -1);
    var mx = (pa.x + pb.x) / 2 + (-dy / len) * bend;
    var my = (pa.y + pb.y) / 2 + (dx / len) * bend;
    ctx.save();
    ctx.globalAlpha = 0.35 + 0.65 * fade;
    ctx.strokeStyle = roleColor(edge.role);
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.moveTo(pa.x, pa.y);
    ctx.quadraticCurveTo(mx, my, pb.x, pb.y);
    ctx.stroke();
    ctx.setLineDash([7, 8]);
    ctx.lineDashOffset = -(frame % 30);
    ctx.lineWidth = 1.4;
    ctx.globalAlpha = 0.9 * fade;
    ctx.stroke();
    ctx.setLineDash([]);
    var t = 0.72;
    var qx = (1 - t) * (1 - t) * pa.x + 2 * (1 - t) * t * mx + t * t * pb.x;
    var qy = (1 - t) * (1 - t) * pa.y + 2 * (1 - t) * t * my + t * t * pb.y;
    ctx.beginPath();
    ctx.arc(qx, qy, 3.2, 0, Math.PI * 2);
    ctx.fillStyle = roleColor(edge.role);
    ctx.fill();
    ctx.restore();
  }

  function drawNode(ctx, node, frame, on, motion) {
    var p = worldOf(node);
    var phase = motion ? (frame % 120) / 120 : 0;
    var accent = roleColor(node.role);
    ctx.save();
    ctx.translate(p.x, p.y);
    if (on) {
      ctx.shadowColor = accent;
      ctx.shadowBlur = 16;
    }
    var fn = PAINT[node.glyph] || PAINT.plate;
    fn(ctx, phase, node.glyph, on, accent);
    ctx.restore();
    drawLabel(ctx, node, p, on);
  }

  function draw(canvas, scene, frame, motion) {
    var dpr = Math.min(2, window.devicePixelRatio || 1);
    var rect = canvas.getBoundingClientRect();
    var w = Math.max(320, rect.width);
    var h = Math.max(240, rect.height);
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    var ctx = canvas.getContext("2d");
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = C.bg;
    ctx.fillRect(0, 0, w, h);
    var cam = camera(scene, frame);
    var ids = scene.emphasis[cam.si] || [];
    ctx.save();
    ctx.translate(w / 2, h / 2);
    var fit = Math.min(w / 1200, h / 740);
    ctx.scale(fit * cam.z, fit * cam.z);
    ctx.translate(- (90 + cam.x * 1020), -(78 + cam.y * 560));
    ctx.strokeStyle = "rgba(255,255,255,.035)";
    ctx.lineWidth = 1;
    var g;
    for (g = 0; g <= 1200; g += 40) {
      ctx.beginPath();
      ctx.moveTo(g, 40);
      ctx.lineTo(g, 700);
      ctx.stroke();
    }
    drawSilhouette(ctx, scene.silhouette || "flow");
    var e;
    for (e = 0; e < scene.edges.length; e++) {
      var edge = scene.edges[e];
      var na = null, nb = null, k;
      for (k = 0; k < scene.nodes.length; k++) {
        if (scene.nodes[k].id === edge.from) na = scene.nodes[k];
        if (scene.nodes[k].id === edge.to) nb = scene.nodes[k];
      }
      if (na && nb) drawEdge(ctx, na, nb, edge, frame, e);
    }
    for (k = 0; k < scene.nodes.length; k++) {
      var node = scene.nodes[k];
      drawNode(ctx, node, frame, ids.indexOf(node.id) >= 0, motion);
    }
    ctx.restore();
    ctx.font = "600 11px ui-monospace, SFMono-Regular, Menlo, monospace";
    ctx.fillStyle = C.dim;
    ctx.textAlign = "left";
    ctx.fillText("SCHEMATIC  " + String(frame).padStart(4, "0") + " / 1019", 14, h - 16);
    if (cam.z > 1.18) {
      ctx.fillStyle = C.path;
      ctx.fillText("SCALE CHANGE", 14, 22);
    }
    if (scene.slowMotion) {
      ctx.fillStyle = C.energy;
      ctx.fillText("SLOW MOTION", 140, 22);
    }
    ctx.fillStyle = C.sense;
    ctx.fillText("TIME COMPRESSION", 270, 22);
    if (scene.falseColor) {
      ctx.fillStyle = C.energy;
      ctx.textAlign = "right";
      ctx.fillText("FALSE COLOR", w - 14, 22);
    }
  }

  function boot(scene) {
    var canvas = document.getElementById("plate");
    var play = document.getElementById("play");
    var slider = document.getElementById("scrub");
    var readout = document.getElementById("readout");
    var stageTitle = document.getElementById("stage-title");
    var stageDetail = document.getElementById("stage-detail");
    var stageList = document.querySelectorAll("[data-stage]");
    var reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    var params = new URLSearchParams(window.location.search);
    var frame = params.has("frame") ? Math.max(0, Math.min(1019, Number(params.get("frame")) || 0)) : 0;
    var playing = !reduced && params.get("pause") !== "1";
    var acc = 0;
    var last = 0;
    var motion = !reduced;

    function hud() {
      var si = stageIndex(scene, frame);
      var st = scene.stages[si];
      var sec = frame / 30;
      var m = Math.floor(sec / 60);
      var s = sec - m * 60;
      readout.textContent = (m < 10 ? "0" : "") + m + ":" + (s < 10 ? "0" : "") + s.toFixed(2) + "   frame " + frame;
      slider.value = String(frame);
      stageTitle.textContent = "Stage " + (si + 1) + " of 5. " + st.action;
      stageDetail.textContent = st.detail || "";
      var i;
      for (i = 0; i < stageList.length; i++) {
        stageList[i].setAttribute("aria-current", i === si ? "step" : "false");
      }
      play.setAttribute("aria-pressed", playing ? "true" : "false");
      play.textContent = playing ? "Pause" : (frame >= 1019 ? "Replay" : "Play");
    }

    function render() {
      motion = playing || !reduced;
      draw(canvas, scene, frame, motion);
      hud();
    }

    play.addEventListener("click", function () {
      if (frame >= 1019) { frame = 0; acc = 0; }
      playing = !playing;
      motion = true;
      render();
    });
    slider.addEventListener("input", function () {
      frame = Number(slider.value);
      playing = false;
      render();
    });
    stageList.forEach(function (btn) {
      btn.addEventListener("click", function () {
        var si = Number(btn.getAttribute("data-stage"));
        frame = scene.stages[si].f0;
        playing = false;
        render();
      });
    });
    window.addEventListener("keydown", function (ev) {
      if (ev.target && (ev.target.tagName === "INPUT" || ev.target.tagName === "TEXTAREA")) return;
      if (ev.code === "Space") {
        ev.preventDefault();
        play.click();
      } else if (ev.code === "ArrowRight") {
        frame = Math.min(1019, frame + (ev.shiftKey ? 15 : 1));
        playing = false;
        render();
      } else if (ev.code === "ArrowLeft") {
        frame = Math.max(0, frame - (ev.shiftKey ? 15 : 1));
        playing = false;
        render();
      } else if (ev.code === "Home") {
        frame = 0; playing = false; render();
      } else if (ev.code === "End") {
        frame = 1019; playing = false; render();
      } else if (ev.key >= "1" && ev.key <= "5") {
        frame = scene.stages[Number(ev.key) - 1].f0;
        playing = false;
        render();
      }
    });
    window.addEventListener("resize", render);

    function tick(now) {
      if (!last) last = now;
      var dt = Math.min(80, now - last);
      last = now;
      if (playing) {
        acc += dt;
        var step = 1000 / 30;
        while (acc >= step) {
          acc -= step;
          if (frame >= 1019) { playing = false; break; }
          frame += 1;
        }
        render();
      }
      requestAnimationFrame(tick);
    }
    render();
    requestAnimationFrame(tick);
  }

  window.KGExplainer = { boot: boot, draw: draw };
})();
