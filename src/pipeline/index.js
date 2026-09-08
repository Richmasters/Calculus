import { adjust } from './adjust.js';
import { kuwahara, structureTensor, blurImg } from './filters.js';
import { hueShift, posterize, limitPalette, mixImg } from './palette.js';
import { paintStrokes } from './strokes.js';
import { applyInk } from './ink.js';
import { applySurface } from './surface.js';
import { applyFinish } from './finish.js';
import { cloneImg, lumaPlane, toImageData } from './image.js';
import { canvasToImg, createCanvas, resizeToCanvas } from '../util/canvas.js';
import { stageKey } from '../params.js';
import { mulberry32 } from '../util/rng.js';
import { clamp } from '../util/color.js';

/** Reference long edge that all size-like parameters are authored against. */
const REFERENCE_LONG_EDGE = 1200;

const nextTick = () => new Promise((resolve) => setTimeout(resolve, 0));

export class AbortedError extends Error {
  constructor() {
    super('render aborted');
    this.name = 'AbortedError';
  }
}

/**
 * Runs the full photo → painting pipeline, caching each stage so that moving
 * a "Finish" slider does not repaint sixty thousand brush strokes.
 */
export class Painter {
  constructor() {
    this.cache = new Map();
  }

  invalidate() {
    this.cache.clear();
  }

  async render({ source, width, height, params, onProgress, token }) {
    const check = () => {
      if (token && token.cancelled) throw new AbortedError();
    };
    const progress = (label, value) => onProgress && onProgress(label, clamp(value));

    const sizeScale = Math.max(width, height) / REFERENCE_LONG_EDGE;
    const p = { ...params, sizeScale };
    const baseKey = `${source.key}@${width}x${height}`;

    // ---- Source ------------------------------------------------------
    progress('Reading image', 0.02);
    const scaled = this.memo('source', baseKey, () =>
      canvasToImg(resizeToCanvas(source.bitmap, width, height))
    );
    check();

    // ---- Photographic grade -----------------------------------------
    progress('Grading', 0.08);
    const adjusted = this.memo('adjust', `${baseKey}|${stageKey(p, 'adjust')}`,
      () => adjust(scaled, p));
    await nextTick();
    check();

    // ---- Abstraction + colour ---------------------------------------
    progress('Simplifying into masses', 0.18);
    const abstractKey = `${baseKey}|${stageKey(p, 'adjust')}|${stageKey(p, 'abstract')}`;
    let abstracted = this.read('abstract', abstractKey);
    if (!abstracted) {
      abstracted = cloneImg(adjusted);
      const radius = Math.max(0, Math.round(p.smoothRadius * sizeScale));
      if (radius >= 1) {
        for (let i = 0; i < p.smoothPasses; i++) {
          abstracted = kuwahara(abstracted, radius, p.smoothCrisp);
          progress('Simplifying into masses', 0.18 + (0.12 * (i + 1)) / p.smoothPasses);
          await nextTick();
          check();
        }
      }
      abstracted = mixImg(adjusted, abstracted, p.simplifyMix);

      if (p.detailReturn > 0) {
        const soft = blurImg(adjusted, Math.max(0.6, 1.4 * sizeScale));
        const n = abstracted.w * abstracted.h;
        const k = p.detailReturn * 1.1;
        for (let i = 0; i < n; i++) {
          abstracted.r[i] = clamp(abstracted.r[i] + (adjusted.r[i] - soft.r[i]) * k);
          abstracted.g[i] = clamp(abstracted.g[i] + (adjusted.g[i] - soft.g[i]) * k);
          abstracted.b[i] = clamp(abstracted.b[i] + (adjusted.b[i] - soft.b[i]) * k);
        }
      }

      hueShift(abstracted, p.hueRotate);
      posterize(abstracted, p.posterize);
      if (p.paletteSize >= 2) {
        progress('Mixing palette', 0.3);
        await nextTick();
        limitPalette(abstracted, Math.round(p.paletteSize), p.paletteStrength, p.seed);
      }
      this.write('abstract', abstractKey, abstracted);
    }
    check();

    // ---- Flow field --------------------------------------------------
    progress('Reading the forms', 0.36);
    const flow = this.memo('flow', abstractKey, () =>
      structureTensor(lumaPlane(abstracted), abstracted.w, abstracted.h,
        Math.max(1.5, 3 * sizeScale))
    );
    await nextTick();
    check();

    // ---- Brushwork ---------------------------------------------------
    const paintKey = `${abstractKey}|${stageKey(p, 'paint')}`;
    let paintedCanvas = this.read('paint', paintKey);
    if (!paintedCanvas) {
      paintedCanvas = createCanvas(width, height);
      // Deliberately *not* willReadFrequently: this canvas takes tens of
      // thousands of fills and only a handful of readbacks, so keeping it on
      // the GPU path is the better trade.
      const ctx = paintedCanvas.getContext('2d');
      await paintStrokes(ctx, abstracted, flow, p, {
        rng: mulberry32(p.seed * 2654435761 + 17),
        sizeScale,
        yieldTo: async (frac) => {
          progress('Painting', 0.4 + frac * 0.45);
          await nextTick();
          check();
        }
      });
      this.write('paint', paintKey, paintedCanvas);
    }
    check();

    // ---- Post: line work, surface, varnish ---------------------------
    progress('Drawing the line work', 0.88);
    const out = canvasToImg(paintedCanvas);
    applyInk(out, abstracted, p, sizeScale);
    await nextTick();
    check();

    progress('Texturing the surface', 0.93);
    applySurface(out, p, sizeScale, p.seed + 3);
    await nextTick();
    check();

    progress('Varnishing', 0.97);
    applyFinish(out, p, sizeScale, p.seed + 5);

    const final = createCanvas(width, height);
    const fctx = final.getContext('2d', { willReadFrequently: true });
    fctx.putImageData(toImageData(out), 0, 0);

    if (p.borderWidth > 0) {
      const bw = Math.max(1, Math.round(p.borderWidth * sizeScale));
      fctx.strokeStyle = p.borderColor;
      fctx.lineWidth = bw;
      fctx.strokeRect(bw / 2, bw / 2, width - bw, height - bw);
    }

    progress('Done', 1);
    return { canvas: final, abstracted, source: scaled };
  }

  /**
   * One slot per stage rather than a growing map. Only the most recent value
   * of a stage can ever be reused, and each entry is a full-resolution image,
   * so an unbounded cache would quietly cost hundreds of megabytes.
   */
  read(stage, key) {
    const slot = this.cache.get(stage);
    return slot && slot.key === key ? slot.value : null;
  }

  write(stage, key, value) {
    this.cache.set(stage, { key, value });
    return value;
  }

  memo(stage, key, produce) {
    const hit = this.read(stage, key);
    return hit !== null ? hit : this.write(stage, key, produce());
  }
}
