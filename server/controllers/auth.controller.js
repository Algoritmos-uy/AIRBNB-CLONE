import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { initDB } from '../models/db.js';

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(String(password), salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

function verifyPassword(password, stored) {
  if (!stored) return false;
  const [salt, hashed] = String(stored).split(':');
  if (!salt || !hashed) return false;

  const hash = crypto.scryptSync(String(password), salt, 64).toString('hex');
  return crypto.timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(hashed, 'hex'));
}

function validateRegisterPayload(body) {
  const errors = [];
  const required = ['full_name', 'email', 'phone', 'country', 'city', 'username', 'password'];
  required.forEach((field) => {
    if (!body?.[field]) errors.push(`El campo ${field} es obligatorio.`);
  });

  if (body?.password && String(body.password).length < 6) {
    errors.push('La contraseña debe tener al menos 6 caracteres.');
  }
  if (body?.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(body.email))) {
    errors.push('El email no tiene un formato válido.');
  }
  return errors;
}

export async function register(req, res) {
  const payload = req.body || {};
  const errors = validateRegisterPayload(payload);
  if (errors.length) {
    return res.status(400).json({ ok: false, message: 'Validación fallida', errors });
  }

  const full_name = String(payload.full_name || '').trim();
  const email = String(payload.email || '').trim().toLowerCase();
  const phone = String(payload.phone || '').trim();
  const country = String(payload.country || '').trim();
  const city = String(payload.city || '').trim();
  const username = String(payload.username || '').trim().toLowerCase();
  const password = String(payload.password || '');

  try {
    const db = await initDB();
    const existing = await db.get(
      `SELECT id FROM users WHERE lower(email) = ? OR lower(username) = ?`,
      email,
      username
    );

    if (existing) {
      return res.status(409).json({ ok: false, message: 'El email o el usuario ya están registrados.' });
    }

    const password_hash = hashPassword(password);

    await db.run(
      `INSERT INTO users (full_name, email, phone, country, city, username, password_hash)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      full_name,
      email,
      phone,
      country,
      city,
      username,
      password_hash
    );

    return res.status(201).json({ ok: true, message: 'Registro exitoso.' });
  } catch (error) {
    console.error('register error:', error);
    return res.status(500).json({ ok: false, message: 'No se pudo registrar el usuario.' });
  }
}

export async function login(req, res) {
  const usernameRaw = req.body?.username;
  const emailRaw = req.body?.email;
  const password = String(req.body?.password || '');

  // Acepta username o email
  const identity = String(usernameRaw || emailRaw || '').trim().toLowerCase();

  if (!identity || !password) {
    return res.status(400).json({ ok: false, message: 'Usuario/email y contraseña son requeridos.' });
  }

  try {
    const db = await initDB();

    const user = await db.get(
      `SELECT id, username, email, full_name, password_hash
       FROM users
       WHERE lower(username) = ? OR lower(email) = ?`,
      identity,
      identity
    );

    if (!user) {
      return res.status(401).json({ ok: false, message: 'Credenciales inválidas.' });
    }

    const valid = verifyPassword(password, user.password_hash);
    if (!valid) {
      return res.status(401).json({ ok: false, message: 'Credenciales inválidas.' });
    }

    const token = jwt.sign(
      { id: user.id, role: 'user', email: user.email },
      process.env.JWT_SECRET || 'dev-secret',
      { expiresIn: process.env.JWT_EXPIRES_IN || '12h' }
    );

    return res.json({
      ok: true,
      data: {
        token,
        user: { id: user.id, full_name: user.full_name, email: user.email }
      }
    });
  } catch (error) {
    console.error('login error:', error);
    return res.status(500).json({ ok: false, message: 'Error interno de autenticación.' });
  }
}

export function requireUser(req, res, next) {
  const auth = req.headers.authorization || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7).trim() : '';

  if (!token) {
    return res.status(401).json({ ok: false, error: 'No autorizado' });
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET || 'dev-secret');
    const userId = payload?.id ?? payload?.userId ?? payload?.sub;

    if (!userId) {
      return res.status(401).json({ ok: false, error: 'Token sin identidad de usuario' });
    }

    req.user = { ...payload, userId };
    return next();
  } catch {
    return res.status(401).json({ ok: false, error: 'Token inválido o expirado' });
  }
}