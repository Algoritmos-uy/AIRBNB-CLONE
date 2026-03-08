// Actualiza URLs de imágenes en la tabla properties a partir de un JSON
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { initDB } from '../models/db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Puedes duplicar el sample y renombrar a image-replacements.json
const INPUT_FILE = path.resolve(__dirname, 'image-replacements.json');

async function run() {
  if (!fs.existsSync(INPUT_FILE)) {
    console.error(`No se encontró ${INPUT_FILE}. Crea el archivo a partir de image-replacements.sample.json`);
    process.exit(1);
  }

  const raw = await fs.promises.readFile(INPUT_FILE, 'utf-8');
  const items = JSON.parse(raw);
  if (!Array.isArray(items) || items.length === 0) {
    console.error('El archivo no contiene elementos válidos.');
    process.exit(1);
  }

  const db = await initDB();
  await db.exec('BEGIN');

  try {
    const stmt = await db.prepare('UPDATE properties SET image_url = ?, is_placeholder = 0 WHERE id = ?');
    for (const item of items) {
      if (!item.id || !item.image_url) continue;
      await stmt.run(item.image_url, item.id);
      console.log(`Actualizada propiedad ${item.id}`);
    }
    await stmt.finalize();
    await db.exec('COMMIT');
    console.log('Actualización completa.');
  } catch (error) {
    await db.exec('ROLLBACK');
    console.error('Error actualizando imágenes', error);
    process.exit(1);
  }
}

run();
