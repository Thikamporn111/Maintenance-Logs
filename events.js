// Modals, forms with validation, business rules, event wiring, boot.

// ---------- modal rendering ----------
function fieldHTML(f, v, err) {
  const id = "fld-" + f.name;
  const dis = f.disabled ? "disabled" : "";
  let input;
  if (f.type === "select") input = `<select class="input" id="${id}" name="${f.name}" ${dis}>${opts(f.options, v, f.placeholder)}</select>`;
  else if (f.type === "textarea") input = `<textarea class="input" id="${id}" name="${f.name}" placeholder="${esc(f.placeholder || "")}" ${dis}>${esc(v)}</textarea>`;
  else input = `<input class="input ${f.mono ? "mono" : ""}" id="${id}" name="${f.name}" type="${f.type || "text"}" value="${esc(v)}" placeholder="${esc(f.placeholder || "")}" ${dis}>`;
  return `<div class="field ${f.full ? "full" : ""} ${err ? "invalid" : ""}">
    <label for="${id}">${esc(f.label)}${f.required ? ' <span class="req">*</span>' : ""}</label>${input}
    ${err ? `<span class="err" id="${id}-err">${icon("alert")}${esc(err)}</span>` : f.hint ? `<span class="hint">${f.hint}</span>` : ""}
  </div>`;
}

function renderModal() {
  const root = document.getElementById("modal-root");
  if (!root) return;
  const m = S.modal;
  if (!m) { root.innerHTML = ""; return; }
  const head = `<div class="modal-head"><h2>${m.title}</h2><button type="button" class="icon-btn" data-act="close-modal" aria-label="ปิด">${icon("x")}</button></div>`;
  if (m.kind === "drawer") {
    root.innerHTML = `<div class="scrim drawer-scrim" data-act="close-modal-bg"><aside class="drawer" role="dialog" aria-modal="true" aria-label="${esc(m.title)}">
      ${head}<div class="modal-body">${m.body}</div>${m.foot ? `<div class="modal-foot">${m.foot}</div>` : ""}</aside></div>`;
    return;
  }
  if (m.kind === "confirm") {
    root.innerHTML = `<div class="scrim" data-act="close-modal-bg"><div class="modal sm" role="dialog" aria-modal="true" aria-label="${esc(m.title)}">
      ${head}<div class="modal-body">${m.body}</div>
      <div class="modal-foot"><button type="button" class="btn" data-act="close-modal">${m.onOk ? "ยกเลิก" : "ปิด"}</button>
      ${m.onOk ? `<button type="button" class="btn ${m.danger ? "danger solid" : "primary"}" data-act="confirm-ok">${esc(m.okLabel)}</button>` : ""}</div></div></div>`;
    return;
  }
  const errs = m.errors || {};
  const nErr = Object.keys(errs).length;
  root.innerHTML = `<div class="scrim" data-act="close-modal-bg"><form class="modal" data-form="modal" novalidate role="dialog" aria-modal="true" aria-label="${esc(m.title)}">
    ${head}
    <div class="modal-body">
      ${m.intro || ""}
      ${nErr ? `<div class="callout warn" role="alert">${icon("alert")} แก้ไขข้อมูล ${nErr} ช่องที่ไม่ถูกต้องก่อนบันทึก</div>` : ""}
      ${m.fields && m.fields.length ? `<div class="form-grid">${m.fields.map(f => fieldHTML(f, m.values[f.name] ?? "", errs[f.name])).join("")}</div>` : ""}
    </div>
    <div class="modal-foot">
      ${m.footExtra ? `<span style="margin-right:auto;display:flex;gap:8px">${m.footExtra}</span>` : ""}
      <button type="button" class="btn" data-act="close-modal">${m.fields && m.fields.length ? "ยกเลิก" : "ปิด"}</button>
      ${m.fields && m.fields.length ? `<button type="submit" class="btn primary">${esc(m.submitLabel || "บันทึก")}</button>` : ""}
    </div>
  </form></div>`;
}
function openModal(cfg) {
  S.modal = { errors: {}, values: {}, ...cfg };
  renderModal();
  const first = document.querySelector("#modal-root .field.invalid .input, #modal-root .input:not([disabled]), #modal-root .btn.primary, #modal-root .btn");
  if (first) first.focus();
}
function closeModal() { S.modal = null; renderModal(); }

