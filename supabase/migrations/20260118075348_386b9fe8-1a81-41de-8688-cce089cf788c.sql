-- Create patient_consultations table for recording chief complaints
CREATE TABLE public.patient_consultations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  consultation_date DATE NOT NULL DEFAULT CURRENT_DATE,
  chief_complaint TEXT NOT NULL,
  physical_exam_note TEXT,
  vital_signs JSONB DEFAULT '{}'::jsonb,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES profiles(id)
);

-- Enable RLS
ALTER TABLE public.patient_consultations ENABLE ROW LEVEL SECURITY;

-- Staff can manage consultations
CREATE POLICY "Staff can manage patient consultations"
  ON public.patient_consultations FOR ALL
  USING (is_staff(auth.uid()))
  WITH CHECK (is_staff(auth.uid()));

-- Patients can view own consultations
CREATE POLICY "Patients can view own consultations"
  ON public.patient_consultations FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM patient_accounts
    WHERE user_id = auth.uid() AND patient_id = patient_consultations.patient_id
  ));