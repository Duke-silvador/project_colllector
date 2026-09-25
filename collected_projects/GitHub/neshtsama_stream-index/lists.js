const express = require('express');
const db = require('../db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();
const VALID_LISTS = new Set(['bookmarks', 'watchlater']);

// Same shape index.html and watch.html already build cards from.
function toFrontendShape(row) {
    return {
        id: row.tmdb_id,
        title: row.title,
        poster: row.poster,
        year: row.year,
        rating: row.rating,
        type: row.media_type === 'tv' ? 'series' : 'movie'
    };
}

router.get('/:listName', requireAuth, async (req, res) => {
    const { listName } = req.params;
    if (!VALID_LISTS.has(listName)) return res.status(404).json({ error: 'Unknown list' });

    try {
        const result = await db.query(
            'SELECT * FROM list_items WHERE user_id = $1 AND list_name = $2 ORDER BY added_at',
            [req.userId, listName]
        );
        res.json(result.rows.map(toFrontendShape));
    } catch (err) {
        console.error('list fetch failed:', err);
        res.status(500).json({ error: 'Could not load list' });
    }
});

router.post('/:listName', requireAuth, async (req, res) => {
    const { listName } = req.params;
    if (!VALID_LISTS.has(listName)) return res.status(404).json({ error: 'Unknown list' });

    const item = req.body || {};
    if (!item.id || !item.title) {
        return res.status(400).json({ error: 'id and title are required' });
    }
    const mediaType = item.type === 'series' ? 'tv' : 'movie';

    try {
        const existing = await db.query(
            'SELECT id FROM list_items WHERE user_id = $1 AND list_name = $2 AND tmdb_id = $3',
            [req.userId, listName, item.id]
        );
        if (existing.rows.length) return res.json({ added: false });

        await db.query(
            `INSERT INTO list_items (user_id, list_name, tmdb_id, media_type, title, poster, year, rating)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
            [req.userId, listName, item.id, mediaType, item.title, item.poster || null, item.year || null, item.rating || null]
        );
        res.status(201).json({ added: true });
    } catch (err) {
        console.error('list add failed:', err);
        res.status(500).json({ error: 'Could not save to list' });
    }
});

router.delete('/:listName/:tmdbId', requireAuth, async (req, res) => {
    const { listName, tmdbId } = req.params;
    if (!VALID_LISTS.has(listName)) return res.status(404).json({ error: 'Unknown list' });

    try {
        await db.query(
            'DELETE FROM list_items WHERE user_id = $1 AND list_name = $2 AND tmdb_id = $3',
            [req.userId, listName, tmdbId]
        );
        res.status(204).end();
    } catch (err) {
        console.error('list remove failed:', err);
        res.status(500).json({ error: 'Could not remove from list' });
    }
});

module.exports = router;
