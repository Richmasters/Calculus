import { fromImageData, toImageData } from '../pipeline/image.js';

export function createCanvas(w, h) {
  const c = document.createElement('canvas');
  c.width = Math.max(1, Math.round(w));
  c.height = Math.max(1, Math.round(h));
  return c;
}

export function imgToCanvas(img) {
  const c = createCanvas(img.w, img.h);
  const ctx = c.getContext('2d', { willReadFrequently: true });
  ctx.putImageData(toImageData(img), 0, 0);
  return c;
}

export function canvasToImg(canvas) {
  // getContext returns the existing context; the attributes are only honoured
  // on first acquisition, which is why callers that need fast readback create
  // the canvas with willReadFrequently themselves.
  const ctx = canvas.getContext('2d');
  return fromImageData(ctx.getImageData(0, 0, canvas.width, canvas.height));
}

/** Draw a source image/canvas scaled into a fresh canvas of the given size. */
export function resizeToCanvas(source, w, h) {
  const c = createCanvas(w, h);
  const ctx = c.getContext('2d', { willReadFrequently: true });
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(source, 0, 0, w, h);
  return c;
}
