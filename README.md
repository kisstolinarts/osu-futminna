# OSU FUTMinna — Offa Student Union, FUT Minna Chapter

A unified web platform for the Offa Student Union at the Federal University of
Technology, Minna: public website, verified membership (Google-Form import +
WhatsApp-group confirmation), and a secure anonymous election system.

## What's inside

| Area | Where |
|---|---|
| Public website (Home, About, News, Events, Gallery, Election, Contact) | `src/pages/` |
| Student & Admin front-end | `src/pages/`, `src/components/admin/` |
| API server (Express + TypeScript) | `server/` |
| Database schema & migrations | `server/db.ts` |
| Election logic (anonymous ballots, results) | `server/routes/elections.ts`, `server/routes/voting.ts` |
| Import / Google-Form sync | `server/routes/import.ts` |
| Editable website content | `server/routes/content.ts` + admin "Website content" tab |

## Requirements

- **Node.js 20 or newer** (https://nodejs.org — the LTS version is recommended).
  If `npm install` fails while "building" `better-sqlite3`, make sure you are on
  Node 20/22/24 (the library ships ready-made builds for these — no compiler
  needed). If you recently updated Node, delete the `node_modules` folder and
  run `npm install` again.
- No other accounts needed for local development (database is SQLite, stored in `data/`)

## Run it locally

```bash
npm install      # first time only (and after pulling updates)
npm run dev      # starts the website (http://localhost:5173) + API (http://localhost:4000)
```

Open **http://localhost:5173** in your browser. `npm run dev` runs both the
front-end and back-end together. Stop it with `Ctrl + C` in the terminal.

Other useful commands:

```bash
npm run typecheck   # checks the code for errors
npm run build       # creates a production build in dist/
npm run seed:admin  # creates the first administrator (reads .env)
npx tsx server/seedDemo.ts   # loads demo students + a sample OPEN election
```

## Default development logins (demo only — change before going live)

| Role | Credentials |
|---|---|
| Super administrator | `admin@osu.local` / `DevAdmin12345` |
| Electoral admin | `electoral@osu.local` / `OffaElect2026` (temporary — must change on first login) |
| Verification admin | `verify@osu.local` / `OffaVerify2026` (temporary — must change on first login) |
| Demo student | `2022/12345` — password is the **phone number** on file: `08012345678` (plus three more in `server/seedDemo.ts`; first password = phone) |

**How students sign in:** each student's first-time password is the phone
number they wrote on the OSU form (e.g. `08012345678`). The moment they log in,
the app locks them into a **"set your own password"** screen before showing the
dashboard or voting. There are no invite links. If a student forgets their
password, a verification admin uses **Students → Reset to phone** to give them
a fresh phone-number password again.

To create your own real admin account:

```bash
# copy .env.example to .env, set ADMIN_NAME / ADMIN_EMAIL / ADMIN_PASSWORD
cp .env.example .env
npm run seed:admin
```

## Importing members from Google Forms

1. In your responses **Google Sheet**: File → Share → Publish to web → choose
   the response sheet → format **Comma-separated values (.csv)** → Publish →
   copy the link.
2. In the admin dashboard (**Settings** tab) paste it into the **Sync link** field.
3. Open the **Import CSV** tab and press **↻ Sync from Google Form**.

Imported students are stored with their phone number as a temporary password
(`must_change_password` = on), so they can sign in immediately — no invite
links to send.

New numbers import as **Pending** until a group admin confirms the number in
the **WhatsApp list** tab (the app cannot read WhatsApp groups — a confirmed
number is the union's verification act, which is what makes a student ACTIVE).

**Upgrading an older database?** If students were imported by a previous
version and have no password yet, open the **Students** tab and press
**Set phone passwords** once — every student with a valid phone on file gets a
phone-number password and the forced first-login reset.

## Admin accounts

The **My account & admins** tab lets every admin change their own name, login
email and password. The **super admin** can also create more admins (pick a
role: Electoral, Verification, Content or Results observer), reset another
admin's password, change roles, or remove an admin. New admins must set their
own password on first login. Roles are enforced on the server: `SUPER_ADMIN`,
`ELECTORAL_ADMIN`, `VERIFICATION_ADMIN`, `CONTENT_ADMIN`, `RESULTS_OBSERVER`.

## Security notes

- Passwords are hashed with bcrypt; student first-time passwords are their
  phone number and are forced to be changed on first login; logins are
  rate-limited.
- Ballots are anonymous by design: participation and choices are stored in
  separate tables with **no shared key**, so no admin (or database query) can
  link a voter to their ballot. This is verified by an automated test.
- The audit log records administrative actions but **never ballot contents**.
- `.env` and `data/` are gitignored — never commit real secrets.
- At launch, swap the local SQLite/file storage for PostgreSQL + object storage
  (e.g. Supabase) — the API routes are structured so this is a configuration
  change, not a rewrite.

## Going live later

The plan: push to GitHub → connect a free PostgreSQL + object storage
(Supabase) → deploy the server to a free web host → point `osufutminna.com`
(or a free URL) at it. A separate migration script will be added at that stage
to move the schema from SQLite to PostgreSQL.

© OSU FUTMinna
