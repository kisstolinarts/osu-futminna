import { Router } from 'express';
import crypto from 'node:crypto';
import { prepare, tx } from '../dbCloud';
import { audit } from '../lib/audit';
import { ah } from '../lib/asyncHandler';
import { refreshElectionStatuses } from '../lib/electionStatus';
import { requireStudent } from '../middleware/auth';

export const votingRouter = Router();
votingRouter.use(requireStudent);
// A student on a temporary (phone-number) password must set a real one first.
votingRouter.use((req, res, next) => {
  const s = (req as any).student as { must_change_password?: number };
  if (s && s.must_change_password) {
    return res.status(403).json({ error: 'Please set your own password before voting.' });
  }
  next();
});

/**
 * The voting workflow relies on two tables that NEVER share a key:
 *  - election_participation: (election_id, student_id) — proves WHO voted,
 *    without any of their choices.
 *  - ballots / ballot_items: keyed by the random ballot id, listing choices
 *    for that ballot with NO student reference.
 * An admin reading the database sees "student 7 voted" in one table and
 * "some ballot picked candidate 12" in another, but cannot join them.
 */

// Returns the election that a student may vote in (currently open), or null.
async function openElectionNow(): Promise<any> {
  const now = new Date();
  return prepare(
    `SELECT * FROM elections WHERE status = 'OPEN' AND opens_at <= ? AND closes_at > ? ORDER BY opens_at DESC LIMIT 1`,
  ).get(now.toISOString(), now.toISOString());
}

function toIso(s: string | null): string | null {
  if (!s) return null;
  const d = new Date(s);
  return isNaN(d.getTime()) ? null : d.toISOString();
}

// Current voting state for the logged-in student.
votingRouter.get(
  '/status',
  ah(async (req, res) => {
    const student = (req as any).student as { id: number; status: string };

    await refreshElectionStatuses();

    const open = await openElectionNow();
    const all = await prepare(`SELECT id, name, slug, description, opens_at, closes_at, status, results_published_at FROM elections WHERE status != 'DRAFT' ORDER BY opens_at DESC LIMIT 10`).all();

    if (student.status !== 'ACTIVE') {
      return res.json({ eligible: false, reason: 'status', elections: all });
    }
    if (!open) {
      return res.json({ eligible: true, open_election: null, elections: all });
    }

    const already = (await prepare(`SELECT id, confirmation_code, voted_at FROM election_participation WHERE election_id = ? AND student_id = ?`).get(open.id, student.id)) as any;

    if (already) {
      return res.json({
        eligible: true,
        open_election: {
          id: open.id, name: open.name, slug: open.slug, description: open.description,
          opens_at: toIso(open.opens_at), closes_at: toIso(open.closes_at), status: open.status,
        },
        has_voted: true,
        confirmation_code: already.confirmation_code,
        voted_at: already.voted_at,
      });
    }

    const positionRows = (await prepare(`SELECT * FROM election_positions WHERE election_id = ? AND active = 1 ORDER BY display_order, id`).all(open.id)) as any[];
    const positions: any[] = [];
    for (const p of positionRows) {
      const contestants = await prepare(`SELECT id, full_name, level, photo_filename, manifesto FROM contestants WHERE position_id = ? AND active = 1 ORDER BY id`).all(p.id);
      positions.push({ ...p, contestants });
    }

    res.json({ eligible: true, open_election: { id: open.id, name: open.name, slug: open.slug }, has_voted: false, positions });
  }),
);

/**
 * Submits a complete ballot. The whole operation runs in one database
 * transaction, so it either succeeds completely or not at all.
 */
