import React, { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { Registration, Event } from '../types'
import { formatCPF } from '../utils/format'
import { Search, UserCheck, UserX, Users, RefreshCw, Download, Camera, X, FileText } from 'lucide-react'
import clsx from 'clsx'
import { saveAs } from 'file-saver'
import * as XLSX from 'xlsx'
import { jsPDF } from 'jspdf'
import QrScanner from 'react-qr-scanner'
import { toast } from 'sonner'
import { drawCertificatePage } from '../utils/generateCertificate'
import { Card } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { Select } from '../components/ui/Select'

export default function Admin() {
  const [events, setEvents] = useState<Event[]>([])
  const [selectedEventId, setSelectedEventId] = useState<string>('')
  const [registrations, setRegistrations] = useState<Registration[]>([])
  const [loading, setLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [filter, setFilter] = useState<'all' | 'present' | 'absent'>('all')
  const [scanCode, setScanCode] = useState('')
  const [showScanner, setShowScanner] = useState(false)
  const [scanStatus, setScanStatus] = useState<{ type: 'success' | 'error', message: string } | null>(null)

  useEffect(() => {
    const fetchEvents = async () => {
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .order('date', { ascending: true })
      
      if (error) {
        toast.error('Erro ao carregar eventos')
        return
      }

      if (data && data.length > 0) {
        setEvents(data)
        setSelectedEventId(data[0].id)
      }
    }
    fetchEvents()
  }, [])

  const fetchRegistrations = async () => {
    if (!selectedEventId) return

    setLoading(true)
    
    const { data, error } = await supabase
      .from('registrations')
      .select('*, attendee:attendees(*)')
      .eq('event_id', selectedEventId)

    if (error) {
      console.error('Error fetching registrations:', error)
      toast.error('Erro ao carregar inscrições')
    } else {
      const sorted = (data || []).sort((a: any, b: any) => 
        (a.attendee?.full_name || '').localeCompare(b.attendee?.full_name || '')
      )
      setRegistrations(sorted as unknown as Registration[])
    }
    setLoading(false)
  }

  useEffect(() => {
    fetchRegistrations()
  }, [selectedEventId])

  const toggleCheckIn = async (registrationId: string, currentStatus: boolean) => {
    // Optimistic update
    setRegistrations(prev => prev.map(r => 
      r.id === registrationId ? { ...r, checked_in: !currentStatus, checkin_time: !currentStatus ? new Date().toISOString() : null } : r
    ))

    const { error } = await supabase
      .from('registrations')
      .update({ 
        checked_in: !currentStatus,
        checkin_time: !currentStatus ? new Date().toISOString() : null 
      })
      .eq('id', registrationId)

    if (error) {
      console.error('Error updating checkin:', error)
      toast.error('Erro ao atualizar check-in')
      fetchRegistrations() 
    } else {
      toast.success(currentStatus ? 'Check-in cancelado' : 'Check-in realizado')
    }
  }

  const handleScan = async (e?: React.FormEvent, code?: string) => {
    if (e) e.preventDefault()
    
    const codeToProcess = code || scanCode
    if (!codeToProcess || !selectedEventId) return

    const cpf = codeToProcess.replace(/\D/g, '') // remove mask if exists
    const registration = registrations.find(r => r.attendee?.cpf.replace(/\D/g, '') === cpf)

    if (registration) {
      if (registration.checked_in) {
        toast.warning(`Participante ${registration.attendee?.full_name} já fez check-in!`)
        setScanStatus({ type: 'error', message: `Participante ${registration.attendee?.full_name} já fez check-in!` })
      } else {
        await toggleCheckIn(registration.id, false)
        toast.success(`Check-in realizado: ${registration.attendee?.full_name}`)
        setScanStatus({ type: 'success', message: `Check-in realizado: ${registration.attendee?.full_name}` })
      }
    } else {
      toast.error('Participante não encontrado neste evento.')
      setScanStatus({ type: 'error', message: 'Participante não encontrado neste evento.' })
    }
    setScanCode('')
    if (code) setShowScanner(false)
  }

  const handleCameraScan = (data: any) => {
    if (data) {
      handleScan(undefined, data.text)
    }
  }

  const handleCameraError = (err: any) => {
    console.error(err)
    toast.error('Erro ao acessar a câmera.')
    setShowScanner(false)
  }

  const exportToExcel = async () => {
    try {
      setLoading(true)
      
      if (registrations.length === 0) {
        toast.warning('Nenhum registro para exportar.')
        setLoading(false)
        return
      }

      const dataToExport = registrations.map((reg) => {
        return {
          'Nome': reg.attendee?.full_name || '',
          'Telefone': reg.attendee?.phone || '',
          'CPF': formatCPF(reg.attendee?.cpf || ''),
        }
      })

      const ws = XLSX.utils.json_to_sheet(dataToExport)
      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, ws, "Participantes")
      
      const selectedEvent = events.find(e => e.id === selectedEventId)
      const fileName = selectedEvent 
        ? `lista_evento_${selectedEvent.title.replace(/\s+/g, '_').toLowerCase()}.xlsx`
        : `participantes_checkin_${new Date().toISOString().slice(0,10)}.xlsx`

      const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' })
      const data = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=UTF-8' })
      
      saveAs(data, fileName)
      toast.success('Relatório exportado com sucesso!')
      
    } catch (error) {
      console.error('Error exporting:', error)
      toast.error('Erro ao exportar excel')
    } finally {
      setLoading(false)
    }
  }

  const exportCertificates = async () => {
    const presentRegistrations = registrations.filter(r => r.checked_in)
    
    if (presentRegistrations.length === 0) {
      toast.warning('Nenhum participante presente para gerar certificados.')
      return
    }
    
    setLoading(true)
    try {
      const doc = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4'
      })
  
      const selectedEvent = events.find(e => e.id === selectedEventId)
      if (!selectedEvent) return
  
      for (let index = 0; index < presentRegistrations.length; index++) {
          const reg = presentRegistrations[index];
          if (index > 0) doc.addPage()
          
          const attendee = reg.attendee
          if (!attendee) continue
  
          // Generate code if missing (note: this is not saved to DB here, should use existing or generate temp)
          const certCode = reg.certificate_code || `${Math.floor(100000 + Math.random() * 900000)}${new Date(selectedEvent.date).getFullYear()}`
  
          await drawCertificatePage(doc, attendee, selectedEvent, certCode)
      }
  
      doc.save(`certificados_${selectedEvent.title.replace(/\s+/g, '_').toLowerCase()}.pdf`)
      toast.success('Certificados gerados com sucesso!')
  
    } catch (err) {
      console.error(err)
      toast.error('Erro ao gerar certificados')
    } finally {
      setLoading(false)
    }
  }

  const filteredList = registrations.filter(reg => {
    if (!reg.attendee) return false

    const matchesSearch = 
      reg.attendee.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      reg.attendee.cpf.includes(searchTerm)
    
    const matchesFilter = 
      filter === 'all' ? true :
      filter === 'present' ? reg.checked_in :
      !reg.checked_in

    return matchesSearch && matchesFilter
  })

  const stats = {
    total: registrations.length,
    present: registrations.filter(r => r.checked_in).length,
    absent: registrations.filter(r => !r.checked_in).length
  }

  return (
    <div className="min-h-screen bg-gray-100 p-6 pb-24">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Header & Event Selector */}
        <Card className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Painel de Presença</h1>
            <p className="text-gray-500">Controle de entrada por evento</p>
          </div>
          
          <div className="flex items-center gap-4 w-full md:w-auto">
            <div className="relative flex-1 md:w-64">
               <Select
                 label="Selecionar Evento"
                 value={selectedEventId}
                 onChange={(e) => setSelectedEventId(e.target.value)}
               >
                 {events.length === 0 && <option>Carregando eventos...</option>}
                 {events.map(e => (
                   <option key={e.id} value={e.id}>{e.title} - {new Date(e.date).toLocaleDateString()}</option>
                 ))}
               </Select>
            </div>
            
            <div className="flex items-end gap-2 mt-5">
              <Button 
                onClick={fetchRegistrations}
                variant="outline"
                className="p-2"
                title="Atualizar Lista"
              >
                <RefreshCw className={clsx("w-5 h-5 text-gray-600", loading && "animate-spin")} />
              </Button>
              <Button 
                onClick={exportToExcel}
                className="p-2 bg-green-600 hover:bg-green-700 border-green-600 text-white"
                title="Exportar Excel"
              >
                <Download className="w-5 h-5" />
              </Button>
              <Button 
                onClick={exportCertificates}
                className="p-2 bg-indigo-600 hover:bg-indigo-700 border-indigo-600 text-white"
                title="Exportar Certificados (PDF)"
              >
                <FileText className="w-5 h-5" />
              </Button>
            </div>
          </div>
        </Card>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="md:col-span-3 border-l-4 border-indigo-500">
            <div className="flex justify-between items-center mb-2">
              <h3 className="text-lg font-medium text-gray-900">Validar QR Code / CPF</h3>
              <button
                type="button"
                onClick={() => setShowScanner(!showScanner)}
                className="flex items-center gap-2 text-indigo-600 hover:text-indigo-800"
              >
                {showScanner ? <><X className="w-5 h-5" /> Fechar Câmera</> : <><Camera className="w-5 h-5" /> Abrir Câmera</>}
              </button>
            </div>

            {showScanner && (
              <div className="mb-4 bg-black rounded-lg overflow-hidden flex justify-center">
                <QrScanner
                  delay={300}
                  onError={handleCameraError}
                  onScan={handleCameraScan}
                  style={{ width: '100%', maxWidth: '400px' }}
                  constraints={{
                    video: { facingMode: "environment" }
                  }}
                />
              </div>
            )}

            <form onSubmit={handleScan} className="flex gap-4">
              <Input
                type="text"
                value={scanCode}
                onChange={(e) => setScanCode(e.target.value)}
                placeholder="Clique aqui e escaneie o QR Code ou digite o CPF"
                className="flex-1"
                autoFocus={!showScanner}
              />
              <Button
                type="submit"
              >
                Validar
              </Button>
            </form>
            {scanStatus && (
              <div className={clsx(
                "mt-4 p-4 rounded-md",
                scanStatus.type === 'success' ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"
              )}>
                {scanStatus.type === 'success' ? <UserCheck className="inline w-5 h-5 mr-2"/> : <UserX className="inline w-5 h-5 mr-2"/>}
                {scanStatus.message}
              </div>
            )}
          </Card>

          <Card className="border-l-4 border-blue-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Total Inscritos</p>
                <p className="text-3xl font-bold text-gray-900">{stats.total}</p>
              </div>
              <Users className="w-8 h-8 text-blue-500 opacity-50" />
            </div>
          </Card>
          <Card className="border-l-4 border-green-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Presentes</p>
                <p className="text-3xl font-bold text-gray-900">{stats.present}</p>
              </div>
              <UserCheck className="w-8 h-8 text-green-500 opacity-50" />
            </div>
          </Card>
          <Card className="border-l-4 border-red-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Faltantes</p>
                <p className="text-3xl font-bold text-gray-900">{stats.absent}</p>
              </div>
              <UserX className="w-8 h-8 text-red-500 opacity-50" />
            </div>
          </Card>
        </div>

        {/* Filters & Search */}
        <Card className="flex flex-col md:flex-row gap-4 justify-between items-center" padding="sm">
          <div className="relative w-full md:w-96">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text"
              className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              placeholder="Buscar por nome ou CPF..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="flex gap-2 w-full md:w-auto">
            <button 
              onClick={() => setFilter('all')}
              className={clsx("px-4 py-2 rounded-md text-sm font-medium transition-colors flex-1 md:flex-none", 
                filter === 'all' ? "bg-gray-900 text-white" : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              )}
            >
              Todos
            </button>
            <button 
              onClick={() => setFilter('present')}
              className={clsx("px-4 py-2 rounded-md text-sm font-medium transition-colors flex-1 md:flex-none", 
                filter === 'present' ? "bg-green-600 text-white" : "bg-green-50 text-green-700 hover:bg-green-100"
              )}
            >
              Presentes
            </button>
            <button 
              onClick={() => setFilter('absent')}
              className={clsx("px-4 py-2 rounded-md text-sm font-medium transition-colors flex-1 md:flex-none", 
                filter === 'absent' ? "bg-red-600 text-white" : "bg-red-50 text-red-700 hover:bg-red-100"
              )}
            >
              Faltantes
            </button>
          </div>
        </Card>

        {/* List */}
        <Card padding="none">
          <ul className="divide-y divide-gray-200">
            {filteredList.length === 0 ? (
              <li className="p-8 text-center text-gray-500">
                {events.length === 0 ? 'Cadastre um evento primeiro.' : 'Nenhum participante encontrado neste evento.'}
              </li>
            ) : (
              filteredList.map((reg) => (
                <li key={reg.id} className="p-4 hover:bg-gray-50 transition-colors flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <p className="text-lg font-medium text-gray-900 truncate">{reg.attendee?.full_name}</p>
                    <div className="flex items-center text-sm text-gray-500 gap-4">
                      <span>CPF: {formatCPF(reg.attendee?.cpf || '')}</span>
                      <span className="hidden sm:inline">|</span>
                      <span className="hidden sm:inline">Tel: {reg.attendee?.phone}</span>
                    </div>
                  </div>
                  <div className="ml-4 flex-shrink-0">
                    <button
                      onClick={() => toggleCheckIn(reg.id, reg.checked_in)}
                      className={clsx(
                        "relative inline-flex flex-shrink-0 h-8 w-16 border-2 border-transparent rounded-full cursor-pointer transition-colors ease-in-out duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500",
                        reg.checked_in ? 'bg-green-600' : 'bg-gray-200'
                      )}
                    >
                      <span className="sr-only">Use setting</span>
                      <span
                        aria-hidden="true"
                        className={clsx(
                          "pointer-events-none inline-block h-7 w-7 rounded-full bg-white shadow transform ring-0 transition ease-in-out duration-200",
                          reg.checked_in ? 'translate-x-8' : 'translate-x-0'
                        )}
                      />
                    </button>
                  </div>
                </li>
              ))
            )}
          </ul>
        </Card>
      </div>
    </div>
  )
}
