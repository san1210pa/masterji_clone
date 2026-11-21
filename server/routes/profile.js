import { Router } from 'express';
import User from '../models/User.js';
import { asyncRoute } from '../lib/asyncRoute.js';
import { requireAuth } from '../middleware/auth.js';
import { seed } from '../data.js';

const router = Router();
router.use(requireAuth);

router.get('/', (req, res) => res.json({ user: { id: String(req.user._id), name: req.user.name, email: req.user.email, exam: req.user.exam || null, createdAt: req.user.createdAt } }));
router.patch('/exam', asyncRoute(async (req, res) => {
  const exam = String(req.body?.exam || '').toUpperCase();
  if (!Object.hasOwn(seed, exam)) return res.status(400).json({ error: 'Choose JEE, NEET, UPSC, or SSC.' });
  const user = await User.findByIdAndUpdate(req.user._id, { $set: { exam } }, { new: true, runValidators: true }).select('_id name email exam createdAt').lean();
  if (!user) return res.status(404).json({ error: 'Account not found.' });
  return res.json({ user: { id: String(user._id), name: user.name, email: user.email, exam: user.exam, createdAt: user.createdAt } });
}));

export default router;
