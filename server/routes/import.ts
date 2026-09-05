import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { prepare, tx } from '../dbCloud';
import { audit } from '../lib/audit';
import { ah } from '../lib/asyncHandler';
import { normalizeMatric, normalizePhone, toLocalMobile } from '../lib/normalize';
import { requireAdmin, requireRole } from '../middleware/auth';

export const importRouter = Router();
importRouter.use(requireAdmin, requireRole('SUPER_ADMIN', 'VERIFICATION_ADMIN'));

interface ImportOutcome {
  created: number;
  duplicates: number;
  skipped: number;
  rows: ImportRowResult[];
}
interface ImportRowResult {
  row: number;
  matric: string;
  name: string;
  ok: boolean;
  reason?: string;
}

/** Robust-enough CSV parser: supports quoted fields, commas and newlines. */
function parseCSV(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let inQuotes = false;
  const s = String(text);
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (inQuotes) {
      if (c === '"') {
        if (s[i + 1] === '"') {
          field += '"';
          i++;
        } else inQuotes = false;
      } else field += c;
    } else if (c === '"') {
      inQuotes = true;
    } else if (c === ',') {
      row.push(field);
      field = '';
    } else if (c === '\n' || c === '\r') {
      if (c === '\r' && s[i + 1] === '\n') i++;
      row.push(field);
      field = '';
      if (row.some((cell) => cell.trim() !== '')) rows.push(row);
      row = [];
    } else {
      field += c;
    }
  }
  if (field !== '' || row.length) {
    row.push(field);
    if (row.some((cell) => cell.trim() !== '')) rows.push(row);
  }
  return rows;
}

const headerAliases: Record<string, string[]> = {
  full_name: ['full name', 'name', 'names', 'fullname', 'student name', 'candidate name'],
  matric_number: ['matric', 'matric number', 'matric no', 'matriculation', 'matriculation number', 'matric no.', 'reg number', 'reg no'],
  email: ['student email', 'school email', 'email address', 'email', 'e-mail', 'mail'],
  phone_raw: ['whatsapp phone number', 'whatsapp number', 'whatsapp no', 'phone number', 'phone no', 'phone no.', 'phone', 'telephone', 'mobile', 'mobile number'],
  level: ['current level', 'level', 'year', 'class', 'course level'],
};

function detectHeader(cells: string[]): Partial<Record<string, number>> {
  const normalized = cells.map((c) => String(c).trim().toLowerCase().replace(/\s+/g, ' '));
  const map: Partial<Record<string, number>> = {};
  // For each field, walk its aliases in priority order and pick the first
  // column that matches — so e.g. "Student Email" wins over "Email address".
  for (const [field, aliases] of Object.entries(headerAliases)) {
    for (const alias of aliases) {
      const idx = normalized.indexOf(alias);
      if (idx !== -1) {
        map[field as keyof typeof headerAliases] = idx;
        break;
      }
    }
  }
  return map;
}

const VALID_LEVELS = ['100 LEVEL', '200 LEVEL', '300 LEVEL', '400 LEVEL', '500 LEVEL', '600 LEVEL', 'POSTGRADUATE', 'PG', 'MSC', 'PHD'];

function normalizeLevel(raw: string | undefined): string {
  const v = String(raw || '').trim().toUpperCase().replace(/\s+/g, ' ');
  if (!v) return 'Not provided';
  if (VALID_LEVELS.includes(v)) return v;
  // Accept forms like "300", "400l", "level 200".
  const m = v.match(/^LEVEL?\s*(\d{3})L?$/);
  if (m) return `${m[1]} LEVEL`;
  if (/^\d{3}$/.test(v)) return `${v} LEVEL`;
  return v.slice(0, 40);
}

