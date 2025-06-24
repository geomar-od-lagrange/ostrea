const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');

const app = express();
app.use(express.json());
app.use(cors());

// Create a connection pool using environment variables
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  database: process.env.DB_NAME || 'geodata',
});

// Adjust table name if needed to match your import
const TABLE_NAME = 'test_polygons';

// GET /features: return all polygons as a GeoJSON FeatureCollection
app.get('/features', async (req, res) => {
  try {
    const queryText = `
      SELECT
        id,
        ST_AsGeoJSON(geom) AS geometry,
        name,
        depth
      FROM ${TABLE_NAME};
    `;
    const result = await pool.query(queryText);
    const features = result.rows.map(row => ({
      type: 'Feature',
      geometry: JSON.parse(row.geometry),
      properties: {
        name: row.name,
        depth: row.depth,
      },
    }));
    res.json({ type: 'FeatureCollection', features });
  } catch (err) {
    console.error('Error in /features:', err);
    res.status(500).json({ error: 'Database query error' });
  }
});

// GET /feature?depth=:depth - filter by depth
app.get('/feature', async (req, res) => {
  const { depth } = req.query;
  if (!depth) {
    return res.status(400).json({ error: 'Missing query parameter: depth' });
  }
  try {
    const queryText = `
      SELECT
        id,
        ST_AsGeoJSON(geometry) AS geometry,
        name,
        depth
      FROM ${TABLE_NAME}
      WHERE depth = $1;
    `;
    const result = await pool.query(queryText, [depth]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'No matching feature found' });
    }
    const features = result.rows.map(row => ({
      type: 'Feature',
      geometry: JSON.parse(row.geometry),
      properties: {
        name: row.name,
        depth: row.depth,
      },
    }));
    // Return a single Feature if only one, else a FeatureCollection
    if (features.length === 1) {
      return res.json(features[0]);
    }
    res.json({ type: 'FeatureCollection', features });
  } catch (err) {
    console.error('Error in /feature:', err);
    res.status(500).json({ error: 'Database query error' });
  }
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`API server is running on port ${PORT}`);
});

