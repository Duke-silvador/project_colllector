"""Snapshot local reviewed-design/observation metadata. Does not enable animation."""
import argparse
import hashlib
import json
from pathlib import Path
from evidence_registry import compile_registry, safe_relative, load_motion_registry


def sync(source_root, root):
    source_root, root = Path(source_root).resolve(), Path(root).resolve()
    contract_path = 'character-design/motion_activation_contract.ko.json'
    sources = {}
    def read(logical):
        path = (source_root / safe_relative(logical)).resolve()
        if not path.is_relative_to(source_root):
            raise ValueError('Evidence source escapes the selected source root')
        if logical not in sources:
            sources[logical] = path.read_bytes()
        return json.loads(sources[logical])
    contract = read(contract_path)
    design_path = contract['design_file']
    design = read(design_path)
    if contract.get('future_manifest_contract_file'):
        read(contract['future_manifest_contract_file'].split('#', 1)[0])
    ledgers = {entry['observation_ref']['ledger']: read(entry['observation_ref']['ledger']) for entry in contract['entries']}
    for mapping in contract.get('mapping_entries', []):
        if mapping.get('asset_manifest'):
            ledgers[mapping['asset_manifest']] = read(mapping['asset_manifest'])
    report = compile_registry(contract, design, ledgers, False)
    fingerprint = hashlib.sha256(b''.join(key.encode() + sources[key] for key in sorted(sources))).hexdigest()[:16]
    folder = Path('chiikawa-pets/evidence/snapshots') / fingerprint
    inputs = []
    for logical, raw in sorted(sources.items()):
        relative = folder / safe_relative(logical)
        destination = root / relative
        destination.parent.mkdir(parents=True, exist_ok=True)
        if destination.exists() and destination.read_bytes() != raw:
            raise ValueError('Existing content-addressed snapshot differs')
        destination.write_bytes(raw)
        inputs.append({'logicalPath': logical, 'snapshotPath': str(relative), 'sha256': hashlib.sha256(raw).hexdigest()})
    index = {'schemaVersion': 1, 'runtimeEnabled': False, 'contractPath': contract_path,
             'designPath': design_path, 'inputs': inputs}
    directory = root / 'chiikawa-pets/evidence'
    temporary = directory / 'registry.pending.json'
    temporary.write_text(json.dumps(index, ensure_ascii=False, indent=2) + '\n')
    temporary.replace(directory / 'registry.json')
    load_motion_registry(root)
    (directory / 'validation-report.json').write_text(json.dumps(report, ensure_ascii=False, indent=2) + '\n')
    return report


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--source-root', required=True, type=Path, help='Local parent containing character-design and observation ledgers')
    args = parser.parse_args()
    report = sync(args.source_root, Path(__file__).resolve().parent)
    print(f'Evidence candidates: {report["candidateCount"]}; enabled: {report["enabledCount"]}; runtime activation not implemented')