export async function runImport(rows: string[][], admin: { id: number; name: string }): Promise<ImportOutcome> {
  if (rows.length < 2) throw new Error('The file appears to be empty. Add a header row and at least one student.');
  const header = rows[0].map((c) => String(c).trim());
  const map = detectHeader(header);
  if (map.full_name === undefined || map.matric_number === undefined) {
    throw new Error('I could not find "name" and "matric number" columns. Please check the CSV headers.');
  }

  const outcome: ImportOutcome = { created: 0, duplicates: 0, skipped: 0, rows: [] };

  const insertSql = `INSERT INTO students (full_name, matric_number, email, phone_raw, phone_normalized, level, status, source, password_hash, must_change_password)
     VALUES (?, ?, ?, ?, ?, ?, ?, 'import', ?, 1)`;
  const findMatricSql = `SELECT id FROM students WHERE matric_number = ?`;
  const findApprovedSql = `SELECT id FROM approved_whatsapp_numbers WHERE phone_normalized = ? AND active = 1`;

  // A student is only ACTIVE when their number is on the union's CONFIRMED
  // WhatsApp list (the group admins have verified it). A brand-new number is
  // held as PENDING_VERIFICATION until an admin confirms it belongs to the
  // WhatsApp group — a form response alone never grants voting rights.
  await tx(async (t) => {
    for (let i = 1; i < rows.length; i++) {
      const cells = rows[i];
      const get = (field: keyof typeof map): string | undefined =>
        map[field] !== undefined ? String(cells[map[field] as number] ?? '').trim() : undefined;

      const name = get('full_name');
      const rawMatric = get('matric_number');
      const email = get('email') || null;
      const phoneRaw = get('phone_raw') || null;
      const level = normalizeLevel(get('level'));

      const result: ImportRowResult = {
        row: i + 1,
        matric: rawMatric || '',
        name: name || '',
        ok: false,
      };

      if (!name || !rawMatric) {
        result.reason = 'Missing name or matric number.';
        outcome.skipped++;
        outcome.rows.push(result);
        continue;
      }
      const matric = normalizeMatric(rawMatric);
      if (!matric) {
        result.reason = `Matric number "${rawMatric}" is not a valid format.`;
        result.matric = rawMatric;
        outcome.skipped++;
        outcome.rows.push(result);
        continue;
      }
      result.matric = matric;

      const existing = await t.execute({ sql: findMatricSql, args: [matric] });
      if (existing.rows.length > 0) {
        result.reason = 'Already registered (duplicate matric).';
        outcome.duplicates++;
        outcome.rows.push(result);
        continue;
      }

      let phoneNormalized: string | null = null;
      let phoneNote = '';
      if (phoneRaw) {
        phoneNormalized = normalizePhone(phoneRaw);
        if (!phoneNormalized) {
          // Don't lose the member over a phone typo — import them anyway,
          // keep the raw number for an admin to fix. They stay PENDING until
          // their number is confirmed on the WhatsApp list.
          phoneNote = ` (phone "${phoneRaw}" needs checking)`;
        }
      }

      let known = false;
      if (phoneNormalized !== null) {
        const approved = await t.execute({ sql: findApprovedSql, args: [phoneNormalized] });
        known = approved.rows.length > 0;
      }
      const status = known ? 'ACTIVE' : 'PENDING_VERIFICATION';
      if (!known) {
        phoneNote = phoneNote || ' (new number — pending WhatsApp confirmation)';
      }
      // First-time login password = the student's own phone number (0-form).
      // They are forced to set a new password on first login.
      const localMobile = toLocalMobile(phoneRaw || '') || (phoneNormalized ? toLocalMobile(phoneNormalized) : null);
      const pwHash = localMobile ? bcrypt.hashSync(localMobile, 10) : null;
      await t.execute({
        sql: insertSql,
        args: [name, matric, email, phoneRaw, phoneNormalized, level, status, pwHash],
      });

      result.ok = true;
      result.reason = phoneNote || undefined;
      outcome.created++;
      outcome.rows.push(result);
    }
  });

  await audit({
    actorType: 'admin', actorId: admin.id, actorLabel: admin.name,
    action: 'students_imported', entityType: 'import',
    description: `CSV import: ${outcome.created} created, ${outcome.duplicates} duplicates, ${outcome.skipped} skipped`,
    ip: 'n/a',
  });

  return outcome;
}

async function getSetting(key: string): Promise<string> {
  const row = (await prepare(`SELECT value FROM app_settings WHERE key = ?`).get(key)) as { value: string } | undefined;
  return row?.value ?? '';
}

// ---------------------------------------------------------------------------
// Sync straight from the published Google Form responses sheet (CSV link
// saved under the "sync_csv_url" setting). One click in the admin.
// ---------------------------------------------------------------------------
importRouter.post(
  '/from-sheet',
  ah(async (req, res) => {
    const url = await getSetting('sync_csv_url');
    if (!url) {
      return res.status(400).json({ error: 'No sync link saved yet. Open the Settings tab and paste your published Google Sheet CSV link.' });
    }
    if (!/^https:\/\/(docs\.google\.com\/spreadsheets|drive\.google\.com)\//.test(url)) {
      return res.status(400).json({ error: 'The saved link does not look like a Google Sheets link.' });
    }

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 15000);
      const response = await fetch(url, { signal: controller.signal, redirect: 'follow' });
      clearTimeout(timeout);

      if (!response.ok) {
        return res.status(502).json({
          error: `Google returned status ${response.status}. Make sure the sheet is published as CSV (File → Share → Publish to web → choose the response sheet, format "Comma-separated values").`,
        });
      }
      const text = await response.text();
      const rows = parseCSV(text);
      const admin = (req as any).admin as { id: number; name: string };
      const outcome = await runImport(rows, admin);
      res.json(outcome);
    } catch {
      res.status(502).json({ error: 'Could not fetch the sheet. Check the link and your internet connection, then try again.' });
    }
  }),
);

importRouter.post(
  '/csv',
  ah(async (req, res) => {
    try {
      const { csv } = req.body ?? {};
      if (!csv || typeof csv !== 'string') return res.status(400).json({ error: 'No CSV content received.' });
      if (csv.length > 3_000_000) return res.status(400).json({ error: 'File too large (max ~3 MB).' });
      const rows = parseCSV(csv);
      const admin = (req as any).admin as { id: number; name: string };
      const outcome = await runImport(rows, admin);
      res.json(outcome);
    } catch (err) {
      res.status(400).json({ error: err instanceof Error ? err.message : 'Import failed.' });
    }
  }),
);

// A ready-to-fill template users can download.
importRouter.get('/template', (_req, res) => {
  const header = 'Full name,Matric Number,Email,Phone number,Level\n';
  const example =
    'Olawale Adeyemi,2022/12345,waleyemi@example.com,08012345678,300 Level\n' +
    'Aisha Bello,2023-45678,a.bello@example.com,09098765432,200 Level\n';
  res.type('text/csv').attachment('osu-members-template.csv').send(header + example);
});

export { parseCSV };
