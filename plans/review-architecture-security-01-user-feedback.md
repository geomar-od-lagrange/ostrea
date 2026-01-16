# Security & Dependency Review - FEEDBACK FORM

**Instructions:** For each issue below, add your feedback/decisions in the `YOUR FEEDBACK:` section.
- Format doesn't matter - brief notes are fine
- Options: `YES` / `NO` / `SKIP` / `LATER` / `MODIFY: <your notes>`
- Priority changes: `CRITICAL → HIGH` or `HIGH → SKIP`, etc.

---

## 🔴 CRITICAL ISSUES

### Issue #1: Exposed Database & Admin Interfaces
**File:** `docker-compose.yml:6-7, 17-18`
**Issue:** PostgreSQL (5432) and Adminer (8080) exposed to host network
**Proposed Fix:** Remove port exposures; restrict Adminer to localhost only

**YOUR FEEDBACK:**

- we'll remove adminer entirely
- need to separate out postgre write permissions which will only run at startup and could be refac to run locally on db host
- app will only need read permissions sql access
- ports will depend on details of deployment

---

### Issue #2: Hardcoded Credentials in Version Control
**File:** `.env:1-3`
**Issue:** Default credentials `user:password` committed to git
**Proposed Fix:** Add `.env` to `.gitignore`, create `.env.example`, remove from git history, generate strong credentials

**YOUR FEEDBACK:**

- credentials are for local testing and never to be used in prod
- plan for proper credential handling as we work towards actual deployment. feel free to include specific suggestions and best practices already

---

### Issue #3: No Authentication on API Endpoints
**File:** `api/server.js:42, 91, 115`
**Issue:** All endpoints publicly accessible without authentication
**Proposed Fix:** Implement authentication middleware (JWT/API keys/OAuth)
**Question:** Which auth strategy do you prefer? (API keys / JWT / OAuth / none - public API)

**YOUR FEEDBACK:**

- auth not necessary for r/o access
- r/w access will be run locally at startup (see above)


---

### Issue #4: CORS Allows All Origins
**File:** `api/server.js:7`
**Issue:** `app.use(cors())` allows requests from ANY origin
**Proposed Fix:** Whitelist specific origins via environment variable

**YOUR FEEDBACK:**

- was introduced so frontend could access database but likely points to architectural flaw. zoom out and fix architecture first

---

### Issue #5: No Rate Limiting
**File:** `api/server.js` (all endpoints)
**Issue:** Unlimited requests to database-heavy endpoints
**Proposed Fix:** Install `express-rate-limit` (100 req/15min per IP)

**YOUR FEEDBACK:**

- we don't care about traffic, normal ddos prevention will happen on web-facing infrastructure, 
- implicit rate limiting will come from VM performance boundaries
- so --> ignore #5

---

### Issue #6: No Input Validation
**File:** `api/server.js:44-50, 133`
**Issue:** Query parameters accepted without validation
**Proposed Fix:** Install `express-validator`, validate depth/time_range/start_id

**YOUR FEEDBACK:**

- this is important at least if we allow r/w
- are we in trouble in r/o case as well?

---

### Issue #7: Missing Security Headers
**File:** `api/server.js`
**Issue:** No security headers (X-Frame-Options, CSP, HSTS, etc.)
**Proposed Fix:** Install and configure `helmet` package

**YOUR FEEDBACK:**

- explain separately
- note we don't handle any sensitive data we just use the db so a user will see minimal traffic (app has many x ~8000 different states of the visualisation, typical user session will cover tiny but unforeseeable fraction)

---

### Issue #8: Database Scripts Have No Error Handling
**Files:** `database/*.py` (all three scripts)
**Issue:** No try/except blocks; failures leave database in corrupt state
**Proposed Fix:** Wrap all operations in try/except with proper error messages

**YOUR FEEDBACK:**

- no need to be failsafe, human will ensure system comes up and actively debug
- we WANT errors to raise immediately

---

### Issue #9: XSS Vulnerability via Tooltip
**File:** `frontend/src/App.tsx:169-176`
**Issue:** Misuse of `encodeURIComponent()` for display text (should use proper HTML escaping)
**Proposed Fix:** Use HTML escape function or set as textContent

**YOUR FEEDBACK:**

- explain
- probably needs fixing

---

## 🟠 HIGH PRIORITY ISSUES

### Issue #10: Node.js 18 (API) End of Life
**File:** `api/Dockerfile:1`
**Issue:** Node 18 EOL April 30, 2025 (already past)
**Proposed Fix:** Update to `FROM node:22-alpine`

**YOUR FEEDBACK:**


---

### Issue #11: Node.js 20 (Frontend) Nearing EOL
**File:** `frontend/Dockerfile:1`
**Issue:** Node 20 EOL April 2026 (3 months away)
**Proposed Fix:** Update to `FROM node:22-alpine`

**YOUR FEEDBACK:**

- agree

---

