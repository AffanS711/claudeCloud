(async () => {
const W = 1920, H = 1080, DUR = 20;
const cv = document.getElementById('c'); const main = cv.getContext('2d');
let ctx = main;
const off = document.createElement('canvas'); off.width = W; off.height = H; const octx = off.getContext('2d');
const acc = document.createElement('canvas'); acc.width = W; acc.height = H; const actx = acc.getContext('2d');

// ================= palette & type =================
const PAPER = '#F4F2EE', INK = '#15161A', TANG = '#FF6A2B', TEAL = '#12B3A6', BUTTER = '#FFD34D', LILAC = '#B7A6FF', RED = '#FF4B4B', SCREEN = '#1E2A33';
const SKINS = ['#F2C9A5', '#D9A07A', '#A86B45', '#6E4128', '#F5D6BF'];
const HAIRS = ['#2B1D14', '#5A3A22', '#111111', '#C98B45', '#3A2A1E'];
await Promise.all([
  document.fonts.load('900 expanded 100px Archivo'), document.fonts.load('300 100px Archivo'),
  document.fonts.load('italic 500 100px "Bodoni Moda"'), document.fonts.load('500 100px "IBM Plex Mono"'),
]);
const hex = (c) => [1, 3, 5].map((i) => parseInt(c.slice(i, i + 2), 16));
const mixC = (a, b, k) => { const A = hex(a), B = hex(b); return `rgb(${A.map((v, i) => Math.round(v + (B[i] - v) * k)).join(',')})`; };
const shade = (c, k) => { const A = hex(c); return `rgb(${A.map((v) => Math.round(v * k)).join(',')})`; };

// ================= easing =================
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const seg = (t, a, b) => clamp((t - a) / (b - a));
const lerp = (a, b, x) => a + (b - a) * x;
const eio = (x) => x < .5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
const eout = (x) => 1 - Math.pow(1 - x, 3);
const e5 = (x) => 1 - Math.pow(1 - x, 5);
const ein = (x) => x * x * x;
const back = (x, s = 1.9) => x <= 0 ? 0 : x >= 1 ? 1 : 1 + (s + 1) * Math.pow(x - 1, 3) + s * Math.pow(x - 1, 2);
const elastic = (x) => x <= 0 ? 0 : x >= 1 ? 1 : Math.pow(2, -10 * x) * Math.sin((x * 10 - .75) * (2 * Math.PI / 3)) + 1;
const pop = (t, a, d = .45, s) => back(seg(t, a, a + d), s);
const spring = (t, a, f = 14, k = 5) => t < a ? 0 : Math.exp(-(t - a) * k) * Math.sin((t - a) * f);
function rng(seed) { return () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }

// ================= primitives =================
function font(kind, size) {
  ctx.font = kind === 'exp' ? `900 ${size}px Archivo` : kind === 'light' ? `300 ${size}px Archivo` : kind === 'bod' ? `italic 500 ${size}px "Bodoni Moda"` : `500 ${size}px "IBM Plex Mono"`;
  ctx.fontStretch = kind === 'exp' ? 'expanded' : 'normal';
}
function text(str, x, y, { kind = 'exp', size = 100, color = INK, align = 'center', alpha = 1, scale = 1, sx = 1, sy = 1, rot = 0, sp = 0, stroke = 0, outline = 0, shadow = null } = {}) {
  if (alpha <= .002 || scale <= .001) return;
  ctx.save(); ctx.globalAlpha *= clamp(alpha); ctx.translate(x, y); ctx.rotate(rot); ctx.scale(scale * sx, scale * sy);
  font(kind, size); ctx.letterSpacing = sp + 'px'; ctx.textAlign = align; ctx.textBaseline = 'alphabetic'; ctx.lineJoin = 'round';
  if (shadow) { ctx.fillStyle = shadow.color; ctx.fillText(str, shadow.x, shadow.y); }
  if (outline) { ctx.lineWidth = outline; ctx.strokeStyle = color; ctx.strokeText(str, 0, 0); }
  else { ctx.fillStyle = color; ctx.fillText(str, 0, 0); if (stroke) { ctx.lineWidth = stroke; ctx.strokeStyle = color; ctx.strokeText(str, 0, 0); } }
  ctx.restore();
}
function tw(str, kind, size, sp = 0) { font(kind, size); ctx.letterSpacing = sp + 'px'; return ctx.measureText(str).width; }
function layout(parts, size, kind, gap) {
  const ws = parts.map((p) => tw(p.s, p.kind || kind, size)); const total = ws.reduce((a, b) => a + b, 0) + gap * size * (parts.length - 1);
  const xs = []; let x = -total / 2; ws.forEach((w) => { xs.push(x); x += w + gap * size; }); return { ws, xs, total };
}
// words rise through a mask, with optional highlight chips behind words
function popLine(parts, cx, y, t, t0, { size = 100, kind = 'exp', stagger = .07, d = .5, gap = .28, color = INK, exitAt = 99 } = {}) {
  const L = layout(parts, size, kind, gap);
  parts.forEach((p, i) => {
    const x = cx + L.xs[i], w = L.ws[i]; const a = t0 + i * stagger;
    const k = back(seg(t, a, a + d), 1.6);
    const ex = ein(seg(t, exitAt + i * .025, exitAt + .28 + i * .025));
    if (k <= 0) return;
    if (p.hl) {
      const hk = e5(seg(t, a + .22, a + .5));
      if (hk > 0) { ctx.save(); ctx.fillStyle = p.hl; ctx.beginPath(); ctx.roundRect(x - size * .14, y - size * .86, (w + size * .28) * hk, size * 1.06, size * .16); ctx.fill(); ctx.restore(); }
    }
    ctx.save(); ctx.beginPath(); ctx.rect(x - size * .3, y - size * 1.05, w + size * .6, size * 1.35); ctx.clip();
    text(p.s, x + w / 2, y + (1 - k) * size * 1.15 + ex * size * 1.2, { kind: p.kind || kind, size, color: p.color || color });
    ctx.restore();
  });
  return L;
}
const rrect = (x, y, w, h, r) => { ctx.beginPath(); ctx.roundRect(x, y, w, h, r); };
const circle = (x, y, r) => { ctx.beginPath(); ctx.arc(x, y, Math.max(0, r), 0, Math.PI * 2); };
const bgFill = (c) => { ctx.fillStyle = c; ctx.fillRect(-50, -50, W + 100, H + 100); };
function smoothClosed(pts) {
  const n = pts.length; ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]);
  for (let i = 0; i < n; i++) { const p0 = pts[(i - 1 + n) % n], p1 = pts[i], p2 = pts[(i + 1) % n], p3 = pts[(i + 2) % n]; ctx.bezierCurveTo(p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6, p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6, p2[0], p2[1]); }
  ctx.closePath();
}
function arrowLine(x1, y1, x2, y2, p, color, lw = 5) {
  if (p <= 0) return; const x = lerp(x1, x2, p), y = lerp(y1, y2, p); const a = Math.atan2(y2 - y1, x2 - x1);
  ctx.save(); ctx.strokeStyle = color; ctx.lineWidth = lw; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x, y); ctx.moveTo(x - Math.cos(a - .5) * 16, y - Math.sin(a - .5) * 16); ctx.lineTo(x, y); ctx.lineTo(x - Math.cos(a + .5) * 16, y - Math.sin(a + .5) * 16); ctx.stroke(); ctx.restore();
}
function sparks(x, y, t, t0, { n = 8, r0 = 60, r1 = 140, color = INK, lw = 7, rot = 0 } = {}) {
  const lt = t - t0; if (lt < 0 || lt > .45) return; const k = e5(seg(lt, 0, .45));
  ctx.save(); ctx.strokeStyle = color; ctx.lineWidth = lw * (1 - k * .7); ctx.lineCap = 'round';
  for (let i = 0; i < n; i++) { const a = rot + i / n * Math.PI * 2; const ra = lerp(r0, r1, k), rb = lerp(r0, r1, clamp(k * 1.6 - .25)); ctx.beginPath(); ctx.moveTo(x + Math.cos(a) * rb, y + Math.sin(a) * rb); ctx.lineTo(x + Math.cos(a) * ra, y + Math.sin(a) * ra); ctx.stroke(); }
  ctx.restore();
}
function star(x, y, r, color, a = 1) { if (a <= 0) return; ctx.save(); ctx.globalAlpha *= a; ctx.fillStyle = color; ctx.beginPath(); for (let i = 0; i < 8; i++) { const rr = i % 2 ? r * .28 : r, an = i / 8 * Math.PI * 2 - Math.PI / 2; ctx.lineTo(x + Math.cos(an) * rr, y + Math.sin(an) * rr); } ctx.closePath(); ctx.fill(); ctx.restore(); }
function confetti(t, t0, cx, cy, n, seed, colors, power = 1) {
  const r = rng(seed); const lt = t - t0; if (lt < 0 || lt > 1.8) return;
  for (let i = 0; i < n; i++) {
    const a = r() * Math.PI * 2, v = (380 + r() * 760) * power, sz = 9 + r() * 16, spin = (r() - .5) * 12, kind = Math.floor(r() * 4), col = colors[Math.floor(r() * colors.length)], flip = r() * 6;
    const d = v * (1 - Math.exp(-lt * 3.4)) / 3.4 * 3;
    const px = cx + Math.cos(a) * d, py = cy + Math.sin(a) * d * .8 + lt * lt * 300;
    ctx.save(); ctx.globalAlpha = 1 - seg(lt, 1.1, 1.8); ctx.translate(px, py); ctx.rotate(spin * lt); ctx.scale(1, Math.cos(lt * 9 + flip)); ctx.fillStyle = col; ctx.strokeStyle = col; ctx.lineWidth = 5; ctx.lineCap = 'round';
    if (kind === 0) { circle(0, 0, sz * .45); ctx.fill(); } else if (kind === 1) ctx.fillRect(-sz / 2, -sz / 4, sz, sz / 2);
    else if (kind === 2) { ctx.beginPath(); ctx.moveTo(-sz, 0); ctx.quadraticCurveTo(-sz / 2, -sz * .6, 0, 0); ctx.quadraticCurveTo(sz / 2, sz * .6, sz, 0); ctx.stroke(); }
    else { ctx.beginPath(); ctx.moveTo(0, -sz * .55); ctx.lineTo(sz * .5, sz * .4); ctx.lineTo(-sz * .5, sz * .4); ctx.closePath(); ctx.fill(); }
    ctx.restore();
  }
}
function floaters(t, seed, colors, n = 14, alpha = .5) {
  const r = rng(seed);
  for (let i = 0; i < n; i++) {
    const x = r() * W, y = r() * H, s = 12 + r() * 30, sp = .3 + r() * .6, ph = r() * 6, kind = Math.floor(r() * 4), col = colors[i % colors.length];
    const px = x + Math.sin(t * sp + ph) * 30, py = y + Math.cos(t * sp * .8 + ph) * 26;
    ctx.save(); ctx.globalAlpha *= alpha; ctx.translate(px, py); ctx.rotate(t * sp * .5 + ph); ctx.strokeStyle = col; ctx.fillStyle = col; ctx.lineWidth = 6; ctx.lineCap = 'round';
    if (kind === 0) { circle(0, 0, s * .45); ctx.stroke(); } else if (kind === 1) ctx.fillRect(-s / 2, -s / 2, s, s);
    else if (kind === 2) { ctx.beginPath(); ctx.moveTo(0, -s / 2); ctx.lineTo(s / 2, s / 2); ctx.lineTo(-s / 2, s / 2); ctx.closePath(); ctx.stroke(); }
    else { ctx.beginPath(); ctx.moveTo(-s * .6, 0); ctx.lineTo(s * .6, 0); ctx.moveTo(0, -s * .6); ctx.lineTo(0, s * .6); ctx.stroke(); }
    ctx.restore();
  }
}
// dot grid texture
function makeDotPattern(color) { const c = document.createElement('canvas'); c.width = c.height = 48; const g = c.getContext('2d'); g.fillStyle = color; g.beginPath(); g.arc(24, 24, 2.2, 0, Math.PI * 2); g.fill(); return c; }
const DOT_LIGHT = makeDotPattern('rgba(21,22,26,.075)'), DOT_DARK = makeDotPattern('rgba(255,255,255,.055)'), DOT_COL = makeDotPattern('rgba(255,255,255,.14)');
function dotGrid(img, t, a = 1, speed = 12) { if (a <= 0) return; ctx.save(); ctx.globalAlpha *= a; const pat = ctx.createPattern(img, 'repeat'); ctx.translate((t * speed) % 48, (t * speed * .5) % 48); ctx.fillStyle = pat; ctx.fillRect(-96, -96, W + 192, H + 192); ctx.restore(); }

