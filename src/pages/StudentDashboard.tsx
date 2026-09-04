import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import { StatusBadge } from '../lib/status';

interface Me {
  student: {
    full_name: string;
    matric_number: string;
    email: string | null;
    level: string | null;
    status: string;
    must_change_password?: number | boolean;
    created_at: string;
  };
  voting_eligible: boolean;
}

export default function StudentDashboard() {
  const [me, setMe] = useState<Me | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    api<Me>('/api/student/auth/me')
      .then((res) => {
        // A student still on the temporary phone password must set a real one first.
        if (res.student.must_change_password) navigate('/set-password');
        else setMe(res);
      })
      .catch(() => navigate('/login?reason=auth'))
      .finally(() => setLoading(false));
  }, [navigate]);

  if (loading) return <p className="py-24 text-center text-slate-400">Loading your dashboard…</p>;
  if (!me) return null;

  const s = me.student;

  return (
    <section className="bg-slate-50 py-10">
      <div className="container-x max-w-4xl">
        {/* Welcome header */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#701a75] to-[#a21caf] p-8 text-white">
          <div className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-white/10 blur-2xl" />
          <p className="text-sm text-fuchsia-200">Welcome back, member</p>
          <h1 className="mt-1 text-2xl font-extrabold sm:text-3xl">{s.full_name}</h1>
          <div className="mt-4 flex flex-wrap gap-2">
            <span className="chip bg-white/15 text-white">Matric: {s.matric_number}</span>
            {s.level && <span className="chip bg-white/15 text-white">{s.level}</span>}
            <StatusBadge status={s.status} />
          </div>
        </div>

        {/* Eligibility banner */}
        <div className={`mt-5 rounded-2xl border p-5 ${me.voting_eligible ? 'border-emerald-200 bg-emerald-50' : 'border-amber-200 bg-amber-50'}`}>
          <p className={`font-bold ${me.voting_eligible ? 'text-emerald-900' : 'text-amber-900'}`}>
            {me.voting_eligible ? '✓ You are eligible to vote in union elections.' : 'Account status: not eligible to vote yet.'}
          </p>
          <p className={`mt-1 text-sm ${me.voting_eligible ? 'text-emerald-800' : 'text-amber-800'}`}>
            {me.voting_eligible
              ? 'When an election is open, the Election page becomes your voting portal.'
              : s.status === 'ACTIVE'
              ? 'Your status is active.'
              : 'Only ACTIVE members can vote. If you believe this is a mistake, contact the union.'}
          </p>
        </div>

        <div className="mt-5 grid gap-4 sm:grid-cols-3">
          <Link to="/vote" className="card p-5 transition hover:-translate-y-0.5 hover:shadow-soft">
            <p className="text-2xl">🗳️</p>
            <h3 className="mt-2 font-bold text-slate-900">Vote</h3>
            <p className="mt-1 text-sm text-slate-500">Cast your secure, anonymous vote when an election is open.</p>
          </Link>
          <Link to="/announcements" className="card p-5 transition hover:-translate-y-0.5 hover:shadow-soft">
            <p className="text-2xl">📣</p>
            <h3 className="mt-2 font-bold text-slate-900">Announcements</h3>
            <p className="mt-1 text-sm text-slate-500">Latest news from the union.</p>
          </Link>
          <Link to="/events" className="card p-5 transition hover:-translate-y-0.5 hover:shadow-soft">
            <p className="text-2xl">🎉</p>
            <h3 className="mt-2 font-bold text-slate-900">Events</h3>
            <p className="mt-1 text-sm text-slate-500">What’s coming up for members.</p>
          </Link>
        </div>

        {/* Profile card */}
        <div className="card mt-5 p-6">
          <h3 className="font-bold text-slate-900">Your profile</h3>
          <dl className="mt-4 grid gap-x-8 gap-y-3 text-sm sm:grid-cols-2">
            <div className="flex justify-between gap-4 border-b border-slate-100 pb-2"><dt className="text-slate-500">Full name</dt><dd className="font-semibold text-slate-900">{s.full_name}</dd></div>
            <div className="flex justify-between gap-4 border-b border-slate-100 pb-2"><dt className="text-slate-500">Matric number</dt><dd className="font-mono font-semibold text-slate-900">{s.matric_number}</dd></div>
            <div className="flex justify-between gap-4 border-b border-slate-100 pb-2"><dt className="text-slate-500">Level</dt><dd className="font-semibold text-slate-900">{s.level || '—'}</dd></div>
            <div className="flex justify-between gap-4 border-b border-slate-100 pb-2"><dt className="text-slate-500">Email</dt><dd className="font-semibold text-slate-900">{s.email || '—'}</dd></div>
            <div className="flex justify-between gap-4 border-b border-slate-100 pb-2"><dt className="text-slate-500">Member since</dt><dd className="font-semibold text-slate-900">{s.created_at}</dd></div>
            <div className="flex justify-between gap-4 border-b border-slate-100 pb-2"><dt className="text-slate-500">Status</dt><dd><StatusBadge status={s.status} /></dd></div>
          </dl>
          <button
            className="btn btn-md btn-outline mt-6"
            onClick={async () => {
              await api('/api/student/auth/logout', { method: 'POST' }).catch(() => undefined);
              navigate('/login');
            }}
          >
            Sign out
          </button>
        </div>
      </div>
    </section>
  );
}
