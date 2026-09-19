// List views: machines, alarms, maintenance, users, audit.
const VIEWS = {
  dashboard: () => dashboardView(),
  machines: () => machinesView(),
  alarms: () => alarmsView(),
  maintenance: () => maintenanceView(),
  plan: () => planView(),
  users: () => usersView(),
  audit: () => auditView(),
};
const LISTS = {
  machines: () => machinesList(),
  alarms: () => alarmsList(),
  maintenance: () => maintenanceList(),
  plan: () => (S.pmView === "calendar" ? planCalendar() : S.pmView === "list" ? planList() : planByMachine()),
};
function refreshList() {
  const el = document.getElementById("list");
  if (el && LISTS[S.route]) el.innerHTML = LISTS[S.route]();
}
function opts(list, sel, all) {
  return (all ? `<option value="">${all}</option>` : "") + list.map(o => {
    const [v, l] = Array.isArray(o) ? o : [o, o];
    return `<option value="${esc(v)}" ${String(v) === String(sel) ? "selected" : ""}>${esc(l)}</option>`;
  }).join("");
}
function searchBox(key, ph) {
  return `<div class="search">${icon("search")}<input class="input" id="f-${key}" type="search" data-filter="${key}" placeholder="${ph}" value="${esc(S.f[key])}"></div>`;
}
function selectFilter(key, list, all, label) {
  return `<select class="input" id="f-${key}" data-filter="${key}" aria-label="${label}">${opts(list, S.f[key], all)}</select>`;
}
function technicians() { return S.db.users.filter(u => u.role === "technician" || u.role === "admin"); }

// ---------- Machines ----------
function machinesView() {
  return `<div class="panel">
    <div class="panel-head toolbar">
      ${searchBox("mq", "ค้นหา Machine ID หรือชื่อ")}
      ${selectFilter("mstatus", MACHINE_STATUS, "ทุกสถานะ", "กรองสถานะ")}
      ${selectFilter("mtype", MACHINE_TYPES, "ทุกประเภท", "กรองประเภท")}
      <span style="flex:1"></span>
      ${can("machineWrite") ? `<button class="btn primary" data-act="machine-new">${icon("plus")} เพิ่มเครื่องจักร</button>` : `<span class="hint">${icon("lock")} ดูได้อย่างเดียว</span>`}
    </div>
    <div id="list">${machinesList()}</div>
  </div>`;
}
function machinesList() {
  const q = S.f.mq.trim().toLowerCase();
  const rows = S.db.machines.filter(m =>
    (!q || m.id.toLowerCase().includes(q) || m.name.toLowerCase().includes(q)) &&
    (!S.f.mstatus || m.status === S.f.mstatus) && (!S.f.mtype || m.type === S.f.mtype));
  if (!rows.length) return `<div class="empty">ไม่พบเครื่องจักรที่ตรงกับเงื่อนไข</div>`;
  return `<div class="table-wrap"><table>
    <thead><tr><th>Machine ID</th><th>ชื่อเครื่อง</th><th>ประเภท</th><th>Location</th><th>สถานะ</th><th>Alarm ค้าง</th><th>PM ถัดไป</th><th></th></tr></thead>
    <tbody>${rows.map(m => {
      const n = activeAlarms(m.id).length;
      const np = machinePlans(m.id)[0];
      const pmCell = np ? `<span class="num">${fmtD(np.nextDue)}</span><span class="sub due ${planState(np) === "issued" ? "" : planState(np)}">${planWO(np) ? "ออกใบงานแล้ว" : dueText(np)}</span>` : `<span class="muted">ไม่มีแผน</span>`;
      return `<tr class="clickable" data-act="machine-history" data-id="${m.id}">
        <td class="mono"><b>${esc(m.id)}</b></td><td>${esc(m.name)}</td><td>${esc(m.type)}</td><td>${esc(m.location)}</td>
        <td>${pill(m.status)}</td><td class="num">${n ? `<b style="color:var(--alarm)">${n}</b>` : `<span class="muted">0</span>`}</td>
        <td>${pmCell}</td>
        <td><div class="row-actions">${can("machineWrite") ? `
          <button class="icon-btn" data-act="machine-edit" data-id="${m.id}" aria-label="แก้ไข ${esc(m.id)}" title="แก้ไข">${icon("edit")}</button>
          <button class="icon-btn" data-act="machine-delete" data-id="${m.id}" aria-label="ลบ ${esc(m.id)}" title="ลบ">${icon("trash")}</button>` : ""}</div></td>
      </tr>`;
    }).join("")}</tbody></table></div>
    <div class="panel-body count">แสดง ${rows.length} จาก ${S.db.machines.length} เครื่อง · คลิกแถวเพื่อดูประวัติเครื่อง</div>`;
}

