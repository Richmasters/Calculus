/**
 * Planar float image. Working in separate Float32 planes (0..1) keeps every
 * filter below free of byte clamping and channel-interleaving arithmetic.
 */
export function createImg(w, h) {
  return {
    w,
    h,
    r: new Float32Array(w * h),
    g: new Float32Array(w * h),
    b: new Float32Array(w * h)
  };
}

export function fromImageData(id) {
  const { width: w, height: h, data } = id;
  const img = createImg(w, h);
  for (let i = 0, p = 0; i < w * h; i++, p += 4) {
    img.r[i] = data[p] / 255;
    img.g[i] = data[p + 1] / 255;
    img.b[i] = data[p + 2] / 255;
  }
  return img;
}

export function toImageData(img, target) {
  const id = target || new ImageData(img.w, img.h);
  const d = id.data;
  for (let i = 0, p = 0; i < img.w * img.h; i++, p += 4) {
    d[p] = Math.max(0, Math.min(255, img.r[i] * 255 + 0.5)) | 0;
    d[p + 1] = Math.max(0, Math.min(255, img.g[i] * 255 + 0.5)) | 0;
    d[p + 2] = Math.max(0, Math.min(255, img.b[i] * 255 + 0.5)) | 0;
    d[p + 3] = 255;
  }
  return id;
}

export function cloneImg(img) {
  return {
    w: img.w,
    h: img.h,
    r: img.r.slice(),
    g: img.g.slice(),
    b: img.b.slice()
  };
}

export function lumaPlane(img, out) {
  const n = img.w * img.h;
  const dst = out || new Float32Array(n);
  for (let i = 0; i < n; i++) {
    dst[i] = 0.2126 * img.r[i] + 0.7152 * img.g[i] + 0.0722 * img.b[i];
  }
  return dst;
}
