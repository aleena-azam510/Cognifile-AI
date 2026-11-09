
from qdrant_client import models
from sklearn.feature_extraction.text import ENGLISH_STOP_WORDS, TfidfVectorizer

from app.services.vector_service import (
    client,
    COLLECTION_NAME
)


CUSTOM_STOP_WORDS = {
    "figure", "figures", "table", "tables",
    "model", "models", "data", "based",
    "shown", "shows", "show",
    "results", "result", "study", "studies",
    "research", "paper", "proposed",
    "approach", "method", "methods",
    "system", "systems", "work",
    "different", "various", "following",
    "provide", "provides", "providing",
    "include", "includes", "including",
    "example", "examples", "new"
}

STOP_WORDS = list(ENGLISH_STOP_WORDS.union(CUSTOM_STOP_WORDS))


def get_document_chunks(document_id: str) -> list[dict]:
    """
    Retrieve all indexed text chunks for one document from Qdrant.
    """

    if not document_id.strip():
        raise ValueError("Document ID cannot be empty.")

    if not client.collection_exists(COLLECTION_NAME):
        return []

    scroll_filter = models.Filter(
        must=[
            models.FieldCondition(
                key="document_id",
                match=models.MatchValue(value=document_id)
            )
        ]
    )

    all_chunks = []
    offset = None

    while True:
        records, next_offset = client.scroll(
            collection_name=COLLECTION_NAME,
            scroll_filter=scroll_filter,
            limit=500,
            offset=offset,
            with_payload=True,
            with_vectors=False
        )

        for record in records:
            if record.payload:
                text = record.payload.get("text", "")

                if text.strip():
                    all_chunks.append({
                        "text": text,
                        "page_number": record.payload.get("page_number"),
                        "chunk_id": record.payload.get("chunk_id")
                    })

        if next_offset is None:
            break

        offset = next_offset

    return all_chunks


def extract_document_topics(
    document_id: str,
    top_n: int = 8
) -> dict:
    """
    Extract meaningful topics from a document using TF-IDF.
    """

    if top_n <= 0:
        raise ValueError("top_n must be greater than zero.")

    chunks = get_document_chunks(document_id)

    if not chunks:
        return {
            "document_id": document_id,
            "total_chunks": 0,
            "topics": []
        }

    texts = [chunk["text"] for chunk in chunks]

    vectorizer = TfidfVectorizer(
        stop_words=STOP_WORDS,
        ngram_range=(1, 2),
        max_features=5000,
        max_df=0.95,
        min_df=2,
        sublinear_tf=True,
        token_pattern=r"(?u)\b[a-zA-Z][a-zA-Z]+\b"
    )

    try:
        matrix = vectorizer.fit_transform(texts)
    except ValueError:
        return {
            "document_id": document_id,
            "total_chunks": len(chunks),
            "topics": []
        }

    terms = vectorizer.get_feature_names_out()
    scores = matrix.mean(axis=0).A1

    ranked_indices = sorted(
        range(len(terms)),
        key=lambda index: (
            scores[index] * (
                1.15 if " " in terms[index] else 1.0
            )
        ),
        reverse=True
    )

    topics = []

    for index in ranked_indices:

        if len(topics) >= top_n:
            break

        keyword = terms[index]
        score = float(scores[index])

        matching_chunks = [
            chunk
            for chunk, row in zip(chunks, matrix)
            if row[0, index] > 0
        ]

        if not matching_chunks:
            continue

        pages = sorted({
            chunk["page_number"]
            for chunk in matching_chunks
            if chunk["page_number"] is not None
        })

        topics.append({
            "rank": len(topics) + 1,
            "topic": keyword,
            "score": round(score, 4),
            "pages": pages,
            "related_chunks": len(matching_chunks)
        })

    return {
        "document_id": document_id,
        "total_chunks": len(chunks),
        "topics": topics
    }
