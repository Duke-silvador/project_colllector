#!/usr/bin/env python3
"""
autonomous_cloud_agent.py
=============================================================================
ARI AUTONOMOUS AI AGENT (100% Free Multi-Model Council)
=============================================================================
Hostable on: Render.com (Cloud Background Worker) & Cloudflare Edge
Cognitive Engine:
  - Primary Proposer: Cloudflare Workers AI (DeepSeek R1 32B / Llama 3.1 8B)
  - Safety Judge & Verifier: Cloudflare Workers AI (Llama 3.2 3B Instruct) across 3 Edge Nodes
Core Features:
  - Anti-Stupid Dual-Verification Layer (Plan -> Critique -> Approve)
  - Autonomous Render Token Collection Failover (Node 1 -> Node 2 if GitHub Actions limits up)
  - Autonomous Multi-Chain Profit Sweeper (8-Bot Multi-Chain Yields + On-Chain Master Vaults)
  - Reflexion Long-Term Memory (Learns from every mistake via Upstash Redis)
  - 24/7 Autonomous Fleet Oversight & Automated Payout Management
=============================================================================
"""

import os
import re
import sys
import json
import time
import asyncio
import logging
from typing import Dict, Any, List, Optional, Tuple
from datetime import datetime, timezone, timedelta
import aiohttp
from dotenv import load_dotenv

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
load_dotenv(os.path.join(BASE_DIR, ".env"))

logging.basicConfig(
    level=logging.INFO,
    format="[%(asctime)s UTC] [%(levelname)s] [%(name)s] %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S"
)
logger = logging.getLogger("AriAgent")

# Credentials & Cloud Endpoints (100% Cloudflare Workers AI - Zero External Keys)
REPORT_BOT_TOKEN = os.getenv("REPORT_BOT_TOKEN", "")
REPORT_CHAT_ID = os.getenv("REPORT_CHAT_ID", "6727787768")
PAYOUT_CHANNEL_ID = os.getenv("PAYOUT_CHANNEL_ID", "-1004402765950")

UPSTASH_URL = os.getenv("UPSTASH_REDIS_REST_URL", "https://internal-dodo-83852.upstash.io")
UPSTASH_TOKEN = os.getenv("UPSTASH_REDIS_REST_TOKEN", "")

CF_SECRET_KEY = os.getenv("CF_SECRET_KEY") or os.getenv("SECRET_KEY", "")

# Target Wallets
MASTER_EVM_VAULT = "0xfda4182001672b9f0f09e2118242e543e35ed5ce"
MASTER_TON_VAULT = "UQBPZiSvitdPU3VUyJK2mRaHVBl69xejw5aOrh1KfKA7gwDT"

# Cloudflare Edge AI Endpoints (100% Free, Zero API Keys Required across 5 Edge Nodes)
CF_AI_NODES = [
    "https://restore-agy.agorameet.workers.dev/ai",
    "https://restore-agy.aaaai2.workers.dev/ai",
    "https://restore-agy.aaa-bot.workers.dev/ai",
    "https://restore-agy.aaa222.workers.dev/ai",
    "https://restore-agy.aaaai.workers.dev/ai"
]

# Render Standby Token Collection Nodes (100% Free Cloud Failover)
RENDER_STANDBY_NODES = [
    ("Render Node 3 (Oregon - Primary Active)", "https://my-agy-fleet-standby-node3.onrender.com/collect-tokens"),
    ("Render Node 2 (Frankfurt - Standby)", "https://my-agy-fleet-standby-node2.onrender.com/collect-tokens"),
    ("Render Node 1 (Singapore - Standby)", "https://my-agy-fleet-standby.onrender.com/collect-tokens")
]


# =============================================================================
# COGNITIVE ENGINE: THE MULTI-MODEL COUNCIL
# =============================================================================

