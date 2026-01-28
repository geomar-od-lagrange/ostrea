FROM condaforge/miniforge3:25.3.0-3

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

# Use existing user (miniforge3 has UID 1000 already)
RUN chown -R 1000:1000 /app

USER 1000

# Run initialization
CMD ["python", "init_db.py"]
