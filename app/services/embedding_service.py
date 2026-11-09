
from sentence_transformers import SentenceTransformer


# Load the embedding model
MODEL_NAME = "sentence-transformers/all-MiniLM-L6-v2"

model = SentenceTransformer(MODEL_NAME)


def generate_embedding(text: str) -> list[float]:
    """
    Convert text into a numerical embedding vector.
    """

    if not text.strip():
        raise ValueError("Cannot generate embedding for empty text.")

    embedding = model.encode(text)

    return embedding.tolist()

def generate_embeddings(chunks: list[dict]) -> list[dict]:
    """
    Generate embeddings for multiple text chunks in batches.

    Each chunk retains its original metadata and receives
    an additional embedding field.
    """

    if not chunks:
        return []

    texts = [chunk["text"] for chunk in chunks]

    if any(not text.strip() for text in texts):
        raise ValueError("Chunks must not contain empty text.")

    embeddings = model.encode(
        texts,
        batch_size=32,
        show_progress_bar=True,
        normalize_embeddings=True
    )

    results = []

    for chunk, embedding in zip(chunks, embeddings):
        results.append({
            **chunk,
            "embedding": embedding.tolist()
        })

    return results
