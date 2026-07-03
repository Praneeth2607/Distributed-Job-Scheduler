import { OrgService } from '../services/org.service.js';

export const createOrg = async (req, res, next) => {
  try {
    const { name } = req.body;
    const org = await OrgService.createOrg(name, req.user.id);
    res.status(201).json({ status: 'success', data: { org } });
  } catch (error) {
    next(error);
  }
};

export const getMyOrgs = async (req, res, next) => {
  try {
    const orgs = await OrgService.getUserOrgs(req.user.id);
    res.status(200).json({ status: 'success', data: { organizations: orgs } });
  } catch (error) {
    next(error);
  }
};
