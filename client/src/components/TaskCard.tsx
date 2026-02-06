import { useEffect, useState } from 'react'

import type { Task, TaskStatus } from '../types/task'

type TaskCardProps = {
  task: Task
  onEdit: (task: Task) => void
  onDelete: (taskId: string) => void
  onStatusChange: (taskId: string, nextStatus: TaskStatus) => Promise<void> | void
}

const statusLabels: Record<TaskStatus, string> = {
  TODO: 'Backlog',
  IN_PROGRESS: 'In Progress',
  DONE: 'Complete',
}

const statusAccent: Record<TaskStatus, string> = {
  TODO: '#f97316',
  IN_PROGRESS: '#0ea5e9',
  DONE: '#10b981',
}

const formatDate = (value: string) =>
  new Intl.DateTimeFormat('en', {
    month: 'short',
    day: 'numeric',
  }).format(new Date(value))

const formatDueCountdown = (dueDate: string) => {
  const target = new Date(dueDate).getTime()
  if (Number.isNaN(target)) return null

  const diffMs = target - Date.now()
  const overdue = diffMs < 0
  const remaining = Math.abs(diffMs)
  const dayMs = 86_400_000
  const hourMs = 3_600_000
  const minuteMs = 60_000

  const days = Math.floor(remaining / dayMs)
  const hours = Math.floor((remaining % dayMs) / hourMs)
  const minutes = Math.floor((remaining % hourMs) / minuteMs)
  const seconds = Math.floor((remaining % minuteMs) / 1000)

  const pad = (value: number) => value.toString().padStart(2, '0')
  const label = `${pad(days)}d ${pad(hours)}h ${pad(minutes)}m ${pad(seconds)}s`

  return {
    overdue,
    label,
    exact: new Intl.DateTimeFormat('en', {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(new Date(dueDate)),
  }
}

const TaskCard = ({ task, onEdit, onDelete, onStatusChange }: TaskCardProps) => {
  const [dueMeta, setDueMeta] = useState(() => (task.dueDate ? formatDueCountdown(task.dueDate) : null))

  useEffect(() => {
    if (!task.dueDate) {
      setDueMeta(null)
      return
    }

    const dueDate = task.dueDate
    const tick = () => setDueMeta(formatDueCountdown(dueDate))
    tick()
    const intervalId = window.setInterval(tick, 1000)
    return () => window.clearInterval(intervalId)
  }, [task.dueDate])

  return (
    <article className="task-card" data-status={task.status}>
      <header>
        <p className="eyebrow" style={{ color: statusAccent[task.status] }}>
          {statusLabels[task.status]}
        </p>
        <button type="button" className="ghost" onClick={() => onEdit(task)}>
          Edit
        </button>
      </header>
      <h3>{task.title}</h3>
      <p className="task-card__description">{task.description}</p>
      {dueMeta && (
        <div className={`due-pill ${dueMeta.overdue ? 'overdue' : ''}`}>
          <div>
            <span>{dueMeta.overdue ? 'Overdue by' : 'Due in'}</span>
            <strong>{dueMeta.label}</strong>
          </div>
          <small>{dueMeta.exact}</small>
        </div>
      )}
      <footer>
        <div className="task-card__meta">
          <label>
            <span>Status</span>
            <select value={task.status} onChange={(event) => onStatusChange(task.id, event.target.value as TaskStatus)}>
              {Object.entries(statusLabels).map(([status, label]) => (
                <option key={status} value={status}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <div className="timestamp">
            <span>Created</span>
            <strong>{formatDate(task.createdAt)}</strong>
          </div>
        </div>
        <button type="button" className="danger" onClick={() => onDelete(task.id)}>
          Remove
        </button>
      </footer>
    </article>
  )
}

export default TaskCard
