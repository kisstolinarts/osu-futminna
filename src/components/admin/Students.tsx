import { useCallback, useEffect, useState } from 'react';
import { api } from '../../lib/api';
import { StatusBadge, statusOptions } from '../../lib/status';

interface Student {
  id: number;
  full_name: string;
  matric_number: string;
  email: string | null;
  level: string | null;
  phone_raw: string | null;
  phone_normalized: string | null;
  status: string;
  source: string;
  has_password: number;
  must_change_password: number;
  created_at: string;
}

const LEVEL_CHOICES = ['100 LEVEL', '200 LEVEL', '300 LEVEL', '400 LEVEL', '500 LEVEL', '600 LEVEL', 'POSTGRADUATE'];
const levelLabel = (lv: string | null) => (lv ? String(lv).replace(' LEVEL', '').toLowerCase() : '—');

export default function Students() {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('ALL');
  const [message, setMessage] = useState('');
  const [notice, setNotice] = useState('');

  // Per-member level editing
  const [editId, setEditId] = useState<number | null>(null);
  const [draftLevel, setDraftLevel] = useState<string>('');

  // Bulk level advance
  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkFrom, setBulkFrom] = useState('');
  const [bulkTo, setBulkTo] = useState('');
  const [bulkBusy, setBulkBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setMessage('');
    try {
      const params = new URLSearchParams();
      if (q) params.set('q', q);
      if (status !== 'ALL') params.set('status', status);
      const res = await api<{ students: Student[] }>(`/api/admin?${params.toString()}`);
      setStudents(res.students);
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'Failed to load students.');
    } finally {
      setLoading(false);
    }
  }, [q, status]);

  useEffect(() => {
    const t = setTimeout(load, 300);
    return () => clearTimeout(t);
  }, [load]);

  const changeStatus = async (id: number, newStatus: string) => {
    if (!confirm(`Change this student's status to ${newStatus.replace(/_/g, ' ')}?`)) return;
    try {
      await api(`/api/admin/${id}`, { method: 'PATCH', body: JSON.stringify({ status: newStatus }) });
      load();
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Update failed.');
    }
  };

  const startEditLevel = (s: Student) => {
    setEditId(s.id);
    setDraftLevel(LEVEL_CHOICES.includes(String(s.level)) ? String(s.level) : '');
  };

  const saveLevel = async () => {
    if (editId === null) return;
    try {
      await api(`/api/admin/${editId}`, { method: 'PATCH', body: JSON.stringify({ level: draftLevel }) });
      setNotice(`Level updated.`);
      setEditId(null);
      load();
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Update failed.');
    }
  };

  const runBulkAdvance = async () => {
    if (!bulkFrom || !bulkTo) {
      alert('Choose both the level to move from and the level to move to.');
      return;
    }
    if (!confirm(`Move every ${bulkFrom} student to ${bulkTo}? This changes all members currently listed as ${bulkFrom}.`)) return;
    setBulkBusy(true);
    setNotice('');
    try {
      const res = await api<{ updated: number }>('/api/admin/level-actions/advance', {
        method: 'POST',
        body: JSON.stringify({ from: bulkFrom, to: bulkTo }),
      });
      setNotice(`Done — ${res.updated} student(s) moved from ${bulkFrom} to ${bulkTo}.`);
      setBulkOpen(false);
      setBulkFrom('');
      setBulkTo('');
      load();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'Advance failed.');
    } finally {
      setBulkBusy(false);
    }
  };

  // Reset a student's password to their phone number (temporary). They must
  // set their own password on next login.
  const resetToPhone = async (s: Student) => {
    if (
      !confirm(
        `Set ${s.full_name}'s password back to their phone number? They will be asked to create a new password when they next log in.`,
      )
    )
      return;
    try {
      const res = await api<{ message?: string }>(`/api/admin/${s.id}/reset-password`, { method: 'POST' });
      setNotice(res.message || 'Password reset.');
      load();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'Reset failed.');
    }
  };

  // Give every student still missing a password a phone-number password.
  const setMissing = async () => {
    if (
      !confirm(
        'Give every student without a password a temporary password equal to their phone number? Existing passwords are left untouched.',
      )
    )
      return;
    try {
      const res = await api<{ set: number; skipped: number }>('/api/admin/password-actions/set-missing', { method: 'POST' });
      setNotice(`Done — passwords set for ${res.set} student(s). ${res.skipped ? `${res.skipped} skipped (no usable phone number).` : ''}`);
      load();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'Action failed.');
    }
  };

  const missingCount = students.filter((s) => !s.has_password).length;

  const passwordBadge = (s: Student) => {
    if (!s.has_password) {
      return s.phone_raw || s.phone_normalized ? (
        <span className="chip bg-rose-100 text-rose-700">No password</span>
      ) : (
        <span className="chip bg-rose-100 text-rose-700" title="No valid phone stored">No password / no phone</span>
      );
    }
    if (s.must_change_password) {
      return <span className="chip bg-amber-100 text-amber-700" title="Still the temporary phone password — must change on login">Phone (temp)</span>;
    }
    return <span className="chip bg-emerald-100 text-emerald-700">Student set</span>;
  };

  const hasUsablePhone = (s: Student) => !!(s.phone_raw || s.phone_normalized);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <input
          className="input md:max-w-xs"
          placeholder="Search name, matric, email, phone…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <div className="flex flex-wrap items-center gap-2">
          <select className="input md:w-48" value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="ALL">All statuses</option>
            {statusOptions.map((s) => (
              <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>
            ))}
          </select>
          <button className="btn btn-md btn-outline" onClick={() => setBulkOpen((v) => !v)}>
            {bulkOpen ? 'Close advance' : 'Advance whole level'}
          </button>
          {!loading && (
            <button className="btn btn-md btn-outline" onClick={setMissing} disabled={missingCount === 0}>
              Set phone passwords ({missingCount} missing)
            </button>
          )}
        </div>
      </div>

      {bulkOpen && (
        <div className="rounded-2xl border border-fuchsia-200 bg-fuchsia-50 p-4">
          <h4 className="font-bold text-slate-900">Advance a whole level (e.g. new session roll-over)</h4>
          <p className="mt-1 text-xs text-slate-600">
            Moves every member currently on one level to another level you choose. People with no level set are never touched.
            You can still fix individuals afterwards with the pencil beside each member's level.
          </p>
          <div className="mt-3 flex flex-wrap items-end gap-3">
            <div>
              <label className="label !mb-1">Move all at</label>
              <select className="input" value={bulkFrom} onChange={(e) => setBulkFrom(e.target.value)}>
                <option value="">— choose level —</option>
                {LEVEL_CHOICES.map((lv) => (
                  <option key={lv} value={lv}>{levelLabel(lv)}</option>
                ))}
              </select>
            </div>
            <div className="pb-1 text-lg text-slate-400">→</div>
            <div>
              <label className="label !mb-1">to</label>
              <select className="input" value={bulkTo} onChange={(e) => setBulkTo(e.target.value)} disabled={!bulkFrom}>
                <option value="">— choose level —</option>
                {LEVEL_CHOICES.filter((lv) => lv !== bulkFrom).map((lv) => (
                  <option key={lv} value={lv}>{levelLabel(lv)}</option>
                ))}
              </select>
            </div>
            <button className="btn btn-md btn-primary" onClick={runBulkAdvance} disabled={bulkBusy || !bulkFrom || !bulkTo}>
              {bulkBusy ? 'Advancing…' : 'Advance level'}
            </button>
          </div>
        </div>
      )}

      {message && <p className="rounded-xl bg-rose-50 p-3 text-sm text-rose-700">{message}</p>}
      {notice && (
        <p className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">{notice}</p>
      )}

      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3 text-xs leading-relaxed text-slate-600">
        <strong>How students get in:</strong> every student’s first-time password is their <strong>phone number</strong> as
        written on the OSU form. The app forces them to create their own password on first login. Use <em>Reset to phone</em>{' '}
        whenever a student forgets their password. No invite links needed. Level changes made here are recorded in the audit log.
      </div>

      <div className="card overflow-x-auto">
        <table className="w-full min-w-[860px] text-left text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-xs uppercase tracking-wider text-slate-400">
              <th className="px-4 py-3">Student</th>
              <th className="px-4 py-3">Level</th>
              <th className="px-4 py-3">Contact</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Password</th>
              <th className="px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr><td colSpan={6} className="px-4 py-10 text-center text-slate-400">Loading students…</td></tr>
            )}
            {!loading && students.length === 0 && (
              <tr><td colSpan={6} className="px-4 py-10 text-center text-slate-400">No students match. Try the Import tab to add members from your Google Form CSV.</td></tr>
            )}
            {students.map((s) => (
              <tr key={s.id} className="border-b border-slate-100 last:border-0 hover:bg-fuchsia-50/40">
                <td className="px-4 py-3">
                  <p className="font-bold text-slate-900">{s.full_name}</p>
                  <p className="font-mono text-xs text-slate-400">{s.matric_number}</p>
                </td>
                <td className="px-4 py-3">
                  {editId === s.id ? (
                    <div className="flex items-center gap-1.5">
                      <select
                        className="rounded-lg border border-slate-300 bg-white px-2 py-1 text-xs"
                        value={draftLevel}
                        onChange={(e) => setDraftLevel(e.target.value)}
                        autoFocus
                      >
                        <option value="">— none / not set —</option>
                        {LEVEL_CHOICES.map((lv) => (
                          <option key={lv} value={lv}>{levelLabel(lv)}</option>
                        ))}
                      </select>
                      <button className="btn btn-sm btn-primary" onClick={saveLevel}>Save</button>
                      <button className="btn btn-sm btn-ghost" onClick={() => setEditId(null)}>Cancel</button>
                    </div>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 text-slate-600">
                      <span className="capitalize">{levelLabel(s.level)}</span>
                      <button
                        className="text-fuchsia-700 hover:text-fuchsia-900"
                        title="Edit level"
                        onClick={() => startEditLevel(s)}
                      >
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/></svg>
                      </button>
                    </span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <p className="text-xs text-slate-500">{s.email || '—'}</p>
                  <p className="font-mono text-xs text-slate-400">{s.phone_raw || s.phone_normalized || '—'}</p>
                </td>
                <td className="px-4 py-3"><StatusBadge status={s.status} /></td>
                <td className="px-4 py-3">{passwordBadge(s)}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <button
                      className="btn btn-md btn-outline"
                      onClick={() => resetToPhone(s)}
                      disabled={!hasUsablePhone(s)}
                      title={hasUsablePhone(s) ? 'Set password to phone number and force a change' : 'No phone number stored for this student'}
                    >
                      Reset to phone
                    </button>
                    <select
                      className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs text-slate-600"
                      value=""
                      onChange={(e) => e.target.value && changeStatus(s.id, e.target.value)}
                    >
                      <option value="" disabled>Change status…</option>
                      {statusOptions.map((st) => st !== s.status && (
                        <option key={st} value={st}>{st.replace(/_/g, ' ')}</option>
                      ))}
                    </select>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
