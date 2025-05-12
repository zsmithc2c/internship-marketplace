# pipeline_agents/openai_client.py
"""
Shared AsyncOpenAI client (singleton).

Import `client` wherever you need OpenAI calls to avoid the 150-250 ms
cold-init penalty on every request.
"""

from openai import AsyncOpenAI

client = AsyncOpenAI()  # single, reusable connection pool
