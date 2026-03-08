// Rellena nuevamente las propiedades placeholder (elimina y vuelve a sembrar)
import { initDB } from '../models/db.js';

async function run() {
  const db = await initDB();
  await db.exec('BEGIN');
  try {
    await db.run('DELETE FROM properties WHERE is_placeholder = 1');
    console.log('Propiedades placeholder eliminadas, se vuelve a sembrar...');
    // seedIfEmpty se ejecuta si la tabla queda vacía
    const { count } = await db.get('SELECT COUNT(*) as count FROM properties');
    if (count === 0) {
      // initDB ya ejecutó seedIfEmpty; forzar segunda pasada:
      await db.exec('DELETE FROM properties');
    }
    // Reinvoca seedIfEmpty reinicializando conexión
    const reopen = await initDB();
    const { count: total } = await reopen.get('SELECT COUNT(*) as count FROM properties');
    console.log(`Total propiedades tras reseed: ${total}`);
    await db.exec('COMMIT');
  } catch (error) {
    await db.exec('ROLLBACK');
    console.error('Error en reseed', error);
    process.exit(1);
  }
}

run();
