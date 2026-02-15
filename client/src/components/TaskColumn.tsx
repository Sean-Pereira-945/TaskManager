import type { CSSProperties } from 'react'

import type { Task, TaskStatus } from '../types/task'
import TaskCard from './TaskCard'
import { useScrollReveal } from '../lib/useScrollReveal'

type TaskColumnProps = {
  title: string
  accent: string
  description: string
  icon: string
  variant: 'backlog' | 'building' | 'delivered'
  tasks: Task[]
  onEdit: (task: Task) => void
  onDelete: (taskId: string) => void
  onStatusChange: (taskId: string, nextStatus: TaskStatus) => Promise<void> | void
  isExpanded: boolean
  onToggle: () => void
  canMarkDone: boolean
  onCompletionBlocked?: () => void
}

const TaskColumn = ({ title, accent, description, icon, variant, tasks, onEdit, onDelete, onStatusChange, isExpanded, onToggle, canMarkDone, onCompletionBlocked }: TaskColumnProps) => {
  const { ref: revealRef, isVisible } = useScrollReveal<HTMLElement>()
  const sectionStyle = {
    '--section-accent': accent,
  } as CSSProperties

  const countLabel = () => {
    if (tasks.length === 0) return 'Nothing here yet'
    return `${tasks.length} ${variant === 'delivered' ? 'complete' : 'active'}`
  }

  return (
    <section
      ref={revealRef}
      className={`task-section section-${variant} ${isExpanded ? 'expanded' : 'collapsed'} ${isVisible ? 'in-view' : ''}`}
      style={sectionStyle}
    >
      <button type="button" className="section-toggle" onClick={onToggle} aria-expanded={isExpanded}>
        <div className="section-bar">
          <div className="section-bar-left">
            <div className="section-bar-icon">{icon}</div>
            <div className="section-header">
              <p className="section-label">◢ {title.toUpperCase()}</p>
              <p className="section-title">
                {tasks.length} {tasks.length === 1 ? 'task' : 'tasks'}
              </p>
              <p className="section-subtitle">{description}</p>
            </div>
          </div>
          <div className="section-bar-right">
            <span className="section-count">{countLabel()}</span>
          </div>
        </div>
      </button>
      {isExpanded && (
        <div className="section-content">
          {tasks.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">◢</div>
              <p>Nothing here yet</p>
            </div>
          ) : (
            <div className="task-list">
              {tasks.map((task) => (
                <TaskCard
                  key={task.id}
                  task={task}
                  onEdit={onEdit}
                  onDelete={onDelete}
                  onStatusChange={onStatusChange}
                  canMarkDone={canMarkDone}
                  onCompletionBlocked={onCompletionBlocked}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </section>
  )
}

export default TaskColumn
