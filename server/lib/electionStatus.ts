import { prepare } from '../dbCloud';

/**
 * Rolls election statuses forward to whatever time it is now:
 *   SCHEDULED → OPEN        once opens_at passes
 *   OPEN      → CLOSED      once closes_at passes
 *   CLOSED    → RESULTS_PUBLISHED  when the release rule says so:
 *                results_mode 'auto'      → the moment voting closes
 *                results_mode 'scheduled' → at results_announce_at
 *                results_mode 'manual'    → never (an admin presses Publish)
 *
 * Results are never released before an election is CLOSED, and 'manual'
 * always waits for an authorised admin.
 */
export async function refreshElectionStatuses(): Promise<void> {
  const nowIso = new Date().toISOString();

  await prepare(`UPDATE elections SET status = 'OPEN' WHERE status = 'SCHEDULED' AND opens_at <= ?`).run(nowIso);
  await prepare(`UPDATE elections SET status = 'CLOSED' WHERE status = 'OPEN' AND closes_at <= ?`).run(nowIso);

  // Automatic releases (never before the election is closed).
  await prepare(
    `UPDATE elections SET status = 'RESULTS_PUBLISHED', results_published_at = COALESCE(results_published_at, datetime('now'))
     WHERE status = 'CLOSED' AND results_mode = 'auto' AND closes_at <= ?`,
  ).run(nowIso);

  await prepare(
    `UPDATE elections SET status = 'RESULTS_PUBLISHED', results_published_at = COALESCE(results_published_at, datetime('now'))
     WHERE status = 'CLOSED' AND results_mode = 'scheduled'
       AND results_announce_at IS NOT NULL AND results_announce_at <> '' AND results_announce_at <= ?`,
  ).run(nowIso);
}
