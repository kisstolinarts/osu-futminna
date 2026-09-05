// Central place for public-facing OSU information.
// In later phases this content is editable from the admin dashboard and
// stored in the database — the shape of this file is designed so that swap
// is straightforward (each key mirrors a database field).

import culturalImg from '../assets/img/cultural-day.jpg';
import freshersImg from '../assets/img/freshers.jpg';
import sportsImg from '../assets/img/sports.jpg';
import seminarImg from '../assets/img/seminar.jpg';
import communityImg from '../assets/img/community.jpg';
import heroStudentsImg from '../assets/img/hero-students.jpg';

export const site = {
  shortName: 'OSU',
  fullName: 'Offa Student Union',
  chapter: 'FUTMinna Chapter',
  brandLine: 'OSU FUTMinna',
  tagline: 'Connecting Offa Students. Representing Our Interests. Building Our Community.',
  slogan: 'Your Voice. Your Vote. Your Union.',
  email: 'contact@osufutminna.com',
  whatsappText: 'Offa WhatsApp community (official list managed by the union)',
  address: 'Federal University of Technology, Minna, Niger State, Nigeria.',
  nav: [
    { label: 'Home', to: '/' },
    { label: 'About', to: '/about' },
    { label: 'Announcements', to: '/announcements' },
    { label: 'Events', to: '/events' },
    { label: 'Gallery', to: '/gallery' },
    { label: 'Election', to: '/election' },
    { label: 'Contact', to: '/contact' },
  ],
};

// ---------------------------------------------------------------------------
// About content — editable in the admin dashboard in later phases.
// ---------------------------------------------------------------------------
export const aboutContent = {
  about: [
    'The Offa Student Union (OSU), Federal University of Technology, Minna Chapter, is the recognised home of every student of Offa origin studying at FUTMinna.',
    'Offa is a historic town in Kwara State, Nigeria — home of the Igbomina people, renowned for its rich cultural heritage, craftsmanship and community spirit. When Offa sons and daughters travel to Minna to study, OSU keeps that spirit alive away from home.',
  ],
  history: [
    'For as long as students from Offa have studied at FUTMinna, the community has looked after its own — welcoming new arrivals, celebrating together and speaking with one voice when its members need representation.',
    'OSU exists to continue that tradition formally: a single, organised association that every Offa student at FUTMinna can belong to, contribute to and rely on. This platform is part of that mission — building a modern, transparent and secure union for the digital age.',
  ],
  vision:
    'A united, proud and influential Offa community at FUTMinna — where every Offa student thrives academically, connects culturally and is represented with integrity.',
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
  constitutionNote:
    'The union’s constitution is maintained by the Executive Council and available to members on request.',
};

export interface Announcement {
  id: string;
  title: string;
  category: string;
  excerpt: string;
  content: string[];
  author: string;
  date: string;
  image?: string;
}

export const announcements: Announcement[] = [
  {
    id: 'welcome-2026',
    category: 'Union News',
    title: 'Welcome to the new session, OSU FUTMinna',
    excerpt:
      'The Executive Council welcomes every Offa student at FUTMinna to a new and promising session.',
    content: [
      'Welcome back to campus and to the Offa Student Union family. Whether you are just resuming, fresh from your home town or joining us as a 100-level student, the Union exists to make your time at FUTMinna memorable.',
      'Keep an eye on this page and the official WhatsApp community for announcements, events and opportunities. If you have not yet registered as a member, registration will open soon — only registered members can vote in union elections.',
      'We wish you a productive session. One Union. One Voice.',
    ],
    author: 'OSU Executive Council',
    date: 'September 2026',
  },
  {
    id: 'registration-coming',
    category: 'Membership',
    title: 'Member registration & verification portal — coming soon',
    excerpt:
      'Our new member portal will verify every student before granting membership and voting rights.',
    content: [
      'To keep the union secure and fair, membership will require verification: your matriculation number, a check against the official OSU WhatsApp community list, and a review of your student ID card by the verification team.',
      'Once the portal opens, every approved student receives secure access to vote in union elections from their phone.',
    ],
    author: 'Membership & Verification Committee',
    date: 'September 2026',
  },
  {
    id: 'election-timetable',
    category: 'Election',
    title: 'Election timetable will be announced here',
    excerpt:
      'Union elections run on a secure, private platform. Results are only published by the electoral committee.',
    content: [
      'The electoral committee will publish the full election timetable — nomination dates, campaigning window, voting window and results day — right here on the Election page.',
      'Only verified OSU members are eligible to vote. You must be an ACTIVE member — graduated, suspended or ineligible members cannot vote.',
    ],
    author: 'OSU Electoral Committee',
    date: 'September 2026',
  },
  {
    id: 'osu-week-volunteers',
    category: 'Events',
    title: 'OSU Week planning — volunteers wanted',
    excerpt:
      'The social committee is building the team behind OSU Week. Bring your talent.',
    content: [
      'OSU Week is our biggest celebration of the session — cultural displays, sports, an award night and more. If you can sing, dance, design, referee, organise or simply work hard, the social committee wants you on the team.',
      'Reach out through the Contact page to volunteer.',
    ],
    author: 'Social Committee',
    date: 'August 2026',
  },
];

