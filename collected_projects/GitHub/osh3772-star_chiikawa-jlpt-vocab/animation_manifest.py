"""Strict, dependency-free packaging of optional approved animation sequences."""
import json
import math
import struct
from pathlib import Path


def _number(value):
    return isinstance(value, (float, int)) and not isinstance(value, bool) and math.isfinite(value)


def load_manifests(root, profiles, data_uri):
    root = Path(root).resolve()
    results = {}
    cache = {}
    for path in sorted((root / 'chiikawa-pets/action-manifests').glob('*.json')):
        manifest = json.loads(path.read_text(encoding='utf-8'))
        who = manifest.get('characterId')
        assert who in profiles and who == path.stem, f'{path}: character identity mismatch'
        assert manifest.get('approvalStatus') in ('draft', 'reviewed', 'approved'), path
        if manifest['approvalStatus'] != 'approved':
            print(f'Animation candidate not enabled: {who} ({manifest["approvalStatus"]})')
            continue
        assert manifest.get('modelVersion'), f'{who}: modelVersion required'
        assert who not in results, f'{who}: duplicate manifest'
        assert manifest.get('actions'), f'{who}: actions required'
        manifest['assets'] = {}
        for action, entry in manifest['actions'].items():
            assert entry.get('views'), f'{who}/{action}: explicit views required'
            for direction, view in entry['views'].items():
                label = f'{who}/{action}/{direction}'
                assert direction in ('front', 'left', 'right', 'back'), label
                assert not view.get('mirror'), f'{label}: mirrored views not supported; supply direction artwork'
                frames = view.get('frames', [])
                assert len(frames) >= 2, f'{label}: sequences need multiple frames'
                assert isinstance(view.get('loop'), bool), f'{label}: explicit loop flag required'
                identities = set()
                duration = 0
                for frame in frames:
                    assert frame.get('frameId'), label
                    ms = frame.get('durationMs')
                    assert _number(ms) and 0 < ms <= 5000, f'{label}: invalid duration'
                    duration += ms
                    pivot = frame.get('pivot')
                    assert isinstance(pivot, list) and len(pivot) == 2 and all(_number(v) and 0 <= v <= 1 for v in pivot), f'{label}: normalized pivot required'
                    asset = (root / frame['assetPath']).resolve()
                    assert asset.is_relative_to(root) and asset.is_file(), f'{label}: asset outside repository or missing'
                    assert asset.suffix.lower() == '.png', f'{label}: use PNG frames'
                    raw = asset.read_bytes()
                    assert raw[:8] == b'\x89PNG\r\n\x1a\n', f'{label}: invalid PNG'
                    width, height = struct.unpack('>II', raw[16:24])
                    frame['assetSize'] = [width, height]
                    rect = frame.get('sourceRect')
                    if rect is not None:
                        assert len(rect) == 4 and all(_number(v) and v >= 0 for v in rect), f'{label}: invalid rectangle'
                        x, y, w, h = rect
                        assert w > 0 and h > 0 and x + w <= width and y + h <= height, f'{label}: rectangle out of image'
                        frame['assetSize'] = [width, height]
                    identities.add((raw, tuple(rect or [])))
                    if asset not in cache:
                        cache[asset] = data_uri(asset)
                    frame['assetKey'] = frame['assetPath']
                    manifest['assets'][frame['assetKey']] = cache[asset]
                    if action == 'walk':
                        flags = frame.get('contactFlags')
                        assert isinstance(flags, dict) and all(isinstance(flags.get(k), bool) for k in ('L', 'R')), f'{label}: foot contacts required'
                assert len(identities) >= 2, f'{label}: repeated identical images are not a cycle'
                if 'totalDurationMs' in view:
                    assert abs(view['totalDurationMs'] - duration) < .001, f'{label}: duration sum mismatch'
                if action == 'walk':
                    assert direction in ('left', 'right'), f'{label}: walk needs actual direction'
                    assert view['loop'] and _number(view.get('rootDistance')) and 0 < view['rootDistance'] <= 4, f'{label}: width-normalized stride required'
                    assert any(any(f['contactFlags'].values()) for f in frames), f'{label}: no ground contact'
        results[who] = manifest
    return results
