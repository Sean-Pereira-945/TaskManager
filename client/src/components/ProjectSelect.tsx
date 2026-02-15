import { useEffect, useMemo, useRef, useState } from 'react'

import type { Project } from '../types/project'

type ProjectSelectProps = {
  projects: Project[]
  value: string | null
  disabled?: boolean
  onChange: (next: string | null) => void
}

const ProjectSelect = ({ projects, value, disabled = false, onChange }: ProjectSelectProps) => {
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement | null>(null)

  const selectedProject = useMemo(() => {
    return projects.find((project) => project.id === value) ?? null
  }, [projects, value])

  useEffect(() => {
    if (!open) {
      return undefined
    }

    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false)
      }
    }

    document.addEventListener('keydown', handleKey)
    return () => {
      document.removeEventListener('keydown', handleKey)
    }
  }, [open])

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (!containerRef.current) {
        return
      }
      if (!containerRef.current.contains(event.target as Node)) {
        setOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

  const toggleOpen = () => {
    if (disabled || projects.length === 0) {
      return
    }
    setOpen((prev) => !prev)
  }

  const handleSelect = (projectId: string) => {
    onChange(projectId)
    setOpen(false)
  }

  const label = selectedProject ? selectedProject.name : projects[0]?.name ?? 'Select a project'

  return (
    <div
      className={`project-select ${open ? 'open' : ''} ${disabled ? 'is-disabled' : ''}`.trim()}
      ref={containerRef}
    >
      <button
        type="button"
        className="project-select__trigger"
        onClick={toggleOpen}
        aria-haspopup="listbox"
        aria-expanded={open}
        disabled={disabled || projects.length === 0}
      >
        <span className="project-select__label">{label}</span>
        <span className="project-select__chevron" aria-hidden>
          ▾
        </span>
      </button>
      {open && (
        <ul className="project-select__menu" role="listbox">
          {projects.map((project) => (
            <li key={project.id}>
              <button
                type="button"
                role="option"
                className={`project-select__option ${project.id === value ? 'active' : ''}`}
                aria-selected={project.id === value}
                onClick={() => handleSelect(project.id)}
              >
                <span className="project-select__option-name">{project.name}</span>
                {project.role === 'owner' && <span className="project-select__badge">Owner</span>}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

export default ProjectSelect
