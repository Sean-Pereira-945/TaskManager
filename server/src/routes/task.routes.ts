import { Router } from 'express'

import {
  createTask,
  deleteTask,
  getTask,
  listTasks,
  updateTask,
} from '../controllers/task.controller'

const router = Router()

router.get('/', listTasks)
router.post('/', createTask)
router.get('/:id', getTask)
router.patch('/:id', updateTask)
router.delete('/:id', deleteTask)

export default router
