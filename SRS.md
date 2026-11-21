# Software Requirements Specification (SRS)

## Masterji Study Hub

**Document version:** 1.0  
**Status date:** 21 November 2026  
**Project status:** Working local application with authentication, a basic study dashboard, and an expanded YouTube playlist planner. This is not yet a complete GATE preparation SaaS.

---

## 1. Purpose

This document records the current product scope, implemented behavior, architecture, constraints, and recommended next requirements for the Masterji Study Hub project. It is based on the current source code and the requirements provided in this project conversation.

The application is intended to help exam-preparation students organize study resources and daily work. The most complete learning workflow today is the YouTube playlist planner: it turns a playlist into dated lecture tasks and tracks completion and study rewards.

## 2. Scope and product status

The existing application has a Masterji-style study landing page, sign-in and registration, exam selection, a signed-in workspace, and a YouTube planner. User accounts and planner data are stored in MongoDB.

The present account setup supports **JEE, NEET, UPSC, and SSC**. The more recent GATE-specific brief has not yet been implemented as a GATE product profile: there is no GATE branch/year onboarding, and GATE is not currently an accepted exam value in the user model.

Several workspace destinations are present in the navigation, but their complete study workflows are not implemented. In particular, PYQs, real test series, notes, formulas, chapter weightage, content purchases, and payment processing are not connected to production data. The My Purchases page is currently an empty state.

## 3. Stakeholders and user classes

| User class | Needs |
|---|---|
| Student | Register, choose an exam focus, plan lectures, complete tasks, and see progress. |
| Content administrator (future) | Add and maintain verified exam resources, courses, and packages. |
| SaaS operator (future) | Manage users, plans, billing, operational settings, and support. |

The current application implements the student account and study-planning flow. It does not yet include administrator or operator interfaces.

## 4. Current technology and architecture

### 4.1 Implemented stack

| Layer | Current implementation |
|---|---|
| Frontend | React 18, Vite, JavaScript/JSX, CSS, Lucide icons, Three.js for a landing-page visual. |
| Navigation | Lightweight browser-history routing implemented in `client/src/main.jsx`. React Router is not installed. |
| API calls | Browser `fetch`; Axios is not installed. |
| Backend | Node.js ES modules, Express 4. |
| Persistence | MongoDB through Mongoose 8. |
| Password storage | Salted scrypt hashes using Node's crypto module. bcrypt is not installed. |
| Authentication token | A custom HMAC-SHA256 signed JWT-format token stored in an HTTP-only cookie. A JWT library is not installed. |
| Charts | Data-driven HTML/CSS bars and summary cards in the YouTube planner. Recharts is not installed. |
| Styling | Project CSS and theme variables. Tailwind CSS is not installed. |

The requested stack in the original brief listed Tailwind, React Router, Axios, Recharts, bcrypt, and JWT. The existing source does not use those packages. The actual implementation is described above; adopting those libraries is a design decision for a future phase, not a current capability.

### 4.2 Source layout

```text
client/
  src/main.jsx                 React application, views, and client-side routing
  src/styles.css               Themes, layout, responsive styles, and components
  vite.config.js               Vite development configuration
server/
  app.js                       Express middleware and API mounting
  index.js                     Environment, MongoDB connection, and server startup
  data.js                      Seed data for the current exam dashboard
  middleware/auth.js           Authentication and sign-in rate limiting
  lib/security.js              Password hashing and signed session-token helpers
  models/                      Mongoose user, task, playlist, daily-goal, and XP models
  routes/                      Auth, profile, dashboard, task, and YouTube APIs
README.md                      Setup and run instructions
SRS.md                         This requirements and status document
```

### 4.3 Runtime configuration

The server reads configuration from `server/.env`. The sample file is `server/.env.example` and contains placeholders. The main settings are:

- `MONGODB_URI` — MongoDB local or Atlas connection string.
- `JWT_SECRET` — random secret of at least 32 characters used to sign session tokens.
- `PORT` — API port, default 5000.
- `CLIENT_ORIGIN` — permitted browser origin, default local Vite origin.
- `YOUTUBE_API_KEY` — optional server-side YouTube Data API key.

The YouTube key is read by the server and is not intended to be exposed to the browser. When it is absent, the planner can use a manual fallback workflow.

## 5. Implemented user workflows

### 5.1 Account and exam setup

1. A new user registers with a name, email, and password.
2. Email is normalized to lowercase and must be unique.
3. The server stores a salted scrypt password hash and starts an authenticated browser session.
4. A signed-in user without an exam chooses JEE, NEET, UPSC, or SSC during onboarding.
5. Users can sign in, restore an existing session, and log out.

