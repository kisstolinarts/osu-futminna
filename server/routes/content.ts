import { Router } from 'express';
import multer from 'multer';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { prepare } from '../dbCloud';
import { audit } from '../lib/audit';
import { ah } from '../lib/asyncHandler';
import { requireAdmin, requireRole } from '../middleware/auth';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const uploadsDir = path.resolve(__dirname, '..', 'uploads');
const galleryDir = path.join(uploadsDir, 'gallery');
fs.mkdirSync(galleryDir, { recursive: true });

// ---------------------------------------------------------------------------
// Helpers to read / write content_blocks (JSON-safe arrays stored as text)
// ---------------------------------------------------------------------------
const ARRAY_KEYS = ['about_paragraphs', 'history_paragraphs', 'objectives'];
export async function getBlocks(): Promise<Record<string, string>> {
  const rows = (await prepare(`SELECT key, value FROM content_blocks`).all()) as { key: string; value: string }[];
  return Object.fromEntries(rows.map((r) => [r.key, r.value]));
}
function readArr(v: string | undefined): string[] {
  if (!v) return [];
  try {
    const parsed = JSON.parse(v);
    return Array.isArray(parsed) ? parsed.map(String) : [String(parsed)];
  } catch {
    return [v];
  }
}
export async function assembleContent() {
  const b = await getBlocks();
  return {
    site: {
      tagline: b.tagline || '',
      email: b.contact_email || '',
      address: b.contact_address || '',
      whatsapp_text: b.whatsapp_text || '',
    },
    about: {
      about_paragraphs: readArr(b.about_paragraphs),
      history_paragraphs: readArr(b.history_paragraphs),
      vision: b.vision || '',
      mission: b.mission || '',
      objectives: readArr(b.objectives),
      constitution_note: b.constitution_note || '',
    },
  };
}

// ---------------------------------------------------------------------------
// PUBLIC aggregate — everything a page needs in one fetch.
// ---------------------------------------------------------------------------
export const publicContentRouter = Router();
publicContentRouter.get(
  '/',
  ah(async (_req, res) => {
    const content = await assembleContent();
    const announcements = await prepare(
      `SELECT id, title, category, excerpt, body, author, date_label, image, created_at FROM announcements WHERE published = 1 ORDER BY id DESC`,
    ).all();
    const events = await prepare(`SELECT id, title, date_label, time, venue, excerpt, status FROM events ORDER BY id DESC`).all();
    const albums = await prepare(
      `SELECT a.id, a.name, a.description, i.id AS image_id, i.filename, i.caption
       FROM gallery_albums a LEFT JOIN gallery_images i ON i.album_id = a.id
       ORDER BY a.id, i.id`,
    ).all();
    const albumMap = new Map<number, { id: number; name: string; description: string; images: { id: number; src: string; caption: string }[] }>();
    for (const r of albums as any[]) {
      if (!albumMap.has(r.id)) albumMap.set(r.id, { id: r.id, name: r.name, description: r.description, images: [] });
      if (r.image_id) albumMap.get(r.id)!.images.push({ id: r.image_id, src: r.filename, caption: r.caption });
    }
    res.json({
      ...content,
      announcements,
      events,
      galleryAlbums: Array.from(albumMap.values()),
    });
  }),
);

// ---------------------------------------------------------------------------
// ADMIN content management
// ---------------------------------------------------------------------------
export const adminContentRouter = Router();
adminContentRouter.use(requireAdmin);

// ---- Site + About blocks ----------------------------------------------
adminContentRouter.get(
  '/config',
  ah(async (_req, res) => {
    res.json({ ...(await assembleContent()) });
  }),
);

