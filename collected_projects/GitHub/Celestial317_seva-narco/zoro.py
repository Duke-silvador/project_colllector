import sys
import os
import re
import random
import socket
import click
import requests
import warnings
import json
import time
from concurrent.futures import ThreadPoolExecutor, as_completed, TimeoutError as FuturesTimeout
from datetime import datetime
from typing import Callable, Optional, List, Dict

from dotenv import load_dotenv
from yaspin import yaspin
from bs4 import BeautifulSoup
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry
from langchain_openai import ChatOpenAI
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import StrOutputParser
from langchain_core.callbacks.base import BaseCallbackHandler

# ----------------- CONFIGURATION -----------------
load_dotenv()

OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY")
OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1"
MODEL_NAME = "xiaomi/mimo-v2.5"  # Hardcoded model choice

# ----- Time caps (seconds) -----
SEARCH_REQ_TIMEOUT = 12     # per search-engine request
SEARCH_STAGE_BUDGET = 18    # whole search stage
SCRAPE_REQ_TIMEOUT = 15     # per page
SCRAPE_STAGE_BUDGET = 20    # per crawl level
CRAWL_BUDGET = 60           # whole crawl, all levels/iterations
MAX_PAGE_CHARS = 1500       # per-page text kept for the summary
MAX_SUMMARY_CHARS = 12000   # total text sent to the summary LLM
warnings.filterwarnings("ignore")

# ----------------- SEARCH MODULE -----------------

USER_AGENTS = [
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36",
    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:137.0) Gecko/20100101 Firefox/137.0",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36 Edg/135.0.3179.54",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36 Edg/135.0.3179.54"
]

SEARCH_ENGINE_ENDPOINTS = [
    "http://juhanurmihxlp77nkq76byazcldy2hlmovfu2epvl5ankdibsot4csyd.onion/search/?q={query}", # Ahmia
    "http://3bbad7fauom4d6sgppalyqddsqbf5u5p56b5k5uk2zxsy3d6ey2jobad.onion/search?q={query}", # OnionLand
    "http://darkhuntyla64h75a3re5e2l3367lqn7ltmdzpgmr6b4nbz3q2iaxrid.onion/search?q={query}", # DarkHunt
    "http://iy3544gmoeclh5de6gez2256v6pjh4omhpqdh2wpeeppjtvqmjhkfwad.onion/torgle/?query={query}", # Torgle
    "http://amnesia7u5odx5xbwtpnqk3edybgud5bmiagu75bnqx2crntw5kry7ad.onion/search?query={query}", # Amnesia
    "http://kaizerwfvp5gxu6cppibp7jhcqptavq3iqef66wbxenh6a2fklibdvid.onion/search?q={query}", # Kaizer
    "http://anima4ffe27xmakwnseih3ic2y7y3l6e7fucwk4oerdn4odf7k74tbid.onion/search?q={query}", # Anima
    "http://tornadoxn3viscgz647shlysdy7ea5zqzwda7hierekeuokh5eh5b3qd.onion/search?q={query}", # Tornado
    "http://tornetupfu7gcgidt33ftnungxzyfq2pygui5qdoyss34xbgx2qruzid.onion/search?q={query}", # TorNet
    "http://torgolnpeouim56dykfob6jh5r2ps2j73enc42s2um4ufob3ny4fcdyd.onion/?q={query}", # Torgol
    "http://searchgf7gdtauh7bhnbyed4ivxqmuoat3nm6zfrg3ymkq6mtnpye3ad.onion/search?q={query}" # The Deep Searches
]

def check_port(port):
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        return s.connect_ex(('127.0.0.1', port)) == 0

def get_tor_proxies():
    # Detect port 9050 or 9150
    port = 9050
    if not check_port(9050) and check_port(9150):
        port = 9150
    
    return {
        "http": f"socks5h://127.0.0.1:{port}",
        "https": f"socks5h://127.0.0.1:{port}"
    }

def fetch_search_results(endpoint, query):
    url = endpoint.format(query=query)
    headers = {"User-Agent": random.choice(USER_AGENTS)}
    proxies = get_tor_proxies()
    
    try:
        response = requests.get(url, headers=headers, proxies=proxies, timeout=SEARCH_REQ_TIMEOUT)
        if response.status_code == 200:
            soup = BeautifulSoup(response.text, "html.parser")
            links = []
            for a in soup.find_all('a'):
                try:
                    href = a['href']
                    title = a.get_text(strip=True)
                    # Look for onion links
                    found = re.findall(r'https?:\/\/[^\/]*\.onion.*', href)
                    if found:
                        links.append({"title": title, "link": found[0]})
                except:
                    continue
            return links
        else:
            return []
    except Exception as e:
        # print(f"DEBUG: Failed to fetch {url}: {e}")
        return []

