import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Mail,
  MailOpen,
  RefreshCw,
  Search,
  Pin,
  PinOff,
  Reply,
  Send,
  X,
  Paperclip,
  Download,
  AlertCircle,
  Link2,
} from 'lucide-react'
import AppLayout from '../components/layout/AppLayout.js'
import EmptyState from '../components/ui/EmptyState.js'
import { useGmailStore } from '../store/gmailStore.js'
import { useClients } from '../hooks/useClients.js'
import { useProjects } from '../hooks/useProjects.js'
import { useEmailPins } from '../hooks/useEmailPins.js'
import {
  listMessages,
  getMessage,
  getHeader,
  extractBody,
  parseFromHeader,
  sendReply,
  getAttachment,
  decodeBase64UrlToBytes,
  hasGoogleClientId,
  type GmailMessage,
  type ExtractedBody,
} from '../lib/gmail.js'
import { toast } from '../store/toastStore.js'
import { cn } from '../lib/cn.js'
import type { EmailPinInsert } from '../types'

interface MessageListItem {
  id: string
  threadId: string
  subject: string
  fromName: string
  fromEmail: string
  snippet: string
  date: Date
  unread: boolean
}

export default function Inbox() {
  const { token, email, connect, connecting, ensureToken, hydrate } = useGmailStore()
  const { clients } = useClients()
  const { projects } = useProjects()
  const { pins, pinEmail, unpin, isPinned, fetch: fetchPins } = useEmailPins()

  const [query, setQuery] = useState('in:inbox')
  const [searchInput, setSearchInput] = useState('')
  const [messages, setMessages] = useState<MessageListItem[]>([])
  const [loadingList, setLoadingList] = useState(false)
  const [listError, setListError] = useState<string | null>(null)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [selectedMessage, setSelectedMessage] = useState<GmailMessage | null>(null)
  const [selectedBody, setSelectedBody] = useState<ExtractedBody | null>(null)
  const [loadingDetail, setLoadingDetail] = useState(false)
  const [replyOpen, setReplyOpen] = useState(false)
  const [replyBody, setReplyBody] = useState('')
  const [sending, setSending] = useState(false)
  const [pinModalOpen, setPinModalOpen] = useState(false)
  const [bodyMode, setBodyMode] = useState<'html' | 'text'>('html')

  useEffect(() => {
    hydrate()
  }, [hydrate])

  const refresh = useCallback(async () => {
    if (!token) return
    setLoadingList(true)
    setListError(null)
    try {
      const activeToken = await ensureToken()
      const res = await listMessages(activeToken, query, 30)
      const raw = res.messages || []
      // Fetch metadata for each in parallel (just headers)
      const details = await Promise.all(
        raw.map((m) => getMessage(activeToken, m.id))
      )
      const items: MessageListItem[] = details.map((m) => {
        const fromHeader = getHeader(m, 'From')
        const { name, email: fromEmail } = parseFromHeader(fromHeader)
        return {
          id: m.id,
          threadId: m.threadId,
          subject: getHeader(m, 'Subject') || '(no subject)',
          fromName: name || fromEmail,
          fromEmail,
          snippet: m.snippet,
          date: new Date(Number(m.internalDate)),
          unread: (m.labelIds || []).includes('UNREAD'),
        }
      })
      setMessages(items)
    } catch (e) {
      setListError((e as Error).message)
    } finally {
      setLoadingList(false)
    }
  }, [token, query, ensureToken])

  useEffect(() => {
    if (token) refresh()
  }, [token, refresh])

  const selectMessage = useCallback(
    async (id: string) => {
      setSelectedId(id)
      setSelectedMessage(null)
      setSelectedBody(null)
      setReplyOpen(false)
      setLoadingDetail(true)
      try {
        const activeToken = await ensureToken()
        const msg = await getMessage(activeToken, id)
        setSelectedMessage(msg)
        setSelectedBody(extractBody(msg))
      } catch (e) {
        toast.error((e as Error).message)
      } finally {
        setLoadingDetail(false)
      }
    },
    [ensureToken]
  )

  async function handleReply() {
    if (!selectedMessage || !replyBody.trim()) return
    setSending(true)
    try {
      const activeToken = await ensureToken()
      const from = getHeader(selectedMessage, 'From')
      const subject = getHeader(selectedMessage, 'Subject')
      const messageIdHeader = getHeader(selectedMessage, 'Message-ID')
      const referencesHeader = getHeader(selectedMessage, 'References')
      const { email: toEmail } = parseFromHeader(from)
      await sendReply(activeToken, {
        to: toEmail,
        subject: subject.toLowerCase().startsWith('re:') ? subject : `Re: ${subject}`,
        body: replyBody,
        threadId: selectedMessage.threadId,
        inReplyTo: messageIdHeader || undefined,
        references: [referencesHeader, messageIdHeader].filter(Boolean).join(' ') || undefined,
      })
      toast.success('Reply sent')
      setReplyOpen(false)
      setReplyBody('')
    } catch (e) {
      toast.error((e as Error).message)
    } finally {
      setSending(false)
    }
  }

  async function handlePin(payload: Omit<EmailPinInsert, 'gmail_message_id'>) {
    if (!selectedMessage) return
    const from = parseFromHeader(getHeader(selectedMessage, 'From'))
    try {
      await pinEmail({
        ...payload,
        gmail_message_id: selectedMessage.id,
        gmail_thread_id: selectedMessage.threadId,
        from_email: from.email,
        from_name: from.name,
        subject: getHeader(selectedMessage, 'Subject'),
        snippet: selectedMessage.snippet,
        message_date: new Date(Number(selectedMessage.internalDate)).toISOString(),
      })
      toast.success('Email pinned')
      setPinModalOpen(false)
    } catch (e) {
      toast.error((e as Error).message)
    }
  }

  async function handleUnpinSelected() {
    if (!selectedMessage) return
    const existing = pins.filter((p) => p.gmail_message_id === selectedMessage.id)
    for (const p of existing) await unpin(p.id)
    fetchPins()
    toast.info('Unpinned')
  }

  async function downloadAttachment(attId: string, filename: string) {
    if (!selectedMessage) return
    try {
      const activeToken = await ensureToken()
      const data = await getAttachment(activeToken, selectedMessage.id, attId)
      const bytes = decodeBase64UrlToBytes(data.data)
      // Cast to BlobPart
      const blob = new Blob([bytes as unknown as ArrayBuffer])
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = filename
      a.click()
      URL.revokeObjectURL(url)
    } catch (e) {
      toast.error((e as Error).message)
    }
  }

  function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    setQuery(searchInput || 'in:inbox')
  }

  const pinnedIds = useMemo(() => new Set(pins.map((p) => p.gmail_message_id)), [pins])

  // ==============================
  // Render states
  // ==============================

  if (!hasGoogleClientId()) {
    return (
      <AppLayout title="Inbox">
        <div className="card p-10 text-center max-w-2xl mx-auto">
          <div className="w-14 h-14 rounded-2xl bg-warning/10 border border-warning/30 flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-7 h-7 text-warning" />
          </div>
          <h2 className="text-xl font-bold tracking-tight text-text mb-2">
            Google Client ID missing
          </h2>
          <p className="text-sm text-text/60 mb-4">
            Add <code className="px-1.5 py-0.5 rounded bg-white/[0.06] text-primary">VITE_GOOGLE_CLIENT_ID</code> to
            your <code className="px-1.5 py-0.5 rounded bg-white/[0.06] text-primary">.env</code> file and restart the dev server.
          </p>
          <p className="text-xs text-text/40">
            See the Gmail integration setup guide for details.
          </p>
        </div>
      </AppLayout>
    )
  }

  if (!token) {
    return (
      <AppLayout title="Inbox">
        <div className="card p-10 text-center max-w-2xl mx-auto relative overflow-hidden">
          <div className="absolute -top-20 -right-20 w-64 h-64 bg-primary/10 rounded-full blur-3xl pointer-events-none" />
          <div className="relative">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-primary-dark flex items-center justify-center mx-auto mb-5 shadow-glow-primary">
              <Mail className="w-8 h-8 text-white" />
            </div>
            <h2 className="text-2xl font-bold tracking-tight text-text mb-2">
              Connect your Gmail
            </h2>
            <p className="text-sm text-text/60 mb-6 max-w-md mx-auto">
              Read messages, reply, and pin important emails to clients or projects — all without leaving ClientPulse.
            </p>
            {email && (
              <p className="text-xs text-text/40 mb-4">Last connected as {email}</p>
            )}
            <button
              onClick={() => connect().catch(() => {})}
              disabled={connecting}
              className="h-11 px-6 rounded-xl bg-primary text-white text-sm font-bold hover:bg-primary-dark active:scale-95 transition-all shadow-glow-primary inline-flex items-center gap-2 disabled:opacity-60"
            >
              <Mail className="w-4 h-4" />
              {connecting ? 'Connecting…' : 'Connect Gmail'}
            </button>
            <p className="text-[11px] text-text/40 mt-6 max-w-md mx-auto leading-relaxed">
              Tokens are kept in memory only. Re-consent may be required after ~1 hour of inactivity.
            </p>
          </div>
        </div>
      </AppLayout>
    )
  }

  return (
    <AppLayout title="Inbox">
      <div className="grid grid-cols-1 lg:grid-cols-[380px_1fr] gap-4 h-[calc(100vh-160px)] min-h-[500px]">
        {/* List */}
        <div className="card flex flex-col overflow-hidden">
          <div className="p-3 border-b border-white/[0.06] flex flex-col gap-2">
            <div className="flex items-center justify-between gap-2">
              <div className="text-xs text-text/50 truncate flex-1">
                <span className="text-text font-semibold">{email}</span>
              </div>
              <button
                onClick={refresh}
                disabled={loadingList}
                className="w-8 h-8 rounded-lg bg-white/[0.04] border border-white/[0.08] hover:bg-white/[0.08] flex items-center justify-center transition-all disabled:opacity-50"
                title="Refresh"
              >
                <RefreshCw className={cn('w-3.5 h-3.5', loadingList && 'animate-spin')} />
              </button>
            </div>
            <form onSubmit={handleSearch} className="flex items-center gap-1">
              <div className="flex-1 relative">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-text/40" />
                <input
                  type="text"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  placeholder="Search Gmail…"
                  className="w-full h-9 pl-9 pr-3 rounded-lg bg-white/[0.04] border border-white/[0.08] text-xs focus:outline-none focus:border-primary/40"
                />
              </div>
            </form>
            <div className="flex items-center gap-1 flex-wrap">
              {[
                { id: 'in:inbox', label: 'Inbox' },
                { id: 'is:unread', label: 'Unread' },
                { id: 'is:starred', label: 'Starred' },
                { id: 'in:sent', label: 'Sent' },
              ].map((f) => (
                <button
                  key={f.id}
                  onClick={() => {
                    setQuery(f.id)
                    setSearchInput('')
                  }}
                  className={cn(
                    'h-6 px-2 rounded text-[9px] font-bold uppercase tracking-widest transition-all',
                    query === f.id
                      ? 'bg-primary/15 text-primary'
                      : 'bg-white/[0.03] text-text/50 hover:text-text'
                  )}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>
          <div className="flex-1 overflow-y-auto">
            {listError ? (
              <div className="p-4 text-xs text-danger">{listError}</div>
            ) : loadingList && messages.length === 0 ? (
              <div className="p-6 text-center text-text/40 text-xs">Loading…</div>
            ) : messages.length === 0 ? (
              <div className="p-6 text-center text-text/40 text-xs">No messages</div>
            ) : (
              messages.map((m) => (
                <button
                  key={m.id}
                  onClick={() => selectMessage(m.id)}
                  className={cn(
                    'w-full text-left px-4 py-3 border-b border-white/[0.04] hover:bg-white/[0.03] transition-colors flex gap-3',
                    selectedId === m.id && 'bg-primary/[0.06]'
                  )}
                >
                  <div className="shrink-0 pt-1">
                    {m.unread ? (
                      <Mail className="w-4 h-4 text-primary" />
                    ) : (
                      <MailOpen className="w-4 h-4 text-text/30" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 mb-0.5">
                      <div
                        className={cn(
                          'text-xs truncate',
                          m.unread ? 'text-text font-bold' : 'text-text/70 font-semibold'
                        )}
                      >
                        {m.fromName}
                      </div>
                      <div className="text-[10px] text-text/40 shrink-0 flex items-center gap-1">
                        {pinnedIds.has(m.id) && <Pin className="w-2.5 h-2.5 text-warning" />}
                        {m.date.toLocaleDateString([], { month: 'short', day: 'numeric' })}
                      </div>
                    </div>
                    <div
                      className={cn(
                        'text-xs truncate mb-0.5',
                        m.unread ? 'text-text' : 'text-text/60'
                      )}
                    >
                      {m.subject}
                    </div>
                    <div className="text-[11px] text-text/40 truncate">{m.snippet}</div>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        {/* Detail */}
        <div className="card flex flex-col overflow-hidden">
          {!selectedId ? (
            <EmptyState
              icon={Mail}
              title="No message selected"
              description="Pick a message from the list."
            />
          ) : loadingDetail ? (
            <div className="p-10 text-center text-text/40 text-sm">Loading message…</div>
          ) : selectedMessage && selectedBody ? (
            <>
              <div className="p-5 border-b border-white/[0.06]">
                <div className="flex items-start justify-between gap-3 mb-3">
                  <h2 className="text-lg font-bold tracking-tight text-text">
                    {getHeader(selectedMessage, 'Subject') || '(no subject)'}
                  </h2>
                  <div className="flex items-center gap-1.5 shrink-0">
                    {isPinned(selectedMessage.id) ? (
                      <button
                        onClick={handleUnpinSelected}
                        className="h-9 px-3 rounded-lg bg-warning/10 border border-warning/30 text-warning text-xs font-semibold flex items-center gap-1.5 hover:bg-warning/20"
                      >
                        <PinOff className="w-3.5 h-3.5" /> Unpin
                      </button>
                    ) : (
                      <button
                        onClick={() => setPinModalOpen(true)}
                        className="h-9 px-3 rounded-lg bg-white/[0.04] border border-white/[0.08] text-xs font-semibold hover:bg-white/[0.08] flex items-center gap-1.5"
                      >
                        <Pin className="w-3.5 h-3.5" /> Pin
                      </button>
                    )}
                    <button
                      onClick={() => setReplyOpen(true)}
                      className="h-9 px-3 rounded-lg bg-primary text-white text-xs font-bold hover:bg-primary-dark flex items-center gap-1.5 shadow-glow-primary"
                    >
                      <Reply className="w-3.5 h-3.5" /> Reply
                    </button>
                  </div>
                </div>
                <div className="flex items-center gap-3 text-xs text-text/60">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-primary-dark flex items-center justify-center text-white text-xs font-bold">
                    {(parseFromHeader(getHeader(selectedMessage, 'From')).name || 'U').charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold text-text truncate">
                      {parseFromHeader(getHeader(selectedMessage, 'From')).name ||
                        parseFromHeader(getHeader(selectedMessage, 'From')).email}
                    </div>
                    <div className="text-[11px] text-text/40 truncate">
                      {parseFromHeader(getHeader(selectedMessage, 'From')).email}
                    </div>
                  </div>
                  <div className="text-[11px] text-text/40">
                    {new Date(Number(selectedMessage.internalDate)).toLocaleString()}
                  </div>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-6">
                {selectedBody.html && (
                  <div className="mb-4 flex items-center gap-1">
                    {(['html', 'text'] as const).map((m) => (
                      <button
                        key={m}
                        onClick={() => setBodyMode(m)}
                        className={cn(
                          'h-6 px-2 rounded text-[9px] font-bold uppercase tracking-widest',
                          bodyMode === m
                            ? 'bg-primary/15 text-primary'
                            : 'text-text/50 hover:text-text'
                        )}
                      >
                        {m}
                      </button>
                    ))}
                  </div>
                )}
                {bodyMode === 'html' && selectedBody.html ? (
                  <div
                    className="prose prose-invert max-w-none text-sm text-text/85 [&_a]:text-primary"
                    // eslint-disable-next-line react/no-danger
                    dangerouslySetInnerHTML={{ __html: selectedBody.html }}
                  />
                ) : (
                  <pre className="whitespace-pre-wrap text-sm text-text/85 font-sans leading-relaxed">
                    {selectedBody.text || '(empty)'}
                  </pre>
                )}

                {selectedBody.attachments.length > 0 && (
                  <div className="mt-6 pt-4 border-t border-white/[0.06]">
                    <div className="text-[10px] font-bold uppercase tracking-widest text-text/50 mb-2 flex items-center gap-1">
                      <Paperclip className="w-3 h-3" />
                      Attachments ({selectedBody.attachments.length})
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {selectedBody.attachments.map((a) => (
                        <button
                          key={a.attachmentId}
                          onClick={() => downloadAttachment(a.attachmentId, a.filename)}
                          className="flex items-center gap-2 h-9 px-3 rounded-lg bg-white/[0.04] border border-white/[0.08] text-xs hover:bg-white/[0.08] hover:border-primary/30"
                        >
                          <Download className="w-3.5 h-3.5 text-primary" />
                          <span className="font-medium">{a.filename}</span>
                          <span className="text-text/40">{Math.ceil(a.size / 1024)}KB</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {replyOpen && (
                <div className="border-t border-white/[0.06] p-4 bg-white/[0.02]">
                  <div className="flex items-center justify-between mb-2">
                    <div className="text-xs text-text/50">
                      Replying to{' '}
                      <span className="text-text font-semibold">
                        {parseFromHeader(getHeader(selectedMessage, 'From')).email}
                      </span>
                    </div>
                    <button
                      onClick={() => setReplyOpen(false)}
                      className="w-6 h-6 rounded text-text/40 hover:text-text hover:bg-white/5 flex items-center justify-center"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <textarea
                    value={replyBody}
                    onChange={(e) => setReplyBody(e.target.value)}
                    placeholder="Type your reply…"
                    rows={4}
                    className="w-full px-3 py-2 rounded-lg bg-white/[0.04] border border-white/[0.08] text-sm resize-none focus:outline-none focus:border-primary/40"
                  />
                  <div className="flex items-center justify-end mt-2">
                    <button
                      onClick={handleReply}
                      disabled={sending || !replyBody.trim()}
                      className="h-9 px-4 rounded-lg bg-primary text-white text-xs font-bold hover:bg-primary-dark disabled:opacity-50 flex items-center gap-1.5 shadow-glow-primary"
                    >
                      <Send className="w-3.5 h-3.5" />
                      {sending ? 'Sending…' : 'Send'}
                    </button>
                  </div>
                </div>
              )}
            </>
          ) : null}
        </div>
      </div>

      {pinModalOpen && (
        <PinModal
          clients={clients}
          projects={projects}
          onClose={() => setPinModalOpen(false)}
          onPin={handlePin}
        />
      )}
    </AppLayout>
  )
}

interface PinModalProps {
  clients: { id: string; name: string }[]
  projects: { id: string; name: string }[]
  onClose: () => void
  onPin: (payload: Omit<EmailPinInsert, 'gmail_message_id'>) => Promise<void>
}

function PinModal({ clients, projects, onClose, onPin }: PinModalProps) {
  const [target, setTarget] = useState<'client' | 'project'>('client')
  const [clientId, setClientId] = useState('')
  const [projectId, setProjectId] = useState('')
  const [saving, setSaving] = useState(false)

  async function submit() {
    if (target === 'client' && !clientId) return
    if (target === 'project' && !projectId) return
    setSaving(true)
    try {
      await onPin({
        client_id: target === 'client' ? clientId : null,
        project_id: target === 'project' ? projectId : null,
      })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 animate-fade-in"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-black/70 backdrop-blur-md" />
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-md rounded-2xl border border-white/[0.1] shadow-card-lg bg-gradient-to-b from-surface-3 to-surface-2 animate-scale-in overflow-hidden"
      >
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent" />
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.06]">
          <h3 className="text-base font-bold tracking-tight text-text flex items-center gap-2">
            <Link2 className="w-4 h-4 text-primary" />
            Pin email to…
          </h3>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg text-text/50 hover:text-text hover:bg-white/5 flex items-center justify-center"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-5 flex flex-col gap-4">
          <div className="flex items-center gap-1 p-1 bg-white/[0.03] border border-white/[0.06] rounded-lg">
            {(['client', 'project'] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTarget(t)}
                className={cn(
                  'flex-1 h-8 rounded-md text-[10px] font-bold uppercase tracking-widest transition-all',
                  target === t
                    ? 'bg-primary/15 text-primary'
                    : 'text-text/50 hover:text-text'
                )}
              >
                {t}
              </button>
            ))}
          </div>
          {target === 'client' ? (
            <select
              value={clientId}
              onChange={(e) => setClientId(e.target.value)}
              className="w-full h-10 px-3 rounded-lg bg-white/[0.04] border border-white/[0.08] text-sm focus:outline-none focus:border-primary/40"
            >
              <option value="">Select a client…</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          ) : (
            <select
              value={projectId}
              onChange={(e) => setProjectId(e.target.value)}
              className="w-full h-10 px-3 rounded-lg bg-white/[0.04] border border-white/[0.08] text-sm focus:outline-none focus:border-primary/40"
            >
              <option value="">Select a project…</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          )}
        </div>
        <div className="flex items-center justify-end gap-2 px-5 py-4 border-t border-white/[0.06]">
          <button
            onClick={onClose}
            className="h-10 px-4 rounded-lg bg-white/[0.04] border border-white/[0.08] text-xs font-semibold text-text/70"
          >
            Cancel
          </button>
          <button
            onClick={submit}
            disabled={saving || (target === 'client' ? !clientId : !projectId)}
            className="h-10 px-5 rounded-lg bg-primary text-white text-xs font-bold hover:bg-primary-dark disabled:opacity-50 shadow-glow-primary"
          >
            Pin
          </button>
        </div>
      </div>
    </div>
  )
}
