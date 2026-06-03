import { supabase } from './supabase'

// ─────────────────────────────────────────────
// AUTH
// ─────────────────────────────────────────────
export async function loginUser(email, password) {
  const { data: users, error: err1 } = await supabase
    .from('users')
    .select('*')
    .eq('email', email.toLowerCase().trim())
    .limit(1)

  if (err1) throw new Error('Database error: ' + err1.message)
  if (!users || users.length === 0) throw new Error('No account found with that email')

  const user = users[0]
  if (user.password !== password) throw new Error('Incorrect password')
  if (user.is_active === false) throw new Error('Your account has been deactivated. Please contact HR.')
  return user
}

export async function getUserById(id) {
  const { data, error } = await supabase
    .from('users').select('*').eq('id', id).single()
  if (error) throw error
  return data
}

// ─────────────────────────────────────────────
// USERS
// ─────────────────────────────────────────────
export async function fetchAllUsers() {
  const { data, error } = await supabase
    .from('users').select('*').order('name')
  if (error) throw error
  return data || []
}

export async function fetchTeamMembers(managerId) {
  const { data, error } = await supabase
    .from('users').select('*').eq('manager_id', managerId).order('name')
  if (error) throw error
  return data || []
}

export async function createUser(userData) {
  const { data, error } = await supabase
    .from('users').insert(userData).select().single()
  if (error) throw error
  return data
}

export async function updateUser(id, updates) {
  const { data, error } = await supabase
    .from('users').update(updates).eq('id', id).select().single()
  if (error) throw error
  return data
}

export async function deleteUser(id) {
  const { error } = await supabase.from('users').delete().eq('id', id)
  if (error) throw error
  return true
}

// ─────────────────────────────────────────────
// GOALS
// ─────────────────────────────────────────────
export async function fetchUserGoals(userId) {
  const { data, error } = await supabase
    .from('goals')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data || []
}

export async function fetchMonthGoals(userId, year, quarter, month) {
  const { data, error } = await supabase
    .from('goals')
    .select('*')
    .eq('user_id', userId)
    .eq('year', year)
    .eq('quarter', quarter)
    .eq('month', month)
    .is('week', null)
    .order('created_at')
  if (error) throw error
  return data || []
}

export async function fetchAllGoalsBulk() {
  const { data, error } = await supabase
    .from('goals')
    .select('*')
    .order('created_at', { ascending: false })
  if (error) throw error
  return data || []
}

export async function fetchPendingApprovals(teamUserIds) {
  if (!teamUserIds.length) return []
  const { data, error } = await supabase
    .from('goals')
    .select('*')
    .eq('approval_status', 'pending')
    .in('user_id', teamUserIds)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data || []
}

export async function createGoal(goalData) {
  const payload = { ...goalData, created_at: new Date().toISOString() }
  const { data, error } = await supabase
    .from('goals').insert(payload).select().single()
  if (error) throw error
  return data
}

export async function updateGoal(goalId, updates) {
  const safe = Object.fromEntries(
    Object.entries(updates).filter(([, v]) => v !== undefined)
  )
  const { data, error } = await supabase
    .from('goals').update(safe).eq('goal_id', goalId).select().single()
  if (error) throw error
  return data
}

export async function deleteGoal(goalId) {
  const { error } = await supabase.from('goals').delete().eq('goal_id', goalId)
  if (error) throw error
  return true
}

export async function approveGoal(goalId, approverId, approverName) {
  return updateGoal(goalId, {
    approval_status: 'approved',
    approved_by: approverId,
    approved_by_name: approverName,
    approved_at: new Date().toISOString(),
  })
}

export async function rejectGoal(goalId, reason, rejecterId) {
  return updateGoal(goalId, {
    approval_status: 'rejected',
    rejection_reason: reason,
    rejected_by: rejecterId,
    rejected_at: new Date().toISOString(),
  })
}

