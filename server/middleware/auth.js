import mongoose from 'mongoose';
import User from '../models/User.js';
import { readSessionToken, verifySessionToken } from '../lib/security.js';

export async function requireAuth(req, res, next) {
  let session;
  try {
    const token = readSessionToken(req);
    if (!token) return res.status(401).json({ error: 'Please sign in to continue.', code: 'AUTH_REQUIRED' });
    session = verifySessionToken(token);
  } catch {
    return res.status(401).json({ error: 'Your session has expired. Please sign in again.', code: 'INVALID_SESSION' });
  }
  if (!mongoose.isValidObjectId(session.sub)) return res.status(401).json({ error: 'Please sign in again.', code: 'INVALID_SESSION' });
  try {
    const user = await User.findById(session.sub).select('_id name email exam createdAt').lean();
    if (!user) return res.status(401).json({ error: 'Please sign in again.', code: 'INVALID_SESSION' });
    req.user = user;
    return next();
  } catch (error) {
    return next(error);
  }
}

const requestBuckets = new Map();
const WINDOW_MS = 15 * 60 * 1000;
const MAX_AUTH_REQUESTS = 30;

export function authRateLimit(req, res, next) {
  const key = req.ip || req.socket.remoteAddress || 'unknown';
  const now = Date.now();
  let bucket = requestBuckets.get(key);
  if (!bucket || bucket.resetAt <= now) bucket = { count: 0, resetAt: now + WINDOW_MS };
  bucket.count += 1;
  requestBuckets.set(key, bucket);
  if (bucket.count > MAX_AUTH_REQUESTS) {
    res.set('Retry-After', String(Math.ceil((bucket.resetAt - now) / 1000)));
    return res.status(429).json({ error: 'Too many sign-in attempts. Try again in a few minutes.', code: 'RATE_LIMITED' });
  }
  return next();
}

setInterval(() => {
  const now = Date.now();
  for (const [key, bucket] of requestBuckets) if (bucket.resetAt <= now) requestBuckets.delete(key);
}, 5 * 60 * 1000).unref();
