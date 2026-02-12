import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export const TREATMENT_STEPS = [
  { step: 1, name: 'รุ', description: 'ล้างสารพิษ ล้างสารเคมี' },
  { step: 2, name: 'ล้อม', description: 'ลดอาการแทรกของโรค' },
  { step: 3, name: 'แปรไข้', description: 'ปรับสมดุลร่างกาย' },
  { step: 4, name: 'รักษา', description: 'รักษาโรค รักษาธาตุ' },
  { step: 5, name: 'บำรุง', description: 'บำรุงธาตุ บำรุงร่างกายให้แข็งแรง' },
] as const;

export function getStepInfo(step: number) {
  return TREATMENT_STEPS.find(s => s.step === step) || { step, name: 'ไม่ทราบ', description: '' };
}

export interface PatientTreatmentPlanNew {
  id: string;
  patient_id: string;
  plan_date: string;
  step: number;
  step_details: string;
  duration: string | null;
  follow_up_date: string | null;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export function usePatientTreatmentPlansNew(patientId: string) {
  return useQuery({
    queryKey: ['patient-treatment-plans-new', patientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('patient_treatment_plans')
        .select('*')
        .eq('patient_id', patientId)
        .order('plan_date', { ascending: false })
        .order('step', { ascending: true });

      if (error) throw error;
      return data as PatientTreatmentPlanNew[];
    },
    enabled: !!patientId,
  });
}

export function useCreatePatientTreatmentPlan() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (plan: {
      patient_id: string;
      plan_date: string;
      step: number;
      step_details: string;
      duration?: string;
      follow_up_date?: string;
      notes?: string;
      created_by?: string;
    }) => {
      const { data, error } = await supabase
        .from('patient_treatment_plans')
        .insert(plan)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['patient-treatment-plans-new', variables.patient_id] });
    },
  });
}

export function useDeletePatientTreatmentPlan() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, patientId }: { id: string; patientId: string }) => {
      const { error } = await supabase
        .from('patient_treatment_plans')
        .delete()
        .eq('id', id);

      if (error) throw error;
      return { patientId };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['patient-treatment-plans-new', data.patientId] });
    },
  });
}
