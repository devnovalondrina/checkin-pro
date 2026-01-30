import { useState, useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { supabase } from '../lib/supabase'
import { formatPhone } from '../utils/format'
import { QrCode, Loader2, Calendar, Trash2, PlusCircle, User, LogOut, Award, X } from 'lucide-react'
import { toast } from 'sonner'
import { Event } from '../types'
import { jsPDF } from 'jspdf'
import QRCode from 'react-qr-code'
import { Card } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'

interface Attendee {
  id: string
  full_name: string
  cpf: string
  phone: string
}

interface UpdateForm {
  full_name: string
  phone: string
}

export default function ParticipantDashboard() {
  const location = useLocation()
  const navigate = useNavigate()
  const [attendee, setAttendee] = useState<Attendee | null>(location.state?.attendee || null)
  const [myEvents, setMyEvents] = useState<any[]>([])
  const [availableEvents, setAvailableEvents] = useState<Event[]>([])
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState(false)
  const [showQr, setShowQr] = useState(false)
  
  const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm<UpdateForm>()
  const phoneValue = watch('phone')

  useEffect(() => {
    if (!attendee) {
      navigate('/participant')
      return
    }
    // Set initial form values
    setValue('full_name', attendee.full_name)
    setValue('phone', attendee.phone)
    
    fetchData()
  }, [attendee, navigate, setValue])

  useEffect(() => {
    if (phoneValue) setValue('phone', formatPhone(phoneValue))
  }, [phoneValue, setValue])

  const fetchData = async () => {
    if (!attendee) return
    setLoading(true)
    try {
      // 1. Get my registrations with event details
      const { data: registrations } = await supabase
        .from('registrations')
        .select(`
          id,
          checked_in,
          certificate_code,
          event:events (*)
        `)
        .eq('attendee_id', attendee.id)

      const myEventList = registrations?.map((r: any) => ({
        registration_id: r.id,
        checked_in: r.checked_in,
        certificate_code: r.certificate_code,
        ...r.event
      })) || []
      
      setMyEvents(myEventList)

      // 2. Get all open events
      const { data: allEvents } = await supabase
        .from('events')
        .select('*')
        .eq('is_open', true)
        .order('date', { ascending: true })

      // Filter out events I'm already registered for
      const myEventIds = myEventList.map(e => e.id)
      const available = (allEvents || []).filter((e: Event) => !myEventIds.includes(e.id))
      
      setAvailableEvents(available)

    } catch (error) {
      console.error('Error fetching data:', error)
    } finally {
      setLoading(false)
    }
  }

  const onUpdateProfile = async (data: UpdateForm) => {
    if (!attendee) return
    setUpdating(true)
    try {
      const { error } = await supabase
        .from('attendees')
        .update({
          full_name: data.full_name,
          phone: data.phone
        })
        .eq('id', attendee.id)

      if (error) throw error
      
      toast.success('Dados atualizados com sucesso!')
      setAttendee({ ...attendee, ...data })
    } catch (error) {
      console.error('Error updating profile:', error)
      toast.error('Erro ao atualizar dados.')
    } finally {
      setUpdating(false)
    }
  }

  const handleSubscribe = async (eventId: string) => {
    if (!attendee) return
    if (!confirm('Deseja se inscrever neste evento?')) return

    try {
      const { error } = await supabase
        .from('registrations')
        .insert([{
          attendee_id: attendee.id,
          event_id: eventId
        }])

      if (error) throw error
      
      toast.success('Inscrição realizada!')
      fetchData() // Refresh lists
    } catch (error) {
      console.error('Error subscribing:', error)
      toast.error('Erro ao se inscrever.')
    }
  }

  const handleUnsubscribe = async (registrationId: string) => {
    if (!confirm('Tem certeza que deseja cancelar sua inscrição?')) return

    try {
      const { error } = await supabase
        .from('registrations')
        .delete()
        .eq('id', registrationId)

      if (error) throw error
      
      toast.success('Inscrição cancelada.')
      fetchData() // Refresh lists
    } catch (error) {
      console.error('Error unsubscribing:', error)
      toast.error('Erro ao cancelar inscrição.')
    }
  }

  const generateCertificate = async (event: any) => {
    if (!attendee) return

    let certCode = event.certificate_code

    // Generate code if not exists
    if (!certCode) {
      const year = new Date(event.date).getFullYear()
      const randomNum = Math.floor(100000 + Math.random() * 900000)
      certCode = `${randomNum}/${year}`

      try {
        const { error } = await supabase
          .from('registrations')
          .update({ certificate_code: certCode })
          .eq('id', event.registration_id)

        if (error) throw error

        // Update local state
        setMyEvents(prev => prev.map(e => 
          e.registration_id === event.registration_id 
            ? { ...e, certificate_code: certCode } 
            : e
        ))
      } catch (error) {
        console.error('Error saving certificate code:', error)
        toast.error('Erro ao gerar código do certificado')
        return
      }
    }

    const doc = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: 'a4'
    })

    try {
        await drawCertificatePage(doc, attendee, event, certCode)
        doc.save(`certificado_${event.title.replace(/\s+/g, '_').toLowerCase()}.pdf`)
    } catch (err) {
        console.error("Error generating certificate", err)
        toast.error("Erro ao gerar certificado.")
    }
  }

  if (!attendee) return null

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8 pb-24">
      <div className="max-w-4xl mx-auto space-y-8">
        
        {/* Header */}
        <Card className="flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="text-center sm:text-left">
            <h1 className="text-2xl font-bold text-gray-900">Olá, {attendee.full_name.split(' ')[0]}</h1>
            <p className="text-sm text-gray-500">CPF: {attendee.cpf}</p>
          </div>
          <div className="flex gap-2">
            <Button 
              variant="primary"
              onClick={() => setShowQr(true)}
              className="flex items-center gap-2"
            >
              <QrCode className="w-4 h-4" /> Minha Credencial
            </Button>
            <Button 
              variant="outline"
              onClick={() => navigate('/participant')}
              className="flex items-center gap-2"
            >
              <LogOut className="w-4 h-4" /> Sair
            </Button>
          </div>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          
          {/* Meus Dados */}
          <Card
            title={
              <div className="flex items-center gap-2">
                <User className="w-5 h-5 text-indigo-600" /> Meus Dados
              </div>
            }
          >
            <form onSubmit={handleSubmit(onUpdateProfile)} className="space-y-4">
              <Input
                label="Nome Completo"
                {...register('full_name', { required: 'Nome é obrigatório' })}
                error={errors.full_name?.message}
              />
              <Input
                label="Telefone"
                {...register('phone', { required: 'Telefone é obrigatório' })}
                error={errors.phone?.message}
              />
              <Button
                type="submit"
                isLoading={updating}
                fullWidth
              >
                Atualizar Dados
              </Button>
            </form>
          </Card>

          {/* Minhas Inscrições */}
          <Card
            title={
              <div className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-green-600" /> Minhas Inscrições
              </div>
            }
          >
            {loading ? (
              <div className="text-center py-4"><Loader2 className="w-6 h-6 animate-spin mx-auto text-indigo-500" /></div>
            ) : myEvents.length === 0 ? (
              <p className="text-gray-500 text-sm">Você não está inscrito em nenhum evento.</p>
            ) : (
              <ul className="space-y-3">
                {myEvents.map(event => (
                  <li key={event.id} className="border rounded-md p-3 flex justify-between items-start bg-green-50 border-green-100">
                    <div className="min-w-0 flex-1 pr-2">
                      <h3 className="font-medium text-gray-900 break-words">{event.title}</h3>
                      <p className="text-sm text-gray-500">
                        {new Date(event.date).toLocaleDateString()} às {new Date(event.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                      <p className="text-xs text-gray-500 truncate">{event.location}</p>
                    </div>
                    <div className="flex items-center space-x-2">
                      {event.checked_in && event.certificates_released && (
                        <button
                          onClick={() => generateCertificate(event)}
                          className="text-indigo-600 hover:text-indigo-800 p-2 -mr-2"
                          title="Baixar Certificado"
                        >
                          <Award className="w-5 h-5" />
                        </button>
                      )}
                      <button
                        onClick={() => handleUnsubscribe(event.registration_id)}
                        className="text-red-500 hover:text-red-700 p-2 -mr-2"
                        title="Cancelar Inscrição"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>

        {/* Eventos Disponíveis */}
        <Card
          title={
            <div className="flex items-center gap-2">
              <PlusCircle className="w-5 h-5 text-blue-600" /> Eventos Disponíveis
            </div>
          }
        >
          {loading ? (
            <div className="text-center py-4"><Loader2 className="w-6 h-6 animate-spin mx-auto text-indigo-500" /></div>
          ) : availableEvents.length === 0 ? (
            <p className="text-gray-500 text-sm">Não há novos eventos disponíveis para inscrição.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {availableEvents.map(event => (
                <Card 
                  key={event.id} 
                  className="hover:shadow-md transition-shadow h-full flex flex-col"
                  padding="sm"
                >
                  <h3 className="font-medium text-gray-900">{event.title}</h3>
                  <div className="text-sm text-gray-500 mt-2 space-y-1 flex-1">
                    <p className="flex items-center gap-1">
                      <Calendar className="w-4 h-4" />
                      {new Date(event.date).toLocaleDateString()} - {new Date(event.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                    <p>{event.location}</p>
                    {event.workload > 0 && <p>Carga horária: {event.workload}h</p>}
                  </div>
                  <Button
                    onClick={() => handleSubscribe(event.id)}
                    className="mt-4"
                    fullWidth
                    variant="outline"
                  >
                    Inscrever-se
                  </Button>
                </Card>
              ))}
            </div>
          )}
        </Card>

      </div>

      {/* QR Code Modal */}
      {showQr && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 max-w-sm w-full relative text-center">
            <button 
              onClick={() => setShowQr(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
            >
              <X className="w-6 h-6" />
            </button>
            
            <h3 className="text-lg font-bold mb-2">Minha Credencial</h3>
            <p className="text-sm text-gray-500 mb-6">{attendee.full_name}</p>
            
            <div className="bg-white p-4 inline-block border rounded shadow-sm">
              <QRCode 
                value={attendee.cpf}
                size={200}
              />
            </div>
            <p className="text-xs text-gray-500 mt-4">Apresente este código na entrada do evento</p>
          </div>
        </div>
      )}
    </div>
  )
}
