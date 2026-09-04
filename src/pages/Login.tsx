import { useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import Logo from '../components/Logo';
import { api } from '../lib/api';

export default function Login() {
  const [matric, setMatric] = useState('');
  const [password, setPassword] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [firstTime, setFirstTime] = useState(false);
  const [params] = useSearchParams();
  const navigate = useNavigate();

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      const res = await api<{ student: { must_change_password: boolean } }>('/api/student/auth/login', {
        method: 'POST',
        body: JSON.stringify({ matric, password }),
      });
      // First login with the temporary phone-number password: force a reset.
      navigate(res.student.must_change_password ? '/set-password' : '/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="grid min-h-[calc(100vh-4rem)] lg:grid-cols-2">
      {/* Brand side */}
      <section className="relative hidden overflow-hidden bg-gradient-to-br from-[#2e1065] via-[#701a75] to-[#a21caf] lg:flex lg:flex-col lg:justify-center lg:p-14">
        <div className="pointer-events-none absolute -right-24 top-10 h-80 w-80 rounded-full bg-white/10 blur-3xl" />
        <div className="pointer-events-none absolute -left-16 bottom-0 h-80 w-80 rounded-full bg-fuchsia-400/20 blur-3xl" />
        <div className="relative">
          <Logo full dark size={56} />
          <h1 className="mt-10 max-w-md text-4xl font-extrabold leading-tight text-white">
            Welcome back to the <span className="text-fuchsia-300">Offa family</span>.
          </h1>
          <p className="mt-4 max-w-md text-white/80">
            Access your member dashboard, check announcements and cast your vote when elections are open.
          </p>
          <ul className="mt-8 space-y-3 text-sm text-white/85">
            {['Verified membership only', 'One member, one vote', 'Private, anonymous ballots'].map((t) => (
              <li key={t} className="flex items-center gap-3">
                <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-emerald-400/20 text-emerald-300">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg>
                </span>
                {t}
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Form side */}
      <section className="flex items-center justify-center px-4 py-12 sm:px-8">
        <div className="w-full max-w-md">
          <div className="mb-8 lg:hidden">
            <Logo full />
          </div>
          <h2 className="text-2xl font-extrabold tracking-tight text-slate-900">Student login</h2>
          <p className="mt-1.5 text-sm text-slate-500">
            Sign in with your matriculation number and password.
          </p>

          {params.get('reason') === 'auth' && (
            <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
              Please log in to view your member dashboard.
            </div>
          )}
          {params.get('reason') === 'password' && (
            <div className="mt-5 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
              Your password was updated. Log in with your new password.
            </div>
          )}
          {firstTime && (
            <div className="mt-5 rounded-2xl border border-fuchsia-200 bg-fuchsia-50 p-4 text-sm text-fuchsia-900">
              <p className="font-bold">First time signing in?</p>
              <p className="mt-1">
                Your temporary password is the <strong>phone number you used on the OSU form</strong> (e.g.{' '}
                <span className="font-mono">0812 345 6789</span>). On your first login you will be asked to create your own
                password.
              </p>
            </div>
          )}
          {error && (
            <div className="mt-5 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">{error}</div>
          )}

          <form onSubmit={onSubmit} className="card mt-6 p-6 sm:p-8">
            <div>
              <label htmlFor="matric" className="label">Matriculation number</label>
              <input
                id="matric"
                className="input font-mono"
                placeholder="e.g. 2022/12345"
                value={matric}
                onChange={(e) => setMatric(e.target.value)}
                required
              />
              <p className="hint">Any format works — 2022/12345 and 2022-12345 are treated the same.</p>
            </div>
            <div className="mt-5">
              <div className="flex items-center justify-between">
                <label htmlFor="password" className="label">Password</label>
                <button type="button" className="text-xs font-semibold text-fuchsia-700 hover:text-fuchsia-800" onClick={() => setFirstTime((v) => !v)}>
                  First time here?
                </button>
              </div>
              <div className="relative">
                <input
                  id="password"
                  type={showPwd ? 'text' : 'password'}
                  className="input pr-12"
                  placeholder="Your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPwd((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 transition hover:text-fuchsia-700"
                  aria-label={showPwd ? 'Hide password' : 'Show password'}
                >
                  {showPwd ? (
                    <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9.88 9.88a3 3 0 1 0 4.24 4.24" /><path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68" /><path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61" /><path d="M2 2l20 20" /></svg>
                  ) : (
                    <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" /><circle cx="12" cy="12" r="3" /></svg>
                  )}
                </button>
              </div>
            </div>
            <button type="submit" className="btn btn-lg btn-primary mt-7 w-full" disabled={busy}>
              {busy ? 'Signing in…' : 'Log in'}
            </button>
            <p className="mt-5 text-center text-sm text-slate-500">
              Not a member yet?{' '}
              <Link to="/register" className="font-semibold text-fuchsia-700 hover:text-fuchsia-800">
                Join OSU
              </Link>
            </p>
          </form>
        </div>
      </section>
    </div>
  );
}
