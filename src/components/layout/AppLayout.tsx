import { useState } from 'react'
import type { ReactNode } from 'react'
import Sidebar from './Sidebar.js'
import Topbar from './Topbar.js'

export interface AppLayoutProps {
  title: string
  children?: ReactNode
}

export default function AppLayout({ title, children }: AppLayoutProps) {
  const [mobileOpen, setMobileOpen] = useState<boolean>(false)

  return (
    <div className="flex h-screen bg-background text-text overflow-hidden">
      {/* Desktop sidebar */}
      <div className="hidden lg:flex h-full">
        <Sidebar />
      </div>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm animate-fade-in"
            onClick={() => setMobileOpen(false)}
          />
          <div className="relative animate-slide-in">
            <Sidebar onClose={() => setMobileOpen(false)} />
          </div>
        </div>
      )}

      <div className="flex-1 flex flex-col min-w-0 relative">
        <Topbar title={title} onMenu={() => setMobileOpen(true)} />
        <main className="flex-1 overflow-y-auto overflow-x-hidden p-6 lg:p-8">
          <div className="animate-fade-in">{children}</div>
        </main>
      </div>
    </div>
  )
}
