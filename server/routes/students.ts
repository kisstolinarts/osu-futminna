import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { prepare } from '../dbCloud';
import { audit } from '../lib/audit';
import { ah } from '../lib/asyncHandler';
import { normalizeMatric, normalizePhone, toLocalMobile } from '../lib/normalize';
import { requireAdmin, requireRole } from '../middleware/auth';

export const adminStudentsRouter = Router();
adminStudentsRouter.use(requireAdmin);

// ---------------------------------------------------------------------------
// Overview statistics for the dashboard home.
// ---------------------------------------------------------------------------
adminStudentsRouter.get(
  '/stats',
  ah(async (_req, res) => {
    const count = async (sql: string, ...args: (string | number)[]): Promise<number> => {
      const row = await prepare(sql).get(...args);
      return Number((row as { n: number })?.n ?? 0);
    };

    res.json({
      total_students: await count(`SELECT COUNT(*) n FROM students`),
      by_status: {
        ACTIVE: await count(`SELECT COUNT(*) n FROM students WHERE status = 'ACTIVE'`),
        PENDING_VERIFICATION: await count(`SELECT COUNT(*) n FROM students WHERE status = 'PENDING_VERIFICATION'`),
        GRADUATED: await count(`SELECT COUNT(*) n FROM students WHERE status = 'GRADUATED'`),
        SUSPENDED: await count(`SELECT COUNT(*) n FROM students WHERE status = 'SUSPENDED'`),
        INELIGIBLE: await count(`SELECT COUNT(*) n FROM students WHERE status = 'INELIGIBLE'`),
        REJECTED: await count(`SELECT COUNT(*) n FROM students WHERE status = 'REJECTED'`),
      },
      eligible_voters: await count(`SELECT COUNT(*) n FROM students WHERE status = 'ACTIVE'`),
      no_password_yet: await count(`SELECT COUNT(*) n FROM students WHERE password_hash IS NULL`),
      approved_whatsapp: await count(`SELECT COUNT(*) n FROM approved_whatsapp_numbers WHERE active = 1`),
      total_admins: await count(`SELECT COUNT(*) n FROM admins`),
    });
  }),
);

// ---------------------------------------------------------------------------
// List / search students.
// ---------------------------------------------------------------------------
adminStudentsRouter.get(
  '/',
  ah(async (req, res) => {
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
    const rows = await prepare(
      `SELECT id, full_name, matric_number, email, level, phone_raw, phone_normalized, status, source,
              CASE WHEN password_hash IS NOT NULL THEN 1 ELSE 0 END AS has_password,
              must_change_password, invite_expires_at, created_at, last_login_at
       FROM students ${where}
       ORDER BY created_at DESC LIMIT 300`,
    ).all(...params);
    res.json({ students: rows });
  }),
);

// ---------------------------------------------------------------------------
const ALLOWED_STATUSES = ['ACTIVE', 'GRADUATED', 'SUSPENDED', 'INELIGIBLE', 'REJECTED', 'PENDING_VERIFICATION'];
const LEVEL_CHOICES = ['100 LEVEL', '200 LEVEL', '300 LEVEL', '400 LEVEL', '500 LEVEL', '600 LEVEL', 'POSTGRADUATE'];

// ---------------------------------------------------------------------------
// Update a single student's record — status (verification / eligibility)
// and/or current level (as members progress through school).
// ---------------------------------------------------------------------------
adminStudentsRouter.patch(
  '/:id',
  requireRole('SUPER_ADMIN', 'VERIFICATION_ADMIN', 'ELECTORAL_ADMIN'),
  ah(async (req, res) => {
    const id = Number(req.params.id);
    const { status, level } = req.body ?? {};

    const existing = (await prepare(`SELECT full_name, matric_number, status, level FROM students WHERE id = ?`).get(id)) as
      | { full_name: string; matric_number: string; status: string; level: string | null }
      | undefined;
    if (!existing) return res.status(404).json({ error: 'Student not found.' });

    const sets: string[] = [];
    const vals: unknown[] = [];
    const notes: string[] = [];
    if (status !== undefined) {
      if (!ALLOWED_STATUSES.includes(status)) return res.status(400).json({ error: 'Invalid status value.' });
      sets.push('status = ?'); vals.push(status);
      notes.push(`status ${existing.status} → ${status}`);
    }
    if (level !== undefined) {
      const newLevel = level === '' || level === null ? '' : String(level);
      if (newLevel !== '' && !LEVEL_CHOICES.includes(newLevel)) return res.status(400).json({ error: 'Invalid level value.' });
      const storedLevel = newLevel || 'Not provided';
      sets.push('level = ?'); vals.push(storedLevel);
      notes.push(`level ${existing.level || '—'} → ${storedLevel}`);
    }
    if (sets.length === 0) return res.status(400).json({ error: 'Nothing to update. Send status and/or level.' });

    sets.push("updated_at = datetime('now')");
    await prepare(`UPDATE students SET ${sets.join(', ')} WHERE id = ?`).run(...vals, id);
    const admin = (req as any).admin as { id: number; name: string };
    await audit({
      actorType: 'admin', actorId: admin.id, actorLabel: admin.name,
      action: 'student_record_change', entityType: 'student', entityId: id,
      description: `${existing.matric_number} (${existing.full_name}): ${notes.join('; ')}`,
      ip: req.ip,
    });
    res.json({ ok: true, status, level });
  }),
);

