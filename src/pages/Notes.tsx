import { useEffect, useState } from 'react'
import { Plus, Pin, PinOff, Trash2, StickyNote } from 'lucide-react'
import AppLayout from '../components/layout/AppLayout.js'
import EmptyState from '../components/ui/EmptyState.js'
import { useNotes } from '../hooks/useNotes.js'
import { toast } from '../store/toastStore.js'
import { cn } from '../lib/cn.js'
import type { Note, NoteColor } from '../types'

const COLORS: { id: NoteColor; bg: string; border: string; dot: string }[] = [
  { id: 'primary', bg: 'bg-primary/[0.06]', border: 'border-primary/20', dot: 'bg-primary' },
  { id: 'success', bg: 'bg-success/[0.06]', border: 'border-success/20', dot: 'bg-success' },
  { id: 'warning', bg: 'bg-warning/[0.06]', border: 'border-warning/20', dot: 'bg-warning' },
  { id: 'info', bg: 'bg-info/[0.06]', border: 'border-info/20', dot: 'bg-info' },
  { id: 'neutral', bg: 'bg-white/[0.04]', border: 'border-white/[0.08]', dot: 'bg-text/40' },
]

function colorOf(c: NoteColor) {
  return COLORS.find((x) => x.id === c) ?? COLORS[0]
}

export default function Notes() {
  const { notes, loading, createNote, updateNote, deleteNote, togglePin } = useNotes()
  const [activeId, setActiveId] = useState<string | null>(null)
  const [draftTitle, setDraftTitle] = useState('')
  const [draftContent, setDraftContent] = useState('')

  const active = notes.find((n) => n.id === activeId) || null

  useEffect(() => {
    if (!activeId && notes.length > 0) {
      setActiveId(notes[0].id)
    }
  }, [notes, activeId])

  useEffect(() => {
    if (active) {
      setDraftTitle(active.title)
      setDraftContent(active.content)
    } else {
      setDraftTitle('')
      setDraftContent('')
    }
  }, [active?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  // Debounced save
  useEffect(() => {
    if (!active) return
    if (draftTitle === active.title && draftContent === active.content) return
    const timer = setTimeout(() => {
      updateNote(active.id, { title: draftTitle, content: draftContent }).catch((e) =>
        toast.error((e as Error).message)
      )
    }, 600)
    return () => clearTimeout(timer)
  }, [draftTitle, draftContent, active, updateNote])

  async function handleCreate() {
    try {
      const n = await createNote({ title: 'Untitled', content: '' })
      setActiveId(n.id)
    } catch (e) {
      toast.error((e as Error).message)
    }
  }

  async function handleDelete(n: Note) {
    if (!confirm('Delete this note?')) return
    await deleteNote(n.id)
    if (activeId === n.id) setActiveId(null)
    toast.info('Note deleted')
  }

  async function handleColor(c: NoteColor) {
    if (!active) return
    await updateNote(active.id, { color: c })
  }

  return (
    <AppLayout title="Notes">
      <div className="grid grid-cols-1 lg:grid-cols-[300px_1fr] gap-4 h-[calc(100vh-180px)] min-h-[500px]">
        {/* Left: list */}
        <div className="card p-3 flex flex-col gap-2 overflow-hidden">
          <button
            onClick={handleCreate}
            className="h-10 px-4 rounded-lg bg-primary text-white text-sm font-semibold hover:bg-primary-dark active:scale-95 transition-all flex items-center justify-center gap-2 shrink-0"
          >
            <Plus className="w-4 h-4" />
            New Note
          </button>
          <div className="flex-1 overflow-y-auto -mx-1 px-1 flex flex-col gap-1">
            {loading ? (
              <div className="text-center text-text/40 text-xs py-6">Loading…</div>
            ) : notes.length === 0 ? (
              <div className="text-center text-text/40 text-xs py-6">No notes yet</div>
            ) : (
              notes.map((n) => {
                const c = colorOf(n.color)
                const isActive = n.id === activeId
                return (
                  <button
                    key={n.id}
                    onClick={() => setActiveId(n.id)}
                    className={cn(
                      'group text-left p-3 rounded-lg border transition-all relative',
                      isActive
                        ? `${c.bg} ${c.border}`
                        : 'bg-white/[0.02] border-white/[0.05] hover:bg-white/[0.04]'
                    )}
                  >
                    <div className="flex items-start gap-2">
                      <span className={cn('w-1.5 h-1.5 rounded-full mt-1.5 shrink-0', c.dot)} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1">
                          {n.pinned && <Pin className="w-3 h-3 text-warning shrink-0" />}
                          <div className="text-sm font-semibold truncate text-text">
                            {n.title || 'Untitled'}
                          </div>
                        </div>
                        <div className="text-[11px] text-text/40 truncate mt-0.5">
                          {n.content || 'Empty'}
                        </div>
                        <div className="text-[10px] text-text/30 mt-1">
                          {new Date(n.updated_at).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                  </button>
                )
              })
            )}
          </div>
        </div>

        {/* Right: editor */}
        <div className="card p-6 flex flex-col overflow-hidden">
          {!active ? (
            <EmptyState
              icon={StickyNote}
              title="No note selected"
              description="Pick a note from the list or create a new one."
            />
          ) : (
            <>
              <div className="flex items-center gap-2 mb-4 flex-wrap">
                <div className="flex items-center gap-1">
                  {COLORS.map((c) => (
                    <button
                      key={c.id}
                      onClick={() => handleColor(c.id)}
                      className={cn(
                        'w-5 h-5 rounded-full border transition-all',
                        c.dot,
                        active.color === c.id
                          ? 'ring-2 ring-offset-2 ring-offset-surface ring-white/40 scale-110'
                          : 'opacity-60 hover:opacity-100'
                      )}
                    />
                  ))}
                </div>
                <div className="flex-1" />
                <button
                  onClick={() => togglePin(active.id)}
                  className="h-9 px-3 rounded-lg bg-white/[0.04] border border-white/[0.08] text-xs font-semibold hover:bg-white/[0.08] flex items-center gap-1.5 transition-all"
                >
                  {active.pinned ? (
                    <>
                      <PinOff className="w-3.5 h-3.5" /> Unpin
                    </>
                  ) : (
                    <>
                      <Pin className="w-3.5 h-3.5" /> Pin
                    </>
                  )}
                </button>
                <button
                  onClick={() => handleDelete(active)}
                  className="h-9 px-3 rounded-lg bg-danger-bg border border-danger/20 text-danger text-xs font-semibold hover:bg-danger/10 flex items-center gap-1.5 transition-all"
                >
                  <Trash2 className="w-3.5 h-3.5" /> Delete
                </button>
              </div>
              <input
                type="text"
                value={draftTitle}
                onChange={(e) => setDraftTitle(e.target.value)}
                placeholder="Title"
                className="w-full bg-transparent text-2xl font-bold tracking-tight text-text mb-3 focus:outline-none placeholder:text-text/30"
              />
              <textarea
                value={draftContent}
                onChange={(e) => setDraftContent(e.target.value)}
                placeholder="Start writing…"
                className="flex-1 w-full bg-transparent text-sm text-text/85 leading-relaxed resize-none focus:outline-none placeholder:text-text/30"
              />
              <div className="text-[10px] text-text/30 mt-2">
                Auto-saved · last update {new Date(active.updated_at).toLocaleTimeString()}
              </div>
            </>
          )}
        </div>
      </div>
    </AppLayout>
  )
}
