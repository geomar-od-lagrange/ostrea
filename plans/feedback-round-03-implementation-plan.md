# Feedback Round 03 - Implementation Plan

**Previous rounds:**
- **Round 00**: `feedback-round-00-initial-review.md` - Initial comprehensive review (36 issues)
- **Round 01**: `feedback-round-01-user-feedback.md` - Your feedback on all issues
- **Round 02**: `feedback-round-02-clarifications.md` - Clarifications and decisions
- **Round 03**: This document - Concrete implementation steps

**Decisions finalized:**
- Multi-stage build + nginx NOW (solves CORS)
- Add DB health check (helps k8s migration)
- Nginx on port 5173 (Vite default): `127.0.0.1:5173:80`

---

## Implementation Order

### Phase 1: Infrastructure & Docker (Items 1-8)
**Goal:** Update base images, add nginx, setup dependencies

1. Remove Adminer service
2. Pin Docker images
3. Setup pixi environment
4. Update Node.js versions in Dockerfiles
5. Create .env.example
6. Add DB health checks
7. Create nginx configuration
8. Multi-stage frontend build

### Phase 2: Code Quality & Security (Items 9-16)
**Goal:** Fix vulnerabilities, improve type safety

9. Fix XSS in tooltip
10. Add API input validation
11. Add TypeScript interfaces
12. Remove skipLibCheck
13. Auto-fix loose equality
14. Fix optional prop chaining
15. Add TODO comments

### Phase 3: Testing & Verification (Items 17-20)
**Goal:** Ensure everything works

17. Build all images
18. Start services
19. Test API endpoints
20. Verify no errors

---

## Detailed Implementation Steps

### 1. Remove Adminer from docker-compose.yml

**File:** `docker-compose.yml`

**Change:** Remove entire adminer service section (lines 15-22)

**Commit:** "Remove Adminer service from docker-compose"

---

### 2. Pin Docker Images

**File:** `docker-compose.yml`

**Changes:**
```yaml
# Before:
db:
  image: 'postgis/postgis:latest'

# After:
db:
  image: 'postgis/postgis:16-3.4'
```

Remove obsolete `version:` field at top of file.

**Commit:** "Pin PostgreSQL to version 16-3.4 and remove version field"

---

### 3. Setup Pixi Environment

**Files to create:**
- `database/pixi.toml`
- `database/pixi.lock` (auto-generated)
- `database/requirements.txt` (generated from pixi)

**Commands:**
```bash
cd database
pixi init
pixi add python=3.11 geopandas pandas pyarrow pyyaml sqlalchemy tqdm
pixi run pip freeze > requirements.txt
```

**Commit:** "Add pixi configuration and pinned requirements.txt"

---

### 4. Update Dockerfiles to Node 22

**File:** `api/Dockerfile`
```dockerfile
# Before:
FROM node:18-alpine

# After:
FROM node:22-alpine
```

**File:** `frontend/Dockerfile` - Replace with multi-stage build (see step 8)

**Commit:** "Update API Dockerfile to Node 22"

---

### 5. Create .env.example

**File:** `.env.example` (new file in root)

```bash
# Database Configuration (for local development only)
# NEVER use these credentials in production!
POSTGRES_USER=your_username_here
POSTGRES_PASSWORD=your_secure_password_here
POSTGRES_DB=oysters_db

# Production Deployment Notes:
# 1. Generate strong password: openssl rand -base64 32
# 2. Store credentials in secrets manager (k8s secrets, vault, etc.)
# 3. Never commit .env file to version control
# 4. Database should only be accessible from internal network
# 5. API requires read-only database access

# API Configuration (optional)
# NODE_ENV=production
# ALLOWED_ORIGINS=https://yourdomain.com

# Nginx Configuration
# NGINX_PORT=5173
```

**Also update `.gitignore`:**
```
# Add if not present:
.env
.env.local
.env.*.local
```

**Commit:** "Add .env.example and update .gitignore"

---

### 6. Add DB Health Check

**File:** `docker-compose.yml`

