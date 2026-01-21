"""Metadata loading."""
import pandas as pd
from pathlib import Path
from .config import METADATA_TABLE_NAME


def load_metadata(engine, data_path=None):
    """Load metadata from JSON file into database.

    Args:
        engine: SQLAlchemy engine instance
        data_path: Path to metadata JSON file (default: data/meta.json)

    Returns:
        DataFrame: Loaded metadata
    """
    if data_path is None:
        data_path = Path(__file__).parent.parent.parent / "data" / "meta.json"
    else:
        data_path = Path(data_path)

    # Load JSON
    df = pd.read_json(data_path)

    # Write to database
    df.to_sql(METADATA_TABLE_NAME, engine, if_exists="append", index=False, method="multi")

    return df
