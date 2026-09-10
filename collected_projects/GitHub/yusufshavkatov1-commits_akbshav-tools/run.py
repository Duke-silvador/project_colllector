from __future__ import annotations

import uvicorn
from common.config import WEB_PORT

if __name__ == "__main__":
    uvicorn.run("webapp.main:app", host="0.0.0.0", port=WEB_PORT)
