const crypto = require('crypto');
const express = require('express');
const router = express.Router();
const password = process.env.APP_PASSWORD || '';
if (password.length < 12) throw new Error('Defina APP_PASSWORD com pelo menos 12 caracteres.');
const expected = crypto.createHash('sha256').update(password).digest();
const sessions = new Map();
const attempts = [];
const lifetime = 8 * 60 * 60 * 1000;
const cookieOptions = { httpOnly: true, sameSite: 'strict', secure: process.env.COOKIE_SECURE === 'true', path: '/', maxAge: lifetime };
function getToken(req) {
  const entry = (req.headers.cookie || '').split(';').map(s => s.trim()).find(s => s.startsWith('laudos_session='));
  return entry ? entry.slice('laudos_session='.length) : '';
}
function loggedIn(req) {
  const token = getToken(req), expiry = sessions.get(token);
  if (!expiry || expiry <= Date.now()) { sessions.delete(token); return false; }
  return true;
}
router.post('/login', (req, res) => {
  const now = Date.now();
  while (attempts.length && attempts[0] < now - 15 * 60 * 1000) attempts.shift();
  if (attempts.length >= 20) return res.status(429).json({ error: 'Muitas tentativas. Aguarde 15 minutos.' });
  const candidate = crypto.createHash('sha256').update(typeof req.body?.senha === 'string' ? req.body.senha : '').digest();
  if (!crypto.timingSafeEqual(candidate, expected)) { attempts.push(now); return res.status(401).json({ error: 'Senha incorreta.' }); }
  for (const [key, expiry] of sessions) if (expiry <= now) sessions.delete(key);
  if (sessions.size >= 1000) return res.status(503).json({ error: 'Limite de sessões atingido.' });
  const token = crypto.randomBytes(32).toString('hex');
  sessions.set(token, now + lifetime);
  res.cookie('laudos_session', token, cookieOptions).json({ ok: true });
});
router.get('/session', (req, res) => res.status(loggedIn(req) ? 200 : 401).json({ autenticado: loggedIn(req) }));
router.post('/logout', (req, res) => { sessions.delete(getToken(req)); res.clearCookie('laudos_session', { ...cookieOptions, maxAge: undefined }); res.status(204).end(); });
function requireAuth(req, res, next) { if (!loggedIn(req)) return res.status(401).json({ error: 'Faça login para acessar o sistema.' }); next(); }
function sameOrigin(req, res, next) {
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return next();
  const origin = req.get('origin');
  if (origin) {
    try { if (new URL(origin).host !== req.get('host')) return res.status(403).json({ error: 'Origem não permitida.' }); }
    catch { return res.status(403).json({ error: 'Origem inválida.' }); }
  }
  next();
}
module.exports = { router, requireAuth, sameOrigin };
