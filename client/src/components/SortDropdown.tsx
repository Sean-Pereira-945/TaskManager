import { useEffect, useMemo, useRef, useState } from 'react'

import type { TaskQueryState } from '../types/task'

const options: Array<{ value: TaskQueryState['sort']; label: string }> = [
  { value: 'newest', label: 'Newest first' },
  { value: 'oldest', label: 'Oldest first' },
  { value: 'title', label: 'Alphabetical' },
]

interface SortDropdownProps {
  value: TaskQueryState['sort']
  onChange: (next: TaskQueryState['sort']) => void
}

const SortDropdown = ({ value, onChange }: SortDropdownProps) => {
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement | null>(null)

  const selectedLabel = useMemo(() => {
    return options.find((option) => option.value === value)?.label ?? options[0]?.label ?? ''
  }, [value])

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

  const handleSelect = (next: TaskQueryState['sort']) => {
    onChange(next)
    setOpen(false)
  }

  return (
    <div className={`sort-dropdown ${open ? 'open' : ''}`} ref={containerRef}>
      <button
        type="button"
        className="sort-dropdown__trigger"
        onClick={() => setOpen((prev) => !prev)}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span>{selectedLabel}</span>
        <span className="sort-dropdown__chevron" aria-hidden>
          ▾
        </span>
      </button>
      {open && (
        <ul className="sort-dropdown__menu" role="listbox">
          {options.map((option) => (
            <li key={option.value}>
              <button
                type="button"
                role="option"
                aria-selected={option.value === value}
                className={`sort-dropdown__option ${option.value === value ? 'active' : ''}`}
                onClick={() => handleSelect(option.value)}
              >
                {option.label}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

export default SortDropdown