def get_search_results(refined_query, max_workers=5):
    results = []
    # Print proxies being used for debugging visibility
    proxies = get_tor_proxies()
    # click.echo(f"DEBUG: Using proxies: {proxies}")

    # Hit every engine in parallel; keep whatever answers within the budget.
    executor = ThreadPoolExecutor(max_workers=len(SEARCH_ENGINE_ENDPOINTS))
    futures = [executor.submit(fetch_search_results, endpoint, refined_query)
               for endpoint in SEARCH_ENGINE_ENDPOINTS]
    try:
        for future in as_completed(futures, timeout=SEARCH_STAGE_BUDGET):
            res = future.result()
            if res:
                results.extend(res)
    except FuturesTimeout:
        pass
    finally:
        executor.shutdown(wait=False, cancel_futures=True)

    # Deduplicate
    seen_links = set()
    unique_results = []
    for res in results:
        link = res.get("link")
        if link and link not in seen_links:
            seen_links.add(link)
            unique_results.append(res)
    return unique_results

# ----------------- SCRAPE MODULE -----------------

def get_tor_session():
    session = requests.Session()
    retry = Retry(total=1, backoff_factor=0.2, status_forcelist=[500, 502, 503, 504])
    adapter = HTTPAdapter(max_retries=retry)
    session.mount("http://", adapter)
    session.mount("https://", adapter)
    session.proxies = get_tor_proxies()
    return session

def scrape_single(url_data):
    url = url_data['link']
    headers = {"User-Agent": random.choice(USER_AGENTS)}
    try:
        session = get_tor_session()
        response = session.get(url, headers=headers, timeout=SCRAPE_REQ_TIMEOUT)
        
        if response.status_code == 200:
            soup = BeautifulSoup(response.text, "html.parser")
            for script in soup(["script", "style"]):
                script.extract()
            text = soup.get_text(separator=' ')
            text = ' '.join(text.split())
            scraped_text = f"{url_data['title']} - {text}"
        else:
            scraped_text = url_data['title']
    except Exception:
        scraped_text = url_data['title']
    
    return url, scraped_text

def scrape_multiple(urls_data, max_workers=5):
    results = {}
    executor = ThreadPoolExecutor(max_workers=max_workers)
    future_to_url = {executor.submit(scrape_single, u): u for u in urls_data}
    try:
        for future in as_completed(future_to_url, timeout=SCRAPE_STAGE_BUDGET):
            try:
                url, content = future.result()
                if len(content) > MAX_PAGE_CHARS:
                    content = content[:MAX_PAGE_CHARS] + "...(truncated)"
                results[url] = content
            except Exception:
                continue
    except FuturesTimeout:
        pass  # keep the pages that finished in time
    finally:
        executor.shutdown(wait=False, cancel_futures=True)
    return results

# ----------------- LLM MODULE -----------------

def get_llm():
    if not OPENROUTER_API_KEY:
        raise ValueError("OPENROUTER_API_KEY not found in env.")
    return ChatOpenAI(
        model_name=MODEL_NAME,
        base_url=OPENROUTER_BASE_URL,
        api_key=OPENROUTER_API_KEY,
        temperature=0,
        max_tokens=2048,   # cap reservation so low-credit accounts aren't rejected (402)
        max_retries=2,     # ride out transient provider 503 / no_capacity
        timeout=45,
    )

def refine_query(llm, user_input):
    system_prompt = """
    You are a Cybercrime Threat Intelligence Expert. Refine the query for darkweb search engines.
    Rules:
    1. Improve query for search engine use (keywords).
    2. No boolean operators (AND, OR).
    3. Output ONLY the refined query string.
    """
    prompt = ChatPromptTemplate([("system", system_prompt), ("user", "{query}")])
    chain = prompt | llm | StrOutputParser()
    return chain.invoke({"query": user_input}).strip().strip('"')

