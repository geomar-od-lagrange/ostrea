const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');

const app = express();
app.use(express.json());
app.use(cors());

// environment variables
const pool = new Pool({
  host: 'db',
  port: 5432,
  user: process.env.POSTGRES_USER,
  password: process.env.POSTGRES_PASSWORD,
  database: 'db',
});

const GEO_TABLE_NAME = 'geo_table';
const CONN_TABLE_NAME = 'connectivity_table';
const META_TABLE_NAME = 'metadata_table';

// Input validation helpers
function validateArray(arr, maxLength, itemValidator) {
  if (!Array.isArray(arr)) return false;
  if (arr.length === 0 || arr.length > maxLength) return false;
  return arr.every(itemValidator);
}

function isValidDepth(d) {
  return ['05m', '10m', '15m'].includes(d);
}

function isValidTimeRange(t) {
  return ['00d-07d', '07d-14d', '14d-28d'].includes(t);
}

function isValidId(id) {
  const num = Number(id);
  return Number.isInteger(num) && num > 0;
}

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


// most used fetch
// takes a list of depths, time ranges, ids
// returns a table of connectivity data, averaged over all perumations of the input
app.get('/connectivity', async (req, res) => {

  const depths = (req.query.depth || "").split(",").filter(Boolean);
  const time_ranges = (req.query.time_range || "").split(",").filter(Boolean);
  const start_ids = (req.query.start_id || '').split(',').filter(Boolean);

  // Validate inputs
  if (!validateArray(depths, 10, isValidDepth)) {
    return res.status(400).json({
      error: 'Invalid depth parameter. Must be array of valid depths (05m, 10m, 15m), max 10 items'
    });
  }

  if (!validateArray(time_ranges, 10, isValidTimeRange)) {
    return res.status(400).json({
      error: 'Invalid time_range parameter. Must be array of valid ranges, max 10 items'
    });
  }

  if (!validateArray(start_ids, 100, isValidId)) {
    return res.status(400).json({
      error: 'Invalid start_id parameter. Must be array of positive integers, max 100 items'
    });
  }

  const start_ids_numbers = start_ids.map(x => Number(x));

  // TODO: Implement aggregation operator (mean, max, min)
  // const op = req.query.op || "mean";

  try {
    const queryText = `
      SELECT end_id, depth, time_range, weight
      FROM ${CONN_TABLE_NAME}
      WHERE start_id = ANY($1)
        AND depth = ANY($2)
        AND time_range = ANY($3); 
    `;
    const result = await pool.query(queryText, [start_ids_numbers, depths, time_ranges]);

    console.log("Request for parameters: ", depths, time_ranges, start_ids_numbers);
    
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
    
    res.json(responsePayload);
  } catch (err) {
    console.error('Error in /metadata:', err);
    res.status(500).json({ error: 'Database query error' });
  }
});

// features
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

