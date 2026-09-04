import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { db } from '../db';
import { audit } from '../lib/audit';
import { normalizeMatric, normalizePhone, toLocalMobile } from '../lib/normalize';
import { requireAdmin, requireRole } from '../middleware/auth';

export const adminStudentsRouter = Router();
adminStudentsRouter.use(requireAdmin);

// ---------------------------------------------------------------------------
// Overview statistics for the dashboard home.
// ---------------------------------------------------------------------------
adminStudentsRouter.get('/stats', (req, res) => {
  const count = (sql: string, ...args: (string | number)[]): number =>
    ((db.prepare(sql).get(...args) as { n: number }).n);

  res.json({
    total_students: count(`SELECT COUNT(*) n FROM students`),
    by_status: {
      ACTIVE: count(`SELECT COUNT(*) n FROM students WHERE status = 'ACTIVE'`),
      PENDING_VERIFICATION: count(`SELECT COUNT(*) n FROM students WHERE status = 'PENDING_VERIFICATION'`),
      GRADUATED: count(`SELECT COUNT(*) n FROM students WHERE status = 'GRADUATED'`),
      SUSPENDED: count(`SELECT COUNT(*) n FROM students WHERE status = 'SUSPENDED'`),
      INELIGIBLE: count(`SELECT COUNT(*) n FROM students WHERE status = 'INELIGIBLE'`),
      REJECTED: count(`SELECT COUNT(*) n FROM students WHERE status = 'REJECTED'`),
    },
    eligible_voters: count(`SELECT COUNT(*) n FROM students WHERE status = 'ACTIVE'`),
    no_password_yet: count(`SELECT COUNT(*) n FROM students WHERE password_hash IS NULL`),
    approved_whatsapp: count(`SELECT COUNT(*) n FROM approved_whatsapp_numbers WHERE active = 1`),
    total_admins: count(`SELECT COUNT(*) n FROM admins`),
  });
});

// ---------------------------------------------------------------------------
// List / search students.
// ---------------------------------------------------------------------------
adminStudentsRouter.get('/', (req, res) => {
  const q = String(req.query.q || '').trim().toLowerCase();
  const status = String(req.query.status || '');
  const params: (string | number)[] = [];
  let where = 'WHERE 1=1';
  if (q) {
    where += ` AND (lower(full_name) LIKE ? OR lower(matric_number) LIKE ? OR lower(email) LIKE ? OR lower(phone_normalized) LIKE ?)`;
    const like = `%${q}%`;
    params.push(like, like, like, like);
  }
  if (status && status !== 'ALL') {
    where += ` AND status = ?`;
    params.push(status);
  }
  const rows = db
    .prepare(
      `SELECT id, full_name, matric_number, email, level, phone_raw, phone_normalized, status, source,
              CASE WHEN password_hash IS NOT NULL THEN 1 ELSE 0 END AS has_password,
              must_change_password, invite_expires_at, created_at, last_login_at
       FROM students ${where}
       ORDER BY created_at DESC LIMIT 300`,
    )
    .all(...params);
  res.json({ students: rows });
});

// ---------------------------------------------------------------------------
// Update a single student's status (verification / eligibility changes).
// ---------------------------------------------------------------------------
const ALLOWED_STATUSES = ['ACTIVE', 'GRADUATED', 'SUSPENDED', 'INELIGIBLE', 'REJECTED', 'PENDING_VERIFICATION'];

adminStudentsRouter.patch('/:id', requireRole('SUPER_ADMIN', 'VERIFICATION_ADMIN', 'ELECTORAL_ADMIN'), (req, res) => {
  const id = Number(req.params.id);
  const { status } = req.body ?? {};
  if (!ALLOWED_STATUSES.includes(status)) return res.status(400).json({ error: 'Invalid status value.' });

  const existing = db.prepare(`SELECT full_name, matric_number, status FROM students WHERE id = ?`).get(id) as
    | { full_name: string; matric_number: string; status: string }
    | undefined;
  if (!existing) return res.status(404).json({ error: 'Student not found.' });

  db.prepare(`UPDATE students SET status = ?, updated_at = datetime('now') WHERE id = ?`).run(status, id);
  const admin = (req as any).admin as { id: number; name: string };
  audit({
    actorType: 'admin', actorId: admin.id, actorLabel: admin.name,
    action: 'student_status_change', entityType: 'student', entityId: id,
    description: `${existing.matric_number} (${existing.full_name}): ${existing.status} → ${status}`,
    ip: req.ip,
  });
  res.json({ ok: true, status });
});

// ---------------------------------------------------------------------------
// Phone-number login passwords (no invite links needed).
// First-time password = the student's own phone number; they are forced to
// change it on first login.
// ---------------------------------------------------------------------------

