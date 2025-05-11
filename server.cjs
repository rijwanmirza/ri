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
// Check for static files in different locations
const possibleStaticDirs = [
  path.join(__dirname, 'server/public'),
  path.join(__dirname, 'dist/public'),
  path.join(__dirname, 'dist'),
  path.join(__dirname, 'public')
];
let staticDir = null;
for (const dir of possibleStaticDirs) {
  if (fs.existsSync(dir)) {
    staticDir = dir;
    console.log('📂 Found static files in:', dir);
    app.use(express.static(dir));
    break;
  }
}
// Default route handler
app.get('*', (req, res) => {
  if (req.path.startsWith('/api/')) return;
  
  // Try to send index.html if it exists
  if (staticDir) {
    const indexPath = path.join(staticDir, 'index.html');
    if (fs.existsSync(indexPath)) {
      return res.sendFile(indexPath);
    }
  }
  
  // Fallback to simple HTML
  res.send(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>URL Campaign Tracker</title>
        <style>
          body { font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; }
          h1 { color: #333; }
          .card { border: 1px solid #ddd; border-radius: 4px; padding: 20px; margin-bottom: 20px; }
          table { width: 100%; border-collapse: collapse; }
          th, td { padding: 8px; text-align: left; border-bottom: 1px solid #ddd; }
          tr:hover { background-color: #f5f5f5; }
        </style>
      </head>
      <body>
        <h1>URL Campaign Tracker</h1>
        <div class="card">
          <h2>Server Status: Online</h2>
          <p>The URL Campaign Tracker API is running.</p>
          <p>Database connection: ✅ Active</p>
        </div>
        <div class="card">
          <h2>API Endpoints</h2>
          <ul>
            <li><a href="/api/status">GET /api/status</a> - Check server status</li>
            <li><a href="/api/urls">GET /api/urls</a> - List recent URLs</li>
          </ul>
        </div>
        <div class="card">
          <h2>URL Data</h2>
          <div id="urlData">Loading...</div>
        </div>
        <script>
          // Fetch URLs from API
          fetch('/api/urls')
            .then(response => response.json())
            .then(data => {
              const container = document.getElementById('urlData');
              if (data.length === 0) {
                container.innerHTML = '<p>No URLs found in database.</p>';
              } else {
                let html = '<table><tr><th>ID</th><th>Name</th><th>Clicks</th><th>Limit</th></tr>';
                data.forEach(url => {
                  html += \`<tr>
                    <td>\${url.id || 'N/A'}</td>
                    <td>\${url.name || url.url || 'N/A'}</td>
                    <td>\${url.clicks || 0}</td>
                    <td>\${url.clickLimit || 'No limit'}</td>
                  </tr>\`;
                });
                html += '</table>';
                container.innerHTML = html;
              }
            })
            .catch(error => {
              document.getElementById('urlData').innerHTML = '<p>Error loading URL data.</p>';
              console.error('Error:', error);
            });
        </script>
      </body>
    </html>
  `);
});
// Start the server
app.listen(PORT, HOST, () => {
  console.log(`🚀 Server running at http://${HOST}:${PORT}`);
});
