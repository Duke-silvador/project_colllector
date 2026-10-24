"""Fail-closed evidence registry: discovery/review metadata, never motion approval.

No renderer bindings are shipped by this module. Candidate observations and
review markers cannot start an animation, even if a configuration is edited.
"""
import hashlib
import json
from pathlib import Path
from urllib.parse import urlparse

CHARACTERS = ('chiikawa', 'hachiware', 'usagi', 'momonga', 'rakko', 'shisa')
STATUSES = {'OBSERVED_PARTIAL', 'REACQUIRE_TIME', 'STILL_REFERENCE_ONLY',
            'HOLD_VIDEO_REQUIRED', 'VIDEO_SAMPLED_CONFIRMED', 'VIDEO_SAMPLED_ACTION_FRAGMENT'}
NON_MOTION = {'STILL_REFERENCE_ONLY', 'HOLD_VIDEO_REQUIRED'}


class EvidenceContractError(ValueError):
    pass


def require(condition, message):
    if not condition:
        raise EvidenceContractError(message)


def safe_relative(path):
    require(isinstance(path, str) and path, 'A non-empty relative path is required')
    parsed = Path(path)
    require(not parsed.is_absolute() and '..' not in parsed.parts and '\\' not in path,
            f'Unsafe evidence path: {path}')
    return parsed


def digest(value):
    return hashlib.sha256(json.dumps(value, ensure_ascii=False, sort_keys=True,
                                    separators=(',', ':')).encode()).hexdigest()