### Issue #12: Docker Images Use `latest` Tag
**File:** `docker-compose.yml:5, 16`
**Issue:** `postgis/postgis:latest` and `adminer:latest` - non-reproducible builds
**Proposed Fix:** Pin to specific versions: `postgis/postgis:16-3.4`, `adminer:4.8.1`

**YOUR FEEDBACK:**

- agree (see note on adminer removal above)

---

### Issue #13: No Version Pinning in Python Dependencies
**File:** `database/requirements.txt`
**Issue:** All packages unpinned (geopandas, pandas, pyarrow, etc.)
**Proposed Fix:** Use pixi or pip freeze to pin versions

**YOUR FEEDBACK:**

- agree
- use pixi

---

### Issue #14: Missing Health Checks in Docker Compose
**File:** `docker-compose.yml` (all services)
**Issue:** Containers may start before ready; no health monitoring
**Proposed Fix:** Add healthcheck sections for db, api, frontend

**YOUR FEEDBACK:**

- elaborate
- let's at least have simple dependency checking so the app only comes up if the db is ready

---

### Issue #15: No Restart Policies
**File:** `docker-compose.yml` (all services)
**Issue:** Containers won't auto-restart on crash
**Proposed Fix:** Add `restart: unless-stopped` to each service

**YOUR FEEDBACK:**

- ignore for now, we'll move this away from docker compose for prod later anyway

---

### Issue #16: Missing `.env.example` Template
**File:** Root directory
**Issue:** No template showing required environment variables
**Proposed Fix:** Create `.env.example` with placeholders

**YOUR FEEDBACK:**

- agree

---

### Issue #17: Weak Default Credentials
**File:** `.env:1-2`
**Issue:** `user:password` is trivially guessable
**Proposed Fix:** Generate strong credentials with openssl

**YOUR FEEDBACK:**

- agree
- see above for comment about creds and auth

---

### Issue #18: TypeScript `any` Types Defeat Safety
**File:** `frontend/src/App.tsx:18-19`
**Issue:** `useState<any>(null)` for feature and metadata
**Proposed Fix:** Define proper TypeScript interfaces

**YOUR FEEDBACK:**

- agree

---

### Issue #19: Performance - No Callback Memoization
**File:** `frontend/src/App.tsx:121-195`
**Issue:** Layer callbacks recreated on every render
**Proposed Fix:** Wrap in `useCallback` with proper dependencies

**YOUR FEEDBACK:**

- agree, but let's investigate actual benefit (we're fine w/ O(100) millisecond latency which we currently achieve I think and we don't expect many users)

---

### Issue #20: Performance - Heavy Metadata Lookups in Render
**File:** `frontend/src/App.tsx:134-158`
**Issue:** `getLineColor` does metadata lookup for every feature on every frame
**Proposed Fix:** Pre-compute highlighted IDs with `useMemo`

**YOUR FEEDBACK:**

- agree

---

### Issue #21: Frontend Dockerfile Runs Dev Server in Production
**File:** `frontend/Dockerfile:10-11`
**Issue:** `npm run dev --host` in production container
**Proposed Fix:** Multi-stage build with nginx for production

**YOUR FEEDBACK:**

- agree, but elaborate, we don't want to over-engineer, this is a really simple app which won't evolve very far and which won't scale to large audiency

---

## 🟡 MEDIUM PRIORITY ISSUES

### Issue #22: Silent Error Handling
**File:** `frontend/src/App.tsx:42, 52, 86`
**Issue:** Errors only logged to console with `.catch(console.error)`
**Proposed Fix:** Show user-friendly error messages

**YOUR FEEDBACK:**

- no need? if fails, dev will debug and if fails, user won't be able to help themselves anyway

---

### Issue #23: No Loading States
**File:** `frontend/src/App.tsx`
**Issue:** No indicators while fetching initial data
**Proposed Fix:** Add loading state with "Loading map data..." message

**YOUR FEEDBACK:**

- takes fraction of second, ignore

---

### Issue #24: Accessibility - Missing ARIA Labels
**File:** `frontend/src/ControlPanel.tsx:62-103`
**Issue:** Checkboxes lack proper ARIA labels
**Proposed Fix:** Add `aria-label` attributes

**YOUR FEEDBACK:**

- elaborate (I tend to ignore, this is an MVP / DEMO)

---

### Issue #25: Accessibility - Color-Only Highlighting
**File:** `frontend/src/App.tsx:124-158`
**Issue:** Relies solely on color for distinguishing features (not colorblind-friendly)
**Proposed Fix:** Add line width differentiation

**YOUR FEEDBACK:**

- largely ignore
- but think about abstracting away color and other design aspects so we can separate concerns w/ a designer

---

### Issue #26: Logic Error - Loose Equality Check
**File:** `frontend/src/App.tsx:186`
**Issue:** `indexOf(...) == -1` uses loose equality
**Proposed Fix:** Change to `indexOf(...) === -1`

**YOUR FEEDBACK:**

- explain

---

### Issue #27: Logic Error - Unused Variable
**File:** `api/server.js:50`
**Issue:** `const op = req.query.op || "mean";` assigned but never used
**Proposed Fix:** Either implement aggregation operator or remove variable

