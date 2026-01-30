
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { supabase } from '../lib/supabase'
import { CheckCircle2, XCircle, Search } from 'lucide-react'
import { Card } from '../components/ui/Card'
import { Input } from '../components/ui/Input'
import { Button } from '../components/ui/Button'

interface ValidationForm {
  code: string
}

export default function CertificateValidation() {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)
  
  const { register, handleSubmit, formState: { errors } } = useForm<ValidationForm>()

  const onVerify = async (data: ValidationForm) => {
    setLoading(true)
    setResult(null)
    setError(null)
    
    try {
      const { data: registration, error } = await supabase
        .from('registrations')
        .select(`
          certificate_code,
          checkin_time,
          attendee:attendees (full_name, cpf),
          event:events (title, date, workload)
        `)
        .eq('certificate_code', data.code)
        .single()

      if (error || !registration) {
        setError('Certificado não encontrado ou código inválido.')
      } else {
        setResult(registration)
      }
    } catch (err) {
      setError('Erro ao verificar certificado. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-[100dvh] bg-gray-50 flex flex-col items-center justify-center p-4 pb-24">
      <div className="max-w-md w-full">
        <div className="bg-indigo-600 p-6 rounded-t-lg text-center shadow-lg">
          <h1 className="text-2xl font-bold text-white">Validar Certificado</h1>
          <p className="text-indigo-100 mt-2">Digite o código para verificar a autenticidade</p>
        </div>
        
        <Card className="rounded-t-none border-t-0">
          <form onSubmit={handleSubmit(onVerify)} className="space-y-4">
            <Input
              label="Código do Certificado"
              {...register('code', { required: 'Código é obrigatório' })}
              placeholder="Ex: 123456/2024"
              error={errors.code?.message}
              icon={<Search className="h-5 w-5 text-gray-400" />}
            />

            <Button
              type="submit"
              isLoading={loading}
              fullWidth
            >
              Verificar
            </Button>
          </form>

          {result && (
            <div className="mt-6 bg-green-50 border border-green-200 rounded-md p-4 animate-fade-in">
              <div className="flex items-center mb-3">
                <CheckCircle2 className="h-6 w-6 text-green-600 mr-2" />
                <h3 className="text-lg font-medium text-green-900">Certificado Válido</h3>
              </div>
              <div className="space-y-2 text-sm text-green-800">
                <p><span className="font-bold">Participante:</span> {result.attendee.full_name}</p>
                <p><span className="font-bold">CPF:</span> {result.attendee.cpf}</p>
                <p><span className="font-bold">Evento:</span> {result.event.title}</p>
                <p><span className="font-bold">Data:</span> {new Date(result.event.date).toLocaleDateString()}</p>
                {result.event.workload > 0 && (
                  <p><span className="font-bold">Carga Horária:</span> {result.event.workload} horas</p>
                )}
              </div>
            </div>
          )}

          {error && (
            <div className="mt-6 bg-red-50 border border-red-200 rounded-md p-4 animate-fade-in">
              <div className="flex items-center mb-2">
                <XCircle className="h-5 w-5 text-red-600 mr-2" />
                <h3 className="text-sm font-medium text-red-800">Inválido</h3>
              </div>
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}
          
          <div className="mt-6 pt-4 border-t border-gray-100 text-center">
            <a href="/" className="text-sm text-indigo-600 hover:text-indigo-500 font-medium">
              Voltar para o início
            </a>
          </div>
        </Card>
      </div>
    </div>
  )
}
