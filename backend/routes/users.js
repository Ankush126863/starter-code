const express = require('express');
const db = require('../scripts/init-db');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Manager: get team members
router.get('/team', authenticateToken, (req, res) => {
    try {
        if (req.user.role !== 'manager') {
            return res.status(403).json({
                success: false,
                message: 'Access denied'
            });
        }

        const team = db.prepare(`
            SELECT id, name, email
            FROM users
            WHERE manager_id = ?
        `).all(req.user.id);

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
