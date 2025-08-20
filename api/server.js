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
  const { depth, time_range, start_id } = req.query;
  if ( !depth || !time_range || !start_id ) {
    return res.status(400).json({ error: 'Missing query parameter: id' });
  }

  try {
    const queryText = `
      SELECT end_id, weight
      FROM ${CONN_TABLE_NAME}
      WHERE depth = $1 AND time_range = $2 AND start_id = $3; 
    `;
    const result = await pool.query(queryText, [depth, time_range, start_id]);
    
      console.log("Request for id", depth, time_range, start_id);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: `No entry for parameters: depth=${depth}&time_range=${time_range}&start_id=${start_id}` });
    }


    const responsePayload = result.rows;

    // 5) return it directly
    res.json(responsePayload);
  } catch (err) {
    console.error('Error in /connectivity:', err);
    res.status(500).json({ error: 'Database query error' });
  }
});

//Only for debugging
app.get('/all_connectivity', async (req, res) => {
  try {
    const queryText = `
      SELECT start_id, end_id, weight
      FROM ${CONN_TABLE_NAME}
    `; 
    const result = await pool.query(queryText);
        
    if (result.rows.length === 0) {
      return res.status(404).json({ error: `No connectivity data` });
    }


    const responsePayload = result.rows;

    // 5) return it directly
    res.json(responsePayload);
  } catch (err) {
    console.error('Error in /connectivity:', err);
    res.status(500).json({ error: 'Database query error' });
  }
});

// GET /feature
app.get('/feature', async (req, res) => {
  try {
    const queryText = `
      SELECT
        id,
        ST_AsGeoJSON(geometry) AS geometry
      FROM ${GEO_TABLE_NAME};
    `;
    const result = await pool.query(queryText);
    
    console.log("Request for features.")

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'No features found' });
    }
    
    const features = result.rows.map(row => ({
      type: 'Feature',
      geometry: JSON.parse(row.geometry),
      properties: {
        id: row.id,
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