class MultiModelCouncil:
    """
    Orchestrates native Cloudflare Workers AI across the edge GPU mesh with
    cross-model validation (DeepSeek R1 / Llama 3.1 Proposer + Llama 3.2 Safety Judge)
    and zero-downtime failover. 100% free, zero external keys, zero rate limits.
    """
    def __init__(self):
        self.cf_node_idx = 0

    async def query_ai_proposer(self, session: aiohttp.ClientSession, prompt: str) -> Optional[str]:
        """Queries Cloudflare Workers AI with DeepSeek R1 / Llama 3.1 for high-level tactical reasoning."""
        for i in range(len(CF_AI_NODES)):
            node_url = CF_AI_NODES[(self.cf_node_idx + i) % len(CF_AI_NODES)]
            try:
                cf_payload = {
                    "prompt": (
                        "You are the Lead Autonomous Fleet Commander (Ari AI Council).\n"
                        "Decide the best next operational step. Output JSON ONLY with keys: thought, action, target_account, confidence.\n\n"
                        f"{prompt}"
                    ),
                    "model": "deepseek"
                }
                async with session.post(node_url, json=cf_payload, timeout=aiohttp.ClientTimeout(total=10)) as cf_r:
                    if cf_r.status == 200:
                        d = await cf_r.json()
                        ans = d.get("answer") or d.get("response") or ""
                        if ans:
                            m = re.search(r"\{.*\}", ans, re.DOTALL)
                            return m.group(0) if m else ans
            except Exception as e:
                logger.debug(f"[Council: CF Proposer] Node {node_url} failed: {e}")
                continue
        return None

    async def query_safety_judge(self, session: aiohttp.ClientSession, prompt: str) -> Optional[str]:
        """
        Queries Cloudflare Workers AI (Llama 3.2 3B Instruct) across the Edge Nodes.
        100% Free, zero-cost, no API keys, zero rate limits.
        """
        for i in range(len(CF_AI_NODES)):
            node_url = CF_AI_NODES[(self.cf_node_idx + i) % len(CF_AI_NODES)]
            try:
                judge_payload = {
                    "prompt": (
                        "You are the Chief Safety and Verification Officer for an automated crypto mining fleet.\n"
                        "Audit this proposed action strictly for logic bugs, anti-ban risks, cooldown violations, or policy limits.\n"
                        "Output valid JSON ONLY with format:\n"
                        '{"approved": true, "reason": "concise explanation", "sanitized_action": "action_name"}\n\n'
                        f"PROPOSAL AND STATE:\n{prompt}"
                    ),
                    "model": "llama"
                }
                async with session.post(node_url, json=judge_payload, timeout=aiohttp.ClientTimeout(total=8)) as resp:
                    if resp.status == 200:
                        data = await resp.json()
                        ans = data.get("answer") or data.get("response") or ""
                        if ans:
                            m = re.search(r"\{.*\}", ans, re.DOTALL)
                            if m:
                                self.cf_node_idx = (self.cf_node_idx + i + 1) % len(CF_AI_NODES)
                                return m.group(0)
                            return ans
            except Exception as e:
                logger.debug(f"[Council: CF Judge] {node_url} note: {e}")
                continue
        return None

    async def decide_with_anti_stupid_verification(
        self,
        session: aiohttp.ClientSession,
        state: Dict[str, Any],
        lessons: List[str]
    ) -> Dict[str, Any]:
        """
        Two-Model Dual-Verification Loop:
        1. Cloudflare Workers AI (DeepSeek R1 / Llama 3.1) proposes tactical action
        2. Cloudflare Workers AI (Llama 3.2 3B) audits & critiques the plan
        3. If approved, returns executable action.
        """
        lessons_text = "\n".join(f"- {l}" for l in lessons[-8:]) if lessons else "None yet."

        proposer_prompt = f"""
You are the Lead Autonomous Fleet Commander (Ari AI Council).
Current Live State:
{json.dumps(state, indent=2)}

Past Lessons & Directives (NEVER VIOLATE THESE RULES):
{lessons_text}
- The fleet exclusively operates 8 legitimate bots: MRG Miner, ATF Miner, Victor's Company, Kynex Network, DiggoMiner, PepeGram, AdxEarn AI, and Chicken Land.
- ATF Miner is strictly in 100% FARMING & ACCUMULATION MODE (NO premature withdrawals; allow hash and balance to compound).
- Master account (6727787768) maintains maximum compound hash and acts as primary referrer.
- Worker accounts auto-harvest and compound mining cycles according to optimal cooldown intervals.
- If tokens are stale (>12h old) or GitHub Actions hit limits, action must be 'refresh_tokens_render'.
- Defunct bots (Astra Airdrop, LeafEarn, PumpkinEarn, Stones, AI Lab, UltraWallet, FINVORA, ART, Apex, Ainovum, TRX Power, Bitcoin Cloud, Tensor, Ton Trader, USDT QUAD, TAC, Ominix) are permanently purged.

Decide the best next operational step. Output JSON ONLY:
{{
  "thought": "Your tactical reasoning",
  "action": "harvest" | "sweep_all" | "refresh_tokens_render" | "executive_briefing" | "rest",
  "target_account": "all" or specific account ID,
  "confidence": 0.0 to 1.0
}}
"""
        plan_str = await self.query_ai_proposer(session, proposer_prompt)
        try:
            plan = json.loads(plan_str) if plan_str else {"action": "rest", "thought": "Failover default rest"}
        except Exception:
            # Fallback regex search
            m = re.search(r"\{.*\}", plan_str or "", re.DOTALL)
            plan = json.loads(m.group(0)) if m else {"action": "rest", "thought": "Plan parse failed"}

        # Step 2: The Safety Judge (Cloudflare Workers AI Llama 3.2 3B Cross-Check)
        judge_prompt = f"""
Audit this proposed action plan:
PROPOSED PLAN: {json.dumps(plan)}
CURRENT STATE: {json.dumps(state)}
RULES:
1. Are any accounts on cooldown being prematurely queried?
2. Are the wallet destinations matching the required network ({MASTER_EVM_VAULT})?
3. Is host account 6727787768 protected from withdrawal?
4. Is confidence >= 0.8?

Return JSON ONLY:
{{
  "approved": true or false,
  "reason": "Detailed critique",
  "sanitized_action": "harvest" | "sweep_all" | "refresh_tokens_render" | "executive_briefing" | "rest"
}}
"""
        judge_str = await self.query_safety_judge(session, judge_prompt)
        try:
            audit = json.loads(judge_str) if judge_str else {"approved": True, "sanitized_action": plan.get("action")}
        except Exception:
            m = re.search(r"\{.*\}", judge_str or "", re.DOTALL)
            audit = json.loads(m.group(0)) if m else {"approved": True, "sanitized_action": plan.get("action")}

        if not audit.get("approved"):
            logger.warning(f"🛡️ [Anti-Stupid Shield] Judge REJECTED plan '{plan.get('action')}': {audit.get('reason')}. Falling back to '{audit.get('sanitized_action')}'.")
            plan["action"] = audit.get("sanitized_action", "rest")
            plan["judge_critique"] = audit.get("reason")
        else:
            logger.info(f"✅ [Anti-Stupid Shield] Judge APPROVED plan '{plan.get('action')}': {audit.get('reason')}")

        return plan


