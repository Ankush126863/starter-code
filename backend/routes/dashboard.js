const express = require('express');
const db = require('../scripts/init-db');
const { authenticateToken, requireManager } = require('../middleware/auth');

const router = express.Router();

// Helpers
const runQuery = (query, params = []) => db.prepare(query).all(params);
const runQuerySingle = (query, params = []) => db.prepare(query).get(params);

// =======================
// MANAGER DASHBOARD
// =======================
router.get('/stats', authenticateToken, requireManager, (req, res) => {
    try {
        const today = new Date().toISOString().split('T')[0];

        // Team members
        const teamMembers = runQuery(
            `SELECT id, name, email 
             FROM users 
             WHERE manager_id = ?`,
            [req.user.id]
        );

        // Today's check-ins (NO DUPLICATES)
        const todayCheckins = runQuery(
            `SELECT ch.id,
                    ch.checkin_time,
                    ch.checkout_time,
                    ch.status,
                    u.name AS employee_name,
                    c.name AS client_name
             FROM checkins ch
             JOIN users u ON ch.employee_id = u.id
             JOIN clients c ON ch.client_id = c.id
             WHERE u.manager_id = ?
               AND DATE(ch.checkin_time) = ?
             ORDER BY ch.checkin_time DESC`,
            [req.user.id, today]
        );

        // Active check-ins count
        const activeRow = runQuerySingle(
            `SELECT COUNT(*) AS count
             FROM checkins ch
             JOIN users u ON ch.employee_id = u.id
             WHERE u.manager_id = ?
               AND ch.status = 'checked_in'`,
            [req.user.id]
        );

        res.json({
            success: true,
            data: {
                team_size: teamMembers.length,
                team_members: teamMembers,
                today_checkins: todayCheckins,
                active_checkins: activeRow?.count || 0
            }
        });
    } catch (error) {
        console.error('Manager dashboard error:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch dashboard stats' });
    }
});

// =======================
// EMPLOYEE DASHBOARD
// =======================
router.get('/employee', authenticateToken, (req, res) => {
    try {
        const today = new Date().toISOString().split('T')[0];

        // Today's check-ins
        const todayCheckins = runQuery(
            `SELECT ch.id,
                    ch.checkin_time,
                    ch.checkout_time,
                    ch.status,
                    c.name AS client_name
             FROM checkins ch
             JOIN clients c ON ch.client_id = c.id
             WHERE ch.employee_id = ?
               AND DATE(ch.checkin_time) = ?
             ORDER BY ch.checkin_time DESC`,
            [req.user.id, today]
        );

        // Assigned clients (DISTINCT to avoid duplicates)
        const clients = runQuery(
            `SELECT DISTINCT c.id, c.name, c.address
             FROM clients c
             JOIN employee_clients ec ON c.id = ec.client_id
             WHERE ec.employee_id = ?`,
            [req.user.id]
        );

        // Weekly stats
        const weekStats = runQuerySingle(
            `SELECT COUNT(*) AS total_checkins,
                    COUNT(DISTINCT client_id) AS unique_clients
             FROM checkins
             WHERE employee_id = ?
               AND checkin_time >= datetime('now', '-7 days')`,
            [req.user.id]
        );

        res.json({
            success: true,
            data: {
                today_checkins: todayCheckins,
                assigned_clients: clients,
                week_stats: weekStats || { total_checkins: 0, unique_clients: 0 }
            }
        });
    } catch (error) {
        console.error('Employee dashboard error:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch dashboard' });
    }
});

module.exports = router;
