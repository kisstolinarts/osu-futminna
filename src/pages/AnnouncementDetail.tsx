import { Link, useParams } from 'react-router-dom';
import { useContent } from '../lib/ContentContext';

export default function AnnouncementDetail() {
  const { id } = useParams();
  const { content } = useContent();
  const item = content.announcements.find((a) => String(a.id) === id);
  const paragraphs = (item?.body || '').split(/\n\n+/).filter(Boolean);

  if (!item) {
    return (
      <section className="section-pad">
        <div className="container-x max-w-2xl">
          <div className="card p-10 text-center">
            <p className="text-4xl">🔎</p>
            <h1 className="mt-3 text-xl font-bold text-slate-900">Announcement not found</h1>
            <p className="mt-2 text-sm text-slate-500">It may have been unpublished by the union.</p>
            <Link to="/announcements" className="btn btn-md btn-primary mt-6">
              Back to announcements
            </Link>
          </div>
        </div>
      </section>
    );
  }

  return (
    <>
      <section className="relative overflow-hidden bg-gradient-to-br from-[#3b0764] via-[#701a75] to-[#a21caf]">
        <div className="container-x relative py-14 sm:py-16">
          <Link
            to="/announcements"
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-fuchsia-200 transition hover:text-white"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6" /></svg>
            All announcements
          </Link>
          <span className="mt-6 inline-flex items-center gap-3">
            <span className="chip bg-white/15 text-white">{item.category}</span>
            <span className="text-sm text-white/70">{item.date_label}</span>
          </span>
          <h1 className="mt-4 max-w-3xl text-2xl font-extrabold tracking-tight text-white sm:text-4xl">{item.title}</h1>
          <p className="mt-3 text-sm font-medium text-fuchsia-200">By {item.author}</p>
        </div>
      </section>

      <article className="section-pad">
        <div className="container-x mx-auto max-w-3xl">
          {item.image && (
            <img src={item.image} alt="" className="mb-8 aspect-video w-full rounded-2xl object-cover" />
          )}
          <div className="space-y-5">
            {paragraphs.map((p, i) => (
              <p key={i} className="text-base leading-relaxed text-slate-700 sm:text-lg">{p}</p>
            ))}
          </div>

          <div className="mt-10 flex flex-wrap items-center justify-between gap-4 rounded-2xl bg-fuchsia-50 p-6">
            <div>
              <p className="text-sm font-bold text-slate-900">Not a verified member yet?</p>
              <p className="text-sm text-slate-600">Join OSU to receive notices and vote in union elections.</p>
            </div>
            <div className="flex gap-2">
              <Link to="/register" className="btn btn-md btn-primary">Join OSU</Link>
              <Link to="/login" className="btn btn-md btn-outline">Login</Link>
            </div>
          </div>
        </div>
      </article>
    </>
  );
}
