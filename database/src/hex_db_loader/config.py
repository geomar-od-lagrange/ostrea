"""Database configuration and connection management."""
import os
import yaml
from pathlib import Path
from sqlalchemy import create_engine

# Table name constants
GEO_TABLE_NAME = "geo_table"
METADATA_TABLE_NAME = "metadata_table"
CONNECTIVITY_TABLE_NAME = "connectivity_table"
SCHEMA = "public"


def get_db_credentials():
    """Get database credentials from environment or .env file.

    Tries environment variables first (for Docker deployment),
    then falls back to .env file (for local development).

    Returns:
        tuple: (username, password, host)

    Raises:
        ValueError: If credentials cannot be found
    """
    user = os.getenv('POSTGRES_USER')
    password = os.getenv('POSTGRES_PASSWORD')
    host = os.getenv('DB_HOST', 'localhost')

    # If credentials not in environment, try .env file
    if user is None or password is None:
        env_path = Path(__file__).parent.parent.parent / ".env"
        if env_path.exists():
            with open(env_path, mode="r") as f:
                env_config = yaml.safe_load(f)
            user = env_config.get("POSTGRES_USER")
            password = env_config.get("POSTGRES_PASSWORD")

    if user is None or password is None:
        raise ValueError(
            "Database credentials not found. "
            "Set POSTGRES_USER and POSTGRES_PASSWORD environment variables "
            "or create a .env file with these values."
        )

    return user, password, host


def get_db_engine():
    """Create SQLAlchemy engine with database credentials.

    Returns:
        sqlalchemy.engine.Engine: Database engine instance
    """
    user, password, host = get_db_credentials()
    url = f"postgresql://{user}:{password}@{host}:5432/db"
    return create_engine(url)