function submitModal(form) {
  const m = S.modal;
  const vals = { ...m.values };
  new FormData(form).forEach((v, k) => { vals[k] = typeof v === "string" ? v.trim() : v; });
  const errors = m.validate ? m.validate(vals) : {};
  if (Object.keys(errors).length) {
    m.values = vals; m.errors = errors; renderModal();
    const bad = document.querySelector("#modal-root .field.invalid .input");
    if (bad) bad.focus();
    return;
  }
  const keepOpen = m.submit(vals);
  if (keepOpen) return;
  S.modal = null; save(); render();
}

// ---------- Machine CRUD ----------
function machineForm(existing) {
  const isNew = !existing;
  openModal({
    title: isNew ? "เพิ่มเครื่องจักร" : `แก้ไข ${existing.id}`,
    submitLabel: isNew ? "เพิ่มเครื่องจักร" : "บันทึกการแก้ไข",
    values: existing ? { ...existing } : { id: nextId(S.db.machines, "M", 3), status: "Running" },
    fields: [
      { name: "id", label: "Machine ID", required: true, mono: true, placeholder: "M-011", hint: "รูปแบบ M-000 และห้ามซ้ำกับเครื่องอื่น", disabled: !isNew },
      { name: "name", label: "ชื่อเครื่อง", required: true, placeholder: "เช่น CNC Lathe #3" },
      { name: "type", label: "ประเภท", type: "select", options: MACHINE_TYPES, placeholder: "เลือกประเภท", required: true },
      { name: "location", label: "Location", type: "select", options: LOCATIONS, placeholder: "เลือกไลน์ผลิต", required: true },
      { name: "status", label: "สถานะ", type: "select", options: MACHINE_STATUS, required: true },
    ],
    validate(v) {
      const e = {};
      v.id = (v.id || "").toUpperCase();
      if (!v.id) e.id = "กรอก Machine ID";
      else if (!/^M-\d{3}$/.test(v.id)) e.id = "ใช้รูปแบบ M-000 เช่น M-011";
      else if (isNew && S.db.machines.some(m => m.id === v.id)) e.id = `Machine ID already exists: มี ${v.id} อยู่แล้ว`;
      if (!v.name) e.name = "กรอกชื่อเครื่อง";
      else if (v.name.length < 3 || v.name.length > 60) e.name = "ชื่อเครื่องต้องยาว 3–60 ตัวอักษร";
      if (!v.type) e.type = "เลือกประเภทเครื่อง";
      if (!v.location) e.location = "เลือก Location";
      if (!MACHINE_STATUS.includes(v.status)) e.status = "เลือกสถานะที่ระบบรองรับ";
      return e;
    },
    submit(v) {
      const rec = { id: v.id, name: v.name, type: v.type, location: v.location, status: v.status };
      if (isNew) { S.db.machines.push(rec); audit(`เพิ่มเครื่อง ${rec.id}`); toast(`เพิ่ม ${rec.id} แล้ว`); }
      else { Object.assign(existing, rec); audit(`แก้ไขข้อมูลเครื่อง ${rec.id}`); toast(`บันทึก ${rec.id} แล้ว`); }
    },
  });
}
function machineDelete(m) {
  const na = S.db.alarms.filter(a => a.machineId === m.id).length;
  const nm = S.db.maintenance.filter(r => r.machineId === m.id).length;
  if (na || nm) {
    openModal({ kind: "confirm", title: `ลบ ${m.id} ไม่ได้`,
      body: `<p style="margin:0">${esc(m.name)} มี Alarm ${na} รายการ และงานซ่อม ${nm} งานอ้างอิงอยู่ ถ้าลบจะทำให้ประวัติหาย</p>
             <div class="callout">ถ้าเลิกใช้เครื่องนี้แล้ว ให้แก้สถานะเป็น <b>Stop</b> แทนการลบ (ฐานข้อมูลใช้ Foreign Key แบบ restrict)</div>` });
    return;
  }
  openModal({ kind: "confirm", title: `ลบ ${m.id}?`, danger: true, okLabel: "ลบเครื่องจักร",
    body: `<p style="margin:0">ลบ <b>${esc(m.name)}</b> ออกจาก Machine Master ถาวร ย้อนกลับไม่ได้</p>`,
    onOk() { S.db.machines = S.db.machines.filter(x => x.id !== m.id); audit(`ลบเครื่อง ${m.id}`); toast(`ลบ ${m.id} แล้ว`); } });
}
function machineHistory(id) {
  const m = machine(id);
  openModal({ kind: "drawer", title: esc(m.name), body: machineHistoryHTML(id),
    foot: [
      can("planWrite") ? `<button class="btn primary" data-act="plan-new" data-machine="${m.id}">${icon("plus")} เพิ่มแผน PM</button>` : "",
      can("machineWrite") ? `<button class="btn" data-act="machine-edit" data-id="${m.id}">${icon("edit")} แก้ไขข้อมูลเครื่อง</button>` : "",
    ].join("") });
}