// ---------- Alarms ----------
function alarmsView() {
  return `<div class="panel">
    <div class="panel-head toolbar">
      ${searchBox("aq", "ค้นหา Alarm Code / รายละเอียด")}
      ${selectFilter("astatus", ALARM_STATUS, "ทุกสถานะ", "กรองสถานะ")}
      ${selectFilter("amachine", S.db.machines.map(m => [m.id, `${m.id} · ${m.name}`]), "ทุกเครื่อง", "กรองเครื่องจักร")}
      <input class="input" type="date" id="f-afrom" data-filter="afrom" value="${esc(S.f.afrom)}" aria-label="ตั้งแต่วันที่" title="ตั้งแต่วันที่">
      <input class="input" type="date" id="f-ato" data-filter="ato" value="${esc(S.f.ato)}" aria-label="ถึงวันที่" title="ถึงวันที่">
      <span style="flex:1"></span>
      ${can("alarmCreate") ? `<button class="btn primary" data-act="alarm-new">${icon("plus")} บันทึก Alarm</button>` : ""}
    </div>
    <div id="list">${alarmsList()}</div>
  </div>`;
}
function alarmsList() {
  const q = S.f.aq.trim().toLowerCase();
  const from = S.f.afrom ? new Date(S.f.afrom + "T00:00") : null;
  const to = S.f.ato ? new Date(S.f.ato + "T23:59:59") : null;
  if (from && to && from > to) return `<div class="empty"><span class="err" style="justify-content:center">${icon("alert")} วันที่เริ่มต้องไม่เกินวันที่สิ้นสุด</span></div>`;
  const rows = S.db.alarms.filter(a => {
    const t = new Date(a.occurredAt);
    return (!q || a.code.toLowerCase().includes(q) || a.description.toLowerCase().includes(q) || a.id.toLowerCase().includes(q)) &&
      (!S.f.astatus || a.status === S.f.astatus) && (!S.f.amachine || a.machineId === S.f.amachine) &&
      (!from || t >= from) && (!to || t <= to);
  }).sort((a, b) => b.occurredAt.localeCompare(a.occurredAt));
  if (!rows.length) return `<div class="empty">ไม่พบ Alarm ที่ตรงกับเงื่อนไข</div>`;
  return `<div class="table-wrap"><table>
    <thead><tr><th>เวลาเกิด</th><th>เครื่องจักร</th><th>Alarm</th><th>สาเหตุ</th><th>สถานะ</th><th></th></tr></thead>
    <tbody>${rows.map(a => `<tr class="clickable" data-act="open-alarm" data-id="${a.id}">
      <td class="num" style="white-space:nowrap">${fmtDT(a.occurredAt)}<span class="sub mono">${esc(a.id)}</span></td>
      <td><span class="mono">${esc(a.machineId)}</span><span class="sub">${esc(machineLabel(a.machineId))}</span></td>
      <td><b class="mono">${esc(a.code)}</b> ${esc(a.description)}</td>
      <td>${a.cause ? esc(a.cause) : `<span class="muted">ยังไม่ระบุ</span>`}</td>
      <td>${pill(a.status)}</td>
      <td><div class="row-actions">${can("alarmUpdate") && a.status !== "Closed" ? `<button class="btn sm" data-act="open-alarm" data-id="${a.id}">อัปเดต</button>` : ""}</div></td>
    </tr>`).join("")}</tbody></table></div>
    <div class="panel-body count">แสดง ${rows.length} จาก ${S.db.alarms.length} รายการ</div>`;
}

