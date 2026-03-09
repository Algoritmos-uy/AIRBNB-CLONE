import { initDB } from '../models/db.js';

async function purgePastReservations(db) {
  // Elimina reservas cuya fecha de salida ya pasó (día completado)
  await db.run(`DELETE FROM reservations WHERE date(check_out) < date('now')`);
}

async function hasColumn(db, table, column) {
  const cols = await db.all(`PRAGMA table_info(${table})`);
  return cols.some((c) => c.name === column);
}

function validateReservationPayload(body) {
  const errors = [];
  const required = ['full_name', 'email', 'check_in', 'check_out', 'guests'];
  required.forEach((field) => {
    if (!body?.[field]) errors.push(`El campo ${field} es obligatorio.`);
  });

  if (body?.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.email)) {
    errors.push('El email no tiene un formato válido.');
  }

  const guestsNum = Number(body?.guests);
  if (Number.isNaN(guestsNum) || guestsNum < 1) {
    errors.push('Debe indicar al menos 1 huésped.');
  }

  const checkIn = new Date(body?.check_in);
  const checkOut = new Date(body?.check_out);
  if (Number.isNaN(checkIn) || Number.isNaN(checkOut)) {
    errors.push('Las fechas no son válidas.');
  } else if (checkOut <= checkIn) {
    errors.push('La fecha de salida debe ser posterior a la de entrada.');
  }

  return errors;
}

export async function createReservation(req, res) {
  const payload = req.body || {};
  const errors = validateReservationPayload(payload);
  if (errors.length) {
    return res.status(400).json({ message: 'Validación fallida', errors });
  }

  const { property_id, full_name, email, phone, check_in, check_out, guests } = payload;
  const userId = req.user?.id || req.user?.userId || req.user?.sub || null;

  try {
    const db = await initDB();

    // await purgePastReservations(db); // <- DESACTIVADO para conservar historial

    if (property_id) {
      const exists = await db.get('SELECT id FROM properties WHERE id = ?', property_id);
      if (!exists) return res.status(404).json({ message: 'La propiedad seleccionada no existe.' });
    }

    const supportsUserId = await hasColumn(db, 'reservations', 'user_id');

    const result = supportsUserId
      ? await db.run(
          `INSERT INTO reservations (property_id, user_id, full_name, email, phone, check_in, check_out, guests, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`,
          [property_id, userId, full_name, email, phone, check_in, check_out, guests]
        )
      : await db.run(
          `INSERT INTO reservations (property_id, full_name, email, phone, check_in, check_out, guests, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))`,
          [property_id, full_name, email, phone, check_in, check_out, guests]
        );

    return res.status(201).json({
      message: 'Reserva registrada',
      reservation: {
        id: result.lastID,
        property_id: property_id || null,
        full_name,
        email,
        phone,
        check_in,
        check_out,
        guests: Number(guests)
      }
    });
  } catch (error) {
    console.error('Error creando reserva', error);
    return res.status(500).json({ message: 'No se pudo registrar la reserva' });
  }
}

export async function listReservations(req, res) {
  const { property_id } = req.query || {};
  try {
    const db = await initDB();
    // await purgePastReservations(db); // <- DESACTIVADO para conservar historial
    let reservations;
    if (property_id) {
      reservations = await db.all(
        `SELECT r.*, p.title AS property_title
         FROM reservations r
         LEFT JOIN properties p ON p.id = r.property_id
         WHERE r.property_id = ?
         ORDER BY datetime(r.created_at) DESC, r.id DESC`,
        property_id
      );
    } else {
      reservations = await db.all(
        `SELECT r.*, p.title AS property_title
         FROM reservations r
         LEFT JOIN properties p ON p.id = r.property_id
         ORDER BY datetime(r.created_at) DESC, r.id DESC`
      );
    }
    return res.json(reservations);
  } catch (error) {
    console.error('Error listando reservas', error);
    return res.status(500).json({ message: 'No se pudieron obtener las reservas' });
  }
}

export async function deleteReservation(req, res) {
  const { id } = req.params;
  if (!id) return res.status(400).json({ message: 'ID requerido' });

  try {
    const db = await initDB();
    const result = await db.run('DELETE FROM reservations WHERE id = ?', id);
    if (result.changes === 0) {
      return res.status(404).json({ message: 'Reserva no encontrada' });
    }
    return res.json({ message: 'Reserva eliminada' });
  } catch (error) {
    console.error('Error eliminando reserva', error);
    return res.status(500).json({ message: 'No se pudo eliminar la reserva' });
  }
}

export async function getAvailability(req, res) {
  const { propertyId } = req.params;
  if (!propertyId) {
    return res.status(400).json({ message: 'PropertyId requerido' });
  }
  try {
    const db = await initDB();
    const rows = await db.all(
      `SELECT check_in, check_out FROM reservations
       WHERE property_id = ?
       ORDER BY check_in ASC`,
      propertyId
    );
    const ranges = rows.map((r) => ({ start: r.check_in, end: r.check_out }));
    return res.json(ranges);
  } catch (error) {
    console.error('Error obteniendo disponibilidad', error);
    return res.status(500).json({ message: 'No se pudo obtener disponibilidad' });
  }
}
