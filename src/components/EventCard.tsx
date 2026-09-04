import type { Ev } from '../lib/ContentContext';

export default function EventCard({ event }: { event: Ev }) {
  return (
    <article className="card group flex overflow-hidden transition duration-300 hover:-translate-y-1 hover:shadow-soft">
      {/* Date block */}
      <div className="flex w-24 shrink-0 flex-col items-center justify-center bg-gradient-to-b from-fuchsia-700 to-fuchsia-800 px-2 text-center text-white">
        <span className="text-[10px] font-bold uppercase tracking-wider text-fuchsia-200">when</span>
        <span className="mt-1 text-sm font-bold leading-tight">{event.date_label}</span>
        <span className="mt-2 text-[10px] font-semibold uppercase tracking-wide text-fuchsia-200">{event.time}</span>
      </div>

      <div className="flex flex-1 flex-col p-5">
        <h3 className="text-base font-bold text-slate-900 sm:text-lg">{event.title}</h3>
        <p className="mt-1.5 line-clamp-2 flex-1 text-sm leading-relaxed text-slate-600">{event.excerpt}</p>
        <div className="mt-4 flex items-center gap-3 text-xs font-medium text-slate-500">
          <span className="inline-flex items-center gap-1.5">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 1 1 16 0Z" />
              <circle cx="12" cy="10" r="3" />
            </svg>
            {event.venue}
          </span>
        </div>
      </div>
    </article>
  );
}
