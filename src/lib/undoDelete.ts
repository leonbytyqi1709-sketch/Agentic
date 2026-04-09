import { toast } from '../store/toastStore.js'

/**
 * Defer a delete by ~5 seconds and show an "Undo" toast.
 * The caller provides `onHide` so the item disappears from the list
 * immediately. If the user clicks Undo, `onRestore` is called and the
 * DB delete never runs. Otherwise `onCommit` fires after `delayMs`.
 */
export function undoableDelete<T>(args: {
  entityLabel: string
  onHide: () => void
  onRestore: () => void
  onCommit: () => Promise<T>
  delayMs?: number
}): void {
  const { entityLabel, onHide, onRestore, onCommit, delayMs = 5000 } = args
  onHide()
  let cancelled = false
  const timer = setTimeout(() => {
    if (cancelled) return
    onCommit().catch((e) => {
      onRestore()
      toast.error(`Failed to delete ${entityLabel}: ${(e as Error).message}`)
    })
  }, delayMs)
  toast.info(`${entityLabel} deleted`, {
    duration: delayMs,
    action: {
      label: 'Undo',
      onClick: () => {
        cancelled = true
        clearTimeout(timer)
        onRestore()
      },
    },
  })
}
