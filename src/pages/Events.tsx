import { useState } from 'react';
import { PageHeader } from '../components/Section';
import EventCard from '../components/EventCard';
import { useContent } from '../lib/ContentContext';

export default function Events() {
  const { content } = useContent();
  const [tab, setTab] = useState<'upcoming' | 'past'>('upcoming');
  const list = content.events.filter((e) => e.status === tab);

  return (
    <>
      <PageHeader
        eyebrow="Events"
        title="Union events & activities"
        intro="Socials, culture, sports, seminars and the famous OSU Week — there’s always something happening."
      />

      <section className="section-pad">
        <div className="container-x">
          <div className="mb-8 inline-flex rounded-xl border border-slate-200 bg-white p-1 shadow-sm">
            {(['upcoming', 'past'] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTab(t)}
                className={`rounded-lg px-5 py-2 text-sm font-semibold capitalize transition ${
                  tab === t ? 'bg-fuchsia-700 text-white' : 'text-slate-600 hover:text-fuchsia-700'
                }`}
              >
                {t === 'upcoming' ? 'Upcoming' : 'Past events'}
              </button>
            ))}
          </div>

          {list.length > 0 ? (
            <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
              {list.map((e) => (
                <EventCard key={e.id} event={e} />
              ))}
            </div>
          ) : (
            <div className="card p-12 text-center text-slate-500">
              {tab === 'upcoming' ? 'No upcoming events right now — check back soon!' : 'No past events recorded yet.'}
            </div>
          )}
        </div>
      </section>
    </>
  );
}
