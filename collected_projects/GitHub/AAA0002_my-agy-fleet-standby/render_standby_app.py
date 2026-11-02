"""
render_standby_app.py
Forwarding proxy to canonical app.py.
Maintains 100% backwards compatibility while eliminating redundant duplicate code.
"""
from app import *

if __name__ == "__main__":
    import uvicorn
    import os
    port = int(os.getenv("PORT", 10000))
    uvicorn.run("app:app", host="0.0.0.0", port=port, reload=False)