def _generate_final_string(results):
    final_str = []
    for i, res in enumerate(results):
        link = re.sub(r"(?<=\.onion).*", "", res["link"])
        title = re.sub(r"[^0-9a-zA-Z\-\.]", " ", res["title"])
        final_str.append(f"{i+1}. {link} - {title}")
    return "\n".join(final_str)

def filter_results(llm, query, results):
    if not results: return []
    
    system_prompt = """
    You are a Cybercrime Threat Intelligence Expert.
    Select the Top 10 most relevant dark web search results for the query.
    Output ONLY a comma-separated list of result INDICES (e.g. 1, 3, 5).
    
    Query: {query}
    Results:
    """
    results_str = _generate_final_string(results)
    prompt = ChatPromptTemplate([("system", system_prompt), ("user", "{results}")])
    chain = prompt | llm | StrOutputParser()
    
    try:
        indices_str = chain.invoke({"query": query, "results": results_str})
        indices = [int(i) for i in re.findall(r"\d+", indices_str)]
        selected = [results[i-1] for i in indices if 1 <= i <= len(results)]
        # Dedup
        seen = set()
        final_selected = []
        for s in selected:
            if s['link'] not in seen:
                seen.add(s['link'])
                final_selected.append(s)
        return final_selected[:10]
    except Exception:
        return results[:10] # Fallback

def generate_summary(llm, query, scraped_data):
    content_str = "\n".join([f"Source: {k}\nContent: {v}\n" for k,v in scraped_data.items()])
    content_str = content_str[:MAX_SUMMARY_CHARS]

    system_prompt = """
    You are a Cybercrime Threat Intelligence Expert. Analyze the dark web search content.
    
    Output a structured Markdown report in the following format:
    
    # Intelligence Report: {query}
    
    ## 1. Executive Summary
    Brief overview of findings.
    
    ## 2. Source Links
    *   `link.onion` - [Description]
    
    ## 3. Artifacts
    *   **Vendors**: ...
    *   **Contacts**: ...
    *   **Crypto**: ...
    
    ## 4. Key Insights
    1.  ...
    2.  ...
    
    ## 5. Next Steps
    *   ...
    
    Do NOT use JSON. Use standard Markdown with clear headers.
    """
    prompt = ChatPromptTemplate([("system", system_prompt), ("user", "{content}")])
    chain = prompt | llm | StrOutputParser()
    result = chain.invoke({"query": query, "content": content_str})
    return result

# ----------------- CLI -----------------

# ----------------- AGENTIC & CRAWLER LOGIC -----------------