// ---------- Maintenance ----------
function maintenanceView() {
  return `<div class="panel">
    <div class="panel-head toolbar">
      ${searchBox("nq", "ค้นหาเลขงาน / ปัญหา / เครื่อง")}
      ${selectFilter("nstatus", MNT_STATUS, "ทุกสถานะ", "กรองสถานะ")}
      ${selectFilter("ntech", technicians().map(u => [u.id, u.name]), "ช่างทุกคน", "กรองช่าง")}
      ${selectFilter("ntype", ["Corrective", "Preventive"], "ทุกประเภทงาน", "กรองประเภทงาน")}
      <span style="flex:1"></span>
      ${can("mntWrite") ? `<button class="btn primary" data-act="mnt-new">${icon("plus")} สร้างงานซ่อม</button>` : ""}
    </div>
    <div id="list">${maintenanceList()}</div>
  </div>`;
}
function maintenanceList() {
  const q = S.f.nq.trim().toLowerCase();
  const rows = S.db.maintenance.filter(r =>
    (!q || [r.id, r.problem, r.action, r.machineId, machineLabel(r.machineId)].join(" ").toLowerCase().includes(q)) &&
    (!S.f.nstatus || r.status === S.f.nstatus) && (!S.f.ntech || r.technicianId === S.f.ntech) && (!S.f.ntype || r.type === S.f.ntype)
  ).sort((a, b) => b.date.localeCompare(a.date));
  if (!rows.length) return `<div class="empty">ไม่พบงานซ่อมที่ตรงกับเงื่อนไข</div>`;
  return `<div class="table-wrap"><table>
    <thead><tr><th>เลขงาน</th><th>เครื่องจักร</th><th>ปัญหา / การแก้ไข</th><th>ช่าง</th><th>ประเภท</th><th>สถานะ</th><th></th></tr></thead>
    <tbody>${rows.map(r => `<tr class="clickable" data-act="${can("mntWrite") ? "mnt-edit" : "machine-history"}" data-id="${can("mntWrite") ? r.id : r.machineId}">
      <td class="num" style="white-space:nowrap"><b class="mono">${esc(r.id)}</b>${r.planId ? `<span class="tag">${esc(r.planId)}</span>` : ""}<span class="sub">${fmtDT(r.date)}</span></td>
      <td><span class="mono">${esc(r.machineId)}</span><span class="sub">${esc(machineLabel(r.machineId))}</span></td>
      <td>${esc(r.problem)}<span class="sub">${r.action ? esc(r.action) : "ยังไม่บันทึกการแก้ไข"}</span></td>
      <td>${esc(userName(r.technicianId))}</td>
      <td>${esc(r.type)}</td>
      <td>${pill(r.status)}</td>
      <td><div class="row-actions">${can("mntWrite") ? `<button class="icon-btn" data-act="mnt-edit" data-id="${r.id}" aria-label="แก้ไข ${esc(r.id)}" title="แก้ไข">${icon("edit")}</button>` : ""}</div></td>
    </tr>`).join("")}</tbody></table></div>
    <div class="panel-body count">แสดง ${rows.length} จาก ${S.db.maintenance.length} งาน</div>`;
}

