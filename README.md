# Maintenance Logs — Alarm & Maintenance Management System

Web Application สำหรับงาน Automation และงานซ่อมบำรุงเครื่องจักรในโรงงาน
รายวิชา Programming in Automation Systems

> **สถานะ:** branch `frontend-dev` คือ Frontend ช่วงพัฒนา ก่อนทดสอบเป็น production
> ตอนนี้ใช้ **ข้อมูลจำลอง (mock data)** และ **login ทดลอง** ทีมจะต่อ Supabase ในขั้นถัดไป ดู [docs/supabase-handoff.md](docs/supabase-handoff.md)

## Frontend นี้คืออะไร และต่างจาก Prototype อย่างไร

branch นี้คือ **Frontend จริง** ที่สร้างด้วย Next.js + Tailwind CSS ตามที่โจทย์กำหนด โดยยึดหน้าจอและ flow จาก UX/UI prototype
Next.js เป็น framework แบบ full-stack โปรเจกต์นี้จึงมีทั้งส่วนหน้าเว็บ และส่วนที่ทำงานฝั่ง server (ตรวจสิทธิ์และ validate) อยู่ในโปรเจกต์เดียว ตามแนวทางในบทที่ 3 ของรายวิชา

### เทียบกับ Prototype

| | Prototype (branch `prototype-ux-ui`) | Frontend (branch `frontend-dev`) |
|---|---|---|
| จุดประสงค์ | ออกแบบและทดลอง UX/UI | ระบบที่นำไปต่อฐานข้อมูลและ deploy จริง |
| เทคโนโลยี | HTML / CSS / JavaScript ธรรมดา | **Next.js 16 + Tailwind CSS 4 + TypeScript** ตามโจทย์ |
| การแสดงผล | สร้างหน้าในเบราว์เซอร์ทั้งหมด | server render ทุกหน้า มี JavaScript ฝั่งเบราว์เซอร์เฉพาะส่วนที่ต้องโต้ตอบ |
| ข้อมูล | เก็บใน localStorage ของเบราว์เซอร์แต่ละเครื่อง | อยู่ที่ server ผ่าน `repo.ts` (ตอนนี้เป็นข้อมูลจำลอง รอต่อ Supabase) |
| Login | กดเลือกบัญชีเข้าได้เลย | ตรวจอีเมล/รหัสผ่าน, session cookie ที่เซ็นกันปลอม, จำกัดการลองรหัสผิด |
| ตรวจสิทธิ์ | ซ่อนเมนูในเบราว์เซอร์ (แก้ได้ง่าย) | **ตรวจที่ server ทุกหน้าและทุก action** เปิด URL ข้ามสิทธิ์ได้ 403 จริง |
| Validation | ในเบราว์เซอร์อย่างเดียว | แสดงในฟอร์ม **และตรวจซ้ำที่ server** ด้วยกฎชุดเดียวกัน (zod) |
| URL | หน้าเดียว เปลี่ยนเนื้อหาด้วย JavaScript | แต่ละหน้ามี URL ของตัวเอง ตัวกรองอยู่ใน URL แชร์ลิงก์ได้ |
| ความปลอดภัย | ไม่มี | CSP แบบ nonce, security headers, ไม่มี secret ในโค้ด |
| Test / CI | ไม่มี | unit test 29 กรณี + GitHub Actions ทุกครั้งที่ push |
| เวลา | เวลาของเครื่องที่เปิด | ใช้เวลาโรงงาน (UTC+7) เสมอ แม้ server อยู่คนละ time zone |

### ส่วนประกอบของ Frontend

