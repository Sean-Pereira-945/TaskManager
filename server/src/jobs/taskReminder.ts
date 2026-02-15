import { db } from '../lib/db'
import { isEmailEnabled, sendEmail } from '../lib/mailer'

const LOOKAHEAD_MS = 12 * 60 * 60 * 1000
const WINDOW_MS = 60 * 60 * 1000
const POLL_INTERVAL_MS = 60 * 60 * 1000

type ReminderCandidate = {
  id: string
  title: string
  due_date: Date
  project_name: string
  assignee_email: string
  assignee_name: string | null
}

const REMINDER_QUERY = `
  SELECT
    t.id,
    t.title,
    t.due_date,
    p.name AS project_name,
    assignee.email AS assignee_email,
    assignee.name AS assignee_name
  FROM tasks t
  INNER JOIN users assignee ON assignee.id = t.assignee_id
  INNER JOIN projects p ON p.id = t.project_id
  WHERE
    t.assignee_id IS NOT NULL
    AND t.due_date IS NOT NULL
    AND t.reminder_sent_at IS NULL
    AND t.completed_at IS NULL
    AND t.status <> 'DONE'
    AND t.due_date BETWEEN $1 AND $2
`

const formatReminderBody = (task: ReminderCandidate) => {
  const friendlyName = task.assignee_name?.split(' ')[0] ?? task.assignee_name ?? 'there'
  const dueUtc = task.due_date.toUTCString()
  const lines = [
    `Hi ${friendlyName},`,
    '',
    `Heads up: "${task.title}" in project "${task.project_name}" is due in about 12 hours.`,
    `Planned deadline: ${dueUtc}.`,
    '',
    'Please wrap it up or let the project owner know if you need help.',
    '',
    '— Task Manager bot',
  ]

  return lines.join('\n')
}

export const runTaskReminderSweep = async () => {
  if (!isEmailEnabled()) {
    return
  }

  const now = Date.now()
  const windowStart = new Date(now + LOOKAHEAD_MS)
  const windowEnd = new Date(now + LOOKAHEAD_MS + WINDOW_MS)

  try {
    const { rows } = await db.query<ReminderCandidate>(REMINDER_QUERY, [windowStart, windowEnd])

    for (const task of rows) {
      const subject = `Reminder: ${task.title} is due soon`
      const text = formatReminderBody(task)

      try {
        await sendEmail({ to: task.assignee_email, subject, text })
        await db.query('UPDATE tasks SET reminder_sent_at = NOW() WHERE id = $1', [task.id])
        console.info(`Sent reminder for task ${task.id} to ${task.assignee_email}`)
      } catch (error) {
        console.error('Failed to send reminder email', { taskId: task.id, error })
      }
    }
  } catch (error) {
    console.error('Task reminder sweep failed', error)
  }
}

let schedulerHandle: NodeJS.Timeout | null = null
let schedulerStarted = false

export const startTaskReminderScheduler = () => {
  if (schedulerStarted) {
    return
  }

  if (!isEmailEnabled()) {
    console.info('Skipping reminder scheduler because email is disabled.')
    return
  }

  schedulerStarted = true
  void runTaskReminderSweep()
  schedulerHandle = setInterval(() => {
    void runTaskReminderSweep()
  }, POLL_INTERVAL_MS)
}

export const stopTaskReminderScheduler = () => {
  if (schedulerHandle) {
    clearInterval(schedulerHandle)
    schedulerHandle = null
    schedulerStarted = false
  }
}
