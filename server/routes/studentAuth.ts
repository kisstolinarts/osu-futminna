import { Router } from 'express';
import bcrypt from 'bcryptjs';
import rateLimit from 'express-rate-limit';
import { prepare } from '../dbCloud';
import { audit } from '../lib/audit';
import { ah } from '../lib/asyncHandler';
import { STUDENT_COOKIE, clearCookie, setCookie, signStudent } from '../lib/cookies';
import { normalizeMatric } from '../lib/normalize';
import { requireStudent } from '../middleware/auth';

export const studentAuthRouter = Router();

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many attempts. Please wait 15 minutes and try again.' },
});

function validatePassword(pw: string): string | null {
  if (pw.length < 8) return 'Password must be at least 8 characters long.';
  if (!/[A-Za-z]/.test(pw) || !/\d/.test(pw)) return 'Password must contain at least one letter and one number.';
  return null;
}

// ---------------------------------------------------------------------------
// Student login: matric number + password.
// ---------------------------------------------------------------------------
studentAuthRouter.post(
  '/login',
  loginLimiter,
  ah(async (req, res) => {
    const { matric, password } = req.body ?? {};
    const normalized = normalizeMatric(String(matric ?? ''));
    if (!normalized) return res.status(400).json({ error: 'Please enter a valid matriculation number.' });
    if (!password) return res.status(400).json({ error: 'Password is required.' });

    const student = (await prepare(
      `SELECT id, full_name, matric_number, email, level, status, password_hash, must_change_password FROM students WHERE matric_number = ?`,
    ).get(normalized)) as
      | { id: number; full_name: string; matric_number: string; email: string | null; level: string | null; status: string; password_hash: string | null; must_change_password: number }
      | undefined;

    if (!student || !student.password_hash || !bcrypt.compareSync(String(password), student.password_hash)) {
      await audit({ actorType: 'student', action: 'student_login_failed', description: `Failed login attempt for ${normalized}` });
      return res.status(401).json({
        error:
          'Incorrect matric number or password. First-time logins use your phone number (as you wrote it on the OSU form) as the password.',
      });
    }

    await prepare(`UPDATE students SET last_login_at = datetime('now') WHERE id = ?`).run(student.id);
    setCookie(res, STUDENT_COOKIE, signStudent({ id: student.id }));
    await audit({ actorType: 'student', actorId: student.id, actorLabel: student.matric_number, action: 'student_login', description: 'Student signed in' });
    res.json({
      student: {
        id: student.id,
        full_name: student.full_name,
        matric_number: student.matric_number,
        email: student.email,
        level: student.level,
        status: student.status,
        must_change_password: !!student.must_change_password,
      },
    });
  }),
);

// ---------------------------------------------------------------------------
// Change own password (used for the forced reset on first login).
// ---------------------------------------------------------------------------
studentAuthRouter.post(
  '/change-password',
  requireStudent,
  ah(async (req, res) => {
    const s = (req as any).student as { id: number; matric_number: string };
    const { new_password } = req.body ?? {};
    const pwError = validatePassword(String(new_password || ''));
    if (pwError) return res.status(400).json({ error: pwError });

    const row = (await prepare(`SELECT must_change_password FROM students WHERE id = ?`).get(s.id)) as { must_change_password: number };
    if (!row.must_change_password) {
      // Voluntary change requires the current password.
      const { current_password } = req.body ?? {};
      if (!current_password) return res.status(400).json({ error: 'Your current password is required.' });
      const cur = (await prepare(`SELECT password_hash FROM students WHERE id = ?`).get(s.id)) as { password_hash: string };
      if (!bcrypt.compareSync(String(current_password), cur.password_hash)) {
        return res.status(400).json({ error: 'Your current password is incorrect.' });
      }
    }

    const hash = bcrypt.hashSync(String(new_password), 10);
    await prepare(
      `UPDATE students SET password_hash = ?, must_change_password = 0, invite_token_hash = NULL, invite_expires_at = NULL, updated_at = datetime('now') WHERE id = ?`,
    ).run(hash, s.id);
    await audit({ actorType: 'student', actorId: s.id, actorLabel: s.matric_number, action: 'password_set', description: 'Student set a new password' });
    res.json({ ok: true });
  }),
);

// ---------------------------------------------------------------------------
// Who am I / dashboard data.
// ---------------------------------------------------------------------------
studentAuthRouter.get(
  '/me',
  requireStudent,
  ah(async (req, res) => {
    const s = (req as any).student as { id: number };
    const student = await prepare(
      `SELECT id, full_name, matric_number, email, level, status, source, must_change_password, created_at FROM students WHERE id = ?`,
    ).get(s.id);
    res.json({
      student,
      voting_eligible: (student as { status: string }).status === 'ACTIVE',
    });
  }),
);

studentAuthRouter.post(
  '/logout',
  ah(async (_req, res) => {
    clearCookie(res, STUDENT_COOKIE);
    res.json({ ok: true });
  }),
);

export { STUDENT_COOKIE };
