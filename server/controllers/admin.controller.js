import jwt from 'jsonwebtoken';
import { randomUUID } from 'crypto';
import { initDB } from '../models/db.js';

const admins = [
  { user: (process.env.ADMIN_USER || 'admin').toLowerCase(), pass: process.env.ADMIN_PASS || '43482613' },
  { user: process.env.ADMIN_USER_1?.toLowerCase(),          pass: process.env.ADMIN_PASS_1 || process.env.ADMIN_PASS || '43482613' },
  { user: process.env.ADMIN_USER_2?.toLowerCase(),          pass: process.env.ADMIN_PASS_2 || process.env.ADMIN_PASS || '43482613' },
].filter(a => a.user && a.pass);

const JWT_SECRET = process.env.ADMIN_JWT_SECRET || 'change-me';
const JWT_EXPIRES_IN = process.env.ADMIN_JWT_EXPIRES_IN || '2h';
const revokedTokens = new Set();

export const adminLogin = (req, res) => {
  const username = (req.body?.username || '').trim().toLowerCase();
  const password = (req.body?.password || '').trim();

  if (!username || !password) return res.status(400).json({ error: 'Faltan credenciales' });
  const admin = admins.find(a => a.user === username && a.pass === password);
  if (!admin) return res.status(401).json({ error: 'Credenciales inválidas' });

  const jti = randomUUID();
  const token = jwt.sign({ sub: username, role: 'admin', jti }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
  return res.json({ token, expiresIn: JWT_EXPIRES_IN });
};

export const adminLogout = (req, res) => {
  const auth = req.headers.authorization || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
  if (token) {
    try {
      const payload = jwt.verify(token, JWT_SECRET);
      if (payload?.jti) revokedTokens.add(payload.jti);
    } catch (_) { /* token inválido o expirado, lo ignoramos */ }
  }
  res.json({ message: 'Sesión finalizada' });
};

export const requireAdmin = (req, res, next) => {
  const auth = req.headers.authorization || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'No autorizado' });
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    if (payload.role !== 'admin') return res.status(403).json({ error: 'No autorizado' });
    if (payload.jti && revokedTokens.has(payload.jti)) return res.status(401).json({ error: 'Token revocado' });
    req.admin = payload;
    return next();
  } catch (err) {
    return res.status(401).json({ error: 'No autorizado' });
  }
};

export async function listRegisteredUsers(req, res) {
  try {
    const db = await initDB();
    const users = await db.all(
      `SELECT id, full_name, email, phone, country, city, username, created_at
       FROM users
       ORDER BY created_at DESC`
    );
    return res.json(users);
  } catch (error) {
    console.error('Error obteniendo usuarios registrados', error);
    return res.status(500).json({ message: 'No se pudieron obtener los usuarios' });
  }
}
