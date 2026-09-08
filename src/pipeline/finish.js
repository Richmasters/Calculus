import { lumaPlane } from './image.js';
import { gaussBlurPlane } from './filters.js';
import { clamp, smoothstep } from '../util/color.js';
import { mulberry32 } from '../util/rng.js';

/** Varnish pass: glow, vignette, canvas grain and a final grade. */
export function applyFinish(img, p, sizeScale = 1, seed = 11) {
  const { w, h } = img;
  const n = w * h;

  if (p.bloom > 0) {
    const lum = lumaPlane(img);
    const mask = new Float32Array(n);
    for (let i = 0; i < n; i++) mask[i] = smoothstep(0.55, 0.95, lum[i]);
    const glow = new Float32Array(n);
    gaussBlurPlane(mask, glow, w, h, Math.max(3, 12 * sizeScale), new Float32Array(n));
    const k = p.bloom * 0.65;
    for (let i = 0; i < n; i++) {
      const gl = glow[i] * k;
      img.r[i] = img.r[i] + (1 - img.r[i]) * gl;
      img.g[i] = img.g[i] + (1 - img.g[i]) * gl;
      img.b[i] = img.b[i] + (1 - img.b[i]) * gl;
    }
  }

  const cx = w / 2;
  const cy = h / 2;
  const maxD = Math.hypot(cx, cy);
  const rng = mulberry32(seed);
  const contrastK = p.finalContrast >= 0 ? 1 / (1 - p.finalContrast * 0.8) : 1 + p.finalContrast * 0.8;
  const warmR = 1 + p.warmth * 0.14;
  const warmB = 1 - p.warmth * 0.14;

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = y * w + x;
      let r = img.r[i], g = img.g[i], b = img.b[i];

      if (p.vignette !== 0) {
        const d = Math.hypot(x - cx, y - cy) / maxD;
        const v = 1 - p.vignette * smoothstep(0.45, 1.05, d);
        r *= v; g *= v; b *= v;
      }

      r = (r - 0.5) * contrastK + 0.5;
      g = (g - 0.5) * contrastK + 0.5;
      b = (b - 0.5) * contrastK + 0.5;

      r *= warmR;
      b *= warmB;

      if (p.grain > 0) {
        const nz = (rng() - 0.5) * p.grain * 0.22;
        r += nz; g += nz; b += nz;
      }

      img.r[i] = clamp(r);
      img.g[i] = clamp(g);
      img.b[i] = clamp(b);
    }
  }
  return img;
}
