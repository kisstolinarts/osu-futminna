import { Router } from 'express';
import crypto from 'node:crypto';
import { prepare } from '../dbCloud';
import { audit } from '../lib/audit';
import { ah } from '../lib/asyncHandler';
import { requireAdmin, requireRole } from '../middleware/auth';

export const adminElectionsRouter = Router();
adminElectionsRouter.use(requireAdmin);

const STATUSES = ['DRAFT', 'SCHEDULED', 'OPEN', 'CLOSED', 'RESULTS_PUBLISHED'] as const;

function cleanInt(v: unknown): number | null {
  const n = Number(v);
  return Number.isInteger(n) && n > 0 ? n : null;
}

// ---------------------------------------------------------------------------
// Elections
// ---------------------------------------------------------------------------
adminElectionsRouter.get(
  '/',
  ah(async (_req, res) => {
    const elections = await prepare(`SELECT * FROM elections ORDER BY opens_at DESC`).all();
    const stats = (await prepare(
      `SELECT election_id, COUNT(*) AS votes_cast FROM election_participation GROUP BY election_id`,
    ).all()) as { election_id: number; votes_cast: number }[];
    const statMap = new Map(stats.map((s) => [s.election_id, s.votes_cast]));
    res.json({
      elections: (elections as any[]).map((e) => ({
        ...e,
        votes_cast: statMap.get(e.id) ?? 0,
      })),
    });
  }),
);

adminElectionsRouter.post(
  '/',
  requireRole('SUPER_ADMIN', 'ELECTORAL_ADMIN'),
  ah(async (req, res) => {
    const { name, description, opens_at, closes_at } = req.body ?? {};
    if (!name || !opens_at || !closes_at) return res.status(400).json({ error: 'Name, opening and closing times are required.' });
    if (new Date(closes_at) <= new Date(opens_at)) return res.status(400).json({ error: 'Closing time must be after opening time.' });

    const slugBase = String(name).trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    const slug = slugBase + '-' + Math.random().toString(36).slice(2, 6);

    const now = new Date();
    const status = new Date(opens_at) > now ? 'SCHEDULED' : new Date(closes_at) < now ? 'CLOSED' : 'OPEN';

    const info = await prepare(`INSERT INTO elections (name, slug, description, opens_at, closes_at, status, created_by_admin_id) VALUES (?,?,?,?,?,?,?)`).run(
      String(name).trim(),
      slug,
      String(description || '').trim(),
      String(opens_at),
      String(closes_at),
      status,
      (req as any).admin.id,
    );
    const id = Number(info.lastInsertRowid);

    const admin = (req as any).admin as { id: number; name: string };
    await audit({ actorType: 'admin', actorId: admin.id, actorLabel: admin.name, action: 'election_created', entityType: 'election', entityId: id, description: `Created election "${name}"` });
    res.status(201).json({ election: await prepare(`SELECT * FROM elections WHERE id = ?`).get(id) });
  }),
);

// Manual status change (open/close/publish results) — SUPER_ADMIN / ELECTORAL only.
adminElectionsRouter.patch(
  '/:id/status',
  requireRole('SUPER_ADMIN', 'ELECTORAL_ADMIN'),
  ah(async (req, res) => {
    const id = cleanInt(req.params.id);
    const { status } = req.body ?? {};
    if (id === null) return res.status(400).json({ error: 'Invalid election id.' });
    if (!STATUSES.includes(status)) return res.status(400).json({ error: 'Invalid status.' });

    const election = (await prepare(`SELECT * FROM elections WHERE id = ?`).get(id)) as any;
    if (!election) return res.status(404).json({ error: 'Election not found.' });

    // Safety: only allow sane transitions via the manual path.
    const allowed: Record<string, string[]> = {
      DRAFT: ['SCHEDULED', 'OPEN', 'CLOSED'],
      SCHEDULED: ['OPEN', 'CLOSED'],
      OPEN: ['CLOSED'],
      CLOSED: ['RESULTS_PUBLISHED'],
      RESULTS_PUBLISHED: [],
    };
    if (!(allowed[election.status] || []).includes(status)) {
      return res.status(400).json({ error: `Cannot move an election from ${election.status} to ${status}.` });
    }

    await prepare(`UPDATE elections SET status = ?, results_published_at = CASE WHEN ? = 'RESULTS_PUBLISHED' THEN datetime('now') ELSE results_published_at END WHERE id = ?`).run(status, status, id);
    const admin = (req as any).admin as { id: number; name: string };
    await audit({ actorType: 'admin', actorId: admin.id, actorLabel: admin.name, action: status === 'RESULTS_PUBLISHED' ? 'results_published' : 'election_status_change', entityType: 'election', entityId: id, description: `Election "${election.name}" → ${status}` });
    res.json({ ok: true });
  }),
);

