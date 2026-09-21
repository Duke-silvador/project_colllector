import os
import json
from datetime import datetime, timezone, timedelta

import requests
import pandas as pd
import numpy as np

# ----------------------------------------------------------------------------
# GENEL AYARLAR
# ----------------------------------------------------------------------------
OKX_BASE = "https://www.okx.com"
COINBASE_BASE = "https://api.exchange.coinbase.com"

PAPER_FILE = "paper_trades.json"
STAKE = 100.0          # işlem başına pozisyon büyüklüğü (kullanıcı isteği: 100 TL)
MAX_OPEN = 10           # aynı anda en fazla 10 açık işlem (kullanıcı isteği)
MAX_SCAN_PER_EXCHANGE = 50
VERSION = "TREND_RIDER_V5_WEIGHTED_SCORE_MULTI_EXCHANGE"
FEE = float(os.getenv("OKX_TAKER_FEE_RATE", "0.001"))
SLIP = float(os.getenv("PAPER_SLIPPAGE_RATE", "0.0005"))

# NOT: Günlük kayıp limiti / "art arda N kayıptan sonra dur" mekanizması
# BİLİNÇLİ OLARAK yok. Kullanıcının paper-trading aşamasında stratejinin
# gerçek performansını (iyi ve kötü günler dahil) ölçmek istemesi kararına
# dayanıyor. Gerçek paraya geçmeden önce böyle bir koruma eklenmesi önerilir.

# NOT (borsa seçimi araştırması): Binance ve Bybit, ABD IP aralıklarını
# (GitHub Actions'ın çalıştığı Azure US datacenter'ları dahil) ağ
# seviyesinde (CDN/WAF) engelliyor - bu yüzden ikisi de kullanılamadı.
# Gate.io da ABD IP'lerini regülasyon gereği engelliyor. Coinbase'in genel
# IP kısıtlaması sadece KİMLİK DOĞRULAMALI (authenticated) uç noktalar için
# opsiyonel bir uyarı sistemi; bu dosyanın kullandığı herkese açık (public)
# piyasa verisi uç noktaları için bir engelleme yok. Kraken de benzer şekilde
# public veri için güvenli görünüyor - Coinbase yetersiz kalırsa sıradaki
# aday budur.


def now():
    return datetime.now(timezone.utc).isoformat()


def f(x, default=0.0):
    try:
        return float(x)
    except Exception:
        return default


# ----------------------------------------------------------------------------
# GÖSTERGELER (borsadan bağımsız, ortak)
# ----------------------------------------------------------------------------
def ema(s, n):
    return s.ewm(span=n, adjust=False).mean()


def atr(df, n=14):
    pc = df.close.shift(1)
    tr = pd.concat([(df.high - df.low), (df.high - pc).abs(), (df.low - pc).abs()], axis=1).max(axis=1)
    return tr.ewm(alpha=1 / n, adjust=False).mean()


def rsi(s, n=14):
    d = s.diff()
    up = d.clip(lower=0).ewm(alpha=1 / n, adjust=False).mean()
    dn = (-d.clip(upper=0)).ewm(alpha=1 / n, adjust=False).mean()
    rs = up / dn.replace(0, np.nan)
    return 100 - (100 / (1 + rs))


def adx(df, n=14):
    up = df.high.diff()
    dn = -df.low.diff()
    plus = up.where((up > dn) & (up > 0), 0.0)
    minus = dn.where((dn > up) & (dn > 0), 0.0)
    a = atr(df, n).replace(0, np.nan)
    pdi = 100 * plus.ewm(alpha=1 / n, adjust=False).mean() / a
    mdi = 100 * minus.ewm(alpha=1 / n, adjust=False).mean() / a
    dx = 100 * (pdi - mdi).abs() / (pdi + mdi).replace(0, np.nan)
    return dx.ewm(alpha=1 / n, adjust=False).mean().fillna(0)


