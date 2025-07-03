const express = require('express');
const mysql = require('mysql2/promise');
const cors = require('cors');
const path = require('path');
const pesapalRoutes = require('./routes/pesapal');
const movieRoutes = require('./routes/movies');
const ticketRoutes = require('./routes/tickets');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors());
app.use(express.static('public'));

// Database configuration
const dbConfig = {
    host: 'localhost',
    user: 'root',
    password: 'MySQLXXX-123a8910',
    database: 'movie_pesapal'
};

// Create database connection pool
const pool = mysql.createPool(dbConfig);

// Make database available to routes
app.locals.db = pool;

// Routes
app.use('/api/movies', movieRoutes);
app.use('/api/tickets', ticketRoutes);
app.use('/api', pesapalRoutes);

// Serve HTML pages
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/ticket/:ticketId', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'ticket.html'));
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Error:', err);
    res.status(500).json({ error: 'Internal server error' });
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({ error: 'Route not found' });
});

app.listen(PORT, () => {
    console.log(`Movie Ticket System running on http://localhost:${PORT}`);
    console.log(`Make sure MySQL is running and database 'movie_pesapal' exists`);
});
