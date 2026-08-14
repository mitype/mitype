'use client';
// /projects/new — Create a new project room with a collaborator.

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../lib/supabaseClient';
import { SiteNav } from '../../components/SiteNav';
import { toast } from '../../lib/toast';
import { liquidGlass } from '../../lib/liquidGlass';

const inputStyle: React.CSSProperties = { width: '100%', padding: '11px 14px', border: '1px solid rgba(200,149,108,0.28)', borderRadius: 12, fontSize: 16, fontFamily: 'inherit', color: 'var(--brand-text-primary)', outline: 'none', background: 'white', boxSizing: 'border-box' };
const labelStyle: React.CSSProperties = { display: 'block', fontSize: 13, fontWeight: 800, color: 'var(--brand-text-primary)', marginBottom: 6 };

export default function NewProjectRoomPage() {
  const router = useRouter();
  const [userId, setUserId] = useState<string | null>(null);
  const [gate, setGate] = useState<'checking' | 'ok'>('checking');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [collaborator, setCollaborator] = useState('');
  const [deadline, setDeadline] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.replace('/login'); return; }
      setUserId(user.id);
      const { data: sub } = await supabase.from('subscriptions').select('status').eq('user_id', user.id).maybeSingle();
      const s = sub?.status;
      if (s !== 'active' && s !== 'trialing') {
        toast.error('Subscribe to start project rooms.');
        router.replace('/subscription');
        return;
      }
      setGate('ok');
    })();
  }, [router]);

  async function save() {
    if (!userId) return;
    if (title.trim().length < 3) { toast.error('Title needs 3+ characters.'); return; }
    const collabHandle = collaborator.trim().replace(/^@/, '');
    if (!collabHandle) { toast.error('Add a collaborator by username.'); return; }
    setSaving(true);
    const { data: other, error: findErr } = await supabase.from('profiles').select('user_id').eq('username', collabHandle.toLowerCase()).maybeSingle();
    if (findErr || !other?.user_id) { toast.error(`No user @${collabHandle}.`); setSaving(false); return; }
    if (other.user_id === userId) { toast.error("You can't collaborate with yourself."); setSaving(false); return; }
    const participantIds = [userId, other.user_id];
    const { data, error } = await supabase.from('project_rooms').insert({
      created_by: userId, title: title.trim(),
      description: description.trim() || null,
      participant_ids: participantIds,
      deadline: deadline ? new Date(deadline).toISOString() : null,
    }).select('id').single();
    setSaving(false);
    if (error || !data?.id) { toast.error(error?.message || 'Could not create.'); return; }
    toast.success('Project room created.');
    router.push(`/projects/${data.id}`);
  }

  if (gate === 'checking') return <main style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--brand-personal-bg-cream)' }}><p style={{ color: 'var(--brand-personal)' }}>Loading...</p></main>;

  return (
    <main style={{ minHeight: '100vh', background: 'linear-gradient(180deg, var(--brand-personal-bg-cream) 0%, var(--brand-personal-bg-cream-deep) 100%)', fontFamily: "'Helvetica Neue', Arial, sans-serif", paddingBottom: 80 }}>
      <SiteNav userId={userId ?? undefined} showBack backFallbackHref="/projects" />
      <div style={{ maxWidth: 560, margin: '0 auto', padding: '24px 20px' }}>
        <h1 style={{ fontSize: 28, fontWeight: 900, color: 'var(--brand-text-primary)', letterSpacing: '-0.6px', marginBottom: 16 }}>Start a project room</h1>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          <div><label style={labelStyle}>Project title</label><input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Album cover artwork" style={inputStyle} /></div>
          <div><label style={labelStyle}>Description (optional)</label><textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} placeholder="What you are building together" style={{ ...inputStyle, resize: 'vertical' }} /></div>
          <div><label style={labelStyle}>Collaborator username</label><input value={collaborator} onChange={(e) => setCollaborator(e.target.value)} placeholder="@theircreators" style={inputStyle} /></div>
          <div><label style={labelStyle}>Deadline (optional)</label><input type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} style={inputStyle} /></div>
          <button type="button" onClick={save} disabled={saving}
            style={{ ...liquidGlass({ tone: 'warm' }), width: '100%', padding: '14px 22px', color: 'var(--brand-text-primary)', fontSize: 15, fontWeight: 800, cursor: saving ? 'wait' : 'pointer', opacity: saving ? 0.6 : 1, fontFamily: 'inherit' }}>
            {saving ? 'Creating...' : 'Create room'}
          </button>
        </div>
      </div>
    </main>
  );
}
