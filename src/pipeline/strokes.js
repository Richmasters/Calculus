import { blurImg } from './filters.js';
import { imgToCanvas } from '../util/canvas.js';
import { clamp, hexToRgb, rgbToHsl, hslToRgb, rgbToHex } from '../util/color.js';

/**
 * Stroke-based painterly renderer.
 *
 * Coarse-to-fine layers of curved brush strokes are laid over an
 * underpainting. Each layer paints only where the canvas still differs from
 * the reference, so flat sky stays broad and gestural while faces and edges
 * collect progressively smaller strokes — the same economy a painter uses.
 * Stroke direction follows the image's flow field, so strokes wrap around
 * forms instead of cutting across them.
 */
export async function paintStrokes(ctx, target, flow, p, opts = {}) {
  const { w, h } = target;
  const rng = opts.rng || Math.random;
  const yieldTo = opts.yieldTo || (async () => {});
  const sizeScale = opts.sizeScale || 1;

  // 1. Ground: paper colour, then the abstracted photo as a thin underpainting.
  const paper = hexToRgb(p.paperColor);
  ctx.save();
  ctx.globalAlpha = 1;
  ctx.fillStyle = rgbToHex(paper.r, paper.g, paper.b);
  ctx.fillRect(0, 0, w, h);
  if (p.underpaint > 0) {
    ctx.globalAlpha = p.underpaint;
    ctx.drawImage(imgToCanvas(target), 0, 0);
  }
  ctx.restore();

  if (!p.brushEnabled) return;

  const layers = Math.max(1, Math.round(p.brushLayers));
  const baseSize = Math.max(1.2, p.brushSize * sizeScale);

  for (let layer = 0; layer < layers; layer++) {
    const size = Math.max(1.2, baseSize * Math.pow(p.brushSizeFalloff, layer));
    // Reference blurred to match the stroke scale: a big brush should not be
    // chasing detail it cannot possibly render.
    const ref = blurImg(target, Math.max(0.4, size * 0.4));
    const spacing = Math.max(1, (size * 0.85) / Math.max(0.15, p.brushDensity));

    const cols = Math.ceil(w / spacing);
    const rows = Math.ceil(h / spacing);

    // Error map against what is already on the canvas (skipped on layer 0,
    // which always lays a full bed of colour).
    let current = null;
    if (layer > 0 && p.brushDetailThreshold > 0) {
      current = ctx.getImageData(0, 0, w, h).data;
    }

    const cells = [];
    for (let cy = 0; cy < rows; cy++) {
      for (let cx = 0; cx < cols; cx++) cells.push(cy * cols + cx);
    }
    // Random order avoids a visible left-to-right "printing" pattern.
    shuffle(cells, rng);

    const threshold = p.brushDetailThreshold * 0.9;
    let painted = 0;

    for (let ci = 0; ci < cells.length; ci++) {
      const cell = cells[ci];
      const cx = cell % cols;
      const cy = (cell / cols) | 0;
      let x = (cx + 0.5) * spacing + (rng() - 0.5) * spacing * p.brushScatter;
      let y = (cy + 0.5) * spacing + (rng() - 0.5) * spacing * p.brushScatter;
      x = clamp(x, 0, w - 1);
      y = clamp(y, 0, h - 1);

      if (current) {
        const found = worstPoint(current, ref, w, h, x, y, spacing);
        if (found.error < threshold) continue;
        x = found.x;
        y = found.y;
      }

      drawStroke(ctx, ref, flow, x, y, size, p, rng, w, h);
      painted++;

      if ((ci & 1023) === 0) {
        await yieldTo((layer + ci / cells.length) / layers);
      }
    }

    if (opts.onLayer) opts.onLayer(layer, painted);
    await yieldTo((layer + 1) / layers);
  }
}

