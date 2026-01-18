import { usePatientAccount } from "@/hooks/usePatientAccount";
import { usePatientDiagnoses } from "@/hooks/usePatientDiagnoses";
import { usePatientTreatmentPlans } from "@/hooks/usePatientTreatmentPlans";
import { usePatientConsultations } from "@/hooks/usePatientConsultations";
import PatientLayout from "@/components/layout/PatientLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Stethoscope, ClipboardList, Calendar, FileText, AlertCircle, HeartPulse } from "lucide-react";
import { format } from "date-fns";
import { th } from "date-fns/locale";

const PatientTreatmentHistory = () => {
  const { data: patientAccount, isLoading: accountLoading } = usePatientAccount();
  const patientId = patientAccount?.patient_id || "";
  
  const { data: diagnoses, isLoading: diagnosesLoading } = usePatientDiagnoses(patientId);
  const { data: treatmentPlans, isLoading: plansLoading } = usePatientTreatmentPlans(patientId);
  const { data: consultations, isLoading: consultationsLoading } = usePatientConsultations(patientId);

  const isLoading = accountLoading || diagnosesLoading || plansLoading || consultationsLoading;

  if (isLoading) {
    return (
      <PatientLayout title="ประวัติการรักษา">
        <div className="space-y-4">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
      </PatientLayout>
    );
  }

  const getDiagnosisTypeBadge = (type: string | null) => {
    switch (type) {
      case 'primary':
        return <Badge variant="default">หลัก</Badge>;
      case 'secondary':
        return <Badge variant="secondary">รอง</Badge>;
      default:
        return <Badge variant="outline">{type || 'ไม่ระบุ'}</Badge>;
    }
  };

  return (
    <PatientLayout title="ประวัติการรักษา">
      <div className="space-y-6">
        <Tabs defaultValue="consultations" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="consultations" className="flex items-center gap-2">
              <HeartPulse className="h-4 w-4" />
              บันทึกอาการ ({consultations?.length || 0})
            </TabsTrigger>
            <TabsTrigger value="diagnoses" className="flex items-center gap-2">
              <Stethoscope className="h-4 w-4" />
              การวินิจฉัย ({diagnoses?.length || 0})
            </TabsTrigger>
            <TabsTrigger value="treatments" className="flex items-center gap-2">
              <ClipboardList className="h-4 w-4" />
              แผนการรักษา ({treatmentPlans?.length || 0})
            </TabsTrigger>
          </TabsList>

          {/* Consultations Tab - Chief Complaints */}
          <TabsContent value="consultations" className="space-y-4 mt-4">
            {consultations && consultations.length > 0 ? (
              consultations.map((consultation) => (
                <Card key={consultation.id}>
                  <CardHeader className="pb-2">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                        <HeartPulse className="h-5 w-5 text-blue-500" />
                      </div>
                      <div className="flex-1">
                        <CardTitle className="text-lg">บันทึกอาการ</CardTitle>
                        <CardDescription>
                          {format(new Date(consultation.consultation_date), "d MMMM yyyy", { locale: th })}
                        </CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div>
                      <h4 className="text-sm font-medium mb-1">อาการหลัก</h4>
                      <p className="text-sm">{consultation.chief_complaint}</p>
                    </div>
                    {consultation.vital_signs && Object.keys(consultation.vital_signs).length > 0 && (
                      <div>
                        <h4 className="text-sm font-medium mb-2">Vital Signs</h4>
                        <div className="flex flex-wrap gap-2">
                          {consultation.vital_signs.blood_pressure && (
                            <Badge variant="outline" className="text-xs">BP: {String(consultation.vital_signs.blood_pressure)}</Badge>
                          )}
                          {consultation.vital_signs.heart_rate && (
                            <Badge variant="outline" className="text-xs">HR: {String(consultation.vital_signs.heart_rate)}</Badge>
                          )}
                          {consultation.vital_signs.temperature && (
                            <Badge variant="outline" className="text-xs">Temp: {String(consultation.vital_signs.temperature)}°C</Badge>
                          )}
                          {consultation.vital_signs.respiratory_rate && (
                            <Badge variant="outline" className="text-xs">RR: {String(consultation.vital_signs.respiratory_rate)}</Badge>
                          )}
                          {consultation.vital_signs.weight && (
                            <Badge variant="outline" className="text-xs">น้ำหนัก: {String(consultation.vital_signs.weight)} kg</Badge>
                          )}
                          {consultation.vital_signs.height && (
                            <Badge variant="outline" className="text-xs">ส่วนสูง: {String(consultation.vital_signs.height)} cm</Badge>
                          )}
                        </div>
                      </div>
                    )}
                    {consultation.physical_exam_note && (
                      <div>
                        <h4 className="text-sm font-medium mb-1">บันทึกการตรวจร่างกาย</h4>
                        <p className="text-sm text-muted-foreground">{consultation.physical_exam_note}</p>
                      </div>
                    )}
                    {consultation.notes && (
                      <div>
                        <h4 className="text-sm font-medium mb-1">หมายเหตุ</h4>
                        <p className="text-sm text-muted-foreground">{consultation.notes}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))
            ) : (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                  <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium">ไม่มีบันทึกอาการ</h3>
                  <p className="text-muted-foreground">ยังไม่มีข้อมูลบันทึกอาการในระบบ</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Diagnoses Tab */}
          <TabsContent value="diagnoses" className="space-y-4 mt-4">
            {diagnoses && diagnoses.length > 0 ? (
              diagnoses.map((diagnosis) => (
                <Card key={diagnosis.id}>
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                          <Stethoscope className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <CardTitle className="text-lg">{diagnosis.icd10_code}</CardTitle>
                          <CardDescription>{diagnosis.description || 'ไม่มีคำอธิบาย'}</CardDescription>
                        </div>
                      </div>
                      {getDiagnosisTypeBadge(diagnosis.diagnosis_type)}
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Calendar className="h-4 w-4" />
                        <span>
                          {format(new Date(diagnosis.diagnosis_date), "d MMMM yyyy", { locale: th })}
                        </span>
                      </div>
                      {diagnosis.notes && (
                        <div className="flex items-center gap-1">
                          <FileText className="h-4 w-4" />
                          <span>{diagnosis.notes}</span>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                  <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium">ไม่มีประวัติการวินิจฉัย</h3>
                  <p className="text-muted-foreground">ยังไม่มีข้อมูลการวินิจฉัยในระบบ</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Treatment Plans Tab */}
          <TabsContent value="treatments" className="space-y-4 mt-4">
            {treatmentPlans && treatmentPlans.length > 0 ? (
              treatmentPlans.map((plan) => (
                <Card key={plan.id}>
                  <CardHeader className="pb-2">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center">
                        <ClipboardList className="h-5 w-5 text-green-500" />
                      </div>
                      <div className="flex-1">
                        <CardTitle className="text-lg">แผนการรักษา</CardTitle>
                        <CardDescription>
                          วันที่เข้ารับบริการ: {format(new Date(plan.visit.visit_date), "d MMMM yyyy", { locale: th })}
                        </CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div>
                      <h4 className="text-sm font-medium mb-1">รายละเอียด</h4>
                      <p className="text-sm text-muted-foreground">{plan.plan_details}</p>
                    </div>
                    <div className="flex flex-wrap gap-4 text-sm">
                      {plan.duration && (
                        <div>
                          <span className="text-muted-foreground">ระยะเวลา: </span>
                          <span className="font-medium">{plan.duration}</span>
                        </div>
                      )}
                      {plan.follow_up_date && (
                        <div>
                          <span className="text-muted-foreground">วันนัดติดตาม: </span>
                          <span className="font-medium">
                            {format(new Date(plan.follow_up_date), "d MMMM yyyy", { locale: th })}
                          </span>
                        </div>
                      )}
                    </div>
                    {plan.notes && (
                      <div>
                        <h4 className="text-sm font-medium mb-1">หมายเหตุ</h4>
                        <p className="text-sm text-muted-foreground">{plan.notes}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))
            ) : (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                  <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium">ไม่มีแผนการรักษา</h3>
                  <p className="text-muted-foreground">ยังไม่มีข้อมูลแผนการรักษาในระบบ</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </PatientLayout>
  );
};

export default PatientTreatmentHistory;
