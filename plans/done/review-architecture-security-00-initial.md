# Repository Security, Dependency & Design Review Plan

**Repository:** 2024_hex_dashboard (OYSTERS Project)
**Date:** 2026-01-16
**Review Scope:** Security vulnerabilities, outdated dependencies, design flaws, logic issues

---

## Executive Summary

This repository contains **9 CRITICAL**, **12 HIGH**, and **15 MEDIUM** severity issues that need remediation. The most severe issues involve:
- Exposed database ports and admin interfaces
- Hardcoded credentials committed to version control
- Missing authentication on all API endpoints
- Outdated/EOL Node.js versions
- No input validation or rate limiting

---

## Priority Classification

### 🔴 CRITICAL (Must Fix Before Production)

#### 1. **Exposed Database & Admin Interfaces**
- **File:** `docker-compose.yml:6-7, 17-18`
- **Issue:** PostgreSQL (5432) and Adminer (8080) exposed to host network
- **Risk:** Direct database access from internet; admin interface publicly accessible
- **Fix:**
  ```yaml
  # Remove ports section from db service (internal only)
  db:
    # ports:  # DELETE THIS
    #   - '5432:5432'  # DELETE THIS

  # Remove adminer service entirely OR restrict to localhost only
  adminer:
    ports:
      - '127.0.0.1:8080:8080'  # localhost only
  ```

#### 2. **Hardcoded Credentials in Version Control**
- **File:** `.env:1-3`
- **Issue:** Default credentials `user:password` committed to git
- **Risk:** Anyone with repo access has database credentials
- **Fix:**
  1. Add `.env` to `.gitignore`
  2. Create `.env.example` with placeholders
  3. Remove `.env` from git history: `git rm --cached .env`
  4. Regenerate strong credentials

#### 3. **No Authentication on API Endpoints**
- **File:** `api/server.js:42, 91, 115`
- **Issue:** All endpoints (`/connectivity`, `/metadata`, `/feature`) publicly accessible
- **Risk:** Unauthorized data access, potential DoS
- **Fix:** Implement authentication middleware (JWT, API keys, or OAuth)

#### 4. **CORS Allows All Origins**
- **File:** `api/server.js:7`
- **Issue:** `app.use(cors())` allows requests from ANY origin
- **Risk:** Cross-origin attacks, data theft
- **Fix:**
  ```javascript
  app.use(cors({
    origin: process.env.ALLOWED_ORIGINS?.split(',') || 'http://localhost:5173',
    credentials: true
  }));
  ```

#### 5. **No Rate Limiting**
- **File:** `api/server.js` (all endpoints)
- **Issue:** Unlimited requests to database-heavy endpoints
- **Risk:** DoS attacks, database overload
- **Fix:** Install `express-rate-limit`:
  ```javascript
  const rateLimit = require('express-rate-limit');
  const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100 // limit each IP to 100 requests per windowMs
  });
  app.use('/api/', limiter);
  ```

#### 6. **No Input Validation**
- **File:** `api/server.js:44-50, 133`
- **Issue:** Query parameters accepted without validation
- **Risk:** Malformed data crashes server, unexpected behavior
- **Fix:** Install `express-validator` and validate all inputs:
  ```javascript
  const { query, validationResult } = require('express-validator');

  app.get('/connectivity', [
    query('depth').isArray().custom(arr => arr.every(d => ['05m', '10m', '15m'].includes(d))),
    query('time_range').isArray().custom(arr => arr.every(t => ['00d-07d', '07d-14d', '14d-28d'].includes(t))),
    query('start_id').isArray().custom(arr => arr.every(id => Number.isInteger(Number(id)))),
  ], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    // ... rest of handler
  });
  ```

#### 7. **Missing Security Headers**
- **File:** `api/server.js`
- **Issue:** No security headers (X-Frame-Options, CSP, HSTS, etc.)
- **Risk:** XSS, clickjacking, MIME sniffing attacks
- **Fix:** Install and configure `helmet`:
  ```javascript
  const helmet = require('helmet');
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'"],
        imgSrc: ["'self'", "data:", "https:"],
      }
    }
  }));
  ```

