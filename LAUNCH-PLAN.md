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

## ✅ Things ALREADY done
- [x] Full app built & verified (site + student logins + admin + voting all work).
- [x] Production single-server mode verified working locally.
- [x] Students sign in with phone number first time, forced to create own password.
- [x] Two extra admin accounts created (Electoral + Verification) with role limits.
- [x] Google-Form import ready for members added right up to voting day.
- [ ] **Data-layer rewiring to Turso (in progress)** — makes the app talk to a cloud database.
- [ ] Security re-verification after the rewiring (one vote per position; anonymous sealed ballots).
- [ ] Clean launch database (no demo data).
- [ ] GitHub repo ready to deploy.

## 🖐️ YOUR TO-DOs (please start immediately — they run in parallel with my work)
- [ ] **GitHub account** — sign up free at github.com (tell me your username or the repo name).
- [ ] **Turso account** — sign up free at turso.tech; I will walk you through creating the database
      and pasting me a connection string + token (safe to share — token only gives app DB access).
- [ ] **Render account** — sign up free at render.com.
- [ ] Final member list: publish the Google Form responses sheet as CSV (the way we did before) and
      save that link — we'll import members into the live app with it.
- [ ] Candidates: confirm real positions + candidates (you said they're ready) — we enter them in
      the admin panel right before voting.
- [ ] Exact voting **open** and **close** date/time for the app to lock automatically.

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
