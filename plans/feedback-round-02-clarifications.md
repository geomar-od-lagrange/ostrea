# Feedback Round 02 - Clarifications & Questions

**Previous rounds:**
- **Round 00**: `feedback-round-00-initial-review.md` - Initial comprehensive review (36 issues)
- **Round 01**: `feedback-round-01-user-feedback.md` - Your feedback on all issues
- **Round 02**: This document - My takeaways + questions for you

---

## My Key Takeaways from Round 01

### ✅ Clear Architectural Decisions

1. **Read-Only API Model**
   - App only needs READ access to database
   - WRITE operations run once at startup, locally on DB host
   - No authentication needed for public read-only access

2. **Infrastructure Simplifications**
   - Remove Adminer entirely (no web admin interface needed)
   - Skip rate limiting (handled at infrastructure level)
   - All data is public (no sensitive information)

3. **Development Philosophy**
   - MVP/Demo mindset - avoid over-engineering
   - Focus on deployment-ready fixes, not polish
   - Human will actively debug issues (no need for failsafe scripts)
   - Performance target: ~100ms latency is fine (currently achieved)

4. **Technology Choices**
   - Use **Pixi** for Python dependency management
   - Breaking changes OK (this is WIP)
   - Moving away from docker-compose for production eventually

---

## Issues Requiring Explanation/Clarification

### 🔴 CRITICAL LEVEL

#### Issue #4: CORS - "Architectural Flaw"
**Your feedback:** "was introduced so frontend could access database but likely points to architectural flaw. zoom out and fix architecture first"

**My explanation:**
Current architecture causes CORS issue:
```
Browser → http://localhost:5173 (Frontend/Vite)
          ↓ fetch('/api/connectivity')
          ↓ (cross-origin request!)
          → http://localhost:3000 (API/Express)
```

**Root cause:** Frontend and API are on different origins (different ports).

**Solution options:**

**Option A: Nginx Reverse Proxy (Recommended)**
```
# Works for both localhost testing AND production:

Local testing:
Browser → http://localhost/              → nginx → Vite/built frontend
          http://localhost/api/*         → nginx → Express API
          (same origin, no CORS needed!)

Production (same architecture):
Browser → https://yourdomain.com/         → nginx → Vite/built frontend
          https://yourdomain.com/api/*    → nginx → Express API
          (same origin, no CORS needed!)
```

**docker-compose.yml example:**
```yaml
nginx:
  image: nginx:alpine
  ports:
    - "127.0.0.1:80:80"  # Localhost only for testing
    # For production, change to:
    # - "80:80"          # Public access
    # - "443:443"        # HTTPS
```

Pros:
- Eliminates CORS entirely (localhost AND production)
- Same architecture for dev and prod
- Better performance (nginx serves static files)
- Easy to test locally before deployment

Cons:
- Requires nginx configuration (~10 lines)
- Slightly more complex setup

**Option B: Improve CORS Config (Quick fix)**
```javascript
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:5173'],
  credentials: false
}));
```

Pros:
- Minimal change (5 minutes)
- Works for now

Cons:
- Still using CORS (architectural compromise)
- Not ideal long-term

**YOUR DECISION:**
- [x] Option A - Add nginx reverse proxy now
- [ ] Option B - Improve CORS config, plan nginx for later deployment
- [ ] Option C - Other (explain):

**YOUR QUESTIONS/NOTES:**

./.

---

#### Issue #6: Input Validation - "Are we in trouble in r/o case?"
**Your feedback:** "this is important at least if we allow r/w. are we in trouble in r/o case as well?"

**My explanation:**
Yes, you need validation even for read-only because:

**Risk 1: Database Overload**
```javascript
// Malicious request:
?start_id=1,2,3,4,5,...,10000  // 10,000 IDs

// Your API queries:
WHERE start_id = ANY($1)  // PostgreSQL searches ALL 10k IDs
```
Result: Database slows to a crawl, legitimate users can't use the app.

**Risk 2: Type Errors / Crashes**
```javascript
// Current code (server.js:49):
.map(x => Number(x))

// If user sends:
?start_id=abc,def,xyz

// Result:
Number('abc') → NaN
// SQL query with NaN values → error or unexpected results
```

**Risk 3: No Array Length Limits**
```javascript
// Current code accepts unlimited array sizes
?depth=05m,10m,15m,05m,10m,15m,...  (repeated 1000 times)
```

