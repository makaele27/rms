/**
 * Restaurant Table Manager — Application Logic
 */
'use strict';

// ════════════════════════════════════════════
//  STATE
// ════════════════════════════════════════════
const DEFAULT_TABLES = [
  // A-row (right column, top to bottom)
  { id:'a1',  name:'A1',  capacity:6, shape:'large', x:870, y:55  },
  { id:'a2',  name:'A2',  capacity:6, shape:'large', x:870, y:175 },
  { id:'a3',  name:'A3',  capacity:4, shape:'small', x:890, y:310 },
  { id:'a4',  name:'A4',  capacity:4, shape:'small', x:890, y:430 },
  { id:'a5',  name:'A5',  capacity:4, shape:'small', x:890, y:550 },
  // A-row (centre column, top to bottom)
  { id:'a10', name:'A10', capacity:4, shape:'small', x:720, y:80  },
  { id:'a11', name:'A11', capacity:4, shape:'small', x:590, y:80  },
  { id:'a9',  name:'A9',  capacity:2, shape:'small', x:700, y:200 },
  { id:'a8',  name:'A8',  capacity:6, shape:'large', x:620, y:330 },
  { id:'a7',  name:'A7',  capacity:2, shape:'small', x:660, y:470 },
  { id:'a6',  name:'A6',  capacity:4, shape:'small', x:660, y:590 },
  // B-row (left-centre column, top to bottom)
  { id:'b6',  name:'B6',  capacity:1, shape:'small', x:295, y:75  },
  { id:'b5',  name:'B5',  capacity:1, shape:'small', x:295, y:185 },
  { id:'b4',  name:'B4',  capacity:1, shape:'small', x:295, y:295 },
  { id:'b3',  name:'B3',  capacity:1, shape:'small', x:295, y:400 },
  { id:'b2',  name:'B2',  capacity:1, shape:'small', x:295, y:510 },
  { id:'b1',  name:'B1',  capacity:1, shape:'small', x:295, y:620 },
  // VIP (far left)
  { id:'vip', name:'VIP', capacity:8, shape:'large', x:55,  y:55  },
];

let S = {
  tables: JSON.parse(JSON.stringify(DEFAULT_TABLES)),
  bookings: [],
  groups: [],
  guests: [],
};

let currentFilter = 'upcoming';
let mergeMode = false;
let mergeSelected = [];
let editId = null;

// ════════════════════════════════════════════
//  PERSISTENCE
// ════════════════════════════════════════════
function save() { localStorage.setItem('rtm_v2', JSON.stringify(S)); }
function load() {
  try {
    const d = localStorage.getItem('rtm_v2');
    if (d) S = JSON.parse(d);
  } catch(e) {}
}

// ════════════════════════════════════════════
//  NAV
// ════════════════════════════════════════════
function switchView(view, tabEl) {
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
  document.querySelectorAll('.nav-tab').forEach(t => t.classList.remove('active'));
  document.getElementById('view-' + view).classList.add('active');
  if (tabEl) tabEl.classList.add('active');
  if (view !== 'daily') stopDiningTimers();
  if (view === 'floorplan') renderFP();
  if (view === 'bookings')  renderBookings();
  if (view === 'daily')     renderDaily();
  if (view === 'guests')    renderGuests();
  if (view === 'reporting') { setReportToday(); renderDailyReport(); renderDashboard(); }
}

// ════════════════════════════════════════════
//  FLOOR PLAN
// ════════════════════════════════════════════
function renderFP() {
  const fp = document.getElementById('floorPlan');
  // Preserve the static hint elements
  fp.innerHTML = '<div class="floor-title">DINING ROOM</div><div class="floor-hint">Drag tables to rearrange</div>';

  const todayStr = today();
  const nowMins  = timeToMins(new Date().toTimeString().slice(0,5));
  const bookedIds = new Set();
  S.bookings.forEach(b => {
    if (b.date !== todayStr || b.status === 'cancelled') return;
    const startM = timeToMins(b.time);
    const endM   = bookingEndMins(b);
    if (nowMins >= startM && nowMins < endM) {
      (b.tableIds||[]).forEach(id => bookedIds.add(id));
    }
  });

  S.tables.forEach(t => {
    const el = document.createElement('div');
    el.className = 'table-el ' + t.shape;
    el.id = 'te-' + t.id;
    el.style.left = t.x + 'px';
    el.style.top  = t.y + 'px';
    if (bookedIds.has(t.id)) el.classList.add('booked');
    else if (S.groups.some(g => g.tableIds.includes(t.id))) el.classList.add('in-group');
    el.innerHTML = `<div class="t-num">${t.name}</div><div class="t-cap">${t.capacity} seats</div>`;

    if (mergeMode) {
      el.style.cursor = 'pointer';
      el.onclick = () => toggleMergeSelect(t.id, el);
    } else {
      makeDraggable(el, t);
    }
    fp.appendChild(el);
  });

  renderGroups();
}

function makeDraggable(el, tableObj) {
  el.addEventListener('mousedown', e => {
    e.preventDefault();
    const fp = document.getElementById('floorPlan');
    const ox = e.clientX - tableObj.x;
    const oy = e.clientY - tableObj.y;
    let moved = false;

    const move = e2 => {
      const dx = Math.abs(e2.clientX - e.clientX);
      const dy = Math.abs(e2.clientY - e.clientY);
      if (dx > 4 || dy > 4) moved = true;
      if (!moved) return;
      let nx = e2.clientX - ox;
      let ny = e2.clientY - oy;
      nx = Math.max(0, Math.min(nx, fp.offsetWidth  - el.offsetWidth));
      ny = Math.max(0, Math.min(ny, fp.offsetHeight - el.offsetHeight));
      el.style.left = nx + 'px';
      el.style.top  = ny + 'px';
      tableObj.x = nx;
      tableObj.y = ny;
    };
    const up = () => {
      document.removeEventListener('mousemove', move);
      document.removeEventListener('mouseup', up);
      if (!moved) openEditTable(tableObj.id); // click (no drag) → edit
    };
    document.addEventListener('mousemove', move);
    document.addEventListener('mouseup', up);
  });
}

// ── Table editor modal ──
let tblEditId = null;
let tblSelectedSize = 'small';

function selectSize(s) {
  tblSelectedSize = s;
  document.getElementById('sizeSmall').classList.toggle('selected', s==='small');
  document.getElementById('sizeLarge').classList.toggle('selected', s==='large');
}

function openAddTable() {
  tblEditId = null;
  tblSelectedSize = 'small';
  selectSize('small');
  document.getElementById('tblModalTitle').textContent = 'Add New Table';
  document.getElementById('tName').value = 'T' + (S.tables.length + 1);
  document.getElementById('tCap').value  = '4';
  document.getElementById('tblDelBtn').style.display = 'none';
  document.getElementById('tableModal').classList.add('open');
}

function openEditTable(id) {
  const t = S.tables.find(x=>x.id===id);
  if (!t) return;
  tblEditId = id;
  tblSelectedSize = t.shape;
  selectSize(t.shape);
  document.getElementById('tblModalTitle').textContent = 'Edit Table';
  document.getElementById('tName').value = t.name;
  document.getElementById('tCap').value  = t.capacity;
  document.getElementById('tblDelBtn').style.display = 'inline-block';
  document.getElementById('tableModal').classList.add('open');
}

function closeTblModal() {
  document.getElementById('tableModal').classList.remove('open');
  tblEditId = null;
}

function saveTbl() {
  const name = document.getElementById('tName').value.trim();
  const cap  = parseInt(document.getElementById('tCap').value);
  if (!name)       { toast('Please enter a table name'); return; }
  if (!cap || cap<1){ toast('Please enter a valid capacity'); return; }

  if (tblEditId) {
    const t = S.tables.find(x=>x.id===tblEditId);
    if (t) { t.name = name; t.capacity = cap; t.shape = tblSelectedSize; }
    toast('Table updated');
  } else {
    const fp = document.getElementById('floorPlan');
    S.tables.push({
      id: 't' + Date.now(),
      name, capacity: cap,
      shape: tblSelectedSize,
      x: Math.min(60 + Math.random()*200, fp.offsetWidth - 120),
      y: Math.min(60 + Math.random()*200, fp.offsetHeight - 100),
    });
    toast('Table added');
  }
  save(); closeTblModal(); renderFP();
}

function deleteTable() {
  if (!tblEditId) return;
  const t = S.tables.find(x=>x.id===tblEditId);
  const name = t ? t.name : 'this table';

  // Check if table is used in any bookings
  const usedIn = S.bookings.filter(b => b.status !== 'cancelled' && (b.tableIds||[]).includes(tblEditId));
  if (usedIn.length) {
    const proceed = confirm(`"${name}" has ${usedIn.length} active booking(s).\nDeleting it won't delete the bookings but they'll lose their table assignment.\n\nDelete table anyway?`);
    if (!proceed) return;
    // Clear table from those bookings
    S.bookings.forEach(b => {
      if ((b.tableIds||[]).includes(tblEditId)) {
        b.tableIds = b.tableIds.filter(id => id !== tblEditId);
      }
    });
  } else {
    if (!confirm(`Delete table "${name}"? This cannot be undone.`)) return;
  }

  // Remove from groups too
  S.groups = S.groups
    .map(g => ({ ...g, tableIds: g.tableIds.filter(id => id !== tblEditId) }))
    .filter(g => g.tableIds.length >= 2);

  S.tables = S.tables.filter(t => t.id !== tblEditId);
  save(); closeTblModal(); renderFP(); toast(`"${name}" deleted`);
}

// Close table modal on backdrop click
document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('tableModal').addEventListener('click', function(e){
    if (e.target===this) closeTblModal();
  });
});

// ── Merge ──
function toggleMerge() {
  mergeMode = !mergeMode;
  mergeSelected = [];
  const btn = document.getElementById('mergeBtn');
  const bar = document.getElementById('mergeBar');
  btn.style.background = mergeMode ? 'var(--gold)' : '';
  btn.style.color      = mergeMode ? '#fff' : '';
  bar.classList.toggle('visible', mergeMode);
  renderFP();
}

function toggleMergeSelect(id, el) {
  const i = mergeSelected.indexOf(id);
  if (i === -1) { mergeSelected.push(id); el.classList.add('selected'); }
  else          { mergeSelected.splice(i,1); el.classList.remove('selected'); }
  document.getElementById('selCount').textContent = mergeSelected.length + ' selected';
}

function createGroup() {
  if (mergeSelected.length < 2) { toast('Select at least 2 tables'); return; }
  const names = mergeSelected.map(id => S.tables.find(t=>t.id===id)?.name).join('+');
  const cap   = mergeSelected.reduce((s,id)=>s+(S.tables.find(t=>t.id===id)?.capacity||0), 0);
  // Remove these tables from existing groups
  S.groups = S.groups.filter(g => !g.tableIds.some(id => mergeSelected.includes(id)));
  S.groups.push({ id:'g'+Date.now(), name:names, tableIds:[...mergeSelected], capacity:cap });
  save(); toast('Group ' + names + ' created — ' + cap + ' seats');
  cancelMerge();
}

function cancelMerge() {
  mergeMode = false;
  mergeSelected = [];
  document.getElementById('mergeBtn').style.background = '';
  document.getElementById('mergeBtn').style.color      = '';
  document.getElementById('mergeBar').classList.remove('visible');
  renderFP();
}

function deleteGroup(id) {
  S.groups = S.groups.filter(g => g.id !== id);
  save(); renderFP(); toast('Group removed');
}

function renderGroups() {
  const c = document.getElementById('groupsList');
  if (!c) return;
  if (!S.groups.length) {
    c.innerHTML = '<div class="empty" style="padding:18px;"><p>No merged groups yet — use Merge Mode to combine tables for larger parties.</p></div>';
    return;
  }
  c.innerHTML = S.groups.map(g => `
    <div class="group-item">
      <div style="display:flex;gap:5px;flex-wrap:wrap;">
        ${g.tableIds.map(id=>`<span class="g-tag">${S.tables.find(t=>t.id===id)?.name||id}</span>`).join('')}
      </div>
      <span style="font-size:0.8rem;color:var(--coffee);">${g.capacity} seats combined</span>
      <button class="btn btn-danger btn-sm" style="margin-left:auto;" onclick="deleteGroup('${g.id}')">Remove</button>
    </div>
  `).join('');
}

function saveLayout() { save(); toast('Layout saved!'); }
function resetLayout() {
  if (!confirm('Reset all tables to default positions?')) return;
  S.tables = JSON.parse(JSON.stringify(DEFAULT_TABLES));
  save(); renderFP(); toast('Layout reset');
}

// ════════════════════════════════════════════
//  BOOKINGS LIST
// ════════════════════════════════════════════
function setFilter(f, btn) {
  currentFilter = f;
  document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active-filter'));
  document.querySelectorAll('.filter-btn').forEach(b => { b.style.background=''; b.style.color=''; });
  if (btn) { btn.style.background='var(--espresso)'; btn.style.color='var(--cream)'; }
  renderBookings();
}

function renderBookings() {
  const c = document.getElementById('bookingsList');
  const todayS = today();
  const filterDateVal = document.getElementById('filterDate')?.value;

  let list = [...S.bookings];
  if      (currentFilter === 'today')    list = list.filter(b => b.date === todayS);
  else if (currentFilter === 'upcoming') list = list.filter(b => b.date >= todayS && b.status !== 'cancelled');
  else if (currentFilter === 'date' && filterDateVal) list = list.filter(b => b.date === filterDateVal);

  list.sort((a,b) => (a.date+a.time).localeCompare(b.date+b.time));

  if (!list.length) {
    c.innerHTML = '<div class="empty"><div class="icon">📅</div><p>No reservations found for this filter.</p></div>';
    return;
  }

  const grouped = {};
  list.forEach(b => { (grouped[b.date] = grouped[b.date]||[]).push(b); });

  c.innerHTML = Object.entries(grouped).map(([date, bks]) => `
    <div style="margin-bottom:24px;">
      <div class="date-group-label">${fmtDateLabel(date)}</div>
      ${bks.map(bookingRow).join('')}
    </div>
  `).join('');
}

