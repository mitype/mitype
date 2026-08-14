'use client';
// /projects/[id] — Individual project room with task list.

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '../../lib/supabaseClient';
import { SiteNav } from '../../components/SiteNav';
import { toast } from '../../lib/toast';
import { liquidGlass } from '../../lib/liquidGlass';

interface ProjectDetail {
  id: string; created_by: string; title: string; description: string | null;
  participant_ids: string[]; deadline: string | null; status: string;
}
interface Task { id: string; title: string; done: boolean; created_by: string; }
interface Participant { user_id: string; username: string; avatar_url: string | null; }

export default function ProjectRoomPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = React.use(params);
  const router = useRouter();
  const [userId, setUserId] = useState<string | null>(null);
  const [project, setProject] = useState<ProjectDetail | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [newTask, setNewTask] = useState('');
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.replace('/login'); return; }
      setUserId(user.id);
      const { data: p } = await supabase.from('project_rooms').select('*').eq('id', id).maybeSingle();
      if (!p) { setLoading(false); return; }
      setProject(p);
      const [pplRes, tRes] = await Promise.all([
        supabase.from('profiles').select('user_id, username, avatar_url').in('user_id', p.participant_ids),
        supabase.from('project_room_tasks').select('id, title, done, created_by').eq('project_id', p.id).order('created_at', { ascending: true }),
      ]);
      setParticipants(pplRes.data ?? []);
      setTasks(tRes.data ?? []);
      setLoading(false);
    })();
  }, [id, router]);

  async function addTask() {
    if (!project || !userId || !newTask.trim()) return;
    setBusy(true);
    const { data, error } = await supabase.from('project_room_tasks').insert({
      project_id: project.id, title: newTask.trim(), created_by: userId,
    }).select('id, title, done, created_by').single();
    setBusy(false);
    if (error || !data) { toast.error(error?.message || 'Could not add task.'); return; }
    setTasks([...tasks, data]);
    setNewTask('');
  }

  async function toggleTask(t: Task) {
    const { error } = await supabase.from('project_room_tasks').update({ done: !t.done }).eq('id', t.id);
    if (error) { toast.error(error.message); return; }
    setTasks(tasks.map((x) => x.id === t.id ? { ...x, done: !t.done } : x));
  }

  async function deleteTask(t: Task) {
    const { error } = await supabase.from('project_room_tasks').delete().eq('id', t.id);
    if (error) { toast.error(error.message); return; }
    setTasks(tasks.filter((x) => x.id !== t.id));
  }

  if (loading) return <main style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--brand-personal-bg-cream)' }}><p style={{ color: 'var(--brand-personal)' }}>Loading...</p></main>;
  if (!project) return (
    <main style={{ minHeight: '100vh', background: 'var(--brand-personal-bg-cream)', fontFamily: "'Helvetica Neue', Arial, sans-serif" }}>
      <SiteNav userId={userId ?? undefined} showBack backFallbackHref="/projects" />
      <div style={{ maxWidth: 640, margin: '0 auto', padding: '40px 20px', textAlign: 'center' }}>
        <h1 style={{ fontSize: 24, marginBottom: 8 }}>Project not found</h1>
        <Link href="/projects" style={{ ...liquidGlass({ tone: 'warm' }), display: 'inline-block', padding: '10px 22px', color: 'var(--brand-text-primary)', fontSize: 14, fontWeight: 800, textDecoration: 'none' }}>Back to Projects</Link>
      </div>
    </main>
  );

  const doneCount = tasks.filter((t) => t.done).length;

  return (
    <main style={{ minHeight: '100vh', background: 'linear-gradient(180deg, var(--brand-personal-bg-cream) 0%, var(--brand-personal-bg-cream-deep) 100%)', fontFamily: "'Helvetica Neue', Arial, sans-serif", paddingBottom: 80 }}>
      <SiteNav userId={userId ?? undefined} showBack backFallbackHref="/projects" />
      <div style={{ maxWidth: 720, margin: '0 auto', padding: '24px 20px' }}>
        <p style={{ fontSize: 12, fontWeight: 800, color: 'var(--brand-personal)', textTransform: 'uppercase', letterSpacing: '1.4px', marginBottom: 6 }}>Project room</p>
        <h1 style={{ fontSize: 28, fontWeight: 900, color: 'var(--brand-text-primary)', letterSpacing: '-0.6px', marginBottom: 8 }}>{project.title}</h1>
        {project.description && <p style={{ color: 'var(--brand-personal-text-mid)', fontSize: 14, lineHeight: 1.5, marginBottom: 12 }}>{project.description}</p>}
        {project.deadline && <p style={{ fontSize: 13, color: 'var(--brand-personal)', fontWeight: 700, marginBottom: 12 }}>Deadline: {new Date(project.deadline).toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' })}</p>}

        {/* Participants */}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 20 }}>
          {participants.map((p) => (
            <Link key={p.user_id} href={`/profile/${p.username}`}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 10px 4px 4px', background: 'white', border: '1px solid rgba(200,149,108,0.25)', borderRadius: 100, textDecoration: 'none', color: 'var(--brand-text-primary)', fontSize: 13, fontWeight: 700 }}>
              <span style={{ width: 22, height: 22, borderRadius: '50%', background: 'var(--brand-personal-bg-pale)', overflow: 'hidden', display: 'inline-block' }}>
                {p.avatar_url && <img src={p.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
              </span>
              @{p.username}
            </Link>
          ))}
        </div>

        {/* Tasks */}
        <div style={{ background: 'white', border: '1px solid rgba(200,149,108,0.2)', borderRadius: 20, padding: '20px 22px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <h2 style={{ fontSize: 14, fontWeight: 800, color: 'var(--brand-personal-text-light)', textTransform: 'uppercase', letterSpacing: '1px', margin: 0 }}>Tasks</h2>
            <span style={{ fontSize: 12, color: 'var(--brand-personal-text-light)', fontWeight: 600 }}>{doneCount} / {tasks.length} done</span>
          </div>
          {tasks.length === 0 && <p style={{ color: 'var(--brand-personal-text-light)', fontSize: 13, marginBottom: 12 }}>No tasks yet. Add the first one below.</p>}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 14 }}>
            {tasks.map((t) => (
              <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', background: t.done ? 'rgba(22,163,74,0.05)' : 'transparent', border: '1px solid rgba(200,149,108,0.15)', borderRadius: 10 }}>
                <input type="checkbox" checked={t.done} onChange={() => toggleTask(t)} style={{ width: 18, height: 18, cursor: 'pointer' }} />
                <span style={{ flex: 1, fontSize: 14, color: 'var(--brand-text-primary)', textDecoration: t.done ? 'line-through' : 'none', opacity: t.done ? 0.6 : 1 }}>{t.title}</span>
                <button type="button" onClick={() => deleteTask(t)} aria-label="Delete task"
                  style={{ background: 'transparent', border: 'none', color: 'var(--brand-personal-text-light)', fontSize: 16, cursor: 'pointer', padding: 2 }}>×</button>
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <input value={newTask} onChange={(e) => setNewTask(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') addTask(); }} placeholder="Add a task"
              style={{ flex: 1, padding: '10px 12px', border: '1px solid rgba(200,149,108,0.28)', borderRadius: 10, fontSize: 15, fontFamily: 'inherit', outline: 'none' }} />
            <button type="button" onClick={addTask} disabled={busy || !newTask.trim()}
              style={{ ...liquidGlass({ tone: 'warm' }), padding: '10px 20px', color: 'var(--brand-text-primary)', fontSize: 14, fontWeight: 800, cursor: busy ? 'wait' : 'pointer', opacity: busy || !newTask.trim() ? 0.6 : 1, fontFamily: 'inherit' }}>Add</button>
          </div>
        </div>
      </div>
    </main>
  );
}
