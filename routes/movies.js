const express = require('express');
const router = express.Router();

// GET /api/movies - Fetch all movies
router.get('/', async (req, res) => {
    try {
        console.log('🎬 Fetching all movies from database...');
        
        const [movies] = await req.app.locals.db.execute(
            `SELECT movieId, title, description, showTime, price, imageUrl, 
                    dateCreated, lastUpdated 
             FROM movie 
             ORDER BY showTime ASC`
        );
        
        console.log(`✅ Found ${movies.length} movies`);
        
        res.json({
            success: true,
            movies: movies
        });
    } catch (error) {
        console.error('❌ Error fetching movies:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch movies'
        });
    }
});

// GET /api/movies/:id - Fetch specific movie
router.get('/:id', async (req, res) => {
    try {
        const movieId = parseInt(req.params.id);
        console.log(`🎬 Fetching movie with ID: ${movieId}`);
        
        const [movies] = await req.app.locals.db.execute(
            `SELECT movieId, title, description, showTime, price, imageUrl, 
                    dateCreated, lastUpdated 
             FROM movie 
             WHERE movieId = ?`,
            [movieId]
        );
        
        if (movies.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Movie not found'
            });
        }
        
        console.log(`✅ Found movie: ${movies[0].title}`);
        
        res.json({
            success: true,
            movie: movies[0]
        });
    } catch (error) {
        console.error('❌ Error fetching movie:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch movie'
        });
    }
});

module.exports = router;