**YOUR FEEDBACK:**

- let's find out what intention likely was, then decide if implement or discard

---

### Issue #28: Logic Error - Optional Prop Called Directly
**File:** `frontend/src/ControlPanel.tsx:107`
**Issue:** `clearHex` is optional but called without null check
**Proposed Fix:** Use optional chaining: `clearHex?.()`

**YOUR FEEDBACK:**

- explain once we get here

---

### Issue #29: Database Connection Has No Health Check
**File:** `api/server.js:151-153`
**Issue:** Server starts listening without verifying database connectivity
**Proposed Fix:** Add `/health` endpoint and verify DB before starting server

**YOUR FEEDBACK:**

- via docker compose? I'm fine with the feed back that there's not data on the map - means db gone or not yet ready. As startup takes fraction of a second, case will be clear anyway

---

### Issue #30: API Leaks Internal Information in Errors
**File:** `api/server.js:65, 102, 128`
**Issue:** Error messages include query parameters (info disclosure)
**Proposed Fix:** Generic error messages to user, detailed logs server-side only

**YOUR FEEDBACK:**

- no sensitive info. all data is public anyway, all field names etc. are nonsensitive
- ignore? (unless you make a good case for thinking again)

---

### Issue #31: Fragmented State Management
**File:** `frontend/src/App.tsx:21-26`
**Issue:** Seven separate state variables for related data
**Proposed Fix:** Consolidate into single state object or reducer

**YOUR FEEDBACK:**

- explain once we get there
- but let's focus on major fixes and (next step) deployment to semi-prod if in doubt

---

### Issue #32: Vite Dev Server Exposed to All Interfaces
**File:** `frontend/vite.config.ts:8`
**Issue:** `host: '0.0.0.0'` exposes to all network interfaces
**Proposed Fix:** Conditional based on NODE_ENV

**YOUR FEEDBACK:**

- explain

---

### Issue #33: No Request Timeout Configuration
**File:** `frontend/src/App.tsx:30-92`
**Issue:** Fetch requests can hang indefinitely
**Proposed Fix:** Implement `fetchWithTimeout()` helper (10s timeout)

**YOUR FEEDBACK:**

- let's review this later, add todo in code?

---

### Issue #34: JSON.parse Without Try-Catch
**File:** `api/server.js:133`
**Issue:** `JSON.parse(row.geometry)` can throw if invalid
**Proposed Fix:** Wrap in try/catch, filter out invalid geometries

**YOUR FEEDBACK:**

- hardly any / no freedom in db contents so if anything doesn't work, nothing likely works

---

### Issue #35: TypeScript Config - `skipLibCheck: true`
**File:** `frontend/tsconfig.app.json:8`
**Issue:** Skips type checking for libraries
**Proposed Fix:** Remove or set to `false` (may require fixing type errors)

**YOUR FEEDBACK:**

- agree

---

### Issue #36: CORS Package Outdated
**File:** `api/package.json`
**Issue:** `cors@2.8.5` from 2017, unmaintained
**Proposed Fix:** Monitor for replacements or implement custom CORS middleware

**YOUR FEEDBACK:**

- prefer deletion if we figure out architectural fix for cors    

---

## STRATEGIC QUESTIONS

### Q1: Authentication Strategy
**Options:**
- A) API keys (simple, static)
- B) JWT tokens (session-based)
- C) OAuth (external identity provider)
- D) Public API (no auth, rely on rate limiting only)

**YOUR ANSWER:**

See above. Mostly D

---

### Q2: Deployment Target
**Options:**
- A) Local development only
- B) Internal network (trusted users)
- C) Public internet (untrusted)

**YOUR ANSWER:**

B/C

---

### Q3: Data Sensitivity
**Options:**
- A) Public data (authentication optional)
- B) Research data (authentication required)
- C) Protected/confidential (add encryption, audit logging)

**YOUR ANSWER:**

A (by far!)
---

### Q4: Python Environment Management
**Options:**
- A) Pixi (modern, cross-platform)
- B) Traditional virtualenv/pip

**YOUR ANSWER:**

What's more robust on, say 5-y time scales?  I tend to pip

---

### Q5: Breaking Changes
Are you OK requiring .env regeneration and service restarts?
**Options:**
- A) Yes - Proceed with all critical fixes
- B) No - Phase changes over multiple releases

**YOUR ANSWER:**

No regrets. This is WIP anyway

---

## PRIORITY ADJUSTMENTS

If you want to change any issue priorities, note them here:
(Example: "#3 CRITICAL → SKIP because public data", "#19 HIGH → LATER", etc.)

**YOUR PRIORITY CHANGES:**

- derive from my comments and suggest new prios

---

## ADDITIONAL COMMENTS

Any other thoughts, concerns, or requirements:

**YOUR COMMENTS:**

- ./.

---

**Next Steps:** After you fill this out, I'll digest your feedback and create a revised implementation plan.
