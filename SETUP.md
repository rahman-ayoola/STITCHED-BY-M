# Salon Booking System - Setup Guide

## Architecture

```
Frontend (HTML/CSS/JS)    ← Fetches from API
        ↓
    localhost:3000 (Express API)
        ↓
    SQLite Database (bookings.db)
```

## Setup Steps

### 1. Backend Setup

```bash
# Create a project folder
mkdir stitched-by-m
cd stitched-by-m

# Copy backend-server.js and package.json into this folder

# Install dependencies
npm install

# Start the server
npm start
```

You should see:
```
🚀 Salon booking API running on http://localhost:3000
```

### 2. Frontend Setup

- Copy `salon-booking-api.html` into your WebStorm project
- Open it in your browser (right-click → Open in Browser)
- The page will automatically fetch services and time slots from the API

## API Endpoints

### Services (Data-Driven)

**Get all services:**
```bash
GET http://localhost:3000/api/services
```

**Get services by category:**
```bash
GET http://localhost:3000/api/services/main
GET http://localhost:3000/api/services/addon
```

**Add a new service:**
```bash
curl -X POST http://localhost:3000/api/services \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Wig installation",
    "category": "addon",
    "price": 25,
    "duration": 30,
    "description": "+ 30 minutes"
  }'
```

**Update a service:**
```bash
curl -X PUT http://localhost:3000/api/services/1 \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Blow dry",
    "category": "main",
    "price": 12,
    "duration": 15,
    "description": "+ 15 minutes"
  }'
```

**Delete a service:**
```bash
curl -X DELETE http://localhost:3000/api/services/1
```

### Bookings

**Get available slots for a date:**
```bash
GET http://localhost:3000/api/slots/2026-08-15
```

**Create a booking:**
```bash
curl -X POST http://localhost:3000/api/bookings \
  -H "Content-Type: application/json" \
  -d '{
    "date": "2026-08-15",
    "time": "10:00 AM",
    "customer_name": "John Doe",
    "customer_email": "john@example.com",
    "customer_phone": "07700 000000",
    "services": [
      { "name": "Blow dry", "price": 10 }
    ],
    "total_price": 10
  }'
```

**Get all bookings (admin):**
```bash
GET http://localhost:3000/api/bookings
```

**Get a specific booking:**
```bash
GET http://localhost:3000/api/bookings/1
```

**Cancel a booking:**
```bash
DELETE http://localhost:3000/api/bookings/1
```

## Adding/Editing Services

You don't need to edit HTML anymore! Just use the API:

### Option 1: Use curl (command line)
```bash
curl -X POST http://localhost:3000/api/services \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Box braids",
    "category": "main",
    "price": 50,
    "duration": 120,
    "description": "+ 2 hours"
  }'
```

### Option 2: Use Postman
Import the requests above into Postman for a GUI.

### Option 3: Build an Admin Panel (Coming Soon)
You can add an admin page that has forms to:
- Add services
- Edit services
- Delete services
- View all bookings

## Database

The database is automatically created when the server starts:

```
salon-booking/
├── backend-server.js
├── package.json
├── bookings.db          ← SQLite database (auto-created)
└── node_modules/
```

### Database Schema

**Services Table:**
```sql
CREATE TABLE services (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT NOT NULL,    -- 'main' or 'addon'
  price REAL NOT NULL,
  duration INTEGER,          -- in minutes
  description TEXT,
  created_at DATETIME
)
```

**Bookings Table:**
```sql
CREATE TABLE bookings (
  id INTEGER PRIMARY KEY,
  date TEXT NOT NULL,        -- YYYY-MM-DD
  time TEXT NOT NULL,        -- HH:MM AM/PM
  customer_name TEXT NOT NULL,
  customer_email TEXT NOT NULL,
  customer_phone TEXT,
  services TEXT NOT NULL,    -- JSON array
  total_price REAL NOT NULL,
  status TEXT,               -- 'confirmed', 'cancelled'
  created_at DATETIME
)
```

## Testing

### Test the API
```bash
# Check if server is running
curl http://localhost:3000/api/health

# Get all services
curl http://localhost:3000/api/services

# Get available slots
curl http://localhost:3000/api/slots/2026-08-15
```

### Test the Frontend
1. Open `salon-booking-api.html` in your browser
2. You should see services loaded from the API
3. Select a date → see available time slots
4. Select services → see total price update
5. Fill in your details and book

## Troubleshooting

**"Failed to load services" error?**
- Make sure the backend is running: `npm start`
- Check that it's listening on `http://localhost:3000`
- Check browser console (F12) for CORS errors

**Database errors?**
- Delete `bookings.db` and restart the server to reset
- The database will auto-create on startup

**No time slots showing?**
- The API generates time slots automatically (10 AM - 1 PM)
- Slots are marked unavailable if already booked

## Next Steps

1. ✅ Data-driven services (done)
2. ⏳ Admin panel to manage services/bookings
3. ⏳ Email notifications
4. ⏳ Payment integration (Stripe)
5. ⏳ Customer email confirmation

## File Structure

```
salon-booking/
├── backend-server.js      ← Express API server
├── package.json           ← Node dependencies
├── bookings.db            ← SQLite database (auto-created)
└── SETUP.md               ← This file

And in your WebStorm project:
├── salon-booking-api.html ← Data-driven frontend
```

## Production Notes

Before deploying:
- Add environment variables for API_URL (not hardcoded)
- Add authentication for admin endpoints
- Add input validation & sanitization
- Use a real database (PostgreSQL recommended)
- Add error logging
- Rate limit bookings to prevent spam
