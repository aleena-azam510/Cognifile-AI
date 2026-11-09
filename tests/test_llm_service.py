
from unittest.mock import MagicMock, patch

import pytest

from app.services import llm_service


def test_generate_answer_success():
    mock_client = MagicMock()

    mock_client.models.generate_content.return_value.text = (
        "Artificial intelligence is transforming technology."
    )

    with patch.object(llm_service, "client", mock_client):
        result = llm_service.generate_answer(
            "What is artificial intelligence?"
        )

    assert result == (
        "Artificial intelligence is transforming technology."
    )

    mock_client.models.generate_content.assert_called_once_with(
        model=llm_service.MODEL_NAME,
        contents="What is artificial intelligence?"
    )


def test_generate_answer_with_empty_prompt():
    with pytest.raises(
        ValueError,
        match="Prompt cannot be empty"
    ):
        llm_service.generate_answer("   ")


def test_generate_answer_with_empty_response():
    mock_client = MagicMock()
    mock_client.models.generate_content.return_value.text = None

    with patch.object(llm_service, "client", mock_client):
        with pytest.raises(
            ValueError,
            match="Gemini returned an empty response"
        ):
            llm_service.generate_answer("What is AI?")


def test_generate_answer_server_error_without_retry():
    class TemporaryServerError(Exception):
        pass

    mock_client = MagicMock()

    mock_client.models.generate_content.side_effect = (
        TemporaryServerError("Temporary server failure")
    )

    with patch.object(llm_service, "client", mock_client), \
         patch.object(
             llm_service.errors,
             "ServerError",
             TemporaryServerError
         ):

        with pytest.raises(
            RuntimeError,
            match="Gemini server unavailable"
        ):
            llm_service.generate_answer("What is AI?")

    mock_client.models.generate_content.assert_called_once()


def test_generate_answer_client_error_without_retry():
    class TemporaryClientError(Exception):
        pass

    mock_client = MagicMock()

    mock_client.models.generate_content.side_effect = (
        TemporaryClientError("Invalid request")
    )

    with patch.object(llm_service, "client", mock_client), \
         patch.object(
             llm_service.errors,
             "ClientError",
             TemporaryClientError
         ):

        with pytest.raises(
            RuntimeError,
            match="Gemini request rejected"
        ):
            llm_service.generate_answer("What is AI?")

    mock_client.models.generate_content.assert_called_once()