// ---------------------------------------------------------------------------
// Bulk: advance everyone on one level to another (e.g. yearly roll-over:
// move every 200 LEVEL student to 300 LEVEL).
// ---------------------------------------------------------------------------
adminStudentsRouter.post(
  '/level-actions/advance',
  requireRole('SUPER_ADMIN', 'VERIFICATION_ADMIN'),
  ah(async (req, res) => {
    const { from, to } = req.body ?? {};
    const fromLv = String(from ?? '').trim();
    const toLv = String(to ?? '').trim();
    if (!LEVEL_CHOICES.includes(fromLv)) return res.status(400).json({ error: 'Please choose the level to advance from.' });
    if (!LEVEL_CHOICES.includes(toLv)) return res.status(400).json({ error: 'Please choose the level to advance to.' });
    if (fromLv === toLv) return res.status(400).json({ error: 'Choose two different levels.' });

    const upd = await prepare(`UPDATE students SET level = ?, updated_at = datetime('now') WHERE level = ?`).run(toLv, fromLv);
    const admin = (req as any).admin as { id: number; name: string };
    await audit({
      actorType: 'admin', actorId: admin.id, actorLabel: admin.name,
      action: 'levels_bulk_advance', entityType: 'students',
      description: `Bulk level change: ${upd.changes} student(s) moved ${fromLv} → ${toLv}`,
      ip: req.ip,
    });
    res.json({ ok: true, from: fromLv, to: toLv, updated: upd.changes });
  }),
);

// ---------------------------------------------------------------------------
// Phone-number login passwords (no invite links needed).
// First-time password = the student's own phone number; they are forced to
// change it on first login.
// ---------------------------------------------------------------------------

// Set a single student's password to their phone number and force a change.
adminStudentsRouter.post(
  '/:id/reset-password',
  requireRole('SUPER_ADMIN', 'VERIFICATION_ADMIN'),
  ah(async (req, res) => {
    const id = Number(req.params.id);
    const student = (await prepare(`SELECT id, full_name, matric_number, phone_raw, phone_normalized FROM students WHERE id = ?`).get(id)) as
      | { id: number; full_name: string; matric_number: string; phone_raw: string | null; phone_normalized: string | null }
      | undefined;
    if (!student) return res.status(404).json({ error: 'Student not found.' });

    const local = toLocalMobile(student.phone_raw || '') || (student.phone_normalized ? toLocalMobile(student.phone_normalized) : null);
    if (!local) {
      return res.status(400).json({ error: 'This student has no usable phone number yet. Add/fix their phone first.' });
    }
    await prepare(
      `UPDATE students SET password_hash = ?, must_change_password = 1, invite_token_hash = NULL, invite_expires_at = NULL, updated_at = datetime('now') WHERE id = ?`,
    ).run(bcrypt.hashSync(local, 10), id);
    const admin = (req as any).admin as { id: number; name: string };
    await audit({ actorType: 'admin', actorId: admin.id, actorLabel: admin.name, action: 'password_reset_phone', entityType: 'student', entityId: id, description: `Reset password of ${student.matric_number} to their phone number` });
    res.json({ ok: true, message: `Password reset to ${local}. The student will be asked to set a new one on login.` });
  }),
);

