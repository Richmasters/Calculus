import { lumaPlane } from './image.js';
import { gaussBlurPlane, sobel } from './filters.js';
import { clamp, smoothstep, hexToRgb } from '../util/color.js';

/**
 * Line work and pigment edges.
 *
 * Both effects read their edges from the *abstracted* image rather than the
 * painted canvas — brush texture would otherwise be mistaken for contour and
 * the outlines would come out as scribble.
 */
export function applyInk(img, edgeSource, p, sizeScale = 1) {
  const { w, h } = img;
  const n = w * h;

  if (p.inkStrength > 0) {
    const sigma = Math.max(0.6, p.inkWidth * sizeScale * 0.9);
    const edge = edgeMap(edgeSource, sigma, p.inkThreshold, p.inkSoftness);
    const ink = hexToRgb(p.inkColor);
    for (let i = 0; i < n; i++) {
      const a = edge[i] * p.inkStrength;
      if (a <= 0.002) continue;
      img.r[i] = img.r[i] * (1 - a) + ink.r * a;
      img.g[i] = img.g[i] * (1 - a) + ink.g * a;
      img.b[i] = img.b[i] * (1 - a) + ink.b * a;
    }
  }

  if (p.edgeDarkening > 0) {
    // Watercolour settles darker where a wash dries against a boundary.
    const sigma = Math.max(0.8, 1.6 * sizeScale);
    const edge = edgeMap(edgeSource, sigma, p.inkThreshold * 0.55, 0.7);
    for (let i = 0; i < n; i++) {
      const a = edge[i] * p.edgeDarkening * 0.75;
      if (a <= 0.002) continue;
      const k = 1 - a * 0.55;
      img.r[i] = clamp(img.r[i] * k);
      img.g[i] = clamp(img.g[i] * k);
      img.b[i] = clamp(img.b[i] * k);
    }
  }
  return img;
}

function edgeMap(src, sigma, threshold, softness) {
  const { w, h } = src;
  const n = w * h;
  const lum = lumaPlane(src);
  const smooth = new Float32Array(n);
  gaussBlurPlane(lum, smooth, w, h, sigma, new Float32Array(n));
  const { mag } = sobel(smooth, w, h);

  const lo = 0.06 + threshold * 0.85;
  const hi = lo + 0.02 + softness * 0.8;
  const out = new Float32Array(n);
  for (let i = 0; i < n; i++) out[i] = smoothstep(lo, hi, mag[i]);
  return out;
}
