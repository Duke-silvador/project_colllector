import os
import json
import time
import struct
import hashlib
import base64
import urllib.request
import urllib.parse
from telethon.sync import TelegramClient
from telethon.sessions import StringSession
from telethon.tl.functions.messages import RequestAppWebViewRequest
from telethon.tl.types import InputBotAppShortName
from dotenv import load_dotenv
try:
    from nacl.signing import SigningKey
    from tonsdk.contract.wallet import Wallets, WalletVersionEnum
    HAS_TON_SDK = True
except Exception:
    HAS_TON_SDK = False

load_dotenv()
API_ID = int(os.getenv("TELEGRAM_API_ID") or os.getenv("API_ID") or 0)
API_HASH = os.getenv("TELEGRAM_API_HASH")
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
ACCOUNTS_FILE = os.path.join(BASE_DIR, "accounts.json")
FLEET_WALLETS_FILE = os.path.join(BASE_DIR, "fleet_ton_wallets.json")

PRIMARY_ID = "6727787768"
MRG_REF = "ref_IRN1G3XD"
MRG_API = "https://mrg.up.railway.app"

def create_mrg_ton_proof(wallet_info: dict, nonce: str) -> dict:
    """Signs TonConnect 2.0 cryptographic proof for MRG Miner."""
    words = wallet_info["mnemonic"].split() if isinstance(wallet_info["mnemonic"], str) else wallet_info["mnemonic"]
    _, pub_k, priv_k, wallet_contract = Wallets.from_mnemonics(mnemonics=words, version=WalletVersionEnum.v4r2)
    state_init_res = wallet_contract.create_state_init()
    state_init_b64 = base64.b64encode(state_init_res["state_init"].to_boc(False)).decode("utf-8")
    t_addr = wallet_contract.address
    wc = t_addr.wc
    addr_hash = t_addr.hash_part
    raw_addr = f"{wc}:{addr_hash.hex()}"
    domain = "app.mrgtoken.xyz"
    domain_b = domain.encode("utf-8")
    ts_now = int(time.time())
    msg = b"ton-proof-item-v2/" + struct.pack(">i", wc) + addr_hash + struct.pack("<I", len(domain_b)) + domain_b + struct.pack("<Q", ts_now) + nonce.encode("utf-8")
    digest = hashlib.sha256(b"\xff\xff" + b"ton-connect" + hashlib.sha256(msg).digest()).digest()
    sig = SigningKey(priv_k[:32]).sign(digest).signature
    sig_b64 = base64.b64encode(sig).decode("utf-8")
    return {
        "address": raw_addr,
        "walletStateInit": state_init_b64,
        "proof": {
            "timestamp": ts_now,
            "domain": {"lengthBytes": len(domain_b), "value": domain},
            "signature": sig_b64,
            "payload": nonce
        }
    }

def generate_fleet_wallets(accounts):
    existing_wallets = {}
    if os.path.exists(FLEET_WALLETS_FILE):
        try:
            with open(FLEET_WALLETS_FILE, "r", encoding="utf-8") as f:
                existing_wallets = json.load(f)
        except Exception:
            existing_wallets = {}

    wallets_data = {}
    for idx, acc in enumerate(accounts):
        uid = str(acc.get("user_id"))
        name = acc.get("name", f"Account #{idx+1}")

        # Skip Primary Account
        if uid == PRIMARY_ID:
            continue

        # If already generated, reuse to keep private keys consistent
        if uid in existing_wallets and existing_wallets[uid].get("mnemonic"):
            wallets_data[uid] = existing_wallets[uid]
            print(f"  [Kept] Reusing existing wallet for {name} ({uid}): {wallets_data[uid]['address']}")
            continue

        # Generate new standard TON v4r2 wallet
        if not HAS_TON_SDK:
            print(f"  [Skip] TON SDK not installed. Cannot generate new wallet for {name} ({uid}).")
            continue
        mnemonics, pub_k, priv_k, wallet = Wallets.create(WalletVersionEnum.v4r2, workchain=0)
        addr_non_bounce = wallet.address.to_string(is_user_friendly=True, is_bounceable=False, is_url_safe=True)
        addr_bounce = wallet.address.to_string(is_user_friendly=True, is_bounceable=True, is_url_safe=True)
        addr_raw = wallet.address.to_string(is_user_friendly=False)

        wallets_data[uid] = {
            "account_index": idx + 1,
            "name": name,
            "user_id": uid,
            "address": addr_non_bounce,
            "address_bounceable": addr_bounce,
            "address_raw": addr_raw,
            "public_key_hex": pub_k.hex(),
            "private_key_hex": priv_k.hex(),
            "mnemonic": " ".join(mnemonics),
            "mnemonic_words": mnemonics,
            "wallet_version": "v4r2",
            "created_at": time.strftime("%Y-%m-%d %H:%M:%S UTC", time.gmtime())
        }
        print(f"  [Generated] New TON Wallet for {name} ({uid}): {addr_non_bounce}")

    # Save to dedicated file
    with open(FLEET_WALLETS_FILE, "w", encoding="utf-8") as f:
        json.dump(wallets_data, f, indent=2, ensure_ascii=False)
    print(f"\n✅ All {len(wallets_data)} TON Wallets saved to {FLEET_WALLETS_FILE}!")

    # Update accounts.json
    for acc in accounts:
        uid = str(acc.get("user_id"))
        if uid in wallets_data:
            acc["ton_wallet"] = {
                "address": wallets_data[uid]["address"],
                "mnemonic": wallets_data[uid]["mnemonic"],
                "version": "v4r2"
            }

    temp_acc = f"{ACCOUNTS_FILE}.tmp.{os.getpid()}"
    with open(temp_acc, "w", encoding="utf-8") as f:
        json.dump(accounts, f, indent=2, ensure_ascii=False)
    os.replace(temp_acc, ACCOUNTS_FILE)
    print(f"✅ Updated {ACCOUNTS_FILE} with wallet addresses and secret mnemonics!\n")

    return wallets_data

