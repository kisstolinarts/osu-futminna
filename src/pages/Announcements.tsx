import { useMemo, useState } from 'react';
import { PageHeader } from '../components/Section';
import AnnouncementCard from '../components/AnnouncementCard';
import { useContent } from '../lib/ContentContext';

export default function Announcements() {
  const { content } = useContent();
  const categories = useMemo(() => ['All', ...Array.from(new Set(content.announcements.map((a) => a.category)))], [content.announcements]);
  const [active, setActive] = useState('All');

  const list = active === 'All' ? content.announcements : content.announcements.filter((a) => a.category === active);

  return (
    <>
      <PageHeader
        eyebrow="Announcements"
        title="News & official notices"
        intro="Everything the union wants you to know — straight from the Executive Council and committees."
      />

      <section className="section-pad">
        <div className="container-x">
          <div className="mb-8 flex flex-wrap gap-2">
            {categories.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setActive(c)}
                className={`chip border transition ${
                  active === c
                    ? 'border-fuchsia-700 bg-fuchsia-700 text-white'
                    : 'border-slate-200 bg-white text-slate-600 hover:border-fuchsia-300'
                }`}
              >
                {c}
              </button>
            ))}
          </div>

          {list.length > 0 ? (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {list.map((a) => (
                <AnnouncementCard key={a.id} item={a} />
              ))}
            </div>
          ) : (
            <div className="card p-12 text-center text-slate-500">No announcements in this category yet.</div>
          )}
        </div>
      </section>
    </>
  );
}
