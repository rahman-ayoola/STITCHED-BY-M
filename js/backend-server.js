const express = require('express');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const app = express();
const PORT = 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Database setup
const dbPath = path.join(__dirname, 'bookings.db');
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) console.error('Database connection error:', err);
    else console.log('Connected to SQLite database');
});

// Initialize database tables
db.serialize(() => {
    // Services table
    db.run(`
        CREATE TABLE IF NOT EXISTS services (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            category TEXT NOT NULL,
            price REAL NOT NULL,
            duration INTEGER DEFAULT 0,
            description TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);

    // Bookings table
    db.run(`
        CREATE TABLE IF NOT EXISTS bookings (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            date TEXT NOT NULL,
            time TEXT NOT NULL,
            customer_name TEXT NOT NULL,
            customer_email TEXT NOT NULL,
            customer_phone TEXT,
            services TEXT NOT NULL,
            total_price REAL NOT NULL,
            status TEXT DEFAULT 'confirmed',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);

    // Available time slots table
    db.run(`
        CREATE TABLE IF NOT EXISTS time_slots (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            date TEXT NOT NULL,
            time TEXT NOT NULL,
            is_available INTEGER DEFAULT 1,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);

    // Insert default services if they don't exist
    db.all(`SELECT COUNT(*) as count FROM services`, (err, rows) => {
        if (rows[0].count === 0) {
            const defaultServices = [
                { name: 'Blow dry', category: 'main', price: 10, duration: 15, description: '+ 15 minutes' },
                { name: 'Knee length', category: 'main', price: 15, duration: 60, description: '+ 1 hour' },
                { name: 'No pics during or after appointment', category: 'addon', price: 0, duration: 0 },
                { name: 'Silent appointment', category: 'addon', price: 0, duration: 0 },
                { name: 'Bum length', category: 'addon', price: 10, duration: 45, description: '+ 45 minutes' },
                { name: 'Mixing of braiding hair', category: 'addon', price: 10, duration: 0, description: '(drop hair 2 days in advance)' },
                { name: 'Shoulder length', category: 'addon', price: -10, duration: 0, description: '- £10.00' },
                { name: 'Sunday', category: 'addon', price: 20, duration: 0 }
            ];

            defaultServices.forEach(service => {
                db.run(
                    `INSERT INTO services (name, category, price, duration, description) VALUES (?, ?, ?, ?, ?)`,
                    [service.name, service.category, service.price, service.duration, service.description]
                );
            });
        }
    });
});

// ===== API ENDPOINTS =====

// Get all services
app.get('/api/services', (req, res) => {
    db.all(`SELECT id, name, category, price, duration, description FROM services`, (err, rows) => {
        if (err) {
            res.status(500).json({ error: 'Failed to fetch services' });
        } else {
            res.json(rows);
        }
    });
});

// Get services by category
app.get('/api/services/:category', (req, res) => {
    const { category } = req.params;
    db.all(
        `SELECT id, name, category, price, duration, description FROM services WHERE category = ?`,
        [category],
        (err, rows) => {
            if (err) {
                res.status(500).json({ error: 'Failed to fetch services' });
            } else {
                res.json(rows);
            }
        }
    );
});

// Add new service (admin endpoint)
app.post('/api/services', (req, res) => {
    const { name, category, price, duration = 0, description = '' } = req.body;
    
    if (!name || !category || price === undefined) {
        return res.status(400).json({ error: 'Missing required fields' });
    }

    db.run(
        `INSERT INTO services (name, category, price, duration, description) VALUES (?, ?, ?, ?, ?)`,
        [name, category, price, duration, description],
        function(err) {
            if (err) {
                res.status(500).json({ error: 'Failed to add service' });
            } else {
                res.json({ id: this.lastID, name, category, price, duration, description });
            }
        }
    );
});

// Update service
app.put('/api/services/:id', (req, res) => {
    const { id } = req.params;
    const { name, category, price, duration = 0, description = '' } = req.body;

    db.run(
        `UPDATE services SET name = ?, category = ?, price = ?, duration = ?, description = ? WHERE id = ?`,
        [name, category, price, duration, description, id],
        function(err) {
            if (err) {
                res.status(500).json({ error: 'Failed to update service' });
            } else if (this.changes === 0) {
                res.status(404).json({ error: 'Service not found' });
            } else {
                res.json({ id, name, category, price, duration, description });
            }
        }
    );
});

// Delete service
app.delete('/api/services/:id', (req, res) => {
    const { id } = req.params;
    db.run(`DELETE FROM services WHERE id = ?`, [id], function(err) {
        if (err) {
            res.status(500).json({ error: 'Failed to delete service' });
        } else if (this.changes === 0) {
            res.status(404).json({ error: 'Service not found' });
        } else {
            res.json({ success: true });
        }
    });
});

// Get available time slots for a date
app.get('/api/slots/:date', (req, res) => {
    const { date } = req.params;
    
    // Generate default slots (10:00 AM - 1:00 PM, 10 min intervals)
    const slots = [];
    let hour = 10;
    let minute = 0;
    
    while (hour < 13 || (hour === 13 && minute === 0)) {
        const ampm = hour >= 12 ? 'PM' : 'AM';
        const displayHour = hour > 12 ? hour - 12 : hour;
        const timeStr = `${String(displayHour).padStart(2, '0')}:${String(minute).padStart(2, '0')} ${ampm}`;
        slots.push(timeStr);
        
        minute += 10;
        if (minute === 60) {
            minute = 0;
            hour += 1;
        }
    }

    // Check which slots are booked
    db.all(
        `SELECT time FROM bookings WHERE date = ? AND status = 'confirmed'`,
        [date],
        (err, bookedSlots) => {
            if (err) {
                res.status(500).json({ error: 'Failed to fetch slots' });
                return;
            }

            const bookedTimes = bookedSlots.map(slot => slot.time);
            const availableSlots = slots.map(time => ({
                time,
                available: !bookedTimes.includes(time)
            }));

            res.json(availableSlots);
        }
    );
});

// Create booking
app.post('/api/bookings', (req, res) => {
    const { date, time, customer_name, customer_email, customer_phone, services, total_price } = req.body;

    if (!date || !time || !customer_name || !customer_email || !services || total_price === undefined) {
        return res.status(400).json({ error: 'Missing required fields' });
    }

    // Check if slot is available
    db.get(
        `SELECT * FROM bookings WHERE date = ? AND time = ? AND status = 'confirmed'`,
        [date, time],
        (err, row) => {
            if (err) {
                return res.status(500).json({ error: 'Database error' });
            }

            if (row) {
                return res.status(409).json({ error: 'Time slot already booked' });
            }

            // Insert booking
            db.run(
                `INSERT INTO bookings (date, time, customer_name, customer_email, customer_phone, services, total_price) 
                 VALUES (?, ?, ?, ?, ?, ?, ?)`,
                [date, time, customer_name, customer_email, customer_phone, JSON.stringify(services), total_price],
                function(err) {
                    if (err) {
                        res.status(500).json({ error: 'Failed to create booking' });
                    } else {
                        res.json({ 
                            id: this.lastID, 
                            date, 
                            time, 
                            customer_name, 
                            customer_email,
                            total_price
                        });
                    }
                }
            );
        }
    );
});

// Get all bookings (admin)
app.get('/api/bookings', (req, res) => {
    db.all(`SELECT * FROM bookings ORDER BY date DESC, time DESC`, (err, rows) => {
        if (err) {
            res.status(500).json({ error: 'Failed to fetch bookings' });
        } else {
            res.json(rows);
        }
    });
});

// Get booking by ID
app.get('/api/bookings/:id', (req, res) => {
    const { id } = req.params;
    db.get(`SELECT * FROM bookings WHERE id = ?`, [id], (err, row) => {
        if (err) {
            res.status(500).json({ error: 'Failed to fetch booking' });
        } else if (!row) {
            res.status(404).json({ error: 'Booking not found' });
        } else {
            res.json(row);
        }
    });
});

// Cancel booking
app.delete('/api/bookings/:id', (req, res) => {
    const { id } = req.params;
    db.run(`DELETE FROM bookings WHERE id = ?`, [id], function(err) {
        if (err) {
            res.status(500).json({ error: 'Failed to cancel booking' });
        } else if (this.changes === 0) {
            res.status(404).json({ error: 'Booking not found' });
        } else {
            res.json({ success: true });
        }
    });
});

// Health check
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok' });
});

// Start server
app.listen(PORT, () => {
    console.log(`🚀 Salon booking API running on http://localhost:${PORT}`);
    console.log(`📚 API endpoints:`);
    console.log(`   GET  /api/services             - Get all services`);
    console.log(`   GET  /api/services/:category   - Get services by category`);
    console.log(`   POST /api/services             - Add new service`);
    console.log(`   GET  /api/slots/:date          - Get available slots for date`);
    console.log(`   POST /api/bookings             - Create booking`);
    console.log(`   GET  /api/bookings             - Get all bookings`);
});
