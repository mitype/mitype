const { createCanvas } = require('canvas');
const fs = require('fs');
const path = require('path');

function drawIcon(size) {
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext('2d');

  // Background
  ctx.fillStyle = '#f5f0e8';
  const radius = size * 0.18;
  ctx.beginPath();
  ctx.moveTo(radius, 0);
  ctx.lineTo(size - radius, 0);
  ctx.quadraticCurveTo(size, 0, size, radius);
  ctx.lineTo(size, size - radius);
  ctx.quadraticCurveTo(size, size, size - radius, size);
  ctx.lineTo(radius, size);
  ctx.quadraticCurveTo(0, size, 0, size - radius);
  ctx.lineTo(0, radius);
  ctx.quadraticCurveTo(0, 0, radius, 0);
  ctx.closePath();
  ctx.fill();

  const cx = size / 2;
  const cy = size / 2;
  const s = size / 200;

  // Left flame
  ctx.fillStyle = '#d4a882';
  ctx.globalAlpha = 0.85;
  ctx.beginPath();
  ctx.moveTo(cx - 25 * s, cy + 30 * s);
  ctx.bezierCurveTo(cx - 25 * s, cy + 30 * s, cx - 42 * s, cy + 17 * s, cx - 40 * s, cy - 9 * s);
  ctx.bezierCurveTo(cx - 38 * s, cy - 33 * s, cx - 30 * s, cy - 39 * s, cx - 30 * s, cy - 39 * s);
  ctx.bezierCurveTo(cx - 30 * s, cy - 39 * s, cx - 34 * s, cy - 25 * s, cx - 28 * s, cy - 19 * s);
  ctx.bezierCurveTo(cx - 28 * s, cy - 19 * s, cx - 32 * s, cy - 37 * s, cx - 20 * s, cy - 45 * s);
  ctx.bezierCurveTo(cx - 20 * s, cy - 45 * s, cx - 24 * s, cy - 29 * s, cx - 18 * s, cy - 21 * s);
  ctx.bezierCurveTo(cx - 12 * s, cy - 13 * s, cx - 10 * s, cy - 5 * s, cx - 12 * s, cy + 3 * s);
  ctx.bezierCurveTo(cx - 14 * s, cy + 11 * s, cx - 20 * s, cy + 17 * s, cx - 25 * s, cy + 20 * s);
  ctx.closePath();
  ctx.fill();

  // Right flame
  ctx.beginPath();
  ctx.moveTo(cx + 25 * s, cy + 30 * s);
  ctx.bezierCurveTo(cx + 25 * s, cy + 30 * s, cx + 42 * s, cy + 17 * s, cx + 40 * s, cy - 9 * s);
  ctx.bezierCurveTo(cx + 38 * s, cy - 33 * s, cx + 30 * s, cy - 39 * s, cx + 30 * s, cy - 39 * s);
  ctx.bezierCurveTo(cx + 30 * s, cy - 39 * s, cx + 34 * s, cy - 25 * s, cx + 28 * s, cy - 19 * s);
  ctx.bezierCurveTo(cx + 28 * s, cy - 19 * s, cx + 32 * s, cy - 37 * s, cx + 20 * s, cy - 45 * s);
  ctx.bezierCurveTo(cx + 20 * s, cy - 45 * s, cx + 24 * s, cy - 29 * s, cx + 18 * s, cy - 21 * s);
  ctx.bezierCurveTo(cx + 12 * s, cy - 13 * s, cx + 10 * s, cy - 5 * s, cx + 12 * s, cy + 3 * s);
  ctx.bezierCurveTo(cx + 14 * s, cy + 11 * s, cx + 20 * s, cy + 17 * s, cx + 25 * s, cy + 20 * s);
  ctx.closePath();
  ctx.fill();

  // Center main flame
  ctx.fillStyle = '#c8956c';
  ctx.globalAlpha = 1;
  ctx.beginPath();
  ctx.moveTo(cx, cy + 42 * s);
  ctx.bezierCurveTo(cx, cy + 42 * s, cx - 25 * s, cy + 25 * s, cx - 22 * s, cy - 1 * s);
  ctx.bezierCurveTo(cx - 19 * s, cy - 25 * s, cx - 5 * s, cy - 35 * s, cx - 5 * s, cy - 35 * s);
  ctx.bezierCurveTo(cx - 5 * s, cy - 35 * s, cx - 12 * s, cy - 13 * s, cx - 2 * s, cy - 3 * s);
  ctx.bezierCurveTo(cx - 2 * s, cy - 3 * s, cx - 10 * s, cy - 31 * s, cx + 12 * s, cy - 48 * s);
  ctx.bezierCurveTo(cx + 12 * s, cy - 48 * s, cx + 5 * s, cy - 23 * s, cx + 18 * s, cy - 11 * s);
  ctx.bezierCurveTo(cx + 18 * s, cy - 11 * s, cx + 22 * s, cy - 33 * s, cx + 38 * s, cy - 41 * s);
  ctx.bezierCurveTo(cx + 38 * s, cy - 41 * s, cx + 28 * s, cy - 17 * s, cx + 36 * s, cy - 1 * s);
  ctx.bezierCurveTo(cx + 44 * s, cy + 15 * s, cx + 48 * s, cy + 25 * s, cx + 44 * s, cy + 35 * s);
  ctx.bezierCurveTo(cx + 40 * s, cy + 45 * s, cx + 24 * s, cy + 52 * s, cx, cy + 55 * s);
  ctx.closePath();
  ctx.fill();

  // Inner glow
  ctx.fillStyle = '#f0d0a8';
  ctx.globalAlpha = 0.7;
  ctx.beginPath();
  ctx.moveTo(cx, cy + 32 * s);
  ctx.bezierCurveTo(cx, cy + 32 * s, cx - 16 * s, cy + 20 * s, cx - 14 * s, cy + 2 * s);
  ctx.bezierCurveTo(cx - 12 * s, cy - 12 * s, cx - 4 * s, cy - 18 * s, cx - 4 * s, cy - 18 * s);
  ctx.bezierCurveTo(cx - 4 * s, cy - 18 * s, cx - 8 * s, cy - 4 * s, cx - 1 * s, cy + 2 * s);
  ctx.bezierCurveTo(cx - 1 * s, cy + 2 * s, cx + 2 * s, cy - 12 * s, cx + 10 * s, cy - 18 * s);
  ctx.bezierCurveTo(cx + 10 * s, cy - 18 * s, cx + 6 * s, cy - 4 * s, cx + 12 * s, cy + 3 * s);
  ctx.bezierCurveTo(cx + 18 * s, cy + 10 * s, cx + 20 * s, cy + 17 * s, cx + 18 * s, cy + 26 * s);
  ctx.bezierCurveTo(cx + 16 * s, cy + 35 * s, cx + 8 * s, cy + 40 * s, cx, cy + 43 * s);
  ctx.closePath();
  ctx.fill();

  // mitype text
  ctx.globalAlpha = 1;
  ctx.fillStyle = '#c8956c';
  ctx.font = `900 ${size * 0.14}px Georgia, serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('mitype', cx, cy + size * 0.32);

  return canvas;
}

// Generate 192x192
const canvas192 = drawIcon(192);
fs.writeFileSync(
  path.join(__dirname, 'public', 'icon-192.png'),
  canvas192.toBuffer('image/png')
);
console.log('Created icon-192.png');

// Generate 512x512
const canvas512 = drawIcon(512);
fs.writeFileSync(
  path.join(__dirname, 'public', 'icon-512.png'),
  canvas512.toBuffer('image/png')
);
console.log('Created icon-512.png');

console.log('Icons generated successfully!');