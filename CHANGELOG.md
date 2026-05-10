# Changelog

All notable changes to **Mallo — Reservations** are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [1.4.3] — 2026-05-11

### Changed
- **Persistence layer migrated from `localStorage` to IndexedDB** ([#release-1.4.3](./RELEASE_NOTES_v1.4.3.md))
  - IndexedDB is now the primary store for all application state
    (bookings, guests, tables, groups, hosts, audit log, custom tags).
  - Raises the practical storage ceiling from the ~5 MB `localStorage`
    quota to the much larger IndexedDB quota (typically 50 MB+, often
    much more depending on browser and available disk).
  - Eliminates the underlying condition that caused the v1.4.2 silent-save
    bug for users with long audit logs or heavy guest history.
- **`save()` is now debounced (150 ms).** Rapid successive calls
  (floor-plan editor, audit log appends, batch operations) coalesce into
  a single IndexedDB write. Reduces transaction overhead and disk I/O.
- **`save()` returns optimistically; outcomes update asynchronously.**
  Callers like `saveBooking()` continue to use the boolean return as a
  signal for success-toast gating. A failed write surfaces a deferred
  warning toast and updates `_lastSaveOk` for subsequent calls.
- `init()` is now `async` to allow `await loadAsync()` before any UI
  rendering. The legacy `initModerator()` IIFE has been converted to a
  named function called from `init()` after `loadAsync()` resolves —
  this fixes a latent race where `ensureModData()` could write defaults
  onto an `S` object that was about to be replaced.
- Backup metadata `_version` field bumped from `1.4.2` to `1.4.3`.

### Added
- **One-time auto-migration from legacy `localStorage`.** On first boot
  of v1.4.3, any existing `rtm_v2` payload in `localStorage` is read and
  written into IndexedDB. The legacy `localStorage` entry is deliberately
  left in place so users can roll back to v1.4.2 without data loss.
  A `rtm_v2_migrated` flag in `localStorage` ensures the import runs
  exactly once per origin.
- **localStorage emergency fallback.** If IndexedDB is unavailable
  (rare — some private/incognito configurations, certain enterprise
  lockdowns) the persistence layer transparently falls back to
  `localStorage` with the same error-handling behavior introduced in
  v1.4.2. If an IDB write later fails (quota, transaction abort), the
  failed payload is also written to `localStorage` as a last-resort
  catch.
- **`beforeunload` flush.** Pending debounced writes are flushed
  best-effort when the page unloads, reducing the risk of data loss
  if the user closes the tab within 150 ms of a save.
- **`saveNow()` helper** — public function that bypasses the debounce
  for callers that need synchronous flush semantics. Not called by
  default; available for future use in critical paths.

### Fixed
- A latent ordering race in `initModerator()` where `ensureModData()`
  could patch the *default* empty `S` before `load()` replaced it with
  the persisted state, silently dropping the patches. The new async
  `init()` orchestration prevents this.

### Notes
- **No user action required.** Existing v1.4.2 users will see their
  data automatically migrated on first load. The legacy `localStorage`
  copy is kept as a safety net.
- **Rollback path.** Users can downgrade to v1.4.2 without losing data
  because the legacy `localStorage` payload is preserved. They will,
  however, lose any changes made *after* upgrading to v1.4.3 (those
  live in IndexedDB only).
- No schema changes — the JSON shape stored under `rtm_v2` is identical
  to v1.4.2.

---

## [1.4.2] — 2026-05-11

### Fixed
- **Booking persistence silently failing when `localStorage` is unavailable**
  ([#release-1.4.2](./RELEASE_NOTES_v1.4.2.md))
  - `saveBooking()` no longer displays the "Reservation saved" /
    "Reservation updated" success toast unless data has actually been
    persisted to `localStorage`.
  - Resolves the long-standing issue where bookings created via
    **+ New Booking** appeared in the in-memory list and showed a green
    confirmation toast, but were not written to disk and disappeared on
    page reload.

### Changed
- `save()` now wraps `localStorage.setItem` in `try/catch`, returns a
  boolean success indicator, surfaces a `⚠️` warning toast on failure,
  and logs the underlying exception via `console.error`.
- `load()` now logs caught exceptions and surfaces a user-visible
  warning toast instead of swallowing failures silently.
- `saveBooking()` reordered: the success toast is gated on `save()`
  returning `true`. The `editId` state is captured into `wasEdit`
  before `closeModal()` resets it.
- Backup metadata `_version` field bumped from `1.3.1` to `1.4.2`.

### Notes
- No data migration required.
- No schema changes. No API surface changes.

---

## [1.3.1] — Previous release

Baseline version prior to the persistence-resilience fix. See repository
history for prior changes.
