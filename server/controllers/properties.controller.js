// Controller for properties
import { initDB } from '../models/db.js';

export async function getAllProperties(req, res) {
  try {
    const db = await initDB();
    const properties = await db.all('SELECT * FROM properties');
    res.json(properties);
  } catch (error) {
    console.error('Error obteniendo propiedades', error);
    res.status(500).json({ message: 'No se pudieron obtener las propiedades' });
  }
}

export async function getPropertyById(req, res) {
  const { id } = req.params;

  try {
    const db = await initDB();
    const property = await db.get('SELECT * FROM properties WHERE id = ?', id);

    if (!property) {
      return res.status(404).json({ message: 'Propiedad no encontrada' });
    }

    res.json(property);
  } catch (error) {
    console.error('Error obteniendo propiedad', error);
    res.status(500).json({ message: 'No se pudo obtener la propiedad' });
  }
}