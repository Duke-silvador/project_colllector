from __future__ import annotations

import asyncio
import json
import logging
from datetime import datetime, timezone

from telegram import Bot

from common.config import USER_BOT_TOKEN, BROADCAST_BATCH_SIZE, JOB_MAX_ATTEMPTS
from db.database import close_db, connection, fetchval, init_db

logging.basicConfig(level=logging.INFO, format="%(asctime)s | %(levelname)s | %(name)s | %(message)s")
log = logging.getLogger("akbshav.worker")


async def claim_jobs(limit: int = 25):
    async with connection() as conn:
        async with conn.transaction():
            # Recover jobs abandoned by a crashed worker.
            await conn.execute("UPDATE app_jobs SET status='pending',locked_at=NULL WHERE status='processing' AND locked_at < NOW()-INTERVAL '10 minutes'")
            return await conn.fetch(
                """WITH picked AS (SELECT id FROM app_jobs WHERE status='pending' AND run_at<=NOW() ORDER BY run_at,id FOR UPDATE SKIP LOCKED LIMIT $1)
                UPDATE app_jobs j SET status='processing',attempts=attempts+1,locked_at=NOW() FROM picked WHERE j.id=picked.id
                RETURNING j.id,j.job_type,j.user_id,j.payload,j.attempts""", limit)


async def finish(job_id: int, ok: bool, error: str | None = None):
    if ok:
        await db_execute("UPDATE app_jobs SET status='done',last_error=NULL,finished_at=NOW(),locked_at=NULL WHERE id=$1", job_id)
        return
    await db_execute(
        """UPDATE app_jobs SET status=CASE WHEN attempts < $2 THEN 'pending' ELSE 'failed' END,
           run_at=CASE WHEN attempts < $2 THEN NOW() + (LEAST(300, POWER(2,attempts)*5) * INTERVAL '1 second') ELSE run_at END,
           last_error=$1,finished_at=CASE WHEN attempts >= $2 THEN NOW() ELSE finished_at END,locked_at=NULL WHERE id=$3""",
        (error or "job failed")[:1000], JOB_MAX_ATTEMPTS, job_id)


async def db_execute(query, *args):
    async with connection() as conn:
        return await conn.execute(query, *args)


async def run_broadcast(bot: Bot, broadcast_id: int) -> None:
    async with connection() as conn:
        async with conn.transaction():
            row = await conn.fetchrow("UPDATE app_broadcasts SET status='running' WHERE id=$1 AND status IN ('queued','scheduled','running') RETURNING id,text,language,active_only", broadcast_id)
    if not row:
        return
    where=["blocked=FALSE"]
    args=[]
    if row["language"]:
        args.append(row["language"]); where.append(f"language=${len(args)}")
    if row["active_only"]: where.append("last_seen_at>NOW()-INTERVAL '30 days'")
    async with connection() as conn:
        users=await conn.fetch("SELECT telegram_id FROM app_users WHERE " + " AND ".join(where), *args)
    targeted=len(users)
    await db_execute("UPDATE app_broadcasts SET targeted=$1 WHERE id=$2",targeted,broadcast_id)
    sent=failed=0
    for i in range(0,targeted,BROADCAST_BATCH_SIZE):
        batch=users[i:i+BROADCAST_BATCH_SIZE]
        for user in batch:
            uid=int(user["telegram_id"])
            already=await fetchval("SELECT 1 FROM app_broadcast_deliveries WHERE broadcast_id=$1 AND user_id=$2 AND status='sent'",broadcast_id,uid)
            if already is not None:
                continue
            try:
                await bot.send_message(uid,str(row["text"])[:4000])
                await db_execute("INSERT INTO app_broadcast_deliveries(broadcast_id,user_id,status,error) VALUES($1,$2,'sent',NULL) ON CONFLICT DO NOTHING",broadcast_id,uid)
            except Exception as exc:
                await db_execute("INSERT INTO app_broadcast_deliveries(broadcast_id,user_id,status,error) VALUES($1,$2,'failed',$3) ON CONFLICT DO UPDATE SET status='failed',error=$3,sent_at=NOW()",broadcast_id,uid,type(exc).__name__)
                log.warning("broadcast %s to %s failed: %s",broadcast_id,uid,type(exc).__name__)
        counts=await fetch_broadcast_counts(broadcast_id)
        sent,failed=counts
        await db_execute("UPDATE app_broadcasts SET sent=$1,failed=$2 WHERE id=$3",sent,failed,broadcast_id)
        await asyncio.sleep(0.5)
    await db_execute("UPDATE app_broadcasts SET status='done',sent=$1,failed=$2,finished_at=NOW() WHERE id=$3",sent,failed,broadcast_id)


async def fetch_broadcast_counts(broadcast_id: int):
    async with connection() as conn:
        row=await conn.fetchrow("SELECT COUNT(*) FILTER(WHERE status='sent') sent,COUNT(*) FILTER(WHERE status='failed') failed FROM app_broadcast_deliveries WHERE broadcast_id=$1",broadcast_id)
        return int(row["sent"]),int(row["failed"])


async def main():
    await init_db()
    bot=Bot(USER_BOT_TOKEN)
    await bot.initialize()
    try:
        while True:
            jobs=await claim_jobs()
            for job in jobs:
                try:
                    payload=job["payload"]
                    if job["job_type"]=="business_message":
                        await bot.send_message(chat_id=int(payload["chat_id"]),text=str(payload["text"])[:3500],business_connection_id=str(payload["connection_id"]))
                    elif job["job_type"]=="broadcast":
                        await run_broadcast(bot,int(payload["broadcast_id"]))
                    else:
                        raise RuntimeError(f"unknown job type: {job['job_type']}")
                    await finish(job["id"],True)
                except Exception as exc:
                    log.exception("job %s failed",job["id"])
                    await finish(job["id"],False,f"{type(exc).__name__}: {exc}")
            await asyncio.sleep(1 if jobs else 3)
    finally:
        await bot.shutdown(); await close_db()


if __name__=="__main__":
    asyncio.run(main())
