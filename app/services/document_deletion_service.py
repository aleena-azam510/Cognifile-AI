from pathlib import Path

from app.services.document_registry import (
    get_document_by_id,
    get_document_file_path,
    delete_document_record
)

from app.services.vector_service import delete_document_vectors


def delete_document(document_id: str) -> dict:
    """
    Delete a document from Qdrant, SQLite, and disk.
    """

    if not document_id.strip():
        raise ValueError("Document ID cannot be empty.")

    # STEP 1: Verify document exists
    document = get_document_by_id(document_id)

    if not document:
        raise ValueError("Document not found.")

    # STEP 2: Retrieve PDF path
    file_path = get_document_file_path(document_id)

    # STEP 3: Validate PDF path BEFORE deleting anything
    pdf_path = None

    if file_path:
        pdf_path = Path(file_path).resolve()

        uploads_dir = (
            Path(__file__).resolve().parents[2] / "uploads"
        ).resolve()

        if uploads_dir not in pdf_path.parents:
            raise RuntimeError(
                "Unsafe file path. Deletion cancelled."
            )

    # STEP 4: Delete vectors from Qdrant
    deleted_vectors = delete_document_vectors(document_id)

    # STEP 5: Delete SQLite metadata
    record_deleted = delete_document_record(document_id)

    if not record_deleted:
        raise RuntimeError(
            "Vectors were deleted, but metadata deletion failed."
        )

    # STEP 6: Delete uploaded PDF
    file_deleted = False

    if pdf_path and pdf_path.exists():
        pdf_path.unlink()
        file_deleted = True

    return {
        "document_id": document_id,
        "document_name": document["document_name"],
        "deleted_vectors": deleted_vectors,
        "metadata_deleted": record_deleted,
        "file_deleted": file_deleted,
        "status": "success"
    }