| ส่วน | ไฟล์ | หน้าที่ |
|---|---|---|
| หน้าเว็บ (Pages) | `src/app/(app)/*/page.tsx`, `src/app/login/` | Dashboard, Machines, Alarms, Maintenance, Maintenance Plan, Users, Audit Log, Login |
| ฟอร์ม (Client Components) | `*Form.tsx`, `src/components/client.tsx` | กรอกข้อมูล, แสดง error ทันที, ตัวกรองที่อัปเดตตามที่พิมพ์ |
| Server Actions | `src/app/(app)/*/actions.ts` | รับฟอร์ม → ตรวจสิทธิ์ → validate → บันทึก |
| Components | `src/components/` | ป้ายสถานะ, ไอคอน, กราฟ SVG, ปุ่มยืนยันการลบ |
| กฎและสิทธิ์ | `src/lib/validation.ts`, `permissions.ts`, `pm.ts`, `time.ts` | กฎ validation, สิทธิ์ของแต่ละ Role, การคำนวณวันแผน PM, เวลาโรงงาน |
| Auth | `src/lib/auth/`, `src/proxy.ts` | login, session, ตรวจสิทธิ์, CSP |
| ชั้นข้อมูล | `src/lib/data/` | ข้อมูลตัวอย่างและฟังก์ชันอ่าน/เขียน (จุดที่ต้องเปลี่ยนเป็น Supabase) |
| ธีม | `src/app/globals.css` | สีขาว / เทา / แดงเลือดหมู, โหมดมืด |

## สถานะงาน

### ✅ สิ่งที่ทำแล้ว

| หัวข้อตามโจทย์ | สถานะ | ไฟล์ / หมายเหตุ |
|---|---|---|
| UX/UI prototype | เสร็จ | branch `prototype-ux-ui` และโฟลเดอร์ `prototype/` |
| 3.1 Login / Logout + Role | เสร็จ (ใช้บัญชีทดลอง) | `src/lib/auth/`, `src/app/login/` — รอเปลี่ยนเป็น Supabase Auth |
| 3.2 Machine Master CRUD | เสร็จ | `src/app/(app)/machines/` |
| 3.3 Alarm Record | เสร็จ | `src/app/(app)/alarms/` |
| 3.4 Maintenance Record | เสร็จ | `src/app/(app)/maintenance/` |
| 3.5 Search / Filter | เสร็จ | ทุกหน้ารายการ กรองได้ 2–5 เงื่อนไข |
| 3.6 Dashboard | เสร็จ | `src/app/(app)/dashboard/` |
| 3.7 Input Validation | เสร็จ | `src/lib/validation.ts` (ตรวจทั้งฟอร์มและ server) |
| 3.9 GitHub + commit history | เสร็จ | commit แยกทีละขั้น |
| 3.10 GitHub Actions CI | เสร็จ | `.github/workflows/ci.yml` — Install → Build → Type check → Lint → Test |
| 3.12 README | เสร็จ | ไฟล์นี้ (เหลือใส่ Vercel URL) |
| Bonus | เสร็จ | Role Viewer, กราฟ Alarm, Machine History, Maintenance Plan (PM), Audit Log, Dark Mode, Responsive, สถานะ Waiting Part, กรองตามช่วงวันที่ |

### 📋 สิ่งที่ทีมต้องทำต่อ

| ลำดับ | งาน | รายละเอียด | ข้อในโจทย์ |
|---|---|---|---|
| 1 | **ต่อ Supabase Database** | สร้างตารางตามหัวข้อ Database Structure ด้านล่าง ตั้ง constraint และ RLS แล้วแก้ฟังก์ชันใน `src/lib/data/repo.ts` ให้ query Supabase | 3.8 (15 คะแนน) |
| 2 | **ต่อ Supabase Auth** | แทนที่ `src/lib/auth/session.ts` และ `credentials.ts` ด้วย `@supabase/ssr`, สร้างบัญชีผู้ใช้จริงและตาราง `profiles` | 3.1 |
| 3 | **Deploy บน Vercel** | Import repo นี้ใน Vercel ตั้ง Environment Variables แล้วใส่ URL ในหัวข้อ Deployment | 3.11 |
| 4 | **ทดสอบหลังต่อ Supabase** | ล็อกอินด้วย Technician/Viewer แล้วลองเปิดหน้า Admin และเรียก API ตรง ต้องถูกปฏิเสธ | 3.1, 3.8 |
| 5 | **ปิดบัญชีทดลอง** | ตั้ง `DEMO_LOGIN=off` หรือลบ `credentials.ts` เมื่อใช้ Supabase Auth แล้ว | ความปลอดภัย |
| 6 | **Screenshot + รายงานการใช้ AI** | ถ่ายหน้าจอทุกหน้า และเขียนรายงานสั้นโดยใช้ตาราง "การใช้ AI" ด้านล่างเป็นจุดเริ่ม | สิ่งที่ต้องส่ง 5, 6 |
| 7 | **รวม branch** | เมื่อทดสอบผ่านแล้ว เปิด Pull Request จาก `frontend-dev` ไป branch หลักสำหรับ production | — |