function bookingRow(b) {
  const tLabel = tableLabel(b.tableIds);
  const timeRange = b.endTime
    ? `${fmtTime(b.time)} <span style="opacity:0.55;font-size:0.78rem;">–</span> ${fmtTime(b.endTime)}`
    : fmtTime(b.time);
  const contactBits = [b.phone ? '📞 '+esc(b.phone) : '', b.email ? '✉️ '+esc(b.email) : ''].filter(Boolean).join(' &nbsp;·&nbsp; ');
  const detailPills = (b.details||[]).map(d => `<span style="display:inline-block;padding:2px 8px;background:#fff3e0;color:#e65100;border-radius:10px;font-size:0.68rem;font-weight:600;margin-right:4px;">${esc(d)}</span>`).join('');
  const metaBits = [
    b.rsvp    ? '📨 '+esc(b.rsvp)    : '',
    b.takenBy ? '👤 '+esc(b.takenBy) : '',
  ].filter(Boolean).join(' &nbsp;·&nbsp; ');
  return `
    <div class="booking-item ${b.status==='cancelled'?'cancelled':''}">
      <div class="booking-time" style="min-width:80px;">${timeRange}</div>
      <div style="flex:1;min-width:0;">
        <div class="booking-name">${esc(b.guestName)}${b.gender ? ' <span style="font-size:0.72rem;color:var(--coffee);font-weight:400;">('+esc(b.gender)+')</span>' : ''}</div>
        <div class="booking-detail">👥 ${b.partySize} guests &nbsp;·&nbsp; ${tLabel}${b.notes?' &nbsp;·&nbsp; 📝 '+esc(b.notes):''}</div>
        ${contactBits ? `<div class="booking-detail" style="margin-top:2px;">${contactBits}</div>` : ''}
        ${detailPills ? `<div style="margin-top:5px;">${detailPills}</div>` : ''}
        ${metaBits    ? `<div class="booking-detail" style="margin-top:3px;opacity:0.7;">${metaBits}</div>` : ''}
      </div>
      <span class="booking-badge badge-${b.status}">${cap(b.status)}</span>
      <div class="booking-actions">
        <button class="btn btn-secondary btn-sm" onclick="openModal('${b.id}')">Edit</button>
      </div>
    </div>
  `;
}

function tableLabel(ids) {
  if (!ids || !ids.length) return '<em style="opacity:.6;">No table</em>';
  const g = S.groups.find(g => arrEq(g.tableIds, ids));
  if (g) return 'Group ' + g.name;
  return ids.map(id => S.tables.find(t=>t.id===id)?.name||id).join(' + ');
}

// ════════════════════════════════════════════
//  BOOKING MODAL
// ════════════════════════════════════════════
function openModal(id) {
  editId = id || null;
  document.getElementById('delBtn').style.display   = id ? 'inline-block' : 'none';
  document.getElementById('modalTitle').textContent = id ? 'Edit Reservation' : 'New Reservation';

  if (id) {
    const b = S.bookings.find(x=>x.id===id);
    if (!b) return;
    document.getElementById('fName').value    = b.guestName;
    document.getElementById('fSize').value    = b.partySize;
    document.getElementById('fDate').value    = b.date;
    document.getElementById('fTime').value    = b.time;
    document.getElementById('fNotes').value   = b.notes||'';
    document.getElementById('fStatus').value  = b.status;
    document.getElementById('fPhone').value   = b.phone||'';
    document.getElementById('fEmail').value   = b.email||'';
    document.getElementById('fGender').value  = b.gender||'';
    document.getElementById('fRsvp').value    = b.rsvp||'';
    document.getElementById('fTakenBy').value = b.takenBy||'';
    document.getElementById('fEndTime').value = b.endTime||'';
    // Details checkboxes
    const details = b.details||[];
    document.querySelectorAll('#fDetails input[type=checkbox]').forEach(cb => {
      cb.checked = details.includes(cb.value);
    });
    refreshTableSelect(b.tableIds);
  } else {
    document.getElementById('fName').value    = '';
    document.getElementById('fSize').value    = '';
    document.getElementById('fDate').value    = today();
    document.getElementById('fTime').value    = '19:00';
    document.getElementById('fNotes').value   = '';
    document.getElementById('fStatus').value  = 'confirmed';
    document.getElementById('fPhone').value   = '';
    document.getElementById('fEmail').value   = '';
    document.getElementById('fGender').value  = '';
    document.getElementById('fRsvp').value    = '';
    document.getElementById('fTakenBy').value = '';
    document.getElementById('fEndTime').value  = '';
    document.querySelectorAll('#fDetails input[type=checkbox]').forEach(cb => { cb.checked = false; });
    document.getElementById('autofillBanner').classList.remove('visible');
    refreshTableSelect();
  }
  document.getElementById('bookingModal').classList.add('open');
}

function closeModal() {
  document.getElementById('bookingModal').classList.remove('open');
  document.getElementById('autofillBanner').classList.remove('visible');
  document.getElementById('phoneSuggestions').classList.remove('open');
  document.getElementById('nameSuggestions').classList.remove('open');
  document.getElementById('emailSuggestions').classList.remove('open');
  editId = null;
}

// ════════════════════════════════════════════
//  TIME CONFLICT (60-min block)
// ════════════════════════════════════════════
const BLOCK_MINS = 60;

function timeToMins(t) {
  if (!t) return 0;
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}

// Returns the effective end time in minutes for a booking
// Uses explicit endTime if set, otherwise start + BLOCK_MINS
function bookingEndMins(b) {
  if (b.endTime) return timeToMins(b.endTime);
  return timeToMins(b.time) + BLOCK_MINS;
}

// Returns true if a NEW booking interval [newStart, newEnd) overlaps with existing booking b
function timesOverlap(newTime, newEndTime, existBooking) {
  const newStart = timeToMins(newTime);
  const newEnd   = newEndTime ? timeToMins(newEndTime) : newStart + BLOCK_MINS;
  const exStart  = timeToMins(existBooking.time);
  const exEnd    = bookingEndMins(existBooking);
  // Overlap if intervals intersect (exclusive end)
  return newStart < exEnd && newEnd > exStart;
}

// Collect all table IDs that are blocked at `date` + `newTime` (excluding `skipId` booking)
function takenAt(date, newTime, skipId, newEndTime) {
  const taken = new Set();
  S.bookings.forEach(b => {
    if (b.id === skipId || b.status === 'cancelled') return;
    if (b.date !== date) return;
    if (timesOverlap(newTime, newEndTime, b)) {
      (b.tableIds||[]).forEach(id => taken.add(id));
    }
  });
  return taken;
}

function refreshTableSelect(preselected) {
  const date    = document.getElementById('fDate').value;
  const time    = document.getElementById('fTime').value;
  const endTime = document.getElementById('fEndTime').value;
  const list    = document.getElementById('tableChecklist');
  const note    = document.getElementById('conflictNote');

  // Collect taken table IDs using actual time window
  const taken = takenAt(date, time, editId, endTime);

  // Build a map: tableId → "until HH:MM" label for UI
  function blockedUntilLabel(tableId) {
    let earliest = null;
    S.bookings.forEach(b => {
      if (b.id === editId || b.status === 'cancelled' || b.date !== date) return;
      if ((b.tableIds||[]).includes(tableId) && timesOverlap(time, endTime, b)) {
        const end = bookingEndMins(b);
        if (earliest === null || end < earliest) earliest = end;
      }
    });
    if (earliest === null) return '';
    const hh = String(Math.floor(earliest/60) % 24).padStart(2,'0');
    const mm = String(earliest % 60).padStart(2,'0');
    return `Until ${hh}:${mm}`;
  }

  // Pre-selected set (individual table IDs)
  const pre = new Set(preselected||[]);

  let html = '';

  // Sort helper: A1–B6 alphabetically, VIP always last
  function tableSort(a, b) {
    const isVipA = a.name.toUpperCase() === 'VIP';
    const isVipB = b.name.toUpperCase() === 'VIP';
    if (isVipA && isVipB) return 0;
    if (isVipA) return 1;
    if (isVipB) return -1;
    return a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' });
  }

  // Individual tables not belonging to any group, sorted A1-B6 then VIP
  const sortedTables = [...S.tables].filter(t => !S.groups.some(g=>g.tableIds.includes(t.id))).sort(tableSort);
  sortedTables.forEach(t => {
    const isTaken   = taken.has(t.id);
    const isChecked = pre.has(t.id);
    const untilLbl  = isTaken && !isChecked ? blockedUntilLabel(t.id) : '';
    html += `
      <label class="tck-item${isTaken&&!isChecked?' tck-disabled':''}">
        <input type="checkbox" class="tck-cb" value="${t.id}" ${isChecked?'checked':''} ${isTaken&&!isChecked?'disabled':''}>
        <span class="tck-name">${esc(t.name)}</span>
        <span class="tck-cap">${t.capacity} seats</span>
        ${isTaken&&!isChecked ? `<span class="tck-taken">Taken${untilLbl?' · '+untilLbl:''}</span>` : ''}
      </label>`;
  });

  // Groups
  S.groups.forEach(g => {
    const isTaken   = g.tableIds.some(id=>taken.has(id));
    const isChecked = g.tableIds.every(id=>pre.has(id)) && g.tableIds.length > 0;
    const tableNames = g.tableIds.map(id=>S.tables.find(t=>t.id===id)?.name||id).join(', ');
    const untilLbl  = isTaken && !isChecked ? blockedUntilLabel(g.tableIds.find(id=>taken.has(id))) : '';
    html += `
      <label class="tck-item${isTaken&&!isChecked?' tck-disabled':''}" title="${tableNames}">
        <input type="checkbox" class="tck-cb tck-grp" value="grp:${g.id}" ${isChecked?'checked':''} ${isTaken&&!isChecked?'disabled':''}>
        <span class="tck-name">${esc(g.name)}</span>
        <span class="tck-group-tag">group</span>
        <span class="tck-cap">${g.capacity} seats</span>
        ${isTaken&&!isChecked ? `<span class="tck-taken">Taken${untilLbl?' · '+untilLbl:''}</span>` : ''}
      </label>`;
  });

  list.innerHTML = html || '<div style="padding:12px;font-size:0.84rem;color:var(--coffee);opacity:.7;">No tables defined yet — add them in Floor Plan.</div>';
  const window = endTime ? `${fmtTime(time)} – ${fmtTime(endTime)}` : `${fmtTime(time)} (60-min default block)`;
  note.textContent = time ? `Tables with overlapping bookings during ${window} are marked Taken.` : '';
}

function saveBooking() {
  const name    = document.getElementById('fName').value.trim();
  const size    = parseInt(document.getElementById('fSize').value);
  const date    = document.getElementById('fDate').value;
  const time    = document.getElementById('fTime').value;
  const endTime = document.getElementById('fEndTime').value;
  const notes   = document.getElementById('fNotes').value.trim();
  const status  = document.getElementById('fStatus').value;
  const phone   = formatPhone(document.getElementById('fPhone').value.trim());
  const email   = document.getElementById('fEmail').value.trim();
  const gender  = document.getElementById('fGender').value;
  const rsvp    = document.getElementById('fRsvp').value;
  const takenBy = document.getElementById('fTakenBy').value;
  const details = [...document.querySelectorAll('#fDetails input[type=checkbox]:checked')].map(cb => cb.value);

  if (!name)          { toast('Please enter a guest name'); return; }
  if (!size || size<1){ toast('Please enter a valid party size'); return; }
  if (!date)          { toast('Please select a date'); return; }
  if (!time)          { toast('Please select a start time'); return; }
  if (endTime && timeToMins(endTime) <= timeToMins(time)) {
    toast('End time must be after start time'); return;
  }

  // Collect checked items and expand groups to individual table IDs
  const checked = [...document.querySelectorAll('.tck-cb:checked')];
  const tableIds = [];
  checked.forEach(cb => {
    if (cb.value.startsWith('grp:')) {
      const g = S.groups.find(g=>g.id===cb.value.replace('grp:',''));
      if (g) g.tableIds.forEach(id=>{ if (!tableIds.includes(id)) tableIds.push(id); });
    } else {
      if (!tableIds.includes(cb.value)) tableIds.push(cb.value);
    }
  });

  const record = { guestName:name, partySize:size, date, time, endTime: endTime||'', tableIds, notes, status, phone, email, gender, rsvp, takenBy, details };

  if (editId) {
    const i = S.bookings.findIndex(b=>b.id===editId);
    if (i!==-1) S.bookings[i] = { ...S.bookings[i], ...record };
    toast('Reservation updated');
  } else {
    S.bookings.push({ id:'b'+Date.now(), ...record });
    toast('Reservation saved');
  }

  // Update guest profile (including special tags)
  upsertGuest({ name, phone, email, gender, tags: details });

  save(); closeModal(); renderBookings();
  // Keep Daily Summary and its live timers in sync if it is active
  if (document.getElementById('view-daily').classList.contains('active')) {
    renderDaily();
  }
}