// ─────────────────────────────────────────────
// FEEDBACK
// ─────────────────────────────────────────────
export async function fetchGoalFeedback(goalId) {
  const { data, error } = await supabase
    .from('feedback')
    .select('*')
    .eq('goal_id', goalId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data || []
}

export async function fetchUserFeedback(userId) {
  const { data, error } = await supabase
    .from('feedback')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data || []
}

export async function fetchAllFeedback() {
  const { data, error } = await supabase
    .from('feedback')
    .select('*')
    .order('created_at', { ascending: false })
  if (error) throw error
  return data || []
}

export async function createFeedback(fbData) {
  const { data, error } = await supabase
    .from('feedback').insert({ ...fbData, created_at: new Date().toISOString() }).select().single()
  if (error) throw error
  return data
}

export async function updateFeedback(feedbackId, updates) {
  const { data, error } = await supabase
    .from('feedback').update(updates).eq('feedback_id', feedbackId).select().single()
  if (error) throw error
  return data
}

export async function deleteFeedback(feedbackId) {
  const { error } = await supabase.from('feedback').delete().eq('feedback_id', feedbackId)
  if (error) throw error
}

export async function fetchFeedbackReplies(feedbackId) {
  const { data, error } = await supabase
    .from('feedback_replies').select('*').eq('feedback_id', feedbackId).order('created_at')
  if (error) return []
  return data || []
}

export async function createFeedbackReply(replyData) {
  const { data, error } = await supabase
    .from('feedback_replies').insert({ ...replyData, created_at: new Date().toISOString() }).select().single()
  if (error) throw error
  return data
}

// ─────────────────────────────────────────────
// NOTIFICATIONS
// ─────────────────────────────────────────────
export async function fetchNotifications(userId, limit = 50) {
  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit)
  if (error) throw error
  return data || []
}

export async function fetchAllNotificationsAdmin(limit = 500) {
  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit)
  if (error) throw error
  return data || []
}

export async function markNotificationRead(notificationId) {
  const { error } = await supabase
    .from('notifications')
    .update({ is_read: true, read_at: new Date().toISOString() })
    .eq('id', notificationId)
  if (error) throw error
}

export async function markAllNotificationsRead(userId) {
  const { error } = await supabase
    .from('notifications')
    .update({ is_read: true, read_at: new Date().toISOString() })
    .eq('user_id', userId)
    .eq('is_read', false)
  if (error) throw error
}

export async function createNotification(notifData) {
  const { error } = await supabase
    .from('notifications')
    .insert({ ...notifData, created_at: new Date().toISOString() })
  if (error) console.error('Notification insert error:', error)
}

// ─────────────────────────────────────────────
// PASSWORD RESET
// ─────────────────────────────────────────────
export async function createPasswordResetToken(email) {
  const token = Math.random().toString(36).slice(2, 10).toUpperCase()
  const expiresAt = new Date(Date.now() + 3600 * 1000).toISOString()
  const user = await supabase.from('users').select('id').eq('email', email).single()
  if (user.error) throw new Error('Email not found')
  await supabase.from('password_resets').insert({
    user_id: user.data.id, token, expires_at: expiresAt, used: false,
  })
  return token
}

export async function resetPasswordWithToken(token, newPassword) {
  const { data: reset, error } = await supabase
    .from('password_resets').select('*').eq('token', token).eq('used', false).single()
  if (error || !reset) throw new Error('Invalid or expired token')
  if (new Date() > new Date(reset.expires_at)) throw new Error('Token expired')
  await supabase.from('users').update({ password: newPassword }).eq('id', reset.user_id)
  await supabase.from('password_resets').update({ used: true }).eq('token', token)
  return true
}

// ═════════════════════════════════════════════════════════════
// NOTIFICATION ENGINE
// ═════════════════════════════════════════════════════════════

