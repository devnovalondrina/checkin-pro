import React, { useState } from 'react'
import { useForm } from 'react-hook-form'
import { useNavigate, Link, useLocation } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { formatCPF, cleanCPF } from '../utils/format'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { Card } from '../components/ui/Card'

interface LoginForm {
  cpf: string
}

export default function ParticipantLogin() {
  const { register, handleSubmit, formState: { errors }, setValue, watch, setError } = useForm<LoginForm>()
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()
  const location = useLocation()

  const cpfValue = watch('cpf')

  React.useEffect(() => {
    if (cpfValue) setValue('cpf', formatCPF(cpfValue))
  }, [cpfValue, setValue])

  // Auto-login if CPF is provided via state
  React.useEffect(() => {
    if (location.state?.cpf) {
      const cpf = location.state.cpf
      setValue('cpf', formatCPF(cpf))
      // Trigger login automatically
      onSubmit({ cpf })
    }
  }, [location.state, setValue])

  const onSubmit = async (data: LoginForm) => {
    setLoading(true)
    try {
      const cleanedCPF = cleanCPF(data.cpf)
      
      const { data: attendee, error } = await supabase
        .from('attendees')
        .select('*')
        .eq('cpf', cleanedCPF)
        .single()

      if (error || !attendee) {
        setError('cpf', { message: 'CPF não encontrado. Faça seu cadastro primeiro.' })
        return
      }

      navigate('/participant/dashboard', { state: { attendee } })
    } catch (error) {
      console.error('Error login:', error)
      setError('cpf', { message: 'Erro ao acessar o sistema.' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4 pb-24">
      <Card className="max-w-md w-full" padding="lg">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Área do Participante</h1>
          <p className="text-gray-600 mt-2">Informe seu CPF para gerenciar suas inscrições</p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div>
            <Input
              id="cpf"
              label="CPF"
              {...register('cpf', { required: 'CPF é obrigatório', minLength: { value: 14, message: 'CPF inválido' } })}
              placeholder="000.000.000-00"
              error={errors.cpf?.message}
            />
          </div>

          <Button
            type="submit"
            fullWidth
            isLoading={loading}
          >
            Acessar
          </Button>

          <div className="text-center mt-4">
            <Link to="/" className="text-sm text-indigo-600 hover:text-indigo-500">
              Não tem cadastro? Inscreva-se aqui
            </Link>
          </div>
        </form>
      </Card>
    </div>
  )
}