// ================= glasses =================
const LB = { round: .95, rect: .58, square: .8, cat: .72, aviator: .85, wayfarer: .78 };
function lensPts(shape, a, b, n = 72) {
  const e = { round: 2, rect: 6, square: 4.2, cat: 3, aviator: 2.3, wayfarer: 3.4 }[shape] || 3; const pts = [];
  for (let i = 0; i < n; i++) {
    const th = i / n * Math.PI * 2, c = Math.cos(th), s = Math.sin(th);
    let x = a * Math.sign(c) * Math.pow(Math.abs(c), 2 / e), y = -b * Math.sign(s) * Math.pow(Math.abs(s), 2 / e);
    if (shape === 'cat' && y < 0) y -= Math.max(0, -x / a - .1) * b * .8;
    if (shape === 'aviator' && y > 0) { y *= 1.3; if (x > 0) x *= 1 - .35 * (y / (b * 1.3)); }
    if (shape === 'wayfarer' && y < 0) y -= Math.max(0, -x / a - .3) * b * .3;
    pts.push([x, y]);
  }
  return pts;
}
const pathPts = (pts) => { ctx.beginPath(); pts.forEach(([px, py], i) => (i ? ctx.lineTo(px, py) : ctx.moveTo(px, py))); ctx.closePath(); };
function glasses(x, y, lw, o = {}) {
  const shape = o.shape || 'square', b = LB[shape] * lw, gap = lw * .42, cxs = lw + gap / 2, sw = o.stroke || Math.max(3, lw * .16), p = o.p ?? 1;
  ctx.save(); ctx.translate(x, y); ctx.rotate(o.rot || 0); if (o.sc) ctx.scale(o.sc, o.sc);
  ctx.lineJoin = 'round'; ctx.lineCap = 'round';
  [-1, 1].forEach((side) => {
    const pts = lensPts(shape, lw, b).map(([px, py]) => [side * (cxs - px), py]);
    const fc = side < 0 ? o.fillL : (o.fillR || o.fillL); const lv = o.level ?? 1;
    if (fc && lv > 0) {
      ctx.save(); pathPts(pts); ctx.clip(); ctx.fillStyle = fc;
      if (o.liquid) {
        const top = b + 14 - lv * (2 * b + 60);
        ctx.beginPath(); ctx.moveTo(side * cxs - lw - 30, b * 1.6 + 30);
        for (let xx = -lw - 30; xx <= lw + 30; xx += 6) ctx.lineTo(side * cxs + xx, top + Math.sin(xx * .05 + (o.wave || 0) + side * 1.3) * lw * .07 * (1 - lv * .5));
        ctx.lineTo(side * cxs + lw + 30, b * 1.6 + 30); ctx.closePath(); ctx.fill();
      } else ctx.fillRect(side * cxs - lw - 10, -b * 1.8, 2 * lw + 20, b * 3.6);
      if (o.shine) { ctx.globalAlpha = .55 * o.shine; ctx.strokeStyle = PAPER; ctx.lineWidth = lw * .1; ctx.beginPath(); ctx.moveTo(side * cxs - lw * .45, b * .6); ctx.lineTo(side * cxs - lw * .05, -b * .55); ctx.stroke(); ctx.lineWidth = lw * .05; ctx.beginPath(); ctx.moveTo(side * cxs - lw * .15, b * .75); ctx.lineTo(side * cxs + lw * .2, -b * .3); ctx.stroke(); }
      ctx.restore();
    }
    ctx.strokeStyle = o.color || INK; ctx.lineWidth = sw; const per = lw * 7;
    pathPts(pts); if (p < 1) ctx.setLineDash([per * p, per]); ctx.stroke(); ctx.setLineDash([]);
  });
  const bp = seg(p, .55, 1);
  if (bp > 0) {
    ctx.strokeStyle = o.color || INK; ctx.lineWidth = sw;
    ctx.beginPath(); ctx.moveTo(-gap / 2 - sw * .2, -b * .25); ctx.quadraticCurveTo(0, -b * .75, lerp(-gap / 2, gap / 2 + sw * .2, bp), -b * .25 - Math.sin(bp * Math.PI) * b * .12); ctx.stroke();
    if (o.temples !== false) [-1, 1].forEach((s) => { ctx.beginPath(); ctx.moveTo(s * (cxs + lw * .98), -b * .45); ctx.lineTo(s * (cxs + lw * .98 + lw * .35 * bp), -b * .55); ctx.stroke(); });
  }
  ctx.restore();
  return { cxs, b };
}