// Set a single student's password to their phone number and force a change.
adminStudentsRouter.post('/:id/reset-password', requireRole('SUPER_ADMIN', 'VERIFICATION_ADMIN'), (req, res) => {
  const id = Number(req.params.id);
  const student = db.prepare(`SELECT id, full_name, matric_number, phone_raw, phone_normalized FROM students WHERE id = ?`).get(id) as
    | { id: number; full_name: string; matric_number: string; phone_raw: string | null; phone_normalized: string | null }
    | undefined;
  if (!student) return res.status(404).json({ error: 'Student not found.' });

  const local = toLocalMobile(student.phone_raw || '') || (student.phone_normalized ? toLocalMobile(student.phone_normalized) : null);
  if (!local) {
    return res.status(400).json({ error: 'This student has no usable phone number yet. Add/fix their phone first.' });
  }
  db.prepare(`UPDATE students SET password_hash = ?, must_change_password = 1, invite_token_hash = NULL, invite_expires_at = NULL, updated_at = datetime('now') WHERE id = ?`).run(
    bcrypt.hashSync(local, 10),
    id,
  );
  const admin = (req as any).admin as { id: number; name: string };
  audit({ actorType: 'admin', actorId: admin.id, actorLabel: admin.name, action: 'password_reset_phone', entityType: 'student', entityId: id, description: `Reset password of ${student.matric_number} to their phone number` });
  res.json({ ok: true, message: `Password reset to ${local}. The student will be asked to set a new one on login.` });
});

// Bulk: give every student without a password a phone-number password.
adminStudentsRouter.post('/password-actions/set-missing', requireRole('SUPER_ADMIN', 'VERIFICATION_ADMIN'), (req, res) => {
  const students = db.prepare(`SELECT id, matric_number, full_name, phone_raw, phone_normalized FROM students WHERE password_hash IS NULL`).all() as {
    id: number;
    matric_number: string;
    full_name: string;
    phone_raw: string | null;
    phone_normalized: string | null;
  }[];
  let set = 0;
  let skipped = 0;
  for (const s of students) {
    const local = toLocalMobile(s.phone_raw || '') || (s.phone_normalized ? toLocalMobile(s.phone_normalized) : null);
    if (!local) { skipped++; continue; }
    db.prepare(`UPDATE students SET password_hash = ?, must_change_password = 1, updated_at = datetime('now') WHERE id = ?`).run(bcrypt.hashSync(local, 10), s.id);
    set++;
  }
  const admin = (req as any).admin as { id: number; name: string };
  audit({ actorType: 'admin', actorId: admin.id, actorLabel: admin.name, action: 'phone_passwords_bulk', description: `Set phone passwords for ${set} students (${skipped} skipped, no usable phone)` });
  res.json({ ok: true, set, skipped });
});

// ---------------------------------------------------------------------------
// WhatsApp approved-number database.
// ---------------------------------------------------------------------------
adminStudentsRouter.get('/whatsapp', requireRole('SUPER_ADMIN', 'VERIFICATION_ADMIN'), (req, res) => {
  const q = String(req.query.q || '').trim().toLowerCase();
  let rows;
  if (q) {
    rows = db
      .prepare(`SELECT * FROM approved_whatsapp_numbers WHERE lower(phone_normalized) LIKE ? OR lower(phone_raw) LIKE ? ORDER BY id DESC LIMIT 500`)
      .all(`%${q}%`, `%${q}%`);
  } else {
    rows = db.prepare(`SELECT * FROM approved_whatsapp_numbers ORDER BY id DESC LIMIT 500`).all();
  }
  res.json({ numbers: rows });
});

adminStudentsRouter.post('/whatsapp', requireRole('SUPER_ADMIN', 'VERIFICATION_ADMIN'), (req, res) => {
  const { phone } = req.body ?? {};
  const norm = normalizePhone(String(phone ?? ''));
  if (!norm) return res.status(400).json({ error: 'Please provide a valid Nigerian phone number.' });
  const exists = db.prepare(`SELECT id FROM approved_whatsapp_numbers WHERE phone_normalized = ?`).get(norm);
  if (exists) return res.status(409).json({ error: 'That number is already on the approved list.' });
  const admin = (req as any).admin as { id: number; name: string };
  db.prepare(`INSERT INTO approved_whatsapp_numbers (phone_raw, phone_normalized, added_by_admin_id, note) VALUES (?, ?, ?, ?)`).run(String(phone).trim(), norm, admin.id, 'added manually');
  // Confirming a number is the union's verification act: any pending student
  // registered with this number is now a confirmed member and becomes ACTIVE.
  const activated = db
    .prepare(`UPDATE students SET status = 'ACTIVE', updated_at = datetime('now') WHERE phone_normalized = ? AND status = 'PENDING_VERIFICATION'`)
    .run(norm).changes;
  audit({ actorType: 'admin', actorId: admin.id, actorLabel: admin.name, action: 'whatsapp_add', entityType: 'whatsapp', description: `Added ${norm} (${activated} student(s) activated)`, ip: req.ip });
  res.json({ ok: true, phone_normalized: norm, activated });
});

adminStudentsRouter.delete('/whatsapp/:id', requireRole('SUPER_ADMIN', 'VERIFICATION_ADMIN'), (req, res) => {
  const id = Number(req.params.id);
  const row = db.prepare(`SELECT phone_normalized FROM approved_whatsapp_numbers WHERE id = ?`).get(id) as { phone_normalized: string } | undefined;
  if (!row) return res.status(404).json({ error: 'Number not found.' });
  db.prepare(`DELETE FROM approved_whatsapp_numbers WHERE id = ?`).run(id);
  const admin = (req as any).admin as { id: number; name: string };
  audit({ actorType: 'admin', actorId: admin.id, actorLabel: admin.name, action: 'whatsapp_remove', entityType: 'whatsapp', description: `Removed ${row.phone_normalized}`, ip: req.ip });
  res.json({ ok: true });
});

// Re-normalize a matric number that may have been stored loosely.
export { normalizeMatric };
