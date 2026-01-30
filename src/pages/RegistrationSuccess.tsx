import { useLocation, Link } from 'react-router-dom'
import QRCode from 'react-qr-code'
import { CheckCircle } from 'lucide-react'
import { Card } from '../components/ui/Card'
import { Button } from '../components/ui/Button'

export default function RegistrationSuccess() {
  const location = useLocation()
  const { attendee, events } = location.state || {}

  if (!attendee) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900">Dados não encontrados</h2>
          <Link to="/" className="text-indigo-600 hover:text-indigo-500 mt-4 block">
            Voltar para o início
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8 pb-24">
      <div className="max-w-md mx-auto">
        <Card className="text-center">
          <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100 mb-4">
            <CheckCircle className="h-6 w-6 text-green-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Inscrição Confirmada!</h2>
          <p className="text-gray-600 mb-6">
            Obrigado, {attendee.full_name}. Sua inscrição foi realizada com sucesso.
          </p>

          <div className="bg-gray-50 p-6 rounded-lg mb-6 flex flex-col items-center">
            <p className="text-sm text-gray-500 mb-4">Apresente este QR Code no check-in</p>
            <div className="bg-white p-4 rounded shadow-sm">
              <QRCode value={attendee.cpf} size={180} />
            </div>
            <p className="text-xs text-gray-400 mt-2">CPF: {attendee.cpf}</p>
          </div>

          <div className="text-left border-t border-gray-200 pt-4">
            <h3 className="text-sm font-medium text-gray-900 mb-2">Eventos Selecionados:</h3>
            <ul className="space-y-2">
              {events.map((event: any) => (
                <li key={event.id} className="text-sm text-gray-600 flex justify-between">
                  <span>{event.title}</span>
                  <span className="text-gray-400">{new Date(event.date).toLocaleDateString()}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="mt-8">
            <Link to="/">
              <Button fullWidth>
                Nova Inscrição
              </Button>
            </Link>
          </div>
        </Card>
      </div>
    </div>
  )
}
