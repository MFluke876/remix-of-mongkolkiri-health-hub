import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface Prescription {
  id: string;
  patient_id: string | null;
  prescription_date: string | null;
  visit_id: string | null;
  medicine_id: string;
  quantity: number;
  usage_instruction: string | null;
  created_at: string;
  medicine?: {
    id: string;
    name_thai: string;
    name_english: string | null;
    unit: string | null;
  };
}

export interface CreatePrescriptionInput {
  patient_id: string;
  prescription_date: string;
  medicine_id: string;
  quantity: number;
  usage_instruction?: string;
}

export const usePrescriptions = (patientId?: string) => {
  return useQuery({
    queryKey: ['prescriptions', patientId],
    queryFn: async () => {
      let query = supabase
        .from('prescriptions')
        .select(`
          *,
          medicine:medicines(id, name_thai, name_english, unit)
        `);
      
      if (patientId) {
        query = query.eq('patient_id', patientId);
      }
      
      const { data, error } = await query.order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as Prescription[];
    },
    enabled: patientId ? !!patientId : true
  });
};

export const useCreatePrescription = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreatePrescriptionInput) => {
      const { data, error } = await supabase
        .from('prescriptions')
        .insert({
          patient_id: input.patient_id,
          prescription_date: input.prescription_date,
          medicine_id: input.medicine_id,
          quantity: input.quantity,
          usage_instruction: input.usage_instruction || null
        } as any)
        .select()
        .single();

      if (error) throw error;
      return data as Prescription;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['prescriptions', variables.patient_id] });
      queryClient.invalidateQueries({ queryKey: ['patient-detail'] });
      queryClient.invalidateQueries({ queryKey: ['patient-medications'] });
      toast.success('บันทึกคำสั่งยาสำเร็จ');
    },
    onError: (error: Error) => {
      toast.error('เกิดข้อผิดพลาด', { description: error.message });
    }
  });
};

export const useDeletePrescription = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, patientId }: { id: string; patientId: string }) => {
      const { error } = await supabase
        .from('prescriptions')
        .delete()
        .eq('id', id);

      if (error) throw error;
      return { id, patientId };
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['prescriptions', variables.patientId] });
      queryClient.invalidateQueries({ queryKey: ['patient-detail'] });
      queryClient.invalidateQueries({ queryKey: ['patient-medications'] });
      toast.success('ลบคำสั่งยาสำเร็จ');
    },
    onError: (error: Error) => {
      toast.error('เกิดข้อผิดพลาด', { description: error.message });
    }
  });
};
