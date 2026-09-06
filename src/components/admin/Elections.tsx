import { useCallback, useEffect, useState } from 'react';
import { api } from '../../lib/api';

interface Election {
  id: number;
  name: string;
  slug: string;
  description: string;
  opens_at: string;
  closes_at: string;
  status: string;
  results_mode?: string;
  results_announce_at?: string | null;
  votes_cast: number;
}
interface Position {
  id: number;
  name: string;
  description: string;
  display_order: number;
  active: number;
  contestants_count: number;
}
interface Contestant {
  id: number;
  full_name: string;
  level: string | null;
  position_id: number;
  position_name: string;
  manifesto: string;
  votes_count: number;
}

const STATUS_STYLE: Record<string, string> = {
  DRAFT: 'bg-slate-100 text-slate-700',
  SCHEDULED: 'bg-sky-100 text-sky-800',
  OPEN: 'bg-emerald-100 text-emerald-800',
  CLOSED: 'bg-amber-100 text-amber-800',
  RESULTS_PUBLISHED: 'bg-fuchsia-100 text-fuchsia-800',
};

function fmtDate(s: string) {
  if (!s) return '—';
  const d = new Date(s);
  return isNaN(d.getTime()) ? s : d.toLocaleString();
}

// datetime-local <-> UTC helpers (the server stores times as UTC ISO).
function isoToLocalInput(iso: string | null | undefined): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}
function localInputToIso(v: string): string {
  return v ? new Date(v).toISOString() : '';
}

function ResultsReleasePicker({ value, onChange, announce, onAnnounce }: {
  value: 'manual' | 'auto' | 'scheduled';
  onChange: (v: 'manual' | 'auto' | 'scheduled') => void;
  announce: string;
  onAnnounce: (v: string) => void;
}) {
  const opts: { v: 'manual' | 'auto' | 'scheduled'; label: string; hint: string }[] = [
    { v: 'manual', label: 'Manual', hint: 'Results stay sealed until an Electoral/Super admin presses “Publish results”.' },
    { v: 'auto', label: 'Automatic at close', hint: 'Results appear on the public site the moment voting closes.' },
    { v: 'scheduled', label: 'Scheduled', hint: 'Results appear automatically at a time you choose after closing.' },
  ];
  return (
    <div>
      <label className="label">Results release</label>
      <div className="mt-1 grid gap-2 sm:grid-cols-3">
        {opts.map((o) => (
          <button
            key={o.v}
            type="button"
            onClick={() => onChange(o.v)}
            className={`rounded-xl border p-3 text-left transition ${value === o.v ? 'border-fuchsia-600 bg-fuchsia-50 ring-1 ring-fuchsia-300' : 'border-slate-200 bg-white hover:border-fuchsia-300'}`}
          >
            <p className={`text-sm font-bold ${value === o.v ? 'text-fuchsia-800' : 'text-slate-800'}`}>{o.label}</p>
            <p className="mt-1 text-[11px] leading-snug text-slate-500">{o.hint}</p>
          </button>
        ))}
      </div>
      {value === 'scheduled' && (
        <div className="mt-2">
          <label className="label !mb-1">Announce results at (date &amp; time)</label>
          <input type="datetime-local" className="input sm:max-w-xs" value={announce} onChange={(e) => onAnnounce(e.target.value)} />
        </div>
      )}
    </div>
  );
}

