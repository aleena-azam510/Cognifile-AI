
import sqlite3

from pathlib import Path
from datetime import datetime, timezone
from contextlib import closing

# Store the database in the project root
DB_PATH = Path(__file__).resolve().parents[2] / "documind.db"


def initialize_database():
    """
    Create the document registry table if it does not exist.
    """

    with closing(sqlite3.connect(DB_PATH)) as connection:

        connection.execute("""
            CREATE TABLE IF NOT EXISTS documents (
                document_id TEXT PRIMARY KEY,
                document_name TEXT NOT NULL,
                file_path TEXT NOT NULL,
                total_pages INTEGER NOT NULL,
                total_chunks INTEGER NOT NULL,
                uploaded_at TEXT NOT NULL
            )
        """)

        connection.commit()


def register_document(
    document_id: str,
    document_name: str,
    file_path: str,
    total_pages: int,
    total_chunks: int
):
    """
    Save document metadata after successful ingestion.
    """

    uploaded_at = datetime.now(timezone.utc).isoformat()

    with closing(sqlite3.connect(DB_PATH)) as connection:

        connection.execute("""
            INSERT OR REPLACE INTO documents (
                document_id,
                document_name,
                file_path,
                total_pages,
                total_chunks,
                uploaded_at
            )
            VALUES (?, ?, ?, ?, ?, ?)
        """, (
            document_id,
            document_name,
            file_path,
            total_pages,
            total_chunks,
            uploaded_at
        ))

        connection.commit()


def get_all_documents() -> list[dict]:
    """
    Retrieve all registered documents, newest first.
    """

    with closing(sqlite3.connect(DB_PATH)) as connection:

        connection.row_factory = sqlite3.Row

        rows = connection.execute("""
            SELECT
                document_id,
                document_name,
                total_pages,
                total_chunks,
                uploaded_at
            FROM documents
            ORDER BY uploaded_at DESC
        """).fetchall()

        return [dict(row) for row in rows]
    

def get_document_by_id(document_id: str) -> dict | None:
    """
    Retrieve one document using its unique ID.
    """

    with closing(sqlite3.connect(DB_PATH)) as connection:

        connection.row_factory = sqlite3.Row

        row = connection.execute("""
            SELECT
                document_id,
                document_name,
                total_pages,
                total_chunks,
                uploaded_at
            FROM documents
            WHERE document_id = ?
        """, (document_id,)).fetchone()

        return dict(row) if row else None

def delete_document_record(document_id: str) -> bool:
    """
    Delete one document's metadata from SQLite.

    Returns True if a record was deleted,
    otherwise False.
    """

    if not document_id.strip():
        raise ValueError("Document ID cannot be empty.")

    with closing(sqlite3.connect(DB_PATH)) as connection:

        cursor = connection.execute("""
            DELETE FROM documents
            WHERE document_id = ?
        """, (document_id,))

        connection.commit()

        return cursor.rowcount > 0
    
def get_document_file_path(document_id: str) -> str | None:
    """
    Retrieve the stored file path for a document.
    """

    with closing(sqlite3.connect(DB_PATH)) as connection:

        row = connection.execute("""
            SELECT file_path
            FROM documents
            WHERE document_id = ?
        """, (document_id,)).fetchone()

        return row[0] if row else None