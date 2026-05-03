# RMS — Technical Documentation

**Version:** 2.0.0  
**Product:**  Reservation Management System  
**Last Updated:** May 3, 2026

---

## Table of Contents

1. [Overview](#1-overview)
2. [Architecture](#2-architecture)
3. [Project Structure](#3-project-structure)
4. [Setup & Installation](#4-setup--installation)
5. [Running the Application](#5-running-the-application)
6. [Data Model](#6-data-model)
7. [API Reference](#7-api-reference)
8. [Frontend Modules](#8-frontend-modules)
9. [Host Accounts & Authentication](#9-host-accounts--authentication)
10. [Tag System](#10-tag-system)
11. [System Tab — Backup & Restore](#11-system-tab--backup--restore)
12. [Offline Fallback](#12-offline-fallback)
13. [Changelog](#13-changelog)

---

## 1. Overview

RMS is a single-device, browser-based reservation management system for Mallo Trattoria Italiana. It runs as a local Node.js application — the frontend is a single HTML file served by a minimal Express server, and all data is persisted to a JSON file on disk.

**Key capabilities:**
- Reservation creation, editing, rescheduling, and cancellation
- Interactive floor plan editor with drag-and-drop table placement and group merging
- Daily summary view with live dining timers
- Guest profile management with visit history
- Reporting dashboard with analytics, CSV/Excel exports, and daily guest reports
- Host account system with 4-digit PIN authentication and role-based access
- Quick-switch PIN pad in the header for fast host login
- Customisable booking and guest tags
- Full audit log of all actions
- System backup (JSON export) and restore (JSON import)
- Offline fallback to localStorage when server is unreachable

---

## 2. Architecture

```
Browser (http://localhost:3000)
        │
        │  HTTP GET  /           → serves public/index.html
        │  HTTP GET  /api/data   → reads data/db.json
        │  HTTP POST /api/data   → writes data/db.json
        │  HTTP GET  /api/export → downloads data/db.json
        │  HTTP GET  /api/status → health check
        ▼
  server.js  (Node.js + Express)
        │
        ▼
  data/db.json  (single JSON file — all application data)
```

**Design principles:**
- **No build step.** The frontend is plain HTML/CSS/JS. No bundler, no transpiler.
- **Single data file.** Everything lives in `data/db.json` — no database engine required.
- **Atomic writes.** The server writes to a `.tmp` file and renames it, preventing corruption on crash.
- **Offline resilience.** If the server is unreachable, the app reads/writes to `localStorage` as a mirror and syncs on next load.

---

## 3. Project Structure

```
mallo-rms/
│
├── server.js               ← Express server — serves app + REST API
├── package.json            ← Node.js project metadata and dependencies
├── README.md               ← Quick-start guide
├── DOCS.md                 ← This file — full technical documentation
├── RELEASE_NOTES_v1.3.1.md ← Release notes for v1.3.1
│
├── data/
│   └── db.json             ← All application data (auto-created on first run)
│
└── public/
    ├── index.html          ← The full application (single HTML file)
    └── brand/
        ├── EBGaramond-VariableFont_wght.ttf
        ├── EBGaramond-Italic-VariableFont_wght.ttf
        ├── Parkinsans-Regular.ttf
        └── symbol-logo-12.png
```

---

## 4. Setup & Installation

### Prerequisites

| Requirement | Version  | Notes                        |
|-------------|----------|------------------------------|
| Node.js     | ≥ 18.0.0 | https://nodejs.org           |
| npm         | ≥ 9.0.0  | Bundled with Node.js         |

### Steps

```bash
# 1. Navigate to the project folder
cd mallo-rms

# 2. Install dependencies (Express only)
npm install

# 3. Start the server
npm start
```

On first run, `data/db.json` is created automatically with default empty data and tag presets.

---

## 5. Running the Application

### Production (standard)
```bash
npm start
# → node server.js
# → http://localhost:3000
```

### Development (auto-restart on file change)
```bash
npm run dev
# → npx nodemon server.js
```

### Stopping
Press `Ctrl+C` in the terminal.

### Changing the port
Edit `server.js` line 11:
```js
const PORT = 3000; // change to any available port
```

---

## 6. Data Model

All data is stored as a single JSON object in `data/db.json`.

### Top-level shape

```json
{
  "_version":   "2.0.0",
  "_created":   "ISO 8601 timestamp",
  "_saved":     "ISO 8601 timestamp",
  "bookings":   [ ...Booking ],
  "guests":     [ ...Guest ],
  "tables":     [ ...Table ],
  "groups":     [ ...Group ],
  "hosts":      [ ...Host ],
  "auditLog":   [ ...AuditEntry ],
  "detailTags": [ "string", ... ],
  "specialTags":[ "string", ... ]
}
```

---

### Booking

```json
{
  "id":        "b1234567890",
  "guestName": "Isabella Rossi",
  "partySize": 4,
  "date":      "2026-05-01",
  "time":      "19:00",
  "endTime":   "21:00",
  "tableIds":  ["t1", "t2"],
  "notes":     "Anniversary dinner",
  "status":    "confirmed | seated | cancelled",
  "phone":     "081234567890",
  "email":     "guest@email.com",
  "gender":    "male | female | other | \"\"",
  "rsvp":      "WA | Walkin | Staff | BOD | Phone | \"\"",
  "takenBy":   "Host Name",
  "details":   ["Birthday", "Alcohol"]
}
```

---

### Guest

```json
{
  "key":       "isabella rossi",
  "name":      "Isabella Rossi",
  "phone":     "081234567890",
  "email":     "guest@email.com",
  "gender":    "female",
  "notes":     "Prefers corner table",
  "tags":      ["Friends & Family (5% Discount)"],
  "firstSeen": "2026-01-15"
}
```

---

### Table

```json
{
  "id":   "t1",
  "name": "T1",
  "cap":  4,
  "size": "small | large",
  "x":    120,
  "y":    80
}
```

---

### Group (merged tables)

```json
{
  "id":       "g1",
  "name":     "G1",
  "tableIds": ["t3", "t4"],
  "cap":      10
}
```

---

### Host Account

```json
{
  "id":       "h1234567890",
  "name":     "Rhenata Wijaya",
  "role":     "host | senior_host | manager | admin",
  "pin":      "1234",
  "loginId":  "4821",
  "perms": {
    "bookings":   true,
    "floorplan":  true,
    "guests":     true,
    "reports":    false,
    "moderator":  false
  }
}
```

> ⚠️ PINs are stored as plaintext strings in `db.json`. For a production environment, replace with hashed PINs (e.g. bcrypt).

---

### Audit Log Entry

```json
{
  "id":        "al1234567890abcd",
  "ts":        "2026-05-01T19:00:00.000Z",
  "action":    "CREATE | UPDATE | DELETE | STATUS | RESCHEDULE | END_SERVICE | LOGIN | LOGOUT",
  "details":   "Human-readable description",
  "hostName":  "Rhenata Wijaya",
  "loginId":   "4821",
  "extra":     { }
}
```

Audit log is capped at **1,000 entries** (oldest entries removed first).

---

## 7. API Reference

All endpoints are served by `server.js` on `http://localhost:3000`.

---

### `GET /api/data`

Returns the full contents of `data/db.json`.

**Response:** `200 OK` — JSON object (see Data Model above)  
**Error:** `500` — `{ "error": "Failed to read data" }`

---

### `POST /api/data`

Replaces the full contents of `data/db.json` with the request body. The server adds a `_saved` timestamp before writing.

**Request body:** Full data JSON object  
**Response:** `200 OK` — `{ "ok": true }`  
**Error:** `500` — `{ "error": "Failed to save data" }`

> Writes are atomic: the server writes to `db.json.tmp` and renames to `db.json`.

---

### `GET /api/export`

Triggers a file download of `data/db.json` with a dated filename.

**Response:** File download — `mallo-backup-YYYY-MM-DD.json`

---

### `GET /api/status`

Health check endpoint showing server state and record counts.

**Response:**
```json
{
  "ok":       true,
  "dbFile":   "/path/to/data/db.json",
  "dbSize":   12345,
  "lastSaved":"2026-05-01T19:00:00.000Z",
  "counts": {
    "bookings":  24,
    "guests":    18,
    "tables":    12,
    "hosts":     4,
    "auditLog":  312
  }
}
```

---

## 8. Frontend Modules

`public/index.html` is a self-contained single-file application. Key JS sections:

| Section | Lines (approx.) | Responsibility |
|---|---|---|
| CSS / Design Tokens | 1–800 | Brand palette, layout, component styles |
| HTML structure | 800–1650 | All views, modals, nav |
| State & persistence | 1650–1810 | `S` object, `save()`, `load()`, server badge |
| Nav / View switching | 1810–1850 | `switchView()` |
| Floor plan | 1850–2050 | Drag-and-drop, groups, zoom |
| Bookings | 2050–2700 | CRUD, filters, table conflict checks |
| Daily summary | 2700–2900 | Schedule render, live timers |
| Guest history | 2900–3200 | Profiles, search, autofill |
| Reporting | 3200–3700 | Analytics dashboard, daily report, CSV/Excel export |
| Moderator | 3700–4250 | Accounts, members, audit log, PIN pad |
| Custom tags | 4250–4420 | Tag manager, dynamic pickers |
| System tab | 4420–5000 | Export, import, danger zone |

### Key global functions

| Function | Description |
|---|---|
| `save()` | Debounced write to server + localStorage mirror |
| `load()` | Async read from server, fallback to localStorage |
| `renderBookings()` | Renders the bookings list view |
| `openModal(id?)` | Opens the booking modal (new or edit) |
| `saveBooking()` | Validates and persists a booking |
| `renderFP()` | Renders the floor plan editor |
| `renderDaily()` | Renders the daily summary + floor map |
| `renderGuests()` | Renders guest profiles |
| `renderSystemTab()` | Renders system snapshot + server status |
| `getActiveHost()` | Returns the current logged-in host from `sessionStorage` |
| `setActiveHost(host)` | Sets or clears the active host session |
| `logAudit(action, details)` | Appends an audit log entry |
| `openPinpad()` | Opens the quick-switch PIN pad overlay |
| `openTagManager(target)` | Opens the tag editor modal |
| `exportSystemJSON()` | Downloads a full JSON backup |
| `doImport(mode)` | Merges or replaces data from an imported file |

---

## 9. Host Accounts & Authentication

### Roles

| Role | Label | Access |
|---|---|---|
| `host` | Host | Bookings, floor plan, guests |
| `senior_host` | Senior Host | + reports |
| `manager` | Manager | + moderator panel |
| `admin` | Admin | Everything + Danger Zone |

### Session

The active host is stored in `sessionStorage` under the key `mallo_active_host`. This means:
- The session persists across page refreshes within the same tab
- The session is cleared when the tab or browser is closed
- Multiple tabs do not share the same session

### PIN pad (quick-switch)

Clicking the host chip in the header opens a PIN pad overlay. The entered 4-digit PIN is matched against all host accounts — no username selection required. On match, the previous host is logged out and the new host is logged in. Both events are recorded in the audit log.

---

## 10. Tag System

There are two independent tag lists:

| List | Used in | Default tags |
|---|---|---|
| `detailTags` | New Booking → Details | Big Group, Birthday, Alcohol, Regular Guest, Friends & Family (5% Discount), KOL, BOD (10% Discount) |
| `specialTags` | Guest Profile → Special Tags | Friends & Family (5% Discount), KOL, BOD (10% Discount) |

Both lists are fully customisable via the **⚙ Manage** button next to each tag picker. Changes are saved immediately to `db.json`.

---

## 11. System Tab — Backup & Restore

### Export

| Format | Method | Contents |
|---|---|---|
| JSON | `GET /api/export` (server) or blob download (offline) | Full `db.json` — all data |
| CSV | Blob download | Bookings only (flat table) |

### Import

1. Choose a `.json` file exported from Mallo RMS.
2. A preview shows record counts in the file.
3. Choose **Merge** (additive — existing records kept, new ones added by ID) or **Replace** (full overwrite).

### Danger Zone (Admin only)

| Action | Effect |
|---|---|
| Load Sample Data | Adds 3 demo bookings and 3 demo guests |
| Reset All Data | Clears bookings, guests, tables, groups, audit log, and tags. Host accounts are preserved. |

---

## 12. Offline Fallback

If `GET /api/data` fails on startup (server not running), the app:

1. Logs a console warning
2. Reads from `localStorage` key `rtm_v2_mirror` (or legacy `rtm_v2`)
3. Shows a **red dot** in the header and System tab
4. Continues to mirror all saves to `localStorage`

When the server comes back online, a page refresh will load from `db.json` and resume normal operation.

---

## 13. Changelog

### v2.0.0 (Alpha) — May 3, 2026
- Redesigned Project Architecture - Data redundancy using db.json to accomodate backup from browser 'localstorage'
- Rebuilt Tech Stack - Express server using node.js serving the HTML index to initiate data redundancy. 

### v1.3.1 — May 1, 2026
- **Quick-switch PIN pad** — host chip in header is now a clickable button; PIN alone identifies the user, no dropdown required
- **Taken By auto-fill** — booking form reads active host from Login ID automatically
- **Customisable tags** — Details and Special Tags are fully editable (add/delete)
- **System tab** — Export (JSON/CSV), Import (merge or replace), Danger Zone (admin only)
- **Server-backed persistence** — data saved to `data/db.json` via local Express server; localStorage used as offline mirror

### v1.3.0
- Moderator panel with host accounts, roles, permissions
- Audit log
- Analytics dashboard
- Daily guest report with Excel export
- Live dining timers

### v1.2.x
- Guest history & autofill
- Floor plan zoom & pan
- Rescheduling modal
- Dark mode

---

*Mallo RMS is an internal proprietary tool for Mallo Trattoria Italiana. All rights reserved.*
