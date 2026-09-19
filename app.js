// Core: state, permissions, helpers, shell, login, dashboard.
const STORE_KEY = "miq-proto-v2";
const DEMO_PASSWORD = "REDACTED";

const ROLES = {
  admin: { label: "Admin", pages: ["dashboard", "machines", "alarms", "maintenance", "plan", "users", "audit"], machineWrite: true, alarmCreate: true, alarmUpdate: true, mntWrite: true, planWrite: true, pmIssue: true },
  technician: { label: "Technician", pages: ["dashboard", "machines", "alarms", "maintenance", "plan"], alarmCreate: true, alarmUpdate: true, mntWrite: true, pmIssue: true },
  viewer: { label: "Viewer", pages: ["dashboard"] },
};
const PAGES = {
  dashboard: { label: "Dashboard", short: "Home", icon: "grid" },
  machines: { label: "Machines", short: "Machines", icon: "cog" },
  alarms: { label: "Alarms", short: "Alarms", icon: "bell" },
  maintenance: { label: "Maintenance", short: "Work", icon: "wrench" },
  plan: { label: "Maintenance Plan", short: "PM", icon: "calendar" },
  users: { label: "Users", short: "Users", icon: "users" },
  audit: { label: "Audit Log", short: "Log", icon: "log" },
};
const PM_FREQ = [[7, "ทุกสัปดาห์ (7 วัน)"], [14, "ทุก 2 สัปดาห์ (14 วัน)"], [30, "ทุกเดือน (30 วัน)"], [90, "ทุกไตรมาส (90 วัน)"], [180, "ทุก 6 เดือน (180 วัน)"], [365, "ทุกปี (365 วัน)"]];
const MACHINE_STATUS = ["Running", "Stop", "Alarm", "Maintenance"];
const ALARM_STATUS = ["Open", "In Progress", "Closed"];
const MNT_STATUS = ["Open", "In Progress", "Waiting Part", "Done"];
const MACHINE_TYPES = ["CNC", "Conveyor", "Robot", "Press", "Injection Molding", "Packaging", "Compressor", "Chiller"];
const LOCATIONS = ["Line A", "Line B", "Line C", "Utility"];

const S = {
  db: null,
  session: null, // user id
  route: "dashboard",
  f: { mq: "", mstatus: "", mtype: "", aq: "", astatus: "", amachine: "", afrom: "", ato: "", nq: "", nstatus: "", ntech: "", ntype: "" },
  modal: null,
  pmView: "machine", // machine | calendar | list
  pmMonth: 0, // month offset from the current month
  pmState: "", // summary filter: overdue | soon | issued | ok
  loginPick: "U01",
  loginErr: "",
};

// ---------- persistence (per-viewer convenience only) ----------
function clone(o) { return JSON.parse(JSON.stringify(o)); }
function load() {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (raw) { const p = JSON.parse(raw); S.db = p.db; S.session = p.session; S.route = p.route || "dashboard"; }
  } catch (e) { /* storage unavailable */ }
  if (!S.db) S.db = clone(window.SEED);
}
function save() {
  try { localStorage.setItem(STORE_KEY, JSON.stringify({ db: S.db, session: S.session, route: S.route })); } catch (e) { /* ignore */ }
}
function resetDemo() {
  S.db = clone(window.SEED); save(); render(); toast("รีเซ็ตข้อมูลตัวอย่างแล้ว");
}

// ---------- helpers ----------
const $ = (sel, el = document) => el.querySelector(sel);
function esc(v) { return String(v ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])); }
function me() { return S.db.users.find(u => u.id === S.session); }
function role() { return ROLES[me()?.role] || ROLES.viewer; }
function can(p) { return !!role()[p]; }
function userName(id) { return S.db.users.find(u => u.id === id)?.name || "—"; }
function machine(id) { return S.db.machines.find(m => m.id === id); }
function machineLabel(id) { const m = machine(id); return m ? m.name : id; }
function slug(s) { return String(s).toLowerCase().replace(/[^a-z]/g, ""); }
function pill(status) { return `<span class="pill ${slug(status)}">${esc(status)}</span>`; }
function fmtDT(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleDateString("th-TH", { day: "numeric", month: "short" }) + " " + d.toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" });
}
function toLocalInput(iso) {
  const d = iso ? new Date(iso) : new Date();
  const p = n => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}
