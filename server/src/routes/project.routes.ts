import { Router } from 'express'

import {
  addProjectMember,
  createProject,
  deleteProject,
  listProjectMembers,
  listProjects,
  removeProjectMember,
} from '../controllers/project.controller'

const router = Router()

router.get('/', listProjects)
router.post('/', createProject)
router.get('/:projectId/members', listProjectMembers)
router.post('/:projectId/members', addProjectMember)
router.delete('/:projectId/members/:memberId', removeProjectMember)
router.delete('/:projectId', deleteProject)

export default router
