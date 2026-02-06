import type { Task, TaskStatus } from '../types/task'
import TaskCard from './TaskCard'

type TaskColumnProps = {
  title: string
  accent: string
  description: string
  tasks: Task[]
  onEdit: (task: Task) => void
  onDelete: (taskId: string) => void
  onStatusChange: (taskId: string, nextStatus: TaskStatus) => Promise<void> | void
}

const TaskColumn = ({ title, accent, description, tasks, onEdit, onDelete, onStatusChange }: TaskColumnProps) => {
  return (
    <section className="task-column">
      <header>
        <div>
          <p className="eyebrow" style={{ color: accent }}>
            {title}
          </p>
          <h2>
            {tasks.length} {tasks.length === 1 ? 'task' : 'tasks'}
          </h2>
        </div>
        <p>{description}</p>
      </header>

      {tasks.length === 0 ? (
        <div className="empty-column">Nothing here yet</div>
      ) : (
        tasks.map((task) => (
          <TaskCard key={task.id} task={task} onEdit={onEdit} onDelete={onDelete} onStatusChange={onStatusChange} />
        ))
      )}
    </section>
  )
}

export default TaskColumn
