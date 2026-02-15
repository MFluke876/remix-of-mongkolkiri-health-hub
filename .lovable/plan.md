

## ลบข้อมูลทั้งหมดในฐานข้อมูล

### สิ่งที่จะทำ

ลบข้อมูล (rows) ทั้งหมดออกจากทุกตาราง โดยคงโครงสร้างตาราง, RLS policies, triggers และ functions ไว้ตามเดิม

### วิธีดำเนินการ

ใช้ SQL migration เพื่อ TRUNCATE ทุกตารางพร้อมกัน:

```text
TRUNCATE TABLE
  patient_treatment_plans,
  patient_diagnoses,
  patient_consultations,
  diagnoses,
  prescriptions,
  procedure_orders,
  treatment_plans,
  visits,
  patient_accounts,
  user_roles,
  patients,
  medicines,
  profiles
CASCADE;
```

### สิ่งที่ควรทราบ

- ข้อมูลใน auth.users จะยังคงอยู่ เนื่องจากไม่สามารถลบผ่าน migration ได้ (เป็น reserved schema)
- หลังลบข้อมูลเสร็จ ให้ไปลบ users ใน Backend UI ด้วยตนเอง (Cloud > Authentication)
- ไม่มีการเปลี่ยนแปลงไฟล์โค้ด เฉพาะ migration เพื่อลบข้อมูลเท่านั้น