// ── Core sender ───────────────────────────────────────────────
async function sendNotifications(rows) {
  if (!rows.length) return
  const ts = new Date().toISOString()
  const payload = rows.map(r => ({ ...r, created_at: ts, is_read: false }))
  const { error } = await supabase.from('notifications').insert(payload)
  if (error) console.error('[Notification] insert error:', error.message)
}

// ── Lookup helpers ────────────────────────────────────────────

// Returns IDs of all HR users
async function getHRIds() {
  const { data } = await supabase.from('users').select('id').eq('role', 'HR')
  return (data || []).map(u => u.id)
}

// Returns IDs of all CMD users
async function getCMDIds() {
  const { data } = await supabase.from('users').select('id').eq('role', 'CMD')
  return (data || []).map(u => u.id)
}

// Returns IDs of all VP users
async function getVPIds() {
  const { data } = await supabase.from('users').select('id').eq('role', 'VP')
  return (data || []).map(u => u.id)
}

// Returns the manager_id of a given user
async function getManagerId(userId) {
  const { data } = await supabase
    .from('users').select('manager_id').eq('id', userId).single()
  return data?.manager_id || null
}

// Returns mini user object {id, name, role, manager_id}
async function getUserMini(userId) {
  const { data } = await supabase
    .from('users').select('id,name,role,manager_id').eq('id', userId).single()
  return data || null
}

// Returns user IDs for a specific role
async function getUsersByRole(role) {
  const { data } = await supabase.from('users').select('id').eq('role', role)
  return (data || []).map(u => u.id)
}

// Deduplicate + exclude the actor themselves
function recipients(ids, actorId) {
  return [...new Set(ids.filter(id => id && id !== actorId))]
}

// Build a notification row
function makeRow({ userId, actorId, actorName, actionType, details }) {
  return {
    user_id:        userId,
    action_by:      actorId  || null,
    action_by_name: actorName || 'System',
    action_type:    actionType,
    details,
  }
}

// ── Resolve who to notify for a given employee's actions ──────
// Returns { managerId, hrIds, cmdIds }
async function resolveOrgRecipients(employeeId) {
  const managerId = await getManagerId(employeeId)
  const hrIds     = await getHRIds()
  const cmdIds    = await getCMDIds()
  return { managerId, hrIds, cmdIds }
}

// ═════════════════════════════════════════════════════════════
// GOAL NOTIFICATIONS
// ═════════════════════════════════════════════════════════════

// Employee creates a goal → Manager + HR + CMD
export async function notifyGoalCreated(goal, actor) {
  const { managerId, hrIds, cmdIds } = await resolveOrgRecipients(actor.id)
  const targetIds = recipients(
    [managerId, ...hrIds, ...cmdIds],
    actor.id
  )
  const rows = targetIds.map(uid => makeRow({
    userId:     uid,
    actorId:    actor.id,
    actorName:  actor.name,
    actionType: 'goal_created',
    details:    `${actor.name} (${actor.role}) created a new goal: "${goal.goal_title}"`,
  }))
  await sendNotifications(rows)
}

// Employee updates achievement → Manager + HR
export async function notifyGoalUpdated(goal, actor) {
  const { managerId, hrIds } = await resolveOrgRecipients(actor.id)
  const targetIds = recipients([managerId, ...hrIds], actor.id)
  const rows = targetIds.map(uid => makeRow({
    userId:     uid,
    actorId:    actor.id,
    actorName:  actor.name,
    actionType: 'goal_updated',
    details:    `${actor.name} updated achievement for "${goal.goal_title}"`,
  }))
  await sendNotifications(rows)
}

// Employee completes a goal → Manager + HR + CMD
export async function notifyGoalCompleted(goal, actor) {
  const { managerId, hrIds, cmdIds } = await resolveOrgRecipients(actor.id)
  const targetIds = recipients([managerId, ...hrIds, ...cmdIds], actor.id)
  const rows = targetIds.map(uid => makeRow({
    userId:     uid,
    actorId:    actor.id,
    actorName:  actor.name,
    actionType: 'goal_completed',
    details:    `${actor.name} completed goal "${goal.goal_title}"`,
  }))
  await sendNotifications(rows)
}

