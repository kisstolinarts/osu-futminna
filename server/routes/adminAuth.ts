import { Router } from 'express';
import bcrypt from 'bcryptjs';
import rateLimit from 'express-rate-limit';
import { prepare } from '../dbCloud';
import { audit } from '../lib/audit';
import { ah } from '../lib/asyncHandler';
import { ADMIN_COOKIE, clearCookie, setCookie, signAdmin } from '../lib/cookies';
import { requireAdmin } from '../middleware/auth';

export const adminAuthRouter = Router();

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 15,
  standardHeaders: true,
  legacyHeaders: false,
  // Only failed attempts count, so legitimate admins aren't locked out and
  // the block stays on repeated wrong passwords.
  skipSuccessfulRequests: true,
  message: { error: 'Too many login attempts. Please wait 15 minutes and try again.' },
});

adminAuthRouter.post(
  '/login',
  loginLimiter,
  ah(async (req, res) => {
    const { email, password } = req.body ?? {};
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }
    const admin = (await prepare(
      `SELECT id, name, email, password_hash, role, must_change_password FROM admins WHERE lower(email) = lower(?)`,
    ).get(String(email).trim())) as
      | { id: number; name: string; email: string; password_hash: string; role: string; must_change_password: number }
      | undefined;

    if (!admin || !bcrypt.compareSync(String(password), admin.password_hash)) {
      await audit({ actorType: 'system', action: 'admin_login_failed', description: `Failed admin login for ${String(email).trim()}` });
      return res.status(401).json({ error: 'Incorrect email or password.' });
    }

    await prepare(`UPDATE admins SET last_login_at = datetime('now') WHERE id = ?`).run(admin.id);
    setCookie(res, ADMIN_COOKIE, signAdmin({ id: admin.id, role: admin.role }));
    await audit({ actorType: 'admin', actorId: admin.id, actorLabel: admin.name, action: 'admin_login', description: 'Admin signed in' });
    res.json({ admin: { id: admin.id, name: admin.name, email: admin.email, role: admin.role, must_change_password: !!admin.must_change_password } });
  }),
);

adminAuthRouter.post(
  '/logout',
  ah(async (req, res) => {
    const admin = (req as any).admin;
    if (admin) await audit({ actorType: 'admin', actorId: admin.id, actorLabel: admin.name, action: 'admin_logout', description: 'Admin signed out' });
    clearCookie(res, ADMIN_COOKIE);
    res.json({ ok: true });
  }),
);

adminAuthRouter.get(
  '/me',
  requireAdmin,
  ah(async (req, res) => {
    const me = (req as any).admin as { id: number };
    const admin = await prepare(`SELECT id, name, email, role, must_change_password, last_login_at FROM admins WHERE id = ?`).get(me.id);
    res.json({ admin });
  }),
);

adminAuthRouter.post(
  '/change-password',
  requireAdmin,
  ah(async (req, res) => {
    const admin = (req as any).admin as { id: number; name: string };
    const { currentPassword, newPassword } = req.body ?? {};
    if (!newPassword) return res.status(400).json({ error: 'New password is required.' });
    if (String(newPassword).length < 8) return res.status(400).json({ error: 'New password must be at least 8 characters.' });

    const row = (await prepare(`SELECT password_hash, must_change_password FROM admins WHERE id = ?`).get(admin.id)) as {
      password_hash: string;
      must_change_password: number;
    };
    // Forced change (first login / reset by super admin) skips the current password.
    if (!row.must_change_password) {
      if (!currentPassword) return res.status(400).json({ error: 'Your current password is required.' });
      if (!bcrypt.compareSync(String(currentPassword), row.password_hash)) {
        return res.status(400).json({ error: 'Current password is incorrect.' });
      }
    }
    await prepare(`UPDATE admins SET password_hash = ?, must_change_password = 0 WHERE id = ?`).run(
      bcrypt.hashSync(String(newPassword), 10),
      admin.id,
    );
    await audit({ actorType: 'admin', actorId: admin.id, actorLabel: admin.name, action: 'admin_password_change', description: 'Admin changed own password' });
    res.json({ ok: true });
  }),
);

export { ADMIN_COOKIE };