// ---------- Maintenance Plan (Preventive) ----------
function filteredPlans() {
  const q = (S.f.pq || "").trim().toLowerCase();
  return S.db.pmPlans.filter(p => p.active &&
    (!S.pmState || planState(p) === S.pmState) &&
    (!q || [p.id, p.task, p.machineId, machineLabel(p.machineId)].join(" ").toLowerCase().includes(q)));
}
function planView() {
  const plans = S.db.pmPlans.filter(p => p.active);
  const cnt = k => plans.filter(p => planState(p) === k).length;
  return `
  <div class="pm-summary">${["overdue", "soon", "issued", "ok"].map(k => `
    <button class="pm-sum ${k}" data-act="pm-state" data-state="${k}" aria-pressed="${S.pmState === k}"><b>${cnt(k)}</b><span>${PM_STATE[k]}</span></button>`).join("")}
  </div>
  <div class="panel">
    <div class="panel-head toolbar">
      <div class="seg" role="group" aria-label="มุมมอง">
        <button data-act="pm-view" data-view="machine" aria-pressed="${S.pmView === "machine"}">รายเครื่อง</button>
        <button data-act="pm-view" data-view="calendar" aria-pressed="${S.pmView === "calendar"}">ปฏิทิน</button>
        <button data-act="pm-view" data-view="list" aria-pressed="${S.pmView === "list"}">รายการ</button>
      </div>
      ${searchBox("pq", "ค้นหางาน PM หรือเครื่องจักร")}
      ${S.pmState ? `<button class="btn sm" data-act="pm-state" data-state="${S.pmState}">${icon("x")} ล้างตัวกรอง: ${PM_STATE[S.pmState]}</button>` : ""}
      <span style="flex:1"></span>
      ${can("planWrite") ? `<button class="btn primary" data-act="plan-new">${icon("plus")} เพิ่มแผน PM</button>` : ""}
    </div>
    <div id="list">${LISTS.plan()}</div>
  </div>`;
}
// One row per machine, 12 weeks across: when each machine is due for which PM.
function planByMachine() {
  const WEEKS = 12;
  const t = parseD(todayStr());
  const start = addDays(todayStr(), -((t.getDay() + 6) % 7)); // Monday of this week
  const end = addDays(start, WEEKS * 7 - 1);
  const weeks = Array.from({ length: WEEKS }, (_, i) => addDays(start, i * 7));
  const plans = filteredPlans();
  const filtering = S.pmState || (S.f.pq || "").trim();
  const rows = S.db.machines
    .map(m => ({ m, plans: plans.filter(p => p.machineId === m.id) }))
    .filter(r => !filtering || r.plans.length)
    .map(r => ({ ...r, rank: r.plans.length ? Math.min(...r.plans.map(p => PM_RANK[planState(p)])) : 9 }))
    .sort((a, b) => a.rank - b.rank || a.m.id.localeCompare(b.m.id));
  if (!rows.length) return `<div class="empty">ไม่พบเครื่องที่มีแผน PM ตรงกับเงื่อนไข</div>`;
  const noPlan = S.db.machines.filter(m => !machinePlans(m.id).length).length;

  const cellsFor = mp => {
    const buckets = weeks.map(() => []);
    mp.forEach(p => {
      if (p.nextDue < start) buckets[0].push({ p, projected: false });
      for (let d = p.nextDue, i = 0; d <= end && i < 100; d = addDays(d, p.intervalDays), i++) {
        if (d >= start) buckets[Math.floor(daysBetween(start, d) / 7)].push({ p, d, projected: d !== p.nextDue });
      }
    });
    return buckets.map((b, i) => `<td class="${i === 0 ? "now" : ""}"><div class="cellstack">${b.map(({ p, d, projected }) => {
      const cls = projected ? "projected" : planState(p);
      return `<button class="mk ${cls}" data-act="plan-detail" data-id="${p.id}" title="${esc(p.id)} · ${esc(p.task)} · ${fmtD(d || p.nextDue)}${projected ? " (รอบถัดไปตามแผน)" : ""}">${esc(p.id)}</button>`;
    }).join("")}</div></td>`).join("");
  };

  return `<div class="table-wrap"><table class="tl">
    <thead><tr><th class="tl-m">เครื่องจักร</th><th class="tl-sum">PM ถัดไป</th>
      ${weeks.map((w, i) => `<th class="wk ${i === 0 ? "now" : ""}">${i === 0 ? "สัปดาห์นี้" : fmtShort(w)}<small>${i === 0 ? fmtShort(w) : "W" + isoWeek(w)}</small></th>`).join("")}</tr></thead>
    <tbody>${rows.map(({ m, plans: mp }) => {
      const next = mp.slice().sort((a, b) => a.nextDue.localeCompare(b.nextDue))[0];
      return `<tr>
        <th class="tl-m" scope="row"><button class="tl-name" data-act="machine-history" data-id="${m.id}"><b><span class="mono">${esc(m.id)}</span> ${esc(m.name)}</b><span class="sub">${esc(m.type)} · ${esc(m.location)} · ${mp.length} แผน</span></button></th>
        ${mp.length ? `<td class="tl-sum"><span class="num">${fmtD(next.nextDue)}</span><span class="sub due ${planState(next) === "issued" ? "" : planState(next)}">${planWO(next) ? "ออกใบงานแล้ว" : dueText(next)}</span></td>${cellsFor(mp)}`
          : `<td colspan="${WEEKS + 1}"><div class="noplan">${icon("alert")} ยังไม่มีแผน PM สำหรับเครื่องนี้
              ${can("planWrite") ? `<button class="btn sm" data-act="plan-new" data-machine="${m.id}">${icon("plus")} เพิ่มแผน</button>` : ""}</div></td>`}
      </tr>`;
    }).join("")}</tbody></table></div>
    <div class="panel-body legend" style="margin:0">
      <span><i style="background:var(--alarm)"></i>เกินกำหนด</span><span><i style="background:var(--mnt)"></i>ครบใน 7 วัน</span>
      <span><i style="background:var(--accent)"></i>ออกใบงานแล้ว</span><span><i style="background:var(--ok)"></i>ตามแผน</span>
      <span><i style="border:1px dashed var(--faint)"></i>รอบถัดไป (คาดการณ์)</span>
      ${noPlan && !filtering ? `<span style="margin-left:auto">เครื่องที่ยังไม่มีแผน ${noPlan} เครื่อง</span>` : ""}
    </div>`;
}
function daysBetween(a, b) { return Math.round((parseD(b) - parseD(a)) / 864e5); }
function fmtShort(s) { return parseD(s).toLocaleDateString("th-TH", { day: "numeric", month: "short" }); }
function isoWeek(s) {
  const d = parseD(s); d.setDate(d.getDate() + 3 - ((d.getDay() + 6) % 7));
  const w1 = new Date(d.getFullYear(), 0, 4);
  return 1 + Math.round(((d - w1) / 864e5 - 3 + ((w1.getDay() + 6) % 7)) / 7);
}

