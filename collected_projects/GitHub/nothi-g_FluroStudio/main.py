"""Browser entry point for the pygbag build.

On desktop this behaves like `python FluroStudio.py`; in the browser the
asyncio runtime drives FluroStudio's frame loop.
"""

import asyncio
import sys

import FluroStudio

if __name__ == '__main__':
    if FluroStudio.IS_WEB:
        asyncio.run(FluroStudio.amain())
    else:
        sys.exit(FluroStudio.main())
