# Maintenance Logs — Alarm & Maintenance Management System

Web Application สำหรับงาน Automation และงานซ่อมบำรุงเครื่องจักรในโรงงาน
รายวิชา Programming in Automation Systems

> **สถานะ:** branch `frontend-dev` คือ Frontend ช่วงพัฒนา ก่อนทดสอบเป็น production
> ตอนนี้ใช้ **ข้อมูลจำลอง (mock data)** และ **login ทดลอง** ทีมจะต่อ Supabase ในขั้นถัดไป ดู [docs/supabase-handoff.md](docs/supabase-handoff.md)

## วัตถุประสงค์

โรงงานบันทึก Alarm และงานซ่อมในหลายแหล่งข้อมูล ทำให้ค้นหาประวัติยาก ติดตามสถานะงานไม่ชัด และผู้เกี่ยวข้องเห็นข้อมูลไม่พร้อมกัน
ระบบนี้เป็นศูนย์กลางสำหรับ Machine, Alarm, งาน Maintenance และแผนบำรุงรักษาเชิงป้องกัน (PM)

## Branches

| Branch | เนื้อหา |
|---|---|
| `prototype-ux-ui` | UX/UI prototype แบบกดเล่นได้ (HTML/JS) — https://thikamporn111.github.io/Maintenance-Logs/ |
| `frontend-dev` | Frontend จริงด้วย Next.js ตามแบบใน prototype (branch นี้) |

## Function หลัก

| หน้า | ความสามารถ |
|---|---|
| Login / Logout | ล็อกอินด้วยอีเมลและรหัสผ่าน, session cookie แบบ httpOnly, จำกัดการลองรหัสผิด |
| Dashboard | จำนวนเครื่องทั้งหมด / Running / Stop / Alarm / Maintenance, Alarm ที่ยังไม่ปิด, กราฟ Alarm 7 วัน, MTTR, งานซ่อมค้าง, PM เกินกำหนด |
| Machines | CRUD ครบ, ค้นหา + กรองสถานะ/ประเภท, หน้ารายละเอียดพร้อมประวัติเครื่องและแผน PM |
| Alarms | บันทึก Alarm, กรองตามสถานะ/เครื่อง/ช่วงวันที่, เปลี่ยนสถานะ Open → In Progress → Closed |
| Maintenance | สร้าง/แก้ไขงานซ่อม (Open, In Progress, Waiting Part, Done), กรองตามช่าง/ประเภท, สร้างจาก Alarm หรือแผน PM |
| Maintenance Plan | แผน PM รายเครื่อง (timeline 12 สัปดาห์), ปฏิทินรายเดือน, รายการ, ออกใบงาน PM และเลื่อนรอบถัดไปอัตโนมัติ |
| Users (Admin) | เปลี่ยน Role, เปิด/ปิดบัญชี |
| Audit Log (Admin) | บันทึกว่าใครเปลี่ยนอะไร เมื่อไร |

### Role และสิทธิ์

| Role | ดูข้อมูล | เพิ่ม/แก้ไข | จัดการ User |
|---|---|---|---|
| Admin | ทั้งหมด | ทั้งหมด (รวม Machine CRUD และแผน PM) | ได้ |
| Technician | Machine / Alarm / Maintenance / แผน PM | Alarm, Maintenance, ออกใบงาน PM | ไม่ได้ |
| Viewer | Dashboard | ไม่ได้ | ไม่ได้ |

สิทธิ์ถูกตรวจ **ฝั่ง server ทุกหน้าและทุก action** (`src/lib/auth/dal.ts`) ถ้าเปิด URL ที่ไม่มีสิทธิ์จะได้หน้า 403 จริง ไม่ใช่แค่ซ่อนเมนู

### Input Validation

- ช่องสำคัญห้ามว่าง, Machine ID รูปแบบ `M-000` และห้ามซ้ำ, Alarm Code รูปแบบ `E-000`
- เวลาเกิด Alarm ห้ามอยู่ในอนาคต, ช่วงวันที่ในตัวกรองต้องเริ่มก่อนสิ้นสุด
- ปิด Alarm ต้องมีสาเหตุและ Action Taken, งานซ่อม Done / Waiting Part ต้องมีรายละเอียดการแก้ไข
- ลบเครื่องที่มีประวัติอ้างอิงไม่ได้ (ให้เปลี่ยนเป็น Stop แทน)
- validation เดียวกัน (zod) ใช้ทั้งแสดงข้อความในฟอร์มและตรวจซ้ำที่ server

## Technology

Next.js 16 (App Router, Server Actions) · React 19 · TypeScript · Tailwind CSS 4 · Zod · Vitest · ESLint · GitHub Actions · Vercel
ฐานข้อมูลเป้าหมาย: Supabase (PostgreSQL + Auth + RLS)

## Database Structure (สำหรับ Supabase)

