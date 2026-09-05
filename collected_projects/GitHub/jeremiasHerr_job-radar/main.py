import requests
import os
from dotenv import load_dotenv
import psycopg
from psycopg.types.json import Jsonb
from datetime import datetime, timezone

 
SENIORITY_MAP = {
    1: "no experience",
    2: "junior",
    3:"semi-senior",
    4:"senior",
    5:"expert"
}

MODALITY_MAP = {
    "no_remote": "onsite",
    "hybrid": "hybrid",
    "fully_remote": "remote",
    "remote_local": "remote_local",
 }

SOURCE = "getonbrd"

SALARY_CURRENCY = "USD"

def main():
    url = "https://getonbrd.com/api/v0/search/jobs"
    try:
        respuesta = requests.get(url, params={"query": "react", "per_page": 20})
        respuesta.raise_for_status()
    except requests.RequestException as e:
        print(f"Falló el pedido: {e}")
        return

   
    datos = respuesta.json()
    jobs = datos.get("data", [])
    load_dotenv()
    conn = psycopg.connect(os.getenv("DATABASE_URL"))
    with conn.cursor() as cur:
        for job in jobs:    
            job_attributes = job.get("attributes", {})
            title = job_attributes.get("title")
            countries = job_attributes.get("countries", [])
            is_remote = job_attributes.get("remote", False)
            company_id = job_attributes.get("company",{}).get("data", {}).get("id", None)
            job_id = job.get("id", None)
            description = job_attributes.get("description", None)
            desirable = job_attributes.get("desirable", None)
            url_job = job.get("links", {}).get("public_url", None)
            responsibilities = job_attributes.get("functions", None)
            remote_modality_raw = job_attributes.get("remote_modality", None)
            remote_modality_normalized = MODALITY_MAP.get(remote_modality_raw, "unknown")
            seniority_raw = job_attributes.get("seniority", {}).get("data",{}).get("id")
            seniority_normalized = SENIORITY_MAP.get(seniority_raw, "unknown")
            timestamp = job_attributes.get("published_at", None)
            published_at = datetime.fromtimestamp(timestamp, tz=timezone.utc) if timestamp else None
            min_salary = job_attributes.get("min_salary", None)
            max_salary = job_attributes.get("max_salary", None)
            raw = Jsonb(job)
            tags_data = job_attributes.get("tags", {}).get("data", [])
            tags = [t["id"] for t in tags_data]
            applications_count = job_attributes.get("applications_count", None)
            category_name = job_attributes.get("category_name", None)

            cur.execute("""
            INSERT INTO jobs 
            (id, title, countries, is_remote, company_id, description, desirable, url,
            responsibilities, remote_modality_raw, remote_modality_normalized, seniority_raw, seniority_normalized,
            published_at, salary_min, salary_max, raw, source, tags, applications_count, category_name, salary_currency) VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)
            ON CONFLICT (id) DO NOTHING""",
            (job_id,title,countries,is_remote,company_id, description, desirable, url_job, responsibilities, remote_modality_raw,
            remote_modality_normalized, seniority_raw, seniority_normalized, published_at, min_salary, max_salary, raw, SOURCE, tags, applications_count, category_name, SALARY_CURRENCY))
    conn.commit()
    

if __name__ == "__main__":
    main()