/** Largest local mismatch inside a cell, sampled on a small lattice. */
function worstPoint(current, ref, w, h, cx, cy, spacing) {
  const half = spacing * 0.5;
  let best = { x: cx, y: cy, error: 0 };
  let total = 0;
  let count = 0;
  for (let sy = -1; sy <= 1; sy++) {
    for (let sx = -1; sx <= 1; sx++) {
      const x = clamp(cx + sx * half * 0.8, 0, w - 1);
      const y = clamp(cy + sy * half * 0.8, 0, h - 1);
      const i = ((y | 0) * w + (x | 0)) * 4;
      const j = (y | 0) * w + (x | 0);
      const dr = current[i] / 255 - ref.r[j];
      const dg = current[i + 1] / 255 - ref.g[j];
      const db = current[i + 2] / 255 - ref.b[j];
      const e = Math.sqrt(dr * dr + dg * dg + db * db) * 0.577;
      total += e;
      count++;
      if (e > best.error) best = { x, y, error: e };
    }
  }
  best.error = Math.max(best.error * 0.6, total / count);
  return best;
}

function drawStroke(ctx, ref, flow, x0, y0, size, p, rng, w, h) {
  const idx = (y0 | 0) * w + (x0 | 0);
  const base = [ref.r[idx], ref.g[idx], ref.b[idx]];
  const color = jitterColor(base, p.brushColorJitter, rng);

  if (p.brushShape === 'dot') {
    drawDab(ctx, x0, y0, size, color, p, rng);
    return;
  }

  const points = tracePath(ref, flow, x0, y0, size, base, p, rng, w, h);
  if (points.length < 2) {
    drawDab(ctx, x0, y0, size, color, p, rng);
    return;
  }

  const bristles = Math.max(1, Math.round(p.brushBristles));
  const flat = p.brushShape === 'flat';
  ctx.save();
  ctx.globalAlpha = p.brushOpacity;
  ctx.lineJoin = 'round';
  ctx.lineCap = flat ? 'butt' : 'round';

  for (let b = 0; b < bristles; b++) {
    const offset = bristles === 1 ? 0 : (b / (bristles - 1) - 0.5) * size * 0.9;
    const width = bristles === 1 ? size : (size / bristles) * 1.45;
    const c = bristles === 1 ? color : jitterColor(color, p.brushColorJitter * 0.6, rng);
    ctx.strokeStyle = rgbToHex(c[0], c[1], c[2]);

    if (p.brushTaper > 0.02) {
      ctx.fillStyle = ctx.strokeStyle;
      fillTaperedRibbon(ctx, points, offset, width, p.brushTaper);
    } else {
      ctx.lineWidth = width;
      ctx.beginPath();
      traceOffsetPath(ctx, points, offset);
      ctx.stroke();
    }
  }
  ctx.restore();
}

/** Walk the flow field, bending the stroke around the forms in the picture. */
function tracePath(ref, flow, x0, y0, size, base, p, rng, w, h) {
  const points = [{ x: x0, y: y0 }];
  const maxLen = size * p.brushLength;
  const step = Math.max(1, size * 0.5);
  const steps = Math.min(64, Math.max(1, Math.round(maxLen / step)));
  const angleJitter = (rng() - 0.5) * Math.PI * p.brushAngleJitter;
  const fixed = p.brushAngleFixed * (Math.PI / 180);

  for (const dir of [1, -1]) {
    let x = x0;
    let y = y0;
    let vx = 0;
    let vy = 0;
    for (let s = 0; s < steps; s++) {
      const i = (Math.round(clamp(y, 0, h - 1)) * w) + Math.round(clamp(x, 0, w - 1));
      const aniso = flow.anisotropy[i];
      // Where the image has no direction of its own, fall back to the user's
      // fixed brush angle instead of letting noise steer the stroke.
      const a = aniso < 0.05
        ? fixed + angleJitter
        : flow.angle[i] * p.brushCurvature + fixed * (1 - p.brushCurvature) + angleJitter;
      let nx = Math.cos(a) * dir;
      let ny = Math.sin(a) * dir;
      if (s > 0 && nx * vx + ny * vy < 0) { nx = -nx; ny = -ny; }
      // Damp direction changes so strokes read as one confident gesture.
      if (s > 0) {
        nx = vx * 0.55 + nx * 0.45;
        ny = vy * 0.55 + ny * 0.45;
        const m = Math.hypot(nx, ny) || 1;
        nx /= m; ny /= m;
      }
      vx = nx; vy = ny;
      x += nx * step;
      y += ny * step;
      if (x < -size || y < -size || x > w + size || y > h + size) break;

      if (p.brushEdgeAware > 0) {
        const j = (Math.round(clamp(y, 0, h - 1)) * w) + Math.round(clamp(x, 0, w - 1));
        const d = Math.abs(ref.r[j] - base[0]) + Math.abs(ref.g[j] - base[1]) + Math.abs(ref.b[j] - base[2]);
        if (d > (1 - p.brushEdgeAware) * 1.2 + 0.06) break;
      }
      if (dir > 0) points.push({ x, y });
      else points.unshift({ x, y });
    }
  }
  return points;
}

