export type PatientMessageRow = {
  id: string
  doctor_id: string
  patient_name: string
  patient_email: string | null
  patient_phone: string | null
  body: string
  ai_suggested_reply: string | null
  suggested_action: string | null
  doctor_reply: string | null
  created_at: string
  read_at: string | null
}
