const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
// Get environment variables
const PORT = process.env.PORT || 5000;
const HOST = process.env.HOST || '0.0.0.0';
const DATABASE_URL = process.env.DATABASE_URL || 'postgres://neondb_owner:npg_U8evoXZz0WOB@localhost:5432/neondb';
const API_SECRET_KEY = process.env.API_SECRET_KEY || 'TraffiCS10928';
// Create Express app
const app = express();
// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
// Create PostgreSQL connection
const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: false
});
// Test database connection
pool.query('SELECT NOW()')
  .then(result => console.log('✅ Database connected at:', result.rows[0].now))
  .catch(err => console.error('❌ Database connection error:', err));
// Basic API endpoints
app.get('/api/status', (req, res) => {
  res.json({
    status: 'online',
    message: 'URL Campaign Tracker API is running',
    time: new Date().toISOString()
  });
});
app.get('/api/urls', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM urls ORDER BY id DESC LIMIT 20');
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching URLs:', error);
    res.status(500).json({ error: 'Database error' });
  }
});
// Serve static files if available
const staticDir = path.join(__dirname, 'server/public');
if (fs.existsSync(staticDir)) {
  console.log('📂 Serving static files from:', staticDir);
  app.use(express.static(staticDir));
  
  // For SPA, send non-API requests to index.html
  app.get('*', (req, res) => {
    if (req.path.startsWith('/api/')) return;
    res.sendFile(path.join(staticDir, 'index.html'));
  });
} else {
  // Create a simple homepage
  app.get('/', (req, res) => {
    res.send(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>URL Campaign Tracker</title>
          <style>
            body { font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; }
            h1 { color: #333; }
            .card { border: 1px solid #ddd; border-radius: 4px; padding: 20px; margin-bottom: 20px; }
          </style>
        </head>
        <body>
          <h1>URL Campaign Tracker</h1>
          <div class="card">
            <h2>Server Status: Online</h2>
            <p>The URL Campaign Tracker API is running.</p>
            <p>Check the <a href="/api/status">API Status</a> or <a href="/api/urls">URL List</a>.</p>
          </div>
        </body>
      </html>
    `);
  });
}
// Start the server
app.listen(PORT, HOST, () => {
  console.log(`🚀 Server running at http://${HOST}:${PORT}`);
});
