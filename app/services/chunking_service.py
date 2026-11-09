
def create_chunks(
    pages: list[dict],
    chunk_size: int = 1000,
    overlap: int = 200
) -> list[dict]:
    """
    Split extracted PDF page text into smaller chunks.

    Each chunk retains its original page number
    so we can provide accurate citations later.
    """

    if chunk_size <= 0:
        raise ValueError("chunk_size must be greater than zero.")

    if overlap < 0 or overlap >= chunk_size:
        raise ValueError(
            "overlap must be non-negative and smaller than chunk_size."
        )

    chunks = []
    chunk_id = 1

    step = chunk_size - overlap

    for page in pages:
        text = page["text"].strip()
        page_number = page["page_number"]

        if not text:
            continue

        start = 0

        while start < len(text):
            end = start + chunk_size

            chunk_text = text[start:end].strip()

            if chunk_text:
                chunks.append({
                    "chunk_id": chunk_id,
                    "page_number": page_number,
                    "text": chunk_text
                })

                chunk_id += 1

            start += step

    return chunks
