import { lumaPlane } from './image.js';
import { gaussBlurPlane } from './filters.js';
import { clamp } from '../util/color.js';
import { mulberry32 } from '../util/rng.js';

/**
 * Painting support (canvas weave, paper tooth) plus impasto relief.
 *
 * The relief pass treats paint lightness as height and lights it from a
 * chosen angle, so thick pale strokes catch the light and sit above the
 * surface the way real paint does.
 */
export function applySurface(img, p, sizeScale = 1, seed = 7) {
  const { w, h } = img;
  const n = w * h;
  if (p.surfaceType === 'none' && p.impasto <= 0) return img;

  const tex =
    p.surfaceType === 'none'
      ? new Float32Array(n).fill(0.5)
      : makeTexture(w, h, p.surfaceType, Math.max(0.15, p.surfaceScale) * sizeScale, seed);

  // Tint modulation: the weave shows through the paint.
  if (p.surfaceType !== 'none' && p.surfaceStrength > 0) {
    const k = p.surfaceStrength * 0.55;
    for (let i = 0; i < n; i++) {
      const m = 1 + (tex[i] - 0.5) * k;
      img.r[i] = clamp(img.r[i] * m);
      img.g[i] = clamp(img.g[i] * m);
      img.b[i] = clamp(img.b[i] * m);
    }
  }

  const reliefAmount = p.impasto;
  const texRelief = p.surfaceType === 'none' ? 0 : p.surfaceStrength;
  if (reliefAmount <= 0 && texRelief <= 0) return img;

  const paint = lumaPlane(img);
  const soft = new Float32Array(n);
  gaussBlurPlane(paint, soft, w, h, Math.max(0.6, 1.1 * sizeScale), new Float32Array(n));

  const height = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    // The support contributes far less height than the paint itself; a weave
    // that embosses as hard as impasto swamps the picture.
    height[i] = soft[i] * reliefAmount + (tex[i] - 0.5) * texRelief * 0.55;
  }

  const a = (p.lightAngle * Math.PI) / 180;
  const lx = Math.cos(a);
  const ly = -Math.sin(a);
  const scale = 4.5 / Math.max(0.5, sizeScale);

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = y * w + x;
      const xm = x > 0 ? i - 1 : i;
      const xp = x < w - 1 ? i + 1 : i;
      const ym = y > 0 ? i - w : i;
      const yp = y < h - 1 ? i + w : i;
      const dx = (height[xp] - height[xm]) * scale;
      const dy = (height[yp] - height[ym]) * scale;
      // Normalised dot product with the light direction, centred on zero.
      const inv = 1 / Math.sqrt(dx * dx + dy * dy + 1);
      const shade = (dx * lx + dy * ly) * inv;
      const m = 1 + shade * 0.6;
      img.r[i] = clamp(img.r[i] * m);
      img.g[i] = clamp(img.g[i] * m);
      img.b[i] = clamp(img.b[i] * m);
    }
  }
  return img;
}

/** Procedural, seamless-enough support textures. */
function makeTexture(w, h, type, scale, seed) {
  const n = w * h;
  const out = new Float32Array(n);
  const rng = mulberry32(seed);
  const noise = valueNoise(w, h, scale, rng);
  // Rough board is pure mottling — a periodic term here reads as knitted wool.
  const coarse = type === 'rough' ? valueNoise(w, h, scale * 3.5, mulberry32(seed + 101)) : null;

  // Weave period in pixels. Anything under ~3px aliases into sandpaper noise
  // rather than reading as a woven support.
  const period = Math.max(3.2, 5.5 * scale);
  const freq = (Math.PI * 2) / period;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = y * w + x;
      const nz = noise[i];
      let v;
      switch (type) {
        case 'canvas': {
          const a = Math.sin(x * freq) * 0.5 + 0.5;
          const b = Math.sin(y * freq) * 0.5 + 0.5;
          const weave = a * b + (1 - a) * (1 - b);
          v = weave * 0.55 + nz * 0.45;
          break;
        }
        case 'linen': {
          const a = Math.sin(x * freq * 0.8 + nz * 3) * 0.5 + 0.5;
          const b = Math.sin(y * freq * 1.9) * 0.5 + 0.5;
          v = a * 0.45 + b * 0.2 + nz * 0.35;
          break;
        }
        case 'rough':
          v = nz * 0.42 + coarse[i] * 0.58;
          break;
        case 'paper':
        default:
          v = nz;
          break;
      }
      out[i] = clamp(v);
    }
  }
  return out;
}

/** Multi-octave value noise built by upsampling small random lattices. */
function valueNoise(w, h, scale, rng) {
  const n = w * h;
  const out = new Float32Array(n);
  let amp = 0.5;
  let total = 0;
  const MIN_CELL = 3.5;
  for (let octave = 0; octave < 4; octave++) {
    const raw = (9 * scale) / Math.pow(2, octave);
    // Stop before the lattice gets so fine that it degenerates into per-pixel
    // static — that reads as digital noise, not paper tooth.
    if (raw < MIN_CELL && octave > 0) break;
    const cell = Math.max(MIN_CELL, raw);
    const gw = Math.max(2, Math.ceil(w / cell) + 1);
    const gh = Math.max(2, Math.ceil(h / cell) + 1);
    const grid = new Float32Array(gw * gh);
    for (let i = 0; i < grid.length; i++) grid[i] = rng();

    for (let y = 0; y < h; y++) {
      const gy = y / cell;
      const y0 = Math.min(gh - 1, gy | 0);
      const y1 = Math.min(gh - 1, y0 + 1);
      const fy = smooth(gy - y0);
      for (let x = 0; x < w; x++) {
        const gx = x / cell;
        const x0 = Math.min(gw - 1, gx | 0);
        const x1 = Math.min(gw - 1, x0 + 1);
        const fx = smooth(gx - x0);
        const a = grid[y0 * gw + x0];
        const b = grid[y0 * gw + x1];
        const c = grid[y1 * gw + x0];
        const d = grid[y1 * gw + x1];
        const v = (a + (b - a) * fx) * (1 - fy) + (c + (d - c) * fx) * fy;
        out[y * w + x] += v * amp;
      }
    }
    total += amp;
    amp *= 0.5;
  }
  const inv = 1 / total;
  for (let i = 0; i < n; i++) out[i] *= inv;
  return out;
}

const smooth = (t) => t * t * (3 - 2 * t);
