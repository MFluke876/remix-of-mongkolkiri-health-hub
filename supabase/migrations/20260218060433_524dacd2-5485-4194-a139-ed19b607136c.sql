
-- Add patient_id and prescription_date columns
ALTER TABLE public.prescriptions ADD COLUMN patient_id uuid REFERENCES public.patients(id);
ALTER TABLE public.prescriptions ADD COLUMN prescription_date date DEFAULT CURRENT_DATE;

-- Backfill from visits
UPDATE public.prescriptions 
SET patient_id = v.patient_id, prescription_date = v.visit_date 
FROM public.visits v 
WHERE prescriptions.visit_id = v.id;

-- Make visit_id nullable
ALTER TABLE public.prescriptions ALTER COLUMN visit_id DROP NOT NULL;

-- Drop old RLS policies
DROP POLICY IF EXISTS "Patients can view own prescriptions" ON public.prescriptions;
DROP POLICY IF EXISTS "Staff can manage prescriptions" ON public.prescriptions;
DROP POLICY IF EXISTS "Staff can view prescriptions" ON public.prescriptions;

-- Create new RLS policies using patient_id
CREATE POLICY "Staff can manage prescriptions"
ON public.prescriptions
FOR ALL
USING (is_staff(auth.uid()))
WITH CHECK (is_staff(auth.uid()));

CREATE POLICY "Staff can view prescriptions"
ON public.prescriptions
FOR SELECT
USING (is_staff(auth.uid()));

CREATE POLICY "Patients can view own prescriptions"
ON public.prescriptions
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.patient_accounts pa
    WHERE pa.user_id = auth.uid() AND pa.patient_id = prescriptions.patient_id
  )
);