#### 8. **Database Scripts Have No Error Handling**
- **Files:** `database/*.py` (all three scripts)
- **Issue:** No try/except blocks; failures leave database in corrupt state
- **Risk:** Silent failures, incomplete schema, data corruption
- **Fix:** Wrap all operations in try/except:
  ```python
  import sys

  try:
      # Database operations
      with open("data/hexes.geojson") as f:
          gdf = gpd.read_file(f)
      gdf.to_postgis("geo_table", engine, if_exists="replace")
  except FileNotFoundError as e:
      print(f"ERROR: Data file not found: {e}")
      sys.exit(1)
  except Exception as e:
      print(f"ERROR: Database operation failed: {e}")
      sys.exit(1)
  ```

#### 9. **XSS Vulnerability via Tooltip**
- **File:** `frontend/src/App.tsx:169-176`
- **Issue:** Misuse of `encodeURIComponent()` for display text
- **Risk:** If metadata is compromised, HTML injection possible
- **Fix:**
  ```typescript
  // Option 1: Use textContent instead of innerHTML
  const tooltip = document.createElement('div');
  tooltip.textContent = `Id: ${metadata[id].id}`;

  // Option 2: Proper HTML escaping function
  const escapeHtml = (str: string) =>
    String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');

  content: `Id: ${escapeHtml(String(metadata[id].id))}`
  ```

---

### 🟠 HIGH (Fix Within Sprint)

#### 10. **Node.js 18 (API) End of Life**
- **File:** `api/Dockerfile:1`
- **Issue:** `FROM node:18-alpine` - EOL April 30, 2025 (past)
- **Risk:** No security patches, known CVEs
- **Fix:** `FROM node:22-alpine`

#### 11. **Node.js 20 (Frontend) Nearing EOL**
- **File:** `frontend/Dockerfile:1`
- **Issue:** `FROM node:20` - EOL April 2026 (3 months)
- **Risk:** Limited support window
- **Fix:** `FROM node:22-alpine`

#### 12. **Docker Images Use `latest` Tag**
- **File:** `docker-compose.yml:5, 16`
- **Issue:** `postgis/postgis:latest` and `adminer:latest`
- **Risk:** Non-reproducible builds, unexpected changes
- **Fix:**
  ```yaml
  db:
    image: 'postgis/postgis:16-3.4'  # Pin to specific versions
  adminer:
    image: 'adminer:4.8.1'
  ```

#### 13. **No Version Pinning in Python Dependencies**
- **File:** `database/requirements.txt`
- **Issue:** All packages unpinned (geopandas, pandas, pyarrow, etc.)
- **Risk:** Non-reproducible builds, breaking changes
- **Fix:** Generate pinned versions:
  ```bash
  # Using pixi (as user suggested):
  pixi init
  pixi add python=3.11 geopandas pandas pyarrow pyyaml sqlalchemy tqdm

  # OR traditional pip:
  pip freeze > requirements.txt
  ```
  Example pinned versions:
  ```
  geopandas==0.14.3
  pandas==2.2.0
  pyarrow==15.0.0
  pyyaml==6.0.1
  sqlalchemy==2.0.25
  tqdm==4.66.1
  ```

#### 14. **Missing Health Checks in Docker Compose**
- **File:** `docker-compose.yml` (all services)
- **Issue:** No health checks; containers may start before ready
- **Risk:** Race conditions, failed startups
- **Fix:**
  ```yaml
  db:
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${POSTGRES_USER}"]
      interval: 10s
      timeout: 5s
      retries: 5

  api:
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/health"]
      interval: 30s
      timeout: 10s
      retries: 3
    depends_on:
      db:
        condition: service_healthy

  frontend:
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:5173"]
      interval: 30s
      timeout: 10s
      retries: 3
  ```

#### 15. **No Restart Policies**
- **File:** `docker-compose.yml` (all services)
- **Issue:** Containers won't auto-restart on crash
- **Fix:** Add to each service:
  ```yaml
  restart: unless-stopped
  ```

#### 16. **Missing `.env.example` Template**
- **File:** Root directory
- **Issue:** No template for required environment variables
- **Fix:** Create `.env.example`:
  ```
  POSTGRES_USER=your_username
  POSTGRES_PASSWORD=your_secure_password_here
  POSTGRES_DB=oysters_db

  # API Configuration
  NODE_ENV=development
  ALLOWED_ORIGINS=http://localhost:5173

  # Optional: API Authentication
  JWT_SECRET=your_jwt_secret_here
  API_KEY=your_api_key_here
  ```

