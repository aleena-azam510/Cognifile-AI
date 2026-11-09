
import json
from pathlib import Path

from app.services.embedding_service import generate_embedding
from app.services.vector_service import (
    search_similar_chunks,
    client
)

THRESHOLD = 0.35
TOP_K = 5

DOCUMENT_ID = "b939e7a8-2109-41a3-8ef7-4b7fdea6caa4"

DATASET_PATH = Path(__file__).parent / "evaluation_dataset.json"


def is_relevant_chunk(chunk, expected_keywords):
    text = chunk.payload.get("text", "").lower()

    return any(
        keyword.lower() in text
        for keyword in expected_keywords
    )


def evaluate_retrieval():
    with open(DATASET_PATH, "r", encoding="utf-8") as file:
        dataset = json.load(file)

    correct = 0
    precision_scores = []

    try:
        for item in dataset:
            question = item["question"]
            expected_type = item["type"]
            expected_keywords = item["expected_keywords"]

            embedding = generate_embedding(question)

            results = search_similar_chunks(
                query_embedding=embedding,
                limit=TOP_K,
                document_ids=[DOCUMENT_ID]
            )

            # Apply similarity threshold
            relevant_results = [
                result for result in results
                if result.score >= THRESHOLD
            ]

            # Evaluate retrieval classification
            passed = (
                len(relevant_results) > 0
                if expected_type == "relevant"
                else len(relevant_results) == 0
            )

            if passed:
                correct += 1

            # Calculate Precision@5 for relevant questions
            if expected_keywords:
                relevant_chunks = [
                    result for result in results
                    if (
                        result.score >= THRESHOLD
                        and is_relevant_chunk(result, expected_keywords)
                    )
                ]

                precision_at_5 = len(relevant_chunks) / TOP_K
                precision_scores.append(precision_at_5)

                print(f"Precision@5: {precision_at_5:.2f}")

            print(f"\nQuestion: {question}")
            print(f"Expected: {expected_type}")
            print(f"Retrieved: {len(relevant_results)} chunks")
            print(f"Result: {'PASS' if passed else 'FAIL'}")

        accuracy = (correct / len(dataset)) * 100

        print("\n--- Evaluation Summary ---")
        print(f"Passed: {correct}/{len(dataset)}")
        print(f"Retrieval classification accuracy: {accuracy:.2f}%")

        if precision_scores:
            average_precision = (
                sum(precision_scores) / len(precision_scores)
            )

            print(
                f"Average Precision@5: "
                f"{average_precision:.2f}"
            )

    finally:
        client.close()


if __name__ == "__main__":
    evaluate_retrieval()
