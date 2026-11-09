import os

from dotenv import load_dotenv
from google import genai
from google.genai import errors, types

load_dotenv()

API_KEY = os.getenv("GEMINI_API_KEY")

if not API_KEY:
    raise ValueError("GEMINI_API_KEY not found in .env file")

client = genai.Client(
    api_key=API_KEY,
    http_options=types.HttpOptions(timeout=60000),
)

MODEL_NAME = "gemini-3.5-flash-lite"


def generate_answer(prompt: str) -> str:
    """Generate an answer using Gemini without application-level retries."""

    if not prompt.strip():
        raise ValueError("Prompt cannot be empty.")

    try:
        print("Sending request to Gemini...", flush=True)

        response = client.models.generate_content(
            model=MODEL_NAME,
            contents=prompt,
        )

        if not response.text:
            raise ValueError("Gemini returned an empty response.")

        print("Gemini response received successfully.", flush=True)
        return response.text

    except errors.ClientError as error:
        print(f"Gemini client error: {error!r}", flush=True)
        raise RuntimeError(f"Gemini request rejected: {error}") from error

    except errors.ServerError as error:
        print(f"Gemini server error: {error!r}", flush=True)
        raise RuntimeError(f"Gemini server unavailable: {error}") from error

    except errors.APIError as error:
        print(f"Gemini API error: {error!r}", flush=True)
        raise RuntimeError(f"Gemini API error: {error}") from error