function deleteBooking() {
  if (!editId) return;
  if (!confirm('Delete this reservation?')) return;
  S.bookings = S.bookings.filter(b=>b.id!==editId);
  save(); closeModal(); renderBookings(); toast('Reservation deleted');
  if (document.getElementById('view-daily').classList.contains('active')) {
    renderDaily();
  }
}

function changeStatusFromDaily(id, newStatus) {
  const b = S.bookings.find(x => x.id === id);
  if (!b) return;
  const prev = b.status;
  if (newStatus === prev) return;

  if (newStatus === 'cancelled') {
    if (!confirm(`Cancel reservation for ${b.guestName} at ${fmtTime(b.time)}?\n\nThis will be recorded in their guest history.`)) {
      renderDaily(); // re-render to reset dropdown
      return;
    }
    b.cancelledAt = new Date().toISOString();
  }

  b.status = newStatus;
  save();
  renderDaily();
  renderBookings();
  const labels = { confirmed: 'Confirmed', seated: 'Seated', cancelled: 'Cancelled' };
  toast(`${b.guestName} → ${labels[newStatus]}`);
}

// ════════════════════════════════════════════
//  END SERVICE
// ════════════════════════════════════════════
function endService(id) {
  const b = S.bookings.find(x => x.id === id);
  if (!b || b.status === 'cancelled') return;

  const now = new Date();
  const hh  = String(now.getHours()).padStart(2, '0');
  const mm  = String(now.getMinutes()).padStart(2, '0');
  const endTime = `${hh}:${mm}`;

  // Validate: end time must be after start time
  if (timeToMins(endTime) <= timeToMins(b.time)) {
    toast('End time is before or equal to start time — please check the clock');
    return;
  }

  if (!confirm(`End service for ${b.guestName} at ${fmtTime(b.time)}?\n\nThis will stamp the end time as ${endTime}.`)) return;

  b.endTime = endTime;
  save();
  renderDaily();
  renderBookings();

  // Calculate duration for the toast
  const durMins = timeToMins(endTime) - timeToMins(b.time);
  const durH = Math.floor(durMins / 60);
  const durM = durMins % 60;
  const durLabel = durH > 0 ? `${durH}h ${durM}m` : `${durM}m`;
  toast(`✅ ${b.guestName} — service ended at ${endTime} (${durLabel})`);
}

// ════════════════════════════════════════════
//  FLOOR PLAN ZOOM & PAN
// ════════════════════════════════════════════
let _fpZoom = 1;
const FP_ZOOM_MIN = 0.5;
const FP_ZOOM_MAX = 3;
const FP_ZOOM_STEP = 0.2;
let _fpPan = { x: 0, y: 0 };
let _fpDrag = null;

function _applyFpTransform() {
  const inner = document.getElementById('fpZoomInner');
  const lbl   = document.getElementById('fpZoomLabel');
  if (!inner) return;
  inner.style.transform = `translate(${_fpPan.x}px,${_fpPan.y}px) scale(${_fpZoom})`;
  if (lbl) lbl.textContent = Math.round(_fpZoom * 100) + '%';
}

function _clampPan() {
  const wrap  = document.getElementById('fpZoomWrap');
  const inner = document.getElementById('fpZoomInner');
  if (!wrap || !inner) return;
  const wW = wrap.offsetWidth;
  const wH = wrap.offsetHeight;
  const iW = (inner.offsetWidth  || 1000) * _fpZoom;
  const iH = (inner.offsetHeight || 700)  * _fpZoom;
  const minX = Math.min(0, wW - iW);
  const minY = Math.min(0, wH - iH);
  _fpPan.x = Math.max(minX, Math.min(0, _fpPan.x));
  _fpPan.y = Math.max(minY, Math.min(0, _fpPan.y));
}

function fpZoomIn()    { _fpZoom = Math.min(FP_ZOOM_MAX, parseFloat((_fpZoom + FP_ZOOM_STEP).toFixed(2))); _clampPan(); _applyFpTransform(); }
function fpZoomOut()   { _fpZoom = Math.max(FP_ZOOM_MIN, parseFloat((_fpZoom - FP_ZOOM_STEP).toFixed(2))); _clampPan(); _applyFpTransform(); }
function fpZoomReset() { _fpZoom = 1; _fpPan = { x:0, y:0 }; _applyFpTransform(); }

function _initFpZoom() {
  const wrap = document.getElementById('fpZoomWrap');
  if (!wrap || wrap._zoomBound) return;
  wrap._zoomBound = true;

  // Mouse wheel zoom
  wrap.addEventListener('wheel', e => {
    e.preventDefault();
    const rect = wrap.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    const prevZoom = _fpZoom;
    if (e.deltaY < 0) _fpZoom = Math.min(FP_ZOOM_MAX, parseFloat((_fpZoom + FP_ZOOM_STEP).toFixed(2)));
    else              _fpZoom = Math.max(FP_ZOOM_MIN, parseFloat((_fpZoom - FP_ZOOM_STEP).toFixed(2)));
    // Zoom towards cursor
    const zRatio = _fpZoom / prevZoom;
    _fpPan.x = mx - zRatio * (mx - _fpPan.x);
    _fpPan.y = my - zRatio * (my - _fpPan.y);
    _clampPan();
    _applyFpTransform();
  }, { passive: false });

  // Touch pinch zoom
  let _touches = [];
  let _pinchDist0 = null;
  let _pinchZoom0 = 1;
  wrap.addEventListener('touchstart', e => {
    _touches = Array.from(e.touches);
    if (_touches.length === 2) {
      const dx = _touches[0].clientX - _touches[1].clientX;
      const dy = _touches[0].clientY - _touches[1].clientY;
      _pinchDist0 = Math.sqrt(dx*dx + dy*dy);
      _pinchZoom0 = _fpZoom;
    }
  }, { passive: true });
  wrap.addEventListener('touchmove', e => {
    if (e.touches.length === 2) {
      e.preventDefault();
      const t = Array.from(e.touches);
      const dx = t[0].clientX - t[1].clientX;
      const dy = t[0].clientY - t[1].clientY;
      const dist = Math.sqrt(dx*dx + dy*dy);
      _fpZoom = Math.max(FP_ZOOM_MIN, Math.min(FP_ZOOM_MAX, _pinchZoom0 * dist / _pinchDist0));
      _clampPan(); _applyFpTransform();
    }
  }, { passive: false });

  // Mouse drag pan
  wrap.addEventListener('mousedown', e => {
    if (e.button !== 0) return;
    _fpDrag = { sx: e.clientX - _fpPan.x, sy: e.clientY - _fpPan.y };
  });
  window.addEventListener('mousemove', e => {
    if (!_fpDrag) return;
    _fpPan.x = e.clientX - _fpDrag.sx;
    _fpPan.y = e.clientY - _fpDrag.sy;
    _clampPan();
    _applyFpTransform();
  });
  window.addEventListener('mouseup', () => { _fpDrag = null; });
}

// ════════════════════════════════════════════
//  LIVE DINING TIMER
// ════════════════════════════════════════════
let _diningTimerInterval = null;

function calcDuration(startTime, endTime) {
  const s = timeToMins(startTime);
  const e = timeToMins(endTime);
  const d = Math.max(0, e - s);
  const h = Math.floor(d / 60);
  const m = d % 60;
  return h > 0 ? `${h}h ${String(m).padStart(2,'0')}m` : `${m}m`;
}

function liveElapsed(startTime, startDate) {
  // Build a Date from date + startTime, then diff against now
  const [sh, sm] = startTime.split(':').map(Number);
  const base = new Date(startDate + 'T' + startTime + ':00');
  const diffMs = Date.now() - base.getTime();
  if (diffMs < 0) return '0m';
  const totalMins = Math.floor(diffMs / 60000);
  const h = Math.floor(totalMins / 60);
  const m = totalMins % 60;
  return h > 0 ? `${h}h ${String(m).padStart(2,'0')}m` : `${m}m`;
}

function tickDiningTimers() {
  // ── Schedule rows ──
  document.querySelectorAll('.live-timer[data-timer-start]').forEach(el => {
    const start = el.getAttribute('data-timer-start');
    const date  = el.getAttribute('data-timer-date');
    const val   = el.querySelector('.timer-val');
    if (val) val.textContent = liveElapsed(start, date);
  });
  // ── Floor plan table tiles ──
  document.querySelectorAll('.tbl-timer[data-fp-timer-start]').forEach(el => {
    const start = el.getAttribute('data-fp-timer-start');
    const date  = el.getAttribute('data-fp-timer-date');
    el.textContent = '⏱ ' + liveElapsed(start, date);
  });
}

function startDiningTimers() {
  stopDiningTimers();
  tickDiningTimers(); // immediate first tick
  _diningTimerInterval = setInterval(tickDiningTimers, 30000); // tick every 30s
}

function stopDiningTimers() {
  if (_diningTimerInterval) { clearInterval(_diningTimerInterval); _diningTimerInterval = null; }
}

// ════════════════════════════════════════════
//  RESCHEDULE
// ════════════════════════════════════════════
let rescheduleId = null;

function openRescheduleModal(id) {
  const b = S.bookings.find(x => x.id === id);
  if (!b) return;
  rescheduleId = id;
  document.getElementById('rescheduleGuestInfo').innerHTML =
    `<strong>${esc(b.guestName)}</strong> &nbsp;·&nbsp; ${b.partySize} guests &nbsp;·&nbsp; ${tableLabel(b.tableIds)}<br>
     <span style="color:var(--coffee);font-size:0.82rem;">Currently: ${fmtDateLabel(b.date)} at ${fmtTime(b.time)}${b.endTime ? ' – ' + fmtTime(b.endTime) : ''}</span>`;
  document.getElementById('rsDate').value    = b.date;
  document.getElementById('rsTime').value    = b.time;
  document.getElementById('rsEndTime').value = b.endTime || '';
  document.getElementById('rescheduleModal').classList.add('open');
}

function closeRescheduleModal() {
  document.getElementById('rescheduleModal').classList.remove('open');
  rescheduleId = null;
}

function confirmReschedule() {
  const b = S.bookings.find(x => x.id === rescheduleId);
  if (!b) return;
  const newDate    = document.getElementById('rsDate').value;
  const newTime    = document.getElementById('rsTime').value;
  const newEndTime = document.getElementById('rsEndTime').value;
  if (!newDate) { toast('Please select a new date'); return; }
  if (!newTime) { toast('Please select a new time'); return; }
  if (newEndTime && timeToMins(newEndTime) <= timeToMins(newTime)) {
    toast('End time must be after start time'); return;
  }
  // Same date + time = no change
  if (newDate === b.date && newTime === b.time) {
    toast('New date/time is the same as the current one'); return;
  }
  // Store original date/time if not already rescheduled
  if (!b.rescheduled) {
    b.originalDate = b.date;
    b.originalTime = b.time;
  }
  b.date       = newDate;
  b.time       = newTime;
  b.endTime    = newEndTime || '';
  b.rescheduled = true;
  b.rescheduledAt = new Date().toISOString();
  save();
  closeRescheduleModal();
  renderDaily();
  renderBookings();
  toast(`Rescheduled ${b.guestName} to ${fmtDateLabel(newDate)} at ${fmtTime(newTime)}`);
}

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('rescheduleModal').addEventListener('click', function(e) {
    if (e.target === this) closeRescheduleModal();
  });
});

// ════════════════════════════════════════════
//  DAILY SUMMARY
// ════════════════════════════════════════════
function setDailyToday() {
  document.getElementById('summaryDate').value = today();
  renderDaily();
}

