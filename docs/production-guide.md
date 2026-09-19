# จากเดโมสู่ Product จริง

คู่มือนี้ต่อจาก [supabase-handoff.md](supabase-handoff.md) แบ่งเป็น 2 ส่วน

- **ส่วน A:** หลังต่อ Supabase แล้ว ต้องเอาข้อมูลตัวอย่างและบัญชีทดลองออกอย่างไร
- **ส่วน B:** ต้องเตรียมอะไรบ้างให้ระบบใช้งานจริงในโรงงานได้

---

## ส่วน A — เอาข้อมูลตัวอย่างออกหลังต่อ Supabase

ทำตามลำดับ และทำทีละขั้นใน branch แยก เช่น `feature/supabase` แล้วเปิด Pull Request เข้า `frontend-dev`

### A1. เปลี่ยนชั้นข้อมูลเป็น Supabase

1. แก้ทุกฟังก์ชันใน `src/lib/data/repo.ts` ให้ query Supabase แทน array ในหน่วยความจำ โดยคงชื่อฟังก์ชันและ return type เดิม หน้าเว็บจะได้ไม่ต้องแก้
2. ลบส่วนที่ใช้เก็บข้อมูลในหน่วยความจำออกจาก `repo.ts` คือบรรทัด `globalThis.__maintenanceLogsStore` และฟังก์ชัน `db()`
3. ลบไฟล์ `src/lib/data/seed.ts`
   - ถ้าอยากมีข้อมูลตัวอย่างไว้พัฒนา ให้แปลงเป็น `supabase/seed.sql` แล้วใส่ใน **Supabase project สำหรับพัฒนาเท่านั้น** ห้ามใส่ใน project production

### A2. เปลี่ยน login ทดลองเป็น Supabase Auth

1. ติดตั้ง `@supabase/ssr` และ `@supabase/supabase-js`
2. ลบ `src/lib/auth/credentials.ts` (บัญชีทดลอง, รหัส `REDACTED`, rate limit แบบในหน่วยความจำ)
3. ลบ `src/lib/auth/session.ts` และ `tests/session.test.ts` แล้วใช้ cookie session ของ `@supabase/ssr` แทน
4. แก้ `src/lib/auth/dal.ts` ให้ `getCurrentUser()` เรียก `supabase.auth.getUser()` แล้วดึงแถวใน `profiles` (ต้องเช็กว่า `active = true`)
5. แก้ `src/app/login/actions.ts` ให้เรียก `supabase.auth.signInWithPassword()`
6. แก้หน้า Login
   - `src/app/login/page.tsx`: ลบการดึงรายชื่อบัญชีทดลองและข้อความรหัสผ่าน
   - `src/app/login/LoginForm.tsx`: ลบปุ่มเลือกบัญชีทดลอง (ส่วน `accounts.map(...)`)
7. แก้ `src/proxy.ts` ให้เช็ก cookie ของ Supabase แทน `ml_session`

### A3. ล้างค่าตั้งค่าของเดโม

- ลบ `DEMO_LOGIN`, `DEMO_PASSWORD` และ `SESSION_SECRET` ออกจาก `.env.example`, `.env.local` และ Vercel
- เพิ่ม `NEXT_PUBLIC_SUPABASE_URL` และ `NEXT_PUBLIC_SUPABASE_ANON_KEY` (หรือ publishable key) แทน

### A4. ใส่ข้อมูลจริง

| ข้อมูล | วิธีใส่ |
|---|---|
| ผู้ใช้ | Supabase → Authentication → **Invite user** ด้วยอีเมลจริงของพนักงาน แล้วตั้ง `role` ใน `profiles` |
| Admin คนแรก | ตั้ง `role = 'admin'` ด้วย SQL Editor ครั้งเดียว หลังจากนั้นให้ Admin จัดการผ่านหน้า Users |
| สมัครสมาชิกเอง | **ปิด** (Authentication → Sign In / Providers → ปิด Allow new users to sign up) ให้เข้าได้เฉพาะคนที่ Admin เชิญ |
| เครื่องจักร | เพิ่มผ่านหน้า Machines หรือ import CSV ใน Supabase Table Editor (ID ต้องเป็นรูปแบบ `M-000`) |
| แผน PM | Admin สร้างผ่านหน้า Maintenance Plan ตามคู่มือบำรุงรักษาของแต่ละเครื่อง |

### A5. ตรวจว่าไม่เหลือของเดโม

```bash
git grep -n -i -E "seed|REDACTED|plant\.local|__maintenanceLogsStore|ml_session"
```

ต้องไม่เจอใน `src/` (เจอใน `prototype/` และ `docs/` ได้) จากนั้นรัน `npm run build`, `npm run lint`, `npm test` ให้ผ่านทั้งหมด แล้วแก้หัวข้อ "ข้อมูลตัวอย่าง" ใน README

---

## ส่วน B — ทำให้เป็น Product จริง

### B1. แยกสภาพแวดล้อม

