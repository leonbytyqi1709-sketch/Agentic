import { useRef, useState } from 'react'
import type { ChangeEvent, DragEvent as ReactDragEvent, ComponentType } from 'react'
import {
  Paperclip,
  Upload,
  Trash2,
  File as FileIcon,
  Image as ImageIcon,
  Download,
  FileText,
  FileSpreadsheet,
  FileCode,
  FileArchive,
  FileAudio,
  FileVideo,
  CloudUpload,
} from 'lucide-react'
import { useAttachments } from '../hooks/useAttachments.js'
import { toast } from '../store/toastStore.js'
import { cn } from '../lib/cn.js'
import type { Attachment, AttachmentEntityType } from '../types'

type IconComponent = ComponentType<{ className?: string; strokeWidth?: number }>

export interface AttachmentsProps {
  entityType: AttachmentEntityType
  entityId: string
}

const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10 MB

function formatSize(bytes: number | null | undefined): string {
  if (bytes == null || bytes === 0) return '—'
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
  return (bytes / 1024 / 1024).toFixed(1) + ' MB'
}

interface FileTypeMeta {
  icon: IconComponent
  color: string
  bg: string
  label: string
}

function getFileMeta(mime: string | null | undefined, name: string): FileTypeMeta {
  const m = (mime || '').toLowerCase()
  const ext = name.split('.').pop()?.toLowerCase() || ''

  if (m.startsWith('image/') || ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'bmp'].includes(ext)) {
    return {
      icon: ImageIcon,
      color: 'text-pink-400',
      bg: 'bg-pink-500/10 border-pink-500/20',
      label: 'IMG',
    }
  }
  if (m.startsWith('video/') || ['mp4', 'mov', 'avi', 'mkv', 'webm'].includes(ext)) {
    return {
      icon: FileVideo,
      color: 'text-purple-400',
      bg: 'bg-purple-500/10 border-purple-500/20',
      label: 'VID',
    }
  }
  if (m.startsWith('audio/') || ['mp3', 'wav', 'ogg', 'flac', 'm4a'].includes(ext)) {
    return {
      icon: FileAudio,
      color: 'text-indigo-400',
      bg: 'bg-indigo-500/10 border-indigo-500/20',
      label: 'AUD',
    }
  }
  if (m === 'application/pdf' || ext === 'pdf') {
    return {
      icon: FileText,
      color: 'text-danger',
      bg: 'bg-danger-bg border-danger/20',
      label: 'PDF',
    }
  }
  if (
    m.includes('spreadsheet') ||
    m.includes('excel') ||
    ['xlsx', 'xls', 'csv', 'tsv'].includes(ext)
  ) {
    return {
      icon: FileSpreadsheet,
      color: 'text-success',
      bg: 'bg-success-bg border-success/20',
      label: ext.toUpperCase() || 'XLS',
    }
  }
  if (
    m.includes('document') ||
    m.includes('msword') ||
    ['doc', 'docx', 'odt', 'rtf'].includes(ext)
  ) {
    return {
      icon: FileText,
      color: 'text-info',
      bg: 'bg-info-bg border-info/20',
      label: ext.toUpperCase() || 'DOC',
    }
  }
  if (['zip', 'rar', '7z', 'tar', 'gz'].includes(ext) || m.includes('zip')) {
    return {
      icon: FileArchive,
      color: 'text-warning',
      bg: 'bg-warning-bg border-warning/20',
      label: ext.toUpperCase() || 'ZIP',
    }
  }
  if (
    ['ts', 'tsx', 'js', 'jsx', 'json', 'html', 'css', 'py', 'go', 'rs', 'rb', 'sql'].includes(
      ext
    )
  ) {
    return {
      icon: FileCode,
      color: 'text-cyan-400',
      bg: 'bg-cyan-500/10 border-cyan-500/20',
      label: ext.toUpperCase(),
    }
  }
  return {
    icon: FileIcon,
    color: 'text-text/60',
    bg: 'bg-white/[0.04] border-white/[0.08]',
    label: (ext || 'FILE').toUpperCase().slice(0, 4),
  }
}

