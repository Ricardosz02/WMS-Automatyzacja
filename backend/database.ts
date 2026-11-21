import sqlite3 from 'sqlite3';
import { open } from 'sqlite';

export async function getDbConnection() {
  return open({
    filename: './wms-database.sqlite',
    driver: sqlite3.Database
  });
}

export async function initDatabase() {
  const db = await getDbConnection();

  await db.exec(`
    CREATE TABLE IF NOT EXISTS locations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      code TEXT UNIQUE NOT NULL,           -- np. 'A-01-01' (Aleja-Regał-Półka)
      zone_type TEXT NOT NULL,             -- np. 'Standard', 'Chłodnia', 'ADR'
      max_weight_kg REAL NOT NULL,         -- maksymalne obciążenie półki
      is_occupied BOOLEAN DEFAULT 0        -- 0 = wolna, 1 = zajęta
    );
  `);

  await db.exec(`
    CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      sku TEXT UNIQUE NOT NULL,            -- unikalny kod produktu
      name TEXT NOT NULL,
      category TEXT NOT NULL,              -- np. 'Standard', 'Chłodnia'
      weight_kg REAL NOT NULL,             -- waga produktu
      location_id INTEGER,                 -- klucz obcy (gdzie leży towar)
      FOREIGN KEY (location_id) REFERENCES locations (id)
    );
  `);

  const result = await db.get('SELECT COUNT(*) as count FROM locations');

  if (result.count === 0) {
    console.log('Baza jest pusta. Generuję pełną halę magazynową...');

    const aisles = ['A', 'B', 'C', 'D'];
    for (const aisle of aisles) {
      for (let rack = 1; rack <= 6; rack++) {
        for (let shelf = 1; shelf <= 3; shelf++) {
          const rackStr = rack.toString().padStart(2, '0');
          const shelfStr = shelf.toString().padStart(2, '0');
          const code = `${aisle}-${rackStr}-${shelfStr}`;

          const zone = aisle === 'D' ? 'Chłodnia' : 'Standard';
          const weight = shelf === 1 ? 500 : (shelf === 2 ? 200 : 50);

          await db.exec(`
                      INSERT INTO locations (code, zone_type, max_weight_kg, is_occupied) 
                      VALUES ('${code}', '${zone}', ${weight}, 0)
                    `);
        }
      }
    }

    await db.exec(`
          INSERT INTO products (sku, name, category, weight_kg, location_id) VALUES 
          ('SKU-100', 'Paleta Cukru', 'Standard', 450, 1),
          ('SKU-101', 'Zgrzewka Wody', 'Standard', 15, 2),
          ('SKU-900', 'Mrożone Ryby', 'Chłodnia', 120, 70);
        `);

    await db.exec('UPDATE locations SET is_occupied = 1 WHERE id IN (1, 2, 70)');
  }

  console.log('Struktura bazy danych (tabele) została poprawnie zainicjowana.');
}