// ================= faces =================
const SHAPES = {
  oval: { fw: .4, cw: .5, jw: .36, ch: .12, len: 1.33 }, round: { fw: .44, cw: .52, jw: .44, ch: .24, len: 1.08 },
  square: { fw: .47, cw: .5, jw: .5, ch: .34, len: 1.12 }, heart: { fw: .52, cw: .49, jw: .3, ch: .05, len: 1.28 }, long: { fw: .4, cw: .44, jw: .38, ch: .15, len: 1.55 },
};
const mixShape = (a, b, k) => Object.fromEntries(Object.keys(a).map((key) => [key, lerp(a[key], b[key], k)]));
function faceOutline(sh, h) {
  const Wd = h / sh.len;
  const half = [[0, -.5], [sh.fw * .72, -.47], [sh.fw, -.3], [sh.cw, -.02], [sh.jw, .3], [sh.ch + .02, .47]].map(([x, y]) => [x * Wd, y * h]);
  return { pts: half.concat([[0, .5 * h]], half.slice(1).reverse().map(([x, y]) => [-x, y])), Wd };
}
function face(f) {
  const { x, y, h } = f; const sh = f.shape; const { pts, Wd } = faceOutline(sh, h);
  ctx.save(); ctx.translate(x, y); if (f.rot) ctx.rotate(f.rot); if (f.sc !== undefined) ctx.scale(f.sc * (f.sx || 1), f.sc * (f.sy || 1));
  ctx.fillStyle = f.shirt || INK;
  ctx.beginPath(); ctx.moveTo(-Wd * 1.05, h * 1.05); ctx.quadraticCurveTo(-Wd * .95, h * .62, -Wd * .2, h * .6); ctx.lineTo(Wd * .2, h * .6); ctx.quadraticCurveTo(Wd * .95, h * .62, Wd * 1.05, h * 1.05); ctx.closePath(); ctx.fill();
  ctx.fillStyle = shade(f.shirt || INK, .82); ctx.beginPath(); ctx.moveTo(-Wd * .22, h * .6); ctx.quadraticCurveTo(0, h * .78, Wd * .22, h * .6); ctx.closePath(); ctx.fill();
  ctx.fillStyle = f.skin; rrect(-Wd * .17, h * .35, Wd * .34, h * .3, Wd * .1); ctx.fill();
  ctx.fillStyle = 'rgba(0,0,0,.12)'; rrect(-Wd * .17, h * .38, Wd * .34, h * .08, Wd * .04); ctx.fill();
  if (f.hairStyle === 'bob' || f.hairStyle === 'long') { ctx.fillStyle = f.hair; const L = f.hairStyle === 'long' ? .75 : .38; rrect(-Wd * (sh.cw + .12), -h * .52, Wd * (sh.cw + .12) * 2, h * (.52 + L), Wd * .45); ctx.fill(); }
  ctx.fillStyle = f.skin; [-1, 1].forEach((s) => { ctx.beginPath(); ctx.ellipse(s * Wd * (sh.cw - .02), h * .02, Wd * .08, h * .09, 0, 0, Math.PI * 2); ctx.fill(); });
  smoothClosed(pts); ctx.fillStyle = f.skin; ctx.fill();
  if (f.hairStyle !== 'bald') {
    ctx.save(); smoothClosed(pts); ctx.clip(); ctx.fillStyle = f.hair; ctx.beginPath();
    const fr = -.2;
    ctx.moveTo(-Wd * .8, -h * .6); ctx.lineTo(Wd * .8, -h * .6); ctx.lineTo(Wd * .8, h * fr);
    ctx.quadraticCurveTo(Wd * .25, h * (fr - .12), -Wd * .05, h * (fr - .02)); ctx.quadraticCurveTo(-Wd * .4, h * (fr + .06), -Wd * .8, h * (fr - .05)); ctx.closePath(); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.12)'; ctx.beginPath(); ctx.ellipse(-Wd * .15, -h * .4, Wd * .22, h * .05, -.3, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
    if (f.hairStyle === 'bun') { ctx.fillStyle = f.hair; circle(0, -h * .56, Wd * .2); ctx.fill(); }
  }
  if (f.guide) { ctx.save(); smoothClosed(pts.map(([px, py]) => [px * 1.09, py * 1.07])); ctx.setLineDash([14, 12]); ctx.lineDashOffset = -(f.t || 0) * 40; ctx.lineWidth = 4; ctx.strokeStyle = f.guideColor || PAPER; ctx.globalAlpha *= f.guide; ctx.stroke(); ctx.restore(); }
  const ex = Wd * .19; ctx.fillStyle = INK; const bl = f.blink ? 1 - f.blink : 1;
  [-1, 1].forEach((s) => { ctx.beginPath(); ctx.ellipse(s * ex + (f.look || 0) * Wd * .02, 0, Wd * .035, Wd * .042 * Math.max(.12, bl), 0, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = '#fff'; circle(s * ex + Wd * .012, -Wd * .014, Wd * .01); ctx.fill(); ctx.fillStyle = INK; });
  ctx.strokeStyle = f.hair === '#C98B45' ? '#8A5A2A' : INK; ctx.lineWidth = Math.max(3, Wd * .03); ctx.lineCap = 'round';
  const mood = f.mood ?? 1;
  [-1, 1].forEach((s) => { ctx.beginPath(); ctx.moveTo(s * (ex - Wd * .08), -h * .1 - (mood < 0 ? -h * .018 * (-mood) : 0) + (f.brow || 0) * -h * .03); ctx.quadraticCurveTo(s * ex, -h * .13 + (f.brow || 0) * -h * .03, s * (ex + Wd * .09), -h * .1 + (mood < 0 ? h * .02 * (-mood) : 0) + (f.brow || 0) * -h * .03); ctx.stroke(); });
  ctx.strokeStyle = 'rgba(0,0,0,.28)'; ctx.beginPath(); ctx.moveTo(-Wd * .01, h * .02); ctx.quadraticCurveTo(-Wd * .07, h * .14, Wd * .02, h * .15); ctx.stroke();
  ctx.strokeStyle = INK; ctx.beginPath(); ctx.moveTo(-Wd * .13, h * .27); ctx.quadraticCurveTo(0, h * (.27 + .07 * mood), Wd * .13, h * .27); ctx.stroke();
  ctx.fillStyle = 'rgba(255,110,90,.25)'; [-1, 1].forEach((s) => { circle(s * Wd * .3, h * .12, Wd * .07); ctx.fill(); });
  if (f.g) { const g = f.g; glasses((g.dx || 0) * Wd, (g.dy || 0) * h, Wd * .17 * (g.scale || 1), { shape: g.shape, color: g.color || INK, p: g.p ?? 1, rot: g.rot || 0, fillL: g.tint || 'rgba(255,255,255,.22)', shine: g.shine ?? .6 }); }
  ctx.restore();
  return Wd;
}
const HERO = { shape: SHAPES.oval, skin: SKINS[1], hair: HAIRS[0], hairStyle: 'short', shirt: TANG };
const blink = (t, ph = 0) => { const c = (t * .45 + ph) % 1; return c > .96 ? Math.sin((c - .96) / .04 * Math.PI) : 0; };

// ================= badges & icons =================
function xBadge(x, y, k, r = 34) {
  if (k <= 0) return; ctx.save(); ctx.translate(x, y); ctx.scale(k, k); ctx.rotate((1 - k) * -.9);
  circle(3, 5, r); ctx.fillStyle = 'rgba(0,0,0,.35)'; ctx.fill(); circle(0, 0, r); ctx.fillStyle = RED; ctx.fill();
  ctx.strokeStyle = PAPER; ctx.lineWidth = r * .22; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(-r * .33, -r * .33); ctx.lineTo(r * .33, r * .33); ctx.moveTo(r * .33, -r * .33); ctx.lineTo(-r * .33, r * .33); ctx.stroke(); ctx.restore();
}
function check(x, y, k, r = 34, bg = TEAL) {
  if (k <= 0) return; ctx.save(); ctx.translate(x, y); ctx.scale(k, k);
  circle(0, 0, r); ctx.fillStyle = bg; ctx.fill(); ctx.strokeStyle = PAPER; ctx.lineWidth = r * .22; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  const d = clamp(k * 1.2); ctx.beginPath(); ctx.moveTo(-r * .4, 0); ctx.lineTo(-r * .1, r * .3); if (d > .5) ctx.lineTo(lerp(-r * .1, r * .45, (d - .5) * 2), lerp(r * .3, -r * .3, (d - .5) * 2)); ctx.stroke(); ctx.restore();
}
function squiggle(x, y, w, p, color, lw = 10, amp = 10, waves = 5) {
  if (p <= 0) return; ctx.save(); ctx.strokeStyle = color; ctx.lineWidth = lw; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.beginPath();
  const n = 80; for (let i = 0; i <= n * p; i++) { const u = i / n; const px = x + u * w, py = y + Math.sin(u * Math.PI * waves) * amp; i ? ctx.lineTo(px, py) : ctx.moveTo(px, py); }
  ctx.stroke(); ctx.restore();
}
function tag(x, y, str, k, dot = RED, fg = PAPER, bg = 'rgba(255,255,255,.1)') {
  if (k <= 0) return; ctx.save(); ctx.translate(x, y); ctx.scale(k, k);
  const w = tw(str, 'mono', 22, 2) + 58; rrect(-w / 2, -22, w, 44, 22); ctx.fillStyle = bg; ctx.fill();
  circle(-w / 2 + 22, 0, 6); ctx.fillStyle = dot; ctx.fill();
  text(str, -w / 2 + 38, 8, { kind: 'mono', size: 22, color: fg, align: 'left', sp: 2 }); ctx.restore();
}
function shapeIcon(kind, x, y, s, p, color) {
  if (p <= 0) return; ctx.save(); ctx.translate(x, y); ctx.strokeStyle = color; ctx.lineWidth = 6; ctx.lineJoin = 'round'; ctx.lineCap = 'round';
  const per = s * 5; ctx.setLineDash([per * p, per]); ctx.beginPath();
  if (kind === 'round') ctx.arc(0, 0, s * .5, -Math.PI / 2, Math.PI * 1.5);
  else if (kind === 'square') ctx.roundRect(-s * .45, -s * .45, s * .9, s * .9, s * .12);
  else { ctx.moveTo(0, s * .45); ctx.bezierCurveTo(-s * .7, -s * .05, -s * .45, -s * .6, 0, -s * .25); ctx.bezierCurveTo(s * .45, -s * .6, s * .7, -s * .05, 0, s * .45); }
  ctx.stroke(); ctx.restore();
}
function cursor(x, y, press) { ctx.save(); ctx.translate(x, y); ctx.scale(1 - .15 * press, 1 - .15 * press); ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, 46); ctx.lineTo(12, 35); ctx.lineTo(22, 56); ctx.lineTo(31, 52); ctx.lineTo(21, 31); ctx.lineTo(37, 31); ctx.closePath(); ctx.fillStyle = PAPER; ctx.fill(); ctx.strokeStyle = INK; ctx.lineWidth = 3; ctx.lineJoin = 'round'; ctx.stroke(); ctx.restore(); }

