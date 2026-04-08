import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface ClientFilterValue {
  search: string
  statusFilter: string
}

export interface ProjectFilterValue {
  search: string
  statusFilter: string
}

export interface SavedFilter<T> {
  name: string
  filter: T
  created_at: number
}

export interface FilterState {
  clientFilters: SavedFilter<ClientFilterValue>[]
  projectFilters: SavedFilter<ProjectFilterValue>[]
  saveClientFilter: (name: string, filter: ClientFilterValue) => void
  deleteClientFilter: (name: string) => void
  saveProjectFilter: (name: string, filter: ProjectFilterValue) => void
  deleteProjectFilter: (name: string) => void
}

export const useFilterStore = create<FilterState>()(
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
