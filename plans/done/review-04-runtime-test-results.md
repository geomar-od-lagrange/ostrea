# Runtime Test Results - 2026-01-21

## ✓ All Services Running

```
NAME                            STATUS                    PORTS
2024_hex_dashboard-api-1        Up 7 seconds              3000/tcp
2024_hex_dashboard-db-1         Up 18 seconds (healthy)   5432/tcp
2024_hex_dashboard-frontend-1   Up 18 seconds             80/tcp
2024_hex_dashboard-nginx-1      Up 7 seconds              127.0.0.1:5173->80/tcp
```

## ✓ Database Initialization

**Init Logs:**
```
2026-01-21 12:42:54,208 - INFO - Connecting to database...
2026-01-21 12:42:54,287 - INFO - Database already initialized. Tables found:
2026-01-21 12:42:54,287 - INFO -   - geo_table
2026-01-21 12:42:54,287 - INFO -   - metadata_table
2026-01-21 12:42:54,287 - INFO -   - connectivity_table
2026-01-21 12:42:54,287 - INFO - Skipping initialization.
```

**Verification:**
- ✓ Proper logging format (timestamp - level - message)
- ✓ No unicode emoji characters
- ✓ Database tables already exist (data persisted)

## ✓ API Endpoint Tests

**Test 1: Metadata Endpoint**
- Request: `GET /api/metadata`
- Result: ✓ Returns JSON array of metadata
- Sample: `[{"id":"0","lon":-3.215781648,"lat":51.4645486966,...`

**Test 2: Valid Connectivity Request**
- Request: `GET /api/connectivity?depth=05m&time_range=00d-07d&start_id=100`
- Result: ✓ Returns connectivity data
- Sample: `[{"end_id":96,"weight":0.34573711364256926},...`

**Test 3: Invalid Depth Value (No Whitelist)**
- Request: `GET /api/connectivity?depth=INVALID&time_range=00d-07d&start_id=100`
- Result: ✓ Accepted by validation, returned 404 from database
- Response: `{"error":"No entry for parameters: depths=INVALID&time_ranges=00d-07d&start_id=100"}`
- **Verification:** Database handles invalid values (no whitelist rejection)

**Test 4: Array Length Limit**
- Request: 11 depth items (max is 10)
- Result: ✓ Validation rejected with 400
- Response: `{"error":"Invalid depth parameter. Must be array with max 10 items"}`

**Test 5: Large ID List**
- Request: 50 start_ids
- Result: ✓ Accepted and processed successfully
- **Verification:** Max 10,000 limit allows reasonable large requests

**Test 6: Feature Endpoint**
- Request: `GET /api/feature`
- Result: ✓ Returns GeoJSON FeatureCollection
- Sample: `{"type":"FeatureCollection","features":[{"type":"Feature",...`

## ✓ Frontend Tests

**Test 7: Frontend HTML**
- Request: `GET /`
- Result: ✓ Returns production-built HTML
- Assets: `/assets/index-Bb5U1-R2.js`, `/assets/index-Dtn62Xmo.css`
- **Verification:** nginx serving production build (not dev server)

## ✓ Architecture Validation

**CORS Resolution:**
- nginx reverse proxy at localhost:5173
- Routes `/api/*` to API service
- Routes `/` to frontend service
- **Result:** No CORS issues (same origin)

**Docker Images:**
- miniforge3: 24.9.2-0 (pinned) ✓
- node builder: 22.12.0-alpine (pinned) ✓
- nginx: 1.27-alpine (pinned) ✓

## Summary

**All tests passed:** 7/7

The application is fully functional with all PR review fixes implemented:
1. ✓ Package refactored (hex_db_loader)
2. ✓ Docker images pinned
3. ✓ Validation whitelisting removed
4. ✓ Max IDs increased to 10,000
5. ✓ Unicode characters removed
6. ✓ Logging implemented
7. ✓ None checks corrected

**Dashboard URL:** http://localhost:5173/
