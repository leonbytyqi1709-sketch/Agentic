import { useState } from 'react'
import type { ReactNode } from 'react'
import Sidebar from './Sidebar.js'
import Topbar from './Topbar.js'

export interface AppLayoutProps {
  title: string
  children?: ReactNode
}

export default function AppLayout({ title, children }: AppLayoutProps) {
  const [menuOpen, setMenuOpen] = useState<boolean>(false)

  return (
    <div className="flex h-screen bg-background text-text overflow-hidden">
      {/* Slide-in sidebar drawer (all screens) */}
      {menuOpen && (
        <div className="fixed inset-0 z-50 flex">
          <div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm animate-fade-in"
            onClick={() => setMenuOpen(false)}
          />
          <div className="relative animate-slide-in">
            <Sidebar onClose={() => setMenuOpen(false)} />
          </div>
        </div>
      )}

      <div className="flex-1 flex flex-col min-w-0 relative">
        <Topbar title={title} onMenu={() => setMenuOpen(true)} />
        <main className="flex-1 overflow-y-auto overflow-x-hidden p-6 lg:p-8">
          <div className="animate-fade-in">{children}</div>
        </main>
      </div>
    </div>
  )
}
