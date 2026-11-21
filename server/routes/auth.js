import { Router } from 'express';
import User from '../models/User.js';
import { asyncRoute } from '../lib/asyncRoute.js';
import { clearSessionCookie, createSessionToken, hashPassword, setSessionCookie, verifyPassword } from '../lib/security.js';
import { authRateLimit, requireAuth } from '../middleware/auth.js';

const router = Router();
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const publicUser = user => ({ id: String(user._id), name: user.name, email: user.email, exam: user.exam || null, createdAt: user.createdAt });

router.post('/register', authRateLimit, asyncRoute(async (req, res) => {
  const name = String(req.body?.name || '').trim();
  const email = String(req.body?.email || '').trim().toLowerCase();
  const password = String(req.body?.password || '');
  if (name.length < 2 || name.length > 80) return res.status(400).json({ error: 'Name must be between 2 and 80 characters.' });
  if (!emailPattern.test(email) || email.length > 254) return res.status(400).json({ error: 'Enter a valid email address.' });
  if (password.length < 8 || password.length > 128) return res.status(400).json({ error: 'Password must be between 8 and 128 characters.' });
  const existing = await User.exists({ email });
  if (existing) return res.status(409).json({ error: 'An account with this email already exists. Sign in instead.', code: 'EMAIL_EXISTS' });
  try {
    const user = await User.create({ name, email, passwordHash: await hashPassword(password) });
    setSessionCookie(res, createSessionToken(user._id));
    return res.status(201).json({ user: publicUser(user) });
  } catch (error) {
    if (error?.code === 11000) return res.status(409).json({ error: 'An account with this email already exists. Sign in instead.', code: 'EMAIL_EXISTS' });
    throw error;
  }
}));

router.post('/login', authRateLimit, asyncRoute(async (req, res) => {
  const email = String(req.body?.email || '').trim().toLowerCase();
  const password = String(req.body?.password || '');
  if (!emailPattern.test(email) || !password || password.length > 128) return res.status(400).json({ error: 'Enter a valid email and password.' });
  const user = await User.findOne({ email }).select('+passwordHash');
  const valid = user ? await verifyPassword(password, user.passwordHash) : await verifyPassword(password, '');
  if (!user || !valid) return res.status(401).json({ error: 'Email or password is incorrect.', code: 'INVALID_CREDENTIALS' });
  setSessionCookie(res, createSessionToken(user._id));
  return res.json({ user: publicUser(user) });
}));

router.get('/me', requireAuth, (req, res) => res.json({ user: publicUser(req.user) }));
router.post('/logout', (_req, res) => { clearSessionCookie(res); res.status(204).end(); });

export default router;
