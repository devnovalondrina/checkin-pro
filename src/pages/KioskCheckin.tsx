import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { Event } from '../types'
import { formatCPF, formatPhone, cleanCPF } from '../utils/format'
import { CheckCircle, Loader2, UserX, ClipboardList, ArrowRight, UserPlus } from 'lucide-react'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { Card } from '../components/ui/Card'

export default function KioskCheckin() {
  const { id } = useParams<{ id: string }>()
  const [event, setEvent] = useState<Event | null>(null)
  const [cpf, setCpf] = useState('')
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState(false)
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle')
  const [message, setMessage] = useState('')
  const [attendeeName, setAttendeeName] = useState('')

  // Registration flow state
  const [showRegisterPrompt, setShowRegisterPrompt] = useState(false)
  const [showRegisterForm, setShowRegisterForm] = useState(false)
  const [registerName, setRegisterName] = useState('')
  const [registerPhone, setRegisterPhone] = useState('')

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
      } else {
        setEvent(data)
      }
      setLoading(false)
    }
    fetchEvent()
  }, [id])

  useEffect(() => {
    let timeout: NodeJS.Timeout
    if (status !== 'idle') {
      timeout = setTimeout(() => {
        setStatus('idle')
        setCpf('')
        setMessage('')
        setAttendeeName('')
        setShowRegisterPrompt(false)
        setShowRegisterForm(false)
        setRegisterName('')
        setRegisterPhone('')
      }, 3000)
    }
    return () => clearTimeout(timeout)
  }, [status])

  const handleCpfChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = formatCPF(e.target.value)
    setCpf(val)
  }

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = formatPhone(e.target.value)
    setRegisterPhone(val)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!cpf || cpf.length < 14) return
    if (!event) return

    setProcessing(true)
    setStatus('idle')
    setMessage('')

    try {
      const cleanedCpf = cleanCPF(cpf)
      
      // 1. Find attendee
      const { data: attendees, error: attError } = await supabase
        .from('attendees')
        .select('*')
        .eq('cpf', cleanedCpf)
      
      if (attError) throw attError

      const attendee = attendees?.[0]

      if (!attendee) {
        setShowRegisterPrompt(true)
        setProcessing(false)
        return
      }

      setAttendeeName(attendee.full_name)

      // 2. Find registration
      const { data: registrations, error: regError } = await supabase
        .from('registrations')
        .select('*')
        .eq('attendee_id', attendee.id)
        .eq('event_id', event.id)
      
      if (regError) throw regError
      
      const registration = registrations?.[0]

      if (!registration) {
        // Auto-register and check-in
        const { error: insertError } = await supabase
          .from('registrations')
          .insert([{
            attendee_id: attendee.id,
            event_id: event.id,
            checked_in: true,
            checkin_time: new Date().toISOString()
          }])

        if (insertError) throw insertError
        setStatus('success')
        setMessage('Inscrição e Check-in realizados!')
      } else if (registration.checked_in) {
        setStatus('success')
        setMessage('Check-in já realizado anteriormente.')
      } else {
        // Check-in
        const { error: updateError } = await supabase
          .from('registrations')
          .update({
            checked_in: true,
            checkin_time: new Date().toISOString()
          })
          .eq('id', registration.id)
        
        if (updateError) throw updateError
        setStatus('success')
        setMessage('Bem-vindo(a)!')
      }

    } catch (error: any) {
      console.error('Error in kiosk checkin:', error)
      setStatus('error')
      setMessage('Erro ao processar check-in.')
    } finally {
      setProcessing(false)
    }
  }

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!event) return
    
    setProcessing(true)
    try {
        const cleanedCpf = cleanCPF(cpf)
        
        // Create attendee
        const { data: newAttendee, error: createError } = await supabase
            .from('attendees')
            .insert([{ full_name: registerName, cpf: cleanedCpf, phone: registerPhone }])
            .select()
            .single()

        if (createError) throw createError

        // Create registration
        const { error: regError } = await supabase
            .from('registrations')
            .insert([{
                attendee_id: newAttendee.id,
                event_id: event.id,
                checked_in: true,
                checkin_time: new Date().toISOString()
            }])

        if (regError) throw regError

        setAttendeeName(newAttendee.full_name)
        setStatus('success')
        setMessage('Cadastro realizado e Check-in confirmado!')
        setShowRegisterForm(false)
    } catch (error) {
        console.error(error)
        setStatus('error')
        setMessage('Erro ao realizar cadastro.')
    } finally {
        setProcessing(false)
    }
  }

  if (loading) return <div className="min-h-[100dvh] flex items-center justify-center bg-gray-50"><Loader2 className="w-10 h-10 animate-spin text-indigo-600" /></div>
  if (!event) return <div className="min-h-[100dvh] flex items-center justify-center bg-gray-50 text-xl text-gray-600">Evento não encontrado</div>

  return (
    <div className="min-h-[100dvh] bg-gray-50 flex flex-col">
      {/* Header */}
      <header className="bg-white shadow-sm py-4 px-6 flex items-center justify-center sticky top-0 z-10">
        <div className="flex items-center gap-2">
          <ClipboardList className="w-8 h-8 text-indigo-600" />
          <span className="text-xl font-bold text-gray-900">CheckIn Pro</span>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex flex-col items-center justify-center p-4 pb-24">
        <div className="w-full max-w-lg">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">{event.title}</h1>
            <p className="text-gray-500 text-lg">Autoatendimento</p>
          </div>

          <Card className="rounded-2xl shadow-xl overflow-hidden border border-gray-100" padding="lg">
              {status === 'idle' && !showRegisterPrompt && !showRegisterForm && (
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="space-y-2">
                    <label className="block text-center text-sm font-medium text-gray-500 uppercase tracking-wider">
                      Digite seu CPF
                    </label>
                    <Input
                      type="tel"
                      value={cpf}
                      onChange={handleCpfChange}
                      className="text-center text-3xl font-mono tracking-wider p-4 rounded-xl"
                      placeholder="000.000.000-00"
                      autoFocus
                      maxLength={14}
                    />
                  </div>

                  <Button
                    type="submit"
                    fullWidth
                    disabled={processing || cpf.length < 14}
                    className="py-4 text-lg font-bold rounded-xl shadow-lg shadow-indigo-200"
                    isLoading={processing}
                  >
                    {!processing && (
                      <>
                        CONFIRMAR PRESENÇA
                        <ArrowRight className="w-5 h-5 ml-2" />
                      </>
                    )}
                  </Button>
                </form>
              )}

              {showRegisterPrompt && (
                 <div className="text-center space-y-6 animate-in fade-in zoom-in duration-300">
                    <div className="w-20 h-20 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <UserPlus className="w-10 h-10 text-yellow-600" />
                    </div>
                    <div>
                        <h2 className="text-2xl font-bold text-gray-900 mb-2">CPF não encontrado</h2>
                        <p className="text-gray-600">Deseja realizar seu cadastro agora?</p>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <Button
                            variant="outline"
                            onClick={() => { setShowRegisterPrompt(false); setCpf(''); }}
                            className="py-3 font-bold rounded-xl"
                        >
                            Cancelar
                        </Button>
                        <Button
                            onClick={() => { setShowRegisterPrompt(false); setShowRegisterForm(true); }}
                            className="py-3 font-bold rounded-xl shadow-lg shadow-indigo-200"
                        >
                            Cadastrar
                        </Button>
                    </div>
                 </div>
              )}

              {showRegisterForm && (
                  <form onSubmit={handleRegisterSubmit} className="space-y-4 animate-in fade-in zoom-in duration-300">
                      <div className="text-center mb-6">
                          <h2 className="text-xl font-bold text-gray-900">Novo Cadastro</h2>
                          <p className="text-sm text-gray-500">Preencha seus dados para continuar</p>
                      </div>
                      
                      <Input
                          label="CPF"
                          value={cpf}
                          disabled
                          className="bg-gray-100 text-gray-500"
                      />

                      <Input
                        label="Nome Completo"
                        required 
                        value={registerName}
                        onChange={(e) => setRegisterName(e.target.value)}
                        placeholder="Seu nome"
                      />

                      <Input
                        label="Telefone / WhatsApp"
                        type="tel" 
                        required 
                        value={registerPhone}
                        onChange={handlePhoneChange}
                        placeholder="(00) 00000-0000"
                        maxLength={15}
                      />

                      <div className="pt-2 grid grid-cols-2 gap-4">
                          <Button
                              variant="outline"
                              type="button"
                              onClick={() => { setShowRegisterForm(false); setCpf(''); }}
                              className="py-3 font-bold rounded-xl"
                          >
                              Cancelar
                          </Button>
                          <Button
                              type="submit"
                              disabled={processing}
                              isLoading={processing}
                              className="py-3 font-bold rounded-xl shadow-lg shadow-indigo-200"
                          >
                              Finalizar
                          </Button>
                      </div>
                  </form>
              )}

              {status === 'success' && (
                <div className="text-center py-6 animate-in fade-in zoom-in duration-300">
                  <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                    <CheckCircle className="w-12 h-12 text-green-600" />
                  </div>
                  <h2 className="text-3xl font-bold text-gray-900 mb-2">{attendeeName}</h2>
                  <p className="text-xl text-green-600 font-medium">{message}</p>
                </div>
              )}

              {status === 'error' && (
                <div className="text-center py-6 animate-in fade-in zoom-in duration-300">
                  <div className="w-24 h-24 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
                    <UserX className="w-12 h-12 text-red-600" />
                  </div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">Atenção</h2>
                  <p className="text-lg text-red-600">{message}</p>
                </div>
              )}

              {/* Footer hint - now part of the card implicitly via padding, but let's keep it separate or put in footer prop if needed. 
                  Actually, putting it inside the card body is fine for now as per previous design.
              */}
              <div className="bg-gray-50 -mx-8 -mb-8 mt-8 p-4 text-center border-t border-gray-100">
                <p className="text-sm text-gray-400">Toque na tela para digitar</p>
              </div>
          </Card>
        </div>
      </main>
    </div>
  )
}