// Employee edits a goal (title/kpi/target) → Manager + HR
export async function notifyGoalEdited(goal, actor) {
  const { managerId, hrIds } = await resolveOrgRecipients(actor.id)
  const targetIds = recipients([managerId, ...hrIds], actor.id)
  const rows = targetIds.map(uid => makeRow({
    userId:     uid,
    actorId:    actor.id,
    actorName:  actor.name,
    actionType: 'goal_edited',
    details:    `${actor.name} edited goal "${goal.goal_title}"`,
  }))
  await sendNotifications(rows)
}

// Employee deletes a goal → Manager + HR
export async function notifyGoalDeleted(goalTitle, actor) {
  const { managerId, hrIds } = await resolveOrgRecipients(actor.id)
  const targetIds = recipients([managerId, ...hrIds], actor.id)
  const rows = targetIds.map(uid => makeRow({
    userId:     uid,
    actorId:    actor.id,
    actorName:  actor.name,
    actionType: 'goal_deleted',
    details:    `${actor.name} deleted goal "${goalTitle}"`,
  }))
  await sendNotifications(rows)
}

// Manager/VP/CMD approves a goal → Employee + HR + CMD
export async function notifyGoalApproved(goal, approverId, approverName) {
  const hrIds  = await getHRIds()
  const cmdIds = await getCMDIds()
  const targetIds = recipients([goal.user_id, ...hrIds, ...cmdIds], approverId)
  const rows = targetIds.map(uid => makeRow({
    userId:     uid,
    actorId:    approverId,
    actorName:  approverName,
    actionType: 'goal_approved',
    details:    `Goal "${goal.goal_title}" was approved by ${approverName}`,
  }))
  await sendNotifications(rows)
}

// Manager/VP/CMD rejects a goal → Employee + HR + CMD
export async function notifyGoalRejected(goal, rejecterId, rejectorName, reason) {
  const hrIds  = await getHRIds()
  const cmdIds = await getCMDIds()
  const targetIds = recipients([goal.user_id, ...hrIds, ...cmdIds], rejecterId)
  const rows = targetIds.map(uid => makeRow({
    userId:     uid,
    actorId:    rejecterId,
    actorName:  rejectorName,
    actionType: 'goal_rejected',
    details:    `Goal "${goal.goal_title}" was rejected by ${rejectorName}. Reason: ${reason || 'Not specified'}`,
  }))
  await sendNotifications(rows)
}

// ═════════════════════════════════════════════════════════════
// FEEDBACK NOTIFICATIONS
// ═════════════════════════════════════════════════════════════

// Any reviewer gives feedback → Employee + their Manager + HR
export async function notifyFeedbackSubmitted(feedback, reviewerName, goalTitle, goalOwnerId) {
  const managerId = await getManagerId(goalOwnerId)
  const hrIds     = await getHRIds()
  const targetIds = recipients(
    [goalOwnerId, managerId, ...hrIds],
    feedback.feedback_by
  )
  const rows = targetIds.map(uid => makeRow({
    userId:     uid,
    actorId:    feedback.feedback_by,
    actorName:  reviewerName,
    actionType: 'feedback_given',
    details:    `${reviewerName} submitted ${feedback.feedback_type || 'feedback'} on goal "${goalTitle}"`,
  }))
  await sendNotifications(rows)
}

// ═════════════════════════════════════════════════════════════
// EMPLOYEE MANAGEMENT NOTIFICATIONS
// ═════════════════════════════════════════════════════════════

