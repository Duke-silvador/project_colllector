import os
import requests
import base64
from datetime import datetime, timezone

GITHUB_TOKEN = os.getenv("GH_TOKEN")
REPO_NAME = os.getenv("GITHUB_REPOSITORY")

HEADERS = {
    "Authorization": f"Bearer {GITHUB_TOKEN}",
    "Accept": "vnd.github+json"
} if GITHUB_TOKEN else {}

# Hapa ndipo tulipoweka aina zote za lugha za programu (Extensions) za kuchukua
VALID_EXTENSIONS = (
    '.py', '.js', '.ts', '.cpp', '.c', '.h', '.hpp', 
    '.java', '.go', '.rs', '.rb', '.php', '.sh', '.html', '.css', '.json'
)

def fetch_latest_github_repos():
    url = "https://api.github.com/search/repositories?q=created:>2026-08-30&sort=updated&order=desc"
    response = requests.get(url, headers=HEADERS)
    if response.status_code == 200:
        return response.json().get("items", [])
    print("Hitilafu GitHub API:", response.status_code, response.text)
    return []

def fetch_latest_huggingface_spaces():
    url = "https://huggingface.co/api/spaces?limit=10&full=true"
    response = requests.get(url)
    if response.status_code == 200:
        return response.json()
    print("Hitilafu Hugging Face API:", response.status_code)
    return []

def save_project_structure(source_name, proj_id, description, collected_files={}):
    safe_id = proj_id.replace("/", "_")
    folder_path = f"collected_projects/{source_name}/{safe_id}"
    os.makedirs(folder_path, exist_ok=True)
    
    # Kuandika faili la maelezo (README)
    with open(f"{folder_path}/README.md", "w", encoding="utf-8") as f:
        f.write(f"# Project: {proj_id}\n\n**Source:** {source_name}\n\n**Description:** {description}\n")
    
    # Kuweka mafaili yote ya kodi yaliyovutwa kwenye folda hiyo
    for filename, content in collected_files.items():
        file_path = f"{folder_path}/{filename}"
        with open(file_path, "w", encoding="utf-8") as f:
            f.write(content)
            
    print(f"Imehifadhiwa kikamilifu: {source_name} -> {proj_id} (Mafaili {len(collected_files)} yamechukuliwa)")

def process_github_repos():
    repos = fetch_latest_github_repos()
    for repo in repos:
        full_name = repo.get("full_name")
        desc = repo.get("description") or "Hakuna maelezo"
        
        contents_url = f"https://api.github.com/repos/{full_name}/contents"
        contents_res = requests.get(contents_url, headers=HEADERS)
        
        collected_files = {}
        if contents_res.status_code == 200:
            files = contents_res.json()
            if isinstance(files, list):
                for file in files:
                    # Inachunguza kama ni faili na linaishia kwenye mojawapo ya lugha zetu zilizoorodheshwa
                    if file.get('type') == 'file' and file['name'].lower().endswith(VALID_EXTENSIONS):
                        file_res = requests.get(file['download_url'])
                        if file_res.status_code == 200:
                            collected_files[file['name']] = file_res.text
                            
        save_project_structure("GitHub", full_name, desc, collected_files)

def process_huggingface_spaces():
    spaces = fetch_latest_huggingface_spaces()
    for space in spaces:
        space_id = space.get("id") or space.get("_id", "unknown_space")
        desc = space.get("title") or "Hugging Face Space mpya"
        
        hf_files = {"info.txt": "Hugging Face Space - Auto Collected Metadata"}
        save_project_structure("HuggingFace", space_id, desc, hf_files)

if __name__ == "__main__":
    print(f"Uchunguzi umeanza rasmi: {datetime.now(timezone.utc)}")
    process_github_repos()
    process_huggingface_spaces()
    print("Mchakato umekamilika kwa mafanikio.")
