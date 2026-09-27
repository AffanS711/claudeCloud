(async () => {
const W = 1920, H = 1080, DUR = 60;
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
function popLine(parts, cx, y, t, t0, { size = 100, kind = 'exp', stagger = .07, d = .5, gap = .28, color = INK, exitAt = 99, align = 'center' } = {}) {
  const L = layout(parts, size, kind, gap);
  parts.forEach((p, i) => {
    const x = cx + L.xs[i] + (align === 'left' ? L.total / 2 : 0), w = L.ws[i]; const a = t0 + i * stagger;
    const k = back(seg(t, a, a + d), 1.6);
    const ex = ein(seg(t, exitAt + i * .025, exitAt + .28 + i * .025));
    if (k <= 0) return;
    if (p.hl) {
      const hk = e5(seg(t, a + .22, a + .5));
      const hx = hk * (1 - seg(t, exitAt + i * .025, exitAt + .2 + i * .025));
      if (hx > 0) { ctx.save(); ctx.fillStyle = p.hl; ctx.beginPath(); ctx.roundRect(x - size * .14, y - size * .86, (w + size * .28) * hx, size * 1.06, size * .16); ctx.fill(); ctx.restore(); }
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
  sam: { fw: .42, cw: .5, jw: .38, ch: .14, len: 1.27 },
};
const mixShape = (a, b, k) => Object.fromEntries(Object.keys(a).map((key) => [key, lerp(a[key], b[key], k)]));
function faceOutline(sh, h) {
  const Wd = h / sh.len;
  const half = [[0, -.5], [sh.fw * .72, -.47], [sh.fw, -.3], [sh.cw, -.02], [sh.jw, .3], [sh.ch + .02, .47]].map(([x, y]) => [x * Wd, y * h]);
  return { pts: half.concat([[0, .5 * h]], half.slice(1).reverse().map(([x, y]) => [-x, y])), Wd };
}
function drawEye(x, y, rx, ry, open, look, happy) {
  ctx.strokeStyle = INK; ctx.lineWidth = rx * .75; ctx.lineCap = 'round';
  if (happy) { ctx.beginPath(); ctx.moveTo(x - rx * 1.4, y + ry * .3); ctx.quadraticCurveTo(x, y - ry * 1.4, x + rx * 1.4, y + ry * .3); ctx.stroke(); return; }
  if (open < .2) { ctx.beginPath(); ctx.moveTo(x - rx * 1.3, y); ctx.quadraticCurveTo(x, y + ry * .8, x + rx * 1.3, y); ctx.stroke(); return; }
  ctx.fillStyle = INK; ctx.beginPath(); ctx.ellipse(x + look, y, rx, ry * open, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#fff'; circle(x + look + rx * .35, y - ry * open * .38, rx * .3); ctx.fill();
}
// f: x,y,h,shape,skin,hair,hairStyle,shirt, sc,sx,sy,rot, blink,squint,wink,happy,look,brow,angry,mood,mouth, g, extra(Wd,h), guide
function face(f) {
  const { x, y, h } = f; const sh = f.shape; const { pts, Wd } = faceOutline(sh, h);
  ctx.save(); ctx.translate(x, y); if (f.rot) ctx.rotate(f.rot); const sc = f.sc ?? 1; ctx.scale(sc * (f.sx || 1), sc * (f.sy || 1));
  if (f.body !== false) {
    ctx.fillStyle = f.shirt || INK;
    ctx.beginPath(); ctx.moveTo(-Wd * 1.05, h * 1.08); ctx.quadraticCurveTo(-Wd * .95, h * .62, -Wd * .2, h * .6); ctx.lineTo(Wd * .2, h * .6); ctx.quadraticCurveTo(Wd * .95, h * .62, Wd * 1.05, h * 1.08); ctx.closePath(); ctx.fill();
    ctx.fillStyle = shade(f.shirt || INK, .82); ctx.beginPath(); ctx.moveTo(-Wd * .22, h * .6); ctx.quadraticCurveTo(0, h * .78, Wd * .22, h * .6); ctx.closePath(); ctx.fill();
    ctx.fillStyle = f.skin; rrect(-Wd * .17, h * .35, Wd * .34, h * .3, Wd * .1); ctx.fill();
    ctx.fillStyle = 'rgba(0,0,0,.12)'; rrect(-Wd * .17, h * .38, Wd * .34, h * .08, Wd * .04); ctx.fill();
  }
  if (f.hairStyle === 'bob' || f.hairStyle === 'long') { ctx.fillStyle = f.hair; const L = f.hairStyle === 'long' ? .75 : .38; rrect(-Wd * (sh.cw + .12), -h * .52, Wd * (sh.cw + .12) * 2, h * (.52 + L), Wd * .45); ctx.fill(); }
  ctx.fillStyle = f.skin; [-1, 1].forEach((s) => { ctx.beginPath(); ctx.ellipse(s * Wd * (sh.cw - .02), h * .02, Wd * .08, h * .09, 0, 0, Math.PI * 2); ctx.fill(); });
  smoothClosed(pts); ctx.fillStyle = f.skin; ctx.fill();
  if (f.hairStyle !== 'bald') {
    ctx.save(); smoothClosed(pts); ctx.clip(); ctx.fillStyle = f.hair; ctx.beginPath();
    const fr = f.hairStyle === 'curly' ? -.24 : -.2;
    ctx.moveTo(-Wd * .8, -h * .6); ctx.lineTo(Wd * .8, -h * .6); ctx.lineTo(Wd * .8, h * fr);
    ctx.quadraticCurveTo(Wd * .25, h * (fr - .12), -Wd * .05, h * (fr - .02)); ctx.quadraticCurveTo(-Wd * .4, h * (fr + .06), -Wd * .8, h * (fr - .05)); ctx.closePath(); ctx.fill();
    ctx.restore();
    if (f.hairStyle === 'curly') {
      ctx.fillStyle = f.hair;
      for (let i = 0; i <= 12; i++) { const a = Math.PI * (1.02 + i * .08); circle(Math.cos(a) * Wd * (sh.fw + .1), -h * .16 + Math.sin(a) * h * .4, Wd * (.13 + (i % 3) * .015)); ctx.fill(); }
      ctx.fillStyle = 'rgba(255,255,255,.1)'; for (let i = 2; i <= 10; i += 2) { const a = Math.PI * (1.02 + i * .08); circle(Math.cos(a) * Wd * (sh.fw + .1) - Wd * .03, -h * .16 + Math.sin(a) * h * .4 - Wd * .04, Wd * .05); ctx.fill(); }
    } else if (f.hairStyle !== 'bald') { ctx.save(); smoothClosed(pts); ctx.clip(); ctx.fillStyle = 'rgba(255,255,255,.12)'; ctx.beginPath(); ctx.ellipse(-Wd * .15, -h * .4, Wd * .22, h * .05, -.3, 0, Math.PI * 2); ctx.fill(); ctx.restore(); }
    if (f.hairStyle === 'bun') { ctx.fillStyle = f.hair; circle(0, -h * .56, Wd * .2); ctx.fill(); }
  }
  if (f.guide) { ctx.save(); smoothClosed(pts.map(([px, py]) => [px * 1.09, py * 1.07])); ctx.setLineDash([14, 12]); ctx.lineDashOffset = -(f.t || 0) * 40; ctx.lineWidth = 4; ctx.strokeStyle = f.guideColor || PAPER; ctx.globalAlpha *= f.guide; ctx.stroke(); ctx.restore(); }
  // eyes
  const ex = Wd * .19, rx = Wd * .035, ry = Wd * .042;
  const open = (1 - (f.blink || 0)) * (1 - (f.squint || 0) * .7);
  const look = (f.look || 0) * Wd * .025;
  drawEye(-ex, 0, rx, ry, open, look, f.happy);
  drawEye(ex, 0, rx, ry, f.wink ? 0 : open, look, f.happy);
  // brows
  const mood = f.mood ?? 1; const sad = Math.max(0, -mood), lift = (f.brow || 0) - (f.squint || 0) * .5, ang = f.angry || 0;
  ctx.strokeStyle = f.hair === '#C98B45' ? '#8A5A2A' : INK; ctx.lineWidth = Math.max(3, Wd * .03); ctx.lineCap = 'round';
  [-1, 1].forEach((s) => {
    const by = -h * .1 - lift * h * .035; const inner = by - sad * h * .028 + ang * h * .035, outer = by + sad * h * .02 - ang * h * .01;
    ctx.beginPath(); ctx.moveTo(s * (ex - Wd * .08), inner); ctx.quadraticCurveTo(s * ex, by - h * .03, s * (ex + Wd * .09), outer); ctx.stroke();
  });
  ctx.strokeStyle = 'rgba(0,0,0,.28)'; ctx.beginPath(); ctx.moveTo(-Wd * .01, h * .02); ctx.quadraticCurveTo(-Wd * .07, h * .14, Wd * .02, h * .15); ctx.stroke();
  // mouth
  ctx.strokeStyle = INK; ctx.fillStyle = INK;
  const m = f.mouth || 'smile';
  if (m === 'grin') {
    ctx.beginPath(); ctx.moveTo(-Wd * .16, h * .245); ctx.quadraticCurveTo(0, h * .46, Wd * .16, h * .245); ctx.closePath(); ctx.fill();
    ctx.save(); ctx.clip(); ctx.fillStyle = '#FF7A7A'; circle(0, h * .37, Wd * .09); ctx.fill(); ctx.fillStyle = '#fff'; ctx.fillRect(-Wd * .16, h * .24, Wd * .32, h * .035); ctx.restore();
  } else if (m === 'o') { ctx.beginPath(); ctx.ellipse(0, h * .29, Wd * .045, h * .04, 0, 0, Math.PI * 2); ctx.fill(); }
  else if (m === 'flat') { ctx.beginPath(); ctx.moveTo(-Wd * .1, h * .28); ctx.lineTo(Wd * .1, h * .28); ctx.stroke(); }
  else if (m === 'wobbly') { ctx.beginPath(); for (let i = 0; i <= 8; i++) { const px = lerp(-Wd * .13, Wd * .13, i / 8), py = h * .285 + (i % 2 ? -1 : 1) * h * .012; i ? ctx.lineTo(px, py) : ctx.moveTo(px, py); } ctx.stroke(); }
  else if (m === 'smirk') { ctx.beginPath(); ctx.moveTo(-Wd * .1, h * .28); ctx.quadraticCurveTo(Wd * .03, h * .3, Wd * .14, h * .24); ctx.stroke(); }
  else { ctx.beginPath(); ctx.moveTo(-Wd * .13, h * .27); ctx.quadraticCurveTo(0, h * (.27 + .07 * mood), Wd * .13, h * .27); ctx.stroke(); }
  ctx.fillStyle = 'rgba(255,110,90,.25)'; [-1, 1].forEach((s) => { circle(s * Wd * .3, h * .12, Wd * .07); ctx.fill(); });
  if (f.g) {
    const g = f.g;
    glasses((g.dx || 0) * Wd, (g.dy || 0) * h, Wd * .17 * (g.scale || 1), { shape: g.shape, color: g.color || INK, p: g.p ?? 1, rot: g.rot || 0, fillL: g.tintL !== undefined ? g.tintL : (g.tint || 'rgba(255,255,255,.22)'), fillR: g.tintR !== undefined ? g.tintR : (g.tint || 'rgba(255,255,255,.22)'), shine: g.shine ?? .6, stroke: g.stroke });
  }
  if (f.extra) f.extra(Wd, h);
  ctx.restore();
  return Wd;
}
const SAM = { shape: SHAPES.sam, skin: '#C98E62', hair: '#2B1D14', hairStyle: 'curly', shirt: TEAL };
const blink = (t, ph = 0) => { const c = (t * .45 + ph) % 1; return c > .96 ? Math.sin((c - .96) / .04 * Math.PI) : 0; };
const samLens = (sx, sy, h, scale = 1, dy = 0, side = -1) => { const Wd = h / SAM.shape.len; const lw = Wd * .17 * scale; return { x: sx + side * lw * 1.21, y: sy + dy * h, lw, Wd }; };


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

// ================= extra props =================
const BL = document.createElement('canvas'); BL.width = W / 2; BL.height = H / 2; const blctx = BL.getContext('2d');
function blurDraw(amount, fn) {
  if (amount < .4) { ctx.save(); fn(); ctx.restore(); return; }
  const save = ctx; ctx = blctx; ctx.setTransform(.5, 0, 0, .5, 0, 0); ctx.clearRect(0, 0, W, H); ctx.save(); fn(); ctx.restore(); ctx = save;
  ctx.save(); ctx.filter = `blur(${amount}px)`; ctx.drawImage(BL, 0, 0, W, H); ctx.restore();
}
function hand(x, y, rot, s, skin, kind = 'open') {
  ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.scale(s, s); ctx.fillStyle = skin; ctx.strokeStyle = shade(skin.startsWith('#') ? skin : '#C98E62', .8); ctx.lineWidth = 3;
  if (kind === 'open') {
    for (let i = 0; i < 4; i++) { rrect(-30 + i * 17, -70 - (i === 1 || i === 2 ? 10 : 0), 15, 60, 8); ctx.fill(); }
    ctx.save(); ctx.rotate(-.7); rrect(-62, -20, 16, 46, 8); ctx.fill(); ctx.restore();
    rrect(-34, -30, 70, 70, 24); ctx.fill();
  } else if (kind === 'point') {
    rrect(-6, -86, 18, 70, 9); ctx.fill(); rrect(-30, -30, 64, 66, 22); ctx.fill(); ctx.save(); ctx.rotate(-.6); rrect(-58, -10, 16, 40, 8); ctx.fill(); ctx.restore();
  } else { rrect(-34, -34, 70, 70, 26); ctx.fill(); }
  ctx.restore();
}
function box(x, y, s, rot, { open = 0, stamp = 0, tape = 1, label = true } = {}) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.scale(s, s);
  const w = 300, h = 200;
  rrect(-w / 2 + 10, -h / 2 + 14, w, h, 10); ctx.fillStyle = 'rgba(0,0,0,.15)'; ctx.fill();
  if (open > 0) { ctx.fillStyle = '#B77C47'; [-1, 1].forEach((sd) => { ctx.save(); ctx.translate(sd * w / 2, -h / 2); ctx.rotate(sd * -(Math.PI * .75) * open); ctx.fillRect(sd < 0 ? 0 : -w / 2, -60, w / 2, 60); ctx.restore(); }); }
  rrect(-w / 2, -h / 2, w, h, 10); ctx.fillStyle = '#D19A63'; ctx.fill();
  ctx.fillStyle = '#B77C47'; ctx.fillRect(-w / 2, -h / 2, w, 26);
  if (tape > 0 && open <= 0) { ctx.fillStyle = 'rgba(244,242,238,.75)'; ctx.fillRect(-28, -h / 2, 56, h * tape); }
  if (label) { ctx.fillStyle = PAPER; rrect(w / 2 - 110, 20, 86, 56, 6); ctx.fill(); ctx.fillStyle = INK; for (let i = 0; i < 3; i++) ctx.fillRect(w / 2 - 100, 32 + i * 13, 60 - i * 14, 5); }
  if (stamp > 0) {
    ctx.save(); const k = stamp; ctx.rotate(-.18); ctx.scale(lerp(2.2, 1, e5(k)), lerp(2.2, 1, e5(k))); ctx.globalAlpha *= clamp(k * 3);
    ctx.strokeStyle = RED; ctx.lineWidth = 7; rrect(-120, -34, 240, 68, 10); ctx.stroke();
    text('RETURN', 0, 18, { kind: 'exp', size: 44, color: RED }); ctx.restore();
  }
  ctx.restore();
}
function clockIcon(x, y, r, mins) {
  ctx.save(); ctx.translate(x, y);
  circle(6, 8, r); ctx.fillStyle = 'rgba(0,0,0,.12)'; ctx.fill();
  circle(0, 0, r); ctx.fillStyle = '#fff'; ctx.fill(); ctx.lineWidth = 8; ctx.strokeStyle = INK; ctx.stroke();
  for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(Math.cos(a) * r * .78, Math.sin(a) * r * .78); ctx.lineTo(Math.cos(a) * r * .88, Math.sin(a) * r * .88); ctx.stroke(); }
  const am = mins / 60 * Math.PI * 2 - Math.PI / 2, ah = mins / 720 * Math.PI * 2 - Math.PI / 2 + 1.2;
  ctx.lineCap = 'round'; ctx.lineWidth = 7; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(Math.cos(ah) * r * .45, Math.sin(ah) * r * .45); ctx.stroke();
  ctx.lineWidth = 5; ctx.strokeStyle = TANG; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(Math.cos(am) * r * .7, Math.sin(am) * r * .7); ctx.stroke();
  circle(0, 0, 7); ctx.fillStyle = INK; ctx.fill(); ctx.restore();
}
function calendar(x, y, s, day, flip) {
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
  rrect(-70 + 6, -80 + 8, 140, 160, 14); ctx.fillStyle = 'rgba(0,0,0,.15)'; ctx.fill();
  rrect(-70, -80, 140, 160, 14); ctx.fillStyle = '#fff'; ctx.fill(); ctx.fillStyle = RED; rrect(-70, -80, 140, 42, [14, 14, 0, 0]); ctx.fill();
  text('DAY', 0, -50, { kind: 'mono', size: 18, color: PAPER, sp: 3 });
  text(String(day), 0, 45, { kind: 'exp', size: 64, color: INK });
  if (flip > 0 && flip < 1) { ctx.save(); ctx.translate(0, -38); ctx.scale(1, Math.cos(flip * Math.PI)); ctx.fillStyle = flip < .5 ? '#fff' : '#EEE'; ctx.fillRect(-70, 0, 140, 118); ctx.restore(); }
  ctx.restore();
}
function door(x, y) {
  ctx.save(); ctx.translate(x, y);
  ctx.fillStyle = '#E7DFD2'; ctx.fillRect(-230, -560, 460, 600);
  ctx.fillStyle = '#2F3446'; rrect(-190, -520, 380, 560, [16, 16, 0, 0]); ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,.08)'; ctx.lineWidth = 6; rrect(-150, -470, 300, 200, 10); ctx.stroke(); rrect(-150, -230, 300, 220, 10); ctx.stroke();
  circle(130, -240, 14); ctx.fillStyle = BUTTER; ctx.fill();
  ctx.fillStyle = '#8A5A2A'; rrect(-240, 40, 480, 34, 10); ctx.fill();
  ctx.restore();
}
function laptop(x, y, s, screenFn) {
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
  rrect(-560, -360, 1120, 700, 30); ctx.fillStyle = INK; ctx.fill();
  ctx.save(); rrect(-530, -330, 1060, 640, 12); ctx.clip(); ctx.fillStyle = '#FFFFFF'; ctx.fillRect(-530, -330, 1060, 640); ctx.translate(-530, -330); screenFn(); ctx.restore();
  ctx.fillStyle = '#2A2C33'; ctx.beginPath(); ctx.moveTo(-640, 340); ctx.lineTo(640, 340); ctx.lineTo(600, 380); ctx.lineTo(-600, 380); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#3A3D46'; rrect(-90, 340, 180, 14, 6); ctx.fill();
  ctx.restore();
}
function tileGlasses(i) { const r = rng(900 + i * 17); const shapes = ['round', 'square', 'cat', 'aviator', 'wayfarer', 'rect']; const cols = [INK, TANG, TEAL, '#8A5A2A', LILAC, RED, '#2F3446', BUTTER]; return { shape: shapes[Math.floor(r() * shapes.length)], color: cols[Math.floor(r() * cols.length)], tilt: (r() - .5) * .2 }; }
function tile(x, y, i, k, { grey = 0, scale = 1, rot = 0, alpha = 1, glow = 0, g = null } = {}) {
  if (k <= 0 || alpha <= 0) return; const tg = g || tileGlasses(i);
  ctx.save(); ctx.globalAlpha *= alpha; ctx.translate(x, y); ctx.rotate(rot); ctx.scale(k * scale, k * scale);
  if (glow > 0) { rrect(-80 - 10, -58 - 10, 160 + 20, 116 + 20, 24); ctx.fillStyle = `rgba(255,211,77,${.9 * glow})`; ctx.fill(); }
  rrect(-80 + 5, -58 + 7, 160, 116, 16); ctx.fillStyle = 'rgba(0,0,0,.12)'; ctx.fill();
  rrect(-80, -58, 160, 116, 16); ctx.fillStyle = mixC('#FFFFFF', '#CFCFCF', grey); ctx.fill();
  glasses(0, -4, 30, { shape: tg.shape, color: grey > 0 ? mixC(tg.color.startsWith('#') ? tg.color : '#15161A', '#9A9A9A', grey) : tg.color, stroke: 7, rot: tg.tilt, fillL: 'rgba(0,0,0,.04)', temples: true });
  ctx.restore();
}
function ray(t, cx, cy, n, r, col, a) { ctx.save(); ctx.translate(cx, cy); ctx.rotate(t * .4); ctx.fillStyle = col; ctx.globalAlpha *= a; for (let i = 0; i < n; i++) { ctx.beginPath(); ctx.moveTo(0, 0); ctx.arc(0, 0, r, i / n * Math.PI * 2, i / n * Math.PI * 2 + Math.PI / n); ctx.closePath(); ctx.fill(); } ctx.restore(); }
function notifCard(x, y, k, w = 660) {
  if (k <= 0) return; ctx.save(); ctx.translate(x, y); ctx.scale(k, k);
  rrect(-w / 2 + 8, -80 + 12, w, 160, 30); ctx.fillStyle = 'rgba(0,0,0,.35)'; ctx.fill();
  rrect(-w / 2, -80, w, 160, 30); ctx.fillStyle = '#FFFFFF'; ctx.fill();
  rrect(-w / 2 + 28, -48, 96, 96, 24); ctx.fillStyle = TANG; ctx.fill();
  glasses(-w / 2 + 76, 0, 17, { shape: 'wayfarer', color: INK, stroke: 5, fillL: TEAL, fillR: BUTTER, temples: false });
  text('Muse', -w / 2 + 150, -14, { kind: 'exp', size: 30, color: INK, align: 'left' });
  text('now', w / 2 - 30, -14, { kind: 'mono', size: 20, color: '#8A8A8A', align: 'right' });
  text('Find frames that actually fit your face.', -w / 2 + 150, 30, { kind: 'light', size: 26, color: INK, align: 'left' });
  ctx.restore();
}
function exclaim(x, y, k, col = TANG) { if (k <= 0) return; ctx.save(); ctx.translate(x, y); ctx.scale(k, k); ctx.rotate((1 - k) * .5); rrect(-12, -70, 24, 70, 12); ctx.fillStyle = col; ctx.fill(); circle(0, 26, 13); ctx.fill(); ctx.restore(); }
function bag(x, y, rot, s) { ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.scale(s, s); ctx.strokeStyle = '#8A5A2A'; ctx.lineWidth = 8; ctx.beginPath(); ctx.arc(0, -20, 40, Math.PI, 0); ctx.stroke(); ctx.fillStyle = '#D19A63'; ctx.beginPath(); ctx.moveTo(-80, -20); ctx.lineTo(80, -20); ctx.lineTo(95, 150); ctx.lineTo(-95, 150); ctx.closePath(); ctx.fill(); ctx.fillStyle = 'rgba(0,0,0,.1)'; ctx.fillRect(-95, 120, 190, 30); ctx.restore(); }

// montage backgrounds
function bgStreet(t) {
  bgFill('#CFE9F2'); circle(1600, 220, 90); ctx.fillStyle = BUTTER; ctx.fill();
  const b = [[0, 520, 260, TANG], [240, 380, 220, LILAC], [440, 600, 300, TEAL], [720, 440, 240, BUTTER], [940, 300, 280, '#2F3446'], [1200, 500, 260, TANG], [1440, 360, 240, LILAC], [1660, 540, 300, TEAL]];
  b.forEach(([x, top, w, c], i) => { const px = x; ctx.fillStyle = c; ctx.fillRect(px, top, w, H - top); ctx.fillStyle = 'rgba(255,255,255,.35)'; for (let yy = top + 40; yy < H - 120; yy += 80) for (let xx = px + 30; xx < px + w - 40; xx += 70) ctx.fillRect(xx, yy, 34, 44); });
  ctx.fillStyle = INK; ctx.fillRect(0, H - 110, W, 110); ctx.fillStyle = BUTTER; for (let x = -((t * 400) % 200); x < W; x += 200) ctx.fillRect(x, H - 60, 100, 12);
}
function bgOffice(t) {
  bgFill(PAPER); ctx.fillStyle = '#CFE9F2'; rrect(160, 120, 700, 560, 20); ctx.fill(); ctx.strokeStyle = '#E2DCD0'; ctx.lineWidth = 18; ctx.stroke();
  ctx.strokeStyle = PAPER; ctx.lineWidth = 12; ctx.beginPath(); ctx.moveTo(510, 120); ctx.lineTo(510, 680); ctx.moveTo(160, 400); ctx.lineTo(860, 400); ctx.stroke();
  ctx.fillStyle = '#2F3446'; ctx.fillRect(300, 470, 120, 210); ctx.fillStyle = TEAL; ctx.fillRect(600, 520, 150, 160);
  ctx.fillStyle = '#2E9E6B'; for (let i = 0; i < 5; i++) { ctx.save(); ctx.translate(1640, 700); ctx.rotate(-.8 + i * .4 + Math.sin(t * 2 + i) * .04); ctx.beginPath(); ctx.ellipse(0, -110, 38, 110, 0, 0, Math.PI * 2); ctx.fill(); ctx.restore(); }
  ctx.fillStyle = TANG; rrect(1570, 690, 140, 150, 20); ctx.fill();
  ctx.fillStyle = '#E2DCD0'; ctx.fillRect(0, 900, W, 180);
}
function bgCafe(t) {
  bgFill(TANG); for (let i = 0; i < 12; i++) { ctx.fillStyle = i % 2 ? PAPER : RED; ctx.beginPath(); ctx.moveTo(i * 170, 0); ctx.lineTo(i * 170 + 170, 0); ctx.lineTo(i * 170 + 170, 150); ctx.quadraticCurveTo(i * 170 + 85, 210, i * 170, 150); ctx.closePath(); ctx.fill(); }
  [[360, 300], [1560, 340]].forEach(([x, y]) => { ctx.strokeStyle = INK; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(x, 150); ctx.lineTo(x, y - 60); ctx.stroke(); ctx.fillStyle = INK; ctx.beginPath(); ctx.arc(x, y, 70, Math.PI, 0); ctx.fill(); circle(x, y + 12, 22); ctx.fillStyle = BUTTER; ctx.fill(); });
  ctx.fillStyle = '#8A5A2A'; ctx.fillRect(0, 920, W, 160);
  [[300, 880], [1620, 880]].forEach(([x, y]) => { ctx.fillStyle = PAPER; rrect(x - 50, y - 70, 100, 90, [0, 0, 30, 30]); ctx.fill(); ctx.strokeStyle = PAPER; ctx.lineWidth = 12; ctx.beginPath(); ctx.arc(x + 60, y - 30, 26, -1.2, 1.2); ctx.stroke(); ctx.strokeStyle = 'rgba(255,255,255,.7)'; ctx.lineWidth = 6; for (let k = -1; k <= 1; k++) { ctx.beginPath(); ctx.moveTo(x + k * 22, y - 90 - Math.sin(t * 5 + k) * 6); ctx.quadraticCurveTo(x + k * 22 + 14, y - 120, x + k * 22, y - 150 + Math.sin(t * 5 + k) * 6); ctx.stroke(); } });
}
function bgPark(t) {
  const g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#FFB35C'); g.addColorStop(1, BUTTER); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  circle(1450, 420, 160); ctx.fillStyle = '#FFF1C9'; ctx.fill();
  ctx.fillStyle = '#2E9E6B'; ctx.beginPath(); ctx.moveTo(0, 760); ctx.quadraticCurveTo(500, 580, 1000, 760); ctx.quadraticCurveTo(1450, 900, W, 700); ctx.lineTo(W, H); ctx.lineTo(0, H); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#23875A'; ctx.beginPath(); ctx.moveTo(0, 900); ctx.quadraticCurveTo(700, 760, W, 920); ctx.lineTo(W, H); ctx.lineTo(0, H); ctx.closePath(); ctx.fill();
  [[260, 640], [1700, 600]].forEach(([x, y]) => { ctx.fillStyle = '#8A5A2A'; ctx.fillRect(x - 14, y, 28, 160); ctx.fillStyle = '#23875A'; circle(x, y - 40, 110); ctx.fill(); circle(x - 70, y + 10, 70); ctx.fill(); circle(x + 70, y + 10, 70); ctx.fill(); });
  ctx.strokeStyle = INK; ctx.lineWidth = 5; for (let i = 0; i < 3; i++) { const bx = ((t * 120 + i * 300) % 2200) - 100, by = 200 + i * 60 + Math.sin(t * 3 + i) * 10; ctx.beginPath(); ctx.moveTo(bx - 20, by); ctx.quadraticCurveTo(bx - 10, by - 12 - Math.sin(t * 14 + i) * 8, bx, by); ctx.quadraticCurveTo(bx + 10, by - 12 - Math.sin(t * 14 + i) * 8, bx + 20, by); ctx.stroke(); }
}

// ================= S1 · This is Sam  [0, 6.1] =================
const S1P = { x: 1460, y: 540, h: 400 };
const OLD_G = { shape: 'round', color: '#3A3A3A', scale: 1.02 };
function s1(t) {
  const blurAmt = 11 * eio(seg(t, 3.6, 4.3));
  blurDraw(blurAmt, () => { bgFill(PAPER); dotGrid(DOT_LIGHT, t, 1); floaters(t, 3, [TEAL, TANG, BUTTER, LILAC], 14, .45); });
  const { x, y, h } = S1P; const k = back(seg(t, .15, .65), 2);
  const crack = seg(t, 2.3, 2.45), out = t >= 2.75;
  const shock = spring(t, 2.35, 30, 9);
  const expr = t < 2.3 ? { mouth: 'smile', happy: t > .7 && t < 1.6 } : t < 3.0 ? { mouth: 'o', brow: 1 } : t < 3.8 ? { mood: -1, mouth: 'smile', look: -1 } : t < 5.2 ? { squint: seg(t, 3.8, 4.1), mouth: 'flat' } : { angry: .6, mouth: 'smirk' };
  const L = samLens(x, y, h, OLD_G.scale, 0);
  face({ ...SAM, x: x + shock * 8, y, h, sc: k, sx: 1 + spring(t, .55, 18, 7) * .05, sy: 1 - spring(t, .55, 18, 7) * .05, blink: blink(t, .1), ...expr,
    g: { ...OLD_G, tintL: out ? null : 'rgba(190,225,235,.45)', tint: 'rgba(190,225,235,.45)', rot: shock * .04 },
    extra: (Wd, hh) => {
      const lw = Wd * .17 * OLD_G.scale, cx = -lw * 1.21, b = LB.round * lw;
      ctx.save(); ctx.translate(0, -b * .45); ctx.rotate(.15); ctx.fillStyle = '#F4F2EE'; rrect(-lw * .28, -lw * .12, lw * .56, lw * .24, 4); ctx.fill(); ctx.strokeStyle = 'rgba(0,0,0,.15)'; ctx.lineWidth = 2; for (let i = -2; i <= 2; i++) { ctx.beginPath(); ctx.moveTo(i * lw * .1, -lw * .12); ctx.lineTo(i * lw * .1, lw * .12); ctx.stroke(); } ctx.restore();
      if (crack > 0 && !out) { ctx.save(); ctx.strokeStyle = '#fff'; ctx.lineWidth = 3; ctx.lineCap = 'round'; const rays = [[-.3, .9], [.5, .8], [1.9, .9], [2.8, .7], [4.1, .85], [5.2, .75]]; rays.forEach(([a, l]) => { ctx.beginPath(); ctx.moveTo(cx + lw * .15, -b * .1); ctx.lineTo(cx + lw * .15 + Math.cos(a) * lw * l * crack, -b * .1 + Math.sin(a) * lw * l * crack); ctx.stroke(); }); ctx.restore(); }
    } });
  // falling lens
  if (out && t < 3.8) {
    const dt = t - 2.75; const lx = L.x + dt * 180, ly = L.y + 60 * dt + 1600 * dt * dt - Math.sin(Math.min(dt, .2) / .2 * Math.PI) * 30;
    ctx.save(); ctx.translate(lx, ly); ctx.rotate(dt * 9); ctx.scale(1, Math.cos(dt * 11));
    ctx.beginPath(); ctx.ellipse(0, 0, L.lw * .95, LB.round * L.lw * .95, 0, 0, Math.PI * 2); ctx.fillStyle = 'rgba(190,225,235,.85)'; ctx.fill(); ctx.strokeStyle = '#fff'; ctx.lineWidth = 4; ctx.stroke(); ctx.restore();
  }
  // wave
  const wv = seg(t, .6, .8) * (1 - seg(t, 1.8, 2.0));
  if (wv > 0) hand(x + 260, y + 330 - wv * 120, -.2 + Math.sin(t * 12) * .35, 1.1, SAM.skin, 'open');
  // copy
  popLine([{ s: 'This' }, { s: 'is' }, { s: 'Sam.', color: TANG }], 150, 560, t, .7, { size: 116, stagger: .09, align: 'left', exitAt: 2.3 });
  popLine([{ s: 'Sam’s' }, { s: 'old' }, { s: 'glasses' }], 150, 480, t, 2.55, { size: 94, stagger: .07, align: 'left', exitAt: 3.95 });
  popLine([{ s: 'just' }, { s: 'gave' }, { s: 'up.', color: RED }], 150, 600, t, 2.75, { size: 94, stagger: .07, align: 'left', exitAt: 3.95 });
  ctx.save(); const bl = 6 * seg(t, 4.3, 4.6) * (1 - seg(t, 5.3, 5.5)); if (bl > 0) ctx.filter = `blur(${bl}px)`;
  popLine([{ s: 'Everything’s' }], 150, 480, t, 4.1, { size: 94, align: 'left', exitAt: 5.3 });
  popLine([{ s: 'a' }, { s: 'blur.', color: TEAL }], 150, 600, t, 4.25, { size: 94, stagger: .07, align: 'left', exitAt: 5.3 });
  ctx.restore();
  popLine([{ s: 'Time' }, { s: 'for' }, { s: 'new' }, { s: 'ones.', color: TANG, hl: BUTTER }], 150, 560, t, 5.25, { size: 88, stagger: .06, align: 'left' });
  // opening iris
  const io = eout(seg(t, 0, .7)); if (io < 1) { ctx.save(); ctx.fillStyle = '#000'; ctx.beginPath(); ctx.rect(0, 0, W, H); ctx.arc(x, y, io * 2400, 0, Math.PI * 2, true); ctx.fill('evenodd'); ctx.restore(); }
}
cue(0, 'iris', .6); cue(.2, 'pop', .9, 0); cue(.62, 'squish', .4); cue(.7, 'wave', .5);
[0, 1, 2].forEach((i) => cue(.7 + i * .09, 'tick', .45, i)); cue(2.32, 'crack', 1); cue(2.75, 'tink', .8); cue(3.05, 'clatter', .6); cue(3.2, 'wahwah', .5);
[0, 1, 2].forEach((i) => cue(2.55 + i * .07, 'tick', .35, i)); cue(3.62, 'blur', .6); cue(4.1, 'tick', .3, 2); cue(5.25, 'tick', .4, 4); cue(5.55, 'swipe', .4); cue(5.6, 'whoosh', .8);

// ================= S2 · the store  [5.6, 16.0] =================
const TRY = [
  { a: 2.4, g: { shape: 'square', scale: 1.55, color: INK }, cap: 'Too big.', ex: { mouth: 'flat', brow: .6 } },
  { a: 3.2, g: { shape: 'round', scale: .55, color: '#8A5A2A' }, cap: 'Too small.', ex: { squint: .6, mouth: 'o' } },
  { a: 4.0, g: { shape: 'cat', scale: 1.15, color: TANG, tint: 'rgba(255,211,77,.45)' }, cap: 'Too loud.', ex: { mouth: 'wobbly', brow: 1 } },
  { a: 4.8, g: { shape: 'rect', scale: .95, color: INK }, cap: 'Too serious.', ex: { mouth: 'flat', angry: .7 } },
  { a: 5.6, g: { shape: 'wayfarer', scale: 1.0, color: '#8A5A2A' }, cap: 'Maybe?', ex: { mouth: 'smile', brow: .7 } },
  { a: 6.4, g: { shape: 'wayfarer', scale: 1.0, color: '#8A5A2A' }, cap: '…No.', ex: { mood: -1 }, slide: true },
];
function s2(t) {
  if (t < 2.4) {
    bgFill('#EFE8DC'); dotGrid(DOT_LIGHT, 0, 1, 0);
    const Z = lerp(1.8, .78, eio(seg(t, 0, 2.4)));
    ctx.save(); ctx.translate(960, 470); ctx.scale(Z, Z);
    for (let r = -6; r <= 6; r++) for (let c = -9; c <= 9; c++) {
      const d = Math.hypot(r * 1.2, c); const k = back(seg(t, .05 + d * .035, .4 + d * .035), 2);
      tile(c * 176, r * 134, (r + 6) * 19 + (c + 9), k);
    }
    ctx.restore();
    const words = [['So.', .45], ['Many.', .95], ['Frames.', 1.45]];
    words.forEach(([w, a], i) => { const nx = words[i + 1] ? words[i + 1][1] : 2.2; if (t < a || t > nx) return; const sk = back(seg(t, a, a + .25), 2.6); text(w, 960, 560, { kind: 'exp', size: 230, color: INK, scale: lerp(1.6, 1, sk), shadow: { color: BUTTER, x: 14, y: 14 }, alpha: 1 - seg(t, nx - .06, nx) }); });
    face({ ...SAM, x: 960, y: 1030 - back(seg(t, .3, .7)) * 110, h: 260, look: Math.sin(t * 7) * 1.2, mouth: 'o', brow: 1, blink: 0, g: null });
  } else if (t < 7.2) {
    bgFill(PAPER); dotGrid(DOT_LIGHT, t, 1);
    const i = Math.min(TRY.length - 1, Math.max(0, TRY.findLastIndex((tr) => t >= tr.a)));
    const tr = TRY[i], lt = t - tr.a;
    // mirror
    const MX = 700, MY = 540;
    ctx.save(); ctx.beginPath(); ctx.ellipse(MX + 14, MY + 18, 350, 440, 0, 0, Math.PI * 2); ctx.fillStyle = 'rgba(0,0,0,.12)'; ctx.fill();
    ctx.beginPath(); ctx.ellipse(MX, MY, 350, 440, 0, 0, Math.PI * 2); ctx.fillStyle = '#B77C47'; ctx.fill();
    ctx.beginPath(); ctx.ellipse(MX, MY, 318, 408, 0, 0, Math.PI * 2); ctx.fillStyle = '#DDEFF1'; ctx.fill(); ctx.clip();
    const punch = 1 + spring(t, tr.a, 22, 9) * .03;
    ctx.translate(MX, MY); ctx.scale(punch, punch); ctx.translate(-MX, -MY);
    const inK = back(seg(lt, 0, .22), 2.2);
    let g = { ...tr.g, dy: -(1 - inK) * 1.3 + (tr.slide ? eio(seg(lt, .15, .55)) * .16 : 0), rot: tr.slide ? eio(seg(lt, .15, .55)) * .18 : spring(lt, .22, 16, 6) * .06 };
    face({ ...SAM, x: MX, y: MY + 30, h: 420, blink: blink(t, .4), ...tr.ex, g });
    if (i > 0) { const pk = ein(seg(lt, 0, .18)); if (pk < 1) { const pg = TRY[i - 1].g; const L = samLens(MX, MY + 30, 420, pg.scale); glasses(MX + pk * 500, MY + 30 - pk * 300, L.lw, { shape: pg.shape, color: pg.color, rot: pk * 1.4, fillL: 'rgba(255,255,255,.22)' }); } }
    ctx.restore();
    ctx.save(); ctx.beginPath(); ctx.ellipse(MX, MY, 318, 408, 0, 0, Math.PI * 2); ctx.clip(); ctx.fillStyle = 'rgba(255,255,255,.28)'; ctx.beginPath(); ctx.moveTo(MX - 300, MY - 100); ctx.lineTo(MX - 180, MY - 420); ctx.lineTo(MX - 110, MY - 420); ctx.lineTo(MX - 230, MY - 100); ctx.closePath(); ctx.fill(); ctx.beginPath(); ctx.moveTo(MX - 190, MY - 60); ctx.lineTo(MX - 90, MY - 420); ctx.lineTo(MX - 60, MY - 420); ctx.lineTo(MX - 160, MY - 60); ctx.closePath(); ctx.fill(); ctx.restore();
    // caption
    text(`TRY ${String(i + 1).padStart(2, '0')} / 06`, 1150, 430, { kind: 'mono', size: 26, color: INK, align: 'left', sp: 6, alpha: .7 });
    const ck = back(seg(lt, .05, .3), 2.2);
    ctx.save(); ctx.beginPath(); ctx.rect(1150, 440, 760, 180); ctx.clip();
    text(tr.cap, 1150, 560 + (1 - ck) * 150, { kind: 'exp', size: 88, color: i === 4 ? TEAL : i === 5 ? RED : INK, align: 'left' });
    ctx.restore();
    // clock
    const mins = 45 * seg(t, 2.4, 7.2);
    clockIcon(1640, 210, 90, mins * 60 * .02 + mins);
    text(Math.round(mins) + ' MIN', 1640, 360, { kind: 'mono', size: 30, color: INK, sp: 4 });
  } else {
    bgFill(PAPER); dotGrid(DOT_LIGHT, t, 1);
    const sigh = spring(t, 7.7, 10, 4);
    face({ ...SAM, x: 1470, y: 560, h: 400, sy: 1 - sigh * .04, mood: -1, look: -.6, blink: blink(t, .2), g: null });
    bag(1740, 830 + Math.sin(t * 3) * 6, Math.sin(t * 2.4) * .15, .9);
    popLine([{ s: '45' }, { s: 'minutes.' }], 150, 470, t, 7.35, { size: 100, stagger: .08, align: 'left' });
    popLine([{ s: 'Nothing' }, { s: 'felt' }, { s: 'right.', color: RED }], 150, 600, t, 7.75, { size: 100, stagger: .08, align: 'left' });
    // lens-shaped iris out on Sam's eyes
    const p = seg(t, 9.45, 9.95);
    if (p > 0) {
      const lw = lerp(1700, 0, eio(p));
      ctx.save(); ctx.fillStyle = '#000'; ctx.beginPath(); ctx.rect(0, 0, W, H);
      [-1, 1].forEach((sd) => { const cx = 1470 + sd * lw * 1.21 * .5; lensPts('wayfarer', lw * .5, lw * .5 * .78, 60).forEach(([px, py], j) => { const X = cx + sd * -px, Y = 560 + py; j ? ctx.lineTo(X, Y) : ctx.moveTo(X, Y); }); ctx.closePath(); });
      ctx.fill('evenodd'); ctx.restore();
    }
  }
}
cue(6.05, 'thump', .7); for (let d = 0; d < 10; d++) cue(6.1 + d * .07, 'pop', .25, d % 7);
[6.45, 6.95, 7.45].forEach((a, i) => cue(a, 'slam', .75, 3 + i)); cue(6.35, 'pop', .5, -3);
TRY.forEach((tr, i) => { cue(6 + tr.a, 'swish', .5); cue(6 + tr.a + .15, 'click', .55); cue(6 + tr.a + .1, i === 4 ? 'ding' : 'nope', .5, i); });
cue(12.5, 'slide', .6); cue(12.9, 'wahwah', .4);
[0, 1].forEach((i) => cue(13.35 + i * .08, 'tick', .4, i)); [0, 1, 2].forEach((i) => cue(13.75 + i * .08, 'tick', .4, i + 2)); cue(13.7, 'sigh', .6); cue(15.45, 'irisout', .7);

// ================= S3 · online  [16.0, 24.0] =================
const ADD_T = [1.5, 2.0, 2.5];
const BOX1 = [3.3, 3.6, 3.9], BOX2 = [5.4, 5.6, 5.8, 6.0, 6.2];
function s3(t) {
  bgFill(LILAC); dotGrid(DOT_COL, t, .45);
  if (t < 3.4) {
    const ly = 600 + ein(seg(t, 3.0, 3.4)) * 1000;
    popLine([{ s: 'Maybe' }, { s: 'online?', color: PAPER, hl: INK }], 960, 125, t, .35, { size: 84, stagger: .08, exitAt: 2.95 });
    const scroll = 2600 * eio(seg(t, .5, 1.35));
    laptop(960, ly, .9, () => {
      ctx.fillStyle = '#F4F2EE'; ctx.fillRect(0, 0, 1060, 70); text('SHOP · FRAMES', 34, 46, { kind: 'mono', size: 22, color: INK, align: 'left', sp: 4 });
      const cart = ADD_T.filter((a) => t >= a + .12).length;
      ctx.save(); ctx.translate(990, 36); ctx.strokeStyle = INK; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(-26, -14); ctx.lineTo(-18, -14); ctx.lineTo(-10, 10); ctx.lineTo(14, 10); ctx.lineTo(20, -6); ctx.lineTo(-14, -6); ctx.stroke();
      if (cart > 0) { const bk = back(seg(t, ADD_T[cart - 1] + .12, ADD_T[cart - 1] + .4), 2.5); ctx.scale(bk, bk); circle(16, -16, 14); ctx.fillStyle = RED; ctx.fill(); text(String(cart), 16, -9, { kind: 'exp', size: 18, color: PAPER }); }
      ctx.restore();
      ctx.save(); ctx.beginPath(); ctx.rect(0, 70, 1060, 570); ctx.clip();
      for (let r = 0; r < 30; r++) for (let c = 0; c < 4; c++) {
        const cx = 40 + c * 250, cy = 100 + r * 280 - scroll + 2600; if (cy < -300 || cy > 700) continue;
        const idx = r * 4 + c; rrect(cx, cy, 225, 250, 16); ctx.fillStyle = '#FFFFFF'; ctx.fill(); ctx.strokeStyle = '#E5E1D8'; ctx.lineWidth = 2; ctx.stroke();
        const tg = tileGlasses(idx); glasses(cx + 112, cy + 85, 34, { shape: tg.shape, color: tg.color, stroke: 7, fillL: 'rgba(0,0,0,.04)' });
        ctx.fillStyle = '#DDD'; ctx.fillRect(cx + 18, cy + 150, 120, 12); ctx.fillRect(cx + 18, cy + 172, 80, 12);
        const added = r === 1 && c < 3 && t >= ADD_T[c] + .1;
        rrect(cx + 18, cy + 200, 188, 36, 18); ctx.fillStyle = added ? TEAL : INK; ctx.fill();
        text(added ? 'ADDED ✓' : 'ADD TO CART', cx + 112, cy + 225, { kind: 'mono', size: 16, color: PAPER, sp: 2 });
      }
      ctx.restore();
    });
    // cursor hopping between add buttons
    const cp = [[620, 841], [845, 841], [1070, 841]];
    if (t > 1.2 && t < 3.0) {
      const i = Math.min(2, Math.max(0, ADD_T.findLastIndex((a) => t >= a - .3)));
      const prev = cp[Math.max(0, i - 1)], cur = cp[i]; const mk = eio(seg(t, ADD_T[i] - .3, ADD_T[i] - .05));
      const press = Math.sin(Math.PI * seg(t, ADD_T[i], ADD_T[i] + .12));
      cursor(lerp(i === 0 ? 900 : prev[0], cur[0], mk), lerp(i === 0 ? 1000 : prev[1], cur[1], mk) + ly - 600, press);
      if (press > 0) { ctx.save(); circle(cur[0], cur[1] + ly - 600, 20 + press * 30); ctx.strokeStyle = TANG; ctx.lineWidth = 5; ctx.globalAlpha = 1 - press * .3; ctx.stroke(); ctx.restore(); }
    }
  } else {
    // doorstep
    const ds = eout(seg(t, 3.0, 3.4));
    ctx.save(); ctx.translate(0, (1 - ds) * -1100);
    bgFill(PAPER); dotGrid(DOT_LIGHT, t, 1);
    door(380, 900);
    const day = Math.min(19, 3 + Math.floor(seg(t, 3.3, 6.9) * 16)); const fl = (seg(t, 3.3, 6.9) * 16) % 1;
    calendar(1720, 200, 1.1, day, fl);
    // boxes
    const topple = seg(t, 6.35, 6.95);
    const stack = [];
    BOX1.forEach((a, i) => { if (t >= a && t < 5.2) stack.push({ a, i, ret: seg(t, 4.85 + i * .08, 5.2 + i * .08), stamp: seg(t, 4.3 + i * .15, 4.45 + i * .15) }); });
    BOX2.forEach((a, i) => { if (t >= a) stack.push({ a, i, ret: 0, stamp: 0, tall: true }); });
    stack.forEach((b) => {
      const k = seg(t, b.a, b.a + .22); const fall = ein(k); const land = spring(t, b.a + .22, 24, 10);
      const yRest = 900 - 100 - b.i * 196; let yy = lerp(-200, yRest, fall) - b.ret * 1400; let xx = 930, rot = 0;
      if (b.tall && topple > 0) { const tk = ein(topple); rot = tk * (.6 + b.i * .15); xx += tk * (180 + b.i * 160); yy += tk * tk * b.i * 120; }
      box(xx, yy, 1, rot + land * .03, { stamp: b.stamp });
    });
    const words = [['Guess.', 3.3], ['Ship.', 3.8], ['Return.', 4.3], ['Repeat.', 5.3]];
    words.forEach(([w, a], i) => { const nx = words[i + 1] ? words[i + 1][1] : 6.9; if (t < a || t > nx) return; const sk = back(seg(t, a, a + .22), 2.6); text(w, 1500, 560, { kind: 'exp', size: 120, color: i === 2 ? RED : INK, scale: lerp(1.5, 1, sk), shadow: { color: BUTTER, x: 8, y: 8 }, alpha: 1 - seg(t, nx - .05, nx) }); });
    // Sam pops up, box lands on head
    if (t > 6.9) {
      const pk = back(seg(t, 6.9, 7.2), 1.8); const bonk = spring(t, 7.35, 26, 8);
      face({ ...SAM, x: 1080, y: 1100 - pk * 420, h: 400, sy: 1 - bonk * .12, sx: 1 + bonk * .08, mouth: 'wobbly', angry: .8, squint: .3, g: null });
      const bk = ein(seg(t, 7.1, 7.35)); box(1080, lerp(-200, 1100 - pk * 420 - 280 + bonk * 20, bk), .85, bonk * .1, { label: false });
      text('Ugh.', 520, 250, { kind: 'exp', size: 170, color: INK, scale: back(seg(t, 7.4, 7.6), 2.6), shadow: { color: RED, x: 10, y: 10 } });
    }
    ctx.restore();
  }
  const io = eout(seg(t, 0, .45)); if (io < 1) { ctx.save(); ctx.fillStyle = '#000'; ctx.beginPath(); ctx.rect(0, 0, W, H); ctx.arc(960, 540, io * 1300, 0, Math.PI * 2, true); ctx.fill('evenodd'); ctx.restore(); }
}
cue(16.0, 'irisin', .5); cue(16.35, 'tick', .4, 0); cue(16.43, 'tick', .4, 2); cue(16.5, 'scroll', .7); ADD_T.forEach((a, i) => { cue(16 + a, 'click', .7); cue(16 + a + .12, 'pop', .6, 5 + i); });
cue(19.0, 'whoosh', .6); BOX1.forEach((a) => cue(16 + a + .22, 'box', .9)); [3.3, 3.8, 4.3, 5.3].forEach((a, i) => cue(16 + a, 'slam', .6, 6 + i));
[0, 1, 2].forEach((i) => cue(16 + 4.3 + i * .15, 'stamp', .9)); cue(16 + 4.85, 'whoosh', .5); BOX2.forEach((a) => cue(16 + a + .22, 'box', .8));
for (let d = 0; d < 16; d++) cue(19.3 + d * .225, 'flip', .25); cue(22.4, 'crash', .9); cue(23.05, 'pop', .6, -2); cue(23.35, 'bonk', 1, 0); cue(23.42, 'boing', .5, 0); cue(23.45, 'slam', .5, 9);

// ================= S4 · the ping  [24.0, 28.0] =================
function s4(t) {
  bgFill('#161A26');
  ctx.save(); ctx.fillStyle = '#232A3D'; rrect(180, 120, 460, 380, 16); ctx.fill(); ctx.strokeStyle = '#2F3650'; ctx.lineWidth = 16; ctx.stroke(); ctx.beginPath(); ctx.moveTo(410, 120); ctx.lineTo(410, 500); ctx.moveTo(180, 310); ctx.lineTo(640, 310); ctx.stroke();
  circle(520, 220, 46); ctx.fillStyle = '#F4F2EE'; ctx.fill(); circle(540, 208, 44); ctx.fillStyle = '#232A3D'; ctx.fill();
  [[250, 180], [320, 400], [560, 420], [470, 360], [280, 260]].forEach(([x, y], i) => star(x, y, 7 + (i % 2) * 3, PAPER, .5 + .5 * Math.sin(t * 3 + i))); ctx.restore();
  const lit = eout(seg(t, .8, 1.2));
  const wake = t > 1.6;
  face({ ...SAM, x: 720, y: 600, h: 400, sy: wake ? 1 : .97, mood: wake ? 1 : -.6, squint: wake ? 0 : .55, brow: wake ? 1 : 0, mouth: t < 1.6 ? 'flat' : t < 2.2 ? 'o' : 'smile', look: wake ? .6 : -.3, blink: blink(t, .5) * (wake ? 1 : 0), g: null });
  ctx.save(); ctx.globalCompositeOperation = 'multiply'; ctx.fillStyle = mixC('#6A7390', '#FFFFFF', lit * .55); ctx.fillRect(0, 0, W, H); ctx.restore();
  if (lit > 0) { ctx.save(); ctx.globalCompositeOperation = 'lighter'; const g = ctx.createRadialGradient(1100, 780, 0, 1100, 780, 950); g.addColorStop(0, `rgba(18,179,166,${.45 * lit})`); g.addColorStop(1, 'rgba(18,179,166,0)'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H); ctx.restore(); }
  // phone on the desk
  const buzz = t > .55 && t < 1.3 ? Math.sin(t * 90) * 5 : 0;
  ctx.save(); ctx.translate(1380 + buzz, 900); ctx.rotate(-.12);
  rrect(-90, -170, 180, 340, 26); ctx.fillStyle = INK; ctx.fill(); rrect(-80, -160, 160, 320, 20); ctx.fillStyle = lit > 0 ? mixC('#10141D', '#12B3A6', lit * .8) : '#10141D'; ctx.fill(); ctx.restore();
  if (t > .55 && t < 1.3) { ctx.save(); ctx.strokeStyle = PAPER; ctx.lineWidth = 5; ctx.lineCap = 'round'; ctx.globalAlpha = .7; [-1, 1].forEach((s) => { for (let j = 0; j < 2; j++) { ctx.beginPath(); ctx.arc(1380, 900, 140 + j * 30, s < 0 ? Math.PI * .85 : -Math.PI * .15, s < 0 ? Math.PI * 1.15 : Math.PI * .15); ctx.stroke(); } }); ctx.restore(); }
  const ck = back(seg(t, 1.0, 1.35), 2);
  const exp = eio(seg(t, 3.35, 3.95));
  if (exp <= 0) notifCard(1360, 610, ck);
  exclaim(720, 250, back(seg(t, 1.65, 1.9), 3));
  popLine([{ s: 'Then', color: PAPER }, { s: 'Sam', color: PAPER }, { s: 'found…', color: BUTTER }], 960, 130, t, 2.25, { size: 84, stagger: .08, exitAt: 3.3 });
  // tap + expand into the app
  const tap = seg(t, 3.0, 3.3); if (tap > 0 && exp <= 0) { hand(1400, 700 + (1 - eout(seg(t, 2.7, 3.0))) * 300, -.2, 1.1, SAM.skin, 'point'); if (tap < 1) { ctx.save(); circle(1400, 612, 20 + tap * 50); ctx.strokeStyle = TANG; ctx.lineWidth = 6; ctx.globalAlpha = 1 - tap; ctx.stroke(); ctx.restore(); } }
  if (exp > 0) { rrect(lerp(1030, -10, exp), lerp(530, -10, exp), lerp(660, W + 20, exp), lerp(160, H + 20, exp), lerp(30, 0, exp)); ctx.fillStyle = TEAL; ctx.fill(); }
}
cue(24.0, 'thud', .8); cue(24.55, 'vibrate', .8); cue(25.0, 'ping', .9); cue(25.65, 'pop', .6, 8); cue(25.7, 'gasp', .5); [0, 1, 2].forEach((i) => cue(26.25 + i * .08, 'tick', .4, i)); cue(27.0, 'click', .8); cue(27.3, 'whoosh', .7);

// ================= S5 · Muse app  [28.0, 40.0] =================
const DROP = (() => { const r = rng(404); const keep = [13, 26, 37]; const order = []; for (let i = 0; i < 50; i++) if (!keep.includes(i)) order.push(i); for (let i = order.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [order[i], order[j]] = [order[j], order[i]]; } const m = {}; order.forEach((idx, n) => { m[idx] = 7.0 + n / order.length * 2.0; }); return { m, keep }; })();
const KEEP_G = [{ shape: 'wayfarer', color: '#8A5A2A', tilt: 0 }, { shape: 'square', color: INK, tilt: 0 }, { shape: 'round', color: '#1E5B62', tilt: 0 }];
const tilePos = (i) => [1080 - 4.5 * 158 + (i % 10) * 158, 620 - 2 * 128 + Math.floor(i / 10) * 128];
function appBar(t, step) {
  text('Muse.', 120, 105, { kind: 'bod', size: 58, color: PAPER, align: 'left', stroke: 1 });
  ['SCAN', 'MEASURE', 'MATCH'].forEach((s, i) => { const x = 1330 + i * 190; const on = i === step; rrect(x - 85, 66, 170, 50, 25); ctx.fillStyle = on ? PAPER : 'rgba(255,255,255,.18)'; ctx.fill(); text(s, x, 99, { kind: 'mono', size: 20, color: on ? INK : PAPER, sp: 3 }); });
}
function s5(t) {
  bgFill(TEAL); dotGrid(DOT_COL, t, .3);
  const step = t < 3 ? 0 : t < 6 ? 1 : 2; appBar(t, step);
  if (t < 6.3) {
    const fx = lerp(960, 640, eio(seg(t, 3.0, 3.4))), fy = 590, sh = 1 - ein(seg(t, 6.0, 6.3));
    const Wd = 440 / SAM.shape.len;
    ctx.save(); ctx.translate(fx, fy); ctx.scale(sh, sh); ctx.translate(-fx, -fy);
    face({ ...SAM, x: fx, y: fy, h: 440, blink: blink(t, .7), mouth: t > 2.6 ? 'grin' : 'smile', brow: t > 2.6 ? .6 : 0, g: null });
    // brackets
    const bk = back(seg(t, .1, .4), 2); ctx.save(); ctx.translate(fx, fy - 20); ctx.scale(bk, bk); ctx.strokeStyle = PAPER; ctx.lineWidth = 9; ctx.lineCap = 'round';
    [[-1, -1], [1, -1], [1, 1], [-1, 1]].forEach(([a, b]) => { ctx.beginPath(); ctx.moveTo(a * 230, b * 300 - b * 60); ctx.lineTo(a * 230, b * 300); ctx.lineTo(a * 170, b * 300); ctx.stroke(); }); ctx.restore();
    if (t < 2.6) { const sy = lerp(fy - 300, fy + 280, eio(seg(t, .3, 2.2))); const g = ctx.createLinearGradient(0, sy - 160, 0, sy); g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(1, 'rgba(255,255,255,.45)'); ctx.fillStyle = g; ctx.fillRect(fx - 230, sy - 160, 460, 160); ctx.fillStyle = PAPER; ctx.fillRect(fx - 230, sy - 3, 460, 6); }
    const P = [[-.19, 0], [.19, 0], [0, .1], [-.13, .2], [.13, .2], [0, .38], [-.5, -.02], [.5, -.02], [-.36, .22], [.36, .22], [-.3, -.12], [.3, -.12], [0, -.36]].map(([a, b]) => [fx + a * Wd, fy + b * 440]);
    const E = [[0, 1], [0, 2], [1, 2], [2, 3], [2, 4], [3, 4], [3, 5], [4, 5], [0, 6], [1, 7], [6, 8], [7, 9], [8, 5], [9, 5], [0, 10], [1, 11], [10, 12], [11, 12], [10, 6], [11, 7]];
    const mk = seg(t, .6, 2.3) * (1 - seg(t, 5.8, 6.1) * .8);
    ctx.strokeStyle = 'rgba(255,255,255,.8)'; ctx.lineWidth = 3;
    E.forEach(([a, b], i) => { const k2 = seg(mk, i / E.length * .6, i / E.length * .6 + .4); if (k2 <= 0) return; ctx.beginPath(); ctx.moveTo(P[a][0], P[a][1]); ctx.lineTo(lerp(P[a][0], P[b][0], k2), lerp(P[a][1], P[b][1], k2)); ctx.stroke(); });
    P.forEach(([px, py], i) => { const k2 = back(seg(mk, i / P.length * .5, i / P.length * .5 + .3), 2.4); circle(px, py, 9 * k2); ctx.fillStyle = PAPER; ctx.fill(); circle(px, py, 5 * k2); ctx.fillStyle = TANG; ctx.fill(); });
    if (t > 3.4) { const k1 = eio(seg(t, 3.5, 3.9)), k2 = eio(seg(t, 4.0, 4.4)); ctx.strokeStyle = BUTTER; ctx.lineWidth = 7; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(P[0][0], P[0][1] - 70); ctx.lineTo(lerp(P[0][0], P[1][0], k2), P[0][1] - 70); ctx.stroke(); ctx.beginPath(); ctx.moveTo(fx - Wd * .5, fy + 250); ctx.lineTo(lerp(fx - Wd * .5, fx + Wd * .5, k1), fy + 250); ctx.stroke(); }
    ctx.restore();
    // scan pill
    if (t < 3.1) { const done = t > 2.6; const pk = back(seg(t, .2, .5), 2); ctx.save(); ctx.translate(960, 985); ctx.scale(pk, pk); rrect(-200, -36, 400, 72, 36); ctx.fillStyle = done ? PAPER : 'rgba(255,255,255,.2)'; ctx.fill(); if (!done) { rrect(-200, -36, 400 * seg(t, .3, 2.6), 72, 36); ctx.fillStyle = 'rgba(255,255,255,.35)'; ctx.fill(); } text(done ? 'Got it!' : `Scanning… ${Math.round(100 * seg(t, .3, 2.6))}%`, 0, 11, { kind: 'exp', size: 28, color: done ? INK : PAPER }); ctx.restore(); if (done) check(1180, 985, back(seg(t, 2.6, 2.9), 2.4), 30, TANG); }
    // cards
    const cards = [['FACE WIDTH', 135, ' mm', 'ruler'], ['PUPIL DISTANCE', 62, ' mm', 'eyes'], ['FACE SHAPE', 0, 'Oval', 'shape']];
    cards.forEach(([lab, v, unit, ic], i) => {
      const a = 3.3 + i * .45; const k = back(seg(t, a, a + .45), 1.8); if (k <= 0) return; const ox = (1 - k) * 800 + ein(seg(t, 5.9 + i * .05, 6.2 + i * .05)) * 1000;
      const cx = 1290 + ox, cy = 330 + i * 230;
      ctx.save(); ctx.translate(cx, cy); rrect(-280 + 10, -90 + 14, 560, 180, 28); ctx.fillStyle = 'rgba(0,0,0,.18)'; ctx.fill(); rrect(-280, -90, 560, 180, 28); ctx.fillStyle = '#FFFFFF'; ctx.fill();
      text(lab, -240, -30, { kind: 'mono', size: 22, color: '#6A6A6A', align: 'left', sp: 3 });
      const val = v ? Math.round(v * eout(seg(t, a + .1, a + .7))) + unit : unit; text(val, -240, 50, { kind: 'exp', size: 60, color: INK, align: 'left' });
      ctx.translate(190, 0); ctx.strokeStyle = TANG; ctx.lineWidth = 8; ctx.lineCap = 'round'; const ip = eio(seg(t, a + .2, a + .7));
      if (ic === 'ruler') { rrect(-60, -24, 120 * ip, 48, 8); ctx.stroke(); for (let q = 1; q < 5; q++) if (q * 24 < 120 * ip) { ctx.beginPath(); ctx.moveTo(-60 + q * 24, -24); ctx.lineTo(-60 + q * 24, q % 2 ? -6 : 4); ctx.stroke(); } }
      if (ic === 'eyes') { circle(-36, 0, 14 * ip); ctx.fillStyle = INK; ctx.fill(); circle(36, 0, 14 * ip); ctx.fill(); ctx.beginPath(); ctx.moveTo(-36, 34); ctx.lineTo(lerp(-36, 36, ip), 34); ctx.stroke(); }
      if (ic === 'shape') { ctx.beginPath(); ctx.ellipse(0, 0, 44, 58, 0, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * ip); ctx.stroke(); }
      ctx.restore();
    });
  } else {
    // filter the wall
    const ak = back(seg(t, 6.2, 6.6), 2);
    ctx.save(); ctx.translate(170, 330); ctx.scale(ak, ak); circle(0, 0, 96); ctx.fillStyle = PAPER; ctx.fill(); ctx.save(); circle(0, 0, 90); ctx.clip(); face({ ...SAM, x: 0, y: 40, h: 170, blink: blink(t, .2), g: null }); ctx.restore(); ctx.restore();
    text('SAM', 170, 470, { kind: 'exp', size: 30, color: PAPER, alpha: ak }); ['135 MM', '62 MM', 'OVAL'].forEach((s, i) => { const k = back(seg(t, 6.4 + i * .08, 6.7 + i * .08), 2); ctx.save(); ctx.translate(170, 530 + i * 58); ctx.scale(k, k); rrect(-80, -22, 160, 44, 22); ctx.fillStyle = 'rgba(255,255,255,.2)'; ctx.fill(); text(s, 0, 8, { kind: 'mono', size: 20, color: PAPER, sp: 2 }); ctx.restore(); });
    const left = 50 - Object.values(DROP.m).filter((d) => t >= d + .12).length;
    const done = t > 9.3;
    text(done ? '3 frames fit Sam.' : `Filtering ${left} frames for Sam…`, 1080, 225, { kind: 'exp', size: 46, color: PAPER });
    for (let i = 0; i < 50; i++) {
      let [x, y] = tilePos(i); const d = DROP.m[i]; const k = back(seg(t, 6.2 + (i % 10) * .02 + Math.floor(i / 10) * .04, 6.6 + (i % 10) * .02 + Math.floor(i / 10) * .04), 2);
      if (d !== undefined) {
        const lt = t - d; const grey = seg(lt, 0, .12); let rot = 0, alpha = 1;
        if (lt > .12) { const ft = lt - .12; y += 900 * ft * ft + 60 * ft; x += (i % 2 ? 1 : -1) * 90 * ft; rot = (i % 2 ? 1 : -1) * ft * 3; alpha = 1 - seg(ft, .4, .7); }
        tile(x, y, i, k, { grey, rot, alpha });
      } else {
        const ki = DROP.keep.indexOf(i); const mv = eio(seg(t, 9.2, 9.8)); const tx = 1080 + (ki - 1) * 380, ty = 640;
        tile(lerp(x, tx, mv), lerp(y, ty, mv), i, k, { scale: lerp(1, 2.1, mv), glow: mv * (ki === 1 ? 1 : .55) * (.8 + .2 * Math.sin(t * 6)), g: KEEP_G[ki] });
      }
    }
    sparks(1080, 640, t, 9.8, { n: 14, r0: 250, r1: 360, color: BUTTER, lw: 7 });
    if (t > 9.9) text('BEST FIT', 1080, 830, { kind: 'mono', size: 26, color: INK, sp: 6, scale: back(seg(t, 9.9, 10.2), 2) });
    const wp = seg(t, 11.4, 12.0); if (wp > 0) { circle(1080, 640, ein(wp) * 2300); ctx.fillStyle = BUTTER; ctx.fill(); }
  }
}
cue(28.0, 'chime', .8); cue(28.2, 'pop', .6, 4); cue(28.3, 'scan', .8); for (let i = 0; i < 13; i++) cue(28.7 + i * .12, 'tick', .25, i % 7); cue(30.6, 'ding2', .8);
cue(31.0, 'swish', .5); [0, 1, 2].forEach((i) => { cue(31.3 + i * .45, 'swish', .55); cue(31.5 + i * .45, 'pop', .6, 4 + i * 2); }); cue(31.5, 'ruler', .4); cue(32.0, 'ruler', .4);
cue(33.9, 'whoosh', .6); cue(34.2, 'pop', .5, 0); for (let i = 0; i < 10; i++) cue(34.2 + i * .04, 'tick', .25, i % 7);
{ const ds = Object.values(DROP.m).sort((a, b) => a - b); ds.forEach((d, n) => { if (n % 2 === 0) cue(28 + d + .12, 'plink', .3, -Math.floor(n / 4)); }); }
cue(37.2, 'swish', .6); cue(37.8, 'chord2', .9); cue(37.85, 'sparkle', .7); cue(39.4, 'whoosh', .7);

// ================= S6 · try-on & order  [40.0, 48.0] =================
const TRYON = [{ a: 0, g: KEEP_G[0] }, { a: 1.0, g: KEEP_G[1] }, { a: 1.9, g: KEEP_G[2] }, { a: 2.6, g: KEEP_G[1] }];
function s6(t) {
  bgFill(BUTTER); dotGrid(DOT_COL, t, .5);
  if (t < 4.4) {
    const px = 700 - ein(seg(t, 4.0, 4.4)) * 1300, py = 540 + (1 - back(seg(t, 0, .45), 1.6)) * 900;
    ctx.save(); ctx.translate(px, py);
    rrect(-250 + 16, -490 + 20, 500, 980, 64); ctx.fillStyle = 'rgba(0,0,0,.15)'; ctx.fill(); rrect(-250, -490, 500, 980, 64); ctx.fillStyle = INK; ctx.fill();
    rrect(-228, -468, 456, 936, 48); ctx.fillStyle = '#DDEFF1'; ctx.fill();
    ctx.save(); rrect(-228, -468, 456, 936, 48); ctx.clip();
    const i = TRYON.findLastIndex((x) => t >= x.a); const cur = TRYON[i], lt = t - cur.a;
    const inK = e5(seg(lt, 0, .3)); const dirIn = i === 3 ? -1 : 1;
    face({ ...SAM, x: 0, y: -60, h: 380, blink: blink(t, .3), mouth: i === 3 && t > 3.0 ? 'grin' : 'smile', brow: i === 1 || i === 3 ? .6 : 0, g: { ...cur.g, dx: (1 - inK) * 2.4 * dirIn, tint: 'rgba(255,255,255,.22)' } });
    if (i > 0 && lt < .3) { const pg = TRYON[i - 1].g; const L = samLens(0, -60, 380, 1); glasses(-e5(seg(lt, 0, .3)) * 800 * dirIn, -60, L.lw, { shape: pg.shape, color: pg.color, fillL: 'rgba(255,255,255,.22)' }); }
    // dots, heart, fit, order
    [0, 1, 2].forEach((d) => { circle(-30 + d * 30, 250, (TRYON[i].g === KEEP_G[d] ? 9 : 6)); ctx.fillStyle = TRYON[i].g === KEEP_G[d] ? INK : 'rgba(0,0,0,.25)'; ctx.fill(); });
    const hk = back(seg(t, 3.0, 3.3), 3); ctx.save(); ctx.translate(150, 190); ctx.scale(1 + hk * .15, 1 + hk * .15); ctx.beginPath(); ctx.moveTo(0, 14); ctx.bezierCurveTo(-34, -10, -18, -38, 0, -18); ctx.bezierCurveTo(18, -38, 34, -10, 0, 14); ctx.fillStyle = hk > 0 ? RED : 'rgba(0,0,0,.2)'; ctx.fill(); ctx.restore();
    if (t > 3.0) { const fk = back(seg(t, 3.05, 3.35), 2.2); ctx.save(); ctx.translate(-110, 190); ctx.scale(fk, fk); rrect(-80, -26, 160, 52, 26); ctx.fillStyle = TEAL; ctx.fill(); text('94% FIT', 0, 9, { kind: 'mono', size: 22, color: PAPER, sp: 2 }); ctx.restore(); }
    const ordered = t > 3.75; const press = Math.sin(Math.PI * seg(t, 3.6, 3.75));
    ctx.save(); ctx.translate(0, 360); ctx.scale(1 - press * .06, 1 - press * .06); rrect(-180, -44, 360, 88, 44); ctx.fillStyle = ordered ? TEAL : TANG; ctx.fill(); text(ordered ? 'Ordered ✓' : 'Order', 0, 12, { kind: 'exp', size: 32, color: INK }); ctx.restore();
    ctx.restore();
    // swipe finger
    const sw = [[1.0, 1], [1.9, 1], [2.6, -1]].find(([a]) => t > a - .35 && t < a + .15);
    if (sw) { const k = eio(seg(t, sw[0] - .35, sw[0] + .05)); hand(lerp(sw[1] > 0 ? 170 : -170, sw[1] > 0 ? -170 : 170, k), 120, -.3, 1, SAM.skin, 'point'); }
    if (t > 3.3 && t < 3.9) { const k = eio(seg(t, 3.3, 3.6)); hand(lerp(260, 20, k), lerp(600, 420, k), -.2, 1, SAM.skin, 'point'); }
    ctx.restore();
    popLine([{ s: 'Try' }, { s: 'them' }, { s: 'on.' }], 1080, 470, t, .3, { size: 84, stagger: .07, align: 'left', exitAt: 1.95 });
    popLine([{ s: 'Pick' }, { s: 'your' }, { s: 'fave.', color: RED }], 1080, 470, t, 2.1, { size: 84, stagger: .07, align: 'left', exitAt: 3.95 });
    popLine([{ s: 'Tap', kind: 'light' }, { s: 'order.', kind: 'light' }], 1080, 590, t, 3.1, { size: 70, stagger: .07, align: 'left', exitAt: 3.95 });
    // the box receives the glasses
    if (t > 4.0) { const bk = back(seg(t, 4.0, 4.3), 2); box(960, 700, bk * 1.3, 0, { open: 1, label: false }); }
  } else if (t < 5.3) {
    const close = eio(seg(t, 4.5, 4.8)); const tape = seg(t, 4.8, 5.0); const fly = ein(seg(t, 5.0, 5.3));
    const gy = lerp(300, 640, eio(seg(t, 4.2, 4.55)));
    if (t < 4.6) glasses(960, gy, 60, { shape: 'square', color: INK, fillL: 'rgba(255,255,255,.3)', rot: (1 - seg(t, 4.2, 4.55)) * .6 });
    box(960 + fly * 1600, 700 - fly * 120, 1.3, fly * .2, { open: 1 - close, tape: tape, label: close >= 1 });
    if (fly > 0) { ctx.save(); ctx.strokeStyle = INK; ctx.lineWidth = 8; ctx.lineCap = 'round'; ctx.globalAlpha = .5; for (let j = 0; j < 4; j++) { const yy = 620 + j * 40; ctx.beginPath(); ctx.moveTo(960 + fly * 1600 - 260 - j * 40, yy); ctx.lineTo(960 + fly * 1600 - 260 - j * 40 - 300 * fly, yy); ctx.stroke(); } ctx.restore(); }
  } else {
    bgFill(PAPER); dotGrid(DOT_LIGHT, t, 1); door(380, 900);
    const land = eout(seg(t, 5.35, 5.75)); const bounce = spring(t, 5.75, 20, 8);
    const open = eio(seg(t, 6.3, 6.6));
    const rays = eout(seg(t, 6.4, 7.0)); if (rays > 0) ray(t, 1150, 760, 18, 1400 * rays, 'rgba(255,211,77,.35)', 1);
    const gl = eout(seg(t, 6.55, 7.3)); if (gl > 0) { glasses(1150, lerp(760, 360, gl), lerp(40, 110, gl), { shape: 'square', color: INK, fillL: 'rgba(18,179,166,.4)', fillR: 'rgba(18,179,166,.4)', shine: 1, rot: (1 - gl) * Math.PI * 2, stroke: lerp(7, 18, gl) }); sparks(1150, 360, t, 7.3, { n: 12, r0: 220, r1: 320, color: TANG, lw: 7 }); }
    box(1150, lerp(-300, 800, land) + bounce * 10, 1.1, bounce * .04, { open, label: open <= 0 });
    [[900, 250, 7.4], [1420, 300, 7.5], [1350, 520, 7.6], [950, 480, 7.7]].forEach(([x, y, a], j) => { const k = Math.sin(Math.PI * seg(t, a, a + .5)); star(x, y, 26 * k, [TANG, TEAL, BUTTER][j % 3], k); });
    popLine([{ s: 'Just' }, { s: 'one' }, { s: 'box.', color: TANG, hl: BUTTER }], 150, 230, t, 5.8, { size: 100, stagger: .08, align: 'left', exitAt: 7.3 });
    const wf = seg(t, 7.6, 8.0); if (wf > 0) { ctx.fillStyle = `rgba(255,255,255,${eio(wf)})`; ctx.fillRect(0, 0, W, H); }
  }
}
cue(40.0, 'swish', .6); [0, 1, 2].forEach((i) => cue(40.3 + i * .07, 'tick', .4, i));
[1.0, 1.9, 2.6].forEach((a) => { cue(40 + a - .1, 'swipe', .6); cue(40 + a + .1, 'click', .45); }); cue(42.1, 'tick', .4, 3); cue(43.0, 'pop', .8, 9); cue(43.05, 'ding', .6, 2); cue(43.1, 'tick', .35, 4);
cue(43.6, 'click', .9); cue(43.75, 'ding2', .7); cue(44.0, 'pop', .6, -2); cue(44.2, 'swish', .5); cue(44.55, 'thud', .6); cue(44.8, 'tape', .7); cue(45.0, 'whoosh', .8);
cue(45.55, 'box', .8); cue(45.9, 'dingdong', .9); [0, 1, 2].forEach((i) => cue(45.8 + i * .08, 'tick', .4, i)); cue(46.3, 'swish', .4); cue(46.4, 'choir', .9); cue(47.3, 'sparkle', .8);

// ================= S7 · payoff  [48.0, 56.0] =================
const MONT = [{ a: 1.6, bg: bgStreet, cap: 'On the go.', ex: { wink: true, mouth: 'grin' } }, { a: 2.6, bg: bgOffice, cap: 'At work.', ex: { brow: .8, mouth: 'smirk', rot: -.06 } }, { a: 3.6, bg: bgCafe, cap: 'Coffee dates.', ex: { happy: true, mouth: 'grin', rot: .05 } }, { a: 4.6, bg: bgPark, cap: 'Weekends.', ex: { mouth: 'smile', look: 1 } }, { a: 5.6, bg: null, cap: 'Every day.', ex: { mouth: 'grin', brow: .5 } }];
const SAM_G = { shape: 'square', color: INK, tint: 'rgba(18,179,166,.28)' };
function s7(t) {
  if (t < 1.6) {
    const focus = eio(seg(t, .5, .85)); const bl = 14 * (1 - focus);
    blurDraw(bl, () => bgStreet(t));
    const gk = eout(seg(t, .05, .5)); const land = spring(t, .5, 18, 7);
    face({ ...SAM, x: 960, y: 580, h: 440, squint: 1 - focus, mouth: focus > .5 ? 'grin' : 'flat', brow: focus > .5 ? 1 : 0, sy: 1 - land * .05, sx: 1 + land * .05, blink: 0, g: { ...SAM_G, dy: -(1 - gk) * 1.4, rot: (1 - gk) * .8, shine: focus } });
    confetti(t, .55, 960, 420, 110, 31, [TANG, TEAL, BUTTER, LILAC, PAPER], 1.2);
    sparks(960, 560, t, .55, { n: 16, r0: 300, r1: 420, color: PAPER, lw: 8 });
    popLine([{ s: 'Finally.', color: INK, hl: BUTTER }], 960, 180, t, .75, { size: 110, exitAt: 1.5 });
    const wf = 1 - seg(t, 0, .25); if (wf > 0) { ctx.fillStyle = `rgba(255,255,255,${wf})`; ctx.fillRect(0, 0, W, H); }
  } else {
    const i = MONT.findLastIndex((m) => t >= m.a); const m = MONT[i], lt = t - m.a;
    const draw = (mm, ltt) => {
      const punch = 1 + (1 - eout(seg(ltt, 0, .6))) * .06;
      ctx.save(); ctx.translate(960, 540); ctx.scale(punch, punch); ctx.translate(-960, -540);
      if (mm.bg) mm.bg(t); else { bgFill(PAPER); dotGrid(DOT_LIGHT, t, 1); floaters(t, 60, [TANG, TEAL, BUTTER, LILAC], 18, .6); }
      ctx.restore();
      const bob = Math.sin(t * 8) * 6;
      face({ ...SAM, x: 960, y: 600 + bob, h: 430, blink: blink(t, .45), ...mm.ex, rot: mm.ex.rot || 0, g: { ...SAM_G, shine: .8 } });
      const ck = back(seg(ltt, .08, .35), 2);
      ctx.save(); ctx.beginPath(); ctx.rect(100, 830, 1100, 200); ctx.clip();
      text(mm.cap, 150, 975 + (1 - ck) * 180, { kind: 'exp', size: 104, color: INK, align: 'left', shadow: { color: PAPER, x: 8, y: 8 } });
      ctx.restore();
    };
    const wipe = e5(seg(lt, 0, .2));
    if (i > 0 && wipe < 1) { ctx.save(); draw(MONT[i - 1], t - MONT[i - 1].a); ctx.restore(); ctx.save(); ctx.beginPath(); const x = lerp(W + 300, -300, wipe); ctx.moveTo(x + 200, 0); ctx.lineTo(W + 400, 0); ctx.lineTo(W + 400, H); ctx.lineTo(x - 200, H); ctx.closePath(); ctx.clip(); draw(m, lt); ctx.restore(); }
    else draw(m, lt);
    if (i === 4) { [[520, 300, 5.9], [1400, 280, 6.1], [1450, 620, 6.3], [480, 640, 6.5]].forEach(([x, y, a], j) => { const k = Math.sin(Math.PI * seg(t, a, a + .6)); star(x, y, 30 * k, [TANG, TEAL, BUTTER][j % 3], k); }); }
    const tp = seg(t, 7.45, 8.0); if (tp > 0) { const L = samLens(960, 600, 430, 1); circle(960, L.y, eout(tp) * 2300); ctx.fillStyle = INK; ctx.fill(); }
  }
}
cue(48.0, 'whoosh', .5); cue(48.5, 'focus', 1); cue(48.55, 'confetti', .9); cue(48.55, 'chord', 1); [0].forEach(() => cue(48.75, 'swipe', .5));
MONT.forEach((m, i) => { if (i > 0) cue(48 + m.a, 'swoosh', .6); cue(48 + m.a + .08, 'pop', .55, 3 + i); }); cue(49.6, 'wink', .5); cue(53.9, 'sparkle', .6); cue(55.4, 'whoomp', .8);

// ================= S8 · end card  [56.0, 60.0] =================
function s8(t) {
  bgFill(INK); dotGrid(DOT_DARK, t, seg(t, 0, .5));
  floaters(t, 40, [TEAL, TANG, BUTTER, LILAC], 16, .3 * seg(t, .3, 1));
  const gs = e5(seg(t, 0, .45)); const L = samLens(960, 600, 430, 1);
  glasses(960, lerp(L.y, 330, gs), lerp(L.lw, 95, gs), { shape: 'square', color: PAPER, stroke: lerp(L.lw * .16, 17, gs), fillL: TEAL, fillR: TANG, liquid: true, level: e5(seg(t, .3, .9)), wave: t * 7, shine: seg(t, .9, 1.2) });
  [[640, 250, 1.1], [1290, 210, 1.3], [1350, 470, 1.5], [590, 500, 1.7]].forEach(([x, y, a], i) => { const k = Math.sin(Math.PI * seg(t, a, a + .7)); star(x, y, 22 * k, [BUTTER, PAPER, TEAL][i % 3], k); });
  const lk = back(seg(t, .35, .85), 1.8); const glint = seg(t, 1.2, 1.7);
  const drawWord = () => text('Muse.', 960, 655, { kind: 'bod', size: 290, color: PAPER, scale: lerp(.6, 1, lk), alpha: seg(t, .35, .43), stroke: 4 });
  drawWord();
  if (glint > 0 && glint < 1) { const save = ctx; ctx = octx; ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, W, H); drawWord(); ctx.globalCompositeOperation = 'source-atop'; const gx = lerp(500, 1500, glint); const g = ctx.createLinearGradient(gx - 120, 0, gx + 120, 0); g.addColorStop(0, 'rgba(255,211,77,0)'); g.addColorStop(.5, 'rgba(255,230,160,1)'); g.addColorStop(1, 'rgba(255,211,77,0)'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H); ctx.globalCompositeOperation = 'source-over'; ctx = save; ctx.drawImage(off, 0, 0); }
  popLine([{ s: 'Glasses,', kind: 'light', color: PAPER }, { s: 'fitted', kind: 'light', color: PAPER }, { s: 'to', kind: 'light', color: PAPER }, { s: 'your', kind: 'light', color: PAPER }, { s: 'face.', kind: 'exp', color: INK, hl: BUTTER }], 960, 780, t, .7, { size: 50, stagger: .05, gap: .28 });
  const bk = back(seg(t, 1.25, 1.6), 2.2); const press = Math.sin(Math.PI * seg(t, 2.25, 2.45));
  if (bk > 0) { ctx.save(); ctx.translate(960, 900); ctx.scale(bk * (1 - press * .06), bk * (1 - press * .06)); rrect(-200 + 8, -44 + 10, 400, 88, 44); ctx.fillStyle = 'rgba(0,0,0,.35)'; ctx.fill(); rrect(-200, -44, 400, 88, 44); ctx.fillStyle = TANG; ctx.fill(); text('Find your fit  →', 0, 12, { kind: 'exp', size: 30, color: INK }); ctx.restore(); }
  const ck = seg(t, 1.8, 2.25); if (ck > 0) { const e = eio(ck); const tap = seg(t, 2.25, 2.7); if (tap > 0 && tap < 1) { ctx.save(); ctx.globalAlpha = 1 - tap; circle(1030, 905, 20 + tap * 70); ctx.strokeStyle = PAPER; ctx.lineWidth = 5; ctx.stroke(); ctx.restore(); } cursor(lerp(1420, 1030, e), lerp(1120, 905, e) + Math.sin(e * Math.PI) * -40, press); }
  confetti(t, 2.27, 960, 890, 70, 77, [TEAL, TANG, BUTTER, PAPER], .9);
  // Sam waves goodbye from the corner
  const sk = back(seg(t, 2.6, 3.0), 2); if (sk > 0) { face({ ...SAM, x: 1700, y: 1200 - sk * 290, h: 220, g: { ...SAM_G, shine: .6 }, mouth: 'grin', wink: t > 3.1 && t < 3.4 }); hand(1835, 1080 - sk * 150, -.2 + Math.sin(t * 12) * .35, .55, SAM.skin, 'open'); }
}
cue(56.0, 'chord', 1); cue(56.3, 'bubble', .6); cue(56.4, 'pop', .8, 4); cue(57.2, 'shimmer', .7); [0, 1, 2, 3, 4].forEach((i) => cue(56.7 + i * .05, 'tick', .35, i)); cue(56.95, 'swipe', .35);
cue(57.3, 'pop', .7, 6); cue(57.8, 'swish', .4); cue(58.25, 'click', .9); cue(58.27, 'confetti', .7); cue(58.6, 'pop', .6, 8); cue(58.8, 'wave', .4);

// ================= compositor =================
function drawFrame(T) {
  ctx = main; ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1; ctx.letterSpacing = '0px'; ctx.globalCompositeOperation = 'source-over'; ctx.filter = 'none';
  const save = (fn) => { ctx.save(); fn(); ctx.restore(); };
  if (T < 5.6) save(() => s1(T));
  else if (T < 6.1) { const p = e5(seg(T, 5.6, 6.1)); save(() => { ctx.translate(-W * p, 0); s1(T); }); save(() => { ctx.translate(W * (1 - p), 0); s2(T - 6.0); }); }
  else if (T < 16.0) save(() => s2(T - 6.0));
  else if (T < 24.0) save(() => s3(T - 16.0));
  else if (T < 28.0) save(() => s4(T - 24.0));
  else if (T < 40.0) save(() => s5(T - 28.0));
  else if (T < 48.0) save(() => s6(T - 40.0));
  else if (T < 56.0) save(() => s7(T - 48.0));
  else save(() => s8(T - 56.0));
}
const GR = []; for (let k = 0; k < 4; k++) { const c = document.createElement('canvas'); c.width = c.height = 256; const g = c.getContext('2d'); const img = g.createImageData(256, 256); const r = rng(50 + k); for (let i = 0; i < img.data.length; i += 4) { const v = 128 + (r() - .5) * 90; img.data[i] = img.data[i + 1] = img.data[i + 2] = v; img.data[i + 3] = 255; } g.putImageData(img, 0, 0); GR.push(c); }
function post(T) {
  ctx = main; ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.filter = 'none';
  ctx.save(); ctx.globalAlpha = .05; ctx.globalCompositeOperation = 'overlay'; const g = GR[Math.floor(T * 30) % 4]; ctx.fillStyle = ctx.createPattern(g, 'repeat'); const o = Math.floor(T * 30) * 37 % 256; ctx.translate(-o, -o); ctx.fillRect(0, 0, W + 256, H + 256); ctx.restore();
  const fo = seg(T, 59.5, 60); if (fo > 0) { ctx.globalAlpha = fo; ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H); ctx.globalAlpha = 1; }
}
function renderAt(T) {
  const N = window.MB || 1;
  if (N <= 1) { drawFrame(T); post(T); return; }
  const shutter = 1 / 60;
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
