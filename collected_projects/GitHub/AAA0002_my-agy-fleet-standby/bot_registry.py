"""
bot_registry.py
=============================================================================
SINGLE SOURCE OF TRUTH (SSOT) PLUG-AND-FARM BOT REGISTRY FOR MY AGY AI FLEET
=============================================================================
Defines all active legitimate fleet bots, their referral codes, WebApp URLs,
mandatory sponsor channels, and API farming parameters.

Adding ANY new bot to the fleet in the future requires ONLY adding one entry here!
The cloud token refresher, referral binder, and 24/7 cloud farming engine
automatically pick up new bots from this registry with ZERO per-account manual work.
"""

from typing import Dict, List, Any

ACTIVE_BOTS: Dict[str, Dict[str, Any]] = {
    "mrg": {
        "id": "mrg",
        "name": "MRG Miner",
        "bot_username": "mrgminerbot",
        "bot_aliases": ["mrgtoken_bot", "mrgminerbot", 8862173167],
        "master_ref_code": "ref_IRN1G3XD",
        "app_url": "https://app.mrgtoken.xyz/",
        "token_key": "mrg_init_data",
        "short_names": ["app", "miniapp"],
        "api_base": "https://api.mrgtoken.xyz",
        "sponsor_channels": ["mrgminer", "mrgwithdrawal", "DurovKidney", "keepeye_app"],
        "requires_turnstile": True,
        "is_active": True,
    },
    "atf": {
        "id": "atf",
        "name": "ATF Miner",
        "bot_username": "atfminers_bot",
        "bot_aliases": ["ATF_AIRDROP_bot", "atfminerbot", 7058204689],
        "master_ref_code": "6727787768",
        "app_url": "https://atfminers.asloni.online/miner/index.html?entry=bot_start",
        "token_key": "atf_init_data",
        "short_names": ["app", "miner", "play"],
        "api_base": "https://atfminers.asloni.online/api",
        "sponsor_channels": ["AI_TRADING_FOREX"],
        "requires_turnstile": False,
        "is_active": True,
    },
    "victors": {
        "id": "victors",
        "name": "Victor's Company",
        "bot_username": "VictorsCompanyGame",
        "bot_aliases": ["VictorsCompanybot", 8943931170],
        "master_ref_code": "ref_A20AA96F18",
        "app_url": "https://app.victors.company/",
        "token_key": "victors_init_data",
        "short_names": ["app", "play"],
        "api_base": "https://server.victors.company/api",
        "sponsor_channels": ["VictorsCompany", "victors_company", "VICWithdrawals", "TheBoss_Victor", "keepeye_app", "PickaxeEmpire"],
        "requires_turnstile": True,
        "is_active": True,
    },
    "kynex": {
        "id": "kynex",
        "name": "Kynex Network",
        "bot_username": "Kynex_miningbot",
        "bot_aliases": ["kynexnetworkbot"],
        "master_ref_code": "6727787768",
        "app_url": "https://kynex.top/telegram-auth.html",
        "token_key": "kynex_init_data",
        "short_names": ["App", "app"],
        "api_base": "https://us-central1-keynex-e9511.cloudfunctions.net",
        "sponsor_channels": ["kynex_mining", "EarnVaulte", "solanamemes001", "Web3Primeteam"],
        "requires_turnstile": False,
        "is_active": True,
    },
    "pepegram": {
        "id": "pepegram",
        "name": "PepeGram",
        "bot_username": "Pepe_gram_bot",
        "master_ref_code": "1449",
        "app_url": "https://app.miniempire.app/miniapp/",
        "token_key": "pepegram_init_data",
        "short_names": ["app", "miniapp"],
        "api_base": "https://app.miniempire.app/miniapp",
        "sponsor_channels": ["pepe_grammmm", "BTCMAKERR", "PaperHouseNFT"],
        "requires_turnstile": False,
        "is_active": True,
    },
    "adxearn": {
        "id": "adxearn",
        "name": "AdxEarn AI",
        "bot_username": "AdxEarnAibot",
        "master_ref_code": "6727787768",
        "app_url": "https://app.adxearnai.xyz/",
        "token_key": "adxearn_init_data",
        "short_names": ["app", "play"],
        "api_base": "https://api.adxearnai.xyz/api",
        "sponsor_channels": ["AdxearnAi"],
        "requires_turnstile": False,
        "is_active": True,
    },
    "diggo": {
        "id": "diggo",
        "name": "DiggoMiner",
        "bot_username": "Diggominer_bot",
        "master_ref_code": "ref_4088138f11effe8eef4b86ff",
        "app_url": "https://diggo.linkpc.net/",
        "token_key": "diggo_init_data",
        "short_names": ["app", "miner"],
        "api_base": "https://diggo.linkpc.net/api",
        "sponsor_channels": [],
        "requires_turnstile": False,
        "is_active": True,
    },
    "chickenland": {
        "id": "chickenland",
        "name": "Chicken Land",
        "bot_username": "ChickenLandBot",
        "master_ref_code": "12668",
        "app_url": "https://app8968434282.tgcloud.ai/",
        "token_key": "chickenland_init_data",
        "short_names": ["play", "app", "farm"],
        "api_base": "https://app8968434282.tgcloud.ai/api",
        "sponsor_channels": ["LandChickenNews", "ChickenLandPay", "ChickenLandCodes"],
        "requires_turnstile": False,
        "is_active": True,
    },
    "grouchemine": {
        "id": "grouchemine",
        "name": "Grouche Mine 🍐",
        "bot_username": "GRC_AirdrooBot",
        "bot_aliases": ["groucheminebot"],
        "master_ref_code": "6727787768",
        "app_url": "https://grouchemine.world/",
        "token_key": "grouchemine_init_data",
        "short_names": ["app"],
        "api_base": "https://grouchemine.world/api",
        "sponsor_channels": ["grouchemine", "GroucheCoinEn"],
        "requires_turnstile": False,
        "is_active": True,
    },
    "lumeon": {
        "id": "lumeon",
        "name": "LUM Miner 💎",
        "bot_username": "lumeonminer_bot",
        "bot_aliases": ["lumminer_bot"],
        "master_ref_code": "6727787768",
        "app_url": "https://lum-miner.gurmessa747.workers.dev/",
        "token_key": "lumeon_init_data",
        "short_names": ["Lum", "lum", "app"],
        "api_base": "https://lum-miner.gurmessa747.workers.dev",
        "sponsor_channels": ["lumminercommunity", "lumpayout", "gramminiappsmining", "Grammoneywallet"],
        "requires_turnstile": False,
        "is_active": True,
    },
    "earnvault": {
        "id": "earnvault",
        "name": "EarnVault 🏦",
        "bot_username": "EarnVaultApp_bot",
        "bot_aliases": ["earnvault_bot"],
        "master_ref_code": "6727787768",
        "app_url": "https://eearnvault.top/",
        "token_key": "earnvault_init_data",
        "short_names": ["App", "app", "earn"],
        "api_base": "https://us-central1-earnvaulte.cloudfunctions.net",
        "sponsor_channels": ["EarnVaulte"],
        "requires_turnstile": False,
        "is_active": True,
    }
}

def get_active_bots() -> Dict[str, Dict[str, Any]]:
    """Returns all active bots in the registry."""
    return {k: v for k, v in ACTIVE_BOTS.items() if v.get("is_active", True)}

def get_all_sponsor_channels() -> List[str]:
    """Returns a deduplicated list of all mandatory sponsor channels across all active bots."""
    channels = set()
    for b in ACTIVE_BOTS.values():
        if b.get("is_active", True):
            channels.update(b.get("sponsor_channels", []))
    return sorted(list(channels))

def get_token_keys() -> List[str]:
    """Returns the list of token keys (e.g. ['mrg_init_data', ...]) for active bots."""
    return [b["token_key"] for b in ACTIVE_BOTS.values() if b.get("is_active", True)]