function renderDaily() {
  const date = document.getElementById('summaryDate').value;
  if (!date) return;

  const bks = S.bookings.filter(b => b.date === date)
                         .sort((a, b) => a.time.localeCompare(b.time));
  const activeBks = bks.filter(b => b.status !== 'cancelled');

  const covers   = activeBks.reduce((s, b) => s + b.partySize, 0);
  const totalCap = S.tables.reduce((s, t) => s + t.capacity, 0);

  document.getElementById('dailyStats').innerHTML = `
    <div class="stat-card"><div class="stat-val">${activeBks.length}</div><div class="stat-label">Bookings</div></div>
    <div class="stat-card"><div class="stat-val">${covers}</div><div class="stat-label">Covers</div></div>
    <div class="stat-card"><div class="stat-val">${totalCap}</div><div class="stat-label">Total Seats</div></div>
    <div class="stat-card"><div class="stat-val">${totalCap ? Math.round(covers / totalCap * 100) : 0}%</div><div class="stat-label">Occupancy</div></div>
  `;

  // ── Booking schedule list ──
  const sched = document.getElementById('dailySchedule');
  sched.innerHTML = !bks.length
    ? '<div class="empty" style="padding:20px;"><p>No bookings on this day.</p></div>'
    : bks.map(b => {
      const rowBg = b.status === 'cancelled' ? 'background:#fff8f8;opacity:0.85;' : b.status === 'seated' ? 'background:#f6fbf6;' : '';
      return `
      <div class="schedule-row" id="srow-${b.id}" style="${rowBg}">
        <div class="sched-time" style="${b.status==='cancelled'?'text-decoration:line-through;opacity:0.5;':''}">${fmtTime(b.time)}${b.endTime ? '<br><span style="font-size:0.72rem;opacity:0.7;">'+fmtTime(b.endTime)+'</span>' : ''}</div>
        <div style="flex:1;">
          <div class="sched-name" style="${b.status==='cancelled'?'text-decoration:line-through;opacity:0.55;':''}">${esc(b.guestName)}</div>
          <div class="sched-detail">
            👥 ${b.partySize} guests &nbsp;·&nbsp; ${tableLabel(b.tableIds)}
            ${b.status !== 'cancelled' ? `<span style="display:inline-block;margin-left:6px;padding:2px 7px;background:#fff3e0;color:#e65100;border-radius:8px;font-size:0.7rem;font-weight:600;">🕐 Until ${blockedUntil(b)}</span>` : '<span style="display:inline-block;margin-left:6px;padding:2px 7px;background:#ffebee;color:#c62828;border-radius:8px;font-size:0.7rem;font-weight:600;">Cancelled</span>'}
            ${b.notes ? '<br>📝 ' + esc(b.notes) : ''}
            ${(b.details||[]).map(d=>`<span style="display:inline-block;padding:2px 7px;background:#e8f5e9;color:#2e7d32;border-radius:8px;font-size:0.68rem;font-weight:600;margin-left:4px;">${esc(d)}</span>`).join('')}
          </div>
          ${b.status === 'seated' && !b.endTime
            ? `<div class="live-timer" data-timer-start="${b.time}" data-timer-date="${b.date}"><span class="timer-dot"></span><span class="timer-val">--:--</span> dining</div>`
            : b.endTime && b.status !== 'cancelled'
              ? `<div style="display:inline-flex;align-items:center;gap:5px;padding:3px 9px;background:rgba(76,175,80,0.08);color:#2e7d32;border:1px solid rgba(76,175,80,0.25);border-radius:20px;font-size:0.7rem;font-weight:700;margin-top:4px;">✅ ${calcDuration(b.time, b.endTime)} total</div>`
              : ''}
        </div>
        <div style="display:flex;flex-direction:column;gap:6px;align-items:flex-end;flex-shrink:0;">
          <button class="btn btn-secondary btn-sm" onclick="openModal('${b.id}')" style="white-space:nowrap;">✏️ Edit</button>
          <button class="btn btn-gold btn-sm" onclick="openRescheduleModal('${b.id}')" style="white-space:nowrap;">🔄 Reschedule</button>
          ${b.status !== 'cancelled'
            ? b.endTime
              ? `<button class="btn btn-sm" style="white-space:nowrap;background:#e8f5e9;color:#2e7d32;border:1.5px solid #a5d6a7;font-weight:600;cursor:default;" disabled>✅ Ended ${fmtTime(b.endTime)}</button>`
              : `<button class="btn btn-sm" onclick="endService('${b.id}')" style="white-space:nowrap;background:#4caf50;color:#fff;font-weight:600;">🏁 End Service</button>`
            : ''}
          <select onchange="changeStatusFromDaily('${b.id}', this.value)" style="font-size:0.78rem;padding:5px 8px;border-radius:8px;border:1.5px solid #e0d8cc;background:${b.status==='cancelled'?'#ffebee':b.status==='seated'?'#e8f5e9':'var(--parchment)'};color:${b.status==='cancelled'?'#c62828':b.status==='seated'?'#2e7d32':'var(--espresso)'};font-family:'DM Sans',sans-serif;cursor:pointer;font-weight:500;">
            <option value="confirmed" ${b.status==='confirmed'?'selected':''}>Confirmed</option>
            <option value="seated"    ${b.status==='seated'   ?'selected':''}>Seated</option>
            <option value="cancelled" ${b.status==='cancelled'?'selected':''}>Cancelled</option>
          </select>
        </div>
      </div>
    `}).join('');

  // ── Interactive floor plan ──
  const df = document.getElementById('dailyFloor');

  if (!S.tables.length) {
    df.innerHTML = '<div class="empty" style="padding:20px;"><p>No tables defined.</p></div>';
    return;
  }

  // Build a map: tableId → all bookings that touch it today
  const tableBookingsMap = {};
  S.tables.forEach(t => { tableBookingsMap[t.id] = []; });
  activeBks.forEach(b => {
    (b.tableIds || []).forEach(id => {
      if (tableBookingsMap[id]) tableBookingsMap[id].push(b);
    });
  });

  // Set the zoom-inner to a fixed large canvas; outer wrapper clips it
  const zoomInner = document.getElementById('fpZoomInner');
  const CANVAS_W = 1000;
  const CANVAS_H = 700;
  if (zoomInner) {
    zoomInner.style.width  = CANVAS_W + 'px';
    zoomInner.style.height = CANVAS_H + 'px';
  }

  df.innerHTML = `<div style="position:relative;width:${CANVAS_W}px;height:${CANVAS_H}px;background:#f5ede0;background-image:linear-gradient(rgba(0,0,0,0.025) 1px,transparent 1px),linear-gradient(90deg,rgba(0,0,0,0.025) 1px,transparent 1px);background-size:20px 20px;" id="dailyMiniPlan">
    <div class="daily-floor-label">DINING ROOM</div>
    <div class="daily-floor-hint">Click a table to see its schedule</div>
  </div>`;

  const mp = document.getElementById('dailyMiniPlan');
  const CONTAINER_W = CANVAS_W;
  const CONTAINER_H = CANVAS_H;
  const PAD = 20;

  // Compute bounding box of layout
  let maxX = 0, maxY = 0;
  S.tables.forEach(t => {
    maxX = Math.max(maxX, t.x + (t.shape === 'small' ? 72 : 112));
    maxY = Math.max(maxY, t.y + (t.shape === 'small' ? 72 : 76));
  });

  const scaleX = (CONTAINER_W - PAD * 2) / (maxX || 1);
  const scaleY = (CONTAINER_H - PAD * 2 - 20) / (maxY || 1);
  const scale  = Math.min(scaleX, scaleY, 1);

  S.tables.forEach(t => {
    const baseW  = t.shape === 'small' ? 72 : 112;
    const baseH  = t.shape === 'small' ? 72 : 76;
    const w      = Math.max(Math.round(baseW * scale), 34);
    const h      = Math.max(Math.round(baseH * scale), 30);
    const x      = PAD + Math.round(t.x * scale);
    const y      = PAD + 16 + Math.round(t.y * scale);
    const inGroup    = S.groups.some(g => g.tableIds.includes(t.id));
    const tableBks   = tableBookingsMap[t.id] || [];
    const hasBooking = tableBks.length > 0;
    const bg = hasBooking ? 'var(--terracotta)' : inGroup ? 'var(--sage)' : 'var(--espresso)';
    const fontSize   = Math.max(Math.round(12 * scale), 8);
    const capFontSize = Math.max(Math.round(9 * scale), 6);

    const el = document.createElement('div');
    el.className = 'daily-table-el';
    el.style.cssText = `left:${x}px;top:${y}px;width:${w}px;height:${h}px;background:${bg};`;

    // Show first guest name if booked and there's space
    let bookingHint = '';
    if (hasBooking && w > 40) {
      const firstName = tableBks[0].guestName.split(' ')[0];
      const moreCount = tableBks.length > 1 ? ` +${tableBks.length - 1}` : '';
      bookingHint = `<div class="dt-bk" style="font-size:${Math.max(capFontSize-1,5)}px;">${esc(firstName)}${moreCount}</div>`;
    }

    // Check if any booking on this table is currently seated with no end time
    const seatedBk = tableBks.find(bk => bk.status === 'seated' && !bk.endTime);
    const timerAttr = seatedBk ? `data-fp-timer-start="${seatedBk.time}" data-fp-timer-date="${seatedBk.date}"` : '';
    if (seatedBk) {
      el.style.background = '#388e3c'; // deeper green for actively seated
      el.style.boxShadow  = '0 0 0 2px rgba(76,175,80,0.5)';
    }

    el.innerHTML = `
      <div class="dt-num" style="font-size:${fontSize}px;">${t.name}</div>
      <div class="dt-cap" style="font-size:${capFontSize}px;">${t.capacity}p</div>
      ${bookingHint}
      ${seatedBk ? `<div class="tbl-timer" data-fp-timer-start="${seatedBk.time}" data-fp-timer-date="${seatedBk.date}">⏱ --:--</div>` : ''}
    `;

    el.addEventListener('click', () => openTableSchedule(t, tableBks, date));
    mp.appendChild(el);
  });

  // Kick off live timers and zoom after DOM is painted
  requestAnimationFrame(() => {
    startDiningTimers();
    _fpPan = { x:0, y:0 };
    _applyFpTransform();
    _initFpZoom();
  });
}

function openTableSchedule(table, bookings, date) {
  const inGroup = S.groups.find(g => g.tableIds.includes(table.id));
  const hasBookings = bookings.length > 0;

  document.getElementById('tsModalTitle').textContent = `${table.name} — ${table.capacity} seats`;

  let body = '';

  // Status badge
  if (hasBookings) {
    body += `<div style="display:inline-block;padding:4px 12px;background:rgba(196,98,45,0.1);color:var(--terracotta);border-radius:20px;font-size:0.75rem;font-weight:600;margin-bottom:16px;">📅 ${bookings.length} booking${bookings.length>1?'s':''} on ${fmtDateLabel(date)}</div>`;
  } else {
    body += `<div style="display:inline-block;padding:4px 12px;background:#e8f5e9;color:#2e7d32;border-radius:20px;font-size:0.75rem;font-weight:600;margin-bottom:16px;">✅ Available all day</div>`;
  }

  if (inGroup) {
    const names = inGroup.tableIds.map(id => S.tables.find(t => t.id === id)?.name || id).join(', ');
    body += `<div style="font-size:0.78rem;color:var(--coffee);margin-bottom:14px;">🔗 Part of group: <strong>${esc(inGroup.name)}</strong> (${names})</div>`;
  }

  if (!hasBookings) {
    body += `<div class="empty" style="padding:24px 0 8px;"><div class="icon">🪑</div><p>No bookings assigned to this table today.</p></div>`;
  } else {
    body += bookings.sort((a, b) => a.time.localeCompare(b.time)).map(b => {
      const detailPills = (b.details || []).map(d =>
        `<span class="ts-pill" style="background:#fff3e0;color:#e65100;">${esc(d)}</span>`
      ).join('');
      const contactLine = [b.phone ? '📞 ' + esc(b.phone) : '', b.email ? '✉️ ' + esc(b.email) : ''].filter(Boolean).join(' · ');
      return `
        <div class="ts-booking-row">
          <div class="ts-time">${fmtTime(b.time)}${b.endTime ? '<br><span style="font-size:0.72rem;opacity:0.7;">'+fmtTime(b.endTime)+'</span>' : ''}</div>
          <div style="flex:1;">
            <div class="ts-name">${esc(b.guestName)}${b.gender ? ' <span style="font-size:0.72rem;color:var(--coffee);font-weight:400;">('+esc(b.gender)+')</span>' : ''}</div>
            <div class="ts-detail">
              👥 ${b.partySize} guests
              &nbsp;·&nbsp;
              <span style="padding:2px 7px;background:#fff3e0;color:#e65100;border-radius:8px;font-size:0.7rem;font-weight:600;">🕐 Until ${blockedUntil(b)}</span>
            </div>
            ${contactLine ? `<div class="ts-detail" style="margin-top:3px;">${contactLine}</div>` : ''}
            ${b.rsvp || b.takenBy ? `<div class="ts-detail" style="margin-top:3px;">${b.rsvp?'📨 '+esc(b.rsvp):''} ${b.takenBy?'👤 '+esc(b.takenBy):''}</div>` : ''}
            ${b.notes ? `<div class="ts-detail" style="margin-top:3px;">📝 ${esc(b.notes)}</div>` : ''}
            ${detailPills ? `<div style="margin-top:5px;">${detailPills}</div>` : ''}
            <div style="margin-top:6px;">
              <button class="btn btn-secondary btn-sm" onclick="closeTableSchedule();openModal('${b.id}')">Edit Booking</button>
            </div>
          </div>
        </div>
      `;
    }).join('');
  }

  document.getElementById('tsModalBody').innerHTML = body;
  document.getElementById('tableScheduleModal').classList.add('open');
}

function closeTableSchedule() {
  document.getElementById('tableScheduleModal').classList.remove('open');
}

// ════════════════════════════════════════════
//  GUEST PROFILES
// ════════════════════════════════════════════
function guestKey(name) { return name.trim().toLowerCase(); }

// ── Phone formatter ──
// Rules:
//   • Already has a leading + → parse as international, reformat with spaces
//   • Starts with 08 or 8 (after stripping spaces/dashes) → Indonesian local → convert to +62
//   • Starts with 62 → already Indonesian without the + → convert to +62
//   • Anything else starting with a digit other than 0 → assume international, prefix +
function formatPhone(raw) {
  if (!raw) return '';
  // Strip everything except digits and leading +
  const hasPlus = raw.trim().startsWith('+');
  const digits  = raw.replace(/\D/g, '');

  if (!digits) return raw.trim(); // non-numeric input, return as-is

  let country = '', national = '';

  if (hasPlus) {
    // Already international — detect known prefixes to reformat nicely
    // We'll just normalise to +[digits] with spacing groups
    return formatInternational('+' + digits);
  }

  // Indonesian local: 08xxxxxxxx or 8xxxxxxxx (mobile without country code)
  if (digits.startsWith('08')) {
    national = digits.slice(1);   // drop the leading 0 → 8xxxxxxxx
    return formatInternational('+62' + national);
  }
  if (digits.startsWith('8') && digits.length >= 9 && digits.length <= 13) {
    // bare 8xx… — likely Indonesian mobile without the leading 0
    return formatInternational('+62' + digits);
  }

  // Already has 62 prefix (no +)
  if (digits.startsWith('62')) {
    return formatInternational('+' + digits);
  }

  // Starts with 0 but not 08 (other local conventions) — prefix + and return grouped
  if (digits.startsWith('0')) {
    return formatInternational('+' + digits.slice(1)); // strip leading 0, assume international
  }

  // Fallback: treat as international digits
  return formatInternational('+' + digits);
}

