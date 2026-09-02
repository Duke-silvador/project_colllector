import os
import sys
import json
import sqlite3
import pandas as pd
import numpy as np
from io import StringIO
from flask import Flask, render_template, request, jsonify, Response, send_file

# Add project root to sys.path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import config
from utils.database import get_db_connection, init_db, get_company_full_details
from ml.nlp_analysis import extract_keywords

app = Flask(__name__)

# Ensure DB and models exist on startup
def ensure_system_initialized():
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='companies'")
        table_exists = cursor.fetchone()
        conn.close()
        
        if not table_exists or not os.path.exists(config.MODEL_PATH):
            print("System not initialized. Running training and database seeding...")
            from ml.train_model import train_and_evaluate
            train_and_evaluate()
    except Exception as e:
        print(f"Error during initialization check: {e}")
        try:
            init_db(force_reseed=False)
        except Exception as err:
            print(f"Failed fallback init_db: {err}")

ensure_system_initialized()

# ====================================================================
# PAGE ROUTES
# ====================================================================

@app.route('/')
def index():
    """Main Executive Dashboard Route."""
    conn = get_db_connection()
    
    # Summary Metrics
    total_companies = conn.execute("SELECT COUNT(*) FROM companies").fetchone()[0]
    avg_score = conn.execute("SELECT AVG(overall_score) FROM readiness_scores").fetchone()[0] or 0.0
    ready_count = conn.execute("SELECT COUNT(*) FROM readiness_scores WHERE overall_score >= 80").fetchone()[0]
    emerging_count = conn.execute("SELECT COUNT(*) FROM readiness_scores WHERE overall_score >= 40 AND overall_score < 80").fetchone()[0]
    
    hiring_count = conn.execute("""
        SELECT COUNT(DISTINCT company_id) FROM job_postings 
        WHERE LOWER(description) LIKE '%quantum%' OR LOWER(job_title) LIKE '%quantum%' OR LOWER(job_title) LIKE '%pqc%'
    """).fetchone()[0]
    
    patent_count = conn.execute("SELECT COUNT(*) FROM patents WHERE quantum_related = 1").fetchone()[0]

    # Sector highlights
    sector_df = pd.read_sql_query("""
        SELECT c.sector, AVG(r.overall_score) as avg_score, COUNT(c.company_id) as comp_count
        FROM companies c
        JOIN readiness_scores r ON c.company_id = r.company_id
        GROUP BY c.sector
        ORDER BY avg_score DESC
    """, conn)
    
    highest_sector = {'sector': 'Materials', 'average_readiness': 75.0}
    lowest_sector = {'sector': 'Retail', 'average_readiness': 22.0}
    emerging_sector = {'sector': 'Cybersecurity', 'average_readiness': 68.0}
    
    if not sector_df.empty:
        highest_sector = {
            'sector': sector_df.iloc[0]['sector'],
            'average_readiness': float(sector_df.iloc[0]['avg_score'])
        }
        lowest_sector = {
            'sector': sector_df.iloc[-1]['sector'],
            'average_readiness': float(sector_df.iloc[-1]['avg_score'])
        }
        # Pick a prominent middle sector as emerging
        mid_idx = len(sector_df) // 2
        emerging_sector = {
            'sector': sector_df.iloc[mid_idx]['sector'],
            'average_readiness': float(sector_df.iloc[mid_idx]['avg_score'])
        }

    # Model metrics
    metrics_path = os.path.join(config.MODELS_DIR, 'model_metrics.json')
    model_metrics = {'r2': 0.966, 'mae': 4.60}
    if os.path.exists(metrics_path):
        try:
            with open(metrics_path, 'r', encoding='utf-8') as f:
                model_metrics = json.load(f)
        except Exception:
            pass

    conn.close()

    return render_template(
        'index.html',
        total_companies=total_companies,
        avg_score=avg_score,
        ready_count=ready_count,
        emerging_count=emerging_count,
        hiring_count=hiring_count,
        patent_count=patent_count,
        highest_sector=highest_sector,
        lowest_sector=lowest_sector,
        emerging_sector=emerging_sector,
        model_metrics=model_metrics
    )

@app.route('/companies')
def companies_page():
    """SME Directory Page."""
    return render_template('companies.html')

