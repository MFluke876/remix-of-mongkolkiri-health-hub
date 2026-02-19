import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface ProcedureOrder {
  id: string;
  patient_id: string | null;
  procedure_date: string | null;
  visit_id: string | null;
  procedure_name: string;
  body_part: string | null;
  notes: string | null;
  status: string | null;
  created_at: string;
}

export interface CreateProcedureOrderInput {
  patient_id: string;
  procedure_date: string;
  procedure_name: string;
  body_part?: string;
  notes?: string;
  status?: string;
}

export const useProcedureOrders = (patientId?: string) => {
  return useQuery({
    queryKey: ['procedure-orders', patientId],
    queryFn: async () => {
      let query = supabase.from('procedure_orders').select('*');
      
      if (patientId) {
        query = query.eq('patient_id', patientId);
      }
      
      const { data, error } = await query.order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as ProcedureOrder[];
    },
    enabled: patientId ? !!patientId : true
  });
};

export const useCreateProcedureOrder = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateProcedureOrderInput) => {
      const { data, error } = await supabase
        .from('procedure_orders')
        .insert({
          patient_id: input.patient_id,
          procedure_date: input.procedure_date,
          procedure_name: input.procedure_name,
          body_part: input.body_part || null,
          notes: input.notes || null,
          status: input.status || 'pending'
        } as any)
        .select()
        .single();

      if (error) throw error;
      return data as ProcedureOrder;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['procedure-orders', variables.patient_id] });
      toast.success('บันทึกหัตถการสำเร็จ');
    },
    onError: (error: Error) => {
      toast.error('เกิดข้อผิดพลาด', { description: error.message });
    }
  });
};

export const useDeleteProcedureOrder = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, patientId }: { id: string; patientId: string }) => {
      const { error } = await supabase
        .from('procedure_orders')
        .delete()
        .eq('id', id);

      if (error) throw error;
      return { id, patientId };
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['procedure-orders', variables.patientId] });
      toast.success('ลบหัตถการสำเร็จ');
    },
    onError: (error: Error) => {
      toast.error('เกิดข้อผิดพลาด', { description: error.message });
    }
  });
};
