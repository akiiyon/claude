# Team Tracker

A small web app for an engineering team to track two things in one place.

- **Projects:**
  - Basic details: code, client, stage, status, priority, start date and deadline.
  - Who does which part.
  - Each part's status and due date.
  - The revision log.
  - A history of every change.
- **Daily tasks:** each person writes their to-do list for the day. At the end of the day they tick what they finished, and the rest is carried forward to the next working day. Anyone can see the whole team's day.

It runs on one PC or server in the office. People open it in their browser, and there's nothing to install on their machines. Data is kept in a single SQLite file.

## Screens

| Screen | What it's for |
|---|---|
| **Home** | Your tasks today, how many people have planned their day, your parts of projects, deadlines in the next 14 days, and projects past their deadline |
| **My day** | Add today's tasks, optionally linked to a project. Tick them off, carry one forward, or press **Close the day** to carry everything still open to the next working day. Unfinished tasks from a day you forgot to close are offered for bringing into today. Use the arrows or date picker to look back, or to plan ahead. |
| **Team day** | Everyone's list for a day: who planned, what's done, what's open, what was carried |
| **Projects** | All projects with stage, status, priority, lead, team, parts done, latest revision and deadline (with days left or days late). Filter by status, search, or show only yours. |
| **Project** | Details, *Who is doing what* (person, part, status, due date), *Revisions* (rev, description, status, submitted / returned dates, remarks), and *History* |
| **People** (admin only) | Add team members, reset passwords, make someone an admin, deactivate people who leave |

## How carrying forward works

- **Carry forward** on a task moves it to the next working day. The original stays on its own day marked "carried forward", so each day keeps an honest record.
- **Close the day** does the same for every task still open.
- A carried task shows how many times it has been carried. Tasks that keep moving stand out.
- **Forgot to close a day:** the next day, My day offers to bring those tasks into today.
- Working days are set by `WORK_DAYS` (Monday to Saturday by default). Carrying skips the days off.

## Run it

You need **Node.js 22.13 or newer**. It uses Node's built-in SQLite, so there's no database to install.

```bash
cd team-tracker
npm install
cp .env.example .env      # optional: port, time zone, working days
npm start                 # http://localhost:3100
```

Open the address in a browser. The first visit asks you to create the admin account. Then go to **People** and add the team. Each person gets a temporary password, and they can change it under their name at the top right.

To let colleagues reach it, run it on a machine they can all reach and share `http://<that-machine>:3100`. If it's served over HTTPS (for example behind IIS, nginx or a company reverse proxy), set `COOKIE_SECURE=true`.

### With Docker

```bash
docker build -t team-tracker team-tracker
docker run -d --name team-tracker -p 3100:3100 -v team-tracker-data:/app/data \
  -e APP_TZ=Asia/Kolkata -e WORK_DAYS=1,2,3,4,5,6 team-tracker
```

## Settings (`.env`)

| Variable | Default | Meaning |
|---|---|---|
| `PORT` | `3100` | Port the app listens on |
| `DATA_DIR` | `./data` | Folder for `team-tracker.db` |
| `APP_TZ` | `Asia/Kolkata` | Time zone that decides what "today" is |
| `WORK_DAYS` | `1,2,3,4,5,6` | Working days, 1 = Monday … 7 = Sunday |
| `COOKIE_SECURE` | `false` | Set to `true` when served over HTTPS |
| `SESSION_DAYS` | `14` | How long a sign-in lasts |

## Back up

All data is in `DATA_DIR/team-tracker.db`, plus the `-wal` and `-shm` files next to it while the app runs. Copy the folder to a backup location every day. The simplest safe way is to stop the app, copy the folder and start the app again. Alternatively, use `sqlite3 team-tracker.db ".backup backup.db"` while it runs.

## Security

- Passwords are stored as scrypt hashes.
- Sessions use an HttpOnly cookie, and sign-in is rate-limited.
- People can change only their own daily tasks.
- Only admins manage people.
- Only an admin or the project lead can delete a project.
- Everyone signed in can see and edit projects. It's a team tool, and every change is recorded in the project's History.

## Development

```bash
npm run dev    # restarts on file changes
npm test       # API and date tests (node --test)
```

The code is laid out as follows:

| Path | Contents |
|---|---|
| `src/server.js` | Starts the app |
| `src/app.js` | Express setup and security headers |
| `src/db.js` | Schema |
| `src/routes/` | The JSON API |
| `public/` | The browser app: plain ES modules, no build step |
