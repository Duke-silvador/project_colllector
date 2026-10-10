"""Generate an inventory and preserve files; checks do not validate historical claims."""
import argparse
import hashlib
import json
import re
import shutil
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parent
ACCESS = {'SCAN_INSPECTED', 'FULL_TEXT_PORTION', 'ABSTRACT', 'CATALOG_METADATA', 'SEARCH_EXCERPT', 'NOT_ACCESSED'}
FIELDS = {'id', 'title', 'category', 'place', 'status', 'reviewers', 'claims', 'physical_evidence', 'surviving_documents', 'source_interpretation', 'investigation_inference', 'competing_explanations', 'counterevidence', 'next_test', 'chronology', 'missing', 'dependence'}

def records():
    cases = json.loads((ROOT / 'data/cases.json').read_text(encoding='utf-8'))['cases']
    sources = json.loads((ROOT / 'data/sources.json').read_text(encoding='utf-8'))['sources']
    return cases, sources

def digest(p):
    return hashlib.sha256(p.read_bytes()).hexdigest()

def verify():
    cases, sources = records()
    index = {s['id']: s for s in sources}
    assert len(index) == len(sources), 'Duplicate source IDs'
    assert len({c['id'] for c in cases}) == len(cases), 'Duplicate case IDs'
    for c in cases:
        assert FIELDS <= c.keys(), f"Missing fields in {c['id']}"
        assert c['claims'], f"No claims in {c['id']}"
        for claim in c['claims']:
            assert claim['source_id'] in index and claim['locator'], f"Invalid source link in {c['id']}"
        assert c['status'] != 'INDEPENDENTLY_REVIEWED' or c['reviewers'], 'Missing review evidence'
    for s in sources:
        assert s['access'] in ACCESS and s['inspected'] and s['limitations'], f"Invalid access record {s['id']}"
        assert s['url'].startswith('https://'), f"Missing URL {s['id']}"
        if s['local_copy']:
            p = (ROOT / s['local_copy']).resolve()
            assert p.is_relative_to(ROOT) and p.is_file(), f"Missing/escaping source {s['id']}"
    dating = json.loads((ROOT / 'data/dating-records.json').read_text(encoding='utf-8'))
    case_ids = {c['id'] for c in cases}
    sample_ids = set()
    for sample in dating['samples']:
        key = (sample['source_id'], sample['field_id'])
        assert key not in sample_ids, f'Duplicate dating sample {key}'
        sample_ids.add(key)
        assert sample['source_id'] in index and sample['case_id'] in case_ids and sample['locator'], f'Invalid dating reference {key}'
        if 'median_cal_BP' in sample:
            assert sample['younger_bound_cal_BP'] <= sample['median_cal_BP'] <= sample['older_bound_cal_BP'], f'Unordered age bounds {key}'
        if sample.get('accepted_age_in_source') is False:
            assert sample['age_Ma'] is None, f'Unaccepted age assigned {key}'
    for p in list(ROOT.glob('*.md')) + list((ROOT / 'research').glob('*.md')):
        for link in re.findall(r'\]\(([^)]+)\)', p.read_text(encoding='utf-8')):
            if '://' not in link and not link.startswith('#'):
                assert (p.parent / link.split('#')[0]).is_file(), f'Missing link {p.name}: {link}'
    for manifest in (ROOT / 'snapshots').glob('*/manifest.json'):
        for rel, expected in json.loads(manifest.read_text(encoding='utf-8'))['files'].items():
            p = (manifest.parent / 'files' / rel).resolve()
            assert p.is_relative_to(manifest.parent.resolve()) and p.is_file() and digest(p) == expected, f'Snapshot mismatch {rel}'
    print(f'Integrity checked: {len(cases)} cases; {len(sources)} sources. No scientific validation implied.')

def build():
    cases, sources = records()
    index = {s['id']: s for s in sources}
    reviewed = sum(c['status'] == 'INDEPENDENTLY_REVIEWED' for c in cases)
    text = ['# Case inventory', '', 'Research draft edition: 2026-10-08 (America/New_York).', '', f'{len(cases)} sourced drafts; {reviewed} independent scientific reviews.', 'Selection is purposive. Catalog leads, source-access limits and adverse evidence remain visible.', '', '| ID | Case |', '| --- | --- |']
    text += [f"| {c['id']} | {c['title']} |" for c in cases]
    for c in cases:
        text += ['', f"## {c['id']}: {c['title']}", '', f"Place: {c['place']}. Status: {c['status']}.", '', '**Sourced statements**', '']
        for claim in c['claims']:
            s = index[claim['source_id']]
            text.append(f"- {claim['statement']} [{s['id']}]({s['url']}). Locator: {claim['locator']}. Access: {s['access']}. Limit: {s['limitations']}")
        for field in ['physical_evidence', 'surviving_documents', 'source_interpretation', 'investigation_inference', 'counterevidence', 'next_test', 'dependence']:
            text += ['', f"**{field.replace('_', ' ').capitalize()}:** {c[field]}"]
        text += ['', '**Alternatives:** ' + '; '.join(c['competing_explanations']), '', '**Chronology:** ' + json.dumps(c['chronology']), '', '**Missing:** ' + '; '.join(c['missing'])]
    (ROOT / 'INVENTORY.md').write_text('\n'.join(text) + '\n', encoding='utf-8')
    print('Built INVENTORY.md')

def snapshot():
    verify()
    paths = sorted(p for p in ROOT.rglob('*') if p.is_file() and not any(x in {'.git', 'tmp', 'snapshots', '__pycache__'} for x in p.relative_to(ROOT).parts))
    stamp = datetime.now(timezone.utc).strftime('%Y%m%dT%H%M%S%fZ')
    target = ROOT / 'snapshots' / stamp
    target.mkdir(parents=True, exist_ok=False)
    hashes = {}
    for p in paths:
        rel = p.relative_to(ROOT).as_posix()
        dest = target / 'files' / rel
        dest.parent.mkdir(parents=True, exist_ok=True)
        shutil.copyfile(p, dest)
        hashes[rel] = digest(dest)
    (target / 'manifest.json').write_text(json.dumps({'created_at_utc': stamp, 'independent_timestamp': False, 'files': hashes}, indent=2) + '\n', encoding='utf-8')
    print(f'Snapshot: {target.relative_to(ROOT)}')
    verify()

if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('command', choices=['build', 'verify', 'snapshot'])
    args = parser.parse_args()
    {'build': build, 'verify': verify, 'snapshot': snapshot}[args.command]()
