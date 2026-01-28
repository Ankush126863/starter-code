const express = require('express');
const router = express.Router();

const { authenticateToken, requireManager } = require('../middleware/auth');
const db = require('../config/database');

router.get('/team', authenticateToken, requireManager, async (req, res) => {
    try {
        const [team] = await db.execute(
            `SELECT id, name, email FROM users WHERE manager_id = ?`,
            [req.user.id]
        );

        res.json({ success: true, data: team });
    } catch (err) {
        console.error('Fetch team error:', err);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch team'
        });
    }
});

module.exports = router;