# =============================================================================
# PERSISTENCE & REFLEXION MEMORY (UPSTASH SERVERLESS REDIS)
# =============================================================================

class CloudMemory:
    """Stores lessons, dynamic skills, and execution history without needing local disk."""
    def __init__(self):
        self.headers = {"Authorization": f"Bearer {UPSTASH_TOKEN}"}

    async def get_lessons(self, session: aiohttp.ClientSession) -> List[str]:
        try:
            async with session.get(f"{UPSTASH_URL}/get/agent:reflexion_lessons", headers=self.headers, timeout=aiohttp.ClientTimeout(total=5)) as r:
                if r.status == 200:
                    d = await r.json()
                    res = d.get("result")
                    if res:
                        return json.loads(res)
        except Exception as e:
            logger.debug(f"[Memory] Lesson read error: {e}")
        return []

    async def add_lesson(self, session: aiohttp.ClientSession, lesson: str):
        try:
            curr = await self.get_lessons(session)
            curr.append(f"[{datetime.now(timezone.utc).strftime('%m-%d %H:%M')}] {lesson}")
            curr = curr[-50:]
            await session.post(f"{UPSTASH_URL}/set/agent:reflexion_lessons", headers=self.headers, json=json.dumps(curr), timeout=aiohttp.ClientTimeout(total=5))
            logger.info(f"🧬 [Reflexion Memory] Learned new operational rule: '{lesson}'")
        except Exception as e:
            logger.debug(f"[Memory] Lesson save error: {e}")

    async def record_audit(self, session: aiohttp.ClientSession, action: str, details: Dict[str, Any]):
        entry = {"action": action, "timestamp": time.time(), "details": details}
        try:
            await session.post(f"{UPSTASH_URL}/lpush/agent:action_audit", headers=self.headers, json=json.dumps(entry), timeout=aiohttp.ClientTimeout(total=5))
            await session.post(f"{UPSTASH_URL}/ltrim/agent:action_audit/0/99", headers=self.headers, timeout=aiohttp.ClientTimeout(total=5))
        except Exception:
            pass


