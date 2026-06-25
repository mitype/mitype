// Mention parser for The Current.
//
// Each post body can mention three Mitype entity types using a tiny
// prefix syntax:
//
//   @username             →  user profile
//   @biz/business-handle  →  small business profile (deep-links via owner username)
//   @goods/listing-uuid   →  Mi Home Goods listing
//
// We also pull http(s):// links out of the body so we can render them
// as soft clickable chips at the bottom of each card.
//
// Pure parsing (no DB calls). The renderer hydrates each mention via a
// separate query and decides whether to render a rich embed card or
// fall back to plain text.

export type MentionKind = 'user' | 'business' | 'listing';

export interface Mention {
  kind: MentionKind;
  /** The matched text, e.g. "@stevie" or "@biz/strand-records". */
  raw: string;
  /** The resolved handle/id (without prefix). */
  handle: string;
}

export interface ParsedCurrent {
  /** Original body text. */
  body: string;
  /** Distinct mentions found in body order. */
  mentions: Mention[];
  /** Distinct http(s) links found in body order. */
  links: string[];
}

// Username regex matches Mitype's username rules (lowercase alnum + _, 1-30 chars).
const USER_RE    = /(?<![\w/])@([a-z0-9_]{1,30})\b/gi;
const BIZ_RE     = /(?<![\w/])@biz\/([a-z0-9_-]{1,40})\b/gi;
const LISTING_RE = /(?<![\w/])@goods\/([a-f0-9-]{6,40})\b/gi;
const URL_RE     = /https?:\/\/[^\s]+/gi;

export function parseCurrent(body: string): ParsedCurrent {
  const mentions: Mention[] = [];
  const seen = new Set<string>();

  // Order matters: parse the more-specific patterns first so a plain
  // @ regex doesn't swallow "@biz/" or "@goods/".
  for (const m of body.matchAll(BIZ_RE)) {
    const key = `business:${m[1].toLowerCase()}`;
    if (seen.has(key)) continue;
    seen.add(key);
    mentions.push({ kind: 'business', raw: m[0], handle: m[1].toLowerCase() });
  }
  for (const m of body.matchAll(LISTING_RE)) {
    const key = `listing:${m[1].toLowerCase()}`;
    if (seen.has(key)) continue;
    seen.add(key);
    mentions.push({ kind: 'listing', raw: m[0], handle: m[1].toLowerCase() });
  }

  // Strip the already-matched ranges from the body before running the
  // user regex, so "@biz/foo" doesn't also yield a "user" match for "foo".
  let scratch = body
    .replace(BIZ_RE, ' '.repeat(20))
    .replace(LISTING_RE, ' '.repeat(20));
  for (const m of scratch.matchAll(USER_RE)) {
    const handle = m[1].toLowerCase();
    if (handle === 'biz' || handle === 'goods') continue; // never standalone
    const key = `user:${handle}`;
    if (seen.has(key)) continue;
    seen.add(key);
    mentions.push({ kind: 'user', raw: m[0], handle });
  }

  const links: string[] = [];
  const seenLinks = new Set<string>();
  for (const m of body.matchAll(URL_RE)) {
    const url = m[0];
    if (seenLinks.has(url)) continue;
    seenLinks.add(url);
    links.push(url);
  }

  return { body, mentions, links };
}

// Render-time helper: splits body into segments so the UI can interleave
// plain text with inline-styled @mention pills.
export type Segment =
  | { type: 'text'; text: string }
  | { type: 'mention'; mention: Mention }
  | { type: 'link'; url: string };

export function segmentBody(body: string): Segment[] {
  // Build a list of all match ranges across the three mention regexes +
  // url regex, then sort by start index and walk through.
  interface Hit { start: number; end: number; seg: Segment; }
  const hits: Hit[] = [];

  function pushAll(re: RegExp, build: (m: RegExpMatchArray) => Segment) {
    for (const m of body.matchAll(re)) {
      const start = m.index ?? 0;
      hits.push({ start, end: start + m[0].length, seg: build(m) });
    }
  }

  pushAll(BIZ_RE, (m) => ({
    type: 'mention',
    mention: { kind: 'business', raw: m[0], handle: m[1].toLowerCase() },
  }));
  pushAll(LISTING_RE, (m) => ({
    type: 'mention',
    mention: { kind: 'listing', raw: m[0], handle: m[1].toLowerCase() },
  }));
  pushAll(URL_RE, (m) => ({ type: 'link', url: m[0] }));

  // For user mentions, skip ranges that overlap a biz/goods/url hit.
  for (const m of body.matchAll(USER_RE)) {
    const handle = m[1].toLowerCase();
    if (handle === 'biz' || handle === 'goods') continue;
    const start = m.index ?? 0;
    const end = start + m[0].length;
    const overlaps = hits.some((h) => !(end <= h.start || start >= h.end));
    if (overlaps) continue;
    hits.push({
      start, end,
      seg: { type: 'mention', mention: { kind: 'user', raw: m[0], handle } },
    });
  }

  hits.sort((a, b) => a.start - b.start);

  const out: Segment[] = [];
  let cursor = 0;
  for (const h of hits) {
    if (h.start > cursor) {
      out.push({ type: 'text', text: body.slice(cursor, h.start) });
    }
    out.push(h.seg);
    cursor = h.end;
  }
  if (cursor < body.length) {
    out.push({ type: 'text', text: body.slice(cursor) });
  }
  return out;
}
