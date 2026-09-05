import { prepare } from '../dbCloud';

interface AuditInput {
  actorType: 'admin' | 'student' | 'system';
  actorId?: number | null;
  actorLabel?: string;
  action: string;
  entityType?: string;
  entityId?: string | number | null;
  description?: string;
  ip?: string;
}

/** Writes one row to the audit log. NEVER log ballot contents here. */
export async function audit(input: AuditInput) {
  try {
    await prepare(
      `INSERT INTO audit_logs (actor_type, actor_id, actor_label, action, entity_type, entity_id, description, ip)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    ).run(
      input.actorType,
      input.actorId ?? null,
      input.actorLabel ?? null,
      input.action,
      input.entityType ?? null,
      input.entityId != null ? String(input.entityId) : null,
      input.description ?? null,
      input.ip ?? null,
    );
  } catch (err) {
    // Auditing must never crash a request.
    console.error('audit write failed', err);
  }
}
