import { useState } from 'react';
import { api } from '../../lib/api';

interface RowResult {
  row: number;
  matric: string;
  name: string;
  ok: boolean;
  reason?: string;
}
interface Outcome {
  created: number;
  duplicates: number;
  skipped: number;
  rows: RowResult[];
}

export default function ImportCsv() {
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  const [error, setError] = useState('');
  const [errors, setErrors] = useState<RowResult[]>([]);

  const onFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => setText(String(reader.result || ''));
    reader.readAsText(file);
  };

  const downloadTemplate = async () => {
    const res = await fetch('/api/import/template');
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'osu-members-template.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const syncFromSheet = async () => {
    setError('');
    setOutcome(null);
    setErrors([]);
    setSyncing(true);
    try {
      const res = await api<Outcome>('/api/import/from-sheet', { method: 'POST' });
      setOutcome(res);
      const bad = res.rows.filter((r) => !r.ok);
      if (bad.length) setErrors(bad.slice(0, 20));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Sync failed.');
    } finally {
      setSyncing(false);
    }
  };

  const submit = async () => {
    setError('');
    setOutcome(null);
    setErrors([]);
    if (!text.trim()) {
      setError('Paste CSV content or upload your file first.');
      return;
    }
    setBusy(true);
    try {
      const res = await api<Outcome>('/api/import/csv', {
        method: 'POST',
        body: JSON.stringify({ csv: text }),
      });
      setOutcome(res);
      const bad = res.rows.filter((r) => !r.ok);
      if (bad.length) setErrors(bad.slice(0, 20));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Import failed.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="card p-6">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <h3 className="font-bold text-slate-900">Import members from your Google Form CSV</h3>
            <p className="mt-1 text-sm text-slate-500">
              In Google Sheets: <em>File → Download → Comma-separated values (.csv)</em>. Then upload or paste below.
            </p>
          </div>
          <div className="flex shrink-0 flex-col gap-2 sm:flex-row">
            <button className="btn btn-md btn-primary" onClick={syncFromSheet} disabled={syncing}>
              {syncing ? 'Syncing…' : '↻ Sync from Google Form'}
            </button>
            <button className="btn btn-md btn-outline" onClick={downloadTemplate}>Download sample template</button>
          </div>
        </div>
        <p className="mt-3 rounded-xl bg-slate-50 p-3 text-xs text-slate-500">
          💡 <strong>Best for you:</strong> paste your published sheet link in the <em>Settings</em> tab once, then just press
          <strong> “Sync from Google Form”</strong> here whenever new students respond. No more manual CSV exports.
        </p>
        <ul className="mt-4 grid gap-2 text-xs text-slate-500 sm:grid-cols-2">
          <li>✅ Recognised columns: <strong>Full name, Matric Number, Email, Phone number, Level</strong></li>
          <li>✅ Matric formats like <span className="font-mono">2022/12345</span> and <span className="font-mono">2022-12345</span> are merged</li>
          <li>✅ Nigerian phone numbers are normalised automatically</li>
          <li>✅ Duplicate matric numbers are skipped, not overwritten</li>
          <li>✅ Numbers already on the union’s confirmed WhatsApp list import as <strong>ACTIVE</strong></li>
          <li>✅ New numbers start <strong>Pending</strong> until a group admin confirms them (see WhatsApp list tab)</li>
        </ul>
      </div>

      <div className="card p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <label className="label !mb-0">CSV content</label>
          <label className="btn btn-md btn-outline cursor-pointer">
            Upload .csv file
            <input type="file" accept=".csv,text/csv" className="hidden" onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])} />
          </label>
        </div>
        <textarea
          className="input mt-3 h-44 resize-y font-mono text-xs"
          placeholder={'Full name,Matric Number,Email,Phone number,Level\nOlawale Adeyemi,2022/12345,waleyemi@example.com,08012345678,300 Level'}
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
        {error && <p className="mt-3 rounded-xl bg-rose-50 p-3 text-sm text-rose-800">{error}</p>}
        <button className="btn btn-lg btn-primary mt-4 w-full sm:w-auto" onClick={submit} disabled={busy}>
          {busy ? 'Importing…' : 'Import students'}
        </button>
      </div>

      {outcome && (
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 text-center">
            <p className="text-3xl font-extrabold text-emerald-700">{outcome.created}</p>
            <p className="text-sm font-semibold text-emerald-800">Created</p>
          </div>
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-center">
            <p className="text-3xl font-extrabold text-amber-700">{outcome.duplicates}</p>
            <p className="text-sm font-semibold text-amber-800">Duplicates skipped</p>
          </div>
          <div className="rounded-2xl border border-rose-200 bg-rose-50 p-5 text-center">
            <p className="text-3xl font-extrabold text-rose-700">{outcome.skipped}</p>
            <p className="text-sm font-semibold text-rose-800">Skipped (errors)</p>
          </div>
        </div>
      )}

      {errors.length > 0 && (
        <div className="card overflow-x-auto p-4">
          <h4 className="font-bold text-slate-900">Rows needing attention</h4>
          <table className="mt-3 w-full min-w-[500px] text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 text-slate-400 uppercase">
                <th className="py-2">Row</th><th className="py-2">Name</th><th className="py-2">Matric</th><th className="py-2">Reason</th>
              </tr>
            </thead>
            <tbody>
              {errors.map((r, i) => (
                <tr key={i} className="border-b border-slate-100 last:border-0">
                  <td className="py-2">{r.row}</td>
                  <td className="py-2">{r.name}</td>
                  <td className="py-2 font-mono">{r.matric}</td>
                  <td className="py-2 text-rose-700">{r.reason}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
