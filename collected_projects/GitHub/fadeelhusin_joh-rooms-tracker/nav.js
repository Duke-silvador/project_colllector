/* ============================================================
   JOH Room Tracker — navigation engine
   Grid coords == plan viewer coords (1191 x 842), from nav-data.js.
   Route = A* over the walkable network extracted from the plans,
   with cost shaping: hug corridors, avoid large open (exterior) space.
   Cross-level legs connect via named stairs (fallback: lifts).
   Routes are INDICATIVE — derived from drawing pixels, not a survey.
   ============================================================ */
'use strict';

var Nav = (function () {
  var cache = {};   // level -> {w,h,walk:Uint8Array,pen:Float32Array}

  function unpack(level) {
    if (cache[level]) return cache[level];
    var g = NAV_GRIDS[level]; if (!g) return null;
    var bin = atob(g.b64), n = g.w * g.h;
    var walk = new Uint8Array(n);
    for (var i = 0; i < bin.length; i++) {
      var byte = bin.charCodeAt(i), base = i * 8;
      for (var b = 0; b < 8 && base + b < n; b++) walk[base + b] = (byte >> (7 - b)) & 1;
    }
    var pen = penalty(walk, g.w, g.h);
    cache[level] = { w: g.w, h: g.h, walk: walk, pen: pen };
    return cache[level];
  }

  /* two-pass chamfer distance (3-4) to nearest obstacle, then cost shaping */
  function penalty(walk, w, h) {
    var n = w * h, INF = 1e7;
    var d = new Float32Array(n);
    var i, x, y;
    for (i = 0; i < n; i++) d[i] = walk[i] ? INF : 0;
    for (y = 0; y < h; y++) for (x = 0; x < w; x++) {
      i = y * w + x; if (!d[i]) continue;
      var v = d[i];
      if (x > 0 && d[i - 1] + 3 < v) v = d[i - 1] + 3;
      if (y > 0) {
        if (d[i - w] + 3 < v) v = d[i - w] + 3;
        if (x > 0 && d[i - w - 1] + 4 < v) v = d[i - w - 1] + 4;
        if (x < w - 1 && d[i - w + 1] + 4 < v) v = d[i - w + 1] + 4;
      }
      d[i] = v;
    }
    for (y = h - 1; y >= 0; y--) for (x = w - 1; x >= 0; x--) {
      i = y * w + x; if (!d[i]) continue;
      var v2 = d[i];
      if (x < w - 1 && d[i + 1] + 3 < v2) v2 = d[i + 1] + 3;
      if (y < h - 1) {
        if (d[i + w] + 3 < v2) v2 = d[i + w] + 3;
        if (x < w - 1 && d[i + w + 1] + 4 < v2) v2 = d[i + w + 1] + 4;
        if (x > 0 && d[i + w - 1] + 4 < v2) v2 = d[i + w - 1] + 4;
      }
      d[i] = v2;
    }
    var pen = new Float32Array(n);
    for (i = 0; i < n; i++) {
      var c = d[i] / 3;                       // ~cells to nearest wall
      var p = (6 - Math.min(c, 6)) * 0.5;     // mild wall-hug
      if (c > 12) p += (c - 12) * 2.5;        // strong open-space (exterior) penalty
      pen[i] = p;
    }
    return pen;
  }

  function snap(G, x, y, maxr) {
    x = Math.round(x); y = Math.round(y); maxr = maxr || 150;
    if (x >= 0 && y >= 0 && x < G.w && y < G.h && G.walk[y * G.w + x]) return y * G.w + x;
    for (var r = 1; r <= maxr; r++) {
      var x0 = Math.max(0, x - r), x1 = Math.min(G.w - 1, x + r);
      var y0 = Math.max(0, y - r), y1 = Math.min(G.h - 1, y + r);
      for (var yy = y0; yy <= y1; yy++) for (var xx = x0; xx <= x1; xx++) {
        if (Math.max(Math.abs(xx - x), Math.abs(yy - y)) !== r) continue;
        if (G.walk[yy * G.w + xx]) return yy * G.w + xx;
      }
    }
    return -1;
  }

  /* binary heap of node indices keyed by f-score */
  function Heap(fs) {
    var a = [];
    return {
      push: function (i) { a.push(i); var c = a.length - 1; while (c > 0) { var p = (c - 1) >> 1; if (fs[a[p]] <= fs[a[c]]) break; var t = a[p]; a[p] = a[c]; a[c] = t; c = p; } },
      pop: function () { var top = a[0], last = a.pop(); if (a.length) { a[0] = last; var c = 0; for (;;) { var l = 2 * c + 1, r = l + 1, m = c; if (l < a.length && fs[a[l]] < fs[a[m]]) m = l; if (r < a.length && fs[a[r]] < fs[a[m]]) m = r; if (m === c) break; var t = a[m]; a[m] = a[c]; a[c] = t; c = m; } } return top; },
      empty: function () { return a.length === 0; }
    };
  }

  function astar(level, ax, ay, bx, by) {
    var G = unpack(level); if (!G) return null;
    var s = snap(G, ax, ay), g = snap(G, bx, by);
    if (s < 0 || g < 0) return null;
    var w = G.w, h = G.h, n = w * h;
    var gx = g % w, gy = (g / w) | 0;
    var gs = new Float32Array(n); gs.fill(Infinity);
    var fs = new Float32Array(n); fs.fill(Infinity);
    var came = new Int32Array(n); came.fill(-1);
    var closed = new Uint8Array(n);
    gs[s] = 0; fs[s] = Math.hypot((s % w) - gx, ((s / w) | 0) - gy);
    var heap = Heap(fs); heap.push(s);
    var DX = [0, 0, -1, 1, -1, 1, -1, 1], DY = [-1, 1, 0, 0, -1, -1, 1, 1], DW = [1, 1, 1, 1, 1.414, 1.414, 1.414, 1.414];
    while (!heap.empty()) {
      var c = heap.pop();
      if (closed[c]) continue;
      if (c === g) {
        var path = [];
        while (c >= 0) { path.push([c % w, (c / w) | 0]); c = came[c]; }
        path.reverse();
        return simplify(path, 1.6);
      }
      closed[c] = 1;
      var cx = c % w, cy = (c / w) | 0;
      for (var k = 0; k < 8; k++) {
        var nx = cx + DX[k], ny = cy + DY[k];
        if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
        var ni = ny * w + nx;
        if (!G.walk[ni] || closed[ni]) continue;
        var ng = gs[c] + DW[k] + G.pen[ni];
        if (ng < gs[ni]) {
          gs[ni] = ng; came[ni] = c;
          fs[ni] = ng + Math.hypot(nx - gx, ny - gy);
          heap.push(ni);
        }
      }
    }
    return null;
  }

  /* Ramer-Douglas-Peucker */
  function simplify(pts, eps) {
    if (pts.length < 3) return pts;
    var keep = new Uint8Array(pts.length); keep[0] = keep[pts.length - 1] = 1;
    var stack = [[0, pts.length - 1]];
    while (stack.length) {
      var seg = stack.pop(), i0 = seg[0], i1 = seg[1];
      var ax = pts[i0][0], ay = pts[i0][1], bx = pts[i1][0], by = pts[i1][1];
      var dx = bx - ax, dy = by - ay, L = Math.hypot(dx, dy) || 1;
      var mi = -1, md = 0;
      for (var i = i0 + 1; i < i1; i++) {
        var d = Math.abs(dy * pts[i][0] - dx * pts[i][1] + bx * ay - by * ax) / L;
        if (d > md) { md = d; mi = i; }
      }
      if (md > eps && mi > 0) { keep[mi] = 1; stack.push([i0, mi]); stack.push([mi, i1]); }
    }
    var out = [];
    for (var j = 0; j < pts.length; j++) if (keep[j]) out.push(pts[j]);
    return out;
  }

  function roomXY(id) {
    var d = ROOMS[id];
    if (!d || !d.pos) return null;
    return { level: d.baseLevel, x: d.pos[1] * 1191, y: d.pos[2] * 842 };
  }

  /* choose vertical connector present on both levels (stairs first, lifts fallback) */
  function pickConnector(la, pa, lb, pb) {
    var best = null, bestScore = Infinity, pass;
    for (pass = 0; pass < 2; pass++) {
      var wantLift = pass === 1;
      Object.keys(NAV_CONNECTORS).forEach(function (name) {
        var c = NAV_CONNECTORS[name];
        if ((c.kind === 'lift') !== wantLift) return;
        if (!c.levels[la] || !c.levels[lb]) return;
        var ra = ROOMS[c.levels[la][0]], rb = ROOMS[c.levels[lb][0]];
        if (!ra || !ra.pos || !rb || !rb.pos) return;
        var s = Math.hypot(ra.pos[1] * 1191 - pa.x, ra.pos[2] * 842 - pa.y) +
                Math.hypot(rb.pos[1] * 1191 - pb.x, rb.pos[2] * 842 - pb.y);
        if (s < bestScore) { bestScore = s; best = { name: name, kind: c.kind, a: c.levels[la][0], b: c.levels[lb][0] }; }
      });
      if (best) return best;
    }
    return null;
  }

  /* Main API: route between two room ids -> {legs:[{level, pts, fromId, toId, via}], via} */
  function route(fromId, toId) {
    var A = roomXY(fromId), B = roomXY(toId);
    if (!A) return { error: 'Origin room has no plan position.' };
    if (!B) return { error: 'Destination room has no plan position.' };
    if (A.level === B.level) {
      var p = astar(A.level, A.x, A.y, B.x, B.y);
      if (!p) return { error: 'No walkable route found on the Level ' + A.level + ' plan.' };
      return { legs: [{ level: A.level, pts: p, fromId: fromId, toId: toId }] };
    }
    var conn = pickConnector(A.level, A, B.level, B);
    if (!conn) return { error: 'No stair or lift found linking Level ' + A.level + ' and Level ' + B.level + '.' };
    var SA = roomXY(conn.a), SB = roomXY(conn.b);
    var p1 = astar(A.level, A.x, A.y, SA.x, SA.y);
    var p2 = astar(B.level, SB.x, SB.y, B.x, B.y);
    if (!p1) return { error: 'No route to ' + conn.name + ' on Level ' + A.level + '.' };
    if (!p2) return { error: 'No route from ' + conn.name + ' on Level ' + B.level + '.' };
    return {
      via: conn.name,
      legs: [
        { level: A.level, pts: p1, fromId: fromId, toId: conn.a, via: conn.name },
        { level: B.level, pts: p2, fromId: conn.b, toId: toId, via: conn.name }
      ]
    };
  }

  return { route: route, roomXY: roomXY };
})();