export default function Attachments({ entityType, entityId }: AttachmentsProps) {
  const { attachments, upload, remove, getSignedUrl } = useAttachments(entityType, entityId)
  const fileRef = useRef<HTMLInputElement | null>(null)
  const [uploading, setUploading] = useState<boolean>(false)
  const [uploadQueue, setUploadQueue] = useState<{
    current: number
    total: number
    name: string
  } | null>(null)
  const [dragOver, setDragOver] = useState<boolean>(false)

  async function uploadFiles(files: File[]) {
    if (!files.length) return

    // Size validation
    const oversized = files.filter((f) => f.size > MAX_FILE_SIZE)
    if (oversized.length) {
      toast.error(
        `${oversized.length} file${oversized.length > 1 ? 's' : ''} exceed 10 MB — skipped`
      )
    }

    const valid = files.filter((f) => f.size <= MAX_FILE_SIZE)
    if (!valid.length) return

    setUploading(true)
    let success = 0
    let failed = 0

    for (let i = 0; i < valid.length; i++) {
      const file = valid[i]
      setUploadQueue({ current: i + 1, total: valid.length, name: file.name })
      try {
        await upload(file)
        success++
      } catch (err) {
        failed++
        console.error('upload failed', err)
      }
    }

    setUploadQueue(null)
    setUploading(false)

    if (success > 0) {
      toast.success(
        `${success} file${success > 1 ? 's' : ''} uploaded${
          failed > 0 ? ` (${failed} failed)` : ''
        }`
      )
    } else if (failed > 0) {
      toast.error(`Upload failed`)
    }
  }

  async function handleInput(e: ChangeEvent<HTMLInputElement>) {
    const fileList = e.target.files
    if (!fileList) return
    const files = Array.from(fileList)
    await uploadFiles(files)
    if (fileRef.current) fileRef.current.value = ''
  }

  function handleDragOver(e: ReactDragEvent<HTMLDivElement>) {
    e.preventDefault()
    e.stopPropagation()
    if (!dragOver) setDragOver(true)
  }

  function handleDragLeave(e: ReactDragEvent<HTMLDivElement>) {
    e.preventDefault()
    e.stopPropagation()
    // Only leave when we actually leave the container (not a child)
    if (e.currentTarget === e.target) setDragOver(false)
  }

  async function handleDrop(e: ReactDragEvent<HTMLDivElement>) {
    e.preventDefault()
    e.stopPropagation()
    setDragOver(false)
    const files = Array.from(e.dataTransfer.files || [])
    if (files.length) await uploadFiles(files)
  }

  async function openFile(a: Attachment) {
    const url = await getSignedUrl(a)
    if (url) window.open(url, '_blank')
  }

  async function handleRemove(a: Attachment) {
    try {
      await remove(a)
      toast.success('File removed')
    } catch (err) {
      toast.error((err as Error).message)
    }
  }

  return (
    <div className="card p-6 relative overflow-hidden">
      <div className="absolute -top-16 -right-16 w-48 h-48 bg-primary/8 rounded-full blur-3xl pointer-events-none" />

      <div className="relative flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-white/[0.04] border border-white/[0.08] flex items-center justify-center">
            <Paperclip className="w-4 h-4 text-text/70" />
          </div>
          <div>
            <h3 className="text-sm font-bold tracking-tight text-text">Attachments</h3>
            <p className="text-[11px] text-text/40">
              {attachments.length}{' '}
              {attachments.length === 1 ? 'file' : 'files'} · max 10 MB each
            </p>
          </div>
        </div>
        <input
          ref={fileRef}
          type="file"
          multiple
          onChange={handleInput}
          className="hidden"
        />
        <button
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
          className="inline-flex items-center gap-2 h-9 px-4 rounded-lg text-xs font-semibold bg-primary/10 border border-primary/25 text-primary hover:bg-primary/15 hover:border-primary/40 active:scale-[0.97] disabled:opacity-50 transition-all"
        >
          <Upload className="w-3.5 h-3.5" />
          {uploading && uploadQueue
            ? `Uploading ${uploadQueue.current}/${uploadQueue.total}`
            : 'Upload'}
        </button>
      </div>

      {/* Drag & Drop Zone */}
      <div
        onDragOver={handleDragOver}
        onDragEnter={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => !uploading && fileRef.current?.click()}
        className={cn(
          'relative mb-4 rounded-xl border-2 border-dashed px-6 py-8 text-center cursor-pointer transition-all duration-200',
          dragOver
            ? 'border-primary bg-primary/[0.08] scale-[1.01]'
            : 'border-white/[0.08] bg-white/[0.01] hover:border-white/[0.16] hover:bg-white/[0.03]',
          uploading && 'pointer-events-none opacity-80'
        )}
      >
        {uploading && uploadQueue ? (
          <div className="flex flex-col items-center gap-2">
            <CloudUpload className="w-8 h-8 text-primary animate-pulse" />
            <div className="text-sm font-semibold text-text">
              Uploading {uploadQueue.current} / {uploadQueue.total}
            </div>
            <div className="text-xs text-text/50 truncate max-w-xs">
              {uploadQueue.name}
            </div>
            <div className="w-48 h-1.5 bg-white/[0.06] rounded-full overflow-hidden mt-1">
              <div
                className="h-full bg-gradient-to-r from-primary to-primary-light transition-all duration-300"
                style={{
                  width: `${(uploadQueue.current / uploadQueue.total) * 100}%`,
                }}
              />
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2 pointer-events-none">
            <div
              className={cn(
                'w-12 h-12 rounded-xl flex items-center justify-center transition-all',
                dragOver
                  ? 'bg-primary/20 border border-primary/40 scale-110'
                  : 'bg-white/[0.04] border border-white/[0.08]'
              )}
            >
              <CloudUpload
                className={cn('w-6 h-6', dragOver ? 'text-primary' : 'text-text/60')}
              />
            </div>
            <div className="text-sm font-semibold text-text">
              {dragOver ? 'Drop to upload' : 'Drop files here or click to browse'}
            </div>
            <div className="text-[11px] text-text/40">
              Images, PDFs, documents · up to 10 MB each · multiple files supported
            </div>
          </div>
        )}
      </div>

      {/* File list */}
      {attachments.length === 0 ? (
        <div className="text-xs text-text/35 text-center py-2">No files uploaded yet</div>
      ) : (
        <div className="flex flex-col gap-2">
          {attachments.map((a) => {
            const meta = getFileMeta(a.mime_type, a.file_name)
            const Icon = meta.icon
            return (
              <div
                key={a.id}
                className="group flex items-center gap-3 bg-white/[0.02] border border-white/[0.05] rounded-xl px-3 py-2.5 hover:bg-white/[0.04] hover:border-white/[0.1] transition-all"
              >
                <div
                  className={cn(
                    'relative w-10 h-10 rounded-lg border flex items-center justify-center shrink-0',
                    meta.bg
                  )}
                >
                  <Icon className={cn('w-4 h-4', meta.color)} strokeWidth={2} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <div className="text-sm font-semibold text-text truncate">
                      {a.file_name}
                    </div>
                    <span
                      className={cn(
                        'text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded border shrink-0',
                        meta.bg,
                        meta.color
                      )}
                    >
                      {meta.label}
                    </span>
                  </div>
                  <div className="text-[11px] text-text/40 mt-0.5">
                    {formatSize(a.file_size)}
                    {a.created_at && (
                      <>
                        {' · '}
                        {new Date(a.created_at).toLocaleDateString('de-DE', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1 opacity-60 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => openFile(a)}
                    className="w-8 h-8 rounded-lg text-text/60 hover:text-primary hover:bg-primary/10 flex items-center justify-center transition-all active:scale-90"
                    title="Download"
                  >
                    <Download className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleRemove(a)}
                    className="w-8 h-8 rounded-lg text-text/60 hover:text-danger hover:bg-danger-bg flex items-center justify-center transition-all active:scale-90"
                    title="Delete"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
