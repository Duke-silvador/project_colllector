"""Optionally copy existing local uploads into a private Supabase bucket.

Run without arguments for a dry run. Run with --execute to actually copy.
The app should be stopped while migrating. Local files are never removed.
"""
import argparse
import json
import mimetypes
import os
import re
from pathlib import Path

from app import local_root, storage_backend, storage_get, storage_put, storage_delete


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--execute', action='store_true', help='Copy the files to Supabase')
    args = parser.parse_args()
    root = local_root()
    records = sorted((root / 'records').glob('*.json'))
    print(f'Found {len(records)} local record(s) in {root}.')
    if not args.execute:
        print('Dry run only. Set Supabase environment variables and use --execute to copy.')
        return
    if os.environ.get('STORAGE_BACKEND', '').lower() != 'supabase':
        parser.error('Set STORAGE_BACKEND=supabase before running with --execute.')
    storage_backend()
    copied = skipped = failed = 0
    for record_path in records:
        uploaded_file = None
        try:
            raw = record_path.read_bytes()
            record = json.loads(raw)
            identifier = record.get('id', '')
            file_key = record.get('file_key', '')
            if not re.fullmatch(r'[0-9a-f]{32}', identifier) or record_path.name != identifier + '.json':
                raise ValueError('Invalid record ID')
            if not re.fullmatch(r'resumes/' + identifier + r'\.[a-z0-9]+', file_key):
                raise ValueError('Invalid file key')
            local_file = root / file_key
            file_data = local_file.read_bytes()
            remote_record = 'records/' + identifier + '.json'
            exists = False
            for key in (file_key, remote_record):
                try:
                    storage_get(key)
                    exists = True
                except FileNotFoundError:
                    pass
            if exists:
                print('Skipped existing remote record or file:', identifier)
                skipped += 1
                continue
            storage_put(file_key, file_data, mimetypes.guess_type(file_key)[0] or 'application/octet-stream')
            uploaded_file = file_key
            storage_put(remote_record, raw, 'application/json')
            uploaded_file = None
            copied += 1
        except Exception as exc:
            failed += 1
            print('Could not migrate record', record_path.name, ':', type(exc).__name__)
            if uploaded_file:
                try:
                    storage_delete(uploaded_file)
                except Exception:
                    print('Could not clean up the uploaded file; check the private bucket manually.')
    print(f'Copied: {copied}; skipped: {skipped}; failed: {failed}. Local files were not deleted.')
    if failed:
        raise SystemExit(1)


if __name__ == '__main__':
    main()