def enrich(df):
    df = df[df.confirm == "1"].copy()
    if len(df) < 210:
        return df
    df["ema20"] = ema(df.close, 20)
    df["ema50"] = ema(df.close, 50)
    df["ema200"] = ema(df.close, 200)
    df["atr"] = atr(df, 14)
    df["rsi"] = rsi(df.close, 14)
    df["adx"] = adx(df, 14)
    macd = ema(df.close, 12) - ema(df.close, 26)
    df["macd_hist"] = macd - ema(macd, 9)
    df["volume_ratio"] = df.volume / df.volume.rolling(20).mean().replace(0, np.nan)
    df["breakout"] = df.high.shift(1).rolling(20).max()
    return df.dropna()


# ----------------------------------------------------------------------------
# GİRİŞ MANTIĞI: az sayıda ZORUNLU (hard) yapısal şart + AĞIRLIKLI PUAN
# ----------------------------------------------------------------------------
# ESKİ TASARIMDAKİ SORUN (bugün sayısal simülasyonla doğrulandı):
# Önceki sürüm 7 farklı koşulu (EMA + ADX + RSI + MACD + hacim + breakout +
# kovalama-koruması) hepsini AYNI ANDA zorunlu (AND) tutuyordu. Her koşul
# tek başına %11-90 arası bir olasılıkla gerçekleşse bile, yedisini birden
# istemek olasılıkları çarpıyor ve gerçek/sentetik verilerde ölçülen ortak
# geçiş oranı sadece %0.2'ye düşüyordu - "hiç aday bulunamaması" bir hata
# değil, doğrudan bu istatistiksel darboğazın sonucuydu.
#
# ÇÖZÜM: Sadece gerçekten vazgeçilemez 3 yapısal şartı ZORUNLU tut (trend
# yönü + üst zaman dilimi teyidi + momentum yönü). Geri kalan her şeyi
# (ADX gücü, RSI konumu, hacim, breakout, kovalama mesafesi) kademeli
# puanlara çevirip toplam skor üzerinden karar ver. Aynı simülasyonla test
# edildiğinde bu yaklaşım geçiş oranını %0.2'den %9-10 seviyesine çıkarıyor,
# yine de zayıf/gürültülü sinyalleri elemeye devam ediyor.

def passes_hard_filters(x, hh):
    """Sadece gerçekten vazgeçilemez yapısal şartlar."""
    if not (x.ema20 > x.ema50 > x.ema200):
        return False
    if not (hh.close > hh.ema200 and hh.ema50 > hh.ema200):
        return False
    if x.macd_hist <= 0:
        return False
    return True


def score(main, htf):
    m = main.iloc[-1]
    h = htf.iloc[-1]
    points = 0
    # Yapısal uyum (zaten hard filter'dan geçti, ek puan)
    if m.ema20 > m.ema50 > m.ema200:
        points += 20
    if h.close > h.ema200 and h.ema50 > h.ema200:
        points += 20
    # Trend gücü - kademeli (eskiden hard cutoff'tu)
    if m.adx >= 25:
        points += 20
    elif m.adx >= 15:
        points += 10
    # RSI konumu - kademeli
    if 50 <= m.rsi <= 70:
        points += 20
    elif 40 <= m.rsi < 80:
        points += 10
    # Hacim - kademeli
    if m.volume_ratio >= 1.3:
        points += 20
    elif m.volume_ratio >= 1.0:
        points += 10
    # Breakout - artık ZORUNLU DEĞİL, bonus puan
    if m.close > m.breakout:
        points += 10
    # Kovalama mesafesi - hard reddetme yerine kademeli puan kırma
    dist_atr = (m.close - m.ema20) / m.atr if m.atr > 0 else 0
    if dist_atr <= 1.0:
        points += 10
    elif dist_atr <= 2.0:
        points += 5
    return points


ENTRY_SCORE_THRESHOLD = 60  # 100 üzerinden