**Changes:**
```yaml
db:
  image: 'postgis/postgis:16-3.4'
  env_file:
    - .env
  volumes:
    - ./db-data/:/var/lib/postgresql/data/
  networks:
    - app-network
  healthcheck:
    test: ["CMD-SHELL", "pg_isready -U $${POSTGRES_USER}"]
    interval: 10s
    timeout: 5s
    retries: 5

api:
  build: ./api
  env_file:
    - .env
  networks:
    - app-network
  depends_on:
    db:
      condition: service_healthy
```

**Commit:** "Add database health check and startup dependencies"

---

### 7. Create nginx.conf

**File:** `nginx.conf` (new file in root)

```nginx
events {
    worker_connections 1024;
}

http {
    upstream api {
        server api:3000;
    }

    upstream frontend {
        server frontend:80;
    }

    server {
        listen 80;

        # API proxy
        location /api/ {
            proxy_pass http://api/;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }

        # Frontend
        location / {
            proxy_pass http://frontend/;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
        }
    }
}
```

**Commit:** "Add nginx reverse proxy configuration"

---

### 8. Multi-stage Frontend Build + Nginx Service

**File:** `frontend/Dockerfile` (replace entire file)

```dockerfile
# Build stage
FROM node:22-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY . .

# Build for production
RUN npm run build

# Production stage
FROM nginx:alpine

# Copy built assets from builder
COPY --from=builder /app/dist /usr/share/nginx/html

# Expose port 80
EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
```

**File:** `docker-compose.yml` - Add nginx service

```yaml
services:
  # ... existing services ...

  frontend:
    build: ./frontend
    networks:
      - app-network
    # No ports exposed - accessed via nginx

  nginx:
    image: nginx:alpine
    ports:
      - "127.0.0.1:5173:80"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf:ro
    depends_on:
      - api
      - frontend
    networks:
      - app-network
```

**Commit:** "Add multi-stage frontend build and nginx service"

---

### 9. Fix XSS in Tooltip

**File:** `frontend/src/App.tsx`

**Find (around line 169-176):**
```typescript
content: `Id: ${encodeURIComponent(metadata[info.object.properties.id].id)}
  lon: ${encodeURIComponent(metadata[info.object.properties.id].lon)}
  lat: ${encodeURIComponent(metadata[info.object.properties.id].lat)}
  depth: ${encodeURIComponent(metadata[info.object.properties.id].depth)}
  disease: ${encodeURIComponent(metadata[info.object.properties.id].disease)}
  rest: ${encodeURIComponent(metadata[info.object.properties.id].rest)}
  aqc: ${encodeURIComponent(metadata[info.object.properties.id].aqc)}
  pop: ${encodeURIComponent(metadata[info.object.properties.id].pop)}`
```

**Replace with:**
```typescript
// Helper function to escape HTML
const escapeHtml = (str: string | number) =>
  String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

const data = metadata[info.object.properties.id];
content: `Id: ${escapeHtml(data.id)}
  lon: ${escapeHtml(data.lon)}
  lat: ${escapeHtml(data.lat)}
  depth: ${escapeHtml(data.depth)}
  disease: ${escapeHtml(data.disease)}
  rest: ${escapeHtml(data.rest)}
  aqc: ${escapeHtml(data.aqc)}
  pop: ${escapeHtml(data.pop)}`
```

**Commit:** "Fix XSS vulnerability in tooltip with proper HTML escaping"

---

### 10. Add API Input Validation

**File:** `api/server.js`

**Add validation function at top (after imports):**
```javascript
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
```

**Update /connectivity endpoint (around line 42-50):**
```javascript
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
    // ... rest of existing code
```

**Commit:** "Add input validation to API endpoints"

---

### 11. Add TypeScript Interfaces

**File:** `frontend/src/App.tsx`

**Add at top of file (after imports):**
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

interface FeatureProperties {
  id: number;
}

interface Feature {
  type: 'Feature';
  properties: FeatureProperties;
  geometry: any; // GeoJSON geometry
}

interface FeatureCollection {
  type: 'FeatureCollection';
  features: Feature[];
}
```

**Update state declarations (around line 18-19):**
```typescript
// Before:
const [feature, setFeature] = useState<any>(null);
const [metadata, setMetadata] = useState<any>(null);

