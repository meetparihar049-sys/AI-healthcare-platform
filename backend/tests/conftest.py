import pytest_asyncio
from backend.core.database import init_db

@pytest_asyncio.fixture(scope="session", autouse=True)
async def setup_test_db():
    """Initializes the database schema before running tests."""
    await init_db()
