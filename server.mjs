import express from 'express';
import { Pool } from 'pg';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
// Get the directory name
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
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
// API routes
app.get('/api/status', (req, res) => {
  res.json({
    status: 'online',
    message: 'URL Campaign Tracker API is running',
    time: new Date().toISOString()
  });
});
// URL routes
app.get('/api/urls', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM urls ORDER BY id DESC LIMIT 100');
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching URLs:', error);
    res.status(500).json({ error: 'Database error' });
  }
});
// Campaign routes
app.get('/api/campaigns', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM campaigns ORDER BY id DESC');
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching campaigns:', error);
    res.status(500).json({ error: 'Database error' });
  }
});
// Campaign click route (supports the redirects)
app.get('/c/:campaignId/:urlId', async (req, res) => {
  const { campaignId, urlId } = req.params;
  
  try {
    // Get the URL
    const urlResult = await pool.query(
      'SELECT * FROM urls WHERE id = $1 AND campaign_id = $2',
      [urlId, campaignId]
    );
    
    if (urlResult.rows.length === 0) {
      return res.status(404).send('URL not found');
    }
    
    const url = urlResult.rows[0];
    
    // Increment click count
    await pool.query(
      'UPDATE urls SET clicks = clicks + 1 WHERE id = $1',
      [urlId]
    );
    
    // Redirect to target URL
    res.redirect(url.target_url);
  } catch (error) {
    console.error('Error handling campaign click:', error);
    res.status(500).send('Server error');
  }
});
// Direct URL route
app.get('/r/:urlId', async (req, res) => {
  const { urlId } = req.params;
  
  try {
    // Get the URL
    const urlResult = await pool.query(
      'SELECT * FROM urls WHERE id = $1',
      [urlId]
    );
    
    if (urlResult.rows.length === 0) {
      return res.status(404).send('URL not found');
    }
    
    const url = urlResult.rows[0];
    
    // Increment click count
    await pool.query(
      'UPDATE urls SET clicks = clicks + 1 WHERE id = $1',
      [urlId]
    );
    
    // Redirect to target URL
    res.redirect(url.target_url);
  } catch (error) {
    console.error('Error handling direct URL:', error);
    res.status(500).send('Server error');
  }
});
// Find static directory
const staticDir = path.join(__dirname, 'dist/public');
if (fs.existsSync(staticDir)) {
  console.log('📂 Serving static files from:', staticDir);
  app.use(express.static(staticDir));
}
// For all remaining routes, serve the index.html (for SPA routing)
app.get('/*', (req, res) => {
  const indexPath = path.join(staticDir, 'index.html');
  if (fs.existsSync(indexPath)) {
    res.sendFile(indexPath);
  } else {
    res.status(404).send('Frontend not found');
  }
});
// Start the server
app.listen(PORT, HOST, () => {
  console.log(`🚀 Server running at http://${HOST}:${PORT}`);
});
