import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { LinkButton } from '../components/Buttons';
import { PageHeader, SectionHeading } from '../components/Section';
import { samplePositions, site } from '../data/content';

interface PubElection {
  id: number;
  name: string;
  slug: string;
  description: string;
  opens_at: string;
  closes_at: string;
  status: string;
}
interface PubResults {
  election: { name: string; results_published_at: string };
  summary: { eligible_voters: number; votes_cast: number; turnout_percent: number };
  positions: { name: string; contestants: { id: number; full_name: string; level: string | null; votes: number }[] }[];
}
interface PubCandidate {
  id: number; full_name: string; level: string | null; manifesto: string;
}
interface PubPosition {
  id: number; name: string; description: string; contestants: PubCandidate[];
}

const STATUS_LABEL: Record<string, string> = {
  SCHEDULED: 'Scheduled',
  OPEN: 'Open now',
  CLOSED: 'Closed',
  RESULTS_PUBLISHED: 'Results published',
};

const steps = [
  { title: 'Log in securely', body: 'Use your matric number and password on the student portal. Only verified members get in.' },
  { title: 'Check eligibility', body: 'The system confirms you are an ACTIVE member — graduated, suspended or ineligible students cannot vote.' },
  { title: 'Make your choices', body: 'Pick one candidate per position. Built for Android-first browsing with big, easy buttons.' },
  { title: 'Review, then submit', body: 'See a full review of your ballot, confirm, and receive a unique confirmation code.' },
];

const safeguards = [
  'One verified member = one vote per position — enforced by the system, not just the screen.',
  'Your ballot is anonymous. No admin, not even the top one, can see who you voted for.',
  'Voting opens and closes on a set timetable — enforced automatically.',
  'Results stay sealed until the electoral committee officially publishes them.',
  'Every admin action is recorded in an audit log. Your choices never are.',
];

