# Smartly — Access Flow Control Management System

Smartly is an institutional facility access and flow control management system designed to coordinate and schedule classrooms, computer laboratories, auditoriums, and specialized equipment across campus.

---

## 1. Project Architecture

The application is structured into a clean decoupled frontend and backend:

```text
Smartly/
├── backend/                  # Node.js + Express 5 API Server
│   ├── config/               # MySQL connection pool (mysql2/promise)
│   ├── controllers/          # Request handlers for Auth, Rooms, Bookings, Users, Dashboard
│   ├── middleware/           # JWT authentication & role-based authorization
│   ├── repositories/         # Parameterized data access layer (resources, requests, users)
│   ├── routes/               # API route definitions (/api/*)
│   ├── tests/                # Native Node.js test runner suites
│   ├── utils/                # JWT signing and verification utilities
│   ├── app.js                # Express application configuration & CORS
│   └── server.js             # HTTP server entrypoint
│
├── frontend/                 # React 19 + Vite + TypeScript Client
│   ├── src/
│   │   ├── components/       # Layouts (Sidebar, Topbar) and common UI cards/badges
│   │   ├── context/          # AuthContext (JWT session restoration, roles)
│   │   ├── pages/            # 9 Core Pages (Login, Dashboards, Resources, Approvals, Profile)
│   │   ├── services/         # Centralized API client & domain service modules
│   │   └── types/            # TypeScript interfaces & domain models
│   ├── vite.config.ts        # Vite configuration & development proxy (/api -> :5000)
│   └── tailwind.config.js    # Tailwind CSS styling configuration
│
├── database/                 # Relational Database Layer
│   ├── schema.sql            # MySQL schema (users, resources, requests, compatibility views)
│   └── seeds.sql             # Development seed data with bcrypt-hashed credentials
│
├── docs/                     # Documentation
│   └── DATABASE_SETUP.md     # In-depth database dictionary, ERD, and repository reference
└── scripts/
    └── dev.js                # Cross-platform concurrent dev runner (Windows, macOS, Linux)
```

### Technology Stack
- **Frontend:** React 19, TypeScript 5.7, Vite 6, Tailwind CSS 3.4, React Router 7, Recharts, Lucide React.
- **Backend:** Node.js, Express 5.3, MySQL2 (`mysql2/promise`), `bcryptjs`, `jsonwebtoken`, `cors`, `dotenv`.
- **Database:** MySQL 8.0+ / MariaDB 10.5+ (InnoDB, `utf8mb4`).
- **Security:** Bcrypt salted password hashing (10 rounds), signed JWT tokens in `Authorization: Bearer <token>`, role-based authorization guards, parameterized SQL queries preventing injection, sanitized error responses without leaking credentials.

---

## 2. Prerequisites

- **Node.js:** v18.0.0 or later (verified on Node.js 24/25)
- **npm:** v9.0.0 or later
- **MySQL Server:** v8.0 or later (or MariaDB 10.5+)

---

## 3. Environment Configuration

### Backend (`backend/.env`)
Copy `backend/.env.example` to `backend/.env`:
```ini
# Server Configuration
PORT=5000
HOST=0.0.0.0
CORS_ORIGIN=http://localhost:3000,http://127.0.0.1:3000

# Database Configuration (MySQL)
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_mysql_password
DB_NAME=smartly

# JWT Authentication
JWT_SECRET=your_super_secret_jwt_key
JWT_EXPIRES_IN=1h
```

### Frontend (`frontend/.env`)
Copy `frontend/.env.example` to `frontend/.env`:
```ini
# Smartly Frontend API Configuration
VITE_API_URL=http://localhost:5000/api
VITE_API_BASE_URL=http://localhost:5000/api
```

---

## 4. Database Setup

1. **Start MySQL Server:**
   Ensure your local MySQL service is active and listening on port `3306`.

2. **Initialize Database Schema:**
   From the repository root, run:
   ```bash
   mysql -u root -p < database/schema.sql
   ```

3. **Seed Development Accounts & Resources (Optional):**
   ```bash
   mysql -u root -p < database/seeds.sql
   ```

### Pre-Seeded Development Accounts
All pre-seeded test accounts use the default password: `password123`

