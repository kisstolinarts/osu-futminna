import bcrypt from 'bcryptjs';
import { db, migrate } from './db';
import { normalizePhone, toLocalMobile } from './lib/normalize';

/**
 * Demo seed — wipes demo tables and loads a clean, realistic sandbox:
 *  - an admin account
 *  - a few ACTIVE students whose first-time password is their phone number
 *    (the app forces them to set a personal password on first login)
 *  - an OPEN election with positions and contestants (nobody has voted yet)
 * Run with: npx tsx server/seedDemo.ts
 */

migrate();

// Wipe demo data (order matters for foreign keys).
const wipe = db.transaction(() => {
  for (const t of ['ballot_items', 'ballots', 'election_participation', 'contestants', 'election_positions', 'elections', 'approved_whatsapp_numbers', 'students', 'audit_logs', 'app_settings', 'admins']) {
    db.prepare(`DELETE FROM ${t}`).run();
  }
});
wipe();

const hash = (pw: string) => bcrypt.hashSync(pw, 10);
const isoDaysFromNow = (days: number) => {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString();
};

// Admins (same test credentials; new admins must set their own password on
// first login thanks to must_change_password = 1)
const admins: { name: string; email: string; pw: string; role: string }[] = [
  { name: 'OSU Test Admin', email: 'admin@osu.local', pw: 'DevAdmin12345', role: 'SUPER_ADMIN' },
  { name: 'Electoral Officer', email: 'electoral@osu.local', pw: 'OffaElect2026', role: 'ELECTORAL_ADMIN' },
  { name: 'Verification Officer', email: 'verify@osu.local', pw: 'OffaVerify2026', role: 'VERIFICATION_ADMIN' },
];
const insertAdmin = db.prepare(`INSERT INTO admins (name, email, password_hash, role, must_change_password) VALUES (?, ?, ?, ?, ?)`);
for (const a of admins) insertAdmin.run(a.name, a.email, hash(a.pw), a.role, a.role === 'SUPER_ADMIN' ? 0 : 1);

// Students (ACTIVE). First-time password = their phone number; the flag makes
// the app force a personal password on first login. Use the printed phone as
// the initial password (demo students: see the console summary below).
const students: { name: string; matric: string; email: string; phone: string; level: string }[] = [
  { name: 'Olawale Adeyemi', matric: '2022/12345', email: 'waleyemi@example.com', phone: '08012345678', level: '300 LEVEL' },
  { name: 'Aisha Bello', matric: '2023/45678', email: 'aisha@example.com', phone: '09098765432', level: '200 LEVEL' },
  { name: 'Musa Ibrahim', matric: '2024/77889', email: 'musa@example.com', phone: '07011112222', level: '400 LEVEL' },
  { name: 'Ngozi Eze', matric: '2021/33445', email: 'ngozi@example.com', phone: '08155667788', level: '500 LEVEL' },
];
const insertStudent = db.prepare(
  `INSERT INTO students (full_name, matric_number, email, phone_raw, phone_normalized, level, status, source, password_hash, must_change_password)
   VALUES (?, ?, ?, ?, ?, ?, 'ACTIVE', 'import', ?, 1)`,
);
for (const s of students) {
  const norm = normalizePhone(s.phone);
  const local = toLocalMobile(s.phone);
  insertStudent.run(s.name, s.matric, s.email, s.phone, norm, s.level, local ? hash(local) : null);
  if (norm) db.prepare(`INSERT OR IGNORE INTO approved_whatsapp_numbers (phone_raw, phone_normalized, note) VALUES (?, ?, 'demo seed')`).run(s.phone, norm);
}

// One OPEN election
const opens = isoDaysFromNow(-1);
const closes = isoDaysFromNow(5);
const electionInfo = db.prepare(`INSERT INTO elections (name, slug, description, opens_at, closes_at, status) VALUES (?, ?, ?, ?, ?, 'OPEN')`).run(
  'OSU Election 2026', 'osu-election-2026', 'Union elections — President, Vice President and Executive Council positions.', opens, closes,
);
const electionId = Number(electionInfo.lastInsertRowid);

const positions: { name: string; desc: string; order: number }[] = [
  { name: 'President', desc: 'Leads the union and represents all members.', order: 1 },
  { name: 'Vice President', desc: 'Deputises the President.', order: 2 },
  { name: 'General Secretary', desc: 'Keeps records and minutes.', order: 3 },
  { name: 'Financial Secretary', desc: 'Manages union finances.', order: 4 },
  { name: 'Social Secretary', desc: 'Plans socials and OSU Week.', order: 5 },
];
const posIds: number[] = [];
const insertPos = db.prepare(`INSERT INTO election_positions (election_id, name, description, display_order) VALUES (?, ?, ?, ?)`);
for (const p of positions) {
  posIds.push(Number(insertPos.run(electionId, p.name, p.desc, p.order).lastInsertRowid));
}

const candidates: { pos: number; name: string; level: string; manifesto: string }[] = [
  { pos: posIds[0], name: 'Segun Alabi', level: '400 LEVEL', manifesto: 'A stronger, more transparent union for every Offa student.' },
  { pos: posIds[0], name: 'Tolu Fashola', level: '300 LEVEL', manifesto: 'Service, integrity and results — your voice in the union.' },
  { pos: posIds[1], name: 'Kemi Adesina', level: '300 LEVEL', manifesto: 'Supporting students and the executive every step of the way.' },
  { pos: posIds[1], name: 'Ibrahim Suleiman', level: '500 LEVEL', manifesto: 'Experience you can trust, energy you can feel.' },
  { pos: posIds[2], name: 'Chiamaka Obi', level: '400 LEVEL', manifesto: 'Accurate records, open communication, fair process.' },
  { pos: posIds[2], name: 'Yusuf Abdul', level: '300 LEVEL', manifesto: 'Diligence and transparency in every document.' },
  { pos: posIds[3], name: 'Halima Bello', level: '400 LEVEL', manifesto: 'Clean books and accountable finances.' },
  { pos: posIds[4], name: 'Tunde Adewale', level: '200 LEVEL', manifesto: 'OSU Week that Offa students will never forget.' },
];
const insertCont = db.prepare(`INSERT INTO contestants (position_id, full_name, level, manifesto) VALUES (?, ?, ?, ?)`);
for (const c of candidates) insertCont.run(c.pos, c.name, c.level, c.manifesto);

console.log('===========================================');
console.log('  DEMO SEED COMPLETE');
console.log('===========================================');
console.log('  Admin   : admin@osu.local / DevAdmin12345   (super admin)');
console.log('  Admins  : electoral@osu.local / OffaElect2026 (electoral)');
console.log('            verify@osu.local / OffaVerify2026 (verification)');
console.log('  Students: (all ACTIVE; first password = phone below)');
students.forEach((s) => console.log(`            ${s.matric} / ${s.phone}  (${s.name})`));
console.log('  Election: OSU Election 2026 — OPEN now');
console.log(`  Positions: ${positions.map((p) => p.name).join(', ')}`);
console.log('===========================================');
