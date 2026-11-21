# Masterji Study Hub

React + Express + MongoDB study platform with account registration, sign-in, protected study APIs, exam profiles, and a persistent personal planner.

See [SRS.md](./SRS.md) for the current implemented scope, architecture, limitations, and recommended next phases.

## Requirements

- Node.js 18 or newer
- MongoDB running locally, or a MongoDB Atlas connection string

## Configure MongoDB and sessions

1. Copy `server/.env.example` to `server/.env`.
2. Set `MONGODB_URI` to your local MongoDB URL or Atlas connection string. For the included local database script, use `mongodb://127.0.0.1:27017/masterji`.
3. Replace `JWT_SECRET` with a random secret of at least 32 characters. In PowerShell you can generate one with:

   ```powershell
   [Convert]::ToHexString([Security.Cryptography.RandomNumberGenerator]::GetBytes(48))
   ```

Keep the secret private and do not commit `server/.env`.

## YouTube lecture planner

The YouTube planner imports public playlist videos and durations using the YouTube Data API. Add your API key to `server/.env` as `YOUTUBE_API_KEY=your_key_here`, then restart the server. The key stays on the server and is never sent to the browser. Without an API key, users can still create a fallback plan by entering a playlist title, lecture count, and estimated lecture length; exact video titles, durations, and thumbnails require the API key.

Plans are saved per account. Users can change lectures per day, pause/resume a plan, move missed lectures forward, and track completion, XP, levels, streaks, weekly/monthly progress, and achievements in the YouTube planner.

## Install and run

```powershell
npm install
npm install --prefix client
npm install --prefix server
```

Run MongoDB in a first PowerShell window:

```powershell
.\start-mongodb.ps1
```

Then run the app in a second window:

```powershell
npm run dev
```

Open `http://localhost:5173`. The client runs on port 5173 and proxies `/api` requests to the Express server on port 5000. The API checks MongoDB and the session secret before it starts. Press Ctrl+C in each window to stop MongoDB and the app.

## Accounts and data

- Register with a name, email, and password of at least 8 characters.
- Email addresses are normalized and unique. Existing addresses receive a clear registration error and can use the sign-in route.
- Passwords are stored as salted scrypt hashes. A signed, HTTP-only session cookie is used by the browser.
- Each account has one selected exam. Its seeded subjects and planner are scoped to that account.
- Custom planner tasks and completion state persist in MongoDB.

## API routes

- `POST /api/auth/register` — create an account and start a session
- `POST /api/auth/login` — verify credentials and start a session
- `POST /api/auth/logout` — end the browser session
- `GET /api/auth/me` — restore the current session
- `GET /api/profile` and `PATCH /api/profile/exam` — read profile and save exam focus
- `GET /api/dashboard` — protected, exam-specific dashboard data
- `POST /api/tasks`, `PATCH /api/tasks/:taskId`, `DELETE /api/tasks/:taskId` — personal planner tasks
- `GET /api/exams` and `GET /api/health` — exam list and service status

The PYQ, mock test, notes, formula, and weightage collections are still seed/UI placeholders; the content model can be filled when you provide those materials.