adminContentRouter.put(
  '/config',
  requireRole('SUPER_ADMIN', 'CONTENT_ADMIN'),
  ah(async (req, res) => {
    const { site, about } = req.body ?? {};
    const upsert = prepare(
      `INSERT INTO content_blocks (key, value) VALUES (?, ?)
       ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = datetime('now')`,
    );
    const write = async (key: string, value: string) => { await upsert.run(key, value); };
    if (site) {
      if (site.tagline !== undefined) await write('tagline', String(site.tagline));
      if (site.email !== undefined) await write('contact_email', String(site.email));
      if (site.address !== undefined) await write('contact_address', String(site.address));
      if (site.whatsapp_text !== undefined) await write('whatsapp_text', String(site.whatsapp_text));
    }
    if (about) {
      if (about.about_paragraphs !== undefined) await write('about_paragraphs', JSON.stringify(about.about_paragraphs.map(String)));
      if (about.history_paragraphs !== undefined) await write('history_paragraphs', JSON.stringify(about.history_paragraphs.map(String)));
      if (about.vision !== undefined) await write('vision', String(about.vision));
      if (about.mission !== undefined) await write('mission', String(about.mission));
      if (about.objectives !== undefined) await write('objectives', JSON.stringify(about.objectives.map(String)));
      if (about.constitution_note !== undefined) await write('constitution_note', String(about.constitution_note));
    }
    const admin = (req as any).admin as { id: number; name: string };
    await audit({ actorType: 'admin', actorId: admin.id, actorLabel: admin.name, action: 'content_updated', entityType: 'content', description: 'Updated site/About content' });
    res.json({ ...(await assembleContent()) });
  }),
);

// ---- Announcements ------------------------------------------------------
adminContentRouter.get(
  '/announcements',
  ah(async (_req, res) => {
    res.json({ announcements: await prepare(`SELECT * FROM announcements ORDER BY id DESC`).all() });
  }),
);

adminContentRouter.post(
  '/announcements',
  requireRole('SUPER_ADMIN', 'CONTENT_ADMIN'),
  ah(async (req, res) => {
    const { title, category, excerpt, body, author, date_label, image, published } = req.body ?? {};
    if (!title) return res.status(400).json({ error: 'Title is required.' });
    const info = await prepare(
      `INSERT INTO announcements (title, category, excerpt, body, author, date_label, image, published) VALUES (?,?,?,?,?,?,?,?)`,
    ).run(
      String(title).trim(), String(category || 'Union News').trim(), String(excerpt || '').trim(),
      String(body || ''), String(author || 'OSU Executive Council').trim(), String(date_label || '').trim(),
      image ? String(image) : null, published === false ? 0 : 1,
    );
    const admin = (req as any).admin as { id: number; name: string };
    await audit({ actorType: 'admin', actorId: admin.id, actorLabel: admin.name, action: 'announcement_created', entityType: 'announcement', entityId: Number(info.lastInsertRowid), description: `Created "${title}"` });
    res.status(201).json({ announcement: await prepare(`SELECT * FROM announcements WHERE id = ?`).get(info.lastInsertRowid) });
  }),
);

adminContentRouter.patch(
  '/announcements/:id',
  requireRole('SUPER_ADMIN', 'CONTENT_ADMIN'),
  ah(async (req, res) => {
    const id = Number(req.params.id);
    const existing = await prepare(`SELECT id FROM announcements WHERE id = ?`).get(id);
    if (!existing) return res.status(404).json({ error: 'Not found.' });
    const allowed = ['title', 'category', 'excerpt', 'body', 'author', 'date_label', 'image'];
    const b = req.body ?? {};
    const sets: string[] = [];
    const vals: (string | number | null)[] = [];
    for (const k of allowed) {
      if (b[k] !== undefined) {
        sets.push(`${k} = ?`);
        vals.push(b[k] === '' && k === 'image' ? null : String(b[k]));
      }
    }
    if (b.published !== undefined) {
      sets.push(`published = ?`);
      vals.push(b.published === true || b.published === 1 ? 1 : 0);
    }
    if (sets.length === 0) return res.status(400).json({ error: 'Nothing to update.' });
    sets.push(`updated_at = datetime('now')`);
    vals.push(id);
    await prepare(`UPDATE announcements SET ${sets.join(', ')} WHERE id = ?`).run(...vals);
    const admin = (req as any).admin as { id: number; name: string };
    await audit({ actorType: 'admin', actorId: admin.id, actorLabel: admin.name, action: 'announcement_updated', entityType: 'announcement', entityId: id, description: 'Updated announcement' });
    res.json({ announcement: await prepare(`SELECT * FROM announcements WHERE id = ?`).get(id) });
  }),
);

adminContentRouter.delete(
  '/announcements/:id',
  requireRole('SUPER_ADMIN', 'CONTENT_ADMIN'),
  ah(async (req, res) => {
    const id = Number(req.params.id);
    await prepare(`DELETE FROM announcements WHERE id = ?`).run(id);
    const admin = (req as any).admin as { id: number; name: string };
    await audit({ actorType: 'admin', actorId: admin.id, actorLabel: admin.name, action: 'announcement_deleted', entityType: 'announcement', entityId: id, description: 'Deleted announcement' });
    res.json({ ok: true });
  }),
);

