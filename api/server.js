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
const CONN_TABLE_NAME = 'connectivity_table';
const META_TABLE_NAME = 'metadata_table';

function normalize(data) {
  const weights = data.map(d => d.weight);
  const min = Math.min(...weights);
  const max = Math.max(...weights);
  
  if (max === min) {
    // All values identical (or only one item)
    return data.map(d => ({ ...d, weight: 1 }));
  }

  return data.map(d => ({
    ...d,
    weight: (Math.log(d.weight) - Math.log(min)) / (Math.log(max) - Math.log(min))
  }));
}


// GET /connectivity?id=<id>
// returns an array of [otherId, value] tuples for the requested id
app.get('/connectivity', async (req, res) => {

  const depths = (req.query.depth || "").split(",");
  const time_ranges = (req.query.time_range || "").split(",");
  const start_ids = (req.query.start_id || '')
    .split(',')
    .filter(Boolean)
    .map(x => Number(x));
  const op = req.query.op || "mean";

  try {
    const queryText = `
      SELECT end_id, depth, time_range, weight
      FROM ${CONN_TABLE_NAME}
      WHERE start_id = ANY($1)
        AND depth = ANY($2)
        AND time_range = ANY($3); 
    `;
    const result = await pool.query(queryText, [start_ids, depths, time_ranges]);
    
    console.log("Request for parameters: ", depths, time_ranges, start_ids);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: `No entry for parameters: depths=${depths}&time_ranges=${time_ranges}&start_id=${start_ids}` });
    }
    const data = result.rows;
    
    const mean = xs => xs.reduce((a,b)=>a+b,0) / (xs.length || 1);

    const byEndId = data.reduce((acc, r) => {
      (acc[r.end_id] ??= []).push(r);
      return acc;
    }, {});

    const aggregates = Object.entries(byEndId).map(([end_id, rows]) => ({
      end_id: typeof rows[0].end_id === 'number' ? Number(end_id) : String(end_id),
      weight: mean(rows.map(r => +r.weight)),
    }));
        
    const responsePayload = normalize(aggregates);
    
    //console.log("Output: ", responsePayload);

    // 5) return it directly
    res.json(responsePayload);
  } catch (err) {
    console.error('Error in /connectivity:', err);
    res.status(500).json({ error: 'Database query error' });
  }
});

//metadata
app.get('/metadata', async (req, res) => {
  try {
    const queryText = `
      SELECT id, lon, lat, depth, disease, rest, aqc, pop
      FROM ${META_TABLE_NAME}
    `; 
    const result = await pool.query(queryText);
        
    console.log("Request for metadata") 
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: `No metadata` });
    }

    const responsePayload = result.rows;
    
    // 5) return it directly
    res.json(responsePayload);
  } catch (err) {
    console.error('Error in /metadata:', err);
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
    
    console.log("Request for features")

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