```
profiles (id, name, email, role, active)
   │ 1
   ├──< alarms.assignee_id / closed_by
   ├──< maintenance_records.technician_id
   └──< pm_plans.technician_id

machines (id M-000, name, type, location, status)
   │ 1
   ├──< alarms (id, machine_id, code, description, occurred_at, cause, action, status, closed_at, closed_by)
   ├──< maintenance_records (id, machine_id, technician_id, type, problem, action, date, status, alarm_id, plan_id)
   └──< pm_plans (id, machine_id, technician_id, task, checklist, interval_days, last_done, next_due, active)

alarms 1 ──< maintenance_records.alarm_id
pm_plans 1 ──< maintenance_records.plan_id
audit_log (at, user_id, text)
```

รายละเอียด constraint และ RLS: [docs/supabase-handoff.md](docs/supabase-handoff.md)

## ติดตั้งและใช้งาน

ต้องมี Node.js 20.9 ขึ้นไป

```bash
npm install
npm run dev
```

เปิด http://localhost:3000 แล้วเลือกบัญชีทดลอง (รหัสผ่านตอนพัฒนา: `REDACTED`)

| บัญชี | Role |
|---|---|
| admin@plant.local | Admin |
| tech1@plant.local, tech2@plant.local | Technician |
| manager@plant.local | Viewer |

คำสั่งอื่น

```bash
npm run build      # build production
npm run typecheck  # ตรวจ TypeScript
npm run lint       # ESLint
npm test           # unit test (Vitest)
```

Environment variables ดูตัวอย่างที่ [.env.example](.env.example) — production ต้องตั้ง `SESSION_SECRET` (32 ตัวอักษรขึ้นไป)

## Deployment

- Vercel URL: _ยังไม่ได้ deploy_ (ใส่หลังเชื่อม repo กับ Vercel)
- ตั้ง `SESSION_SECRET` และ `DEMO_PASSWORD` (หรือ `DEMO_LOGIN=off`) ใน Vercel → Environment Variables
- ข้อมูลจำลองเก็บในหน่วยความจำของ server จะรีเซ็ตเมื่อ server restart จนกว่าจะต่อ Supabase

## CI (GitHub Actions)

`.github/workflows/ci.yml` รันทุกครั้งที่ push หรือเปิด Pull Request ตามลำดับ
**Install dependencies → Build project → Type check → Lint → Test** และแสดงผล Passed/Failed ในแท็บ Actions

## ความปลอดภัย

- ตรวจ Authentication/Authorization ที่ server ทุกหน้าและทุก Server Action
- Session cookie เซ็นด้วย HMAC-SHA256, `httpOnly`, `SameSite=Lax`, `Secure` ใน production, หมดอายุ 8 ชั่วโมง
- ไม่มีรหัสผ่านเริ่มต้นใน production, จำกัดการลองรหัสผิด 5 ครั้ง / 15 นาที, ข้อความ error ไม่บอกว่าอีเมลมีอยู่หรือไม่
- Content-Security-Policy แบบ nonce ต่อ request (บล็อก script แปลกปลอม), `frame-ancestors 'none'`, `X-Frame-Options`, `nosniff`, `Referrer-Policy`, `Permissions-Policy`, HSTS
- ค่าจาก URL และฟอร์มผ่าน allow-list / zod ก่อนใช้, React escape ข้อความทุกจุด (ไม่ใช้ `dangerouslySetInnerHTML`)
- Server Actions ของ Next.js ตรวจ Origin กับ Host เพื่อกัน CSRF
- ไม่มี secret ในโค้ดหรือ repo — ค่าลับอยู่ใน environment variables เท่านั้น

## การใช้ AI ในการพัฒนา

ใช้ AI (Claude) ช่วยในขั้นตอนต่อไปนี้ ตามที่โจทย์ข้อ 4 อนุญาต

| ขั้นตอน | AI ช่วยอะไร | ทีมตรวจอะไร |
|---|---|---|
| วิเคราะห์ Requirement | สรุปเอกสารโจทย์และบทเรียนบทที่ 1–3 เป็นรายการหน้าจอ กฎ และสิทธิ์ | ยืนยันกับโจทย์และเกณฑ์คะแนน |
| UX/UI | ออกแบบ prototype กดเล่นได้ ธีม ขาว/เทา/แดงเลือดหมู และหน้า Maintenance Plan | ทดลองใช้ ปรับธีมและขอฟีเจอร์เพิ่ม |
| เขียนโค้ด | โครง Next.js, หน้าเว็บ, Server Actions, validation, ชั้นข้อมูลจำลอง | อ่านโค้ด ทดสอบในเบราว์เซอร์ |
| ความปลอดภัย | ตรวจสิทธิ์ฝั่ง server, session cookie, CSP, rate limit | ทดสอบเปิด URL ข้ามสิทธิ์และใช้ cookie ปลอม |
| Test / CI | unit test 29 กรณี และ GitHub Actions workflow | ดูผล CI ทุกครั้งที่ push |