votingRouter.post(
  '/submit',
  ah(async (req, res) => {
    const student = (req as any).student as { id: number; status: string; matric_number: string; full_name: string };

    // 1. Eligibility
    if (student.status !== 'ACTIVE') {
      return res.status(403).json({ error: 'You are not eligible to vote in this election.' });
    }

    // 2. Election currently open (server time decides, never the client).
    await refreshElectionStatuses();
    const election = await openElectionNow();
    if (!election) {
      return res.status(403).json({ error: 'There is no election open right now.' });
    }

    // 3. Has this student already voted in this election?
    const existingParticipation = await prepare(`SELECT id FROM election_participation WHERE election_id = ? AND student_id = ?`).get(election.id, student.id);
    if (existingParticipation) {
      return res.status(409).json({ error: 'You have already voted in this election.' });
    }

    // 4. Validate ballot payload: { positionId: contestantId, ... }
    const { choices } = req.body ?? {};
    if (!choices || typeof choices !== 'object' || Array.isArray(choices)) {
      return res.status(400).json({ error: 'A valid ballot is required.' });
    }

    // Load all active positions and contestants for this election once.
    const positions = (await prepare(`SELECT id, name FROM election_positions WHERE election_id = ? AND active = 1 ORDER BY display_order, id`).all(election.id)) as any[];
    const positionIds = positions.map((p) => p.id);
    const contestants = (await prepare(`SELECT id, position_id FROM contestants WHERE active = 1`).all()) as any[];
    const contestantsByPosition = new Map<number, Set<number>>();
    for (const c of contestants) {
      if (!contestantsByPosition.has(c.position_id)) contestantsByPosition.set(c.position_id, new Set());
      contestantsByPosition.get(c.position_id)!.add(c.id);
    }

    const entries = Object.entries(choices).filter(([, v]) => v !== undefined && v !== null && v !== '');
    if (entries.length !== positionIds.length) {
      return res.status(400).json({ error: 'Please select a candidate for each position before continuing.' });
    }

    for (const [rawPid, rawCid] of entries) {
      const pid = Number(rawPid);
      const cid = Number(rawCid);
      if (!positionIds.includes(pid)) {
        return res.status(400).json({ error: 'Your ballot contains an invalid position.' });
      }
      if (!Number.isInteger(cid)) {
        return res.status(400).json({ error: 'Your ballot contains an invalid selection.' });
      }
      const allowed = contestantsByPosition.get(pid);
      if (!allowed || !allowed.has(cid)) {
        return res.status(400).json({ error: 'Your ballot contains a candidate who is not valid for that position.' });
      }
    }

    // 5. Build the anonymous ballot + confirmation receipt.
    const confirmationCode = crypto.randomBytes(4).toString('hex').toUpperCase();

    // One transaction does everything: if the student has already voted, the
    // participation UNIQUE constraint aborts the WHOLE transaction — so no
    // stray ballot is ever written. Participation and ballot share no key.
    try {
      await tx(async (t) => {
        await t.execute({
          sql: `INSERT INTO election_participation (election_id, student_id, confirmation_code) VALUES (?, ?, ?)`,
          args: [election.id, student.id, confirmationCode],
        });
        const ballotInfo = await t.execute({ sql: `INSERT INTO ballots (election_id) VALUES (?)`, args: [election.id] });
        const ballotPk = Number(ballotInfo.lastInsertRowid);
        for (const [rawPid, rawCid] of entries) {
          await t.execute({
            sql: `INSERT INTO ballot_items (ballot_id, position_id, contestant_id) VALUES (?, ?, ?)`,
            args: [ballotPk, Number(rawPid), Number(rawCid)],
          });
        }
      });
    } catch (err) {
      // UNIQUE(election_id, student_id) fired — a duplicate submission
      // (or another integrity failure): the whole ballot is rolled back.
      console.error('vote tx failed', err);
      return res.status(409).json({ error: 'Your vote could not be recorded because it appears you already voted.' });
    }

    // Audit: never log choices. Only that this student voted.
    await audit({
      actorType: 'student', actorId: student.id, actorLabel: student.matric_number,
      action: 'vote_cast', entityType: 'election', entityId: election.id,
      description: `Vote recorded in election "${election.name}"`, ip: req.ip,
    });

    res.status(201).json({ ok: true, message: 'Your vote has been successfully recorded.', confirmation_code: confirmationCode });
  }),
);
