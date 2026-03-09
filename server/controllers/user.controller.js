import { initDB } from '../models/db.js';

function splitName(fullName = '') {
  const parts = String(fullName).trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return { first_name: '', last_name: '' };
  if (parts.length === 1) return { first_name: parts[0], last_name: '' };
  return { first_name: parts.slice(0, -1).join(' '), last_name: parts.slice(-1).join('') };
}

export async function getMyProfile(req, res) {
  try {
    const db = await initDB();
    const userId = req.user?.id || req.user?.userId || req.user?.sub;
    if (!userId) return res.status(401).json({ ok: false, error: 'No autorizado' });

    const row = await db.get(
      `SELECT id, full_name, email, phone, country, city, username, created_at
       FROM users
       WHERE id = ?`,
      [userId]
    );
    if (!row) return res.status(404).json({ ok: false, error: 'Usuario no encontrado' });

    const names = splitName(row.full_name);
    return res.json({
      ok: true,
      data: {
        id: row.id,
        first_name: names.first_name,
        last_name: names.last_name,
        full_name: row.full_name,
        email: row.email || '',
        phone: row.phone || '',
        country: row.country || '',
        city: row.city || '',
        username: row.username || '',
        created_at: row.created_at || ''
      }
    });
  } catch {
    return res.status(500).json({ ok: false, error: 'Error interno' });
  }
}

export async function updateMyProfile(req, res) {
  try {
    const db = await initDB();
    const userId = req.user?.id || req.user?.userId || req.user?.sub;
    if (!userId) return res.status(401).json({ ok: false, error: 'No autorizado' });

    const user = await db.get(`SELECT id, full_name FROM users WHERE id = ?`, [userId]);
    if (!user) return res.status(404).json({ ok: false, error: 'Usuario no encontrado' });

    const email = String(req.body?.email || '').trim();
    const phone = String(req.body?.phone || '').trim();
    const country = String(req.body?.country || '').trim();
    const city = String(req.body?.city || '').trim();

    if (!email) return res.status(400).json({ ok: false, error: 'Email requerido' });

    await db.run(
      `UPDATE users
       SET email = ?, phone = ?, country = ?, city = ?
       WHERE id = ?`,
      [email, phone || null, country || null, city || null, userId]
    );

    return res.json({ ok: true, message: 'Perfil actualizado' });
  } catch {
    return res.status(500).json({ ok: false, error: 'Error interno' });
  }
}

function pick(names, candidates) {
  return candidates.find(c => names.includes(c)) || null;
}

async function hasColumn(db, table, col) {
  const cols = await db.all(`PRAGMA table_info(${table})`);
  return cols.some((c) => c.name === col);
}

export async function getMyReservations(req, res) {
  try {
    const db = await initDB();
    const userId = req.user?.id || req.user?.userId || req.user?.sub;
    if (!userId) return res.status(401).json({ ok: false, error: 'No autorizado' });

    const hasUserId = await hasColumn(db, 'reservations', 'user_id');

    if (!hasUserId) {
      // fallback temporal por email mientras migras esquema
      const user = await db.get(`SELECT email FROM users WHERE id = ?`, [userId]);
      const rows = await db.all(
        `SELECT id, property_id, check_in, check_out, guests, created_at
         FROM reservations
         WHERE email = ?
         ORDER BY created_at DESC`,
        [user?.email || '']
      );
      return res.json({ ok: true, data: rows || [] });
    }

    const rows = await db.all(
      `SELECT id, property_id, check_in, check_out, guests, created_at
       FROM reservations
       WHERE user_id = ?
       ORDER BY created_at DESC`,
      [userId]
    );

    return res.json({ ok: true, data: rows || [] });
  } catch (error) {
    console.error('getMyReservations error:', error);
    return res.status(500).json({ ok: false, error: 'Error interno' });
  }
}