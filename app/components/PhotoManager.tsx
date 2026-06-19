'use client';
// Photo manager for the edit-profile screen.
// - Upload up to MAX_PHOTOS (6) images.
// - Reorder via up/down buttons. Index 0 is the primary photo and is what
//   gets mirrored back into `avatar_url` on save.
// - Remove a photo.
// Storage: reuses the existing `avatars` bucket so RLS policies and
// CDN config don't need to change.

import { useState } from 'react';
import Image from 'next/image';
import { supabase } from '../lib/supabaseClient';
import { toast } from '../lib/toast';
import { MAX_PHOTOS, type ProfilePhoto } from '../lib/photos';
import { PhotoEditor } from './PhotoEditor';

interface PhotoManagerProps {
  userId: string;
  photos: ProfilePhoto[];
  onChange: (photos: ProfilePhoto[]) => void;
}

export function PhotoManager({ userId, photos, onChange }: PhotoManagerProps) {
  const [uploading, setUploading] = useState(false);
  // Editor state — we route every new file (and every "Edit" tap on an
  // existing photo) through the PhotoEditor first. Only on Save does the
  // resulting Blob actually upload to Supabase.
  const [editorFile, setEditorFile] = useState<File | null>(null);
  const [editorImageUrl, setEditorImageUrl] = useState<string | null>(null);
  // When re-editing an existing photo we track its index so we can
  // splice the new URL into the same slot.
  const [editingIndex, setEditingIndex] = useState<number | null>(null);

  function handlePickFiles(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    if (photos.length >= MAX_PHOTOS) {
      toast.info(`You can upload up to ${MAX_PHOTOS} photos.`);
      e.target.value = '';
      return;
    }
    const file = files[0]; // editor handles one at a time
    if (!file.type.startsWith('image/')) {
      toast.error('Pick an image file.');
      e.target.value = '';
      return;
    }
    if (file.size > 12 * 1024 * 1024) {
      toast.error('Pick an image under 12 MB.');
      e.target.value = '';
      return;
    }
    setEditorFile(file);
    setEditorImageUrl(null);
    setEditingIndex(null);
    e.target.value = '';
  }

  // Open the editor on an already-uploaded photo so the user can adjust
  // crop, filters, beauty, etc. and replace it in place.
  function openEditorForExisting(i: number) {
    if (!photos[i]) return;
    setEditorImageUrl(photos[i].url);
    setEditorFile(null);
    setEditingIndex(i);
  }

  // Upload the edited Blob to Supabase and patch the photos array.
  async function handleEditorSave(blob: Blob) {
    setUploading(true);
    try {
      const version = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      const path = `${userId}/photo-${version}.jpg`;
      const { error: upErr } = await supabase.storage
        .from('avatars')
        .upload(path, blob, {
          upsert: false,
          contentType: 'image/jpeg',
        });
      if (upErr) {
        toast.error(upErr.message);
        return;
      }
      const { data } = supabase.storage.from('avatars').getPublicUrl(path);

      if (editingIndex !== null) {
        const next = photos.slice();
        next[editingIndex] = { url: data.publicUrl };
        onChange(next);
        toast.success('Photo updated');
      } else {
        onChange([...photos, { url: data.publicUrl }]);
        toast.success('Photo added');
      }
    } finally {
      setUploading(false);
      setEditorFile(null);
      setEditorImageUrl(null);
      setEditingIndex(null);
    }
  }

  function handleEditorCancel() {
    setEditorFile(null);
    setEditorImageUrl(null);
    setEditingIndex(null);
  }

  function move(index: number, dir: -1 | 1) {
    const target = index + dir;
    if (target < 0 || target >= photos.length) return;
    const next = [...photos];
    [next[index], next[target]] = [next[target], next[index]];
    onChange(next);
  }

  function remove(index: number) {
    const next = photos.filter((_, i) => i !== index);
    onChange(next);
  }

  return (
    <div style={{ marginBottom: 32 }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 8,
        }}
      >
        <div>
          <label
            style={{
              display: 'block',
              fontSize: 13,
              fontWeight: 700,
              color: '#6b5744',
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
            }}
          >
            Photos
          </label>
          <p style={{ color: '#b0967e', fontSize: 13, marginTop: 4 }}>
            Up to {MAX_PHOTOS}. The first photo is your main profile picture.
          </p>
        </div>
        <label
          style={{
            padding: '8px 18px',
            background: photos.length >= MAX_PHOTOS ? '#d4a882' : '#c8956c',
            color: 'white',
            border: 'none',
            borderRadius: 100,
            fontSize: 13,
            fontWeight: 700,
            cursor: photos.length >= MAX_PHOTOS || uploading ? 'not-allowed' : 'pointer',
            flexShrink: 0,
          }}
        >
          {uploading ? 'Uploading…' : '+ Add Photo'}
          <input
            type="file"
            accept="image/*"
            onChange={handlePickFiles}
            disabled={photos.length >= MAX_PHOTOS || uploading}
            style={{ display: 'none' }}
          />
        </label>
      </div>

      {photos.length === 0 ? (
        <div
          style={{
            background: 'white',
            border: '1px dashed rgba(200,149,108,0.3)',
            borderRadius: 16,
            padding: '32px',
            textAlign: 'center',
            color: '#a89278',
            marginTop: 16,
          }}
        >
          <div style={{ fontSize: 32, marginBottom: 8 }}>📷</div>
          <p style={{ fontSize: 14 }}>No photos yet.</p>
          <p style={{ fontSize: 13, marginTop: 4 }}>
            Add a few photos so people can get a feel for you.
          </p>
        </div>
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
            gap: 12,
            marginTop: 16,
          }}
        >
          {photos.map((p, i) => (
            <div
              key={`${p.url}-${i}`}
              style={{
                background: 'white',
                border:
                  i === 0
                    ? '2px solid #c8956c'
                    : '1px solid rgba(200,149,108,0.2)',
                borderRadius: 14,
                overflow: 'hidden',
                position: 'relative',
              }}
            >
              <div
                style={{
                  position: 'relative',
                  width: '100%',
                  aspectRatio: '3/4',
                  background: '#f0e8df',
                }}
              >
                <Image
                  src={p.url}
                  alt={`Photo ${i + 1}`}
                  fill
                  sizes="(max-width: 700px) 50vw, 200px"
                  style={{ objectFit: 'cover' }}
                />
                {i === 0 && (
                  <span
                    style={{
                      position: 'absolute',
                      top: 8,
                      left: 8,
                      background: '#c8956c',
                      color: 'white',
                      fontSize: 10,
                      fontWeight: 800,
                      letterSpacing: '0.5px',
                      padding: '4px 8px',
                      borderRadius: 100,
                      textTransform: 'uppercase',
                    }}
                  >
                    Main
                  </span>
                )}
              </div>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '8px 10px',
                  gap: 4,
                }}
              >
                <div style={{ display: 'flex', gap: 4 }}>
                  <button
                    type="button"
                    onClick={() => move(i, -1)}
                    disabled={i === 0}
                    aria-label="Move up"
                    style={{
                      padding: '4px 8px',
                      background: i === 0 ? '#f5f0e8' : '#faf6f0',
                      border: '1px solid rgba(200,149,108,0.25)',
                      borderRadius: 8,
                      color: i === 0 ? '#cbb9a4' : '#6b5744',
                      fontSize: 13,
                      fontWeight: 700,
                      cursor: i === 0 ? 'not-allowed' : 'pointer',
                    }}
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    onClick={() => move(i, 1)}
                    disabled={i === photos.length - 1}
                    aria-label="Move down"
                    style={{
                      padding: '4px 8px',
                      background: i === photos.length - 1 ? '#f5f0e8' : '#faf6f0',
                      border: '1px solid rgba(200,149,108,0.25)',
                      borderRadius: 8,
                      color: i === photos.length - 1 ? '#cbb9a4' : '#6b5744',
                      fontSize: 13,
                      fontWeight: 700,
                      cursor: i === photos.length - 1 ? 'not-allowed' : 'pointer',
                    }}
                  >
                    ↓
                  </button>
                </div>
                <div style={{ display: 'flex', gap: 4 }}>
                  <button
                    type="button"
                    onClick={() => openEditorForExisting(i)}
                    aria-label={`Edit photo ${i + 1}`}
                    style={{
                      padding: '4px 10px',
                      background: '#fff8ec',
                      border: '1px solid rgba(200,149,108,0.3)',
                      borderRadius: 8,
                      color: '#8a6240',
                      fontSize: 12,
                      fontWeight: 700,
                      cursor: 'pointer',
                    }}
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => remove(i)}
                    aria-label={`Remove photo ${i + 1}`}
                    style={{
                      padding: '4px 10px',
                      background: '#fff0f0',
                      border: '1px solid rgba(220,100,100,0.2)',
                      borderRadius: 8,
                      color: '#c07070',
                      fontSize: 12,
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    Remove
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Full-bleed editor — mounted whenever a new file is picked or an
          existing photo is being re-edited. On Save we upload the baked
          Blob and patch the photos array. */}
      {(editorFile || editorImageUrl) && (
        <PhotoEditor
          file={editorFile}
          imageUrl={editorImageUrl ?? undefined}
          initialAspect={
            // The first photo is the avatar → square. Everything else
            // defaults to 3:4 to match the gallery card aspect.
            editingIndex === 0 || (editingIndex === null && photos.length === 0)
              ? '1:1'
              : '3:4'
          }
          onSave={handleEditorSave}
          onCancel={handleEditorCancel}
        />
      )}
    </div>
  );
}
