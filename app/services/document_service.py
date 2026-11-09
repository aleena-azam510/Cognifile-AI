
from app.services.pdf_service import extract_text_from_pdf
from app.services.chunking_service import create_chunks
from app.services.embedding_service import generate_embeddings
from app.services.document_registry import register_document
from app.services.vector_service import (
    create_collection,
    store_embeddings
)


def ingest_document(
    file_path: str,
    document_name: str,
    document_id: str
) -> dict:
    """
    Process a PDF and store its embeddings in Qdrant.

    Pipeline:
    1. Extract PDF text.
    2. Split text into chunks.
    3. Generate embeddings.
    4. Store embeddings and metadata in Qdrant.
    """

    # STEP 1: Extract text from PDF
    pages = extract_text_from_pdf(file_path)

    if not pages:
        raise ValueError(
            "No extractable text found in this PDF."
        )

    # STEP 2: Create text chunks
    chunks = create_chunks(pages)

    if not chunks:
        raise ValueError(
            "No text chunks could be generated."
        )

    # STEP 3: Generate embeddings
    embedded_chunks = generate_embeddings(chunks)

    # STEP 4: Ensure Qdrant collection exists
    create_collection()

    # STEP 5: Store embeddings in Qdrant
    store_embeddings(
        embedded_chunks=embedded_chunks,
        document_id=document_id,
        document_name=document_name
    )
        # STEP 6: Register document metadata in SQLite
    register_document(
        document_id=document_id,
        document_name=document_name,
        file_path=file_path,
        total_pages=len(pages),
        total_chunks=len(embedded_chunks)
    )

    # STEP 6: Return document information
    return {
        "document_id": document_id,
        "document_name": document_name,
        "total_pages": len(pages),
        "total_chunks": len(embedded_chunks),
        "status": "success"
    }
