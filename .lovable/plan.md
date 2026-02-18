

## ยกเลิกระบบ Visit - เปลี่ยนให้ Prescriptions ผูกกับผู้ป่วยโดยตรง

### สรุป
ยกเลิกการพึ่งพาตาราง `visits` โดยเปลี่ยนให้ prescriptions ผูกตรงกับ `patient_id` แทน `visit_id` และลบแท็บ "เข้ารับบริการ" ออกจากหน้ารายละเอียดผู้ป่วย

### สิ่งที่จะทำ

#### 1. แก้ไขฐานข้อมูล (Migration)
- เพิ่มคอลัมน์ `patient_id` (uuid) และ `prescription_date` (date) ในตาราง `prescriptions`
- ย้ายข้อมูลจาก visit เดิมมาใส่คอลัมน์ใหม่ (backfill patient_id และ prescription_date จาก visits)
- เปลี่ยน `visit_id` จาก NOT NULL เป็น nullable (เพื่อรองรับข้อมูลเก่า)
- อัปเดต RLS policies ให้ใช้ `patient_id` แทน visit join
- เพิ่ม RLS policy สำหรับผู้ป่วยดูใบสั่งยาของตัวเองผ่าน `patient_id`

#### 2. อัปเดต Hooks
- **`usePrescriptions.ts`**: เปลี่ยน `CreatePrescriptionInput` ให้ใช้ `patient_id` + `prescription_date` แทน `visit_id`
- อัปเดต query ให้ filter ด้วย `patient_id`

#### 3. อัปเดต PatientDetail.tsx
- ลบแท็บ "เข้ารับบริการ" (visits tab) ออก
- เปลี่ยน query ไม่ต้องดึง visits อีกต่อไป ดึง prescriptions ตรงจาก patient_id แทน
- อัปเดต prescription dialog ให้ส่ง `patient_id` + `prescription_date` แทน `visit_id`
- อัปเดตการแสดงผลประวัติยาให้ใช้ `prescription_date` แทนวันที่จาก visit

#### 4. อัปเดต PatientMedicationHistory.tsx (Patient Portal)
- เปลี่ยน query ให้ดึง prescriptions ผ่าน `patient_id` โดยตรง ไม่ต้อง join visits
- ใช้ `prescription_date` ในการจัดกลุ่มแทน `visit.visit_date`

#### 5. อัปเดต PDF Export
- เปลี่ยน `exportPatientPdf` ให้ใช้ prescriptions โดยตรงแทนผ่าน visits

### หมายเหตุ
- ตาราง `visits` ยังคงอยู่ในฐานข้อมูล (ไม่ลบ) เพื่อรักษาข้อมูลเก่าและไม่กระทบตารางอื่นที่ยังอ้างอิงอยู่ เช่น `treatment_plans`, `procedure_orders`, `diagnoses`
- เฉพาะ prescriptions เท่านั้นที่จะถูกย้ายออกจาก visits

### รายละเอียดทางเทคนิค

**Migration SQL:**
- `ALTER TABLE prescriptions ADD COLUMN patient_id uuid REFERENCES patients(id)`
- `ALTER TABLE prescriptions ADD COLUMN prescription_date date DEFAULT CURRENT_DATE`
- Backfill: `UPDATE prescriptions SET patient_id = v.patient_id, prescription_date = v.visit_date FROM visits v WHERE prescriptions.visit_id = v.id`
- `ALTER TABLE prescriptions ALTER COLUMN visit_id DROP NOT NULL`
- Update RLS policies to use `patient_id` directly

**Files to modify:**
- `src/hooks/usePrescriptions.ts`
- `src/pages/PatientDetail.tsx`
- `src/pages/patient/PatientMedicationHistory.tsx`
- `src/utils/exportPatientPdf.ts`