function planList() {
  const rows = filteredPlans().sort((a, b) => a.nextDue.localeCompare(b.nextDue));
  if (!rows.length) return `<div class="empty">ไม่พบแผน PM ที่ตรงกับเงื่อนไข</div>`;
  return `<div class="table-wrap"><table>
    <thead><tr><th>แผน PM</th><th>เครื่องจักร</th><th>ความถี่</th><th>ทำล่าสุด</th><th>ครบกำหนดถัดไป</th><th>ช่าง</th><th></th></tr></thead>
    <tbody>${rows.map(p => {
      const st = planState(p), wo = planWO(p);
      return `<tr class="clickable" data-act="plan-detail" data-id="${p.id}">
        <td><b class="mono">${esc(p.id)}</b><span class="sub" style="color:var(--ink)">${esc(p.task)}</span></td>
        <td><span class="mono">${esc(p.machineId)}</span><span class="sub">${esc(machineLabel(p.machineId))}</span></td>
        <td>${esc(freqLabel(p.intervalDays))}</td>
        <td class="num">${p.lastDone ? fmtD(p.lastDone) : "—"}</td>
        <td><span class="num">${fmtD(p.nextDue)}</span><span class="sub due ${st === "issued" ? "" : st}">${wo ? `ออกใบงาน ${esc(wo.id)} แล้ว` : dueText(p)}</span></td>
        <td>${esc(userName(p.technicianId))}</td>
        <td><div class="row-actions">
          ${wo ? `<button class="btn sm" data-act="mnt-edit" data-id="${wo.id}">ดูใบงาน</button>`
            : can("pmIssue") ? `<button class="btn sm ${st === "overdue" || st === "soon" ? "primary" : ""}" data-act="pm-issue" data-id="${p.id}">ออกใบงาน</button>` : ""}
          ${can("planWrite") ? `<button class="icon-btn" data-act="plan-edit" data-id="${p.id}" aria-label="แก้ไข ${esc(p.id)}" title="แก้ไขแผน">${icon("edit")}</button>` : ""}
        </div></td>
      </tr>`;
    }).join("")}</tbody></table></div>
    <div class="panel-body count">${rows.length} แผน · เรียงตามวันครบกำหนด</div>`;
}
function planCalendar() {
  const first = new Date(); first.setHours(0, 0, 0, 0); first.setDate(1); first.setMonth(first.getMonth() + S.pmMonth);
  const y = first.getFullYear(), m = first.getMonth();
  const lead = (first.getDay() + 6) % 7; // weeks start on Monday
  const daysInMonth = new Date(y, m + 1, 0).getDate();
  const cells = Math.ceil((lead + daysInMonth) / 7) * 7;
  const start = dstr(new Date(y, m, 1 - lead)), end = dstr(new Date(y, m, cells - lead));
  const byDay = {};
  const today0 = todayStr();
  filteredPlans().forEach(p => {
    // Overdue from an earlier month: pin it to today so it can't drop off the calendar.
    if (p.nextDue < start && today0 >= start && today0 <= end) (byDay[today0] = byDay[today0] || []).push({ p, projected: false });
    for (let d = p.nextDue, i = 0; d <= end && i < 60; d = addDays(d, p.intervalDays), i++) {
      if (d >= start) (byDay[d] = byDay[d] || []).push({ p, projected: d !== p.nextDue });
    }
  });
  const today = todayStr();
  const monthLabel = first.toLocaleDateString("th-TH", { month: "long", year: "numeric" });
  let grid = "";
  for (let i = 0; i < cells; i++) {
    const d = dstr(new Date(y, m, 1 - lead + i));
    const inMonth = parseD(d).getMonth() === m;
    grid += `<div class="day ${inMonth ? "" : "out"} ${d === today ? "today" : ""}"><span class="d">${parseD(d).getDate()}</span>
      ${(byDay[d] || []).map(({ p, projected }) => `<button class="chip ${projected ? "projected" : planState(p)}" data-act="plan-detail" data-id="${p.id}"
        title="${esc(p.id)} · ${esc(p.machineId)} · ${esc(p.task)}${projected ? " (รอบถัดไปตามแผน)" : ""}"><b>${esc(p.machineId)}</b><span>${esc(p.task)}</span></button>`).join("")}
    </div>`;
  }
  return `
    <div class="panel-body cal-head">
      <button class="icon-btn" data-act="pm-month" data-step="-1" aria-label="เดือนก่อน">${icon("left")}</button>
      <h2>${monthLabel}</h2>
      <button class="icon-btn" data-act="pm-month" data-step="1" aria-label="เดือนถัดไป">${icon("right")}</button>
      ${S.pmMonth ? `<button class="btn sm" data-act="pm-month" data-step="0">เดือนนี้</button>` : ""}
    </div>
    <div class="cal">${["จ", "อ", "พ", "พฤ", "ศ", "ส", "อา"].map(x => `<div class="dow">${x}</div>`).join("")}${grid}</div>
    <div class="panel-body legend" style="margin:0">
      <span><i style="background:var(--alarm)"></i>เกินกำหนด</span><span><i style="background:var(--mnt)"></i>ครบใน 7 วัน</span>
      <span><i style="background:var(--accent)"></i>ออกใบงานแล้ว</span><span><i style="background:var(--ok)"></i>ตามแผน</span>
      <span><i style="border:1px dashed var(--faint)"></i>รอบถัดไป (คาดการณ์)</span>
    </div>`;
}

