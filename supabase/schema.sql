-- ==============================================================================
-- MTM Machine-Maintenance — Complete Supabase Database Schema & Setup
-- 
-- How to apply:
-- 1. Open your Supabase Dashboard: https://supabase.com/dashboard
-- 2. Navigate to: SQL Editor -> New Query
-- 3. Copy and paste this ENTIRE file and click "Run"
-- ==============================================================================

-- 0. Enable UUID extension
create extension if not exists "uuid-ossp";

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. TABLES DEFINITIONS
-- ─────────────────────────────────────────────────────────────────────────────

-- 1.0 ROLES MASTER (Dynamic RBAC)
create table if not exists public.roles (
  id text primary key check (id ~ '^[a-z0-9_-]{2,30}$'),
  label text not null,
  description text not null default '',
  pages text[] not null default '{}',
  permissions text[] not null default '{}',
  is_system boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 1.1 PROFILES (Linked with Supabase Auth)
create table if not exists public.profiles (
  id uuid primary key,
  name text not null,
  email text not null unique,
  role text not null default 'viewer',
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 1.2 MACHINES MASTER
create table if not exists public.machines (
  id text primary key check (id ~ '^M-[0-9]{3}$'),
  name text not null check (char_length(name) between 3 and 60),
  type text not null,
  location text not null,
  status text not null check (status in ('Running', 'Stop', 'Alarm', 'Maintenance')) default 'Running',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 1.3 ALARMS
create table if not exists public.alarms (
  id text primary key check (id ~ '^ALM-[0-9]{4}$'),
  machine_id text not null references public.machines(id) on delete restrict,
  code text not null check (code ~ '^E-[0-9]{3}$'),
  description text not null,
  occurred_at timestamptz not null,
  cause text not null default '',
  action text not null default '',
  status text not null check (status in ('Open', 'In Progress', 'Closed')) default 'Open',
  assignee_id uuid references public.profiles(id) on delete set null,
  closed_at timestamptz,
  closed_by uuid references public.profiles(id) on delete set null,
  updated_at timestamptz not null default now()
);

-- 1.4 PM PLANS
create table if not exists public.pm_plans (
  id text primary key check (id ~ '^PM-[0-9]{3}$'),
  machine_id text not null references public.machines(id) on delete restrict,
  technician_id uuid references public.profiles(id) on delete set null,
  task text not null,
  checklist text not null default '',
  interval_days integer not null check (interval_days in (7, 14, 30, 90, 180, 365)),
  last_done date,
  next_due date not null,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 1.5 MAINTENANCE RECORDS (Work Orders)
create table if not exists public.maintenance_records (
  id text primary key check (id ~ '^MNT-[0-9]{4}$'),
  machine_id text not null references public.machines(id) on delete restrict,
  technician_id uuid references public.profiles(id) on delete set null,
  type text not null check (type in ('Corrective', 'Preventive')),
  problem text not null,
  action text not null default '',
  date timestamptz not null,
  status text not null check (status in ('Open', 'In Progress', 'Waiting Part', 'Done')) default 'Open',
  alarm_id text references public.alarms(id) on delete set null,
  plan_id text references public.pm_plans(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 1.6 AUDIT LOG
create table if not exists public.audit_log (
  id bigserial primary key,
  at timestamptz not null default now(),
  user_id uuid references public.profiles(id) on delete set null,
  text text not null
);

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. INDEXES (Query Performance & Foreign Keys)
-- ─────────────────────────────────────────────────────────────────────────────

create index if not exists idx_profiles_email on public.profiles(email);
create index if not exists idx_profiles_role on public.profiles(role);
create index if not exists idx_machines_status on public.machines(status);
create index if not exists idx_alarms_machine_id on public.alarms(machine_id);
create index if not exists idx_alarms_status on public.alarms(status);
create index if not exists idx_alarms_occurred_at on public.alarms(occurred_at desc);
create index if not exists idx_pm_plans_machine_id on public.pm_plans(machine_id);
create index if not exists idx_pm_plans_next_due on public.pm_plans(next_due);
create index if not exists idx_pm_plans_active on public.pm_plans(active);
create index if not exists idx_maintenance_machine_id on public.maintenance_records(machine_id);
create index if not exists idx_maintenance_status on public.maintenance_records(status);
create index if not exists idx_maintenance_date on public.maintenance_records(date desc);
create index if not exists idx_audit_log_at on public.audit_log(at desc);

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. FUNCTIONS & TRIGGERS (ACID Consistency & Automations)
-- ─────────────────────────────────────────────────────────────────────────────

-- 3.1 Trigger: Link pre-registered Profile or lock down unknown users upon auth signup
create or replace function public.handle_new_user()
returns trigger as $$
declare
  existing_profile record;
begin
  select * into existing_profile from public.profiles where lower(email) = lower(new.email);

  if found then
    -- User was pre-registered by Admin: Link auth user ID and preserve assigned Role & active state
    update public.profiles
    set id = new.id,
        updated_at = now()
    where lower(email) = lower(new.email);
  else
    -- Unknown user: Create as INACTIVE. They cannot login until Admin approves and assigns a Role
    insert into public.profiles (id, email, name, role, active)
    values (
      new.id,
      new.email,
      coalesce(
        nullif(new.raw_user_meta_data->>'full_name', ''),
        nullif(new.raw_user_meta_data->>'name', ''),
        split_part(new.email, '@', 1)
      ),
      'viewer',
      false -- Inactive by default: Admin must approve and assign role
    )
    on conflict (id) do nothing;
  end if;

  return new;
end;
$$ language plpgsql security definer set search_path = public;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- 3.2 Trigger: Sync Machine status on Alarm creation/closure
create or replace function public.sync_machine_status_on_alarm()
returns trigger as $$
declare
  open_count integer;
  current_m_status text;
begin
  select status into current_m_status from public.machines where id = new.machine_id;

  if (TG_OP = 'INSERT') then
    if (new.status in ('Open', 'In Progress') and current_m_status != 'Maintenance') then
      update public.machines set status = 'Alarm', updated_at = now() where id = new.machine_id;
    end if;
  elsif (TG_OP = 'UPDATE') then
    if (new.status = 'Closed' and old.status != 'Closed') then
      select count(*) into open_count from public.alarms where machine_id = new.machine_id and status != 'Closed' and id != new.id;
      if (open_count = 0 and current_m_status = 'Alarm') then
        update public.machines set status = 'Running', updated_at = now() where id = new.machine_id;
      end if;
    elsif (new.status in ('Open', 'In Progress') and current_m_status != 'Maintenance') then
      update public.machines set status = 'Alarm', updated_at = now() where id = new.machine_id;
    end if;
  end if;

  return new;
end;
$$ language plpgsql security definer set search_path = public;

drop trigger if exists trg_sync_machine_alarm on public.alarms;
create trigger trg_sync_machine_alarm
  after insert or update on public.alarms
  for each row execute function public.sync_machine_status_on_alarm();

-- 3.3 Trigger: Sync Machine status & advance PM Plan on Maintenance record changes
create or replace function public.sync_machine_and_pm_on_maintenance()
returns trigger as $$
declare
  open_alarm_count integer;
  plan_interval integer;
begin
  if (new.status in ('In Progress', 'Waiting Part')) then
    update public.machines set status = 'Maintenance', updated_at = now() where id = new.machine_id;
  elsif (new.status = 'Done' and (TG_OP = 'INSERT' or old.status != 'Done')) then
    select count(*) into open_alarm_count from public.alarms where machine_id = new.machine_id and status != 'Closed';
    if (open_alarm_count > 0) then
      update public.machines set status = 'Alarm', updated_at = now() where id = new.machine_id;
    else
      update public.machines set status = 'Running', updated_at = now() where id = new.machine_id;
    end if;

    -- If this maintenance is linked to a PM plan, advance the plan's due date
    if (new.plan_id is not null) then
      select interval_days into plan_interval from public.pm_plans where id = new.plan_id;
      if (plan_interval is not null) then
        update public.pm_plans
        set last_done = current_date,
            next_due = current_date + (plan_interval || ' days')::interval,
            updated_at = now()
        where id = new.plan_id;
      end if;
    end if;
  end if;

  return new;
end;
$$ language plpgsql security definer set search_path = public;

drop trigger if exists trg_sync_machine_pm on public.maintenance_records;
create trigger trg_sync_machine_pm
  after insert or update on public.maintenance_records
  for each row execute function public.sync_machine_and_pm_on_maintenance();

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. ROW LEVEL SECURITY (RLS) POLICIES
-- ─────────────────────────────────────────────────────────────────────────────

alter table public.profiles enable row level security;
alter table public.roles enable row level security;
alter table public.machines enable row level security;
alter table public.alarms enable row level security;
alter table public.pm_plans enable row level security;
alter table public.maintenance_records enable row level security;
alter table public.audit_log enable row level security;

-- Helper to check user role securely
create or replace function public.current_role()
returns text as $$
  select role from public.profiles where id = auth.uid() and active = true;
$$ language sql stable security definer set search_path = public;

-- 4.0 ROLES POLICIES
drop policy if exists "Allow read roles" on public.roles;
create policy "Allow read roles" on public.roles for select using (true);

drop policy if exists "Allow admin manage roles" on public.roles;
create policy "Allow admin manage roles" on public.roles for all using (public.current_role() = 'admin');

-- 4.1 PROFILES POLICIES
drop policy if exists "Allow authenticated read profiles" on public.profiles;
create policy "Allow authenticated read profiles" on public.profiles for select to authenticated using (true);

drop policy if exists "Allow users update own profile" on public.profiles;
create policy "Allow users update own profile" on public.profiles for update to authenticated
  using (auth.uid() = id) with check (auth.uid() = id);

drop policy if exists "Allow admin manage profiles" on public.profiles;
create policy "Allow admin manage profiles" on public.profiles for all to authenticated
  using (public.current_role() = 'admin');

-- 4.2 MACHINES POLICIES
drop policy if exists "Allow authenticated read machines" on public.machines;
create policy "Allow authenticated read machines" on public.machines for select to authenticated using (true);

drop policy if exists "Allow admin modify machines" on public.machines;
create policy "Allow admin modify machines" on public.machines for all to authenticated
  using (public.current_role() = 'admin');

-- 4.3 ALARMS POLICIES
drop policy if exists "Allow authenticated read alarms" on public.alarms;
create policy "Allow authenticated read alarms" on public.alarms for select to authenticated using (true);

drop policy if exists "Allow staff modify alarms" on public.alarms;
create policy "Allow staff modify alarms" on public.alarms for all to authenticated
  using (public.current_role() in ('admin', 'technician'));

-- 4.4 PM PLANS POLICIES
drop policy if exists "Allow authenticated read pm_plans" on public.pm_plans;
create policy "Allow authenticated read pm_plans" on public.pm_plans for select to authenticated using (true);

drop policy if exists "Allow staff modify pm_plans" on public.pm_plans;
create policy "Allow staff modify pm_plans" on public.pm_plans for all to authenticated
  using (public.current_role() in ('admin', 'technician'));

-- 4.5 MAINTENANCE RECORDS POLICIES
drop policy if exists "Allow authenticated read maintenance" on public.maintenance_records;
create policy "Allow authenticated read maintenance" on public.maintenance_records for select to authenticated using (true);

drop policy if exists "Allow staff modify maintenance" on public.maintenance_records;
create policy "Allow staff modify maintenance" on public.maintenance_records for all to authenticated
  using (public.current_role() in ('admin', 'technician'));

-- 4.6 AUDIT LOG POLICIES
drop policy if exists "Allow authenticated read audit_log" on public.audit_log;
create policy "Allow authenticated read audit_log" on public.audit_log for select to authenticated using (true);

drop policy if exists "Allow authenticated insert audit_log" on public.audit_log;
create policy "Allow authenticated insert audit_log" on public.audit_log for insert to authenticated with check (true);

-- ─────────────────────────────────────────────────────────────────────────────
-- 5. INITIAL SEED DATA (Default System Roles, Machines & Sample Plans)
-- ─────────────────────────────────────────────────────────────────────────────

-- System default roles
insert into public.roles (id, label, description, pages, permissions, is_system)
values
  ('admin', 'Admin', 'ผู้ดูแลระบบ สามารถเข้าถึงและจัดการได้ทุกเมนู', array['dashboard', 'machines', 'alarms', 'maintenance', 'plan', 'users', 'audit'], array['machine:write', 'alarm:create', 'alarm:update', 'maintenance:write', 'plan:write', 'plan:issue', 'users:manage', 'audit:read'], true),
  ('technician', 'Technician', 'ช่างซ่อมบำรุง จัดการเครื่องจักร Alarm งานซ่อม และใบงาน PM', array['dashboard', 'machines', 'alarms', 'maintenance', 'plan'], array['alarm:create', 'alarm:update', 'maintenance:write', 'plan:issue'], false),
  ('viewer', 'Viewer', 'ผู้ดูข้อมูล ดูแดชบอร์ดอย่างเดียว', array['dashboard'], array[]::text[], false)
on conflict (id) do update set
  label = excluded.label,
  description = excluded.description,
  pages = excluded.pages,
  permissions = excluded.permissions,
  is_system = excluded.is_system;

-- Initial machines master
insert into public.machines (id, name, type, location, status) values
  ('M-001', 'CNC Lathe #1', 'CNC', 'Line A', 'Running'),
  ('M-002', 'CNC Milling #2', 'CNC', 'Line A', 'Alarm'),
  ('M-003', 'Belt Conveyor C1', 'Conveyor', 'Line A', 'Running'),
  ('M-004', 'Robot Arm R1 (Welding)', 'Robot', 'Line B', 'Running'),
  ('M-005', 'Robot Arm R2 (Pick & Place)', 'Robot', 'Line B', 'Maintenance'),
  ('M-006', 'Hydraulic Press 200T', 'Press', 'Line B', 'Running'),
  ('M-007', 'Injection Molding IM-450', 'Injection Molding', 'Line C', 'Alarm'),
  ('M-008', 'Packaging Sealer PK-2', 'Packaging', 'Line C', 'Stop'),
  ('M-009', 'Air Compressor AC-75', 'Compressor', 'Utility', 'Running'),
  ('M-010', 'Chiller CH-30', 'Chiller', 'Utility', 'Running')
on conflict (id) do nothing;

-- Initial PM plans
insert into public.pm_plans (id, machine_id, task, checklist, interval_days, last_done, next_due, active) values
  ('PM-001', 'M-006', 'Monthly PM เครื่องอัดไฮดรอลิก', 'เปลี่ยนไส้กรองน้ำมันไฮดรอลิก\nตรวจแรงดันระบบ 180–200 bar\nตรวจรอยรั่วที่ข้อต่อ', 30, current_date - interval '28 days', current_date + interval '2 days', true),
  ('PM-002', 'M-009', 'Quarterly PM ปั๊มลม', 'เปลี่ยนน้ำมันคอมเพรสเซอร์\nเปลี่ยนไส้กรองอากาศ\nตรวจความตึงสายพาน', 90, current_date - interval '4 days', current_date + interval '86 days', true),
  ('PM-003', 'M-001', 'หล่อลื่น Slideway และตรวจ Backlash', 'เติมน้ำมัน slideway\nวัด backlash แกน X/Z ไม่เกิน 0.01 mm\nทำความสะอาดถาดเศษ', 30, current_date - interval '33 days', current_date - interval '3 days', true),
  ('PM-004', 'M-004', 'ตรวจสายเคเบิลและอัดจาระบี Reducer', 'ตรวจ cable dress ทุกแกน\nอัดจาระบี reducer J1–J3\nสำรองโปรแกรมหุ่นยนต์', 90, current_date - interval '85 days', current_date + interval '5 days', true),
  ('PM-005', 'M-003', 'ตรวจสายพานและ Bearing', 'ตรวจความตึงและแนวสายพาน\nฟังเสียง bearing ลูกกลิ้ง\nทำความสะอาดเซนเซอร์', 7, current_date - interval '6 days', current_date + interval '1 day', true),
  ('PM-006', 'M-010', 'ล้าง Condenser Coil', 'ล้าง condenser coil\nตรวจระดับน้ำยา\nบันทึกอุณหภูมิน้ำเข้า/ออก', 180, current_date - interval '160 days', current_date + interval '20 days', true),
  ('PM-007', 'M-007', 'ตรวจ Heater Band และ Thermocouple', 'วัดความต้านทาน heater ทุกโซน\nสอบเทียบ thermocouple\nขันขั้วสายไฟ', 30, current_date - interval '31 days', current_date - interval '1 day', true),
  ('PM-008', 'M-008', 'เปลี่ยน Teflon Seal Jaw', 'เปลี่ยนเทปเทฟลอน seal jaw\nตรวจแรงกดปิดผนึก', 30, current_date - interval '18 days', current_date + interval '12 days', true),
  ('PM-009', 'M-002', 'เปลี่ยน Coolant และล้างถัง', 'ดูดเศษและล้างถัง coolant\nผสม coolant ใหม่ 5–7%\nตรวจปั๊ม coolant', 30, current_date - interval '21 days', current_date + interval '9 days', true)
on conflict (id) do nothing;

-- Initial Alarms
insert into public.alarms (id, machine_id, code, description, occurred_at, cause, action, status) values
  ('ALM-1024', 'M-002', 'E-201', 'Spindle overload', now() - interval '2 hours', '', '', 'Open'),
  ('ALM-1023', 'M-007', 'E-410', 'Barrel temperature high (Zone 3)', now() - interval '4 hours', 'Heater band thermocouple drift', '', 'In Progress'),
  ('ALM-1022', 'M-005', 'E-305', 'Gripper vacuum pressure low', now() - interval '1 day', 'Vacuum cup worn', '', 'In Progress'),
  ('ALM-1021', 'M-003', 'E-102', 'Belt misalignment sensor', now() - interval '1 day 4 hours', 'Tail pulley loose', 'Re-tensioned belt and tightened pulley bolts', 'Closed'),
  ('ALM-1020', 'M-008', 'E-512', 'Seal jaw temperature not reached', now() - interval '2 days', '', '', 'Open')
on conflict (id) do nothing;

-- Initial Maintenance Records
insert into public.maintenance_records (id, machine_id, type, problem, action, date, status, alarm_id, plan_id) values
  ('MNT-0312', 'M-005', 'Corrective', 'Gripper vacuum pressure low', 'Ordered replacement vacuum cups (x4)', now() - interval '1 day', 'Waiting Part', 'ALM-1022', null),
  ('MNT-0311', 'M-007', 'Corrective', 'Zone 3 over-temperature', 'Checking thermocouple and heater band', now() - interval '4 hours', 'In Progress', 'ALM-1023', null),
  ('MNT-0310', 'M-006', 'Preventive', 'Monthly PM: hydraulic press', '', now() + interval '2 days', 'Open', null, 'PM-001'),
  ('MNT-0309', 'M-003', 'Corrective', 'Belt misalignment', 'Re-tensioned belt and tightened pulley bolts', now() - interval '1 day', 'Done', 'ALM-1021', null)
on conflict (id) do nothing;

-- Initial Audit Log
insert into public.audit_log (at, text) values
  (now() - interval '1 day', 'ระบบเริ่มต้นใช้งานฐานข้อมูล Supabase สำเร็จ'),
  (now() - interval '12 hours', 'นำเข้าข้อมูลตั้งต้น Machine Master 10 เครื่อง และแผน PM'),
  (now() - interval '1 hour', 'ตรวจสอบระบบความปลอดภัยและการเชื่อมต่อ Auth')
on conflict do nothing;

-- ─────────────────────────────────────────────────────────────────────────────
-- 6. INITIAL ADMIN USER (Uncomment and replace email to pre-approve Admin account):
-- ─────────────────────────────────────────────────────────────────────────────
-- INSERT INTO public.profiles (id, email, name, role, active)
-- VALUES (gen_random_uuid(), 'your_email@gmail.com', 'Admin User', 'admin', true)
-- ON CONFLICT (email) DO UPDATE SET role = 'admin', active = true;
