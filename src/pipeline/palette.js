import { createImg } from './image.js';
import { clamp, rgbToHsl, hslToRgb } from '../util/color.js';
import { mulberry32 } from '../util/rng.js';

/** Rotate every hue by `degrees`, leaving luminance and saturation alone. */
export function hueShift(img, degrees) {
  if (!degrees) return img;
  const shift = degrees / 360;
  const n = img.w * img.h;
  for (let i = 0; i < n; i++) {
    const [h, s, l] = rgbToHsl(img.r[i], img.g[i], img.b[i]);
    if (s < 0.01) continue;
    const [r, g, b] = hslToRgb((h + shift + 1) % 1, s, l);
    img.r[i] = r;
    img.g[i] = g;
    img.b[i] = b;
  }
  return img;
}

/** Flatten tonal steps per channel — the classic poster / gouache banding. */
export function posterize(img, amount) {
  if (amount <= 0) return img;
  const levels = Math.max(2, Math.round(28 - amount * 25));
  const step = 1 / (levels - 1);
  const n = img.w * img.h;
  for (let i = 0; i < n; i++) {
    img.r[i] = Math.round(img.r[i] / step) * step;
    img.g[i] = Math.round(img.g[i] / step) * step;
    img.b[i] = Math.round(img.b[i] / step) * step;
  }
  return img;
}

/**
 * Reduce the picture to a limited mixed palette, the way a painter works from
 * a handful of tubes. k-means over a random subsample, then nearest-colour
 * mapping blended back by `strength`.
 */
export function limitPalette(img, k, strength, seed = 1) {
  if (k < 2 || strength <= 0) return img;
  const n = img.w * img.h;
  const rng = mulberry32(seed);
  const sampleCount = Math.min(n, 16000);
  const stride = Math.max(1, Math.floor(n / sampleCount));

  const samples = [];
  for (let i = 0; i < n; i += stride) samples.push(i);

  // k-means++ style seeding keeps the palette from collapsing onto one hue.
  const cents = [];
  cents.push(pick(img, samples[Math.floor(rng() * samples.length)]));
  while (cents.length < k) {
    let best = null;
    let bestD = -1;
    for (let t = 0; t < 24; t++) {
      const idx = samples[Math.floor(rng() * samples.length)];
      const c = pick(img, idx);
      let d = Infinity;
      for (const ce of cents) d = Math.min(d, dist2(c, ce));
      if (d > bestD) { bestD = d; best = c; }
    }
    cents.push(best);
  }

  const sumR = new Float64Array(k);
  const sumG = new Float64Array(k);
  const sumB = new Float64Array(k);
  const count = new Float64Array(k);

  for (let iter = 0; iter < 10; iter++) {
    sumR.fill(0); sumG.fill(0); sumB.fill(0); count.fill(0);
    for (const idx of samples) {
      const c = pick(img, idx);
      let bi = 0;
      let bd = Infinity;
      for (let j = 0; j < k; j++) {
        const d = dist2(c, cents[j]);
        if (d < bd) { bd = d; bi = j; }
      }
      sumR[bi] += c[0]; sumG[bi] += c[1]; sumB[bi] += c[2]; count[bi]++;
    }
    for (let j = 0; j < k; j++) {
      if (count[j] > 0) {
        cents[j] = [sumR[j] / count[j], sumG[j] / count[j], sumB[j] / count[j]];
      }
    }
  }

  for (let i = 0; i < n; i++) {
    const r = img.r[i], g = img.g[i], b = img.b[i];
    let bi = 0;
    let bd = Infinity;
    for (let j = 0; j < k; j++) {
      const c = cents[j];
      const dr = r - c[0], dg = g - c[1], db = b - c[2];
      const d = dr * dr + dg * dg + db * db;
      if (d < bd) { bd = d; bi = j; }
    }
    const c = cents[bi];
    img.r[i] = clamp(r + (c[0] - r) * strength);
    img.g[i] = clamp(g + (c[1] - g) * strength);
    img.b[i] = clamp(b + (c[2] - b) * strength);
  }
  return img;
}

function pick(img, i) {
  return [img.r[i], img.g[i], img.b[i]];
}
function dist2(a, b) {
  const dr = a[0] - b[0], dg = a[1] - b[1], db = a[2] - b[2];
  return dr * dr + dg * dg + db * db;
}

/** Blend two planar images: a*(1-t) + b*t. */
export function mixImg(a, b, t) {
  if (t <= 0) return a;
  if (t >= 1) return b;
  const out = createImg(a.w, a.h);
  const n = a.w * a.h;
  for (let i = 0; i < n; i++) {
    out.r[i] = a.r[i] + (b.r[i] - a.r[i]) * t;
    out.g[i] = a.g[i] + (b.g[i] - a.g[i]) * t;
    out.b[i] = a.b[i] + (b.b[i] - a.b[i]) * t;
  }
  return out;
}
