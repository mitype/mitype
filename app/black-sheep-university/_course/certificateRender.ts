// Draws the Black Sheep University completion certificate onto a canvas.
// Runs entirely in the browser. Nothing is uploaded or stored anywhere.
//
// Three outputs, all using the same Classic Diploma design:
//   landscape: 2000 x 1414 (print and general sharing)
//   portrait:  1080 x 1350 (Instagram post)
//   story:     1080 x 1920 (Instagram and Facebook stories)

export type CertFormat = 'landscape' | 'portrait' | 'story';

export interface CertInput {
  format: CertFormat;
  username: string;
  courseTitle: string;
  completedAt: Date;
}

export const CERT_SIZES: Record<CertFormat, { w: number; h: number; label: string }> = {
  landscape: { w: 2000, h: 1414, label: 'Certificate' },
  portrait: { w: 1080, h: 1350, label: 'Instagram post' },
  story: { w: 1080, h: 1920, label: 'Story' },
};

const BRONZE = '#a07a4d';
const BRONZE_LIGHT = '#c8956c';
const PAPER = '#fbf6ec';
const INK = '#3b2a18';
const SOFT = '#6b5744';
const SANS = 'Arial, Helvetica, sans-serif';
const SERIF = 'Georgia, "Times New Roman", serif';

