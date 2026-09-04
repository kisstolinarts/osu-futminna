import { useCallback, useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { api } from '../../lib/api';

interface AdminUser {
  id: number;
  name: string;
  email: string;
  role: string;
  must_change_password: number;
  last_login_at: string | null;
  created_at: string;
}

const ROLE_LABELS: Record<string, string> = {
  SUPER_ADMIN: 'Super admin',
  ELECTORAL_ADMIN: 'Electoral (elections & voting)',
  VERIFICATION_ADMIN: 'Verification (students & WhatsApp)',
  CONTENT_ADMIN: 'Content (website)',
  RESULTS_OBSERVER: 'Results observer',
};

const ROLE_OPTIONS = Object.keys(ROLE_LABELS).map((v) => ({ value: v, label: ROLE_LABELS[v] }));

export default function AdminAccounts({
  me,
  onProfileChanged,
}: {
  me: { id: number; name: string; email: string; role: string };
  onProfileChanged: (p: { name: string; email: string }) => void;
}) {
  const isSuper = me.role === 'SUPER_ADMIN';

  // --- My account ---
  const [myName, setMyName] = useState(me.name);
  const [myEmail, setMyEmail] = useState(me.email);
  const [curPw, setCurPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [newPw2, setNewPw2] = useState('');
  const [myMsg, setMyMsg] = useState('');
  const [myErr, setMyErr] = useState('');
  const [saving, setSaving] = useState(false);

  // --- Admin team (super admin only) ---
  const [admins, setAdmins] = useState<AdminUser[]>([]);
  const [loadErr, setLoadErr] = useState('');
  // create form
  const [nName, setNName] = useState('');
  const [nEmail, setNEmail] = useState('');
  const [nRole, setNRole] = useState('VERIFICATION_ADMIN');
  const [nPw, setNPw] = useState('');
  const [created, setCreated] = useState<{ name: string; email: string; temporary_password: string } | null>(null);
  // reset password action
  const [resetTarget, setResetTarget] = useState<AdminUser | null>(null);
  const [resetPw, setResetPw] = useState('');
  // inline edit of an admin's name/email
  const [editTarget, setEditTarget] = useState<AdminUser | null>(null);
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');

  const loadAdmins = useCallback(async () => {
    setLoadErr('');
    try {
      const res = await api<{ admins: AdminUser[] }>('/api/admin/admins');
      setAdmins(res.admins);
    } catch (e) {
      setLoadErr(e instanceof Error ? e.message : 'Failed to load admin accounts.');
    }
  }, []);

  useEffect(() => {
    if (isSuper) loadAdmins();
  }, [isSuper, loadAdmins]);

  // Suggest a strong but pronounceable temporary password.
  const suggest = () => {
    const words = ['Offa', 'Futminna', 'Unity', 'Progress', 'Regal', 'Falcon'];
    const w = words[Math.floor(Math.random() * words.length)];
    const n = String(Math.floor(100 + Math.random() * 900));
    setResetPw(`${w}${n}!`);
    setNPw(`${w}${n}!`);
  };

  const saveProfile = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMyMsg('');
    setMyErr('');
    try {
      await api('/api/admin/admins/profile/me', { method: 'PATCH', body: JSON.stringify({ name: myName, email: myEmail }) });
      onProfileChanged({ name: myName, email: myEmail });
      setMyMsg('Profile saved.');
    } catch (err) {
      setMyErr(err instanceof Error ? err.message : 'Save failed.');
    } finally {
      setSaving(false);
    }
  };

  const changeMyPassword = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMyMsg('');
    setMyErr('');
    if (newPw !== newPw2) {
      setMyErr('New passwords do not match.');
      setSaving(false);
      return;
    }
    try {
      await api('/api/admin/auth/change-password', {
        method: 'POST',
        body: JSON.stringify({ currentPassword: curPw, newPassword: newPw }),
      });
      setCurPw('');
      setNewPw('');
      setNewPw2('');
      setMyMsg('Password changed.');
    } catch (err) {
      setMyErr(err instanceof Error ? err.message : 'Password change failed.');
    } finally {
      setSaving(false);
    }
  };

  const createAdmin = async (e: FormEvent) => {
    e.preventDefault();
    setLoadErr('');
    setCreated(null);
    try {
      const res = await api<{ temporary_password: string }>('/api/admin/admins', {
        method: 'POST',
        body: JSON.stringify({ name: nName, email: nEmail, role: nRole, password: nPw }),
      });
      setCreated({ name: nName, email: nEmail, temporary_password: res.temporary_password });
      setNName('');
      setNEmail('');
      setNPw('');
      loadAdmins();
    } catch (err) {
      setLoadErr(err instanceof Error ? err.message : 'Create failed.');
    }
  };

  const resetAdminPassword = async (e: FormEvent) => {
    e.preventDefault();
    if (!resetTarget) return;
    try {
      await api(`/api/admin/admins/${resetTarget.id}`, { method: 'PATCH', body: JSON.stringify({ password: resetPw }) });
      setCreated({ name: resetTarget.name, email: resetTarget.email, temporary_password: resetPw });
      setResetTarget(null);
      setResetPw('');
      loadAdmins();
    } catch (err) {
      setLoadErr(err instanceof Error ? err.message : 'Reset failed.');
    }
  };

  const changeRole = async (a: AdminUser, role: string) => {
    if (!confirm(`Change ${a.name}'s role to "${ROLE_LABELS[role]}"?`)) return;
    try {
      await api(`/api/admin/admins/${a.id}`, { method: 'PATCH', body: JSON.stringify({ role }) });
      loadAdmins();
    } catch (err) {
      setLoadErr(err instanceof Error ? err.message : 'Update failed.');
    }
  };

  const startEdit = (a: AdminUser) => {
    setEditTarget(a);
    setEditName(a.name);
    setEditEmail(a.email);
  };

  const saveEdit = async () => {
    if (!editTarget) return;
    try {
      await api(`/api/admin/admins/${editTarget.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ name: editName, email: editEmail }),
      });
      setEditTarget(null);
      loadAdmins();
    } catch (err) {
      setLoadErr(err instanceof Error ? err.message : 'Update failed.');
    }
  };

  const deleteAdmin = async (a: AdminUser) => {
    if (!confirm(`Remove ${a.name} (${a.email}) from admin accounts? This cannot be undone.`)) return;
    try {
      await api(`/api/admin/admins/${a.id}`, { method: 'DELETE' });
      loadAdmins();
    } catch (err) {
      setLoadErr(err instanceof Error ? err.message : 'Delete failed.');
    }
  };

  return (
    <div className="max-w-3xl space-y-6">
      {/* ============ My account ============ */}
      <div className="card p-6">
        <h3 className="font-bold text-slate-900">My admin account</h3>
        <p className="mt-1 text-sm text-slate-500">
          Update your name and login email, or change your password. You will use the email + password to sign in at{' '}
          <span className="font-mono text-xs">/admin/login</span>.
        </p>

        {myMsg && <p className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">{myMsg}</p>}
        {myErr && <p className="mt-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{myErr}</p>}

        <form onSubmit={saveProfile} className="mt-5 grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="myName" className="label">Your name</label>
            <input id="myName" className="input" value={myName} onChange={(e) => setMyName(e.target.value)} required />
          </div>
          <div>
            <label htmlFor="myEmail" className="label">Login email</label>
            <input id="myEmail" type="email" className="input" value={myEmail} onChange={(e) => setMyEmail(e.target.value)} required />
          </div>
          <div className="sm:col-span-2">
            <button className="btn btn-md btn-primary" disabled={saving}>
              {saving ? 'Saving…' : 'Save my details'}
            </button>
          </div>
        </form>

        <hr className="my-6 border-slate-100" />
        <p className="text-sm font-bold text-slate-900">Change my password</p>
        <form onSubmit={changeMyPassword} className="mt-3 grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="curPw" className="label">Current password</label>
            <input id="curPw" type="password" className="input" value={curPw} onChange={(e) => setCurPw(e.target.value)} required autoComplete="current-password" />
          </div>
          <div>
            <label htmlFor="newPw" className="label">New password (at least 8 characters)</label>
            <input id="newPw" type="password" className="input" value={newPw} onChange={(e) => setNewPw(e.target.value)} required autoComplete="new-password" />
          </div>
          <div className="sm:col-span-2">
            <label htmlFor="newPw2" className="label">Confirm new password</label>
            <input id="newPw2" type="password" className="input" value={newPw2} onChange={(e) => setNewPw2(e.target.value)} required autoComplete="new-password" />
          </div>
          <div className="sm:col-span-2">
            <button className="btn btn-md btn-outline" disabled={saving}>
              {saving ? 'Saving…' : 'Change my password'}
            </button>
          </div>
        </form>
      </div>

      {/* ============ Team management ============ */}
      {isSuper && (
        <div className="card p-6">
          <h3 className="font-bold text-slate-900">Admin team</h3>
          <p className="mt-1 text-sm text-slate-500">
            Admins you create here will get their own login at <span className="font-mono text-xs">/admin/login</span>. New
            admins must set their own password on first login.
          </p>

          {loadErr && <p className="mt-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{loadErr}</p>}
          {created && (
            <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
              <p className="text-sm font-bold text-emerald-900">Admin ready — share these details once</p>
              <dl className="mt-2 grid gap-1 text-sm text-emerald-800">
                <div><span className="font-semibold">Name:</span> {created.name}</div>
                <div><span className="font-semibold">Login:</span> {created.email}</div>
                <div className="rounded-lg bg-white/70 p-2 font-mono">
                  <span className="font-semibold">Temporary password:</span> {created.temporary_password}
                </div>
              </dl>
              <p className="mt-2 text-xs text-emerald-700">
                They will be asked to create their own password the first time they sign in. ⚠️ Copy this now — the temporary
                password is shown only once.
              </p>
              <button className="btn btn-md btn-outline mt-3" onClick={() => setCreated(null)}>Done</button>
            </div>
          )}

          {/* Create new admin */}
          <form onSubmit={createAdmin} className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-sm font-bold text-slate-900">Add an admin</p>
            <div className="mt-3 grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="nName" className="label">Full name</label>
                <input id="nName" className="input" value={nName} onChange={(e) => setNName(e.target.value)} required />
              </div>
              <div>
                <label htmlFor="nEmail" className="label">Login email</label>
                <input id="nEmail" type="email" className="input" value={nEmail} onChange={(e) => setNEmail(e.target.value)} required />
              </div>
              <div>
                <label htmlFor="nRole" className="label">Role</label>
                <select id="nRole" className="input" value={nRole} onChange={(e) => setNRole(e.target.value)}>
                  {ROLE_OPTIONS.filter((r) => r.value !== 'SUPER_ADMIN').map((r) => (
                    <option key={r.value} value={r.value}>{r.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="nPw" className="label">Temporary password</label>
                <div className="flex gap-2">
                  <input id="nPw" className="input font-mono" value={nPw} onChange={(e) => setNPw(e.target.value)} required minLength={8} />
                  <button type="button" className="btn btn-md btn-outline whitespace-nowrap" onClick={suggest}>Suggest</button>
                </div>
              </div>
              <div className="sm:col-span-2">
                <button className="btn btn-md btn-primary" disabled={!nName || !nEmail || nPw.length < 8}>
                  Create admin
                </button>
              </div>
            </div>
          </form>

          {/* List */}
          <div className="mt-6 overflow-x-auto">
            <table className="w-full min-w-[560px] text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-xs uppercase tracking-wider text-slate-400">
                  <th className="py-2 pr-4">Admin</th>
                  <th className="py-2 pr-4">Role</th>
                  <th className="py-2 pr-4">Status</th>
                  <th className="py-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {admins.map((a) => {
                  const editing = editTarget !== null && editTarget.id === a.id;
                  return (
                    <tr key={a.id} className="border-b border-slate-100 last:border-0">
                      <td className="py-3 pr-4">
                        {editing ? (
                          <div className="space-y-1.5">
                            <input className="input py-1.5 text-sm" value={editName} onChange={(e) => setEditName(e.target.value)} />
                            <input className="input py-1.5 text-sm" value={editEmail} onChange={(e) => setEditEmail(e.target.value)} />
                            <div className="flex gap-2">
                              <button className="btn btn-md btn-primary" onClick={saveEdit}>Save</button>
                              <button className="btn btn-md btn-outline" onClick={() => setEditTarget(null)}>Cancel</button>
                            </div>
                          </div>
                        ) : (
                          <>
                            <p className="font-bold text-slate-900">{a.name}{a.id === me.id && <span className="ml-1 text-xs font-semibold text-fuchsia-600">(you)</span>}</p>
                            <p className="text-xs text-slate-500">{a.email}</p>
                          </>
                        )}
                      </td>
                      <td className="py-3 pr-4">
                        {a.id === me.id ? (
                          <span className="chip bg-slate-100 text-slate-700">{ROLE_LABELS[a.role]}</span>
                        ) : (
                          <select
                            className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs text-slate-600"
                            value={a.role}
                            onChange={(e) => changeRole(a, e.target.value)}
                          >
                            {ROLE_OPTIONS.map((r) => (
                              <option key={r.value} value={r.value}>{r.label}</option>
                            ))}
                          </select>
                        )}
                      </td>
                      <td className="py-3 pr-4">
                        {a.must_change_password ? (
                          <span className="chip bg-amber-100 text-amber-700">Needs first login</span>
                        ) : a.last_login_at ? (
                          <span className="chip bg-emerald-100 text-emerald-700">Active</span>
                        ) : (
                          <span className="chip bg-slate-100 text-slate-600">Set up</span>
                        )}
                      </td>
                      <td className="py-3">
                        {a.id !== me.id && !editing ? (
                          <div className="flex flex-wrap items-center gap-2">
                            <button className="btn btn-md btn-outline" onClick={() => startEdit(a)}>Edit</button>
                            <button className="btn btn-md btn-outline" onClick={() => { setResetTarget(a); setResetPw(''); }}>
                              Reset password
                            </button>
                            <button className="btn btn-md btn-outline text-rose-600 hover:text-rose-700" onClick={() => deleteAdmin(a)}>Remove</button>
                          </div>
                        ) : !editing ? (
                          <span className="text-xs text-slate-400">—</span>
                        ) : null}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {!isSuper && (
        <p className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-600">
          Only the super admin can manage other admin accounts.
        </p>
      )}

      {/* Reset another admin's password modal-ish */}
      {resetTarget && (
        <form onSubmit={resetAdminPassword} className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
          <p className="text-sm font-bold text-amber-900">Reset {resetTarget.name}'s password</p>
          <p className="mt-1 text-xs text-amber-800">
            Give them a new temporary password. They will be asked to create their own on next login.
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <input type="text" className="input font-mono md:max-w-xs" value={resetPw} onChange={(e) => setResetPw(e.target.value)} required minLength={8} />
            <button type="button" className="btn btn-md btn-outline" onClick={suggest}>Suggest</button>
            <button className="btn btn-md btn-primary">Save</button>
            <button type="button" className="btn btn-md btn-outline" onClick={() => setResetTarget(null)}>Cancel</button>
          </div>
        </form>
      )}
    </div>
  );
}