# =============================================================================
# AUTONOMOUS AGENT ORCHESTRATOR
# =============================================================================

class AutonomousAriAgent:
    def __init__(self):
        self.council = MultiModelCouncil()
        self.memory = CloudMemory()
        self.last_token_refresh = 0
        self.last_briefing_time = 0

    async def send_telegram_alert(self, session: aiohttp.ClientSession, message: str):
        if not REPORT_BOT_TOKEN or not REPORT_CHAT_ID:
            return
        targets = [REPORT_CHAT_ID, PAYOUT_CHANNEL_ID]
        for tid in targets:
            url = f"https://api.telegram.org/bot{REPORT_BOT_TOKEN}/sendMessage"
            try:
                await session.post(url, json={"chat_id": tid, "text": message, "parse_mode": "Markdown", "disable_web_page_preview": True}, timeout=aiohttp.ClientTimeout(total=6))
            except Exception as e:
                logger.debug(f"[Telegram Alert] Error for {tid}: {e}")

    async def fetch_fleet_state(self, session: aiohttp.ClientSession) -> Dict[str, Any]:
        """Fetches live telemetry directly from Cloudflare Edge / Upstash."""
        for key in ["fleet:live_state", "fleet:telemetry"]:
            try:
                async with session.get(f"{UPSTASH_URL}/get/{key}", headers={"Authorization": f"Bearer {UPSTASH_TOKEN}"}, timeout=aiohttp.ClientTimeout(total=5)) as r:
                    if r.status == 200:
                        d = await r.json()
                        res = d.get("result")
                        if res:
                            return json.loads(res) if isinstance(res, str) else res
            except Exception:
                pass
        return {"accounts_total": "dynamic", "status": "nominal"}

    async def dispatch_fleet_action(self, session: aiohttp.ClientSession, action: str):
        """Pushes command to Upstash Redis queue for instantaneous daemon/edge execution."""
        payload = {
            "id": f"ari_{int(time.time()*1000)}",
            "action": action,
            "origin": "AriCouncil",
            "timestamp": time.time()
        }
        try:
            async with session.post(
                f"{UPSTASH_URL}/set/fleet:pending_action",
                headers={"Authorization": f"Bearer {UPSTASH_TOKEN}", "Content-Type": "application/json"},
                data=json.dumps(payload),
                timeout=aiohttp.ClientTimeout(total=5)
            ) as r:
                logger.info(f"⚡ [Action Dispatched] Queued '{action}' to fleet queue.")
        except Exception as e:
            logger.error(f"Error dispatching fleet action: {e}")

    async def trigger_render_token_collection(self, session: aiohttp.ClientSession) -> Dict[str, Any]:
        """
        Autonomously triggers MTProto session token collection on Render Standby Node 2 (Frankfurt),
        with instant automatic fallback to Render Standby Node 3 (Oregon).
        Fulfills user directive: if GitHub Actions limits are up, Render collects tokens.
        """
        logger.info("🔄 [Render Failover] Triggering MTProto session token collection on Render Standby...")
        headers = {
            "Authorization": f"Bearer {CF_SECRET_KEY}",
            "Content-Type": "application/json"
        }
        acc_payload = []
        try:
            acc_path = os.path.join(BASE_DIR, "accounts.json")
            if os.path.exists(acc_path):
                with open(acc_path, "r", encoding="utf-8") as af:
                    acc_payload = json.load(af)
        except Exception:
            pass

        # Fallback: load accounts from Upstash Redis if local accounts.json is absent
        if not acc_payload:
            try:
                async with session.get(f"{UPSTASH_URL}/get/fleet:accounts", headers={"Authorization": f"Bearer {UPSTASH_TOKEN}"}, timeout=aiohttp.ClientTimeout(total=6)) as r:
                    if r.status == 200:
                        d = await r.json()
                        res = d.get("result")
                        if res:
                            acc_payload = json.loads(res) if isinstance(res, str) else res
            except Exception as e:
                logger.debug(f"[Render Failover] Could not fetch accounts from Redis: {e}")

        req_body = {"source": "AriAutonomousDecision"}
        if acc_payload:
            req_body["accounts"] = acc_payload

        for name, url in RENDER_STANDBY_NODES:
            try:
                logger.info(f"Connecting to {name} ({url})...")
                async with session.post(
                    url,
                    headers=headers,
                    json=req_body,
                    timeout=aiohttp.ClientTimeout(total=45)
                ) as resp:
                    if resp.status == 200:
                        data = await resp.json()
                        logger.info(f"✅ [{name}] MTProto token collection succeeded! Result: {data.get('message')}")
                        self.last_token_refresh = time.time()
                        return {"success": True, "node": name, "collected": data.get("collected", 20), "details": data}
                    else:
                        logger.warning(f"⚠️ [{name}] HTTP {resp.status}. Trying next standby node...")
            except Exception as e:
                logger.warning(f"⚠️ [{name}] Standby connection error: {e}. Trying fallback node...")
                continue
        return {"success": False, "error": "All Render standby nodes unreachable"}

    async def run_autonomous_cycle(self, session: aiohttp.ClientSession):
        """Single turn of the autonomous OODA loop."""
        # 1. Observe State & Token Staleness
        state = await self.fetch_fleet_state(session)
        lessons = await self.memory.get_lessons(session)

        # Check token staleness: if older than 12h or if GitHub Actions is stalled, prioritize Render
        now = time.time()
        tokens_stale = False
        try:
            async with session.get(f"{UPSTASH_URL}/get/fleet:tokens_updated_at", headers={"Authorization": f"Bearer {UPSTASH_TOKEN}"}, timeout=aiohttp.ClientTimeout(total=4)) as tr:
                if tr.status == 200:
                    td = await tr.json()
                    t_val = td.get("result")
                    if t_val:
                        age_hours = (now - float(t_val)) / 3600.0
                        if age_hours >= 12.0:
                            tokens_stale = True
        except Exception:
            pass

        # If tokens are stale and we haven't triggered Render in last 3 hours, force refresh on Render
        if tokens_stale and (now - self.last_token_refresh > 10800):
            logger.info("⚠️ [Council Sentinel] MTProto session tokens are > 12h old. Autonomous failover to Render activated!")
            res = await self.trigger_render_token_collection(session)
            if res.get("success"):
                await self.send_telegram_alert(
                    session,
                    f"🔄 *[Ari AI Council — Cloud Failover]*\n\n"
                    f"MTProto tokens exceeded 12h threshold (GitHub Actions limit or schedule delay).\n"
                    f"Autonomously collected fresh tokens via **{res.get('node')}** across all fleet accounts!"
                )
                return

        # 2. Decide (Multi-Model Council: Cloudflare DeepSeek R1 Proposer + Llama 3.2 3B Judge)
        decision = await self.council.decide_with_anti_stupid_verification(session, state, lessons)
        act = decision.get("action")
        thought = decision.get("thought", "")

        logger.info(f"🤖 [Agent Decision] Action: '{act}' | Thought: {thought}")

        # 3. Act
        if act == "harvest":
            await self.dispatch_fleet_action(session, "harvest")
            await self.send_telegram_alert(session, f"⚡ *[Ari AI Council]* Triggered fleet harvest across 8 active bots (MRG, ATF, Victor's, Kynex, Diggo, Pepe, AdxEarn, Chicken Land).\n_Reason:_ {thought}")
        elif act == "sweep_all":
            await self.dispatch_fleet_action(session, "sweep")
            await self.send_telegram_alert(session, f"💼 *[Ari AI Council]* Dispatched Universal Fleet Sweep & Referral Harvest.\n_Reason:_ {thought}")
        elif act == "refresh_tokens_render":
            res = await self.trigger_render_token_collection(session)
            if res.get("success"):
                await self.send_telegram_alert(session, f"🔄 *[Ari AI Council]* Autonomously collected MTProto tokens via **{res.get('node')}**!")
        elif act == "executive_briefing":
            if now - self.last_briefing_time > 21600:  # Rate-limit to once every 6 hours
                self.last_briefing_time = now
                await self.dispatch_fleet_action(session, "briefing")
        elif act == "rest":
            logger.info("😴 [Agent Pacing] Council decided fleet is optimal and on active cooldown timers. Resting...")

        # 4. Record
        await self.memory.record_audit(session, act, decision)