// ===========================================================================
// Election management (list + create)
// ===========================================================================
export default function AdminElections() {
  const [elections, setElections] = useState<Election[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [creating, setCreating] = useState(false);
  const [selected, setSelected] = useState<Election | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await api<{ elections: Election[] }>('/api/admin/elections');
      setElections(res.elections);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const create = async (form: {
    name: string; description: string; opens_at: string; closes_at: string;
    results_mode: 'manual' | 'auto' | 'scheduled'; results_announce_at: string;
  }) => {
    setError('');
    await api('/api/admin/elections', { method: 'POST', body: JSON.stringify(form) });
    setCreating(false);
    load();
  };

  if (selected) {
    return <ElectionManager election={selected} onBack={() => { setSelected(null); load(); }} onChanged={load} />;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-bold text-slate-900">Elections</h2>
        <button className="btn btn-md btn-primary" onClick={() => setCreating(true)}>+ New election</button>
      </div>

      {error && <p className="rounded-xl bg-rose-50 p-3 text-sm text-rose-800">{error}</p>}
      {creating && (
        <CreateElectionForm onCancel={() => setCreating(false)} onDone={create} />
      )}

      {loading ? (
        <p className="text-slate-400">Loading elections…</p>
      ) : elections.length === 0 ? (
        <div className="card p-10 text-center text-slate-500">No elections yet. Create your first one.</div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {elections.map((e) => (
            <div key={e.id} className="card p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="font-bold text-slate-900">{e.name}</h3>
                  <p className="mt-0.5 text-xs text-slate-400">Opens {fmtDate(e.opens_at)} · Closes {fmtDate(e.closes_at)}</p>
                </div>
                <span className={`chip ${STATUS_STYLE[e.status] ?? ''}`}>{e.status.replace(/_/g, ' ')}</span>
              </div>
              <div className="mt-4 flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500">{e.votes_cast} vote(s) cast</span>
                <button className="btn btn-md btn-outline" onClick={() => setSelected(e)}>Manage →</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function CreateElectionForm({ onCancel, onDone }: { onCancel: () => void; onDone: (f: { name: string; description: string; opens_at: string; closes_at: string; results_mode: 'manual' | 'auto' | 'scheduled'; results_announce_at: string }) => void }) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [opens_at, setOpensAt] = useState('');
  const [closes_at, setClosesAt] = useState('');
  const [resultsMode, setResultsMode] = useState<'manual' | 'auto' | 'scheduled'>('manual');
  const [announce, setAnnounce] = useState('');
  const [err, setErr] = useState('');

  const submit = () => {
    if (!name.trim() || !opens_at || !closes_at) return setErr('Name, opening and closing times are required.');
    onDone({
      name, description,
      opens_at: new Date(opens_at).toISOString(),
      closes_at: new Date(closes_at).toISOString(),
      results_mode: resultsMode,
      results_announce_at: resultsMode === 'scheduled' ? localInputToIso(announce) : '',
    });
  };

  return (
    <div className="card p-5">
      <h3 className="font-bold text-slate-900">New election</h3>
      {err && <p className="mt-2 text-sm text-rose-700">{err}</p>}
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className="label">Name</label>
          <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="OSU Election 2026" />
        </div>
        <div className="sm:col-span-2">
          <label className="label">Description</label>
          <textarea className="input" rows={2} value={description} onChange={(e) => setDescription(e.target.value)} />
        </div>
        <div>
          <label className="label">Opens (date &amp; time)</label>
          <input type="datetime-local" className="input" value={opens_at} onChange={(e) => setOpensAt(e.target.value)} />
        </div>
        <div>
          <label className="label">Closes (date &amp; time)</label>
          <input type="datetime-local" className="input" value={closes_at} onChange={(e) => setClosesAt(e.target.value)} />
        </div>
      </div>
      <div className="mt-4">
        <ResultsReleasePicker value={resultsMode} onChange={setResultsMode} announce={announce} onAnnounce={setAnnounce} />
      </div>
      <div className="mt-4 flex gap-2">
        <button className="btn btn-md btn-primary" onClick={submit}>Create election</button>
        <button className="btn btn-md btn-outline" onClick={onCancel}>Cancel</button>
      </div>
    </div>
  );
}

// ===========================================================================
// Per-election management: positions, contestants, results
// ===========================================================================
function ElectionManager({ election, onBack, onChanged }: { election: Election; onBack: () => void; onChanged: () => void }) {
  const [view, setView] = useState<'positions' | 'contestants' | 'results'>('positions');

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <button className="btn btn-md btn-outline" onClick={onBack}>← All elections</button>
        <h2 className="text-lg font-extrabold text-slate-900">{election.name}</h2>
        <span className={`chip ${STATUS_STYLE[election.status] ?? ''}`}>{election.status.replace(/_/g, ' ')}</span>
      </div>

      <div className="inline-flex flex-wrap rounded-xl border border-slate-200 bg-white p-1">
        {(['positions', 'contestants', 'results'] as const).map((v) => (
          <button
            key={v}
            onClick={() => setView(v)}
            className={`rounded-lg px-4 py-2 text-sm font-semibold capitalize transition ${view === v ? 'bg-fuchsia-700 text-white' : 'text-slate-600 hover:text-fuchsia-700'}`}
          >
            {v}
          </button>
        ))}
      </div>

      {election.status !== 'RESULTS_PUBLISHED' && <ResultsReleaseSettings election={election} onChanged={onChanged} />}

      {view === 'positions' && <PositionsPanel election={election} />}
      {view === 'contestants' && <ContestantsPanel election={election} />}
      {view === 'results' && <ResultsPanel election={election} onChanged={onChanged} />}
    </div>
  );
}

// ---- Results release plan (editable until published) ----------------------
function ResultsReleaseSettings({ election, onChanged }: { election: Election; onChanged: () => void }) {
  const [mode, setMode] = useState<'manual' | 'auto' | 'scheduled'>(election.results_mode === 'auto' ? 'auto' : election.results_mode === 'scheduled' ? 'scheduled' : 'manual');
  const [announce, setAnnounce] = useState<string>(isoToLocalInput(election.results_announce_at));
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');

  const save = async () => {
    setSaving(true); setMsg(''); setErr('');
    try {
      await api(`/api/admin/elections/${election.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          results_mode: mode,
          results_announce_at: mode === 'scheduled' ? localInputToIso(announce) : '',
        }),
      });
      setMsg('Saved. This plan applies when the election closes.');
      onChanged();
    } catch (e2) {
      setErr(e2 instanceof Error ? e2.message : 'Save failed.');
    } finally {
      setSaving(false);
    }
  };

  const plan =
    mode === 'auto' ? 'Results will appear automatically the moment voting closes.' :
    mode === 'scheduled' ? `Results will appear automatically at ${fmtDate(localInputToIso(announce))} (must be after closing).` :
    'Results stay sealed until an Electoral/Super admin presses “Publish results”.';

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h3 className="font-bold text-slate-900">How results will be released</h3>
          <p className="mt-1 text-xs text-slate-500">{plan}</p>
          {msg && <p className="mt-2 text-xs font-semibold text-emerald-700">{msg}</p>}
          {err && <p className="mt-2 text-xs font-semibold text-rose-700">{err}</p>}
        </div>
      </div>
      <div className="mt-3">
        <ResultsReleasePicker value={mode} onChange={(m) => { setMode(m); setMsg(''); }} announce={announce} onAnnounce={setAnnounce} />
      </div>
      <button className="btn btn-md btn-primary mt-3" onClick={save} disabled={saving}>
        {saving ? 'Saving…' : 'Save results plan'}
      </button>
    </div>
  );
}

// ---- Positions ------------------------------------------------------------
function PositionsPanel({ election }: { election: Election }) {
  const [positions, setPositions] = useState<Position[]>([]);
  const [name, setName] = useState('');
  const [desc, setDesc] = useState('');
  const [err, setErr] = useState('');

  const load = async () => {
    const res = await api<{ positions: Position[] }>(`/api/admin/elections/${election.id}/positions`);
    setPositions(res.positions);
  };
  useEffect(() => {
    load().catch((e) => setErr(e.message));
  }, [election.id]);

  const add = async () => {
    if (!name.trim()) return;
    try {
      await api(`/api/admin/elections/${election.id}/positions`, { method: 'POST', body: JSON.stringify({ name, description: desc }) });
      setName('');
      setDesc('');
      setErr('');
      load();
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Add failed.');
    }
  };

  const remove = async (pid: number) => {
    if (!confirm('Delete this position? This cannot be undone if it has no votes yet.')) return;
    try {
      await api(`/api/admin/elections/${election.id}/positions/${pid}`, { method: 'DELETE' });
      load();
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Delete failed.');
    }
  };

  return (
    <div className="card p-5">
      <h3 className="font-bold text-slate-900">Positions (any number — you decide them)</h3>
      <p className="mt-1 text-xs text-slate-500">Examples: President, Vice President, General Secretary… You are not limited to a fixed list.</p>
      {err && <p className="mt-2 text-sm text-rose-700">{err}</p>}

      <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_1fr_auto]">
        <input className="input" placeholder="Position name (e.g. President)" value={name} onChange={(e) => setName(e.target.value)} />
        <input className="input" placeholder="Short description (optional)" value={desc} onChange={(e) => setDesc(e.target.value)} />
        <button className="btn btn-md btn-primary" onClick={add}>Add position</button>
      </div>

      <ul className="mt-4 divide-y divide-slate-100">
        {positions.map((p, i) => (
          <li key={p.id} className="flex items-center justify-between gap-3 py-3">
            <div>
              <p className="font-semibold text-slate-900">{i + 1}. {p.name}</p>
              {p.description && <p className="text-xs text-slate-500">{p.description}</p>}
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs text-slate-400">{p.contestants_count} contestant(s)</span>
              <button className="text-xs font-semibold text-rose-600 hover:underline" onClick={() => remove(p.id)}>Delete</button>
            </div>
          </li>
        ))}
        {positions.length === 0 && <li className="py-6 text-center text-sm text-slate-400">No positions yet.</li>}
      </ul>
    </div>
  );
}

// ---- Contestants ----------------------------------------------------------
function ContestantsPanel({ election }: { election: Election }) {
  const [positions, setPositions] = useState<Position[]>([]);
  const [contestants, setContestants] = useState<Contestant[]>([]);
  const [form, setForm] = useState({ position_id: '', full_name: '', level: '', manifesto: '' });
  const [err, setErr] = useState('');

  const loadAll = async () => {
    const [p, c] = await Promise.all([
      api<{ positions: Position[] }>(`/api/admin/elections/${election.id}/positions`),
      api<{ contestants: Contestant[] }>(`/api/admin/elections/${election.id}/contestants`),
    ]);
    setPositions(p.positions);
    setContestants(c.contestants);
  };
  useEffect(() => {
    loadAll().catch((e) => setErr(e.message));
  }, [election.id]);

  const add = async () => {
    if (!form.position_id || !form.full_name.trim()) return setErr('Choose a position and enter a name.');
    try {
      await api(`/api/admin/elections/${election.id}/contestants`, { method: 'POST', body: JSON.stringify({ ...form, position_id: Number(form.position_id) }) });
      setForm({ position_id: '', full_name: '', level: '', manifesto: '' });
      setErr('');
      loadAll();
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Add failed.');
    }
  };

  const remove = async (cid: number) => {
    if (!confirm('Remove this contestant? (Cannot if they already have votes.)')) return;
    try {
      await api(`/api/admin/elections/${election.id}/contestants/${cid}`, { method: 'DELETE' });
      loadAll();
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Remove failed.');
    }
  };

  const posName = (id: number) => positions.find((p) => p.id === id)?.name ?? '—';

  return (
    <div className="space-y-4">
      <div className="card p-5">
        <h3 className="font-bold text-slate-900">Add a contestant</h3>
        {err && <p className="mt-2 text-sm text-rose-700">{err}</p>}
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <select className="input" value={form.position_id} onChange={(e) => setForm({ ...form, position_id: e.target.value })}>
            <option value="">Position…</option>
            {positions.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
          <input className="input" placeholder="Full name" value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} />
          <input className="input" placeholder="Level (e.g. 300 Level)" value={form.level} onChange={(e) => setForm({ ...form, level: e.target.value })} />
          <input className="input" placeholder="Manifesto / one-liner" value={form.manifesto} onChange={(e) => setForm({ ...form, manifesto: e.target.value })} />
        </div>
        <button className="btn btn-md btn-primary mt-3" onClick={add}>Add contestant</button>
        <p className="mt-2 text-xs text-slate-400">Photos upload comes with the storage launch — names, levels and manifestos are enough to run a real election.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {positions.map((p) => {
          const list = contestants.filter((c) => c.position_id === p.id);
          if (list.length === 0) return null;
          return (
            <div key={p.id} className="card p-4">
              <h4 className="text-sm font-bold text-slate-900">{p.name}</h4>
              <ul className="mt-2 divide-y divide-slate-100">
                {list.map((c) => (
                  <li key={c.id} className="flex items-center justify-between gap-2 py-2">
                    <div>
                      <p className="text-sm font-semibold text-slate-800">{c.full_name}</p>
                      {c.level && <p className="text-xs text-slate-400">{c.level}</p>}
                      {c.manifesto && <p className="text-xs italic text-slate-400">“{c.manifesto}”</p>}
                    </div>
                    <button className="text-xs font-semibold text-rose-600 hover:underline" onClick={() => remove(c.id)}>Remove</button>
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
        {contestants.length === 0 && <div className="card p-8 text-center text-sm text-slate-400 sm:col-span-2 lg:col-span-3">No contestants yet.</div>}
      </div>
    </div>
  );
}

// ---- Results --------------------------------------------------------------
interface ResultsData {
  election: { status: string; results_mode?: string; results_announce_at?: string | null; results_published_at: string | null };
  summary: { eligible_voters: number; votes_cast: number; turnout_percent: number };
  positions: (Position & { contestants: (Contestant & { votes: number })[] })[];
}

function ResultsPanel({ election, onChanged }: { election: Election; onChanged: () => void }) {
  const [data, setData] = useState<ResultsData | null>(null);
  const [err, setErr] = useState('');

  const load = async () => {
    try {
      const res = await api<ResultsData>(`/api/admin/elections/${election.id}/results`);
      setData(res);
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Load failed.');
    }
  };
  useEffect(() => {
    load();
  }, [election.id]);

  const setStatus = async (status: string) => {
    if (status === 'RESULTS_PUBLISHED' && !confirm('Publish these results to the public? This cannot be undone.')) return;
    if (status === 'CLOSED' && !confirm('Close this election? Voting will stop.')) return;
    try {
      await api(`/api/admin/elections/${election.id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) });
      onChanged();
      load();
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Update failed.');
    }
  };

  if (err) return <p className="text-rose-700">{err}</p>;
  if (!data) return <p className="text-slate-400">Loading results…</p>;

  const published = data.election.status === 'RESULTS_PUBLISHED';

  return (
    <div className="space-y-4">
      <div className="card p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="font-bold text-slate-900">Live tally (admins only)</h3>
            <p className="text-xs text-slate-500">
              {data.summary.votes_cast} of {data.summary.eligible_voters} eligible voted · {data.summary.turnout_percent}% turnout
            </p>
            <p className="mt-1 text-[11px] text-slate-400">
              {data.election.results_mode === 'auto'
                ? 'Release plan: automatic — results appear the moment voting closes.'
                : data.election.results_mode === 'scheduled'
                  ? `Release plan: automatic at ${fmtDate(data.election.results_announce_at || '')}.`
                  : 'Release plan: manual — press Publish when the committee is ready (only Super/Electoral admins can).'}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {election.status === 'OPEN' && (
              <button className="btn btn-md btn-outline" onClick={() => setStatus('CLOSED')}>Close election</button>
            )}
            {!published && (
              <button className="btn btn-md btn-primary" onClick={() => setStatus('RESULTS_PUBLISHED')}>
                {data.election.results_mode === 'manual' ? 'Publish results' : 'Publish now (override plan)'}
              </button>
            )}
            {published && <span className="chip bg-fuchsia-100 text-fuchsia-800">Published ✓</span>}
          </div>
        </div>
      </div>

      {data.positions.map((p) => (
        <div key={p.id} className="card overflow-hidden">
          <h4 className="border-b border-slate-100 px-5 py-3 font-bold text-slate-900">{p.name}</h4>
          <div className="divide-y divide-slate-100">
            {p.contestants.map((c, idx) => {
              const isWinner = idx === 0 && c.votes > 0;
              return (
                <div key={c.id} className="flex items-center justify-between gap-3 px-5 py-3">
                  <div className="flex items-center gap-3">
                    <span className={`inline-flex h-7 w-7 items-center justify-center rounded-full text-xs font-extrabold ${isWinner ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                      {idx + 1}
                    </span>
                    <div>
                      <p className="text-sm font-bold text-slate-900">
                        {c.full_name}
                        {isWinner && <span className="ml-2 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold uppercase text-emerald-700">Winner</span>}
                      </p>
                      {c.level && <p className="text-xs text-slate-400">{c.level}</p>}
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-extrabold text-slate-900">{c.votes}</p>
                    <p className="text-[10px] uppercase tracking-wide text-slate-400">votes</p>
                  </div>
                </div>
              );
            })}
            {p.contestants.length === 0 && <p className="px-5 py-4 text-sm text-slate-400">No contestants for this position.</p>}
          </div>
        </div>
      ))}
    </div>
  );
}
