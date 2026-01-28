Technical Questions
1. If this app had 10,000 employees checking in simultaneously, what would break first? How would you fix it?

Handling 10,000 simultaneous check-ins would likely overload the backend server, especially the API routes that interact with SQLite. SQLite is file-based and doesn’t handle high concurrency well. The first issues would be:

API response delays or timeouts

Database write failures or locks

Fix:

Move to a more robust database like PostgreSQL or MySQL that supports concurrent writes.

Use connection pooling to efficiently manage database connections.

Implement rate limiting or queueing to smooth out spikes in check-ins.

Consider scaling the backend horizontally using multiple server instances behind a load balancer.

2. The current JWT implementation has a security issue. What is it and how would you improve it?

Potential issue:

JWT might be stored in localStorage, which is vulnerable to XSS attacks.

Tokens may not have proper expiration or rotation, increasing risk if stolen.

Improvements:

Store JWT in httpOnly cookies instead of localStorage.

Set short token lifetimes and use refresh tokens to maintain sessions securely.

Always validate tokens on the server and include a jti (JWT ID) or blacklist for revoked tokens.

3. How would you implement offline check-in support? (Employee has no internet, checks in, syncs later)

Approach:

Store check-in data locally in the browser (IndexedDB) or mobile device storage.

Track the timestamp, client, location, and employee ID.

When the device goes online, sync all offline check-ins to the backend in a batch.

Handle conflicts gracefully (e.g., check for duplicate check-ins or updated client data).

This ensures employees can work without constant connectivity while keeping backend data consistent.

Theory/Research Questions
4. Explain the difference between SQL and NoSQL databases. For this Field Force Tracker application, which would you recommend and why?

SQL: Structured, relational databases (e.g., SQLite, PostgreSQL). Good for consistent, transactional data with relationships.

NoSQL: Flexible, schema-less databases (e.g., MongoDB, Firebase). Better for unstructured data and horizontal scaling.

Recommendation for this app:

SQL (like SQLite for small deployments, PostgreSQL for production) is preferred.

Reason: Check-ins, employees, and clients have clear relationships. SQL ensures data integrity, supports joins for reporting, and handles transactional updates safely.

5. What is the difference between authentication and authorization? Identify where each is implemented in this codebase.

Authentication: Verifying the user’s identity (login).

Implemented in /api/auth/login and verified using authenticateToken middleware.

Authorization: Checking if a user has permission to perform an action.

Implemented in routes like /users/team and /dashboard/stats via role checks (e.g., requireManager) to ensure only managers can access certain data.

6. Explain what a race condition is. Can you identify any potential race conditions in this codebase? How would you prevent them?

Race condition: Occurs when multiple operations access shared resources concurrently and the final result depends on the order of execution.

Potential race conditions in this app:

Multiple check-ins being submitted at the same time for the same employee could cause incorrect status or duplicate records.

Simultaneous dashboard stats queries and check-ins could lead to inconsistent data in the reports.

Prevention:

Use database transactions for critical operations (e.g., check-in updates).

Lock rows or use unique constraints to prevent duplicates.

Serialize operations where needed or move to a database that supports higher concurrency (like PostgreSQL).