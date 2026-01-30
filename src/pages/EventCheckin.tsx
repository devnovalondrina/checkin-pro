import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { Event } from '../types'
import { formatCPF, formatPhone } from '../utils/format'
import { CheckCircle, AlertCircle, Loader2, Calendar, MapPin, UserPlus } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { Input } from '../components/ui/Input'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'

interface CheckinForm {
  cpf: string
  full_name?: string
  phone?: string
}

export default function EventCheckin() {
  const { id } = useParams<{ id: string }>()
  const [event, setEvent] = useState<Event | null>(null)
  const [loading, setLoading] = useState(true)
  const [checking, setChecking] = useState(false)
  const [step, setStep] = useState<'cpf' | 'register' | 'success'>('cpf')
  const [message, setMessage] = useState('')

  const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm<CheckinForm>()
  const cpfValue = watch('cpf')
  const phoneValue = watch('phone')

  useEffect(() => {
    if (cpfValue) setValue('cpf', formatCPF(cpfValue))
    if (phoneValue) setValue('phone', formatPhone(phoneValue))
  }, [cpfValue, phoneValue, setValue])

  useEffect(() => {
    const fetchEvent = async () => {
      if (!id) return
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .eq('id', id)
        .single()
      
      if (error) {
        console.error('Error fetching event:', error)
        toast.error('Evento não encontrado.')
        setMessage('Evento não encontrado.')
      } else {
        setEvent(data)
      }
      setLoading(false)
    }
    fetchEvent()
  }, [id])

  const onCheckCpf = async (data: CheckinForm) => {
    if (!event) return
    setChecking(true)
    setMessage('')

    try {
      // 1. Check if attendee exists
      const { data: attendees, error: attendeeError } = await supabase
        .from('attendees')
        .select('*')
        .eq('cpf', data.cpf)
      
      if (attendeeError) throw attendeeError

      const attendee = attendees?.[0]

      if (attendee) {
        // Attendee exists, check registration
        await processCheckin(attendee.id)
      } else {
        // Attendee does not exist, go to register step
        setStep('register')
        setChecking(false)
      }
    } catch (error: any) {
      console.error('Error checking CPF:', error)
      toast.error('Erro ao validar CPF: ' + error.message)
      setMessage('Erro ao validar CPF: ' + error.message)
      setChecking(false)
    }
  }

  const onRegisterAndCheckin = async (data: CheckinForm) => {
    if (!event) return
    setChecking(true)

    try {
      // 1. Create attendee
      const { data: newAttendee, error: createError } = await supabase
        .from('attendees')
        .insert([{
          full_name: data.full_name,
          cpf: data.cpf,
          phone: data.phone
        }])
        .select()
        .single()

      if (createError) throw createError

      // 2. Process checkin
      await processCheckin(newAttendee.id)

    } catch (error: any) {
      console.error('Error registering:', error)
      toast.error('Erro ao cadastrar: ' + error.message)
      setMessage('Erro ao cadastrar: ' + error.message)
      setChecking(false)
    }
  }

  const processCheckin = async (attId: string) => {
    if (!event) return

    try {
      // Check if already registered
      const { data: registrations, error: regError } = await supabase
        .from('registrations')
        .select('*')
        .eq('attendee_id', attId)
        .eq('event_id', event.id)

      if (regError) throw regError

      const registration = registrations?.[0]

      if (registration) {
        // Already registered
        if (registration.checked_in) {
          toast.success(`Olá! Você já fez check-in anteriormente.`)
          setMessage(`Olá! Você já fez check-in anteriormente.`)
          setStep('success')
        } else {
          // Update checkin
          const { error: updateError } = await supabase
            .from('registrations')
            .update({ 
              checked_in: true,
              checkin_time: new Date().toISOString()
            })
            .eq('id', registration.id)

          if (updateError) throw updateError
          toast.success('Check-in realizado com sucesso!')
          setMessage('Check-in realizado com sucesso!')
          setStep('success')
        }
      } else {
        // Not registered, create registration and checkin
        const { error: insertError } = await supabase
          .from('registrations')
          .insert([{
            attendee_id: attId,
            event_id: event.id,
            checked_in: true,
            checkin_time: new Date().toISOString()
          }])

        if (insertError) throw insertError
        toast.success('Cadastro e Check-in realizados com sucesso!')
        setMessage('Cadastro e Check-in realizados com sucesso!')
        setStep('success')
      }
    } catch (error: any) {
      console.error('Error processing checkin:', error)
      toast.error('Erro ao processar check-in: ' + error.message)
      setMessage('Erro ao processar check-in: ' + error.message)
    } finally {
      setChecking(false)
    }
  }

  if (loading) {
    return <div className="min-h-[100dvh] flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-indigo-600" /></div>
  }

  if (!event) {
    return (
      <div className="min-h-[100dvh] flex flex-col items-center justify-center p-4">
        <AlertCircle className="w-12 h-12 text-red-500 mb-4" />
        <h1 className="text-xl font-bold text-gray-900">Evento não encontrado</h1>
      </div>
    )
  }

  return (
    <div className="min-h-[100dvh] bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8 pb-24">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <Card>
          
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold text-gray-900">{event.title}</h2>
            <div className="mt-2 flex items-center justify-center text-sm text-gray-500 gap-4">
              <span className="flex items-center"><Calendar className="w-4 h-4 mr-1" /> {new Date(event.date).toLocaleDateString()}</span>
              {event.location && <span className="flex items-center"><MapPin className="w-4 h-4 mr-1" /> {event.location}</span>}
            </div>
          </div>

          {step === 'cpf' && (
            <form onSubmit={handleSubmit(onCheckCpf)} className="space-y-6">
              <Input
                label="Digite seu CPF para entrar"
                {...register('cpf', { required: 'CPF é obrigatório', minLength: 14 })}
                placeholder="000.000.000-00"
                autoFocus
                error={errors.cpf?.message}
              />

              <Button
                type="submit"
                isLoading={checking}
                fullWidth
              >
                Continuar
              </Button>
            </form>
          )}

          {step === 'register' && (
            <form onSubmit={handleSubmit(onRegisterAndCheckin)} className="space-y-6">
              <div className="bg-yellow-50 p-4 rounded-md mb-4 flex items-start">
                <UserPlus className="w-5 h-5 text-yellow-600 mr-2 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-yellow-700">Não encontramos seu cadastro. Preencha os dados abaixo para entrar.</p>
              </div>

              <Input
                label="Nome Completo"
                {...register('full_name', { required: 'Nome é obrigatório' })}
                error={errors.full_name?.message}
              />

              <Input
                label="Telefone"
                {...register('phone', { required: 'Telefone é obrigatório' })}
                placeholder="(00) 00000-0000"
                error={errors.phone?.message}
              />

              <Button
                type="submit"
                isLoading={checking}
                fullWidth
                variant="primary"
              >
                Confirmar Presença
              </Button>
            </form>
          )}

          {step === 'success' && (
            <div className="text-center py-8">
              <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
              <h3 className="text-xl font-medium text-gray-900 mb-2">Bem-vindo(a)!</h3>
              <p className="text-gray-500">{message}</p>
            </div>
          )}

          {message && step !== 'success' && (
            <div className="mt-4 p-3 rounded-md bg-red-50 text-red-700 text-sm flex items-start">
              <AlertCircle className="w-5 h-5 mr-2 flex-shrink-0" />
              {message}
            </div>
          )}

        </Card>
      </div>
    </div>
  )
}