function traceOffsetPath(ctx, points, offset) {
  const pts = offsetPoints(points, offset);
  ctx.moveTo(pts[0].x, pts[0].y);
  for (let i = 1; i < pts.length - 1; i++) {
    const mx = (pts[i].x + pts[i + 1].x) / 2;
    const my = (pts[i].y + pts[i + 1].y) / 2;
    ctx.quadraticCurveTo(pts[i].x, pts[i].y, mx, my);
  }
  const last = pts[pts.length - 1];
  ctx.lineTo(last.x, last.y);
}

/**
 * A tapered stroke as a single filled ribbon.
 *
 * Stroking each segment separately would need one canvas path per segment —
 * tens of thousands of draw calls per layer. Building both edges and filling
 * once is visually equivalent and several times faster.
 */
function fillTaperedRibbon(ctx, points, offset, width, taper) {
  const pts = offsetPoints(points, offset);
  const n = pts.length;
  if (n < 2) return;

  const left = new Float64Array(n * 2);
  const right = new Float64Array(n * 2);
  for (let i = 0; i < n; i++) {
    const a = pts[i > 0 ? i - 1 : 0];
    const b = pts[i < n - 1 ? i + 1 : n - 1];
    let dx = b.x - a.x;
    let dy = b.y - a.y;
    const m = Math.hypot(dx, dy) || 1;
    dx /= m;
    dy /= m;
    // Thickest in the middle of the stroke, thinning towards both ends.
    const t = i / (n - 1);
    const bell = 1 - Math.abs(t - 0.5) * 2;
    const hw = Math.max(0.25, width * (1 - taper + taper * bell)) * 0.5;
    left[i * 2] = pts[i].x - dy * hw;
    left[i * 2 + 1] = pts[i].y + dx * hw;
    right[i * 2] = pts[i].x + dy * hw;
    right[i * 2 + 1] = pts[i].y - dx * hw;
  }

  ctx.beginPath();
  ctx.moveTo(left[0], left[1]);
  for (let i = 1; i < n; i++) ctx.lineTo(left[i * 2], left[i * 2 + 1]);
  for (let i = n - 1; i >= 0; i--) ctx.lineTo(right[i * 2], right[i * 2 + 1]);
  ctx.closePath();
  ctx.fill();
}

function offsetPoints(points, offset) {
  if (!offset) return points;
  const out = [];
  for (let i = 0; i < points.length; i++) {
    const a = points[Math.max(0, i - 1)];
    const b = points[Math.min(points.length - 1, i + 1)];
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const m = Math.hypot(dx, dy) || 1;
    out.push({ x: points[i].x - (dy / m) * offset, y: points[i].y + (dx / m) * offset });
  }
  return out;
}

function drawDab(ctx, x, y, size, color, p, rng) {
  ctx.save();
  ctx.globalAlpha = p.brushOpacity;
  ctx.fillStyle = rgbToHex(color[0], color[1], color[2]);
  ctx.beginPath();
  const rx = size * 0.5 * (0.7 + rng() * 0.6);
  const ry = rx * (p.brushShape === 'dot' ? 0.85 + rng() * 0.3 : 0.55);
  ctx.ellipse(x, y, rx, ry, rng() * Math.PI, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function jitterColor(c, amount, rng) {
  if (amount <= 0) return c;
  const [h, s, l] = rgbToHsl(c[0], c[1], c[2]);
  const nh = (h + (rng() - 0.5) * amount * 0.12 + 1) % 1;
  const ns = clamp(s + (rng() - 0.5) * amount * 0.35);
  const nl = clamp(l + (rng() - 0.5) * amount * 0.28);
  return hslToRgb(nh, ns, nl);
}

function shuffle(arr, rng) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    const t = arr[i];
    arr[i] = arr[j];
    arr[j] = t;
  }
}
