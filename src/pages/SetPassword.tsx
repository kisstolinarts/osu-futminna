import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import Logo from '../components/Logo';

type Mode = 'checking' | 'forced' | 'voluntary' | 'anon';

/** Lets a signed-in student change their password.
 *  - Forced: on first login with the temporary phone-number password, the
 *    student must set their own password before using the dashboard.
 *  - Voluntary: an already-set student can change their password by entering
 *    their current password.
 */
export default function SetPassword() {
  const [mode, setMode] = useState<Mode>('checking');
  const [currentPassword, setCurrentPassword] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    api<{ student: { must_change_password: number | boolean } }>('/api/student/auth/me')
      .then((res) => setMode(res.student.must_change_password ? 'forced' : 'voluntary'))
      .catch(() => setMode('anon'));
  }, []);

  if (mode === 'anon') {
    return (
      <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center px-4">
        <div className="card max-w-md p-8 text-center">
          <h1 className="text-lg font-extrabold text-slate-900">Please log in first</h1>
          <p className="mt-2 text-sm text-slate-600">Log in with your matriculation number to change your password.</p>
          <Link to="/login?reason=auth" className="btn btn-lg btn-primary mt-6 w-full">Go to login</Link>
        </div>
      </div>
    );
  }

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    if (password !== confirm) {
      setError('Passwords do not match.');
      return;
    }
    setBusy(true);
    try {
      const body: Record<string, string> = { new_password: password };
      if (mode === 'voluntary') body.current_password = currentPassword;
      await api('/api/student/auth/change-password', { method: 'POST', body: JSON.stringify(body) });
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="grid min-h-[calc(100vh-4rem)] items-center justify-center bg-slate-50 px-4 py-12">
      <div className="w-full max-w-md">
        <div className="mb-6 flex justify-center lg:hidden"><Logo full /></div>
        <div className="card p-8">
          {done ? (
            <div className="text-center">
              <span className="mx-auto inline-flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
                <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg>
              </span>
              <h1 className="mt-4 text-xl font-extrabold text-slate-900">Password saved</h1>
              <p className="mt-2 text-sm text-slate-600">You are all set. Your member dashboard is ready.</p>
              <button className="btn btn-lg btn-primary mt-6 w-full" onClick={() => navigate('/dashboard')}>Continue to my dashboard</button>
            </div>
          ) : mode === 'checking' ? (
            <p className="py-10 text-center text-sm text-slate-400">Loading…</p>
          ) : (
            <>
              <h1 className="text-xl font-extrabold text-slate-900">
                {mode === 'forced' ? 'First-time login — set your own password' : 'Change your password'}
              </h1>
              <p className="mt-1.5 text-sm leading-relaxed text-slate-600">
                {mode === 'forced' ? (
                  <>
                    Your temporary password was your phone number. Create a personal password now — you will use it every
                    time from here on.
                  </>
                ) : (
                  'Choose a new password for your account.'
                )}
              </p>

              {error && <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">{error}</div>}

              <form onSubmit={onSubmit} className="mt-5 space-y-4">
                {mode === 'voluntary' && (
                  <div>
                    <label htmlFor="cur" className="label">Current password</label>
                    <input
                      id="cur"
                      type="password"
                      className="input"
                      required
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      placeholder="Your current password"
                    />
                  </div>
                )}
                <div>
                  <label htmlFor="pw1" className="label">New password</label>
                  <input
                    id="pw1"
                    type={showPwd ? 'text' : 'password'}
                    className="input pr-12"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="At least 8 characters, letter + number"
                  />
                </div>
                <div>
                  <label htmlFor="pw2" className="label">Confirm password</label>
                  <input
                    id="pw2"
                    type={showPwd ? 'text' : 'password'}
                    className="input pr-12"
                    required
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    placeholder="Repeat your new password"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => setShowPwd((v) => !v)}
                  className="text-xs font-semibold text-fuchsia-700 hover:text-fuchsia-800"
                >
                  {showPwd ? 'Hide passwords' : 'Show passwords'}
                </button>
                <div className="rounded-xl bg-slate-100 p-3 text-xs text-slate-600">
                  Use at least <strong>8 characters</strong> with at least one letter and one number — for example{' '}
                  <span className="font-mono">Bello2026!</span>
                </div>
                <button className="btn btn-lg btn-primary w-full" disabled={busy}>
                  {busy ? 'Saving…' : mode === 'forced' ? 'Set my password' : 'Change password'}
                </button>
              </form>
            </>
          )}
        </div>
        <p className="mt-6 text-center text-sm text-slate-500">
          <Link to="/" className="font-semibold text-fuchsia-700 hover:text-fuchsia-800">← Back to the OSU website</Link>
        </p>
      </div>
    </div>
  );
}
