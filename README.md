# Mallo RMS

**Reservation Management System — Mallo Trattoria Italiana**  
Version 1.3.1 · May 2026

---

## Quick Start

### Requirements
- [Node.js](https://nodejs.org) v18 or later

### Install & Run

```bash
cd mallo-rms
npm install
npm start
```

Then open **http://localhost:3000** in your browser.

```
  ╔═══════════════════════════════════╗
  ║       Mallo RMS  v1.3.1           ║
  ╠═══════════════════════════════════╣
  ║  Open → http://localhost:3000      ║
  ║  Data → data/db.json              ║
  ╚═══════════════════════════════════╝
```

---

## Project Structure

```
mallo-rms/
├── server.js               ← Local Express server
├── package.json
├── README.md               ← This file
├── DOCS.md                 ← Full technical documentation
├── RELEASE_NOTES_v1.3.1.md ← Latest release notes
├── data/
│   └── db.json             ← All data (auto-created on first run)
└── public/
    ├── index.html          ← The application
    └── brand/              ← Fonts and logos
```

---

## Data

All data is stored in **`data/db.json`** — a plain JSON file on disk.  
No database engine required.

| Data | Stored in |
|---|---|
| Reservations | `data/db.json` |
| Guest profiles | `data/db.json` |
| Floor plan | `data/db.json` |
| Host accounts & PINs | `data/db.json` |
| Audit log | `data/db.json` |
| Custom tags | `data/db.json` |

### Backup
Go to **System → Export Data → Download JSON Backup**, or copy `data/db.json` directly.

### Restore
Go to **System → Import Data** and choose your backup file, or replace `data/db.json` and restart.

---

## Development

```bash
npm run dev    # auto-restarts on file changes (uses nodemon)
```

---

## Offline Mode

If the server is not running, the app falls back to `localStorage` and shows a red dot in the header. A page refresh after restarting the server will re-sync from `data/db.json`.

---

## Documentation

See **[DOCS.md](./DOCS.md)** for:
- Full architecture overview
- Complete data model reference
- API endpoint reference
- Host accounts & authentication
- Tag system
- Backup & restore details
- Full changelog

---

*Internal tool — Mallo Trattoria Italiana. All rights reserved.*
