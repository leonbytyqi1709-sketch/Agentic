import { useState, useRef, useEffect } from 'react'
import type { FormEvent } from 'react'
import { Plus, X } from 'lucide-react'
import { useTags } from '../hooks/useTags.js'
import { cn } from '../lib/cn.js'

const PRESET_COLORS: string[] = [
  '#E11D48', '#F97316', '#EAB308', '#22C55E',
  '#14B8A6', '#3B82F6', '#8B5CF6', '#EC4899',
]

export interface TagPickerProps {
  value?: string[]
  onChange: (ids: string[]) => void
}

export default function TagPicker({ value = [], onChange }: TagPickerProps) {
  const { tags, create } = useTags()
  const [open, setOpen] = useState<boolean>(false)
  const [creating, setCreating] = useState<boolean>(false)
  const [newName, setNewName] = useState<string>('')
  const [newColor, setNewColor] = useState<string>(PRESET_COLORS[0])
  const ref = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    function onClick(e: MouseEvent) {
      const target = e.target as Node | null
      if (ref.current && target && !ref.current.contains(target)) {
        setOpen(false)
        setCreating(false)
      }
    }
    window.addEventListener('mousedown', onClick)
    return () => window.removeEventListener('mousedown', onClick)
  }, [])

  function toggle(id: string) {
    if (value.includes(id)) onChange(value.filter((x) => x !== id))
    else onChange([...value, id])
  }

  async function handleCreate(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!newName.trim()) return
    const t = await create(newName.trim(), newColor)
    onChange([...value, t.id])
    setNewName('')
    setCreating(false)
  }

  const selected = tags.filter((t) => value.includes(t.id))

  return (
    <div className="relative" ref={ref}>
      <div className="flex flex-wrap gap-1.5 min-h-[28px]">
        {selected.map((t) => (
          <span
            key={t.id}
            className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-md"
            style={{ backgroundColor: t.color + '22', color: t.color }}
          >
            {t.name}
            <button
              type="button"
              onClick={() => toggle(t.id)}
              className="hover:opacity-80"
            >
              <X className="w-2.5 h-2.5" />
            </button>
          </span>
        ))}
        <button
          type="button"
          onClick={() => setOpen(!open)}
          className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-md border border-dashed border-white/20 text-text/50 hover:text-text hover:border-white/40"
        >
          <Plus className="w-2.5 h-2.5" />
          Tag
        </button>
      </div>
      {open && (
        <div className="absolute left-0 top-8 w-56 bg-surface-2 border border-white/10 rounded-xl shadow-card p-2 z-30 animate-fade-in">
          <div className="max-h-48 overflow-y-auto flex flex-col gap-0.5">
            {tags.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => toggle(t.id)}
                className={cn(
                  'flex items-center gap-2 px-2 h-8 rounded-md text-sm hover:bg-white/5',
                  value.includes(t.id) ? 'text-text' : 'text-text/60'
                )}
              >
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: t.color }} />
                {t.name}
                {value.includes(t.id) && <span className="ml-auto text-[10px] text-primary">✓</span>}
              </button>
            ))}
            {tags.length === 0 && (
              <div className="text-xs text-text/40 text-center py-2">No tags yet</div>
            )}
          </div>
          <div className="border-t border-white/[0.06] mt-2 pt-2">
            {creating ? (
              <form onSubmit={handleCreate} className="flex flex-col gap-2">
                <input
                  autoFocus
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="Tag name"
                  className="h-8 bg-white/5 border border-white/10 rounded-md px-2 text-xs text-text focus:border-primary/50 outline-none"
                />
                <div className="flex items-center gap-1 flex-wrap">
                  {PRESET_COLORS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setNewColor(c)}
                      className={cn(
                        'w-5 h-5 rounded-full border-2',
                        newColor === c ? 'border-white' : 'border-transparent'
                      )}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
                <button
                  type="submit"
                  className="h-7 bg-primary text-white rounded-md text-xs font-semibold hover:bg-accent"
                >
                  Create
                </button>
              </form>
            ) : (
              <button
                type="button"
                onClick={() => setCreating(true)}
                className="w-full flex items-center gap-2 px-2 h-8 rounded-md text-xs text-text/60 hover:text-text hover:bg-white/5"
              >
                <Plus className="w-3 h-3" />
                New tag
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export interface TagBadgesProps {
  tagIds?: string[]
}

export function TagBadges({ tagIds = [] }: TagBadgesProps) {
  const { tags } = useTags()
  const selected = tags.filter((t) => tagIds.includes(t.id))
  if (selected.length === 0) return null
  return (
    <div className="flex flex-wrap gap-1">
      {selected.map((t) => (
        <span
          key={t.id}
          className="text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-md"
          style={{ backgroundColor: t.color + '22', color: t.color }}
        >
          {t.name}
        </span>
      ))}
    </div>
  )
}
