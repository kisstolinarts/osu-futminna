import { useCallback, useEffect, useState } from 'react';
import { api } from '../../../lib/api';
import { useContent } from '../../../lib/ContentContext';

const CATEGORIES = ['Union News', 'Membership', 'Election', 'Events', 'General'];

interface Row extends Record<string, string | number | null> {
  id: number;
  title: string;
  category: string;
  excerpt: string;
  body: string;
  author: string;
  date_label: string;
  image: string | null;
  published: number;
}

const blank = { title: '', category: 'Union News', excerpt: '', body: '', author: 'OSU Executive Council', date_label: '', image: '', published: 1 };

export default function ContentAnnouncements() {
  const { refresh } = useContent();
  const [rows, setRows] = useState<Row[]>([]);
  const [form, setForm] = useState<typeof blank & { id: number | null }>({ ...blank, id: null });
  const [editing, setEditing] = useState(false);
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');

  const load = useCallback(async () => {
    try {
      const res = await api<{ announcements: Row[] }>('/api/admin/content/announcements');
      setRows(res.announcements);
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Load failed.');
    }
  }, []);
  useEffect(() => { load(); }, [load]);

  const save = async () => {
    setErr('');
    if (!form.title.trim()) return setErr('Title is required.');
    try {
      if (form.id) {
        await api(`/api/admin/content/announcements/${form.id}`, { method: 'PATCH', body: JSON.stringify(form) });
      } else {
        await api('/api/admin/content/announcements', { method: 'POST', body: JSON.stringify(form) });
      }
      setForm({ ...blank, id: null });
      setEditing(false);
      await load();
      await refresh();
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Save failed.');
    }
  };

  const togglePublished = async (r: Row) => {
    await api(`/api/admin/content/announcements/${r.id}`, { method: 'PATCH', body: JSON.stringify({ published: r.published ? 0 : 1 }) });
    await load();
    await refresh();
  };

  const del = async (r: Row) => {
    if (!confirm(`Delete announcement "${r.title}"?`)) return;
    await api(`/api/admin/content/announcements/${r.id}`, { method: 'DELETE' });
    await load();
    await refresh();
  };

  const fld = (k: keyof typeof blank) => ({
    value: String(form[k] ?? ''),
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => setForm((f) => ({ ...f, [k]: e.target.value })),
  });

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h3 className="font-bold text-slate-900">Announcements ({rows.length})</h3>
        <button className="btn btn-md btn-primary" onClick={() => { setForm({ ...blank, id: null }); setEditing(true); }}>+ New announcement</button>
      </div>

      {editing && (
        <div className="card p-6">
          <h4 className="font-bold text-slate-900">{form.id ? 'Edit announcement' : 'New announcement'}</h4>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2"><label className="label">Title</label><input className="input" {...fld('title')} /></div>
            <div>
              <label className="label">Category</label>
              <select className="input" {...fld('category')}>
                {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
                {!CATEGORIES.includes(form.category) && <option>{form.category}</option>}
              </select>
            </div>
            <div>
              <label className="label">Author</label>
              <input className="input" {...fld('author')} />
            </div>
            <div>
              <label className="label">Date label (e.g. “September 2026”)</label>
              <input className="input" {...fld('date_label')} />
            </div>
            <div>
              <label className="label">Featured image URL (optional)</label>
              <input className="input" placeholder="/img/… or https://…" {...fld('image')} />
            </div>
            <div className="sm:col-span-2">
              <label className="label">Excerpt (card preview)</label>
              <textarea className="input resize-y" rows={2} {...fld('excerpt')} />
            </div>
            <div className="sm:col-span-2">
              <label className="label">Body (separate paragraphs with a blank line)</label>
              <textarea className="input resize-y font-mono text-sm" rows={7} {...fld('body')} />
            </div>
            <div className="flex items-center gap-2">
              <input type="checkbox" checked={!!form.published} onChange={(e) => setForm((f) => ({ ...f, published: e.target.checked ? 1 : 0 }))} />
              <label className="text-sm font-semibold text-slate-700">Published (visible to the public)</label>
            </div>
          </div>
          {err && <p className="mt-3 text-sm text-rose-700">{err}</p>}
          <div className="mt-4 flex gap-2">
            <button className="btn btn-md btn-primary" onClick={save}>Save</button>
            <button className="btn btn-md btn-outline" onClick={() => { setEditing(false); setForm({ ...blank, id: null }); setErr(''); }}>Cancel</button>
          </div>
        </div>
      )}

      <div className="card divide-y divide-slate-100">
        {rows.map((r) => (
          <div key={r.id} className="flex items-start justify-between gap-3 p-4">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-bold text-slate-900">{r.title}</p>
                <span className={`chip ${r.published ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                  {r.published ? 'Published' : 'Draft'}
                </span>
              </div>
              <p className="mt-0.5 line-clamp-1 text-xs text-slate-500">{r.excerpt}</p>
              <p className="mt-1 text-xs text-slate-400">{r.category} · {r.author} · {r.date_label}</p>
            </div>
            <div className="flex shrink-0 flex-wrap gap-2">
              <button className="btn btn-md btn-outline" onClick={() => { setForm({ ...r, id: r.id } as never); setEditing(true); }}>Edit</button>
              <button className="btn btn-md btn-outline" onClick={() => togglePublished(r)}>{r.published ? 'Unpublish' : 'Publish'}</button>
              <button className="btn btn-md btn-outline !text-rose-600" onClick={() => del(r)}>Delete</button>
            </div>
          </div>
        ))}
        {rows.length === 0 && <p className="p-8 text-center text-sm text-slate-400">No announcements yet.</p>}
      </div>
      {msg && <p className="text-sm text-slate-600">{msg}</p>}
    </div>
  );
}