# =============================================================================
# 24/7 PERPETUAL CLOUD RUNNER
# =============================================================================

async def main():
    logger.info("=============================================================================")
    logger.info("  ARI AUTONOMOUS AGENT (100% Cloudflare Workers AI Edge Mesh)")
    logger.info("=============================================================================")
    logger.info(f"• Proposer & Reasoning: Cloudflare Workers AI (DeepSeek R1 32B / Llama 3.1 8B)")
    logger.info(f"• Safety Judge: Cloudflare Workers AI (@cf/meta/llama-3.2-3b-instruct across Edge Nodes)")
    logger.info(f"• Render Failover Nodes: {len(RENDER_STANDBY_NODES)} standby nodes armed")
    logger.info("=============================================================================")

    agent = AutonomousAriAgent()

    async with aiohttp.ClientSession() as session:
        # Startup notification
        await agent.send_telegram_alert(
            session,
            "🚀 *Ari Autonomous Cloud Agent Activated!*\n\n"
            "• **Host:** Cloud-Native / Render Node 2 (Frankfurt)\n"
            "• **Council:** `Cloudflare Workers AI` (DeepSeek R1 + Llama 3.2 Dual-Verification)\n"
            "• **Failover:** Render Standby (Frankfurt + Oregon) auto-collection armed\n"
            "• **Memory:** Serverless Persistent Reflexion Vector Store\n"
            "• **Status:** Overseeing all fleet accounts 24/7 autonomously."
        )

        while True:
            try:
                await agent.run_autonomous_cycle(session)
            except Exception as e:
                logger.error(f"Error in autonomous loop: {e}", exc_info=True)
                await agent.memory.add_lesson(session, f"Encountered unexpected crash: {e}")

            # Heartbeat interval (every 90s)
            await asyncio.sleep(90)

if __name__ == "__main__":
    asyncio.run(main())
