// Shared upload helpers so every corner of the app handles user files
// the same way — no matter what phone, camera, or export tool produced
// them.
//
// Problems this solves in one place:
//   1. MediaRecorder / iOS Photos / Android exports append codec params
//      to blob.type ("image/jpeg;charset=utf-8", "video/mp4;codecs=…").
//      Supabase Storage MIME whitelists do exact-string match — those
//      suffixes broke uploads with a 400. We strip them everywhere.
//   2. Some phones send an empty type or "application/octet-stream" for
//      a perfectly valid image/video. We fall back sensibly by extension.
//   3. iOS Photos often exports HEIC (image/heic) which many older
//      whitelists rejected. We accept it as-is and let the bucket store it.
//   4. Some Android browsers drop the type entirely. We infer from the
//      filename extension so we still send a valid Content-Type.
//
// Every upload site in the app should import `safeContentType()` or the
// full `safeUpload()` wrapper — do NOT set contentType inline anywhere
// else. That way a future browser quirk gets fixed in ONE place.

import { supabase } from './supabaseClient';

// -------------------------------------------------------------------------

/** Common video extensions — match at the tail of a filename. */
const VIDEO_EXTS: Record<string, string> = {
  mp4: 'video/mp4',
  m4v: 'video/mp4',
  mov: 'video/quicktime',
  qt:  'video/quicktime',
  webm:'video/webm',
  mkv: 'video/x-matroska',
  avi: 'video/x-msvideo',
  '3gp': 'video/3gpp',
  '3gpp':'video/3gpp',
  '3g2': 'video/3gpp2',
  hevc:'video/hevc',
  ts:  'video/mp2t',
  mts: 'video/mp2t',
  m2ts:'video/mp2t',
  wmv: 'video/x-ms-wmv',
  flv: 'video/x-flv',
  ogv: 'video/ogg',
};

/** Common image extensions. */
const IMAGE_EXTS: Record<string, string> = {
  jpg:  'image/jpeg',
  jpeg: 'image/jpeg',
  jpe:  'image/jpeg',
  png:  'image/png',
  webp: 'image/webp',
  gif:  'image/gif',
  bmp:  'image/bmp',
  heic: 'image/heic',
  heif: 'image/heif',
  avif: 'image/avif',
  tif:  'image/tiff',
  tiff: 'image/tiff',
  svg:  'image/svg+xml',
};

/** Common audio extensions (used by voice notes). */
const AUDIO_EXTS: Record<string, string> = {
  mp3: 'audio/mpeg',
  m4a: 'audio/mp4',
  aac: 'audio/aac',
  wav: 'audio/wav',
  ogg: 'audio/ogg',
  oga: 'audio/ogg',
  webm:'audio/webm',
  flac:'audio/flac',
  amr: 'audio/amr',
};

export type MediaKind = 'image' | 'video' | 'audio';

/** Sensible default per media kind if we can't infer anything. */
const KIND_DEFAULT: Record<MediaKind, string> = {
  image: 'image/jpeg',
  video: 'video/mp4',
  audio: 'audio/mp4',
};

/** Extract the file extension (lowercased, no dot). Empty string if none. */
function getExt(name: string): string {
  const idx = name.lastIndexOf('.');
  if (idx < 0 || idx === name.length - 1) return '';
  return name.slice(idx + 1).toLowerCase();
}

/**
 * Produce a bucket-safe Content-Type string for a file/blob.
 *
 * Steps:
 *   1. Take the raw `blob.type` (or file.type).
 *   2. Strip everything after the first `;` (codec params, charset).
 *   3. Lowercase + trim.
 *   4. If it looks like a valid `image/`, `video/`, or `audio/` type,
 *      accept it as-is.
 *   5. Otherwise, infer from the filename extension.
 *   6. Otherwise, use the sensible per-kind default.
 *
 * @param file  The File or Blob to upload.
 * @param kind  What kind of media we EXPECT — used for the fallback.
 * @param name  Optional filename (Blob has no name; File does).
 */
export function safeContentType(file: File | Blob, kind: MediaKind, name?: string): string {
  const raw = (file.type || '').trim();
  const cleaned = raw.split(';')[0].trim().toLowerCase();

  // Accept clean matches from the browser as-is.
  if (cleaned.startsWith(`${kind}/`) && cleaned.length > kind.length + 1) {
    return cleaned;
  }

  // Try the filename extension.
  const filename = name ?? (file as any).name ?? '';
  const ext = getExt(filename);
  if (ext) {
    const table = kind === 'video' ? VIDEO_EXTS
                : kind === 'image' ? IMAGE_EXTS
                : AUDIO_EXTS;
    if (table[ext]) return table[ext];
  }

  // Some clean type of a DIFFERENT top-level (e.g. "application/octet-stream"
  // for a valid MP4) — still coerce to the expected kind's default so the
  // upload isn't rejected by bucket-level heuristics.
  return KIND_DEFAULT[kind];
}

// -------------------------------------------------------------------------

export interface SafeUploadOptions {
  /** Storage bucket name (e.g. 'avatars', 'pet-photos'). */
  bucket: string;
  /** Object path inside the bucket. */
  path: string;
  /** Media kind — governs the Content-Type fallback. */
  kind: MediaKind;
  /** Optional filename used for extension inference (Blobs have no .name). */
  filename?: string;
  /** Upsert existing objects. Default false. */
  upsert?: boolean;
  /** Optional cacheControl seconds (default '3600'). */
  cacheControl?: string;
}

export interface SafeUploadResult {
  /** Storage path that was written to. */
  path: string;
  /** Public URL of the object (assumes public bucket). */
  publicUrl: string;
  /** Content-Type actually sent to Supabase. */
  contentType: string;
}

/**
 * Universal client-side upload wrapper. Handles MIME normalization and
 * returns a public URL. Throws on failure with a readable message.
 *
 * Every call in the app should route through this rather than calling
 * supabase.storage.from(...).upload(...) directly.
 */
export async function safeUpload(
  file: File | Blob,
  opts: SafeUploadOptions,
): Promise<SafeUploadResult> {
  const contentType = safeContentType(file, opts.kind, opts.filename);
  const { error } = await supabase.storage
    .from(opts.bucket)
    .upload(opts.path, file, {
      upsert: opts.upsert ?? false,
      contentType,
      cacheControl: opts.cacheControl ?? '3600',
    });
  if (error) {
    // Surface a specific message the caller can toast. Supabase Storage
    // returns useful details in the message field; forward them.
    throw new Error(`Upload failed: ${error.message}`);
  }
  const { data } = supabase.storage.from(opts.bucket).getPublicUrl(opts.path);
  return {
    path: opts.path,
    publicUrl: data.publicUrl,
    contentType,
  };
}