| Account Name | Institutional Email | Role | Status |
| :--- | :--- | :--- | :--- |
| System Administrator | `admin@smartly.local` | `ADMIN` | Active |
| Prof. Alan Turing | `faculty@smartly.local` | `FACULTY` | Active |
| Grace Hopper | `student@smartly.local` | `STUDENT` | Active |
| Ada Lovelace | `student2@smartly.local` | `STUDENT` | Active |
| Deactivated Account | `inactive@smartly.local` | `STUDENT` | Inactive |

---

## 5. Dependency Installation

Install dependencies for both frontend and backend:
```bash
# Install backend dependencies
npm --prefix backend install

# Install frontend dependencies
npm --prefix frontend install
```

---

## 6. Running the Application

### Option A: Run Both Services Concurrently
From the root directory:
```bash
npm run dev
```
*(Starts backend on `http://localhost:5000` and frontend on `http://localhost:3000`)*

### Option B: Run Services Individually

**Backend API Server:**
```powershell
# Windows PowerShell
npm run dev:backend
# Or directly
npm --prefix backend run dev
```

**Frontend Client:**
```powershell
# Windows PowerShell
npm run dev:frontend
# Or directly
npm --prefix frontend run dev
```

### Accessing the Applications
- **Frontend Web Application:** [http://localhost:3000](http://localhost:3000)
- **Backend API Root:** [http://localhost:5000/api](http://localhost:5000/api)
- **Backend Health Check:** [http://localhost:5000/api/health](http://localhost:5000/api/health)

---

## 7. Available API Routes

### Health Check
- `GET /api/health` — Verifies backend server health and uptime.

### Authentication & Profiles (`/api/auth`)
- `POST /api/auth/register` — Public registration for new student accounts.
- `POST /api/auth/login` — Public login returning JWT and safe user object.
- `GET /api/auth/me` — Restores active session for authenticated user.
- `PUT /api/auth/change-password` — Updates password for authenticated user.
- `GET /api/auth/admin-only` — Test route restricted to `ADMIN` role.

### Facility Resources (`/api/rooms`)
- `GET /api/rooms` — Lists active resources with query filters (`search`, `status`, `minCapacity`).
- `GET /api/rooms/available` — Returns rooms available without conflicts within `startTime` and `endTime`.
- `GET /api/rooms/:id` — Retrieves details for a specific facility.
- `POST /api/rooms` — Admin-only endpoint to create a new facility.
- `PUT /api/rooms/:id` — Admin-only endpoint to update an existing facility.
- `DELETE /api/rooms/:id` — Admin-only endpoint to soft-delete a facility.

### Access Requests & Bookings (`/api/bookings`)
- `GET /api/bookings` — Lists bookings (students see own; admin and faculty see all).
- `GET /api/bookings/my` — Lists bookings belonging to the currently logged-in user.
- `GET /api/bookings/:id` — Retrieves booking details with authorization guard.
- `POST /api/bookings` — Creates a reservation request with conflict detection.
- `PUT /api/bookings/:id/status` — Faculty/Admin review endpoint (`APPROVED`, `REJECTED`).
- `POST /api/bookings/:id/cancel` — Cancels a reservation (owner or staff).

### User Management (`/api/users`)
- `GET /api/users` — Admin-only user directory with filters (`role`, `search`, `isActive`).
- `GET /api/users/:id` — Admin-only user detail endpoint.
- `PUT /api/users/:id` — Admin-only profile and role update (with lockout prevention).
- `DELETE /api/users/:id` — Admin-only user deactivation.

### Dashboard Analytics (`/api/dashboard`)
- `GET /api/dashboard/stats` — High-level campus management metrics and recent activity.

---

## 8. Testing and Building

### Run Backend Test Suite
```bash
npm test
# Or
npm --prefix backend test
```
*Executes unit and integration test suites using Node.js's native test runner (`node --test`).*

### Build Frontend for Production
```bash
npm run build
```
*Runs TypeScript verification (`tsc`) and bundles optimized production assets into `frontend/dist/` via Vite.*

---

## 9. Known Limitations & Configuration Notes

1. **MySQL Service Dependency:** The backend API handles database connectivity failures gracefully (returning non-leaking HTTP 500/503 responses and continuing health-check operations). To execute end-to-end persistent booking queries against MySQL, start the local MySQL server service (`mysqld` on port 3306) and execute `database/schema.sql`.
2. **Network Sandbox on Windows:** When running background processes or Node tests that bind dynamic ephemeral ports on Windows, ensure loopback network permissions are allowed.

