FROM condaforge/miniforge3:25.11.0-1

WORKDIR /app

# Install Python dependencies
# Use psycopg2-binary for easier installation (no compilation needed)
RUN pip install --no-cache-dir \
    psycopg2-binary \
    geoalchemy2 \
    geopandas \
    pandas \
    pyarrow \
    pyyaml \
    sqlalchemy \
    tqdm

# Copy data files (baked into image for portability)
# Context is ./database, so paths are relative to that
COPY data/ ./data/

# Copy package source
COPY src/ ./src/
COPY pyproject.toml ./

# Install package in editable mode
RUN pip install --no-cache-dir -e .

# Copy init script
COPY init/init_db.py ./

# Create non-root user and set ownership
RUN useradd -m -u 1000 appuser && \
    chown -R appuser:appuser /app

USER appuser

# Run initialization
CMD ["python", "init_db.py"]