#### 17. **Weak Default Credentials**
- **File:** `.env:1-2`
- **Issue:** `user:password` is trivially guessable
- **Fix:** Generate strong credentials:
  ```bash
  # Using openssl
  openssl rand -base64 32  # For password
  ```

#### 18. **TypeScript `any` Types Defeat Safety**
- **File:** `frontend/src/App.tsx:18-19`
- **Issue:** `useState<any>(null)` for feature and metadata
- **Risk:** Runtime errors, type mismatches
- **Fix:** Define proper interfaces:
  ```typescript
  interface Metadata {
    id: number;
    lon: number;
    lat: number;
    depth: string;
    disease: number;
    rest: number;
    aqc: number;
    pop: number;
  }

  interface FeatureCollection {
    type: 'FeatureCollection';
    features: Array<{
      type: 'Feature';
      properties: { id: number };
      geometry: any;  // GeoJSON geometry type
    }>;
  }

  const [feature, setFeature] = useState<FeatureCollection | null>(null);
  const [metadata, setMetadata] = useState<Record<number, Metadata> | null>(null);
  ```

#### 19. **Performance: No Callback Memoization**
- **File:** `frontend/src/App.tsx:121-195`
- **Issue:** Layer callbacks recreated on every render
- **Risk:** Unnecessary DeckGL re-renders, poor performance
- **Fix:** Wrap in `useCallback`:
  ```typescript
  const getFillColor = useCallback((d: any) => {
    const weight = connectivity[d.properties.id];
    if (weight === undefined) return [200, 200, 200, 50];
    return [0, 255 * weight, 0, 180];
  }, [connectivity]);

  const getLineColor = useCallback((d: any) => {
    // ... line color logic
  }, [isAQCHighlighted, isRestHighlighted, isDiseaseHighlighted, metadata, clickIds]);
  ```

#### 20. **Performance: Heavy Metadata Lookups in Render**
- **File:** `frontend/src/App.tsx:134-158`
- **Issue:** `getLineColor` does metadata lookup for every feature on every frame
- **Risk:** Sluggish UI with large datasets
- **Fix:** Pre-compute highlighted IDs:
  ```typescript
  const highlightedIds = useMemo(() => {
    if (!metadata) return new Set<number>();
    const ids = new Set<number>();
    Object.entries(metadata).forEach(([id, data]) => {
      if (isAQCHighlighted && data.aqc > 0) ids.add(Number(id));
      if (isRestHighlighted && data.rest > 0) ids.add(Number(id));
      if (isDiseaseHighlighted && data.disease > 0) ids.add(Number(id));
    });
    return ids;
  }, [metadata, isAQCHighlighted, isRestHighlighted, isDiseaseHighlighted]);

  const getLineColor = useCallback((d: any) => {
    const id = d.properties.id;
    if (clickIds.includes(id)) return [255, 0, 0, 255];
    if (highlightedIds.has(id)) {
      // Determine color based on type
    }
    return [128, 128, 128, 100];
  }, [clickIds, highlightedIds]);
  ```

#### 21. **Frontend Dockerfile Runs Dev Server in Production**
- **File:** `frontend/Dockerfile:10-11`
- **Issue:** `npm run dev --host` in production container
- **Risk:** Slow, insecure, no optimizations
- **Fix:** Use multi-stage build with production server:
  ```dockerfile
  # Build stage
  FROM node:22-alpine AS builder
  WORKDIR /app
  COPY package*.json ./
  RUN npm ci
  COPY . .
  RUN npm run build

  # Production stage
  FROM nginx:alpine
  COPY --from=builder /app/dist /usr/share/nginx/html
  COPY nginx.conf /etc/nginx/conf.d/default.conf
  EXPOSE 80
  CMD ["nginx", "-g", "daemon off;"]
  ```

---

### 🟡 MEDIUM (Address in Next Sprint)