function initials(name) { return (name || "?").trim().charAt(0); }
function nextId(list, prefix, width) {
  const n = list.reduce((mx, r) => Math.max(mx, parseInt(r.id.split("-")[1], 10) || 0), 0) + 1;
  return `${prefix}-${String(n).padStart(width, "0")}`;
}
function audit(text) { S.db.audit.unshift({ at: new Date().toISOString(), userId: S.session, text }); }
function activeAlarms(machineId) { return S.db.alarms.filter(a => a.status !== "Closed" && (!machineId || a.machineId === machineId)); }

// ---------- PM plan helpers (dates are local YYYY-MM-DD) ----------
function dstr(d) { const p = n => String(n).padStart(2, "0"); return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`; }
function parseD(s) { const [y, m, d] = s.split("-").map(Number); return new Date(y, m - 1, d); }
function todayStr() { return dstr(new Date()); }
function addDays(s, n) { const d = parseD(s); d.setDate(d.getDate() + n); return dstr(d); }
function daysUntil(s) { return Math.round((parseD(s) - parseD(todayStr())) / 864e5); }
function fmtD(s) { return parseD(s).toLocaleDateString("th-TH", { day: "numeric", month: "short", year: "2-digit" }); }
function planWO(p) { return S.db.maintenance.find(r => r.planId === p.id && r.status !== "Done"); }
function planState(p) {
  if (planWO(p)) return "issued";
  const n = daysUntil(p.nextDue);
  return n < 0 ? "overdue" : n <= 7 ? "soon" : "ok";
}
const PM_STATE = { overdue: "เกินกำหนด", soon: "ครบกำหนดใน 7 วัน", issued: "ออกใบงานแล้ว", ok: "ตามแผน" };
function dueText(p) {
  const n = daysUntil(p.nextDue);
  return n < 0 ? `เกิน ${-n} วัน` : n === 0 ? "วันนี้" : `อีก ${n} วัน`;
}
const PM_RANK = { overdue: 0, soon: 1, issued: 2, ok: 3 };
function machinePlans(id) { return S.db.pmPlans.filter(p => p.active && p.machineId === id).sort((a, b) => a.nextDue.localeCompare(b.nextDue)); }
function freqLabel(n) { const f = PM_FREQ.find(x => x[0] === Number(n)); return f ? f[1] : `ทุก ${n} วัน`; }

const ICONS = {
  grid: '<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',
  cog: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>',
  bell: '<path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.7 21a2 2 0 0 1-3.4 0"/>',
  wrench: '<path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.8-3.8a6 6 0 0 1-7.9 7.9l-6.9 6.9a2.1 2.1 0 0 1-3-3l6.9-6.9a6 6 0 0 1 7.9-7.9z"/>',
  users: '<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.9M16 3.1a4 4 0 0 1 0 7.8"/>',
  log: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6M8 13h8M8 17h5"/>',
  logout: '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
  moon: '<path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/>',
  edit: '<path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/>',
  trash: '<path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>',
  x: '<path d="M18 6 6 18M6 6l12 12"/>',
  alert: '<circle cx="12" cy="12" r="9"/><path d="M12 8v4M12 16h.01"/>',
  lock: '<rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>',
  reset: '<path d="M3 12a9 9 0 1 0 3-6.7L3 8M3 3v5h5"/>',
  calendar: '<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18M8 14h2M14 14h2M8 18h2"/>',
  left: '<path d="m15 18-6-6 6-6"/>',
  right: '<path d="m9 18 6-6-6-6"/>',
};
function icon(n) { return `<svg class="i" viewBox="0 0 24 24" aria-hidden="true">${ICONS[n] || ""}</svg>`; }

function toast(msg, bad) {
  const el = document.createElement("div");
  el.className = "toast" + (bad ? " bad" : "");
  el.innerHTML = (bad ? icon("alert") : "") + `<span>${esc(msg)}</span>`;
  $("#toasts").appendChild(el);
  setTimeout(() => el.remove(), 3200);
}

// ---------- theme ----------
function getTheme() { try { return localStorage.getItem("miq-theme") || ""; } catch (e) { return ""; } }
function applyTheme(t) {
  if (t) document.documentElement.setAttribute("data-theme", t); else document.documentElement.removeAttribute("data-theme");
}
function isDark() {
  const t = document.documentElement.getAttribute("data-theme");
  return t ? t === "dark" : matchMedia("(prefers-color-scheme: dark)").matches;
}
function toggleTheme() {
  const t = isDark() ? "light" : "dark";
  applyTheme(t);
  try { localStorage.setItem("miq-theme", t); } catch (e) { /* ignore */ }
  render();
}

// ---------- render root ----------
function render() {
  const root = $("#root");
  if (!S.session || !me() || !me().active) { S.session = null; root.innerHTML = loginView(); return; }
  root.innerHTML = shellView();
  renderModal();
}

function loginView() {
  const accts = S.db.users.filter(u => u.active);
  const pick = S.db.users.find(u => u.id === S.loginPick) || accts[0];
  return `
  <div class="login">
    <section class="login-side">
      <div class="brand"><span class="logo">MQ</span> MaintainIQ</div>
      <div>
        <h1>รู้ทันทีว่าเครื่องไหนหยุด และใครกำลังซ่อม</h1>
        <p>ระบบกลางสำหรับ Machine, Alarm และงาน Maintenance ของโรงงาน แทนการจดในหลายแหล่งข้อมูล</p>
      </div>
      <div class="ladder" aria-hidden="true">|--[ ALM_ACTIVE ]--[/ ACK ]----------( HORN   )--|
|--[ M002.RUN   ]--[  E-201 ]---------( LAMP_R )--|
|--[ MNT.OPEN   ]--[/ PART  ]---------( WO_REQ )--|</div>
    </section>
    <main class="login-main">
      <form class="login-card" data-form="login" novalidate>
        <div>
          <div class="eyebrow">Prototype · Supabase Auth</div>
          <h2>เข้าสู่ระบบ</h2>
        </div>
        <div class="field">
          <span class="eyebrow">บัญชีทดลอง</span>
          <div class="demo-accts">
            ${accts.map(u => `<button type="button" class="demo-acct" data-act="pick-acct" data-id="${u.id}" aria-pressed="${u.id === pick.id}">
              <span class="avatar">${esc(initials(u.name))}</span>
              <span><b>${esc(u.name)}</b><small>${esc(u.email)}</small></span>
              <span class="role-tag" style="margin-left:auto">${ROLES[u.role].label}</span></button>`).join("")}
          </div>
        </div>
        <div class="field ${S.loginErr ? "invalid" : ""}">
          <label for="login-email">อีเมล</label>
          <input class="input" id="login-email" name="email" type="email" autocomplete="username" value="${esc(pick.email)}">
        </div>
        <div class="field ${S.loginErr ? "invalid" : ""}">
          <label for="login-pass">รหัสผ่าน</label>
          <input class="input" id="login-pass" name="password" type="password" autocomplete="current-password" value="${DEMO_PASSWORD}">
          ${S.loginErr ? `<span class="err">${icon("alert")}${esc(S.loginErr)}</span>` : `<span class="hint">รหัสผ่านบัญชีทดลอง: <span class="mono">${DEMO_PASSWORD}</span></span>`}
        </div>
        <button class="btn primary" type="submit">เข้าสู่ระบบ</button>
      </form>
    </main>
  </div>`;
}

function doLogin(form) {
  const email = form.email.value.trim().toLowerCase();
  const pass = form.password.value;
  if (!email || !pass) { S.loginErr = "กรอกอีเมลและรหัสผ่านให้ครบ"; return render(); }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { S.loginErr = "รูปแบบอีเมลไม่ถูกต้อง"; return render(); }
  const u = S.db.users.find(x => x.email === email && x.active);
  if (!u || pass !== DEMO_PASSWORD) { S.loginErr = "อีเมลหรือรหัสผ่านไม่ถูกต้อง"; return render(); }
  S.loginErr = ""; S.session = u.id; S.route = "dashboard"; save(); render();
  toast(`ยินดีต้อนรับ ${u.name}`);
}

function shellView() {
  const u = me();
  const r = role();
  const openCount = activeAlarms().length;
  const allowed = r.pages.includes(S.route);
  const demoUsers = S.db.users.filter(x => x.active);
  return `
  <div class="app">
    <aside class="side">
      <div class="brand"><span class="logo">MQ</span> MaintainIQ</div>
      <nav class="nav" aria-label="เมนูหลัก">
        ${r.pages.map(p => `<button data-act="go" data-page="${p}" ${S.route === p ? 'aria-current="page"' : ""}>
          ${icon(PAGES[p].icon)}<span class="full">${PAGES[p].label}</span><span class="short">${PAGES[p].short}</span>${p === "alarms" && openCount ? `<span class="badge">${openCount}</span>` : ""}</button>`).join("")}
      </nav>
      <div class="side-foot">
        <div class="me"><span class="avatar">${esc(initials(u.name))}</span><div><b>${esc(u.name)}</b><small>${r.label}</small></div></div>
        <div style="display:flex;gap:4px">
          <button class="btn ghost sm" data-act="logout">${icon("logout")} ออกจากระบบ</button>
          <button class="icon-btn" data-act="reset" title="รีเซ็ตข้อมูลตัวอย่าง" aria-label="รีเซ็ตข้อมูลตัวอย่าง">${icon("reset")}</button>
        </div>
      </div>
    </aside>
    <div class="main">
      <header class="topbar">
        <h1>${allowed ? PAGES[S.route].label : "ไม่มีสิทธิ์เข้าถึง"}</h1>
        <div class="spacer"></div>
        <label class="demo-bar"><span>สลับผู้ใช้ทดลอง</span>
          <select id="demo-user" data-act-change="switch-user" aria-label="สลับผู้ใช้ทดลอง">
            ${demoUsers.map(x => `<option value="${x.id}" ${x.id === u.id ? "selected" : ""}>${esc(x.name)} · ${ROLES[x.role].label}</option>`).join("")}
          </select></label>
        <button class="icon-btn" data-act="theme" aria-label="สลับธีม" title="สลับธีมสว่าง/มืด">${icon(isDark() ? "sun" : "moon")}</button>
        <button class="icon-btn" data-act="logout" aria-label="ออกจากระบบ" title="ออกจากระบบ">${icon("logout")}</button>
      </header>
      <section class="content" id="content">${allowed ? VIEWS[S.route]() : guardView()}</section>
    </div>
  </div>
  <div id="modal-root"></div>`;
}

function guardView() {
  return `<div class="panel guard">
    <div class="code">403</div>
    <h2>บัญชี ${esc(role().label)} เปิดหน้า ${esc(PAGES[S.route]?.label || S.route)} ไม่ได้</h2>
    <p class="muted" style="max-width:36em;margin:0">ระบบตรวจสิทธิ์ที่ฝั่ง Server/RLS ไม่ใช่แค่ซ่อนเมนู ถ้าเปิด URL ตรง ๆ ก็จะถูกปฏิเสธหรือ Redirect แบบนี้ (REQ-SEC-01)</p>
    <button class="btn primary" data-act="go" data-page="dashboard">กลับไป Dashboard</button>
  </div>`;
}

// ---------- dashboard ----------
function dashboardView() {
  const ms = S.db.machines;
  const by = st => ms.filter(m => m.status === st).length;
  const active = activeAlarms();
  const mntOpen = S.db.maintenance.filter(m => m.status !== "Done");
  const weekAgo = Date.now() - 7 * 864e5;
  const closedWeek = S.db.alarms.filter(a => a.status === "Closed" && a.closedAt && new Date(a.occurredAt) > weekAgo);
  const mttr = closedWeek.length ? Math.round(closedWeek.reduce((s, a) => s + (new Date(a.closedAt) - new Date(a.occurredAt)), 0) / closedWeek.length / 60000) : 0;
  const today = new Date().toDateString();
  const alarmsToday = S.db.alarms.filter(a => new Date(a.occurredAt).toDateString() === today).length;
  const plans = S.db.pmPlans.filter(p => p.active);
  const pmOver = plans.filter(p => planState(p) === "overdue").length;
  const pmSoon = plans.filter(p => planState(p) === "soon").length;
  const colors = { Running: "var(--ok)", Stop: "var(--stop)", Alarm: "var(--alarm)", Maintenance: "var(--mnt)" };

  const kpi = (cls, v, l, act, extra = "") => `<button class="kpi ${cls}" data-act="${act}" ${extra}><span class="v">${v}</span><span class="l">${l}</span></button>`;
  return `
  <div class="kpis">
    ${kpi("total", ms.length, "เครื่องจักรทั้งหมด", "kpi-machines", 'data-status=""')}
    ${kpi("running", by("Running"), "Running", "kpi-machines", 'data-status="Running"')}
    ${kpi("stop", by("Stop"), "Stop", "kpi-machines", 'data-status="Stop"')}
    ${kpi("alarm", by("Alarm"), "Alarm", "kpi-machines", 'data-status="Alarm"')}
    ${kpi("maintenance", by("Maintenance"), "Maintenance", "kpi-machines", 'data-status="Maintenance"')}
    ${kpi("alarm", active.length, "Alarm ที่ยังไม่ปิด", "kpi-alarms")}
  </div>
  <div class="grid-2">
    <div class="panel">
      <div class="panel-head"><h2>จำนวน Alarm 7 วันล่าสุด</h2><span class="count" style="margin-left:auto">รวม ${S.db.alarms.filter(a => new Date(a.occurredAt) > weekAgo).length} ครั้ง</span></div>
      <div class="panel-body chart">${alarmChart()}</div>
    </div>
    <div class="panel">
      <div class="panel-head"><h2>สถานะเครื่องจักรตอนนี้</h2></div>
      <div class="panel-body">
        <div class="statbar" role="img" aria-label="สัดส่วนสถานะเครื่องจักร">
          ${MACHINE_STATUS.map(st => by(st) ? `<span style="flex:${by(st)};background:${colors[st]}" title="${st} ${by(st)}"></span>` : "").join("")}
        </div>
        <div class="legend">${MACHINE_STATUS.map(st => `<span><i style="background:${colors[st]}"></i>${st} <b class="num">${by(st)}</b></span>`).join("")}</div>
        <div class="mini-stats">
          <button data-act="go" data-page="maintenance"><b>${mntOpen.length}</b><span>งานซ่อมค้าง</span></button>
          <button data-act="pm-jump" data-state="overdue"><b style="${pmOver ? "color:var(--alarm)" : ""}">${pmOver}</b><span>PM เกินกำหนด · ครบใน 7 วันอีก ${pmSoon}</span></button>
          <button data-act="go" data-page="alarms"><b>${mttr}<small style="font-size:12px;font-weight:500"> นาที</small></b><span>MTTR 7 วัน (เวลาซ่อมเฉลี่ย)</span></button>
          <button data-act="go" data-page="alarms"><b>${alarmsToday}</b><span>Alarm วันนี้</span></button>
        </div>
      </div>
    </div>
  </div>
  <div class="grid-2">
    <div class="panel">
      <div class="panel-head"><h2>Alarm ที่ต้องจัดการ</h2><button class="btn sm" style="margin-left:auto" data-act="go" data-page="alarms" ${role().pages.includes("alarms") ? "" : "hidden"}>ดูทั้งหมด</button></div>
      ${active.length ? `<ul class="feed">${active.sort((a, b) => b.occurredAt.localeCompare(a.occurredAt)).map(a => `
        <li data-act="${role().pages.includes("alarms") ? "open-alarm" : ""}" data-id="${a.id}">
          <span class="sev ${slug(a.status)}"></span>
          <span><b class="mono">${esc(a.code)}</b> ${esc(a.description)}<span class="sub muted" style="display:block;font-size:12.5px">${esc(a.machineId)} · ${esc(machineLabel(a.machineId))} · ${fmtDT(a.occurredAt)}</span></span>
          ${pill(a.status)}
        </li>`).join("")}</ul>` : `<div class="empty">ไม่มี Alarm ค้าง</div>`}
    </div>
    <div class="panel">
      <div class="panel-head"><h2>เครื่องที่เกิด Alarm บ่อย (7 วัน)</h2></div>
      <div class="panel-body">${topMachines(weekAgo)}</div>
    </div>
  </div>`;
}

function alarmChart() {
  const days = [];
  for (let i = 6; i >= 0; i--) { const d = new Date(); d.setDate(d.getDate() - i); days.push(d); }
  const counts = days.map(d => S.db.alarms.filter(a => new Date(a.occurredAt).toDateString() === d.toDateString()).length);
  const max = Math.max(4, Math.ceil(Math.max(...counts) / 2) * 2);
  const W = 560, H = 210, L = 30, R = 8, T = 18, B = 34;
  const cw = (W - L - R) / 7, bw = Math.min(40, cw * .55);
  const y = v => T + (H - T - B) * (1 - v / max);
  const ticks = [0, max / 2, max];
  return `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="กราฟจำนวน Alarm รายวัน">
    ${ticks.map(t => `<line x1="${L}" x2="${W - R}" y1="${y(t)}" y2="${y(t)}" stroke="var(--line)" stroke-dasharray="${t ? "3 4" : ""}"/>
      <text x="${L - 8}" y="${y(t) + 4}" text-anchor="end" font-size="11" fill="var(--muted)" font-family="var(--mono)">${t}</text>`).join("")}
    ${counts.map((c, i) => {
      const x = L + cw * i + (cw - bw) / 2, last = i === 6;
      const label = days[i].toLocaleDateString("th-TH", { weekday: "short", day: "numeric" });
      return `<rect x="${x}" y="${y(c)}" width="${bw}" height="${Math.max(0, y(0) - y(c))}" rx="4" fill="${last ? "var(--alarm)" : "color-mix(in srgb, var(--alarm) 38%, var(--surface))"}"/>
        ${c ? `<text x="${x + bw / 2}" y="${y(c) - 6}" text-anchor="middle" font-size="12" font-weight="600" fill="var(--ink)" font-family="var(--mono)">${c}</text>` : ""}
        <text x="${x + bw / 2}" y="${H - 12}" text-anchor="middle" font-size="11.5" fill="${last ? "var(--ink)" : "var(--muted)"}" font-weight="${last ? 600 : 400}">${last ? "วันนี้" : label}</text>`;
    }).join("")}
  </svg>`;
}

function topMachines(since) {
  const counts = {};
  S.db.alarms.filter(a => new Date(a.occurredAt) > since).forEach(a => counts[a.machineId] = (counts[a.machineId] || 0) + 1);
  const rows = Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 5);
  if (!rows.length) return `<div class="empty">ไม่มี Alarm ในช่วงนี้</div>`;
  const max = rows[0][1];
  return `<div class="hbars">${rows.map(([id, c]) => `<div class="hbar">
    <span class="name" title="${esc(machineLabel(id))}"><span class="mono">${esc(id)}</span> ${esc(machine(id)?.type || "")}</span>
    <span class="track"><span class="fill" style="display:block;width:${(c / max) * 100}%"></span></span>
    <b class="num" style="text-align:right">${c}</b></div>`).join("")}</div>`;
}
