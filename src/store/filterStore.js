import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export const useFilterStore = create(
  persist(
    (set, get) => ({
      clientFilters: [],
      projectFilters: [],
      saveClientFilter: (name, filter) =>
        set({
          clientFilters: [
            ...get().clientFilters.filter((f) => f.name !== name),
            { name, filter, created_at: Date.now() },
          ],
        }),
      deleteClientFilter: (name) =>
        set({ clientFilters: get().clientFilters.filter((f) => f.name !== name) }),
      saveProjectFilter: (name, filter) =>
        set({
          projectFilters: [
            ...get().projectFilters.filter((f) => f.name !== name),
            { name, filter, created_at: Date.now() },
          ],
        }),
      deleteProjectFilter: (name) =>
        set({ projectFilters: get().projectFilters.filter((f) => f.name !== name) }),
    }),
    { name: 'cp-filters' }
  )
)
