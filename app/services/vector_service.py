
import uuid

from qdrant_client import QdrantClient, models


# Local database storage directory
QDRANT_PATH = "qdrant_data"

# Collection name
COLLECTION_NAME = "documind_documents"

# Embedding model produces 384-dimensional vectors
VECTOR_SIZE = 384


# Initialize local Qdrant database
client = QdrantClient(path=QDRANT_PATH)


def create_collection():
    """
    Create the Qdrant collection if it does not already exist.
    """

    if client.collection_exists(COLLECTION_NAME):
        print("Collection already exists.")
        return

    client.create_collection(
        collection_name=COLLECTION_NAME,
        vectors_config=models.VectorParams(
            size=VECTOR_SIZE,
            distance=models.Distance.COSINE
        )
    )

    print("Collection created successfully!")


def recreate_collection():
    """
    Delete the existing collection and create a fresh one.

    WARNING: This deletes all vectors in this collection.
    """

    if client.collection_exists(COLLECTION_NAME):
        client.delete_collection(COLLECTION_NAME)
        print("Old collection deleted.")

    create_collection()


def store_embeddings(
    embedded_chunks: list[dict],
    document_id: str,
    document_name: str
):
    """
    Store document chunks and their embeddings in Qdrant.
    """

    points = []

    for chunk in embedded_chunks:

        # Generate a stable UUID for each document chunk
        point_id = str(
            uuid.uuid5(
                uuid.NAMESPACE_URL,
                f"{document_id}:{chunk['chunk_id']}"
            )
        )

        points.append(
            models.PointStruct(
                id=point_id,
                vector=chunk["embedding"],
                payload={
                    "document_id": document_id,
                    "chunk_id": chunk["chunk_id"],
                    "document_name": document_name,
                    "page_number": chunk["page_number"],
                    "text": chunk["text"]
                }
            )
        )

    if points:
        client.upsert(
            collection_name=COLLECTION_NAME,
            points=points
        )

    print(f"Successfully stored {len(points)} chunks!")


def search_similar_chunks(
    query_embedding: list[float],
    limit: int = 5,
    document_ids: list[str] | None = None
):
    """
    Search for semantically similar document chunks.

    If document_ids are provided, search only those documents.
    Otherwise, search across the entire collection.
    """

    search_filter = None

    if document_ids:
        search_filter = models.Filter(
            must=[
                models.FieldCondition(
                    key="document_id",
                    match=models.MatchAny(any=document_ids)
                )
            ]
        )

    results = client.query_points(
        collection_name=COLLECTION_NAME,
        query=query_embedding,
        query_filter=search_filter,
        limit=limit,
        with_payload=True
    ).points

    return results


def delete_document_vectors(document_id: str) -> int:
    """
    Delete all Qdrant vectors belonging to one document.

    Returns the number of vectors deleted.
    """

    if not document_id.strip():
        raise ValueError("Document ID cannot be empty.")

    if not client.collection_exists(COLLECTION_NAME):
        return 0

    # Find all vectors belonging to this document
    document_filter = models.Filter(
        must=[
            models.FieldCondition(
                key="document_id",
                match=models.MatchValue(value=document_id)
            )
        ]
    )

    # Count vectors before deletion
    total_vectors = client.count(
        collection_name=COLLECTION_NAME,
        count_filter=document_filter,
        exact=True
    ).count

    # Delete only this document's vectors
    if total_vectors > 0:
        client.delete(
            collection_name=COLLECTION_NAME,
            points_selector=models.FilterSelector(
                filter=document_filter
            ),
            wait=True
        )

    return total_vectors

def close_qdrant_client():
    """Close the local Qdrant client."""
    client.close()