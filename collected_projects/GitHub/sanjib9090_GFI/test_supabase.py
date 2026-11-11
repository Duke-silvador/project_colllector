"""Offline tests for the Supabase storage integration (no live credentials needed)."""
import base64
import json
import os
import tempfile
from pathlib import Path
import contextlib
import io
import migrate_to_supabase as migrate
import unittest
from io import BytesIO
from unittest.mock import patch
from urllib.parse import unquote, urlsplit

import requests
import app as module


def response(status, content=b''):
    result = requests.Response()
    result.status_code = status
    result._content = content
    result.url = 'https://example.supabase.co/storage/v1/'
    return result


class FakeSupabase:
    def __init__(self):
        self.objects = {}
        self.public = False
        self.fail_records = False

    def bucket(self, url, headers, timeout):
        assert headers['apikey'] == 'sb_secret_test'
        assert 'Authorization' not in headers
        return response(200, json.dumps({'public': self.public}).encode())

    def request(self, method, url, headers, timeout, **kwargs):
        assert headers['apikey'] == 'sb_secret_test'
        assert 'Authorization' not in headers
        path = unquote(urlsplit(url).path).removeprefix('/storage/v1/')
        if path == 'object/list/candidate-review' and method == 'POST':
            options = kwargs['json']
            prefix = options['prefix'] + '/'
            names = sorted(k[len(prefix):] for k in self.objects if k.startswith(prefix) and '/' not in k[len(prefix):])
            page = names[options['offset']:options['offset'] + options['limit']]
            return response(200, json.dumps([{'name': name} for name in page]).encode())
        if path == 'object/candidate-review' and method == 'DELETE':
            for key in kwargs['json']['prefixes']:
                self.objects.pop(key, None)
            return response(200, b'[]')
        if path.startswith('object/candidate-review/') and method == 'POST':
            key = path.removeprefix('object/candidate-review/')
            if self.fail_records and key.startswith('records/'):
                return response(500)
            self.objects[key] = kwargs['data']
            return response(200, b'{}')
        if path.startswith('object/authenticated/candidate-review/') and method == 'GET':
            key = path.removeprefix('object/authenticated/candidate-review/')
            return response(200, self.objects[key]) if key in self.objects else response(404)
        raise AssertionError((method, path))


