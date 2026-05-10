# Changelog

All notable changes to **Mallo — Reservations** are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [1.4.2] — 2026-05-11

### Fixed
- **Booking persistence silently failing when `localStorage` is unavailable** ([#diagnostic-2026-05-11](./RELEASE_NOTES_v1.4.2.md))
  - `saveBooking()` no longer displays the "Reservation saved" / "Reservation updated"
    success toast unless data has actually been persisted to `localStorage`.
  - Resolves the long-standing issue where bookings created via **+ New Booking**
    appeared in the in-memory list and showed a green confirmation toast, but
    were not written to disk and disappeared on page reload.

### Changed
- `save()` (`index.html:1757`) now wraps `localStorage.setItem` in `try/catch`,
  returns a boolean success indicator, surfaces a `⚠️` warning toast on failure,
  and logs the underlying exception via `console.error` for diagnosability.
- `load()` (`index.html:1768`) now logs caught exceptions to `console.error`
  and surfaces a user-visible warning toast instead of swallowing failures silently.
- `saveBooking()` (`index.html:2285`) reordered: the success toast is gated on
  `save()` returning `true`. The `editId` state is captured into `wasEdit`
  before `closeModal()` resets it.
- Backup metadata `_version` field bumped from `1.3.1` to `1.4.2`
  (`exportSystemJSON`, `index.html:4819`).

### Notes
- No data migration required. Existing `localStorage` payloads under the
  `rtm_v2` key remain fully compatible.
- No schema changes. No API surface changes.
- The audit-log wrappers around `openModal` / `closeModal` / `saveBooking`
  (`index.html:4593–4648`) were investigated as part of the diagnostic and
  confirmed correct; no changes were required.

---

## [1.3.1] — Previous release

Baseline version prior to the persistence-resilience fix. See repository
history for prior changes.
