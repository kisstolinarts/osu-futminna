import type { ReactNode } from 'react';

interface EyebrowProps {
  children: ReactNode;
  light?: boolean;
}

export function Eyebrow({ children, light = false }: EyebrowProps) {
  return <p className={`eyebrow ${light ? 'eyebrow-light' : ''}`}>{children}</p>;
}

interface SectionHeadingProps {
  eyebrow?: ReactNode;
  title: ReactNode;
  intro?: ReactNode;
  align?: 'left' | 'center';
  light?: boolean;
}

export function SectionHeading({ eyebrow, title, intro, align = 'left', light = false }: SectionHeadingProps) {
  return (
    <div className={`max-w-2xl ${align === 'center' ? 'mx-auto text-center' : ''}`}>
      {eyebrow && (
        <div className={align === 'center' ? 'flex justify-center' : ''}>
          <Eyebrow light={light}>{eyebrow}</Eyebrow>
        </div>
      )}
      <h2 className={`mt-3 ${light ? 'text-white' : 'h-section'}`}>{title}</h2>
      {intro && <p className={`mt-3 leading-relaxed ${light ? 'text-white/75' : 'text-slate-600'}`}>{intro}</p>}
    </div>
  );
}

interface PageHeaderProps {
  eyebrow: string;
  title: ReactNode;
  intro?: ReactNode;
}

/** Compact hero banner used at the top of inner pages. */
export function PageHeader({ eyebrow, title, intro }: PageHeaderProps) {
  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-[#3b0764] via-[#701a75] to-[#a21caf]">
      <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-white/10 blur-2xl" />
      <div className="pointer-events-none absolute -bottom-28 left-1/4 h-72 w-72 rounded-full bg-fuchsia-400/20 blur-3xl" />
      <div className="container-x relative py-16 sm:py-20">
        <Eyebrow light>{eyebrow}</Eyebrow>
        <h1 className="mt-3 max-w-3xl text-3xl font-extrabold tracking-tight text-white sm:text-4xl lg:text-5xl">
          {title}
        </h1>
        {intro && <p className="mt-4 max-w-2xl text-base leading-relaxed text-white/80 sm:text-lg">{intro}</p>}
      </div>
    </section>
  );
}