// Group digits after the country code for readability: +62 812 3456 7890
function formatInternational(e164) {
  // e164 looks like "+CCNNNNNNNN"
  const digits = e164.replace(/\D/g, '');
  if (!digits) return e164;

  // Detect country code length (greedy match of known codes)
  let cc = '', rest = '';
  // Simple heuristic: 1–3 digit country codes
  // We check common ones; fallback to 1 digit if unknown
  const knownCC = {
    '1':1,'7':1,'20':2,'27':2,'30':2,'31':2,'32':2,'33':2,'34':2,'36':2,'39':2,
    '40':2,'41':2,'43':2,'44':2,'45':2,'46':2,'47':2,'48':2,'49':2,
    '51':2,'52':2,'53':2,'54':2,'55':2,'56':2,'57':2,'58':2,
    '60':2,'61':2,'62':2,'63':2,'64':2,'65':2,'66':2,
    '81':2,'82':2,'84':2,'86':2,'90':2,'91':2,'92':2,'93':2,'94':2,'95':2,
    '98':2,'212':3,'213':3,'216':3,'218':3,'220':3,'221':3,'222':3,'223':3,
    '224':3,'225':3,'226':3,'227':3,'228':3,'229':3,'230':3,'231':3,'232':3,
    '233':3,'234':3,'235':3,'236':3,'237':3,'238':3,'239':3,'240':3,'241':3,
    '242':3,'243':3,'244':3,'245':3,'246':3,'247':3,'248':3,'249':3,'250':3,
    '251':3,'252':3,'253':3,'254':3,'255':3,'256':3,'257':3,'258':3,'260':3,
    '261':3,'262':3,'263':3,'264':3,'265':3,'266':3,'267':3,'268':3,'269':3,
    '290':3,'291':3,'297':3,'298':3,'299':3,'350':3,'351':3,'352':3,'353':3,
    '354':3,'355':3,'356':3,'357':3,'358':3,'359':3,'370':3,'371':3,'372':3,
    '373':3,'374':3,'375':3,'376':3,'377':3,'378':3,'380':3,'381':3,'382':3,
    '385':3,'386':3,'387':3,'389':3,'420':3,'421':3,'423':3,'500':3,'501':3,
    '502':3,'503':3,'504':3,'505':3,'506':3,'507':3,'508':3,'509':3,'590':3,
    '591':3,'592':3,'593':3,'594':3,'595':3,'596':3,'597':3,'598':3,'599':3,
    '670':3,'672':3,'673':3,'674':3,'675':3,'676':3,'677':3,'678':3,'679':3,
    '680':3,'681':3,'682':3,'683':3,'685':3,'686':3,'687':3,'688':3,'689':3,
    '690':3,'691':3,'692':3,'850':3,'852':3,'853':3,'855':3,'856':3,'880':3,
    '886':3,'960':3,'961':3,'962':3,'963':3,'964':3,'965':3,'966':3,'967':3,
    '968':3,'970':3,'971':3,'972':3,'973':3,'974':3,'975':3,'976':3,'977':3,
    '992':3,'993':3,'994':3,'995':3,'996':3,'998':3,
  };

  // Try 3-digit CC first, then 2, then 1
  if (knownCC[digits.slice(0,3)] === 3)      { cc = digits.slice(0,3); rest = digits.slice(3); }
  else if (knownCC[digits.slice(0,2)] === 2) { cc = digits.slice(0,2); rest = digits.slice(2); }
  else                                        { cc = digits.slice(0,1); rest = digits.slice(1); }

  // Group national number into blocks (e.g. 3-4-4 or 3-3-4)
  const grouped = groupDigits(rest);
  return `+${cc} ${grouped}`.trim();
}

function groupDigits(s) {
  // For Indonesian numbers (and most Asian mobiles) the pattern is typically:
  // 3-4-4, 3-4-3, 4-4, 3-3-4 etc. We use a simple left-to-right chunking.
  if (!s) return '';
  const len = s.length;
  if (len <= 4)  return s;
  if (len <= 7)  return s.slice(0, 3) + ' ' + s.slice(3);
  if (len <= 10) return s.slice(0, 3) + ' ' + s.slice(3, 7) + ' ' + s.slice(7);
  return s.slice(0, 3) + ' ' + s.slice(3, 7) + ' ' + s.slice(7, 11) + (s.slice(11) ? ' ' + s.slice(11) : '');
}

function upsertGuest({ name, phone, email, gender, tags }) {
  if (!name) return;
  if (!S.guests) S.guests = [];
  const key = guestKey(name);
  let g = S.guests.find(g => g.key === key);
  if (!g) {
    g = { id: 'gu' + Date.now(), key, name, phone: '', email: '', gender: '', firstSeen: today(), tags: [] };
    S.guests.push(g);
  }
  // Only overwrite blanks so we don't lose existing data
  if (phone)  g.phone  = formatPhone(phone);
  if (email)  g.email  = email;
  if (gender) g.gender = gender;
  g.name = name; // always keep latest casing
  // Merge discount/special tags into the guest profile
  if (!g.tags) g.tags = [];
  const TRACKED_TAGS = ['Friends & Family (5% Discount)', 'KOL', 'BOD (10% Discount)'];
  if (tags && tags.length) {
    tags.forEach(t => {
      if (TRACKED_TAGS.includes(t) && !g.tags.includes(t)) g.tags.push(t);
    });
  }
}

function getGuestVisits(key) {
  return S.bookings.filter(b => guestKey(b.guestName) === key && b.status !== 'cancelled')
                   .sort((a,b) => (b.date+b.time).localeCompare(a.date+a.time));
}

function getGuestCancellations(key) {
  return S.bookings.filter(b => guestKey(b.guestName) === key && b.status === 'cancelled')
                   .sort((a,b) => (b.date+b.time).localeCompare(a.date+a.time));
}

function renderGuests() {
  if (!S.guests) S.guests = [];
  const rawSearch = (document.getElementById('guestSearch')?.value || '').trim();
  const search    = rawSearch.toLowerCase();
  // Raw digits and normalised digits (e.g. "08" → "628" via formatPhone)
  const searchDigits     = rawSearch.replace(/\D/g, '');
  const normalisedDigits = rawSearch ? formatPhone(rawSearch).replace(/\D/g, '') : '';
  const sort = document.getElementById('guestSort')?.value || 'name';

  // Rebuild guest index from bookings
  S.bookings.forEach(b => { if (b.guestName) upsertGuest({ name: b.guestName, phone: b.phone||'', email: b.email||'', gender: b.gender||'', tags: b.details||[] }); });

  let list = [...S.guests];
  if (search) {
    list = list.filter(g => {
      if (g.name.toLowerCase().includes(search)) return true;
      if ((g.email||'').toLowerCase().includes(search)) return true;
      if ((g.notes||'').toLowerCase().includes(search)) return true;
      const phoneDigits = (g.phone||'').replace(/\D/g, '');
      // Match on raw typed digits
      if (searchDigits && phoneDigits.includes(searchDigits)) return true;
      // Match on normalised digits (e.g. typing "08" matches "+62 8..." stored numbers)
      if (normalisedDigits && normalisedDigits !== searchDigits && phoneDigits.includes(normalisedDigits)) return true;
      // Match on raw formatted string
      if ((g.phone||'').replace(/\s/g,'').includes(rawSearch.replace(/\s/g,''))) return true;
      return false;
    });
  }

  // Attach visit counts for sorting/display
  list = list.map(g => ({ ...g, visits: getGuestVisits(g.key) }));

  if (sort === 'name')    list.sort((a,b) => a.name.localeCompare(b.name));
  if (sort === 'visits')  list.sort((a,b) => b.visits.length - a.visits.length);
  if (sort === 'recent')  list.sort((a,b) => {
    const la = a.visits[0] ? a.visits[0].date : '0';
    const lb = b.visits[0] ? b.visits[0].date : '0';
    return lb.localeCompare(la);
  });

  // Summary bar
  const totalGuests = S.guests.length;
  const totalVisits = S.bookings.filter(b=>b.status!=='cancelled').length;
  const totalCancels = S.bookings.filter(b=>b.status==='cancelled').length;
  const thisMonth   = S.bookings.filter(b=>b.status!=='cancelled'&&b.date.slice(0,7)===today().slice(0,7)).length;
  document.getElementById('guestSummaryBar').innerHTML = `
    <div class="gsum-card"><div class="gsum-val">${totalGuests}</div><div class="gsum-lbl">Unique Guests</div></div>
    <div class="gsum-card"><div class="gsum-val">${totalVisits}</div><div class="gsum-lbl">Total Visits</div></div>
    <div class="gsum-card"><div class="gsum-val">${thisMonth}</div><div class="gsum-lbl">This Month</div></div>
    <div class="gsum-card" style="background:#fff5f5;"><div class="gsum-val" style="color:#c62828;">${totalCancels}</div><div class="gsum-lbl" style="color:#c62828;">Cancellations</div></div>
  `;

  const el = document.getElementById('guestList');
  if (!list.length) {
    el.innerHTML = `<div class="empty"><div class="icon">👥</div><p>${search ? 'No guests match your search.' : 'No guests yet. Add one with + New Guest or save a reservation.'}</p></div>`;
    return;
  }

  el.innerHTML = list.map(g => {
    const initials    = g.name.split(' ').map(w=>w[0]).join('').toUpperCase().slice(0,2);
    const visits      = g.visits;
    const cancels     = getGuestCancellations(g.key);
    const reschedules = S.bookings.filter(b => guestKey(b.guestName) === g.key && b.rescheduled)
                                  .sort((a,b) => (b.date+b.time).localeCompare(a.date+a.time));
    const genderLabel = { male: '♂ Male', female: '♀ Female', other: '⚧ Other' }[g.gender] || '';
    const recentPills = visits.slice(0,5).map(v => {
      const rsTag = v.rescheduled ? ' <span style="font-size:0.66rem;background:#fff8e1;color:#c9922a;border-radius:6px;padding:1px 5px;margin-left:3px;">rescheduled</span>' : '';
      return `<span class="visit-pill">📅 ${fmtDateLabel(v.date)} &middot; ${fmtTime(v.time)} &middot; ${v.partySize} guests${rsTag}</span>`;
    }).join('');
    const cancelPills = cancels.slice(0,3).map(v =>
      `<span class="visit-pill" style="background:#ffebee;color:#c62828;border-color:#ffcdd2;">✕ ${fmtDateLabel(v.date)} &middot; ${fmtTime(v.time)} &middot; Cancelled</span>`
    ).join('');
    const rsPills = reschedules.slice(0,2).map(v =>
      `<span class="visit-pill" style="background:#fff8e1;color:#c9922a;border-color:#ffe082;">🔄 ${v.originalDate ? fmtDateLabel(v.originalDate) : '?'} → ${fmtDateLabel(v.date)} &middot; Rescheduled</span>`
    ).join('');

    return `
      <div class="guest-card">
        <div class="guest-avatar">${initials}</div>
        <div class="guest-info">
          <div class="guest-name">${esc(g.name)}</div>
          <div class="guest-contact">
            ${g.phone  ? `<span>📞 ${esc(g.phone)}</span>`  : ''}
            ${g.email  ? `<span>✉️ ${esc(g.email)}</span>`  : ''}
            ${genderLabel ? `<span>${genderLabel}</span>` : ''}
            ${g.firstSeen ? `<span>Since ${g.firstSeen}</span>` : ''}
          </div>
          ${g.notes ? `<div style="font-size:0.76rem;color:var(--coffee);margin-top:4px;font-style:italic;">📋 ${esc(g.notes)}</div>` : ''}
          ${g.tags && g.tags.length ? `<div style="margin-top:6px;display:flex;gap:5px;flex-wrap:wrap;">${g.tags.map(t => {
            const colors = {
              'Friends & Family (5% Discount)': 'background:#e8f5e9;color:#2e7d32;border:1px solid #a5d6a7;',
              'KOL':                            'background:#e3f2fd;color:#1565c0;border:1px solid #90caf9;',
              'BOD (10% Discount)':             'background:#fff3e0;color:#e65100;border:1px solid #ffcc80;',
            };
            const style = colors[t] || 'background:#f3e5f5;color:#6a1b9a;border:1px solid #ce93d8;';
            return `<span style="display:inline-block;padding:3px 10px;border-radius:20px;font-size:0.7rem;font-weight:600;${style}">${esc(t)}</span>`;
          }).join('')}</div>` : ''}
          ${recentPills ? `<div class="guest-visits">${recentPills}</div>` : ''}
          ${cancelPills ? `<div class="guest-visits" style="margin-top:4px;">${cancelPills}</div>` : ''}
          ${rsPills     ? `<div class="guest-visits" style="margin-top:4px;">${rsPills}</div>`     : ''}
        </div>
        <div style="display:flex;flex-direction:column;gap:8px;align-items:center;">
          <div class="guest-stat"><div class="guest-stat-val">${visits.length}</div><div class="guest-stat-lbl">Visits</div></div>
          ${cancels.length    ? `<div class="guest-stat" style="background:#ffebee;"><div class="guest-stat-val" style="font-size:1.1rem;color:#c62828;">${cancels.length}</div><div class="guest-stat-lbl" style="color:#c62828;">Cancelled</div></div>` : ''}
          ${reschedules.length? `<div class="guest-stat" style="background:#fff8e1;"><div class="guest-stat-val" style="font-size:1.1rem;color:#c9922a;">${reschedules.length}</div><div class="guest-stat-lbl" style="color:#c9922a;">Rescheduled</div></div>` : ''}
          <button class="btn btn-secondary btn-sm" onclick="prefillBookingFromGuest('${g.key}')">+ Book</button>
          <button class="btn btn-secondary btn-sm" onclick="openGuestModal('${g.key}')">✏️ Edit</button>
        </div>
      </div>
    `;
  }).join('');
}

