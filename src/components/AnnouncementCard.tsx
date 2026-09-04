import { Link } from 'react-router-dom';
import type { Ann } from '../lib/ContentContext';

const categoryColors: Record<string, string> = {
  'Union News': 'bg-fuchsia-100 text-fuchsia-800',
  Membership: 'bg-sky-100 text-sky-800',
  Election: 'bg-amber-100 text-amber-800',
  Events: 'bg-emerald-100 text-emerald-800',
};

export default function AnnouncementCard({ item }: { item: Ann }) {
  const color = categoryColors[item.category] ?? 'bg-slate-100 text-slate-700';
  return (
    <article className="card group flex flex-col overflow-hidden transition duration-300 hover:-translate-y-1 hover:shadow-soft">
      <div className="flex flex-1 flex-col p-6">
        <div className="flex items-center gap-3">
          <span className={`chip ${color}`}>{item.category}</span>
          <span className="text-xs font-medium text-slate-400">{item.date_label}</span>
        </div>
        <h3 className="mt-3 text-lg font-bold leading-snug text-slate-900">
          <Link to={`/announcements/${item.id}`} className="transition group-hover:text-fuchsia-700">
            {item.title}
          </Link>
        </h3>
        <p className="mt-2 flex-1 text-sm leading-relaxed text-slate-600">{item.excerpt}</p>
        <div className="mt-5 flex items-center justify-between border-t border-slate-100 pt-4">
          <span className="text-xs font-medium text-slate-400">{item.author}</span>
          <Link
            to={`/announcements/${item.id}`}
            className="inline-flex items-center gap-1 text-sm font-semibold text-fuchsia-700 hover:text-fuchsia-800"
          >
            Read more
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 12h14" />
              <path d="m13 6 6 6-6 6" />
            </svg>
          </Link>
        </div>
      </div>
    </article>
  );
}
