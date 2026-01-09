import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Heart, ArrowLeft, ArrowRight } from "lucide-react";

type Gender = 'male' | 'female' | 'other';

interface PatientFormData {
  // Account info
  email: string;
  password: string;
  confirmPassword: string;
  // Patient info
  firstName: string;
  lastName: string;
  nationalId: string;
  dob: string;
  gender: Gender;
  phone: string;
  address: string;
  allergies: string;
}

const PatientSignup = () => {
  const navigate = useNavigate();
  const { signUp } = useAuth();
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1); // 1 = patient info, 2 = account info

  const [formData, setFormData] = useState<PatientFormData>({
    email: '',
    password: '',
    confirmPassword: '',
    firstName: '',
    lastName: '',
    nationalId: '',
    dob: '',
    gender: 'other',
    phone: '',
    address: '',
    allergies: ''
  });

  const validateStep1 = () => {
    if (!formData.firstName.trim()) {
      toast.error('กรุณากรอกชื่อ');
      return false;
    }
    if (!formData.lastName.trim()) {
      toast.error('กรุณากรอกนามสกุล');
      return false;
    }
    if (!formData.nationalId.trim() || formData.nationalId.length !== 13) {
      toast.error('กรุณากรอกเลขบัตรประชาชน 13 หลัก');
      return false;
    }
    if (!formData.dob) {
      toast.error('กรุณาเลือกวันเกิด');
      return false;
    }
    if (!formData.phone.trim()) {
      toast.error('กรุณากรอกเบอร์โทรศัพท์');
      return false;
    }
    return true;
  };

  const validateStep2 = () => {
    if (!formData.email.trim()) {
      toast.error('กรุณากรอกอีเมล');
      return false;
    }
    if (formData.password.length < 6) {
      toast.error('รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร');
      return false;
    }
    if (formData.password !== formData.confirmPassword) {
      toast.error('รหัสผ่านไม่ตรงกัน');
      return false;
    }
    return true;
  };

  const handleNextStep = () => {
    if (validateStep1()) {
      setStep(2);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateStep2()) return;
    
    setLoading(true);
    
    try {
      // 1. Create user account
      const { error: signUpError } = await signUp(
        formData.email, 
        formData.password, 
        `${formData.firstName} ${formData.lastName}`
      );
      
      if (signUpError) {
        toast.error('ลงทะเบียนไม่สำเร็จ', { description: signUpError.message });
        setLoading(false);
        return;
      }

      // Wait for auth state to update
      await new Promise(resolve => setTimeout(resolve, 1000));

      // 2. Get the current session
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        toast.error('กรุณาเข้าสู่ระบบเพื่อดำเนินการต่อ');
        navigate('/auth');
        setLoading(false);
        return;
      }

      // 3. Generate HN for patient
      const { data: hnData, error: hnError } = await supabase.rpc('generate_hn');
      if (hnError) throw hnError;

      // 4. Create patient record (using service role via edge function would be ideal,
      // but for now we'll let patients create their own record)
      const allergiesArray = formData.allergies
        ? formData.allergies.split(',').map(a => a.trim()).filter(Boolean)
        : [];

      const { data: patientData, error: patientError } = await supabase
        .from('patients')
        .insert({
          hn: hnData,
          first_name: formData.firstName,
          last_name: formData.lastName,
          national_id: formData.nationalId,
          dob: formData.dob,
          gender: formData.gender,
          phone: formData.phone,
          address: formData.address || null,
          allergies: allergiesArray
        })
        .select()
        .single();

      if (patientError) {
        console.error('Patient creation error:', patientError);
        // Patient record may already exist or RLS issue
        toast.error('ไม่สามารถสร้างข้อมูลผู้ป่วยได้', { 
          description: 'กรุณาติดต่อเจ้าหน้าที่เพื่อลงทะเบียน' 
        });
        setLoading(false);
        return;
      }

      // 5. Link patient account
      const { error: linkError } = await supabase
        .from('patient_accounts')
        .insert({
          user_id: session.user.id,
          patient_id: patientData.id
        });

      if (linkError) {
        console.error('Link error:', linkError);
        toast.error('ไม่สามารถเชื่อมโยงบัญชีได้');
        setLoading(false);
        return;
      }

      toast.success('ลงทะเบียนสำเร็จ!', { 
        description: `หมายเลข HN ของคุณคือ ${hnData}` 
      });
      navigate('/patient');
      
    } catch (error: any) {
      console.error('Signup error:', error);
      toast.error('เกิดข้อผิดพลาด', { description: error.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-pink-50 via-background to-pink-100 p-4">
      <div className="w-full max-w-lg">
        <Button
          variant="ghost"
          onClick={() => step === 1 ? navigate('/auth') : setStep(1)}
          className="mb-4 text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          {step === 1 ? 'กลับ' : 'ย้อนกลับ'}
        </Button>

        <div className="text-center mb-6">
          <div className="flex items-center justify-center gap-3 mb-4">
            <Heart className="h-10 w-10 text-primary" />
          </div>
          <h1 className="text-2xl font-display font-bold text-foreground mb-2">
            ลงทะเบียนผู้ป่วยใหม่
          </h1>
          <p className="text-muted-foreground">
            ขั้นตอนที่ {step} จาก 2
          </p>
          {/* Progress bar */}
          <div className="flex gap-2 mt-4 justify-center">
            <div className={`h-2 w-20 rounded-full ${step >= 1 ? 'bg-primary' : 'bg-muted'}`} />
            <div className={`h-2 w-20 rounded-full ${step >= 2 ? 'bg-primary' : 'bg-muted'}`} />
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>
              {step === 1 ? 'ข้อมูลส่วนตัว' : 'ข้อมูลบัญชี'}
            </CardTitle>
            <CardDescription>
              {step === 1 
                ? 'กรอกข้อมูลส่วนตัวของคุณ' 
                : 'สร้างบัญชีสำหรับเข้าสู่ระบบ'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {step === 1 ? (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="firstName">ชื่อ *</Label>
                    <Input
                      id="firstName"
                      placeholder="ชื่อ"
                      value={formData.firstName}
                      onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lastName">นามสกุล *</Label>
                    <Input
                      id="lastName"
                      placeholder="นามสกุล"
                      value={formData.lastName}
                      onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="nationalId">เลขบัตรประชาชน 13 หลัก *</Label>
                  <Input
                    id="nationalId"
                    placeholder="X-XXXX-XXXXX-XX-X"
                    value={formData.nationalId}
                    onChange={(e) => setFormData({ ...formData, nationalId: e.target.value.replace(/\D/g, '').slice(0, 13) })}
                    maxLength={13}
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="dob">วันเกิด *</Label>
                    <Input
                      id="dob"
                      type="date"
                      value={formData.dob}
                      onChange={(e) => setFormData({ ...formData, dob: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="gender">เพศ *</Label>
                    <Select 
                      value={formData.gender} 
                      onValueChange={(value: Gender) => setFormData({ ...formData, gender: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="เลือกเพศ" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="male">ชาย</SelectItem>
                        <SelectItem value="female">หญิง</SelectItem>
                        <SelectItem value="other">อื่นๆ</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone">เบอร์โทรศัพท์ *</Label>
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="08X-XXX-XXXX"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="address">ที่อยู่</Label>
                  <Textarea
                    id="address"
                    placeholder="ที่อยู่ (ไม่บังคับ)"
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    rows={2}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="allergies">การแพ้ยา/อาหาร</Label>
                  <Input
                    id="allergies"
                    placeholder="คั่นด้วยเครื่องหมายจุลภาค เช่น เพนนิซิลิน, แอสไพริน"
                    value={formData.allergies}
                    onChange={(e) => setFormData({ ...formData, allergies: e.target.value })}
                  />
                </div>

                <Button onClick={handleNextStep} className="w-full">
                  ถัดไป <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">อีเมล *</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="your@email.com"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password">รหัสผ่าน *</Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="อย่างน้อย 6 ตัวอักษร"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">ยืนยันรหัสผ่าน *</Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    placeholder="ยืนยันรหัสผ่าน"
                    value={formData.confirmPassword}
                    onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                    required
                  />
                </div>

                {/* Summary of patient info */}
                <div className="p-4 bg-muted rounded-lg">
                  <p className="text-sm font-medium mb-2">ข้อมูลที่จะลงทะเบียน:</p>
                  <p className="text-sm text-muted-foreground">
                    {formData.firstName} {formData.lastName}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    เลขบัตร: {formData.nationalId}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    โทร: {formData.phone}
                  </p>
                </div>

                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? 'กำลังลงทะเบียน...' : 'ลงทะเบียน'}
                </Button>
              </form>
            )}
          </CardContent>
        </Card>

        <p className="text-center text-sm text-muted-foreground mt-4">
          มีบัญชีอยู่แล้ว?{' '}
          <Button variant="link" className="p-0 h-auto" onClick={() => navigate('/auth')}>
            เข้าสู่ระบบ
          </Button>
        </p>
      </div>
    </div>
  );
};

export default PatientSignup;