class SupabaseTests(unittest.TestCase):
    def setUp(self):
        self.environment = patch.dict(os.environ, {
            'STORAGE_BACKEND': 'supabase', 'SUPABASE_URL': 'https://example.supabase.co',
            'SUPABASE_SECRET_KEY': 'sb_secret_test', 'SUPABASE_BUCKET': 'candidate-review',
        }, clear=True)
        self.environment.start()
        self.fake = FakeSupabase()
        self.get = patch('app.requests.get', side_effect=self.fake.bucket)
        self.req = patch('app.requests.request', side_effect=self.fake.request)
        self.get.start(); self.req.start()
        module._BUCKET_CHECK.update(fingerprint=None, checked_at=0)
        self.client = module.app.test_client()
        self.auth = {}
        self.roles = module.load_config()
        for role in self.roles.values():
            for rule in role['rules']:
                rule['jdEvidence'] = []

    def tearDown(self):
        self.req.stop(); self.get.stop(); self.environment.stop()
        module._BUCKET_CHECK.update(fingerprint=None, checked_at=0)

    def test_upload_reload_view_and_remove(self):
        text = (b'EXPERIENCE\nLCA analyst Jan 2023 - Present\nLife cycle assessment and GaBi.\n' * 3)
        with patch('app.job_context', return_value=(self.roles, 'version')):
            result = self.client.post('/api/upload', headers=self.auth, data={
                'file': (BytesIO(text), 'new.txt'), 'analysis_version': 'version'
            })
            self.assertEqual(result.status_code, 200)
            candidate = result.get_json()
            identifier = candidate['id']
            self.assertEqual(self.fake.objects['resumes/' + identifier + '.txt'], text)
            self.assertIn('records/' + identifier + '.json', self.fake.objects)
            listing = self.client.get('/api/candidates', headers=self.auth)
            self.assertEqual(listing.status_code, 200)
            self.assertEqual(listing.get_json()['storage'], 'supabase')
            self.assertTrue(any(c['id'] == identifier for c in listing.get_json()['candidates']))
            self.assertNotIn(b'sb_secret_test', listing.data)
            self.assertEqual(self.client.get('/api/resumes/' + identifier + '/file', headers=self.auth).data, text)
            self.assertEqual(self.client.delete('/api/resumes/' + identifier, headers=self.auth).status_code, 200)
            self.assertEqual(self.client.get('/api/resumes/' + identifier + '/file', headers=self.auth).status_code, 404)
            self.assertFalse(self.fake.objects)

    def test_failed_record_upload_cleans_file(self):
        self.fake.fail_records = True
        with patch('app.job_context', return_value=(self.roles, 'version')):
            result = self.client.post('/api/upload', headers=self.auth, data={
                'file': (BytesIO(b'test resume'), 'new.txt'), 'analysis_version': 'version'
            })
        self.assertEqual(result.status_code, 503)
        self.assertFalse(self.fake.objects)
        self.assertNotIn(b'sb_secret_test', result.data)

    def test_migration_dry_run_copy_and_skip_existing(self):
        identifier = 'a' * 32
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            (root / 'records').mkdir()
            (root / 'resumes').mkdir()
            original = b'Original resume file'
            (root / 'resumes' / (identifier + '.txt')).write_bytes(original)
            record = {'id': identifier, 'file_key': 'resumes/' + identifier + '.txt', 'filename': 'new.txt'}
            (root / 'records' / (identifier + '.json')).write_text(json.dumps(record))
            with patch.dict(os.environ, {'APP_DATA_DIR': directory}), contextlib.redirect_stdout(io.StringIO()):
                with patch('sys.argv', ['migrate_to_supabase.py']):
                    migrate.main()
                self.assertFalse(self.fake.objects)
                with patch('sys.argv', ['migrate_to_supabase.py', '--execute']):
                    migrate.main()
                self.assertEqual(self.fake.objects[record['file_key']], original)
                self.assertEqual(json.loads(self.fake.objects['records/' + identifier + '.json']), record)
                self.fake.objects[record['file_key']] = b'existing'
                with patch('sys.argv', ['migrate_to_supabase.py', '--execute']):
                    migrate.main()
                self.assertEqual(self.fake.objects[record['file_key']], b'existing')
                self.assertEqual((root / record['file_key']).read_bytes(), original)

    def test_list_paginates(self):
        for n in range(205):
            self.fake.objects[f'records/{n:032x}.json'] = b'{}'
        self.assertEqual(len(module.storage_list('records/')), 205)

    def test_public_bucket_is_rejected(self):
        self.fake.public = True
        with self.assertRaises(module.StorageConfigurationError):
            module.storage_put('resumes/test.txt', b'data')
        self.assertFalse(self.fake.objects)

    def test_password_and_keys(self):
        with patch('app.job_context', return_value=(self.roles, 'version')):
            self.assertEqual(self.client.get('/api/candidates').status_code, 200)
        with patch.dict(os.environ, {'SUPABASE_SECRET_KEY': 'sb_publishable_test'}):
            with self.assertRaises(module.StorageConfigurationError):
                module.supabase_settings()
        payload = base64.urlsafe_b64encode(b'{"role":"anon"}').decode().rstrip('=')
        with patch.dict(os.environ, {'SUPABASE_SECRET_KEY': 'x.' + payload + '.x'}):
            with self.assertRaises(module.StorageConfigurationError):
                module.supabase_settings()
        payload = base64.urlsafe_b64encode(b'{"role":"service_role"}').decode().rstrip('=')
        with patch.dict(os.environ, {'SUPABASE_SECRET_KEY': 'x.' + payload + '.x'}):
            headers = module.supabase_settings()[2]
            self.assertEqual(headers['Authorization'], 'Bearer x.' + payload + '.x')


if __name__ == '__main__':
    unittest.main()
