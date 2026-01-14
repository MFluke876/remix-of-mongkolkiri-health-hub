import { useQuery, useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface VerifiedPatient {
  patient_id: string;
  first_name: string;
  last_name: string;
}

export interface PatientAccount {
  id: string;
  user_id: string;
  patient_id: string;
  created_at: string;
}

export const usePatientAccount = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['patient-account', user?.id],
    queryFn: async () => {
      if (!user) return null;
      
      const { data, error } = await supabase
        .from('patient_accounts')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();
      
      if (error) throw error;
      return data as PatientAccount | null;
    },
    enabled: !!user
  });
};

export const useVerifyPatientForSignup = () => {
  return useMutation({
    mutationFn: async ({ 
      nationalId, 
      dob, 
      phone 
    }: { 
      nationalId: string; 
      dob: string; 
      phone: string;
    }) => {
      const { data, error } = await supabase.rpc('verify_patient_for_signup', {
        p_national_id: nationalId,
        p_dob: dob,
        p_phone: phone
      });

      if (error) throw new Error(error.message);
      
      // Parse the JSON response
      const result = data as unknown as VerifiedPatient;
      return result;
    },
    onError: (error: Error) => {
      toast.error('ไม่สามารถยืนยันตัวตนได้', { description: error.message });
    }
  });
};
