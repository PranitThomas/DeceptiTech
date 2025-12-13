#!/usr/bin/env python
"""Start the NLP service server using the virtual environment's Python."""
import sys
import os
from pathlib import Path

# Ensure we're using the correct Python
venv_python = Path(__file__).parent / ".venv" / "Scripts" / "python.exe"
if venv_python.exists():
    # Verify we're using the venv Python
    if sys.executable != str(venv_python):
        print(f"Warning: Using {sys.executable} instead of {venv_python}")
        print("Please run this script with: .venv\\Scripts\\python.exe start_server.py")

import uvicorn

if __name__ == "__main__":
    # Run the server
    uvicorn.run(
        "server:app",
        host="127.0.0.1",
        port=8001,
        reload=False,  # Disable reload to avoid subprocess issues
        log_level="info"
    )

