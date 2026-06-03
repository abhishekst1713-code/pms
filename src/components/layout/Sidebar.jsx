import React from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import './Sidebar.css'
import {
  LayoutDashboard, Target, Users, CheckSquare, BarChart2,
  MessageSquare, Building2, Settings, LogOut, ChevronLeft,
  ChevronRight, UserCog, Shield, ClipboardList, Calendar
} from 'lucide-react'
import { useAuthStore, useUIStore } from '../../store'
import { useAllUsers, usePendingApprovals } from '../../hooks/useData'
import { cn } from '../../lib/utils'
import infopaceLogo from '../../assets/infopace-logo.png'

function NavItem({ to, icon: Icon, label, badge, collapsed }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) => cn('nav-item', isActive && 'active')}
    >
      <Icon size={17} strokeWidth={2} className="nav-icon" />
      {!collapsed && <span className="nav-label">{label}</span>}
      {!collapsed && badge > 0 && (
        <span className="nav-badge">{badge > 99 ? '99+' : badge}</span>
      )}
      {collapsed && badge > 0 && (
        <span className="nav-badge-dot" />
      )}
    </NavLink>
  )
}

export default function Sidebar() {
  const user          = useAuthStore(s => s.user)
  const clearAuth     = useAuthStore(s => s.clearAuth)
  const collapsed     = useUIStore(s => s.sidebarCollapsed)
  const toggleSidebar = useUIStore(s => s.toggleSidebar)
  const navigate      = useNavigate()

  const { data: allUsers } = useAllUsers()
  const teamMemberIds = (allUsers || [])
    .filter(u => u.manager_id === user?.id)
    .map(u => u.id)
  const { data: pendingGoals } = usePendingApprovals(teamMemberIds)
  const pendingCount = pendingGoals?.length || 0

  const role = user?.role

  const handleLogout = () => {
    clearAuth()
    navigate('/login')
  }

  const teamLabel =
    role === 'Manager'  ? 'My Team'        :
    role === 'HR'       ? 'Managers & Team' :
    role === 'VP'       ? 'HR & Managers'   :
    role === 'CMD'      ? 'VPs & Org'       :
    'All Employees'

  const navItems = [
    { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard',        roles: ['Admin','CMD','VP','HR','Manager','Employee'] },
    { to: '/my-goals',  icon: Target,          label: 'My Goals',         roles: ['Admin','CMD','VP','HR','Manager','Employee'] },
    { to: '/employees', icon: Users,           label: teamLabel,          roles: ['Admin','CMD','VP','HR','Manager'] },
    { to: '/approvals', icon: CheckSquare,     label: 'Approvals',        badge: pendingCount, roles: ['Admin','CMD','VP','HR','Manager'] },
    { to: '/analytics', icon: BarChart2,       label: 'Analytics',        roles: ['Admin','CMD','VP','HR','Manager','Employee'] },
    { to: '/feedback',  icon: MessageSquare,   label: 'Feedback',         roles: ['Admin','CMD','VP','HR','Manager','Employee'] },
    { to: '/hr/review',    icon: ClipboardList, label: 'HR Review',       roles: ['Admin','HR'] },
    { to: '/hr/meetings',  icon: Calendar,      label: 'Review Meetings', roles: ['Admin','HR','CMD','VP','Manager','Employee'] },
    { to: '/hr/employees', icon: UserCog,       label: 'Emp. Management', roles: ['Admin','HR'] },
    { to: '/hr/info',      icon: Building2,     label: 'Org Info',        roles: ['Admin','HR'] },
    { to: '/admin',        icon: Shield,        label: 'Admin Panel',     roles: ['Admin'] },
  ].filter(item => item.roles.includes(role))

  const mainNav  = navItems.filter(i => !['/hr/info','/hr/employees','/admin'].includes(i.to))
  const adminNav = navItems.filter(i =>  ['/hr/info','/hr/employees','/admin'].includes(i.to))

  const roleBadgeClass = {
    Admin:    'badge-red',
    CMD:      'role-CMD',
    VP:       'role-VP',
    HR:       'role-HR',
    Manager:  'role-Manager',
    Employee: 'role-Employee',
  }[role] || 'badge-gray'

  return (
    <aside className={cn('sidebar', collapsed && 'sidebar--collapsed')}>

      {/* ── Logo ── */}
      <div className="sidebar-logo">
        {collapsed ? (
          /* Collapsed: show small square logo mark only */
          <div className="sidebar-logo-collapsed-mark">
            <img src={infopaceLogo} alt="Infopace" className="sidebar-logo-collapsed-img" />
          </div>
        ) : (
          /* Expanded: full logo on white pill background */
          <div className="sidebar-logo-full">
            <div className="sidebar-logo-pill">
              <img src={infopaceLogo} alt="Infopace" className="sidebar-logo-img" />
            </div>
          </div>
        )}
        <button
          className="sidebar-toggle"
          onClick={toggleSidebar}
          title={collapsed ? 'Expand' : 'Collapse'}
        >
          {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
        </button>
      </div>

      {/* ── User avatar ── */}
      <div className="sidebar-user">
        <div className="sidebar-avatar">{user?.name?.[0]?.toUpperCase()}</div>
        {!collapsed && (
          <div className="sidebar-user-info">
            <div className="sidebar-user-name">{user?.name}</div>
            <div className="sidebar-user-role">
              <span className={cn('badge', roleBadgeClass)}>{role}</span>
            </div>
          </div>
        )}
      </div>

      {/* ── Navigation ── */}
      <nav className="sidebar-nav">
        {!collapsed && <div className="nav-section-label">Navigation</div>}
        {mainNav.map(item => (
          <NavItem key={item.to} {...item} collapsed={collapsed} />
        ))}

        {adminNav.length > 0 && (
          <>
            {!collapsed && <div className="nav-section-label" style={{ marginTop: 12 }}>Admin</div>}
            {collapsed    && <div style={{ height: 1, background: 'var(--border)', margin: '8px 6px' }} />}
            {adminNav.map(item => (
              <NavItem key={item.to} {...item} collapsed={collapsed} />
            ))}
          </>
        )}
      </nav>

      {/* ── Footer ── */}
      <div className="sidebar-footer">
        <NavLink to="/profile" className={({ isActive }) => cn('nav-item', isActive && 'active')}>
          <Settings size={17} strokeWidth={2} />
          {!collapsed && <span className="nav-label">Profile</span>}
        </NavLink>
        <button className="nav-item nav-logout" onClick={handleLogout}>
          <LogOut size={17} strokeWidth={2} />
          {!collapsed && <span className="nav-label">Logout</span>}
        </button>
      </div>
    </aside>
  )
}