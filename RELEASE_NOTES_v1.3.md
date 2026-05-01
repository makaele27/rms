# Mallo RMS — Release Notes v1.3

**Mallo Trattoria Italiana · Reservation Management System**  
`v1.3.0` · Released May 1, 2026 · Stable

---

## What's new in v1.3

Version 1.3 introduces the **Moderator** tab — a new management layer designed for hosts and managers. It provides a secure, PIN-protected login system for individual host accounts, a members panel for managing team access and roles, and a full audit log that records every reservation change made within the system, attributed to the logged-in host.

> **Compatibility:** This is a patch on top of v1.2. All existing reservation, floor plan, guest, and reporting data is fully preserved. No migration required — the new `hosts` and `auditLog` arrays are appended to the existing data store automatically.

---

## Summary

| | |
|---|---|
| New Tab | 1 |
| New Features | 3 |
| Audit Action Types | 8 |
| Host Roles | 4 |
| Permissions | 5 |

---

## Feature 1a — Host Login System

### Host Account Creation & PIN Authentication `MOD-101`

Hosts can now create individual accounts with a name, role, and a 4-digit PIN. Each account is assigned a unique **Login ID** (a 4-digit numeric code) automatically on creation. The Login ID is permanent and used to attribute all actions to the correct host throughout the system.

- Create a host account with full name, role, and 4-digit PIN
- Login ID (`#XXXX`) is auto-generated and unique per host
- Login by selecting your account from the dropdown and entering your PIN
- Active host is shown in the top-right header bar with their name and Login ID badge
- Session persists across page refreshes (sessionStorage) and cleared on tab close
- One-click logout from the Accounts panel
- PIN can be changed at any time from the Members panel

> **Storage:** Host accounts are stored in `rtm_v2` localStorage under the `hosts` array. The active session is held in `sessionStorage` (key: `mallo_active_host`) so it survives refreshes but is cleared when the browser tab is closed. PINs are stored as plain strings — for production use, consider hashing.

### Active Host Attribution `MOD-102`

Once logged in, the active host's name and Login ID appear in the header bar on every page of the RMS. All reservation actions are automatically attributed to the currently logged-in host in the audit log.

- Header chip shows: active dot indicator, host name, and Login ID badge
- The "Reservation Taken By" dropdown is auto-populated with all registered host names
- If no host is logged in, audit events are attributed to *System*

---

## Feature 1b — Members & Permissions

### Members List with Roles & Permissions `MOD-201`

The Members sub-tab shows all registered host accounts as cards, displaying their role, Login ID, active status, and which permissions are enabled. Accounts can be edited or have their PIN changed directly from this panel.

#### Host Roles & Default Permissions

| Role | Bookings | Floor Plan | Guests | Reports | Moderator |
|---|:---:|:---:|:---:|:---:|:---:|
| Host | ✓ | ✓ | ✓ | — | — |
| Senior Host | ✓ | ✓ | ✓ | ✓ | — |
| Manager | ✓ | ✓ | ✓ | ✓ | ✓ |
| Admin | ✓ | ✓ | ✓ | ✓ | ✓ |

*Default permission sets by role. Individual permissions can be overridden per account.*

#### Permission Definitions

- **Manage Reservations** — create, edit, and delete bookings
- **Edit Floor Plan** — add, move, and delete tables
- **Manage Guests** — view and edit guest profiles
- **View Reports** — access analytics and exports
- **Moderator Access** — view the Moderator panel and audit log

### Account Management `MOD-202`

All account management is done from within the Moderator tab — no external admin panel required.

- Create new host accounts with full name, role, permissions, and PIN
- Edit existing accounts — update name, role, or permissions
- Change PIN at any time via the dedicated "Change PIN" modal
- Delete host accounts (existing audit log attribution is preserved)
- Active host indicator shown inline on their member card

---

## Feature 2 — Audit Log

### Reservation Change Tracking `MOD-301`

Every significant action taken within the RMS is now recorded in the audit log with a timestamp, action type, detail description, and the host who performed it. Entries are stored in reverse-chronological order and capped at 1,000 entries.

#### Tracked Action Types

| Action | Description |
|---|---|
| `CREATE` | New reservation or host account created |
| `UPDATE` | Reservation fields changed (name, date, time, party size, status) |
| `DELETE` | Reservation or host account removed |
| `STATUS` | Booking status changed via the Daily view status selector |
| `RESCHEDULE` | Reservation rescheduled to a new date or time |
| `END_SERVICE` | End Service button used to close a seated booking |
| `LOGIN` | Host logged in with their PIN |
| `LOGOUT` | Host logged out of their session |

### Filters & Export `MOD-302`

The audit log can be filtered by host and by action type, independently or in combination. Filters update instantly with no page reload.

- **Filter by host** — shows only entries from a specific host (dropdown auto-populates from log history)
- **Filter by action** — narrows entries by action type
- **Clear filters** — one-click reset to show all entries
- **Export to CSV** — downloads the full audit log as a `.csv` file with columns: Timestamp, Action, Details, Host, Login ID

> **Note:** The audit log export includes all 1,000 stored entries regardless of active filters.

---

## Technical Specification

| Property | Detail |
|---|---|
| Data store key | `rtm_v2` (localStorage) — existing key, new fields appended |
| New data fields | `S.hosts[]` — host account objects; `S.auditLog[]` — audit entry objects |
| Session key | `mallo_active_host` (sessionStorage) — clears on tab close |
| Host object schema | `{ id, name, role, pin, loginId, perms: { bookings, floorplan, guests, reports, moderator }, createdAt }` |
| Audit entry schema | `{ id, ts, action, details, hostId, hostName, loginId }` |
| Audit log cap | 1,000 entries (oldest trimmed automatically) |
| Login ID format | 4-digit numeric string, unique per account, auto-generated |
| PIN format | 4-digit numeric string (plain text — hash in production) |
| Backwards compat. | Full — missing arrays initialised on first access via `ensureModData()` |
| File | `Mallo Reservations.html` (patched in-place from v1.2) |
| Backup | `Mallo Reservations v1.3.html` — pre-patch snapshot preserved |

---

## Version History

### v1.3 — May 1, 2026
**Moderator Module.** Added Moderator tab with host login system (PIN authentication, Login IDs), members list with roles and permission management, and full audit log with filtering and CSV export. Active host shown in header on all views.

### v1.2 — Prior release
**Analytics Dashboard.** Added reporting view with 7/30/90-day KPI dashboard, sparkline charts, donut chart, top tables, RSVP channel breakdown, and daily guest report with Excel export.

### v1.1 — Prior release
**Guest Profiles & Rescheduling.** Added guest history, phone autofill, guest profile editor, reschedule modal with original date tracking, live dining timers, and floor plan zoom/pan.

### v1.0 — Initial release
**Core RMS.** Bookings management, floor plan editor with merge groups, daily summary view, print/PDF export, dark mode, conflict detection, and table assignment.

---

*Prepared for internal release — Mallo Trattoria Italiana*  
`v1.3.0 · May 2026 · Mallo RMS`
