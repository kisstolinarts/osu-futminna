import { useEffect, useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { site } from '../data/content';
import Logo from './Logo';
import { LinkButton } from './Buttons';

function navLinkClass({ isActive }: { isActive: boolean }) {
  return `rounded-lg px-3 py-2 text-sm font-semibold transition ${
    isActive ? 'text-fuchsia-700' : 'text-slate-600 hover:bg-fuchsia-50 hover:text-fuchsia-700'
  }`;
}

export default function Navbar() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const location = useLocation();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Close the mobile menu whenever the route changes.
  useEffect(() => setOpen(false), [location.pathname]);

  return (
    <header
      className={`sticky top-0 z-40 transition-all ${
        scrolled || open ? 'border-b border-slate-200/80 bg-white/90 shadow-sm backdrop-blur' : 'bg-white/70 backdrop-blur'
      }`}
    >
      <nav className="container-x flex h-16 items-center justify-between gap-4 sm:h-[4.5rem]" aria-label="Main">
        <Link to="/" className="shrink-0" aria-label={`${site.fullName} — home`}>
          <Logo full />
        </Link>

        {/* Desktop nav */}
        <div className="hidden items-center gap-0.5 lg:flex">
          {site.nav.map((item) => (
            <NavLink key={item.to} to={item.to} end={item.to === '/'} className={navLinkClass}>
              {item.label}
            </NavLink>
          ))}
        </div>

        <div className="hidden items-center gap-2 lg:flex">
          <Link to="/login" className="btn btn-md btn-outline">
            Student Login
          </Link>
          <LinkButton to="/register">Join OSU</LinkButton>
        </div>

        {/* Hamburger (mobile) */}
        <button
          type="button"
          className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-slate-200 text-slate-700 lg:hidden"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-label={open ? 'Close menu' : 'Open menu'}
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            {open ? (
              <>
                <path d="M6 6l12 12" />
                <path d="M18 6L6 18" />
              </>
            ) : (
              <>
                <path d="M4 7h16" />
                <path d="M4 12h16" />
                <path d="M4 17h16" />
              </>
            )}
          </svg>
        </button>
      </nav>

      {/* Mobile menu */}
      {open && (
        <div className="border-t border-slate-200 bg-white px-4 pb-6 pt-2 lg:hidden animate-fade-in">
          <div className="flex flex-col">
            {site.nav.map((item) => (
              <NavLink key={item.to} to={item.to} end={item.to === '/'} className={navLinkClass}>
                {item.label}
              </NavLink>
            ))}
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2">
            <Link to="/login" className="btn btn-md btn-outline">
              Student Login
            </Link>
            <Link to="/register" className="btn btn-md btn-primary">
              Join OSU
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
