import jwt from 'jsonwebtoken';

export function requireUser(req, res, next) {
  const auth = req.headers.authorization || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7).trim() : '';

  if (!token) return res.status(401).json({ ok: false, error: 'No autorizado' });

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET || 'dev-secret');
    const userId = payload?.id ?? payload?.userId ?? payload?.sub;
    if (!userId) return res.status(401).json({ ok: false, error: 'Token sin identidad de usuario' });
    req.user = { ...payload, userId };
    return next();
  } catch {
    return res.status(401).json({ ok: false, error: 'Token inválido o expirado' });
  }
}