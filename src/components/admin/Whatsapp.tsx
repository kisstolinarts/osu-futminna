import { useCallback, useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { api } from '../../lib/api';

interface NumberRow {
  id: number;
  phone_raw: string;
  phone_normalized: string;
  active: number;
  note: string | null;
  created_at: string;
}

export default function Whatsapp() {
  const [numbers, setNumbers] = useState<NumberRow[]>([]);
  const [q, setQ] = useState('');
  const [phone, setPhone] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  const load = useCallback(async () => {
    const params = new URLSearchParams();
    if (q) params.set('q', q);
    const res = await api<{ numbers: NumberRow[] }>(`/api/admin/whatsapp?${params.toString()}`);
    setNumbers(res.numbers);
  }, [q]);

  useEffect(() => {
    const t = setTimeout(load, 300);
    return () => clearTimeout(t);
  }, [load]);

  const add = async (e: FormEvent) => {
    e.preventDefault();
    setMessage('');
    setBusy(true);
    try {
      const res = await api<{ phone_normalized: string }>('/api/admin/whatsapp', { method: 'POST', body: JSON.stringify({ phone }) });
      setMessage(`Added ${res.phone_normalized}`);
      setPhone('');
      load();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Failed to add.');
    } finally {
      setBusy(false);
    }
  };

  const remove = async (id: number) => {
    if (!confirm('Remove this number from the approved list?')) return;
    try {
      await api(`/api/admin/whatsapp/${id}`, { method: 'DELETE' });
      load();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Remove failed.');
    }
  };

  return (
    <div className="space-y-4">
      <div className="card p-6">
        <h3 className="font-bold text-slate-900">Add an approved number</h3>
        <p className="mt-1 text-sm text-slate-500">
          Numbers are normalised — <span className="font-mono">08012345678</span> and <span className="font-mono">+2348012345678</span> count as the same.
        </p>
        <form onSubmit={add} className="mt-3 flex flex-col gap-3 sm:flex-row">
          <input className="input sm:max-w-xs" placeholder="e.g. 08012345678" value={phone} onChange={(e) => setPhone(e.target.value)} />
          <button className="btn btn-md btn-primary" disabled={busy}>{busy ? 'Adding…' : 'Add number'}</button>
        </form>
        {message && <p className="mt-3 text-sm text-slate-600">{message}</p>}
        <p className="mt-4 text-xs text-slate-400">
          Tip: when you import students from CSV, their phone numbers are added here automatically.
        </p>
      </div>

      <div className="card overflow-x-auto p-4">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="font-bold text-slate-900">Approved numbers ({numbers.length})</h3>
          <input className="input sm:max-w-xs" placeholder="Search…" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <table className="w-full min-w-[520px] text-left text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-xs uppercase tracking-wider text-slate-400">
              <th className="px-3 py-2">Number</th>
              <th className="px-3 py-2">Normalised</th>
              <th className="px-3 py-2">Note</th>
              <th className="px-3 py-2">Added</th>
              <th className="px-3 py-2" />
            </tr>
          </thead>
          <tbody>
            {numbers.length === 0 && (
              <tr><td colSpan={5} className="px-3 py-8 text-center text-slate-400">No numbers yet.</td></tr>
            )}
            {numbers.map((n) => (
              <tr key={n.id} className="border-b border-slate-100 last:border-0">
                <td className="px-3 py-2 font-mono text-xs">{n.phone_raw}</td>
                <td className="px-3 py-2 font-mono text-xs text-slate-500">{n.phone_normalized}</td>
                <td className="px-3 py-2 text-xs text-slate-500">{n.note || '—'}</td>
                <td className="px-3 py-2 text-xs text-slate-500">{n.created_at}</td>
                <td className="px-3 py-2 text-right">
                  <button className="text-xs font-semibold text-rose-600 hover:underline" onClick={() => remove(n.id)}>Remove</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
