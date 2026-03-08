import crypto from 'crypto';
import { initDB } from '../models/db.js';

const userSessions = new Map(); // token -> user data

function generateToken() {
	return crypto.randomBytes(24).toString('hex');
}

function hashPassword(password) {
	const salt = crypto.randomBytes(16).toString('hex');
	const hash = crypto.scryptSync(password, salt, 64).toString('hex');
	return `${salt}:${hash}`;
}

function verifyPassword(password, stored) {
	if (!stored) return false;
	const [salt, hashed] = stored.split(':');
	if (!salt || !hashed) return false;
	const hash = crypto.scryptSync(password, salt, 64).toString('hex');
	return crypto.timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(hashed, 'hex'));
}

function validateRegisterPayload(body) {
	const errors = [];
	const required = ['full_name', 'email', 'phone', 'country', 'city', 'username', 'password'];
	required.forEach((field) => {
		if (!body?.[field]) errors.push(`El campo ${field} es obligatorio.`);
	});

	if (body?.password && body.password.length < 6) {
		errors.push('La contraseña debe tener al menos 6 caracteres.');
	}
	if (body?.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.email)) {
		errors.push('El email no tiene un formato válido.');
	}
	return errors;
}

export async function register(req, res) {
	const payload = req.body || {};
	const errors = validateRegisterPayload(payload);
	if (errors.length) {
		return res.status(400).json({ message: 'Validación fallida', errors });
	}

	const { full_name, email, phone, country, city, username, password } = payload;

	try {
		const db = await initDB();
		const existing = await db.get('SELECT id FROM users WHERE email = ? OR username = ?', email, username);
		if (existing) {
			return res.status(409).json({ message: 'El email o el usuario ya están registrados.' });
		}

		const password_hash = hashPassword(password);
		await db.run(
			`INSERT INTO users (full_name, email, phone, country, city, username, password_hash)
			 VALUES (?, ?, ?, ?, ?, ?, ?)`
			,
			full_name,
			email,
			phone,
			country,
			city,
			username,
			password_hash
		);

		return res.status(201).json({ message: 'Registro exitoso' });
	} catch (error) {
		console.error('Error registrando usuario', error);
		return res.status(500).json({ message: 'No se pudo registrar el usuario' });
	}
}

export async function login(req, res) {
	const { username, password } = req.body || {};
	if (!username || !password) {
		return res.status(400).json({ message: 'Usuario y contraseña son requeridos.' });
	}

	try {
		const db = await initDB();
		const user = await db.get('SELECT id, username, password_hash, full_name FROM users WHERE username = ?', username);
		if (!user) {
			return res.status(401).json({ message: 'Credenciales inválidas.' });
		}

		const valid = verifyPassword(password, user.password_hash);
		if (!valid) {
			return res.status(401).json({ message: 'Credenciales inválidas.' });
		}

		const token = generateToken();
		userSessions.set(token, { id: user.id, username: user.username, full_name: user.full_name });

		return res.json({
			message: 'Inicio de sesión exitoso',
			user: { id: user.id, username: user.username, full_name: user.full_name },
			token
		});
	} catch (error) {
		console.error('Error en login', error);
		return res.status(500).json({ message: 'No se pudo iniciar sesión' });
	}
}

export function requireUser(req, res, next) {
  const auth = req.headers.authorization || '';
  const token = auth.replace('Bearer ', '').trim();
  if (!token || !userSessions.has(token)) {
    return res.status(401).json({ message: 'No autorizado' });
  }
  const session = userSessions.get(token);
  req.user = session;
  next();
}