คู่มือต่อ Supabase ละเอียด (ตาราง, กฎที่ควรย้ายไปทำใน Postgres, ตาราง RLS ของแต่ละ Role): [docs/supabase-handoff.md](docs/supabase-handoff.md)

## ข้อมูลตัวอย่าง (Mock Data)

ตอนนี้ระบบ**ยังไม่มีฐานข้อมูลจริง** จึงใช้ข้อมูลตัวอย่างเพื่อให้ทุกหน้ามีข้อมูลให้ทดสอบ

| เรื่อง | รายละเอียด |
|---|---|
| อยู่ที่ไหน | ข้อมูลเริ่มต้นอยู่ใน `src/lib/data/seed.ts`, ฟังก์ชันอ่าน/เขียนอยู่ใน `src/lib/data/repo.ts` |
| มีอะไรบ้าง | ผู้ใช้ 4 บัญชี, เครื่องจักร 10 เครื่อง (M-001 ถึง M-010), Alarm 13 รายการ, งานซ่อม 8 งาน, แผน PM 9 แผน, Audit Log 3 รายการ |
| วันที่ | สร้างย้อนหลังจาก "วันนี้" เสมอ กราฟ 7 วันและสถานะ PM (เกินกำหนด / ครบใน 7 วัน) จึงมีข้อมูลทุกครั้งที่เปิด |
| เก็บที่ไหน | ในหน่วยความจำของ server — **เพิ่ม/แก้ไขได้ แต่จะรีเซ็ตทุกครั้งที่ server restart** และบน Vercel แต่ละ instance จะไม่เห็นข้อมูลของกันและกัน |
| บัญชีทดลอง | รหัสผ่านตอนพัฒนา `REDACTED` — ใน production ไม่มีรหัสเริ่มต้น ต้องตั้ง `DEMO_PASSWORD` เอง หรือปิดด้วย `DEMO_LOGIN=off` |
| ชื่อคนในข้อมูล | เป็นชื่อสมมติทั้งหมด ไม่ใช่ข้อมูลจริง |

**เมื่อต่อ Supabase แล้ว:** หน้าเว็บจะอ่านข้อมูลจากฐานข้อมูลแทน `seed.ts` จะไม่ถูกใช้อีก จะลบทิ้ง หรือแปลงเป็น SQL insert เพื่อใส่ข้อมูลเริ่มต้นใน Supabase ก็ได้

## ต่อ Supabase แล้วเอาข้อมูลตัวอย่างออก และทำเป็น Product จริง

สรุปขั้นตอน รายละเอียดทั้งหมดอยู่ใน [docs/production-guide.md](docs/production-guide.md)

**เอาข้อมูลตัวอย่างออก**
1. แก้ `src/lib/data/repo.ts` ให้ query Supabase แล้วลบ `src/lib/data/seed.ts`
2. เปลี่ยน login ทดลองเป็น Supabase Auth: ลบ `credentials.ts`, `session.ts` และปุ่มบัญชีทดลองในหน้า Login
3. ลบ `DEMO_LOGIN`, `DEMO_PASSWORD`, `SESSION_SECRET` แล้วใส่ค่า Supabase แทน
4. เชิญผู้ใช้จริงผ่าน Supabase Auth, ปิดการสมัครเอง และเพิ่มเครื่องจักรจริงผ่านหน้า Machines
5. รันคำสั่งค้นหาของเดโมที่เหลืออยู่ แล้วให้ build, lint และ test ผ่าน

**ทำเป็น Product จริง**
- แยก Supabase และ Vercel เป็นชุดพัฒนา (`frontend-dev`) กับชุดใช้งานจริง (`main`) และห้าม push ตรงเข้า `main`
- เก็บ schema เป็น migration ใน repo, เพิ่ม index และตั้ง backup
- เปิด RLS ทุกตาราง, ไม่มี secret ใน client และพิจารณาเปิด MFA ให้ Admin
- เพิ่ม end-to-end test, ทำ UAT กับช่างจริง และทดลองใช้ 1 ไลน์ผลิตก่อนเปิดใช้ทั้งโรงงาน

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
