
import re

from app.services.embedding_service import generate_embedding
from app.services.vector_service import search_similar_chunks
from app.services.llm_service import generate_answer


SIMILARITY_THRESHOLD = 0.35


def answer_question(
    question: str,
    document_ids: list[str] | None = None,
    limit: int = 5
) -> dict:
    """
    Answer questions using retrieved document context.

    Supports single-document and multi-document question answering.
    Returns only verified sources cited in the answer.
    """

    # STEP 1: Validate input
    if not question.strip():
        raise ValueError("Question cannot be empty.")

    if limit <= 0:
        raise ValueError("Limit must be greater than zero.")

    if document_ids is not None:
        if not document_ids:
            raise ValueError("At least one document ID is required.")

        if any(not document_id.strip() for document_id in document_ids):
            raise ValueError("Document IDs cannot be empty.")

        document_ids = list(dict.fromkeys(document_ids))

    # STEP 2: Generate question embedding
    question_embedding = generate_embedding(question)

    # STEP 3: Retrieve relevant chunks
    retrieved_chunks = search_similar_chunks(
        query_embedding=question_embedding,
        limit=limit,
        document_ids=document_ids
    )

    # STEP 4: Filter low-relevance chunks
    retrieved_chunks = [
        chunk for chunk in retrieved_chunks
        if chunk.score >= SIMILARITY_THRESHOLD
    ]

    if not retrieved_chunks:
        return {
            "answer": (
                "I could not find relevant information "
                "in the selected documents."
            ),
            "sources": []
        }

    # STEP 5: Build context and source metadata
    context_parts = []
    sources = []

    for index, result in enumerate(retrieved_chunks, start=1):
        payload = result.payload or {}

        source_id = f"S{index}"
        document_name = payload.get(
            "document_name", "Unknown document"
        )
        page_number = payload.get("page_number")
        chunk_id = payload.get("chunk_id")
        text = payload.get("text", "")

        context_parts.append(
            f"""
Source ID: {source_id}
Document: {document_name}
Page: {page_number}
Content:
{text}
"""
        )

        sources.append({
            "source_id": source_id,
            "document_id": payload.get("document_id"),
            "document_name": document_name,
            "page_number": page_number,
            "chunk_id": chunk_id,
            "score": result.score,
            "text": text
        })

    context = "\n\n".join(context_parts)

    # STEP 6: Create faithfulness-focused prompt
    prompt = f"""
You are Cognifile AI, an intelligent document assistant.

Answer the user's question using ONLY the provided
document context.

STRICT GROUNDING RULES:

1. Use only facts explicitly supported by the document context.
2. Never use outside knowledge to fill missing information.
3. Never invent names, dates, numbers, statistics, or conclusions.
4. Do not make assumptions beyond what the documents state.
5. If information is incomplete, explain what is missing.
6. If the answer cannot be found, clearly say so.
7. Cite every factual claim using its supporting source ID.
8. Use citations exactly in this format: [S1], [S2].
9. Only use source IDs provided in the context.
10. Do not cite a source unless it supports the associated claim.
11. Distinguish clearly between facts and interpretations.
12. Keep the answer clear and concise.

DOCUMENT CONTEXT:

{context}

USER QUESTION:

{question}

ANSWER:
"""

    # STEP 7: Diagnostic prompt information
    print(f"RAG prompt size: {len(prompt)} characters", flush=True)
    print(f"Retrieved chunks: {len(retrieved_chunks)}", flush=True)

    # STEP 8: Generate answer
    answer = generate_answer(prompt)

    # STEP 9: Validate citation IDs
    valid_ids = {
        source["source_id"] for source in sources
    }

    cited_ids = set(
        re.findall(r"\[(S\d+)\]", answer)
    )

    verified_ids = cited_ids.intersection(valid_ids)

    # Remove invalid citation markers
    answer = re.sub(
        r"\[S\d+\]",
        lambda match: (
            match.group(0)
            if match.group(0)[1:-1] in valid_ids
            else ""
        ),
        answer
    )

    # Reject answers without verifiable citations
    if not verified_ids:
        return {
            "answer": (
                "I could not find sufficient information "
                "in the selected documents."
            ),
            "sources": []
        }

    # STEP 10: Return verified cited sources
    verified_sources = [
        source for source in sources
        if source["source_id"] in verified_ids
    ]

    return {
        "answer": answer.strip(),
        "sources": verified_sources
    }