**Your SQL is safe from injection** (parameterized queries ✅), but these other risks remain.

**Proposed validation (minimal, just safety):**
```javascript
// Validate types and limits
if (!Array.isArray(depths) || depths.length > 10) {
  return res.status(400).json({ error: 'Invalid depths parameter' });
}
if (!Array.isArray(start_ids) || start_ids.length > 100) {
  return res.status(400).json({ error: 'Too many start IDs (max 100)' });
}
// Validate each ID is actually a number
if (start_ids.some(id => !Number.isInteger(Number(id)))) {
  return res.status(400).json({ error: 'Invalid start_id values' });
}
```

**YOUR DECISION:**
- [x] Add basic validation (type checking + array limits)
- [ ] Add strict validation (also whitelist "05m", "10m", "15m" etc)
- [ ] Skip validation (explain why you're comfortable with risks):

**YOUR QUESTIONS/NOTES:**

Catch worst scenarios but note we don't care too much. Value of concise and simple code > edge case handling it the early stages here.

---

#### Issue #7: Security Headers - "explain separately"
**Your feedback:** "explain separately. note we don't handle any sensitive data we just use the db so a user will see minimal traffic"

**My explanation:**
Security headers protect **the user's browser**, not your data.

Even with public data, here's what can go wrong WITHOUT headers:

**Attack 1: Clickjacking (prevented by X-Frame-Options)**
```html
<!-- Attacker's site: evil.com -->
<iframe src="https://yourdomain.com"></iframe>
<!-- Invisible overlay tricks user into clicking malicious buttons -->
```
Result: User thinks they're using your app, actually interacting with attacker's overlay.

**Attack 2: MIME Sniffing (prevented by X-Content-Type-Options)**
```javascript
// Your API returns JSON:
{ "data": "..." }

// But attacker tricks browser into executing it as JavaScript
// by embedding it as <script src="https://yourdomain.com/api/metadata"></script>
```
Result: Data leaks to attacker's site via CORS bypass.

**Attack 3: Script Injection (prevented by Content-Security-Policy)**
```javascript
// If your CDN (maplibre, deck.gl) is compromised:
<script src="https://compromised-cdn.com/maplibre.js"></script>
// Malicious script runs with full access to your app
```
Result: Attacker steals user sessions, modifies the UI, or mines crypto in user's browser.

**The fix is literally 3 lines:**
```javascript
const helmet = require('helmet');
app.use(helmet());
```

Takes 2 minutes to add, free protection for users.

**YOUR DECISION:**
- [ ] Add helmet (recommended - it's free protection)
- [x] Skip for now (explain reasoning):

**YOUR QUESTIONS/NOTES:**

An attacker could not steal any info from b/w user and our app. There's a bunch of hexes visualising publically available numbers. _NOTHING_ sensitive is in any of this. If there's no scenario where an attacker can use our app to steal data from the user which is not related to our app, then we care.

---

#### Issue #9: XSS Vulnerability via Tooltip
**Your feedback:** "explain. probably needs fixing"

**My explanation:**
Current code (App.tsx:169-176):
```typescript
content: `Id: ${encodeURIComponent(metadata[id].id)}
  lon: ${encodeURIComponent(metadata[id].lon)}
  ...`
```

**Problem 1:** `encodeURIComponent()` is for URLs, not HTML
- It converts spaces to `%20`, slashes to `%2F`, etc.
- BUT it doesn't protect against HTML injection

**Problem 2:** If metadata contains HTML, it could execute
```javascript
// Imagine metadata[id].id = "<script>alert('xss')</script>"
// Your tooltip shows:
content: "Id: %3Cscript%3Ealert%28%27xss%27%29%3C%2Fscript%3E"
// Still looks weird, but decoding can expose the script
```

**Risk level:** LOW (you control the database) BUT bad practice.

**Fix (30 seconds):**
```typescript
// Option 1: Use textContent (safest)
const escapeHtml = (str: string) => {
  const div = document.createElement('div');
  div.textContent = String(str);
  return div.innerHTML;
};

content: `Id: ${escapeHtml(String(metadata[id].id))}`

// Option 2: Proper HTML escape function
const escapeHtml = (str: string) =>
  String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
```

**YOUR DECISION:**
- [x] Fix it (recommended - 30 seconds, good practice)
- [ ] Skip (explain why):

**YOUR QUESTIONS/NOTES:**


---

### 🟠 HIGH PRIORITY

#### Issue #14: Missing Health Checks
**Your feedback:** "elaborate. let's at least have simple dependency checking so the app only comes up if the db is ready"

**My explanation:**
Current behavior without health checks:
```yaml
# docker-compose.yml
services:
  db:
    # PostgreSQL starts...
  api:
    # Express starts immediately (might be before db is ready)
  frontend:
    # Vite starts immediately
```

**Problem:** API might start before DB is ready → users see errors for 5-10 seconds.

**Solution: Docker health checks with dependencies**
```yaml
services:
  db:
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${POSTGRES_USER}"]
      interval: 5s
      timeout: 3s
      retries: 5
    # DB reports "healthy" only when PostgreSQL accepts connections

  api:
    depends_on:
      db:
        condition: service_healthy  # Wait for DB to be healthy
    healthcheck:
      test: ["CMD", "node", "-e", "require('http').get('http://localhost:3000/health')"]
      interval: 10s
      timeout: 5s
      retries: 3

  frontend:
    depends_on:
      api:
        condition: service_healthy  # Wait for API to be healthy
```

**Benefits:**
- API won't start until DB accepts connections
- Frontend won't start until API is responding
- `docker-compose ps` shows health status
- Automatic restarts if health checks fail

**YOUR DECISION:**
- [ ] Add health checks as shown above
- [ ] Simpler version (just DB health check, API waits)
- [.] Skip (you're fine with 5-10 sec startup errors)

**YOUR QUESTIONS/NOTES:**

We'll likely transform this to kubernetes on openshift in near future w/ kompose. If this does not trivially translate there, let's not bother on the docker compose side of this migration.

---

#### Issue #21: Frontend Dockerfile - Production Build
**Your feedback:** "agree, but elaborate, we don't want to over-engineer, this is a really simple app which won't evolve very far and which won't scale to large audiency"

**My explanation:**
Current setup runs **Vite dev server** in production:
```dockerfile
# frontend/Dockerfile (current)
CMD ["npm", "run", "dev", "--", "--host"]
```

**Problems with dev server in production:**
1. **Slow**: No minification, no tree-shaking (bundle is 5-10x larger)
2. **Insecure**: Source maps exposed (attacker sees your source code)
3. **Memory leak**: Dev server not designed for long-running processes
4. **HMR overhead**: Hot module replacement code included (unnecessary)

**Solution: Multi-stage build (minimal effort)**
```dockerfile
# Build stage (runs once during docker build)
FROM node:22-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build  # Creates optimized /app/dist folder

# Production stage (tiny nginx image)
FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

**nginx.conf (10 lines):**
```nginx
server {
  listen 80;
  location / {
    root /usr/share/nginx/html;
    try_files $uri $uri/ /index.html;
  }
  location /api/ {
    proxy_pass http://api:3000/;
  }
}
```

**Benefits:**
- Bundle size: ~15MB → ~2MB (8x smaller)
- Memory: ~200MB → ~10MB (20x smaller)
- Startup: 3-5s → <1s
- **Also solves CORS issue** (nginx proxies API requests)

**Effort:** ~15 minutes to set up, then it just works.

**YOUR DECISION:**
- [ ] Multi-stage build + nginx (recommended, solves CORS too)
- [.] Keep dev server for now (accept the trade-offs)
- [.] Defer until actual deployment

**YOUR QUESTIONS/NOTES:**

Any downsides to not using the dev server? If not, let's remove dev server.

---

### 🟡 MEDIUM PRIORITY

#### Issue #24: Accessibility - ARIA Labels
**Your feedback:** "elaborate (I tend to ignore, this is an MVP / DEMO)"

**My explanation:**
ARIA labels help screen readers announce controls:

**Without ARIA:**
Screen reader says: "Checkbox. Checked." (user has no idea what it does)

**With ARIA:**
Screen reader says: "Checkbox. Highlight aquaculture sites. Checked."

**Effort:** Add one attribute per checkbox:
```tsx
<input
  type="checkbox"
  aria-label="Highlight aquaculture sites"
  checked={isAQCHighlighted}
  onChange={(e) => setAQC(e.target.checked)}
/>
```

**YOUR DECISION:**
- [.] Skip (MVP/demo, acceptable)
- [ ] Add (5 minutes for all checkboxes)

**YOUR QUESTIONS/NOTES:**

Skip but keep in backlog.

---

#### Issue #26: Loose Equality (`==` vs `===`)
**Your feedback:** "explain"

**My explanation:**
JavaScript has two equality operators:

**Loose equality `==` (type coercion):**
```javascript
"5" == 5      // true (string coerced to number)
0 == false    // true (number coerced to boolean)
null == undefined  // true
"" == 0       // true
```

**Strict equality `===` (no coercion):**
```javascript
"5" === 5     // false (different types)
0 === false   // false
null === undefined  // false
"" === 0      // false
```

**Your code (App.tsx:186):**
```javascript
if (clickIds.indexOf(info.object.properties.id) == -1) {
```

**Problem:** `indexOf()` returns `-1` (number), but `==` does type coercion.

**Risk:** If `indexOf()` somehow returns a string `"-1"`, it would still match due to coercion.

**Best practice:** Always use `===` (explicit, predictable).

**Fix:** ESLint can auto-fix this project-wide in 5 seconds.

**YOUR DECISION:**
- [x] Auto-fix with ESLint (recommended)
- [ ] Skip (low risk in practice)

**YOUR QUESTIONS/NOTES:**


---

#### Issue #27: Unused Variable `op`
**Your feedback:** "let's find out what intention likely was, then decide if implement or discard"

**My investigation:**
```javascript
// api/server.js:50
const op = req.query.op || "mean";

// Comment says (line 41):
// "returns a table of connectivity data, averaged over all perumations of the input"

// Code only implements 'mean' (line 78):
weight: mean(rows.map(r => +r.weight)),
```

**Intention:** Allow users to choose aggregation operator via `?op=mean` or `?op=max`:
```javascript
// Intended usage:
fetch('/api/connectivity?start_id=123&op=max')  // Get max weight instead of average
```

**To implement:**
```javascript
const ops = {
  mean: xs => xs.reduce((a,b) => a+b, 0) / (xs.length || 1),
  max: xs => Math.max(...xs),
  min: xs => Math.min(...xs),
};
const op = req.query.op || "mean";
const aggregateFn = ops[op] || ops.mean;

// Later (line 78):
weight: aggregateFn(rows.map(r => +r.weight)),
```

**YOUR DECISION:**
- [ ] Remove variable (simplest, not needed for MVP)
- [ ] Implement feature (5 minutes, adds flexibility)
- [x] Keep as-is (document as TODO for later)

**YOUR QUESTIONS/NOTES:**

I think this was scaffolding for making sure we dont overlook this in the architecture. So let's keep in place and implement later.

---

#### Issue #28: Optional Prop Called Directly
**Your feedback:** "explain once we get here"

**My explanation:**
ControlPanel.tsx type definition:
```typescript
clearHex?: (payload: { depths: string[]; times: string[] }) => void;
```

The `?` means optional (might be undefined).

**Current code (line 107):**
```tsx
<button onClick={clearHex}>Clear Selection</button>
```

**Problem:** If parent doesn't provide `clearHex` prop, clicking the button calls `undefined()` → crash.

**Fix:**
```tsx
<button onClick={() => clearHex?.({ depths: selectedDepths, times: selectedTimes })}>
  Clear Selection
</button>
```

The `?.` is optional chaining: only calls if `clearHex` exists.

**YOUR DECISION:**
- [x] Fix with optional chaining (30 seconds)
- [ ] Remove `?` from type (make prop required)
- [ ] Skip (you always provide the prop anyway)

**YOUR QUESTIONS/NOTES:**

---

#### Issue #31: Fragmented State Management
**Your feedback:** "explain once we get there. but let's focus on major fixes and (next step) deployment to semi-prod if in doubt"

**My explanation:**
Current App.tsx has 7 separate state variables:
```typescript
const [feature, setFeature] = useState<any>(null);
const [metadata, setMetadata] = useState<any>(null);
const [isAQCHighlighted, setAQC] = useState<boolean>(false);
const [isRestHighlighted, setRest] = useState<boolean>(false);
const [isDiseaseHighlighted, setDisease] = useState<boolean>(false);
const [hoveredId, setHoveredId] = useState<number | null>(null);
const [clickIds, setClickIds] = useState<number[]>([]);
const [tooltip, setTooltip] = useState<object | null>(null);
```

**Problem:** Related state is spread across multiple variables.

**Better approach:**
```typescript
interface AppState {
  data: {
    feature: FeatureCollection | null;
    metadata: Record<number, Metadata> | null;
  };
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

const [state, setState] = useState<AppState>({ /* ... */ });
```

**Benefits:**
- Single source of truth
- Atomic updates (no race conditions)
- Easier to serialize/persist

**Downside:** More verbose updates.

**YOUR DECISION:**
- [x] Defer to later (focus on deployment)
- [ ] Consolidate now (better architecture)
- [ ] Keep as-is (good enough for MVP)

**YOUR QUESTIONS/NOTES:**

Add todo to backlog or directly in code.

---

#### Issue #32: Vite Dev Server `0.0.0.0`
**Your feedback:** "explain"

**My explanation:**
`vite.config.ts` has:
```typescript
server: {
  host: '0.0.0.0',
  port: 5173,
}
```

**What `0.0.0.0` means:**
- Listen on ALL network interfaces (localhost, WiFi, Ethernet, etc.)
- Anyone on your network can access `http://your-ip:5173`

**Why it's needed for Docker:**
- Container internal IP is different from host
- `0.0.0.0` allows host to access container

**Risk if deployed to production:**
- Dev server exposed to internet (slow, insecure)
- BUT: Issue #21 (nginx multi-stage build) means you won't use Vite in production

**Conclusion:** Keep as-is. Issue #21 (production build) makes this irrelevant.

**YOUR DECISION:**
- [x] Keep as-is (non-issue if we do #21)
- [ ] Add NODE_ENV check (defense in depth)

**YOUR QUESTIONS/NOTES:**


---

## Python: Pixi vs Pip (5-year robustness)

**Your question:** "What's more robust on, say 5-y time scales? I tend to pip"

**Pip (traditional):**
- ✅ Battle-tested, 15+ years old, will definitely exist in 5 years
- ✅ Everyone knows it
- ❌ Doesn't lock Python version (system Python can break scripts)
- ❌ Manual `requirements.txt` maintenance
- ❌ Version conflicts between dependencies

**Pixi (modern):**
- ✅ Locks EVERYTHING (Python 3.11 + exact package versions)
- ✅ Reproducible builds ("works on my machine" → "works on any machine")
- ✅ Built on conda-forge (stable, 10+ year ecosystem)
- ✅ Better for "set and forget" scenarios
- ⚠️ Younger tool (2 years old, but backed by prefix.dev company)
- ⚠️ If pixi disappears, can convert to conda/mamba

**My recommendation for YOUR use case:**
Use **both** (belt and suspenders):

```bash
# Use pixi as primary (locks everything)
pixi add geopandas pandas pyarrow pyyaml sqlalchemy tqdm

# Also generate requirements.txt (fallback)
pixi run pip freeze > requirements.txt
```

In 5 years:
- If pixi still works → use it (best experience)
- If pixi is gone → use `requirements.txt` with virtualenv

**YOUR DECISION:**
- [ ] Pixi only (recommended for your use case)
- [x] Both pixi + requirements.txt (safest)
- [ ] Pip only (traditional, more manual)

**YOUR QUESTIONS/NOTES:**


---

## Responses to Your Questions

### Issue #7 (Security Headers): "If there's no scenario where an attacker can use our app to steal data from the user which is not related to our app, then we care."

**My response:** You're right that your app data is public, BUT helmet protects against attacks that steal **OTHER** user data (not from your app):

**Scenario 1: Session Hijacking via Clickjacking**
- Attacker embeds your app in invisible iframe on `evil.com`
- User thinks they're on `evil.com` but clicks trigger actions on your app
- If user is logged into their bank/email in another tab, attacker tricks them into clicking malicious buttons
- Helmet's X-Frame-Options prevents your app from being embedded

**Scenario 2: Malicious Script Injection (Supply Chain Attack)**
- One of your dependencies (maplibre, deck.gl, etc.) gets compromised
- Attacker injects script that steals localStorage, cookies, or makes requests to other sites the user is logged into
- Helmet's CSP restricts what scripts can run and where they can send data

**Scenario 3: MIME Type Confusion**
- Attacker tricks browser into executing your JSON data as JavaScript
- Can leak data to attacker's domain via CORS bypass techniques
- Helmet's X-Content-Type-Options prevents this

**Bottom line:** Without helmet, an attacker could use your app as a **launching pad** to attack the user's other accounts (email, bank, social media). Helmet blocks these attack vectors.

**However**, if you're comfortable with this risk for an MVP, that's a valid trade-off. Just be aware it protects users from broader web attacks, not just your app's data.

---

### Issue #21 (Production Build): "Any downsides to not using the dev server? If not, let's remove dev server."

**My response:** **ZERO downsides to removing dev server for production.** Only benefits:

**Benefits of production build (nginx):**
- ✅ 8x smaller bundle (15MB → 2MB)
- ✅ 20x less memory (200MB → 10MB)
- ✅ Faster startup (3-5s → <1s)
- ✅ Proper minification & tree-shaking
- ✅ No source maps exposed
- ✅ Production-grade HTTP server (nginx)
- ✅ Solves CORS issue (since nginx proxies API)

**Downsides:**
- ❌ None. Dev server is literally not designed for production.

**Recommendation:** Use multi-stage build + nginx. No reason to keep dev server for production/deployment.

---

### Issue #14 (Health Checks): "We'll likely transform to kubernetes/openshift with kompose."

**My response:** Good news! Docker Compose health checks translate directly to Kubernetes:

**Docker Compose:**
```yaml
healthcheck:
  test: ["CMD-SHELL", "pg_isready -U ${POSTGRES_USER}"]
  interval: 10s
  timeout: 5s
  retries: 5
```

**Becomes Kubernetes (via kompose):**
```yaml
livenessProbe:
  exec:
    command: ["pg_isready", "-U", "user"]
  periodSeconds: 10
  timeoutSeconds: 5
  failureThreshold: 5
```

So adding health checks now actually **helps** your k8s migration - kompose will auto-convert them. Plus, `depends_on` with `service_healthy` ensures proper startup order in both docker-compose AND kubernetes (via init containers).

**Recommendation:** Add at least DB health check since it translates cleanly and helps k8s deployment.

---

## Summary: Revised Implementation Plan

Based on your decisions, here's what we'll actually do:

### ✅ **DO NOW** (Immediate - Before any deployment):

**Infrastructure & Dependencies:**
1. Remove Adminer from docker-compose
2. Pin Docker images: Node 22 (API & frontend), PostgreSQL specific version
3. Setup Python deps: pixi + requirements.txt (both for redundancy)
4. Update Node.js: 18→22 (API), 20→22 (frontend)
5. Create .env.example with production credential guidance
6. Add DB health check (translates to kubernetes cleanly)

**Architecture - CORS Fix:**
7. Add nginx reverse proxy (serves frontend + proxies API)
8. Multi-stage Docker build for frontend (nginx serves built assets)

**Code Quality & Security:**
9. Fix XSS in tooltip (proper HTML escaping) - 30 seconds
10. Add basic input validation (type checking + array limits)
11. Add TypeScript interfaces (remove `any` types)
12. Remove `skipLibCheck` from tsconfig
13. Auto-fix loose equality (`==` → `===`) with ESLint
14. Fix optional prop with optional chaining

**Backlog/TODO Items:**
15. Add TODO comment for unused `op` variable (implement aggregation operators later)
16. Add TODO comment for state consolidation (defer to later)

### 🟠 **SKIP for MVP** (Revisit if needed):
- Helmet security headers (you've accepted risk for MVP - see explanation above)
- ARIA labels (keep in backlog for accessibility pass)
- Performance memoization (only if testing shows it's needed)
- Loading states (app is fast enough)
- Request timeouts (add TODO in code)

### 📝 **Questions to Resolve:**

**Issue #21 - Production Build:** You checked both "keep dev server" and "defer". Given there are ZERO downsides to production build and it solves CORS, should we:
- **Option A:** Do multi-stage build + nginx NOW (recommended - solves #7 CORS)
- **Option B:** Defer until actual deployment

**Issue #14 - Health Checks:** You want to skip but noted kompose/k8s migration. Since health checks translate directly to k8s, should we:
- **Option A:** Add DB health check now (helps k8s migration)
- **Option B:** Skip for now, add during k8s migration

Please clarify these two points and I'll create the final Round 03 implementation plan.

---

**Next Step:** Once you clarify the 2 questions above (Issues #21 and #14), I'll create Round 03 with:
- Concrete implementation steps
- Code examples for each change
- Order of operations
- Testing procedures
