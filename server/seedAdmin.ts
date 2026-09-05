import 'dotenv/config';
import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';
import { prepare, migrate } from './dbCloud';

/**
 * Creates the very first administrator.
 *
 * Reads ADMIN_NAME / ADMIN_EMAIL / ADMIN_PASSWORD from the environment
 * (or .env). If ADMIN_PASSWORD is empty, a strong random password is
 * generated and printed ONCE — copy it somewhere safe.
 */

async function main() {
  await migrate();

  const name = process.env.ADMIN_NAME || 'OSU Administrator';
  const email = (process.env.ADMIN_EMAIL || 'admin@osu.local').trim().toLowerCase();
  const givenPassword = process.env.ADMIN_PASSWORD || '';

  const existing = await prepare(`SELECT id FROM admins WHERE lower(email) = ?`).get(email);
  if (existing) {
    console.log(`An admin already exists for ${email}. Nothing to do.`);
    process.exit(0);
  }

  const password = givenPassword || crypto.randomBytes(6).toString('base64url').slice(0, 12);
  const hash = bcrypt.hashSync(password, 10);

  await prepare(`INSERT INTO admins (name, email, password_hash, role, must_change_password) VALUES (?, ?, ?, 'SUPER_ADMIN', ?)`).run(
    name,
    email,
    hash,
    givenPassword ? 1 : 0,
  );

  console.log('');
  console.log('=====================================================');
  console.log('  OSU admin account created');
  console.log('=====================================================');
  console.log(`  Name    : ${name}`);
  console.log(`  Email   : ${email}`);
  console.log(`  Password: ${password}`);
  console.log('  Role    : SUPER_ADMIN');
  console.log('');
  console.log('  Keep this password private. If it was auto-generated,');
  console.log('  you will be asked to change it on first login.');
  console.log('=====================================================');
}

main().catch((err) => {
  console.error('seedAdmin failed', err);
  process.exit(1);
});
