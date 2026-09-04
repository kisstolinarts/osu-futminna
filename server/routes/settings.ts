import { Router } from 'express';
import { db } from '../db';
import { audit } from '../lib/audit';
import { requireAdmin, requireRole } from '../middleware/auth';

// ---------------------------------------------------------------------------
// App settings: stores the OSU Google Form / Sheet links used by the union.
// Admin-only for writing; a small public slice is exposed for the site.
// ---------------------------------------------------------------------------
const ALLOWED_KEYS = ['join_form_url', 'responses_sheet_url', 'sync_csv_url'] as const;

function getSettings(): Record<string, string> {
  const rows = db.prepare(`SELECT key, value FROM app_settings`).all() as { key: string; value: string }[];
  return Object.fromEntries(rows.map((r) => [r.key, r.value]));
}

export const settingsRouter = Router();
settingsRouter.use(requireAdmin);

settingsRouter.get('/', (_req, res) => {
  res.json({ settings: getSettings() });
});

settingsRouter.put('/', requireRole('SUPER_ADMIN', 'CONTENT_ADMIN'), (req, res) => {
  const { settings } = req.body ?? {};
  if (!Array.isArray(settings)) return res.status(400).json({ error: 'Invalid settings payload.' });

  const upsert = db.prepare(
    `INSERT INTO app_settings (key, value) VALUES (?, ?)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = datetime('now')`,
  );
  for (const item of settings) {
    if (!item || !(ALLOWED_KEYS as readonly string[]).includes(item.key)) continue;
    upsert.run(item.key, String(item.value ?? '').trim());
  }
  const admin = (req as any).admin as { id: number; name: string };
  audit({ actorType: 'admin', actorId: admin.id, actorLabel: admin.name, action: 'settings_updated', description: 'Updated OSU form/sheet links' });
  res.json({ ok: true, settings: getSettings() });
});

/** Public-safe settings (no secrets). */
export const publicConfigRouter = Router();
publicConfigRouter.get('/', (_req, res) => {
  const s = getSettings();
  res.json({ join_form_url: s.join_form_url || '', enabled: !!s.join_form_url });
});
