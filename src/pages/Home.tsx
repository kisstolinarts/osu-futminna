import { Link } from 'react-router-dom';
import { LinkButton } from '../components/Buttons';
import { Eyebrow, SectionHeading } from '../components/Section';
import AnnouncementCard from '../components/AnnouncementCard';
import EventCard from '../components/EventCard';
import Gallery from '../components/Gallery';
import { site } from '../data/content';
import { useContent } from '../lib/ContentContext';
import heroImg from '../assets/img/hero-students.jpg';
import communityImg from '../assets/img/community.jpg';

const pillars = [
  {
    title: 'Connect',
    body: 'Every Offa student at FUTMinna belongs. Meet, mingle and grow your network from 100 level to graduation.',
    icon: (
      <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    ),
  },
  {
    title: 'Represent',
    body: 'One voice for Offa students before the university — welfare, academics, grievances and recognition.',
    icon: (
      <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z" />
        <path d="m9 12 2 2 4-4" />
      </svg>
    ),
  },
  {
    title: 'Build Community',
    body: 'Culture, sport and OSU Week — we keep the Offa spirit alive far from home.',
    icon: (
      <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
      </svg>
    ),
  },
];

export default function Home() {
  const { content } = useContent();
  const latestAnnouncements = content.announcements.slice(0, 3);
  const upcoming = content.events.filter((e) => e.status === 'upcoming').slice(0, 3);

  return (
    <>
      {/* ---------------- HERO ---------------- */}
      <section className="relative overflow-hidden bg-gradient-to-br from-[#2e1065] via-[#581c87] to-[#a21caf]">
        <div className="pointer-events-none absolute -left-32 top-10 h-80 w-80 rounded-full bg-fuchsia-500/20 blur-3xl" />
        <div className="pointer-events-none absolute -right-24 bottom-0 h-96 w-96 rounded-full bg-white/10 blur-3xl" />
        <div className="pointer-events-none absolute right-10 top-8 hidden opacity-10 lg:block">
          <img src="/logo.png" alt="" width={420} height={420} className="opacity-90" />
        </div>

        <div className="container-x relative grid gap-12 py-16 sm:py-20 lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:py-24">
          <div className="animate-fade-up">
            <p className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-wider text-fuchsia-100 backdrop-blur">
              <span className="h-2 w-2 rounded-full bg-emerald-400" />
              Offa Student Union · Federal University of Technology, Minna
            </p>
            <h1 className="mt-6 text-4xl font-extrabold leading-[1.05] tracking-tight text-white sm:text-5xl lg:text-6xl">
              Offa Student Union
              <span className="mt-2 block bg-gradient-to-r from-fuchsia-300 to-white bg-clip-text text-transparent">
                FUTMinna Chapter
              </span>
            </h1>
            <p className="mt-2 text-lg font-semibold text-fuchsia-200">OSU FUTMinna</p>
            <p className="mt-5 max-w-xl text-base leading-relaxed text-white/85 sm:text-lg">{site.tagline}</p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              <LinkButton to="/register" size="lg" variant="white">
                Join OSU
              </LinkButton>
              <LinkButton to="/login" size="lg" variant="ghost-light">
                Student Login
              </LinkButton>
              <LinkButton to="/election" size="lg" variant="ghost-light">
                Election Portal
              </LinkButton>
            </div>

            <div className="mt-10 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-white/75">
              <span className="inline-flex items-center gap-2">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><path d="M12 6v6l4 2" /></svg>
                Membership verification
              </span>
              <span className="inline-flex items-center gap-2">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m22 2-7 20-4-9-9-4Z" /><path d="M22 2 11 13" /></svg>
                Secure elections
              </span>
              <span className="inline-flex items-center gap-2">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="3" rx="2" /><path d="M3 9h18" /><path d="M9 21V9" /></svg>
                Culture & community
              </span>
            </div>
          </div>

          {/* Hero image card */}
          <div className="relative mx-auto w-full max-w-md lg:max-w-none animate-fade-up" style={{ animationDelay: '120ms' }}>
            <div className="overflow-hidden rounded-3xl border border-white/20 shadow-2xl">
              <img src={heroImg} alt="OSU FUTMinna students together" className="aspect-[4/3] w-full object-cover" />
            </div>
            <div className="absolute -bottom-5 -left-3 rounded-2xl border border-slate-100 bg-white px-4 py-3 shadow-lg sm:-left-6">
              <p className="text-[11px] font-bold uppercase tracking-wider text-fuchsia-700">Join the family</p>
              <p className="text-sm font-semibold text-slate-800">Offa students, one union</p>
            </div>
          </div>
        </div>
      </section>

      {/* ---------------- PILLARS ---------------- */}
      <section className="section-pad">
        <div className="container-x grid gap-6 md:grid-cols-3">
          {pillars.map((p) => (
            <div key={p.title} className="card p-7 transition duration-300 hover:-translate-y-1 hover:shadow-soft">
              <div className="inline-flex h-13 w-13 items-center justify-center rounded-2xl bg-fuchsia-100 p-3 text-fuchsia-700">
                {p.icon}
              </div>
              <h3 className="mt-4 text-lg font-bold text-slate-900">{p.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">{p.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ---------------- ABOUT PREVIEW ---------------- */}
      <section className="bg-white py-16 sm:py-20">
        <div className="container-x grid items-center gap-10 lg:grid-cols-2 lg:gap-16">
          <div className="relative order-2 lg:order-1">
            <div className="overflow-hidden rounded-3xl shadow-soft">
              <img src={communityImg} alt="Offa student community at FUTMinna" className="aspect-[4/3] w-full object-cover" />
            </div>
            <div className="absolute -bottom-5 right-4 rounded-2xl bg-gradient-to-br from-fuchsia-700 to-fuchsia-800 px-5 py-4 text-white shadow-lg">
              <p className="text-2xl font-extrabold leading-none">OSU</p>
              <p className="mt-1 text-xs font-semibold text-fuchsia-100">Minna Chapter</p>
            </div>
          </div>
          <div className="order-1 lg:order-2">
            <SectionHeading
              eyebrow="About OSU"
              title={
                <>
                  Home away from home for <span className="text-grad">Offa students</span>
                </>
              }
              intro={content.about.about_paragraphs[0] || ""}
            />
            <ul className="mt-6 space-y-3 text-sm text-slate-600">
              {['A recognised home for every Offa student at FUTMinna', 'Culture, welfare and academic support', 'Transparent leadership with secure elections'].map((t) => (
                <li key={t} className="flex items-start gap-3">
                  <span className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg>
                  </span>
                  {t}
                </li>
              ))}
            </ul>
            <div className="mt-8">
              <LinkButton to="/about" variant="outline">
                More about OSU
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14" /><path d="m13 6 6 6-6 6" /></svg>
              </LinkButton>
            </div>
          </div>
        </div>
      </section>

      {/* ---------------- ANNOUNCEMENTS ---------------- */}
      <section className="section-pad">
        <div className="container-x">
          <div className="flex flex-col justify-between gap-6 sm:flex-row sm:items-end">
            <SectionHeading
              eyebrow="Announcements"
              title="Latest from the union"
              intro="Official notices from the Executive Council and union committees."
            />
            <Link to="/announcements" className="inline-flex shrink-0 items-center gap-1 text-sm font-semibold text-fuchsia-700 hover:text-fuchsia-800">
              View all announcements
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14" /><path d="m13 6 6 6-6 6" /></svg>
            </Link>
          </div>
          <div className="mt-8 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {latestAnnouncements.map((a) => (
              <AnnouncementCard key={a.id} item={a} />
            ))}
          </div>
        </div>
      </section>

      {/* ---------------- EVENTS ---------------- */}
      <section className="bg-white py-16 sm:py-20">
        <div className="container-x">
          <div className="flex flex-col justify-between gap-6 sm:flex-row sm:items-end">
            <SectionHeading
              eyebrow="Events"
              title="What’s coming up"
              intro="Mark your calendar — socials, culture, sports and more."
            />
            <Link to="/events" className="inline-flex shrink-0 items-center gap-1 text-sm font-semibold text-fuchsia-700 hover:text-fuchsia-800">
              All events
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14" /><path d="m13 6 6 6-6 6" /></svg>
            </Link>
          </div>
          <div className="mt-8 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {upcoming.map((e) => (
              <EventCard key={e.id} event={e} />
            ))}
          </div>
        </div>
      </section>

      {/* ---------------- ELECTION CTA ---------------- */}
      <section className="relative overflow-hidden py-16 sm:py-20">
        <div className="absolute inset-0 bg-gradient-to-br from-[#701a75] via-[#86198f] to-[#a21caf]" />
        <div className="pointer-events-none absolute -left-20 top-0 h-72 w-72 rounded-full bg-white/10 blur-3xl" />
        <div className="pointer-events-none absolute -right-16 bottom-0 h-72 w-72 rounded-full bg-fuchsia-300/20 blur-3xl" />
        <div className="container-x relative text-center">
          <Eyebrow light>Union Election</Eyebrow>
          <h2 className="mx-auto mt-3 max-w-2xl text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
            {site.slogan}
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-white/85">
            Secure, private and fair elections for the union you choose. One verified member, one vote per position — and only you ever know who you voted for.
          </p>
          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            <LinkButton to="/election" size="lg" variant="white">
              Election portal
            </LinkButton>
            <LinkButton to="/login" size="lg" variant="ghost-light">
              Student login
            </LinkButton>
          </div>
        </div>
      </section>

      {/* ---------------- GALLERY PREVIEW ---------------- */}
      <section className="section-pad">
        <div className="container-x">
          <SectionHeading
            eyebrow="Gallery"
            title="Moments from OSU life"
            intro="Cultural day, freshers’ welcome, sports and community."
            align="center"
          />
          <div className="mt-10">
            <Gallery albums={content.galleryAlbums} limit={8} filterable={false} />
          </div>
          <div className="mt-10 text-center">
            <LinkButton to="/gallery" variant="outline">
              Open the full gallery
            </LinkButton>
          </div>
        </div>
      </section>

      {/* ---------------- CONTACT STRIP ---------------- */}
      <section className="border-t border-slate-200 bg-white">
        <div className="container-x flex flex-col items-center justify-between gap-6 py-12 text-center sm:flex-row sm:text-left">
          <div>
            <h2 className="text-xl font-bold text-slate-900 sm:text-2xl">Questions, ideas or complaints?</h2>
            <p className="mt-1 text-slate-600">The Executive Council wants to hear from every Offa student on campus.</p>
          </div>
          <LinkButton to="/contact" size="lg">
            Contact OSU
          </LinkButton>
        </div>
      </section>
    </>
  );
}