def bind_wallets_to_mrg(accounts, wallets_data):
    headers = {"Content-Type": "application/json", "User-Agent": "Mozilla/5.0 (Linux; Android 14; SM-S918B) AppleWebKit/537.36"}

    for idx, acc in enumerate(accounts):
        uid = str(acc.get("user_id"))
        name = acc.get("name", f"Account #{idx+1}")
        sess = acc.get("session_string")

        if uid == PRIMARY_ID or not sess:
            continue

        wallet_info = wallets_data.get(uid)
        if not wallet_info:
            continue

        ton_addr = wallet_info["address"]
        print(f"=======================================================")
        print(f"[{idx+1}/{len(accounts)}] Binding TON Wallet for {name} ({uid})")
        print(f"Wallet: {ton_addr}")
        print(f"=======================================================")

        client = TelegramClient(StringSession(sess), API_ID, API_HASH)
        try:
            client.connect()
            bot = client.get_input_entity("mrgminerbot")
            res = client(RequestAppWebViewRequest(
                peer=bot,
                app=InputBotAppShortName(bot_id=bot, short_name="app"),
                platform="android",
                start_param=MRG_REF
            ))
            parsed = urllib.parse.urlparse(res.url)
            init_data = urllib.parse.parse_qs(parsed.fragment).get("tgWebAppData", [None])[0]

            if not init_data:
                print(f"  ❌ Could not obtain initData for {name}")
                continue

            # 1. Auth verify
            try:
                req_auth = urllib.request.Request(
                    f"{MRG_API}/api/auth/verify",
                    data=json.dumps({"initData": init_data, "start_param": MRG_REF}).encode(),
                    headers=headers
                )
                with urllib.request.urlopen(req_auth, timeout=12) as r:
                    ad = json.loads(r.read())
                    print(f"  ✅ Auth verified: {ad.get('verified', False)}")
            except Exception as ae:
                print(f"  Note auth: {ae}")

            time.sleep(1.5)

            # 2. Connect Wallet with TonConnect 2.0 Proof
            try:
                ton_proof_payload = None
                if HAS_TON_SDK and wallet_info.get("mnemonic"):
                    try:
                        req_payload = urllib.request.Request(
                            f"{MRG_API}/api/user/ton-proof-payload",
                            data=json.dumps({"initData": init_data}).encode(),
                            headers=headers
                        )
                        with urllib.request.urlopen(req_payload, timeout=10) as pr:
                            pd = json.loads(pr.read())
                            nonce = pd.get("payload")
                            if nonce:
                                ton_proof_payload = create_mrg_ton_proof(wallet_info, nonce)
                    except Exception as p_err:
                        print(f"  Note proof-payload: {p_err}")

                conn_body = {"initData": init_data, "address": ton_addr, "balance": 0}
                if ton_proof_payload:
                    conn_body["tonProof"] = ton_proof_payload

                req_conn = urllib.request.Request(
                    f"{MRG_API}/api/user/connect-wallet",
                    data=json.dumps(conn_body).encode(),
                    headers=headers
                )
                with urllib.request.urlopen(req_conn, timeout=12) as r:
                    cd = json.loads(r.read())
                    print(f"  💎 Connect-wallet response: success={cd.get('success', False)}")
            except Exception as ce:
                print(f"  ⚠️ Connect error: {ce}")
                # Try disconnect then reconnect
                try:
                    req_disc = urllib.request.Request(
                        f"{MRG_API}/api/user/disconnect-wallet",
                        data=json.dumps({"initData": init_data}).encode(),
                        headers=headers
                    )
                    urllib.request.urlopen(req_disc, timeout=10)
                    time.sleep(1.5)
                    req_conn2 = urllib.request.Request(
                        f"{MRG_API}/api/user/connect-wallet",
                        data=json.dumps(conn_body).encode(),
                        headers=headers
                    )
                    with urllib.request.urlopen(req_conn2, timeout=12) as r2:
                        cd2 = json.loads(r2.read())
                        print(f"  💎 Reconnect response: success={cd2.get('success', False)}")
                except Exception as ce2:
                    print(f"  Note reconnect: {ce2}")

            time.sleep(1.5)

            # 3. Claim channel task
            try:
                req_t = urllib.request.Request(
                    f"{MRG_API}/api/user/claim-task",
                    data=json.dumps({"initData": init_data, "taskId": "task-1789255007980"}).encode(),
                    headers=headers
                )
                with urllib.request.urlopen(req_t, timeout=10) as r:
                    td = json.loads(r.read())
                    print(f"  🚀 Channel task claimed: {td.get('success')}")
            except Exception as te:
                print(f"  Note task: {te}")

            time.sleep(1.5)

            # 4. Claim / Start mining
            try:
                req_m = urllib.request.Request(
                    f"{MRG_API}/api/user/claim-mining",
                    data=json.dumps({"initData": init_data}).encode(),
                    headers=headers
                )
                with urllib.request.urlopen(req_m, timeout=10) as r:
                    md = json.loads(r.read())
                    print(f"  ⛏️ Mining claimed: {md.get('success')}")
            except Exception as me:
                print(f"  Note mining: {me}")

            # 5. Check User Profile
            try:
                req_me = urllib.request.Request(
                    f"{MRG_API}/api/user/me",
                    data=json.dumps({"initData": init_data}).encode(),
                    headers=headers
                )
                with urllib.request.urlopen(req_me, timeout=10) as r:
                    ud = json.loads(r.read())
                    u = ud.get("user", {})
                    print(f"  📊 Status: isTonConnected={u.get('isTonConnected')}, wallet={u.get('tonWalletAddress')}, isQualified={u.get('isQualified')}")
            except Exception as ue:
                print(f"  Note profile: {ue}")

        except Exception as err:
            print(f"  ❌ Error for {name}: {err}")
        finally:
            try:
                client.disconnect()
            except Exception:
                pass

        time.sleep(2.5)

