import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Logo from '../components/Logo';

/** How to become a member. If the union has set a Google Form link in the
 *  admin Settings, "Join OSU" points there — the app imports new members
 *  from that form automatically. */

const steps = [
  { n: '1', t: 'Fill the official OSU form', d: 'Tell the union who you are — name, matric number, level and phone.' },
  { n: '2', t: 'Union verifies & imports you', d: 'The union checks your details and adds you to the member database.' },
  { n: '3', t: 'Log in with your phone number', d: 'Until you set your own password, your password is the phone number you wrote on the OSU form.' },
  { n: '4', t: 'Set your own password', d: 'On first login you will be asked to create your own password — then vote when elections run.' },
];

export default function Register() {
  const [joinUrl, setJoinUrl] = useState('');

  useEffect(() => {
    fetch('/api/public/config')
      .then((r) => r.json())
      .then((d) => setJoinUrl(d.join_form_url || ''))
      .catch(() => undefined);
  }, []);

  return (
    <div className="grid min-h-[calc(100vh-4rem)] lg:grid-cols-[0.85fr_1.15fr]">
      {/* Left: explainer */}
      <section className="relative overflow-hidden bg-gradient-to-br from-[#2e1065] via-[#701a75] to-[#a21caf] p-8 sm:p-12 lg:p-14">
        <div className="pointer-events-none absolute -right-20 top-0 h-72 w-72 rounded-full bg-white/10 blur-3xl" />
        <div className="relative">
          <Logo full dark />
          <h1 className="mt-10 text-2xl font-extrabold leading-tight text-white sm:text-3xl">
            Become a verified OSU member
          </h1>
          <p className="mt-3 max-w-md text-sm leading-relaxed text-white/80 sm:text-base">
            Membership is open to every student of Offa origin at FUTMinna. Verification keeps the union real, secure and
            fair — only verified members can vote.
          </p>
          <ol className="mt-8 space-y-4">
            {steps.map((s) => (
              <li key={s.n} className="flex gap-4">
                <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/30 bg-white/10 text-sm font-extrabold text-white">
                  {s.n}
                </span>
                <div>
                  <p className="text-sm font-bold text-white">{s.t}</p>
                  <p className="mt-0.5 text-sm leading-relaxed text-white/70">{s.d}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Right: action */}
      <section className="flex items-center justify-center bg-slate-50 px-4 py-12 sm:px-8">
        <div className="w-full max-w-lg">
          <div className="mb-6 lg:hidden">
            <Logo full />
          </div>

          <div className="card p-8">
            <h2 className="text-xl font-extrabold tracking-tight text-slate-900">How to join OSU</h2>
            <p className="mt-1.5 text-sm leading-relaxed text-slate-500">
              Registration for the union runs through the official OSU form. Once the union imports and approves you, log in
              with your matriculation number and your phone number as the temporary password.
            </p>

            <div className="mt-6 space-y-3">
              <div className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <span className="mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-fuchsia-100 text-sm font-extrabold text-fuchsia-700">1</span>
                <p className="text-sm text-slate-600">
                  <strong>Fill the form</strong>
                  {joinUrl ? (
                    <>
                      {' '}— tap the button below to open the official OSU membership form.
                    </>
                  ) : (
                    <> — the union will share the membership form link with students (it appears here once set).</>
                  )}
                </p>
              </div>
              <div className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <span className="mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-fuchsia-100 text-sm font-extrabold text-fuchsia-700">2</span>
                <p className="text-sm text-slate-600">
                  <strong>Log in</strong> — once the union adds you, sign in with your matric number. Your temporary password
                  is the phone number you wrote on the OSU form.
                </p>
              </div>
              <div className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <span className="mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-fuchsia-100 text-sm font-extrabold text-fuchsia-700">3</span>
                <p className="text-sm text-slate-600">
                  <strong>Set your own password</strong> — the first time you log in you’ll be asked to create a personal
                  password, then you’re ready to vote.
                </p>
              </div>
            </div>

            {joinUrl ? (
              <a href={joinUrl} target="_blank" rel="noreferrer" className="btn btn-lg btn-primary mt-6 w-full">
                Open the official OSU membership form
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M7 17 17 7" /><path d="M8 7h9v9" /></svg>
              </a>
            ) : (
              <p className="mt-6 rounded-2xl border border-dashed border-fuchsia-300 bg-fuchsia-50 p-4 text-center text-sm text-fuchsia-900">
                The membership form link will appear here once the union sets it up.
              </p>
            )}

            <div className="mt-6 border-t border-slate-100 pt-5 text-center">
              <p className="text-sm text-slate-500">
                Already a member?{' '}
                <Link to="/login" className="font-semibold text-fuchsia-700 hover:text-fuchsia-800">
                  Log in with your matric number
                </Link>
              </p>
            </div>
          </div>

          <p className="mt-5 text-center text-xs text-slate-400">
            One account per matriculation number. 🔒 Your data is private to the union.
          </p>
        </div>
      </section>
    </div>
  );
}
