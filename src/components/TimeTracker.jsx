import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Play, Square, Trash2, Clock, FileText } from 'lucide-react'
import { useTimeEntries } from '../hooks/useTimeEntries.js'
import { useInvoices } from '../hooks/useInvoices.js'
import { useProfile } from '../hooks/useProfile.js'
import { toast } from '../store/toastStore.js'
import Button from './ui/Button.jsx'

const STORAGE_KEY = 'cp-timer'

function formatDuration(seconds) {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

export default function TimeTracker({ projectId, project }) {
  const navigate = useNavigate()
  const { entries, createEntry, deleteEntry, totalSeconds } = useTimeEntries(projectId)
  const { createInvoice } = useInvoices()
  const { profile } = useProfile()
  const [generating, setGenerating] = useState(false)
  const [description, setDescription] = useState('')
  const [running, setRunning] = useState(false)
  const [startedAt, setStartedAt] = useState(null)
  const [elapsed, setElapsed] = useState(0)
  const tickRef = useRef(null)

  // Restore running timer from localStorage
  useEffect(() => {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return
    try {
      const saved = JSON.parse(raw)
      if (saved.projectId === projectId) {
        setRunning(true)
        setStartedAt(saved.startedAt)
        setDescription(saved.description || '')
      }
    } catch {}
  }, [projectId])

  useEffect(() => {
    if (!running || !startedAt) return
    const tick = () => {
      setElapsed(Math.floor((Date.now() - new Date(startedAt).getTime()) / 1000))
    }
    tick()
    tickRef.current = setInterval(tick, 1000)
    return () => clearInterval(tickRef.current)
  }, [running, startedAt])

  function start() {
    const now = new Date().toISOString()
    setRunning(true)
    setStartedAt(now)
    setElapsed(0)
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ projectId, startedAt: now, description })
    )
  }

  async function stop() {
    const endedAt = new Date().toISOString()
    const duration = Math.floor((new Date(endedAt).getTime() - new Date(startedAt).getTime()) / 1000)
    try {
      await createEntry({
        project_id: projectId,
        description: description.trim() || null,
        started_at: startedAt,
        ended_at: endedAt,
        duration_seconds: duration,
      })
      toast.success(`Logged ${formatDuration(duration)}`)
    } catch (err) {
      toast.error(err.message)
    }
    setRunning(false)
    setStartedAt(null)
    setElapsed(0)
    setDescription('')
    localStorage.removeItem(STORAGE_KEY)
  }

  async function remove(id) {
    try {
      await deleteEntry(id)
    } catch (err) {
      toast.error(err.message)
    }
  }

  async function generateInvoice() {
    const rate = Number(profile?.hourly_rate || 0)
    if (!rate) {
      toast.error('Set your hourly rate in Settings first')
      return
    }
    if (entries.length === 0) {
      toast.error('No time entries to invoice')
      return
    }
    setGenerating(true)
    try {
      const hours = totalSeconds / 3600
      const items = [
        {
          description: `${project?.name || 'Project'} — tracked hours`,
          quantity: Number(hours.toFixed(2)),
          unit_price: rate,
        },
      ]
      const inv = await createInvoice(
        {
          client_id: project?.client_id || null,
          project_id: projectId,
          status: 'draft',
          issue_date: new Date().toISOString().slice(0, 10),
          tax_rate: 19,
        },
        items
      )
      toast.success(`Invoice ${inv.number} created`)
      navigate(`/invoices/${inv.id}`)
    } catch (err) {
      toast.error(err.message)
    } finally {
      setGenerating(false)
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="bg-surface-2 rounded-xl border border-white/[0.06] shadow-card p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-semibold tracking-tight text-text">Time Tracker</h3>
            <p className="text-xs text-text/40">
              Total logged: {formatDuration(totalSeconds)}
            </p>
          </div>
          <Clock className="w-4 h-4 text-primary" />
        </div>
        <div className="flex items-center gap-3">
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="What are you working on?"
            disabled={running}
            className="flex-1 h-11 bg-white/5 border border-white/10 rounded-lg px-3.5 text-sm text-text placeholder:text-text/30 focus:border-primary/50 outline-none disabled:opacity-60"
          />
          {running ? (
            <div className="flex items-center gap-3">
              <div className="font-mono text-lg font-bold text-primary tabular-nums">
                {formatDuration(elapsed)}
              </div>
              <button
                onClick={stop}
                className="inline-flex items-center justify-center gap-2 h-11 px-5 rounded-lg bg-red-500 hover:bg-red-600 text-white text-sm font-semibold transition-colors"
              >
                <Square className="w-4 h-4" fill="currentColor" />
                Stop
              </button>
            </div>
          ) : (
            <button
              onClick={start}
              className="inline-flex items-center justify-center gap-2 h-11 px-5 rounded-lg bg-primary hover:bg-accent text-white text-sm font-semibold transition-colors shadow-glow-primary"
            >
              <Play className="w-4 h-4" fill="currentColor" />
              Start
            </button>
          )}
        </div>
      </div>

      <div className="bg-surface-2 rounded-xl border border-white/[0.06] shadow-card p-5">
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-sm font-semibold tracking-tight text-text">Entries</h4>
          {entries.length > 0 && (
            <Button variant="secondary" onClick={generateInvoice} disabled={generating}>
              <FileText className="w-3.5 h-3.5" />
              {generating ? 'Creating...' : 'Invoice time'}
            </Button>
          )}
        </div>
        {entries.length === 0 ? (
          <div className="text-sm text-text/40 py-6 text-center">No entries yet.</div>
        ) : (
          <div className="flex flex-col divide-y divide-white/[0.04]">
            {entries.map((e) => (
              <div
                key={e.id}
                className="flex items-center justify-between py-3 first:pt-0 last:pb-0 gap-3"
              >
                <div className="min-w-0 flex-1">
                  <div className="text-sm text-text truncate">
                    {e.description || 'Untitled session'}
                  </div>
                  <div className="text-xs text-text/40">
                    {new Date(e.started_at).toLocaleString('de-DE', {
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </div>
                </div>
                <div className="text-sm font-mono font-semibold text-text tabular-nums">
                  {formatDuration(e.duration_seconds || 0)}
                </div>
                <button
                  onClick={() => remove(e.id)}
                  className="text-text/40 hover:text-red-400 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