Password length is validated between 8 and 128 characters. Registration and login have an in-memory IP rate limiter. User data access is protected by authentication middleware.

### 5.2 YouTube playlist planning

When `YOUTUBE_API_KEY` is configured, the server imports public playlist metadata and video durations from the YouTube Data API. It stores video IDs, titles, durations, and available thumbnails. The current importer caps playlist processing at 500 entries.

When the API key is absent, the user can still make a usable schedule by entering a YouTube playlist URL, a playlist title, the number of lectures, an estimated average lecture duration, a first study date, and lectures per day. In this mode the app clearly treats the titles and durations as estimates; it cannot import actual titles, thumbnails, or durations without API access.

For both modes, the server creates one scheduled entry per lecture and assigns dates sequentially. For example, 80 lectures at 5 per day creates a 16-day schedule. The planner displays the expected completion date and the number of lectures remaining.

Users can:

- Select a lecture range and playback speed to calculate estimated viewing time.
- Change the number of lectures per day; unfinished lectures are redistributed through the plan.
- Pause a plan; on resume, unfinished lectures are shifted forward by the paused calendar days.
- Reschedule overdue, unfinished lectures.
- Move an individual lecture to another date.
- Mark and unmark lecture completion.
- View a date-grouped checklist with lecture labels, thumbnails where available, duration, and a completion control.
- Open a lecture in an embedded YouTube player.

The embedded player uses YouTube's supported player. The application cannot disable YouTube's related-video behavior entirely.

### 5.3 Daily goals and gamification

The YouTube planner supports a daily lecture target from 1 to 50. The current default target is 2 until the user sets a date-specific target.

Implemented rewards and indicators include:

- 10 XP for a lecture's first completion reward.
- 25 XP for completing the daily lecture goal.
- 50 XP for reaching a seven-day streak milestone.
- 50 XP for completing the weekly goal.
- Levels calculated in 100-XP increments.
- Current and longest streak values.
- Dynamic achievement states for first lecture, 7-day streak, 30-day streak, 100 lectures, weekly champion, and goal crusher.

XP transactions have unique source keys so repeatedly marking and unmarking the same lecture does not repeatedly award lecture XP. Unmarking a lecture changes progress and streak calculations but does not delete already-awarded XP.

### 5.4 Progress summaries

The YouTube planner displays data derived from stored playlist and lecture activity:

- Today's target, completed lectures, and streak.
- Today-versus-yesterday completion comparison.
- Weekly target, completion, missed scheduled lectures, XP, and a seven-day bar display.
- Monthly target, completion, XP, study days, missed days, average lectures per day, and week-by-week progress.
- Total XP, current level, XP to the next level, overall playlist completion, and achievements.

These figures are scoped to YouTube planner activity. They are not yet a complete analytics system across PYQs, mock tests, notes, or all study activity.

### 5.5 Existing interface features

- Marketing landing page inspired by the supplied MasterJi reference.
- Subtle red/plum and gold theme with light and dark modes.
- Responsive workspace sidebar and mobile navigation.
- Floating/scroll-aware landing navigation and a Three.js landing visual.
- Signed-in overview using seed dashboard content and stored planner tasks.
- My Purchases navigation and empty-state page; no catalog, checkout, or payment provider is connected.

## 6. Functional requirements and implementation status

**Status labels:** Implemented = available in current source; Partial = some behavior exists but not the complete requested system; Not implemented = future work.

| ID | Requirement | Status | Current scope / gap |
|---|---|---|---|
| FR-01 | Register, log in, log out, and protect account APIs | Implemented | Uses a custom signed token in an HTTP-only cookie and scrypt password hashes. |
| FR-02 | User profile with GATE branch and year | Not implemented | Current profile has one exam enum: JEE, NEET, UPSC, SSC. |
| FR-03 | Dashboard and persistent personal tasks | Partial | Seeded exam overview and custom tasks persist; several dashboard metrics/resources remain demo or seed content. |
| FR-04 | Import YouTube playlist and lecture metadata | Partial | Real import supported with a server API key; manual fallback requires count and average duration. Processing capped at 500 videos. |
| FR-05 | Generate a date-based plan from lectures/day | Implemented | Dates are assigned sequentially and expected completion is calculated. |
| FR-06 | Edit plan pace, pause/resume, and reschedule missed work | Implemented | Unfinished entries are redistributed; pause dates shift unfinished lectures on resume. |
| FR-07 | Complete/uncomplete lectures and keep progress per user | Implemented | Persisted within each user's playlist documents. |
| FR-08 | Embed video in the application | Partial | Uses YouTube's embed player; user leaves the app only if they use YouTube player controls or links. |
| FR-09 | Daily goal, XP, level, streak, and achievement states | Partial | Implemented for YouTube lectures only; no account-wide achievement center or reward history view. |
| FR-10 | Weekly/monthly analytics and yesterday comparison | Partial | Derived from YouTube lecture data; not backed by Recharts and not cross-feature. |
| FR-11 | Subjects and measurable subject goals | Not implemented | Current subject progress is seed dashboard content, not user-editable records. |
| FR-12 | Mock-test recording and score analytics | Not implemented | Tests navigation exists, but no persisted mock-test workflow/API. |
| FR-13 | Study calendar with day details | Not implemented | Date-grouped YouTube checklist exists; no full calendar view or status legend. |
| FR-14 | PYQ, notes, formula sheets, chapter weightage, and content bank | Not implemented | Resource cards/content are placeholders pending supplied content and APIs. |
| FR-15 | Courses/packages, purchases, and payments | Not implemented | My Purchases is currently an empty state; no products, checkout, payment, or entitlement model. |
| FR-16 | Notifications | Not implemented | No notification model or delivery workflow. |
| FR-17 | Responsive light/dark interface | Implemented | Existing CSS themes and responsive layouts; full accessibility audit remains outstanding. |