#### 22. **Silent Error Handling**
- **File:** `frontend/src/App.tsx:42, 52, 86`
- **Issue:** Errors only logged to console with `.catch(console.error)`
- **Risk:** Users unaware of failures, app in broken state
- **Fix:** Show user-friendly error messages:
  ```typescript
  const [error, setError] = useState<string | null>(null);

  fetch('/api/feature')
    .then(res => {
      if (!res.ok) throw new Error(`Failed to load map data: ${res.statusText}`);
      return res.json();
    })
    .then(data => setFeature(data))
    .catch(err => {
      console.error(err);
      setError('Failed to load map data. Please refresh the page.');
    });

  // In JSX:
  {error && <div className="error-banner">{error}</div>}
  ```

#### 23. **No Loading States**
- **File:** `frontend/src/App.tsx`
- **Issue:** No indicators while fetching initial data
- **Risk:** Users confused by blank screen
- **Fix:**
  ```typescript
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch('/api/feature').then(r => r.json()),
      fetch('/api/metadata').then(r => r.json())
    ])
    .then(([featureData, metaData]) => {
      setFeature(featureData);
      setMetadata(metaData);
      setLoading(false);
    });
  }, []);

  if (loading) return <div>Loading map data...</div>;
  ```

#### 24. **Accessibility: Missing ARIA Labels**
- **File:** `frontend/src/ControlPanel.tsx:62-103`
- **Issue:** Checkboxes lack proper ARIA labels
- **Risk:** Screen readers can't properly announce controls
- **Fix:**
  ```tsx
  <input
    type="checkbox"
    id="aqc-highlight"
    checked={isAQCHighlighted}
    onChange={(e) => setAQC(e.target.checked)}
    aria-label="Highlight aquaculture sites"
  />
  <label htmlFor="aqc-highlight">aquacultures</label>
  ```

#### 25. **Accessibility: Color-Only Highlighting**
- **File:** `frontend/src/App.tsx:124-158`
- **Issue:** Relies solely on color for distinguishing features
- **Risk:** Not colorblind-friendly
- **Fix:** Add patterns or borders:
  ```typescript
  // Add line width differentiation
  getLineWidth: (d: any) => {
    if (clickIds.includes(d.properties.id)) return 4;
    if (highlightedIds.has(d.properties.id)) return 3;
    return 1;
  }
  ```

#### 26. **Logic Error: Loose Equality Check**
- **File:** `frontend/src/App.tsx:186`
- **Issue:** `indexOf(...) == -1` uses loose equality
- **Risk:** Type coercion bugs
- **Fix:** `indexOf(...) === -1`

#### 27. **Logic Error: Unused Variable**
- **File:** `api/server.js:50`
- **Issue:** `const op = req.query.op || "mean";` assigned but never used
- **Risk:** Confusing code, incomplete feature
- **Fix:** Either implement aggregation operator or remove variable

#### 28. **Logic Error: Optional Prop Called Directly**
- **File:** `frontend/src/ControlPanel.tsx:107`
- **Issue:** `clearHex` is optional but called without null check
- **Risk:** Runtime error if prop not provided
- **Fix:**
  ```tsx
  <button
    type="button"
    onClick={() => clearHex?.({ depths: selectedDepths, times: selectedTimes })}
  >
    Clear Selection
  </button>
  ```

#### 29. **Database Connection Has No Health Check**
- **File:** `api/server.js:151-153`
- **Issue:** Server starts listening without verifying database connectivity
- **Risk:** Server appears healthy but can't serve requests
- **Fix:**
  ```javascript
  // Add health check endpoint
  app.get('/health', async (req, res) => {
    try {
      await pool.query('SELECT 1');
      res.status(200).json({ status: 'healthy', database: 'connected' });
    } catch (error) {
      res.status(503).json({ status: 'unhealthy', database: 'disconnected' });
    }
  });

  // Verify database before starting server
  async function startServer() {
    try {
      await pool.query('SELECT 1');
      console.log('Database connection verified');
      app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
    } catch (error) {
      console.error('Failed to connect to database:', error);
      process.exit(1);
    }
  }
  startServer();
  ```