export interface OsuEvent {
  id: string;
  title: string;
  dateLabel: string;
  time: string;
  venue: string;
  excerpt: string;
  image?: string;
  status: 'upcoming' | 'past';
}

export const events: OsuEvent[] = [
  {
    id: 'osu-week-2026',
    title: 'OSU Week 2026',
    dateLabel: 'December 2026',
    time: 'All week',
    venue: 'Main Auditorium & Campus',
    excerpt:
      'A week of culture, sports, talent and community — details and full programme to be announced.',
    status: 'upcoming',
  },
  {
    id: 'freshers-welcome-2026',
    title: "Freshers' Welcome",
    dateLabel: 'November 2026',
    time: '4:00 PM',
    venue: 'Multipurpose Hall',
    excerpt:
      'A proper Offa welcome for every new Offa student on campus. Food, music and new friends.',
    status: 'upcoming',
  },
  {
    id: 'cultural-day',
    title: 'Cultural Day',
    dateLabel: 'To be announced',
    time: 'TBA',
    venue: 'TBA',
    excerpt:
      'A colourful celebration of Offa heritage — Igbomina and Yoruba culture in attire, music and dance.',
    status: 'upcoming',
  },
  {
    id: 'inter-chapter-cup',
    title: 'Inter-Chapter Football Cup',
    dateLabel: 'August 2026',
    time: 'Weekend fixtures',
    venue: 'Sports Pavilion',
    excerpt: 'The friendly that brought chapters together on the pitch. Till next year, Offa!',
    status: 'past',
  },
  {
    id: 'academic-seminar',
    title: 'Academic & Career Seminar',
    dateLabel: 'June 2026',
    time: '11:00 AM',
    venue: 'CBT Building',
    excerpt: 'Seniors and alumni shared study, career and postgraduate guidance with members.',
    status: 'past',
  },
];

export interface GalleryImage {
  id: string;
  src: string;
  caption: string;
}
export interface GalleryAlbum {
  id: string;
  name: string;
  images: GalleryImage[];
}

export const galleryAlbums: GalleryAlbum[] = [
  {
    id: 'cultural-day',
    name: 'Cultural Day',
    images: [
      { id: 'cd1', caption: 'Adire and colours on Cultural Day', src: culturalImg },
      { id: 'cd2', caption: 'Drummers keeping the rhythm', src: culturalImg },
    ],
  },
  {
    id: 'freshers',
    name: "Freshers' Welcome",
    images: [
      { id: 'fw1', caption: 'Welcoming the new Offa family', src: freshersImg },
      { id: 'fw2', caption: 'New members, new energy', src: freshersImg },
    ],
  },
  {
    id: 'sports',
    name: 'Sports',
    images: [
      { id: 'sp1', caption: 'Inter-chapter football action', src: sportsImg },
      { id: 'sp2', caption: 'The beautiful game, OSU style', src: sportsImg },
    ],
  },
  {
    id: 'academic',
    name: 'Academic Events',
    images: [
      { id: 'ac1', caption: 'Career seminar with seniors', src: seminarImg },
      { id: 'ac2', caption: 'Learning beyond the classroom', src: seminarImg },
    ],
  },
  {
    id: 'community',
    name: 'Our Community',
    images: [
      { id: 'cm1', caption: 'Offa students, one union', src: communityImg },
      { id: 'cm2', caption: 'Together on campus', src: heroStudentsImg },
      { id: 'cm3', caption: 'The OSU family grows', src: communityImg },
    ],
  },
];

export const leadershipOffices = [
  'President',
  'Vice President',
  'General Secretary',
  'Financial Secretary',
  'Public Relations Officer',
  'Welfare Officer',
  'Social Secretary',
];

export const samplePositions = [
  { name: 'President', desc: 'Leads the union and represents all Offa students at FUTMinna.' },
  { name: 'Vice President', desc: 'Deputises the President and oversees committees.' },
  { name: 'General Secretary', desc: 'Keeps the records, minutes and official correspondence.' },
  { name: 'Financial Secretary', desc: 'Manages the union’s finances and accountability.' },
  { name: 'Public Relations Officer', desc: 'Carries the union’s voice to members and the public.' },
  { name: 'Welfare Officer', desc: 'Looks after the wellbeing and interests of members.' },
  { name: 'Social Secretary', desc: 'Plans the socials, culture and OSU Week fun.' },
];
