FROM python:3.12.12-slim

WORKDIR /app

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

RUN pip install --no-cache-dir -e .

# Copy init script
COPY init/init_db.py ./

RUN useradd -r -u 1000 appuser && chown -R 1000:1000 /app

USER 1000

CMD ["python", "init_db.py"]