// ---------- Alarms ----------
function syncMachineAfterAlarm(machineId) {
  const m = machine(machineId);
  if (m && m.status === "Alarm" && !activeAlarms(machineId).length) {
    m.status = "Running"; toast(`${m.id} ไม่มี Alarm ค้างแล้ว สถานะกลับเป็น Running`);
  }
}
function alarmForm() {
  openModal({
    title: "บันทึก Alarm",
    submitLabel: "บันทึก Alarm",
    values: { occurredAt: toLocalInput() },
    fields: [
      { name: "machineId", label: "เครื่องจักร", type: "select", options: S.db.machines.map(m => [m.id, `${m.id} · ${m.name}`]), placeholder: "เลือกเครื่องจักร", required: true },
      { name: "code", label: "Alarm Code", required: true, mono: true, placeholder: "E-201", hint: "รูปแบบ E-000 ตามรหัสจาก PLC/HMI" },
      { name: "occurredAt", label: "วันที่/เวลาเกิด", type: "datetime-local", required: true },
      { name: "description", label: "รายละเอียด Alarm", type: "textarea", required: true, full: true, placeholder: "เช่น Spindle overload" },
      { name: "cause", label: "สาเหตุ (ถ้าทราบ)", type: "textarea", full: true },
    ],
    validate(v) {
      const e = {};
      v.code = (v.code || "").toUpperCase();
      if (!v.machineId) e.machineId = "เลือกเครื่องจักรที่เกิด Alarm";
      else if (!machine(v.machineId)) e.machineId = "ไม่พบเครื่องจักรนี้ใน Machine Master";
      if (!v.code) e.code = "กรอก Alarm Code";
      else if (!/^E-\d{3}$/.test(v.code)) e.code = "ใช้รูปแบบ E-000 เช่น E-201";
      if (!v.occurredAt) e.occurredAt = "ระบุวันที่และเวลาที่เกิด";
      else if (new Date(v.occurredAt) > new Date(Date.now() + 60000)) e.occurredAt = "เวลาเกิดต้องไม่อยู่ในอนาคต";
      if (!v.description) e.description = "กรอกรายละเอียด Alarm";
      else if (v.description.length < 4) e.description = "รายละเอียดสั้นเกินไป (อย่างน้อย 4 ตัวอักษร)";
      return e;
    },
    submit(v) {
      const a = { id: nextId(S.db.alarms, "ALM", 4), machineId: v.machineId, code: v.code, description: v.description, occurredAt: new Date(v.occurredAt).toISOString(), cause: v.cause || "", action: "", status: "Open" };
      S.db.alarms.push(a);
      const m = machine(v.machineId);
      if (m.status !== "Maintenance") m.status = "Alarm";
      audit(`บันทึก ${a.id} (${a.code}) ที่ ${a.machineId}`);
      toast(`บันทึก ${a.id} แล้ว · ${m.id} เป็นสถานะ ${m.status}`);
    },
  });
}
function alarmDetail(id) {
  const a = S.db.alarms.find(x => x.id === id);
  const editable = can("alarmUpdate") && a.status !== "Closed";
  const intro = `<dl class="kv">
      <dt>สถานะ</dt><dd>${pill(a.status)}</dd>
      <dt>เครื่องจักร</dt><dd><span class="mono">${esc(a.machineId)}</span> · ${esc(machineLabel(a.machineId))}</dd>
      <dt>Alarm</dt><dd><b class="mono">${esc(a.code)}</b> ${esc(a.description)}</dd>
      <dt>เวลาเกิด</dt><dd>${fmtDT(a.occurredAt)}</dd>
      ${a.assignee ? `<dt>ผู้รับงาน</dt><dd>${esc(userName(a.assignee))}</dd>` : ""}
      ${a.status === "Closed" ? `<dt>สาเหตุ</dt><dd>${esc(a.cause)}</dd><dt>Action Taken</dt><dd>${esc(a.action)}</dd>
        <dt>ปิดโดย</dt><dd>${esc(userName(a.closedBy))} · ${fmtDT(a.closedAt)}</dd>` : ""}
    </dl>
    ${editable ? `<div class="callout">การปิด Alarm ต้องระบุ <b>สาเหตุ</b> และ <b>Action Taken</b> ระบบจะบันทึกผู้ปิดและเวลาให้อัตโนมัติ</div>` : ""}`;
  openModal({
    title: a.id,
    intro,
    submitLabel: "บันทึกสถานะ",
    values: { status: a.status, cause: a.cause, action: a.action },
    fields: editable ? [
      { name: "status", label: "เปลี่ยนสถานะเป็น", type: "select", options: ALARM_STATUS, required: true, full: true },
      { name: "cause", label: "สาเหตุ (Cause)", type: "textarea", full: true, placeholder: "เช่น Dull cutting tool" },
      { name: "action", label: "Action Taken", type: "textarea", full: true, placeholder: "สิ่งที่ทำเพื่อแก้ไข" },
    ] : [],
    footExtra: can("mntWrite") ? `<button type="button" class="btn" data-act="mnt-from-alarm" data-id="${a.id}">${icon("wrench")} สร้างงานซ่อม</button>` : "",
    validate(v) {
      const e = {};
      if (!ALARM_STATUS.includes(v.status)) e.status = "เลือกสถานะ";
      if (v.status === "Closed") {
        if (!v.cause) e.cause = "ต้องระบุสาเหตุก่อนปิด Alarm";
        if (!v.action) e.action = "ต้องบันทึก Action Taken ก่อนเปลี่ยนเป็น Closed";
      }
      return e;
    },
    submit(v) {
      const prev = a.status;
      a.cause = v.cause; a.action = v.action; a.status = v.status;
      if (v.status === "In Progress" && !a.assignee) a.assignee = S.session;
      if (v.status === "Closed") { a.closedAt = new Date().toISOString(); a.closedBy = S.session; }
      audit(prev !== v.status ? `เปลี่ยน ${a.id} จาก ${prev} เป็น ${v.status}` : `แก้ไขรายละเอียด ${a.id}`);
      toast(`${a.id} เป็น ${v.status} แล้ว`);
      if (v.status === "Closed") syncMachineAfterAlarm(a.machineId);
    },
  });
}