def check_primary_squad(accounts):
    print("\n=======================================================")
    print("Checking Primary Account Squad & Claiming Bonuses")
    print("=======================================================")
    arif_acc = next(a for a in accounts if str(a.get("user_id")) == PRIMARY_ID)
    client = TelegramClient(StringSession(arif_acc["session_string"]), API_ID, API_HASH)
    headers = {"Content-Type": "application/json", "User-Agent": "Mozilla/5.0 (Linux; Android 14; SM-S918B) AppleWebKit/537.36"}
    try:
        client.connect()
        bot = client.get_input_entity("mrgminerbot")
        res = client(RequestAppWebViewRequest(
            peer=bot,
            app=InputBotAppShortName(bot_id=bot, short_name="app"),
            platform="android",
            start_param=MRG_REF
        ))
        parsed = urllib.parse.urlparse(res.url)
        init_data = urllib.parse.parse_qs(parsed.fragment).get("tgWebAppData", [None])[0]

        if init_data:
            # Check friends
            req_f = urllib.request.Request(
                f"{MRG_API}/api/user/friends",
                data=json.dumps({"initData": init_data}).encode(),
                headers=headers
            )
            with urllib.request.urlopen(req_f, timeout=12) as r:
                fd = json.loads(r.read())
                stats = fd.get("teamStats", {})
                print(f"Total Squad: {stats.get('totalFriends')}, Active: {stats.get('activeFriends')}, Pending: {stats.get('pendingFriendsCount')}")
                print(f"Eligible One-Time Friends: {stats.get('eligibleOneTimeFriendsCount')}")
                print(f"Unclaimed Commission: {fd.get('unclaimedTeamCommission')} MRG")

            # Try claim commission
            try:
                req_cc = urllib.request.Request(
                    f"{MRG_API}/api/user/claim-commission",
                    data=json.dumps({"initData": init_data}).encode(),
                    headers=headers
                )
                with urllib.request.urlopen(req_cc, timeout=12) as r:
                    ccd = json.loads(r.read())
                    print(f"Claim Commission: {ccd}")
            except Exception as e:
                print(f"Commission claim note: {e}")

            # Try claim one-time bonus
            try:
                req_b = urllib.request.Request(
                    f"{MRG_API}/api/user/claim-one-time-bonus",
                    data=json.dumps({"initData": init_data}).encode(),
                    headers=headers
                )
                with urllib.request.urlopen(req_b, timeout=12) as r:
                    bd = json.loads(r.read())
                    print(f"Claim One-Time Bonus: {bd}")
            except Exception as e:
                print(f"One-time bonus note: {e}")

    except Exception as e:
        print(f"Error checking primary squad: {e}")
    finally:
        try:
            client.disconnect()
        except Exception:
            pass

def main():
    with open(ACCOUNTS_FILE, "r", encoding="utf-8") as f:
        accounts = json.load(f)

    print(f"Found {len(accounts)} accounts. Generating unique TON wallets for fleet...")
    wallets_data = generate_fleet_wallets(accounts)

    print("\nStarting binding process on MRG Miner...")
    bind_wallets_to_mrg(accounts, wallets_data)

    check_primary_squad(accounts)
    print("\n🎉 ALL FLEET WALLETS GENERATED, SAVED, AND BOUND TO MRG MINER!")

if __name__ == "__main__":
    main()
