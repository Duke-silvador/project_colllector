"""Local synthetic PACT walkthrough; no accounts or external actions."""

from pathlib import Path
from threading import Lock

from fastapi import FastAPI, HTTPException
from fastapi.responses import FileResponse

from pact import (CONTINGENCIES, candidates, graph, memories, revision, scenario,
                  seed, set_contingency, simulate_withdrawal)
from planner import plan
from agent import review


app = FastAPI(title="PACT synthetic demo")
_demo_lock = Lock()
_web = Path(__file__).parent / "web"


@app.get("/")
def home():
    return FileResponse(_web / "index.html")


@app.get("/app.css")
def css():
    return FileResponse(_web / "app.css", media_type="text/css")


@app.get("/app.js")
def javascript():
    return FileResponse(_web / "app.js", media_type="text/javascript")


@app.get("/api/state")
def state():
    try:
        g = graph()
        for _ in range(3):
            current = scenario(g)
            episodes = [row[0] for row in g.ro_query(
                "MATCH (e:Episode {kind:'withdrawal'}) RETURN e.id").result_set]
            proposals = [{"id": row[0], "revision": row[1],
                          "created_at": row[2], "status": row[3],
                          "current": row[1] == current["revision"]}
                         for row in g.ro_query("""MATCH (p:Proposal)
                           RETURN p.id, p.revision, p.created_at, p.status
                           ORDER BY p.created_at DESC LIMIT 5""").result_set]
            result = {"candidate_graph": candidates(g), "scenario": current,
                      "proposal": plan(current), "episodes": episodes,
                      "memories": memories(g), "saved_proposals": proposals}
            if revision(g) == current["revision"]:
                return result
        raise RuntimeError("Graph changed during state read; retry")
    except Exception as error:
        raise HTTPException(503, f"FalkorDB demo unavailable: {error}") from error


@app.post("/api/reset")
def reset():
    with _demo_lock:
        try:
            seed(graph())
        except Exception as error:
            raise HTTPException(503, f"Could not reset synthetic graph: {error}") from error
    return state()


@app.post("/api/withdraw")
def withdraw():
    with _demo_lock:
        try:
            simulate_withdrawal(graph())
        except Exception as error:
            raise HTTPException(503, f"Could not simulate withdrawal: {error}") from error
    return state()


@app.post("/api/contingency/{name}")
def contingency(name: str):
    if name not in CONTINGENCIES:
        raise HTTPException(400, "Unknown synthetic contingency")
    with _demo_lock:
        try:
            set_contingency(graph(), name)
        except ValueError as error:
            raise HTTPException(409, str(error)) from error
        except Exception as error:
            raise HTTPException(503, f"Could not update synthetic contingency: {error}") from error
    return state()


@app.post("/api/agent-review")
def agent_review():
    try:
        return review(graph())
    except Exception as error:
        raise HTTPException(503, f"Local agent unavailable: {error}") from error
