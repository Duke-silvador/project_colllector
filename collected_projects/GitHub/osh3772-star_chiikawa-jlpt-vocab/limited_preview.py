"""Load the separately authorized one-pose Momonga preview, not canon animation."""
import hashlib
import json
import struct
from pathlib import Path
from evidence_registry import require, safe_relative


def load_momonga_preview(root, data_uri):
    root = Path(root).resolve()
    path = root / 'chiikawa-pets/limited-previews/momonga.json'
    if not path.exists():
        return None
    config = json.loads(path.read_text())
    require(config.get('schemaVersion') == 1 and config.get('enabledByDefault') is False,
            'Limited preview must remain opt-in and schema1')
    docs = {}
    for role, item in config['reviews'].items():
        review_path = (root / safe_relative(item['path'])).resolve()
        require(review_path.is_relative_to(root), 'Review path escapes project')
        raw = review_path.read_bytes()
        require(hashlib.sha256(raw).hexdigest() == item['sha256'], 'Preview review changed; explicit re-review required')
        docs[role] = json.loads(raw)
    art, contract = docs['art'], docs['contract']
    require(art.get('root_preview_authorization') == 'APPROVED_FOR_PREVIEW_TESTING', 'Root preview authorization missing')
    require(contract.get('review_gate', {}).get('preview_testing_authorized') is True,
            'Limited-preview testing is not authorized')
    require(art.get('art_validation') == 'PASS' and art.get('art_scope') == 'LIMITED_PREVIEW_BODY_ONLY', 'Wrong art approval scope')
    require(art.get('body_pose_count') == 1 and art.get('character_id') == 'momonga', 'Only one fixed Momonga body pose is allowed')
    require(art.get('mapping_id') == contract.get('mapping_id') == 'momonga.web_airborne_pass', 'Mapping identity mismatch')
    require(art.get('body_action_ref') == contract.get('body_action_ref') == 'momonga.video_airborne_spread', 'Body evidence mismatch')
    require(art.get('observed_body_ref') == contract.get('observed_body_ref'), 'Body observation mismatch')
    asset = (root / safe_relative(config['assetPath'])).resolve()
    require(asset.is_relative_to(root) and asset.is_file(), 'Missing/escaped preview image')
    raw = asset.read_bytes()
    sha = hashlib.sha256(raw).hexdigest()
    require(sha == config['assetSha256'] == art['sha256'] == contract['art_review']['sha256'], 'Preview image differs from reviewed body')
    require(raw[:8] == b'\x89PNG\r\n\x1a\n', 'Preview must be PNG')
    dimensions = list(struct.unpack('>II', raw[16:24]))
    require(dimensions == art['dimensions'], 'Preview image geometry mismatch')
    require(config.get('durationMs') == 1800 and config.get('durationOrigin') == 'AUTHORED_WEB_UX', 'Preview duration is an authored UX value, not video timing')
    return {'schemaVersion': 1, 'mappingId': art['mapping_id'], 'bodyActionRef': art['body_action_ref'],
            'testingAuthorized': True, 'enabledByDefault': False, 'productionEnabled': False,
            'sourceRepresentation': 'DERIVED_REFERENCE_CUTOUT', 'originalPixels': False,
            'bodyPoseCount': 1, 'assetSha256': sha, 'assetSize': dimensions, 'source': data_uri(asset),
            'durationMs': config['durationMs'], 'durationOrigin': 'AUTHORED_WEB_UX',
            'reviewId': art['review_id'], 'qaStatus': 'LIMITED_PREVIEW_RUNTIME_TESTING',
            'label': '영상 자세 참고 + 웹 이동 연출',
            'limitations': '파생 정지 그림 1장 · 원작 궤적/속도 재현 아님 · 이륙/착지/날갯짓 없음'}
