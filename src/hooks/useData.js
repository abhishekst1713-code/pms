import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import * as api from '../lib/api'
import { supabase } from '../lib/supabase'
import { CACHE_TIMES } from '../lib/constants'
import { useUIStore } from '../store'
import { useAuthStore } from '../store'
import { getAppSetting, setAppSetting } from '../lib/api'

const toast = (msg, type = 'success') => useUIStore.getState().addToast({ message: msg, type })

// Helper — get the logged-in user as the "actor" for notifications
function getActor() {
  return useAuthStore.getState().user || null
}

// ─────────────────────────────────────────────
// USERS
// ─────────────────────────────────────────────
export function useAllUsers() {
  return useQuery({
    queryKey: ['users'],
    queryFn: api.fetchAllUsers,
    staleTime: CACHE_TIMES.USERS,
    gcTime: CACHE_TIMES.USERS * 2,
  })
}

export function useTeamMembers(managerId) {
  return useQuery({
    queryKey: ['team', managerId],
    queryFn: () => api.fetchTeamMembers(managerId),
    enabled: !!managerId,
    staleTime: CACHE_TIMES.USERS,
  })
}

export function useCreateUser() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (userData) => {
      const actor      = getActor()
      const newEmployee = await api.createUser(userData)
      // Notify HR + CMD (non-blocking)
      if (actor) {
        api.notifyEmployeeCreated(newEmployee, actor).catch(console.error)
      }
      return newEmployee
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['users'] })
      toast('Employee created successfully')
    },
    onError: (e) => toast(e.message, 'error'),
  })
}

export function useUpdateUser() {
  const qc = useQueryClient()
  return useMutation({
    // Accepts { id, updates, notifyEmployee?: boolean }
    mutationFn: async ({ id, updates, notifyEmployee = true }) => {
      const actor   = getActor()
      const updated = await api.updateUser(id, updates)

      if (actor && notifyEmployee) {
        // If manager_id changed — fire reporting-change notification
        if ('manager_id' in updates) {
          let newManagerName = null
          if (updates.manager_id) {
            const mgr = await api.getUserById(updates.manager_id).catch(() => null)
            newManagerName = mgr?.name || 'their new manager'
          }
          api.notifyReportingChanged(
            updated,
            updates.manager_id || null,
            newManagerName,
            actor
          ).catch(console.error)
        } else {
          // General profile edit
          api.notifyEmployeeUpdated(updated, actor).catch(console.error)
        }
      }
      return updated
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['users'] })
      toast('User updated')
    },
    onError: (e) => toast(e.message, 'error'),
  })
}

export function useDeleteUser() {
  const qc = useQueryClient()
  return useMutation({
    // Accepts { id, name, role } so we can reference the deleted employee in the notification
    mutationFn: async ({ id, name, role }) => {
      const actor = getActor()
      await api.deleteUser(id)
      if (actor) {
        api.notifyEmployeeDeleted(name || 'Unknown', role || 'Employee', actor).catch(console.error)
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['users'] })
      toast('User deleted')
    },
    onError: (e) => toast(e.message, 'error'),
  })
}

// ─────────────────────────────────────────────
// GOALS
// ─────────────────────────────────────────────
export function useUserGoals(userId) {
  return useQuery({
    queryKey: ['goals', 'user', userId],
    queryFn: () => api.fetchUserGoals(userId),
    enabled: !!userId,
    staleTime: CACHE_TIMES.GOALS,
  })
}

export function useMonthGoals(userId, year, quarter, month) {
  return useQuery({
    queryKey: ['goals', 'month', userId, year, quarter, month],
    queryFn: () => api.fetchMonthGoals(userId, year, quarter, month),
    enabled: !!(userId && year && quarter && month),
    staleTime: CACHE_TIMES.GOALS,
  })
}

export function useAllGoals() {
  return useQuery({
    queryKey: ['goals', 'all'],
    queryFn: api.fetchAllGoalsBulk,
    staleTime: CACHE_TIMES.GOALS,
  })
}

export function usePendingApprovals(teamUserIds) {
  return useQuery({
    queryKey: ['goals', 'pending', teamUserIds],
    queryFn: () => api.fetchPendingApprovals(teamUserIds),
    enabled: teamUserIds?.length > 0,
    staleTime: CACHE_TIMES.GOALS,
    refetchInterval: 60 * 1000,
  })
}