function prefillBookingFromGuest(key) {
  const g = S.guests.find(x => x.key === key);
  if (!g) return;
  switchView('bookings', document.querySelector('[data-view="bookings"]'));
  openModal();
  document.getElementById('fName').value   = g.name;
  document.getElementById('fPhone').value  = g.phone||'';
  document.getElementById('fEmail').value  = g.email||'';
  document.getElementById('fGender').value = g.gender||'';
}

// ════════════════════════════════════════════
//  GUEST PROFILE MODAL
// ════════════════════════════════════════════
let editGuestKey = null;

function openGuestModal(key) {
  editGuestKey = key || null;
  const isEdit = !!key;
  document.getElementById('guestModalTitle').textContent = isEdit ? 'Edit Guest Profile' : 'New Guest Profile';
  document.getElementById('guestDelBtn').style.display   = isEdit ? 'inline-block' : 'none';

  if (isEdit) {
    const g = S.guests.find(x => x.key === key);
    if (!g) return;
    document.getElementById('gfName').value   = g.name;
    document.getElementById('gfPhone').value  = g.phone||'';
    document.getElementById('gfEmail').value  = g.email||'';
    document.getElementById('gfGender').value = g.gender||'';
    document.getElementById('gfNotes').value  = g.notes||'';
    const savedTags = g.tags || [];
    document.querySelectorAll('#gfTags input[type=checkbox]').forEach(cb => {
      cb.checked = savedTags.includes(cb.value);
    });
  } else {
    document.getElementById('gfName').value   = '';
    document.getElementById('gfPhone').value  = '';
    document.getElementById('gfEmail').value  = '';
    document.getElementById('gfGender').value = '';
    document.getElementById('gfNotes').value  = '';
    document.querySelectorAll('#gfTags input[type=checkbox]').forEach(cb => { cb.checked = false; });
  }

  document.getElementById('guestModal').classList.add('open');
}

function closeGuestModal() {
  document.getElementById('guestModal').classList.remove('open');
  editGuestKey = null;
}

function guestPhoneBlur() {
  const input = document.getElementById('gfPhone');
  const raw   = input.value.trim();
  if (raw) input.value = formatPhone(raw);
}

function saveGuestProfile() {
  const name   = document.getElementById('gfName').value.trim();
  const phone  = formatPhone(document.getElementById('gfPhone').value.trim());
  const email  = document.getElementById('gfEmail').value.trim();
  const gender = document.getElementById('gfGender').value;
  const notes  = document.getElementById('gfNotes').value.trim();
  const tags   = [...document.querySelectorAll('#gfTags input[type=checkbox]:checked')].map(cb => cb.value);

  if (!name) { toast('Please enter a guest name'); return; }

  if (!S.guests) S.guests = [];
  const newKey = guestKey(name);

  if (editGuestKey) {
    // Editing existing guest — find and update
    const g = S.guests.find(x => x.key === editGuestKey);
    if (!g) return;

    // If name changed, check for key collision
    if (newKey !== editGuestKey && S.guests.find(x => x.key === newKey)) {
      toast('A guest with that name already exists'); return;
    }

    // Update bookings that referenced the old name to the new name
    if (newKey !== editGuestKey) {
      S.bookings.forEach(b => {
        if (guestKey(b.guestName) === editGuestKey) {
          b.guestName = name;
          if (phone) b.phone  = phone;
          if (email) b.email  = email;
          if (gender) b.gender = gender;
        }
      });
      g.key  = newKey;
    }

    g.name   = name;
    if (phone)  g.phone  = phone;
    if (email)  g.email  = email;
    if (gender) g.gender = gender;
    g.notes  = notes;
    g.tags   = tags;
    toast('Guest profile updated');
  } else {
    // New guest
    if (S.guests.find(x => x.key === newKey)) {
      toast('A guest with that name already exists'); return;
    }
    S.guests.push({
      id:        'gu' + Date.now(),
      key:       newKey,
      name,
      phone:     phone||'',
      email:     email||'',
      gender:    gender||'',
      notes:     notes||'',
      tags:      tags,
      firstSeen: today(),
    });
    toast('Guest profile created');
  }

  save(); closeGuestModal(); renderGuests();
}

function deleteGuestProfile() {
  if (!editGuestKey) return;
  const g = S.guests.find(x => x.key === editGuestKey);
  if (!g) return;
  const visits = getGuestVisits(editGuestKey);
  const msg = visits.length
    ? `Delete "${g.name}"? They have ${visits.length} booking record${visits.length>1?'s':''} which will remain but will no longer be linked to a profile.`
    : `Delete guest profile for "${g.name}"? This cannot be undone.`;
  if (!confirm(msg)) return;
  S.guests = S.guests.filter(x => x.key !== editGuestKey);
  save(); closeGuestModal(); renderGuests(); toast('Guest profile deleted');
}

// ════════════════════════════════════════════
//  EXPORT
// ════════════════════════════════════════════
function buildExportRows() {
  if (!S.guests) S.guests = [];
  S.bookings.forEach(b => { if (b.guestName) upsertGuest({ name: b.guestName, phone: b.phone||'', email: b.email||'', gender: b.gender||'' }); });

  const headers = ['Name','Phone','Email','Gender','Total Visits','Last Visit','First Seen','RSVP Via','Taken By','Details','Visit Dates'];
  const rows = S.guests.map(g => {
    const visits = getGuestVisits(g.key);
    const lastBooking = visits[0] || {};
    const visitDates = visits.map(v => v.date + ' ' + fmtTime(v.time)).join(' | ');
    return [
      g.name,
      g.phone||'',
      g.email||'',
      g.gender||'',
      visits.length,
      visits[0] ? visits[0].date : '',
      g.firstSeen||'',
      lastBooking.rsvp||'',
      lastBooking.takenBy||'',
      (lastBooking.details||[]).join(', '),
      visitDates,
    ];
  });
  return { headers, rows };
}

function exportCSV() {
  const { headers, rows } = buildExportRows();
  const escape = v => `"${String(v).replace(/"/g,'""')}"`;
  const lines = [headers.map(escape).join(','), ...rows.map(r => r.map(escape).join(','))];
  const blob = new Blob([lines.join('\r\n')], { type: 'text/csv' });
  dlBlob(blob, 'guest-history.csv');
  toast('CSV exported!');
}

function exportExcel() {
  const { headers, rows } = buildExportRows();
  // Build a simple HTML table — Excel opens these natively
  const esc2 = s => String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  const th = headers.map(h=>`<th>${esc2(h)}</th>`).join('');
  const trs = rows.map(r=>`<tr>${r.map(c=>`<td>${esc2(c)}</td>`).join('')}</tr>`).join('');
  const html = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel"><head><meta charset="UTF-8"></head><body><table>${th}${trs}</table></body></html>`;
  const blob = new Blob([html], { type: 'application/vnd.ms-excel' });
  dlBlob(blob, 'guest-history.xls');
  toast('Excel file exported!');
}

function dlBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a   = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// ════════════════════════════════════════════
//  PHONE AUTOFILL
// ════════════════════════════════════════════
// ── Shared suggestion renderer ──
function buildSuggestionHTML(matches, highlightField) {
  return matches.slice(0, 8).map(g => {
    const visits    = getGuestVisits(g.key);
    const lastVisit = visits[0] ? 'Last visit: ' + visits[0].date : 'No visits yet';
    const gLabel    = { male:'♂', female:'♀', other:'⚧' }[g.gender] || '';
    const sub       = [g.phone, g.email].filter(Boolean).join(' · ');
    return `
      <div class="phone-sug-item" onmousedown="autofillGuest('${g.key}')">
        <div class="phone-sug-name">${esc(g.name)} ${gLabel}</div>
        <div class="phone-sug-meta">${esc(sub)} &nbsp;·&nbsp; ${lastVisit} &nbsp;·&nbsp; ${visits.length} visit${visits.length!==1?'s':''}</div>
      </div>`;
  }).join('');
}

function onNameInput() {
  const val = document.getElementById('fName').value.trim();
  const box = document.getElementById('nameSuggestions');
  document.getElementById('autofillBanner').classList.remove('visible');
  if (!val || val.length < 1) { box.classList.remove('open'); return; }
  if (!S.guests) S.guests = [];
  const lower = val.toLowerCase();
  const matches = S.guests.filter(g => g.name.toLowerCase().includes(lower));
  if (!matches.length) { box.classList.remove('open'); return; }
  box.innerHTML = buildSuggestionHTML(matches);
  box.classList.add('open');
}

function hideNameSuggestions() {
  setTimeout(() => document.getElementById('nameSuggestions').classList.remove('open'), 150);
}

function onEmailInput() {
  const val = document.getElementById('fEmail').value.trim();
  const box = document.getElementById('emailSuggestions');
  document.getElementById('autofillBanner').classList.remove('visible');
  if (!val || val.length < 2) { box.classList.remove('open'); return; }
  if (!S.guests) S.guests = [];
  const lower = val.toLowerCase();
  const matches = S.guests.filter(g => g.email && g.email.toLowerCase().includes(lower));
  if (!matches.length) { box.classList.remove('open'); return; }
  box.innerHTML = buildSuggestionHTML(matches);
  box.classList.add('open');
}

function hideEmailSuggestions() {
  setTimeout(() => document.getElementById('emailSuggestions').classList.remove('open'), 150);
}

function onPhoneInput() {
  const val = document.getElementById('fPhone').value.trim();
  const box  = document.getElementById('phoneSuggestions');

  // Hide banner when user starts typing fresh
  document.getElementById('autofillBanner').classList.remove('visible');

  if (!val || val.length < 2) { box.classList.remove('open'); return; }

  if (!S.guests) S.guests = [];

  // Build a set of digit sequences to match against.
  // This handles: raw typed digits, and the normalised form after formatPhone().
  // e.g. typing "08" → also try "628" (Indonesian +62 conversion)
  const valDigits = val.replace(/\D/g, '');
  const normalisedDigits = formatPhone(val).replace(/\D/g, '');

  const matches = S.guests.filter(g => {
    if (!g.phone) return false;
    const gDigits = g.phone.replace(/\D/g, '');
    // Match on raw typed digits
    if (valDigits && gDigits.includes(valDigits)) return true;
    // Match on normalised digits (catches 08 → 628 conversion)
    if (normalisedDigits && normalisedDigits !== valDigits && gDigits.includes(normalisedDigits)) return true;
    // Match on raw string (formatted partial, e.g. "+62 8")
    if (g.phone.replace(/\s/g,'').includes(val.replace(/\s/g,''))) return true;
    return false;
  });

  if (!matches.length) { box.classList.remove('open'); return; }

  box.innerHTML = matches.slice(0, 8).map(g => {
    const visits = getGuestVisits(g.key);
    const lastVisit = visits[0] ? 'Last visit: ' + visits[0].date : 'No visits yet';
    const gLabel = { male:'♂', female:'♀', other:'⚧' }[g.gender] || '';
    // Highlight matching part in phone
    const safePhone = esc(g.phone);
    return `
      <div class="phone-sug-item" onmousedown="autofillGuest('${g.key}')">
        <div class="phone-sug-name">${esc(g.name)} ${gLabel}</div>
        <div class="phone-sug-meta">${safePhone} &nbsp;·&nbsp; ${lastVisit} &nbsp;·&nbsp; ${visits.length} visit${visits.length!==1?'s':''}</div>
      </div>`;
  }).join('');

  box.classList.add('open');
}

function autofillGuest(key) {
  const g = S.guests.find(x => x.key === key);
  if (!g) return;

  document.getElementById('fName').value   = g.name;
  document.getElementById('fPhone').value  = g.phone || '';  // already formatted in guest profile
  document.getElementById('fEmail').value  = g.email || '';
  document.getElementById('fGender').value = g.gender || '';

  const visits = getGuestVisits(g.key);
  const banner = document.getElementById('autofillBanner');
  const msg    = document.getElementById('autofillMsg');
  msg.textContent = `Details filled for ${g.name} — ${visits.length} previous visit${visits.length!==1?'s':''}`;
  banner.classList.add('visible');

  hidePhoneSuggestions();
  hideNameSuggestions();
  hideEmailSuggestions();
  toast('Guest details loaded for ' + g.name);
}

function hidePhoneSuggestions() {
  setTimeout(() => {
    document.getElementById('phoneSuggestions').classList.remove('open');
  }, 150);
}

function onPhoneBlur() {
  hidePhoneSuggestions();
  const input = document.getElementById('fPhone');
  const raw   = input.value.trim();
  if (raw) input.value = formatPhone(raw);
}

function clearAutofill() {
  document.getElementById('fName').value   = '';
  document.getElementById('fPhone').value  = '';
  document.getElementById('fEmail').value  = '';
  document.getElementById('fGender').value = '';
  document.getElementById('autofillBanner').classList.remove('visible');
  document.getElementById('fName').focus();
}

// ════════════════════════════════════════════
//  HELPERS
// ════════════════════════════════════════════
function blockedUntil(b) {
  if (b && b.endTime) return fmtTime(b.endTime);
  const time = (b && b.time) ? b.time : b; // backward compat: accept string or booking obj
  const endMins = timeToMins(time) + BLOCK_MINS;
  const hh = String(Math.floor(endMins/60) % 24).padStart(2,'0');
  const mm = String(endMins % 60).padStart(2,'0');
  return fmtTime(hh + ':' + mm);
}

function today() { return new Date().toISOString().split('T')[0]; }

