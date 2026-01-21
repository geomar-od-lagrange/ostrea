# PR Review Fixes - Implementation Plan

**Date:** 2026-01-21
**Topic:** review-04-pr-fixes
**Status:** In Progress
**PR:** #7 (Review and fix)

## Overview

Addressing PR #7 review comments from willirath. Six main areas of fixes based on review discussion in previous plan rounds.

## YOUR QUESTIONS/NOTES:

*(Space for user input during implementation)*

---

## Issues to Address

### 1. Validation Whitelisting Rollback (api/server.js)

**Issue:** Implemented hardcoded whitelists for depth/time_range values, but Round 02 decision was to use basic validation only.

**Action:**
- Remove `isValidDepth()` function with hardcoded `['05m', '10m', '15m']` whitelist
- Remove `isValidTimeRange()` function with hardcoded `['00d-07d', '07d-14d', '14d-28d']` whitelist
- Keep array length validation (max 10 items)
- Keep `isValidId()` for type checking (positive integers)

**Files:**
- `api/server.js`

**Rationale:** Keep code simple, let database handle invalid values. Focus on preventing DoS (huge arrays) and type errors (NaN values).

---

### 2. Max IDs Limit Increase (api/server.js)

**Issue:** Current limit of 100 start_ids is too low for patient users combining many hexes.

**Action:**
- Change `validateArray(start_ids, 100, isValidId)` → `validateArray(start_ids, 10000, isValidId)`
- Update error message accordingly

**Files:**
- `api/server.js`

**Rationale:** 10,000 is beyond actual hex count but clearly indicates misuse.

---

### 3. os.getenv() None Checks (Python files)

**Issue:** Using truthy check `if not POSTGRES_USER` but `os.getenv()` returns `None`, not `False`.

**Action:**
- Change: `if not POSTGRES_USER or not POSTGRES_PASSWORD:`
- To: `if POSTGRES_USER is None or POSTGRES_PASSWORD is None:`

**Files:**
- `database/connectivity_to_db.py`
- `database/geojson_to_db.py`
- `database/metadata_to_db.py`

**Note:** Will be replaced by shared config module in Issue #6.

---

### 4. Docker Image Pinning (Dockerfiles)

**Issue:** Using `:latest` and unpinned alpine tags creates non-reproducible builds.

**Action:**
- `database/init/Dockerfile`: Pin `condaforge/miniforge3:latest` to specific version
- `frontend/Dockerfile`: Pin `node:22-alpine` to specific tag (e.g., `22.12.0-alpine`)
- `frontend/Dockerfile`: Pin `nginx:alpine` to specific version (e.g., `1.27-alpine`)

**Files:**
- `database/init/Dockerfile`
- `frontend/Dockerfile`

**Rationale:** Reproducible builds across time and environments.

---

### 5. Init Script Cleanup (database/init/init_db.py)

**Issue:** Unicode characters and print statements not suitable for Kubernetes logging.

**Action:**
- Remove unicode emoji characters (🎯, 📊, ✅, ⏭️, 🔄)
- Replace `print()` with `logging.info()`, `logging.error()`
- Set up minimal logging configuration

**Files:**
- `database/init/init_db.py`

**Note:** Will be refactored to use package imports in Issue #6.

---

### 6. Package Refactoring (database/src/database/ → src/hex_db_loader/)

**Issue:** Empty package `database` with too-generic name. Standalone scripts duplicate code.

**Action:**

#### 6.1 Rename Package
- `database/src/database/` → `database/src/hex_db_loader/`
- Update `database/pyproject.toml`: `name = "hex_db_loader"`
- Update `[tool.pixi.pypi-dependencies]` to reference new package name

#### 6.2 Create Shared Modules

**`src/hex_db_loader/__init__.py`:**
```python
"""Hex dashboard database loader package."""
from .config import get_db_engine
from .connectivity import load_connectivity
from .geojson import load_geojson
from .metadata import load_metadata

__all__ = [
    "get_db_engine",
    "load_connectivity",
    "load_geojson",
    "load_metadata",
]
```

**`src/hex_db_loader/config.py`:**
- Database credential loading (env vars → .env file fallback)
- Engine creation with connection string
- Table name constants
- Shared by all loaders

**`src/hex_db_loader/connectivity.py`:**
- Extract logic from `connectivity_to_db.py`
- Function: `load_connectivity(engine, data_path='data/connectivity.pq')`

**`src/hex_db_loader/geojson.py`:**
- Extract logic from `geojson_to_db.py`
- Function: `load_geojson(engine, data_path='data/hexes.geojson')`

**`src/hex_db_loader/metadata.py`:**
- Extract logic from `metadata_to_db.py`
- Function: `load_metadata(engine, data_path='data/meta.json')`

#### 6.3 Convert Standalone Scripts to CLI Wrappers

Simplify to:
```python
#!/usr/bin/env python3
from hex_db_loader import get_db_engine, load_connectivity

if __name__ == "__main__":
    engine = get_db_engine()
    load_connectivity(engine)
```

#### 6.4 Update init_db.py
- Import from package instead of duplicating logic
- Use logging instead of print
- Remove unicode characters

**Files Created/Modified:**
- `database/src/hex_db_loader/__init__.py` (rename + populate)
- `database/src/hex_db_loader/config.py` (new)
- `database/src/hex_db_loader/connectivity.py` (new)
- `database/src/hex_db_loader/geojson.py` (new)
- `database/src/hex_db_loader/metadata.py` (new)
- `database/pyproject.toml` (update package name)
- `database/connectivity_to_db.py` (refactor to wrapper)
- `database/geojson_to_db.py` (refactor to wrapper)
- `database/metadata_to_db.py` (refactor to wrapper)
- `database/init/init_db.py` (use package imports + logging)

**Benefits:**
- No code duplication
- Proper imports and testability
- Consistent credential handling
- Better for future maintenance

---

## Implementation Order

1. **Package Refactoring (#6)** - Foundation for everything else
   - Rename package directory
   - Create shared modules
   - Update pyproject.toml
   - Refactor standalone scripts
   - Update init_db.py

2. **Python None Checks (#3)** - Will be in config.py after refactor

3. **Init Script Cleanup (#5)** - Already using package imports

4. **Docker Image Pinning (#4)** - Infrastructure

5. **Validation Rollback (#1)** - API changes

6. **Max IDs Increase (#2)** - API changes

---

## Testing After Implementation

### Database Package
```bash
cd database
pixi run python connectivity_to_db.py
pixi run python geojson_to_db.py
pixi run python metadata_to_db.py
# Should work without errors
```

### Docker Build
```bash
docker compose build
# All images should build successfully
```

### Init Container
```bash
docker compose down -v
docker compose up -d
docker compose logs db-init
# Should show logging output (no unicode chars, no print statements)
```

### API Validation
```bash
# Should accept valid requests
curl "http://localhost:5173/api/connectivity?depth=05m&time_range=00d-07d&start_id=100"

# Should reject invalid depths (no whitelist)
curl "http://localhost:5173/api/connectivity?depth=INVALID&time_range=00d-07d&start_id=100"
# Returns 400 for array length/type issues only

# Should accept many IDs (up to 10,000)
curl "http://localhost:5173/api/connectivity?depth=05m&time_range=00d-07d&start_id=$(seq -s, 1 1000)"
# Should work
```

---

## Commit Strategy

- Commit after each major issue is addressed
- Simple one-line commit messages per CLAUDE.md
- No co-authorship tags
- Local commits only (no push)

---

## YOUR QUESTIONS/NOTES:

*(Space for user input/feedback during implementation)*
