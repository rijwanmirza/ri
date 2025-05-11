import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from "@shared/schema";

// Check for DATABASE_URL
if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

// Create PostgreSQL pool with direct connection
export const pool = new Pool({ 
  connectionString: process.env.DATABASE_URL,
  ssl: false // Disable SSL for local PostgreSQL 
});

// Export the drizzle instance
export const db = drizzle(pool, { schema });

// Test connection
pool.query('SELECT NOW()')
  .then(result => console.log('✅ Database connected successfully:', result.rows[0].now))
  .catch(err => console.error('❌ Database connection error:', err));
