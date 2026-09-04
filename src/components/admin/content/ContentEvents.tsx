import { useCallback, useEffect, useState } from 'react';
import { api } from '../../../lib/api';
import { useContent } from '../../../lib/ContentContext';

interface Row {
  id: number;
  title: string;
  date_label: string;
  time: string;
  venue: string;
  excerpt: string;
  status: 'upcoming' | 'past';
}

const blank = { title: '', date_label: '', time: '', venue: '', excerpt: '', status: 'upcoming' as const };

export default function ContentEvents() {
  const { refresh } = useContent();
  const [rows, setRows] = useState<Row[]>([]);
  const [form, setForm] = useState<Row>({ ...blank, id: 0 });
  const [editing, setEditing] = useState(false);
  const [err, setErr] = useState('');

  const load = useCallback(async () => {
    const res = await api<{ events: Row[] }>('/api/admin/content/events');
    setRows(res.events);
  }, []);
  useEffect(() => { load().catch((e: unknown) => setErr(e instanceof Error ? e.message : String(e))); }, [load]);

  const save = async () => {
    setErr('');
    if (!form.title.trim()) return setErr('Title is required.');
    try {
      const body = { title: form.title, date_label: form.date_label, time: form.time, venue: form.venue, excerpt: form.excerpt, status: form.status };
      if (form.id) await api(`/api/admin/content/events/${form.id}`, { method: 'PATCH', body: JSON.stringify(body) });
      else await api('/api/admin/content/events', { method: 'POST', body: JSON.stringify(body) });
      setForm({ ...blank, id: 0 });
      setEditing(false);
      await load();
      await refresh();
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Save failed.');
    }
  };

  const del = async (r: Row) => {
    if (!confirm(`Delete event "${r.title}"?`)) return;
    await api(`/api/admin/content/events/${r.id}`, { method: 'DELETE' });
    await load();
    await refresh();
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h3 className="font-bold text-slate-900">Events ({rows.length})</h3>
        <button className="btn btn-md btn-primary" onClick={() => { setForm({ ...blank, id: 0 }); setEditing(true); }}>+ New event</button>
      </div>

      {editing && (
        <div className="card p-6">
          <h4 className="font-bold text-slate-900">{form.id ? 'Edit event' : 'New event'}</h4>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2"><label className="label">Title</label><input className="input" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></div>
            <div><label className="label">When (label, e.g. “December 2026”)</label><input className="input" value={form.date_label} onChange={(e) => setForm({ ...form, date_label: e.target.value })} /></div>
            <div><label className="label">Time</label><input className="input" value={form.time} onChange={(e) => setForm({ ...form, time: e.target.value })} /></div>
            <div><label className="label">Venue</label><input className="input" value={form.venue} onChange={(e) => setForm({ ...form, venue: e.target.value })} /></div>
            <div>
              <label className="label">Status</label>
              <select className="input" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as 'upcoming' | 'past' })}>
                <option value="upcoming">Upcoming</option>
                <option value="past">Past</option>
              </select>
            </div>
            <div className="sm:col-span-2"><label className="label">Short description</label><textarea className="input resize-y" rows={2} value={form.excerpt} onChange={(e) => setForm({ ...form, excerpt: e.target.value })} /></div>
          </div>
          {err && <p className="mt-3 text-sm text-rose-700">{err}</p>}
          <div className="mt-4 flex gap-2">
            <button className="btn btn-md btn-primary" onClick={save}>Save</button>
            <button className="btn btn-md btn-outline" onClick={() => { setEditing(false); setForm({ ...blank, id: 0 }); setErr(''); }}>Cancel</button>
          </div>
        </div>
      )}

      <div className="card divide-y divide-slate-100">
        {rows.map((r) => (
          <div key={r.id} className="flex items-start justify-between gap-3 p-4">
            <div className="min-w-0">
              <p className="font-bold text-slate-900">{r.title}</p>
              <p className="mt-0.5 text-xs text-slate-500">{r.date_label} · {r.time} · {r.venue}</p>
              <p className="mt-1 line-clamp-1 text-xs text-slate-400">{r.excerpt}</p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <span className={`chip ${r.status === 'upcoming' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>{r.status}</span>
              <button className="btn btn-md btn-outline" onClick={() => { setForm({ ...r }); setEditing(true); }}>Edit</button>
              <button className="btn btn-md btn-outline !text-rose-600" onClick={() => del(r)}>Delete</button>
            </div>
          </div>
        ))}
        {rows.length === 0 && <p className="p-8 text-center text-sm text-slate-400">No events yet.</p>}
      </div>
    </div>
  );
}