// ---------------------------------------------------------------------------
// Positions
// ---------------------------------------------------------------------------
adminElectionsRouter.get(
  '/:electionId/positions',
  ah(async (req, res) => {
    const electionId = cleanInt(req.params.electionId);
    if (electionId === null) return res.status(400).json({ error: 'Invalid election id.' });
    const positions = await prepare(`SELECT * FROM election_positions WHERE election_id = ? ORDER BY display_order, id`).all(electionId);
    const contestantCount = (await prepare(
      `SELECT position_id, COUNT(*) n FROM contestants WHERE position_id IN (SELECT id FROM election_positions WHERE election_id = ?) GROUP BY position_id`,
    ).all(electionId)) as { position_id: number; n: number }[];
    const map = new Map(contestantCount.map((c) => [c.position_id, c.n]));
    res.json({ positions: (positions as any[]).map((p) => ({ ...p, contestants_count: map.get(p.id) ?? 0 })) });
  }),
);

adminElectionsRouter.post(
  '/:electionId/positions',
  requireRole('SUPER_ADMIN', 'ELECTORAL_ADMIN'),
  ah(async (req, res) => {
    const electionId = cleanInt(req.params.electionId);
    const { name, description, display_order } = req.body ?? {};
    if (electionId === null || !name) return res.status(400).json({ error: 'Position name is required.' });
    const dup = await prepare(`SELECT id FROM election_positions WHERE election_id = ? AND lower(name) = lower(?)`).get(electionId, String(name).trim());
    if (dup) return res.status(409).json({ error: 'A position with that name already exists in this election.' });
    const info = await prepare(`INSERT INTO election_positions (election_id, name, description, display_order) VALUES (?,?,?,?)`).run(
      electionId,
      String(name).trim(),
      String(description || '').trim(),
      Number(display_order || 0),
    );
    const posId = Number(info.lastInsertRowid);
    const admin = (req as any).admin as { id: number; name: string };
    await audit({ actorType: 'admin', actorId: admin.id, actorLabel: admin.name, action: 'position_created', entityType: 'election_position', entityId: posId, description: `Added position "${name}"` });
    res.status(201).json({ position: await prepare(`SELECT * FROM election_positions WHERE id = ?`).get(posId) });
  }),
);

adminElectionsRouter.delete(
  '/:electionId/positions/:positionId',
  requireRole('SUPER_ADMIN', 'ELECTORAL_ADMIN'),
  ah(async (req, res) => {
    const positionId = cleanInt(req.params.positionId);
    if (positionId === null) return res.status(400).json({ error: 'Invalid position.' });
    const existing = (await prepare(`SELECT * FROM election_positions WHERE id = ?`).get(positionId)) as any;
    if (!existing) return res.status(404).json({ error: 'Position not found.' });
    const votes = (await prepare(`SELECT COUNT(*) n FROM ballot_items WHERE position_id = ?`).get(positionId)) as { n: number };
    if (votes.n > 0) return res.status(400).json({ error: 'Cannot delete: ballots already contain votes for this position.' });
    await prepare(`DELETE FROM election_positions WHERE id = ?`).run(positionId);
    const admin = (req as any).admin as { id: number; name: string };
    await audit({ actorType: 'admin', actorId: admin.id, actorLabel: admin.name, action: 'position_deleted', description: `Deleted position "${existing.name}"` });
    res.json({ ok: true });
  }),
);

