import { create } from 'zustand'

let idCounter = 0

export const useToastStore = create((set, get) => ({
  toasts: [],
  push: (toast) => {
    const id = ++idCounter
    const t = { id, type: 'info', duration: 3500, ...toast }
    set({ toasts: [...get().toasts, t] })
    if (t.duration > 0) {
      setTimeout(() => get().dismiss(id), t.duration)
    }
    return id
  },
  dismiss: (id) =>
    set({ toasts: get().toasts.filter((t) => t.id !== id) }),
}))

export const toast = {
  success: (message, opts) =>
    useToastStore.getState().push({ type: 'success', message, ...opts }),
  error: (message, opts) =>
    useToastStore.getState().push({ type: 'error', message, ...opts }),
  info: (message, opts) =>
    useToastStore.getState().push({ type: 'info', message, ...opts }),
}
