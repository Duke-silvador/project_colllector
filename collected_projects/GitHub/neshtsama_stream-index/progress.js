const express = require('express');
const db = require('../db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

// Shaped to match what the frontend already keeps locally (see store.js /
// watch.html), so nothing on the client has to change when this is wired in.
function toFrontendShape(row) {
    const duration = Number(row.duration_seconds);
    const time = Number(row.position_seconds);
    return {
        progress_key: row.progress_key,
        tmdbId: row.tmdb_id,
        mediaType: row.media_type,
        season: row.season,
        episode: row.episode,
        time,
        duration,
        pct: duration ? time / duration : 0,
        updatedAt: new Date(row.updated_at).getTime()
    };
}

router.get('/', requireAuth, async (req, res) => {
    try {
        const result = await db.query(
            `SELECT progress_key, tmdb_id, media_type, season, episode, position_seconds, duration_seconds, updated_at
             FROM watch_progress WHERE user_id = $1`,
            [req.userId]
        );
        res.json(result.rows.map(toFrontendShape));
    } catch (err) {
        console.error('progress list failed:', err);
        res.status(500).json({ error: 'Could not load progress' });
    }
});

router.put('/', requireAuth, async (req, res) => {
    const { key, tmdbId, mediaType, season, episode, time, duration } = req.body || {};

    if (!key || !tmdbId || !mediaType || time == null || duration == null) {
        return res.status(400).json({ error: 'key, tmdbId, mediaType, time and duration are required' });
    }
    if (!['movie', 'tv'].includes(mediaType)) {
        return res.status(400).json({ error: "mediaType must be 'movie' or 'tv'" });
    }

    try {
        await db.query(
            `INSERT INTO watch_progress
                 (user_id, progress_key, tmdb_id, media_type, season, episode, position_seconds, duration_seconds, updated_at)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, now())
             ON CONFLICT (user_id, progress_key) DO UPDATE SET
                 position_seconds = EXCLUDED.position_seconds,
                 duration_seconds = EXCLUDED.duration_seconds,
                 season = EXCLUDED.season,
                 episode = EXCLUDED.episode,
                 updated_at = now()`,
            [req.userId, key, tmdbId, mediaType, season ?? null, episode ?? null, time, duration]
        );
        res.status(204).end();
    } catch (err) {
        console.error('progress upsert failed:', err);
        res.status(500).json({ error: 'Could not save progress' });
    }
});

router.delete('/:key', requireAuth, async (req, res) => {
    try {
        await db.query(
            'DELETE FROM watch_progress WHERE user_id = $1 AND progress_key = $2',
            [req.userId, req.params.key]
        );
        res.status(204).end();
    } catch (err) {
        console.error('progress delete failed:', err);
        res.status(500).json({ error: 'Could not delete progress' });
    }
});

module.exports = router;
