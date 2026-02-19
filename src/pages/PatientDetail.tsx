import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  ArrowLeft, 
  User, 
  Calendar, 
  Phone, 
  MapPin, 
  CreditCard, 
  AlertTriangle,
  Stethoscope,
  Pill,
  Plus,
  FileText,
  Download
} from 'lucide-react';
import { differenceInYears, format } from 'date-fns';
import { th } from 'date-fns/locale';
import { usePatientDiagnoses, useCreatePatientDiagnosis } from '@/hooks/usePatientDiagnoses';
import { usePatientConsultations, useCreatePatientConsultation } from '@/hooks/usePatientConsultations';
import { usePatientTreatmentPlansNew, useCreatePatientTreatmentPlan, TREATMENT_STEPS, getStepInfo } from '@/hooks/usePatientTreatmentPlansNew';
import { useMedicines } from '@/hooks/useMedicines';
import { useCreatePrescription, useDeletePrescription } from '@/hooks/usePrescriptions';
import { useProcedureOrders, useCreateProcedureOrder, useDeleteProcedureOrder } from '@/hooks/useProcedureOrders';
import { useAuth } from '@/contexts/AuthContext';
import { HeartPulse, Trash2, Scissors } from 'lucide-react';
import { exportPatientPdf } from '@/utils/exportPatientPdf';

interface PatientInfo {
  id: string;
  hn: string;
  first_name: string;
  last_name: string;
  dob: string;
  gender: string;
  national_id: string | null;
  phone: string | null;
  address: string | null;
  allergies: string[];
  created_at: string;
}

interface PrescriptionRecord {
  id: string;
  prescription_date: string | null;
  quantity: number;
  usage_instruction: string | null;
  medicine: {
    name_thai: string;
    name_english: string | null;
  } | null;
}

