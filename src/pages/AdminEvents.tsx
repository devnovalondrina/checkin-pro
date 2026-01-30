import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { supabase } from '../lib/supabase'
import { Event } from '../types'
import { Calendar, MapPin, Plus, Trash2, Loader2, Pencil, Lock, Unlock, X, QrCode, ExternalLink, Award } from 'lucide-react'
import QRCode from 'react-qr-code'
import { toast } from 'sonner'
import { Card } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'

interface EventForm {
  title: string
  date: string
  location: string
  description: string
  workload: number
  certificate_template_url?: string
}

export default function AdminEvents() {
  const [events, setEvents] = useState<Event[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [showQr, setShowQr] = useState<Event | null>(null)
  
  const [isAllDay, setIsAllDay] = useState(false)
  
  const { register, handleSubmit, reset, formState: { errors }, setValue } = useForm<EventForm>()

  const fetchEvents = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('events')
      .select('*')
      .order('date', { ascending: true })

    if (error) {
      console.error('Error fetching events:', error)
      toast.error('Erro ao carregar eventos')
    } else {
      setEvents(data || [])
    }
    setLoading(false)
  }

  useEffect(() => {
    fetchEvents()
  }, [])

  const onSubmit = async (data: EventForm) => {
    setCreating(true)
    try {
      let finalDate = new Date(data.date)
      
      if (isAllDay) {
          // If all day, append 00:00 time in local timezone to ensure it's saved as "start of day"
          // If we just use new Date('YYYY-MM-DD'), it defaults to UTC 00:00, which might be previous day in local time
          // So we force local midnight
          finalDate = new Date(data.date + 'T00:00:00')
      }

      const eventData = {
        title: data.title,
        date: finalDate.toISOString(),
        location: data.location,
        description: data.description,
        workload: data.workload || 0,
        certificate_template_url: data.certificate_template_url
      }

      if (editingId) {
        const { error } = await supabase
          .from('events')
          .update(eventData)
          .eq('id', editingId)
        
        if (error) throw error
        setEditingId(null)
        toast.success('Evento atualizado com sucesso!')
      } else {
        const { error } = await supabase
          .from('events')
          .insert([{ ...eventData, is_open: true }]) // Default is_open to true
        
        if (error) throw error
        toast.success('Evento criado com sucesso!')
      }
      
      reset()
      await fetchEvents()
    } catch (error: any) {
      console.error('Error saving event:', error)
      toast.error('Erro ao salvar evento: ' + error.message)
    } finally {
      setCreating(false)
    }
  }

  const deleteEvent = async (id: string) => {
    if (!confirm('Tem certeza? Isso pode apagar inscrições associadas.')) return

    try {
      const { error } = await supabase.from('events').delete().eq('id', id)
      if (error) throw error
      setEvents(prev => prev.filter(e => e.id !== id))
      if (editingId === id) cancelEdit()
      toast.success('Evento excluído com sucesso!')
    } catch (error: any) {
      console.error('Error deleting event:', error)
      toast.error('Erro ao deletar: ' + error.message)
    }
  }

  const toggleStatus = async (event: Event) => {
    try {
      const newStatus = event.is_open === false ? true : false 
      
      const { error } = await supabase
        .from('events')
        .update({ is_open: newStatus })
        .eq('id', event.id)

      if (error) throw error
      await fetchEvents()
      toast.success(`Inscrições ${newStatus ? 'abertas' : 'fechadas'} com sucesso!`)
    } catch (error: any) {
      console.error('Error updating status:', error)
      toast.error('Erro ao atualizar status: ' + error.message)
    }
  }

  const toggleCertificates = async (event: Event) => {
    try {
      const newStatus = !event.certificates_released
      
      const { error } = await supabase
        .from('events')
        .update({ certificates_released: newStatus })
        .eq('id', event.id)

      if (error) throw error
      await fetchEvents()
      toast.success(`Certificados ${newStatus ? 'liberados' : 'bloqueados'} com sucesso!`)
    } catch (error: any) {
      console.error('Error updating certificate status:', error)
      toast.error('Erro ao atualizar status dos certificados: ' + error.message)
    }
  }

  const startEdit = (event: Event) => {
    setEditingId(event.id)
    setValue('title', event.title)
    
    // Check if it's potentially an all-day event (ends in 00:00:00.000Z or similar logic)
    // For now, let's assume if the user toggles "All day", we treat it as such.
    // But detecting from existing data is tricky without a dedicated flag.
    // We will check if the time part is 00:00 local time.
    
    if (event.date) {
      const d = new Date(event.date)
      // Adjust for local timezone to show correct time in input
      const dateObj = new Date(d.getTime() - d.getTimezoneOffset() * 60000)
      const isoStr = dateObj.toISOString()
      
      const hasTime = d.getHours() !== 0 || d.getMinutes() !== 0
      setIsAllDay(!hasTime)

      if (!hasTime) {
          setValue('date', isoStr.slice(0, 10)) // YYYY-MM-DD
      } else {
          setValue('date', isoStr.slice(0, 16)) // YYYY-MM-DDThh:mm
      }
    }
    
    setValue('location', event.location || '')
    setValue('description', event.description || '')
    setValue('workload', event.workload || 0)
    setValue('certificate_template_url', event.certificate_template_url || '')
  }

  const cancelEdit = () => {
    setEditingId(null)
    reset()
  }

  return (
    <div className="min-h-screen bg-gray-100 p-6 pb-24">
      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Form Column */}
        <div className="lg:col-span-1">
          <Card 
            className="sticky top-6"
            title={
              <div className="flex items-center justify-between w-full">
                <span className="flex items-center">
                  {editingId ? <Pencil className="w-5 h-5 mr-2" /> : <Plus className="w-5 h-5 mr-2" />}
                  {editingId ? 'Editar Evento' : 'Novo Evento'}
                </span>
                {editingId && (
                  <button onClick={cancelEdit} className="text-gray-400 hover:text-gray-600">
                    <X className="w-5 h-5" />
                  </button>
                )}
              </div>
            }
          >
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <Input
                label="Título"
                placeholder="Ex: Workshop de React"
                {...register('title', { required: 'Título é obrigatório' })}
                error={errors.title?.message}
              />

              <div className="flex items-center space-x-2 mb-2">
                <input
                    type="checkbox"
                    id="isAllDay"
                    checked={isAllDay}
                    onChange={(e) => {
                        setIsAllDay(e.target.checked)
                        // Clear date when toggling to avoid format conflicts
                        setValue('date', '') 
                    }}
                    className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                />
                <label htmlFor="isAllDay" className="text-sm text-gray-700">Evento de dia inteiro (sem horário)</label>
              </div>

              <Input
                label={isAllDay ? "Data" : "Data e Hora"}
                type={isAllDay ? "date" : "datetime-local"}
                {...register('date', { required: 'Data é obrigatória' })}
                error={errors.date?.message}
              />

              <Input
                label="Local"
                placeholder="Ex: Sala 304"
                {...register('location')}
              />

              <Input
                label="Carga Horária (horas)"
                type="number"
                placeholder="Ex: 8"
                {...register('workload')}
              />

              <Input
                label="URL do Fundo do Certificado (opcional)"
                placeholder="https://exemplo.com/certificado.png"
                {...register('certificate_template_url')}
              />

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Descrição</label>
                <textarea
                  {...register('description')}
                  rows={3}
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border"
                  placeholder="Detalhes do evento..."
                />
              </div>

              <Button
                type="submit"
                isLoading={creating}
                fullWidth
              >
                {editingId ? 'Salvar Alterações' : 'Criar Evento'}
              </Button>
            </form>
          </Card>
        </div>

        {/* List Column */}
        <div className="lg:col-span-2">
          <Card 
            padding="none"
            title="Eventos Cadastrados"
          >
            {loading ? (
              <div className="p-8 text-center"><Loader2 className="w-8 h-8 animate-spin mx-auto text-indigo-500" /></div>
            ) : events.length === 0 ? (
              <div className="p-8 text-center text-gray-500">Nenhum evento encontrado.</div>
            ) : (
              <ul className="divide-y divide-gray-200">
                {events.map((event) => (
                  <li key={event.id} className={`p-6 transition-colors ${editingId === event.id ? 'bg-indigo-50' : 'hover:bg-gray-50'}`}>
                    <div className="flex flex-col sm:flex-row items-start justify-between">
                      <div className="flex-1 w-full">
                        <div className="flex items-center mb-1 flex-wrap gap-2">
                           <h3 className="text-lg font-medium text-gray-900 mr-3 break-words">{event.title}</h3>
                           <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${event.is_open !== false ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                             {event.is_open !== false ? 'Aberto' : 'Fechado'}
                           </span>
                        </div>
                        
                        <div className="mt-2 flex flex-col sm:flex-row sm:items-center text-sm text-gray-500 sm:space-x-4 gap-2 sm:gap-0">
                          <span className="flex items-center">
                            <Calendar className="flex-shrink-0 mr-1.5 h-4 w-4 text-gray-400" />
                            {new Date(event.date).toLocaleString()}
                          </span>
                          {event.location && (
                            <span className="flex items-center">
                              <MapPin className="flex-shrink-0 mr-1.5 h-4 w-4 text-gray-400" />
                              {event.location}
                            </span>
                          )}
                          {event.workload > 0 && (
                             <span className="flex items-center text-indigo-600 font-medium">
                               {event.workload}h
                             </span>
                          )}
                        </div>
                        {event.description && (
                          <p className="mt-2 text-sm text-gray-600 break-words">{event.description}</p>
                        )}
                      </div>
                      <div className="mt-4 sm:mt-0 sm:ml-4 flex items-center space-x-2 w-full sm:w-auto justify-end">
                        <button
                          onClick={() => toggleStatus(event)}
                          className={`p-2 rounded-full transition-colors ${event.is_open !== false ? 'text-green-600 hover:bg-green-100' : 'text-red-600 hover:bg-red-100'}`}
                          title={event.is_open !== false ? 'Fechar Inscrições' : 'Abrir Inscrições'}
                        >
                          {event.is_open !== false ? <Unlock className="w-5 h-5" /> : <Lock className="w-5 h-5" />}
                        </button>
                        <button
                          onClick={() => toggleCertificates(event)}
                          className={`p-2 rounded-full transition-colors ${event.certificates_released ? 'text-indigo-600 hover:bg-indigo-100' : 'text-gray-400 hover:bg-gray-100'}`}
                          title={event.certificates_released ? 'Bloquear Certificados' : 'Liberar Certificados'}
                        >
                          <Award className="w-5 h-5" />
                        </button>
                        <button
                          onClick={() => setShowQr(event)}
                          className="p-2 text-purple-600 hover:bg-purple-50 rounded-full transition-colors"
                          title="Ver QR Code / Links"
                        >
                          <QrCode className="w-5 h-5" />
                        </button>
                        <button
                          onClick={() => startEdit(event)}
                          className="p-2 text-blue-400 hover:text-blue-600 hover:bg-blue-50 rounded-full transition-colors"
                          title="Editar Evento"
                        >
                          <Pencil className="w-5 h-5" />
                        </button>
                        <button 
                          onClick={() => deleteEvent(event.id)}
                          className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-full transition-colors"
                          title="Excluir Evento"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>

      </div>

      {showQr && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full relative">
            <button 
              onClick={() => setShowQr(null)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
            >
              <X className="w-6 h-6" />
            </button>
            
            <h3 className="text-lg font-bold mb-4 pr-8">Links para {showQr.title}</h3>
            
            <div className="space-y-6">
              <div className="text-center">
                <p className="text-sm font-medium text-gray-700 mb-2">QR Code para Auto-Checkin</p>
                <div className="bg-white p-2 inline-block border rounded">
                  <QRCode 
                    value={`${window.location.origin}/event/${showQr.id}/checkin`}
                    size={200}
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">Imprima este QR Code e coloque na entrada</p>
              </div>

              <div className="border-t pt-4">
                <p className="text-sm font-medium text-gray-700 mb-2">Modo Quiosque (Tablet)</p>
                <a 
                  href={`/kiosk/${showQr.id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center w-full p-2 bg-purple-50 text-purple-700 rounded hover:bg-purple-100 transition-colors"
                >
                  <ExternalLink className="w-4 h-4 mr-2" />
                  Abrir Modo Quiosque
                </a>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