| สภาพแวดล้อม | Branch | Supabase | Vercel |
|---|---|---|---|
| พัฒนา / ทดสอบ | `frontend-dev` และ branch ย่อย | project สำหรับพัฒนา (มีข้อมูลตัวอย่างได้) | Preview Deployment |
| ใช้งานจริง | `main` | project production (ข้อมูลจริงเท่านั้น) | Production Deployment |

- สร้าง branch `main` สำหรับ production แล้วตั้งเป็น default branch และ Production Branch ใน Vercel
- ตั้ง **Branch protection** ให้ `main`: ต้องผ่าน Pull Request, ต้องผ่าน CI และห้าม push ตรง
- ค่า environment ของ Preview กับ Production ต้องชี้ไปคนละ Supabase project

### B2. ฐานข้อมูล

- เก็บ SQL ทุกครั้งที่เปลี่ยน schema เป็นไฟล์ migration ใน repo (`supabase/migrations/`) ด้วย Supabase CLI อย่าแก้ตารางใน production ด้วยมือ
- คอลัมน์เวลาใช้ `timestamptz` ทั้งหมด (โค้ดแปลงเป็นเวลาไทยให้แล้ว)
- เพิ่ม index สำหรับการค้นหาที่ใช้บ่อย
  - `alarms (machine_id, occurred_at desc)`, `alarms (status)`
  - `maintenance_records (machine_id, status)`, `maintenance_records (technician_id)`
  - `pm_plans (next_due) where active`
- ย้ายกฎสำคัญไปเป็น constraint/trigger ตามหัวข้อ 3 ใน [supabase-handoff.md](supabase-handoff.md)
- ตรวจเงื่อนไขการสำรองข้อมูล (backup) และการหยุด project เมื่อไม่มีการใช้งาน ของแพ็กเกจ Supabase ที่ใช้ ถ้าเป็นระบบจริงควรมี backup อัตโนมัติ

### B3. ความปลอดภัย

- [ ] เปิด RLS ทุกตาราง และทดสอบด้วยบัญชี Technician/Viewer ว่าเรียก API ของ Supabase ตรง ๆ แล้วถูกปฏิเสธ
- [ ] ไม่มี service role / secret key ใน client (ค้นใน `.next/static` หลัง build ต้องไม่เจอ)
- [ ] ปิดการสมัครเอง, เปิดยืนยันอีเมล, ตั้งความยาวรหัสผ่านขั้นต่ำใน Supabase Auth
- [ ] พิจารณาเปิด MFA ให้บัญชี Admin
- [ ] คง Content-Security-Policy และ security headers ที่ตั้งไว้ใน `src/proxy.ts` และ `next.config.ts`
- [ ] อัปเดต dependency สม่ำเสมอ (เปิด Dependabot ใน GitHub)
- [ ] บัญชีของพนักงานที่ลาออก ให้ Admin **ปิดการใช้งาน** แทนการลบ เพื่อเก็บประวัติใน Audit Log

### B4. คุณภาพและการทดสอบ

- เพิ่ม end-to-end test (เช่น Playwright) สำหรับ flow หลัก: login แต่ละ Role, สร้างและปิด Alarm, ออกใบงาน PM, หน้า 403
- เพิ่มขั้น e2e ใน GitHub Actions ให้รันกับ Preview Deployment
- ทำ UAT กับช่างและหัวหน้างานจริงอย่างน้อย 1 ไลน์ผลิตก่อนใช้ทั้งโรงงาน

### B5. การดูแลระบบหลังเปิดใช้

- ดู error ผ่าน Vercel Logs และ Supabase Logs หรือเพิ่มเครื่องมือ monitoring
- เมื่อข้อมูลเยอะขึ้น เพิ่มการแบ่งหน้า (pagination) ในหน้ารายการ Alarm และงานซ่อม
- ตั้งขั้นตอนรับ Change Request: เปิด GitHub Issue → ทำใน branch → Pull Request → CI ผ่าน → ทดสอบบน Preview → merge เข้า `main`

### B6. เปิดใช้งานจริง

1. ทดลองใช้ 1 ไลน์ผลิต (pilot) 1–2 สัปดาห์
2. อบรมผู้ใช้แต่ละ Role และทำคู่มือสั้น ๆ พร้อม screenshot
3. เก็บ feedback แล้วปรับแก้
4. เปิดใช้ทุกไลน์ และกำหนดผู้ดูแลระบบ (Admin) อย่างน้อย 2 คน

### B7. ต่อยอดในอนาคต (นอก Scope รอบนี้)

- รับสถานะเครื่องและ Alarm อัตโนมัติจาก PLC/SCADA ผ่าน Integration Layer หรือ Gateway ห้ามให้เบราว์เซอร์ต่อ PLC ตรง (ตามบทที่ 3)
- แจ้งเตือนผ่าน LINE หรืออีเมลเมื่อมี Alarm ใหม่หรือ PM ใกล้ครบกำหนด
- Export รายงานเป็น CSV/Excel
