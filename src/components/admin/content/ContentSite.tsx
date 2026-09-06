import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { api } from '../../../lib/api';
import { useContent } from '../../../lib/ContentContext';

interface Config {
  site: {
    tagline: string;
    email: string;
    address: string;
    whatsapp_text: string;
    home_hero_image: string;
    home_about_image: string;
    about_history_image: string;
  };
  about: { about_paragraphs: string[]; history_paragraphs: string[]; vision: string; mission: string; objectives: string[]; constitution_note: string };
}

interface UpImg { id: number; filename: string; caption: string }
interface UpAlbum { id: number; name: string; images: UpImg[] }

const joinParas = (arr: string[]) => arr.join('\n\n');
const splitParas = (s: string) => s.split(/\n\s*\n+/).map((x) => x.trim()).filter(Boolean);
const joinLines = (arr: string[]) => arr.join('\n');
const splitLines = (s: string) => s.split('\n').map((x) => x.trim()).filter(Boolean);

// One layout-photo slot: a text field plus the union's uploaded photos to
// pick from. Leave empty to keep the built-in default photo.
function PhotoSlot(props: {
  label: string;
  hint: string;
  value: string;
  albums: UpAlbum[];
  onChange: (v: string) => void;
}) {
  const { label, hint, value, albums, onChange } = props;
  const imgs = albums.flatMap((a) => a.images.map((i) => ({ ...i, album: a.name })));
  return (
    <div>
      <label className="label">{label}</label>
      <input className="input mt-1" value={value} placeholder="/img/…  or  https://…" onChange={(e) => onChange(e.target.value)} />
      <p className="text-xs text-slate-500">{hint}</p>
      <div className="mt-1 flex flex-wrap gap-2">
        {imgs.map((i) => (
          <button
            key={i.id}
            type="button"
            title={`${i.album} — ${i.caption || 'photo'}`}
            onClick={() => onChange(i.filename)}
            className={`group relative h-16 w-20 overflow-hidden rounded-lg border-2 transition ${value === i.filename ? 'border-fuchsia-600 ring-2 ring-fuchsia-200' : 'border-slate-200 hover:border-fuchsia-400'}`}
          >
            <img src={i.filename} alt={i.caption || i.album} className="h-full w-full object-cover" loading="lazy" />
          </button>
        ))}
      </div>
      {imgs.length === 0 && <p className="mt-1 text-xs text-slate-400">No uploaded photos yet — add some in Content → Gallery, then return here to pick them.</p>}
      <div className="mt-1 flex gap-3 text-xs">
        <button type="button" className="font-semibold text-fuchsia-700 hover:underline" onClick={() => onChange('')}>Use default photo</button>
      </div>
    </div>
  );
}

export default function ContentSite() {
  const { refresh } = useContent();
  const [cfg, setCfg] = useState<Config | null>(null);
  const [albums, setAlbums] = useState<UpAlbum[]>([]);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');

  useEffect(() => {
    api<Config>('/api/admin/content/config').then(setCfg).catch((e: unknown) => setErr(e instanceof Error ? e.message : String(e)));
    api<{ albums: UpAlbum[] }>('/api/admin/content/albums')
      .then((d) => setAlbums(d.albums || []))
      .catch(() => setAlbums([]));
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
        <h3 className="font-bold text-slate-900">Photos on the Home &amp; About pages</h3>
        <p className="text-xs text-slate-500">Tap one of your uploaded photos below (it appears under whatever album you put it in) or paste any image link. Leave a box empty to use the site’s built-in default photo. Remember to press “Save all content” at the bottom.</p>
        <div className="mt-4 space-y-5">
          <PhotoSlot
            label="Welcome photo (top of Home page, with the “Join the family” card)"
            hint="The big photo at the top right of the homepage."
            value={cfg.site.home_hero_image}
            albums={albums}
            onChange={(v) => setSite('home_hero_image', v)}
          />
          <PhotoSlot
            label="Community photo (Home “About OSU” + About page “Who we are”)"
            hint="The photo that sits beside the “Home away from home” text."
            value={cfg.site.home_about_image}
            albums={albums}
            onChange={(v) => setSite('home_about_image', v)}
          />
          <PhotoSlot
            label="History photo (About page “Rooted in Offa, thriving in Minna”)"
            hint="The photo beside the union’s history text."
            value={cfg.site.about_history_image}
            albums={albums}
            onChange={(v) => setSite('about_history_image', v)}
          />
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