// ---------------------------------------------------------------------------
// Contestants
// ---------------------------------------------------------------------------
adminElectionsRouter.get(
  '/:electionId/contestants',
  ah(async (req, res) => {
    const electionId = cleanInt(req.params.electionId);
    if (electionId === null) return res.status(400).json({ error: 'Invalid election id.' });
    const rows = await prepare(
      `SELECT c.*, p.name AS position_name FROM contestants c
       JOIN election_positions p ON p.id = c.position_id
       WHERE p.election_id = ? ORDER BY p.display_order, p.id, c.id`,
    ).all(electionId);
    const votes = (await prepare(
      `SELECT contestant_id, COUNT(*) n FROM ballot_items WHERE contestant_id IN (SELECT id FROM contestants WHERE position_id IN (SELECT id FROM election_positions WHERE election_id = ?)) GROUP BY contestant_id`,
    ).all(electionId)) as { contestant_id: number; n: number }[];
    const voteMap = new Map(votes.map((v) => [v.contestant_id, v.n]));
    res.json({ contestants: (rows as any[]).map((c) => ({ ...c, votes_count: voteMap.get(c.id) ?? 0 })) });
  }),
);

adminElectionsRouter.post(
  '/:electionId/contestants',
  requireRole('SUPER_ADMIN', 'ELECTORAL_ADMIN'),
  ah(async (req, res) => {
    const electionId = cleanInt(req.params.electionId);
    const { position_id, full_name, level, manifesto, biography } = req.body ?? {};
    if (electionId === null || !position_id || !full_name) return res.status(400).json({ error: 'Position and contestant name are required.' });
    const position = (await prepare(`SELECT id, name FROM election_positions WHERE id = ? AND election_id = ?`).get(position_id, electionId)) as any;
    if (!position) return res.status(400).json({ error: 'That position does not belong to this election.' });

    const info = await prepare(`INSERT INTO contestants (position_id, full_name, level, manifesto, biography, created_by_admin_id) VALUES (?,?,?,?,?,?)`).run(
      position_id,
      String(full_name).trim(),
      String(level || '').trim(),
      String(manifesto || '').trim(),
      String(biography || '').trim(),
      (req as any).admin.id,
    );
    const contestantId = Number(info.lastInsertRowid);
    const admin = (req as any).admin as { id: number; name: string };
    await audit({ actorType: 'admin', actorId: admin.id, actorLabel: admin.name, action: 'contestant_created', entityType: 'contestant', entityId: contestantId, description: `Added contestant "${full_name}" for ${position.name}` });
    res.status(201).json({ contestant: await prepare(`SELECT * FROM contestants WHERE id = ?`).get(contestantId) });
  }),
);

adminElectionsRouter.delete(
  '/:electionId/contestants/:contestantId',
  requireRole('SUPER_ADMIN', 'ELECTORAL_ADMIN'),
  ah(async (req, res) => {
    const contestantId = cleanInt(req.params.contestantId);
    if (contestantId === null) return res.status(400).json({ error: 'Invalid contestant.' });
    const votes = (await prepare(`SELECT COUNT(*) n FROM ballot_items WHERE contestant_id = ?`).get(contestantId)) as { n: number };
    if (votes.n > 0) return res.status(400).json({ error: 'Cannot delete: this contestant already has votes.' });
    const c = (await prepare(`SELECT full_name FROM contestants WHERE id = ?`).get(contestantId)) as any;
    await prepare(`DELETE FROM contestants WHERE id = ?`).run(contestantId);
    const admin = (req as any).admin as { id: number; name: string };
    await audit({ actorType: 'admin', actorId: admin.id, actorLabel: admin.name, action: 'contestant_deleted', description: `Deleted contestant "${c?.full_name}"` });
    res.json({ ok: true });
  }),
);

