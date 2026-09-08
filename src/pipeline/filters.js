import { createImg } from './image.js';

/**
 * Separable moving-sum box blur on a single plane. O(n) regardless of radius,
 * with clamp-to-edge borders. `tmp` may be supplied to avoid re-allocating.
 */
export function boxBlurPlane(src, dst, w, h, radius, tmp) {
  if (radius < 1) {
    if (dst !== src) dst.set(src);
    return dst;
  }
  const mid = tmp || new Float32Array(w * h);
  const win = radius * 2 + 1;
  const inv = 1 / win;

  // Horizontal pass
  for (let y = 0; y < h; y++) {
    const row = y * w;
    let sum = src[row] * (radius + 1);
    for (let x = 1; x <= radius; x++) sum += src[row + Math.min(x, w - 1)];
    for (let x = 0; x < w; x++) {
      mid[row + x] = sum * inv;
      const add = src[row + Math.min(x + radius + 1, w - 1)];
      const sub = src[row + Math.max(x - radius, 0)];
      sum += add - sub;
    }
  }

  // Vertical pass
  for (let x = 0; x < w; x++) {
    let sum = mid[x] * (radius + 1);
    for (let y = 1; y <= radius; y++) sum += mid[Math.min(y, h - 1) * w + x];
    for (let y = 0; y < h; y++) {
      dst[y * w + x] = sum * inv;
      const add = mid[Math.min(y + radius + 1, h - 1) * w + x];
      const sub = mid[Math.max(y - radius, 0) * w + x];
      sum += add - sub;
    }
  }
  return dst;
}

/** Three box passes approximate a Gaussian closely enough for our purposes. */
export function gaussBlurPlane(src, dst, w, h, sigma, tmp) {
  if (sigma <= 0.3) {
    if (dst !== src) dst.set(src);
    return dst;
  }
  const r = Math.max(1, Math.round(sigma * 1.5));
  const scratch = tmp || new Float32Array(w * h);
  const a = new Float32Array(w * h);
  boxBlurPlane(src, a, w, h, r, scratch);
  boxBlurPlane(a, dst, w, h, r, scratch);
  boxBlurPlane(dst, a, w, h, r, scratch);
  dst.set(a);
  return dst;
}

export function blurImg(img, sigma) {
  const out = createImg(img.w, img.h);
  const tmp = new Float32Array(img.w * img.h);
  gaussBlurPlane(img.r, out.r, img.w, img.h, sigma, tmp);
  gaussBlurPlane(img.g, out.g, img.w, img.h, sigma, tmp);
  gaussBlurPlane(img.b, out.b, img.w, img.h, sigma, tmp);
  return out;
}

/** Sobel gradients of a plane. Returns { gx, gy, mag }. */
export function sobel(plane, w, h) {
  const gx = new Float32Array(w * h);
  const gy = new Float32Array(w * h);
  const mag = new Float32Array(w * h);
  const at = (x, y) =>
    plane[Math.min(h - 1, Math.max(0, y)) * w + Math.min(w - 1, Math.max(0, x))];
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const tl = at(x - 1, y - 1), t = at(x, y - 1), tr = at(x + 1, y - 1);
      const l = at(x - 1, y), r = at(x + 1, y);
      const bl = at(x - 1, y + 1), bo = at(x, y + 1), br = at(x + 1, y + 1);
      const dx = tr + 2 * r + br - tl - 2 * l - bl;
      const dy = bl + 2 * bo + br - tl - 2 * t - tr;
      const i = y * w + x;
      gx[i] = dx;
      gy[i] = dy;
      mag[i] = Math.hypot(dx, dy);
    }
  }
  return { gx, gy, mag };
}

/**
 * Smoothed structure tensor → a per-pixel brush-flow field.
 *
 * The minor eigenvector of the tensor points along edges rather than across
 * them, which is exactly the direction a painter drags a brush. `anisotropy`
 * says how strongly oriented the neighbourhood is (flat areas ≈ 0), letting
 * the stroke renderer fall back to a fixed angle where there is no structure.
 */
