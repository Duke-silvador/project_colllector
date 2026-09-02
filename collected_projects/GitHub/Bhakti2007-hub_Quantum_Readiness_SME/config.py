import os

# Base Directory
BASE_DIR = os.path.dirname(os.path.abspath(__file__))

# Data Paths
DATA_DIR = os.path.join(BASE_DIR, 'data')
COMPANIES_CSV = os.path.join(DATA_DIR, 'companies.csv')
JOBS_CSV = os.path.join(DATA_DIR, 'job_postings.csv')
PATENTS_CSV = os.path.join(DATA_DIR, 'patents.csv')
FUNDING_CSV = os.path.join(DATA_DIR, 'funding.csv')
DISCLOSURES_CSV = os.path.join(DATA_DIR, 'technical_disclosures.csv')

# Database Path
DB_DIR = os.path.join(BASE_DIR, 'database')
DB_PATH = os.path.join(DB_DIR, 'quantum_readiness.db')

# Models Directory
MODELS_DIR = os.path.join(BASE_DIR, 'models')
MODEL_PATH = os.path.join(MODELS_DIR, 'readiness_model.pkl')
VECTORIZER_PATH = os.path.join(MODELS_DIR, 'tfidf_vectorizer.pkl')
SCALER_PATH = os.path.join(MODELS_DIR, 'scaler.pkl')

# Reports Directory
REPORTS_DIR = os.path.join(BASE_DIR, 'reports')

# Scoring Weights
SCORING_WEIGHTS = {
    'technical_capability': 0.25,
    'strategic_intent': 0.20,
    'talent_hiring': 0.15,
    'investment_activity': 0.15,
    'ip_patents': 0.10,
    'ecosystem_engagement': 0.15
}

# Readiness Tiers
READINESS_TIERS = {
    (0, 20): "Unaware / Very Early",
    (21, 40): "Exploring",
    (41, 60): "Emerging",
    (61, 80): "Adopting",
    (81, 100): "Quantum Ready"
}

# Quantum Taxonomy Dictionary
QUANTUM_TAXONOMY = {
    'QUANTUM_COMPUTING': [
        'quantum computing', 'quantum computer', 'qubit', 'qubits', 'quantum algorithm',
        'quantum processor', 'quantum hardware', 'quantum simulation', 'quantum annealing',
        'gate-based quantum computing', 'variational quantum algorithm', 'quantum machine learning',
        'qml', 'vqe', 'qaoa', 'clifford', 'hamiltonian', 'superconducting qubit', 'trapped ion',
        'photonic quantum', 'spin qubit', 'topological qubit'
    ],
    'QUANTUM_SENSING': [
        'quantum sensing', 'quantum sensor', 'quantum metrology', 'atomic clock',
        'magnetometer', 'gravimeter', 'nv center', 'nitrogen-vacancy', 'quantum imaging',
        'atomic interferometer', 'quantum radar'
    ],
    'QUANTUM_COMMUNICATION': [
        'quantum communication', 'quantum cryptography', 'quantum key distribution', 'qkd',
        'quantum network', 'post-quantum communication', 'quantum repeater', 'entanglement distribution',
        'quantum internet', 'quantum teleportation'
    ],
    'POST_QUANTUM_SECURITY': [
        'post quantum cryptography', 'post-quantum cryptography', 'pqc', 'quantum-safe cryptography',
        'lattice cryptography', 'lattice-based cryptography', 'kyber', 'dilithium', 'sphincs+',
        'quantum resistant', 'quantum safety', 'crypto-agility'
    ],
    'RELATED_TECHNOLOGIES': [
        'ai', 'machine learning', 'hpc', 'high performance computing', 'cloud computing',
        'cybersecurity', 'cryptography', 'optimization', 'simulation', 'deep learning',
        'neural networks', 'gpus', 'parallel computing', 'supercomputing'
    ]
}