class DarkWebAgent:
    def __init__(self, llm, max_depth=3, max_iterations=3):
        self.llm = llm
        self.max_depth = max_depth
        self.max_iterations = max_iterations
        self.visited_links = set()
        self.collected_artifacts = []
        self.deadline = None

    def out_of_time(self):
        return self.deadline is not None and time.time() >= self.deadline

    def reflect_and_refine(self, query, iteration, feedback=""):
        """
        Agentic Step: Refine the search query based on previous failure/feedback.
        """
        system_prompt = f"""
        You are an advanced Dark Web Investigator Agent. 
        Iteration: {iteration}/{self.max_iterations}
        
        Your Goal: Find actionable intelligence for: "{query}"
        
        Previous Feedback: {feedback}
        
        Task:
        1. Analyze why previous attempts might have failed.
        2. Generate a NEW, MORE SPECIFIC and PRECISE search query.
        3. Do NOT use boolean operators.
        4. Focus on deep web slang, specific vendor names, or product codes.
        5. CRITICAL: Keep query under 6 words.
        
        Output ONLY the new query string.
        """
        prompt = ChatPromptTemplate([("system", system_prompt), ("user", "{query}")])
        chain = prompt | self.llm | StrOutputParser()
        return chain.invoke({"query": query}).strip().strip('"')

    def extract_onion_links(self, text):
        """Extracts .onion links from text."""
        return re.findall(r'https?:\/\/[a-z0-9]{56}\.onion\S*', text) + \
               re.findall(r'https?:\/\/[a-z0-9]{16}\.onion\S*', text)

    def recursive_crawl(self, start_links, depth, max_links_per_level=5):
        """
        crawls recursively up to self.max_depth.
        """
        if depth > self.max_depth or self.out_of_time():
            return {}
        
        click.echo(f"    Crawling Depth {depth} ({len(start_links)} links)...")
        
        # Scrape current level
        # Prepare list of dicts for scrape_multiple
        to_scrape = [{"link": link, "title": f"Depth {depth} Node"} for link in start_links if link not in self.visited_links]
        
        if not to_scrape:
            return {}
            
        for item in to_scrape:
            self.visited_links.add(item['link'])
            
        # Limit to prevent explosion
        to_scrape = to_scrape[:max_links_per_level]
        
        scraped_content = scrape_multiple(to_scrape, max_workers=5)
        
        results = scraped_content.copy() # Store current level
        
        # If we need to go deeper
        if depth < self.max_depth:
            next_level_links = set()
            for url, content in scraped_content.items():
                found = self.extract_onion_links(content)
                for link in found:
                    if link not in self.visited_links:
                        next_level_links.add(link)
            
            # Recurse
            if next_level_links:
                # Prioritize links? (Random for now or LLM filter could be added)
                sorted_next = list(next_level_links)[:5]
                child_results = self.recursive_crawl(sorted_next, depth + 1, max_links_per_level=5)
                results.update(child_results)
                
        return results

    def run(self, initial_query):
        current_query = initial_query
        knowledge_base = {} # url -> content
        self.deadline = time.time() + CRAWL_BUDGET

        with yaspin(text="Initializing Agent...", color="yellow") as sp:
            for i in range(1, self.max_iterations + 1):
                if self.out_of_time():
                    sp.write("    Time budget reached. Wrapping up.")
                    break
                sp.write(f"\n Iteration {i}: Planning Search...")
                
                # 1. Refine
                if i > 1:
                    refined_query = self.reflect_and_refine(initial_query, i, feedback="Previous search yield low relevance.")
                    sp.write(f"    Agent Thought: Trying new query -> '{refined_query}'")
                else:
                    refined_query = refine_query(self.llm, current_query)
                    sp.write(f"    Agent Thought: Initial refinement -> '{refined_query}'")

                # 2. Search (Depth 0)
                sp.text = f"Searching: {refined_query}..."
                search_results = get_search_results(refined_query, max_workers=5)
                
                if not search_results:
                    sp.write(f"    No results found. Retrying with new strategy...")
                    continue
                
                sp.write(f"    Found {len(search_results)} seed targets.")
                
                # 3. Filter
                filtered_seeds = filter_results(self.llm, refined_query, search_results)
                seeds = [f['link'] for f in filtered_seeds][:5]
                
                # 4. Deep Crawl (Depth 1 to Max)
                sp.text = "Running Recursive Crawl (Depth 1-3)..."
                
                # Start crawling from seeds
                iteration_results = self.recursive_crawl(seeds, depth=1)
                num_new = len(iteration_results)
                sp.write(f"     Crawled {num_new} pages in this cycle.")
                
                knowledge_base.update(iteration_results)
                
                # 5. Evaluate (Simple check for now)
                if num_new > 5:
                    sp.write(f"    Sufficient intelligence gathered.")
                    break
        
        return knowledge_base

# ----------------- CLI -----------------

@click.command()
@click.option("--query", "-q", required=True, prompt="Enter query", help="Dark web search query")
@click.option("--output", "-o", help="Output file (.md)")
@click.option("--depth", "-d", default=3, help="Max crawl depth")
def zoro(query, output, depth):
    """Zoro: Agentic AI Dark Web OSINT Tool."""
    
    click.echo(f"\n  Zoro (Agentic Mode) is hunting for: '{query}'")
    
    proxies = get_tor_proxies()
    port = proxies['http'].split(':')[-1]
    if not check_port(int(port)):
        click.echo(f"  WARNING: Tor (Port {port}) not reachable! Results will be empty.")
        return # Exit early if no Tor
    
    try:
        llm = get_llm()
    except Exception as e:
        click.echo(f"Error initializing LLM: {e}")
        return

    agent = DarkWebAgent(llm, max_depth=depth, max_iterations=3)
    final_data = agent.run(query)
    
    if not final_data:
        click.echo(" Mission Failed: No intelligence found after agentic iterations.")
        return

    click.echo("\nGenerating Final Intelligence Report...")
    report = generate_summary(llm, query, final_data)
    
    if output:
        with open(output, "w", encoding="utf-8") as f:
            f.write(report)
        click.echo(f"Report saved to {output}")
    else:
        click.echo("\n" + "="*40)
        click.echo(report)
        click.echo("="*40 + "\n")

if __name__ == "__main__":
    zoro()
