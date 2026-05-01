# Data Model

All application state is stored in `localStorage` under the key `rtm_state` as a serialised JSON object.

## Top-Level Shape

```json
{
  "bookings": [...],
  "tables":   [...],
  "groups":   [...],
  "guests":   [...]
}
```

---

## `bookings[]`

Each element represents one reservation.

```ts
interface Booking {
  id:           string;       // "b" + Date.now() — e.g. "b1712345678901"
  guestName:    string;       // Display name
  partySize:    number;       // Integer ≥ 1
  date:         string;       // ISO date "YYYY-MM-DD"
  time:         string;       // 24h "HH:MM"
  endTime:      string;       // 24h "HH:MM" | "" — stamped by End Service or Edit
  tableIds:     string[];     // Array of table IDs assigned to this booking
  notes:        string;       // Free text
  status:       "confirmed" | "seated" | "cancelled";
  phone:        string;       // Formatted "+62 ..." or raw
  email:        string;
  gender:       "male" | "female" | "other" | "";
  rsvp:         string;       // "Walkin" | "WhatsApp" | "Phone" | "Email" | "BOD" | "Staff" | "Other"
  takenBy:      string;       // Staff member who took the booking
  details:      string[];     // Special tags, e.g. ["Birthday", "BOD (10% Discount)"]
  rescheduled:  boolean;      // true if this booking was ever rescheduled
  originalDate: string;       // ISO date of original booking before reschedule
  cancelledAt:  string;       // ISO datetime when cancelled
}
```

### Notes
- `endTime` is set either manually via Edit Reservation or automatically via End Service.
- `tableIds` may be empty if no tables are assigned.
- `details` contains the values of checked tag checkboxes — both display tags (Birthday, Big Group) and discount tags (BOD, Friends & Family).

---

## `tables[]`

Each element represents one physical table on the floor plan.

```ts
interface Table {
  id:       string;       // "t" + Date.now()
  name:     string;       // "T1", "Bar 2", etc.
  shape:    "small" | "large";
  capacity: number;       // 2–4 for small, 6–8 for large
  x:        number;       // Left offset in pixels on floor plan canvas
  y:        number;       // Top offset in pixels on floor plan canvas
}
```

---

## `groups[]`

A group merges multiple tables into one bookable unit.

```ts
interface Group {
  id:       string;       // "grp" + Date.now()
  name:     string;       // "Event Section", "Long Table", etc.
  tableIds: string[];     // IDs of the member tables
}
```

### How groups work in bookings
When a group is selected in the table checklist, `booking.tableIds` is expanded to contain all individual table IDs from the group. The group itself is not stored on the booking — only its member tables.

---

## `guests[]`

Each element is a guest profile. Profiles are created and updated automatically when a booking is saved.

```ts
interface Guest {
  id:        string;      // "gu" + Date.now()
  key:       string;      // guestKey(name) — normalised lowercase, trimmed, used for dedup
  name:      string;      // Display name (latest casing from booking)
  phone:     string;      // Formatted "+62 ..."
  email:     string;
  gender:    "male" | "female" | "other" | "";
  notes:     string;      // Manual notes from Guest History edit
  tags:      string[];    // Special tags: ["Friends & Family (5% Discount)", "KOL", "BOD (10% Discount)"]
  firstSeen: string;      // ISO date of first booking creation
}
```

### Tag persistence rules
- Tags set in a booking's `details[]` that match the tracked set are merged into `guest.tags[]` on save.
- Tags can also be set directly via Guest History → Edit.
- Tags are additive — once added they persist unless removed via Edit.
- The tracked tags are: `"Friends & Family (5% Discount)"`, `"KOL"`, `"BOD (10% Discount)"`.

### Guest key
```js
function guestKey(name) {
  return name.trim().toLowerCase().replace(/\s+/g, ' ');
}
```
This is used to deduplicate guests across bookings. If a guest name matches an existing key, the existing profile is updated rather than creating a new one.

---

## State Size Considerations

`localStorage` has a 5MB cap across all keys. Typical usage:
- Each booking ~500 bytes JSON
- Each guest ~300 bytes JSON
- Each table ~100 bytes JSON

A restaurant running 50 bookings/day for 2 years ≈ 36,500 bookings ≈ ~18MB — approaching the limit. For high-volume operations, periodically export and archive historical data.

---

## Manual Data Access (DevTools)

```js
// Read state
const state = JSON.parse(localStorage.getItem('rtm_state'));
console.log(state.bookings.length);

// Backup state
const backup = localStorage.getItem('rtm_state');
// Paste into a .json file

// Restore state
localStorage.setItem('rtm_state', backup);
location.reload();

// Reset everything
localStorage.removeItem('rtm_state');
location.reload();
```
