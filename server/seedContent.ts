import { prepare } from './dbCloud';

/**
 * Seeds default editable content (About text, announcements, events, gallery)
 * when those tables are empty. Admins then edit everything from the dashboard
 * — no code changes needed for normal content updates.
 */

const blocks: Record<string, string> = {
  tagline: 'Connecting Offa Students. Representing Our Interests. Building Our Community.',
  contact_email: 'contact@osufutminna.com',
  contact_address: 'Federal University of Technology, Minna, Niger State, Nigeria.',
  whatsapp_text: 'Offa WhatsApp community (official list managed by the union)',
  about_paragraphs: JSON.stringify([
    'The Offa Student Union (OSU), Federal University of Technology, Minna Chapter, is the recognised home of every student of Offa origin studying at FUTMinna.',
    'Offa is a historic town in Kwara State, Nigeria — home of the Igbomina people, renowned for its rich cultural heritage, craftsmanship and community spirit. When Offa sons and daughters travel to Minna to study, OSU keeps that spirit alive away from home.',
  ]),
  history_paragraphs: JSON.stringify([
    'For as long as students from Offa have studied at FUTMinna, the community has looked after its own — welcoming new arrivals, celebrating together and speaking with one voice when its members need representation.',
    'OSU exists to continue that tradition formally: a single, organised association that every Offa student at FUTMinna can belong to, contribute to and rely on. This platform is part of that mission — building a modern, transparent and secure union for the digital age.',
  ]),
  vision: 'A united, proud and influential Offa community at FUTMinna — where every Offa student thrives academically, connects culturally and is represented with integrity.',
  mission: 'To connect students of Offa origin at FUTMinna, promote their welfare and interests, celebrate and preserve Offa culture, and run a transparent, secure and accountable union — including credible elections — in the service of all members.',
  objectives: JSON.stringify([
    'Foster unity, friendship and mutual support among Offa students at FUTMinna.',
    'Represent and protect the interests and welfare of members before the university and beyond.',
    'Preserve and celebrate Offa heritage, culture and values on campus.',
    'Promote academic excellence and organise developmental programmes for members.',
    'Maintain transparent leadership with free, fair and secure elections.',
    'Build partnerships with the Offa community, alumni and other student associations.',
  ]),
  constitution_note:
    'The union’s constitution is maintained by the Executive Council and available to members on request.',
};

const defaultAnnouncements = [
  {
    title: 'Welcome to the new session, OSU FUTMinna',
    category: 'Union News',
    excerpt: 'The Executive Council welcomes every Offa student at FUTMinna to a new and promising session.',
    body:
      'Welcome back to campus and to the Offa Student Union family. Whether you are just resuming, fresh from your home town or joining us as a 100-level student, the Union exists to make your time at FUTMinna memorable.\n\nKeep an eye on this page and the official WhatsApp community for announcements, events and opportunities. If you have not yet registered as a member, membership registration is open — only registered members can vote in union elections.\n\nWe wish you a productive session. One Union. One Voice.',
    author: 'OSU Executive Council',
    date_label: 'September 2026',
    published: 1,
  },
  {
    title: 'Member registration & verification — now live',
    category: 'Membership',
    excerpt: 'New sign-ups are verified before they gain membership and voting rights.',
    body:
      'Membership is now verified through the official OSU form. Every new applicant is checked before becoming an ACTIVE member:\n\n1. The union confirms the applicant’s phone number is on the official OSU WhatsApp community list.\n2. A verification admin approves the account from the dashboard.\n\nOnly ACTIVE members can vote in union elections. Existing members are unaffected.',
    author: 'Membership & Verification Committee',
    date_label: 'September 2026',
    published: 1,
  },
  {
    title: 'Election timetable will be announced here',
    category: 'Election',
    excerpt: 'Union elections run on a secure, private platform. Results are only published by the electoral committee.',
    body:
      'The electoral committee will publish the full election timetable — nomination dates, campaigning window, voting window and results day — right here on the Election page.\n\nOnly verified OSU members are eligible to vote. You must be an ACTIVE member — graduated, suspended or ineligible members cannot vote.',
    author: 'OSU Electoral Committee',
    date_label: 'September 2026',
    published: 1,
  },
  {
    title: 'OSU Week planning — volunteers wanted',
    category: 'Events',
    excerpt: 'The social committee is building the team behind OSU Week. Bring your talent.',
    body:
      'OSU Week is our biggest celebration of the session — cultural displays, sports, an award night and more. If you can sing, dance, design, referee, organise or simply work hard, the social committee wants you on the team.\n\nReach out through the Contact page to volunteer.',
    author: 'Social Committee',
    date_label: 'August 2026',
    published: 1,
  },
];

