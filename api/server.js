const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');

const app = express();
app.use(express.json());
app.use(cors());

// Create a connection pool using environment variables
const pool = new Pool({
  host: 'db',
  port: 5432,
  user: 'user',
  password: 'password',
  database: 'db',
});

// Adjust table name if needed to match your import
const GEO_TABLE_NAME = 'geo_table';
const CONN_TABLE_NAME = "connectivity_table";


// GET /connectivity?id=<id>
// returns an array of [otherId, value] tuples for the requested id
app.get('/connectivity', async (req, res) => {
  const { id } = req.query;
  if (!id) {
    return res.status(400).json({ error: 'Missing query parameter: id' });
  }

  try {
    const queryText = `
      SELECT connectivity
      FROM ${CONN_TABLE_NAME}
      WHERE id = $1;
    `;
    const result = await pool.query(queryText, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: `No entry for id=${id}` });
    }

    // If your column is TEXT instead of JSONB, uncomment the next line:
    // const data = JSON.parse(result.rows[0].connectivity);
    const data = result.rows[0].connectivity;

    // Turn { "1":33, "2":34, "3":33 } into [ [1,33], [2,34], [3,33] ]
    const responsePayload = Object.entries(data)
      .map(([otherId, value]) => [Number(otherId), value]);

    // 5) return it directly
    res.json(responsePayload);
  } catch (err) {
    console.error('Error in /connectivity:', err);
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
        depth,
        ST_AsGeoJSON(geometry) AS geometry      
      FROM ${GEO_TABLE_NAME}
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
        id: row.id,
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

