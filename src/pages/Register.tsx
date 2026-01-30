import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { supabase } from '../lib/supabase'
import { formatCPF, formatPhone, cleanCPF } from '../utils/format'
import { validateCPF } from '../utils/validateCpf'
import { toast } from 'sonner'
import { Loader2, Calendar, ArrowRight } from 'lucide-react'
import { Event } from '../types'
import { useNavigate } from 'react-router-dom'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { Card } from '../components/ui/Card'

interface RegisterForm {
  full_name: string
  cpf: string
  phone: string
  selected_events: string[] // Array of event IDs
}

export default function Register() {
  const { register, handleSubmit, formState: { errors }, setValue, watch } = useForm<RegisterForm>()
  const [loading, setLoading] = useState(false)
  const [events, setEvents] = useState<Event[]>([])
  const [loadingEvents, setLoadingEvents] = useState(true)
  const [step, setStep] = useState<'cpf' | 'details'>('cpf')
  const [checkingCpf, setCheckingCpf] = useState(false)
  const navigate = useNavigate()

  // Watch input changes for masking
  const cpfValue = watch('cpf')
  const phoneValue = watch('phone')

  useEffect(() => {
    if (cpfValue) setValue('cpf', formatCPF(cpfValue))
  }, [cpfValue, setValue])

  useEffect(() => {
    if (phoneValue) setValue('phone', formatPhone(phoneValue))
  }, [phoneValue, setValue])

  useEffect(() => {
    const fetchEvents = async () => {
      const { data } = await supabase
        .from('events')
        .select('*')
        .order('date', { ascending: true })
      
      const openEvents = (data || []).filter((e: Event) => e.is_open !== false)
      setEvents(openEvents)
      setLoadingEvents(false)
    }
    fetchEvents()
  }, [])

  const handleCpfSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const currentCpf = watch('cpf')
    
    if (!currentCpf || currentCpf.length < 14) {
      toast.error('CPF inválido')
      return
    }

    const cleaned = cleanCPF(currentCpf)
    if (!validateCPF(cleaned)) {
      toast.error('CPF inválido')
      return
    }

    setCheckingCpf(true)
    try {
      const { data: existingUser } = await supabase
        .from('attendees')
        .select('*')
        .eq('cpf', cleaned)
        .single()

      if (existingUser) {
        toast.warning('Você já possui cadastro! Redirecionando...')
        // Short delay to let user see the message
        setTimeout(() => {
          navigate('/participant', { state: { cpf: cleaned } })
        }, 1000)
        return
      } else {
        setValue('full_name', '')
        setValue('phone', '')
        setStep('details')
      }
    } catch (error) {
      console.error('Error checking CPF:', error)
      // If error (e.g. not found single), assume new user
      setStep('details')
    } finally {
      setCheckingCpf(false)
    }
  }

  const onSubmit = async (data: RegisterForm) => {
    // Ensure selected_events is an array
    const selectedEvents = Array.isArray(data.selected_events)
      ? data.selected_events
      : (data.selected_events ? [data.selected_events] : [])

    if (selectedEvents.length === 0) {
      toast.warning('Selecione pelo menos um evento para participar.')
      return
    }

    setLoading(true)
    try {
      const cleanedCPF = cleanCPF(data.cpf)
      
      // 1. Find or Create Attendee
      let attendeeId: string

      const { data: existingUser } = await supabase
        .from('attendees')
        .select('id')
        .eq('cpf', cleanedCPF)
        .single()

      if (existingUser) {
        // Prevent name overwrite for existing users
        // Only update phone number to preserve registration integrity
        const { error: updateError } = await supabase
          .from('attendees')
          .update({
            phone: data.phone
          })
          .eq('id', existingUser.id)
        
        if (updateError) throw updateError
        attendeeId = existingUser.id
      } else {
        const { data: newUser, error: createError } = await supabase
          .from('attendees')
          .insert([{
            full_name: data.full_name,
            cpf: cleanedCPF,
            phone: data.phone,
          }])
          .select()
          .single()

        if (createError) throw createError
        attendeeId = newUser.id
      }

      // 2. Create Registrations for selected events
      const registrations = selectedEvents.map(eventId => ({
        attendee_id: attendeeId,
        event_id: eventId,
        checked_in: false
      }))

      for (const reg of registrations) {
         // Check if already registered
         const { data: existingReg } = await supabase
            .from('registrations')
            .select('id')
            .eq('attendee_id', reg.attendee_id)
            .eq('event_id', reg.event_id)
            .single()
         
         if (!existingReg) {
            await supabase.from('registrations').insert([reg])
         }
      }

      // Navigate to success page
      navigate('/success', { 
        state: { 
          attendee: { ...data, cpf: cleanedCPF }, // Pass cleaned CPF for consistency
          events: events.filter(e => selectedEvents.includes(e.id))
        } 
      })

    } catch (error: any) {
      console.error('Error registering:', error)
      toast.error('Erro ao registrar: ' + (error.message || 'Tente novamente.'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4 pb-24">
      <Card className="max-w-md w-full" padding="lg">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Inscrição no Evento</h1>
          <p className="text-gray-600 mt-2">
            {step === 'cpf' ? 'Digite seu CPF para começar' : 'Complete seus dados'}
          </p>
        </div>

        {step === 'cpf' ? (
          <form onSubmit={handleCpfSubmit} className="space-y-6">
            <Input
              id="cpf"
              label="CPF"
              {...register('cpf', { required: 'CPF é obrigatório' })}
              className="text-center tracking-widest text-xl p-3"
              placeholder="000.000.000-00"
              autoFocus
            />

            <Button
              type="submit"
              fullWidth
              disabled={checkingCpf}
              isLoading={checkingCpf}
            >
              <span className="flex items-center">
                Continuar <ArrowRight className="w-4 h-4 ml-2" />
              </span>
            </Button>
          </form>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 animate-in slide-in-from-right duration-300">
            <div className="flex gap-2 items-end">
              <div className="flex-1">
                <Input
                  id="cpf_display"
                  label="CPF"
                  value={watch('cpf')}
                  disabled
                  className="text-gray-500 bg-gray-50"
                />
              </div>
              <div className="mb-[1px]">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setStep('cpf')}
                  className="h-[42px]"
                >
                  Trocar
                </Button>
              </div>
            </div>

            <Input
              id="full_name"
              label="Nome Completo"
              {...register('full_name', { required: 'Nome é obrigatório' })}
              placeholder="Digite seu nome completo"
              error={errors.full_name?.message}
            />

            <Input
              id="phone"
              label="Telefone"
              {...register('phone', { required: 'Telefone é obrigatório' })}
              placeholder="(00) 00000-0000"
              error={errors.phone?.message}
            />

            <div className="border-t pt-4 mt-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Eventos Disponíveis</h3>
              {loadingEvents ? (
                <div className="text-center py-4"><Loader2 className="w-6 h-6 animate-spin mx-auto text-indigo-500" /></div>
              ) : events.length === 0 ? (
                <p className="text-gray-500 text-sm text-center">Nenhum evento disponível no momento.</p>
              ) : (
                <div className="space-y-3">
                  {events.map(event => (
                    <label key={event.id} className="relative flex items-start p-3 border rounded-lg hover:bg-gray-50 cursor-pointer transition-colors group">
                      <div className="flex items-center h-5">
                        <input
                          type="checkbox"
                          value={event.id}
                          {...register('selected_events')}
                          className="focus:ring-indigo-500 h-4 w-4 text-indigo-600 border-gray-300 rounded"
                        />
                      </div>
                      <div className="ml-3 text-sm">
                        <span className="font-medium text-gray-900 group-hover:text-indigo-600 transition-colors">{event.title}</span>
                        <div className="text-gray-500 flex items-center mt-1">
                          <Calendar className="w-3 h-3 mr-1" />
                          {new Date(event.date).toLocaleDateString()} às {new Date(event.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                        {event.location && <p className="text-gray-500 text-xs mt-1">{event.location}</p>}
                      </div>
                    </label>
                  ))}
                </div>
              )}
            </div>

            <Button
              type="submit"
              fullWidth
              isLoading={loading}
            >
              Confirmar Inscrição
            </Button>
          </form>
        )}
      </Card>
    </div>
  )
}
