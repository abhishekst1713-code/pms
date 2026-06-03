import { create } from 'zustand'
import { persist } from 'zustand/middleware'

// Auth store (persisted to localStorage)
export const useAuthStore = create(
  persist(
    (set) => ({
      user: null,
      sessionId: null,
      setUser: (user) => set({ user }),
      clearAuth: () => set({ user: null, sessionId: null }),
    }),
    { name: 'pms-auth', partialize: (s) => ({ user: s.user }) }
  )
)

// UI / navigation state (not persisted)
export const useUIStore = create((set, get) => ({
  // Sidebar
  sidebarCollapsed: false,
  toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),

  // Modals
  activeModal: null,
  modalData: null,
  openModal: (name, data = null) => set({ activeModal: name, modalData: data }),
  closeModal: () => set({ activeModal: null, modalData: null }),

  // Global toast notifications
  toasts: [],
  addToast: (toast) => {
    const id = Date.now() + Math.random()
    set((s) => ({ toasts: [...s.toasts, { id, ...toast }] }))
    setTimeout(() => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })), toast.duration || 4000)
  },
  removeToast: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),

  // Drill-down navigation state
  nav: {
    viewingEmployee: null,
    viewingYear: null,
    viewingQuarter: null,
    viewingMonth: null,
    viewingManagerTeam: null,
  },
  setNav: (patch) => set((s) => ({ nav: { ...s.nav, ...patch } })),
  clearNav: () => set({ nav: { viewingEmployee: null, viewingYear: null, viewingQuarter: null, viewingMonth: null, viewingManagerTeam: null } }),
}))
