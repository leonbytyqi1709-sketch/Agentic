import { useEffect } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from './store/authStore.js'
import ProtectedRoute from './components/ProtectedRoute.js'
import Toaster from './components/ui/Toaster.js'
import CommandPalette from './components/CommandPalette.js'
import ShortcutsHelp from './components/ShortcutsHelp.js'
import { useGlobalShortcuts } from './hooks/useGlobalShortcuts.js'
import Login from './pages/Login.js'
import Register from './pages/Register.js'
import ForgotPassword from './pages/ForgotPassword.js'
import ResetPassword from './pages/ResetPassword.js'
import Dashboard from './pages/Dashboard.js'
import Clients from './pages/Clients.js'
import ClientDetail from './pages/ClientDetail.js'
import Projects from './pages/Projects.js'
import ProjectDetail from './pages/ProjectDetail.js'
import Invoices from './pages/Invoices.js'
import InvoiceDetail from './pages/InvoiceDetail.js'
import Reports from './pages/Reports.js'
import Expenses from './pages/Expenses.js'
import Templates from './pages/Templates.js'
import Calendar from './pages/Calendar.js'
import Tasks from './pages/Tasks.js'
import Notes from './pages/Notes.js'
import Inbox from './pages/Inbox.js'
import PublicInvoice from './pages/PublicInvoice.js'
import Settings from './pages/Settings.js'

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
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
        <Route path="/clients" element={<ProtectedRoute><Clients /></ProtectedRoute>} />
        <Route path="/clients/:id" element={<ProtectedRoute><ClientDetail /></ProtectedRoute>} />
        <Route path="/projects" element={<ProtectedRoute><Projects /></ProtectedRoute>} />
        <Route path="/projects/:id" element={<ProtectedRoute><ProjectDetail /></ProtectedRoute>} />
        <Route path="/invoices" element={<ProtectedRoute><Invoices /></ProtectedRoute>} />
        <Route path="/invoices/:id" element={<ProtectedRoute><InvoiceDetail /></ProtectedRoute>} />
        <Route path="/reports" element={<ProtectedRoute><Reports /></ProtectedRoute>} />
        <Route path="/expenses" element={<ProtectedRoute><Expenses /></ProtectedRoute>} />
        <Route path="/templates" element={<ProtectedRoute><Templates /></ProtectedRoute>} />
        <Route path="/calendar" element={<ProtectedRoute><Calendar /></ProtectedRoute>} />
        <Route path="/tasks" element={<ProtectedRoute><Tasks /></ProtectedRoute>} />
        <Route path="/notes" element={<ProtectedRoute><Notes /></ProtectedRoute>} />
        <Route path="/inbox" element={<ProtectedRoute><Inbox /></ProtectedRoute>} />
        <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
        <Route path="/i/:token" element={<PublicInvoice />} />
      </Routes>
      <Toaster />
      {user && <CommandPalette />}
      {user && <ShortcutsHelp />}
    </>
  )
}