const defaultEvents = [
  { title: 'OSU Week 2026', date_label: 'December 2026', time: 'All week', venue: 'Main Auditorium & Campus', excerpt: 'A week of culture, sports, talent and community — details and full programme to be announced.', status: 'upcoming' },
  { title: "Freshers' Welcome", date_label: 'November 2026', time: '4:00 PM', venue: 'Multipurpose Hall', excerpt: 'A proper Offa welcome for every new Offa student on campus. Food, music and new friends.', status: 'upcoming' },
  { title: 'Cultural Day', date_label: 'To be announced', time: 'TBA', venue: 'TBA', excerpt: 'A colourful celebration of Offa heritage — Igbomina and Yoruba culture in attire, music and dance.', status: 'upcoming' },
  { title: 'Inter-Chapter Football Cup', date_label: 'August 2026', time: 'Weekend fixtures', venue: 'Sports Pavilion', excerpt: 'The friendly that brought chapters together on the pitch. Till next year, Offa!', status: 'past' },
  { title: 'Academic & Career Seminar', date_label: 'June 2026', time: '11:00 AM', venue: 'CBT Building', excerpt: 'Seniors and alumni shared study, career and postgraduate guidance with members.', status: 'past' },
];

const defaultAlbums = [
  { name: 'Cultural Day', images: [{ f: '/img/cultural-day.jpg', caption: 'Adire and colours on Cultural Day' }] },
  { name: "Freshers' Welcome", images: [{ f: '/img/freshers.jpg', caption: 'Welcoming the new Offa family' }] },
  { name: 'Sports', images: [{ f: '/img/sports.jpg', caption: 'Inter-chapter football action' }] },
  { name: 'Academic Events', images: [{ f: '/img/seminar.jpg', caption: 'Career seminar with seniors' }] },
  { name: 'Our Community', images: [{ f: '/img/community.jpg', caption: 'Offa students, one union' }, { f: '/img/hero-students.jpg', caption: 'Together on campus' }] },
];

export async function seedContentDefaults() {
  const blockCount = Number(((await prepare(`SELECT COUNT(*) n FROM content_blocks`).get()) as any)?.n ?? 0);
  if (blockCount === 0) {
    const insert = prepare(`INSERT INTO content_blocks (key, value) VALUES (?, ?)`);
    for (const [k, v] of Object.entries(blocks)) await insert.run(k, v);
    console.log('seeded content_blocks');
  }

  const annCount = Number(((await prepare(`SELECT COUNT(*) n FROM announcements`).get()) as any)?.n ?? 0);
  if (annCount === 0) {
    const insert = prepare(
      `INSERT INTO announcements (title, category, excerpt, body, author, date_label, image, published) VALUES (?, ?, ?, ?, ?, ?, NULL, ?)`,
    );
    for (const a of defaultAnnouncements) await insert.run(a.title, a.category, a.excerpt, a.body, a.author, a.date_label, a.published);
    console.log('seeded announcements');
  }

  const evCount = Number(((await prepare(`SELECT COUNT(*) n FROM events`).get()) as any)?.n ?? 0);
  if (evCount === 0) {
    const insert = prepare(`INSERT INTO events (title, date_label, time, venue, excerpt, status) VALUES (?, ?, ?, ?, ?, ?)`);
    for (const e of defaultEvents) await insert.run(e.title, e.date_label, e.time, e.venue, e.excerpt, e.status);
    console.log('seeded events');
  }

  const albCount = Number(((await prepare(`SELECT COUNT(*) n FROM gallery_albums`).get()) as any)?.n ?? 0);
  if (albCount === 0) {
    const insAlb = prepare(`INSERT INTO gallery_albums (name, description) VALUES (?, '')`);
    const insImg = prepare(`INSERT INTO gallery_images (album_id, filename, caption) VALUES (?, ?, ?)`);
    for (const a of defaultAlbums) {
      const info = await insAlb.run(a.name);
      const aid = Number(info.lastInsertRowid);
      for (const img of a.images) await insImg.run(aid, img.f, img.caption);
    }
    console.log('seeded gallery');
  }
}