export function useCreateGoal() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (goalData) => {
      const goal  = await api.createGoal(goalData)
      const actor = await api.getUserById(goalData.user_id).catch(() => null)
      if (actor) api.notifyGoalCreated(goal, actor).catch(console.error)
      return goal
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['goals'] })
      toast('Goal created successfully')
    },
    onError: (e) => toast(e.message, 'error'),
  })
}

export function useUpdateGoal() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ goalId, updates, actor }) => {
      const goal = await api.updateGoal(goalId, updates)

      if (actor) {
        // Achievement updated
        if (updates.monthly_achievement !== undefined) {
          api.notifyGoalUpdated(goal, actor).catch(console.error)
        }
        // Goal marked completed
        if (updates.status === 'Completed') {
          api.notifyGoalCompleted(goal, actor).catch(console.error)
        }
        // Title / KPI / target edited (not an approval action)
        if (
          (updates.goal_title || updates.kpi || updates.monthly_target !== undefined) &&
          !updates.approval_status
        ) {
          api.notifyGoalEdited(goal, actor).catch(console.error)
        }
      }
      return goal
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['goals'] }),
    onError: (e) => toast(e.message, 'error'),
  })
}

export function useDeleteGoal() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ goalId, goalTitle, actor }) => {
      const id    = typeof goalId === 'string' ? goalId : goalId
      const title = typeof goalTitle === 'string' ? goalTitle : 'Goal'
      await api.deleteGoal(id)
      if (actor) api.notifyGoalDeleted(title, actor).catch(console.error)
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['goals'] })
      toast('Goal deleted')
    },
    onError: (e) => toast(e.message, 'error'),
  })
}

export function useApproveGoal() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ goalId, approverId, approverName }) => {
      const { data: goal } = await supabase
        .from('goals').select('*').eq('goal_id', goalId).maybeSingle()
        .then(r => r).catch(() => ({ data: null }))
      const updated = await api.approveGoal(goalId, approverId, approverName)
      // Notify Employee + HR + CMD
      if (goal) api.notifyGoalApproved(goal, approverId, approverName).catch(console.error)
      return updated
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['goals'] })
      toast('Goal approved')
    },
    onError: (e) => toast(e.message, 'error'),
  })
}

export function useRejectGoal() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ goalId, reason, rejecterId, rejectorName }) => {
      const { data: goal } = await supabase
        .from('goals').select('*').eq('goal_id', goalId).maybeSingle()
        .then(r => r).catch(() => ({ data: null }))
      const updated = await api.rejectGoal(goalId, reason, rejecterId)
      // Notify Employee + HR + CMD
      if (goal) api.notifyGoalRejected(goal, rejecterId, rejectorName || 'Manager', reason).catch(console.error)
      return updated
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['goals'] })
      toast('Goal rejected')
    },
    onError: (e) => toast(e.message, 'error'),
  })
}

// ─────────────────────────────────────────────
// FEEDBACK
// ─────────────────────────────────────────────
export function useGoalFeedback(goalId) {
  return useQuery({
    queryKey: ['feedback', 'goal', goalId],
    queryFn: () => api.fetchGoalFeedback(goalId),
    enabled: !!goalId,
    staleTime: CACHE_TIMES.FEEDBACK,
  })
}

export function useUserFeedback(userId) {
  return useQuery({
    queryKey: ['feedback', 'user', userId],
    queryFn: () => api.fetchUserFeedback(userId),
    enabled: !!userId,
    staleTime: CACHE_TIMES.FEEDBACK,
  })
}

export function useAllFeedback() {
  return useQuery({
    queryKey: ['feedback', 'all'],
    queryFn: api.fetchAllFeedback,
    staleTime: CACHE_TIMES.FEEDBACK,
  })
}

export function useCreateFeedback() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (fbData) => {
      const fb = await api.createFeedback(fbData)
      // Fetch goal title + reviewer name for notification
      const { data: goal }     = await supabase.from('goals').select('goal_title').eq('goal_id', fbData.goal_id).maybeSingle()
      const { data: reviewer } = await supabase.from('users').select('name').eq('id', fbData.feedback_by).maybeSingle()
      if (goal && reviewer) {
        // Notify Employee + their Manager + HR
        api.notifyFeedbackSubmitted(fb, reviewer.name, goal.goal_title, fbData.user_id).catch(console.error)
      }
      return fb
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['feedback'] })
      toast('Feedback submitted')
    },
    onError: (e) => toast(e.message, 'error'),
  })
}

