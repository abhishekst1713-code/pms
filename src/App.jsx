import React, { Suspense, lazy, useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from './store'
import AppShell from './components/layout/AppShell'
import PageLoader from './components/ui/PageLoader'
import ToastContainer from './components/ui/ToastContainer'
import { notifyOverdueGoals, notifyUpcomingDeadlines } from './lib/api'

// Lazy-load every page for code-splitting
const LoginPage        = lazy(() => import('./pages/auth/LoginPage'))
const ForgotPassword   = lazy(() => import('./pages/auth/ForgotPassword'))
const DashboardPage    = lazy(() => import('./pages/dashboard/DashboardPage'))
const MyGoalsPage      = lazy(() => import('./pages/goals/MyGoalsPage'))
const QuartersPage     = lazy(() => import('./pages/goals/QuartersPage'))
const MonthsPage       = lazy(() => import('./pages/goals/MonthsPage'))
const MonthGoalsPage   = lazy(() => import('./pages/goals/MonthGoalsPage'))
const EmployeesPage    = lazy(() => import('./pages/employees/EmployeesPage'))
const EmployeeGoals    = lazy(() => import('./pages/employees/EmployeeGoals'))
const ApprovalsPage    = lazy(() => import('./pages/approvals/ApprovalsPage'))
const AnalyticsPage    = lazy(() => import('./pages/analytics/AnalyticsPage'))
const FeedbackHistory  = lazy(() => import('./pages/feedback/FeedbackHistory'))
const HRInfoPage       = lazy(() => import('./pages/hr/HRInfoPage'))
const EmpManagement    = lazy(() => import('./pages/hr/EmpManagement'))
const ProfilePage      = lazy(() => import('./pages/profile/ProfilePage'))
const AdminPage        = lazy(() => import('./pages/admin/AdminPage'))
const HRReviewPage     = lazy(() => import('./pages/hr/HRReviewPage'))
const ReviewMeetingsPage = lazy(() => import('./pages/hr/ReviewMeetingsPage'))
const ReviewMeetingDetail = lazy(() => import('./pages/hr/ReviewMeetingDetail'))
const NotFound         = lazy(() => import('./pages/NotFound'))

function RequireAuth({ children }) {
  const user = useAuthStore(s => s.user)
  if (!user) return <Navigate to="/login" replace />
  return children
}

function RequireRole({ roles, children }) {
  const user = useAuthStore(s => s.user)
  if (!roles.includes(user?.role)) return <Navigate to="/dashboard" replace />
  return children
}

function RequireGuest({ children }) {
  const user = useAuthStore(s => s.user)
  if (user) return <Navigate to="/dashboard" replace />
  return children
}

export default function App() {
  // Run overdue + deadline checks on mount and every 6 hours
  useEffect(() => {
    const run = () => {
      notifyOverdueGoals().catch(console.error)
      notifyUpcomingDeadlines().catch(console.error)
    }
    run() // immediate on load
    const interval = setInterval(run, 6 * 60 * 60 * 1000) // every 6 hours
    return () => clearInterval(interval)
  }, [])
  return (
    <BrowserRouter>
      <ToastContainer />
      <Suspense fallback={<PageLoader />}>
        <Routes>
          {/* Public */}
          <Route path="/login" element={<RequireGuest><LoginPage /></RequireGuest>} />
          <Route path="/forgot-password" element={<RequireGuest><ForgotPassword /></RequireGuest>} />

          {/* Protected — inside AppShell */}
          <Route path="/" element={<RequireAuth><AppShell /></RequireAuth>}>
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="dashboard"  element={<DashboardPage />} />

            {/* My Goals drill-down */}
            <Route path="my-goals"                             element={<MyGoalsPage />} />
            <Route path="my-goals/:year"                       element={<QuartersPage mine />} />
            <Route path="my-goals/:year/q/:quarter"            element={<MonthsPage mine />} />
            <Route path="my-goals/:year/q/:quarter/m/:month"   element={<MonthGoalsPage mine />} />

            {/* Employees & their goals */}
            <Route path="employees"                                              element={<EmployeesPage />} />
            <Route path="employees/:empId/goals"                                 element={<EmployeeGoals />} />
            <Route path="employees/:empId/goals/:year"                           element={<QuartersPage />} />
            <Route path="employees/:empId/goals/:year/q/:quarter"                element={<MonthsPage />} />
            <Route path="employees/:empId/goals/:year/q/:quarter/m/:month"       element={<MonthGoalsPage />} />

            {/* Approvals */}
            <Route path="approvals" element={
              <RequireRole roles={['Manager', 'HR', 'VP', 'CMD']}>
                <ApprovalsPage />
              </RequireRole>
            } />

            {/* Analytics */}
            <Route path="analytics" element={<AnalyticsPage />} />

            {/* Feedback */}
            <Route path="feedback" element={<FeedbackHistory />} />

            {/* HR only */}
            <Route path="hr/info" element={
              <RequireRole roles={['Admin', 'HR']}>
                <HRInfoPage />
              </RequireRole>
            } />
            <Route path="hr/employees" element={
              <RequireRole roles={['Admin', 'HR']}>
                <EmpManagement />
              </RequireRole>
            } />

            <Route path="hr/review" element={
              <RequireRole roles={['Admin', 'HR', 'CMD', 'VP']}>
                <HRReviewPage />
              </RequireRole>
            } />

            <Route path="hr/meetings" element={
              <RequireRole roles={['Admin', 'HR', 'CMD', 'VP', 'Manager', 'Employee']}>
                <ReviewMeetingsPage />
              </RequireRole>
            } />

            <Route path="hr/meetings/:meetingId" element={
              <RequireRole roles={['Admin', 'HR', 'CMD', 'VP', 'Manager', 'Employee']}>
                <ReviewMeetingDetail />
              </RequireRole>
            } />

            {/* Profile */}
            <Route path="profile" element={<ProfilePage />} />

            {/* Admin only */}
            <Route path="admin" element={
              <RequireRole roles={['Admin']}>
                <AdminPage />
              </RequireRole>
            } />

            <Route path="*" element={<NotFound />} />
          </Route>

          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  )
}