// Only the top part of the signature photo is used, so the pen tail ends
// right where it meets the signature line.
const SIG_CROP = 0.66;

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Could not load ${src}`));
    img.src = src;
  });
}

// Draws letter spaced text. Spacing is done by hand because canvas
// letterSpacing is not supported in every browser.
function spaced(
  ctx: CanvasRenderingContext2D,
  text: string,
  cx: number,
  y: number,
  spacing: number,
  align: 'center' | 'left' = 'center',
) {
  const chars = Array.from(text);
  const widths = chars.map((c) => ctx.measureText(c).width);
  const total = widths.reduce((a, b) => a + b, 0) + spacing * (chars.length - 1);
  let x = align === 'center' ? cx - total / 2 : cx;
  ctx.textAlign = 'left';
  chars.forEach((c, i) => {
    ctx.fillText(c, x, y);
    x += widths[i] + spacing;
  });
}

// Largest font size (between min and start) at which the text fits.
function fitSize(
  ctx: CanvasRenderingContext2D,
  text: string,
  font: (size: number) => string,
  maxW: number,
  start: number,
  min: number,
): number {
  let size = start;
  ctx.font = font(size);
  while (size > min && ctx.measureText(text).width > maxW) {
    size -= 1;
    ctx.font = font(size);
  }
  return size;
}

function wrap(ctx: CanvasRenderingContext2D, text: string, maxW: number): string[] {
  const words = text.split(' ');
  const lines: string[] = [];
  let line = '';
  for (const w of words) {
    const test = line ? `${line} ${w}` : w;
    if (ctx.measureText(test).width > maxW && line) {
      lines.push(line);
      line = w;
    } else {
      line = test;
    }
  }
  if (line) lines.push(line);
  return lines;
}

function formatDate(d: Date): string {
  return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
}

interface Layout {
  // Frame
  inset: number;
  brandX: number;
  brandY: number;
  brandSize: number;
  tagSize: number;
  logoW: number;
  logoY: number;
  capY: number;
  capSize: number;
  certifiesY: number;
  certifiesSize: number;
  nameY: number;
  nameStart: number;
  nameMin: number;
  nameLineW: number;
  stmtY: number;
  stmtSize: number;
  stmtMaxW: number;
  titleY: number;
  titleStart: number;
  titleMaxW: number;
  titleLineH: number;
  dateY: number | null;
  dateSize: number;
  sigLineY: number;
  sigLineX1: number;
  sigLineX2: number;
  sigH: number;
  sigLabelY: number;
  sigLabelSize: number;
  dateLine: { x1: number; x2: number } | null;
  seal: { x: number; y: number; r: number };
  urlY: number;
  urlSize: number;
}

// Landscape is designed on a 1000 x 707 grid and drawn at 2x.
const LAYOUTS: Record<CertFormat, Layout> = {
  landscape: {
    inset: 16, brandX: 64, brandY: 72, brandSize: 20, tagSize: 9,
    logoW: 250, logoY: 42, capY: 214, capSize: 12,
    certifiesY: 262, certifiesSize: 15,
    nameY: 332, nameStart: 54, nameMin: 22, nameLineW: 380,
    stmtY: 392, stmtSize: 15, stmtMaxW: 800,
    titleY: 440, titleStart: 28, titleMaxW: 820, titleLineH: 34,
    dateY: null, dateSize: 15,
    sigLineY: 612, sigLineX1: 110, sigLineX2: 340, sigH: 64, sigLabelY: 632, sigLabelSize: 11,
    dateLine: { x1: 660, x2: 890 },
    seal: { x: 500, y: 566, r: 46 },
    urlY: 672, urlSize: 13,
  },
  portrait: {
    inset: 40, brandX: 130, brandY: 144, brandSize: 38, tagSize: 17,
    logoW: 470, logoY: 215, capY: 548, capSize: 25,
    certifiesY: 616, certifiesSize: 30,
    nameY: 736, nameStart: 92, nameMin: 34, nameLineW: 620,
    stmtY: 808, stmtSize: 28, stmtMaxW: 880,
    titleY: 880, titleStart: 58, titleMaxW: 860, titleLineH: 68,
    dateY: 1020, dateSize: 30,
    sigLineY: 1150, sigLineX1: 330, sigLineX2: 750, sigH: 140, sigLabelY: 1186, sigLabelSize: 21,
    dateLine: null,
    seal: { x: 215, y: 1148, r: 60 },
    urlY: 1252, urlSize: 25,
  },
  story: {
    inset: 40, brandX: 130, brandY: 156, brandSize: 42, tagSize: 19,
    logoW: 600, logoY: 300, capY: 722, capSize: 28,
    certifiesY: 806, certifiesSize: 34,
    nameY: 946, nameStart: 104, nameMin: 36, nameLineW: 660,
    stmtY: 1040, stmtSize: 31, stmtMaxW: 880,
    titleY: 1130, titleStart: 70, titleMaxW: 860, titleLineH: 82,
    dateY: 1370, dateSize: 34,
    sigLineY: 1620, sigLineX1: 300, sigLineX2: 780, sigH: 170, sigLabelY: 1662, sigLabelSize: 24,
    dateLine: null,
    seal: { x: 250, y: 1735, r: 72 },
    urlY: 1800, urlSize: 28,
  },
};

export async function renderCertificate(input: CertInput): Promise<HTMLCanvasElement> {
  const { format, username, courseTitle, completedAt } = input;
  const L = LAYOUTS[format];
  const { w, h } = CERT_SIZES[format];
  const [logo, sig] = await Promise.all([
    loadImage('/black-sheep-university/logo.png'),
    loadImage('/black-sheep-university/founder-signature.png'),
  ]);

  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas is not available');

  // Landscape uses a 1000 wide design grid drawn at 2x. The others draw 1:1.
  const k = format === 'landscape' ? 2 : 1;
  const W = w / k;
  const H = h / k;
  const cx = W / 2;
  ctx.scale(k, k);
  ctx.textBaseline = 'alphabetic';

  // Paper and frames
  ctx.fillStyle = PAPER;
  ctx.fillRect(0, 0, W, H);
  const heavy = format === 'landscape' ? 3 : 8;
  const fine = format === 'landscape' ? 1 : 2;
  const gap = format === 'landscape' ? 10 : 28;
  ctx.strokeStyle = BRONZE;
  ctx.lineWidth = heavy;
  ctx.strokeRect(L.inset, L.inset, W - L.inset * 2, H - L.inset * 2);
  ctx.strokeStyle = BRONZE_LIGHT;
  ctx.lineWidth = fine;
  ctx.strokeRect(L.inset + gap, L.inset + gap, W - (L.inset + gap) * 2, H - (L.inset + gap) * 2);

  // Corner marks
  const co = L.inset + gap + (format === 'landscape' ? 10 : 28);
  const cl = format === 'landscape' ? 34 : 70;
  ctx.strokeStyle = BRONZE;
  ctx.lineWidth = format === 'landscape' ? 3 : 7;
  ctx.lineCap = 'butt';
  const corner = (x: number, y: number, dx: number, dy: number) => {
    ctx.beginPath();
    ctx.moveTo(x + dx * cl, y);
    ctx.lineTo(x, y);
    ctx.lineTo(x, y + dy * cl);
    ctx.stroke();
  };
  corner(co, co, 1, 1);
  corner(W - co, co, -1, 1);
  corner(co, H - co, 1, -1);
  corner(W - co, H - co, -1, -1);

  // Platform name, top left
  ctx.fillStyle = BRONZE;
  ctx.font = `800 ${L.brandSize}px ${SANS}`;
  spaced(ctx, 'MITYPE', L.brandX, L.brandY, L.brandSize * 0.22, 'left');
  ctx.font = `600 ${L.tagSize}px ${SANS}`;
  spaced(ctx, 'THE SOCIAL MEDIA THAT NETWORKS', L.brandX, L.brandY + L.tagSize * 1.9, L.tagSize * 0.18, 'left');

  // Black Sheep University logo
  const logoH = (L.logoW * logo.naturalHeight) / logo.naturalWidth;
  ctx.drawImage(logo, cx - L.logoW / 2, L.logoY, L.logoW, logoH);

  // Heading and recipient
  ctx.fillStyle = BRONZE;
  ctx.font = `700 ${L.capSize}px ${SANS}`;
  spaced(ctx, 'CERTIFICATE OF COMPLETION', cx, L.capY, L.capSize * 0.3);

  ctx.fillStyle = SOFT;
  ctx.font = `${L.certifiesSize}px ${SERIF}`;
  ctx.textAlign = 'center';
  ctx.fillText('This certifies that', cx, L.certifiesY);

  // Username always fits inside the line beneath it.
  const display = `@${username}`;
  const nameFont = (s: number) => `italic ${s}px ${SERIF}`;
  const nameMaxW = L.nameLineW - 24;
  const nameSize = fitSize(ctx, display, nameFont, nameMaxW, L.nameStart, 10);
  ctx.font = nameFont(nameSize);
  ctx.fillStyle = INK;
  ctx.textAlign = 'center';
  ctx.fillText(display, cx, L.nameY);
  ctx.strokeStyle = BRONZE_LIGHT;
  ctx.lineWidth = format === 'landscape' ? 2 : 4;
  ctx.beginPath();
  ctx.moveTo(cx - L.nameLineW / 2, L.nameY + (format === 'landscape' ? 14 : 26));
  ctx.lineTo(cx + L.nameLineW / 2, L.nameY + (format === 'landscape' ? 14 : 26));
  ctx.stroke();

  // Statement
  ctx.fillStyle = SOFT;
  ctx.font = `${L.stmtSize}px ${SERIF}`;
  ctx.textAlign = 'center';
  let y = L.stmtY;
  for (const line of wrap(ctx, 'has successfully completed all modules and lessons of the', L.stmtMaxW)) {
    ctx.fillText(line, cx, y);
    y += L.stmtSize * 1.5;
  }

  // Course title
  const titleFont = (s: number) => `700 ${s}px ${SERIF}`;
  const titleSize = fitSize(ctx, courseTitle, titleFont, L.titleMaxW * 1.6, L.titleStart, 20);
  ctx.font = titleFont(titleSize);
  ctx.fillStyle = BRONZE;
  ctx.textAlign = 'center';
  // Never let the title crowd the statement above it.
  let ty = Math.max(L.titleY, y - L.stmtSize * 1.5 + titleSize * 1.3);
  for (const line of wrap(ctx, courseTitle, L.titleMaxW)) {
    ctx.fillText(line, cx, ty);
    ty += L.titleLineH * (titleSize / L.titleStart);
  }

  const dateText = formatDate(completedAt);

  if (L.dateY !== null) {
    ctx.fillStyle = SOFT;
    ctx.font = `${L.dateSize}px ${SERIF}`;
    ctx.textAlign = 'center';
    ctx.fillText(`Completed on ${dateText}`, cx, L.dateY);
  }

  // Signature sits on its line
  const sigSrcH = sig.naturalHeight * SIG_CROP;
  const sigW = (L.sigH * sig.naturalWidth) / sigSrcH;
  const sigCx = (L.sigLineX1 + L.sigLineX2) / 2;
  ctx.drawImage(sig, 0, 0, sig.naturalWidth, sigSrcH, sigCx - sigW / 2, L.sigLineY - L.sigH + 2, sigW, L.sigH);
  ctx.strokeStyle = BRONZE;
  ctx.lineWidth = format === 'landscape' ? 1.5 : 3;
  ctx.beginPath();
  ctx.moveTo(L.sigLineX1, L.sigLineY);
  ctx.lineTo(L.sigLineX2, L.sigLineY);
  ctx.stroke();
  ctx.fillStyle = SOFT;
  ctx.font = `600 ${L.sigLabelSize}px ${SANS}`;
  spaced(ctx, 'FOUNDER, MITYPE', sigCx, L.sigLabelY, L.sigLabelSize * 0.12);

  // Landscape only: completion date on the right line
  if (L.dateLine) {
    const dcx = (L.dateLine.x1 + L.dateLine.x2) / 2;
    ctx.fillStyle = INK;
    ctx.font = `15px ${SERIF}`;
    ctx.textAlign = 'center';
    ctx.fillText(dateText, dcx, L.sigLineY - 8);
    ctx.strokeStyle = BRONZE;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(L.dateLine.x1, L.sigLineY);
    ctx.lineTo(L.dateLine.x2, L.sigLineY);
    ctx.stroke();
    ctx.fillStyle = SOFT;
    ctx.font = `600 ${L.sigLabelSize}px ${SANS}`;
    spaced(ctx, 'DATE OF COMPLETION', dcx, L.sigLabelY, L.sigLabelSize * 0.12);
  }

  // Seal
  const { x: sx, y: sy, r } = L.seal;
  const grad = ctx.createRadialGradient(sx - r * 0.3, sy - r * 0.4, r * 0.1, sx, sy, r);
  grad.addColorStop(0, '#e0b48a');
  grad.addColorStop(0.7, BRONZE);
  ctx.beginPath();
  ctx.arc(sx, sy, r + r * 0.08, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(200,149,108,0.35)';
  ctx.fill();
  ctx.beginPath();
  ctx.arc(sx, sy, r, 0, Math.PI * 2);
  ctx.fillStyle = grad;
  ctx.fill();
  ctx.fillStyle = '#ffffff';
  const sealFont = Math.round(r * 0.2);
  ctx.font = `800 ${sealFont}px ${SANS}`;
  const sealLines = ['BLACK', 'SHEEP', 'UNIVERSITY'];
  sealLines.forEach((t, i) => {
    spaced(ctx, t, sx, sy - sealFont * 0.9 + i * sealFont * 1.5, sealFont * 0.14);
  });

  // Web address
  ctx.fillStyle = BRONZE;
  ctx.font = `700 ${L.urlSize}px ${SANS}`;
  spaced(ctx, 'MITYPEAPP.COM', cx, L.urlY, L.urlSize * 0.2);

  return canvas;
}

export function canvasToBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Could not create image'))), 'image/png');
  });
}
