export interface Attendee {
  id: string
  created_at: string
  full_name: string
  cpf: string
  phone: string
}

export interface Event {
  id: string
  created_at: string
  title: string
  description: string | null
  date: string
  location: string | null
  is_open: boolean
  workload: number // Carga horária em horas
  certificates_released: boolean // Se os certificados foram liberados
}

export interface Registration {
  id: string
  created_at: string
  attendee_id: string
  event_id: string
  checked_in: boolean
  checkin_time: string | null
  certificate_code?: string | null // Código único do certificado
  attendee?: Attendee // For joins
  event?: Event // For joins
}
