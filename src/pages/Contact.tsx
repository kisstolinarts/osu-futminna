import { useState } from 'react';
import type { FormEvent } from 'react';
import { PageHeader } from '../components/Section';
import { site } from '../data/content';

const channels = [
  {
    title: 'Email the union',
    body: site.email,
    note: 'For official enquiries and correspondence.',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="16" x="2" y="4" rx="2" /><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" /></svg>
    ),
  },
  {
    title: 'WhatsApp community',
    body: 'Official OSU WhatsApp list',
    note: 'The verified community list is managed by the union. Membership checks use this list.',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5Z" /></svg>
    ),
  },
  {
    title: 'Find us on campus',
    body: 'FUT Minna Main Campus',
    note: site.address,
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 1 1 16 0Z" /><circle cx="12" cy="10" r="3" /></svg>
    ),
  },
];

export default function Contact() {
  const [sent, setSent] = useState(false);

  const onSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSent(true);
  };

  return (
    <>
      <PageHeader
        eyebrow="Contact"
        title="Talk to your union"
        intro="Questions, ideas, complaints or volunteer interest — the Executive Council wants to hear from you."
      />

      <section className="section-pad">
        <div className="container-x grid gap-10 lg:grid-cols-[0.9fr_1.1fr]">
          {/* Channels */}
          <div>
            <div className="grid gap-4">
              {channels.map((c) => (
                <div key={c.title} className="card flex items-start gap-4 p-6">
                  <span className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-fuchsia-100 text-fuchsia-700">
                    {c.icon}
                  </span>
                  <div>
                    <h3 className="font-bold text-slate-900">{c.title}</h3>
                    <p className="mt-0.5 text-sm font-semibold text-fuchsia-700">{c.body}</p>
                    <p className="mt-1 text-sm text-slate-500">{c.note}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="card mt-4 overflow-hidden p-6">
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500">Complaints & welfare matters</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">
                Sensitive matters are handled confidentially. For complaints involving an executive, you may raise the
                matter directly with the Welfare Officer or through the union’s official channels.
              </p>
            </div>
          </div>

          {/* Form */}
          <div className="card p-8">
            <h2 className="text-xl font-bold text-slate-900">Send a message</h2>
            {sent ? (
              <div className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50 p-6 text-center">
                <span className="mx-auto inline-flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg>
                </span>
                <p className="mt-3 font-bold text-emerald-900">Message received — thank you!</p>
                <p className="mt-1 text-sm text-emerald-800">
                  The Executive Council will reply soon. For urgent matters, use the WhatsApp community.
                </p>
                <button type="button" onClick={() => setSent(false)} className="btn btn-md btn-outline mt-5">
                  Send another message
                </button>
              </div>
            ) : (
              <form onSubmit={onSubmit} className="mt-6 grid gap-5">
                <div className="grid gap-5 sm:grid-cols-2">
                  <div>
                    <label htmlFor="c-name" className="label">Full name</label>
                    <input id="c-name" name="name" required className="input" placeholder="Your name" />
                  </div>
                  <div>
                    <label htmlFor="c-email" className="label">Email address</label>
                    <input id="c-email" name="email" type="email" required className="input" placeholder="you@example.com" />
                  </div>
                </div>
                <div>
                  <label htmlFor="c-topic" className="label">Topic</label>
                  <select id="c-topic" name="topic" className="input" defaultValue="General enquiry">
                    <option>General enquiry</option>
                    <option>Membership / verification</option>
                    <option>Events & OSU Week</option>
                    <option>Election matters</option>
                    <option>Complaint / welfare</option>
                    <option>Volunteer with the union</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="c-msg" className="label">Message</label>
                  <textarea id="c-msg" name="message" required rows={5} className="input resize-y" placeholder="Write your message here..." />
                </div>
                <button type="submit" className="btn btn-lg btn-primary w-full">
                  Send message
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m22 2-7 20-4-9-9-4Z" /><path d="M22 2 11 13" /></svg>
                </button>
              </form>
            )}
          </div>
        </div>
      </section>
    </>
  );
}
