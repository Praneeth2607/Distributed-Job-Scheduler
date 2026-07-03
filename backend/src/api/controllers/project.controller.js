import { ProjectService } from '../services/project.service.js';

export const createProject = async (req, res, next) => {
  try {
    const { orgId } = req.params;
    const { name } = req.body;
    const project = await ProjectService.createProject(orgId, name, req.user.id);
    res.status(201).json({ status: 'success', data: { project } });
  } catch (error) {
    next(error);
  }
};

export const getProjects = async (req, res, next) => {
  try {
    const { orgId } = req.params;
    const projects = await ProjectService.getOrgProjects(orgId, req.user.id);
    res.status(200).json({ status: 'success', data: { projects } });
  } catch (error) {
    next(error);
  }
};
