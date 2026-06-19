'use client';
// Hanging dog-tags overlay for the user's profile photo.
//
// Renders each pet as a metal dog tag with the chosen color bezel,
// connected to a beaded chain that hangs from the top of the parent.
// Multiple pets fan out side by side, gently rotated so they look
// like real ID tags resting on each other.
//
// Clicking a tag opens a detail modal with the full pet info.

import React, { useState } from 'react';
import {
  TAG_COLORS,
  getTagColor,
  getPetTypeLabel,
  type TagColor,
} from '../lib/petConstants';

export interface Pet {
  id: string;
  name: string;
  pet_type: string | null;
  birthday: string | null;
  fav_activity: string | null;
  fav_food: string | null;
  bio: string | null;
  photo_url: string | null;
  tag_color: string | null;
}

interface PetTagsProps {
  pets: Pet[];
  /** Width reference (in CSS px). On the profile page this is the
   *  profile photo's width, and the tag size scales to it so the cluster
   *  is never larger than the photo. */
  parentWidth: number;
  /** Distance (in px) from the RIGHT edge of the positioning ancestor
   *  to the chain anchor. Default 32px. The component is `position:
   *  absolute` so it docks to the top-right corner of whatever has
   *  `position: relative` around it. */
  anchorRightPx?: number;
  /** How far up to start the chain (negative number lifts it above
   *  the top of the positioning ancestor). Default -18 so the chain
   *  drapes from above the banner. */
  topOffsetPx?: number;
}

const TAG_W = 84;   // base tag width in SVG units
const TAG_H = 112;  // base tag height

export function PetTags({
  pets,
  parentWidth,
  anchorRightPx = 32,
  topOffsetPx = 0,
}: PetTagsProps) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  if (!pets || pets.length === 0) return null;

  // Each tag is sized smaller than before so it never overpowers the
  // profile photo — roughly 32-36% of the reference width.
  const sizeFactor = pets.length === 1 ? 0.34 : pets.length === 2 ? 0.31 : 0.28;
  const tagW = Math.max(56, Math.round(parentWidth * sizeFactor));
  const tagH = Math.round(tagW * (TAG_H / TAG_W));
  const containerW = Math.round(tagW * Math.max(1, pets.length * 0.55 + 0.45));

  // Chain comes from the top of the card down to the tag's hole.
  // We pivot each tag around its hole so the rotation looks natural
  // (the chain stays connected) and so the chain ends exactly there.
  const chainHeight = Math.round(tagH * 0.45);
  // The hole is at cy=10 in the TAG_H=112 viewBox.
  const holeYOffset = Math.round((10 / TAG_H) * tagH);

  return (
    <div
      style={{
        position: 'absolute',
        top: topOffsetPx,
        right: anchorRightPx,
        pointerEvents: 'none',
        zIndex: 8,
        width: containerW,
        height: chainHeight + tagH + 12,
      }}
    >
      {/* Tags + per-tag V chain. With multiple pets we fan them out
          and tilt each slightly so they look like a real cluster. The
          chain forms a V (two strands) ending at the tag's hole,
          giving the "chain goes through the hole" look. */}
      {pets.map((pet, i) => {
        const offset = (i - (pets.length - 1) / 2) * tagW * 0.5;
        const rotate = pets.length === 1 ? -4 : (i - (pets.length - 1) / 2) * 7;
        const tagLeft = containerW / 2 + offset - tagW / 2;
        const tagTop = chainHeight;
        const holeX = tagLeft + tagW / 2;
        const holeY = tagTop + holeYOffset;
        return (
          <React.Fragment key={pet.id}>
            <ChainV
              holeX={holeX}
              holeY={holeY}
              spread={Math.round(tagW * 0.6)}
              containerW={containerW}
              containerH={chainHeight + tagH + 12}
            />
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); setOpenIndex(i); }}
              aria-label={`See ${pet.name}'s info`}
              style={{
                position: 'absolute',
                left: tagLeft,
                top: tagTop,
                width: tagW,
                height: tagH,
                padding: 0,
                border: 'none',
                background: 'transparent',
                cursor: 'pointer',
                pointerEvents: 'auto',
                transform: `rotate(${rotate}deg)`,
                // Pivot rotation around the chain hole so the hole stays
                // anchored to the chain regardless of tilt.
                transformOrigin: `50% ${holeYOffset}px`,
                filter: 'drop-shadow(0 6px 10px rgba(0,0,0,0.3))',
                zIndex: pets.length - i + 5, // tags above chains
                fontFamily: 'inherit',
              }}
            >
              <DogTagSvg pet={pet} width={tagW} height={tagH} />
            </button>
          </React.Fragment>
        );
      })}

      {openIndex !== null && (
        <PetCardModal
          pets={pets}
          index={openIndex}
          setIndex={setOpenIndex}
          onClose={() => setOpenIndex(null)}
        />
      )}
    </div>
  );
}

