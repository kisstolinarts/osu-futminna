import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { api } from '../lib/api';
import Logo from '../components/Logo';
import Overview from '../components/admin/Overview';
import Students from '../components/admin/Students';
import ImportCsv from '../components/admin/ImportCsv';
import Whatsapp from '../components/admin/Whatsapp';
import Settings from '../components/admin/Settings';
import AdminElections from '../components/admin/Elections';
import ContentManager from '../components/admin/ContentManager';
import AdminAccounts from '../components/admin/AdminAccounts';

type Tab = 'overview' | 'students' | 'import' | 'whatsapp' | 'elections' | 'content' | 'admins' | 'settings';

const tabs: { id: Tab; label: string }[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'students', label: 'Students' },
  { id: 'import', label: 'Import CSV' },
  { id: 'whatsapp', label: 'WhatsApp list' },
  { id: 'elections', label: 'Elections' },
  { id: 'content', label: 'Website content' },
  { id: 'admins', label: 'My account & admins' },
  { id: 'settings', label: 'Settings' },
];

const ROLE_LABELS: Record<string, string> = {
  SUPER_ADMIN: 'Super admin',
  ELECTORAL_ADMIN: 'Electoral',
  VERIFICATION_ADMIN: 'Verification',
  CONTENT_ADMIN: 'Content',
  RESULTS_OBSERVER: 'Results observer',
};

interface Me {
  id: number;
  name: string;
  email: string;
  role: string;
  must_change_password?: number | boolean;
}

/** Full-screen gate shown when an admin is still on a temporary password. */
function AdminFirstLogin({ onDone }: { onDone: () => void }) {
  const [pw, setPw] = useState('');
  const [pw2, setPw2] = useState('');
  const [show, setShow] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    if (pw !== pw2) {
      setError('Passwords do not match.');
      return;
    }
    setBusy(true);
    try {
      await api('/api/admin/auth/change-password', { method: 'POST', body: JSON.stringify({ newPassword: pw }) });
      onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-[#2e1065] via-[#581c87] to-[#a21caf] px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-6 flex justify-center"><Logo full dark /></div>
        <div className="card p-8">
          <h1 className="text-lg font-extrabold text-slate-900">First-time login — set your own password</h1>
          <p className="mt-1 text-sm text-slate-500">
            You are using a temporary password given by the super admin. Create your own password before using the dashboard.
          </p>
          {error && <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">{error}</div>}
          <form onSubmit={submit} className="mt-5 space-y-4">
            <div>
              <label htmlFor="np1" className="label">New password (at least 8 characters)</label>
              <input
                id="np1"
                type={show ? 'text' : 'password'}
                className="input"
                required
                value={pw}
                onChange={(e) => setPw(e.target.value)}
                autoComplete="new-password"
              />
            </div>
            <div>
              <label htmlFor="np2" className="label">Confirm password</label>
              <input
                id="np2"
                type={show ? 'text' : 'password'}
                className="input"
                required
                value={pw2}
                onChange={(e) => setPw2(e.target.value)}
                autoComplete="new-password"
              />
            </div>
            <button type="button" className="text-xs font-semibold text-fuchsia-700" onClick={() => setShow((v) => !v)}>
              {show ? 'Hide passwords' : 'Show passwords'}
            </button>
            <button className="btn btn-lg btn-primary w-full" disabled={busy}>
              {busy ? 'Saving…' : 'Set my password'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

export default function AdminDashboard() {
  const [params] = useSearchParams();
  const initial = (params.get('tab') as Tab) || 'overview';
  const [tab, setTab] = useState<Tab>(tabs.some((t) => t.id === initial) ? initial : 'overview');
  const [admin, setAdmin] = useState<Me | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const refresh = () => {
    api<{ admin: Me }>('/api/admin/auth/me')
      .then((res) => setAdmin(res.admin))
      .catch(() => navigate('/admin/login'))
      .finally(() => setLoading(false));
  };

  useEffect(refresh, []);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-slate-400">Loading dashboard…</p>
      </div>
    );
  }
  if (!admin) return null;

  const logout = async () => {
    await api('/api/admin/auth/logout', { method: 'POST' }).catch(() => undefined);
    navigate('/admin/login');
  };

  // Admin still on a temporary password: force them to set their own first.
  if (admin.must_change_password) {
    return <AdminFirstLogin onDone={refresh} />;
  }

  const isSuper = admin.role === 'SUPER_ADMIN';

  return (
    <div className="min-h-screen bg-slate-100">
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/90 backdrop-blur">
        <div className="container-x flex h-16 items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <a href="/"><Logo full /></a>
            <span className="chip bg-fuchsia-100 text-fuchsia-800">Admin</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden text-right sm:block">
              <p className="text-sm font-bold text-slate-900">{admin.name}</p>
              <p className="text-xs text-slate-400">{ROLE_LABELS[admin.role] ?? admin.role.replace(/_/g, ' ')}</p>
            </div>
            <a href="/" className="btn btn-md btn-outline">View site</a>
            <button className="btn btn-md btn-primary" onClick={logout}>Sign out</button>
          </div>
        </div>
      </header>

      <div className="container-x grid gap-6 py-8 lg:grid-cols-[230px_1fr]">
        <aside className="lg:sticky lg:top-24 lg:self-start">
          <nav className="card flex gap-1 overflow-x-auto p-2 lg:flex-col">
            {tabs.map((t) => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`whitespace-nowrap rounded-xl px-4 py-2.5 text-left text-sm font-semibold transition ${
                  tab === t.id ? 'bg-fuchsia-700 text-white' : 'text-slate-600 hover:bg-fuchsia-50 hover:text-fuchsia-700'
                }`}
              >
                {t.label}
              </button>
            ))}
          </nav>
        </aside>

        <main className="min-w-0">
          {tab === 'overview' && <Overview onGoto={(t) => setTab(t as Tab)} />}
          {tab === 'students' && <Students />}
          {tab === 'import' && <ImportCsv />}
          {tab === 'whatsapp' && <Whatsapp />}
          {tab === 'elections' && <AdminElections />}
          {tab === 'content' && <ContentManager />}
          {tab === 'admins' && (
            <AdminAccounts
              me={{ id: admin.id, name: admin.name, email: admin.email, role: admin.role }}
              onProfileChanged={(p) => setAdmin((a) => (a ? { ...a, ...p } : a))}
            />
          )}
          {tab === 'settings' && <Settings />}
          {!isSuper && tab === 'admins' && (
            <p className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-600">
              Only the super admin can manage other admin accounts.
            </p>
          )}
        </main>
      </div>
    </div>
  );
}