// ================= cue sheet (shared with the soundtrack) =================
const CUES = [];
const cue = (t, type, v = 1, p = 0) => CUES.push({ t: Math.round(t * 1000) / 1000, type, v, p });

// ================= S1 · hook  [0, 2.55] =================
const S1 = { cy: 420, lw: 150 };
function s1(t) {
  bgFill(PAPER); dotGrid(DOT_LIGHT, t, seg(t, .2, .8));
  floaters(t, 3, [TEAL, TANG, BUTTER], 10, .35 * seg(t, .8, 1.4));
  const { cy, lw } = S1; const cxs = lw * 1.21, b = LB.wayfarer * lw;
  const bounce = spring(t, 1.2, 16, 6) * 16;
  const zoomK = ein(seg(t, 2.28, 2.55)); const Z = (1 + .03 * eio(seg(t, 0, 2.3))) * (1 + 150 * zoomK);
  const P = [960 - cxs, cy - b - bounce];
  ctx.save(); ctx.translate(P[0], P[1]); ctx.scale(Z, Z); ctx.rotate(spring(t, 1.9, 12, 5) * .015); ctx.translate(-P[0], -P[1]);
  // dot → split → lenses
  if (t < .95) {
    const d0 = pop(t, 0, .3, 2.4); const ant = seg(t, .22, .35) * (1 - seg(t, .35, .42));
    const split = e5(seg(t, .35, .62)); const land = spring(t, .62, 22, 9);
    for (let j = 5; j >= 0; j--) {
      const sp = j === 0 ? split : e5(seg(t - j * .018, .35, .62)); if (j > 0 && (split <= 0 || split >= 1)) continue;
      [-1, 1].forEach((s) => {
        ctx.save(); ctx.globalAlpha = j === 0 ? 1 : .12; ctx.translate(960 + s * sp * cxs, cy);
        ctx.scale(1 + ant * .35 + land * .3 + (split > 0 && split < 1 ? .25 : 0), 1 - ant * .25 - land * .3 - (split > 0 && split < 1 ? .15 : 0));
        circle(0, 0, 32 * d0 * (1 - seg(t, .7, .95))); ctx.fillStyle = split <= 0 ? INK : (s < 0 ? TEAL : TANG); ctx.fill(); ctx.restore();
      });
    }
  }
  const gp = eio(seg(t, .6, 1.15));
  if (gp > 0) {
    glasses(960, cy - bounce, lw, { shape: 'wayfarer', color: INK, stroke: 22, p: gp, fillL: TEAL, fillR: TANG, liquid: true, level: e5(seg(t, .75, 1.35)), wave: t * 7, shine: seg(t, 1.3, 1.6), sc: 1 + spring(t, 1.2, 16, 6) * .04 });
    sparks(960 - cxs * 1.95, cy - b * 1.2, t, 1.22, { n: 3, r0: 30, r1: 90, color: INK, rot: Math.PI * 1.05 });
    sparks(960 + cxs * 1.95, cy - b * 1.2, t, 1.26, { n: 3, r0: 30, r1: 90, color: INK, rot: Math.PI * 1.8 });
  }
  ctx.restore();
  // copy (does not zoom; drops away)
  const exitA = 1 - seg(t, 2.25, 2.4);
  ctx.save(); ctx.globalAlpha = exitA;
  popLine([{ s: 'Finding' }, { s: 'glasses' }], 960, 720, t, 1.3, { size: 112, stagger: .08 });
  const L2 = popLine([{ s: 'that' }, { s: 'actually' }, { s: 'fit?', color: TANG }], 960, 852, t, 1.45, { size: 112, stagger: .08 });
  squiggle(960 + L2.xs[2], 890, L2.ws[2], eio(seg(t, 1.85, 2.15)), TANG, 11);
  ctx.restore();
}
cue(0, 'pop', 1, 0); cue(.24, 'squish', .5); cue(.35, 'swish', .55); cue(.62, 'pop', .8, 4); cue(.64, 'pop', .8, 7); cue(.6, 'zip', .6); cue(.78, 'bubble', .6); cue(1.22, 'sparkle', .8);
[1.3, 1.38, 1.45, 1.53, 1.61].forEach((a, i) => cue(a, 'tick', .5, i)); cue(1.85, 'scribble', .55); cue(2.2, 'whoosh', .9); cue(2.5, 'thump', 1);

// ================= S2 · problem  [2.5, 5.12] =================
const PROBLEM = [
  { shape: SHAPES.oval, skin: SKINS[0], hair: HAIRS[0], hs: 'short', shirt: TEAL, g: { shape: 'rect', scale: .58 }, label: 'TOO NARROW' },
  { shape: SHAPES.round, skin: SKINS[2], hair: HAIRS[2], hs: 'bob', shirt: TANG, g: { shape: 'square', scale: 1.45 }, label: 'TOO WIDE' },
  { shape: SHAPES.long, skin: SKINS[1], hair: HAIRS[1], hs: 'bun', shirt: LILAC, g: { shape: 'wayfarer', scale: 1, dy: .17 }, label: 'SITS TOO LOW' },
  { shape: SHAPES.square, skin: SKINS[3], hair: HAIRS[2], hs: 'short', shirt: BUTTER, g: { shape: 'aviator', scale: 1.05, rot: .2 }, label: 'CROOKED' },
  { shape: SHAPES.round, skin: SKINS[4], hair: HAIRS[3], hs: 'long', shirt: TEAL, g: { shape: 'round', scale: 1 }, label: 'WRONG SHAPE' },
];
function s2(t) {
  bgFill(INK); dotGrid(DOT_DARK, t + 2.5, 1);
  const pan = lerp(30, -30, eio(seg(t, 0, 2.6)));
  popLine([{ s: 'Most', color: PAPER }, { s: 'frames', color: PAPER }, { s: 'don’t', color: PAPER }, { s: 'fit', color: PAPER }, { s: 'the', color: PAPER }, { s: 'face.', color: INK, hl: BUTTER }], 960, 235, t, .12, { size: 88, stagger: .055 });
  ctx.save(); ctx.translate(pan, 0);
  PROBLEM.forEach((p, i) => {
    const x = 960 + (i - 2) * 345, y = 610, a = .3 + i * .09;
    const k = back(seg(t, a, a + .5), 2.2); if (k <= 0) return;
    const sq = spring(t, a + .28, 20, 8);
    const wob = spring(t, a + .35, 9, 2.2) * .15 + Math.sin(t * 3 + i) * .025;
    const sad = seg(t, 1.8 + i * .07, 2.0 + i * .07);
    face({ x, y: y + (1 - k) * 60, h: 255, sc: k, sx: 1 + sq * .08, sy: 1 - sq * .08, shape: p.shape, skin: p.skin, hair: p.hair, hairStyle: p.hs, shirt: p.shirt, mood: lerp(1, -1, sad), brow: -sad, blink: blink(t, i * .23), look: Math.sin(t * 1.3 + i) * .5,
      g: { ...p.g, rot: (p.g.rot || 0) + wob, shine: .4 } });
    const xk = pop(t, 1.7 + i * .07, .4, 2.6);
    xBadge(x + 118 + spring(t, 1.7 + i * .07 + .3, 40, 10) * 6, y - 150, xk);
    tag(x, y + 262, p.label, pop(t, 1.25 + i * .07, .4));
  });
  ctx.restore();
}
[0, 1, 2, 3, 4, 5].forEach((i) => cue(2.62 + i * .055, 'tick', .35, i)); cue(2.9, 'swipe', .5);
PROBLEM.forEach((_, i) => { cue(2.8 + i * .09, 'pop', .75, i); cue(3.75 + i * .07, 'tick', .4, i + 3); cue(4.2 + i * .07, 'bonk', .8, i); });
cue(4.35, 'wahwah', .6); cue(4.72, 'whoosh', .8); cue(5.0, 'hit', 1);

// iris: two lens shapes open from the centre
function irisPath(p) { const lw = lerp(0, 1650, eio(p)); ctx.beginPath(); [-1, 1].forEach((s) => { const cx = 960 + s * lw * 1.21; lensPts('wayfarer', lw, lw * .78, 60).forEach(([px, py], i) => { const X = cx + s * -px, Y = 560 + py; i ? ctx.lineTo(X, Y) : ctx.moveTo(X, Y); }); ctx.closePath(); }); return lw; }

