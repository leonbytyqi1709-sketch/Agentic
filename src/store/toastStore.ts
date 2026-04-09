import { create } from 'zustand'

export type ToastType = 'success' | 'error' | 'info'

export interface ToastAction {
  label: string
  onClick: () => void
}

export interface Toast {
  id: number
  type: ToastType
  message: string
  title?: string
  duration: number
  action?: ToastAction
}

export interface ToastInput {
  type?: ToastType
  message: string
  title?: string
  duration?: number
  action?: ToastAction
}

export interface ToastState {
  toasts: Toast[]
  push: (toast: ToastInput) => number
  dismiss: (id: number) => void
}

let idCounter = 0

export const useToastStore = create<ToastState>()((set, get) => ({
  toasts: [],
  push: (toast) => {
    const id = ++idCounter
    const t: Toast = { id, type: 'info', duration: 3500, ...toast }
    set({ toasts: [...get().toasts, t] })
    if (t.duration > 0) {
      setTimeout(() => get().dismiss(id), t.duration)
    }
    return id
  },
  dismiss: (id) =>
    set({ toasts: get().toasts.filter((t) => t.id !== id) }),
}))

type ToastShortcut = (
  message: string,
  opts?: Omit<ToastInput, 'message' | 'type'>
) => number

export const toast: { success: ToastShortcut; error: ToastShortcut; info: ToastShortcut } = {
  success: (message, opts) =>
    useToastStore.getState().push({ type: 'success', message, ...opts }),
  error: (message, opts) =>
    useToastStore.getState().push({ type: 'error', message, ...opts }),
  info: (message, opts) =>
    useToastStore.getState().push({ type: 'info', message, ...opts }),
}
