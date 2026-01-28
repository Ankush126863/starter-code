const express = require('express');
const router = express.Router();

const db = require('../scripts/init-db');
// const { authenticateToken, requireManager } = require('../middleware/auth');
console.log('✅ reports.js loaded');

// ===============================
// GET /api/reports/daily-summary
// ===============================
router.get(
  '/daily-summary',
  authenticateToken,
  requireManager,
  (req, res) => {
    try {
      const { date, employee_id } = req.query;

      if (!date) {
        return res.status(400).json({
          success: false,
          message: 'date is required (YYYY-MM-DD)',
        });
      }

      const params = [date];
      let employeeFilter = '';

      if (employee_id) {
        employeeFilter = 'AND c.employee_id = ?';
        params.push(employee_id);
      }

      // 👇 Per employee stats
      const employees = db.prepare(`
        SELECT 
          c.employee_id,
          u.name AS employee_name,
          COUNT(c.id) AS total_checkins,
          ROUND(
            SUM(
              (strftime('%s', c.checkout_time) - strftime('%s', c.checkin_time)) / 3600.0
            ), 2
          ) AS working_hours,
          COUNT(DISTINCT c.client_id) AS clients_visited
        FROM checkins c
        JOIN users u ON u.id = c.employee_id
        WHERE DATE(c.checkin_time) = ?
        ${employeeFilter}
        GROUP BY c.employee_id
      `).all(params);

      // 👇 Team summary
      const team_summary = db.prepare(`
        SELECT
          COUNT(DISTINCT c.employee_id) AS total_employees,
          COUNT(c.id) AS total_checkins,
          ROUND(
            SUM(
              (strftime('%s', c.checkout_time) - strftime('%s', c.checkin_time)) / 3600.0
            ), 2
          ) AS total_working_hours,
          COUNT(DISTINCT c.client_id) AS total_clients_visited
        FROM checkins c
        WHERE DATE(c.checkin_time) = ?
      `).get(date) || {
        total_employees: 0,
        total_checkins: 0,
        total_working_hours: 0,
        total_clients_visited: 0,
      };

      res.json({
        success: true,
        date,
        team_summary,
        employees,
      });
    } catch (err) {
      console.error('Daily report error:', err);
      res.status(500).json({
        success: false,
        message: 'Failed to generate daily report',
      });
    }
  }
);

module.exports = router;
