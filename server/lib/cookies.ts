import jwt from 'jsonwebtoken';
import type { Response } from 'express';
import { config } from '../config';

export const ADMIN_COOKIE = 'osu_admin';
export const STUDENT_COOKIE = 'osu_student';

export function signAdmin(admin: { id: number; role: string }): string {
  return jwt.sign({ sub: String(admin.id), role: admin.role, kind: 'admin' }, config.jwtSecret, {
    expiresIn: '12h',
  });
}

export function signStudent(student: { id: number }): string {
  return jwt.sign({ sub: String(student.id), kind: 'student' }, config.jwtSecret, {
    expiresIn: '12h',
  });
}

export function setCookie(res: Response, name: string, token: string) {
  res.cookie(name, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: config.cookieSecure,
    maxAge: 12 * 60 * 60 * 1000,
    path: '/',
  });
}

export function clearCookie(res: Response, name: string) {
  res.clearCookie(name, { httpOnly: true, sameSite: 'lax', secure: config.cookieSecure, path: '/' });
}
