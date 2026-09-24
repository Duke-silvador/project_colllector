import unittest
from unittest.mock import MagicMock, patch

from compass import buscar_office_id, obtener_token


def env(base_url='https://apix.example.com', company='comp-1', key='key-1'):
    return {
        'COMPASS_API_URL': base_url,
        'COMPASS_COMPANY_ID': company,
        'COMPASS_API_KEY': key,
    }


class ObtenerTokenTests(unittest.TestCase):
    def test_posts_credentials_and_returns_token(self):
        response = MagicMock(status_code=200)
        response.json.return_value = {'token': 'abc.def.ghi'}
        with patch.dict('os.environ', env(), clear=False), \
             patch('compass.load_dotenv'), \
             patch('compass.requests.post', return_value=response) as post:
            token = obtener_token()
        self.assertEqual(token, 'abc.def.ghi')
        post.assert_called_once_with(
            'https://apix.example.com/login',
            json={'company': 'comp-1', 'key': 'key-1'},
            timeout=10,
        )

    def test_missing_config_raises(self):
        with patch.dict('os.environ', {'COMPASS_API_URL': '', 'COMPASS_COMPANY_ID': '', 'COMPASS_API_KEY': ''}, clear=False), \
             patch('compass.load_dotenv'):
            with self.assertRaises(ValueError):
                obtener_token()


class BuscarOfficeIdTests(unittest.TestCase):
    def test_returns_office_id_for_single_policy(self):
        response = MagicMock(status_code=200)
        response.json.return_value = {'policies': [{'office_id': 'office-1', 'status_id': 'active'}], 'total': 1}
        with patch.dict('os.environ', env(), clear=False), \
             patch('compass.load_dotenv'), \
             patch('compass.requests.get', return_value=response) as get:
            result = buscar_office_id('tok', 'POL-1')
        self.assertEqual(result, 'office-1')
        get.assert_called_once_with(
            'https://apix.example.com/policies',
            params={'policyNumber': 'POL-1'},
            headers={'Authorization': 'Bearer tok'},
            timeout=10,
        )

    def test_prefers_active_policy_among_renewals(self):
        response = MagicMock(status_code=200)
        response.json.return_value = {'policies': [
            {'office_id': 'office-old', 'status_id': 'expired', 'effective_date': '2023-01-01T00:00:00Z'},
            {'office_id': 'office-new', 'status_id': 'active', 'effective_date': '2024-01-01T00:00:00Z'},
        ], 'total': 2}
        with patch.dict('os.environ', env(), clear=False), \
             patch('compass.load_dotenv'), \
             patch('compass.requests.get', return_value=response):
            result = buscar_office_id('tok', 'POL-1')
        self.assertEqual(result, 'office-new')

    def test_falls_back_to_most_recent_when_none_active(self):
        response = MagicMock(status_code=200)
        response.json.return_value = {'policies': [
            {'office_id': 'office-old', 'status_id': 'expired', 'effective_date': '2023-01-01T00:00:00Z'},
            {'office_id': 'office-newer', 'status_id': 'cancelled', 'effective_date': '2024-01-01T00:00:00Z'},
        ], 'total': 2}
        with patch.dict('os.environ', env(), clear=False), \
             patch('compass.load_dotenv'), \
             patch('compass.requests.get', return_value=response):
            result = buscar_office_id('tok', 'POL-1')
        self.assertEqual(result, 'office-newer')

    def test_not_found_returns_none(self):
        response = MagicMock(status_code=404)
        with patch.dict('os.environ', env(), clear=False), \
             patch('compass.load_dotenv'), \
             patch('compass.requests.get', return_value=response):
            result = buscar_office_id('tok', 'POL-999')
        self.assertIsNone(result)


if __name__ == '__main__':
    unittest.main()
