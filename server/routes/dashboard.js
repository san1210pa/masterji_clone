import { Router } from 'express';
import Task from '../models/Task.js';
import { asyncRoute } from '../lib/asyncRoute.js';
import { requireAuth } from '../middleware/auth.js';
import { seed, resources } from '../data.js';

const router = Router();
router.use(requireAuth);

router.get('/', asyncRoute(async (req, res) => {
  const exam = req.user.exam;
  if (!exam) return res.status(409).json({ error: 'Choose your exam before opening your study space.', code: 'EXAM_REQUIRED' });
  const data = structuredClone(seed[exam]);
  const storedTasks = await Task.find({ userId: req.user._id, exam }).sort({ createdAt: 1 }).lean();
  const seedTasks = data.tasks.map((task, index) => {
    const saved = storedTasks.find(item => item.seedIndex === index);
    return { ...task, id: `seed-${index}`, done: saved ? saved.done : task.done };
  });
  const customTasks = storedTasks.filter(task => task.seedIndex == null).map(task => ({ id: String(task._id), time: task.time, title: task.title, tag: task.tag, done: task.done }));
  return res.json({ exam, ...data, tasks: [...seedTasks, ...customTasks], resources: resources.map(resource => ({ ...resource, exam })) });
}));

export default router;