// ---- Events -------------------------------------------------------------
adminContentRouter.get(
  '/events',
  ah(async (_req, res) => {
    res.json({ events: await prepare(`SELECT * FROM events ORDER BY id DESC`).all() });
  }),
);

adminContentRouter.post(
  '/events',
  requireRole('SUPER_ADMIN', 'CONTENT_ADMIN'),
  ah(async (req, res) => {
    const { title, date_label, time, venue, excerpt, status } = req.body ?? {};
    if (!title) return res.status(400).json({ error: 'Title is required.' });
    const info = await prepare(`INSERT INTO events (title, date_label, time, venue, excerpt, status) VALUES (?,?,?,?,?,?)`).run(
      String(title).trim(), String(date_label || ''), String(time || ''), String(venue || ''), String(excerpt || ''), status === 'past' ? 'past' : 'upcoming',
    );
    const admin = (req as any).admin as { id: number; name: string };
    await audit({ actorType: 'admin', actorId: admin.id, actorLabel: admin.name, action: 'event_created', entityType: 'event', entityId: Number(info.lastInsertRowid), description: `Created event "${title}"` });
    res.status(201).json({ event: await prepare(`SELECT * FROM events WHERE id = ?`).get(info.lastInsertRowid) });
  }),
);

adminContentRouter.patch(
  '/events/:id',
  requireRole('SUPER_ADMIN', 'CONTENT_ADMIN'),
  ah(async (req, res) => {
    const id = Number(req.params.id);
    const existing = await prepare(`SELECT id FROM events WHERE id = ?`).get(id);
    if (!existing) return res.status(404).json({ error: 'Not found.' });
    const allowed = ['title', 'date_label', 'time', 'venue', 'excerpt'];
    const b = req.body ?? {};
    const sets: string[] = [];
    const vals: (string | number)[] = [];
    for (const k of allowed) {
      if (b[k] !== undefined) { sets.push(`${k} = ?`); vals.push(String(b[k])); }
    }
    if (b.status !== undefined) { sets.push(`status = ?`); vals.push(b.status === 'past' ? 'past' : 'upcoming'); }
    if (sets.length === 0) return res.status(400).json({ error: 'Nothing to update.' });
    sets.push(`updated_at = datetime('now')`);
    vals.push(id);
    await prepare(`UPDATE events SET ${sets.join(', ')} WHERE id = ?`).run(...vals);
    const admin = (req as any).admin as { id: number; name: string };
    await audit({ actorType: 'admin', actorId: admin.id, actorLabel: admin.name, action: 'event_updated', entityType: 'event', entityId: id, description: 'Updated event' });
    res.json({ event: await prepare(`SELECT * FROM events WHERE id = ?`).get(id) });
  }),
);

adminContentRouter.delete(
  '/events/:id',
  requireRole('SUPER_ADMIN', 'CONTENT_ADMIN'),
  ah(async (req, res) => {
    const id = Number(req.params.id);
    await prepare(`DELETE FROM events WHERE id = ?`).run(id);
    const admin = (req as any).admin as { id: number; name: string };
    await audit({ actorType: 'admin', actorId: admin.id, actorLabel: admin.name, action: 'event_deleted', entityType: 'event', entityId: id, description: 'Deleted event' });
    res.json({ ok: true });
  }),
);

// ---- Gallery ------------------------------------------------------------
adminContentRouter.get(
  '/albums',
  ah(async (_req, res) => {
    const rows = await prepare(
      `SELECT a.id, a.name, a.description, i.id AS image_id, i.filename, i.caption
       FROM gallery_albums a LEFT JOIN gallery_images i ON i.album_id = a.id ORDER BY a.id, i.id`,
    ).all();
    const map = new Map<number, any>();
    for (const r of rows as any[]) {
      if (!map.has(r.id)) map.set(r.id, { id: r.id, name: r.name, description: r.description, images: [] });
      if (r.image_id) map.get(r.id).images.push({ id: r.image_id, filename: r.filename, caption: r.caption });
    }
    res.json({ albums: Array.from(map.values()) });
  }),
);