// ================= S3 · meet Muse  [5.0, 7.1] =================
function s3(t) {
  bgFill(TANG); dotGrid(DOT_COL, t, .35);
  ctx.save(); ctx.translate(960, 560); ctx.rotate(t * .12); ctx.fillStyle = 'rgba(255,255,255,.07)';
  for (let i = 0; i < 16; i++) { ctx.beginPath(); ctx.moveTo(0, 0); ctx.arc(0, 0, 1600, i * Math.PI / 8, i * Math.PI / 8 + Math.PI / 16); ctx.closePath(); ctx.fill(); }
  ctx.restore();
  for (let i = 0; i < 5; i++) { const r = ((Math.max(0, t) * 380 + i * 260) % 1300); ctx.save(); ctx.globalAlpha = .16 * (1 - r / 1300); circle(960, 560, r); ctx.lineWidth = 36; ctx.strokeStyle = PAPER; ctx.stroke(); ctx.restore(); }
  const ex = ein(seg(t, 1.8, 2.1));
  ctx.save(); ctx.translate(0, -ex * 80); ctx.globalAlpha = 1 - ex * .5;
  glasses(960, 175, 72, { shape: 'wayfarer', color: INK, stroke: 13, p: eio(seg(t, .45, .9)), fillL: TEAL, fillR: BUTTER, liquid: true, level: e5(seg(t, .7, 1.15)), wave: t * 8, shine: seg(t, 1.1, 1.3) });
  sparks(960, 175, t, 1.0, { n: 10, r0: 190, r1: 260, color: INK, lw: 6 });
  text('Meet', 960, 318, { kind: 'light', size: 80, color: INK, scale: pop(t, .08, .4, 2.2), alpha: seg(t, .08, .12) });
  const word = 'Muse.'; font('bod', 360); ctx.letterSpacing = '0px'; const total = ctx.measureText(word).width; let x = 960 - total / 2;
  for (let i = 0; i < word.length; i++) {
    font('bod', 360); const w = ctx.measureText(word[i]).width; const a = .22 + i * .06;
    const k = elastic(seg(t, a, a + .75)); const land = spring(t, a + .16, 26, 9);
    text(word[i], x + w / 2, 665 - (1 - k) * 420, { kind: 'bod', size: 360, color: INK, alpha: seg(t, a, a + .04), rot: (1 - k) * .35 * (i % 2 ? 1 : -1), sx: 1 + land * .12, sy: 1 - land * .12, stroke: 2 });
    x += w;
  }
  // swash
  const sp = eio(seg(t, .75, 1.05));
  if (sp > 0) { ctx.save(); ctx.strokeStyle = INK; ctx.lineWidth = 10; ctx.lineCap = 'round'; ctx.beginPath(); const n = 60; for (let i = 0; i <= n * sp; i++) { const u = i / n; const px = lerp(700, 1240, u), py = 722 + Math.sin(u * Math.PI) * 28 - u * 26; i ? ctx.lineTo(px, py) : ctx.moveTo(px, py); } ctx.stroke(); ctx.restore(); }
  popLine([{ s: 'Frames', kind: 'light' }, { s: 'matched', kind: 'light' }, { s: 'to', kind: 'light' }, { s: 'your', kind: 'light' }, { s: 'face.', kind: 'exp', color: PAPER }], 960, 840, t, 1.0, { size: 58, stagger: .05, gap: .3 });
  ctx.restore();
  confetti(t, .42, 960, 520, 90, 11, [INK, PAPER, BUTTER, TEAL], 1.1);
}
cue(5.08, 'pop', .7, 2); [0, 1, 2, 3, 4].forEach((i) => cue(5.22 + i * .06, 'boing', .7, i)); cue(5.42, 'confetti', .8); cue(5.45, 'zip', .5); cue(5.7, 'bubble', .5); cue(5.75, 'scribble', .5); cue(6.0, 'sparkle', .6);
[0, 1, 2, 3, 4].forEach((i) => cue(6.0 + i * .05, 'tick', .35, i)); cue(6.7, 'swoosh', .85);

// stripes: INK, BUTTER, TEAL, then S4 (paper)
const STRIPES = [INK, BUTTER, TEAL];
function stripeRegion(k) { const x = lerp(-500, W + 500, k); ctx.beginPath(); ctx.moveTo(-600, 0); ctx.lineTo(x + 250, 0); ctx.lineTo(x - 250, H); ctx.lineTo(-600, H); ctx.closePath(); }