function fmtTime(t) {
  if (!t) return '';
  const [h,m] = t.split(':');
  const hr = parseInt(h); const ap = hr>=12?'PM':'AM';
  return `${hr%12||12}:${m} ${ap}`;
}

function fmtDateLabel(d) {
  const dt   = new Date(d+'T00:00:00');
  const todayS    = today();
  const tmrwS = new Date(Date.now()+86400000).toISOString().split('T')[0];
  const fmt   = dt.toLocaleDateString('en-US',{weekday:'long',month:'long',day:'numeric'});
  if (d===todayS) return 'Today — '+fmt;
  if (d===tmrwS)  return 'Tomorrow — '+fmt;
  return dt.toLocaleDateString('en-US',{weekday:'long',month:'long',day:'numeric',year:'numeric'});
}

function esc(s) { return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
function cap(s) { return s.charAt(0).toUpperCase()+s.slice(1); }
function arrEq(a,b) { return JSON.stringify([...a].sort())===JSON.stringify([...b].sort()); }

function toast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(t._timer);
  t._timer = setTimeout(()=>t.classList.remove('show'), 3000);
}

// ════════════════════════════════════════════
//  ANALYTICS DASHBOARD
// ════════════════════════════════════════════
let _dashDays = 7;

function setDashRange(days, el) {
  _dashDays = parseInt(days);
  document.querySelectorAll('.dash-range-tab').forEach(t => t.classList.remove('active'));
  if (el) el.classList.add('active');
  renderDashboard();
}

function renderDashboard() {
  const out = document.getElementById('dashboardOutput');
  if (!out) return;

  const endDate   = today();
  const startDate = new Date(Date.now() - (_dashDays - 1) * 86400000).toISOString().split('T')[0];

  const rangeBookings = S.bookings.filter(b => b.date >= startDate && b.date <= endDate);
  const active   = rangeBookings.filter(b => b.status !== 'cancelled');
  const cancelled = rangeBookings.filter(b => b.status === 'cancelled');
  const seated   = rangeBookings.filter(b => b.status === 'seated');
  const confirmed = rangeBookings.filter(b => b.status === 'confirmed');
  const walkIns  = active.filter(b => b.rsvp === 'Walkin');
  const rescheduled = rangeBookings.filter(b => b.rescheduled);
  const totalPax = active.reduce((s,b) => s+b.partySize, 0);
  const totalCap = S.tables.reduce((s,t) => s+t.capacity, 0);
  const cancelRate = rangeBookings.length ? Math.round(cancelled.length / rangeBookings.length * 100) : 0;
  const avgParty  = active.length ? (totalPax / active.length).toFixed(1) : '–';

  // Average dining duration (for bookings with endTime)
  const timed = active.filter(b => b.endTime);
  const avgDurMins = timed.length
    ? Math.round(timed.reduce((s,b) => s + timeToMins(b.endTime) - timeToMins(b.time), 0) / timed.length)
    : null;
  const avgDurLabel = avgDurMins !== null
    ? (avgDurMins >= 60 ? Math.floor(avgDurMins/60)+'h '+(avgDurMins%60)+'m' : avgDurMins+'m')
    : '–';

  // Daily covers for sparkline
  const dayMap = {};
  for (let i = _dashDays - 1; i >= 0; i--) {
    const d = new Date(Date.now() - i*86400000).toISOString().split('T')[0];
    dayMap[d] = 0;
  }
  active.forEach(b => { if (dayMap[b.date] !== undefined) dayMap[b.date] += b.partySize; });
  const dayEntries = Object.entries(dayMap);
  const maxCovers  = Math.max(...dayEntries.map(([,v]) => v), 1);

  // Covers by slot (lunch/dinner/other)
  const lunchPax  = active.filter(b => timeToMins(b.time) >= 600  && timeToMins(b.time) < 1080).reduce((s,b)=>s+b.partySize,0);
  const dinnerPax = active.filter(b => timeToMins(b.time) >= 1080 && timeToMins(b.time) <= 1320).reduce((s,b)=>s+b.partySize,0);
  const otherPax  = totalPax - lunchPax - dinnerPax;

  // Top tables by bookings
  const tableCount = {};
  S.tables.forEach(t => { tableCount[t.id] = 0; });
  active.forEach(b => (b.tableIds||[]).forEach(id => { if (tableCount[id]!==undefined) tableCount[id]++; }));
  const topTables = Object.entries(tableCount)
    .sort((a,b) => b[1]-a[1]).slice(0,6)
    .map(([id,cnt]) => ({ name: S.tables.find(t=>t.id===id)?.name||id, cnt }));
  const maxTbl = Math.max(...topTables.map(t=>t.cnt),1);

  // RSVP channel breakdown
  const channels = {};
  active.forEach(b => { const c = b.rsvp||'Unknown'; channels[c]=(channels[c]||0)+1; });
  const channelEntries = Object.entries(channels).sort((a,b)=>b[1]-a[1]);
  const maxCh = Math.max(...channelEntries.map(([,v])=>v),1);

  // Top guests
  const guestPax = {};
  active.forEach(b => {
    const k = guestKey(b.guestName);
    if (!guestPax[k]) guestPax[k] = { name: b.guestName, visits:0, pax:0 };
    guestPax[k].visits++;
    guestPax[k].pax += b.partySize;
  });
  const topGuests = Object.values(guestPax).sort((a,b)=>b.visits-a.visits).slice(0,5);

  // KPI accent colours
  const kpiColors = ['var(--terracotta)','var(--gold)','#4caf50','#1976d2','#9c27b0','var(--coffee)'];

  // Build sparkline SVG
  const svgW = 360, svgH = 70, svgPad = 8;
  const pts = dayEntries.map(([,v],i) => {
    const x = svgPad + i * ((svgW - svgPad*2) / Math.max(dayEntries.length-1,1));
    const y = svgH - svgPad - (v / maxCovers) * (svgH - svgPad*2);
    return `${x},${y}`;
  }).join(' ');

  // Filled area
  const firstPt = dayEntries.map(([,v],i) => {
    const x = svgPad + i * ((svgW - svgPad*2) / Math.max(dayEntries.length-1,1));
    const y = svgH - svgPad - (v / maxCovers) * (svgH - svgPad*2);
    return [x,y];
  });
  const areaPath = firstPt.length
    ? `M${firstPt[0][0]},${svgH-svgPad} ` + firstPt.map(([x,y])=>`L${x},${y}`).join(' ') + ` L${firstPt[firstPt.length-1][0]},${svgH-svgPad} Z`
    : '';

  const donutColors = ['var(--terracotta)','var(--gold)','#4caf50'];
  const statusTotals = [active.length, cancelled.length, rescheduled.length];
  const statusLabels = ['Active','Cancelled','Rescheduled'];
  const grandTotal = statusTotals.reduce((a,b)=>a+b,0) || 1;
  let cumAngle = -90;
  const donutArcs = statusTotals.map((v,i) => {
    const frac = v / grandTotal;
    const angle = frac * 360;
    const startA = cumAngle * Math.PI/180;
    const endA   = (cumAngle + angle) * Math.PI/180;
    const r = 40, cx = 55, cy = 55;
    const x1 = cx + r*Math.cos(startA), y1 = cy + r*Math.sin(startA);
    const x2 = cx + r*Math.cos(endA),   y2 = cy + r*Math.sin(endA);
    const largeArc = angle > 180 ? 1 : 0;
    cumAngle += angle;
    if (v === 0) return '';
    return `<path d="M${cx},${cy} L${x1.toFixed(1)},${y1.toFixed(1)} A${r},${r} 0 ${largeArc},1 ${x2.toFixed(1)},${y2.toFixed(1)} Z" fill="${donutColors[i]}" opacity="0.85"/>`;
  }).join('');

  out.innerHTML = `
    <div class="dash-grid">
      <div class="dash-kpi" style="border-color:${kpiColors[0]}">
        <div class="dash-kpi-val">${active.length}</div>
        <div class="dash-kpi-lbl">Total Bookings</div>
        <div class="dash-kpi-sub">Last ${_dashDays} days · ${cancelled.length} cancelled</div>
      </div>
      <div class="dash-kpi" style="border-color:${kpiColors[1]}">
        <div class="dash-kpi-val">${totalPax}</div>
        <div class="dash-kpi-lbl">Total Covers</div>
        <div class="dash-kpi-sub">Avg party size ${avgParty}</div>
      </div>
      <div class="dash-kpi" style="border-color:${kpiColors[2]}">
        <div class="dash-kpi-val">${cancelRate}%</div>
        <div class="dash-kpi-lbl">Cancellation Rate</div>
        <div class="dash-kpi-sub">${cancelled.length} of ${rangeBookings.length} bookings</div>
      </div>
      <div class="dash-kpi" style="border-color:${kpiColors[3]}">
        <div class="dash-kpi-val">${walkIns.length}</div>
        <div class="dash-kpi-lbl">Walk-ins</div>
        <div class="dash-kpi-sub">${active.length ? Math.round(walkIns.length/active.length*100) : 0}% of active bookings</div>
      </div>
      <div class="dash-kpi" style="border-color:${kpiColors[4]}">
        <div class="dash-kpi-val">${avgDurLabel}</div>
        <div class="dash-kpi-lbl">Avg Dining Time</div>
        <div class="dash-kpi-sub">Based on ${timed.length} timed service${timed.length!==1?'s':''}</div>
      </div>
      <div class="dash-kpi" style="border-color:${kpiColors[5]}">
        <div class="dash-kpi-val">${rescheduled.length}</div>
        <div class="dash-kpi-lbl">Rescheduled</div>
        <div class="dash-kpi-sub">${rangeBookings.length ? Math.round(rescheduled.length/rangeBookings.length*100) : 0}% of all bookings</div>
      </div>
    </div>

    <div class="dash-charts">
      <!-- Covers over time sparkline -->
      <div class="dash-chart-card dash-full">
        <div class="dash-chart-title">Covers Over Time (pax per day)</div>
        <svg viewBox="0 0 ${svgW} ${svgH}" class="dash-sparkline" style="overflow:visible;">
          <defs>
            <linearGradient id="sparkGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stop-color="var(--terracotta)" stop-opacity="0.25"/>
              <stop offset="100%" stop-color="var(--terracotta)" stop-opacity="0.02"/>
            </linearGradient>
          </defs>
          <path d="${areaPath}" fill="url(#sparkGrad)"/>
          <polyline points="${pts}" fill="none" stroke="var(--terracotta)" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round"/>
          ${firstPt.map(([x,y],i) => `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="3" fill="var(--terracotta)">
            <title>${dayEntries[i][0]}: ${dayEntries[i][1]} pax</title>
          </circle>`).join('')}
        </svg>
        <div style="display:flex;justify-content:space-between;font-size:0.65rem;color:var(--coffee);opacity:0.6;margin-top:4px;padding:0 ${svgPad}px;">
          <span>${dayEntries[0]?.[0]||''}</span>
          <span>${dayEntries[Math.floor(dayEntries.length/2)]?.[0]||''}</span>
          <span>${dayEntries[dayEntries.length-1]?.[0]||''}</span>
        </div>
      </div>

      <!-- Covers by time slot -->
      <div class="dash-chart-card">
        <div class="dash-chart-title">Covers by Time Slot</div>
        ${[['Lunch', lunchPax, 'var(--gold)'],['Dinner', dinnerPax, 'var(--terracotta)'],['Other', otherPax, 'var(--coffee)']].map(([lbl,val,clr]) => `
          <div class="dash-bar-row">
            <div class="dash-bar-lbl">${lbl}</div>
            <div class="dash-bar-track"><div class="dash-bar-fill" style="width:${totalPax?Math.round(val/totalPax*100):0}%;background:${clr};"></div></div>
            <div class="dash-bar-val">${val} pax</div>
          </div>`).join('')}
      </div>

      <!-- Booking status donut -->
      <div class="dash-chart-card">
        <div class="dash-chart-title">Booking Status</div>
        <div class="dash-donut-wrap">
          <svg viewBox="0 0 110 110" width="90" height="90" style="flex-shrink:0;">
            ${donutArcs}
            <circle cx="55" cy="55" r="24" fill="white"/>
            <text x="55" y="58" text-anchor="middle" font-size="11" font-weight="700" fill="var(--espresso)">${grandTotal}</text>
          </svg>
          <div class="dash-donut-legend">
            ${statusLabels.map((lbl,i) => `
              <div class="dash-donut-leg-item">
                <div class="dash-donut-dot" style="background:${donutColors[i]};"></div>
                <span>${lbl}: <strong>${statusTotals[i]}</strong></span>
              </div>`).join('')}
          </div>
        </div>
      </div>

      <!-- Top tables -->
      <div class="dash-chart-card">
        <div class="dash-chart-title">Busiest Tables</div>
        ${topTables.length ? topTables.map(({name,cnt}) => `
          <div class="dash-bar-row">
            <div class="dash-bar-lbl">${esc(name)}</div>
            <div class="dash-bar-track"><div class="dash-bar-fill" style="width:${Math.round(cnt/maxTbl*100)}%;background:var(--espresso);"></div></div>
            <div class="dash-bar-val">${cnt}</div>
          </div>`).join('') : '<div style="font-size:0.8rem;color:var(--coffee);opacity:0.6;">No data yet</div>'}
      </div>

      <!-- RSVP channels -->
      <div class="dash-chart-card">
        <div class="dash-chart-title">Booking Channels</div>
        ${channelEntries.length ? channelEntries.slice(0,6).map(([lbl,cnt],i) => `
          <div class="dash-bar-row">
            <div class="dash-bar-lbl">${esc(lbl)}</div>
            <div class="dash-bar-track"><div class="dash-bar-fill" style="width:${Math.round(cnt/maxCh*100)}%;background:${kpiColors[i%kpiColors.length]};"></div></div>
            <div class="dash-bar-val">${cnt}</div>
          </div>`).join('') : '<div style="font-size:0.8rem;color:var(--coffee);opacity:0.6;">No data yet</div>'}
      </div>

      <!-- Top guests -->
      <div class="dash-chart-card">
        <div class="dash-chart-title">Top Guests (by visits)</div>
        ${topGuests.length ? topGuests.map((g,i) => `
          <div class="dash-bar-row">
            <div class="dash-bar-lbl" style="font-size:0.72rem;">${esc(g.name.split(' ')[0])}</div>
            <div class="dash-bar-track"><div class="dash-bar-fill" style="width:${Math.round(g.visits/(topGuests[0]?.visits||1)*100)}%;background:${kpiColors[i%kpiColors.length]};"></div></div>
            <div class="dash-bar-val">${g.visits}×</div>
          </div>`).join('') : '<div style="font-size:0.8rem;color:var(--coffee);opacity:0.6;">No guest data yet</div>'}
      </div>
    </div>
  `;
}

