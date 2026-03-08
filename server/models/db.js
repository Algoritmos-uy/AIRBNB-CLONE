// Database connection
import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dbPath = path.resolve(__dirname, '../database/stylo.sqlite');

const CREATE_PROPERTIES_TABLE = `
  CREATE TABLE IF NOT EXISTS properties (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    description TEXT,
    price_per_night REAL,
    location TEXT,
    image_url TEXT,
    is_placeholder INTEGER DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`;

const CREATE_USERS_TABLE = `
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    full_name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    phone TEXT,
    country TEXT,
    city TEXT,
    username TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`;

const CREATE_RESERVATIONS_TABLE = `
  CREATE TABLE IF NOT EXISTS reservations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    property_id INTEGER,
    full_name TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT,
    check_in DATE NOT NULL,
    check_out DATE NOT NULL,
    guests INTEGER NOT NULL DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (property_id) REFERENCES properties(id) ON DELETE SET NULL
  );
`;

const SEED_PROPERTIES = [
  {
    title: 'Beachfront Villa South Beach',
    description: 'Terraza con vistas al océano, 3 habitaciones, wifi y A/C.',
    price_per_night: 180,
    location: 'South Beach, Miami',
    image_url: '/assets/img/property-1.jpg',
    is_placeholder: 1
  },
  {
    title: 'Wynwood Industrial Loft',
    description: 'Espacio abierto con cocina gourmet y luz natural junto a galerías.',
    price_per_night: 120,
    location: 'Wynwood, Miami',
    image_url: '/assets/img/property-2.jpg',
    is_placeholder: 1
  },
  {
    title: 'Coconut Grove Bungalow',
    description: 'Porche rodeado de vegetación, jacuzzi exterior y calma tropical.',
    price_per_night: 95,
    location: 'Coconut Grove, Miami',
    image_url: '/assets/img/property-3.jpg',
    is_placeholder: 1
  },
  {
    title: 'Brickell Skyline Penthouse',
    description: 'Suite principal, proyector y terraza lounge con vista a los rascacielos.',
    price_per_night: 150,
    location: 'Brickell, Miami',
    image_url: '/assets/img/property-4.jpg',
    is_placeholder: 1
  },
  {
    title: 'Key Biscayne Infinity Villa',
    description: '5 habitaciones, chef opcional y acceso rápido a la playa.',
    price_per_night: 320,
    location: 'Key Biscayne, Miami',
    image_url: '/assets/img/property-5.jpg',
    is_placeholder: 1
  },
  {
    title: 'Little Havana Tiny Eco House',
    description: 'Paneles solares, deck de madera y a pasos de la Calle Ocho.',
    price_per_night: 80,
    location: 'Little Havana, Miami',
    image_url: '/assets/img/property-6.jpg',
    is_placeholder: 1
  }
];

async function seedIfEmpty(db) {
  const { count } = await db.get('SELECT COUNT(*) as count FROM properties');
  if (count > 0) return;

  await db.exec('BEGIN');
  const stmt = await db.prepare(`
    INSERT INTO properties (title, description, price_per_night, location, image_url, is_placeholder)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  try {
    for (const p of SEED_PROPERTIES) {
      await stmt.run(p.title, p.description, p.price_per_night, p.location, p.image_url, p.is_placeholder ?? 1);
    }
    await db.exec('COMMIT');
  } catch (error) {
    await db.exec('ROLLBACK');
    throw error;
  } finally {
    await stmt.finalize();
  }
}

let dbPromise;

export async function initDB() {
  if (dbPromise) return dbPromise;

  dbPromise = open({
    filename: dbPath,
    driver: sqlite3.Database
  }).then(async (db) => {
    await db.exec('PRAGMA foreign_keys = ON');
    await db.exec(CREATE_PROPERTIES_TABLE);
    await db.exec(CREATE_USERS_TABLE);
    await db.exec(CREATE_RESERVATIONS_TABLE);
    // add column is_placeholder if missing (en DBs previas)
    const columns = await db.all("PRAGMA table_info('properties')");
    const hasPlaceholder = columns.some((c) => c.name === 'is_placeholder');
    if (!hasPlaceholder) {
      await db.exec('ALTER TABLE properties ADD COLUMN is_placeholder INTEGER DEFAULT 1');
    }
    await seedIfEmpty(db);
    return db;
  });

  return dbPromise;
}