// Admin/HR creates a new employee → HR + CMD
export async function notifyEmployeeCreated(newEmployee, actor) {
  const hrIds  = await getHRIds()
  const cmdIds = await getCMDIds()
  const targetIds = recipients([...hrIds, ...cmdIds], actor.id)
  const rows = targetIds.map(uid => makeRow({
    userId:     uid,
    actorId:    actor.id,
    actorName:  actor.name,
    actionType: 'employee_created',
    details:    `${actor.name} added a new employee: ${newEmployee.name} (${newEmployee.role}${newEmployee.department ? ', ' + newEmployee.department : ''})`,
  }))
  await sendNotifications(rows)
}

// Admin/HR edits an employee's profile → That employee + HR + CMD
export async function notifyEmployeeUpdated(updatedEmployee, actor) {
  const hrIds  = await getHRIds()
  const cmdIds = await getCMDIds()
  const targetIds = recipients(
    [updatedEmployee.id, ...hrIds, ...cmdIds],
    actor.id
  )
  const rows = targetIds.map(uid => makeRow({
    userId:     uid,
    actorId:    actor.id,
    actorName:  actor.name,
    actionType: 'employee_updated',
    details:    `${actor.name} updated profile details for ${updatedEmployee.name}`,
  }))
  await sendNotifications(rows)
}

// Admin/HR deletes an employee → HR + CMD
export async function notifyEmployeeDeleted(deletedName, deletedRole, actor) {
  const hrIds  = await getHRIds()
  const cmdIds = await getCMDIds()
  const targetIds = recipients([...hrIds, ...cmdIds], actor.id)
  const rows = targetIds.map(uid => makeRow({
    userId:     uid,
    actorId:    actor.id,
    actorName:  actor.name,
    actionType: 'employee_deleted',
    details:    `${actor.name} permanently deleted employee: ${deletedName} (${deletedRole})`,
  }))
  await sendNotifications(rows)
}

// Admin/HR deactivates (marks as left) → That employee + their Manager + HR + CMD
export async function notifyEmployeeDeactivated(employee, exitDate, actor) {
  const managerId = await getManagerId(employee.id)
  const hrIds     = await getHRIds()
  const cmdIds    = await getCMDIds()
  const targetIds = recipients(
    [employee.id, managerId, ...hrIds, ...cmdIds],
    actor.id
  )
  const rows = targetIds.map(uid => makeRow({
    userId:     uid,
    actorId:    actor.id,
    actorName:  actor.name,
    actionType: 'employee_deactivated',
    details:    `${employee.name} has been marked as left (exit date: ${exitDate}). Actioned by ${actor.name}.`,
  }))
  await sendNotifications(rows)
}

// Admin/HR reactivates an employee → That employee + HR + CMD
export async function notifyEmployeeReactivated(employee, actor) {
  const hrIds  = await getHRIds()
  const cmdIds = await getCMDIds()
  const targetIds = recipients(
    [employee.id, ...hrIds, ...cmdIds],
    actor.id
  )
  const rows = targetIds.map(uid => makeRow({
    userId:     uid,
    actorId:    actor.id,
    actorName:  actor.name,
    actionType: 'employee_reactivated',
    details:    `${employee.name}'s account has been reactivated by ${actor.name}`,
  }))
  await sendNotifications(rows)
}

// Admin/HR assigns or changes reporting line → Employee + new Manager + HR
export async function notifyReportingChanged(employee, newManagerId, newManagerName, actor) {
  const hrIds = await getHRIds()
  const targetIds = recipients(
    [employee.id, newManagerId, ...hrIds],
    actor.id
  )
  const rows = targetIds.map(uid => makeRow({
    userId:     uid,
    actorId:    actor.id,
    actorName:  actor.name,
    actionType: 'reporting_changed',
    details:    newManagerId
      ? `${employee.name} now reports to ${newManagerName}. Updated by ${actor.name}.`
      : `${employee.name}'s reporting line was cleared by ${actor.name}.`,
  }))
  await sendNotifications(rows)
}

