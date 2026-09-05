import type { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config';
import { prepare } from '../dbCloud';
import { ADMIN_COOKIE, STUDENT_COOKIE } from '../lib/cookies';

export interface AdminPrincipal {
  id: number;
  name: string;
  email: string;
  role: string;
}
export interface StudentPrincipal {
  id: number;
  matric_number: string;
  full_name: string;
  status: string;
  must_change_password?: number;
}

function parseToken(req: Request, cookieName: string): { sub: string; kind: string } | null {
  const token = req.cookies?.[cookieName];
  if (!token) return null;
  try {
    const payload = jwt.verify(token, config.jwtSecret) as { sub: string; kind: string };
    if (!payload?.sub) return null;
    return payload;
  } catch {
    return null;
  }
}

/** Requires a logged-in admin; attaches req.admin. */
export async function requireAdmin(req: Request, res: Response, next: NextFunction) {
  const payload = parseToken(req, ADMIN_COOKIE);
  if (!payload || payload.kind !== 'admin') {
    return res.status(401).json({ error: 'Admin authentication required.' });
  }
  try {
    const admin = (await prepare(`SELECT id, name, email, role FROM admins WHERE id = ?`).get(
      Number(payload.sub),
    )) as AdminPrincipal | undefined;
    if (!admin) return res.status(401).json({ error: 'Account no longer exists.' });
    (req as any).admin = admin;
    return next();
  } catch (err) {
    console.error('requireAdmin failed', err);
    return res.status(500).json({ error: 'Server error while loading your account.' });
  }
}

/** Role guard used after requireAdmin. */
export function requireRole(...roles: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    const admin = (req as any).admin as AdminPrincipal;
    if (!admin || !roles.includes(admin.role)) {
      return res.status(403).json({ error: 'You do not have permission for this action.' });
    }
    next();
  };
}

/** Requires a logged-in student; attaches req.student. */
export async function requireStudent(req: Request, res: Response, next: NextFunction) {
  const payload = parseToken(req, STUDENT_COOKIE);
  if (!payload || payload.kind !== 'student') {
    return res.status(401).json({ error: 'Student authentication required.' });
  }
  try {
    const student = (await prepare(
      `SELECT id, full_name, matric_number, status, level, email, phone_raw, must_change_password, created_at
       FROM students WHERE id = ?`,
    ).get(Number(payload.sub))) as StudentPrincipal | undefined;
    if (!student) return res.status(401).json({ error: 'Account no longer exists.' });
    (req as any).student = student;
    return next();
  } catch (err) {
    console.error('requireStudent failed', err);
    return res.status(500).json({ error: 'Server error while loading your account.' });
  }
}
