import { Router } from 'express';
import { createOrg, getMyOrgs } from '../controllers/org.controller.js';
import { validate } from '../middlewares/validate.js';
import { createOrgSchema } from '../validators/org.schema.js';
import { protect } from '../middlewares/auth.js';
import projectRoutes from './project.routes.js';

const router = Router();

router.use(protect); // All org routes require authentication

router.post('/', validate(createOrgSchema), createOrg);
router.get('/', getMyOrgs);

// Mount project routes
router.use('/:orgId/projects', projectRoutes);

export default router;
