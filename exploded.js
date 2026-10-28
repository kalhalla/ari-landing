/* Ari exploded view: a reusable blueprint "exploded diagram" for any machine.
   Describe the parts (where each sits when assembled, which way it moves when exploded, how to draw it)
   and this draws, animates, labels and lets children tap each part.

   AriExploded.create(canvas, spec) -> view
     spec.title, spec.width (units), spec.height(W) -> canvas px height, spec.reserve [top, bottom] units,
     spec.stagger (0..0.6), spec.narrowBalloons (numbers only on phones, for wide machines), spec.dim { label } overall dimension shown when assembled,
     spec.parts [{ id, name, sub (optional second callout line), note, y, h, x0, x1, dx, dy, label (default true), draw(c, u, k) }]
       y/h: top and height in units when assembled; x0/x1: left/right extent in units (centre is x = 0)
       dx/dy: how far it moves when fully exploded (units); draw(c, u, kit): draw in px, origin = part's top-centre
     spec.overlay(c, info): optional extra drawing (flows, flames) after the parts
   view.set(t), view.animateTo(t, seconds), view.tick(dt), view.select(id), view.onPick(fn), view.resize(), view.t()
*/
(function () {
  'use strict';
  var BP = { bg: '#0D3B6E', deep: '#082A4F', grid: 'rgba(170,210,255,.07)', grid2: 'rgba(170,210,255,.16)', line: '#EEF5FF', dim: '#9FC6F2',
    faint: 'rgba(159,198,242,.42)', amber: '#FFC94A', air: '#79E3FF', warn: '#FF8A7A', ok: '#7CF0BC', orange: '#FF9A4D' };
  var MONO = '"IBM Plex Mono", ui-monospace, monospace';
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function ease(t) { return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; }

  // ---- drawing kit, shared with the part drawings ----
  var kit = {
    BP: BP, MONO: MONO,
    sheet: function (c, w, h) {
      c.fillStyle = BP.bg; c.fillRect(0, 0, w, h); c.lineWidth = 1;
      for (var x = 0; x < w; x += 12) { c.strokeStyle = x % 60 === 0 ? BP.grid2 : BP.grid; c.beginPath(); c.moveTo(x + 0.5, 0); c.lineTo(x + 0.5, h); c.stroke(); }
      for (var y = 0; y < h; y += 12) { c.strokeStyle = y % 60 === 0 ? BP.grid2 : BP.grid; c.beginPath(); c.moveTo(0, y + 0.5); c.lineTo(w, y + 0.5); c.stroke(); }
      c.strokeStyle = BP.faint; c.strokeRect(4.5, 4.5, w - 9, h - 9);
    },
    text: function (c, t, x, y, o) { o = o || {}; c.font = (o.weight || 600) + ' ' + (o.size || 10) + 'px ' + MONO; c.fillStyle = o.col || BP.dim; c.textAlign = o.align || 'left'; c.textBaseline = 'alphabetic'; c.fillText(t, x, y); },
    line: function (c, pts, col, wd, dash) { c.strokeStyle = col; c.lineWidth = wd || 1; c.setLineDash(dash || []); c.beginPath(); for (var i = 0; i < pts.length; i += 2) { if (i) c.lineTo(pts[i], pts[i + 1]); else c.moveTo(pts[i], pts[i + 1]); } c.stroke(); c.setLineDash([]); },
    hatch: function (c, gap, col) { c.save(); c.clip(); c.strokeStyle = col; c.lineWidth = 0.8; c.beginPath(); for (var k = -900; k < 2400; k += gap) { c.moveTo(k, -900); c.lineTo(k - 1800, 900); } c.stroke(); c.restore(); },
    // fill + stroke a path built by fn; optional hatch or tint
    shape: function (c, fn, o) {
      o = o || {};
      fn(); c.fillStyle = o.fill || BP.bg; c.fill();
      if (o.hatch) { fn(); kit.hatch(c, o.hatch, o.hatchCol || BP.faint); }
      fn(); c.strokeStyle = o.stroke || BP.line; c.lineWidth = o.lw || 1.4; c.lineJoin = 'round'; c.setLineDash(o.dash || []); c.stroke(); c.setLineDash([]);
    },
    rect: function (c, x, y, w, h, o) { kit.shape(c, function () { c.beginPath(); c.rect(x, y, w, h); }, o); },
    head: function (c, x, y, ux, uy, col, s) { s = s || 7; c.fillStyle = col; c.beginPath(); c.moveTo(x, y); c.lineTo(x - ux * s - uy * s * 0.45, y - uy * s + ux * s * 0.45); c.lineTo(x - ux * s + uy * s * 0.45, y - uy * s - ux * s * 0.45); c.closePath(); c.fill(); },
    // a cylinder seen slightly from above, drawn like an engraving: origin top-centre, sizes in units, u = px per unit
    // o.rings [y], o.bands [[y0, y1, 'stringers' | 'hatch']], o.top (show the open top), o.shade, o.seams [x fractions]
    cyl: function (c, u, w, h, o) { kit.frustum(c, u, w, w, h, o); },
    frustum: function (c, u, wt, wb, h, o) {
      o = o || {}; var at = wt / 2 * u, ab = wb / 2 * u, H = h * u, et = Math.max(1.2, at * 0.14), eb = Math.max(1.2, ab * 0.14);
      var X = function (f, y) { var a = at + (ab - at) * (y / H); return f * a; }, E = function (y) { var a = at + (ab - at) * (y / H); return Math.max(1.2, a * 0.14); };
      var sil = function () { c.beginPath(); c.moveTo(-at, 0); c.quadraticCurveTo(0, -2 * et, at, 0); c.lineTo(ab, H); c.quadraticCurveTo(0, H + 2 * eb, -ab, H); c.closePath(); };
      sil(); c.fillStyle = o.fill || BP.bg; c.fill();
      if (o.tint) { c.save(); sil(); c.clip(); c.fillStyle = o.tint[2]; var y0 = o.tint[0] * u, y1 = o.tint[1] * u; c.fillRect(-ab - at, y0, 2 * (ab + at), y1 - y0); c.restore(); }
      c.save(); sil(); c.clip();
      (o.bands || []).forEach(function (b) {
        var y0 = b[0] * u, y1 = b[1] * u;
        if (b[2] === 'hatch') { c.beginPath(); c.rect(-ab - at, y0, 2 * (ab + at), y1 - y0); kit.hatch(c, 4, BP.faint); }
        else { c.strokeStyle = BP.dim; c.lineWidth = 0.6; c.beginPath(); for (var k = -14; k <= 14; k++) { var f = Math.sin(k / 14 * Math.PI / 2); c.moveTo(X(f, y0), y0 + E(y0) * (1 - f * f)); c.lineTo(X(f, y1), y1 + E(y1) * (1 - f * f)); } c.stroke(); }
        c.strokeStyle = BP.line; c.lineWidth = 0.9; [y0, y1].forEach(function (y) { var a = X(1, y); c.beginPath(); c.moveTo(-a, y); c.quadraticCurveTo(0, y + 2 * E(y), a, y); c.stroke(); });
      });
      if (o.shade !== false) {   // engraving-style shading: lines bunch up towards the right-hand edge
        for (var k = 4; k <= 9; k++) { var f = Math.sin(k / 10 * Math.PI / 2); c.strokeStyle = 'rgba(159,198,242,' + (0.12 + 0.07 * (k - 4)) + ')'; c.lineWidth = 0.7; c.beginPath(); c.moveTo(X(f, 0), E(0) * (1 - f * f)); c.lineTo(X(f, H), H + E(H) * (1 - f * f)); c.stroke(); }
        c.strokeStyle = 'rgba(159,198,242,.12)'; c.beginPath(); c.moveTo(X(-0.55, 0), E(0) * 0.7); c.lineTo(X(-0.55, H), H + E(H) * 0.7); c.stroke();
      }
      (o.seams || []).forEach(function (f) { c.strokeStyle = BP.faint; c.lineWidth = 0.8; c.beginPath(); c.moveTo(X(f, 0), E(0) * (1 - f * f)); c.lineTo(X(f, H), H + E(H) * (1 - f * f)); c.stroke(); });
      (o.rings || []).forEach(function (yy) { var y = yy * u, a = X(1, y); c.strokeStyle = BP.faint; c.lineWidth = 0.8; c.beginPath(); c.moveTo(-a, y); c.quadraticCurveTo(0, y + 2 * E(y), a, y); c.stroke(); });
      c.restore();
      sil(); c.strokeStyle = BP.line; c.lineWidth = 1.3; c.lineJoin = 'round'; c.stroke();
      // the rim at the top: an open ring you can see into once the part is pulled away
      c.fillStyle = o.topFill || BP.deep; c.beginPath(); c.moveTo(-at, 0); c.quadraticCurveTo(0, -2 * et, at, 0); c.quadraticCurveTo(0, 2 * et, -at, 0); c.fill();
      c.strokeStyle = BP.line; c.lineWidth = 1; c.beginPath(); c.moveTo(-at, 0); c.quadraticCurveTo(0, 2 * et, at, 0); c.stroke();
    },
    // a dashed hidden line (things you can't see, like tank ends inside the body)
    hidden: function (c, fn) { c.save(); c.setLineDash([3, 3]); c.strokeStyle = BP.dim; c.lineWidth = 0.8; fn(); c.stroke(); c.restore(); },
    arrow: function (c, x1, y1, x2, y2, col, wd) { var l = Math.hypot(x2 - x1, y2 - y1) || 1, ux = (x2 - x1) / l, uy = (y2 - y1) / l, s = 6 + wd * 1.6; kit.line(c, [x1, y1, x2 - ux * s * 0.6, y2 - uy * s * 0.6], col, wd); kit.head(c, x2, y2, ux, uy, col, s); }
  };

  function create(canvas, spec) {
    var c = canvas.getContext('2d'), W = 300, H = 400, dpr = 1, t = 0, from = 0, to = 0, dur = 0, el = 0, sel = null, pickFns = [], hits = [], clock = 0;
    var parts = spec.parts, stag = spec.stagger == null ? 0.3 : spec.stagger;
    var labelled = parts.filter(function (p) { return p.label !== false; });
    labelled.forEach(function (p, i) { p.no = i + 1; });

    function progress(p, tt) {   // staggered: parts furthest from the middle move first
      var n = parts.length, i = parts.indexOf(p), mid = (n - 1) / 2, rank = n > 1 ? 1 - Math.abs(i - mid) / (mid || 1) : 0;
      return ease(clamp((tt - stag * rank) / (1 - stag), 0, 1));
    }
    function off(p, tt) { var k = progress(p, tt); return [(p.dx || 0) * k, (p.dy || 0) * k]; }
    function bounds(tt) {
      var b = { y0: 1e9, y1: -1e9, x0: 1e9, x1: -1e9 }, r = spec.reserve || [0, 0], hw = (spec.width || 10) / 2;
      parts.forEach(function (p) {
        var o = off(p, tt);
        b.y0 = Math.min(b.y0, p.y + o[1]); b.y1 = Math.max(b.y1, p.y + p.h + o[1]);
        b.x0 = Math.min(b.x0, (p.x0 != null ? p.x0 : -hw) + o[0]); b.x1 = Math.max(b.x1, (p.x1 != null ? p.x1 : hw) + o[0]);
      });
      b.y0 -= r[0]; b.y1 += r[1]; return b;
    }
    function layout() {
      var b0 = bounds(0), b1 = bounds(1), narrow = W < 560, zy0 = 46, zy1 = H - 22;
      var ux = { y0: Math.min(b0.y0, b1.y0), y1: Math.max(b0.y1, b1.y1), x0: Math.min(b0.x0, b1.x0), x1: Math.max(b0.x1, b1.x1) };
      function fit(b, zx0, zx1) { var u = Math.min((zx1 - zx0) / (b.x1 - b.x0), (zy1 - zy0) / (b.y1 - b.y0)); return { u: u, cx: (zx0 + zx1) / 2 - (b.x0 + b.x1) / 2 * u }; }
      var bo = narrow && spec.narrowBalloons, A = fit(b0, 16, W - 16), E = fit(ux, 16, bo ? W - 48 : W * (narrow ? 0.54 : 0.5)), k = ease(clamp(t / 0.6, 0, 1));
      A.u = Math.min(A.u, E.u * 1.35);
      var u = A.u + (E.u - A.u) * k, cx = A.cx + (E.cx - A.cx) * k;
      if (k < 1) cx = W / 2 - ((b0.x0 + b0.x1) / 2) * u + (E.cx - (W / 2 - ((ux.x0 + ux.x1) / 2) * E.u)) * k;
      var bt = bounds(t), cy = (zy0 + zy1) / 2 - ((bt.y0 + bt.y1) / 2) * u;
      return { u: u, cx: cx, cy: cy, labelX: bo ? W - 24 : W * (narrow ? 0.6 : 0.56), bo: bo };
    }
    function render() {
      var L = layout(), u = L.u;
      kit.sheet(c, W, H);
      kit.text(c, spec.title || '', 14, 24, { col: BP.line, size: W < 420 ? 10 : 11 });
      var mode = t < 0.02 ? 'ASSEMBLED' : t > 0.98 ? 'EXPLODED VIEW' : 'EXPLODING…';
      kit.text(c, mode, W - 14, 24, { align: 'right', size: 9.5, col: t > 0.98 ? BP.amber : BP.dim });
      // the machine's axis
      var b = bounds(t);
      kit.line(c, [L.cx, L.cy + (b.y0 - 2) * u, L.cx, L.cy + (b.y1 + 2) * u], BP.faint, 0.8, [10, 3, 2, 3]);
      // overall size when put together
      if (spec.dim && t < 0.35) {
        var a0 = 1 - t / 0.35, xL = L.cx + (Math.min.apply(null, parts.map(function (p) { return p.x0 != null ? p.x0 : -(spec.width || 10) / 2; })) - 3) * u;
        var yA = L.cy + parts[0].y * u, yB = L.cy + Math.max.apply(null, parts.map(function (p) { return p.y + p.h; })) * u;
        c.globalAlpha = a0;
        kit.line(c, [xL, yA, xL, yB], BP.dim, 0.8); kit.head(c, xL, yA, 0, -1, BP.dim, 6); kit.head(c, xL, yB, 0, 1, BP.dim, 6);
        c.save(); c.translate(xL - 6, (yA + yB) / 2); c.rotate(-Math.PI / 2); kit.text(c, spec.dim.label, 0, 0, { align: 'center', size: 9.5, col: BP.line }); c.restore();
        c.globalAlpha = 1;
      }
      // parts
      hits = [];
      // dimension brackets beside the assembled machine, like a real general-arrangement drawing
      var da = clamp(1 - t / 0.3, 0, 1);
      if (da > 0 && (spec.dims || spec.span)) {
        c.globalAlpha = da;
        var hw0 = (spec.width || 10) / 2, xE = L.cx - hw0 * u - 8;
        (spec.dims || []).forEach(function (d) {
          var x = xE - 14 - (d.col || 0) * 26, ya = L.cy + d.y0 * u, yb = L.cy + d.y1 * u;
          kit.line(c, [x - 4, ya, xE + 4, ya], BP.faint, 0.7, [2, 3]); kit.line(c, [x - 4, yb, xE + 4, yb], BP.faint, 0.7, [2, 3]);
          kit.line(c, [x, ya, x, yb], BP.dim, 0.9); kit.head(c, x, ya, 0, -1, BP.dim, 5); kit.head(c, x, yb, 0, 1, BP.dim, 5);
          if (yb - ya > 34) { c.save(); c.translate(x - 4, (ya + yb) / 2); c.rotate(-Math.PI / 2); c.font = '600 ' + (W < 420 ? 8.5 : 9.5) + 'px ' + MONO; var tw = c.measureText(d.label).width; if (tw < yb - ya - 12) { c.fillStyle = BP.bg; c.fillRect(-tw / 2 - 3, -8, tw + 6, 11); kit.text(c, d.label, 0, 0, { align: 'center', size: W < 420 ? 8.5 : 9.5, col: d.col ? BP.line : BP.dim }); } c.restore(); }
        });
        if (spec.span) {
          var sy = L.cy + spec.span.y * u, sa = L.cx + spec.span.x0 * u, sb = L.cx + spec.span.x1 * u;
          kit.line(c, [sa, sy - 10, sa, sy + 4], BP.faint, 0.7); kit.line(c, [sb, sy - 10, sb, sy + 4], BP.faint, 0.7);
          kit.line(c, [sa, sy, sb, sy], BP.dim, 0.9); kit.head(c, sa, sy, -1, 0, BP.dim, 5); kit.head(c, sb, sy, 1, 0, BP.dim, 5);
          kit.text(c, spec.span.label, (sa + sb) / 2, sy + 13, { align: 'center', size: 9.5, col: BP.line });
        }
        c.globalAlpha = 1;
      }
      var order = parts.map(function (p, i) { return { p: p, z: p.z != null ? p.z : (spec.bottomUp ? -i : i) }; }).sort(function (a, b) { return a.z - b.z; }).map(function (q) { return q.p; });
      order.forEach(function (p) {
        var o = off(p, t), x = L.cx + o[0] * u, y = L.cy + (p.y + o[1]) * u;
        c.save(); c.translate(x, y); p.draw(c, u, kit, { t: t, clock: clock, selected: sel === p.id }); c.restore();
        var hw = (spec.width || 10) / 2, rx0 = x + (p.x0 != null ? p.x0 : -hw) * u, rx1 = x + (p.x1 != null ? p.x1 : hw) * u;
        hits.push({ p: p, x0: rx0 - 4, x1: rx1 + 4, y0: y - 4, y1: y + p.h * u + 4 });
        if (sel === p.id) {
          c.setLineDash([4, 3]); c.strokeStyle = BP.amber; c.lineWidth = 1.2; c.strokeRect(rx0 - 5, y - 5, rx1 - rx0 + 10, p.h * u + 10); c.setLineDash([]);
        }
      });
      if (spec.overlay) spec.overlay(c, { u: u, cx: L.cx, cy: L.cy, t: t, W: W, H: H, clock: clock, off: function (id) { var p = parts.filter(function (q) { return q.id === id; })[0]; return off(p, t); } });
      // callouts: numbered balloons with leader lines, spread out so they never overlap
      var la = clamp((t - 0.45) / 0.4, 0, 1);
      if (la > 0) {
        var items = labelled.map(function (p) {
          var o = off(p, t), hw = (spec.width || 10) / 2, ax = L.cx + ((p.x1 != null ? p.x1 : hw) + o[0]) * u, ay = L.cy + (p.y + o[1] + p.h * (p.anchor == null ? 0.5 : p.anchor)) * u;
          return { p: p, ax: ax, ay: ay, ly: ay };
        }).sort(function (a, b) { return a.ay - b.ay; });
        var subs = !L.bo && labelled.some(function (p) { return p.sub; }), gap = (L.bo ? 25 : W < 420 ? 30 : 34) + (subs ? 10 : 0), top = 44, bot = H - (subs ? 24 : 16);
        for (var i = 1; i < items.length; i++) items[i].ly = Math.max(items[i].ly, items[i - 1].ly + gap);
        if (items.length && items[items.length - 1].ly > bot) {
          items[items.length - 1].ly = bot;
          for (i = items.length - 2; i >= 0; i--) items[i].ly = Math.min(items[i].ly, items[i + 1].ly - gap);
        }
        items.forEach(function (it) { it.ly = Math.max(top, it.ly); });
        c.globalAlpha = la;
        items.forEach(function (it) {
          var bx = L.labelX, on = sel === it.p.id, col = on ? BP.amber : BP.line;
          kit.line(c, [it.ax + 3, it.ay, bx - (L.bo ? 16 : 22), it.ay, bx - (L.bo ? 10 : 12), it.ly], on ? BP.amber : BP.faint, on ? 1.2 : 0.9);
          c.fillStyle = BP.line; c.beginPath(); c.arc(it.ax + 2, it.ay, 2, 0, 6.3); c.fill();
          c.fillStyle = BP.deep; c.strokeStyle = col; c.lineWidth = 1.2; c.beginPath(); c.arc(bx, it.ly, L.bo ? 9 : 10, 0, 6.3); c.fill(); c.stroke();
          kit.text(c, String(it.p.no), bx, it.ly + 3.5, { align: 'center', size: 10, col: col, weight: 700 });
          if (!L.bo) kit.text(c, it.p.name.toUpperCase(), bx + 15, it.ly + 3.5, { size: W < 420 ? 9.5 : 10.5, col: col });
          if (it.p.sub && !L.bo) kit.text(c, '(' + it.p.sub.toUpperCase() + ')', bx + 15, it.ly + 16, { size: W < 420 ? 8 : 9, col: on ? BP.amber : BP.dim, weight: 500 });
          hits.push({ p: it.p, x0: bx - 12, x1: L.bo ? bx + 12 : W, y0: it.ly - 13, y1: it.ly + (it.p.sub ? 20 : 13), label: true });
        });
        c.globalAlpha = 1;
      }
    }

    function resize() {
      dpr = Math.min(window.devicePixelRatio || 1, 2.5);
      W = Math.max(260, canvas.clientWidth); H = spec.height ? spec.height(W) : Math.round(W * 1.3);
      canvas.style.height = H + 'px'; canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr); c.setTransform(dpr, 0, 0, dpr, 0, 0);
      render();
    }
    canvas.addEventListener('pointerdown', function (e) {
      var r = canvas.getBoundingClientRect(), x = e.clientX - r.left, y = e.clientY - r.top, hit = null;
      for (var i = hits.length - 1; i >= 0; i--) { var h = hits[i]; if (x >= h.x0 && x <= h.x1 && y >= h.y0 && y <= h.y1) { hit = h.p; break; } }
      sel = hit ? hit.id : null; pickFns.forEach(function (f) { f(hit); }); render();
    });

    var view = {
      kit: kit,
      t: function () { return t; },
      set: function (v) { t = clamp(v, 0, 1); dur = 0; render(); },
      animateTo: function (v, sec) { from = t; to = clamp(v, 0, 1); dur = sec || 1.6; el = 0; },
      busy: function () { return dur > 0; },
      tick: function (dt) { clock += dt; if (dur > 0) { el += dt; var k = clamp(el / dur, 0, 1); t = from + (to - from) * k; if (k >= 1) dur = 0; } render(); },
      select: function (id) { sel = id; render(); },
      onPick: function (fn) { pickFns.push(fn); },
      resize: resize, render: render
    };
    resize();
    return view;
  }
  window.AriExploded = { create: create, kit: kit };
})();
