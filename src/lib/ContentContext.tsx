import { createContext, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';

// ---------------------------------------------------------------------------
// Content is served from the database (GET /api/public/content) so the union
// can edit every public text from the admin dashboard without touching code.
// The initial defaults below mirror the database seed, so the site renders
// instantly even before the fetch returns (or offline).
// ---------------------------------------------------------------------------

export interface SiteBlock {
  tagline: string;
  email: string;
  address: string;
  whatsapp_text: string;
}
export interface AboutBlock {
  about_paragraphs: string[];
  history_paragraphs: string[];
  vision: string;
  mission: string;
  objectives: string[];
  constitution_note: string;
}
export interface Ann {
  id: number;
  title: string;
  category: string;
  excerpt: string;
  body: string;
  author: string;
  date_label: string;
  image: string | null;
  published?: number;
  created_at?: string;
}
export interface Ev {
  id: number;
  title: string;
  date_label: string;
  time: string;
  venue: string;
  excerpt: string;
  status: 'upcoming' | 'past';
}
export interface GalleryImage {
  id: number;
  src: string;
  caption: string;
}
export interface GalleryAlbum {
  id: number;
  name: string;
  description?: string;
  images: GalleryImage[];
}
export interface PageContent {
  site: SiteBlock;
  about: AboutBlock;
  announcements: Ann[];
  events: Ev[];
  galleryAlbums: GalleryAlbum[];
}

const defaults: PageContent = {
  site: {
    tagline: 'Connecting Offa Students. Representing Our Interests. Building Our Community.',
    email: 'contact@osufutminna.com',
    address: 'Federal University of Technology, Minna, Niger State, Nigeria.',
    whatsapp_text: 'Offa WhatsApp community (official list managed by the union)',
  },
  about: {
    about_paragraphs: [
      'The Offa Student Union (OSU), Federal University of Technology, Minna Chapter, is the recognised home of every student of Offa origin studying at FUTMinna.',
      'Offa is a historic town in Kwara State, Nigeria — home of the Igbomina people, renowned for its rich cultural heritage, craftsmanship and community spirit. When Offa sons and daughters travel to Minna to study, OSU keeps that spirit alive away from home.',
    ],
    history_paragraphs: [
      'For as long as students from Offa have studied at FUTMinna, the community has looked after its own — welcoming new arrivals, celebrating together and speaking with one voice when its members need representation.',
      'OSU exists to continue that tradition formally: a single, organised association that every Offa student at FUTMinna can belong to, contribute to and rely on.',
    ],
    vision: 'A united, proud and influential Offa community at FUTMinna — where every Offa student thrives academically, connects culturally and is represented with integrity.',
    mission:
      'To connect students of Offa origin at FUTMinna, promote their welfare and interests, celebrate and preserve Offa culture, and run a transparent, secure and accountable union — including credible elections — in the service of all members.',
    objectives: [
      'Foster unity, friendship and mutual support among Offa students at FUTMinna.',
      'Represent and protect the interests and welfare of members before the university and beyond.',
      'Preserve and celebrate Offa heritage, culture and values on campus.',
      'Promote academic excellence and organise developmental programmes for members.',
      'Maintain transparent leadership with free, fair and secure elections.',
      'Build partnerships with the Offa community, alumni and other student associations.',
    ],
    constitution_note:
      'The union’s constitution is maintained by the Executive Council and available to members on request.',
  },
  announcements: [
    { id: -1, title: 'Welcome to the new session, OSU FUTMinna', category: 'Union News', excerpt: 'The Executive Council welcomes every Offa student at FUTMinna.', body: 'Welcome back to campus and to the Offa Student Union family.', author: 'OSU Executive Council', date_label: 'September 2026', image: null },
  ],
  events: [
    { id: -1, title: 'OSU Week 2026', date_label: 'December 2026', time: 'All week', venue: 'Main Auditorium & Campus', excerpt: 'A week of culture, sports, talent and community.', status: 'upcoming' },
  ],
  galleryAlbums: [
    { id: -1, name: 'Our Community', images: [{ id: -1, src: '/img/community.jpg', caption: 'Offa students, one union' }] },
  ],
};

interface ContentContextValue {
  content: PageContent;
  loading: boolean;
  refresh: () => Promise<void>;
}

const Ctx = createContext<ContentContextValue>({ content: defaults, loading: true, refresh: async () => undefined });

export function ContentProvider({ children }: { children: ReactNode }) {
  const [content, setContent] = useState<PageContent>(defaults);
  const [loading, setLoading] = useState(true);

  const refresh = async () => {
    try {
      const res = await fetch('/api/public/content');
      if (res.ok) {
        const data = await res.json();
        setContent({
          site: data.site ?? defaults.site,
          about: data.about ?? defaults.about,
          announcements: data.announcements ?? [],
          events: data.events ?? [],
          galleryAlbums: data.galleryAlbums ?? [],
        });
      }
    } catch {
      /* keep defaults */
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
  }, []);

  return <Ctx.Provider value={{ content, loading, refresh }}>{children}</Ctx.Provider>;
}

export function useContent() {
  return useContext(Ctx);
}