const PatientDetail = () => {
  const { patientId } = useParams<{ patientId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  // Dialog state
  const [diagnosisDialogOpen, setDiagnosisDialogOpen] = useState(false);
  const [consultationDialogOpen, setConsultationDialogOpen] = useState(false);
  const [prescriptionDialogOpen, setPrescriptionDialogOpen] = useState(false);
  const [newPrescription, setNewPrescription] = useState({
    prescription_date: format(new Date(), 'yyyy-MM-dd'),
    medicine_id: '',
    quantity: 1,
    usage_instruction: ''
  });
  const [procedureDialogOpen, setProcedureDialogOpen] = useState(false);
  const [newProcedure, setNewProcedure] = useState({
    procedure_date: format(new Date(), 'yyyy-MM-dd'),
    procedure_name: '',
    body_part: '',
    notes: '',
    status: 'completed'
  });
  const [treatmentPlanDialogOpen, setTreatmentPlanDialogOpen] = useState(false);
  const [newTreatmentPlan, setNewTreatmentPlan] = useState({
    plan_date: format(new Date(), 'yyyy-MM-dd'),
    step: 1,
    step_details: '',
    duration: '',
    follow_up_date: '',
    notes: ''
  });
  const [newDiagnosis, setNewDiagnosis] = useState({
    diagnosis_date: format(new Date(), 'yyyy-MM-dd'),
    icd10_code: '',
    description: '',
    diagnosis_type: 'primary',
    notes: ''
  });
  const [newConsultation, setNewConsultation] = useState({
    consultation_date: format(new Date(), 'yyyy-MM-dd'),
    chief_complaint: '',
    physical_exam_note: '',
    vital_signs: {
      blood_pressure: '',
      heart_rate: '',
      temperature: '',
      respiratory_rate: '',
      weight: '',
      height: ''
    },
    notes: ''
  });

  const { data: patient, isLoading } = useQuery({
    queryKey: ['patient-detail', patientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('patients')
        .select('*')
        .eq('id', patientId)
        .single();

      if (error) throw error;
      return data as PatientInfo;
    },
    enabled: !!patientId
  });

  // Fetch prescriptions directly by patient_id
  const { data: patientPrescriptions = [], isLoading: prescriptionsLoading } = useQuery({
    queryKey: ['prescriptions', patientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('prescriptions')
        .select('id, prescription_date, quantity, usage_instruction, medicine:medicines(name_thai, name_english)')
        .eq('patient_id', patientId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as unknown as PrescriptionRecord[];
    },
    enabled: !!patientId
  });

  // Fetch patient diagnoses from new standalone table
  const { data: patientDiagnoses = [], isLoading: diagnosesLoading } = usePatientDiagnoses(patientId || '');
  const createDiagnosis = useCreatePatientDiagnosis();

  // Fetch patient consultations
  const { data: patientConsultations = [], isLoading: consultationsLoading } = usePatientConsultations(patientId || '');
  const createConsultation = useCreatePatientConsultation();

  // Medicines & prescriptions
  const { data: medicines = [] } = useMedicines();
  const createPrescription = useCreatePrescription();
  const deletePrescription = useDeletePrescription();

  // Fetch patient treatment plans (new table)
  const { data: patientTreatmentPlans = [], isLoading: treatmentPlansLoading } = usePatientTreatmentPlansNew(patientId || '');
  const createTreatmentPlan = useCreatePatientTreatmentPlan();

  // Fetch procedure orders
  const { data: procedureOrders = [], isLoading: proceduresLoading } = useProcedureOrders(patientId);
  const createProcedure = useCreateProcedureOrder();
  const deleteProcedure = useDeleteProcedureOrder();

  const handleAddDiagnosis = async () => {
    if (!patientId || !newDiagnosis.icd10_code.trim()) return;
    
    await createDiagnosis.mutateAsync({
      patient_id: patientId,
      diagnosis_date: newDiagnosis.diagnosis_date,
      icd10_code: newDiagnosis.icd10_code.trim(),
      description: newDiagnosis.description.trim() || undefined,
      diagnosis_type: newDiagnosis.diagnosis_type,
      notes: newDiagnosis.notes.trim() || undefined,
      created_by: user?.id
    });
    
    // Reset form and close dialog
    setNewDiagnosis({
      diagnosis_date: format(new Date(), 'yyyy-MM-dd'),
      icd10_code: '',
      description: '',
      diagnosis_type: 'primary',
      notes: ''
    });
    setDiagnosisDialogOpen(false);
  };

  const handleAddConsultation = async () => {
    if (!patientId || !newConsultation.chief_complaint.trim()) return;
    
    // Filter out empty vital signs
    const filteredVitalSigns: Record<string, string | number> = {};
    Object.entries(newConsultation.vital_signs).forEach(([key, value]) => {
      if (value && String(value).trim()) {
        filteredVitalSigns[key] = String(value).trim();
      }
    });

    await createConsultation.mutateAsync({
      patient_id: patientId,
      consultation_date: newConsultation.consultation_date,
      chief_complaint: newConsultation.chief_complaint.trim(),
      physical_exam_note: newConsultation.physical_exam_note.trim() || undefined,
      vital_signs: Object.keys(filteredVitalSigns).length > 0 ? filteredVitalSigns : undefined,
      notes: newConsultation.notes.trim() || undefined,
      created_by: user?.id
    });
    
    // Reset form and close dialog
    setNewConsultation({
      consultation_date: format(new Date(), 'yyyy-MM-dd'),
      chief_complaint: '',
      physical_exam_note: '',
      vital_signs: {
        blood_pressure: '',
        heart_rate: '',
        temperature: '',
        respiratory_rate: '',
        weight: '',
        height: ''
      },
      notes: ''
    });
    setConsultationDialogOpen(false);
  };

  const handleAddTreatmentPlan = async () => {
    if (!patientId || !newTreatmentPlan.step_details.trim()) return;
    
    await createTreatmentPlan.mutateAsync({
      patient_id: patientId,
      plan_date: newTreatmentPlan.plan_date,
      step: newTreatmentPlan.step,
      step_details: newTreatmentPlan.step_details.trim(),
      duration: newTreatmentPlan.duration.trim() || undefined,
      follow_up_date: newTreatmentPlan.follow_up_date || undefined,
      notes: newTreatmentPlan.notes.trim() || undefined,
      created_by: user?.id
    });
    
    setNewTreatmentPlan({
      plan_date: format(new Date(), 'yyyy-MM-dd'),
      step: 1,
      step_details: '',
      duration: '',
      follow_up_date: '',
      notes: ''
    });
    setTreatmentPlanDialogOpen(false);
  };

  const handleAddPrescription = async () => {
    if (!patientId || !newPrescription.medicine_id || newPrescription.quantity < 1) return;
    
    await createPrescription.mutateAsync({
      patient_id: patientId,
      prescription_date: newPrescription.prescription_date,
      medicine_id: newPrescription.medicine_id,
      quantity: newPrescription.quantity,
      usage_instruction: newPrescription.usage_instruction.trim() || undefined
    });
    
    setNewPrescription({ prescription_date: format(new Date(), 'yyyy-MM-dd'), medicine_id: '', quantity: 1, usage_instruction: '' });
    setPrescriptionDialogOpen(false);
  };

  const handleDeletePrescription = async (prescriptionId: string) => {
    if (!patientId) return;
    await deletePrescription.mutateAsync({ id: prescriptionId, patientId });
  };

  const handleAddProcedure = async () => {
    if (!patientId || !newProcedure.procedure_name.trim()) return;
    
    await createProcedure.mutateAsync({
      patient_id: patientId,
      procedure_date: newProcedure.procedure_date,
      procedure_name: newProcedure.procedure_name.trim(),
      body_part: newProcedure.body_part.trim() || undefined,
      notes: newProcedure.notes.trim() || undefined,
      status: newProcedure.status
    });
    
    setNewProcedure({
      procedure_date: format(new Date(), 'yyyy-MM-dd'),
      procedure_name: '',
      body_part: '',
      notes: '',
      status: 'completed'
    });
    setProcedureDialogOpen(false);
  };

  const handleDeleteProcedure = async (procedureId: string) => {
    if (!patientId) return;
    await deleteProcedure.mutateAsync({ id: procedureId, patientId });
  };

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="space-y-6">
          <Skeleton className="h-10 w-32" />
          <Skeleton className="h-48 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      </DashboardLayout>
    );
  }

  if (!patient) {
    return (
      <DashboardLayout>
        <div className="text-center py-12">
          <p className="text-muted-foreground">ไม่พบข้อมูลผู้ป่วย</p>
          <Button variant="link" onClick={() => navigate('/patients')}>
            กลับหน้ารายชื่อผู้ป่วย
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  const age = differenceInYears(new Date(), new Date(patient.dob));
  const hasAllergies = patient.allergies && patient.allergies.length > 0;
  const genderLabel = patient.gender === 'male' ? 'ชาย' : patient.gender === 'female' ? 'หญิง' : 'อื่นๆ';

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex items-center justify-between">
          <Button variant="ghost" onClick={() => navigate('/patients')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            กลับ
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="gap-2"
            onClick={() => exportPatientPdf({
              patient: {
                ...patient,
                allergies: patient.allergies || [],
              },
              consultations: patientConsultations,
              diagnoses: patientDiagnoses,
              treatmentPlans: patientTreatmentPlans,
              prescriptions: patientPrescriptions,
            })}
          >
            <Download className="h-4 w-4" />
            ส่งออก PDF
          </Button>
        </div>

        {/* Patient Info Card */}
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                <User className="h-6 w-6 text-primary" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xl font-display">
                    {patient.first_name} {patient.last_name}
                  </span>
                  {hasAllergies && (
                    <Badge variant="destructive" className="gap-1">
                      <AlertTriangle className="w-3 h-3" />
                      แพ้ยา
                    </Badge>
                  )}
                </div>
                <p className="text-sm text-muted-foreground font-normal">
                  HN: {patient.hn}
                </p>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">วันเกิด:</span>
                  <span>{format(new Date(patient.dob), 'd MMMM yyyy', { locale: th })} ({age} ปี)</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">เพศ:</span>
                  <span>{genderLabel}</span>
                </div>
                {patient.national_id && (
                  <div className="flex items-center gap-2 text-sm">
                    <CreditCard className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">เลขบัตรประชาชน:</span>
                    <span>{patient.national_id}</span>
                  </div>
                )}
              </div>
              <div className="space-y-3">
                {patient.phone && (
                  <div className="flex items-center gap-2 text-sm">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">โทรศัพท์:</span>
                    <span>{patient.phone}</span>
                  </div>
                )}
                {patient.address && (
                  <div className="flex items-start gap-2 text-sm">
                    <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                    <span className="text-muted-foreground">ที่อยู่:</span>
                    <span>{patient.address}</span>
                  </div>
                )}
              </div>
              <div className="space-y-3">
                {hasAllergies && (
                  <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20">
                    <div className="flex items-center gap-2 text-sm font-medium text-destructive mb-1">
                      <AlertTriangle className="h-4 w-4" />
                      การแพ้ยา/อาหาร
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {patient.allergies.map((allergy, i) => (
                        <Badge key={i} variant="destructive" className="text-xs">
                          {allergy}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tabs for Medical History */}
        <Tabs defaultValue="consultations" className="space-y-4">
          <TabsList className="grid grid-cols-5 w-full max-w-3xl">
            <TabsTrigger value="consultations" className="gap-1">
              <FileText className="h-4 w-4" />
              บันทึกอาการ
            </TabsTrigger>
            <TabsTrigger value="diagnoses" className="gap-1">
              <Stethoscope className="h-4 w-4" />
              การวินิจฉัย
            </TabsTrigger>
            <TabsTrigger value="treatment-plans" className="gap-1">
              <HeartPulse className="h-4 w-4" />
              แผนการรักษา
            </TabsTrigger>
            <TabsTrigger value="procedures" className="gap-1">
              <Scissors className="h-4 w-4" />
              หัตถการ
            </TabsTrigger>
            <TabsTrigger value="medications" className="gap-1">
              <Pill className="h-4 w-4" />
              ประวัติยา
            </TabsTrigger>
          </TabsList>

          {/* Consultation History - Chief Complaint Tab */}
          <TabsContent value="consultations">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-lg">บันทึกอาการ ({patientConsultations.length} รายการ)</CardTitle>
                <Button onClick={() => setConsultationDialogOpen(true)} size="sm" className="gap-1">
                  <Plus className="h-4 w-4" />
                  เพิ่มบันทึกอาการ
                </Button>
              </CardHeader>
              <CardContent>
                {consultationsLoading ? (
                  <div className="space-y-3">
                    <Skeleton className="h-20 w-full" />
                    <Skeleton className="h-20 w-full" />
                  </div>
                ) : patientConsultations.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">ยังไม่มีบันทึกอาการ</p>
                ) : (
                  <div className="space-y-3">
                    {patientConsultations.map((consultation) => (
                      <div key={consultation.id} className="p-4 rounded-lg border bg-card">
                        <div className="flex items-center justify-between mb-2">
                          <Badge variant="outline">
                            {format(new Date(consultation.consultation_date), 'd MMM yyyy', { locale: th })}
                          </Badge>
                        </div>
                        <div className="space-y-2">
                          <div>
                            <span className="text-sm font-medium text-muted-foreground">อาการหลัก: </span>
                            <span className="text-sm">{consultation.chief_complaint}</span>
                          </div>
                          {consultation.vital_signs && Object.keys(consultation.vital_signs).length > 0 && (
                            <div className="flex flex-wrap gap-2">
                              {consultation.vital_signs.blood_pressure && (
                                <Badge variant="secondary" className="text-xs">BP: {String(consultation.vital_signs.blood_pressure)}</Badge>
                              )}
                              {consultation.vital_signs.heart_rate && (
                                <Badge variant="secondary" className="text-xs">HR: {String(consultation.vital_signs.heart_rate)}</Badge>
                              )}
                              {consultation.vital_signs.temperature && (
                                <Badge variant="secondary" className="text-xs">Temp: {String(consultation.vital_signs.temperature)}°C</Badge>
                              )}
                              {consultation.vital_signs.respiratory_rate && (
                                <Badge variant="secondary" className="text-xs">RR: {String(consultation.vital_signs.respiratory_rate)}</Badge>
                              )}
                              {consultation.vital_signs.weight && (
                                <Badge variant="secondary" className="text-xs">น้ำหนัก: {String(consultation.vital_signs.weight)} kg</Badge>
                              )}
                            </div>
                          )}
                          {consultation.physical_exam_note && (
                            <div>
                              <span className="text-sm font-medium text-muted-foreground">ตรวจร่างกาย: </span>
                              <span className="text-sm">{consultation.physical_exam_note}</span>
                            </div>
                          )}
                          {consultation.notes && (
                            <div>
                              <span className="text-sm font-medium text-muted-foreground">หมายเหตุ: </span>
                              <span className="text-sm text-muted-foreground">{consultation.notes}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Diagnosis History */}
          <TabsContent value="diagnoses">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-lg">ประวัติการวินิจฉัย ({patientDiagnoses.length} รายการ)</CardTitle>
                <Button onClick={() => setDiagnosisDialogOpen(true)} size="sm" className="gap-1">
                  <Plus className="h-4 w-4" />
                  เพิ่มการวินิจฉัย
                </Button>
              </CardHeader>
              <CardContent>
                {diagnosesLoading ? (
                  <div className="space-y-3">
                    <Skeleton className="h-20 w-full" />
                    <Skeleton className="h-20 w-full" />
                  </div>
                ) : patientDiagnoses.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">ยังไม่มีประวัติการวินิจฉัย</p>
                ) : (
                  <div className="space-y-3">
                    {patientDiagnoses.map((diagnosis) => (
                      <div key={diagnosis.id} className="p-4 rounded-lg border bg-card">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <Badge className="font-mono">{diagnosis.icd10_code}</Badge>
                            <Badge variant={diagnosis.diagnosis_type === 'primary' ? 'default' : 'secondary'}>
                              {diagnosis.diagnosis_type === 'primary' ? 'หลัก' : 'รอง'}
                            </Badge>
                          </div>
                          <span className="text-xs text-muted-foreground">
                            {format(new Date(diagnosis.diagnosis_date), 'd MMM yyyy', { locale: th })}
                          </span>
                        </div>
                        {diagnosis.description && (
                          <p className="text-sm">{diagnosis.description}</p>
                        )}
                        {diagnosis.notes && (
                          <p className="text-sm text-muted-foreground mt-1">{diagnosis.notes}</p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Treatment Plans Tab */}
          <TabsContent value="treatment-plans">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-lg">แผนการรักษา ({patientTreatmentPlans.length} รายการ)</CardTitle>
                <Button onClick={() => setTreatmentPlanDialogOpen(true)} size="sm" className="gap-1">
                  <Plus className="h-4 w-4" />
                  เพิ่มแผนการรักษา
                </Button>
              </CardHeader>
              <CardContent>
                {treatmentPlansLoading ? (
                  <div className="space-y-3">
                    <Skeleton className="h-20 w-full" />
                    <Skeleton className="h-20 w-full" />
                  </div>
                ) : patientTreatmentPlans.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">ยังไม่มีแผนการรักษา</p>
                ) : (
                  <div className="space-y-3">
                    {patientTreatmentPlans.map((plan) => {
                      const stepInfo = getStepInfo(plan.step);
                      return (
                        <div key={plan.id} className="p-4 rounded-lg border bg-card">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <Badge variant="default">ขั้นตอนที่ {plan.step}: {stepInfo.name}</Badge>
                              <span className="text-xs text-muted-foreground">{stepInfo.description}</span>
                            </div>
                            <Badge variant="outline">
                              {format(new Date(plan.plan_date), 'd MMM yyyy', { locale: th })}
                            </Badge>
                          </div>
                          <p className="text-sm mb-2">{plan.step_details}</p>
                          <div className="flex flex-wrap gap-4 text-sm">
                            {plan.duration && (
                              <div>
                                <span className="text-muted-foreground">ระยะเวลา: </span>
                                <span className="font-medium">{plan.duration}</span>
                              </div>
                            )}
                            {plan.follow_up_date && (
                              <div>
                                <span className="text-muted-foreground">นัดติดตาม: </span>
                                <span className="font-medium">
                                  {format(new Date(plan.follow_up_date), 'd MMM yyyy', { locale: th })}
                                </span>
                              </div>
                            )}
                          </div>
                          {plan.notes && (
                            <p className="text-sm text-muted-foreground mt-1">หมายเหตุ: {plan.notes}</p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Procedure Orders Tab */}
          <TabsContent value="procedures">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-lg">บันทึกหัตถการ ({procedureOrders.length} รายการ)</CardTitle>
                <Button onClick={() => setProcedureDialogOpen(true)} size="sm" className="gap-1">
                  <Plus className="h-4 w-4" />
                  เพิ่มหัตถการ
                </Button>
              </CardHeader>
              <CardContent>
                {proceduresLoading ? (
                  <div className="space-y-3">
                    <Skeleton className="h-20 w-full" />
                    <Skeleton className="h-20 w-full" />
                  </div>
                ) : procedureOrders.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">ยังไม่มีบันทึกหัตถการ</p>
                ) : (
                  <div className="space-y-3">
                    {procedureOrders.map((proc) => (
                      <div key={proc.id} className="p-3 rounded-lg border bg-card flex items-center justify-between">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{proc.procedure_name}</span>
                            <Badge variant={proc.status === 'completed' ? 'default' : proc.status === 'cancelled' ? 'destructive' : 'secondary'}>
                              {proc.status === 'completed' ? 'เสร็จสิ้น' : proc.status === 'cancelled' ? 'ยกเลิก' : 'รอดำเนินการ'}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-3 text-sm text-muted-foreground">
                            {proc.procedure_date && (
                              <span>{format(new Date(proc.procedure_date), 'd MMM yyyy', { locale: th })}</span>
                            )}
                            {proc.body_part && <span>บริเวณ: {proc.body_part}</span>}
                          </div>
                          {proc.notes && (
                            <p className="text-sm text-muted-foreground">หมายเหตุ: {proc.notes}</p>
                          )}
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive"
                          onClick={() => handleDeleteProcedure(proc.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Medication History */}
          <TabsContent value="medications">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-lg">ประวัติการรับยา ({patientPrescriptions.length} รายการ)</CardTitle>
                <Button onClick={() => setPrescriptionDialogOpen(true)} size="sm" className="gap-1">
                  <Plus className="h-4 w-4" />
                  เพิ่มคำสั่งยา
                </Button>
              </CardHeader>
              <CardContent>
                {prescriptionsLoading ? (
                  <div className="space-y-3">
                    <Skeleton className="h-20 w-full" />
                    <Skeleton className="h-20 w-full" />
                  </div>
                ) : patientPrescriptions.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">ยังไม่มีประวัติการรับยา</p>
                ) : (
                  <div className="space-y-3">
                    {patientPrescriptions.map((p) => (
                      <div key={p.id} className="p-3 rounded-lg border bg-card flex items-center justify-between">
                        <div>
                          <span className="font-medium">{p.medicine?.name_thai || 'ไม่ระบุ'}</span>
                          {p.medicine?.name_english && (
                            <span className="text-muted-foreground text-sm ml-2">({p.medicine.name_english})</span>
                          )}
                          {p.prescription_date && (
                            <span className="text-muted-foreground text-xs ml-2">
                              {format(new Date(p.prescription_date), 'd MMM yyyy', { locale: th })}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-sm text-muted-foreground">
                            {p.quantity} {p.usage_instruction && `- ${p.usage_instruction}`}
                          </span>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive hover:text-destructive"
                            onClick={() => handleDeletePrescription(p.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Add Diagnosis Dialog */}
        <Dialog open={diagnosisDialogOpen} onOpenChange={setDiagnosisDialogOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>เพิ่มการวินิจฉัยใหม่</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="diagnosis_date">วันที่วินิจฉัย</Label>
                <Input
                  id="diagnosis_date"
                  type="date"
                  value={newDiagnosis.diagnosis_date}
                  onChange={(e) => setNewDiagnosis(prev => ({ ...prev, diagnosis_date: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="icd10_code">รหัส ICD-10 *</Label>
                <Input
                  id="icd10_code"
                  placeholder="เช่น J06.9"
                  value={newDiagnosis.icd10_code}
                  onChange={(e) => setNewDiagnosis(prev => ({ ...prev, icd10_code: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">คำอธิบาย</Label>
                <Input
                  id="description"
                  placeholder="เช่น Upper respiratory infection"
                  value={newDiagnosis.description}
                  onChange={(e) => setNewDiagnosis(prev => ({ ...prev, description: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="diagnosis_type">ประเภท</Label>
                <Select
                  value={newDiagnosis.diagnosis_type}
                  onValueChange={(value) => setNewDiagnosis(prev => ({ ...prev, diagnosis_type: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="primary">หลัก (Primary)</SelectItem>
                    <SelectItem value="secondary">รอง (Secondary)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="notes">หมายเหตุ</Label>
                <Textarea
                  id="notes"
                  placeholder="หมายเหตุเพิ่มเติม..."
                  value={newDiagnosis.notes}
                  onChange={(e) => setNewDiagnosis(prev => ({ ...prev, notes: e.target.value }))}
                  rows={3}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDiagnosisDialogOpen(false)}>
                ยกเลิก
              </Button>
              <Button 
                onClick={handleAddDiagnosis} 
                disabled={!newDiagnosis.icd10_code.trim() || createDiagnosis.isPending}
              >
                {createDiagnosis.isPending ? 'กำลังบันทึก...' : 'บันทึก'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Add Consultation Dialog */}
        <Dialog open={consultationDialogOpen} onOpenChange={setConsultationDialogOpen}>
          <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>เพิ่มบันทึกอาการใหม่</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="consultation_date">วันที่ตรวจ</Label>
                <Input
                  id="consultation_date"
                  type="date"
                  value={newConsultation.consultation_date}
                  onChange={(e) => setNewConsultation(prev => ({ ...prev, consultation_date: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="chief_complaint">อาการหลัก (Chief Complaint) *</Label>
                <Textarea
                  id="chief_complaint"
                  placeholder="เช่น ปวดหัว เวียนศีรษะ 3 วัน"
                  value={newConsultation.chief_complaint}
                  onChange={(e) => setNewConsultation(prev => ({ ...prev, chief_complaint: e.target.value }))}
                  rows={2}
                />
              </div>
              
              {/* Vital Signs */}
              <div className="space-y-3">
                <Label className="text-sm font-medium">Vital Signs</Label>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label htmlFor="blood_pressure" className="text-xs text-muted-foreground">ความดันโลหิต (BP)</Label>
                    <Input
                      id="blood_pressure"
                      placeholder="เช่น 120/80"
                      value={newConsultation.vital_signs.blood_pressure}
                      onChange={(e) => setNewConsultation(prev => ({ 
                        ...prev, 
                        vital_signs: { ...prev.vital_signs, blood_pressure: e.target.value }
                      }))}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="heart_rate" className="text-xs text-muted-foreground">ชีพจร (HR)</Label>
                    <Input
                      id="heart_rate"
                      placeholder="เช่น 80"
                      value={newConsultation.vital_signs.heart_rate}
                      onChange={(e) => setNewConsultation(prev => ({ 
                        ...prev, 
                        vital_signs: { ...prev.vital_signs, heart_rate: e.target.value }
                      }))}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="temperature" className="text-xs text-muted-foreground">อุณหภูมิ (°C)</Label>
                    <Input
                      id="temperature"
                      placeholder="เช่น 36.5"
                      value={newConsultation.vital_signs.temperature}
                      onChange={(e) => setNewConsultation(prev => ({ 
                        ...prev, 
                        vital_signs: { ...prev.vital_signs, temperature: e.target.value }
                      }))}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="respiratory_rate" className="text-xs text-muted-foreground">อัตราหายใจ (RR)</Label>
                    <Input
                      id="respiratory_rate"
                      placeholder="เช่น 18"
                      value={newConsultation.vital_signs.respiratory_rate}
                      onChange={(e) => setNewConsultation(prev => ({ 
                        ...prev, 
                        vital_signs: { ...prev.vital_signs, respiratory_rate: e.target.value }
                      }))}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="weight" className="text-xs text-muted-foreground">น้ำหนัก (kg)</Label>
                    <Input
                      id="weight"
                      placeholder="เช่น 65"
                      value={newConsultation.vital_signs.weight}
                      onChange={(e) => setNewConsultation(prev => ({ 
                        ...prev, 
                        vital_signs: { ...prev.vital_signs, weight: e.target.value }
                      }))}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="height" className="text-xs text-muted-foreground">ส่วนสูง (cm)</Label>
                    <Input
                      id="height"
                      placeholder="เช่น 170"
                      value={newConsultation.vital_signs.height}
                      onChange={(e) => setNewConsultation(prev => ({ 
                        ...prev, 
                        vital_signs: { ...prev.vital_signs, height: e.target.value }
                      }))}
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="physical_exam_note">บันทึกการตรวจร่างกาย</Label>
                <Textarea
                  id="physical_exam_note"
                  placeholder="ผลการตรวจร่างกาย..."
                  value={newConsultation.physical_exam_note}
                  onChange={(e) => setNewConsultation(prev => ({ ...prev, physical_exam_note: e.target.value }))}
                  rows={2}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="consultation_notes">หมายเหตุ</Label>
                <Textarea
                  id="consultation_notes"
                  placeholder="หมายเหตุเพิ่มเติม..."
                  value={newConsultation.notes}
                  onChange={(e) => setNewConsultation(prev => ({ ...prev, notes: e.target.value }))}
                  rows={2}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setConsultationDialogOpen(false)}>
                ยกเลิก
              </Button>
              <Button 
                onClick={handleAddConsultation} 
                disabled={!newConsultation.chief_complaint.trim() || createConsultation.isPending}
              >
                {createConsultation.isPending ? 'กำลังบันทึก...' : 'บันทึก'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Add Treatment Plan Dialog */}
        <Dialog open={treatmentPlanDialogOpen} onOpenChange={setTreatmentPlanDialogOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>เพิ่มแผนการรักษาใหม่</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="plan_date">วันที่วางแผน</Label>
                <Input
                  id="plan_date"
                  type="date"
                  value={newTreatmentPlan.plan_date}
                  onChange={(e) => setNewTreatmentPlan(prev => ({ ...prev, plan_date: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="step">ขั้นตอนการรักษา *</Label>
                <Select
                  value={String(newTreatmentPlan.step)}
                  onValueChange={(value) => setNewTreatmentPlan(prev => ({ ...prev, step: Number(value) }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TREATMENT_STEPS.map((s) => (
                      <SelectItem key={s.step} value={String(s.step)}>
                        {s.step}. {s.name} - {s.description}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="step_details">รายละเอียดขั้นตอน *</Label>
                <Textarea
                  id="step_details"
                  placeholder="รายละเอียดของขั้นตอนการรักษา..."
                  value={newTreatmentPlan.step_details}
                  onChange={(e) => setNewTreatmentPlan(prev => ({ ...prev, step_details: e.target.value }))}
                  rows={3}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="duration">ระยะเวลา</Label>
                <Input
                  id="duration"
                  placeholder="เช่น 7 วัน, 2 สัปดาห์"
                  value={newTreatmentPlan.duration}
                  onChange={(e) => setNewTreatmentPlan(prev => ({ ...prev, duration: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="follow_up_date">วันนัดติดตาม</Label>
                <Input
                  id="follow_up_date"
                  type="date"
                  value={newTreatmentPlan.follow_up_date}
                  onChange={(e) => setNewTreatmentPlan(prev => ({ ...prev, follow_up_date: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="treatment_notes">หมายเหตุ</Label>
                <Textarea
                  id="treatment_notes"
                  placeholder="หมายเหตุเพิ่มเติม..."
                  value={newTreatmentPlan.notes}
                  onChange={(e) => setNewTreatmentPlan(prev => ({ ...prev, notes: e.target.value }))}
                  rows={2}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setTreatmentPlanDialogOpen(false)}>
                ยกเลิก
              </Button>
              <Button
                onClick={handleAddTreatmentPlan}
                disabled={!newTreatmentPlan.step_details.trim() || createTreatmentPlan.isPending}
              >
                {createTreatmentPlan.isPending ? 'กำลังบันทึก...' : 'บันทึก'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Add Procedure Dialog */}
        <Dialog open={procedureDialogOpen} onOpenChange={setProcedureDialogOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>เพิ่มบันทึกหัตถการ</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="procedure_date">วันที่ทำหัตถการ</Label>
                <Input
                  id="procedure_date"
                  type="date"
                  value={newProcedure.procedure_date}
                  onChange={(e) => setNewProcedure(prev => ({ ...prev, procedure_date: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="procedure_name">ชื่อหัตถการ *</Label>
                <Input
                  id="procedure_name"
                  placeholder="เช่น เย็บแผล, ล้างแผล, ตัดไหม"
                  value={newProcedure.procedure_name}
                  onChange={(e) => setNewProcedure(prev => ({ ...prev, procedure_name: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="body_part">บริเวณที่ทำ</Label>
                <Input
                  id="body_part"
                  placeholder="เช่น แขนซ้าย, หน้าผาก"
                  value={newProcedure.body_part}
                  onChange={(e) => setNewProcedure(prev => ({ ...prev, body_part: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="procedure_status">สถานะ</Label>
                <Select
                  value={newProcedure.status}
                  onValueChange={(value) => setNewProcedure(prev => ({ ...prev, status: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">รอดำเนินการ</SelectItem>
                    <SelectItem value="completed">เสร็จสิ้น</SelectItem>
                    <SelectItem value="cancelled">ยกเลิก</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="procedure_notes">หมายเหตุ</Label>
                <Textarea
                  id="procedure_notes"
                  placeholder="หมายเหตุเพิ่มเติม..."
                  value={newProcedure.notes}
                  onChange={(e) => setNewProcedure(prev => ({ ...prev, notes: e.target.value }))}
                  rows={3}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setProcedureDialogOpen(false)}>
                ยกเลิก
              </Button>
              <Button
                onClick={handleAddProcedure}
                disabled={!newProcedure.procedure_name.trim() || createProcedure.isPending}
              >
                {createProcedure.isPending ? 'กำลังบันทึก...' : 'บันทึก'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Add Prescription Dialog */}
        <Dialog open={prescriptionDialogOpen} onOpenChange={setPrescriptionDialogOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>เพิ่มคำสั่งยา</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="rx_date">วันที่ *</Label>
                <Input
                  id="rx_date"
                  type="date"
                  value={newPrescription.prescription_date}
                  onChange={(e) => setNewPrescription(prev => ({ ...prev, prescription_date: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>เลือกยา *</Label>
                <Select
                  value={newPrescription.medicine_id}
                  onValueChange={(value) => setNewPrescription(prev => ({ ...prev, medicine_id: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="เลือกยา" />
                  </SelectTrigger>
                  <SelectContent>
                    {medicines.map((med) => (
                      <SelectItem key={med.id} value={med.id}>
                        {med.name_thai}{med.name_english ? ` (${med.name_english})` : ''} - คงเหลือ {med.stock_qty} {med.unit || ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="rx_quantity">จำนวน *</Label>
                <Input
                  id="rx_quantity"
                  type="number"
                  min={1}
                  value={newPrescription.quantity}
                  onChange={(e) => setNewPrescription(prev => ({ ...prev, quantity: parseInt(e.target.value) || 1 }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="rx_usage">วิธีใช้ยา</Label>
                <Textarea
                  id="rx_usage"
                  placeholder="เช่น รับประทานครั้งละ 1 เม็ด วันละ 3 ครั้ง หลังอาหาร"
                  value={newPrescription.usage_instruction}
                  onChange={(e) => setNewPrescription(prev => ({ ...prev, usage_instruction: e.target.value }))}
                  rows={2}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setPrescriptionDialogOpen(false)}>
                ยกเลิก
              </Button>
              <Button
                onClick={handleAddPrescription}
                disabled={!newPrescription.prescription_date || !newPrescription.medicine_id || newPrescription.quantity < 1 || createPrescription.isPending}
              >
                {createPrescription.isPending ? 'กำลังบันทึก...' : 'บันทึก'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
};

export default PatientDetail;
