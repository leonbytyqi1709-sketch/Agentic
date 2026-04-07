import { useRef, useState } from 'react'
import { Paperclip, Upload, Trash2, File, Image as ImageIcon, Download } from 'lucide-react'
import { useAttachments } from '../hooks/useAttachments.js'
import { toast } from '../store/toastStore.js'

function formatSize(bytes) {
  if (!bytes) return '—'
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
  return (bytes / 1024 / 1024).toFixed(1) + ' MB'
}

function isImage(mime) {
  return mime?.startsWith('image/')
}

export default function Attachments({ entityType, entityId }) {
  const { attachments, upload, remove, getSignedUrl } = useAttachments(entityType, entityId)
  const fileRef = useRef(null)
  const [uploading, setUploading] = useState(false)

  async function handleFile(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    try {
      await upload(file)
      toast.success('File uploaded')
    } catch (err) {
      toast.error(err.message)
    } finally {
      setUploading(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  async function openFile(a) {
    const url = await getSignedUrl(a)
    if (url) window.open(url, '_blank')
  }

  async function handleRemove(a) {
    try {
      await remove(a)
      toast.success('File removed')
    } catch (err) {
      toast.error(err.message)
    }
  }

  return (
    <div className="bg-surface-2 rounded-xl border border-white/[0.06] shadow-card p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Paperclip className="w-4 h-4 text-text/60" />
          <h3 className="text-sm font-semibold tracking-tight text-text">Attachments</h3>
          <span className="text-xs text-text/40">({attachments.length})</span>
        </div>
        <input ref={fileRef} type="file" onChange={handleFile} className="hidden" />
        <button
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
          className="inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:text-accent disabled:opacity-50"
        >
          <Upload className="w-3.5 h-3.5" />
          {uploading ? 'Uploading...' : 'Upload'}
        </button>
      </div>
      {attachments.length === 0 ? (
        <div className="text-sm text-text/40 py-4 text-center">No attachments</div>
      ) : (
        <div className="flex flex-col gap-2">
          {attachments.map((a) => {
            const Icon = isImage(a.mime_type) ? ImageIcon : File
            return (
              <div
                key={a.id}
                className="flex items-center gap-3 bg-white/[0.02] border border-white/[0.04] rounded-lg px-3 py-2"
              >
                <div className="w-8 h-8 rounded-md bg-white/5 flex items-center justify-center text-text/60">
                  <Icon className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-text truncate">{a.file_name}</div>
                  <div className="text-[10px] text-text/40">{formatSize(a.file_size)}</div>
                </div>
                <button
                  onClick={() => openFile(a)}
                  className="w-7 h-7 rounded-md text-text/50 hover:text-text hover:bg-white/5 flex items-center justify-center"
                >
                  <Download className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => handleRemove(a)}
                  className="w-7 h-7 rounded-md text-text/50 hover:text-red-400 hover:bg-red-500/5 flex items-center justify-center"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
