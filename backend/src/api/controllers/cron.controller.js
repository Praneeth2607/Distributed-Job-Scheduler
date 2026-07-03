import { CronService } from '../services/cron.service.js';

export const createScheduledJob = async (req, res, next) => {
  try {
    const { queueId } = req.params;
    const scheduledJob = await CronService.createScheduledJob(queueId, req.user.id, req.body);
    res.status(201).json({ status: 'success', data: { scheduledJob } });
  } catch (error) {
    next(error);
  }
};

export const getScheduledJobs = async (req, res, next) => {
  try {
    const { queueId } = req.params;
    const scheduledJobs = await CronService.getScheduledJobs(queueId, req.user.id);
    res.status(200).json({ status: 'success', data: { scheduledJobs } });
  } catch (error) {
    next(error);
  }
};
