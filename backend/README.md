# Smartly Backend API

## Overview
A modern Express.js API for campus resource management (rooms, bookings, users, dashboards).

- **Authentication** – JWT based, `utils/token.js` provides `generateToken` & `verifyToken`.
- **Authorization** – Role‑based middleware `middleware/authorize.js`.
- **Database** – MySQL connection pool (`config/db.js`).
- **Repositories** – Thin data‑access layer (users, rooms, bookings, dashboard stats).
- **Controllers** – Business logic for each domain.
- **Routes** – Organized under `routes/` and mounted in `app.js`.

## Getting Started
1. **Clone & install**
   ```bash
   git clone <repo-url>
   cd backend
   npm install
   ```
2. **Configure environment** – copy `.env.example` to `.env` and fill values.
   ```bash
   cp .env.example .env
   ```
3. **Connect to the existing database**
   - Set the connection values in `backend/.env` and verify with `GET /api/health`.
   - The checked-in schema reference is `database/schema.sql`. Do not rerun it against an existing database unless you have reviewed its statements and taken a backup.
   - `database/seeds.sql` is development-only and updates fixed IDs on duplicate keys. Do not run it against a shared or production database.
4. **Run**
   ```bash
   npm run dev   # nodemon for development
   # or
   npm start     # production mode
   ```
The server will start on `http://localhost:${PORT||5000}`. The API health check returns `503` when MySQL is unavailable.

## API Quick Reference
| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/auth/register` | Register a new user |
| `POST` | `/api/auth/login` | Login & receive JWT |
| `GET`  | `/api/auth/me` | Get current user profile |
| `GET`  | `/api/rooms` | List rooms (public) |
| `POST` | `/api/rooms` | Create room (ADMIN) |
| `GET`  | `/api/bookings` | List bookings (role‑filtered) |
| `POST` | `/api/bookings` | Create a booking request |
| `PUT`  | `/api/bookings/:id/status` | Approve/Reject booking (ADMIN/FACULTY) |
| `GET`  | `/api/dashboard/stats` | Aggregated analytics |

All protected routes require an `Authorization: Bearer <jwt>` header.

Public registration at `POST /api/auth/register` always creates a `STUDENT` account; any role supplied by the client is ignored. An administrator can provision student, faculty, or admin accounts from **Manage Users** or `POST /api/users` with `{ "name", "email", "password", "role" }`. This endpoint requires an active `ADMIN` session. The first administrator is created through the one-time setup flow below (or through a trusted database setup process).

For a new database with no administrator, set a long random `ADMIN_BOOTSTRAP_TOKEN` in `backend/.env`, restart the backend, then use **First Admin** on the login page. The setup endpoint accepts that token once and refuses to create another admin after one exists. Keep the token private; remove it from the environment after setup.


### Complete route behavior

- `PUT /api/auth/change-password` takes `{ "currentPassword": "...", "newPassword": "..." }` and requires a valid session.
- `GET /api/rooms/available?startTime=...&endTime=...&minCapacity=...` returns rooms that are active, marked `AVAILABLE`, and have no overlapping approved request.
- `PUT /api/bookings/:id/status` takes `{ "status": "APPROVED" }` or `{ "status": "REJECTED", "rejection_reason": "..." }`; only pending requests can be reviewed. Approvals are serialized per resource and conflicts return `409`.
- `POST /api/bookings/:id/cancel` allows the owner or staff to cancel pending/approved requests. Students only see their own bookings; staff can list campus requests.
- User management is ADMIN-only. `DELETE /api/users/:id` deactivates the account, and the last active administrator is protected.
- Dashboard statistics are computed from database rows. The schema has no timetable or equipment column, so timetable conflicts and equipment filters are not available.

For a new, isolated development database only, see `docs/DATABASE_SETUP.md`. Never run the seed script against shared data: it updates fixed IDs.

`CORS_ORIGIN` accepts a comma-separated list of allowed browser origins. By default, local origins on ports `3000` and `5173` are allowed.

## Testing
Run the Node.js built-in test suite:
```bash
npm test
```

## License
MIT