export function structureTensor(plane, w, h, sigma = 3) {
  const { gx, gy } = sobel(plane, w, h);
  const n = w * h;
  const E = new Float32Array(n);
  const F = new Float32Array(n);
  const G = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    E[i] = gx[i] * gx[i];
    F[i] = gx[i] * gy[i];
    G[i] = gy[i] * gy[i];
  }
  const tmp = new Float32Array(n);
  gaussBlurPlane(E, E, w, h, sigma, tmp);
  gaussBlurPlane(F, F, w, h, sigma, tmp);
  gaussBlurPlane(G, G, w, h, sigma, tmp);

  const angle = new Float32Array(n);
  const anisotropy = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const e = E[i], f = F[i], g = G[i];
    const disc = Math.sqrt(Math.max(0, (e - g) * (e - g) + 4 * f * f));
    const l1 = 0.5 * (e + g + disc);
    const l2 = 0.5 * (e + g - disc);
    // Gradient direction, rotated a quarter turn to run along the edge.
    angle[i] = 0.5 * Math.atan2(2 * f, e - g) + Math.PI / 2;
    const sum = l1 + l2;
    anisotropy[i] = sum > 1e-8 ? (l1 - l2) / sum : 0;
  }
  return { angle, anisotropy };
}

/**
 * Generalised Kuwahara filter — the workhorse behind the "painted" look.
 *
 * Each pixel looks at four overlapping quadrants and favours the flattest one,
 * which flattens interiors into poster-like regions while leaving edges crisp
 * (a plain blur would smear them). All four quadrant statistics come from a
 * single box-mean pass sampled at four offsets, so cost is independent of
 * radius. `sharpness` controls how hard the winner-takes-all weighting is.
 */
export function kuwahara(img, radius, sharpness = 8) {
  const { w, h } = img;
  const n = w * h;
  if (radius < 1) return img;

  const tmp = new Float32Array(n);
  const mR = new Float32Array(n);
  const mG = new Float32Array(n);
  const mB = new Float32Array(n);
  const mL = new Float32Array(n);
  const mL2 = new Float32Array(n);

  const lum = new Float32Array(n);
  const lum2 = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const l = 0.2126 * img.r[i] + 0.7152 * img.g[i] + 0.0722 * img.b[i];
    lum[i] = l;
    lum2[i] = l * l;
  }

  boxBlurPlane(img.r, mR, w, h, radius, tmp);
  boxBlurPlane(img.g, mG, w, h, radius, tmp);
  boxBlurPlane(img.b, mB, w, h, radius, tmp);
  boxBlurPlane(lum, mL, w, h, radius, tmp);
  boxBlurPlane(lum2, mL2, w, h, radius, tmp);

  const out = createImg(w, h);
  const ox = [-radius, radius, -radius, radius];
  const oy = [-radius, -radius, radius, radius];

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let wsum = 0, ar = 0, ag = 0, ab = 0;
      for (let q = 0; q < 4; q++) {
        const sx = Math.min(w - 1, Math.max(0, x + ox[q]));
        const sy = Math.min(h - 1, Math.max(0, y + oy[q]));
        const j = sy * w + sx;
        const mean = mL[j];
        const variance = Math.max(0, mL2[j] - mean * mean);
        const weight = 1 / (1 + Math.pow(variance * 256, sharpness * 0.5));
        wsum += weight;
        ar += mR[j] * weight;
        ag += mG[j] * weight;
        ab += mB[j] * weight;
      }
      const i = y * w + x;
      const inv = wsum > 1e-9 ? 1 / wsum : 0;
      out.r[i] = ar * inv;
      out.g[i] = ag * inv;
      out.b[i] = ab * inv;
    }
  }
  return out;
}
