'use client';
// /wave/create — post a new video to The Wave.
//
// Flow:
//   1. User picks a video file from their device.
//   2. We probe it client-side for duration / dimensions / size.
//   3. We request a signed upload URL from /api/wave/upload-url (which
//      also enforces the daily post limit).
//   4. We upload directly to Supabase storage via the signed URL.
//   5. We call /api/wave/finalize to create the wave_videos row.
//   6. Redirect to /wave on success.

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '../../lib/supabaseClient';
import { toast } from '../../lib/toast';

const MAX_DURATION = 60; // seconds
const MAX_SIZE_MB = 60;

export default function WaveCreatePage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [user, setUser] = useState<any>(null);
  const [myCategories, setMyCategories] = useState<string[]>([]);
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [duration, setDuration] = useState<number | null>(null);
  const [dims, setDims] = useState<{ w: number; h: number } | null>(null);
  const [caption, setCaption] = useState('');
  const [category, setCategory] = useState<string>('');
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }
      setUser(user);
      const { data: profile } = await supabase
        .from('profiles')
        .select('categories')
        .eq('user_id', user.id)
        .maybeSingle();
      setMyCategories(profile?.categories ?? []);
      if (profile?.categories?.length) {
        setCategory(profile.categories[0]);
      }
    })();
  }, [router]);

  function pickFile() {
    fileInputRef.current?.click();
  }

  async function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;

    if (!f.type.startsWith('video/')) {
      toast.error('Please pick a video file');
      return;
    }
    if (f.size > MAX_SIZE_MB * 1024 * 1024) {
      toast.error(`Video must be under ${MAX_SIZE_MB}MB`);
      return;
    }

    // Probe duration + dimensions with a hidden <video>.
    const url = URL.createObjectURL(f);
    const probe = document.createElement('video');
    probe.preload = 'metadata';
    probe.src = url;
    const ok: boolean = await new Promise((resolve) => {
      probe.onloadedmetadata = () => {
        if (probe.duration > MAX_DURATION + 0.5) {
          toast.error(`Video must be ${MAX_DURATION} seconds or shorter`);
          URL.revokeObjectURL(url);
          resolve(false);
          return;
        }
        setDuration(Math.round(probe.duration));
        setDims({ w: probe.videoWidth, h: probe.videoHeight });
        resolve(true);
      };
      probe.onerror = () => {
        toast.error("Couldn't read that video");
        URL.revokeObjectURL(url);
        resolve(false);
      };
    });
    if (!ok) return;
    setFile(f);
    setPreviewUrl(url);
  }

  async function handlePost() {
    if (!file || !user) return;
    setUploading(true);
    setProgress(0);

    try {
      const { data: sess } = await supabase.auth.getSession();
      const token = sess.session?.access_token;
      if (!token) throw new Error('Not signed in');

      // 1. Request a signed upload URL.
      const urlRes = await fetch('/api/wave/upload-url', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      const urlJson = await urlRes.json();
      if (!urlRes.ok) {
        throw new Error(urlJson.error ?? 'Could not start upload');
      }

      // 2. Upload directly to Supabase storage via XHR (for progress events).
      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open('PUT', urlJson.uploadUrl);
        xhr.setRequestHeader('Content-Type', file.type || 'video/mp4');
        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable) {
            setProgress(Math.round((e.loaded / e.total) * 100));
          }
        };
        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) resolve();
          else reject(new Error(`Upload failed (${xhr.status})`));
        };
        xhr.onerror = () => reject(new Error('Upload error'));
        xhr.send(file);
      });

      // 3. Finalize the record.
      const finalRes = await fetch('/api/wave/finalize', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          storagePath: urlJson.path,
          caption: caption.trim() || null,
          category: category || null,
          durationSeconds: duration,
          width: dims?.w ?? null,
          height: dims?.h ?? null,
        }),
      });
      const finalJson = await finalRes.json();
      if (!finalRes.ok) {
        throw new Error(finalJson.error ?? 'Could not save video');
      }

      toast.success('Posted to The Wave!');
      router.push('/wave');
    } catch (err: any) {
      console.error('[wave/create] post error:', err);
      toast.error(err.message ?? 'Could not post video');
      setUploading(false);
    }
  }

  return (
    <main
      style={{
        minHeight: '100vh',
        background: 'linear-gradient(180deg, #faf6f0 0%, #f5f0e8 100%)',
        fontFamily: "'Helvetica Neue', Arial, sans-serif",
        padding: '24px 20px 80px',
      }}
    >
      <nav
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 20,
        }}
      >
        <Link
          href="/wave"
          style={{ color: '#8a7560', textDecoration: 'none', fontSize: 22, fontWeight: 700 }}
          aria-label="Back to The Wave"
        >
          ←
        </Link>
        <div style={{ fontSize: 18, fontWeight: 800, color: '#1a1208' }}>Post to The Wave</div>
        <div style={{ width: 24 }} />
      </nav>

      {/* Preview / picker */}
      <div
        style={{
          background: 'white',
          borderRadius: 24,
          padding: 18,
          border: '1px solid rgba(200,149,108,0.2)',
          marginBottom: 20,
          boxShadow: '0 8px 24px rgba(200,149,108,0.08)',
        }}
      >
        {previewUrl ? (
          <div style={{ position: 'relative' }}>
            <video
              src={previewUrl}
              controls
              playsInline
              style={{
                width: '100%',
                borderRadius: 16,
                background: '#000',
                maxHeight: 420,
              }}
            />
            <button
              type="button"
              onClick={() => {
                if (previewUrl) URL.revokeObjectURL(previewUrl);
                setFile(null);
                setPreviewUrl(null);
                setDuration(null);
                setDims(null);
              }}
              disabled={uploading}
              style={{
                marginTop: 10,
                background: 'transparent',
                border: 'none',
                color: '#c8956c',
                fontSize: 14,
                fontWeight: 700,
                cursor: 'pointer',
                fontFamily: 'inherit',
              }}
            >
              Choose a different video
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={pickFile}
            style={{
              width: '100%',
              padding: '60px 20px',
              background: 'rgba(200,149,108,0.08)',
              border: '2px dashed rgba(200,149,108,0.35)',
              borderRadius: 16,
              cursor: 'pointer',
              fontFamily: 'inherit',
              color: '#6b5744',
            }}
          >
            <div style={{ fontSize: 42, marginBottom: 10 }}>📹</div>
            <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 6 }}>
              Pick a video to post
            </div>
            <div style={{ fontSize: 13, color: '#8a7560' }}>
              Under 60 seconds. Under {MAX_SIZE_MB}MB. Vertical (9:16) looks best.
            </div>
          </button>
        )}
        <input
          ref={fileInputRef}
          type="file"
          accept="video/*"
          capture="user"
          onChange={onFileChange}
          style={{ display: 'none' }}
        />
      </div>

      {/* Caption + category */}
      {file && (
        <>
          <div
            style={{
              background: 'white',
              borderRadius: 24,
              padding: 18,
              border: '1px solid rgba(200,149,108,0.2)',
              marginBottom: 16,
            }}
          >
            <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: '#6b5744', marginBottom: 8 }}>
              Caption (optional)
            </label>
            <textarea
              value={caption}
              onChange={(e) => setCaption(e.target.value.slice(0, 280))}
              placeholder="What are you sharing?"
              rows={3}
              style={{
                width: '100%',
                padding: 12,
                border: '1px solid rgba(200,149,108,0.25)',
                borderRadius: 12,
                fontFamily: 'inherit',
                fontSize: 15,
                color: '#1a1208',
                background: '#faf6f0',
                outline: 'none',
                resize: 'vertical',
                boxSizing: 'border-box',
              }}
            />
            <div style={{ textAlign: 'right', fontSize: 12, color: '#a89278', marginTop: 4 }}>
              {caption.length}/280
            </div>
          </div>

          {myCategories.length > 0 && (
            <div
              style={{
                background: 'white',
                borderRadius: 24,
                padding: 18,
                border: '1px solid rgba(200,149,108,0.2)',
                marginBottom: 20,
              }}
            >
              <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: '#6b5744', marginBottom: 10 }}>
                Tag a category
              </label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {myCategories.map((cat) => {
                  const selected = cat === category;
                  return (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setCategory(cat)}
                      style={{
                        background: selected ? '#c8956c' : 'white',
                        border: `1px solid ${selected ? '#c8956c' : 'rgba(200,149,108,0.3)'}`,
                        color: selected ? 'white' : '#6b5744',
                        padding: '8px 14px',
                        borderRadius: 100,
                        fontSize: 13,
                        fontWeight: 600,
                        cursor: 'pointer',
                        fontFamily: 'inherit',
                      }}
                    >
                      {cat}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Submit */}
          <button
            type="button"
            onClick={handlePost}
            disabled={uploading}
            style={{
              width: '100%',
              padding: '17px',
              background: uploading ? '#d4a882' : '#c8956c',
              color: 'white',
              border: 'none',
              borderRadius: 100,
              fontSize: 17,
              fontWeight: 700,
              cursor: uploading ? 'not-allowed' : 'pointer',
              boxShadow: '0 8px 24px rgba(200,149,108,0.3)',
              fontFamily: 'inherit',
            }}
          >
            {uploading ? `Posting… ${progress}%` : 'Post to The Wave'}
          </button>

          <p style={{ textAlign: 'center', color: '#a89278', fontSize: 12, marginTop: 12 }}>
            Your video will be visible on The Wave for 24 hours.
          </p>
        </>
      )}
    </main>
  );
}