// ---------- Users (Admin) ----------
function usersView() {
  return `<div class="panel">
    <div class="panel-head"><h2>ผู้ใช้และสิทธิ์</h2><span class="count" style="margin-left:auto">${S.db.users.length} บัญชี</span></div>
    <div class="table-wrap"><table>
      <thead><tr><th>ชื่อ</th><th>อีเมล</th><th>Role</th><th>สถานะบัญชี</th></tr></thead>
      <tbody>${S.db.users.map(u => {
        const self = u.id === S.session;
        return `<tr>
          <td><div style="display:flex;gap:10px;align-items:center"><span class="avatar">${esc(initials(u.name))}</span><b>${esc(u.name)}</b>${self ? `<span class="role-tag">คุณ</span>` : ""}</div></td>
          <td class="mono">${esc(u.email)}</td>
          <td><select class="input" style="width:auto" id="role-${u.id}" data-act-change="set-role" data-id="${u.id}" ${self ? "disabled title=\"เปลี่ยน Role ของตัวเองไม่ได้ เพื่อกันการล็อกตัวเองออกจากระบบ\"" : ""} aria-label="Role ของ ${esc(u.name)}">
            ${opts(Object.keys(ROLES).map(k => [k, ROLES[k].label]), u.role)}</select></td>
          <td>${self ? `<span class="pill running">Active</span>` : `<button class="btn sm ${u.active ? "" : "primary"}" data-act="toggle-user" data-id="${u.id}">${u.active ? "ปิดการใช้งาน" : "เปิดใช้งาน"}</button>`}</td>
        </tr>`;
      }).join("")}</tbody></table></div>
  </div>
  <div class="panel"><div class="panel-body">
    <div class="eyebrow" style="margin-bottom:10px">สิทธิ์ของแต่ละ Role</div>
    <div class="table-wrap"><table style="min-width:560px">
      <thead><tr><th>Role</th><th>ดูข้อมูล</th><th>เพิ่ม/แก้ไข</th><th>จัดการ User</th></tr></thead>
      <tbody>
        <tr><td><b>Admin</b></td><td>ทั้งหมด</td><td>ทั้งหมด (รวม Machine CRUD และแผน PM)</td><td>ได้</td></tr>
        <tr><td><b>Technician</b></td><td>Machine / Alarm / Maintenance / แผน PM</td><td>Alarm, Maintenance และออกใบงาน PM</td><td>ไม่ได้</td></tr>
        <tr><td><b>Viewer</b></td><td>Dashboard</td><td>ไม่ได้</td><td>ไม่ได้</td></tr>
      </tbody></table></div>
  </div></div>`;
}

