import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { prepare } from '../dbCloud';
import { audit } from '../lib/audit';
import { ah } from '../lib/asyncHandler';
import { requireAdmin, requireRole } from '../middleware/auth';

export const adminUsersRouter = Router();
adminUsersRouter.use(requireAdmin);

const ROLES = ['SUPER_ADMIN', 'ELECTORAL_ADMIN', 'VERIFICATION_ADMIN', 'CONTENT_ADMIN', 'RESULTS_OBSERVER'] as const;

function validateNewPassword(pw: string): string | null {
  if (String(pw).length < 8) return 'Password must be at least 8 characters.';
  return null;
}

// ---------------------------------------------------------------------------
// List all admins (SUPER_ADMIN only)
// ---------------------------------------------------------------------------
adminUsersRouter.get(
  '/',
  requireRole('SUPER_ADMIN'),
  ah(async (_req, res) => {
    const admins = await prepare(
      `SELECT id, name, email, role, must_change_password, last_login_at, created_at FROM admins ORDER BY id`,
    ).all();
    res.json({ admins });
  }),
);

// ---------------------------------------------------------------------------
// Create a new admin (SUPER_ADMIN only). Temp password shown once; the new
// admin is forced to change it on first sign-in.
// ---------------------------------------------------------------------------
adminUsersRouter.post(
  '/',
  requireRole('SUPER_ADMIN'),
  ah(async (req, res) => {
    const { name, email, password, role } = req.body ?? {};
    if (!name || !email) return res.status(400).json({ error: 'Name and email are required.' });
    const roleOk = ROLES.includes(role);
    if (!roleOk) return res.status(400).json({ error: `Role must be one of: ${ROLES.join(', ')}.` });
    const pwError = validateNewPassword(String(password || ''));
    if (pwError) return res.status(400).json({ error: pwError });

    const exists = await prepare(`SELECT id FROM admins WHERE lower(email) = lower(?)`).get(String(email).trim());
    if (exists) return res.status(409).json({ error: 'An admin with that email already exists.' });

    const info = await prepare(`INSERT INTO admins (name, email, password_hash, role, must_change_password) VALUES (?, ?, ?, ?, 1)`).run(
      String(name).trim(),
      String(email).trim().toLowerCase(),
      bcrypt.hashSync(String(password), 10),
      role,
    );

    const admin = (req as any).admin as { id: number; name: string };
    await audit({ actorType: 'admin', actorId: admin.id, actorLabel: admin.name, action: 'admin_created', entityType: 'admin', entityId: Number(info.lastInsertRowid), description: `Created ${role} admin "${name}" (${String(email).trim().toLowerCase()})` });

    res.status(201).json({
      admin: await prepare(`SELECT id, name, email, role FROM admins WHERE id = ?`).get(Number(info.lastInsertRowid)),
      temporary_password: String(password),
      note: 'Share the temporary password with the admin — they will be asked to change it on first login.',
    });
  }),
);

// ---------------------------------------------------------------------------
// Own account: update own name/email.
// (Registered before '/:id' so "profile/me" is not treated as an id.)
// ---------------------------------------------------------------------------
adminUsersRouter.patch(
  '/profile/me',
  ah(async (req, res) => {
    const me = (req as any).admin as { id: number; name: string; email: string };
    const { name, email } = req.body ?? {};
    if (!name && !email) return res.status(400).json({ error: 'Nothing to update.' });
    const sets: string[] = [];
    const vals: (string | number)[] = [];
    if (name !== undefined) { sets.push(`name = ?`); vals.push(String(name).trim()); }
    if (email !== undefined) {
      const e = String(email).trim().toLowerCase();
      const dup = await prepare(`SELECT id FROM admins WHERE lower(email) = ? AND id != ?`).get(e, me.id);
      if (dup) return res.status(409).json({ error: 'Another admin already uses that email.' });
      sets.push(`email = ?`);
      vals.push(e);
    }
    vals.push(me.id);
    await prepare(`UPDATE admins SET ${sets.join(', ')} WHERE id = ?`).run(...vals);
    await audit({ actorType: 'admin', actorId: me.id, actorLabel: me.name, action: 'admin_profile_updated', description: 'Admin updated own name/email' });
    res.json({ ok: true });
  }),
);

// ---------------------------------------------------------------------------
// Update an admin: name/email/role and optionally reset the password.
// ---------------------------------------------------------------------------
adminUsersRouter.patch(
  '/:id',
  requireRole('SUPER_ADMIN'),
  ah(async (req, res) => {
    const id = Number(req.params.id);
    const target = (await prepare(`SELECT id, name, email, role FROM admins WHERE id = ?`).get(id)) as any;
    if (!target) return res.status(404).json({ error: 'Admin not found.' });

    const { name, email, role, password } = req.body ?? {};
    const sets: string[] = [];
    const vals: (string | number)[] = [];
    if (name !== undefined) { sets.push(`name = ?`); vals.push(String(name).trim()); }
    if (email !== undefined) {
      const e = String(email).trim().toLowerCase();
      const dup = await prepare(`SELECT id FROM admins WHERE lower(email) = ? AND id != ?`).get(e, id);
      if (dup) return res.status(409).json({ error: 'Another admin already uses that email.' });
      sets.push(`email = ?`);
      vals.push(e);
    }
    if (role !== undefined) {
      if (!ROLES.includes(role)) return res.status(400).json({ error: 'Invalid role.' });
      sets.push(`role = ?`);
      vals.push(role);
    }
    if (password !== undefined && password !== '') {
      const pwError = validateNewPassword(String(password));
      if (pwError) return res.status(400).json({ error: pwError });
      sets.push(`password_hash = ?`);
      sets.push(`must_change_password = 1`);
      vals.push(bcrypt.hashSync(String(password), 10));
    }
    if (sets.length === 0) return res.status(400).json({ error: 'Nothing to update.' });
    vals.push(id);
    await prepare(`UPDATE admins SET ${sets.join(', ')} WHERE id = ?`).run(...vals);

    const admin = (req as any).admin as { id: number; name: string };
    await audit({ actorType: 'admin', actorId: admin.id, actorLabel: admin.name, action: 'admin_updated', entityType: 'admin', entityId: id, description: `Updated admin ${target.email}` });
    res.json({ ok: true });
  }),
);

// ---------------------------------------------------------------------------
// Delete an admin (cannot delete yourself).
// ---------------------------------------------------------------------------
adminUsersRouter.delete(
  '/:id',
  requireRole('SUPER_ADMIN'),
  ah(async (req, res) => {
    const id = Number(req.params.id);
    const me = (req as any).admin as { id: number };
    if (id === me.id) return res.status(400).json({ error: 'You cannot delete your own account here.' });
    const target = (await prepare(`SELECT name, email FROM admins WHERE id = ?`).get(id)) as any;
    if (!target) return res.status(404).json({ error: 'Admin not found.' });
    await prepare(`DELETE FROM admins WHERE id = ?`).run(id);
    const admin = (req as any).admin as { id: number; name: string };
    await audit({ actorType: 'admin', actorId: admin.id, actorLabel: admin.name, action: 'admin_deleted', entityType: 'admin', entityId: id, description: `Deleted admin ${target.email}` });
    res.json({ ok: true });
  }),
);

export { ROLES };
