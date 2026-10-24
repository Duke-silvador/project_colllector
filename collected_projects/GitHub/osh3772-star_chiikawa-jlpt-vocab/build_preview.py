"""Build the isolated, explicitly unapproved art lab; does not touch production."""
import base64
import json
from pathlib import Path

root = Path(__file__).resolve().parent
folder = root / 'chiikawa-pets/draft-preview'
config = json.loads((folder / 'config.json').read_text())
assert config['approvalStatus'] == 'draft', 'This lab must never claim production approval'
asset = (root / config['assetPath']).resolve()
assert asset.is_relative_to(root) and asset.is_file()
config['source'] = 'data:image/png;base64,' + base64.b64encode(asset.read_bytes()).decode('ascii')
for action in ('held', 'landing'):
    family = config.get(action)
    if family:
        action_asset = (root / family['assetPath']).resolve()
        assert action_asset.is_relative_to(root) and action_asset.is_file()
        family['source'] = 'data:image/png;base64,' + base64.b64encode(action_asset.read_bytes()).decode('ascii')
# Reuse the tested pure timing helper, not the production approval resolver.
engine = (root / 'chiikawa-pets/pet-engine.js').read_text()
helper = engine[engine.index('export function samplePetSequence'):engine.index('export function petReleaseVelocity')].replace('export function ', 'function ')
html = (folder / 'preview.template.html').read_text()
html = html.replace('__DRAFT_CONFIG__', json.dumps(config, ensure_ascii=False).replace('<', '\\u003c'))
html = html.replace('__TIMING_HELPER__', helper)
output = root / '치이카와_동작_초안.html'
output.write_text(html, encoding='utf-8')
print(f'DRAFT preview built: {output.name} ({output.stat().st_size:,} bytes); production unchanged')
