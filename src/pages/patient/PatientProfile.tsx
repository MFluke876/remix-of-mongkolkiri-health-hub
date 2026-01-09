import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { usePatientAccount } from "@/hooks/usePatientAccount";
import { usePatient } from "@/hooks/usePatients";
import { supabase } from "@/integrations/supabase/client";
import PatientLayout from "@/components/layout/PatientLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { Edit2, Save, X } from "lucide-react";
import { format } from "date-fns";
import { th } from "date-fns/locale";
import { useQueryClient } from "@tanstack/react-query";

const PatientProfile = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: patientAccount, isLoading: accountLoading } = usePatientAccount();
  const { data: patient, isLoading: patientLoading } = usePatient(patientAccount?.patient_id || "");
  
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    phone: '',
    address: '',
    allergies: ''
  });

  useEffect(() => {
    if (patient) {
      setFormData({
        phone: patient.phone || '',
        address: patient.address || '',
        allergies: Array.isArray(patient.allergies) ? (patient.allergies as string[]).join(', ') : ''
      });
    }
  }, [patient]);

  const isLoading = accountLoading || patientLoading;

  const handleSave = async () => {
    if (!patient?.id) return;
    
    setSaving(true);
    try {
      const allergiesArray = formData.allergies
        ? formData.allergies.split(',').map(a => a.trim()).filter(Boolean)
        : [];

      const { error } = await supabase
        .from('patients')
        .update({
          phone: formData.phone || null,
          address: formData.address || null,
          allergies: allergiesArray
        })
        .eq('id', patient.id);

      if (error) throw error;

      toast.success('บันทึกข้อมูลสำเร็จ');
      setIsEditing(false);
      queryClient.invalidateQueries({ queryKey: ['patient', patient.id] });
    } catch (error: any) {
      toast.error('บันทึกไม่สำเร็จ', { description: error.message });
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    if (patient) {
      setFormData({
        phone: patient.phone || '',
        address: patient.address || '',
        allergies: Array.isArray(patient.allergies) ? (patient.allergies as string[]).join(', ') : ''
      });
    }
    setIsEditing(false);
  };

  if (isLoading) {
    return (
      <PatientLayout title="ข้อมูลส่วนตัว">
        <div className="space-y-6">
          <Skeleton className="h-64 w-full" />
        </div>
      </PatientLayout>
    );
  }

  if (!patient) {
    return (
      <PatientLayout title="ข้อมูลส่วนตัว">
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">ไม่พบข้อมูลผู้ป่วย</p>
          </CardContent>
        </Card>
      </PatientLayout>
    );
  }

  return (
    <PatientLayout title="ข้อมูลส่วนตัว">
      <div className="space-y-6">
        {/* Read-only info */}
        <Card>
          <CardHeader>
            <CardTitle>ข้อมูลพื้นฐาน</CardTitle>
            <CardDescription>ข้อมูลเหล่านี้ไม่สามารถแก้ไขได้ กรุณาติดต่อเจ้าหน้าที่หากต้องการเปลี่ยนแปลง</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <Label className="text-muted-foreground">หมายเลข HN</Label>
                <p className="text-lg font-medium">{patient.hn}</p>
              </div>
              <div>
                <Label className="text-muted-foreground">ชื่อ-นามสกุล</Label>
                <p className="text-lg font-medium">{patient.first_name} {patient.last_name}</p>
              </div>
              <div>
                <Label className="text-muted-foreground">เลขบัตรประชาชน</Label>
                <p className="text-lg font-medium">
                  {patient.national_id 
                    ? `${patient.national_id.slice(0, 1)}-${patient.national_id.slice(1, 5)}-XXXXX-XX-X` 
                    : '-'}
                </p>
              </div>
              <div>
                <Label className="text-muted-foreground">วันเกิด</Label>
                <p className="text-lg font-medium">
                  {format(new Date(patient.dob), "d MMMM yyyy", { locale: th })}
                </p>
              </div>
              <div>
                <Label className="text-muted-foreground">เพศ</Label>
                <p className="text-lg font-medium">
                  {patient.gender === 'male' ? 'ชาย' : patient.gender === 'female' ? 'หญิง' : 'อื่นๆ'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Editable info */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>ข้อมูลติดต่อและการแพ้ยา</CardTitle>
                <CardDescription>คุณสามารถแก้ไขข้อมูลเหล่านี้ได้</CardDescription>
              </div>
              {!isEditing && (
                <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}>
                  <Edit2 className="h-4 w-4 mr-2" />
                  แก้ไข
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="phone">เบอร์โทรศัพท์</Label>
                {isEditing ? (
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="08X-XXX-XXXX"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  />
                ) : (
                  <p className="text-lg">{patient.phone || '-'}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="address">ที่อยู่</Label>
                {isEditing ? (
                  <Textarea
                    id="address"
                    placeholder="ที่อยู่"
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    rows={3}
                  />
                ) : (
                  <p className="text-lg">{patient.address || '-'}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="allergies">การแพ้ยา/อาหาร</Label>
                {isEditing ? (
                  <Input
                    id="allergies"
                    placeholder="คั่นด้วยเครื่องหมายจุลภาค เช่น เพนนิซิลิน, แอสไพริน"
                    value={formData.allergies}
                    onChange={(e) => setFormData({ ...formData, allergies: e.target.value })}
                  />
                ) : (
                  <p className="text-lg">
                    {patient.allergies && (patient.allergies as string[]).length > 0
                      ? (patient.allergies as string[]).join(', ')
                      : 'ไม่มี'}
                  </p>
                )}
              </div>

              {isEditing && (
                <div className="flex gap-2 pt-4">
                  <Button onClick={handleSave} disabled={saving}>
                    <Save className="h-4 w-4 mr-2" />
                    {saving ? 'กำลังบันทึก...' : 'บันทึก'}
                  </Button>
                  <Button variant="outline" onClick={handleCancel} disabled={saving}>
                    <X className="h-4 w-4 mr-2" />
                    ยกเลิก
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </PatientLayout>
  );
};

export default PatientProfile;
