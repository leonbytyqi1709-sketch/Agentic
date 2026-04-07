import { useEffect } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from './store/authStore.js'
import ProtectedRoute from './components/ProtectedRoute.jsx'
import Toaster from './components/ui/Toaster.jsx'
import CommandPalette from './components/CommandPalette.jsx'
import { useGlobalShortcuts } from './hooks/useGlobalShortcuts.js'
import Login from './pages/Login.jsx'
import Register from './pages/Register.jsx'
import Dashboard from './pages/Dashboard.jsx'
import Clients from './pages/Clients.jsx'
import ClientDetail from './pages/ClientDetail.jsx'
import Projects from './pages/Projects.jsx'
import ProjectDetail from './pages/ProjectDetail.jsx'
import Invoices from './pages/Invoices.jsx'
import InvoiceDetail from './pages/InvoiceDetail.jsx'
import Reports from './pages/Reports.jsx'
import Expenses from './pages/Expenses.jsx'
import Recurring from './pages/Recurring.jsx'
import Templates from './pages/Templates.jsx'
import Calendar from './pages/Calendar.jsx'
import PublicInvoice from './pages/PublicInvoice.jsx'
import Settings from './pages/Settings.jsx'

export default function App() {
  const init = useAuthStore((s) => s.init)
  const user = useAuthStore((s) => s.user)
  useGlobalShortcuts()

  useEffect(() => {
    init()
  }, [init])

  return (
    <>
      <Routes>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
        <Route path="/clients" element={<ProtectedRoute><Clients /></ProtectedRoute>} />
        <Route path="/clients/:id" element={<ProtectedRoute><ClientDetail /></ProtectedRoute>} />
        <Route path="/projects" element={<ProtectedRoute><Projects /></ProtectedRoute>} />
        <Route path="/projects/:id" element={<ProtectedRoute><ProjectDetail /></ProtectedRoute>} />
        <Route path="/invoices" element={<ProtectedRoute><Invoices /></ProtectedRoute>} />
        <Route path="/invoices/:id" element={<ProtectedRoute><InvoiceDetail /></ProtectedRoute>} />
        <Route path="/reports" element={<ProtectedRoute><Reports /></ProtectedRoute>} />
        <Route path="/expenses" element={<ProtectedRoute><Expenses /></ProtectedRoute>} />
        <Route path="/recurring" element={<ProtectedRoute><Recurring /></ProtectedRoute>} />
        <Route path="/templates" element={<ProtectedRoute><Templates /></ProtectedRoute>} />
        <Route path="/calendar" element={<ProtectedRoute><Calendar /></ProtectedRoute>} />
        <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
        <Route path="/i/:token" element={<PublicInvoice />} />
      </Routes>
      <Toaster />
      {user && <CommandPalette />}
    </>
  )
}
