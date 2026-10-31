// Open Graph / Twitter preview image for shared Mitype links (1200x630).
// "Signal orb" design: dark card, glowing copper constellation orb holding
// the Mitype M mark, scanning ring, grid floor and HUD style readouts.
//
// IMPORTANT: ImageResponse does NOT resolve CSS variables, so every color
// here is a hex literal. Graphics are one inline SVG (viewBox 680x357,
// scaled to 1200x630); text is real HTML so it uses the bundled font.

import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const alt = 'Mitype. The social media that networks. Connect with the people who share your world.';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

const K = 1200 / 680; // scale from the 680-wide design grid

function T(props: { x: number; base: number; fs: number; color: string; weight?: number; ls?: number; children: string }) {
  // x / base are in design units; base is the text baseline.
  return (
    <div
      style={{
        position: 'absolute',
        left: props.x * K,
        top: (props.base - props.fs * 0.82) * K,
        fontSize: props.fs * K,
        lineHeight: 1,
        color: props.color,
        fontWeight: props.weight ?? 400,
        letterSpacing: (props.ls ?? 0) * K,
        display: 'flex',
        whiteSpace: 'nowrap',
      }}
    >
      {props.children}
    </div>
  );
}

const dots: Array<[number, number, number]> = [
  [441, 112, 18], [588, 104, 22], [468, 250, 20], [608, 228, 24],
  [636, 168, 15], [520, 46, 17], [520, 294, 19], [402, 188, 14],
];

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div style={{ width: 1200, height: 630, display: 'flex', position: 'relative', background: '#0b0a09', fontFamily: 'sans-serif' }}>
        <svg width={1200} height={630} viewBox="0 0 680 357" style={{ position: 'absolute', left: 0, top: 0 }}>
          <defs>
            <radialGradient id="bg3" cx="76%" cy="48%" r="60%">
              <stop offset="0" stopColor="#52382a" />
              <stop offset="0.55" stopColor="#1c1613" />
              <stop offset="1" stopColor="#0b0a09" />
            </radialGradient>
            <radialGradient id="halo3" cx="50%" cy="50%" r="50%">
              <stop offset="0" stopColor="#ffe3c2" stopOpacity="0.5" />
              <stop offset="0.45" stopColor="#c8956c" stopOpacity="0.18" />
              <stop offset="1" stopColor="#c8956c" stopOpacity="0" />
            </radialGradient>
            <radialGradient id="dot3" cx="50%" cy="50%" r="50%">
              <stop offset="0" stopColor="#fffaf0" />
              <stop offset="0.3" stopColor="#ffd9aa" stopOpacity="0.95" />
              <stop offset="1" stopColor="#c8956c" stopOpacity="0" />
            </radialGradient>
            <linearGradient id="m3" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor="#fff0dc" />
              <stop offset="1" stopColor="#b9805a" />
            </linearGradient>
            <linearGradient id="beam3" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0" stopColor="#f2cfa8" stopOpacity="0" />
              <stop offset="0.5" stopColor="#f2cfa8" stopOpacity="0.9" />
              <stop offset="1" stopColor="#f2cfa8" stopOpacity="0" />
            </linearGradient>
          </defs>
          <rect width="680" height="357" fill="url(#bg3)" />
          <g stroke="#c8956c" strokeOpacity="0.28" strokeWidth="0.7">
            <line x1="360" y1="270" x2="680" y2="270" />
            <line x1="360" y1="286" x2="680" y2="286" />
            <line x1="360" y1="306" x2="680" y2="306" />
            <line x1="360" y1="332" x2="680" y2="332" />
            <line x1="520" y1="262" x2="520" y2="357" />
            <line x1="470" y1="262" x2="400" y2="357" />
            <line x1="570" y1="262" x2="640" y2="357" />
            <line x1="420" y1="262" x2="340" y2="357" />
            <line x1="620" y1="262" x2="760" y2="357" />
            
          </g>
          <circle cx="520" cy="170" r="190" fill="url(#halo3)" />
          <circle cx="520" cy="170" r="154" fill="none" stroke="#f2cfa8" strokeOpacity="0.7" strokeWidth="5" strokeDasharray="1.4 14.6" />
          <circle cx="520" cy="170" r="140" fill="none" stroke="#c8956c" strokeOpacity="0.5" strokeWidth="0.9" />
          <path d="M520 30 A140 140 0 0 1 660 170" fill="none" stroke="#fff0dc" strokeWidth="2.4" strokeLinecap="round" />
          <g stroke="#c8956c" strokeOpacity="0.55" fill="none" strokeWidth="0.9">
            <circle cx="520" cy="170" r="118" />
            <ellipse cx="520" cy="170" rx="118" ry="44" transform="rotate(25 520 170)" />
            <ellipse cx="520" cy="170" rx="118" ry="44" transform="rotate(-35 520 170)" />
            <ellipse cx="520" cy="170" rx="118" ry="44" transform="rotate(88 520 170)" />
          </g>
          <g stroke="#f2cfa8" strokeOpacity="0.4" strokeWidth="0.8">
            <line x1="441" y1="112" x2="588" y2="104" />
            <line x1="468" y1="250" x2="608" y2="228" />
            <line x1="441" y1="112" x2="468" y2="250" />
            <line x1="588" y1="104" x2="636" y2="168" />
            <line x1="608" y1="228" x2="636" y2="168" />
            <line x1="520" y1="46" x2="588" y2="104" />
            <line x1="520" y1="294" x2="468" y2="250" />
            <line x1="402" y1="188" x2="441" y2="112" />
          </g>
          {dots.map(([x, y, r]) => (
            <circle key={`${x}-${y}`} cx={x} cy={y} r={r} fill="url(#dot3)" />
          ))}
          <g transform="translate(470 116)">
            <circle cx="22" cy="20" r="8.5" fill="#fff0dc" />
            <circle cx="78" cy="20" r="8.5" fill="#d29a72" />
            <polygon points="10,98 10,40 32,52 50,76 68,52 90,40 90,98 72,98 72,66 50,92 28,66 28,98" fill="url(#m3)" />
          </g>
          <rect x="40" y="112" width="330" height="2" fill="url(#beam3)" />
          <g stroke="#d19f77" fill="none" strokeWidth="1.4">
            <path d="M26 30 v-14 h14" />
            <path d="M654 30 v-14 h-14" />
            <path d="M26 327 v14 h14" />
            <path d="M654 327 v14 h-14" />
          </g>
        </svg>

        <T x={40} base={62} fs={11} color="#d19f77" weight={700} ls={2.2}>SIGNAL FOUND  //  LOCK 100%</T>
        <T x={40} base={100} fs={14} color="#8f8171">{'> scanning for your type of people'}</T>
        <T x={40} base={178} fs={72} color="#fff3e2" weight={900} ls={-3.5}>Mitype</T>
        <T x={40} base={212} fs={19} color="#e0b48a" weight={700}>The social media that networks.</T>
        <T x={40} base={258} fs={14} color="#c9b8a2">Connect with the people</T>
        <T x={40} base={278} fs={14} color="#c9b8a2">who share your world.</T>
        <T x={40} base={324} fs={11} color="#8f8171" ls={1.8}>mitypeapp.com</T>
      </div>
    ),
    { ...size },
  );
}