// ================= S4 · how it works  [7.0, 11.0] =================
const PH = { x: 600, y: 560 };
const STEP_T = [0, 1.5, 2.5];
function phoneFace(t, lt3) {
  const hasG = lt3 !== null && lt3 >= 1.05;
  return { x: 0, y: -20, h: 330, ...HERO, blink: blink(t, .3), g: hasG ? { shape: 'square', color: INK, scale: 1, tint: 'rgba(18,179,166,.35)', rot: spring(lt3, 1.05, 18, 6) * .08, dy: -spring(lt3, 1.05, 14, 6) * .04 } : null };
}
function phone(t, step, lt, screenCol) {
  const k = back(seg(t, 0, .55), 1.4); const rot = (1 - e5(seg(t, 0, .7))) * .12;
  ctx.save(); ctx.translate(PH.x, PH.y + (1 - k) * 1100); ctx.rotate(rot);
  rrect(-210 + 18, -400 + 22, 420, 800, 60); ctx.fillStyle = 'rgba(21,22,26,.14)'; ctx.fill();
  rrect(-210, -400, 420, 800, 60); ctx.fillStyle = INK; ctx.fill();
  rrect(-190, -380, 380, 760, 44); ctx.fillStyle = screenCol; ctx.fill();
  ctx.save(); rrect(-190, -380, 380, 760, 44); ctx.clip();
  dotGrid(DOT_DARK, t, .8, 0);
  const lt3 = step === 3 ? lt : null;
  face(phoneFace(t, lt3));
  // scan corners
  const bk = back(seg(t, .2, .45)); const pul = 1 + Math.sin(t * 8) * .02 * (step === 1 ? 1 : 0);
  if (bk > 0) { ctx.save(); ctx.scale(bk * pul, bk * pul); ctx.strokeStyle = TEAL; ctx.lineWidth = 7; ctx.lineCap = 'round'; [[-1, -1], [1, -1], [1, 1], [-1, 1]].forEach(([a, b]) => { ctx.beginPath(); ctx.moveTo(a * 150, b * 210 - b * 40 - 20); ctx.lineTo(a * 150, b * 210 - 20); ctx.lineTo(a * 110, b * 210 - 20); ctx.stroke(); }); ctx.restore(); }
  if (step === 1) {
    const sy = lerp(-330, 330, eio(seg(lt, .3, 1.2)));
    const g = ctx.createLinearGradient(0, sy - 140, 0, sy); g.addColorStop(0, 'rgba(18,179,166,0)'); g.addColorStop(1, 'rgba(18,179,166,.5)');
    ctx.fillStyle = g; ctx.fillRect(-190, sy - 140, 380, 140); ctx.fillStyle = '#7FF3E8'; ctx.fillRect(-190, sy - 3, 380, 6);
  }
  const Wd = 330 / HERO.shape.len;
  const P = [[-Wd * .19, -20], [Wd * .19, -20], [0, 25], [-Wd * .13, 69], [Wd * .13, 69], [0, 145], [-Wd * .5, -25], [Wd * .5, -25], [-Wd * .36, 79], [Wd * .36, 79], [-Wd * .3, -70], [Wd * .3, -70], [0, -155]];
  const E = [[0, 1], [0, 2], [1, 2], [2, 3], [2, 4], [3, 4], [3, 5], [4, 5], [0, 6], [1, 7], [6, 8], [7, 9], [8, 5], [9, 5], [0, 10], [1, 11], [10, 12], [11, 12], [10, 6], [11, 7]];
  const meshK = step === 1 ? seg(lt, .45, 1.35) : step === 2 ? 1 - seg(lt, .7, 1.0) * .6 : .4 * (1 - seg(lt, .2, .5));
  if (meshK > 0) {
    ctx.strokeStyle = 'rgba(160,255,245,.85)'; ctx.lineWidth = 2.5;
    E.forEach(([a, b], i) => { const k2 = seg(meshK, i / E.length * .6, i / E.length * .6 + .4); if (k2 <= 0) return; ctx.beginPath(); ctx.moveTo(P[a][0], P[a][1]); ctx.lineTo(lerp(P[a][0], P[b][0], k2), lerp(P[a][1], P[b][1], k2)); ctx.stroke(); });
    P.forEach(([px, py], i) => { const k2 = back(seg(meshK, i / P.length * .5, i / P.length * .5 + .3), 2.4); circle(px, py, 7 * k2); ctx.fillStyle = PAPER; ctx.fill(); circle(px, py, 4 * k2); ctx.fillStyle = TEAL; ctx.fill(); });
  }
  if (step === 2) {
    const k1 = eio(seg(lt, .1, .45)), k2 = eio(seg(lt, .3, .65));
    ctx.strokeStyle = BUTTER; ctx.lineWidth = 5; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(-Wd * .19, -85); ctx.lineTo(lerp(-Wd * .19, Wd * .19, k1), -85); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-Wd * .5, 205); ctx.lineTo(lerp(-Wd * .5, Wd * .5, k2), 205); ctx.stroke();
    [[-Wd * .19, -85, k1], [Wd * .19, -85, k1], [-Wd * .5, 205, k2], [Wd * .5, 205, k2]].forEach(([x0, y0, kk]) => { if (kk > 0) { ctx.beginPath(); ctx.moveTo(x0, y0 - 10); ctx.lineTo(x0, y0 + 10); ctx.stroke(); } });
    const chip = (label, cx, cy, kk) => { if (kk <= 0) return; ctx.save(); ctx.translate(cx, cy); ctx.scale(kk, kk); const w = tw(label, 'mono', 22) + 30; rrect(-w / 2, -22, w, 44, 22); ctx.fillStyle = BUTTER; ctx.fill(); text(label, 0, 8, { kind: 'mono', size: 22, color: INK }); ctx.restore(); };
    chip('PD ' + Math.round(62 * eout(seg(lt, .15, .55))) + ' MM', 0, -125, pop(lt, .15, .35, 2.2));
    chip('WIDTH ' + Math.round(135 * eout(seg(lt, .4, .8))) + ' MM', 0, 255, pop(lt, .4, .35, 2.2));
    chip('SHAPE · OVAL', 0, -300, pop(lt, .7, .35, 2.2));
  }
  // bottom UI pill
  const labels = ['Scanning…', 'Measuring…', lt3 !== null && lt3 >= 1.05 ? 'Matched' : 'Finding matches…'];
  const prog = step === 1 ? seg(lt, 0, 1.5) : step === 2 ? seg(lt, 0, 1) : seg(lt, 0, 1.05);
  rrect(-150, 300, 300, 56, 28); ctx.fillStyle = 'rgba(255,255,255,.12)'; ctx.fill();
  rrect(-150, 300, 300 * prog, 56, 28); ctx.fillStyle = step === 3 && lt >= 1.05 ? TEAL : 'rgba(18,179,166,.55)'; ctx.fill();
  text(labels[step - 1], 0, 336, { kind: 'exp', size: 20, color: PAPER });
  text('9:41', -150, -345, { kind: 'mono', size: 18, color: PAPER, align: 'left' });
  rrect(118, -358, 34, 16, 5); ctx.strokeStyle = PAPER; ctx.lineWidth = 2; ctx.stroke(); ctx.fillStyle = PAPER; ctx.fillRect(121, -355, 22, 10);
  ctx.restore();
  rrect(-60, -366, 120, 26, 13); ctx.fillStyle = INK; ctx.fill();
  ctx.restore();
}
function card(x, y, k, name, shape, score, hl, t, tc, hideG) {
  if (k <= 0) return; ctx.save(); ctx.translate(x, y - hl * 30); ctx.scale(k * (1 + hl * .08), k * (1 + hl * .08));
  rrect(-150 + 10 + hl * 6, -120 + 14 + hl * 10, 300, 240, 28); ctx.fillStyle = 'rgba(21,22,26,.14)'; ctx.fill();
  rrect(-150, -120, 300, 240, 28); ctx.fillStyle = hl > .5 ? INK : '#FFFFFF'; ctx.fill();
  if (!hideG) glasses(0, -30, 48, { shape, color: hl > .5 ? PAPER : INK, stroke: 10, fillL: hl > .5 ? TEAL : 'rgba(0,0,0,.05)', fillR: hl > .5 ? BUTTER : 'rgba(0,0,0,.05)' });
  else { ctx.save(); ctx.setLineDash([8, 8]); ctx.strokeStyle = 'rgba(255,255,255,.3)'; ctx.lineWidth = 3; rrect(-110, -70, 220, 80, 20); ctx.stroke(); ctx.restore(); }
  const sc = eout(seg(t, tc, tc + .6));
  text(name, -120, 65, { kind: 'exp', size: 24, color: hl > .5 ? PAPER : INK, align: 'left' });
  text(Math.round(score * sc) + '%', 120, 65, { kind: 'mono', size: 30, color: hl > .5 ? BUTTER : TEAL, align: 'right' });
  rrect(-120, 88, 240, 8, 4); ctx.fillStyle = hl > .5 ? 'rgba(255,255,255,.2)' : 'rgba(0,0,0,.08)'; ctx.fill();
  rrect(-120, 88, 240 * score / 100 * sc, 8, 4); ctx.fillStyle = hl > .5 ? BUTTER : TEAL; ctx.fill();
  if (hl > .5) { ctx.save(); ctx.translate(0, -140); const bk = back(seg(hl, .5, 1), 2.4); ctx.scale(bk, bk); rrect(-80, -20, 160, 40, 20); ctx.fillStyle = TANG; ctx.fill(); text('BEST FIT', 0, 8, { kind: 'mono', size: 18, color: INK, sp: 2 }); ctx.restore(); }
  ctx.restore();
}
const CARDS = [['LEDGER', 'rect', 61], ['ALDINE', 'square', 94], ['ORBIT', 'round', 72]];
const CARD_POS = (i) => [1250 + i * 235, 890];
function s4(t, { screenCol = SCREEN } = {}) {
  bgFill(PAPER); dotGrid(DOT_LIGHT, t + 7, 1);
  floaters(t, 8, [TEAL, TANG, LILAC], 8, .25);
  const step = t < STEP_T[1] ? 1 : t < STEP_T[2] ? 2 : 3; const lt = t - STEP_T[step - 1];
  phone(t, step, lt, screenCol);
  const steps = [['Scan', 'your face in seconds'], ['Measure', 'width, PD and shape'], ['Match', 'frames that fit you']];
  steps.forEach(([title, sub], i) => {
    const y = 300 + i * 175; const active = step === i + 1; const done = step > i + 1;
    const k = e5(seg(t, .15 + i * .08, .6 + i * .08)); const act = active ? back(seg(lt, 0, .35), 2) : 0;
    ctx.save(); ctx.translate((1 - k) * 500, 0); ctx.globalAlpha = k * (active ? 1 : done ? .55 : .3);
    if (done) check(1080, y - 30, back(seg(t, STEP_T[i + 1], STEP_T[i + 1] + .35), 2.2), 42, TEAL);
    else { circle(1080, y - 30, 42 * (1 + act * .12)); ctx.fillStyle = active ? TANG : INK; ctx.fill(); text('0' + (i + 1), 1080, y - 18, { kind: 'mono', size: 30, color: PAPER }); }
    text(title, 1160, y - 4, { kind: 'exp', size: 74 + act * 8, color: INK, align: 'left' });
    text(sub, 1162, y + 46, { kind: 'light', size: 32, color: INK, align: 'left', alpha: .8 });
    if (active) { rrect(1160, y + 66, 520, 6, 3); ctx.fillStyle = 'rgba(0,0,0,.08)'; ctx.fill(); rrect(1160, y + 66, 520 * seg(lt, 0, step === 1 ? 1.5 : step === 2 ? 1 : 1.5), 6, 3); ctx.fillStyle = TANG; ctx.fill(); }
    ctx.restore();
  });
  if (step === 3) {
    CARDS.forEach(([n, s, sc], i) => {
      const [cx, cy] = CARD_POS(i); const k = back(seg(lt, .05 + i * .08, .5 + i * .08), 2);
      const hl = i === 1 ? eout(seg(lt, .5, .7)) : 0;
      ctx.save(); ctx.globalAlpha = i === 1 ? 1 : 1 - seg(lt, .55, .75) * .5; card(cx, cy, k * .72, n, s, sc, hl, t, STEP_T[2] + .1 + i * .08, i === 1 && lt > .7); ctx.restore();
    });
    // flying glasses: card → face
    const fk = seg(lt, .7, 1.05);
    if (fk > 0 && fk < 1) {
      const e = eio(fk); const [cx, cy] = CARD_POS(1); const sx = cx, sy = cy - 30 - 30 - 22; const tx = PH.x, ty = PH.y - 20;
      const x = lerp(sx, tx, e), y = lerp(sy, ty, e) - Math.sin(e * Math.PI) * 220;
      glasses(x, y, lerp(48 * .72 * 1.08, 248 * .17, e), { shape: 'square', color: lerp(0, 1, e) > .5 ? INK : PAPER, stroke: lerp(10 * .78, 248 * .17 * .16, e), fillL: 'rgba(18,179,166,.5)', rot: Math.sin(e * Math.PI) * -.5 });
    }
    confetti(t, STEP_T[2] + 1.05, PH.x, PH.y - 60, 40, 5, [TEAL, TANG, BUTTER, INK], .6);
    sparks(PH.x, PH.y - 20, t, STEP_T[2] + 1.05, { n: 12, r0: 150, r1: 230, color: TANG, lw: 6 });
  }
}
cue(7.0, 'swish', .6); cue(7.2, 'pop', .5, 3); cue(7.3, 'scan', .6);
for (let i = 0; i < 13; i++) cue(7.45 + i * .065, 'tick', .3, i % 6);
cue(8.5, 'ding', .6, 0); cue(8.6, 'ruler', .5); cue(8.8, 'ruler', .5); cue(8.65, 'pop', .6, 5); cue(8.9, 'pop', .6, 6); cue(9.2, 'pop', .6, 7);
cue(9.5, 'ding', .6, 1); [0, 1, 2].forEach((i) => cue(9.55 + i * .08, 'pop', .6, 2 + i)); cue(10.0, 'ding2', .8); cue(10.2, 'swish', .6); cue(10.55, 'click', .9); cue(10.55, 'confetti', .5); cue(10.68, 'whoosh', .7);

