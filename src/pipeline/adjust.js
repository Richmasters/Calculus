import { createImg, lumaPlane } from './image.js';
import { gaussBlurPlane } from './filters.js';
import { clamp, smoothstep } from '../util/color.js';

/**
 * Photographic pre-pass. Everything here happens before abstraction, because
 * the painting stages key off colour and contrast: lifting shadows first, for
 * example, changes which regions the brush treats as a single flat mass.
 */
export function adjust(img, p) {
  const { w, h } = img;
  const n = w * h;
  const out = createImg(w, h);

  const gain = Math.pow(2, p.exposure * 2);
  const k = p.contrast >= 0 ? 1 / (1 - p.contrast * 0.85) : 1 + p.contrast * 0.85;
  const tempR = 1 + p.temperature * 0.22;
  const tempB = 1 - p.temperature * 0.22;
  const tintG = 1 + p.tint * 0.18;
  const tintRB = 1 - p.tint * 0.09;

  for (let i = 0; i < n; i++) {
    let r = img.r[i] * gain;
    let g = img.g[i] * gain;
    let b = img.b[i] * gain;

    r *= tempR * tintRB;
    g *= tintG;
    b *= tempB * tintRB;

    let l = 0.2126 * r + 0.7152 * g + 0.0722 * b;

    if (p.highlights !== 0) {
      const m = smoothstep(0.45, 1.05, l) * p.highlights * 0.75;
      r += (1 - r) * Math.max(0, m) + r * Math.min(0, m);
      g += (1 - g) * Math.max(0, m) + g * Math.min(0, m);
      b += (1 - b) * Math.max(0, m) + b * Math.min(0, m);
    }
    if (p.shadows !== 0) {
      const m = (1 - smoothstep(-0.05, 0.55, l)) * p.shadows * 0.75;
      r += (1 - r) * Math.max(0, m) + r * Math.min(0, m);
      g += (1 - g) * Math.max(0, m) + g * Math.min(0, m);
      b += (1 - b) * Math.max(0, m) + b * Math.min(0, m);
    }

    r = (r - 0.5) * k + 0.5;
    g = (g - 0.5) * k + 0.5;
    b = (b - 0.5) * k + 0.5;

    l = 0.2126 * r + 0.7152 * g + 0.0722 * b;

    if (p.saturation !== 0) {
      const s = 1 + p.saturation;
      r = l + (r - l) * s;
      g = l + (g - l) * s;
      b = l + (b - l) * s;
    }

    if (p.vibrance !== 0) {
      // Push muted colours harder than already-saturated ones.
      const mx = Math.max(r, g, b);
      const mn = Math.min(r, g, b);
      const sat = mx - mn;
      const s = 1 + p.vibrance * (1 - clamp(sat)) * 1.2;
      r = l + (r - l) * s;
      g = l + (g - l) * s;
      b = l + (b - l) * s;
    }

    out.r[i] = clamp(r);
    out.g[i] = clamp(g);
    out.b[i] = clamp(b);
  }

  if (p.clarity !== 0) applyClarity(out, p.clarity, p.sizeScale);
  return out;
}

/** Local-contrast (unsharp on a wide radius) applied in luminance only. */
function applyClarity(img, amount, sizeScale = 1) {
  const { w, h } = img;
  const n = w * h;
  const lum = lumaPlane(img);
  const blurred = new Float32Array(n);
  gaussBlurPlane(lum, blurred, w, h, Math.max(2, 8 * sizeScale), new Float32Array(n));
  for (let i = 0; i < n; i++) {
    const delta = (lum[i] - blurred[i]) * amount * 1.6;
    img.r[i] = clamp(img.r[i] + delta);
    img.g[i] = clamp(img.g[i] + delta);
    img.b[i] = clamp(img.b[i] + delta);
  }
}
