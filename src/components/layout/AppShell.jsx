import React from 'react'
import { Outlet } from 'react-router-dom'
import { useUIStore } from '../../store'
import Sidebar from './Sidebar'
import TopBar from './TopBar'
import ToastContainer from '../ui/ToastContainer'

export default function AppShell() {
  const collapsed = useUIStore(s => s.sidebarCollapsed)

  return (
    <div className="app-layout">
      <Sidebar />
      <div className={`app-main${collapsed ? ' sidebar-collapsed' : ''}`}>
        <TopBar />
        <main className="page-content">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