// ---------- Maintenance ----------
function maintenanceForm(existing, prefill) {
  const isNew = !existing;
  const base = existing ? { ...existing, date: toLocalInput(existing.date) }
    : { technicianId: me().role === "technician" ? S.session : "", type: "Corrective", status: "Open", date: toLocalInput(), ...prefill };
  const alarmOpts = S.db.alarms.filter(a => a.status !== "Closed" || a.id === base.alarmId).map(a => [a.id, `${a.id} · ${a.machineId} · ${a.code}`]);
  openModal({
    intro: base.planId ? `<div class="callout">ใบงานนี้มาจากแผน <b class="mono">${esc(base.planId)}</b> เมื่อเปลี่ยนสถานะเป็น <b>Done</b> ระบบจะบันทึกวันที่ทำ และเลื่อนรอบถัดไปของแผนให้อัตโนมัติ</div>` : "",
    title: isNew ? (base.planId ? "ออกใบงาน PM" : "สร้างงานซ่อม") : `แก้ไขงาน ${existing.id}`,
    submitLabel: isNew ? "สร้างงานซ่อม" : "บันทึกการแก้ไข",
    values: base,
    fields: [
      { name: "machineId", label: "เครื่องจักร", type: "select", options: S.db.machines.map(m => [m.id, `${m.id} · ${m.name}`]), placeholder: "เลือกเครื่องจักร", required: true },
      { name: "technicianId", label: "ช่างผู้รับผิดชอบ", type: "select", options: technicians().map(u => [u.id, u.name]), placeholder: "เลือกช่าง", required: true },
      { name: "type", label: "ประเภทงาน", type: "select", options: ["Corrective", "Preventive"], required: true },
      { name: "date", label: "วันที่/เวลา", type: "datetime-local", required: true },
      { name: "status", label: "สถานะงาน", type: "select", options: MNT_STATUS, required: true },
      { name: "alarmId", label: "อ้างอิง Alarm", type: "select", options: alarmOpts, placeholder: "ไม่มี" },
      { name: "problem", label: "ปัญหา (Problem)", type: "textarea", required: true, full: true },
      { name: "action", label: "การแก้ไข (Action Taken)", type: "textarea", full: true, hint: "จำเป็นเมื่อสถานะเป็น Waiting Part หรือ Done" },
    ],
    validate(v) {
      const e = {};
      if (!v.machineId) e.machineId = "เลือกเครื่องจักร";
      if (!v.technicianId) e.technicianId = "เลือกช่างผู้รับผิดชอบ";
      if (!v.date) e.date = "ระบุวันที่";
      if (!MNT_STATUS.includes(v.status)) e.status = "เลือกสถานะงาน";
      if (!v.problem) e.problem = "อธิบายปัญหาที่พบ";
      if (v.status === "Done" && !v.action) e.action = "ต้องบันทึกการแก้ไขก่อนปิดงาน";
      if (v.status === "Waiting Part" && !v.action) e.action = "ระบุอะไหล่ที่รอ เช่น Vacuum cup x4";
      if (v.alarmId) { const a = S.db.alarms.find(x => x.id === v.alarmId); if (a && a.machineId !== v.machineId) e.alarmId = `Alarm นี้เป็นของ ${a.machineId} ไม่ตรงกับเครื่องที่เลือก`; }
      return e;
    },
    submit(v) {
      const wasDone = !isNew && existing.status === "Done";
      const rec = { machineId: v.machineId, technicianId: v.technicianId, type: v.type, date: new Date(v.date).toISOString(), status: v.status, alarmId: v.alarmId || "", planId: v.planId || "", problem: v.problem, action: v.action };
      let r = existing;
      if (isNew) { r = { id: nextId(S.db.maintenance, "MNT", 4), ...rec }; S.db.maintenance.push(r); audit(`สร้างงานซ่อม ${r.id} ที่ ${r.machineId}`); toast(`สร้าง ${r.id} แล้ว`); }
      else { const prev = r.status; Object.assign(r, rec); audit(prev !== r.status ? `เปลี่ยนสถานะ ${r.id} เป็น ${r.status}` : `แก้ไขงานซ่อม ${r.id}`); toast(`บันทึก ${r.id} แล้ว`); }
      const m = machine(r.machineId);
      if (["In Progress", "Waiting Part"].includes(r.status) && m.status !== "Maintenance") { m.status = "Maintenance"; toast(`${m.id} เป็นสถานะ Maintenance`); }
      if (r.status === "Done" && m.status === "Maintenance") { m.status = activeAlarms(m.id).length ? "Alarm" : "Running"; toast(`${m.id} กลับเป็น ${m.status}`); }
      const plan = r.planId && S.db.pmPlans.find(x => x.id === r.planId);
      if (plan && r.status === "Done" && !wasDone) {
        plan.lastDone = todayStr(); plan.nextDue = addDays(plan.lastDone, plan.intervalDays);
        audit(`${plan.id} ทำเสร็จ (${r.id}) รอบถัดไป ${plan.nextDue}`);
        toast(`${plan.id} เลื่อนรอบถัดไปเป็น ${fmtD(plan.nextDue)}`);
      }
    },
  });
}

