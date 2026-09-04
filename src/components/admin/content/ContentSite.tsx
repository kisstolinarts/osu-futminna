import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { api } from '../../../lib/api';
import { useContent } from '../../../lib/ContentContext';

interface Config {
  site: { tagline: string; email: string; address: string; whatsapp_text: string };
  about: { about_paragraphs: string[]; history_paragraphs: string[]; vision: string; mission: string; objectives: string[]; constitution_note: string };
}

const joinParas = (arr: string[]) => arr.join('\n\n');
const splitParas = (s: string) => s.split(/\n\s*\n+/).map((x) => x.trim()).filter(Boolean);
const joinLines = (arr: string[]) => arr.join('\n');
const splitLines = (s: string) => s.split('\n').map((x) => x.trim()).filter(Boolean);

export default function ContentSite() {
  const { refresh } = useContent();
  const [cfg, setCfg] = useState<Config | null>(null);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');

  useEffect(() => {
    api<Config>('/api/admin/content/config').then(setCfg).catch((e: unknown) => setErr(e instanceof Error ? e.message : String(e)));
  }, []);

  const setSite = (k: keyof Config['site'], v: string) => setCfg((c) => (c ? { ...c, site: { ...c.site, [k]: v } } : c));
  const setAbout = (k: keyof Config['about'], v: string | string[]) => setCfg((c) => (c ? { ...c, about: { ...c.about, [k]: v as never } } : c));

  const save = async (e: FormEvent) => {
    e.preventDefault();
    if (!cfg) return;
    setSaving(true);
    setMsg('');
    setErr('');
    try {
      await api('/api/admin/content/config', {
        method: 'PUT',
        body: JSON.stringify({
          site: cfg.site,
          about: {
            ...cfg.about,
            about_paragraphs: splitParas(joinParas(cfg.about.about_paragraphs)),
            history_paragraphs: splitParas(joinParas(cfg.about.history_paragraphs)),
            objectives: splitLines(joinLines(cfg.about.objectives)),
          },
        }),
      });
      setMsg('Saved! The public site now shows this content.');
      await refresh();
    } catch (e2) {
      setErr(e2 instanceof Error ? e2.message : 'Save failed.');
    } finally {
      setSaving(false);
    }
  };

  if (err && !cfg) return <p className="text-rose-700">{err}</p>;
  if (!cfg) return <p className="text-slate-400">Loading content…</p>;

  const input = 'input mt-1';
  const label = 'label';

  return (
    <form onSubmit={save} className="max-w-3xl space-y-6">
      <div className="card p-6">
        <h3 className="font-bold text-slate-900">Site information</h3>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className={label}>Tagline (homepage hero)</label>
            <textarea className={`${input} resize-y`} rows={2} value={cfg.site.tagline} onChange={(e) => setSite('tagline', e.target.value)} />
          </div>
          <div>
            <label className={label}>Contact email</label>
            <input className={input} value={cfg.site.email} onChange={(e) => setSite('email', e.target.value)} />
          </div>
          <div>
            <label className={label}>WhatsApp text</label>
            <input className={input} value={cfg.site.whatsapp_text} onChange={(e) => setSite('whatsapp_text', e.target.value)} />
          </div>
          <div className="sm:col-span-2">
            <label className={label}>Address</label>
            <input className={input} value={cfg.site.address} onChange={(e) => setSite('address', e.target.value)} />
          </div>
        </div>
      </div>

      <div className="card p-6">
        <h3 className="font-bold text-slate-900">About — Who we are</h3>
        <p className="text-xs text-slate-500">Separate paragraphs with a blank line.</p>
        <textarea className={`${input} mt-2 resize-y font-mono text-sm`} rows={6}
          value={joinParas(cfg.about.about_paragraphs)}
          onChange={(e) => setAbout('about_paragraphs', splitParas(e.target.value))} />
      </div>

      <div className="card p-6">
        <h3 className="font-bold text-slate-900">About — History</h3>
        <p className="text-xs text-slate-500">Separate paragraphs with a blank line.</p>
        <textarea className={`${input} mt-2 resize-y font-mono text-sm`} rows={6}
          value={joinParas(cfg.about.history_paragraphs)}
          onChange={(e) => setAbout('history_paragraphs', splitParas(e.target.value))} />
      </div>

      <div className="card p-6">
        <h3 className="font-bold text-slate-900">Vision &amp; Mission</h3>
        <div className="mt-4 space-y-4">
          <div>
            <label className={label}>Vision</label>
            <textarea className={`${input} resize-y`} rows={3} value={cfg.about.vision} onChange={(e) => setAbout('vision', e.target.value)} />
          </div>
          <div>
            <label className={label}>Mission</label>
            <textarea className={`${input} resize-y`} rows={3} value={cfg.about.mission} onChange={(e) => setAbout('mission', e.target.value)} />
          </div>
        </div>
      </div>

      <div className="card p-6">
        <h3 className="font-bold text-slate-900">Objectives</h3>
        <p className="text-xs text-slate-500">One objective per line.</p>
        <textarea className={`${input} mt-2 resize-y font-mono text-sm`} rows={8}
          value={joinLines(cfg.about.objectives)}
          onChange={(e) => setAbout('objectives', splitLines(e.target.value))} />
      </div>

      <div className="card p-6">
        <h3 className="font-bold text-slate-900">Constitution note</h3>
        <textarea className={`${input} resize-y`} rows={3} value={cfg.about.constitution_note} onChange={(e) => setAbout('constitution_note', e.target.value)} />
      </div>

      {msg && <p className="rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800">{msg}</p>}
      {err && <p className="rounded-xl bg-rose-50 p-3 text-sm text-rose-800">{err}</p>}
      <button className="btn btn-lg btn-primary" disabled={saving}>{saving ? 'Saving…' : 'Save all content'}</button>
    </form>
  );
}
