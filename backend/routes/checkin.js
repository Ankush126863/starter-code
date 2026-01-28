const express = require('express');
const db = require('../scripts/init-db'); // better-sqlite3 DB instance
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

/* =========================================================
   📐 HELPER: Haversine Distance Formula
   - Calculates distance between two lat/long points
   - Returns distance in KM (rounded to 2 decimals)
========================================================= */
function calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Earth radius in KM
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;

    const a =
        Math.sin(dLat / 2) ** 2 +
        Math.cos(lat1 * Math.PI / 180) *
        Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLon / 2) ** 2;

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return +(R * c).toFixed(2);
}

/* =========================================================
   GET CLIENTS (Employee / Manager)
========================================================= */
router.get('/clients', authenticateToken, (req, res) => {
    try {
        let clients;

        if (req.user.role === 'manager') {
            // Manager sees all clients assigned to their team
            clients = db.prepare(`
                SELECT DISTINCT c.*
                FROM clients c
                INNER JOIN employee_clients ec ON c.id = ec.client_id
                INNER JOIN users u ON ec.employee_id = u.id
                WHERE u.manager_id = ?
            `).all(req.user.id);
        } else {
            // Employee sees only their assigned clients
            clients = db.prepare(`
                SELECT c.*
                FROM clients c
                INNER JOIN employee_clients ec ON c.id = ec.client_id
                WHERE ec.employee_id = ?
            `).all(req.user.id);
        }

        res.json({ success: true, data: clients });
    } catch (error) {
        console.error('Get clients error:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch clients' });
    }
});

/* =========================================================
   CREATE CHECK-IN  ✅ Feature A implemented here
========================================================= */
router.post('/', authenticateToken, (req, res) => {
    try {
        const { client_id, latitude, longitude, notes, employee_id } = req.body;

        if (!client_id || latitude == null || longitude == null) {
            return res.status(400).json({
                success: false,
                message: 'Client ID and location are required'
            });
        }

        // Default: employee checks in for self
        let checkinEmployeeId = req.user.id;

        /* ---------- Manager Check-in for Team Member ---------- */
        if (req.user.role === 'manager') {
            if (!employee_id) {
                return res.status(400).json({
                    success: false,
                    message: 'employee_id is required for managers'
                });
            }

            const teamMember = db.prepare(`
                SELECT id FROM users
                WHERE id = ? AND manager_id = ?
            `).get(employee_id, req.user.id);

            if (!teamMember) {
                return res.status(403).json({
                    success: false,
                    message: 'Employee does not belong to your team'
                });
            }

            checkinEmployeeId = employee_id;
        }

        /* ---------- Validate Client Assignment ---------- */
        const assignment = db.prepare(`
            SELECT 1 FROM employee_clients
            WHERE employee_id = ? AND client_id = ?
        `).get(checkinEmployeeId, client_id);

        if (!assignment) {
            return res.status(403).json({
                success: false,
                message: 'Employee is not assigned to this client'
            });
        }

        /* ---------- Prevent Multiple Active Check-ins ---------- */
        const activeCheckin = db.prepare(`
            SELECT 1 FROM checkins
            WHERE employee_id = ? AND status = 'checked_in'
        `).get(checkinEmployeeId);

        if (activeCheckin) {
            return res.status(400).json({
                success: false,
                message: 'Employee already has an active check-in'
            });
        }

        /* =====================================================
           📍 FEATURE A: Distance Calculation
        ===================================================== */

        // Get client location
        const client = db.prepare(`
            SELECT latitude, longitude
            FROM clients
            WHERE id = ?
        `).get(client_id);

        if (!client || client.latitude == null || client.longitude == null) {
            return res.status(400).json({
                success: false,
                message: 'Client location not available'
            });
        }

        // Calculate distance (KM)
        const distanceFromClient = calculateDistance(
            latitude,
            longitude,
            client.latitude,
            client.longitude
        );

        // Warning if far (>500 meters)
        const distanceWarning =
            distanceFromClient > 0.5
                ? 'You are far from the client location'
                : null;

        /* ---------- Insert Check-in with Distance ---------- */
        const result = db.prepare(`
            INSERT INTO checkins (
                employee_id,
                client_id,
                latitude,
                longitude,
                distance_from_client,
                notes,
                status
            )
            VALUES (?, ?, ?, ?, ?, ?, 'checked_in')
        `).run(
            checkinEmployeeId,
            client_id,
            latitude,
            longitude,
            distanceFromClient,
            notes || null
        );

        res.status(201).json({
            success: true,
            message: 'Checked in successfully',
            distance_from_client: distanceFromClient,
            distance_warning: distanceWarning,
            id: result.lastInsertRowid
        });

    } catch (error) {
        console.error('Check-in error:', error);
        res.status(500).json({
            success: false,
            message: 'Check-in failed'
        });
    }
});

/* =========================================================
   CHECKOUT
========================================================= */
router.put('/checkout', authenticateToken, (req, res) => {
    try {
        const activeCheckin = db.prepare(`
            SELECT * FROM checkins
            WHERE employee_id = ? AND status = 'checked_in'
            ORDER BY checkin_time DESC
            LIMIT 1
        `).get(req.user.id);

        if (!activeCheckin) {
            return res.status(404).json({
                success: false,
                message: 'No active check-in found'
            });
        }

        db.prepare(`
            UPDATE checkins
            SET checkout_time = CURRENT_TIMESTAMP,
                status = 'checked_out'
            WHERE id = ?
        `).run(activeCheckin.id);

        res.json({ success: true, message: 'Checked out successfully' });
    } catch (error) {
        console.error('Checkout error:', error);
        res.status(500).json({ success: false, message: 'Checkout failed' });
    }
});

/* =========================================================
   CHECK-IN HISTORY (distance included automatically)
========================================================= */
router.get('/history', authenticateToken, (req, res) => {
    try {
        const { start_date, end_date } = req.query;

        let query = `
            SELECT ch.*, c.name AS client_name, c.address AS client_address
            FROM checkins ch
            INNER JOIN clients c ON ch.client_id = c.id
            WHERE ch.employee_id = ?
        `;
        const params = [req.user.id];

        if (start_date) {
            query += ' AND DATE(ch.checkin_time) >= ?';
            params.push(start_date);
        }
        if (end_date) {
            query += ' AND DATE(ch.checkin_time) <= ?';
            params.push(end_date);
        }

        query += ' ORDER BY ch.checkin_time DESC';

        const checkins = db.prepare(query).all(...params);

        res.json({ success: true, data: checkins });
    } catch (error) {
        console.error('History error:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch history' });
    }
});

/* =========================================================
   ACTIVE CHECK-IN
========================================================= */
router.get('/active', authenticateToken, (req, res) => {
    try {
        const activeCheckin = db.prepare(`
            SELECT ch.*, c.name AS client_name
            FROM checkins ch
            INNER JOIN clients c ON ch.client_id = c.id
            WHERE ch.employee_id = ? AND ch.status = 'checked_in'
            ORDER BY ch.checkin_time DESC
            LIMIT 1
        `).get(req.user.id);

        res.json({
            success: true,
            data: activeCheckin || null
        });
    } catch (error) {
        console.error('Active checkin error:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch active check-in' });
    }
});

module.exports = router;