// ---------- Maintenance Plan ----------
function planForm(existing, prefill) {
  const isNew = !existing;
  openModal({
    title: isNew ? (prefill && prefill.machineId ? `เพิ่มแผน PM ให้ ${prefill.machineId}` : "เพิ่มแผน PM") : `แก้ไขแผน ${existing.id}`,
    submitLabel: isNew ? "เพิ่มแผน" : "บันทึกการแก้ไข",
    values: existing ? { ...existing } : { intervalDays: 30, nextDue: addDays(todayStr(), 7), ...prefill },
    fields: [
      { name: "machineId", label: "เครื่องจักร", type: "select", options: S.db.machines.map(m => [m.id, `${m.id} · ${m.name}`]), placeholder: "เลือกเครื่องจักร", required: true },
      { name: "technicianId", label: "ช่างผู้รับผิดชอบ", type: "select", options: technicians().map(u => [u.id, u.name]), placeholder: "เลือกช่าง", required: true },
      { name: "task", label: "ชื่องาน PM", required: true, full: true, placeholder: "เช่น เปลี่ยนไส้กรองน้ำมันไฮดรอลิก" },
      { name: "intervalDays", label: "ความถี่", type: "select", options: PM_FREQ, required: true },
      { name: "nextDue", label: "ครบกำหนดครั้งถัดไป", type: "date", required: true },
      { name: "lastDone", label: "ทำครั้งล่าสุด", type: "date", hint: "เว้นว่างได้ถ้าเป็นแผนใหม่" },
      { name: "checklist", label: "Checklist", type: "textarea", full: true, hint: "หนึ่งบรรทัดต่อหนึ่งข้อ ช่างจะเห็นในใบงาน" },
    ],
    footExtra: !isNew ? `<button type="button" class="btn danger" data-act="plan-deactivate" data-id="${existing.id}">ปิดใช้งานแผน</button>` : "",
    validate(v) {
      const e = {};
      if (!v.machineId) e.machineId = "เลือกเครื่องจักร";
      if (!v.technicianId) e.technicianId = "เลือกช่างผู้รับผิดชอบ";
      if (!v.task) e.task = "กรอกชื่องาน PM";
      else if (v.task.length < 4 || v.task.length > 80) e.task = "ชื่องานต้องยาว 4–80 ตัวอักษร";
      else {
        const dup = S.db.pmPlans.find(p => p.active && p.machineId === v.machineId && p.task.toLowerCase() === v.task.toLowerCase() && (!existing || p.id !== existing.id));
        if (dup) e.task = `เครื่องนี้มีแผนชื่อนี้อยู่แล้ว (${dup.id})`;
      }
      if (!PM_FREQ.some(f => String(f[0]) === String(v.intervalDays))) e.intervalDays = "เลือกความถี่";
      if (!v.nextDue) e.nextDue = "ระบุวันครบกำหนด";
      if (v.lastDone && v.lastDone > todayStr()) e.lastDone = "วันที่ทำล่าสุดต้องไม่อยู่ในอนาคต";
      else if (v.lastDone && v.nextDue && v.nextDue <= v.lastDone) e.nextDue = "วันครบกำหนดต้องอยู่หลังวันที่ทำล่าสุด";
      return e;
    },
    submit(v) {
      const rec = { machineId: v.machineId, technicianId: v.technicianId, task: v.task, intervalDays: Number(v.intervalDays), nextDue: v.nextDue, lastDone: v.lastDone || "", checklist: v.checklist || "" };
      if (isNew) { const p = { id: nextId(S.db.pmPlans, "PM", 3), ...rec, active: true }; S.db.pmPlans.push(p); audit(`เพิ่มแผน ${p.id} ที่ ${p.machineId}`); toast(`เพิ่ม ${p.id} แล้ว`); }
      else { Object.assign(existing, rec); audit(`แก้ไขแผน ${existing.id}`); toast(`บันทึก ${existing.id} แล้ว`); }
    },
  });
}
function planDetail(id) {
  const p = S.db.pmPlans.find(x => x.id === id);
  const st = planState(p), wo = planWO(p);
  const history = S.db.maintenance.filter(r => r.planId === p.id).sort((a, b) => b.date.localeCompare(a.date));
  const items = (p.checklist || "").split("\n").map(s => s.trim()).filter(Boolean);
  openModal({
    title: `${esc(p.id)} · ${esc(p.task)}`,
    intro: `<dl class="kv">
        <dt>เครื่องจักร</dt><dd><span class="mono">${esc(p.machineId)}</span> · ${esc(machineLabel(p.machineId))}</dd>
        <dt>ความถี่</dt><dd>${esc(freqLabel(p.intervalDays))}</dd>
        <dt>ช่าง</dt><dd>${esc(userName(p.technicianId))}</dd>
        <dt>ทำล่าสุด</dt><dd>${p.lastDone ? fmtD(p.lastDone) : "—"}</dd>
        <dt>ครบกำหนด</dt><dd>${fmtD(p.nextDue)} · <span class="due ${st === "issued" ? "" : st}">${PM_STATE[st]}${st === "issued" ? "" : ` (${dueText(p)})`}</span></dd>
      </dl>
      ${items.length ? `<div class="eyebrow">Checklist</div><ol class="checklist">${items.map(i => `<li>${esc(i)}</li>`).join("")}</ol>` : ""}
      <div class="eyebrow">ใบงานจากแผนนี้</div>
      ${history.length ? `<ul class="timeline">${history.map(r => `<li class="m"><b class="mono">${esc(r.id)}</b> ${pill(r.status)}<span class="muted" style="display:block;font-size:12.5px">${fmtDT(r.date)} · ${esc(userName(r.technicianId))}</span></li>`).join("")}</ul>`
        : `<div class="callout">ยังไม่เคยออกใบงานจากแผนนี้</div>`}`,
    fields: [],
    footExtra: [
      wo && can("mntWrite") ? `<button type="button" class="btn primary" data-act="mnt-edit" data-id="${wo.id}">เปิดใบงาน ${esc(wo.id)}</button>` : "",
      !wo && can("pmIssue") ? `<button type="button" class="btn primary" data-act="pm-issue" data-id="${p.id}">${icon("wrench")} ออกใบงาน</button>` : "",
      can("planWrite") ? `<button type="button" class="btn" data-act="plan-edit" data-id="${p.id}">${icon("edit")} แก้ไขแผน</button>` : "",
    ].join(""),
  });
}
function issueWorkOrder(p) {
  const due = parseD(p.nextDue); due.setHours(8, 0, 0, 0);
  maintenanceForm(null, { machineId: p.machineId, technicianId: p.technicianId, type: "Preventive", status: "Open", date: toLocalInput(due.toISOString()),
    problem: p.task + (p.checklist ? "\n- " + p.checklist.split("\n").filter(Boolean).join("\n- ") : ""), action: "", planId: p.id });
}

