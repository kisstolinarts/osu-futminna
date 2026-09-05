import { Router } from 'express';
import { prepare } from '../dbCloud';
import { audit } from '../lib/audit';
import { ah } from '../lib/asyncHandler';
import { requireAdmin, requireRole } from '../middleware/auth';

// ---------------------------------------------------------------------------
// App settings: stores the OSU Google Form / Sheet links used by the union.
// Admin-only for writing; a small public slice is exposed for the site.
// ---------------------------------------------------------------------------
const ALLOWED_KEYS = ['join_form_url', 'responses_sheet_url', 'sync_csv_url'] as const;

async function getSettings(): Promise<Record<string, string>> {
  const rows = (await prepare(`SELECT key, value FROM app_settings`).all()) as { key: string; value: string }[];
  return Object.fromEntries(rows.map((r) => [r.key, r.value]));
}

export const settingsRouter = Router();
settingsRouter.use(requireAdmin);

settingsRouter.get(
  '/',
  ah(async (_req, res) => {
    res.json({ settings: await getSettings() });
  }),
);

settingsRouter.put(
  '/',
  requireRole('SUPER_ADMIN', 'CONTENT_ADMIN'),
  ah(async (req, res) => {
    const { settings } = req.body ?? {};
    if (!Array.isArray(settings)) return res.status(400).json({ error: 'Invalid settings payload.' });

    const upsert = prepare(
      `INSERT INTO app_settings (key, value) VALUES (?, ?)
       ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = datetime('now')`,
    );
    for (const item of settings) {
      if (!item || !(ALLOWED_KEYS as readonly string[]).includes(item.key)) continue;
      await upsert.run(item.key, String(item.value ?? '').trim());
    }
    const admin = (req as any).admin as { id: number; name: string };
    await audit({ actorType: 'admin', actorId: admin.id, actorLabel: admin.name, action: 'settings_updated', description: 'Updated OSU form/sheet links' });
    res.json({ ok: true, settings: await getSettings() });
  }),
);

/** Public-safe settings (no secrets). */
export const publicConfigRouter = Router();
publicConfigRouter.get(
  '/',
  ah(async (_req, res) => {
    const s = await getSettings();
    res.json({ join_form_url: s.join_form_url || '', enabled: !!s.join_form_url });
  }),
);
