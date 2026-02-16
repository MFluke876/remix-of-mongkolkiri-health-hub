import { format } from 'date-fns';
import { th } from 'date-fns/locale';
import { getStepInfo } from '@/hooks/usePatientTreatmentPlansNew';

interface PatientData {
  first_name: string;
  last_name: string;
  hn: string;
  dob: string;
  gender: string;
  national_id: string | null;
  phone: string | null;
  address: string | null;
  allergies: string[];
}

interface ConsultationData {
  consultation_date: string;
  chief_complaint: string;
  physical_exam_note?: string | null;
  vital_signs?: Record<string, string | number> | null;
  notes?: string | null;
}

interface DiagnosisData {
  diagnosis_date: string;
  icd10_code: string;
  description?: string | null;
  diagnosis_type?: string | null;
  notes?: string | null;
}

interface TreatmentPlanData {
  plan_date: string;
  step: number;
  step_details: string;
  duration?: string | null;
  follow_up_date?: string | null;
  notes?: string | null;
}

interface VisitData {
  visit_date: string;
  status: string;
  chief_complaint: string | null;
  prescriptions: {
    quantity: number;
    usage_instruction: string | null;
    medicine: { name_thai: string; name_english: string | null } | null;
  }[];
}

interface ExportOptions {
  patient: PatientData;
  consultations: ConsultationData[];
  diagnoses: DiagnosisData[];
  treatmentPlans: TreatmentPlanData[];
  visits: VisitData[];
}

function formatDate(date: string) {
  try {
    return format(new Date(date), 'd MMMM yyyy', { locale: th });
  } catch {
    return date;
  }
}

function genderLabel(gender: string) {
  return gender === 'male' ? 'ชาย' : gender === 'female' ? 'หญิง' : 'อื่นๆ';
}

function differenceInYears(d1: Date, d2: Date) {
  let years = d1.getFullYear() - d2.getFullYear();
  const m = d1.getMonth() - d2.getMonth();
  if (m < 0 || (m === 0 && d1.getDate() < d2.getDate())) years--;
  return years;
}