// ─────────────────────────────────────────────
// NOTIFICATIONS
// ─────────────────────────────────────────────
export function useNotifications(userId) {
  return useQuery({
    queryKey: ['notifications', userId],
    queryFn: () => api.fetchNotifications(userId),
    enabled: !!userId,
    staleTime: CACHE_TIMES.NOTIFICATIONS,
    refetchInterval: CACHE_TIMES.NOTIFICATIONS,
  })
}

export function useMarkRead() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: api.markNotificationRead,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications'] }),
  })
}

export function useMarkAllRead() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: api.markAllNotificationsRead,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications'] }),
  })
}

export function useAllNotificationsAdmin() {
  return useQuery({
    queryKey: ['admin-notifications'],
    queryFn: api.fetchAllNotificationsAdmin,
    staleTime: 15000,
    refetchInterval: 15000,
  })
}

export function useDeleteFeedback() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: api.deleteFeedback,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['feedback'] }),
  })
}

// ─────────────────────────────────────────────
// REVIEW MEETINGS
// ─────────────────────────────────────────────
export function useReviewMeetings() {
  return useQuery({
    queryKey: ['review_meetings'],
    queryFn: api.fetchAllReviewMeetings,
    staleTime: 60 * 1000,
  })
}

export function useCreateReviewMeeting() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: api.createReviewMeeting,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['review_meetings'] })
      toast('Review meeting recorded successfully')
    },
    onError: (e) => toast(e.message, 'error'),
  })
}

export function useUpdateReviewMeeting() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, updates }) => api.updateReviewMeeting(id, updates),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['review_meetings'] })
      toast('Meeting updated successfully')
    },
    onError: (e) => toast(e.message, 'error'),
  })
}

export function useDeleteReviewMeeting() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id) => api.deleteReviewMeeting(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['review_meetings'] })
      toast('Meeting deleted')
    },
    onError: (e) => toast(e.message, 'error'),
  })
}

export function useDeactivateUser() {
  const qc = useQueryClient()
  return useMutation({
    // Accepts { id, exitDate, employee } — employee = full user object for notification
    mutationFn: async ({ id, exitDate, employee }) => {
      const actor   = getActor()
      const updated = await api.deactivateUser(id, exitDate)
      if (actor && employee) {
        // Notify Employee + their Manager + HR + CMD
        api.notifyEmployeeDeactivated(employee, exitDate, actor).catch(console.error)
      }
      return updated
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['users'] })
      toast('Employee marked as left')
    },
    onError: (e) => toast(e.message, 'error'),
  })
}

export function useReactivateUser() {
  const qc = useQueryClient()
  return useMutation({
    // Accepts { id, employee } — employee = full user object for notification
    mutationFn: async ({ id, employee }) => {
      const actor   = getActor()
      const updated = await api.reactivateUser(id)
      if (actor && employee) {
        // Notify Employee + HR + CMD
        api.notifyEmployeeReactivated(employee, actor).catch(console.error)
      }
      return updated
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['users'] })
      toast('Employee reactivated')
    },
    onError: (e) => toast(e.message, 'error'),
  })
}

// ─────────────────────────────────────────────
// BULK UPLOAD — separate hook so we can fire
// a single summary notification after all rows
// ─────────────────────────────────────────────
export function useBulkCreateUsers() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ rows }) => {
      const actor = getActor()
      let created = 0, skipped = 0
      for (const row of rows) {
        try {
          await api.createUser(row)
          created++
        } catch { skipped++ }
      }
      // One summary notification instead of N individual ones
      if (actor && created > 0) {
        api.notifyBulkUploadComplete(created, actor).catch(console.error)
      }
      return { created, skipped }
    },
    onSuccess: ({ created, skipped }) => {
      qc.invalidateQueries({ queryKey: ['users'] })
      toast(`${created} employees created${skipped ? `, ${skipped} skipped` : ''}`)
    },
    onError: (e) => toast(e.message, 'error'),
  })
}

// ── App Settings ─────────────────────────────
export function useMailEnabled() {
  return useQuery({
    queryKey: ['app_settings', 'mail_enabled'],
    queryFn: () => getAppSetting('mail_enabled'),
    staleTime: 30_000,
  })
}

export function useSetMailEnabled() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (val) => setAppSetting('mail_enabled', val ? 'true' : 'false'),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['app_settings'] }),
  })
}