// -----------------------------------------------------------------
// One dog tag — pure SVG so it scales crisply at any size and we
// don't ship any image assets for it.
// -----------------------------------------------------------------
function DogTagSvg({ pet, width, height }: { pet: Pet; width: number; height: number }) {
  const color: TagColor = getTagColor(pet.tag_color);
  const uid = React.useId().replace(/:/g, '');

  return (
    <svg
      viewBox={`0 0 ${TAG_W} ${TAG_H}`}
      width={width}
      height={height}
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label={`${pet.name} dog tag`}
    >
      <defs>
        {/* Mitype bronze gradient — the base metal of every Mipet tag.
            Picks up the site's signature warm bronze palette so the
            tag feels native to the brand. Users still pick the bezel
            (outer ring) color separately. */}
        <linearGradient id={`metal-${uid}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor="#fff3ec" />
          <stop offset="30%"  stopColor="#f0d4a8" />
          <stop offset="55%"  stopColor="#c8956c" />
          <stop offset="80%"  stopColor="#a07452" />
          <stop offset="100%" stopColor="#6b5744" />
        </linearGradient>
        {/* Bezel gradient using the pet's chosen color. */}
        <linearGradient id={`bezel-${uid}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color.light} />
          <stop offset="100%" stopColor={color.dark} />
        </linearGradient>
        {/* Inner shadow to give the metal face depth. */}
        <radialGradient id={`shade-${uid}`} cx="50%" cy="40%" r="65%">
          <stop offset="0%" stopColor="rgba(255,255,255,0.2)" />
          <stop offset="100%" stopColor="rgba(0,0,0,0.25)" />
        </radialGradient>
        {pet.photo_url && (
          <clipPath id={`photoclip-${uid}`}>
            <circle cx={TAG_W / 2} cy={TAG_H * 0.42} r={TAG_W * 0.27} />
          </clipPath>
        )}
      </defs>

      {/* Bezel — the colored outer ring. */}
      <rect
        x="1.5" y="1.5"
        width={TAG_W - 3} height={TAG_H - 3}
        rx="14" ry="14"
        fill={`url(#bezel-${uid})`}
        stroke="rgba(0,0,0,0.35)"
        strokeWidth="1"
      />
      {/* Metal face — inset from the bezel. */}
      <rect
        x="6" y="6"
        width={TAG_W - 12} height={TAG_H - 12}
        rx="10" ry="10"
        fill={`url(#metal-${uid})`}
      />
      {/* Smooth metal — the brushed line pattern was removed so the
          face reads as a clean, polished surface. The shade radial
          alone gives it depth. */}
      <rect
        x="6" y="6"
        width={TAG_W - 12} height={TAG_H - 12}
        rx="10" ry="10"
        fill={`url(#shade-${uid})`}
      />

      {/* Hole at top for the chain. */}
      <circle cx={TAG_W / 2} cy={10} r={4.5} fill="#1a1208" />
      <circle cx={TAG_W / 2} cy={10} r={3.2} fill="#3a2e1c" />

      {/* Pet photo OR fallback initial. */}
      {pet.photo_url ? (
        <>
          <image
            href={pet.photo_url}
            x={TAG_W / 2 - TAG_W * 0.27}
            y={TAG_H * 0.42 - TAG_W * 0.27}
            width={TAG_W * 0.54}
            height={TAG_W * 0.54}
            clipPath={`url(#photoclip-${uid})`}
            preserveAspectRatio="xMidYMid slice"
          />
          <circle
            cx={TAG_W / 2}
            cy={TAG_H * 0.42}
            r={TAG_W * 0.27}
            fill="none"
            stroke={color.dark}
            strokeWidth="1.5"
          />
        </>
      ) : (
        // No photo → leave the "photo well" blank but still draw a
        // recessed circle so the tag composition stays balanced.
        <circle
          cx={TAG_W / 2}
          cy={TAG_H * 0.42}
          r={TAG_W * 0.27}
          fill="rgba(0,0,0,0.08)"
          stroke="rgba(0,0,0,0.18)"
          strokeWidth="1"
        />
      )}

      {/* Pet name — engraved across the lower portion of the tag.
          Auto-shrink the font if the name is long. */}
      <text
        x={TAG_W / 2}
        y={TAG_H * 0.82}
        textAnchor="middle"
        fontFamily="Helvetica, Arial, sans-serif"
        fontWeight="900"
        fontSize={pet.name.length > 8 ? 9 : pet.name.length > 5 ? 11 : 13}
        fill="#2a2018"
        style={{ letterSpacing: 0.5 }}
      >
        {pet.name.toUpperCase().slice(0, 12)}
      </text>
      {/* MIPET brand engraving — white on the deep-bronze portion of
          the gradient, plus a soft dark drop-shadow underneath for
          legibility against any color the user picks for the bezel. */}
      <text
        x={TAG_W / 2 + 0.5}
        y={TAG_H * 0.93 + 0.5}
        textAnchor="middle"
        fontFamily="Helvetica, Arial, sans-serif"
        fontWeight="900"
        fontSize="9"
        fill="rgba(0,0,0,0.45)"
        style={{ letterSpacing: 1.4 }}
      >
        MIPET
      </text>
      <text
        x={TAG_W / 2}
        y={TAG_H * 0.93}
        textAnchor="middle"
        fontFamily="Helvetica, Arial, sans-serif"
        fontWeight="900"
        fontSize="9"
        fill="rgba(255,248,236,0.98)"
        style={{ letterSpacing: 1.4 }}
      >
        MIPET
      </text>
    </svg>
  );
}

