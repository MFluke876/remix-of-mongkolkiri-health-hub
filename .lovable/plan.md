
## เพิ่มฟีเจอร์บันทึกหัตถการ (Procedure Orders) สำหรับแพทย์

### สรุป
เพิ่มแท็บ "หัตถการ" ในหน้ารายละเอียดผู้ป่วย ให้แพทย์สามารถเพิ่ม ดู และลบบันทึกหัตถการได้ โดยเปลี่ยนจากระบบ visit มาผูกกับ patient_id โดยตรง (เหมือนที่ทำกับ prescriptions)

### สิ่งที่จะทำ

#### 1. แก้ไขฐานข้อมูล (Migration)
- เพิ่มคอลัมน์ `patient_id` (uuid) และ `procedure_date` (date) ในตาราง `procedure_orders`
- ย้ายข้อมูลเดิมจาก visit มาใส่คอลัมน์ใหม่ (backfill)
- เปลี่ยน `visit_id` เป็น nullable
- อัปเดต RLS policies ให้ใช้ `patient_id` โดยตรง

#### 2. อัปเดต Hook (`useProcedureOrders.ts`)
- เปลี่ยน input/query จาก `visit_id` เป็น `patient_id` + `procedure_date`
- อัปเดต query key ให้ใช้ `patient_id`

#### 3. เพิ่มแท็บ "หัตถการ" ใน PatientDetail.tsx
- เพิ่มแท็บใหม่ถัดจาก "ประวัติยา" แสดงรายการหัตถการ
- เพิ่ม Dialog สำหรับบันทึกหัตถการ ประกอบด้วย:
  - วันที่ทำหัตถการ
  - ชื่อหัตถการ
  - บริเวณที่ทำ (body part)
  - หมายเหตุ
  - สถานะ (pending/completed/cancelled)
- เพิ่มปุ่มลบหัตถการในแต่ละรายการ
- ปรับ TabsList จาก 4 คอลัมน์เป็น 5 คอลัมน์

### รายละเอียดทางเทคนิค

**Migration SQL:**
- `ALTER TABLE procedure_orders ADD COLUMN patient_id uuid REFERENCES patients(id)`
- `ALTER TABLE procedure_orders ADD COLUMN procedure_date date DEFAULT CURRENT_DATE`
- Backfill จาก visits: `UPDATE procedure_orders SET patient_id = v.patient_id, procedure_date = v.visit_date FROM visits v WHERE procedure_orders.visit_id = v.id`
- `ALTER TABLE procedure_orders ALTER COLUMN visit_id DROP NOT NULL`
- Drop/recreate RLS policies ให้ใช้ `patient_id`

**Files to modify:**
- `src/hooks/useProcedureOrders.ts` - เปลี่ยนเป็น patient_id based
- `src/pages/PatientDetail.tsx` - เพิ่มแท็บหัตถการ, dialog, และ logic ทั้งหมด
