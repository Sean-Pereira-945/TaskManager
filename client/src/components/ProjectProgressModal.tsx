import { useMemo } from 'react'

import type { Task, TaskStatus } from '../types/task'

type ProjectProgressModalProps = {
  open: boolean
  onClose: () => void
  projectName: string
  tasks: Task[]
  loading: boolean
  error: string | null
}

const statusMeta: Record<TaskStatus, { label: string; description: string }> = {
  TODO: {
    label: 'Backlog',
    description: 'Ideas queued up and waiting to be prioritized.',
  },
  IN_PROGRESS: {
    label: 'In Progress',
    description: 'Active work that is currently being built.',
  },
  DONE: {
    label: 'Shipped',
    description: 'Completed work that is ready for QA/launch.',
  },
}

const dayMs = 86_400_000
const hourMs = 3_600_000
const minuteMs = 60_000

const formatDuration = (ms: number) => {
  const absolute = Math.abs(ms)
  const days = Math.floor(absolute / dayMs)
  const hours = Math.floor((absolute % dayMs) / hourMs)
  const minutes = Math.floor((absolute % hourMs) / minuteMs)

  const parts: string[] = []
  if (days) parts.push(`${days}d`)
  if (hours) parts.push(`${hours}h`)
  if (!days && minutes) parts.push(`${minutes}m`)
  if (!parts.length) {
    const seconds = Math.max(1, Math.round(absolute / 1000))
    parts.push(`${seconds}s`)
  }
  return parts.join(' ')
}

const ProjectProgressModal = ({ open, onClose, projectName, tasks, loading, error }: ProjectProgressModalProps) => {
  const summary = useMemo(() => {
    const backlog = tasks.filter((task) => task.status === 'TODO')
    const inProgress = tasks.filter((task) => task.status === 'IN_PROGRESS')
    const done = tasks.filter((task) => task.status === 'DONE')

    const completionMap = new Map<string, {
      memberName: string
      durations: number[]
      dueDiffs: number[]
    }>()

    done
      .filter((task) => task.completedAt)
      .forEach((task) => {
        const memberId = task.assignee?.id ?? 'unassigned'
        const memberName = task.assignee?.name ?? task.assignee?.email ?? 'Unassigned'
        const completedAt = new Date(task.completedAt as string).getTime()
        const createdAt = new Date(task.createdAt).getTime()
        const duration = completedAt - createdAt
        const dueDiff = task.dueDate ? completedAt - new Date(task.dueDate).getTime() : null

        if (!completionMap.has(memberId)) {
          completionMap.set(memberId, {
            memberName,
            durations: [],
            dueDiffs: [],
          })
        }
        const record = completionMap.get(memberId)!
        record.durations.push(duration)
        if (dueDiff !== null) {
          record.dueDiffs.push(dueDiff)
        }
      })

    const completionStats = Array.from(completionMap.entries()).map(([memberId, payload]) => {
      const avgDuration = payload.durations.reduce((acc, value) => acc + value, 0) / payload.durations.length
      const avgDueDiff = payload.dueDiffs.length
        ? payload.dueDiffs.reduce((acc, value) => acc + value, 0) / payload.dueDiffs.length
        : null
      return {
        memberId,
        memberName: payload.memberName,
        avgDuration,
        avgDueDiff,
        taskCount: payload.durations.length,
      }
    })

    const fastest = completionStats.reduce<null | typeof completionStats[number]>((best, current) => {
      if (!best) return current
      return current.avgDuration < best.avgDuration ? current : best
    }, null)

    return {
      backlog,
      inProgress,
      done,
      completionStats,
      fastest,
    }
  }, [tasks])

  const pickList = (status: TaskStatus) => {
    if (status === 'TODO') return summary.backlog
    if (status === 'IN_PROGRESS') return summary.inProgress
    return summary.done
  }

  if (!open) {
    return null
  }

  return (
    <div className="progress-modal__backdrop" role="dialog" aria-modal="true">
      <div className="progress-modal">
        <header className="progress-modal__header">
          <div>
            <p className="eyebrow">Project Insight</p>
            <h2>{projectName}</h2>
          </div>
          <button type="button" className="ghost" onClick={onClose}>
            Close
          </button>
        </header>

        {loading ? (
          <div className="progress-modal__state">Analyzing project…</div>
        ) : error ? (
          <div className="banner error glass">{error}</div>
        ) : (
          <div className="progress-modal__body">
            <div className="progress-summary">
              {(['TODO', 'IN_PROGRESS', 'DONE'] as TaskStatus[]).map((status) => {
                const list = pickList(status)
                const meta = statusMeta[status]
                return (
                  <div key={status} className="progress-card">
                    <p className="progress-card__label">{meta.label}</p>
                    <p className="progress-card__value">{list.length}</p>
                    <p className="progress-card__hint">{meta.description}</p>
                  </div>
                )
              })}
            </div>

            <section className="progress-section">
              <h3>Status breakdown</h3>
              <div className="progress-columns">
                {(['TODO', 'IN_PROGRESS', 'DONE'] as TaskStatus[]).map((status) => {
                  const list = pickList(status)
                  const meta = statusMeta[status]
                  return (
                    <article key={status} className="progress-status">
                      <header>
                        <p className="progress-status__label">{meta.label}</p>
                        <span className="progress-status__count">{list.length} tasks</span>
                      </header>
                      <p className="progress-status__description">{meta.description}</p>
                      {list.length === 0 ? (
                        <p className="progress-status__empty">No tasks in this state.</p>
                      ) : (
                        <ul>
                          {list.map((task) => (
                            <li key={task.id}>
                              <span className="task-name">{task.title}</span>
                              <span className="task-assignee-pill">
                                {task.assignee ? task.assignee.name ?? task.assignee.email : 'Unassigned'}
                              </span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </article>
                  )
                })}
              </div>
            </section>

            <section className="progress-section">
              <h3>Fastest finisher</h3>
              {summary.fastest ? (
                <div className="progress-fastest">
                  <p>
                    <strong>{summary.fastest.memberName}</strong> ships tasks in ~{formatDuration(summary.fastest.avgDuration)} on average
                    ({summary.fastest.taskCount} task{summary.fastest.taskCount === 1 ? '' : 's'}).
                  </p>
                  {summary.fastest.avgDueDiff === null ? (
                    <p className="progress-fastest__note">Due dates not available for these tasks.</p>
                  ) : summary.fastest.avgDueDiff > 0 ? (
                    <p className="progress-fastest__note">Typically finishes {formatDuration(summary.fastest.avgDueDiff)} late.</p>
                  ) : summary.fastest.avgDueDiff < 0 ? (
                    <p className="progress-fastest__note">Typically finishes {formatDuration(summary.fastest.avgDueDiff)} early.</p>
                  ) : (
                    <p className="progress-fastest__note">Usually right on time.</p>
                  )}
                </div>
              ) : (
                <p className="progress-status__empty">We need completed tasks to calculate speed.</p>
              )}
            </section>
          </div>
        )}
      </div>
    </div>
  )
}

export default ProjectProgressModal
