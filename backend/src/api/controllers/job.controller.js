import { JobService } from '../services/job.service.js';

export const submitJob = async (req, res, next) => {
  try {
    const { queueId } = req.params;
    const job = await JobService.submitJob(queueId, req.user.id, req.body);
    res.status(201).json({ status: 'success', data: { job } });
  } catch (error) {
    next(error);
  }
};

export const getJobs = async (req, res, next) => {
  try {
    const { queueId } = req.params;
    const limit = parseInt(req.query.limit, 10) || 50;
    const offset = parseInt(req.query.offset, 10) || 0;
    const jobs = await JobService.getQueueJobs(queueId, req.user.id, limit, offset);
    res.status(200).json({ status: 'success', data: { jobs } });
  } catch (error) {
    next(error);
  }
};