// ---------- actions ----------
const ACT = {
  "pick-acct": el => { S.loginPick = el.dataset.id; S.loginErr = ""; render(); },
  go: el => { S.route = el.dataset.page; save(); render(); window.scrollTo(0, 0); },
  logout: () => { S.session = null; S.modal = null; save(); render(); toast("ออกจากระบบแล้ว"); },
  reset: () => openModal({ kind: "confirm", title: "รีเซ็ตข้อมูลตัวอย่าง?", okLabel: "รีเซ็ต", danger: true,
    body: "<p style='margin:0'>ข้อมูลที่เพิ่มหรือแก้ไขใน prototype นี้จะหายทั้งหมด แล้วกลับไปเป็นข้อมูลตัวอย่างเริ่มต้น</p>", onOk: resetDemo }),
  theme: () => toggleTheme(),
  "kpi-machines": el => {
    if (!role().pages.includes("machines")) return toast("บัญชี Viewer ดูได้เฉพาะ Dashboard", true);
    Object.assign(S.f, { mq: "", mtype: "", mstatus: el.dataset.status }); ACT.go({ dataset: { page: "machines" } });
  },
  "kpi-alarms": () => {
    if (!role().pages.includes("alarms")) return toast("บัญชี Viewer ดูได้เฉพาะ Dashboard", true);
    Object.assign(S.f, { aq: "", astatus: "Open", amachine: "", afrom: "", ato: "" }); ACT.go({ dataset: { page: "alarms" } });
  },
  "machine-new": () => can("machineWrite") && machineForm(),
  "machine-edit": el => can("machineWrite") && machineForm(machine(el.dataset.id)),
  "machine-delete": el => can("machineWrite") && machineDelete(machine(el.dataset.id)),
  "machine-history": el => machineHistory(el.dataset.id),
  "alarm-new": () => can("alarmCreate") && alarmForm(),
  "open-alarm": el => alarmDetail(el.dataset.id),
  "mnt-new": () => can("mntWrite") && maintenanceForm(),
  "mnt-edit": el => can("mntWrite") && maintenanceForm(S.db.maintenance.find(r => r.id === el.dataset.id)),
  "mnt-from-alarm": el => {
    const a = S.db.alarms.find(x => x.id === el.dataset.id);
    maintenanceForm(null, { machineId: a.machineId, alarmId: a.status !== "Closed" ? a.id : "", problem: `${a.code} ${a.description}`, status: "In Progress" });
  },
  "pm-state": el => { S.pmState = S.pmState === el.dataset.state ? "" : el.dataset.state; render(); },
  "pm-view": el => { S.pmView = el.dataset.view; render(); },
  "pm-month": el => { const s = Number(el.dataset.step); S.pmMonth = s ? S.pmMonth + s : 0; refreshList(); },
  "pm-jump": el => {
    if (!role().pages.includes("plan")) return toast("บัญชี Viewer ดูได้เฉพาะ Dashboard", true);
    S.pmState = el.dataset.state; S.pmView = "list"; ACT.go({ dataset: { page: "plan" } });
  },
  "plan-new": el => can("planWrite") && planForm(null, el.dataset.machine ? { machineId: el.dataset.machine } : {}),
  "plan-edit": el => can("planWrite") && planForm(S.db.pmPlans.find(p => p.id === el.dataset.id)),
  "plan-detail": el => planDetail(el.dataset.id),
  "pm-issue": el => can("pmIssue") && issueWorkOrder(S.db.pmPlans.find(p => p.id === el.dataset.id)),
  "plan-deactivate": el => {
    const p = S.db.pmPlans.find(x => x.id === el.dataset.id);
    openModal({ kind: "confirm", title: `ปิดใช้งาน ${p.id}?`, danger: true, okLabel: "ปิดใช้งานแผน",
      body: `<p style="margin:0">แผน <b>${esc(p.task)}</b> จะไม่แสดงในปฏิทินและจะไม่นับเป็นงานครบกำหนดอีก ใบงานเดิมยังอยู่ครบ</p>`,
      onOk() { p.active = false; audit(`ปิดใช้งานแผน ${p.id}`); toast(`ปิดใช้งาน ${p.id} แล้ว`); } });
  },
  "toggle-user": el => {
    const u = S.db.users.find(x => x.id === el.dataset.id);
    u.active = !u.active; audit(`${u.active ? "เปิด" : "ปิด"}การใช้งานบัญชี ${u.email}`); save(); render();
    toast(`${u.active ? "เปิด" : "ปิด"}การใช้งาน ${u.name} แล้ว`);
  },
  "close-modal": () => closeModal(),
  "close-modal-bg": () => closeModal(),
  "confirm-ok": () => { const fn = S.modal.onOk; S.modal = null; fn(); save(); render(); },
};
const CHANGE = {
  "switch-user": el => {
    S.session = el.value; S.modal = null; save(); render();
    toast(`สลับเป็น ${me().name} (${role().label})`);
  },
  "set-role": el => {
    const u = S.db.users.find(x => x.id === el.dataset.id);
    const prev = u.role; u.role = el.value;
    audit(`เปลี่ยน Role ของ ${u.email} จาก ${ROLES[prev].label} เป็น ${ROLES[u.role].label}`); save(); render();
    toast(`${u.name} เป็น ${ROLES[u.role].label} แล้ว`);
  },
};

document.addEventListener("click", e => {
  const el = e.target.closest("[data-act]");
  if (!el || !el.dataset.act) return;
  if (el.dataset.act === "close-modal-bg" && e.target !== el) return;
  const fn = ACT[el.dataset.act];
  if (fn) { e.stopPropagation(); fn(el, e); }
});
document.addEventListener("change", e => {
  const el = e.target.closest("[data-act-change]");
  if (el && CHANGE[el.dataset.actChange]) CHANGE[el.dataset.actChange](el);
});
document.addEventListener("input", e => {
  const el = e.target;
  if (el.dataset && el.dataset.filter) { S.f[el.dataset.filter] = el.value; refreshList(); }
});
document.addEventListener("submit", e => {
  const form = e.target;
  if (!form.dataset.form) return;
  e.preventDefault();
  if (form.dataset.form === "login") doLogin(form);
  if (form.dataset.form === "modal") submitModal(form);
});
document.addEventListener("keydown", e => { if (e.key === "Escape" && S.modal) closeModal(); });
try { matchMedia("(prefers-color-scheme: dark)").addEventListener("change", () => render()); } catch (e) { /* old browsers */ }

// ---------- boot ----------
applyTheme(getTheme());
load();
render();
