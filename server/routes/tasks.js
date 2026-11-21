import mongoose from 'mongoose';
import { Router } from 'express';
import Task from '../models/Task.js';
import { asyncRoute } from '../lib/asyncRoute.js';
import { requireAuth } from '../middleware/auth.js';
import { seed } from '../data.js';

const router = Router();
router.use(requireAuth);

function examSeed(req, res) {
  if (!req.user.exam) { res.status(409).json({ error: 'Choose your exam before managing planner tasks.', code: 'EXAM_REQUIRED' }); return null; }
  return seed[req.user.exam];
}

router.post('/', asyncRoute(async (req, res) => {
  const data = examSeed(req, res);
  if (!data) return;
  const title = String(req.body?.title || '').trim();
  const time = String(req.body?.time || '18:00');
  const tag = String(req.body?.tag || 'Personal').trim();
  if (!title || title.length > 160) return res.status(400).json({ error: 'Task title must be between 1 and 160 characters.' });
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) return res.status(400).json({ error: 'Enter a valid 24-hour time.' });
  if (tag.length > 50) return res.status(400).json({ error: 'Task label must be 50 characters or fewer.' });
  const task = await Task.create({ userId: req.user._id, exam: req.user.exam, time, title, tag, done: false });
  return res.status(201).json({ id: String(task._id), time: task.time, title: task.title, tag: task.tag, done: task.done });
}));

router.patch('/:taskId', asyncRoute(async (req, res) => {
  const data = examSeed(req, res);
  if (!data) return;
  const { taskId } = req.params;
  const done = req.body?.done;
  if (typeof done !== 'boolean') return res.status(400).json({ error: 'Completion state must be true or false.' });
  if (/^seed-\d+$/.test(taskId)) {
    const seedIndex = Number(taskId.slice(5));
    const seedTask = data.tasks[seedIndex];
    if (!seedTask) return res.status(404).json({ error: 'Task not found.' });
    const task = await Task.findOneAndUpdate(
      { userId: req.user._id, exam: req.user.exam, seedIndex },
      { $set: { done }, $setOnInsert: { userId: req.user._id, exam: req.user.exam, seedIndex, title: seedTask.title, time: seedTask.time, tag: seedTask.tag } },
      { upsert: true, new: true, runValidators: true, setDefaultsOnInsert: true }
    );
    return res.json({ id: taskId, done: task.done });
  }
  if (!mongoose.isValidObjectId(taskId)) return res.status(404).json({ error: 'Task not found.' });
  const task = await Task.findOneAndUpdate({ _id: taskId, userId: req.user._id, exam: req.user.exam, seedIndex: { $exists: false } }, { $set: { done } }, { new: true, runValidators: true });
  if (!task) return res.status(404).json({ error: 'Task not found.' });
  return res.json({ id: String(task._id), done: task.done });
}));

router.delete('/:taskId', asyncRoute(async (req, res) => {
  if (!req.user.exam) return res.status(409).json({ error: 'Choose your exam before managing planner tasks.', code: 'EXAM_REQUIRED' });
  if (!mongoose.isValidObjectId(req.params.taskId)) return res.status(400).json({ error: 'Only custom planner tasks can be removed.' });
  const deleted = await Task.findOneAndDelete({ _id: req.params.taskId, userId: req.user._id, exam: req.user.exam, seedIndex: { $exists: false } });
  if (!deleted) return res.status(404).json({ error: 'Task not found.' });
  return res.status(204).end();
}));

export default router;