@app.route('/company/<company_id>')
def company_detail(company_id):
    """Company Profile Detail Page."""
    data = get_company_full_details(company_id)
    if not data or not data['company']:
        return render_template('companies.html', error=f"Company ID {company_id} not found."), 404

    # Extract quantum keywords across company description & records
    comb_text = data['company'].get('company_description', '') + " " + \
                " ".join([j['description'] for j in data['jobs']]) + " " + \
                " ".join([p['abstract'] for p in data['patents']]) + " " + \
                " ".join([d['text'] for d in data['disclosures']])
                
    kw_info = extract_keywords(comb_text)

    return render_template(
        'company_detail.html',
        company=data['company'],
        scores=data['scores'],
        jobs=data['jobs'],
        patents=data['patents'],
        funding=data['funding'],
        disclosures=data['disclosures'],
        keyword_matches=kw_info['found_keywords']
    )

@app.route('/compare')
def compare_page():
    """Company Comparison Page."""
    conn = get_db_connection()
    all_comps = pd.read_sql_query("""
        SELECT c.company_id, c.company_name, c.sector, r.overall_score
        FROM companies c
        LEFT JOIN readiness_scores r ON c.company_id = r.company_id
        ORDER BY c.company_name ASC
    """, conn).to_dict('records')
    conn.close()

    # Get company IDs from query param (comma-separated or multiple 'company_id' params)
    comp_param = request.args.get('companies', '')
    req_ids = [c.strip() for c in comp_param.split(',') if c.strip()] if comp_param else request.args.getlist('company_id')
    req_ids = [cid for cid in req_ids if cid][:4] # Max 4

    compared_companies = []
    for cid in req_ids:
        details = get_company_full_details(cid)
        if details and details['company']:
            merged = {**details['company'], **details['scores']}
            compared_companies.append(merged)

    return render_template(
        'compare.html',
        all_companies_list=all_comps,
        selected_ids=req_ids,
        compared_companies=compared_companies,
        compared_companies_json=json.dumps(compared_companies)
    )

@app.route('/methodology')
def methodology_page():
    """Research Methodology Page."""
    return render_template('methodology.html')

@app.route('/about')
def about_page():
    """About & Impact Page."""
    return render_template('about.html')

# ====================================================================
# REST API ENDPOINTS
# ====================================================================

@app.route('/api/companies')
def api_companies():
    """Returns complete list of companies with scores and filters."""
    conn = get_db_connection()
    query = """
        SELECT c.*, r.overall_score, r.technical_capability, r.strategic_intent,
               r.talent_hiring, r.investment_activity, r.ip_patents,
               r.ecosystem_engagement, r.confidence_score, r.readiness_level
        FROM companies c
        LEFT JOIN readiness_scores r ON c.company_id = r.company_id
    """
    df = pd.read_sql_query(query, conn)
    conn.close()
    return jsonify(df.fillna(0).to_dict('records'))

@app.route('/api/company/<company_id>')
def api_company_detail(company_id):
    """Returns JSON details for a single company."""
    data = get_company_full_details(company_id)
    if not data:
        return jsonify({'error': 'Company not found'}), 404
    return jsonify(data)

@app.route('/api/sector-analysis')
def api_sector_analysis():
    """Returns aggregated sector analytics."""
    conn = get_db_connection()
    query = """
        SELECT 
            c.sector,
            COUNT(c.company_id) as total_companies,
            AVG(r.overall_score) as average_readiness,
            AVG(r.technical_capability) as avg_technical,
            AVG(r.strategic_intent) as avg_strategic,
            AVG(r.talent_hiring) as avg_talent,
            AVG(r.investment_activity) as avg_investment,
            AVG(r.ip_patents) as avg_ip,
            AVG(r.ecosystem_engagement) as avg_ecosystem
        FROM companies c
        JOIN readiness_scores r ON c.company_id = r.company_id
        GROUP BY c.sector
        ORDER BY average_readiness DESC
    """
    df = pd.read_sql_query(query, conn)
    
    # Calculate hiring and patent percentages per sector
    results = []
    for _, row in df.iterrows():
        sec = row['sector']
        hiring_pct = conn.execute("""
            SELECT COUNT(DISTINCT c.company_id) * 100.0 / COUNT(DISTINCT c2.company_id)
            FROM companies c2
            LEFT JOIN (
                SELECT DISTINCT jp.company_id FROM job_postings jp
                WHERE LOWER(jp.description) LIKE '%quantum%' OR LOWER(jp.job_title) LIKE '%quantum%' OR LOWER(jp.job_title) LIKE '%pqc%'
            ) c ON c2.company_id = c.company_id
            WHERE c2.sector = ?
        """, (sec,)).fetchone()[0] or 0.0

        patent_pct = conn.execute("""
            SELECT COUNT(DISTINCT c.company_id) * 100.0 / COUNT(DISTINCT c2.company_id)
            FROM companies c2
            LEFT JOIN (
                SELECT DISTINCT p.company_id FROM patents p WHERE p.quantum_related = 1
            ) c ON c2.company_id = c.company_id
            WHERE c2.sector = ?
        """, (sec,)).fetchone()[0] or 0.0

        results.append({
            'sector': sec,
            'total_companies': int(row['total_companies']),
            'average_readiness': round(float(row['average_readiness']), 2),
            'avg_technical': round(float(row['avg_technical']), 2),
            'avg_strategic': round(float(row['avg_strategic']), 2),
            'avg_talent': round(float(row['avg_talent']), 2),
            'avg_investment': round(float(row['avg_investment']), 2),
            'avg_ip': round(float(row['avg_ip']), 2),
            'avg_ecosystem': round(float(row['avg_ecosystem']), 2),
            'quantum_hiring_percentage': round(float(hiring_pct), 1),
            'patent_activity_percentage': round(float(patent_pct), 1)
        })

    conn.close()
    return jsonify(results)

