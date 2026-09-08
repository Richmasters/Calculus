import { createCanvas } from './util/canvas.js';

/**
 * A procedurally drawn demo scene so the app is usable before the user has
 * picked a file. Deliberately built from broad colour masses plus fine
 * detail — the two things the painting pipeline treats differently.
 */
export function makeSampleImage(w = 1400, h = 933) {
  const c = createCanvas(w, h);
  const ctx = c.getContext('2d');

  // Sky
  const sky = ctx.createLinearGradient(0, 0, 0, h * 0.62);
  sky.addColorStop(0, '#2e5f9e');
  sky.addColorStop(0.45, '#7fa8cd');
  sky.addColorStop(0.8, '#e8b98a');
  sky.addColorStop(1, '#f3d3a4');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, w, h * 0.62);

  // Sun and its haze
  const sunX = w * 0.72;
  const sunY = h * 0.4;
  const halo = ctx.createRadialGradient(sunX, sunY, 4, sunX, sunY, h * 0.32);
  halo.addColorStop(0, 'rgba(255,240,200,.95)');
  halo.addColorStop(0.25, 'rgba(255,206,140,.45)');
  halo.addColorStop(1, 'rgba(255,206,140,0)');
  ctx.fillStyle = halo;
  ctx.fillRect(0, 0, w, h * 0.7);
  ctx.fillStyle = '#fff4d6';
  ctx.beginPath();
  ctx.arc(sunX, sunY, h * 0.045, 0, Math.PI * 2);
  ctx.fill();

  // Clouds
  ctx.fillStyle = 'rgba(255,255,255,.5)';
  for (let i = 0; i < 26; i++) {
    const cx = (i * 137.5) % w;
    const cy = h * (0.06 + ((i * 53) % 100) / 620);
    const r = h * (0.02 + ((i * 29) % 40) / 900);
    ctx.beginPath();
    ctx.ellipse(cx, cy, r * 2.6, r, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  // Distant hills, layered back to front
  const hills = [
    { y: 0.52, color: '#6e7f92' },
    { y: 0.57, color: '#4f6572' },
    { y: 0.62, color: '#3b5350' }
  ];
  for (const hill of hills) {
    ctx.fillStyle = hill.color;
    ctx.beginPath();
    ctx.moveTo(0, h);
    for (let x = 0; x <= w; x += 8) {
      const t = x / w;
      const y =
        h * hill.y -
        Math.sin(t * 6.1 + hill.y * 20) * h * 0.045 -
        Math.sin(t * 17 + hill.y * 8) * h * 0.014;
      ctx.lineTo(x, y);
    }
    ctx.lineTo(w, h);
    ctx.closePath();
    ctx.fill();
  }

  // Water
  const water = ctx.createLinearGradient(0, h * 0.62, 0, h);
  water.addColorStop(0, '#3d6b7a');
  water.addColorStop(1, '#16303f');
  ctx.fillStyle = water;
  ctx.fillRect(0, h * 0.62, w, h * 0.38);

  // Sun reflection, broken into ripples
  ctx.fillStyle = 'rgba(255,214,150,.5)';
  for (let y = h * 0.63; y < h; y += 6) {
    const t = (y - h * 0.63) / (h * 0.37);
    const width = h * 0.05 * (1 + t * 5);
    const wobble = Math.sin(y * 0.35) * width * 0.4;
    ctx.fillRect(sunX - width / 2 + wobble, y, width, 3);
  }

  // Foreground bank and reeds
  ctx.fillStyle = '#25381f';
  ctx.beginPath();
  ctx.moveTo(0, h);
  for (let x = 0; x <= w; x += 10) {
    ctx.lineTo(x, h * 0.9 - Math.sin(x / w * 9) * h * 0.03);
  }
  ctx.lineTo(w, h);
  ctx.closePath();
  ctx.fill();

  ctx.strokeStyle = '#4a6b32';
  ctx.lineWidth = 2;
  for (let i = 0; i < 220; i++) {
    const x = (i * 97.3) % w;
    const baseY = h * 0.94 - ((i * 41) % 60) * 0.4;
    const len = h * (0.05 + ((i * 17) % 50) / 900);
    ctx.beginPath();
    ctx.moveTo(x, baseY);
    ctx.quadraticCurveTo(x + 6, baseY - len * 0.6, x + ((i % 5) - 2) * 5, baseY - len);
    ctx.stroke();
  }

  // A lone tree for a strong silhouette edge
  ctx.fillStyle = '#1b2a19';
  ctx.beginPath();
  ctx.moveTo(w * 0.18, h * 0.93);
  ctx.lineTo(w * 0.2, h * 0.55);
  ctx.lineTo(w * 0.215, h * 0.55);
  ctx.lineTo(w * 0.225, h * 0.93);
  ctx.closePath();
  ctx.fill();
  for (let i = 0; i < 60; i++) {
    const a = (i / 60) * Math.PI * 2;
    const rr = h * (0.05 + ((i * 13) % 30) / 700);
    ctx.beginPath();
    ctx.ellipse(
      w * 0.207 + Math.cos(a) * h * 0.07,
      h * 0.5 + Math.sin(a) * h * 0.055,
      rr, rr * 0.8, 0, 0, Math.PI * 2
    );
    ctx.fill();
  }

  return c;
}