## 7. Data model currently present

| Model | Purpose |
|---|---|
| `User` | Name, email, password hash, selected exam. |
| `Task` | Seed-task completion overrides and custom planner tasks, scoped by user and exam. |
| `YoutubePlaylist` | Playlist metadata, scheduling parameters, pause status, and embedded per-video metadata/progress. |
| `YoutubeDailyGoal` | A user's lecture target for a particular date. |
| `YoutubeXpTransaction` | Idempotent XP entries for lecture and goal milestones. |

The original brief also listed separate `Lecture`, `StudyPlan`, `DailyTask`, `Subject`, `Goal`, `Progress`, `Achievement`, `MockTest`, and `Notification` models. These separate models are not currently present. Lectures and plan attributes are embedded in `YoutubePlaylist`; goals and XP have dedicated models.

## 8. Current API surface

All API routes are mounted below `/api`.

| Route | Purpose |
|---|---|
| `GET /health` | API and MongoDB connection status. |
| `GET /exams` | Available seeded exams. |
| `POST /auth/register` | Create account. |
| `POST /auth/login` | Authenticate. |
| `POST /auth/logout` | Clear session cookie. |
| `GET /auth/me` | Restore current account. |
| `GET /profile` | Read current profile. |
| `PATCH /profile/exam` | Save supported exam selection. |
| `GET /dashboard` | Load exam seed data and persisted tasks. |
| `POST /tasks` | Create a custom task. |
| `PATCH /tasks/:taskId` | Change task completion. |
| `DELETE /tasks/:taskId` | Delete custom task. |
| `GET /youtube-playlists` | Load current user's playlist plans and API-key availability. |
| `POST /youtube-playlists` | Import or manually plan a playlist. |
| `PATCH /youtube-playlists/:playlistId` | Update range, speed, and daily lecture pace. |
| `PATCH /youtube-playlists/:playlistId/status` | Pause/resume a plan. |
| `POST /youtube-playlists/:playlistId/reschedule-missed` | Move overdue unfinished lectures forward. |
| `PATCH /youtube-playlists/:playlistId/lectures/:videoId` | Update completion or scheduled date. |
| `DELETE /youtube-playlists/:playlistId` | Remove a user's plan. |
| `GET /youtube-playlists/goal?date=YYYY-MM-DD` | Load date goal and current progress/analytics summary. |
| `PUT /youtube-playlists/goal` | Save a date-specific lecture target. |

YouTube planner and account-specific APIs require authentication. Input validation and centralized JSON error handling are implemented.

## 9. Non-functional requirements

### Security and privacy

- Passwords are stored as salted scrypt hashes; plain-text passwords are not stored.
- Session cookies are HTTP-only, SameSite=Lax, and Secure in production mode.
- Session lifetime is seven days.
- Authentication endpoints have a process-local limit of 30 requests per IP per 15 minutes.
- CORS is limited to configured origins.
- JSON request body limit is 32 KB.
- YouTube API keys belong in the server environment, never in client code.
- Environment examples must contain placeholders, not real secrets.

### Compatibility and operation

- Node.js 18 or newer is expected.
- MongoDB must be available for the API to start.
- The Vite client defaults to port 5173 and proxies `/api` to the Express server on port 5000.
- Production static serving uses the built client under `client/dist`.

### Current verification status

The client production build and Node syntax checks have passed during implementation. The full flows have not been verified against a live MongoDB deployment and a valid YouTube API key in this work session. There is no automated test suite yet.

