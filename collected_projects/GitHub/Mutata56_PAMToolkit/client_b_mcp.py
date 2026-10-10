

from pathlib import Path
import sys

sys.path.insert(0, str(Path(__file__).resolve().parent))
from dbjump.client_b_mcp_server import mcp

if __name__ == '__main__':
    mcp.run()