export function exportPatientPdf(options: ExportOptions) {
  const { patient, consultations, diagnoses, treatmentPlans, visits } = options;
  const age = differenceInYears(new Date(), new Date(patient.dob));
  const printDate = format(new Date(), 'd MMMM yyyy HH:mm', { locale: th });

  const html = `<!DOCTYPE html>
<html lang="th">
<head>
  <meta charset="UTF-8">
  <title>เวชระเบียน - ${patient.first_name} ${patient.last_name}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Sarabun', 'Noto Sans Thai', 'TH Sarabun New', sans-serif; font-size: 14px; color: #1a1a1a; padding: 20mm; line-height: 1.6; }
    @page { size: A4; margin: 15mm; }
    .header { text-align: center; border-bottom: 2px solid #333; padding-bottom: 12px; margin-bottom: 20px; }
    .header h1 { font-size: 22px; font-weight: 700; }
    .header p { font-size: 12px; color: #666; margin-top: 4px; }
    .section { margin-bottom: 20px; page-break-inside: avoid; }
    .section-title { font-size: 16px; font-weight: 700; background: #f3f4f6; padding: 6px 12px; border-left: 4px solid #ec4899; margin-bottom: 10px; }
    .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 6px 24px; }
    .info-item { font-size: 13px; }
    .info-label { font-weight: 600; color: #555; }
    .allergy-box { background: #fef2f2; border: 1px solid #fca5a5; padding: 8px 12px; border-radius: 6px; margin-top: 8px; }
    .allergy-box strong { color: #dc2626; }
    table { width: 100%; border-collapse: collapse; font-size: 13px; margin-top: 6px; }
    th, td { border: 1px solid #d1d5db; padding: 6px 10px; text-align: left; }
    th { background: #f9fafb; font-weight: 600; }
    .empty { color: #999; font-style: italic; text-align: center; padding: 12px; }
    .footer { margin-top: 30px; border-top: 1px solid #d1d5db; padding-top: 10px; font-size: 11px; color: #999; text-align: center; }
    @media print { body { padding: 0; } }
  </style>
</head>
<body>
  <div class="header">
    <h1>เวชระเบียนผู้ป่วย</h1>
    <p>วันที่พิมพ์: ${printDate}</p>
  </div>

  <!-- Patient Info -->
  <div class="section">
    <div class="section-title">ข้อมูลผู้ป่วย</div>
    <div class="info-grid">
      <div class="info-item"><span class="info-label">ชื่อ-สกุล:</span> ${patient.first_name} ${patient.last_name}</div>
      <div class="info-item"><span class="info-label">HN:</span> ${patient.hn}</div>
      <div class="info-item"><span class="info-label">วันเกิด:</span> ${formatDate(patient.dob)} (${age} ปี)</div>
      <div class="info-item"><span class="info-label">เพศ:</span> ${genderLabel(patient.gender)}</div>
      ${patient.national_id ? `<div class="info-item"><span class="info-label">เลขบัตรประชาชน:</span> ${patient.national_id}</div>` : ''}
      ${patient.phone ? `<div class="info-item"><span class="info-label">โทรศัพท์:</span> ${patient.phone}</div>` : ''}
      ${patient.address ? `<div class="info-item" style="grid-column:1/3"><span class="info-label">ที่อยู่:</span> ${patient.address}</div>` : ''}
    </div>
    ${patient.allergies && patient.allergies.length > 0 ? `
    <div class="allergy-box">
      <strong>⚠ การแพ้ยา/อาหาร:</strong> ${patient.allergies.join(', ')}
    </div>` : ''}
  </div>

  <!-- Consultations -->
  <div class="section">
    <div class="section-title">บันทึกอาการ (${consultations.length} รายการ)</div>
    ${consultations.length === 0 ? '<p class="empty">ไม่มีบันทึกอาการ</p>' : `
    <table>
      <thead><tr><th style="width:100px">วันที่</th><th>อาการหลัก</th><th>Vital Signs</th><th>หมายเหตุ</th></tr></thead>
      <tbody>
        ${consultations.map(c => {
          const vs = c.vital_signs || {};
          const vsParts: string[] = [];
          if (vs.blood_pressure) vsParts.push(`BP: ${vs.blood_pressure}`);
          if (vs.heart_rate) vsParts.push(`HR: ${vs.heart_rate}`);
          if (vs.temperature) vsParts.push(`T: ${vs.temperature}°C`);
          if (vs.respiratory_rate) vsParts.push(`RR: ${vs.respiratory_rate}`);
          if (vs.weight) vsParts.push(`W: ${vs.weight}kg`);
          return `<tr>
            <td>${formatDate(c.consultation_date)}</td>
            <td>${c.chief_complaint}${c.physical_exam_note ? `<br><small>PE: ${c.physical_exam_note}</small>` : ''}</td>
            <td>${vsParts.join(', ') || '-'}</td>
            <td>${c.notes || '-'}</td>
          </tr>`;
        }).join('')}
      </tbody>
    </table>`}
  </div>

  <!-- Diagnoses -->
  <div class="section">
    <div class="section-title">การวินิจฉัย (${diagnoses.length} รายการ)</div>
    ${diagnoses.length === 0 ? '<p class="empty">ไม่มีการวินิจฉัย</p>' : `
    <table>
      <thead><tr><th style="width:100px">วันที่</th><th>ICD-10</th><th>ประเภท</th><th>คำอธิบาย</th><th>หมายเหตุ</th></tr></thead>
      <tbody>
        ${diagnoses.map(d => `<tr>
          <td>${formatDate(d.diagnosis_date)}</td>
          <td>${d.icd10_code}</td>
          <td>${d.diagnosis_type === 'primary' ? 'หลัก' : 'รอง'}</td>
          <td>${d.description || '-'}</td>
          <td>${d.notes || '-'}</td>
        </tr>`).join('')}
      </tbody>
    </table>`}
  </div>

  <!-- Treatment Plans -->
  <div class="section">
    <div class="section-title">แผนการรักษา (${treatmentPlans.length} รายการ)</div>
    ${treatmentPlans.length === 0 ? '<p class="empty">ไม่มีแผนการรักษา</p>' : `
    <table>
      <thead><tr><th style="width:100px">วันที่</th><th>ขั้นตอน</th><th>รายละเอียด</th><th>ระยะเวลา</th><th>นัดติดตาม</th></tr></thead>
      <tbody>
        ${treatmentPlans.map(p => {
          const stepInfo = getStepInfo(p.step);
          return `<tr>
            <td>${formatDate(p.plan_date)}</td>
            <td>${p.step}. ${stepInfo.name}</td>
            <td>${p.step_details}${p.notes ? `<br><small>${p.notes}</small>` : ''}</td>
            <td>${p.duration || '-'}</td>
            <td>${p.follow_up_date ? formatDate(p.follow_up_date) : '-'}</td>
          </tr>`;
        }).join('')}
      </tbody>
    </table>`}
  </div>

  <!-- Medication History -->
  <div class="section">
    <div class="section-title">ประวัติการรับยา</div>
    ${visits.filter(v => v.prescriptions.length > 0).length === 0 ? '<p class="empty">ไม่มีประวัติการรับยา</p>' : `
    <table>
      <thead><tr><th style="width:100px">วันที่</th><th>ชื่อยา</th><th>จำนวน</th><th>วิธีใช้</th></tr></thead>
      <tbody>
        ${visits.filter(v => v.prescriptions.length > 0).flatMap(v =>
          v.prescriptions.map((p, i) => `<tr>
            ${i === 0 ? `<td rowspan="${v.prescriptions.length}">${formatDate(v.visit_date)}</td>` : ''}
            <td>${p.medicine?.name_thai || '-'}${p.medicine?.name_english ? ` (${p.medicine.name_english})` : ''}</td>
            <td>${p.quantity}</td>
            <td>${p.usage_instruction || '-'}</td>
          </tr>`)
        ).join('')}
      </tbody>
    </table>`}
  </div>

  <div class="footer">
    เอกสารนี้สร้างจากระบบเวชระเบียนอิเล็กทรอนิกส์ &bull; ${printDate}
  </div>
</body>
</html>`;

  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    alert('กรุณาอนุญาตการเปิดหน้าต่างใหม่ (Pop-up) เพื่อพิมพ์เอกสาร');
    return;
  }
  printWindow.document.write(html);
  printWindow.document.close();
  printWindow.onload = () => {
    printWindow.print();
  };
}
