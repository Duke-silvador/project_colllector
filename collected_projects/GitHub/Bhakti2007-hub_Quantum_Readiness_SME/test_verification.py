import os
import sys
import unittest
import json

# Ensure project root is in sys.path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app import app
from utils.data_loader import load_all_datasets
from utils.database import get_db_connection, get_company_full_details
from ml.nlp_analysis import extract_keywords, detect_quantum_area, calculate_quantum_relevance
import joblib
import config

class QuantumReadinessTestSuite(unittest.TestCase):

    def setUp(self):
        self.client = app.test_client()
        self.client.testing = True

    def test_1_dataset_loading(self):
        datasets = load_all_datasets()
        self.assertGreaterEqual(len(datasets['companies']), 100)
        self.assertGreater(len(datasets['jobs']), 100)
        self.assertGreater(len(datasets['patents']), 50)
        self.assertGreater(len(datasets['funding']), 50)
        self.assertGreater(len(datasets['disclosures']), 50)
        print(" [PASS] Datasets successfully validated & loaded.")

    def test_2_database_integrity(self):
        conn = get_db_connection()
        comps = conn.execute("SELECT COUNT(*) FROM companies").fetchone()[0]
        scores = conn.execute("SELECT COUNT(*) FROM readiness_scores").fetchone()[0]
        conn.close()
        self.assertGreaterEqual(comps, 100)
        self.assertEqual(comps, scores)
        print(f" [PASS] Database integrity verified ({comps} companies & scores).")

    def test_3_nlp_engine(self):
        text = "We design variational quantum algorithms (VQE) and post-quantum cryptography with QKD."
        kw = extract_keywords(text)
        area = detect_quantum_area(text)
        self.assertGreater(kw['total_quantum_keyword_count'], 0)
        self.assertIn(area, ['Quantum Computing', 'Post-Quantum Security', 'Quantum Communication'])
        print(" [PASS] NLP keyword extraction and domain classification verified.")

    def test_4_trained_model_artifacts(self):
        self.assertTrue(os.path.exists(config.MODEL_PATH))
        self.assertTrue(os.path.exists(config.VECTORIZER_PATH))
        self.assertTrue(os.path.exists(config.SCALER_PATH))
        
        model = joblib.load(config.MODEL_PATH)
        scaler = joblib.load(config.SCALER_PATH)
        self.assertIsNotNone(model)
        self.assertIsNotNone(scaler)
        print(" [PASS] Model artifacts loaded successfully.")

    def test_5_page_routes(self):
        routes = ['/', '/companies', '/company/COMP001', '/compare?companies=COMP001,COMP002', '/methodology', '/about']
        for r in routes:
            res = self.client.get(r)
            self.assertEqual(res.status_code, 200, f"Failed on route {r}")
        print(" [PASS] All HTML page routes returned HTTP 200 OK.")

    def test_6_rest_apis(self):
        apis = [
            '/api/companies',
            '/api/company/COMP001',
            '/api/sector-analysis',
            '/api/readiness-distribution',
            '/api/top-companies?limit=5',
            '/api/model-performance'
        ]
        for a in apis:
            res = self.client.get(a)
            self.assertEqual(res.status_code, 200, f"Failed on API {a}")
            data = json.loads(res.data.decode('utf-8'))
            self.assertIsNotNone(data)
        
        # Test CSV Export API
        csv_res = self.client.get('/api/export/csv')
        self.assertEqual(csv_res.status_code, 200)
        self.assertIn('text/csv', csv_res.headers.get('Content-Type', ''))
        print(" [PASS] All REST API endpoints and CSV export verified.")

if __name__ == '__main__':
    unittest.main()