#### 30. **API Leaks Internal Information in Errors**
- **File:** `api/server.js:65, 102, 128`
- **Issue:** Error messages include query parameters
- **Risk:** Information disclosure about database schema
- **Fix:**
  ```javascript
  // Instead of:
  res.status(404).json({ error: `No entry for parameters: ${JSON.stringify(params)}` });

  // Use:
  res.status(404).json({ error: 'No data found for the specified parameters' });
  console.error(`404 - No data for:`, params);  // Log internally only
  ```

#### 31. **Fragmented State Management**
- **File:** `frontend/src/App.tsx:21-26`
- **Issue:** Seven separate state variables for related data
- **Risk:** State inconsistencies, difficult updates
- **Fix:** Consolidate into reducer or single state object:
  ```typescript
  interface AppState {
    highlights: {
      aqc: boolean;
      rest: boolean;
      disease: boolean;
    };
    selection: {
      hoveredId: number | null;
      clickedIds: number[];
    };
    tooltip: { x: number; y: number; content: string } | null;
  }

  const [state, setState] = useState<AppState>({
    highlights: { aqc: false, rest: false, disease: false },
    selection: { hoveredId: null, clickedIds: [] },
    tooltip: null
  });
  ```

#### 32. **Vite Dev Server Exposed to All Interfaces**
- **File:** `frontend/vite.config.ts:8`
- **Issue:** `host: '0.0.0.0'` exposes to all network interfaces
- **Risk:** In production, external access to dev server
- **Fix:**
  ```typescript
  server: {
    host: process.env.NODE_ENV === 'production' ? '127.0.0.1' : '0.0.0.0',
    port: 5173,
  }
  ```

#### 33. **No Request Timeout Configuration**
- **File:** `frontend/src/App.tsx:30-92`
- **Issue:** Fetch requests can hang indefinitely
- **Risk:** Poor UX, hung requests
- **Fix:**
  ```typescript
  const fetchWithTimeout = (url: string, timeout = 10000) => {
    return Promise.race([
      fetch(url),
      new Promise<Response>((_, reject) =>
        setTimeout(() => reject(new Error('Request timeout')), timeout)
      )
    ]);
  };
  ```

#### 34. **JSON.parse Without Try-Catch**
- **File:** `api/server.js:133`
- **Issue:** `JSON.parse(row.geometry)` can throw if invalid
- **Risk:** Server crash on malformed data
- **Fix:**
  ```javascript
  features: results.rows.map(row => {
    let geometry;
    try {
      geometry = JSON.parse(row.geometry);
    } catch (e) {
      console.error('Invalid geometry for row:', row.id, e);
      geometry = null;
    }
    return {
      type: 'Feature',
      properties: { id: row.id },
      geometry
    };
  }).filter(f => f.geometry !== null)
  ```

#### 35. **TypeScript Config: `skipLibCheck: true`**
- **File:** `frontend/tsconfig.app.json:8`
- **Issue:** Skips type checking for libraries
- **Risk:** Missing type errors from dependencies
- **Fix:** Remove or set to `false` (may require fixing type errors)

#### 36. **CORS Package Outdated**
- **File:** `api/package.json`
- **Issue:** `cors@2.8.5` from 2017, unmaintained
- **Risk:** Missing modern security features
- **Fix:** While still functional, monitor for replacements or implement CORS manually:
  ```javascript
  // Custom CORS middleware (more control)
  app.use((req, res, next) => {
    const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || [];
    const origin = req.headers.origin;
    if (allowedOrigins.includes(origin)) {
      res.header('Access-Control-Allow-Origin', origin);
      res.header('Access-Control-Allow-Credentials', 'true');
    }
    res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    if (req.method === 'OPTIONS') {
      return res.sendStatus(200);
    }
    next();
  });
  ```

---

## Implementation Roadmap

### Phase 1: Critical Security Fixes (1-2 days)
**Priority: Do immediately before any production deployment**

1. ✅ Add `.env` to `.gitignore`
2. ✅ Remove `.env` from git history
3. ✅ Create `.env.example` with secure placeholders
4. ✅ Generate strong credentials
5. ✅ Remove database port exposure from `docker-compose.yml`
6. ✅ Restrict Adminer to localhost only
7. ✅ Implement CORS origin whitelist
8. ✅ Add rate limiting to API
9. ✅ Add input validation to API endpoints
10. ✅ Add helmet security headers
11. ✅ Add error handling to database scripts
12. ✅ Fix XSS vulnerability in tooltip

