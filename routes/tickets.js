const express = require('express');
const router = express.Router();

// GET /api/tickets/:id - Get ticket details
router.get('/:id', async (req, res) => {
    try {
        const ticketId = parseInt(req.params.id);
        console.log(`🎫 Fetching ticket with ID: ${ticketId}`);
        
        const [tickets] = await req.app.locals.db.execute(
            `SELECT t.*, m.title as movieTitle, m.description as movieDescription, 
                    m.showTime, m.imageUrl 
             FROM ticket t 
             JOIN movie m ON t.movieId = m.movieId 
             WHERE t.ticketId = ?`,
            [ticketId]
        );
        
        if (tickets.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Ticket not found'
            });
        }
        
        const ticket = tickets[0];
        console.log(`✅ Found ticket for: ${ticket.customerName}`);
        
        res.json({
            success: true,
            ticket: ticket
        });
    } catch (error) {
        console.error('❌ Error fetching ticket:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch ticket'
        });
    }
});

// GET /api/tickets - Get all tickets (for admin)
router.get('/', async (req, res) => {
    try {
        console.log('🎫 Fetching all tickets...');
        
        const [tickets] = await req.app.locals.db.execute(
            `SELECT t.*, m.title as movieTitle, m.showTime 
             FROM ticket t 
             JOIN movie m ON t.movieId = m.movieId 
             ORDER BY t.dateCreated DESC`
        );
        
        console.log(`✅ Found ${tickets.length} tickets`);
        
        res.json({
            success: true,
            tickets: tickets
        });
    } catch (error) {
        console.error('❌ Error fetching tickets:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch tickets'
        });
    }
});

module.exports = router;
