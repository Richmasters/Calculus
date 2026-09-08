/**
 * Pan/zoom canvas viewer with a draggable before/after split.
 * Keeps its own transform so re-rendering the painting never loses the view.
 */
export class Viewer {
  constructor(canvas, viewport, { onZoom } = {}) {
    this.canvas = canvas;
    this.viewport = viewport;
    this.ctx = canvas.getContext('2d');
    this.onZoom = onZoom;
    this.painted = null;
    this.original = null;
    this.scale = 1;
    this.tx = 0;
    this.ty = 0;
    this.compare = false;
    this.split = 0.5;
    this.holdOriginal = false;
    this.dragging = false;

    this.bindEvents();
    this.observer = new ResizeObserver(() => this.resize());
    this.observer.observe(viewport);
    this.resize();
  }

  bindEvents() {
    const vp = this.viewport;

    vp.addEventListener('wheel', (e) => {
      if (!this.painted) return;
      e.preventDefault();
      const rect = vp.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;
      const factor = Math.exp(-e.deltaY * 0.0016);
      this.zoomAt(mx, my, this.scale * factor);
    }, { passive: false });

    vp.addEventListener('pointerdown', (e) => {
      if (!this.painted) return;
      if (this.compare && e.shiftKey === false && this.nearSplit(e)) {
        this.draggingSplit = true;
      } else {
        this.dragging = true;
      }
      vp.setPointerCapture(e.pointerId);
      vp.classList.add('grabbing');
      this.lastX = e.clientX;
      this.lastY = e.clientY;
    });

    vp.addEventListener('pointermove', (e) => {
      if (this.draggingSplit) {
        const rect = vp.getBoundingClientRect();
        this.split = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width));
        this.draw();
        return;
      }
      if (!this.dragging) return;
      this.tx += e.clientX - this.lastX;
      this.ty += e.clientY - this.lastY;
      this.lastX = e.clientX;
      this.lastY = e.clientY;
      this.draw();
    });

    const end = (e) => {
      this.dragging = false;
      this.draggingSplit = false;
      vp.classList.remove('grabbing');
      if (e.pointerId !== undefined && vp.hasPointerCapture?.(e.pointerId)) {
        vp.releasePointerCapture(e.pointerId);
      }
    };
    vp.addEventListener('pointerup', end);
    vp.addEventListener('pointercancel', end);
    vp.addEventListener('dblclick', () => this.fit());
  }

  nearSplit(e) {
    const rect = this.viewport.getBoundingClientRect();
    return Math.abs(e.clientX - rect.left - this.split * rect.width) < 24;
  }

  resize() {
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const rect = this.viewport.getBoundingClientRect();
    this.canvas.width = Math.max(1, Math.round(rect.width * dpr));
    this.canvas.height = Math.max(1, Math.round(rect.height * dpr));
    this.dpr = dpr;
    this.draw();
  }

  setImages(painted, original) {
    const first = !this.painted;
    this.painted = painted;
    this.original = original;
    if (first) this.fit();
    else this.draw();
  }

  clear() {
    this.painted = null;
    this.original = null;
    this.draw();
  }

  fit() {
    if (!this.painted) return;
    const rect = this.viewport.getBoundingClientRect();
    const pad = 28;
    const s = Math.min(
      (rect.width - pad) / this.painted.width,
      (rect.height - pad) / this.painted.height
    );
    this.scale = Math.max(0.02, s);
    this.tx = (rect.width - this.painted.width * this.scale) / 2;
    this.ty = (rect.height - this.painted.height * this.scale) / 2;
    this.emitZoom();
    this.draw();
  }

  zoomTo(scale) {
    const rect = this.viewport.getBoundingClientRect();
    this.zoomAt(rect.width / 2, rect.height / 2, scale);
  }

  zoomAt(mx, my, scale) {
    const next = Math.min(12, Math.max(0.02, scale));
    const k = next / this.scale;
    this.tx = mx - (mx - this.tx) * k;
    this.ty = my - (my - this.ty) * k;
    this.scale = next;
    this.emitZoom();
    this.draw();
  }

  emitZoom() {
    this.onZoom?.(this.scale);
  }

  setCompare(on) {
    this.compare = on;
    this.draw();
  }

  setHoldOriginal(on) {
    this.holdOriginal = on;
    this.draw();
  }

  draw() {
    const { ctx, canvas } = this;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (!this.painted) return;

    const dpr = this.dpr || 1;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.imageSmoothingEnabled = this.scale < 4;
    ctx.imageSmoothingQuality = 'high';

    const w = this.painted.width * this.scale;
    const h = this.painted.height * this.scale;

    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,.55)';
    ctx.shadowBlur = 26;
    ctx.shadowOffsetY = 8;
    ctx.fillStyle = '#000';
    ctx.fillRect(this.tx, this.ty, w, h);
    ctx.restore();

    const showOriginal = this.holdOriginal && this.original;
    ctx.drawImage(showOriginal ? this.original : this.painted, this.tx, this.ty, w, h);

    if (this.compare && this.original && !showOriginal) {
      const vw = canvas.width / dpr;
      const splitX = this.split * vw;
      ctx.save();
      ctx.beginPath();
      ctx.rect(0, 0, splitX, canvas.height / dpr);
      ctx.clip();
      ctx.drawImage(this.original, this.tx, this.ty, w, h);
      ctx.restore();

      ctx.save();
      ctx.strokeStyle = 'rgba(224,134,74,.95)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(splitX, 0);
      ctx.lineTo(splitX, canvas.height / dpr);
      ctx.stroke();
      ctx.fillStyle = 'rgba(224,134,74,.95)';
      ctx.beginPath();
      ctx.arc(splitX, canvas.height / dpr / 2, 9, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#1a1006';
      ctx.font = '600 10px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('↔', splitX, canvas.height / dpr / 2);
      ctx.restore();
    }
  }
}
