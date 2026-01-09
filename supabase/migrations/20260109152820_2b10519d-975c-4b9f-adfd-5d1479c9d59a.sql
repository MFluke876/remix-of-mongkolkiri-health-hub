-- Allow patients to insert their own patient record during signup
CREATE POLICY "Patients can insert own patient record"
ON public.patients
FOR INSERT
WITH CHECK (true);

-- Allow patients to update their own patient record
CREATE POLICY "Patients can update own patient record"
ON public.patients
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM patient_accounts pa
    WHERE pa.user_id = auth.uid() AND pa.patient_id = patients.id
  )
);