adminContentRouter.post(
  '/albums',
  requireRole('SUPER_ADMIN', 'CONTENT_ADMIN'),
  ah(async (req, res) => {
    const { name, description } = req.body ?? {};
    if (!name) return res.status(400).json({ error: 'Album name is required.' });
    const info = await prepare(`INSERT INTO gallery_albums (name, description) VALUES (?, ?)`).run(String(name).trim(), String(description || ''));
    const admin = (req as any).admin as { id: number; name: string };
    await audit({ actorType: 'admin', actorId: admin.id, actorLabel: admin.name, action: 'album_created', entityType: 'gallery_album', entityId: Number(info.lastInsertRowid), description: `Created album "${name}"` });
    res.status(201).json({ album: await prepare(`SELECT * FROM gallery_albums WHERE id = ?`).get(info.lastInsertRowid) });
  }),
);

adminContentRouter.delete(
  '/albums/:id',
  requireRole('SUPER_ADMIN', 'CONTENT_ADMIN'),
  ah(async (req, res) => {
    const id = Number(req.params.id);
    const imgs = (await prepare(`SELECT filename FROM gallery_images WHERE album_id = ?`).all(id)) as { filename: string }[];
    for (const i of imgs) safeUnlink(i.filename);
    await prepare(`DELETE FROM gallery_albums WHERE id = ?`).run(id);
    const admin = (req as any).admin as { id: number; name: string };
    await audit({ actorType: 'admin', actorId: admin.id, actorLabel: admin.name, action: 'album_deleted', entityType: 'gallery_album', entityId: id, description: 'Deleted album' });
    res.json({ ok: true });
  }),
);

// Upload storage: local disk for now; swaps to object storage at launch.
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, galleryDir),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase().replace(/[^.a-z0-9]/g, '') || '.jpg';
    cb(null, `${Date.now()}-${crypto.randomBytes(4).toString('hex')}${ext}`);
  },
});
const upload = multer({
  storage,
  limits: { fileSize: 8 * 1024 * 1024 },
  fileFilter: (_req: any, file: any, cb: any) => {
    const ok = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'].includes(file.mimetype);
    if (ok) cb(null, true);
    else cb(new Error('Only JPG, PNG, WEBP or GIF images are allowed.'), false);
  },
});

adminContentRouter.post(
  '/albums/:id/images',
  requireRole('SUPER_ADMIN', 'CONTENT_ADMIN'),
  upload.array('images', 12),
  ah(async (req, res) => {
    const albumId = Number(req.params.id);
    const album = await prepare(`SELECT id FROM gallery_albums WHERE id = ?`).get(albumId);
    if (!album) return res.status(404).json({ error: 'Album not found.' });
    const files = (req.files as Express.Multer.File[]) || [];
    const caption = String((req.body as any)?.caption || '');
    const added: unknown[] = [];
    for (const f of files) {
      const info = await prepare(`INSERT INTO gallery_images (album_id, filename, caption) VALUES (?, ?, ?)`).run(
        albumId,
        `/uploads/gallery/${f.filename}`,
        caption,
      );
      added.push(await prepare(`SELECT id, filename, caption FROM gallery_images WHERE id = ?`).get(info.lastInsertRowid));
    }
    const admin = (req as any).admin as { id: number; name: string };
    await audit({ actorType: 'admin', actorId: admin.id, actorLabel: admin.name, action: 'gallery_uploaded', entityType: 'gallery_album', entityId: albumId, description: `Uploaded ${added.length} image(s)` });
    res.status(201).json({ images: added });
  }),
);

adminContentRouter.delete(
  '/images/:id',
  requireRole('SUPER_ADMIN', 'CONTENT_ADMIN'),
  ah(async (req, res) => {
    const id = Number(req.params.id);
    const img = (await prepare(`SELECT filename FROM gallery_images WHERE id = ?`).get(id)) as { filename: string } | undefined;
    if (!img) return res.status(404).json({ error: 'Image not found.' });
    await prepare(`DELETE FROM gallery_images WHERE id = ?`).run(id);
    safeUnlink(img.filename);
    const admin = (req as any).admin as { id: number; name: string };
    await audit({ actorType: 'admin', actorId: admin.id, actorLabel: admin.name, action: 'gallery_image_deleted', entityType: 'gallery_image', entityId: id, description: 'Deleted image' });
    res.json({ ok: true });
  }),
);

function safeUnlink(urlPath: string) {
  try {
    // URL path like /uploads/gallery/xxx.jpg
    const name = urlPath.replace(/^\/uploads\/gallery\//, '');
    if (name && !name.includes('..')) fs.unlinkSync(path.join(galleryDir, name));
  } catch {
    /* ignore */
  }
}
