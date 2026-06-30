// Generates PNG icons from a canvas drawing (no external deps needed)
import { createCanvas } from 'canvas';
import fs from 'fs';
import path from 'path';

function drawIcon(ctx, size) {
  const r = size * 0.2;
  // Background
  ctx.fillStyle = '#6366f1';
  ctx.beginPath();
  ctx.roundRect(0, 0, size, size, r);
  ctx.fill();

  // Target circle
  ctx.strokeStyle = 'white';
  ctx.lineWidth = size * 0.055;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.arc(size * 0.5, size * 0.43, size * 0.16, 0, Math.PI * 2);
  ctx.stroke();

  // Arrow pointing up-right (goal)
  ctx.beginPath();
  ctx.moveTo(size * 0.5, size * 0.27);
  ctx.lineTo(size * 0.5, size * 0.16);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(size * 0.625, size * 0.31);
  ctx.lineTo(size * 0.7, size * 0.24);
  ctx.stroke();

  // Check/person shape at bottom
  ctx.fillStyle = 'white';
  ctx.beginPath();
  ctx.ellipse(size * 0.5, size * 0.72, size * 0.22, size * 0.14, 0, 0, Math.PI * 2);
  ctx.fill();

  // Checkmark
  ctx.strokeStyle = '#6366f1';
  ctx.lineWidth = size * 0.05;
  ctx.beginPath();
  ctx.moveTo(size * 0.4, size * 0.72);
  ctx.lineTo(size * 0.48, size * 0.81);
  ctx.lineTo(size * 0.62, size * 0.65);
  ctx.stroke();
}

async function main() {
  try {
    const { createCanvas } = await import('canvas');
    const outDir = path.join(process.cwd(), 'client/public');

    for (const size of [192, 512, 180]) {
      const canvas = createCanvas(size, size);
      const ctx = canvas.getContext('2d');
      drawIcon(ctx, size);
      const name = size === 180 ? 'apple-touch-icon.png' : `icon-${size}.png`;
      fs.writeFileSync(path.join(outDir, name), canvas.toBuffer('image/png'));
      console.log('wrote', name);
    }
  } catch (e) {
    console.error('canvas not available, will use placeholder icons');
    process.exit(1);
  }
}
main();