// ════════════════════════════════════════════
//  REPORTING
// ════════════════════════════════════════════

function setReportToday() {
  const rd = document.getElementById('reportDate');
  if (rd) rd.value = today();
}

function fmtReportDate(d) {
  const dt = new Date(d + 'T00:00:00');
  return dt.toLocaleDateString('en-US', { weekday:'long', year:'numeric', month:'long', day:'numeric' });
}

function ordinalDay(d) {
  const dt = new Date(d + 'T00:00:00');
  const day = dt.getDate();
  const suffix = ['th','st','nd','rd'];
  const v = day % 100;
  return day + (suffix[(v-20)%10] || suffix[v] || suffix[0]);
}

function fmtReportDateFull(d) {
  const dt = new Date(d + 'T00:00:00');
  const weekday = dt.toLocaleDateString('en-US', { weekday:'long' });
  const month   = dt.toLocaleDateString('en-US', { month:'long' });
  const year    = dt.getFullYear();
  return `${weekday}, ${month} ${ordinalDay(d)} ${year}`;
}

function fmtTimeDot(t) {
  // Returns "HH.MM" format like "10.30"
  if (!t) return '--';
  const [h, m] = t.split(':');
  return `${h}.${m}`;
}

function buildDailyReport(date) {
  if (!date) return null;

  const allDay = S.bookings.filter(b => b.date === date);
  // Also include bookings originally on this date (rescheduled away)
  const rescheduledAway = S.bookings.filter(b => b.rescheduled && b.originalDate === date);

  // Active (not cancelled) bookings currently scheduled on this date
  const active = allDay.filter(b => b.status !== 'cancelled');
  const cancelled = allDay.filter(b => b.status === 'cancelled');
  // Rescheduled away = originally on this date but now moved
  const rescheduledAwayCount = rescheduledAway.filter(b => b.originalDate === date && b.date !== date);
  // Rescheduled in = arrived on this date but originally from another date
  const rescheduledIn = active.filter(b => b.rescheduled && b.originalDate && b.originalDate !== date);

  // Walk-ins: RSVP = 'Walkin'
  const walkIns = active.filter(b => b.rsvp === 'Walkin');
  const reservations = active.filter(b => b.rsvp !== 'Walkin');

  // Lunch: 10:00–17:59, Dinner: 18:00–22:00 (using start time)
  function inLunch(b)  { const m = timeToMins(b.time); return m >= timeToMins('10:00') && m < timeToMins('18:00'); }
  function inDinner(b) { const m = timeToMins(b.time); return m >= timeToMins('18:00') && m <= timeToMins('22:00'); }

  const lunchRes    = reservations.filter(inLunch);
  const lunchWalk   = walkIns.filter(inLunch);
  const lunchCancel = cancelled.filter(b => inLunch(b));
  const lunchRsched = rescheduledAwayCount.filter(b => inLunch(b));
  const lunchRschedIn = rescheduledIn.filter(inLunch);

  const dinnerRes    = reservations.filter(inDinner);
  const dinnerWalk   = walkIns.filter(inDinner);
  const dinnerCancel = cancelled.filter(b => inDinner(b));
  const dinnerRsched = rescheduledAwayCount.filter(b => inDinner(b));
  const dinnerRschedIn = rescheduledIn.filter(inDinner);

  const pax = arr => arr.reduce((s,b) => s+b.partySize, 0);

  // First guest in / last guest out
  let firstTime = '--', lastTime = '--';
  if (active.length) {
    const sorted = [...active].sort((a,b) => a.time.localeCompare(b.time));
    firstTime = fmtTimeDot(sorted[0].time);
    // Last guest out = latest endTime or start+block
    const lastOut = [...active].sort((a,b) => bookingEndMins(b) - bookingEndMins(a));
    const lastMins = bookingEndMins(lastOut[0]);
    const hh = String(Math.floor(lastMins/60)%24).padStart(2,'0');
    const mm = String(lastMins%60).padStart(2,'0');
    lastTime = fmtTimeDot(hh+':'+mm);
  }

  const totalBks = active.length;
  const totalPax = pax(active);

  return {
    date, firstTime, lastTime,
    lunch:  { res:lunchRes,  walk:lunchWalk,  cancel:lunchCancel,  rsched:lunchRsched,  rschedIn:lunchRschedIn  },
    dinner: { res:dinnerRes, walk:dinnerWalk, cancel:dinnerCancel, rsched:dinnerRsched, rschedIn:dinnerRschedIn },
    totalBks, totalPax, pax
  };
}

function renderDailyReport() {
  const date = document.getElementById('reportDate')?.value;
  const out  = document.getElementById('dailyReportOutput');
  if (!out) return;
  if (!date) { out.innerHTML = '<div class="empty" style="padding:20px;"><p>Select a date to generate the report.</p></div>'; return; }

  const r = buildDailyReport(date);
  const { lunch: L, dinner: D, pax } = r;

  const sect = (label, res, walk, cancel, rsched) => `
    <div class="report-section">${label}</div>
    <div class="report-line">Total Reservation : <strong>${res.length} Booking${res.length!==1?'s':''}, ${pax(res)} pax</strong></div>
    <div class="report-sub">- Reservation Cancelled : ${cancel.length} Booking${cancel.length!==1?'s':''}, ${pax(cancel)} pax</div>
    <div class="report-sub">- Reservation Rescheduled : ${rsched.length} Booking${rsched.length!==1?'s':''}, ${pax(rsched)} pax</div>
    <div class="report-line">Total Walk In : <strong>${walk.length} Booking${walk.length!==1?'s':''}, ${pax(walk)} pax</strong></div>
  `;

  out.innerHTML = `
    <div class="report-box">
      <div class="report-title">Daily Guest Report</div>
      <div class="report-date">${fmtReportDateFull(date)}</div>
      <div class="report-meta">
        Start Guest In &nbsp;: &nbsp;<strong>${r.firstTime}</strong><br>
        Last Guest In &nbsp;&nbsp;: &nbsp;<strong>${r.lastTime}</strong>
      </div>
      ${sect('Lunch (10:00 – 17:59)', L.res, L.walk, L.cancel, L.rsched)}
      ${sect('Dinner (18:00 – 22:00)', D.res, D.walk, D.cancel, D.rsched)}
      <div class="report-total">
        Total Guest All Day : ${r.totalBks} Booking${r.totalBks!==1?'s':''}, ${r.totalPax} pax
      </div>
      <div class="report-footer">
        Regards,<br>Host Department
      </div>
    </div>
  `;
}

function buildReportPlainText(date) {
  const r = buildDailyReport(date);
  if (!r) return '';
  const { lunch: L, dinner: D, pax } = r;
  const line = (label, arr, cArr, rArr, wArr) =>
`${label}
Total Reservation : ${arr.length} Booking${arr.length!==1?'s':''}, ${pax(arr)} pax
- Reservation Cancelled : ${cArr.length} Booking${cArr.length!==1?'s':''}, ${pax(cArr)} pax
- Reservation Rescheduled : ${rArr.length} Booking${rArr.length!==1?'s':''}, ${pax(rArr)} pax
Total Walk In : ${wArr.length} Booking${wArr.length!==1?'s':''}, ${pax(wArr)} pax`;

  return `*DAILY GUEST REPORT*

${fmtReportDateFull(date)}
Start Guest In : ${r.firstTime}
Last Guest In : ${r.lastTime}

${line('LUNCH (10:00-17:59)', L.res, L.cancel, L.rsched, L.walk)}

${line('DINNER (18:00-22:00)', D.res, D.cancel, D.rsched, D.walk)}

Total Guest All Day : ${r.totalBks} Booking${r.totalBks!==1?'s':''}, ${r.totalPax} pax

Regards,
Host Department`;
}

function copyReport() {
  const date = document.getElementById('reportDate')?.value;
  if (!date) { toast('Please select a date first'); return; }
  const text = buildReportPlainText(date);
  navigator.clipboard.writeText(text).then(() => toast('Report copied to clipboard!')).catch(() => {
    // Fallback
    const ta = document.createElement('textarea');
    ta.value = text;
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    ta.remove();
    toast('Report copied!');
  });
}

function exportReportExcel() {
  const date = document.getElementById('reportDate')?.value;
  if (!date) { toast('Please select a date first'); return; }
  const r = buildDailyReport(date);
  const { lunch: L, dinner: D, pax } = r;
  const esc2 = s => String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  const row = (label, val) => `<tr><td style="padding:4px 12px;color:#5c3d2e;font-size:12px;">${esc2(label)}</td><td style="padding:4px 12px;font-weight:bold;">${esc2(val)}</td></tr>`;
  const sep = (label) => `<tr><td colspan="2" style="padding:8px 12px;background:#f0e8d8;font-weight:bold;font-size:13px;text-transform:uppercase;letter-spacing:1px;">${esc2(label)}</td></tr>`;

  const html = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel">
<head><meta charset="UTF-8"></head><body>
<table border="1" cellpadding="4" style="border-collapse:collapse;font-family:Arial,sans-serif;font-size:13px;">
  <tr><td colspan="2" style="text-align:center;font-size:16px;font-weight:bold;padding:12px;background:#2c1810;color:#fdf8f2;">DAILY GUEST REPORT</td></tr>
  <tr><td colspan="2" style="text-align:center;padding:8px;background:#f0e8d8;font-size:13px;">${esc2(fmtReportDateFull(date))}</td></tr>
  ${row('Start Guest In', r.firstTime)}
  ${row('Last Guest In', r.lastTime)}
  ${sep('Lunch (10:00 – 17:59)')}
  ${row('Total Reservation', L.res.length + ' Bookings, ' + pax(L.res) + ' pax')}
  ${row('  - Reservation Cancelled', L.cancel.length + ' Bookings, ' + pax(L.cancel) + ' pax')}
  ${row('  - Reservation Rescheduled', L.rsched.length + ' Bookings, ' + pax(L.rsched) + ' pax')}
  ${row('Total Walk In', L.walk.length + ' Bookings, ' + pax(L.walk) + ' pax')}
  ${sep('Dinner (18:00 – 22:00)')}
  ${row('Total Reservation', D.res.length + ' Bookings, ' + pax(D.res) + ' pax')}
  ${row('  - Reservation Cancelled', D.cancel.length + ' Bookings, ' + pax(D.cancel) + ' pax')}
  ${row('  - Reservation Rescheduled', D.rsched.length + ' Bookings, ' + pax(D.rsched) + ' pax')}
  ${row('Total Walk In', D.walk.length + ' Bookings, ' + pax(D.walk) + ' pax')}
  <tr><td colspan="2" style="padding:4px;"></td></tr>
  <tr><td style="padding:8px 12px;font-weight:bold;font-size:13px;">Total Guest All Day</td><td style="padding:8px 12px;font-weight:bold;font-size:13px;">${r.totalBks} Bookings, ${r.totalPax} pax</td></tr>
  <tr><td colspan="2" style="padding:8px 12px;color:#888;font-style:italic;">Regards, Host Department</td></tr>
</table></body></html>`;

  const blob = new Blob([html], { type: 'application/vnd.ms-excel' });
  dlBlob(blob, `daily-report-${date}.xls`);
  toast('Report exported!');
}

// Active filter style
const style = document.createElement('style');
style.textContent = `.active-filter{background:var(--espresso)!important;color:var(--cream)!important;}`;
document.head.appendChild(style);

// ════════════════════════════════════════════
//  INIT
// ════════════════════════════════════════════
(function init() {
  load();
  document.getElementById('todayLabel').textContent =
    new Date().toLocaleDateString('en-US',{weekday:'long',month:'long',day:'numeric',year:'numeric'});

  // Default daily date to today
  const sd = document.getElementById('summaryDate');
  if (sd) sd.value = today();

  // Set filter btn initial style
  document.getElementById('fb-upcoming').style.background = 'var(--espresso)';
  document.getElementById('fb-upcoming').style.color      = 'var(--cream)';

  renderBookings();

  // Close modal on backdrop click
  document.getElementById('bookingModal').addEventListener('click', function(e){
    if (e.target===this) closeModal();
  });
  document.getElementById('tableScheduleModal').addEventListener('click', function(e){
    if (e.target===this) closeTableSchedule();
  });
  document.getElementById('guestModal').addEventListener('click', function(e){
    if (e.target===this) closeGuestModal();
  });
  document.getElementById('rescheduleModal').addEventListener('click', function(e){
    if (e.target===this) closeRescheduleModal();
  });
})();