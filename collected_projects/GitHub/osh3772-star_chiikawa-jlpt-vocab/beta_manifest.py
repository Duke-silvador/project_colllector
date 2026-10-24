"""Package explicitly opt-in Chiikawa artwork without granting production approval."""
import copy
import json
import math
import struct
from pathlib import Path


def load_chiikawa_beta(root, data_uri):
    root = Path(root).resolve()
    path = root / 'chiikawa-pets/draft-preview/config.json'
    if not path.exists():
        return None
    config = json.loads(path.read_text())
    assert config['characterId'] == 'chiikawa' and config['approvalStatus'] == 'draft'
    manifest = {'characterId': 'chiikawa', 'approvalStatus': 'draft', 'experimental': True,
                'modelVersion': 'chiikawa-opt-in-beta-20261024', 'assets': {}, 'actions': {}}

    def view(family, frames=None, loop=None):
        asset = (root / family['assetPath']).resolve()
        assert asset.is_relative_to(root) and asset.is_file()
        raw = asset.read_bytes()
        assert raw[:8] == b'\x89PNG\r\n\x1a\n'
        size = list(struct.unpack('>II', raw[16:24]))
        assert size == family['assetSize'], 'Beta sheet dimensions differ from metadata'
        key = family['assetPath']
        manifest['assets'][key] = data_uri(asset)
        output = []
        for original in (frames if frames is not None else family['frames']):
            frame = copy.deepcopy(original)
            x, y, w, h = frame['sourceRect']
            assert all(isinstance(n, (int, float)) and math.isfinite(n) for n in [x,y,w,h])
            assert x >= 0 and y >= 0 and w > 0 and h > 0 and x+w <= size[0] and y+h <= size[1]
            assert all(0 <= n <= 1 for n in frame['pivot'])
            frame.setdefault('durationMs', 120)
            assert 0 < frame['durationMs'] <= 5000
            frame.update(assetKey=key, assetSize=size, renderScale=family.get('uniformScale', 1) * w / config['frames'][0]['sourceRect'][2])
            output.append(frame)
        result = {'frames': output, 'loop': family.get('loop', False) if loop is None else loop}
        assert not family.get('contactLock'), 'Contact-lock solver is not implemented; keep this flag false'
        return result

    def action(name, family, frames=None, loop=None, direction='front'):
        result = view(family, frames, loop)
        manifest['actions'].setdefault(name, {'views': {}})['views'][direction] = result
        return result

    neutral = config.get('landing', config)
    action('idle', neutral, [neutral['frames'][-1] if config.get('landing') else neutral['frames'][0]], False)
    action('step-in-place', config)
    if config.get('held'):
        held = config['held']
        action('grab-onset', held, [dict(held['frames'][0], durationMs=100)], False)
        action('hold', held)
        action('release', held, [dict(held['releaseFrame'], durationMs=120)], False)
        action('fall', held, [dict(held['releaseFrame'], durationMs=120)], True)
    if config.get('landing'):
        action('landing', config['landing'])
        action('recover', config['landing'], [dict(config['landing']['frames'][-1], durationMs=160)], False)
    directional_views = list(config.get('directionalWalks', {}).values())
    if config.get('directionalWalk'):
        directional_views.append(config['directionalWalk'])
    for directional in directional_views:
        # Never reinterpret frontal poses as a directional walk or mirror art.
        direction = directional['direction']
        assert direction in ('left', 'right')
        assert len(directional['frames']) >= 2
        walk = action('walk', directional, direction=direction)
        walk['rootDistance'] = directional['rootDistancePx'] / 240
        assert 0 < walk['rootDistance'] <= 4
        action('walk-start', directional, [dict(directional['frames'][0], durationMs=120)], False, direction)
        action('walk-stop', directional, [dict(directional['frames'][-1], durationMs=140)], False, direction)
    return manifest
