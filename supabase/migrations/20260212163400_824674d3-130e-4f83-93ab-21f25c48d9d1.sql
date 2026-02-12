
CREATE TABLE public.patient_treatment_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  plan_date date NOT NULL DEFAULT CURRENT_DATE,
  step integer NOT NULL CHECK (step >= 1 AND step <= 5),
  step_details text NOT NULL,
  duration text,
  follow_up_date date,
  notes text,
  created_by uuid REFERENCES public.profiles(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.patient_treatment_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can manage patient_treatment_plans"
  ON public.patient_treatment_plans FOR ALL
  USING (is_staff(auth.uid()))
  WITH CHECK (is_staff(auth.uid()));

CREATE POLICY "Patients can view own treatment_plans"
  ON public.patient_treatment_plans FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.patient_accounts
      WHERE patient_accounts.user_id = auth.uid()
        AND patient_accounts.patient_id = patient_treatment_plans.patient_id
    )
  );

CREATE TRIGGER update_patient_treatment_plans_updated_at
  BEFORE UPDATE ON public.patient_treatment_plans
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
