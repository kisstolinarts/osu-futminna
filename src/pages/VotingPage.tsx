import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../lib/api';

interface Contestant {
  id: number;
  full_name: string;
  level: string | null;
  manifesto: string;
}
interface Position {
  id: number;
  name: string;
  description: string;
  contestants: Contestant[];
}
interface Status {
  eligible: boolean;
  reason?: string;
  open_election: null | { id: number; name: string; slug: string; description?: string };
  has_voted?: boolean;
  confirmation_code?: string;
  voted_at?: string;
  positions?: Position[];
}

type Step = 'pick' | 'review' | 'done';

export default function VotingPage() {
  const [status, setStatus] = useState<Status | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [needPassword, setNeedPassword] = useState(false);
  const [step, setStep] = useState<Step>('pick');
  const [selections, setSelections] = useState<Record<number, number>>({});
  const [confirmCode, setConfirmCode] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();

  const load = async () => {
    setLoading(true);
    try {
      const res = await api<Status>('/api/voting/status');
      setStatus(res);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed to load.';
      // The server rejects voting while the student is still on the temporary
      // phone-number password.
      if (/set your own password/i.test(msg)) setNeedPassword(true);
      else setError(msg);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    load();
  }, []);

  const allPicked = (status?.positions ?? []).every((p) => selections[p.id]);
  const missing = (status?.positions ?? []).filter((p) => !selections[p.id]);

  const submit = async () => {
    setSubmitting(true);
    setError('');
    try {
      const res = await api<{ confirmation_code: string }>('/api/voting/submit', {
        method: 'POST',
        body: JSON.stringify({ choices: selections }),
      });
      setConfirmCode(res.confirmation_code);
      setStep('done');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Vote failed.');
      setStep('pick');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <p className="py-24 text-center text-slate-400">Loading election portal…</p>;

  if (needPassword) {
    return (
      <SectionShell>
        <div className="card mx-auto max-w-lg p-8 text-center">
          <p className="text-3xl">🔑</p>
          <h1 className="mt-3 text-xl font-bold text-slate-900">Set your own password first</h1>
          <p className="mt-2 text-sm text-slate-600">
            You are still on the temporary phone-number password. Set a personal password before you can vote.
          </p>
          <Link to="/set-password" className="btn btn-lg btn-primary mt-6">Set my password</Link>
        </div>
      </SectionShell>
    );
  }

  if (error && !status) {
    return (
      <SectionShell>
        <div className="card p-8 text-center">
          <p className="text-2xl">🔐</p>
          <h1 className="mt-3 text-lg font-bold text-slate-900">Please log in to vote</h1>
          <p className="mt-1 text-sm text-slate-500">{error}</p>
          <Link to="/login" className="btn btn-lg btn-primary mt-6">Student login</Link>
        </div>
      </SectionShell>
    );
  }

  if (!status) return null;

  // Not eligible
  if (!status.eligible) {
    return (
      <SectionShell>
        <div className="card p-8 text-center max-w-lg mx-auto">
          <p className="text-2xl">🚫</p>
          <h1 className="mt-3 text-xl font-bold text-slate-900">You are not eligible to vote</h1>
          <p className="mt-2 text-sm text-slate-600">
            Only ACTIVE members can vote. If you believe this is a mistake, contact the union.
          </p>
          <Link to="/dashboard" className="btn btn-md btn-outline mt-6">Back to my dashboard</Link>
        </div>
      </SectionShell>
    );
  }

  // No open election
  if (!status.open_election) {
    return (
      <SectionShell>
        <div className="card p-8 text-center max-w-lg mx-auto">
          <p className="text-3xl">🗳️</p>
          <h1 className="mt-3 text-xl font-bold text-slate-900">No election is open right now</h1>
          <p className="mt-2 text-sm text-slate-600">When the union opens an election, it will appear here automatically.</p>
          <Link to="/dashboard" className="btn btn-md btn-outline mt-6">Back to my dashboard</Link>
        </div>
      </SectionShell>
    );
  }

  // Already voted
  if (status.has_voted) {
    return (
      <SectionShell>
        <div className="card p-8 text-center max-w-lg mx-auto">
          <p className="text-3xl">✅</p>
          <h1 className="mt-3 text-xl font-bold text-slate-900">You have already voted</h1>
          <p className="mt-2 text-sm text-slate-600">
            Your vote in <strong>{status.open_election.name}</strong> was recorded.
          </p>
          {status.confirmation_code && (
            <div className="mt-4 rounded-2xl bg-fuchsia-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-fuchsia-700">Your confirmation code</p>
              <p className="mt-1 font-mono text-2xl font-extrabold tracking-wider text-fuchsia-900">{status.confirmation_code}</p>
              <p className="mt-1 text-xs text-slate-500">Keep this as your receipt. It cannot be used to reveal your choices.</p>
            </div>
          )}
          <Link to="/dashboard" className="btn btn-md btn-outline mt-6">Back to my dashboard</Link>
        </div>
      </SectionShell>
    );
  }

  const positions = status.positions ?? [];

  // --- SUCCESS ---
  if (step === 'done') {
    return (
      <SectionShell>
        <div className="card p-8 text-center max-w-lg mx-auto">
          <span className="mx-auto inline-flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
            <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg>
          </span>
          <h1 className="mt-4 text-xl font-bold text-slate-900 sm:text-2xl">Your vote has been successfully recorded.</h1>
          <div className="mt-5 rounded-2xl bg-fuchsia-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-fuchsia-700">Your confirmation code</p>
            <p className="mt-1 font-mono text-3xl font-extrabold tracking-wider text-fuchsia-900">{confirmCode}</p>
            <p className="mt-1 text-xs text-slate-500">Write it down. It proves you voted — without revealing who you chose.</p>
          </div>
          <p className="mt-4 text-sm text-slate-500">Thank you for exercising your right as an OSU member. 🇳🇬</p>
          <Link to="/dashboard" className="btn btn-lg btn-primary mt-6 w-full">Go to my dashboard</Link>
        </div>
      </SectionShell>
    );
  }

  // --- REVIEW ---
  if (step === 'review') {
    return (
      <SectionShell>
        <div className="mx-auto max-w-xl">
          <div className="card p-6 sm:p-8">
            <p className="eyebrow">Step 2 of 2</p>
            <h1 className="mt-2 text-xl font-extrabold text-slate-900">Review your ballot</h1>
            <p className="mt-1 text-sm text-slate-500">Confirm these are the candidates you want to vote for.</p>

            <div className="mt-5 space-y-3">
              {positions.map((p) => {
                const cid = selections[p.id];
                const c = p.contestants.find((x) => x.id === cid);
                return (
                  <div key={p.id} className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 p-4">
                    <div>
                      <p className="text-xs font-bold uppercase tracking-wide text-slate-400">{p.name}</p>
                      <p className="font-bold text-slate-900">{c?.full_name}</p>
                    </div>
                    <span className="chip bg-emerald-100 text-emerald-700">Selected</span>
                  </div>
                );
              })}
            </div>

            <div className="mt-6 flex flex-col gap-2 sm:flex-row">
              <button className="btn btn-md btn-outline sm:flex-1" onClick={() => setStep('pick')}>← Go back &amp; change</button>
              <button className="btn btn-md btn-primary sm:flex-1" onClick={submit} disabled={submitting}>
                {submitting ? 'Submitting…' : 'Submit final vote'}
              </button>
            </div>
            {error && <p className="mt-3 rounded-xl bg-rose-50 p-3 text-sm text-rose-800">{error}</p>}
          </div>
        </div>
      </SectionShell>
    );
  }

  // --- PICK ---
  return (
    <SectionShell>
      <div className="mx-auto max-w-2xl">
        <div className="mb-6 text-center">
          <p className="eyebrow justify-center !flex">Step 1 of 2</p>
          <h1 className="mt-2 text-2xl font-extrabold text-slate-900 sm:text-3xl">{status.open_election.name}</h1>
          <p className="mt-1 text-sm text-slate-500">Select one candidate for each position, then review.</p>
        </div>

        {error && <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">{error}</div>}

        <div className="space-y-8">
          {positions.map((p, pi) => (
            <div key={p.id}>
              <div className="mb-3 flex items-center gap-2">
                <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-fuchsia-100 text-sm font-extrabold text-fuchsia-700">{pi + 1}</span>
                <h2 className="text-lg font-bold text-slate-900">{p.name}</h2>
                {selections[p.id] && <span className="chip bg-emerald-100 text-emerald-700">✓ chosen</span>}
              </div>
              {p.description && <p className="mb-3 -mt-1 pl-9 text-sm text-slate-500">{p.description}</p>}

              <div className="grid gap-3 sm:grid-cols-2">
                {p.contestants.map((c) => {
                  const chosen = selections[p.id] === c.id;
                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => setSelections((s) => ({ ...s, [p.id]: c.id }))}
                      className={`flex items-start gap-4 rounded-2xl border-2 p-4 text-left transition ${
                        chosen ? 'border-fuchsia-600 bg-fuchsia-50 shadow-soft' : 'border-slate-200 bg-white hover:border-fuchsia-300'
                      }`}
                    >
                      <span className={`inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-base font-extrabold ${chosen ? 'bg-fuchsia-700 text-white' : 'bg-slate-100 text-slate-500'}`}>
                        {chosen ? '✓' : c.full_name.charAt(0)}
                      </span>
                      <span>
                        <span className="block font-bold text-slate-900">{c.full_name}</span>
                        {c.level && <span className="block text-xs text-slate-400">{c.level}</span>}
                        {c.manifesto && <span className="mt-1 block text-xs italic leading-relaxed text-slate-500">“{c.manifesto}”</span>}
                      </span>
                    </button>
                  );
                })}
                {p.contestants.length === 0 && <p className="text-sm text-slate-400">No contestants listed for this position yet.</p>}
              </div>
            </div>
          ))}
        </div>

        {missing.length > 0 && (
          <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
            Please choose a candidate for: {missing.map((m) => m.name).join(', ')}.
          </div>
        )}

        <button
          className="btn btn-lg btn-primary mt-6 w-full"
          onClick={() => setStep('review')}
          disabled={!allPicked}
        >
          Review vote →
        </button>
        {!allPicked && <p className="mt-2 text-center text-xs text-slate-400">Select one candidate per position to continue.</p>}
      </div>
    </SectionShell>
  );
}

function SectionShell({ children }: { children: React.ReactNode }) {
  return <section className="bg-slate-50 py-12 sm:py-16">{children}</section>;
}
