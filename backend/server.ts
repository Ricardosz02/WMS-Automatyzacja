import express from 'express';
import cors from 'cors';
import { initDatabase } from './database';
import { getDbConnection } from './database';

const app = express();
app.use(cors());
app.use(express.json());

const PORT = 5000;

app.get('/api/status', (req, res) => {
    res.json({ message: 'API WMS działa poprawnie!' });
});

app.listen(PORT, async () => {
    console.log(`Serwer backend nasłuchuje na http://localhost:${PORT}`);

    try {
        await initDatabase();
        console.log('Sukces: Połączono z lokalną bazą SQLite i zweryfikowano tabele!');
    } catch (error) {
        console.error('Błąd inicjalizacji bazy:', error);
    }
});

app.post('/api/products/auto', async (req, res) => {
    const { sku, name, category, weight_kg } = req.body;
    const weight = Number(weight_kg);

    try {
        const db = await getDbConnection();
        const optimalLocation = await db.get(`
      SELECT * FROM locations 
      WHERE is_occupied = 0 
        AND zone_type = ? 
        AND max_weight_kg >= ?
      ORDER BY id ASC
      LIMIT 1
    `, [category, weight]);

        if (!optimalLocation) {
            return res.status(400).json({
                error: 'Brak odpowiedniego miejsca w magazynie! (Sprawdź wagę, strefę lub czy magazyn nie jest pełny)'
            });
        }

        await db.run(
            'INSERT INTO products (sku, name, category, weight_kg, location_id) VALUES (?, ?, ?, ?, ?)',
            [sku, name, category, weight, optimalLocation.id]
        );
        await db.run('UPDATE locations SET is_occupied = 1 WHERE id = ?', [optimalLocation.id]);

        res.status(201).json({
            message: 'Towar przyjęty automatycznie',
            assignedCode: optimalLocation.code
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Błąd automatyzacji' });
    }
});

app.get('/api/locations', async (req, res) => {
    try {
        const db = await getDbConnection();
        const locations = await db.all('SELECT * FROM locations');
        res.json(locations);
    } catch (error) {
        res.status(500).json({ error: 'Błąd pobierania lokalizacji' });
    }
});

app.get('/api/locations/:id/product', async (req, res) => {
    try {
        const db = await getDbConnection();
        const product = await db.get('SELECT * FROM products WHERE location_id = ?', [req.params.id]);

        if (product) {
            res.json(product);
        } else {
            res.status(404).json({ message: 'Brak towaru na tej półce' });
        }
    } catch (error) {
        res.status(500).json({ error: 'Błąd pobierania towaru' });
    }
});

app.get('/api/products', async (req, res) => {
    try {
        const db = await getDbConnection();
        const products = await db.all(`
      SELECT p.*, l.code as location_code 
      FROM products p
      LEFT JOIN locations l ON p.location_id = l.id
    `);
        res.json(products);
    } catch (error) {
        res.status(500).json({ error: 'Błąd pobierania towarów' });
    }
});

app.post('/api/products', async (req, res) => {
    const { sku, name, category, weight_kg, location_id } = req.body;

    try {
        const db = await getDbConnection();

        await db.run(
            'INSERT INTO products (sku, name, category, weight_kg, location_id) VALUES (?, ?, ?, ?, ?)',
            [sku, name, category, weight_kg, location_id]
        );

        await db.run('UPDATE locations SET is_occupied = 1 WHERE id = ?', [location_id]);

        res.status(201).json({ message: 'Pomyślnie przyjęto towar!' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Błąd podczas przyjmowania towaru' });
    }
});

app.delete('/api/locations/:id/product', async (req, res) => {
    const locationId = req.params.id;

    try {
        const db = await getDbConnection();

        await db.run('DELETE FROM products WHERE location_id = ?', [locationId]);

        await db.run('UPDATE locations SET is_occupied = 0 WHERE id = ?', [locationId]);

        res.json({ message: 'Towar został wydany z magazynu, półka jest wolna.' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Błąd podczas wydawania towaru' });
    }
});