def compile_registry(contract, design, ledgers, runtime_enabled=False):
    require(runtime_enabled is False, 'Runtime activation is not implemented: keep runtime_enabled=false')
    require(contract.get('schema_version') in ('1.0', '1.1'), 'Unsupported evidence contract schema')
    require(contract.get('design_version') == design.get('version'), 'Contract/design version mismatch')
    require('video-only' in str(design.get('version', '')), 'Archived personality-based design cannot be activation input')
    candidates = {}
    for character in design.get('characters', []):
        who = character.get('id')
        require(who in CHARACTERS, f'Unknown character: {who}')
        for candidate in character.get('candidate_actions', []):
            key = candidate.get('id')
            require(isinstance(key, str) and key not in candidates and key.startswith(who + '.'), f'Duplicate/mismatched design action: {key}')
            candidates[key] = (who, candidate)
    entries = []
    seen = set()
    for entry in contract.get('entries', []):
        key, who = entry.get('action_id'), entry.get('character_id')
        require(key not in seen and key in candidates, f'Duplicate/unknown action ID: {key}')
        seen.add(key)
        expected_who, candidate = candidates[key]
        require(who == expected_who, f'Character mismatch: {key}')
        status = entry.get('evidence_status')
        require(status in STATUSES and status == candidate.get('status'), f'Evidence classification mismatch: {key}')
        require(entry.get('enabled') is False, f'{key}: new action activation is not implemented or authorized; keep enabled=false')
        require(entry.get('design_ref') == f'characters[{who}].candidate_actions[{key}]', f'Wrong design reference: {key}')
        ref = entry.get('observation_ref', {})
        ledger_path = str(safe_relative(ref.get('ledger')))
        require(ledger_path in ledgers, f'Missing observation ledger: {ledger_path}')
        url = ref.get('url', '')
        parsed = urlparse(url)
        require(parsed.scheme == 'https' and parsed.netloc and not parsed.username and not parsed.password,
                f'Invalid source URL: {key}')
        source = candidate.get('source', {})
        require(source.get('url') == url and source.get('ledger') == ledger_path,
                f'Contract source does not match reviewed design source: {key}')
        require(source.get('window_index') == ref.get('window_index'), f'Source window mismatch: {key}')
        require(source.get('record_id') == ref.get('record_id'), f'Source record mismatch: {key}')
        require(source.get('observation_indices', []) == ref.get('observation_indices', []), f'Observation subset mismatch: {key}')
        require(source.get('support_window_indices', []) == ref.get('support_window_indices', []), f'Support window mismatch: {key}')
        records = ledgers[ledger_path].get('records', [])
        if ref.get('record_id'):
            matches = [record for record in records if record.get('id') == ref['record_id']]
        else:
            matches = [record for record in records if record.get('episode') == ref.get('episode') and record.get('source') == url]
        require(len(matches) == 1 and matches[0].get('source') == url, f'Observation source unresolved/ambiguous: {key}')
        record = matches[0]
        reasons = ['runtime-binding-not-implemented', 'explicit-activation-off']
        window_index = ref.get('window_index')
        window = None
        if window_index is None:
            reasons.append('source-window-unresolved')
        else:
            require(isinstance(window_index, int) and not isinstance(window_index, bool) and window_index >= 0,
                    f'Invalid window index: {key}')
            windows = record.get('windows', [])
            require(window_index < len(windows), f'Observation window missing: {key}')
            window = windows[window_index]
            support = ref.get('support_window_indices', [])
            require(isinstance(support, list) and len(support) == len(set(support)) and all(isinstance(i, int) and not isinstance(i, bool) and 0 <= i < len(windows) for i in support), f'Invalid supporting windows: {key}')
            indices = ref.get('observation_indices', [])
            require(isinstance(indices, list) and len(indices) == len(set(indices)) and all(isinstance(i, int) and not isinstance(i, bool) and 0 <= i < len(window.get('observations', [])) for i in indices), f'Invalid observation indices: {key}')
        if status in NON_MOTION:
            reasons.append('not-video-motion-evidence')
        if status == 'REACQUIRE_TIME':
            reasons.append('timestamp-reacquisition-required')
        for field, approved, reason in [
            ('evidence_approval', 'APPROVED_VIDEO_FRAGMENT', 'video-fragment-not-approved'),
            ('design_approval', 'APPROVED_FRAGMENT', 'design-fragment-not-approved'),
            ('art_validation', 'PASS', 'art-not-reviewed'),
        ]:
            if entry.get(field) != approved:
                reasons.append(reason)
        asset_manifest = entry.get('asset_manifest')
        if asset_manifest is None:
            reasons.append('no-matching-art-manifest')
        else:
            safe_relative(asset_manifest)
            # Metadata is not an asset/pose review. No legacy beta auto-aliasing.
            reasons.append('asset-review-binding-not-implemented')
        for field, reason in [('safety_checks', 'safe-zone-and-cancel-not-reviewed'),
                              ('accessibility_checks', 'accessibility-not-reviewed')]:
            review = entry.get(field, {})
            if review.get('status') != 'PASS' or not review.get('review_id'):
                reasons.append(reason)
        entries.append({
            'actionId': key, 'characterId': who, 'title': candidate.get('title', key),
            'evidenceStatus': status, 'enabled': False,
            'observationRef': {k: ref[k] for k in ('ledger', 'episode', 'record_id', 'window_index', 'url', 'time_anchor_kind', 'observation_indices', 'support_window_indices') if k in ref},
            'observationDigest': digest(window if window is not None else record),
            'evidenceApproval': entry.get('evidence_approval'), 'designApproval': entry.get('design_approval'),
            'artValidation': entry.get('art_validation'), 'blockingReasons': reasons,
            'missingEvidence': entry.get('blocking_gaps', ''),
            'timingPolicy': 'Player readings are provenance only; never converted into animation durations.',
        })
    require(seen == set(candidates), 'Contract must cover exactly the current video-only design candidates')
    for item in contract.get('non_actions', []) + contract.get('holds', []):
        require(item.get('enabled') is False, 'Still references and HOLD scopes cannot be enabled')
    mapping_designs = {item['id']: item for item in design.get('layout_mappings', [])}
    mappings = []
    mapped_ids = set()
    for mapping in contract.get('mapping_entries', []):
        key = mapping.get('mapping_id')
        require(key in mapping_designs and key not in mapped_ids, f'Duplicate/unknown layout mapping: {key}')
        mapped_ids.add(key)
        require(mapping.get('enabled') is False, f'{key}: authored mapping runtime is not implemented; keep enabled=false')
        require(mapping.get('kind') == 'AUTHORED_WEB_PLACEMENT', f'Unsupported mapping kind: {key}')
        require(mapping.get('design_ref') == f'layout_mappings[{key}]', f'Wrong mapping design reference: {key}')
        body_ref = mapping.get('body_action_ref')
        require(body_ref in candidates, f'Unknown body evidence reference: {key}')
        body = next(entry for entry in contract['entries'] if entry['action_id'] == body_ref)
        require(body['character_id'] == mapping.get('character_id'), f'Mapping/body character mismatch: {key}')
        supplied = mapping.get('body_observation_ref', {})
        for field in ('ledger', 'record_id', 'window_index', 'url'):
            require(supplied.get(field) == body['observation_ref'].get(field), f'Mapping/body observation mismatch: {key}')
        proposal = mapping_designs[key]
        require(proposal.get('status') == 'VIDEO_BODY_AUTHORED_LAYOUT_PROPOSED', f'Mapping is not explicitly authored: {key}')
        require(mapping.get('layout_provenance'), f'Missing authored-layout provenance: {key}')
        reasons = ['production-layout-binding-not-implemented', 'explicit-activation-off']
        if body.get('evidence_approval') not in ('APPROVED_VIDEO_FRAGMENT', 'APPROVED_REFERENCE_POSE_ONLY'):
            reasons.append('body-evidence-scope-not-approved')
        for field, approved, reason in [('layout_approval', 'APPROVED_AUTHORED_LAYOUT', 'authored-layout-not-approved'),
                                        ('design_approval', 'APPROVED_FRAGMENT', 'mapping-design-not-approved'),
                                        ('art_validation', 'PASS', 'matching-body-art-not-reviewed')]:
            if mapping.get(field) != approved:
                reasons.append(reason)
        if mapping.get('asset_manifest') is None:
            reasons.append('no-matching-art-manifest')
        else:
            safe_relative(mapping['asset_manifest'])
            reasons.append('asset-review-binding-not-implemented')
        for field in ('safety_checks', 'accessibility_checks'):
            review = mapping.get(field, {})
            if review.get('status') != 'PASS' or not review.get('review_id'):
                reasons.append(field.replace('_', '-') + '-not-reviewed')
        preview_authorized = mapping.get('preview_testing_authorized') is True
        if preview_authorized:
            art = ledgers.get(mapping.get('asset_manifest'), {})
            require(mapping.get('approval_scope') == 'LIMITED_PREVIEW_TESTING' and
                    mapping.get('art_scope') == 'LIMITED_PREVIEW_BODY_ONLY' and
                    mapping.get('layout_approval') == 'APPROVED_AUTHORED_LAYOUT' and
                    mapping.get('design_approval') == 'APPROVED_FRAGMENT' and mapping.get('art_validation') == 'PASS',
                    'Incomplete limited-preview approvals')
            require(art.get('root_preview_authorization') == 'APPROVED_FOR_PREVIEW_TESTING' and
                    art.get('review_id') == mapping.get('review_id') and
                    art.get('mapping_id') == key and art.get('body_action_ref') == body_ref and
                    art.get('observed_body_ref') == supplied and art.get('body_pose_count') == 1 and
                    art.get('art_scope') == 'LIMITED_PREVIEW_BODY_ONLY' and art.get('art_validation') == 'PASS',
                    'Limited-preview art review does not match mapping')
            require(body.get('evidence_approval') in ('APPROVED_REFERENCE_POSE_ONLY', 'APPROVED_VIDEO_FRAGMENT'),
                    'Limited-preview body pose not approved')
        mappings.append({'mappingId': key, 'characterId': mapping['character_id'],
                         'title': proposal.get('title', key), 'kind': 'AUTHORED_WEB_PLACEMENT',
                         'bodyActionRef': body_ref, 'enabled': False,
                         'previewTestingAuthorized': preview_authorized,
                         'previewReviewId': mapping.get('review_id') if preview_authorized else None,
                         'previewAssetSha256': art.get('sha256') if preview_authorized else None,
                         'layoutProvenance': mapping['layout_provenance'],
                         'blockingReasons': reasons, 'canonicalTrajectory': False})
    require(mapped_ids == set(mapping_designs), 'Contract must cover current authored-layout proposals separately')
    return {
        'schemaVersion': 1, 'designVersion': design['version'], 'runtimeEnabled': False,
        'activationSupported': False, 'candidateCount': len(entries), 'enabledCount': 0,
        'entries': entries,
        'characters': {who: {'candidateCount': sum(e['characterId'] == who for e in entries), 'enabledCount': 0} for who in CHARACTERS},
        'nonActionCount': len(contract.get('non_actions', [])),
        'holdCount': len(contract.get('holds', [])),
        'mappingCount': len(mappings), 'mappingEnabledCount': 0, 'mappings': mappings,
        'legacyBetaCanonical': False,
    }


def load_motion_registry(root):
    root = Path(root).resolve()
    pointer = root / 'chiikawa-pets/evidence/registry.json'
    if not pointer.exists():
        return None
    index = json.loads(pointer.read_text(encoding='utf-8'))
    require(index.get('schemaVersion') == 1, 'Unsupported snapshot index')
    documents = {}
    for item in index.get('inputs', []):
        logical = str(safe_relative(item['logicalPath']))
        path = (root / safe_relative(item['snapshotPath'])).resolve()
        require(path.is_relative_to(root) and path.is_file(), f'Missing/escaped snapshot: {logical}')
        raw = path.read_bytes()
        require(hashlib.sha256(raw).hexdigest() == item.get('sha256'), f'Evidence snapshot changed: {logical}; resync/review first')
        require(logical not in documents, f'Duplicate snapshot input: {logical}')
        documents[logical] = json.loads(raw)
    contract = documents[index['contractPath']]
    design = documents[index['designPath']]
    return compile_registry(contract, design, documents, index.get('runtimeEnabled'))