// Bulk: give every student without a password a phone-number password.
adminStudentsRouter.post(
  '/password-actions/set-missing',
  requireRole('SUPER_ADMIN', 'VERIFICATION_ADMIN'),
  ah(async (_req, res) => {
    const students = (await prepare(`SELECT id, matric_number, full_name, phone_raw, phone_normalized FROM students WHERE password_hash IS NULL`).all()) as {
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
      await prepare(`UPDATE students SET password_hash = ?, must_change_password = 1, updated_at = datetime('now') WHERE id = ?`).run(bcrypt.hashSync(local, 10), s.id);
      set++;
    }
    const admin = (_req as any).admin as { id: number; name: string };
    await audit({ actorType: 'admin', actorId: admin.id, actorLabel: admin.name, action: 'phone_passwords_bulk', description: `Set phone passwords for ${set} students (${skipped} skipped, no usable phone)` });
    res.json({ ok: true, set, skipped });
  }),
);

// ---------------------------------------------------------------------------
// WhatsApp approved-number database.
// ---------------------------------------------------------------------------
adminStudentsRouter.get(
  '/whatsapp',
  requireRole('SUPER_ADMIN', 'VERIFICATION_ADMIN'),
  ah(async (req, res) => {
    const q = String(req.query.q || '').trim().toLowerCase();
    let rows;
    if (q) {
      rows = await prepare(
        `SELECT * FROM approved_whatsapp_numbers WHERE lower(phone_normalized) LIKE ? OR lower(phone_raw) LIKE ? ORDER BY id DESC LIMIT 500`,
      ).all(`%${q}%`, `%${q}%`);
    } else {
      rows = await prepare(`SELECT * FROM approved_whatsapp_numbers ORDER BY id DESC LIMIT 500`).all();
    }
    res.json({ numbers: rows });
  }),
);

adminStudentsRouter.post(
  '/whatsapp',
  requireRole('SUPER_ADMIN', 'VERIFICATION_ADMIN'),
  ah(async (req, res) => {
    const { phone } = req.body ?? {};
    const norm = normalizePhone(String(phone ?? ''));
    if (!norm) return res.status(400).json({ error: 'Please provide a valid Nigerian phone number.' });
    const exists = await prepare(`SELECT id FROM approved_whatsapp_numbers WHERE phone_normalized = ?`).get(norm);
    if (exists) return res.status(409).json({ error: 'That number is already on the approved list.' });
    const admin = (req as any).admin as { id: number; name: string };
    await prepare(`INSERT INTO approved_whatsapp_numbers (phone_raw, phone_normalized, added_by_admin_id, note) VALUES (?, ?, ?, ?)`).run(String(phone).trim(), norm, admin.id, 'added manually');
    // Confirming a number is the union's verification act: any pending student
    // registered with this number is now a confirmed member and becomes ACTIVE.
    const activated = (await prepare(
      `UPDATE students SET status = 'ACTIVE', updated_at = datetime('now') WHERE phone_normalized = ? AND status = 'PENDING_VERIFICATION'`,
    ).run(norm)).changes;
    await audit({ actorType: 'admin', actorId: admin.id, actorLabel: admin.name, action: 'whatsapp_add', entityType: 'whatsapp', description: `Added ${norm} (${activated} student(s) activated)`, ip: req.ip });
    res.json({ ok: true, phone_normalized: norm, activated });
  }),
);

adminStudentsRouter.delete(
  '/whatsapp/:id',
  requireRole('SUPER_ADMIN', 'VERIFICATION_ADMIN'),
  ah(async (req, res) => {
    const id = Number(req.params.id);
    const row = (await prepare(`SELECT phone_normalized FROM approved_whatsapp_numbers WHERE id = ?`).get(id)) as { phone_normalized: string } | undefined;
    if (!row) return res.status(404).json({ error: 'Number not found.' });
    await prepare(`DELETE FROM approved_whatsapp_numbers WHERE id = ?`).run(id);
    const admin = (req as any).admin as { id: number; name: string };
    await audit({ actorType: 'admin', actorId: admin.id, actorLabel: admin.name, action: 'whatsapp_remove', entityType: 'whatsapp', description: `Removed ${row.phone_normalized}`, ip: req.ip });
    res.json({ ok: true });
  }),
);

// Re-normalize a matric number that may have been stored loosely.
export { normalizeMatric };
