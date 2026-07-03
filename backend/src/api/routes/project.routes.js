import { Router } from 'express';
import { createProject, getProjects } from '../controllers/project.controller.js';
import { validate } from '../middlewares/validate.js';
import { createProjectSchema } from '../validators/project.schema.js';
import { protect } from '../middlewares/auth.js';
import queueRoutes from './queue.routes.js';

// mergeParams allows us to access orgId from the parent router
const router = Router({ mergeParams: true });

router.use(protect);

router.post('/', validate(createProjectSchema), createProject);
router.get('/', getProjects);

// Mount queue routes nested under projects
router.use('/:projectId/queues', queueRoutes);

export default router;
