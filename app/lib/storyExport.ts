// Story Builder export helpers.
//
// renderStoryImage: produces a 1080x1350 PNG (Instagram-friendly portrait)
//   with the story typeset on a bronze gradient + MITYPE watermark in the
//   bottom-right corner. Pure canvas — no server cost, no Supabase write.
//
// formatStoryText: plain-text version with a small "— made on Mitype"
//   attribution at the bottom. Used by the Copy-to-clipboard button.

export interface StoryExportInput {
  opener: string;
  sentences: string[];
  myUsername: string;
  partnerUsername: string;
}

export function formatStoryText({
  opener,
  sentences,
  myUsername,
  partnerUsername,
}: StoryExportInput): string {
  const body = sentences.join(' ');
  const credit = `Built together by @${myUsername} × @${partnerUsername}`;
  return `"${opener}" ${body}\n\n— ${credit}\n✨ Made on Mitype · mitypeapp.com`;
}

/** Renders the story as a 1080x1350 PNG. Returns a Blob ready for
 *  download or Web Share. */
export async function renderStoryImage({
  opener,
  sentences,
  myUsername,
  partnerUsername,
}: StoryExportInput): Promise<Blob> {
  const W = 1080;
  const H = 1350;
  const PAD = 90;

  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D not supported');

  // 1) Background — warm cream → bronze gradient.
  const bg = ctx.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0, '#fff8ec');
  bg.addColorStop(0.55, '#fff3ec');
  bg.addColorStop(1, '#e8c89a');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  // 2) Subtle inner border.
  ctx.strokeStyle = 'rgba(200,149,108,0.35)';
  ctx.lineWidth = 4;
  ctx.strokeRect(40, 40, W - 80, H - 80);

  // 3) Eyebrow + date.
  ctx.fillStyle = '#c8956c';
  ctx.font = '900 22px Helvetica, Arial, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('✨ STORY BUILDER', W / 2, 130);

  ctx.fillStyle = 'rgba(106,85,60,0.7)';
  ctx.font = '600 16px Helvetica, Arial, sans-serif';
  ctx.fillText(formatDate(new Date()), W / 2, 160);

  // 4) Opener — italic serif feel via Georgia.
  let y = 235;
  y = wrapText(ctx, `"${opener}"`, W / 2, y, W - PAD * 2, 44, 'italic 700 28px Georgia, serif', '#1a1208', 'center');

  // 5) Body — combined sentences.
  y += 28;
  const body = sentences.join(' ');
  y = wrapText(ctx, body, W / 2, y, W - PAD * 2, 42, '400 24px Georgia, serif', '#3a2e1c', 'center');

  // If the body went past the safe zone, gracefully fade — won't usually
  // happen but the story can be up to ~1700 chars worst case.
  const SAFE_BOTTOM = H - 200;
  if (y > SAFE_BOTTOM) {
    // Overlay a soft fade so any overflowing text disappears under it.
    const fade = ctx.createLinearGradient(0, SAFE_BOTTOM - 60, 0, SAFE_BOTTOM);
    fade.addColorStop(0, 'rgba(255,243,236,0)');
    fade.addColorStop(1, '#fff3ec');
    ctx.fillStyle = fade;
    ctx.fillRect(0, SAFE_BOTTOM - 60, W, 60);
    ctx.fillStyle = '#fff3ec';
    ctx.fillRect(0, SAFE_BOTTOM, W, H - SAFE_BOTTOM - 130);
  }

  // 6) Attribution near the bottom.
  ctx.fillStyle = 'rgba(60,47,31,0.7)';
  ctx.font = '700 20px Helvetica, Arial, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(
    `Built together by @${myUsername} × @${partnerUsername}`,
    W / 2,
    H - 130
  );

  // 7) Mitype watermark — bottom-right corner.
  //    Drop shadow + bronze text. Always visible no matter where
  //    the image gets shared.
  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,0.15)';
  ctx.shadowBlur = 4;
  ctx.shadowOffsetY = 1;
  ctx.fillStyle = '#c8956c';
  ctx.font = '900 28px Helvetica, Arial, sans-serif';
  ctx.textAlign = 'right';
  ctx.textBaseline = 'alphabetic';
  ctx.fillText('mitype', W - 60, H - 60);
  ctx.restore();
  // Sparkle next to the wordmark.
  ctx.fillStyle = '#c8956c';
  ctx.font = '700 22px Helvetica, Arial, sans-serif';
  ctx.textAlign = 'right';
  // Measure the wordmark to position the sparkle on its left.
  ctx.font = '900 28px Helvetica, Arial, sans-serif';
  const wordmarkWidth = ctx.measureText('mitype').width;
  ctx.font = '700 22px Helvetica, Arial, sans-serif';
  ctx.fillText('✨', W - 60 - wordmarkWidth - 8, H - 60);

  // 8) Domain on the bottom-left so the brand is repeated.
  ctx.fillStyle = 'rgba(106,85,60,0.55)';
  ctx.font = '600 14px Helvetica, Arial, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('mitypeapp.com', 60, H - 60);

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('toBlob failed'))),
      'image/png'
    );
  });
}

// Wrap text and write it line-by-line. Returns the y after the last line.
function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  centerX: number,
  startY: number,
  maxWidth: number,
  lineHeight: number,
  font: string,
  fill: string,
  align: 'center' | 'left' = 'center'
): number {
  ctx.font = font;
  ctx.fillStyle = fill;
  ctx.textAlign = align;
  ctx.textBaseline = 'alphabetic';

  const words = text.split(/\s+/);
  let line = '';
  let y = startY;

  for (const word of words) {
    const candidate = line.length ? line + ' ' + word : word;
    const w = ctx.measureText(candidate).width;
    if (w > maxWidth && line.length) {
      ctx.fillText(line, align === 'center' ? centerX : centerX - maxWidth / 2, y);
      line = word;
      y += lineHeight;
    } else {
      line = candidate;
    }
  }
  if (line.length) {
    ctx.fillText(line, align === 'center' ? centerX : centerX - maxWidth / 2, y);
    y += lineHeight;
  }
  return y;
}

function formatDate(d: Date): string {
  return d.toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' });
}

/** Triggers a file download in the browser. */
export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}