// After:
const [feature, setFeature] = useState<FeatureCollection | null>(null);
const [metadata, setMetadata] = useState<Record<number, Metadata> | null>(null);
```

**Commit:** "Add TypeScript interfaces and remove any types"

---

### 12. Remove skipLibCheck

**File:** `frontend/tsconfig.app.json`

**Change (around line 8):**
```json
{
  "compilerOptions": {
    // ... other options ...
    "skipLibCheck": false,
    // ... other options ...
  }
}
```

**Commit:** "Enable library type checking in TypeScript"

---

### 13. Auto-fix Loose Equality

**File:** `frontend/src/App.tsx`

**Find (around line 186):**
```typescript
if (clickIds.indexOf(info.object.properties.id) == -1) {
```

**Replace:**
```typescript
if (clickIds.indexOf(info.object.properties.id) === -1) {
```

**Commit:** "Fix loose equality checks to use strict equality"

---

### 14. Fix Optional Prop Chaining

**File:** `frontend/src/ControlPanel.tsx`

**Find (around line 107):**
```typescript
<button type="button" onClick={clearHex} className="clear-button">
```

**Replace:**
```typescript
<button
  type="button"
  onClick={() => clearHex?.({ depths: selectedDepths, times: selectedTimes })}
  className="clear-button"
>
```

**Commit:** "Fix optional prop call with proper chaining"

---

### 15. Add TODO Comments

**File:** `api/server.js` (around line 50)
```javascript
// TODO: Implement aggregation operator (mean, max, min)
// const op = req.query.op || "mean";
```

**File:** `frontend/src/App.tsx` (around line 21-26)
```typescript
// TODO: Consolidate state management into single reducer or state object
// Current fragmented state should be refactored for better maintainability
const [isAQCHighlighted, setAQC] = useState<boolean>(false);
// ... other state variables
```

**File:** `frontend/src/App.tsx` (around line 76)
```typescript
// TODO: Add request timeout (10s) for better UX
const abortController = new AbortController();
```

**Commit:** "Add TODO comments for deferred improvements"

---

## Testing Procedure

### Build Test
```bash
docker compose build
# Should complete without errors
# Frontend build should show successful Vite build
```

### Startup Test
```bash
docker compose up -d
docker compose ps
# Should show all services healthy
```

### API Tests
```bash
# Test metadata endpoint
curl http://localhost:5173/api/metadata | jq 'length'
# Should return count of metadata entries

# Test feature endpoint
curl http://localhost:5173/api/feature | jq '.type'
# Should return "FeatureCollection"

# Test connectivity endpoint
curl "http://localhost:5173/api/connectivity?depth=05m&time_range=00d-07d&start_id=100" | jq 'length'
# Should return connectivity data

# Test validation (should fail)
curl "http://localhost:5173/api/connectivity?depth=INVALID&time_range=00d-07d&start_id=100"
# Should return 400 error with validation message
```

### Frontend Test
```bash
curl http://localhost:5173/ | grep -q "<!DOCTYPE html>"
# Should return HTML

curl http://localhost:5173/ | grep -q "Vite"
# Should NOT contain Vite dev references (production build)
```

### Log Check
```bash
docker compose logs | grep -i error
# Should show no critical errors
```

---

## Manual Verification Checklist

After automated tests pass, user should verify:

- [ ] Open http://localhost:5173/ in browser
- [ ] Map loads without errors (check browser console)
- [ ] Can click hexagons to select them
- [ ] Connectivity visualization appears
- [ ] Filters work (depth, time range checkboxes)
- [ ] Highlight toggles work (AQC, rest, disease)
- [ ] Tooltip shows data on hover
- [ ] Clear selection button works
- [ ] No CORS errors in console

---

## Rollback Plan

If anything breaks:
```bash
# Stop services
docker compose down

# Checkout previous state
git status
git diff
git checkout -- <problematic-file>

# Or full rollback
git reset --hard HEAD~N  # N = number of commits to undo
```

---

**Status:** Ready to execute
**Next:** Begin Phase 1 implementation