## 10. Next requirements and recommended delivery phases

The order below prioritizes converting the current implementation into the GATE SaaS described in the brief while preserving the working YouTube workflow.

### Phase 1 — Product/profile foundation

1. Confirm the product's primary exam scope: GATE-only or GATE plus JEE/NEET/UPSC/SSC.
2. Add GATE as a supported profile and define branch and target-year fields.
3. Add server-side profile validation, client onboarding, migration rules, and branch-specific seed data.
4. Decide whether the requested libraries are mandatory. If so, plan migration to React Router, Axios, Tailwind, Recharts, bcrypt, and a standard JWT library; otherwise revise the stack requirement to match the existing choices.

### Phase 2 — YouTube planner verification and plan lifecycle

1. Configure a valid YouTube Data API key and verify public, private, deleted, empty, and large playlists.
2. Add integration coverage for manual fallback, date distribution, expected finish date, daily pace changes, pause/resume, rescheduling, and duplicate XP prevention.
3. Decide policy for playlists over the 500-video import cap and for videos that are unavailable or not embeddable.
4. Add loading, quota, network, and API-key error states that guide the user to recovery.

### Phase 3 — GATE daily study system

1. Make the daily planner the source of truth for GATE study activity, not only YouTube lectures.
2. Add GATE subjects (for example CS/IT subjects) as real persisted records and allow student-defined subject goals.
3. Add daily tasks for non-video study such as PYQs, revision, and mock tests.
4. Define whether a daily target is a lecture count, all study tasks, or both; make streak calculations match that definition.

### Phase 4 — Dashboard and analytics

1. Replace seeded overview figures with API-backed user progress.
2. Add weekly/monthly date range handling, missed-day definitions, and configurable goals.
3. Add charts for study volume and mock-test performance.
4. Add a calendar with completed, partial, missed, and future states, and date detail views.
5. Add a comparison methodology for yesterday and historical periods.

### Phase 5 — Exam content and mock tests

1. Define versioned content schemas and admin/import workflows for PYQs, notes, formulas, weightage, and questions.
2. Add mock-test creation/recording with score, total marks, accuracy, rank, and dated history.
3. Add search, filtering, chapter mapping, and branch/exam access rules.
4. Load verified content only; distinguish sample data from production content.

### Phase 6 — Gamification and notifications

1. Define XP rules, rollback behavior, timezone rules, and achievement award criteria.
2. Add achievement records/history and prevent duplicate rewards across all study activity.
3. Add optional reminders and notifications, with user preferences and delivery controls.
4. Add auditability for progress and XP corrections.

### Phase 7 — SaaS commerce

1. Define course/package catalog, pricing, currency, subscriptions or one-time purchases, and access entitlements.
2. Select and integrate a payment provider, including signed webhook verification, retries, refunds, and reconciliation.
3. Add purchase history and gated content access; do not treat a browser-side payment success message as proof of payment.

### Phase 8 — Release readiness

1. Add automated unit, API integration, and browser end-to-end tests.
2. Add database backup/migration procedures, structured logs, monitoring, and error reporting.
3. Configure production secrets, HTTPS, cookie domain, CORS, rate limits, and deployment pipeline.
4. Perform responsive, accessibility, and security reviews.
5. Verify deployment using production-like MongoDB and YouTube credentials.

## 11. Acceptance criteria for the next YouTube release

- A signed-in user can add a public playlist with the API configured or create a clearly labelled manual fallback plan without it.
- For N lectures and L lectures per day, the plan assigns every lecture to a date and shows the calculated expected completion date.
- A user can change L, pause/resume, reschedule overdue work, and see remaining lectures without losing completed lecture records.
- Completion and uncompletion persist per user; only eligible first-time reward transactions change XP.
- Daily target progress, streak, XP, level, weekly/monthly summaries, and achievements are calculated from persisted user activity.
- One user's playlists, goals, and progress cannot be read or modified by another user.
- API-key errors, quota failures, inaccessible playlists, and unavailable videos show useful messages and do not silently create misleading imported content.
- Desktop and mobile layouts remain usable in both supported themes.

## 12. Glossary

| Term | Definition |
|---|---|
| Playlist plan | A user's schedule for studying videos from one YouTube playlist. |
| Lecture task | One playlist video (or one numbered placeholder in manual fallback) scheduled for a study date. |
| Manual fallback | A plan based on user-entered lecture count and average duration when the YouTube API key is unavailable. |
| XP | Reward points recorded for eligible lecture and goal milestones. |
| Streak | Consecutive dates on which the configured daily lecture target is met. |
| Seed data | Example exam dashboard content currently shipped in the application source. |

