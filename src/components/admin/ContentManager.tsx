import { useState } from 'react';
import ContentSite from './content/ContentSite';
import ContentAnnouncements from './content/ContentAnnouncements';
import ContentEvents from './content/ContentEvents';
import ContentGallery from './content/ContentGallery';

type Area = 'site' | 'announcements' | 'events' | 'gallery';

const areas: { id: Area; label: string; desc: string }[] = [
  { id: 'site', label: 'Site & About', desc: 'Tagline, contact details, who we are, history, vision, mission, objectives.' },
  { id: 'announcements', label: 'Announcements', desc: 'News and notices shown on the public site and student dashboard.' },
  { id: 'events', label: 'Events', desc: 'Upcoming and past events on the Events page.' },
  { id: 'gallery', label: 'Gallery', desc: 'Photo albums shown on the Gallery page.' },
];

export default function ContentManager() {
  const [area, setArea] = useState<Area>('site');
  return (
    <div className="space-y-5">
      <p className="rounded-2xl bg-emerald-50 p-4 text-sm text-emerald-900">
        ✏️ Everything you change here appears on the public website immediately — no code or redeploy needed. Changes are
        stored in the database.
      </p>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {areas.map((a) => (
          <button
            key={a.id}
            onClick={() => setArea(a.id)}
            className={`card p-4 text-left transition ${area === a.id ? 'border-fuchsia-500 ring-2 ring-fuchsia-200' : 'hover:border-fuchsia-300'}`}
          >
            <p className="font-bold text-slate-900">{a.label}</p>
            <p className="mt-1 text-xs leading-relaxed text-slate-500">{a.desc}</p>
          </button>
        ))}
      </div>
      <div className="mt-2">
        {area === 'site' && <ContentSite />}
        {area === 'announcements' && <ContentAnnouncements />}
        {area === 'events' && <ContentEvents />}
        {area === 'gallery' && <ContentGallery />}
      </div>
    </div>
  );
}
