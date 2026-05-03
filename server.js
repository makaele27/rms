/**
 * Mallo RMS — Local Server
 * ────────────────────────
 * Serves the app and persists all data to data/db.json.
 *
 * Start:  node server.js
 * Then open:  http://localhost:3000
 */

const express  = require('express');
const fs       = require('fs');
const path     = require('path');

const app      = express();
const PORT     = 3000;
const DATA_DIR = path.join(__dirname, 'data');
const DB_FILE  = path.join(DATA_DIR, 'db.json');

// ── Ensure data/ directory exists ──
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

// ── Ensure db.json exists with default empty structure ──
if (!fs.existsSync(DB_FILE)) {
  const defaultDb = {
    _version:   '1.3.1',
    _created:   new Date().toISOString(),
    bookings:   [],
    guests:     [],
    tables:     [],
    groups:     [],
    hosts:      [],
    auditLog:   [],
    detailTags: ['Big Group','Birthday','Alcohol','Regular Guest','Friends & Family (5% Discount)','KOL','BOD (10% Discount)'],
    specialTags:['Friends & Family (5% Discount)','KOL','BOD (10% Discount)'],
  };
  fs.writeFileSync(DB_FILE, JSON.stringify(defaultDb, null, 2), 'utf8');
  console.log('[Mallo] Created fresh database at data/db.json');
}

// ── Middleware ──
app.use(express.json({ limit: '10mb' }));
app.use(express.static(path.join(__dirname, 'public')));

// ── API: Read all data ──
app.get('/api/data', (req, res) => {
  try {
    const raw = fs.readFileSync(DB_FILE, 'utf8');
    res.json(JSON.parse(raw));
  } catch (err) {
    console.error('[Mallo] Error reading db.json:', err.message);
    res.status(500).json({ error: 'Failed to read data' });
  }
});

// ── API: Write all data ──
app.post('/api/data', (req, res) => {
  try {
    const payload = req.body;
    payload._saved = new Date().toISOString();
    // Write atomically via a temp file then rename
    const tmp = DB_FILE + '.tmp';
    fs.writeFileSync(tmp, JSON.stringify(payload, null, 2), 'utf8');
    fs.renameSync(tmp, DB_FILE);
    res.json({ ok: true });
  } catch (err) {
    console.error('[Mallo] Error writing db.json:', err.message);
    res.status(500).json({ error: 'Failed to save data' });
  }
});

// ── API: Export — download db.json directly ──
app.get('/api/export', (req, res) => {
  const date = new Date().toISOString().slice(0, 10);
  res.download(DB_FILE, `mallo-backup-${date}.json`);
});

// ── API: Server status ──
app.get('/api/status', (req, res) => {
  try {
    const stat = fs.statSync(DB_FILE);
    const raw  = fs.readFileSync(DB_FILE, 'utf8');
    const db   = JSON.parse(raw);
    res.json({
      ok:         true,
      dbFile:     DB_FILE,
      dbSize:     stat.size,
      lastSaved:  db._saved || null,
      counts: {
        bookings:   (db.bookings   || []).length,
        guests:     (db.guests     || []).length,
        tables:     (db.tables     || []).length,
        hosts:      (db.hosts      || []).length,
        auditLog:   (db.auditLog   || []).length,
      },
    });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// ── Catch-all → serve the app ──
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ── Start ──
app.listen(PORT, () => {
  console.log('');
  console.log('  ╔═══════════════════════════════════╗');
  console.log('  ║       Mallo RMS  v1.3.1           ║');
  console.log('  ╠═══════════════════════════════════╣');
  console.log(`  ║  Open → http://localhost:${PORT}      ║`);
  console.log(`  ║  Data → data/db.json              ║`);
  console.log('  ╚═══════════════════════════════════╝');
  console.log('');
});
