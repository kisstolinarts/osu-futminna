import { Link } from 'react-router-dom';
import { site } from '../data/content';
import { useContent } from '../lib/ContentContext';
import Logo from './Logo';

export default function Footer() {
  const { content } = useContent();
  return (
    <footer className="bg-gradient-to-b from-[#3b0764] to-[#2e1065] text-white">
      <div className="container-x grid gap-10 py-14 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <Logo full dark />
          <p className="mt-4 max-w-xs text-sm leading-relaxed text-white/70">{content.site.tagline || site.tagline}</p>
        </div>

        <div>
          <h3 className="text-sm font-bold uppercase tracking-wider text-white/50">Explore</h3>
          <ul className="mt-4 space-y-2.5 text-sm">
            {site.nav.map((item) => (
              <li key={item.to}>
                <Link to={item.to} className="text-white/80 transition hover:text-white">
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h3 className="text-sm font-bold uppercase tracking-wider text-white/50">Members</h3>
          <ul className="mt-4 space-y-2.5 text-sm">
            <li>
              <Link to="/register" className="text-white/80 transition hover:text-white">
                Join OSU
              </Link>
            </li>
            <li>
              <Link to="/login" className="text-white/80 transition hover:text-white">
                Student Login
              </Link>
            </li>
            <li>
              <Link to="/election" className="text-white/80 transition hover:text-white">
                Election Portal
              </Link>
            </li>
          </ul>
        </div>

        <div>
          <h3 className="text-sm font-bold uppercase tracking-wider text-white/50">Contact</h3>
          <ul className="mt-4 space-y-2.5 text-sm text-white/80">
            <li>{content.site.email || site.email}</li>
            <li>{content.site.address || site.address}</li>
            <li>{content.site.whatsapp_text || site.whatsappText}</li>
          </ul>
        </div>
      </div>

      <div className="border-t border-white/10">
        <div className="container-x flex flex-col items-center justify-between gap-2 py-5 text-xs text-white/50 sm:flex-row">
          <p>
            © {new Date().getFullYear()} {site.brandLine}. All rights reserved.
          </p>
          <div className="text-center sm:text-right">
            <p className="max-w-md">
              A student platform for Offa students at the Federal University of Technology, Minna.
            </p>
            <Link to="/admin/login" className="mt-1 inline-block text-xs text-white/40 transition hover:text-white/80">
              Administrator sign in
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
