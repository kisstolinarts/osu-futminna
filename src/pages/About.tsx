import { PageHeader, SectionHeading } from '../components/Section';
import { leadershipOffices } from '../data/content';
import { useContent } from '../lib/ContentContext';
import communityImg from '../assets/img/community.jpg';
import culturalImg from '../assets/img/cultural-day.jpg';

export default function About() {
  const { content } = useContent();
  const about = content.about;
  const objectives = about.objectives.length > 0 ? about.objectives : [''];
  const aboutPhoto = content.site?.home_about_image || communityImg;
  const historyPhoto = content.site?.about_history_image || culturalImg;

  return (
    <>
      <PageHeader
        eyebrow="About OSU"
        title="Offa Student Union, FUTMinna Chapter"
        intro="Who we are, where we come from and what we stand for — in the service of every Offa student at the Federal University of Technology, Minna."
      />

      {/* About */}
      <section className="section-pad">
        <div className="container-x grid items-center gap-10 lg:grid-cols-2 lg:gap-16">
          <div>
            <SectionHeading eyebrow="Who we are" title="One home for Offa students at FUTMinna" />
            <div className="mt-5 space-y-4 leading-relaxed text-slate-600">
              {about.about_paragraphs.map((p, i) => <p key={i}>{p}</p>)}
            </div>
          </div>
          <div className="overflow-hidden rounded-3xl shadow-soft">
            <img src={aboutPhoto} alt="OSU FUTMinna members" className="aspect-[4/3] w-full object-cover" />
          </div>
        </div>
      </section>

      {/* History */}
      <section className="bg-white py-16 sm:py-20">
        <div className="container-x grid items-center gap-10 lg:grid-cols-2 lg:gap-16">
          <div className="order-2 overflow-hidden rounded-3xl shadow-soft lg:order-1">
            <img src={historyPhoto} alt="Offa culture and tradition" className="aspect-[4/3] w-full object-cover" />
          </div>
          <div className="order-1 lg:order-2">
            <SectionHeading
              eyebrow="Our history"
              title="Rooted in Offa, thriving in Minna"
              intro="Offa — the historic home of the Igbomina people in Kwara State — is famous for its culture, craftsmanship and communal spirit. OSU carries that heritage into FUTMinna."
            />
            <div className="mt-5 space-y-4 leading-relaxed text-slate-600">
              {about.history_paragraphs.map((p, i) => <p key={i}>{p}</p>)}
            </div>
          </div>
        </div>
      </section>

      {/* Vision & Mission */}
      <section className="section-pad">
        <div className="container-x grid gap-6 lg:grid-cols-2">
          <div className="card relative overflow-hidden p-8">
            <div className="absolute right-0 top-0 h-28 w-28 rounded-bl-full bg-fuchsia-100/70" />
            <div className="relative">
              <span className="chip bg-fuchsia-100 text-fuchsia-800">Vision</span>
              <p className="mt-4 text-lg font-medium leading-relaxed text-slate-800">“{about.vision}”</p>
            </div>
          </div>
          <div className="card relative overflow-hidden p-8">
            <div className="absolute right-0 top-0 h-28 w-28 rounded-bl-full bg-violet-100/70" />
            <div className="relative">
              <span className="chip bg-violet-100 text-violet-800">Mission</span>
              <p className="mt-4 text-lg font-medium leading-relaxed text-slate-800">“{about.mission}”</p>
            </div>
          </div>
        </div>
      </section>

      {/* Objectives */}
      <section className="bg-white py-16 sm:py-20">
        <div className="container-x">
          <SectionHeading eyebrow="What we stand for" title="Our objectives" intro="The commitments that guide everything the union does." />
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {objectives.map((o, i) => (
              <div key={i} className="card flex items-start gap-4 p-5">
                <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-fuchsia-600 to-fuchsia-800 text-sm font-extrabold text-white">
                  {String(i + 1).padStart(2, '0')}
                </span>
                <p className="pt-1 text-sm font-medium leading-relaxed text-slate-700">{o}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Leadership */}
      <section className="section-pad">
        <div className="container-x">
          <SectionHeading
            eyebrow="Leadership"
            title="The Executive Council"
            intro="Elected by students, accountable to students. Offices below; names are published after each election."
            align="center"
          />
          <div className="mt-10 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {leadershipOffices.map((office) => (
              <div key={office} className="card flex flex-col items-center p-6 text-center">
                <span className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-fuchsia-100 text-fuchsia-700">
                  <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                    <circle cx="9" cy="7" r="4" />
                    <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
                    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                  </svg>
                </span>
                <p className="mt-3 text-sm font-bold text-slate-900">{office}</p>
                <p className="mt-1 text-xs text-slate-400">Elected office</p>
              </div>
            ))}
          </div>
          <p className="mt-8 rounded-2xl border border-dashed border-fuchsia-300 bg-fuchsia-50 p-5 text-center text-sm text-fuchsia-900">
            Current officers are published here once confirmed by the union. Names, photos and bios will be managed by the
            Executive Council from the admin dashboard.
          </p>
        </div>
      </section>

      {/* Constitution + contact */}
      <section className="bg-white py-16 sm:py-20">
        <div className="container-x grid gap-6 lg:grid-cols-2">
          <div className="card p-8">
            <h3 className="text-lg font-bold text-slate-900">Constitution & documents</h3>
            <p className="mt-2 text-sm leading-relaxed text-slate-600">{about.constitution_note}</p>
            <div className="mt-6 flex flex-wrap gap-2">
              <span className="chip bg-slate-100 text-slate-600">Constitution (PDF)</span>
              <span className="chip bg-slate-100 text-slate-600">Membership guidelines</span>
              <span className="chip bg-slate-100 text-slate-600">Election guidelines</span>
            </div>
            <p className="mt-4 text-xs text-slate-400">Documents are shared by the Executive Council on request.</p>
          </div>
          <div className="card p-8">
            <h3 className="text-lg font-bold text-slate-900">Reach the union</h3>
            <ul className="mt-4 space-y-3 text-sm text-slate-600">
              <li className="flex items-center gap-3"><span className="chip bg-fuchsia-100 text-fuchsia-800">Email</span> {content.site.email}</li>
              <li className="flex items-center gap-3"><span className="chip bg-fuchsia-100 text-fuchsia-800">Community</span> {content.site.whatsapp_text}</li>
              <li className="flex items-center gap-3"><span className="chip bg-fuchsia-100 text-fuchsia-800">Visit</span> FUT Minna Main Campus</li>
            </ul>
          </div>
        </div>
      </section>
    </>
  );
}
