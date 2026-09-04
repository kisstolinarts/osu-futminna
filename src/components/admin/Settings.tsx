import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { api } from '../../lib/api';

const FIELDS: { key: string; label: string; hint: string; placeholder: string }[] = [
  {
    key: 'join_form_url',
    label: 'Join OSU form (public link)',
    hint: 'The Google Form students fill to join. Shown as the “Join OSU” button on the site.',
    placeholder: 'https://forms.gle/…',
  },
  {
    key: 'responses_sheet_url',
    label: 'Responses sheet (view-only link)',
    hint: 'A shortcut for admins to open the raw response sheet. Just convenience — the app does not need this.',
    placeholder: 'https://docs.google.com/spreadsheets/d/…',
  },
  {
    key: 'sync_csv_url',
    label: 'Sync link (published CSV) ★',
    hint: 'Required for the “Sync from Google Form” button. In Google Sheets: File → Share → Publish to web → pick your response sheet → format “Comma-separated values (.csv)” → Publish → copy the link here.',
    placeholder: 'https://docs.google.com/spreadsheets/d/e/…/pub?output=csv',
  },
];

export default function Settings() {
  const [values, setValues] = useState<Record<string, string>>({});
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    api<{ settings: Record<string, string> }>('/api/admin/settings')
      .then((res) => {
        setValues(res.settings || {});
        setLoaded(true);
      })
      .catch((e) => setMessage(e.message));
  }, []);

  const save = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage('');
    try {
      const settings = FIELDS.map((f) => ({ key: f.key, value: values[f.key] || '' }));
      const res = await api<{ settings: Record<string, string> }>('/api/admin/settings', {
        method: 'PUT',
        body: JSON.stringify({ settings }),
      });
      setValues(res.settings || {});
      setMessage('Saved. The site and sync will use these links now.');
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Save failed.');
    } finally {
      setSaving(false);
    }
  };

  if (!loaded && !message) return <p className="text-slate-400">Loading settings…</p>;

  return (
    <div className="max-w-2xl space-y-5">
      <div className="card p-6">
        <h3 className="font-bold text-slate-900">OSU forms &amp; sheet links</h3>
        <p className="mt-1 text-sm text-slate-500">
          Store the Google Form/Sheet links here. They live in the database, so you can change them anytime without touching
          code.
        </p>
        <form onSubmit={save} className="mt-5 space-y-5">
          {FIELDS.map((f) => (
            <div key={f.key}>
              <label htmlFor={f.key} className="label">{f.label}</label>
              <input
                id={f.key}
                className="input font-mono text-xs"
                placeholder={f.placeholder}
                value={values[f.key] || ''}
                onChange={(e) => setValues((v) => ({ ...v, [f.key]: e.target.value }))}
              />
              <p className="hint">{f.hint}</p>
            </div>
          ))}
          {message && <p className="rounded-xl bg-slate-100 p-3 text-sm text-slate-700">{message}</p>}
          <button className="btn btn-lg btn-primary" disabled={saving}>
            {saving ? 'Saving…' : 'Save links'}
          </button>
        </form>
      </div>

      <div className="card p-6">
        <h3 className="font-bold text-slate-900">How the Sync link works (1 minute)</h3>
        <ol className="mt-3 list-inside list-decimal space-y-2 text-sm text-slate-600">
          <li>Open your Google Sheet of form responses.</li>
          <li>Click <strong>File → Share → Publish to web</strong>.</li>
          <li>Under <em>Link</em>: pick your response sheet (e.g. “Form Responses 1”) and set format to <strong>Comma-separated values (.csv)</strong>.</li>
          <li>Click <strong>Publish</strong>, then copy the link into the Sync link field above and save.</li>
          <li>Go to the <strong>Import CSV</strong> tab and press <strong>Sync from Google Form</strong> whenever you want the newest members pulled in.</li>
        </ol>
        <p className="mt-3 rounded-xl bg-amber-50 p-3 text-xs text-amber-800">
          How new sign-ups are handled: if a phone number is already on the union’s confirmed WhatsApp list the student is
          imported as <strong>ACTIVE</strong>. A brand-new number is imported as <strong>Pending</strong> — a group admin then
          confirms membership (adds the number in the WhatsApp list tab) and the student becomes ACTIVE automatically. A form
          response alone never grants voting rights.
        </p>
      </div>
    </div>
  );
}