# ----------------------------------------------------------------------------
# OKX ADAPTÖRÜ
# ----------------------------------------------------------------------------
def okx_get(path, params):
    r = requests.get(OKX_BASE + path, params=params, timeout=20)
    r.raise_for_status()
    d = r.json()
    if d.get("code") != "0":
        raise RuntimeError(d.get("msg", "OKX API error"))
    return d.get("data", [])


def okx_candles(symbol, interval_key):
    bar = {"m15": "15m", "h1": "1H"}[interval_key]
    raw = okx_get("/api/v5/market/candles", {"instId": symbol, "bar": bar, "limit": 250})
    rows = []
    for x in raw:
        if len(x) < 9:
            continue
        rows.append({"ts": int(x[0]), "open": f(x[1]), "high": f(x[2]), "low": f(x[3]),
                     "close": f(x[4]), "volume": f(x[5]), "confirm": str(x[8])})
    df = pd.DataFrame(rows)
    if df.empty:
        return df
    return df.sort_values("ts").drop_duplicates("ts").reset_index(drop=True)


def okx_symbols():
    data = okx_get("/api/v5/public/instruments", {"instType": "SPOT"})
    out = []
    for x in data:
        s = x.get("instId", "")
        if (x.get("state") == "live" and s.endswith("-USDT")
                and s[:-5].upper() not in {"USDT", "USDC", "USDE", "USDS", "USDG", "DAI", "FDUSD", "TUSD", "PYUSD"}
                and not s[:-5].startswith("X")):
            out.append(s)
    return out


def okx_tickers():
    out = {}
    for x in okx_get("/api/v5/market/tickers", {"instType": "SPOT"}):
        s = x.get("instId")
        if s and s.endswith("-USDT"):
            out[s] = {"last": f(x.get("last")), "vol": f(x.get("volCcy24h"))}
    return out


# ----------------------------------------------------------------------------
# COINBASE ADAPTÖRÜ (YENİ — araştırma sonucu seçildi, bkz. yukarıdaki not)
# ----------------------------------------------------------------------------
# Coinbase'in tek "tüm coinlerin fiyatı" uç noktası olmadığı için (OKX'teki
# gibi), likit ve bilinen büyük coinlerden oluşan sabit bir liste kullanıp
# hangilerinin gerçekten işlemde olduğunu /products üzerinden doğruluyoruz.
# Bu, her coin için ayrı ayrı hacim sorgusu yapmaktan (yavaş, çok istek)
# daha az API çağrısı gerektiriyor.
COINBASE_MAJOR_COINS = [
    "BTC", "ETH", "SOL", "XRP", "ADA", "DOGE", "AVAX", "LINK", "DOT", "LTC",
    "BCH", "ATOM", "UNI", "ETC", "FIL", "APT", "ARB", "OP", "NEAR", "INJ",
    "SUI", "SEI", "RENDER", "AAVE", "MKR", "ALGO", "XLM", "HBAR", "GRT",
    "SAND", "MANA", "CRV", "COMP", "SNX", "SHIB", "PEPE", "TIA", "IMX",
    "FTM", "RUNE", "ICP", "VET", "EOS", "XTZ", "CHZ", "GALA", "1INCH", "ENS",
]


def coinbase_get(path, params=None):
    r = requests.get(COINBASE_BASE + path, params=params, timeout=20)
    r.raise_for_status()
    return r.json()


def coinbase_symbols():
    data = coinbase_get("/products")
    listed = {x.get("id") for x in data if x.get("quote_currency") == "USD"
              and x.get("status") == "online" and not x.get("trading_disabled", False)}
    out = [f"{c}-USD" for c in COINBASE_MAJOR_COINS if f"{c}-USD" in listed]
    return out[:MAX_SCAN_PER_EXCHANGE]


def coinbase_tickers():
    out = {}
    for s in coinbase_symbols():
        try:
            d = coinbase_get(f"/products/{s}/ticker")
            price = f(d.get("price"))
            vol_base = f(d.get("volume"))
            if price > 0:
                out[s] = {"last": price, "vol": vol_base * price}
        except Exception:
            continue
    return out