**Testing:**
```bash
# Verify database not exposed
nmap -p 5432 localhost  # Should fail

# Test rate limiting
for i in {1..150}; do curl http://localhost:3000/api/feature; done
# Should see 429 Too Many Requests after 100 requests

# Test CORS
curl -H "Origin: http://malicious.com" http://localhost:3000/api/feature
# Should be blocked

# Test input validation
curl "http://localhost:3000/api/connectivity?depth=INVALID&time_range=INVALID&start_id=abc"
# Should return 400 Bad Request
```

### Phase 2: Dependency Updates (1 day)
**Priority: Do in next sprint**

1. ✅ Update Node.js 18 → 22 in API Dockerfile
2. ✅ Update Node.js 20 → 22 in frontend Dockerfile
3. ✅ Pin Docker image versions (postgis, adminer)
4. ✅ Pin Python dependencies using pixi:
   ```bash
   cd database
   pixi init
   pixi add python=3.11 geopandas pandas pyarrow pyyaml sqlalchemy tqdm
   ```
5. ✅ Add restart policies to docker-compose.yml
6. ✅ Add health checks to docker-compose.yml
7. ✅ Test all services with new versions

**Testing:**
```bash
# Verify Node versions
docker-compose build
docker-compose run api node --version  # Should show v22.x
docker-compose run frontend node --version  # Should show v22.x

# Test health checks
docker-compose up -d
docker-compose ps  # All services should show "healthy"

# Test restart policies
docker stop 2024_hex_dashboard-api-1
sleep 5
docker ps  # API should be restarting
```

### Phase 3: Performance & TypeScript Fixes (2-3 days)
**Priority: Do in next sprint**

1. ✅ Add proper TypeScript interfaces
2. ✅ Memoize frontend callbacks with `useCallback`
3. ✅ Pre-compute highlighted IDs with `useMemo`
4. ✅ Consolidate state management
5. ✅ Add loading states
6. ✅ Add user-friendly error messages
7. ✅ Fix multi-stage Docker build for frontend
8. ✅ Add health check endpoint to API

**Testing:**
```bash
# Performance testing
# Open Chrome DevTools → Performance
# Record while interacting with map
# Check for reduced render times after memoization

# Frontend build test
cd frontend
npm run build
# Verify dist/ folder created with optimized assets
```

### Phase 4: Accessibility & Polish (1-2 days)
**Priority: Nice to have**

1. ✅ Add ARIA labels to all interactive elements
2. ✅ Add keyboard navigation support
3. ✅ Add patterns/borders for colorblind users
4. ✅ Fix minor logic errors (loose equality, unused vars)
5. ✅ Add request timeouts
6. ✅ Improve error messages

**Testing:**
```bash
# Accessibility audit
# Chrome DevTools → Lighthouse → Accessibility
# Target score: 90+

# Keyboard navigation test
# Tab through all controls
# Verify focus indicators visible
# Test Enter/Space for activation
```

---

## Verification Checklist

After implementing fixes, verify:

### Security Verification
- [ ] Database port 5432 not accessible externally
- [ ] Adminer only accessible from localhost
- [ ] `.env` file not in git
- [ ] Strong credentials in use (not `user:password`)
- [ ] API returns 401 for unauthenticated requests
- [ ] CORS blocks unauthorized origins
- [ ] Rate limiting works (429 after threshold)
- [ ] Input validation rejects invalid data
- [ ] Security headers present in responses:
  ```bash
  curl -I http://localhost:3000/api/feature | grep -E '(X-Frame-Options|X-Content-Type-Options|Strict-Transport-Security)'
  ```

### Dependency Verification
- [ ] Node.js 22 in both Dockerfiles
- [ ] PostgreSQL image pinned to version
- [ ] Python dependencies pinned
- [ ] All services have health checks
- [ ] All services have restart policies
- [ ] Run `npm audit` and `pip audit` (or `pixi list`)

### Functionality Verification
- [ ] Map loads without errors
- [ ] Clicking hexagons shows connectivity
- [ ] Filters work (depth, time range)
- [ ] Highlights work (AQC, rest, disease)
- [ ] Tooltip shows correct data
- [ ] Clear selection works
- [ ] No console errors
- [ ] Loading states visible during fetch
- [ ] Error messages shown on failure

