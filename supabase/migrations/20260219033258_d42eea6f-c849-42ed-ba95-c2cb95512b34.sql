
-- Add patient_id and procedure_date columns
ALTER TABLE public.procedure_orders ADD COLUMN patient_id uuid REFERENCES patients(id);
ALTER TABLE public.procedure_orders ADD COLUMN procedure_date date DEFAULT CURRENT_DATE;

-- Backfill from visits
UPDATE public.procedure_orders SET patient_id = v.patient_id, procedure_date = v.visit_date FROM visits v WHERE procedure_orders.visit_id = v.id;

-- Make visit_id nullable
ALTER TABLE public.procedure_orders ALTER COLUMN visit_id DROP NOT NULL;

-- Drop existing RLS policies
DROP POLICY IF EXISTS "Patients can view own procedure_orders" ON public.procedure_orders;
DROP POLICY IF EXISTS "Staff can manage procedure_orders" ON public.procedure_orders;
DROP POLICY IF EXISTS "Staff can view procedure_orders" ON public.procedure_orders;

-- Recreate RLS policies using patient_id
CREATE POLICY "Staff can manage procedure_orders"
ON public.procedure_orders FOR ALL
USING (is_staff(auth.uid()))
WITH CHECK (is_staff(auth.uid()));

CREATE POLICY "Staff can view procedure_orders"
ON public.procedure_orders FOR SELECT
USING (is_staff(auth.uid()));

CREATE POLICY "Patients can view own procedure_orders"
ON public.procedure_orders FOR SELECT
USING (EXISTS (
  SELECT 1 FROM patient_accounts pa
  WHERE pa.user_id = auth.uid() AND pa.patient_id = procedure_orders.patient_id
));
