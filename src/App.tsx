import React from 'react'
import { BrowserRouter as Router, Routes, Route, Link, Navigate, useLocation } from 'react-router-dom'
import Register from './pages/Register'
import Admin from './pages/Admin'
import AdminEvents from './pages/AdminEvents'
import Login from './pages/Login'
import ParticipantLogin from './pages/ParticipantLogin'
import ParticipantDashboard from './pages/ParticipantDashboard'
import RegistrationSuccess from './pages/RegistrationSuccess'
import EventCheckin from './pages/EventCheckin'
import KioskCheckin from './pages/KioskCheckin'
import { ClipboardList, Calendar, Users, LogOut, User, CheckCircle } from 'lucide-react'
import { AuthProvider, useAuth } from './context/AuthContext'
import { Toaster } from 'sonner'
import CertificateValidation from './pages/CertificateValidation'

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated, loading } = useAuth()
  
  if (loading) return <div className="flex items-center justify-center min-h-screen text-indigo-600">Carregando...</div>

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }
  return <>{children}</>
}

/* 
const BottomNavigation = () => {
  const { isAuthenticated, logout } = useAuth()
  const location = useLocation()

  const isActive = (path: string) => location.pathname === path

  const linkClass = (path: string) => 
    `flex flex-col items-center justify-center w-full h-full transition-colors ${
      isActive(path) ? 'text-indigo-600' : 'text-gray-500 hover:text-indigo-600'
    }`

  return (
    <div className="sm:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 flex justify-around items-center h-16 z-50 px-1 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)] pb-safe">
       <Link to="/" className={linkClass('/')}>
         <ClipboardList className="w-6 h-6" />
         <span className="text-[10px] mt-1 font-medium">Registro</span>
       </Link>
       <Link to="/validate" className={linkClass('/validate')}>
         <CheckCircle className="w-6 h-6" />
         <span className="text-[10px] mt-1 font-medium">Validar</span>
       </Link>
       <Link to="/participant" className={linkClass('/participant')}>
         <User className="w-6 h-6" />
         <span className="text-[10px] mt-1 font-medium">Perfil</span>
       </Link>
       {isAuthenticated && (
         <>
            <Link to="/admin" className={linkClass('/admin')}>
                <Users className="w-6 h-6" />
                <span className="text-[10px] mt-1 font-medium">Check-in</span>
            </Link>
            <Link to="/admin/events" className={linkClass('/admin/events')}>
                <Calendar className="w-6 h-6" />
                <span className="text-[10px] mt-1 font-medium">Eventos</span>
            </Link>
            <button onClick={logout} className="flex flex-col items-center justify-center w-full h-full text-gray-500 hover:text-red-600 active:text-red-600 transition-colors">
                <LogOut className="w-6 h-6" />
                <span className="text-[10px] mt-1 font-medium">Sair</span>
            </button>
         </>
       )}
    </div>
  )
}
*/

const Navigation = () => {
  const { isAuthenticated, logout } = useAuth()
  const location = useLocation()

  const isActive = (path: string) => location.pathname === path
  
  const linkClass = (path: string) =>
    `inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium transition-colors ${
      isActive(path) 
        ? 'border-indigo-500 text-gray-900' 
        : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
    }`

  return (
    <nav className="bg-white shadow-sm sticky top-0 z-40 hidden sm:block">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex">
            <div className="flex-shrink-0 flex items-center">
              <ClipboardList className="h-8 w-8 text-indigo-600" />
              <span className="ml-2 text-xl font-bold text-gray-900">CheckIn Pro</span>
            </div>
            <div className="hidden sm:ml-6 sm:flex sm:space-x-8">
              <Link to="/" className={linkClass('/')}>
                Registro
              </Link>
              <Link to="/validate" className={linkClass('/validate')}>
                <CheckCircle className="w-4 h-4 mr-1"/> Validar Certificado
              </Link>
              <Link to="/participant" className={linkClass('/participant')}>
                <User className="w-4 h-4 mr-1"/> Área do Participante
              </Link>
              {isAuthenticated && (
                <>
                  <Link to="/admin" className={linkClass('/admin')}>
                    <Users className="w-4 h-4 mr-1"/> Check-in
                  </Link>
                  <Link to="/admin/events" className={linkClass('/admin/events')}>
                    <Calendar className="w-4 h-4 mr-1"/> Eventos
                  </Link>
                </>
              )}
            </div>
          </div>
          
          <div className="hidden sm:flex sm:items-center">
            {isAuthenticated && (
              <button
                onClick={logout}
                className="text-gray-500 hover:text-red-600 p-2 rounded-md transition-colors"
                title="Sair"
              >
                <LogOut className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>
      </div>
    </nav>
  )
}

function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="min-h-screen bg-gray-50 flex flex-col">
          <Toaster richColors position="top-right" />
          <Navigation />
          <main className="flex-1 sm:pb-0">
            <Routes>
              <Route path="/" element={<Register />} />
              <Route path="/participant" element={<ParticipantLogin />} />
              <Route path="/participant/dashboard" element={<ParticipantDashboard />} />
              <Route path="/success" element={<RegistrationSuccess />} />
              <Route path="/event/:id/checkin" element={<EventCheckin />} />
              <Route path="/kiosk/:id" element={<KioskCheckin />} />
              <Route path="/validate" element={<CertificateValidation />} />
              <Route path="/login" element={<Login />} />
              <Route path="/admin" element={
                <ProtectedRoute>
                  <Admin />
                </ProtectedRoute>
              } />
              <Route path="/admin/events" element={
                <ProtectedRoute>
                  <AdminEvents />
                </ProtectedRoute>
              } />
            </Routes>
          </main>
          {/* <BottomNavigation /> - Ocultado para modo Kiosk */}
          
          <footer className="bg-white border-t border-gray-200 mt-auto hidden sm:block">
            <div className="max-w-7xl mx-auto py-6 px-4 overflow-hidden sm:px-6 lg:px-8">
              <p className="mt-1 text-center text-base text-gray-400">
                &copy; 2024 CheckIn Pro. All rights reserved.
              </p>
            </div>
          </footer>
        </div>
      </Router>
    </AuthProvider>
  )
}

export default App
