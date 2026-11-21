import { createHmac, randomBytes, scrypt as scryptCallback, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';

const scrypt = promisify(scryptCallback);
const PASSWORD_COST = 32768;
const PASSWORD_KEY_LENGTH = 64;
const PASSWORD_MAX_MEMORY = 64 * 1024 * 1024;
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7;
const COOKIE_NAME = 'mj_session';
const TOKEN_ISSUER = 'masterji-study-hub';

export function sessionSecret() {
  const secret = process.env.JWT_SECRET || '';
  if (secret.length < 32 || secret.includes('replace-this')) throw new Error('JWT_SECRET must be replaced with a random secret of at least 32 characters. Set it in server/.env.');
  return secret;
}

export async function hashPassword(password) {
  const salt = randomBytes(16);
  const derived = await scrypt(password, salt, PASSWORD_KEY_LENGTH, { N: PASSWORD_COST, r: 8, p: 1, maxmem: PASSWORD_MAX_MEMORY });
  return `scrypt$${PASSWORD_COST}$${salt.toString('base64url')}$${derived.toString('base64url')}`;
}

export async function verifyPassword(password, encoded) {
  const [scheme, cost, saltText, digestText] = String(encoded || '').split('$');
  if (scheme !== 'scrypt' || Number(cost) !== PASSWORD_COST || !saltText || !digestText) return false;
  try {
    const expected = Buffer.from(digestText, 'base64url');
    const actual = await scrypt(password, Buffer.from(saltText, 'base64url'), expected.length, { N: PASSWORD_COST, r: 8, p: 1, maxmem: PASSWORD_MAX_MEMORY });
    return actual.length === expected.length && timingSafeEqual(actual, expected);
  } catch {
    return false;
  }
}

export function createSessionToken(userId) {
  const now = Math.floor(Date.now() / 1000);
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const payload = Buffer.from(JSON.stringify({ sub: String(userId), iss: TOKEN_ISSUER, iat: now, exp: now + SESSION_TTL_SECONDS })).toString('base64url');
  const unsigned = `${header}.${payload}`;
  const signature = createHmac('sha256', sessionSecret()).update(unsigned).digest('base64url');
  return `${unsigned}.${signature}`;
}

export function verifySessionToken(token) {
  const parts = String(token || '').split('.');
  if (parts.length !== 3) throw new Error('Invalid session token.');
  const unsigned = `${parts[0]}.${parts[1]}`;
  const expected = createHmac('sha256', sessionSecret()).update(unsigned).digest();
  const provided = Buffer.from(parts[2], 'base64url');
  if (provided.length !== expected.length || !timingSafeEqual(provided, expected)) throw new Error('Invalid session token.');
  const header = JSON.parse(Buffer.from(parts[0], 'base64url').toString('utf8'));
  const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8'));
  if (header.alg !== 'HS256' || payload.iss !== TOKEN_ISSUER || typeof payload.sub !== 'string' || payload.exp <= Date.now() / 1000) throw new Error('Expired or invalid session token.');
  return payload;
}

export function setSessionCookie(res, token) {
  res.cookie(COOKIE_NAME, token, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', path: '/', maxAge: SESSION_TTL_SECONDS * 1000 });
}

export function clearSessionCookie(res) {
  res.clearCookie(COOKIE_NAME, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', path: '/' });
}

export function readSessionToken(req) {
  const cookieHeader = req.headers.cookie || '';
  const sessionCookie = cookieHeader.split(';').map(value => value.trim()).find(value => value.startsWith(`${COOKIE_NAME}=`));
  if (sessionCookie) return decodeURIComponent(sessionCookie.slice(COOKIE_NAME.length + 1));
  const authorization = req.headers.authorization || '';
  return authorization.startsWith('Bearer ') ? authorization.slice(7) : '';
}