### Performance Verification
- [ ] Initial render < 2 seconds
- [ ] Interaction response < 100ms
- [ ] No unnecessary re-renders (check React DevTools Profiler)
- [ ] Large datasets (1000+ hexagons) still responsive

---

## Dependency Management with Pixi

Since npm may not be available, use pixi for local development/testing:

### Setup Pixi Environment
```bash
# Install pixi (if not installed)
curl -fsSL https://pixi.sh/install.sh | bash

# Initialize project
cd /Users/wrath/src/github.com/geomar-od-lagrange/2024_hex_dashboard
pixi init

# Add Python dependencies for database scripts
cd database
pixi add python=3.11 geopandas pandas pyarrow pyyaml sqlalchemy tqdm

# Add Node.js for frontend/API (if needed locally)
cd ../frontend
pixi add nodejs=22

cd ../api
pixi add nodejs=22
```

### Run Commands with Pixi
```bash
# Run database scripts
pixi run python metadata_to_db.py

# Check versions
pixi run python --version
pixi run node --version

# Run linting/testing
pixi run npm run lint
pixi run npm test
```

---

## Files to Modify

### Critical Changes
- `docker-compose.yml` - Remove port exposures, add health checks
- `.gitignore` - Add `.env` and other secrets
- `.env` - Regenerate with strong credentials (never commit)
- `.env.example` - Create with placeholders
- `api/server.js` - Add auth, validation, rate limiting, helmet
- `api/package.json` - Add helmet, express-rate-limit, express-validator
- `database/*.py` - Add error handling
- `frontend/src/App.tsx` - Fix XSS in tooltip

### High Priority Changes
- `api/Dockerfile` - Update Node 18 → 22
- `frontend/Dockerfile` - Update Node 20 → 22, add multi-stage build
- `database/requirements.txt` - Pin all versions
- `frontend/src/App.tsx` - Add TypeScript types, memoization
- `frontend/src/ControlPanel.tsx` - Fix prop usage

### Medium Priority Changes
- `frontend/src/App.tsx` - Error handling, loading states
- `frontend/src/ControlPanel.tsx` - ARIA labels
- `frontend/tsconfig.app.json` - Remove skipLibCheck
- `api/server.js` - Add health endpoint, fix error messages

---

## Estimated Effort

| Phase | Effort | Risk |
|-------|--------|------|
| Phase 1: Critical Security | 1-2 days | High - Breaking changes |
| Phase 2: Dependencies | 1 day | Medium - May need testing |
| Phase 3: Performance | 2-3 days | Low - Incremental improvements |
| Phase 4: Accessibility | 1-2 days | Low - Additive changes |
| **Total** | **5-8 days** | |

---

## Notes

- All changes should be tested in development before production
- Consider creating a staging environment for validation
- Authentication implementation (Phase 1, item 10) needs architectural decision:
  - Option A: API keys (simplest)
  - Option B: JWT tokens (more scalable)
  - Option C: OAuth (most secure, complex)
- Frontend production build needs nginx configuration file (not in repo currently)
- Consider adding monitoring/logging (e.g., Winston, Sentry) in future

---

## Questions for Review

1. **Authentication Strategy**: Which approach do you prefer for API authentication?
   - API keys (simple, static)
   - JWT tokens (session-based)
   - OAuth (external identity provider)
   - Public API (no auth, rely on rate limiting only)

2. **Deployment Target**: Where will this be deployed?
   - Local development only → Keep current setup with fixes
   - Internal network → Auth + CORS relaxed
   - Public internet → Full security hardening required

3. **Data Sensitivity**: How sensitive is the oyster/pathogen data?
   - Public data → Authentication optional
   - Research data → Authentication required
   - Protected/confidential → Add encryption, audit logging

4. **Python Environment**: Prefer pixi or traditional virtualenv/pip?
   - Pixi → Modern, cross-platform
   - Virtualenv → Traditional, well-known

5. **Breaking Changes**: OK to require .env regeneration and restart for all users?
   - Yes → Proceed with all critical fixes
   - No → Phase changes over multiple releases
