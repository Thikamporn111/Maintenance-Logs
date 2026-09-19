# Alarm & Maintenance Management System — UX/UI Prototype

> **Prototype สำหรับออกแบบ UX/UI** ของ Web Application ในรายวิชา Programming in Automation Systems
> ใช้สำหรับทดสอบ user flow, หน้าจอ, validation และสิทธิ์ของแต่ละ Role ก่อนพัฒนาระบบจริงด้วย Next.js + Supabase

⚠️ **ไม่ใช่ระบบ Production** — repo นี้เป็นแบบจำลอง (clickable prototype) ที่กดเล่นได้เหมือนแอปจริง แต่ข้อมูลเก็บในเบราว์เซอร์ของผู้เปิดเท่านั้น ไม่มี backend, database หรือ authentication จริง

## วิธีเปิดใช้งาน

เปิดไฟล์ `index.html` ด้วยเบราว์เซอร์ได้ทันที ไม่ต้องติดตั้งอะไร (หรือเปิดผ่าน GitHub Pages ถ้าเปิดใช้งานไว้)

### บัญชีทดลอง

Prototype ไม่มีระบบยืนยันตัวตนจริง เลือกบัญชีแล้วใส่รหัสผ่านอะไรก็ได้ (ระบบจริงใน branch `frontend-dev` ใช้รหัสผ่านที่เป็นความลับของทีมพัฒนา)

| บัญชี | Role | สิทธิ์ |
|---|---|---|
| admin@plant.local | Admin | จัดการทุกอย่าง รวม Machine CRUD, แผน PM, Users, Audit Log |
| tech1@plant.local / tech2@plant.local | Technician | ดูเครื่องจักร, บันทึก/อัปเดต Alarm และ Maintenance, ออกใบงาน PM |
| manager@plant.local | Viewer | ดู Dashboard เท่านั้น |

สลับผู้ใช้ได้จากเมนู "สลับผู้ใช้ทดลอง" มุมขวาบน โดยไม่ต้อง logout

## หน้าจอและ Flow ที่ออกแบบ

| หน้า | สิ่งที่ออกแบบ |
|---|---|
| Login | เลือกบัญชีทดลอง, validation อีเมล/รหัสผ่าน, ข้อความ error |
| Dashboard | จำนวนเครื่องทั้งหมด / Running / Stop / Alarm / Maintenance, กราฟ Alarm 7 วัน, MTTR, งานซ่อมค้าง, PM เกินกำหนด, Alarm ที่ต้องจัดการ |
| Machines | CRUD ครบ, ค้นหา + กรองสถานะ/ประเภท, PM ถัดไป, ประวัติเครื่อง (Machine History) |
| Alarms | บันทึก Alarm, กรองสถานะ/เครื่อง/ช่วงวันที่, เปลี่ยนสถานะ Open → In Progress → Closed, สร้างงานซ่อมจาก Alarm |
| Maintenance | สร้าง/แก้ไขงานซ่อม, สถานะ Open / In Progress / Waiting Part / Done, กรองตามช่าง/ประเภท |
| Maintenance Plan | แผน PM รายเครื่อง (timeline 12 สัปดาห์), ปฏิทินรายเดือน, รายการ, ออกใบงาน PM และเลื่อนรอบถัดไปอัตโนมัติ |
| Users (Admin) | เปลี่ยน Role, เปิด/ปิดบัญชี (เปลี่ยน Role ตัวเองไม่ได้ เพื่อกันล็อกตัวเองออก) |
| Audit Log (Admin) | บันทึกว่าใครเปลี่ยนอะไร เมื่อไร |
| 403 | เมื่อ Role ไม่มีสิทธิ์เปิดหน้านั้น (สาธิต REQ-SEC-01) |

### Business rules และ Validation ที่สาธิตไว้

- Machine ID ต้องเป็นรูปแบบ `M-000` และห้ามซ้ำ ("Machine ID already exists")
- Alarm Code ต้องเป็นรูปแบบ `E-000` และเวลาเกิดต้องไม่อยู่ในอนาคต
- ปิด Alarm (Closed) ได้เมื่อระบุ Cause และ Action Taken แล้วเท่านั้น ระบบบันทึกผู้ปิดและเวลาให้
- งานซ่อมสถานะ Done หรือ Waiting Part ต้องกรอกการแก้ไข / อะไหล่ที่รอ
- ลบเครื่องที่มี Alarm/งานซ่อมอ้างอิงไม่ได้ (จำลอง Foreign Key แบบ restrict) ให้เปลี่ยนสถานะเป็น Stop แทน
- สถานะเครื่องเปลี่ยนตามเหตุการณ์: มี Alarm → Alarm, ปิด Alarm ครบ → Running, เริ่มซ่อม → Maintenance
- แผน PM: ห้ามชื่อซ้ำบนเครื่องเดียวกัน, วันครบกำหนดต้องอยู่หลังวันที่ทำล่าสุด, ปิดใบงาน PM เป็น Done แล้วเลื่อนรอบถัดไปตามความถี่

### Design

- ธีมขาว / เทา / แดงเลือดหมู (Light และ Dark mode)
- ใช้สีเฉพาะเพื่อบอกสถานะผิดปกติ (แนวคิดเดียวกับ HMI ในโรงงาน) — แดง = Alarm, ส้ม = Maintenance, เขียว = Running
- Responsive: บนมือถือเมนูย้ายไปเป็นแถบด้านล่าง
- ฟอนต์ IBM Plex Sans Thai และ IBM Plex Mono สำหรับรหัสเครื่อง/รหัส Alarm

## ความต่างจากระบบจริงที่ต้องส่ง

| | Prototype นี้ | ระบบจริงตามโจทย์ |
|---|---|---|
| Framework | HTML / CSS / JavaScript | Next.js + Tailwind CSS |
| ข้อมูล | localStorage ในเบราว์เซอร์ | Supabase (PostgreSQL) |
| Login | บัญชีทดลอง | Supabase Authentication |
| ตรวจสิทธิ์ | ฝั่งเบราว์เซอร์เท่านั้น | Server / RLS (การซ่อนเมนูไม่ใช่ Authorization) |
| Deploy | Static file | Vercel + GitHub Actions CI |

## โครงสร้างไฟล์

```
index.html   หน้าเว็บ + CSS (theme tokens)
data.js      ข้อมูลตัวอย่าง (machines, alarms, maintenance, pmPlans, users)
app.js       state, สิทธิ์ตาม Role, helper, Login, Dashboard
views.js     หน้า Machines, Alarms, Maintenance, Maintenance Plan, Users, Audit
events.js    modal, form validation, business rules, event handling
```

## การใช้ AI

Prototype นี้ออกแบบและสร้างโดยใช้ AI (Claude) ช่วยวิเคราะห์ Requirement จากเอกสารโจทย์, ออกแบบ UX/UI, เขียนโค้ด prototype และกำหนด validation — ตามที่โจทย์ข้อ 4 อนุญาตให้ใช้ AI ช่วยสร้าง UI/UX ได้
