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
  topOffsetPx = -18,
}: PetTagsProps) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  if (!pets || pets.length === 0) return null;

  // Each tag scales to roughly 32-38% of the reference width so the
  // cluster never overpowers the profile photo it sits next to.
  const sizeFactor = pets.length === 1 ? 0.35 : pets.length === 2 ? 0.33 : 0.30;
  const tagW = Math.max(64, Math.round(parentWidth * sizeFactor));
  const tagH = Math.round(tagW * (TAG_H / TAG_W));

  // Width of the container that holds the fanned tags.
  const containerW = Math.round(tagW * Math.max(1, pets.length * 0.6 + 0.4));

  return (
    <div
      style={{
        position: 'absolute',
        top: topOffsetPx,
        right: anchorRightPx,
        pointerEvents: 'none',
        zIndex: 8,
        width: containerW,
        height: tagH + 80,
      }}
    >
      {/* Chain — a vertical column of beaded circles that hangs from
          above the positioning ancestor and meets the tag cluster. */}
      <BeadedChain x={containerW / 2} length={60} />

      {/* Tags fanned out from the chain end. With multiple pets we
          rotate alternating tags slightly left/right so they look like
          a real cluster of ID tags. */}
      {pets.map((pet, i) => {
        const offset = (i - (pets.length - 1) / 2) * tagW * 0.45;
        const rotate = pets.length === 1 ? -6 : (i - (pets.length - 1) / 2) * 9;
        return (
          <button
            key={pet.id}
            type="button"
            onClick={(e) => { e.stopPropagation(); setOpenIndex(i); }}
            aria-label={`See ${pet.name}'s info`}
            style={{
              position: 'absolute',
              left: `calc(50% + ${offset}px - ${tagW / 2}px)`,
              top: 55,
              width: tagW,
              height: tagH,
              padding: 0,
              border: 'none',
              background: 'transparent',
              cursor: 'pointer',
              pointerEvents: 'auto',
              transform: `rotate(${rotate}deg)`,
              transformOrigin: '50% 0',
              filter: 'drop-shadow(0 6px 10px rgba(0,0,0,0.3))',
              zIndex: pets.length - i, // first pet sits on top
              fontFamily: 'inherit',
            }}
          >
            <DogTagSvg pet={pet} width={tagW} height={tagH} />
          </button>
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
        {/* Brushed silver gradient — the "metal" of the tag face. */}
        <linearGradient id={`metal-${uid}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#f0f1f3" />
          <stop offset="45%" stopColor="#cfd1d6" />
          <stop offset="55%" stopColor="#b9bcc1" />
          <stop offset="100%" stopColor="#8a8d92" />
        </linearGradient>
        {/* Subtle brushed-line texture overlay. */}
        <pattern id={`brushed-${uid}`} width="3" height="3" patternUnits="userSpaceOnUse">
          <rect width="3" height="3" fill="transparent" />
          <line x1="0" y1="0" x2="3" y2="0" stroke="rgba(255,255,255,0.18)" strokeWidth="1" />
        </pattern>
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
      <rect
        x="6" y="6"
        width={TAG_W - 12} height={TAG_H - 12}
        rx="10" ry="10"
        fill={`url(#brushed-${uid})`}
        opacity="0.7"
      />
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
      <text
        x={TAG_W / 2}
        y={TAG_H * 0.92}
        textAnchor="middle"
        fontFamily="Helvetica, Arial, sans-serif"
        fontWeight="600"
        fontSize="6.5"
        fill="rgba(40,30,20,0.55)"
        style={{ letterSpacing: 1 }}
      >
        MITYPE
      </text>
    </svg>
  );
}

// Vertical beaded chain. Drawn as a column of small dark spheres so
// it reads as a real chain rather than a flat line.
function BeadedChain({ x, length }: { x: number; length: number }) {
  const beadCount = Math.max(3, Math.round(length / 6));
  const beads = Array.from({ length: beadCount }, (_, i) => i);
  return (
    <svg
      width={20}
      height={length + 10}
      style={{
        position: 'absolute',
        top: 0,
        left: x - 10,
        pointerEvents: 'none',
      }}
    >
      <defs>
        <radialGradient id="bead-grad" cx="40%" cy="35%">
          <stop offset="0%" stopColor="#b8b9bd" />
          <stop offset="50%" stopColor="#5e6064" />
          <stop offset="100%" stopColor="#1d1f23" />
        </radialGradient>
      </defs>
      {beads.map((b) => (
        <circle
          key={b}
          cx={10}
          cy={4 + b * (length / beadCount)}
          r={3.3}
          fill="url(#bead-grad)"
          stroke="rgba(0,0,0,0.45)"
          strokeWidth="0.4"
        />
      ))}
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
