import sys, os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
sys.path.insert(0, os.path.abspath("backend"))

import pytest
from app.core.database import SessionLocal

@pytest.fixture(scope="session", autouse=True)
def test_suite_setup():
    """
    Ensures safe test suite execution without wiping production/development database data.
    """
    yield

