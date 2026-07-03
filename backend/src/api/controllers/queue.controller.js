import { QueueService } from '../services/queue.service.js';

export const createQueue = async (req, res, next) => {
  try {
    const { projectId } = req.params;
    const queue = await QueueService.createQueue(projectId, req.user.id, req.body);
    res.status(201).json({ status: 'success', data: { queue } });
  } catch (error) {
    next(error);
  }
};

export const getQueues = async (req, res, next) => {
  try {
    const { projectId } = req.params;
    const queues = await QueueService.getProjectQueues(projectId, req.user.id);
    res.status(200).json({ status: 'success', data: { queues } });
  } catch (error) {
    next(error);
  }
};

export const deleteQueue = async (req, res, next) => {
  try {
    const { projectId, queueId } = req.params;
    await QueueService.deleteQueue(projectId, queueId, req.user.id);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
};
