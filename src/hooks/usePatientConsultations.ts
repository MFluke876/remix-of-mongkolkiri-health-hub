import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

export interface PatientConsultation {
  id: string;
  patient_id: string;
  consultation_date: string;
  chief_complaint: string;
  physical_exam_note: string | null;
  vital_signs: Record<string, string | number> | null;
  notes: string | null;
  created_at: string;
  created_by: string | null;
}

export interface CreatePatientConsultationInput {
  patient_id: string;
  consultation_date: string;
  chief_complaint: string;
  physical_exam_note?: string;
  vital_signs?: Record<string, string | number>;
  notes?: string;
  created_by?: string;
}

export function usePatientConsultations(patientId: string) {
  return useQuery({
    queryKey: ['patient-consultations', patientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('patient_consultations')
        .select('*')
        .eq('patient_id', patientId)
        .order('consultation_date', { ascending: false });
      
      if (error) throw error;
      return data as PatientConsultation[];
    },
    enabled: !!patientId,
  });
}

export function useCreatePatientConsultation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreatePatientConsultationInput) => {
      const { data, error } = await supabase
        .from('patient_consultations')
        .insert(input)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['patient-consultations', data.patient_id] });
      toast({
        title: 'บันทึกอาการสำเร็จ',
        description: 'เพิ่มข้อมูลบันทึกอาการใหม่เรียบร้อยแล้ว',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'เกิดข้อผิดพลาด',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}
