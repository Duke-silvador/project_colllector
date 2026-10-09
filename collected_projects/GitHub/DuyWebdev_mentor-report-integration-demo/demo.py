"""Generate a mentor draft from synthetic fixtures, without API calls or tokens."""
from datetime import datetime, timezone
from pathlib import Path
import shutil
import sys

ROOT = Path(__file__).resolve().parent
sys.path.insert(0, str(ROOT / 'src'))
from report import generate

snapshot = ROOT / 'data/raw' / ('demo-' + datetime.now(timezone.utc).strftime('%Y%m%dT%H%M%S%fZ'))
shutil.copytree(ROOT / 'sample_data', snapshot)
generate(snapshot, 'DEMO OFFLINE — dữ liệu giả lập')
print('Demo successful. No APIs called.')
print('Report:', snapshot / 'MENTOR_REPORT_DRAFT.md')
print('Data:', snapshot / 'report_data.json')