def coinbase_candles(symbol, interval_key):
    granularity = {"m15": 900, "h1": 3600}[interval_key]
    raw = coinbase_get(f"/products/{symbol}/candles", {"granularity": granularity})
    rows = []
    for x in raw:
        if len(x) < 6:
            continue
        # Coinbase format: [time, low, high, open, close, volume]
        rows.append({"ts": int(x[0]), "open": f(x[3]), "high": f(x[2]), "low": f(x[1]),
                     "close": f(x[4]), "volume": f(x[5]), "confirm": "1"})
    df = pd.DataFrame(rows)
    if df.empty:
        return df
    df = df.sort_values("ts").drop_duplicates("ts").reset_index(drop=True)
    return df.iloc[:-1] if len(df) > 1 else df


EXCHANGES = {
    "OKX": {"symbols": okx_symbols, "tickers": okx_tickers, "candles": okx_candles, "prefix": "OKX:"},
    "COINBASE": {"symbols": coinbase_symbols, "tickers": coinbase_tickers, "candles": coinbase_candles, "prefix": "COINBASE:"},
}


# ----------------------------------------------------------------------------
# PAPER TRADING DOSYA İŞLEMLERİ
# ----------------------------------------------------------------------------
def load():
    try:
        with open(PAPER_FILE, "r", encoding="utf-8") as h:
            x = json.load(h)
            return x if isinstance(x, list) else []
    except Exception:
        return []


def save(trades):
    with open(PAPER_FILE, "w", encoding="utf-8") as h:
        json.dump(trades, h, ensure_ascii=False, indent=2)


def close_trade(t, price, reason):
    entry = f(t.get("entry_price"))
    side = t.get("side", "LONG")
    move = (price - entry) / entry if side == "LONG" else (entry - price) / entry
    gross = STAKE * move
    t["exit_price"] = price
    t["exit_time"] = now()
    t["current_pnl_pct"] = move
    t["gross_pnl_tl"] = gross
    t["fees_tl"] = STAKE * FEE * 2
    t["slippage_tl"] = STAKE * SLIP
    t["net_pnl_tl"] = gross - t["fees_tl"] - t["slippage_tl"]
    t["status"] = "CLOSED"
    t["exit_reason"] = reason


def manage(trades, prices):
    for t in trades:
        if t.get("status") != "OPEN":
            continue
        p = prices.get(t.get("symbol"))
        if not p:
            continue
        entry = f(t.get("entry_price"))
        move = (p - entry) / entry
        peak = max(f(t.get("peak_pnl_pct")), move)
        t["peak_pnl_pct"] = peak
        t["peak_price"] = p if peak >= f(t.get("peak_pnl_pct")) else t.get("peak_price", entry)
        stop = f(t.get("initial_sl"))
        if p <= stop:
            close_trade(t, p, "INITIAL STOP LOSS")
            continue
        trail = None
        for peak_level, giveback in [(0.03, 0.015), (0.05, 0.013), (0.08, 0.012), (0.12, 0.010),
                                      (0.20, 0.008), (0.30, 0.007), (0.50, 0.006)]:
            if peak >= peak_level:
                trail = peak - giveback
        if trail is not None:
            t["trailing_active"] = True
            t["trailing_stop_pct"] = trail
            if move <= trail:
                close_trade(t, p, "V2 DYNAMIC TRAILING STOP")
        t["current_pnl_pct"] = move


def can_enter(trades, symbol):
    if any(t.get("status") == "OPEN" and t.get("symbol") == symbol for t in trades):
        return False
    cutoff = datetime.now(timezone.utc) - timedelta(hours=4)
    for t in reversed(trades):
        if t.get("symbol") != symbol or t.get("status") != "CLOSED":
            continue
        try:
            if datetime.fromisoformat(t.get("exit_time", "").replace("Z", "+00:00")) > cutoff:
                return False
        except Exception:
            pass
        break
    return True