// ================= S5 · face shapes  [11.0, 14.75] =================
const MORPH = [['round', 'ROUND', 'angular frames', 'rect'], ['square', 'SQUARE', 'round frames', 'round'], ['heart', 'HEART', 'bottom-heavy frames', 'aviator']];
const PB = [.5, 1.5, 2.5];
function s5(t) {
  bgFill(TEAL); dotGrid(DOT_COL, t, .3);
  floaters(t, 21, [PAPER, BUTTER, INK], 12, .22);
  popLine([{ s: 'Every', color: PAPER }, { s: 'face', color: PAPER }, { s: 'is', color: PAPER }, { s: 'different.', color: INK, hl: BUTTER }], 960, 150, t, .1, { size: 66, stagger: .06 });
  const phase = t < PB[0] ? -1 : t < PB[1] ? 0 : t < PB[2] ? 1 : 2;
  const pt = phase < 0 ? 0 : t - PB[phase];
  const from = phase <= 0 ? SHAPES.oval : SHAPES[MORPH[phase - 1][0]];
  const to = phase < 0 ? SHAPES.oval : SHAPES[MORPH[phase][0]];
  const mk = eio(seg(pt, .05, .4)); const sh = mixShape(from, to, mk);
  const landSq = phase < 0 ? 0 : spring(t, PB[phase] + .4, 18, 7);
  const oldG = phase <= 0 ? 'square' : MORPH[phase - 1][3];
  const newG = phase < 0 ? null : MORPH[phase][3];
  const offK = phase < 0 ? 0 : ein(seg(pt, 0, .25));
  const gk = phase < 0 ? 0 : back(seg(pt, .3, .6), 2.2);
  const FX = 960, FY = 580, FH = 420;
  // flying-off old frames (drawn outside the face so they can leave the head)
  const Wd0 = FH / from.len;
  const faceObj = { ...HERO, x: FX, y: FY, h: FH, sc: 1, sx: 1 + landSq * .06, sy: 1 - landSq * .06, shape: sh, guide: seg(t, .45, .7), t, blink: blink(t, .6), look: phase >= 0 ? Math.sin(t * 2) * .4 : 0 };
  if (phase < 0 || pt < .3) { if (offK === 0) faceObj.g = { shape: oldG, color: INK, tint: phase < 0 ? 'rgba(18,179,166,.35)' : 'rgba(255,255,255,.25)' }; }
  else faceObj.g = { shape: newG, color: INK, tint: 'rgba(255,255,255,.25)', dy: -(1 - gk) * 1.6, rot: spring(t, PB[phase] + .6, 14, 5) * .08 };
  face(faceObj);
  if (offK > 0 && offK < 1) glasses(FX + offK * 520, FY - offK * 380, Wd0 * .17, { shape: oldG, color: INK, fillL: 'rgba(255,255,255,.25)', rot: offK * 1.2, sc: 1 - offK * .3 });
  if (phase >= 0) {
    const [key, name, tip] = MORPH[phase];
    const lk = e5(seg(pt, .08, .4)), lx = ein(seg(pt, .85, 1.0)) * (phase < 2 ? 1 : 0);
    ctx.save(); ctx.beginPath(); ctx.rect(0, 360, 740, 260); ctx.clip();
    shapeIcon(key, 640 - tw(name, 'exp', 58) - 75, 452 - lx * 140 + (1 - lk) * 140, 80, eio(seg(pt, .12, .5)), PAPER);
    text(name, 640, 470 + (1 - lk) * 140 - lx * 140, { kind: 'exp', size: 58, color: PAPER, align: 'right' });
    text('FACE', 640, 530 + (1 - lk) * 140 - lx * 140, { kind: 'mono', size: 28, color: PAPER, align: 'right', sp: 8 });
    ctx.restore();
    const gk2 = e5(seg(pt, .4, .75));
    ctx.save(); ctx.beginPath(); ctx.rect(1230, 360, 690, 260); ctx.clip();
    text('TRY', 1300, 440 + (1 - gk2) * 140 - lx * 140, { kind: 'mono', size: 28, color: INK, align: 'left', sp: 8 });
    text(tip, 1300, 505 + (1 - gk2) * 140 - lx * 140, { kind: 'exp', size: 38, color: INK, align: 'left' });
    ctx.restore();
    ctx.save(); ctx.strokeStyle = PAPER; ctx.lineWidth = 4; ctx.setLineDash([4, 10]); ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(670, 455); ctx.lineTo(lerp(670, 740, lk * (1 - lx)), 455); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(1285, 470); ctx.lineTo(lerp(1285, 1180, gk2 * (1 - lx)), 470); ctx.stroke(); ctx.restore();
    sparks(FX, FY - 30, t, PB[phase] + .55, { n: 10, r0: 250, r1: 330, color: PAPER, lw: 6 });
  }
  MORPH.forEach((m, i) => { circle(960 + (i - 1) * 40, 1030, i === phase ? 11 : 7); ctx.fillStyle = i === phase ? PAPER : 'rgba(255,255,255,.4)'; ctx.fill(); });
}
[0, 1, 2, 3].forEach((i) => cue(11.1 + i * .06, 'tick', .35, i)); cue(11.35, 'swipe', .4);
PB.forEach((b, i) => { cue(11 + b, 'swish', .6); cue(11 + b + .05, 'stretch', .7, i); cue(11 + b + .1, 'tick', .4, i); cue(11 + b + .38, 'click', .8); cue(11 + b + .55, 'sparkle', .45); });

// ================= S6 · scan · measure · match  [14.4, 17.0] =================
const TRIAD = [['SCAN', BUTTER, -1], ['MEASURE', LILAC, 1], ['MATCH', TANG, -1]];
const SL = [0, .75, 1.5];
function icon(i, x, y, p, color, lw = 52) {
  ctx.save(); ctx.translate(x, y); ctx.strokeStyle = color; ctx.lineWidth = 12; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  if (i === 0) { const s = 70; [[-1, -1], [1, -1], [1, 1], [-1, 1]].forEach(([a, b], k) => { const kk = back(seg(p, k * .1, k * .1 + .4), 2.2); ctx.save(); ctx.scale(kk, kk); ctx.beginPath(); ctx.moveTo(a * s, b * s * .35); ctx.lineTo(a * s, b * s); ctx.lineTo(a * s * .35, b * s); ctx.stroke(); ctx.restore(); }); ctx.fillStyle = color; ctx.fillRect(-58, lerp(-50, 46, eio(seg(p, .3, 1))), 116, 8); }
  if (i === 1) { const w = 220 * eio(p); rrect(-110, -32, w, 64, 10); ctx.stroke(); for (let k = 1; k < 9; k++) { if (k * 25 > w - 8) break; ctx.beginPath(); ctx.moveTo(-110 + k * 25, -32); ctx.lineTo(-110 + k * 25, k % 2 ? -10 : 4); ctx.stroke(); } }
  if (i === 2) glasses(0, 0, lw, { shape: 'wayfarer', color, stroke: 12, p: eio(p) });
  ctx.restore();
}
function s6(t, { over = false } = {}) {
  const k = t < SL[1] ? 0 : t < SL[2] ? 1 : 2; const lt = t - SL[k];
  const [word, col, dir] = TRIAD[k];
  const w1 = e5(seg(lt, 0, .22)), w2 = e5(seg(lt, .06, .3));
  if (!(k === 0 && over && lt < .3)) bgFill(k === 0 ? (lt < .3 ? TEAL : col) : TRIAD[k - 1][1]);
  const slab = (c, kk) => { ctx.fillStyle = c; ctx.beginPath(); if (dir < 0) { const x = lerp(W + 300, -300, kk); ctx.moveTo(x + 200, 0); ctx.lineTo(W + 400, 0); ctx.lineTo(W + 400, H); ctx.lineTo(x - 200, H); } else { const x = lerp(-300, W + 300, kk); ctx.moveTo(-400, 0); ctx.lineTo(x - 200, 0); ctx.lineTo(x + 200, H); ctx.lineTo(-400, H); } ctx.closePath(); ctx.fill(); };
  if (lt < .32) { slab(shade(col, .78), w1); slab(col, w2); } else bgFill(col);
  const dotA = seg(lt, .2, .4); dotGrid(DOT_COL, t, .35 * dotA, 40);
  const exitK = k === 2 ? ein(seg(t, 2.3, 2.55)) : 0;
  const sk = back(seg(lt, .08, .36), 2.6); const shake = spring(lt, .2, 50, 12) * 14;
  // echo rows
  const ea = seg(lt, .25, .45) * (1 - exitK);
  if (ea > 0) { ctx.save(); ctx.globalAlpha = ea * .35; for (const [yy, s] of [[380, 1], [900, -1]]) { const off = (t * 260 * s) % 1400; for (let r = -2; r <= 2; r++) text(word, 960 + off + r * 1400 * s, yy, { kind: 'exp', size: 200, color: INK, outline: 3 }); } ctx.restore(); }
  // radial speed lines
  const sl = seg(lt, .12, .45); if (sl > 0 && sl < 1) { ctx.save(); ctx.strokeStyle = shade(col, .7); ctx.lineWidth = 8; ctx.lineCap = 'round'; for (let i = 0; i < 18; i++) { const a = i / 18 * Math.PI * 2 + k; const r0 = lerp(300, 1100, e5(sl)), r1 = lerp(300, 1100, e5(clamp(sl * 1.6 - .2))); ctx.beginPath(); ctx.moveTo(960 + Math.cos(a) * r1, 560 + Math.sin(a) * r1 * .7); ctx.lineTo(960 + Math.cos(a) * r0, 560 + Math.sin(a) * r0 * .7); ctx.stroke(); } ctx.restore(); }
  ctx.save(); ctx.translate(shake, exitK * 700);
  text(word, 960, 660, { kind: 'exp', size: 250, color: INK, scale: lerp(1.7, 1, sk), alpha: seg(lt, .08, .13), shadow: { color: shade(col, .72), x: 12, y: 12 } });
  text(`0${k + 1} / 03`, 960, 920, { kind: 'mono', size: 30, color: INK, sp: 6, alpha: seg(lt, .2, .35) });
  ctx.restore();
  // icon; MATCH icon becomes the end-card glasses
  if (k < 2) icon(k, 960, 330, seg(lt, .12, .6), INK);
  else {
    const tp = seg(t, 2.3, 2.6);
    if (tp > 0) { ctx.save(); circle(960, 330, eout(tp) * 1500); ctx.fillStyle = INK; ctx.fill(); ctx.restore(); }
    const lwI = lerp(52, 95, e5(tp)), col2 = tp > .04 ? PAPER : INK;
    ctx.save(); ctx.translate(960, 330); ctx.strokeStyle = col2;
    glasses(0, 0, lwI, { shape: 'wayfarer', color: col2, stroke: lerp(12, 17, tp), p: eio(seg(lt, .12, .6)) });
    ctx.restore();
  }
}
TRIAD.forEach((_, i) => { cue(14.4 + SL[i], 'swoosh', .7); cue(14.5 + SL[i], 'slam', 1, i); });
cue(16.2, 'riser', .7); cue(16.7, 'whoomp', .9);

