# Feature Documentation

## Table of Contents
1. [Bookings](#bookings)
2. [Floor Plan Editor](#floor-plan-editor)
3. [Daily Summary](#daily-summary)
4. [Guest History](#guest-history)
5. [Analytics Dashboard](#analytics-dashboard)
6. [Reporting](#reporting)

---

## Bookings

### Creating a Reservation
Click **+ New Booking** from the Bookings tab. All fields:

| Field | Required | Notes |
|---|---|---|
| Guest Name | ✅ | Autofills from Guest History via phone/name/email |
| Phone | — | Formatted to Indonesian (+62) standard automatically |
| Email | — | Triggers autofill suggestions |
| Party Size | ✅ | Integer ≥ 1 |
| Date | ✅ | ISO date picker |
| Start Time | ✅ | HH:MM 24-hour |
| End Time | — | If set, used for conflict detection window; else defaults to 60-min block |
| RSVP Channel | — | WhatsApp / Phone / Email / Walk-in / BOD / Staff / Other |
| Status | — | Confirmed / Seated / Cancelled |
| Table(s) | — | Multi-select checklist; groups supported; conflicts shown inline |
| Notes | — | Free text |
| Special Tags | — | See Guest Tags |
| Taken By | — | Staff member name |

### Conflict Detection
When a time and end time are selected, tables already assigned to overlapping bookings are marked **Taken** in the checklist and cannot be selected.

Overlap is calculated as: two bookings conflict if one starts before the other ends (or before the 60-minute default block expires if no end time is set).

### Filters
- **Upcoming** — future bookings sorted chronologically
- **Today** — bookings for today's date
- **All** — full history, newest first
- **Date picker** — filter to any specific date

### Rescheduling
Click **Reschedule** on any booking. Enter the new date and time. The original date is preserved in `originalDate` on the booking record. Rescheduled bookings are labelled distinctly in the daily report.

---

## Floor Plan Editor

### Adding Tables
Click **+ Small Table** (2–4 seats) or **+ Large Table** (6–8 seats). An editor modal prompts for:
- Table name (e.g. "T1", "Bar 2")
- Capacity (within the size range)

Tables are placed at a default position and can be dragged anywhere on the canvas.

### Editing & Deleting
Click any table to open its editor. Change name, capacity, or delete it. Deleting a table removes it from all bookings.

### Merging Tables
Hold-click or tap to **select** multiple tables (they highlight in gold). Once two or more are selected, a **Merge** toolbar appears. Enter a group name (e.g. "Event Section") and confirm. Groups appear in the table checklist as a single bookable unit.

To unmerge, go to the **Table Groups** card below the floor plan and click **Unmerge**.

### Saving the Layout
Click **💾 Save Layout** to persist the current positions to localStorage.

---

## Daily Summary

### Date Picker
Select any date using the date input or click **Today**. All sections below update automatically.

### Stats Row
Four summary tiles:
- Total bookings for the day
- Total covers (pax)
- Seated count
- Cancelled count

### Booking Schedule
All bookings for the day sorted by start time. Each row shows:
- Start time and end time (or default block end)
- Guest name, party size, table(s)
- Status badge
- RSVP channel and notes
- Special tags
- Live elapsed timer (if status = Seated and no end time stamped)
- Total duration (if end time stamped)

**Inline controls per row:**
- ✏️ Edit — opens full reservation modal
- 🔄 Reschedule — opens reschedule modal
- 🏁 End Service — stamps current time as end time (with confirmation dialog)
- Status dropdown — change status immediately; Cancelled requires confirmation

### Table Status (Floor Plan)
Interactive miniature floor plan for the selected date. Tables are colour-coded:
- **Dark brown** — available (no bookings this day)
- **Terracotta** — has one or more bookings
- **Deep green + glow** — currently Seated with no end time (actively dining)
- **Sage green** — part of a merged group

Live timer (`⏱ 1h 24m`) ticks inside actively seated table tiles.

**Zoom & Pan Controls:**
- `−` / `+` buttons: step zoom by 20%
- Scroll wheel: zoom towards cursor
- Pinch gesture (touch): pinch-to-zoom
- Click + drag: pan the canvas
- Reset: return to 100% at origin
- Range: 50% to 300%

Click any table to open its day schedule popover.

---

## Guest History

### Profile Fields
Each guest profile stores:
- Name (used as the unique key, normalised to lowercase)
- Phone (formatted to +62 standard)
- Email
- Gender (Male / Female / Other)
- Notes (free text)
- Special Tags (Friends & Family, KOL, BOD)
- First seen date
- Full booking history (derived at render time from bookings array)

### Autofill
In the New Booking modal, typing in the **Phone**, **Name**, or **Email** field triggers a dropdown of matching guests. Selecting one fills all contact fields instantly and shows a banner with visit count.

### Special Tags
Tags are added to a profile in two ways:
1. Automatically when a booking with those tags is saved
2. Manually via Guest History → ✏️ Edit → Special Tags section

Tags display as coloured pills on the guest card:
- 👨‍👩‍👧 Friends & Family → green
- 📣 KOL → blue
- 👔 BOD → orange

### Sorting & Search
- Search by name, phone, or email (real-time filter)
- Sort by: Name A–Z, Most Visits, Most Recent

---

## Analytics Dashboard

Located at the top of the Reporting tab. Renders entirely client-side from `localStorage` data.

### Range Selector
Toggle between **7 Days**, **30 Days**, and **90 Days** (relative to today).

### KPI Tiles

| Tile | Formula |
|---|---|
| Total Bookings | Count of active bookings in range |
| Total Covers | Sum of `partySize` for active bookings |
| Cancellation Rate | `cancelled / total × 100` |
| Walk-ins | Count where `rsvp === 'Walkin'` |
| Avg Dining Time | Mean `endTime − startTime` for timed bookings |
| Rescheduled | Count where `rescheduled === true` |

### Charts

**Covers Over Time** (full-width sparkline)
One data point per calendar day in the selected range. Y-axis = total pax. Filled area gradient + polyline + hover tooltips via SVG `<title>`.

**Covers by Time Slot** (horizontal bar chart)
- Lunch: 10:00–17:59
- Dinner: 18:00–22:00
- Other: outside both windows

**Booking Status** (donut chart)
SVG pie/donut showing Active / Cancelled / Rescheduled proportions. Centre shows total count.

**Busiest Tables** (horizontal bar chart)
Top 6 tables ranked by booking count in range.

**Booking Channels** (horizontal bar chart)
RSVP source breakdown (WhatsApp, Phone, Walk-in, etc.).

**Top Guests** (horizontal bar chart)
Top 5 guests by visit count in the selected range.

---

## Reporting

### Daily Guest Report
Select a date. The report renders with:
- Full date header
- First guest in / last guest out times
- Lunch section (10:00–17:59): reservations, walk-ins, cancellations, reschedules with pax
- Dinner section (18:00–22:00): same breakdown
- Total all-day pax

**📋 Copy Report** — copies as plain text suitable for WhatsApp or messaging apps.

**⬇ Export Excel** — downloads an `.xlsx` file with the same data in a table format.

### Guest Data Export
Export the full guest history (all profiles and visit counts) as a CSV or Excel file for records or analysis in external tools.
