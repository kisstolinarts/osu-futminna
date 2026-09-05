# 🚀 OSU FUTMinna — Online Launch Plan & Status

**Decision made (2026-09-04):** Free launch (Turso cloud database + Render free hosting).
**Election date:** In two days — this plan is on a deadline.
**Launch rule:** Start clean. No demo/test data goes live. Real members are imported from the
live Google Form list (still being gathered — import up to voting day is expected and supported).

---

## How the pieces fit (plain language)

| Piece | What it is | Provider | Cost |
|---|---|---|---|
| The website + all logic | The app you've been running | Render (free) | $0 |
| The database | Where members, votes, results live | Turso (free) | $0 |
| Web address | e.g. `osu-union.onrender.com` | Render | $0 |
| Code storage | Where Render pulls the app from | GitHub | $0 |

> Why not just put the database file on the host? Render's free plan **wipes files** whenever
> the service naps or restarts (confirmed in Render's own docs). So the database must live
> somewhere permanent (Turso), and the app must be able to talk to it.

---

## 🚦 Status — 2026-09-05 (LIVE ✅)

| Milestone | State |
|---|---|
| Production build verified | ✅ done |
| Phone-password + forced reset | ✅ done |
| Extra admin accounts + roles | ✅ done |
| **New cloud-ready database engine (Turso/libSQL)** | ✅ done — whole app converted |
| Full regression on local engine | ✅ 31/31 PASS |
| Full regression on the REAL Turso database | ✅ 31/31 PASS |
| Full regression on the LIVE Render site | ✅ 31/31 PASS |
| Ballot anonymity verified at the database row level | ✅ |
| Clean launch database | ✅ (only super admin + site content) |
| Code pushed to GitHub `kisstolinarts/osu-futminna` | ✅ |
| Deployed to Render (free) | ✅ |
| Live web address | ✅ **https://osu-futminna.onrender.com** |
| Load real members + real election | ⏳ next (before go-live) |

## Remaining known limitation (free tier)
Render free services sleep after ~15 min idle (wake takes ~1 min) and keep files only until a restart.
- Text content and all votes live in Turso (safe — that's the important part).
- **New gallery photo uploads** are stored on Render's disk and would be lost on restart. Site content (About/announcements/events) is edited in text and lives in Turso, so it is safe. Uploaded photos will move to free object storage (Cloudflare R2, $0) as the next step — before the site's gallery is used for real uploads.

## 🖐️ YOUR TO-DOs — please do these TODAY in parallel with my work
Each is free, no card needed. Stop after each step and tell me the values in bold.

**1. GitHub (where the code lives)**
1. Go to github.com → **Sign up** (free). Use any email; confirm the email.
2. Once in, click the **+** (top right) → **New repository**.
3. Name it `osu-futminna`, keep it **Private** or **Public** (either), do **NOT** tick any "Add a README" boxes (leave it empty), click **Create repository**.
4. Tell me: **your GitHub username**, and the exact repo address shown on that page (ends in `…/osu-futminna.git`).

**2. Turso (where the database lives)**
1. Go to turso.tech → **Sign up** (free). GitHub sign-in is easiest.
2. In the dashboard click **Create database** → name it `osu` → pick any region → **Create**.
3. Open the database → copy the connection string that starts with `libsql://…turso.io` → tell me it.
4. Click **Generate token** (scope: your new `osu` database) → copy the long token → tell me it.
   (This token only lets the app talk to that one database — safe to share with me.)

**3. GitHub access token (so the code can be pushed)**
1. github.com → top-right **profile photo → Settings**.
2. Bottom-left menu → **Developer settings** → **Personal access tokens** → **Tokens (classic)**.
3. **Generate new token (classic)**.
4. Give it any name (e.g. `osu-deploy`). Under **Select scopes**, tick **repo** (full control of repositories).
5. Scroll → **Generate token**. Copy the token (starts with `github_pat_` or `ghp_...`) and paste it here.
6. Delete it after we've deployed if you like — it's only used for the push.

**4. Render (where the website runs)**
1. Go to render.com → **Sign up** (free). Choose GitHub and connect your account when asked.
2. Confirm the account exists and tell me the **email you used**.
3. After the code is on GitHub I'll walk you through creating the free Web Service (it takes ~10 minutes), or you can create it and paste me the "New Web Service" page values.

## 👨‍💻 MY NEXT STEPS (in order)
1. Rewire the data layer so the app works against a local file (your computer) OR Turso (online),
   with a single switch — no behaviour change locally.
2. Re-run every check: logins, phone-password reset, admin creation, import, and the election
   flow (open/close, one-vote-per-position, anonymous ballots, sealed results).
3. Prepare the **clean** database and the go-live checklist (env vars, secrets, admin setup).
4. When your accounts are ready: create Turso DB → connect → deploy to Render → point members
   at the free address → import members → set the real election → **go live**.
5. If we are NOT fully tested before voting opens, we switch to the Fallback Plan (below).

---

## 🛟 FALLBACK PLAN (if the online launch isn't ready & tested before the election)
The union should run the election the **same way it planned before this app existed**
(WhatsApp/Google Form ballot, or the manual count the electoral committee already uses). The
online platform is then launched calmly after the election, with no deadline risk.

**Decision gate:** I will give you an honest "GO / NOT READY" status at least 12 hours before
voting opens. If it is NOT READY, we do NOT rush an untested voting system online — the election
uses the fallback and the app launches right after.

---

## Security notes that must survive the launch
- One vote per position — enforced in the database, not just the screen.
- Ballots are anonymous: choices stored with no key linking a voter to a ballot.
- Results stay sealed until an admin publishes them.
- First-time student password = their phone number; forced change on first login.
- A Google-Form entry alone never grants voting rights: the number must be on the union's
  confirmed WhatsApp list (manual verification by an admin).
