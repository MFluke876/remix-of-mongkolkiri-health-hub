import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface PatientTreatmentPlan {
  id: string;
  visit_id: string;
  plan_details: string;
  duration: string | null;
  follow_up_date: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  visit: {
    id: string;
    visit_date: string;
    patient_id: string;
  };
}

export function usePatientTreatmentPlans(patientId: string) {
  return useQuery({
    queryKey: ['patient-treatment-plans', patientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('treatment_plans')
        .select(`
          *,
          visit:visits!inner(id, visit_date, patient_id)
        `)
        .eq('visits.patient_id', patientId)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as PatientTreatmentPlan[];
    },
    enabled: !!patientId,
  });
}