// ---------------------------------------------------------------------------
// Results — admin only (public results are served from a separate route).
// ---------------------------------------------------------------------------
adminElectionsRouter.get(
  '/:id/results',
  requireRole('SUPER_ADMIN', 'ELECTORAL_ADMIN', 'RESULTS_OBSERVER'),
  ah(async (req, res) => {
    const id = cleanInt(req.params.id);
    if (id === null) return res.status(400).json({ error: 'Invalid election id.' });
    const election = (await prepare(`SELECT * FROM elections WHERE id = ?`).get(id)) as any;
    if (!election) return res.status(404).json({ error: 'Election not found.' });

    const eligible = (await prepare(`SELECT COUNT(*) n FROM students WHERE status = 'ACTIVE'`).get()) as { n: number };
    const voted = (await prepare(`SELECT COUNT(*) n FROM election_participation WHERE election_id = ?`).get(id)) as { n: number };
    const positionRows = (await prepare(`SELECT * FROM election_positions WHERE election_id = ? ORDER BY display_order, id`).all(id)) as any[];

    const positions: any[] = [];
    for (const p of positionRows) {
      const contestants = (await prepare(
        `SELECT c.id, c.full_name, c.level, c.photo_filename,
                (SELECT COUNT(*) FROM ballot_items bi WHERE bi.contestant_id = c.id AND bi.position_id = c.position_id) AS votes
         FROM contestants c WHERE c.position_id = ? ORDER BY votes DESC, c.id`,
      ).all(p.id)) as any[];
      positions.push({ ...p, contestants });
    }

    res.json({
      election: { id: election.id, name: election.name, status: election.status, opens_at: election.opens_at, closes_at: election.closes_at, results_published_at: election.results_published_at },
      summary: {
        eligible_voters: eligible.n,
        votes_cast: voted.n,
        turnout_percent: eligible.n > 0 ? Math.round((voted.n / eligible.n) * 1000) / 10 : 0,
      },
      positions,
    });
  }),
);

// ---------------------------------------------------------------------------
// Public election info + public results (only when RESULTS_PUBLISHED).
// ---------------------------------------------------------------------------
export const publicElectionsRouter = Router();

publicElectionsRouter.get(
  '/',
  ah(async (_req, res) => {
    const elections = await prepare(`SELECT id, name, slug, description, opens_at, closes_at, status, results_published_at FROM elections ORDER BY opens_at DESC`).all();
    res.json({ elections });
  }),
);

publicElectionsRouter.get(
  '/:slug',
  ah(async (req, res) => {
    const election = (await prepare(`SELECT id, name, slug, description, opens_at, closes_at, status, results_published_at FROM elections WHERE slug = ?`).get(req.params.slug)) as any;
    if (!election) return res.status(404).json({ error: 'Election not found.' });

    const positionRows = (await prepare(`SELECT id, name, description, display_order FROM election_positions WHERE election_id = ? AND active = 1 ORDER BY display_order, id`).all(election.id)) as any[];

    // Contestants are public for an open election, but only include results if published.
    const positions: any[] = [];
    for (const p of positionRows) {
      const contestants = await prepare(`SELECT id, full_name, level, photo_filename, manifesto, biography FROM contestants WHERE position_id = ? AND active = 1 ORDER BY id`).all(p.id);
      positions.push({ ...p, contestants });
    }

    res.json({ election, positions });
  }),
);

publicElectionsRouter.get(
  '/:slug/results',
  ah(async (req, res) => {
    const election = (await prepare(`SELECT * FROM elections WHERE slug = ?`).get(req.params.slug)) as any;
    if (!election) return res.status(404).json({ error: 'Election not found.' });
    if (election.status !== 'RESULTS_PUBLISHED') {
      return res.status(403).json({ error: 'Results have not been published yet.' });
    }
    const eligible = (await prepare(`SELECT COUNT(*) n FROM students WHERE status = 'ACTIVE'`).get()) as { n: number };
    const voted = (await prepare(`SELECT COUNT(*) n FROM election_participation WHERE election_id = ?`).get(election.id)) as { n: number };
    const positionRows = (await prepare(`SELECT * FROM election_positions WHERE election_id = ? ORDER BY display_order, id`).all(election.id)) as any[];
    const positions: any[] = [];
    for (const p of positionRows) {
      const contestants = (await prepare(
        `SELECT c.id, c.full_name, c.level, c.photo_filename,
                (SELECT COUNT(*) FROM ballot_items bi WHERE bi.contestant_id = c.id AND bi.position_id = c.position_id) AS votes
         FROM contestants c WHERE c.position_id = ? ORDER BY votes DESC, c.id`,
      ).all(p.id)) as any[];
      positions.push({ ...p, contestants });
    }
    res.json({
      election: { id: election.id, name: election.name, slug: election.slug, results_published_at: election.results_published_at, closes_at: election.closes_at },
      summary: { eligible_voters: eligible.n, votes_cast: voted.n, turnout_percent: eligible.n > 0 ? Math.round((voted.n / eligible.n) * 1000) / 10 : 0 },
      positions,
    });
  }),
);

export { crypto };