// ---------- Audit ----------
function auditView() {
  const rows = S.db.audit.slice(0, 60);
  return `<div class="panel">
    <div class="panel-head"><h2>ใครเปลี่ยนอะไร เมื่อไร</h2><span class="count" style="margin-left:auto">${S.db.audit.length} เหตุการณ์</span></div>
    ${rows.length ? `<div class="table-wrap"><table style="min-width:560px"><thead><tr><th>เวลา</th><th>ผู้ใช้</th><th>การกระทำ</th></tr></thead>
    <tbody>${rows.map(r => `<tr><td class="num" style="white-space:nowrap">${fmtDT(r.at)}</td><td>${esc(userName(r.userId))}</td><td>${esc(r.text)}</td></tr>`).join("")}</tbody></table></div>`
      : `<div class="empty">ยังไม่มีเหตุการณ์</div>`}
  </div>`;
}

// ---------- Machine history drawer ----------
function machineHistoryHTML(id) {
  const m = machine(id);
  if (!m) return "";
  const items = [
    ...S.db.alarms.filter(a => a.machineId === id).map(a => ({ t: a.occurredAt, k: "a", html: `<b class="mono">${esc(a.code)}</b> ${esc(a.description)} ${pill(a.status)}<span class="sub muted" style="display:block;font-size:12.5px">${fmtDT(a.occurredAt)}${a.action ? " · " + esc(a.action) : ""}</span>` })),
    ...S.db.maintenance.filter(r => r.machineId === id).map(r => ({ t: r.date, k: "m", html: `<b class="mono">${esc(r.id)}</b> ${esc(r.problem)} ${pill(r.status)}<span class="sub muted" style="display:block;font-size:12.5px">${fmtDT(r.date)} · ${esc(userName(r.technicianId))}${r.action ? " · " + esc(r.action) : ""}</span>` })),
  ].sort((a, b) => b.t.localeCompare(a.t));
  return `
    <dl class="kv">
      <dt>Machine ID</dt><dd class="mono"><b>${esc(m.id)}</b></dd>
      <dt>ประเภท</dt><dd>${esc(m.type)}</dd>
      <dt>Location</dt><dd>${esc(m.location)}</dd>
      <dt>สถานะ</dt><dd>${pill(m.status)}</dd>
      <dt>Alarm ทั้งหมด</dt><dd class="num">${S.db.alarms.filter(a => a.machineId === id).length} ครั้ง</dd>
    </dl>
    <div class="eyebrow">แผนซ่อมบำรุง (PM) ของเครื่องนี้</div>
    ${machinePlans(id).length ? `<div class="pm-rows">${machinePlans(id).map(p => {
      const st = planState(p);
      return `<button class="pm-row" data-act="plan-detail" data-id="${p.id}">
        <span><b class="mono">${esc(p.id)}</b> ${esc(p.task)}</span>
        <span class="due ${st === "issued" ? "" : st}">${planWO(p) ? "ออกใบงานแล้ว" : dueText(p)}</span>
        <small>${esc(freqLabel(p.intervalDays))} · ครบกำหนด ${fmtD(p.nextDue)} · ทำล่าสุด ${p.lastDone ? fmtD(p.lastDone) : "—"}</small>
      </button>`;
    }).join("")}</div>` : `<div class="callout">ยังไม่มีแผน PM สำหรับเครื่องนี้</div>`}
    <div class="eyebrow">ประวัติเครื่อง (Alarm และงานซ่อม)</div>
    ${items.length ? `<ul class="timeline">${items.map(i => `<li class="${i.k}">${i.html}</li>`).join("")}</ul>` : `<div class="callout">ยังไม่มีประวัติ</div>`}`;
}
