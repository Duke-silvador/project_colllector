"""Import only the root-authorized reviewed body PNG unchanged; no image editing."""
import argparse
import hashlib
import json
from pathlib import Path
import shutil
from evidence_registry import require
from limited_preview import load_momonga_preview


def prepare(source_root, root):
    source_root, root = Path(source_root).resolve(), Path(root).resolve()
    folder = root / 'chiikawa-pets/limited-previews'
    art_path = source_root / 'character-design/momonga_preview_art_manifest.ko.json'
    contract_path = source_root / 'character-design/momonga_limited_preview_contract.ko.json'
    art, contract = json.loads(art_path.read_text()), json.loads(contract_path.read_text())
    require(art.get('root_preview_authorization') == 'APPROVED_FOR_PREVIEW_TESTING', 'No root authorization')
    require(contract.get('review_gate', {}).get('preview_testing_authorized') is True, 'No reviewed preview contract')
    asset = Path(art['asset_path']).resolve()
    require(asset.is_relative_to(source_root), 'Asset outside explicitly selected source root')
    raw = asset.read_bytes()
    sha = hashlib.sha256(raw).hexdigest()
    require(sha == art['sha256'] == contract['art_review']['sha256'], 'Reviewed asset hash mismatch')
    destination = folder / 'assets/momonga-ep27-derived-body-r3.png'
    destination.parent.mkdir(parents=True, exist_ok=True)
    destination.write_bytes(raw)
    reviews = {}
    for role, source in [('art', art_path), ('contract', contract_path)]:
        target = folder / 'review' / source.name
        target.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(source, target)
        reviews[role] = {'path': str(target.relative_to(root)), 'sha256': hashlib.sha256(target.read_bytes()).hexdigest()}
    config = {'schemaVersion': 1, 'enabledByDefault': False,
              'assetPath': str(destination.relative_to(root)), 'assetSha256': sha,
              'durationMs': 1800, 'durationOrigin': 'AUTHORED_WEB_UX', 'reviews': reviews}
    (folder / 'momonga.json').write_text(json.dumps(config, ensure_ascii=False, indent=2) + '\n')
    return load_momonga_preview(root, lambda _: 'validation-only')


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--source-root', type=Path, required=True)
    args = parser.parse_args()
    result = prepare(args.source_root, Path(__file__).resolve().parent)
    print(f'Copied reviewed body unchanged: {result["assetSha256"]}; explicit preview only, production disabled')