// ================= S7 · end card  [17.0, 20.0] =================
function s7(t) {
  bgFill(INK); dotGrid(DOT_DARK, t, seg(t, 0, .5));
  floaters(t, 40, [TEAL, TANG, BUTTER, LILAC], 16, .3 * seg(t, .3, 1));
  glasses(960, 330, 95, { shape: 'wayfarer', color: PAPER, stroke: 17, fillL: TEAL, fillR: TANG, liquid: true, level: e5(seg(t, .05, .6)), wave: t * 7, shine: seg(t, .6, .9), sc: 1 + spring(t, .6, 14, 6) * .04 });
  [[640, 250, .9], [1290, 210, 1.1], [1350, 470, 1.3], [590, 500, 1.5], [1180, 760, 1.7]].forEach(([x, y, a], i) => { const k = Math.sin(Math.PI * seg(t, a, a + .7)); star(x, y, 22 * k, [BUTTER, PAPER, TEAL][i % 3], k); });
  const lk = back(seg(t, .2, .7), 1.8);
  // wordmark with a glint that sweeps across the letters
  const glint = seg(t, 1.0, 1.5);
  const drawWord = () => text('Muse.', 960, 655, { kind: 'bod', size: 290, color: PAPER, scale: lerp(.6, 1, lk), alpha: seg(t, .2, .28), stroke: 4 });
  drawWord();
  if (glint > 0 && glint < 1) {
    const save = ctx; ctx = octx; ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, W, H); drawWord();
    ctx.globalCompositeOperation = 'source-atop'; const gx = lerp(500, 1500, glint);
    const g = ctx.createLinearGradient(gx - 120, 0, gx + 120, 0); g.addColorStop(0, 'rgba(255,211,77,0)'); g.addColorStop(.5, 'rgba(255,230,160,1)'); g.addColorStop(1, 'rgba(255,211,77,0)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H); ctx.globalCompositeOperation = 'source-over'; ctx = save; ctx.drawImage(off, 0, 0);
  }
  popLine([{ s: 'Glasses,', kind: 'light', color: PAPER }, { s: 'fitted', kind: 'light', color: PAPER }, { s: 'to', kind: 'light', color: PAPER }, { s: 'your', kind: 'light', color: PAPER }, { s: 'face.', kind: 'exp', color: INK, hl: BUTTER }], 960, 780, t, .55, { size: 50, stagger: .05, gap: .28 });
  const bk = back(seg(t, 1.1, 1.5), 2.2); const press = Math.sin(Math.PI * seg(t, 1.95, 2.15));
  if (bk > 0) {
    ctx.save(); ctx.translate(960, 900); ctx.scale(bk * (1 - press * .06), bk * (1 - press * .06));
    rrect(-200 + 8, -44 + 10, 400, 88, 44); ctx.fillStyle = 'rgba(0,0,0,.35)'; ctx.fill();
    rrect(-200, -44, 400, 88, 44); ctx.fillStyle = TANG; ctx.fill();
    text('Find your fit  →', 0, 12, { kind: 'exp', size: 30, color: INK }); ctx.restore();
  }
  const ck = seg(t, 1.5, 1.95);
  if (ck > 0) {
    const e = eio(ck); const cx = lerp(1420, 1030, e), cy = lerp(1120, 905, e) + Math.sin(e * Math.PI) * -40;
    const tap = seg(t, 1.95, 2.4); if (tap > 0 && tap < 1) { ctx.save(); ctx.globalAlpha = 1 - tap; circle(1030, 905, 20 + tap * 70); ctx.strokeStyle = PAPER; ctx.lineWidth = 5; ctx.stroke(); ctx.restore(); }
    cursor(cx, cy, press);
  }
  confetti(t, 1.97, 960, 890, 60, 77, [TEAL, TANG, BUTTER, PAPER], .8);
  text('Head-shape guidance is general styling advice.', 960, 1040, { kind: 'mono', size: 14, color: 'rgba(244,242,238,.35)', alpha: seg(t, 1.2, 1.6) });
}
cue(17.0, 'chord', 1); cue(17.05, 'bubble', .6); cue(17.2, 'pop', .8, 4); [0, 1, 2, 3, 4].forEach((i) => cue(17.55 + i * .05, 'tick', .35, i)); cue(17.75, 'swipe', .35);
cue(18.0, 'shimmer', .7); cue(18.1, 'pop', .7, 6); cue(18.5, 'swish', .4); cue(18.95, 'click', .9); cue(18.97, 'confetti', .7); cue(19.0, 'sparkle', .5);

// ================= compositor =================
function drawFrame(T) {
  ctx = main; ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1; ctx.letterSpacing = '0px'; ctx.globalCompositeOperation = 'source-over';
  const save = (fn) => { ctx.save(); fn(); ctx.restore(); };
  if (T < 2.55) save(() => s1(T));
  else if (T < 4.8) save(() => s2(T - 2.5));
  else if (T < 5.15) {
    save(() => s2(T - 2.5));
    save(() => { const lw = irisPath(seg(T, 4.8, 5.15)); ctx.clip(); s3(T - 5.0); });
    save(() => { const p = seg(T, 4.8, 5.15); if (p > 0 && p < 1) { irisPath(p); ctx.strokeStyle = PAPER; ctx.lineWidth = 14 * (1 - p); ctx.stroke(); } });
  }
  else if (T < 6.72) save(() => s3(T - 5.0));
  else if (T < 7.12) {
    const p = seg(T, 6.72, 7.12);
    save(() => s3(T - 5.0));
    STRIPES.forEach((c, j) => { const kj = e5(clamp((p - j * .09) / .7)); ctx.fillStyle = c; stripeRegion(kj); ctx.fill(); });
    save(() => { stripeRegion(e5(clamp((p - 3 * .09) / .7))); ctx.clip(); s4(T - 7.0); });
  }
  else if (T < 11.0) {
    const lt = T - 7.0, ex = eio(seg(lt, 3.7, 4.0));
    save(() => s4(lt, { screenCol: mixC(SCREEN, TEAL, seg(lt, 3.55, 3.75)) }));
    if (ex > 0) save(() => {
      const r0 = { x: PH.x - 190, y: PH.y - 380, w: 380, h: 760, r: 44 };
      rrect(lerp(r0.x, -10, ex), lerp(r0.y, -10, ex), lerp(r0.w, W + 20, ex), lerp(r0.h, H + 20, ex), lerp(r0.r, 0, ex)); ctx.fillStyle = TEAL; ctx.fill();
      const f = phoneFace(lt, lt - STEP_T[2]); f.x = lerp(PH.x, 960, ex); f.y = lerp(PH.y - 20, 580, ex); f.h = lerp(330, 420, ex); face(f);
    });
  }
  else if (T < 14.4) save(() => s5(T - 11.0));
  else if (T < 14.72) { save(() => s5(T - 11.0)); save(() => s6(T - 14.4, { over: true })); }
  else if (T < 17.0) save(() => s6(T - 14.4));
  else save(() => s7(T - 17.0));
}
// grain
const GR = []; for (let k = 0; k < 4; k++) { const c = document.createElement('canvas'); c.width = c.height = 256; const g = c.getContext('2d'); const img = g.createImageData(256, 256); const r = rng(50 + k); for (let i = 0; i < img.data.length; i += 4) { const v = 128 + (r() - .5) * 110; img.data[i] = img.data[i + 1] = img.data[i + 2] = v; img.data[i + 3] = 255; } g.putImageData(img, 0, 0); GR.push(c); }
function post(T) {
  ctx = main; ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.save(); ctx.globalAlpha = .07; ctx.globalCompositeOperation = 'overlay'; const g = GR[Math.floor(T * 30) % 4]; ctx.fillStyle = ctx.createPattern(g, 'repeat'); const o = Math.floor(T * 30) * 37 % 256; ctx.translate(-o, -o); ctx.fillRect(0, 0, W + 256, H + 256); ctx.restore();
  const fo = seg(T, 19.55, 20); if (fo > 0) { ctx.globalAlpha = fo; ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H); ctx.globalAlpha = 1; }
}
function renderAt(T) {
  const N = window.MB || 1;
  if (N <= 1) { drawFrame(T); post(T); return; }
  const shutter = 1 / 120;
  for (let k = 0; k < N; k++) { drawFrame(T + (k / N) * shutter); actx.globalAlpha = 1 / (k + 1); actx.drawImage(cv, 0, 0); }
  main.setTransform(1, 0, 0, 1, 0, 0); main.globalAlpha = 1; main.drawImage(acc, 0, 0); post(T);
}

window.renderAt = renderAt; window.DUR = DUR; window.INFO = { cues: CUES };
if (!new URLSearchParams(location.search).has('record')) {
  const fit = () => { const s = Math.min(innerWidth / W, innerHeight / H); document.getElementById('frame').style.transform = `scale(${s})`; };
  addEventListener('resize', fit); fit();
  const t0 = performance.now(); const loop = (now) => { renderAt(((now - t0) / 1000) % DUR); requestAnimationFrame(loop); }; requestAnimationFrame(loop);
} else window.MB = 4;
window.READY = true;
})();