export default function Election() {
  const [elections, setElections] = useState<PubElection[]>([]);
  const [results, setResults] = useState<PubResults | null>(null);
  const [detail, setDetail] = useState<{ election: PubElection; positions: PubPosition[] } | null>(null);
  const [statusErr, setStatusErr] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/elections').then((r) => r.json());
        const list: PubElection[] = res.elections || [];
        setElections(list);
        const published = list.find((e: PubElection) => e.status === 'RESULTS_PUBLISHED');
        if (published) {
          const rr = await fetch(`/api/elections/${published.slug}/results`).then((r) => r.json());
          setResults(rr);
        }
        // Show the real candidates for the upcoming/open election so members
        // can read who is contesting before voting opens.
        const preview = list.find((e: PubElection) => e.status === 'SCHEDULED' || e.status === 'OPEN');
        if (preview) {
          try {
            const det = await fetch(`/api/elections/${preview.slug}`).then((r) => r.json());
            if (det && det.election && Array.isArray(det.positions)) {
              setDetail({ election: preview, positions: det.positions.filter((p: PubPosition) => p.contestants.length > 0) });
            }
          } catch { /* preview is optional */ }
        }
      } catch {
        setStatusErr('Could not load election status.');
      }
    })();
  }, []);

  const openNow = elections.find((e) => e.status === 'OPEN');
  const scheduled = elections.filter((e) => e.status === 'SCHEDULED').slice(0, 3);

  return (
    <>
      <PageHeader
        eyebrow="Union Election"
        title={site.slogan}
        intro="The OSU election platform is built to be secure, private and fair — so the union you get is the union you chose."
      />

      {/* Live status / CTA banner */}
      <section className="py-12 sm:py-16">
        <div className="container-x">
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#701a75] to-[#a21caf] p-8 text-white sm:p-12">
            <div className="pointer-events-none absolute -right-16 -top-16 h-64 w-64 rounded-full bg-white/10 blur-2xl" />
            <div className="relative max-w-2xl">
              <span className="chip bg-white/15 text-white">Election status · live</span>
              {openNow ? (
                <>
                  <h2 className="mt-4 text-2xl font-extrabold sm:text-3xl">🗳️ {openNow.name} is open now</h2>
                  <p className="mt-3 text-white/85">Voting closes automatically at the scheduled time. Log in to cast your secure, anonymous vote.</p>
                  <div className="mt-7 flex flex-col gap-3 sm:flex-row">
                    <LinkButton to="/vote" size="lg" variant="white">Vote now</LinkButton>
                    <LinkButton to="/login" size="lg" variant="ghost-light">Student login</LinkButton>
                  </div>
                </>
              ) : results ? (
                <>
                  <h2 className="mt-4 text-2xl font-extrabold sm:text-3xl">Results are published</h2>
                  <p className="mt-3 text-white/85">{results.election.name} — see the full outcome below.</p>
                  <LinkButton to="/election#results" size="lg" variant="white">View results ↓</LinkButton>
                </>
              ) : scheduled.length > 0 ? (
                <>
                  <h2 className="mt-4 text-2xl font-extrabold sm:text-3xl">📅 {scheduled[0].name} is scheduled</h2>
                  <p className="mt-3 text-white/85">Voting opens at the scheduled time. Make sure you are a <strong>verified member</strong> so you can vote.</p>
                  <div className="mt-7 flex flex-col gap-3 sm:flex-row">
                    <LinkButton to="/login" size="lg" variant="white">Go to student login</LinkButton>
                    <LinkButton to="/register" size="lg" variant="ghost-light">Not a member? Join OSU</LinkButton>
                  </div>
                </>
              ) : (
                <>
                  <h2 className="mt-4 text-2xl font-extrabold sm:text-3xl">No election is open right now</h2>
                  <p className="mt-3 text-white/85">
                    When an election opens, this page becomes the official voting portal and the timetable is published here.
                    Make sure you are a <strong>verified member</strong> so you are ready to vote.
                  </p>
                  <div className="mt-7 flex flex-col gap-3 sm:flex-row">
                    <LinkButton to="/login" size="lg" variant="white">Go to student login</LinkButton>
                    <LinkButton to="/register" size="lg" variant="ghost-light">Not a member? Join OSU</LinkButton>
                  </div>
                </>
              )}
              {statusErr && <p className="mt-4 text-sm text-white/60">{statusErr}</p>}
            </div>
          </div>

          {/* Timetable strip */}
          {elections.length > 0 && (
            <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {elections.slice(0, 3).map((e) => (
                <div key={e.id} className="card p-4">
                  <p className="text-sm font-bold text-slate-900">{e.name}</p>
                  <span className={`chip mt-2 ${e.status === 'OPEN' ? 'bg-emerald-100 text-emerald-700' : e.status === 'RESULTS_PUBLISHED' ? 'bg-fuchsia-100 text-fuchsia-700' : 'bg-slate-100 text-slate-600'}`}>
                    {STATUS_LABEL[e.status] ?? e.status}
                  </span>
                  <p className="mt-2 text-xs text-slate-400">Closes {new Date(e.closes_at).toLocaleString()}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Meet the candidates (real list for scheduled/open elections) */}
      {detail && detail.positions.length > 0 && (
        <section id="candidates" className="bg-slate-50 py-16 sm:py-20">
          <div className="container-x">
            <SectionHeading
              eyebrow="Meet the candidates"
              title={detail.election.name}
              intro="These are the candidates on the ballot. One member, one choice per position."
              align="center"
            />
            <div className="mt-10 grid gap-4 md:grid-cols-2">
              {detail.positions.map((pos) => (
                <div key={pos.id} className="card p-5">
                  <h3 className="text-base font-extrabold text-slate-900">{pos.name}</h3>
                  <ul className="mt-3 space-y-2">
                    {pos.contestants.map((c) => (
                      <li key={c.id} className="flex items-start justify-between gap-3 rounded-xl bg-slate-50 px-3 py-2">
                        <div>
                          <p className="text-sm font-bold text-slate-800">{c.full_name}</p>
                          {c.manifesto && <p className="text-xs italic text-slate-500">“{c.manifesto}”</p>}
                          {c.level && <p className="text-[11px] uppercase tracking-wide text-slate-400">{c.level}</p>}
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* How it works */}
      <section className="section-pad pt-0 sm:pt-0">
        <div className="container-x">
          <SectionHeading
            eyebrow="How voting works"
            title="Four simple steps to your vote"
            intro="Designed to be effortless on a phone — the whole flow takes under a minute."
            align="center"
          />
          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {steps.map((s, i) => (
              <div key={s.title} className="card relative p-6">
                <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-fuchsia-600 to-fuchsia-800 text-lg font-extrabold text-white">
                  {i + 1}
                </span>
                <h3 className="mt-4 text-base font-bold text-slate-900">{s.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">{s.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Positions preview — hidden while the real candidate list is shown */}
      <section className="bg-white py-16 sm:py-20">
        <div className="container-x">
          {!detail && (
          <>
          <SectionHeading
            eyebrow="Positions"
            title="Offices you vote for"
            intro="Positions are created by the electoral committee for each election — these are the classic union offices."
          />
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {samplePositions.map((p) => (
              <div key={p.name} className="card flex items-start gap-4 p-5 transition hover:border-fuchsia-300">
                <span className="mt-0.5 inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-fuchsia-100 text-fuchsia-700">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg>
                </span>
                <div>
                  <h3 className="font-bold text-slate-900">{p.name}</h3>
                  <p className="mt-1 text-sm leading-relaxed text-slate-600">{p.desc}</p>
                </div>
              </div>
            ))}
          </div>
          <p className="mt-6 text-center text-sm text-slate-400">
            Contestant cards with photos and manifestos appear here when nominations open.
          </p>
          </>
          )}
        </div>
      </section>

      {/* Safeguards */}
      <section className="section-pad">
        <div className="container-x grid items-start gap-10 lg:grid-cols-[0.9fr_1.1fr]">
          <SectionHeading
            eyebrow="Fair by design"
            title="Election safeguards"
            intro="We treat this as a real election — because it is one."
          />
          <ul className="space-y-3">
            {safeguards.map((s) => (
              <li key={s} className="card flex items-start gap-4 p-5">
                <span className="mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg>
                </span>
                <p className="text-sm font-medium leading-relaxed text-slate-700">{s}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Results */}
      <section id="results" className="bg-white py-16 sm:py-20">
        <div className="container-x">
          {results ? (
            <>
              <div className="text-center">
                <SectionHeading
                  eyebrow="Election results"
                  title={results.election.name}
                  intro="Winner highlighted in green. Published officially by the electoral committee."
                  align="center"
                />
                <div className="mt-6 flex flex-wrap items-center justify-center gap-4 text-sm">
                  <span className="chip bg-slate-100 text-slate-600">{results.summary.eligible_voters} eligible voters</span>
                  <span className="chip bg-slate-100 text-slate-600">{results.summary.votes_cast} votes cast</span>
                  <span className="chip bg-fuchsia-100 text-fuchsia-800">{results.summary.turnout_percent}% turnout</span>
                  <span className="chip bg-slate-100 text-slate-600">Published {new Date(results.election.results_published_at).toLocaleString()}</span>
                </div>
              </div>

              <div className="mx-auto mt-10 max-w-3xl space-y-8">
                {results.positions.map((p) => {
                  const max = Math.max(...p.contestants.map((c) => c.votes), 0);
                  return (
                    <div key={p.name}>
                      <h3 className="mb-3 text-lg font-extrabold text-slate-900">{p.name}</h3>
                      <div className="space-y-2">
                        {p.contestants.map((c) => {
                          const isWinner = c.votes > 0 && c.votes === max;
                          return (
                            <div
                              key={c.id}
                              className={`flex items-center justify-between gap-3 rounded-2xl border-2 px-4 py-3 ${
                                isWinner ? 'border-emerald-300 bg-emerald-50' : 'border-rose-200 bg-rose-50'
                              }`}
                            >
                              <div className="flex items-center gap-3">
                                <span className={`inline-flex h-9 w-9 items-center justify-center rounded-full text-sm font-extrabold ${isWinner ? 'bg-emerald-600 text-white' : 'bg-rose-400 text-white'}`}>
                                  {isWinner ? '✓' : c.full_name.charAt(0)}
                                </span>
                                <div>
                                  <p className="font-bold text-slate-900">
                                    {c.full_name}
                                    {isWinner && (
                                      <span className="ml-2 rounded-full bg-emerald-600 px-2 py-0.5 text-[10px] font-bold uppercase text-white">Winner</span>
                                    )}
                                  </p>
                                  {c.level && <p className="text-xs text-slate-500">{c.level}</p>}
                                </div>
                              </div>
                              <p className="text-lg font-extrabold text-slate-900">{c.votes} <span className="text-xs font-semibold text-slate-400">votes</span></p>
                            </div>
                          );
                        })}
                        {p.contestants.length === 0 && <p className="text-sm text-slate-400">No contestants for this position.</p>}
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          ) : (
            <div className="max-w-3xl text-center mx-auto">
              <h2 className="text-2xl font-extrabold text-slate-900 sm:text-3xl">Election results</h2>
              <p className="mt-3 text-slate-600">
                Results are kept private until the electoral committee officially publishes them. After publication, this page
                shows the outcome — winner highlighted in green — alongside turnout figures.
              </p>
              <p className="mt-6 rounded-2xl border border-dashed border-fuchsia-300 bg-fuchsia-50 p-4 text-sm text-fuchsia-900">
                No published results right now. Check back after the electoral committee releases them.
              </p>
            </div>
          )}
        </div>
      </section>
    </>
  );
}