// V-shaped beaded chain: two strands going from the top of the
// container down to the tag's hole. Makes it look like the chain is
// threading through the hole (the way a real dog-tag chain does).
function ChainV({
  holeX,
  holeY,
  spread,
  containerW,
  containerH,
}: {
  holeX: number;
  holeY: number;
  spread: number;
  containerW: number;
  containerH: number;
}) {
  const leftTopX = Math.max(2, holeX - spread / 2);
  const rightTopX = Math.min(containerW - 2, holeX + spread / 2);
  // Number of beads per strand — scales with chain height for an
  // even, evenly-spaced look.
  const beadCount = Math.max(5, Math.round(holeY / 4.5));
  const uid = React.useId().replace(/:/g, '');

  function strand(startX: number) {
    const beads = [];
    for (let i = 0; i <= beadCount; i++) {
      const t = i / beadCount;
      const x = startX + (holeX - startX) * t;
      const y = holeY * t;
      beads.push(
        <circle
          key={i}
          cx={x}
          cy={y}
          r={2.2}
          fill={`url(#bead-${uid})`}
          stroke="rgba(0,0,0,0.45)"
          strokeWidth="0.35"
        />
      );
    }
    return beads;
  }

  return (
    <svg
      width={containerW}
      height={containerH}
      viewBox={`0 0 ${containerW} ${containerH}`}
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        pointerEvents: 'none',
      }}
    >
      <defs>
        <radialGradient id={`bead-${uid}`} cx="40%" cy="35%">
          <stop offset="0%" stopColor="#b8b9bd" />
          <stop offset="50%" stopColor="#5e6064" />
          <stop offset="100%" stopColor="#1d1f23" />
        </radialGradient>
      </defs>
      {strand(leftTopX)}
      {strand(rightTopX)}
    </svg>
  );
}

