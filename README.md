# ParkEase — Find parking. Skip the traffic.

ParkEase is a full-stack destination-based parking reservation platform built with React, Node.js/Express, and MongoDB. Drivers search by destination (malls, hospitals, stations, offices, event venues), compare nearby parking, reserve an individual bay on a realistic top-down map, check in and out, report issues, and track spending. Security and admin staff verify passes, update occupancy, and review analytics.

## 1. Problem statement

Campus parking is hard to monitor: drivers cannot see live availability, reservations are informal, misparking goes unreported, and administrators lack occupancy insight. ParkWise provides a reliable, role-aware system covering the full parking lifecycle from availability to analytics.

## 2. Features

- Email/password authentication with JWT sessions and four roles (student, faculty, security, admin)
- Profile management and owner-scoped vehicle CRUD
- Admin parking-area and slot management with capacity and compatibility rules
- Near-real-time availability browsing with 15-second polling
- Conflict-safe reservations with cancellation
- Check-in and check-out with duration tracking and occupancy history
- Misparking reports with a security/admin review workflow
- Admin dashboard, user role management, and reservation oversight
- Occupancy and peak-hour analytics
- Security headers, auth rate limiting, consistent error handling, and a client error boundary
- Automated backend tests and a demo seed script

## 3. Technology stack

- Frontend: React 19, React Router DOM 7, Vite 8, Fetch API, CSS
- Backend: Node.js 22, Express 5, Mongoose 9, JWT, bcrypt, CORS, dotenv
- Database: MongoDB
- Tests: Node.js built-in test runner

## 4. Architecture

```text
React (Vite)  →  REST/JSON  →  Express + Mongoose  →  MongoDB
```

The client calls a JSON API under `/api`. Express applies security headers, CORS, authentication, validation, and centralized error handling, then persists through Mongoose models. Availability and analytics are derived from parking-slot state and occupancy-history snapshots.

## 5. Project structure

```text
parkwise/
├── client/        React application (components, pages, context, hooks, services)
└── server/        Express API (config, models, controllers, routes, middleware, utils, tests)
```

## 6. Database schema

- **User**: name, email (unique), password (hashed), phone, role, createdAt
- **Vehicle**: owner, registrationNumber (unique), type, model, color
- **ParkingArea**: name, location, description, capacity, allowedVehicleTypes, status
- **ParkingSlot**: area, slotNumber (unique per area), vehicleType, category, status, currentReservation
- **Reservation**: user, vehicle, area, slot, startTime, endTime, status, checkedInAt, checkedOutAt, cancelledAt, durationMinutes
- **ParkingReport**: reporter, area, slot, vehicleNumber, violationType, description, imageUrl, status, reviewedBy, reviewedAt
- **OccupancyHistory**: area, occupiedCount, availableCount, occupancyPercentage, recordedAt

## 7. API documentation

Responses use `{ "success", "message", "data" }`; errors use `{ "success": false, "message", "errors"? }`. Protected endpoints require `Authorization: Bearer <token>`.

| Group | Endpoints |
| --- | --- |
| Auth | `POST /api/auth/register`, `POST /api/auth/login`, `GET /api/auth/me` |
| Profile | `GET/PUT /api/users/profile` |
| Vehicles | `GET/POST /api/vehicles`, `GET/PUT/DELETE /api/vehicles/:id` |
| Parking areas | `GET/POST /api/parking-areas`, `GET/PUT/DELETE /api/parking-areas/:id` |
| Parking slots | `GET/POST /api/parking-slots`, `GET/PUT/DELETE /api/parking-slots/:id` |
| Reservations | `POST /api/reservations`, `GET /api/reservations/my`, `GET /api/reservations/:id`, `PATCH /api/reservations/:id/cancel`, `POST /api/reservations/:id/check-in`, `POST /api/reservations/:id/check-out` |
| Reports | `POST /api/reports`, `GET /api/reports/my`, `GET /api/reports`, `GET /api/reports/:id`, `PATCH /api/reports/:id/status` |
| Admin | `GET /api/admin/stats`, `GET /api/admin/users`, `PATCH /api/admin/users/:id/role`, `GET /api/admin/reservations` |
| Analytics | `GET /api/analytics/dashboard`, `GET /api/analytics/occupancy`, `GET /api/analytics/peak-hours` |

Reads require authentication; parking/slot mutations, admin, and analytics require an admin, and report processing requires security or admin.

## 8. Installation

Requires Node.js 22.12+, npm 10+, and MongoDB running locally on port `27017`.

```powershell
cd parkwise\client
npm install

cd ..\server
npm install
```

## 9. Environment variables

Copy `server/.env.example` to `server/.env`:

| Variable | Purpose | Development value |
| --- | --- | --- |
| `PORT` | Express port | `5000` |
| `MONGO_URI` | MongoDB connection string | `mongodb://localhost:27017/parkwise` |
| `JWT_SECRET` | JWT signing secret (min 32 chars) | A long random value |
| `JWT_EXPIRES_IN` | Token lifetime | `7d` |
| `CLIENT_URL` | Allowed browser origin | `http://localhost:5173` |

`server/.env` is ignored by Git. `TEST_MONGO_URI` optionally overrides the test database.

## 10. Running locally

```powershell
# Seed demo data (optional but recommended)
cd parkwise\server
npm run seed

# Terminal 1 — API
npm run dev

# Terminal 2 — client
cd parkwise\client
npm run dev
```

Open `http://localhost:5173`. The API runs at `http://localhost:5000/api`.

## 11. Testing

```powershell
cd parkwise\server
npm test
```

18 backend tests cover authentication, parking CRUD, reservation lifecycle, and report processing against an isolated `parkwise_test` database that is dropped automatically.

## 12. Seed data

`npm run seed` resets the database and creates: 1 admin, 2 security users, 10 students, 5 parking areas, 100 parking slots, 10 vehicles, 10 reservations, and 5 reports.

## 13. Demo credentials

All demo accounts use the password **`Password123`** (development only).

| Role | Email |
| --- | --- |
| Admin | `admin@parkwise.demo` |
| Security | `security@parkwise.demo` |
| Student | `student@parkwise.demo` |

Additional seeded students use `student2@parkwise.demo` through `student10@parkwise.demo`.

## 14. Security

Passwords are hashed with bcrypt; secrets live in environment variables and never in Git. The API sets security headers, disables `X-Powered-By`, rate limits authentication, validates and sanitizes input on the server, enforces role-based authorization, and never returns passwords. The MVP stores the Bearer token in browser local storage; production should use short-lived tokens with a strict Content Security Policy or an HttpOnly cookie/session design.

## 15. Screenshots

Add screenshots of the availability browser, reservation flow, and admin analytics here when preparing a submission.

## 16. Future enhancements

- Password reset and email verification
- WebSocket live availability
- Payment and permit management
- Native mobile client
- Report evidence uploads with managed storage

## Build status

Development is complete through all 15 planned phases: project setup, database, authentication, user/vehicle management, parking CRUD, availability UI, reservations, check-in/out, reports, admin dashboard, analytics, hardening, responsive polish, testing, and documentation with seed data.