// Admin/HR bulk-creates employees → HR + CMD (one summary notification)
export async function notifyBulkUploadComplete(createdCount, actor) {
  const hrIds  = await getHRIds()
  const cmdIds = await getCMDIds()
  const targetIds = recipients([...hrIds, ...cmdIds], actor.id)
  const rows = targetIds.map(uid => makeRow({
    userId:     uid,
    actorId:    actor.id,
    actorName:  actor.name,
    actionType: 'bulk_upload',
    details:    `${actor.name} bulk-uploaded ${createdCount} new employee${createdCount !== 1 ? 's' : ''}`,
  }))
  await sendNotifications(rows)
}

// ═════════════════════════════════════════════════════════════
// SYSTEM / SCHEDULED NOTIFICATIONS
// ═════════════════════════════════════════════════════════════

// Run daily — escalates based on how many days overdue
// day 1: Employee + Manager
// day 2: + VP
// day 3+: + CMD (CRITICAL)
export async function notifyOverdueGoals() {
  const today = new Date()
  const { data: overdueGoals } = await supabase
    .from('goals').select('*').eq('status', 'Active')
    .lt('end_date', today.toISOString().split('T')[0])
  if (!overdueGoals?.length) return

  const hrIds  = await getHRIds()
  const rows   = []

  for (const goal of overdueGoals) {
    const endDate   = new Date(goal.end_date)
    const daysOver  = Math.floor((today - endDate) / (1000 * 60 * 60 * 24))
    const owner     = await getUserMini(goal.user_id)
    if (!owner) continue

    let escalationIds = [...hrIds]

    if (daysOver >= 3) {
      // Critical — escalate to CMD
      const cmdIds = await getCMDIds()
      escalationIds.push(...cmdIds, ...await getVPIds())
    } else if (daysOver >= 2) {
      // Escalate to VP
      escalationIds.push(...await getVPIds())
    }

    // Always include owner and their manager
    if (owner.manager_id) escalationIds.push(owner.manager_id)
    escalationIds.push(goal.user_id)

    const label      = daysOver >= 3 ? 'CRITICAL — goal severely overdue' : daysOver >= 2 ? 'Escalated — goal overdue' : 'Overdue'
    const actionType = daysOver >= 3 ? 'overdue_critical' : daysOver >= 2 ? 'overdue_escalated' : 'overdue'

    for (const uid of recipients(escalationIds, null)) {
      rows.push(makeRow({
        userId:     uid,
        actorId:    null,
        actorName:  'System',
        actionType,
        details:    `${label}: "${goal.goal_title}" is ${daysOver} day${daysOver !== 1 ? 's' : ''} overdue`,
      }))
    }
  }

  if (rows.length) await sendNotifications(rows)
}

// Run daily — remind 3 days before deadline
// Notifies: Employee + Manager
export async function notifyUpcomingDeadlines() {
  const today   = new Date()
  const in3days = new Date(today)
  in3days.setDate(in3days.getDate() + 3)
  const dateStr = in3days.toISOString().split('T')[0]

  const { data: goals } = await supabase
    .from('goals').select('*').eq('status', 'Active').eq('end_date', dateStr)
  if (!goals?.length) return

  const rows = []
  for (const goal of goals) {
    const owner = await getUserMini(goal.user_id)
    if (!owner) continue
    for (const uid of recipients([goal.user_id, owner.manager_id], null)) {
      rows.push(makeRow({
        userId:     uid,
        actorId:    null,
        actorName:  'System',
        actionType: 'deadline_reminder',
        details:    `Deadline in 3 days: "${goal.goal_title}" is due on ${dateStr}`,
      }))
    }
  }
  if (rows.length) await sendNotifications(rows)
}

// ─────────────────────────────────────────────
// REVIEW MEETINGS
// ─────────────────────────────────────────────
export async function createReviewMeeting(data) {
  const { data: result, error } = await supabase
    .from('review_meetings')
    .insert({ ...data, created_at: new Date().toISOString() })
    .select().single()
  if (error) throw error
  return result
}

