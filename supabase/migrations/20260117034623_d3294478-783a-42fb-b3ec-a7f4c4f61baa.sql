-- 1. เพิ่ม role doctor ให้กับ user ปัจจุบัน
INSERT INTO user_roles (user_id, role) 
VALUES ('4331a8bc-7de8-408c-926a-a301b2303f52', 'doctor')
ON CONFLICT (user_id, role) DO NOTHING;

-- 2. สร้าง function สำหรับกำหนด role อัตโนมัติ
CREATE OR REPLACE FUNCTION public.handle_new_staff_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'doctor');
  RETURN NEW;
END;
$$;

-- 3. สร้าง trigger บน auth.users
CREATE TRIGGER on_auth_user_created_assign_role
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_staff_user();