# คู่มือต่อ Supabase (สำหรับทีม)

Frontend ตอนนี้ใช้ **ข้อมูลจำลองในหน่วยความจำ** (`src/lib/data/repo.ts`) และ **login ทดลอง** (`src/lib/auth/*`)
หน้าเว็บและ server action เรียกผ่านฟังก์ชันใน `repo.ts` เท่านั้น การต่อ Supabase จึงแก้แค่ชั้นข้อมูลกับ auth ไม่ต้องแก้หน้า UI

## 1. สิ่งที่ต้องเปลี่ยน

| ไฟล์ | ตอนนี้ | เปลี่ยนเป็น |
|---|---|---|
| `src/lib/data/repo.ts` | อ่าน/เขียน array ในหน่วยความจำ | query Supabase (ชื่อฟังก์ชันและ return type เหมือนเดิม) |
| `src/lib/data/seed.ts` | ข้อมูลตัวอย่าง | ใช้เป็น seed SQL หรือลบทิ้ง |
| `src/lib/auth/session.ts` | cookie ที่เซ็นด้วย HMAC | cookie session ของ `@supabase/ssr` |
| `src/lib/auth/credentials.ts` | บัญชีทดลอง + rate limit | `supabase.auth.signInWithPassword()` |
| `src/lib/auth/dal.ts` | `getCurrentUser()` อ่าน user จาก repo | อ่าน `auth.getUser()` แล้วดึง `profiles` (เช็ก `active`) |
| `src/proxy.ts` | เช็กว่ามี cookie `ml_session` | เปลี่ยนชื่อ cookie เป็นของ Supabase (หรือ refresh session ตามคู่มือ `@supabase/ssr`) |

ฟังก์ชัน `requirePage()` / `requirePermission()` และ `src/lib/permissions.ts` ใช้ต่อได้เลย

## 2. ตารางที่ต้องมี (ตามโจทย์ข้อ 3.8)

| ตาราง | คอลัมน์หลัก | Constraint / ความสัมพันธ์ |
|---|---|---|
| `profiles` | `id uuid` (PK, FK → `auth.users.id`), `name`, `email`, `role`, `active` | `role in ('admin','technician','viewer')`, ค่าเริ่มต้น `viewer` |
| `machines` | `id text` PK, `name`, `type`, `location`, `status` | `id ~ '^M-[0-9]{3}$'`, `status in ('Running','Stop','Alarm','Maintenance')`, ชื่อยาว 3–60 |
| `alarms` | `id`, `machine_id`, `code`, `description`, `occurred_at timestamptz`, `cause`, `action`, `status`, `assignee_id`, `closed_at`, `closed_by`, `updated_at` | FK `machine_id → machines` (**on delete restrict**), `code ~ '^E-[0-9]{3}$'`, `status in ('Open','In Progress','Closed')` |
| `maintenance_records` | `id`, `machine_id`, `technician_id`, `type`, `problem`, `action`, `date`, `status`, `alarm_id`, `plan_id` | FK → `machines` (restrict), `profiles`, `alarms`, `pm_plans`; `status in ('Open','In Progress','Waiting Part','Done')` |
| `pm_plans` | `id`, `machine_id`, `technician_id`, `task`, `checklist`, `interval_days`, `last_done date`, `next_due date`, `active` | `interval_days in (7,14,30,90,180,365)`, `next_due > last_done`, unique `(machine_id, lower(task)) where active` |
| `audit_log` | `id`, `at`, `user_id`, `text` | เขียนผ่าน trigger เท่านั้น |

## 3. กฎที่ควรย้ายไปไว้ในฐานข้อมูล

กฎเหล่านี้ตอนนี้อยู่ใน `repo.ts` ควรย้ายไปเป็น constraint/trigger เพื่อไม่ให้ client ข้ามได้

- ปิด Alarm (`Closed`) ต้องมี `cause` และ `action` และปิดแล้วห้ามแก้ → trigger `before update on alarms`
- บันทึก Alarm → เครื่องเป็น `Alarm` (ถ้าไม่ได้อยู่ใน `Maintenance`), ปิด Alarm ตัวสุดท้าย → เครื่องกลับเป็น `Running`
- งานซ่อม `In Progress` / `Waiting Part` → เครื่องเป็น `Maintenance`, งาน `Done` → เครื่องกลับเป็น `Running` หรือ `Alarm`
- งานซ่อมสถานะ `Done` / `Waiting Part` ต้องมี `action`
- ใบงานจากแผน PM เปลี่ยนเป็น `Done` → `pm_plans.last_done = วันนี้`, `next_due = วันนี้ + interval_days`
- ห้ามลบเครื่องที่มี Alarm / งานซ่อม / แผน PM อ้างอิง (FK `on delete restrict`)
- Admin เปลี่ยน role หรือปิดบัญชีตัวเองไม่ได้
- ทุกการเปลี่ยนแปลงบันทึกลง `audit_log`

trigger ที่ต้องแก้ตารางที่ผู้ใช้ไม่มีสิทธิ์เขียน (เช่น technician ปิด Alarm แล้วต้องแก้ `machines.status`) ให้ใช้ `security definer` และตั้ง `set search_path = public`

## 4. Row Level Security (เปิดทุกตาราง)

| ตาราง | admin | technician | viewer |
|---|---|---|---|
| `profiles` | select, update (ยกเว้นแถวของตัวเอง) | select แถวของตัวเอง | select แถวของตัวเอง |
| `machines` | select, insert, update, delete | select | — |
| `alarms` | select, insert, update | select, insert, update | — |
| `maintenance_records` | select, insert, update | select, insert, update | — |
| `pm_plans` | select, insert, update | select | — |
| `audit_log` | select | — | — |

- Viewer ดู Dashboard ผ่าน function `dashboard_stats()` แบบ `security definer` ที่คืนเฉพาะตัวเลขสรุป ไม่ต้องเปิด select ตารางดิบให้
- เขียน helper `current_role()` แบบ `security definer` ที่อ่าน role จาก `profiles` แล้วใช้ในทุก policy
- ผู้ใช้ที่ `active = false` ต้องไม่ผ่าน policy ใดเลย

## 5. Environment variables

- ใช้ `NEXT_PUBLIC_` ได้เฉพาะ `NEXT_PUBLIC_SUPABASE_URL` และ `NEXT_PUBLIC_SUPABASE_ANON_KEY` (หรือ publishable key)
- **ห้าม** ใส่ service role / secret key ใน client, ห้ามตั้งชื่อขึ้นต้นด้วย `NEXT_PUBLIC_` และห้าม commit ลง GitHub
- ใส่ค่าจริงใน Vercel → Project Settings → Environment Variables และในเครื่องใช้ `.env.local` (อยู่ใน `.gitignore` แล้ว)

## 6. Checklist ก่อนรวมเข้า production

- [ ] RLS เปิดทุกตาราง และทดสอบด้วยบัญชี technician/viewer ว่าเรียก API ตรงแล้วโดนปฏิเสธ
- [ ] ไม่มี secret key ใน bundle ฝั่ง client (ค้นใน `.next/static` ต้องไม่เจอ)
- [ ] ปิดบัญชีทดลอง (`DEMO_LOGIN=off`) หรือลบ `credentials.ts`
- [ ] Unit test (`npm test`) และ CI บน GitHub Actions ผ่าน