export async function fetchAllReviewMeetings() {
  const { data, error } = await supabase
    .from('review_meetings')
    .select('*')
    .order('meeting_date', { ascending: false })
  if (error) throw error
  return data || []
}

export async function updateReviewMeeting(id, updates) {
  const { data, error } = await supabase
    .from('review_meetings').update(updates).eq('id', id).select().single()
  if (error) throw error
  return data
}

export async function deleteReviewMeeting(id) {
  const { error } = await supabase.from('review_meetings').delete().eq('id', id)
  if (error) throw error
  return true
}

// ─────────────────────────────────────────────
// FILE UPLOAD
// ─────────────────────────────────────────────
export async function uploadGoalFile(goalId, file) {
  const fileName = `${goalId}/${Date.now()}_${file.name}`
  const { data, error } = await supabase.storage
    .from('goal-files')
    .upload(fileName, file, { contentType: file.type, upsert: false })

  if (error) {
    if (error.message?.includes('502') || error.message?.includes('bucket')) {
      throw new Error('Storage not set up. Please create the "goal-files" bucket in Supabase Dashboard → Storage.')
    }
    throw new Error('File upload failed: ' + error.message)
  }

  const { data: urlData } = supabase.storage
    .from('goal-files')
    .getPublicUrl(fileName)

  return {
    name:       file.name,
    url:        urlData.publicUrl,
    type:       file.type,
    size:       file.size,
    path:       fileName,
    uploadedAt: new Date().toISOString(),
  }
}

export async function deleteGoalFile(filePath) {
  const { error } = await supabase.storage.from('goal-files').remove([filePath])
  if (error) throw error
}

export async function deactivateUser(id, exitDate) {
  const { data, error } = await supabase
    .from('users')
    .update({ is_active: false, exit_date: exitDate })
    .eq('id', id)
    .select().single()
  if (error) throw error
  return data
}

export async function reactivateUser(id) {
  const { data, error } = await supabase
    .from('users')
    .update({ is_active: true, exit_date: null })
    .eq('id', id)
    .select().single()
  if (error) throw error
  return data
}

// ─────────────────────────────────────────────
// APP SETTINGS
// ─────────────────────────────────────────────
export async function getAppSetting(key) {
  const { data, error } = await supabase
    .from('app_settings')
    .select('value')
    .eq('key', key)
    .maybeSingle()
  if (error) return null
  return data?.value ?? null
}

export async function setAppSetting(key, value) {
  const { error } = await supabase
    .from('app_settings')
    .upsert({ key, value }, { onConflict: 'key' })
  if (error) throw error
  return true
}

// ─────────────────────────────────────────────
// TEST EMAIL TRIGGER (Admin only)
// ─────────────────────────────────────────────
export async function triggerTestEmail(type, email) {
  // Calls a Supabase Edge Function OR your Node script via a stored procedure
  // Since we're using a Node script, we store the request in a trigger table
  // and the script polls it — OR we use a simple approach: direct SMTP via API

  // Simplest approach: insert a record into a test_email_queue table
  // and the admin can see it was queued. For actual sending, use the node CLI.
  // But for a fully in-browser trigger, we call an edge function.

  // For now: insert into notifications as a test log, and return instructions
  const { data: user } = await supabase
    .from('users').select('id, name').eq('email', email).single()

  if (!user) throw new Error(`No user found with email: ${email}`)

  await supabase.from('notifications').insert({
    user_id:        user.id,
    action_by:      null,
    action_by_name: 'Admin Test',
    action_type:    type === 'reminder' ? 'monthly_reminder' : 'top_performer',
    details:        `[TEST] ${type === 'reminder' ? 'Monthly reminder' : 'Top performer'} email was manually triggered by Admin for ${email}`,
    is_read:        false,
    created_at:     new Date().toISOString(),
  })

  return { success: true, user: user.name }
}