#!/usr/bin/env python3
"""
GitHub Achievements Farmer (API Version)
Débloque automatiquement :
- ⚡ Quickdraw (Fermer une issue ou PR en moins de 5 min)
- 🪂 YOLO (Merger une PR sans code review)
- 👯 Pair Extraordinaire (Co-auteur sur un commit d'une PR fusionnée)
- 🦈 Pull Shark (x1, x16, x128 PRs fusionnées)
"""

import os
import sys
import time
import requests

GITHUB_API_URL = "https://api.github.com"

def get_headers(token):
    return {
        "Authorization": f"Bearer {token}",
        "Accept": "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
    }

def verify_token(token):
    res = requests.get(f"{GITHUB_API_URL}/user", headers=get_headers(token))
    if res.status_code != 200:
        print(f"❌ Erreur de token ({res.status_code}) : {res.json().get('message')}")
        return None
    user = res.json()
    print(f"✅ Connecté en tant que : {user['login']} ({user.get('name', '')})")
    return user['login']

def ensure_repo(owner, repo_name, token):
    headers = get_headers(token)
    res = requests.get(f"{GITHUB_API_URL}/repos/{owner}/{repo_name}", headers=headers)
    if res.status_code == 200:
        print(f"✅ Dépôt public trouvé : {owner}/{repo_name}")
        return True
    
    print(f"🔄 Création du dépôt public : {repo_name}...")
    create_res = requests.post(
        f"{GITHUB_API_URL}/user/repos",
        headers=headers,
        json={
            "name": repo_name,
            "description": "Repo pour débloquer les succès et trophées GitHub",
            "private": False,
            "auto_init": True
        }
    )
    if create_res.status_code in [200, 201]:
        print(f"✅ Dépôt créé : {owner}/{repo_name}")
        time.sleep(2)
        return True
    else:
        print(f"❌ Impossible de créer le dépôt : {create_res.text}")
        return False

def unlock_quickdraw(owner, repo, token):
    print("\n⚡ [1/4] Déblocage de Quickdraw...")
    headers = get_headers(token)
    # Créer une issue
    issue_res = requests.post(
        f"{GITHUB_API_URL}/repos/{owner}/{repo}/issues",
        headers=headers,
        json={"title": "Quickdraw Achievement Farm", "body": "Fermeture rapide pour débloquer Quickdraw"}
    )
    if issue_res.status_code in [200, 201]:
        issue_number = issue_res.json()["number"]
        print(f"   Issue #{issue_number} créée. Fermeture immédiate...")
        time.sleep(1)
        close_res = requests.patch(
            f"{GITHUB_API_URL}/repos/{owner}/{repo}/issues/{issue_number}",
            headers=headers,
            json={"state": "closed"}
        )
        if close_res.status_code == 200:
            print("   🎉 Quickdraw débloqué avec succès !")
        else:
            print(f"   ⚠️ Échec fermeture issue : {close_res.text}")
    else:
        print(f"   ⚠️ Erreur création issue : {issue_res.text}")

def get_default_branch_sha(owner, repo, token):
    headers = get_headers(token)
    res = requests.get(f"{GITHUB_API_URL}/repos/{owner}/{repo}", headers=headers)
    default_branch = res.json().get("default_branch", "main")
    ref_res = requests.get(f"{GITHUB_API_URL}/repos/{owner}/{repo}/git/ref/heads/{default_branch}", headers=headers)
    return default_branch, ref_res.json()["object"]["sha"]

def unlock_pr_achievements(owner, repo, token, target_prs=128):
    print(f"\n🦈 [2/4 & 3/4 & 4/4] Déblocage de YOLO, Pair Extraordinaire et Pull Shark (Objectif : {target_prs} PRs)...")
    headers = get_headers(token)
    default_branch, base_sha = get_default_branch_sha(owner, repo, token)

    for i in range(1, target_prs + 1):
        branch_name = f"achievement-farm-{int(time.time())}-{i}"
        
        # 1. Créer la branche
        ref_payload = {
            "ref": f"refs/heads/{branch_name}",
            "sha": base_sha
        }
        ref_res = requests.post(f"{GITHUB_API_URL}/repos/{owner}/{repo}/git/refs", headers=headers, json=ref_payload)
        if ref_res.status_code not in [200, 201]:
            print(f"   ⚠️ Échec création branche {branch_name} : {ref_res.text}")
            continue

        # 2. Créer un fichier / commit avec co-author pour Pair Extraordinaire
        file_path = f"farm/item_{i}.txt"
        commit_msg = f"Add farm item {i}\n\nCo-authored-by: bot-partner <bot-partner@users.noreply.github.com>"
        content_b64 = "T2sgZmFybQ==" # 'Ok farm' en base64

        file_payload = {
            "message": commit_msg,
            "content": content_b64,
            "branch": branch_name
        }
        requests.put(f"{GITHUB_API_URL}/repos/{owner}/{repo}/contents/{file_path}", headers=headers, json=file_payload)

        # 3. Créer la PR
        pr_payload = {
            "title": f"Achievement Farm PR #{i}",
            "head": branch_name,
            "base": default_branch,
            "body": "PR automatique pour Pull Shark, YOLO et Pair Extraordinaire"
        }
        pr_res = requests.post(f"{GITHUB_API_URL}/repos/{owner}/{repo}/pulls", headers=headers, json=pr_payload)
        if pr_res.status_code not in [200, 201]:
            print(f"   ⚠️ Erreur création PR #{i} : {pr_res.text}")
            continue
        
        pr_num = pr_res.json()["number"]

        # 4. Merger la PR (YOLO + Pull Shark)
        merge_payload = {
            "commit_title": f"Merge PR #{pr_num} for Achievements",
            "merge_method": "squash"
        }
        merge_res = requests.put(f"{GITHUB_API_URL}/repos/{owner}/{repo}/pulls/{pr_num}/merge", headers=headers, json=merge_payload)
        if merge_res.status_code == 200:
            base_sha = merge_res.json()["sha"]
            print(f"   ✅ PR #{pr_num} mergée ({i}/{target_prs})")
        else:
            print(f"   ⚠️ Échec merge PR #{pr_num} : {merge_res.text}")

        # Supprimer la branche distante
        requests.delete(f"{GITHUB_API_URL}/repos/{owner}/{repo}/git/refs/heads/{branch_name}", headers=headers)
        
        # Pause légère pour respecter les rate limits de l'API GitHub
        time.sleep(0.5)

    print("\n🎉 YOLO, Pair Extraordinaire et Pull Shark farmés avec succès !")

def main():
    print("=" * 60)
    print(" 🏆 GITHUB ACHIEVEMENTS FARMER 🏆 ")
    print("=" * 60)
    
    token = os.getenv("GITHUB_TOKEN")
    if not token and len(sys.argv) > 1:
        token = sys.argv[1]

    if not token:
        print("\n🔑 Pour exécuter ce script, fournissez votre Personal Access Token GitHub (PAT).")
        print("Usage: python3 farmer.py <VOTRE_GITHUB_TOKEN> [NOMBRE_DE_PRS]")
        print("Note: Vous pouvez créer un token classique avec le scope 'repo' sur https://github.com/settings/tokens\n")
        return

    target_prs = int(sys.argv[2]) if len(sys.argv) > 2 else 16

    username = verify_token(token)
    if not username:
        return

    repo_name = "github-achievements-trophies"
    if ensure_repo(username, repo_name, token):
        unlock_quickdraw(username, repo_name, token)
        unlock_pr_achievements(username, repo_name, token, target_prs=target_prs)

if __name__ == "__main__":
    main()