@app.route('/api/readiness-distribution')
def api_readiness_distribution():
    """Returns count of companies by readiness tier."""
    conn = get_db_connection()
    df = pd.read_sql_query("SELECT readiness_level, COUNT(*) as count FROM readiness_scores GROUP BY readiness_level", conn)
    conn.close()

    distribution = {
        "Unaware / Very Early": 0,
        "Exploring": 0,
        "Emerging": 0,
        "Adopting": 0,
        "Quantum Ready": 0
    }
    for _, row in df.iterrows():
        lvl = row['readiness_level']
        if lvl in distribution:
            distribution[lvl] = int(row['count'])
            
    return jsonify(distribution)

@app.route('/api/top-companies')
def api_top_companies():
    """Returns top N companies by overall score."""
    limit = int(request.args.get('limit', 10))
    conn = get_db_connection()
    query = """
        SELECT c.company_id, c.company_name, c.sector, c.country, r.overall_score, r.readiness_level
        FROM companies c
        JOIN readiness_scores r ON c.company_id = r.company_id
        ORDER BY r.overall_score DESC
        LIMIT ?
    """
    df = pd.read_sql_query(query, conn, params=(limit,))
    conn.close()
    return jsonify(df.to_dict('records'))

@app.route('/api/model-performance')
def api_model_performance():
    """Returns model metrics and feature importances."""
    metrics_path = os.path.join(config.MODELS_DIR, 'model_metrics.json')
    if os.path.exists(metrics_path):
        with open(metrics_path, 'r', encoding='utf-8') as f:
            data = json.load(f)
        return jsonify(data)
    return jsonify({'error': 'Model metrics not found'}), 404

@app.route('/api/export/csv')
def export_csv():
    """Generates and downloads a CSV export of company readiness scores."""
    conn = get_db_connection()
    query = """
        SELECT 
            c.company_id, c.company_name, c.sector, c.country, c.employee_count, c.revenue_range,
            r.overall_score, r.readiness_level, r.technical_capability, r.strategic_intent,
            r.talent_hiring, r.investment_activity, r.ip_patents, r.ecosystem_engagement,
            r.confidence_score, r.top_strength, r.top_weakness, r.recommendation
        FROM companies c
        JOIN readiness_scores r ON c.company_id = r.company_id
        ORDER BY r.overall_score DESC
    """
    df = pd.read_sql_query(query, conn)
    conn.close()

    csv_data = df.to_csv(index=False)
    return Response(
        csv_data,
        mimetype="text/csv",
        headers={"Content-Disposition": "attachment;filename=quantum_readiness_sme_scores.csv"}
    )

# ====================================================================
# ENTRY POINT
# ====================================================================

if __name__ == '__main__':
    print("\n" + "=" * 65)
    print("  QUANTUM READINESS INTELLIGENCE PLATFORM (SME ANALYTICS)")
    print("  Running locally on http://127.0.0.1:5000")
    print("=" * 65 + "\n")
    app.run(host='127.0.0.1', port=5000, debug=True)
