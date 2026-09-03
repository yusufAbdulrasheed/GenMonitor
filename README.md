# Generator Maintenance & Monitoring

A fleet operations platform for standby generators across sites: live telemetry,
alerting with an acknowledge/resolve workflow, preventive-maintenance
automation, a full work-order lifecycle, historical analytics, a fleet map,
device ingestion, and an immutable audit trail — with real-time push over
WebSockets.

- **client/** — React 19 + Vite SPA (Tailwind, TanStack Query, React Router, Recharts, Leaflet, socket.io-client)
- **server/** — Express 5 + MongoDB (Mongoose 9) API — JWT cookie auth, Socket.IO, in-process job scheduler

## Prerequisites

- Node.js 20+
- A MongoDB instance (local, Atlas, or the bundled Docker service)

## Quick start (local)

```bash
npm run install:all

cp server/.env.example server/.env
#   - set MONGO_URI
#   - generate secrets:
#     node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
#     -> JWT_SECRET and REFRESH_SECRET

cp client/.env.example client/.env   # optional; only if API is not on :5000

npm run dev
```

- Client: http://localhost:5173 (Vite proxies `/api`, `/uploads` and `/socket.io` to the server)
- API: http://localhost:5000

### Demo data & logins

Load the demo dataset (2 sites, 3 generators, plans, work orders, alerts, and
48 h of reading history) one of three ways:

- **Dashboard** → *Seed database* (Admin only)
- `POST /api/seed` while authenticated as an Admin
- `npm run seed` from `server/` — runs without the HTTP layer, so it also
  works on a brand-new, empty database (`npm run seed -- --force` bypasses
  `ALLOW_SEED`)

Seeding (re)creates these accounts:

| Email | Password | Role |
|---|---|---|
| `admin@gensys.com` | `admin@123` | Admin |
| `engineer@gensys.com` | `password@123` | Engineer |
| `tech@gensys.com` | `password@123` | Technician |
| `noc@gensys.com` | `password@123` | NOC Manager |

> Demo credentials — for local / evaluation use only. Change or remove them
> before any real deployment.

## Quick start (Docker)

```bash
docker compose up --build
# client -> http://localhost:8080   api -> http://localhost:5000   mongo -> :27017
```

Set real `JWT_SECRET` / `REFRESH_SECRET` (env or a root `.env`) before any real use.

## Features

| Area | What it does |
|---|---|
| **Live telemetry** | Simulator + real device readings flow through one pipeline: persist a time-series `Reading`, re-evaluate alerts, push `telemetry:update`. `GET /api/generators/realtime` is a pure read. |
| **Alerts** | Threshold-driven (`Fault`, `LowFuel`, `LowBattery`, `HighTemp`, `MaintenanceOverdue`) with hysteresis to stop flapping. Acknowledge / resolve / assign / note. Auto-resolve on recovery. Manager email + in-app bell on new critical alerts. |
| **Thresholds** | Per-generator → per-site → global → built-in defaults, resolved at evaluation time. Editable by Admin/Engineer. |
| **Maintenance plans** | Recurring schedules (every N days or N runtime-hours). A scheduled sweep generates preventive work orders when due and raises `MaintenanceOverdue` alerts on SLA breach. |
| **Work orders** | Lifecycle `open → assigned → in_progress → on_hold → completed / cancelled` with a timeline, assignee, checklist, parts + labor cost roll-up, file attachments, SLA due date + breach flag, and sign-off. |
| **Analytics** | Fleet availability %, MTBF / MTTR, fuel burn rate, status mix, per-generator history charts. `GET /api/analytics/summary`, `/api/generators/:id/history`. |
| **Fleet map** | Leaflet map of sites colored by worst generator status. |
| **Device ingestion** | Per-key (`gmk_…`, hashed at rest, shown once) `POST /api/ingest/readings` — single or batched, fleet- or generator-scoped, rate-limited. |
| **Audit trail** | Every mutating action recorded with actor, field-level diff, IP and timestamp. `GET /api/activity` (Admin / NOC Manager), 1-year TTL. |
| **Notifications** | In-app feed + unread badge, per-user email preferences, delivered live over the socket. |
| **Real-time** | Socket.IO gateway authenticated with the access-token cookie; the client updates its query cache on `alert:*`, `workorder:*`, `telemetry:update`, `notification:new`. |

## Background jobs (in-process, `ENABLE_SCHEDULER`)

- **telemetry simulator** — nudges active units (`ENABLE_SIMULATION`)
- **alert sweep** — re-evaluates every generator against current thresholds
- **maintenance sweep** — generates due work orders, flags SLA breaches
- **reading retention** — purges readings older than `READING_RETENTION_DAYS`

## Roles

`Admin`, `Engineer`, `Technician`, `NOC Manager`.

| Area | Read | Write |
|---|---|---|
| Generators / telemetry | any authenticated | create & decommission: Admin · edit: Admin, Engineer |
| Alerts | any authenticated | acknowledge / note: + Technician · resolve / assign: Admin, Engineer, NOC Manager |
| Work orders | any authenticated | Admin, Engineer, Technician · delete: Admin |
| Maintenance plans | any authenticated | Admin, Engineer |
| Thresholds | any authenticated | Admin, Engineer |
| Sites | any authenticated | Admin |
| Analytics | any authenticated | — |
| Reports (PDF / CSV) | Admin, Engineer, NOC Manager | — |
| Activity log | Admin, NOC Manager | — |
| Users | Admin | Admin |
| API keys | Admin | Admin |
| Seed | — | Admin (and `ALLOW_SEED`) |


## Tests

```bash
npm test          # server: Jest + Supertest against mongodb-memory-server (44 tests)
npm run lint      # client: ESLint
npm run build     # client: production build
```

CI runs all three on push / PR — see [`.github/workflows/ci.yml`](.github/workflows/ci.yml).

> The first `npm test` downloads a MongoDB binary for `mongodb-memory-server`
> (pinned to `MONGOMS_VERSION`, default `8.2.6`); needs network once, cached after.
