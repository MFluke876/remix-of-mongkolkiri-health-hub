-- First, update all existing roles to 'doctor'
UPDATE public.user_roles SET role = 'doctor' WHERE role != 'doctor';

-- Update has_role function to be simpler (only doctor exists)
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = 'doctor'
  )
$$;

-- Update is_staff function to only check for doctor role
CREATE OR REPLACE FUNCTION public.is_staff(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = 'doctor'
  )
$$;

-- Update RLS policy on user_roles for doctors to manage roles
DROP POLICY IF EXISTS "Admins can manage roles" ON public.user_roles;

CREATE POLICY "Doctors can manage roles" ON public.user_roles
  FOR ALL USING (public.has_role(auth.uid(), 'doctor'));