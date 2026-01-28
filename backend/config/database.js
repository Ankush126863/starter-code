// database-sqlite.js
const Database = require('better-sqlite3');
const path = require('path');

// Path to your SQLite database file
const dbPath = path.join(__dirname, '..', 'database.sqlite');

// Open the database
const db = new Database(dbPath);

// Enable foreign key constraints
db.pragma('foreign_keys = ON');

/**
 * Execute SQL query with parameters, mimicking mysql2 promise API
 * Returns:
 *  - [rows] for SELECT
 *  - [{ insertId, affectedRows }] for INSERT
 *  - [{ affectedRows }] for UPDATE/DELETE
 */
const execute = (sql, params = []) => {
    return new Promise((resolve, reject) => {
        try {
            const trimmedSQL = sql.trim();
            const upperSQL = trimmedSQL.toUpperCase();
            const stmt = db.prepare(trimmedSQL);

            if (upperSQL.startsWith('SELECT')) {
                const rows = stmt.all(...params);
                resolve([rows]);
            } else if (upperSQL.startsWith('INSERT')) {
                const result = stmt.run(...params);
                resolve([{
                    insertId: result.lastInsertRowid,
                    affectedRows: result.changes
                }]);
            } else {
                const result = stmt.run(...params);
                resolve([{
                    affectedRows: result.changes
                }]);
            }
        } catch (error) {
            reject(error);
        }
    });
};

// Optional: query alias
const query = execute;

module.exports = { execute, query };