# ----------------------------------------------------------------------------
# ANA TARAMA
# ----------------------------------------------------------------------------
def scan_exchange(name, adapter, open_count):
    """Tek bir borsayı tara, aday listesi döndür. Hata olursa boş liste döner
    (bu borsa o döngüde atlanır ama script çökmez — dayanıklılık için)."""
    candidates = []
    try:
        tk = adapter["tickers"]()
        syms = [s for s in adapter["symbols"]() if s in tk]
        ranked = sorted(syms, key=lambda s: tk[s]["vol"], reverse=True)[:MAX_SCAN_PER_EXCHANGE]
    except Exception as e:
        print(f"[{name}] ticker/symbol listesi alınamadı, bu döngüde atlanıyor: {e}")
        return candidates

    for s in ranked:
        prefixed = adapter["prefix"] + s
        if open_count >= MAX_OPEN:
            break
        try:
            m = enrich(adapter["candles"](s, "m15"))
            h = enrich(adapter["candles"](s, "h1"))
            if len(m) < 210 or len(h) < 210:
                continue
            x = m.iloc[-1]
            hh = h.iloc[-1]
            if not passes_hard_filters(x, hh):
                continue
            sc = score(m, h)
            if sc < ENTRY_SCORE_THRESHOLD:
                continue
            stop_pct = min(0.035, max(0.015, 1.8 * x.atr / x.close))
            candidates.append((sc, prefixed, x.close, stop_pct, x))
        except Exception as e:
            print(f"[{name}] {s}: {e}")
    return candidates


def main():
    trades = load()
    all_prices = {}

    for name, adapter in EXCHANGES.items():
        try:
            tk = adapter["tickers"]()
            for s, v in tk.items():
                if v["last"] > 0:
                    all_prices[adapter["prefix"] + s] = v["last"]
        except Exception as e:
            print(f"[{name}] fiyatlar alınamadı: {e}")

    manage(trades, all_prices)
    open_count = sum(t.get("status") == "OPEN" for t in trades)

    all_candidates = []
    for name, adapter in EXCHANGES.items():
        cands = scan_exchange(name, adapter, open_count)
        cands = [c for c in cands if can_enter(trades, c[1])]
        all_candidates.extend(cands)

    all_candidates.sort(reverse=True, key=lambda z: z[0])
    slots = max(0, MAX_OPEN - open_count)
    for sc, s, entry, stop_pct, x in all_candidates[:slots]:
        stop = entry * (1 - stop_pct)
        trades.append({
            "strategy_version": VERSION, "symbol": s, "side": "LONG", "status": "OPEN",
            "stake_tl": STAKE, "entry_time": now(), "entry_price": entry, "initial_sl": stop,
            "current_sl": stop, "market_regime": "V5_WEIGHTED_TREND_MULTI_EXCHANGE",
            "htf_score": 20 if x.adx >= 15 else 0, "htf_confirmed": True, "peak_price": entry,
            "peak_pnl_pct": 0.0, "current_pnl_pct": 0.0, "trailing_active": False,
            "trailing_stop_price": None, "last_milestone": 0.0, "gross_pnl_tl": 0.0,
            "fees_tl": 0.0, "slippage_tl": 0.0, "net_pnl_tl": 0.0, "last_score": sc,
        })

    closed = [t for t in trades if t.get("status") == "CLOSED"]
    wins = [t for t in closed if f(t.get("net_pnl_tl")) > 0]
    losses = [t for t in closed if f(t.get("net_pnl_tl")) <= 0]
    net = sum(f(t.get("net_pnl_tl")) for t in closed)
    print("=" * 70)
    print(f"{VERSION} | candidates={len(all_candidates)}")
    print(f"open={sum(t.get('status') == 'OPEN' for t in trades)} closed={len(closed)} "
          f"wins={len(wins)} losses={len(losses)}")
    print(f"win_rate={(len(wins) / len(closed) * 100 if closed else 0):.2f}% NET={net:.2f} TL")
    print("=" * 70)
    save(trades)


if __name__ == "__main__":
    main()