// -----------------------------------------------------------------
// Pet detail modal — opens when a tag is tapped. Includes a small
// next/prev when the user has multiple pets so visitors can browse.
// -----------------------------------------------------------------
function PetCardModal({
  pets,
  index,
  setIndex,
  onClose,
}: {
  pets: Pet[];
  index: number;
  setIndex: (i: number) => void;
  onClose: () => void;
}) {
  const pet = pets[index];
  const color = getTagColor(pet.tag_color);
  const age = calcAge(pet.birthday);

  return (
    <div
      role="dialog"
      aria-modal="true"
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.65)',
        backdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1200,
        padding: 16,
        pointerEvents: 'auto',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: 380,
          background: 'linear-gradient(180deg, #fff8ec 0%, #fff3ec 100%)',
          borderRadius: 28,
          padding: 24,
          color: '#1a1208',
          boxShadow: '0 24px 60px rgba(0,0,0,0.5)',
          fontFamily: "'Helvetica Neue', Arial, sans-serif",
          position: 'relative',
        }}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          style={{
            position: 'absolute',
            top: 14,
            right: 14,
            background: 'rgba(0,0,0,0.08)',
            border: 'none',
            color: '#1a1208',
            fontSize: 14,
            width: 30,
            height: 30,
            borderRadius: '50%',
            cursor: 'pointer',
            fontFamily: 'inherit',
          }}
        >
          ✕
        </button>

        {/* Photo + name header */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', marginBottom: 18 }}>
          <div
            style={{
              width: 120,
              height: 120,
              borderRadius: '50%',
              border: `4px solid ${color.dark}`,
              background: pet.photo_url ? `url(${pet.photo_url}) center / cover` : '#f0e8df',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 56,
              marginBottom: 12,
              boxShadow: `0 8px 24px ${color.dark}55`,
            }}
          >
            {!pet.photo_url && '🐾'}
          </div>
          <h2 style={{ margin: 0, fontSize: 26, fontWeight: 900, letterSpacing: '-0.5px' }}>
            {pet.name}
          </h2>
          <div style={{ marginTop: 4, fontSize: 14, color: '#7a6a4f' }}>
            {getPetTypeLabel(pet.pet_type)}{age ? ` · ${age}` : ''}
          </div>
        </div>

        <Field icon="🎉" label="Favorite activity" value={pet.fav_activity} />
        <Field icon="🍖" label="Favorite food"     value={pet.fav_food} />
        <Field icon="🎂" label="Birthday"          value={formatBirthday(pet.birthday)} />

        {pet.bio && (
          <div style={{
            marginTop: 14,
            padding: '14px 16px',
            background: 'white',
            border: '1px solid rgba(200,149,108,0.25)',
            borderRadius: 16,
            fontSize: 14,
            lineHeight: 1.55,
            color: '#3a2e1c',
            fontStyle: 'italic',
          }}>
            &ldquo;{pet.bio}&rdquo;
          </div>
        )}

        {pets.length > 1 && (
          <div style={{ marginTop: 18, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
            <button
              type="button"
              onClick={() => setIndex((index - 1 + pets.length) % pets.length)}
              style={navBtn}
            >
              ← Prev
            </button>
            <div style={{ fontSize: 12, color: '#7a6a4f' }}>
              {index + 1} of {pets.length}
            </div>
            <button
              type="button"
              onClick={() => setIndex((index + 1) % pets.length)}
              style={navBtn}
            >
              Next →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function Field({ icon, label, value }: { icon: string; label: string; value: string | null }) {
  if (!value) return null;
  return (
    <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start', padding: '8px 0' }}>
      <span style={{ fontSize: 18 }}>{icon}</span>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 11, fontWeight: 800, color: '#a08a6a', textTransform: 'uppercase', letterSpacing: '1px' }}>
          {label}
        </div>
        <div style={{ fontSize: 14, color: '#1a1208', marginTop: 2 }}>
          {value}
        </div>
      </div>
    </div>
  );
}

function calcAge(birthday: string | null): string | null {
  if (!birthday) return null;
  const dob = new Date(birthday);
  if (isNaN(dob.getTime())) return null;
  const now = new Date();
  let years = now.getFullYear() - dob.getFullYear();
  const m = now.getMonth() - dob.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < dob.getDate())) years--;
  if (years <= 0) {
    const months = Math.max(0, (now.getFullYear() - dob.getFullYear()) * 12 + now.getMonth() - dob.getMonth());
    if (months <= 0) return 'newborn';
    return `${months} mo`;
  }
  return years === 1 ? '1 year old' : `${years} years old`;
}

function formatBirthday(b: string | null): string | null {
  if (!b) return null;
  const d = new Date(b);
  if (isNaN(d.getTime())) return null;
  return d.toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' });
}

// Re-export the color palette so the editor can render swatches without
// re-importing from petConstants in multiple places.
export { TAG_COLORS };

const navBtn: React.CSSProperties = {
  padding: '8px 14px',
  background: 'white',
  border: '1px solid rgba(200,149,108,0.35)',
  borderRadius: 100,
  color: '#8a6240',
  fontSize: 13,
  fontWeight: 700,
  cursor: 'pointer',
  fontFamily: 'inherit',
};
