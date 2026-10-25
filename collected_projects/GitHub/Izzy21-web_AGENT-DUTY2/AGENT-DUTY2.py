"""
AGENT DUTY - game FPS agen rahasia di dalam mansion (raycasting) dengan Python
Instal : pip install pygame numpy
Jalan  : python agent_duty.py
Menu: START GAME > pilih difficulty. Kontrol bisa diatur di SETTINGS | Klik kiri tembak | R reload
         1/2/3 ganti senjata | Shift lari | ENTER ulang | ESC keluar
Semua grafik & suara dibuat lewat kode (tanpa file gambar/audio).
"""
import math, random, os, json
from collections import deque
from types import SimpleNamespace as NS
import numpy as np
import pygame as pg

SAVE = os.path.join(os.path.dirname(os.path.abspath(__file__)), "agent_duty_settings.json")
CFG = dict(sens=5, vol=8, keys=dict(maju=pg.K_w, mundur=pg.K_s, kiri=pg.K_a, kanan=pg.K_d, lari=pg.K_LSHIFT, reload=pg.K_r, lompat=pg.K_SPACE))
try:
    with open(SAVE) as f: _sv = json.load(f)
    CFG["sens"], CFG["vol"] = int(_sv["sens"]), int(_sv["vol"]); CFG["keys"].update({k: int(v) for k, v in _sv["keys"].items()})
except Exception: pass
def save_cfg():
    try:
        with open(SAVE, "w") as f: json.dump(CFG, f)
    except Exception: pass
SR = 22050
pg.mixer.pre_init(SR, -16, 2, 512)
pg.init()
MIX = pg.mixer.get_init()          # None jika tidak ada perangkat audio
W, H, SC = 320, 200, 3                      # resolusi render, skala jendela
screen = pg.display.set_mode((W * SC, H * SC))
pg.display.set_caption("AGENT DUTY")
canvas = pg.Surface((W, H))
clock = pg.time.Clock()
font, small, big, mid = pg.font.Font(None, 30), pg.font.Font(None, 22), pg.font.Font(None, 96), pg.font.Font(None, 66)
rng = np.random.default_rng(7)
D = pg.draw

# ================= SUARA (disintesis dengan numpy) =================
def T(d): return np.arange(int(SR * d)) / SR
def nz(d): return rng.uniform(-1, 1, int(SR * d))
def lp(x, k): return np.convolve(x, np.ones(k) / k, "same")
class Mute:                                  # pengganti kalau audio tidak tersedia
    def play(self, *a): pass
    def stop(self): pass
    def set_volume(self, v): pass
def snd(x, vol=0.9):
    x = x / (np.abs(x).max() + 1e-9) * vol
    a = (x * 32000).astype(np.int16)
    try:
        ch = MIX[2]
        return pg.sndarray.make_sound(np.ascontiguousarray(a if ch == 1 else np.column_stack([a] * ch)))
    except Exception:
        return Mute()
def place(buf, x, at, g=1.0):
    i = int(SR * at); seg = x[:len(buf) - i]; buf[i:i + len(seg)] += seg * g
def click(f=2200, d=.05):
    t = T(d); n = nz(d)
    return ((n - lp(n, 6)) * .7 + np.sin(2 * np.pi * f * t) * .5) * np.exp(-t / .007)
def thud(d=.14, f=95):
    t = T(d); return (lp(nz(d), 18) * 1.5 + np.sin(2 * np.pi * f * t)) * np.exp(-t / .035)
def boom(d, f0, decay, k, nd):          # dentuman senjata: dentum + retakan + gema
    t = T(d)
    thump = np.sin(2 * np.pi * np.cumsum(f0 * np.exp(-t * 14) + 45) / SR) * np.exp(-t / decay)
    crack = nz(d) * np.exp(-t / .012)
    body = lp(nz(d), k) * np.exp(-t / nd) * 3
    return thump * .9 + crack * .8 + body
def growl(d, f0, wob, dec=None):
    t = T(d); f = f0 + 25 * np.sin(2 * np.pi * wob * t)
    saw = (np.cumsum(f) / SR % 1) * 2 - 1
    env = np.sin(np.pi * t / d) if dec is None else np.exp(-t / dec)
    return (lp(saw, 6) + lp(nz(d), 12) * .5) * env

def voice(d, f0, f1, dec=None):             # suara manusia: teriak / erangan / jeritan
    t = T(d); f = np.linspace(f0, f1, len(t)) * (1 + .03 * np.sin(2 * np.pi * 6 * t))
    saw = (np.cumsum(f) / SR % 1) * 2 - 1
    env = np.sqrt(np.sin(np.pi * t / d)) if dec is None else np.exp(-t / dec)
    return (lp(saw, 3) + lp(nz(d), 5) * .25) * env

def reload_mag():
    b = np.zeros(int(SR * 1.5))
    place(b, click(1800), 0); place(b, thud(), .30, 1.1)
    place(b, click(1400), .75); place(b, click(1100, .06), .80)
    place(b, click(900, .06), 1.10); place(b, click(2600), 1.17)
    return b
def reload_sg():
    b = np.zeros(int(SR * 1.9))
    for at in (.1, .45, .8): place(b, click(1200, .06), at); place(b, thud(.08, 150), at + .03, .5)
    place(b, lp(nz(.15), 4) * np.exp(-T(.15) / .08), 1.2); place(b, click(700, .07), 1.2); place(b, click(2400), 1.42)
    return b

SND = {
    "pistol": snd(boom(.45, 140, .09, 6, .10)), "rifle": snd(boom(.30, 110, .06, 5, .07), .8),
    "shotgun": snd(boom(.9, 90, .22, 14, .35)), "rmag": snd(reload_mag(), .8), "rsg": snd(reload_sg(), .8),
    "empty": snd(click(1000), .6), "step": snd(thud(.1, 70), .35), "hurt": snd(voice(.25, 140, 100, .12)), "growl": snd(voice(.5, 200, 175)),
    "die": snd(voice(.7, 210, 70, .25)),
    "slash": snd((lambda n: (n - lp(n, 4)) * np.sin(np.pi * np.arange(len(n)) / len(n)))(nz(.22)), .7),
    "pickup": snd(np.concatenate([np.sin(2 * np.pi * 660 * T(.08)), np.sin(2 * np.pi * 990 * T(.1))]) * .6, .5),
}
t6 = T(6)   # dengung latar yang mencekam (loop mulus)
ambient = snd((np.sin(2 * np.pi * 55 * t6) + np.sin(2 * np.pi * 55.5 * t6) + .6 * np.sin(2 * np.pi * 82.5 * t6))
              * (.7 + .3 * np.sin(2 * np.pi * .5 * t6)), .2)
def play(name, d=0):
    s = SND[name]; s.set_volume(max(.05, 1 - d / 22) * CFG["vol"] / 10); s.play()

# ================= TEKSTUR (dibuat prosedural) =================
YY, XX = np.mgrid[0:64, 0:64]
def noisy(base, amp=14):
    t = np.empty((64, 64, 3), np.float32); t[:] = base
    return t + rng.integers(-amp, amp, (64, 64, 1))
def blobs(k):
    a = rng.random((64, 64))
    b = sum(np.roll(np.roll(a, i, 0), j, 1) for i in range(k) for j in range(k))
    return (b - b.mean()) / b.std()
def tex_wallpaper():                          # wallpaper damask merah marun + lis kayu
    t = noisy((92, 28, 36), 8)
    t[(((XX % 16 - 8) ** 2 + (YY % 16 - 8) ** 2) < 12) | (((XX % 16) + (YY % 16)) % 16 < 1)] = (140, 100, 52)
    t[YY >= 52] = (54, 32, 24); t[YY == 51] = (170, 125, 60)
    return t * (1 + .12 * blobs(9))[..., None]
def tex_wood():                               # panel kayu gelap / lemari
    t = noisy((78, 46, 30), 8) * (1 + .22 * np.sin(XX * .9 + blobs(5)))[..., None]
    t[(XX % 32 < 2) | (YY % 32 < 2)] = (28, 17, 12); t[(XX % 32 == 2) | (YY % 32 == 2)] = (120, 78, 48)
    return t
def tex_plaster():                            # dinding krem + lukisan berbingkai emas
    t = noisy((178, 166, 142), 6) * (1 + .1 * blobs(9))[..., None]
    t[YY >= 50] = (88, 58, 38); t[YY == 49] = (150, 110, 60)
    t[8:36, 14:50] = (160, 120, 45); t[11:33, 17:47] = (34, 46, 56); t[16:30, 22:42] = (70, 92, 70); t[22:30, 30:40] = (96, 78, 52)
    return t
def tex_floor():                              # lantai parket kayu
    t = noisy((98, 62, 40), 8); a = np.where((XX // 16 + YY // 16) % 2 == 0, XX % 8, YY % 8)
    t[a < 1] = (46, 27, 17); return t * (1 + .2 * blobs(7))[..., None]
def tex_ceil():                               # langit-langit kayu berpetak
    t = noisy((74, 66, 60), 5); t[(XX % 32 < 3) | (YY % 32 < 3)] = (40, 28, 20); return t

WALLS = np.stack([tex_wallpaper(), tex_wood(), tex_plaster()]).clip(0, 255).astype(np.float32)
FLOOR, CEIL = tex_floor().clip(0, 255), tex_ceil().clip(0, 255)

def to_tex(s):
    rgb = pg.surfarray.array3d(s).transpose(1, 0, 2).astype(np.float32) * (.85 + .3 * rng.random((64, 64, 1)))
    return np.dstack([rgb, pg.surfarray.array_alpha(s).T.astype(np.float32)])
def surf(): return pg.Surface((64, 64), pg.SRCALPHA)
def make_enemy(kind, jacket, pants, skin):
    s = surf(); dk = tuple(c // 2 for c in jacket); wd = {"bodyguard": 4, "boss": 6}.get(kind, 0)
    D.rect(s, pants, (22 - wd // 2, 41, 9, 19)); D.rect(s, pants, (33 + wd // 2, 41, 9, 19))             # kaki
    D.rect(s, (15, 15, 15), (21 - wd // 2, 58, 11, 5)); D.rect(s, (15, 15, 15), (32 + wd // 2, 58, 11, 5))  # sepatu
    D.polygon(s, jacket, [(20 - wd, 19), (44 + wd, 19), (46 + wd, 43), (18 - wd, 43)])                    # badan
    D.polygon(s, dk, [(20 - wd, 19), (25, 19), (32, 41), (18 - wd, 43)])
    if kind in ("agen", "bodyguard", "boss"):                                                                      # kemeja & dasi
        D.polygon(s, (235, 235, 235), [(28, 19), (36, 19), (32, 32)]); D.polygon(s, (10, 10, 12), [(31, 22), (33, 22), (34, 36), (32, 39), (30, 36)])
    D.line(s, jacket, (21 - wd, 21), (13 - wd, 37), 5); D.line(s, jacket, (43 + wd, 21), (50 + wd, 32), 5)  # lengan
    D.circle(s, skin, (13 - wd, 39), 3); D.circle(s, skin, (50 + wd, 33), 3)
    if kind == "penjahat": D.rect(s, (30, 30, 34), (50 + wd, 28, 11, 5)); D.rect(s, (30, 30, 34), (51 + wd, 31, 4, 6))   # pistol
    elif kind in ("agen", "boss"): D.rect(s, (22, 22, 26), (40, 29, 22, 6)); D.rect(s, (22, 22, 26), (46, 33, 4, 8))               # SMG
    elif kind == "preman": D.line(s, (160, 160, 170), (52, 34), (58, 8), 3)                                              # pipa besi
    D.circle(s, skin, (32, 11), 8 + wd // 2)                                                                              # kepala
    if kind == "preman": D.rect(s, (22, 22, 28), (24, 2, 16, 6)); D.rect(s, (60, 60, 66), (24, 6, 16, 2))                 # kupluk
    elif kind == "penjahat": D.rect(s, (30, 22, 18), (25, 3, 14, 5)); D.rect(s, (170, 30, 30), (25, 13, 14, 6))          # bandana merah
    elif kind == "agen": D.rect(s, (30, 24, 20), (25, 3, 14, 5)); D.rect(s, (8, 8, 10), (25, 9, 14, 4))                  # kacamata hitam
    else: D.rect(s, (8, 8, 10), (24, 9, 16, 4))
    return to_tex(s)
def make_dead(body, skin):
    s = surf(); D.ellipse(s, (95, 8, 8), (4, 50, 56, 12)); D.rect(s, body, (12, 48, 36, 10))
    D.circle(s, skin, (50, 53), 6); D.line(s, (40, 40, 60), (12, 52), (2, 58), 4); return to_tex(s)
def make_fire():
    s = surf()
    for r, c in ((30, (255, 170, 40)), (18, (255, 230, 120)), (8, (255, 255, 235))): D.circle(s, c, (32, 32), r)
    return to_tex(s)
def make_item(kind):
    s = surf()
    if kind == "health":
        D.rect(s, (230, 230, 230), (14, 24, 36, 26)); D.rect(s, (200, 20, 20), (28, 27, 8, 20)); D.rect(s, (200, 20, 20), (22, 33, 20, 8))
    elif kind == "armor":
        D.polygon(s, (40, 90, 210), [(16, 24), (48, 24), (52, 50), (12, 50)]); D.line(s, (120, 170, 255), (20, 28), (44, 28), 3)
    else:
        D.rect(s, (80, 86, 50), (12, 30, 40, 22))
        for i in range(5): D.rect(s, (215, 175, 45), (16 + i * 7, 22, 5, 11))
    return to_tex(s)

def make_cp(on):                              # lampu checkpoint: oranye = belum, hijau = aktif
    s = surf(); c = (70, 235, 130) if on else (235, 150, 40)
    D.rect(s, (60, 56, 56), (29, 26, 6, 36)); D.rect(s, (60, 56, 56), (22, 58, 20, 5))
    D.circle(s, tuple(v // 3 for v in c), (32, 18), 14); D.circle(s, c, (32, 18), 10); D.circle(s, (255, 255, 235), (32, 18), 4)
    return to_tex(s)

TYPES = {"preman": dict(hp=45, spd=2.1, dmg=10, rng=0, cd=1.0, snd="", c=((72, 74, 82), (46, 58, 96), (205, 160, 125))),
         "penjahat": dict(hp=60, spd=1.5, dmg=9, rng=11, cd=1.7, snd="pistol", c=((104, 64, 40), (40, 40, 48), (190, 140, 105))),
         "agen": dict(hp=90, spd=1.8, dmg=7, rng=12, cd=.85, snd="rifle", c=((24, 24, 30), (20, 20, 26), (215, 170, 135))),
         "bodyguard": dict(hp=160, spd=2.6, dmg=16, rng=0, cd=1.0, snd="", c=((18, 18, 22), (18, 18, 22), (170, 120, 90))),
         "boss": dict(hp=900, spd=2.0, dmg=9, rng=14, cd=.45, snd="rifle", c=((226, 226, 232), (30, 30, 36), (190, 140, 105)))}
TEX = {"fire": make_fire(), **{k: make_item(k) for k in ("health", "armor", "ammo")}}
for k, v in TYPES.items(): TEX[k] = make_enemy(k, *v["c"]); TEX["dead_" + k] = make_dead(v["c"][0], v["c"][2])
TEX["cp0"], TEX["cp1"] = make_cp(False), make_cp(True)

# ================= PETA & UTILITAS =================
N = 40
def build_map():
    for _ in range(100):
        m = np.zeros((N, N), np.int8); m[0, :] = m[-1, :] = m[:, 0] = m[:, -1] = 1; doors = set()
        def split(x0, y0, x1, y1):                # bagi area jadi 2 ruangan, beri pintu selebar 2 sel
            w, h = x1 - x0, y1 - y0
            if w < 12 and h < 12: return
            vert = (w >= h) if (w >= 12 and h >= 12) else (w >= 12)
            a0, a1 = (x0, x1) if vert else (y0, y1)
            ends = lambda c: ((c, y0 - 1), (c, y1)) if vert else ((x0 - 1, c), (x1, c))
            cand = [c for c in range(a0 + 5, a1 - 5) if not any(e in doors for e in ends(c))]
            if not cand: return
            c = random.choice(cand); wt = random.choice((1, 1, 2, 3)); lo, hi = (y0, y1) if vert else (x0, x1)
            for p in range(lo, hi):
                if vert: m[p, c] = wt
                else: m[c, p] = wt
            for _ in range(2):
                p = random.randint(lo + 1, hi - 3)
                for q in (p, p + 1):
                    if vert: m[q, c] = 0; doors.add((c, q))
                    else: m[c, q] = 0; doors.add((q, c))
            if vert: split(x0, y0, c, y1); split(c + 1, y0, x1, y1)
            else: split(x0, y0, x1, c); split(x0, c + 1, x1, y1)
        split(1, 1, N - 1, N - 1)
        for _ in range(70):                       # perabot: lemari / meja dari balok kayu
            x, y = random.randint(2, N - 4), random.randint(2, N - 4); w, h = random.choice(((1, 1), (2, 1), (1, 2)))
            near = any((x + i, y + j) in doors for i in range(-2, w + 2) for j in range(-2, h + 2))
            if not m[y - 1:y + h + 1, x - 1:x + w + 1].any() and not near and not (x < 8 and y < 8): m[y:y + h, x:x + w] = 2
        seen = np.zeros((N, N), bool); seen[3, 3] = True; q = deque([(3, 3)])
        while q:
            x, y = q.popleft()
            for nx, ny in ((x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)):
                if m[ny, nx] == 0 and not seen[ny, nx]: seen[ny, nx] = True; q.append((nx, ny))
        if seen.sum() > 650: break
    m[(m == 0) & ~seen] = 1                       # ruang yang tak terjangkau ditutup
    return m
def build_arena():                            # ruang bos: aula besar tersendiri, pilar jadi tempat berlindung
    m = np.ones((N, N), np.int8); m[8:32, 2:38] = 0
    m[7, 1:39] = m[32, 1:39] = 3; m[7:33, 1] = m[7:33, 38] = 3
    for px, py in ((9, 12), (9, 26), (19, 12), (19, 26), (29, 12), (29, 26), (14, 19), (24, 19)): m[py:py + 2, px:px + 2] = 2
    return m
def bfs(src):
    d = np.full((N, N), 9999, np.int32); d[src[1], src[0]] = 0; q = deque([src])
    while q:
        x, y = q.popleft()
        for nx, ny in ((x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)):
            if MAP[ny, nx] == 0 and d[ny, nx] > d[y, x] + 1: d[ny, nx] = d[y, x] + 1; q.append((nx, ny))
    return d
def free(x, y, r=.25):
    return not any(MAP[int(y + dy), int(x + dx)] for dx in (-r, r) for dy in (-r, r))
def los(x0, y0, x1, y1):
    n = int(math.hypot(x1 - x0, y1 - y0) / .2) + 1
    return not any(MAP[int(y0 + (y1 - y0) * i / n), int(x0 + (x1 - x0) * i / n)] for i in range(1, n))

P = NS(); MAP = DIST = MM = None; enemies, items, projs, cps = [], [], [], []; DIFF = {}
LIGHT, FLICK = 1.0, 0.0

DIFFS = {
    "EASY": dict(floors=2, n=34, add=5, hp=.8, dmg=.7, spd=.9, cd=1.3, spr=.10, sight=14, conts=99, guards=4, items=34, mix=[45, 30, 20, 5],
                 desc="Musuh sedikit & lemah, 2 lantai + ruang bos, continue tak terbatas"),
    "MEDIUM": dict(floors=3, n=42, add=7, hp=1.0, dmg=1.0, spd=1.0, cd=1.0, spr=.06, sight=18, conts=5, guards=8, items=28, mix=[35, 30, 25, 10],
                   desc="Seimbang: 3 lantai + ruang bos, 5 continue"),
    "HARD": dict(floors=4, n=50, add=9, hp=1.5, dmg=1.4, spd=1.15, cd=.7, spr=.03, sight=22, conts=3, guards=12, items=22, mix=[20, 30, 35, 15],
                 desc="Musuh banyak, kuat & akurat, 4 lantai + ruang bos, hanya 3 continue")}

def save_cp(x, y):
    P.cp = dict(x=x, y=y, a=P.a, hp=P.hp, armor=P.armor, weap=[dict(w) for w in P.weap], cur=P.cur)

def start_game(key):
    global DIFF
    DIFF = DIFFS[key]; P.diff = key; P.floor = 0; P.hp, P.armor, P.kills, P.time = 100, 50, 0, 0.0
    P.conts, P.used, P.cur = DIFF["conts"], 0, 0
    mk = lambda **k: k
    P.weap = [mk(name="PISTOL", mag=12, ammo=12, mags=4, dmg=24, delay=.32, pel=1, spr=.012, auto=False, snd="pistol", rl=1.5, rsnd="rmag", ln=230, zoom=.5),
              mk(name="ASSAULT RIFLE", mag=30, ammo=30, mags=3, dmg=15, delay=.09, pel=1, spr=.03, auto=True, snd="rifle", rl=1.7, rsnd="rmag", ln=300, zoom=.22),
              mk(name="SHOTGUN", mag=6, ammo=6, mags=3, dmg=13, delay=.85, pel=9, spr=.07, auto=False, snd="shotgun", rl=2.0, rsnd="rsg", ln=320, zoom=.52)]
    new_floor()

def next_floor():
    P.floor += 1; P.hp = min(100, P.hp + 30); P.armor = min(100, P.armor + 25)
    for w in P.weap: w["mags"] = min(9, w["mags"] + 1)
    new_floor()

def new_floor():
    global MAP, DIST, MM, enemies, items, projs, cps
    arena = P.floor == DIFF["floors"]                             # stage terakhir = ruang bos
    MAP = build_arena() if arena else build_map(); sx, sy = (4.5, 19.5) if arena else (3.5, 3.5)
    DIST = bfs((int(sx), int(sy))); P.x, P.y = sx, sy; P.a = 0.0 if arena else .6
    P.cd = P.rl = P.flash = P.kick = P.hurt = P.bob = P.dtimer = 0.0; P.z = P.vz = P.scope = P.swap = 0.0; P.run = False; P.step = 0.0; P.inv = 2.0
    P.state = "play"; P.wave = False; projs = []
    cells = [(x, y) for y in range(N) for x in range(N) if DIST[y, x] < 9999]; random.shuffle(cells)
    if arena:
        boss = Enemy("boss", 34.5, 19.5); boss.awake = True; enemies = [boss]
        for x, y in [c for c in cells if c[0] > 24 and abs(c[0] - 34) + abs(c[1] - 19) > 3][:DIFF["guards"]]:
            e = Enemy(random.choice(("preman", "penjahat", "agen")), x + .5, y + .5); e.awake = True; enemies.append(e)
        items = [[x + .5, y + .5, random.choice(["health", "armor", "ammo", "ammo"])] for x, y in [c for c in cells if 3 < c[0] < 22][:12]]
        cps = [[16.5, 19.5, False]]; P.msg = ("RUANG BOS  -  DON VARGO", 3)
    else:
        far = [c for c in cells if DIST[c[1], c[0]] > 11]; kinds = [k for k in TYPES if k != "boss"]
        enemies = [Enemy(random.choices(kinds, DIFF["mix"])[0], x + .5, y + .5) for x, y in far[:DIFF["n"] + DIFF["add"] * P.floor]]
        items = [[x + .5, y + .5, random.choice(["health", "armor", "ammo", "ammo"])] for x, y in cells[:DIFF["items"]]]
        cps = []; far_d = DIST[DIST < 9999].max()
        for fr in (.3, .55, .8):                                  # 3 checkpoint di sepanjang lantai
            cand = [c for c in cells if abs(DIST[c[1], c[0]] - far_d * fr) < 3]
            if cand: x, y = random.choice(cand); cps.append([x + .5, y + .5, False])
        P.msg = (f"LANTAI {P.floor + 1} / {DIFF['floors']}", 3)
    save_cp(sx, sy)
    MM = pg.Surface((N * 3, N * 3)); MM.fill((10, 8, 8))
    for y in range(N):
        for x in range(N):
            if MAP[y, x]: D.rect(MM, (110, 90, 80), (x * 3, y * 3, 3, 3))

def respawn():                                                    # lanjut dari checkpoint terakhir
    c = P.cp; P.x, P.y, P.a = c["x"], c["y"], c["a"]; P.hp = max(c["hp"], 60); P.armor = c["armor"]
    P.weap = [dict(w) for w in c["weap"]]; P.cur = c["cur"]; P.cd = P.rl = P.hurt = 0.0; P.z = P.vz = P.scope = P.swap = 0.0; P.inv = 3.0
    P.conts -= 1; P.used += 1; P.state = "play"; projs.clear()
    for e in enemies: e.awake = P.floor == DIFF["floors"]

def hurt(d):
    if P.inv > 0: return
    a = min(P.armor, d * .5); P.armor -= a; P.hp -= d - a; P.hurt = .35; play("hurt")
    if P.hp <= 0: P.hp = 0; P.state = "dead" if P.conts > 0 else "over"

class Enemy:
    def __init__(s, k, x, y):
        s.k, s.x, s.y = k, x, y; fl = 0 if k == "boss" else P.floor; s.hp = s.maxhp = TYPES[k]["hp"] * DIFF["hp"] * (1 + .12 * fl)
        s.dm = DIFF["dmg"] * (1 + .08 * fl); s.awake, s.cd, s.flash = False, random.uniform(.4, 1.4), 0
        s.wp, s.wt, s.n, s.sd, s.sdt = "rifle", 0.0, 0, 1, 0.0
    def hit(s, d):
        s.hp -= d; s.flash = .12; s.awake = True
        if s.hp <= 0: P.kills += 1; play("die", math.hypot(s.x - P.x, s.y - P.y))
    def fire(s, spread, dmg, snd_, n=1, cone=0.0):               # tembakan musuh (n > 1 = shotgun menyebar)
        a0 = math.atan2(P.y - s.y, P.x - s.x)
        for _ in range(n):
            a = a0 + random.gauss(0, spread) + (random.uniform(-cone, cone) if n > 1 else 0)
            projs.append([s.x, s.y, math.cos(a) * 14, math.sin(a) * 14, dmg * s.dm])
        play(snd_, math.hypot(P.x - s.x, P.y - s.y))
    def walk(s, dx, dy, sp, dt):                                 # gerak + geser di dinding
        n = math.hypot(dx, dy) or 1; mx, my = dx / n * sp * dt, dy / n * sp * dt
        if free(s.x + mx, s.y, .3): s.x += mx
        if free(s.x, s.y + my, .3): s.y += my
    def boss_ai(s, dt, d, seen):          # bos: jauh = rifle / shotgun, dekat = pistol / pisau
        s.wt -= dt; s.sdt -= dt
        if s.sdt <= 0: s.sd = random.choice((-1, 1)); s.sdt = random.uniform(1.2, 2.5)
        if s.wt <= 0 or (s.wp in ("rifle", "shotgun") and d < 2.5) or (s.wp in ("pisau", "pistol") and d > 9):
            s.wt = random.uniform(3, 5); s.wp = random.choice(("pisau", "pistol")) if d < 6 else random.choice(("rifle", "shotgun"))
        ax, ay = P.x - s.x, P.y - s.y; sp = TYPES["boss"]["spd"] * DIFF["spd"]; qx, qy = -ay, ax
        if not seen:
            cx, cy = int(s.x), int(s.y)
            nx, ny = min(((cx + 1, cy), (cx - 1, cy), (cx, cy + 1), (cx, cy - 1)), key=lambda q: DIST[q[1], q[0]])
            return s.walk(nx + .5 - s.x, ny + .5 - s.y, sp, dt)
        if s.wp == "pisau":                                      # serbu & tebas dengan pisau
            s.walk(ax, ay, sp * 1.5, dt)
            if d < 1.2 and s.cd <= 0 and P.z < .25: hurt(22 * s.dm); play("slash"); s.cd = .8 * DIFF["cd"]
        elif s.wp == "pistol":                                   # pistol cepat sambil bergeser
            k = 1 if d > 3.5 else -.4; s.walk(ax * k + qx * s.sd * .8, ay * k + qy * s.sd * .8, sp, dt)
            if s.cd <= 0: s.fire(DIFF["spr"], 9, "pistol"); s.cd = .45 * DIFF["cd"]
        elif s.wp == "rifle":                                    # rifle jarak jauh, tembakan beruntun
            k = 1 if d > 12 else -1 if d < 7 else 0; s.walk(ax * k + qx * s.sd, ay * k + qy * s.sd, sp, dt)
            if s.cd <= 0: s.n += 1; s.fire(DIFF["spr"] * .8, 7, "rifle"); s.cd = (1.1 if s.n % 4 == 0 else .16) * DIFF["cd"]
        else:                                                    # shotgun menyebar
            k = 1 if d > 9 else -1 if d < 5 else 0; s.walk(ax * k + qx * s.sd, ay * k + qy * s.sd, sp, dt)
            if s.cd <= 0: s.fire(.03, 5, "shotgun", 7, .2); s.cd = 1.6 * DIFF["cd"]
    def update(s, dt):
        if s.hp <= 0: return
        c = TYPES[s.k]; d = math.hypot(P.x - s.x, P.y - s.y)
        seen = d < DIFF["sight"] and los(s.x, s.y, P.x, P.y)
        if seen and not s.awake: s.awake = True; play("growl", d)
        if not s.awake: return
        s.cd -= dt; s.flash -= dt
        if s.k == "boss": return s.boss_ai(dt, d, seen)
        if c["rng"] and seen and d < c["rng"]:                  # penjahat & agen menembak
            if s.cd <= 0:
                a = math.atan2(P.y - s.y, P.x - s.x) + random.gauss(0, DIFF["spr"]); projs.append([s.x, s.y, math.cos(a) * 14, math.sin(a) * 14, c["dmg"] * s.dm])
                s.cd = c["cd"] * DIFF["cd"]; play(c["snd"], d)
            if d < 4.5: return
        elif d < .85:                                           # cakar jarak dekat
            if s.cd <= 0: hurt(c["dmg"] * s.dm); s.cd = DIFF["cd"]
            return
        if seen: tx, ty = P.x, P.y
        else:                                                   # ikuti peta jarak (pathfinding)
            cx, cy = int(s.x), int(s.y)
            nx, ny = min(((cx + 1, cy), (cx - 1, cy), (cx, cy + 1), (cx, cy - 1)), key=lambda q: DIST[q[1], q[0]])
            tx, ty = nx + .5, ny + .5
        a = math.atan2(ty - s.y, tx - s.x); mx, my = math.cos(a) * c["spd"] * DIFF["spd"] * dt, math.sin(a) * c["spd"] * DIFF["spd"] * dt
        for o in enemies:                                       # jangan menumpuk
            ox, oy = s.x - o.x, s.y - o.y
            if o is not s and o.hp > 0 and abs(ox) < .6 and abs(oy) < .6: mx += ox * dt * 1.2; my += oy * dt * 1.2
        if free(s.x + mx, s.y, .22): s.x += mx
        if free(s.x, s.y + my, .22): s.y += my

def shoot_ray(ang, dmg):
    dx, dy = math.cos(ang), math.sin(ang); d = 0.0
    while d < 30:
        d += .05
        if MAP[int(P.y + dy * d), int(P.x + dx * d)]: break
    best, bd = None, d
    for e in enemies:
        rx, ry = e.x - P.x, e.y - P.y; f = rx * dx + ry * dy
        if e.hp > 0 and 0 < f < bd and abs(rx * dy - ry * dx) < (.5 if e.k == "boss" else .35): best, bd = e, f
    if best: best.hit(dmg)

def start_reload():
    w = P.weap[P.cur]
    if P.rl <= 0 and w["mags"] > 0 and w["ammo"] < w["mag"]: P.rl = w["rl"]; play(w["rsnd"])

def update(dt, mdx, click_ev):
    global DIST
    k = pg.key.get_pressed()
    P.a += mdx * .0028 * CFG["sens"] / 5 * (1 - .6 * P.scope) + ((k[pg.K_RIGHT] or k[pg.K_e]) - (k[pg.K_LEFT] or k[pg.K_q])) * 2.2 * dt
    dx, dy = math.cos(P.a), math.sin(P.a); K = CFG["keys"]; fw, st = k[K["maju"]] - k[K["mundur"]], k[K["kanan"]] - k[K["kiri"]]
    vx, vy = dx * fw - dy * st, dy * fw + dx * st; n = math.hypot(vx, vy)
    if n:
        run = bool(k[K["lari"]] or (K["lari"] == pg.K_LSHIFT and k[pg.K_RSHIFT])); P.run = run          # SHIFT = lari
        sp = (6.5 if run else 3.6) * (1 - .45 * P.scope) * dt / n; P.bob += dt * (14 if run else 9)
        P.step -= dt
        if P.step <= 0 and P.z <= 0: play("step", 14); P.step = .27 if run else .45
        if free(P.x + vx * sp, P.y, .28): P.x += vx * sp
        if free(P.x, P.y + vy * sp, .28): P.y += vy * sp
    else: P.run = False
    P.cd -= dt; P.flash -= dt; P.hurt = max(0, P.hurt - dt); P.kick = max(0, P.kick - dt * 160); P.inv -= dt; P.time += dt; P.swap = max(0.0, P.swap - dt)
    tgt = 1.0 if (pg.mouse.get_pressed()[2] and P.rl <= 0) else 0.0           # tahan klik kanan = scope
    P.scope += (tgt - P.scope) * min(1.0, dt * 14); P.scope = 0.0 if P.scope < .01 else 1.0 if P.scope > .99 else P.scope
    if k[K["lompat"]] and P.z <= 0: P.vz = 2.4; play("step", 6)       # SPACE = lompat
    if P.z > 0 or P.vz > 0:
        P.vz -= 9 * dt; P.z = max(0.0, P.z + P.vz * dt)
        if P.z == 0: P.vz = 0.0; play("step", 8)
    P.msg = (P.msg[0], P.msg[1] - dt)
    if P.rl > 0:
        P.rl -= dt
        if P.rl <= 0: w = P.weap[P.cur]; w["mags"] -= 1; w["ammo"] = w["mag"]
    w = P.weap[P.cur]
    if (pg.mouse.get_pressed()[0] if w["auto"] else click_ev) and P.cd <= 0 and P.rl <= 0 and P.swap <= 0:
        if w["ammo"] > 0:
            w["ammo"] -= 1; P.cd = w["delay"]; P.flash = .07; P.kick = 28 if w["pel"] == 1 else 60; play(w["snd"])
            for _ in range(w["pel"]): shoot_ray(P.a + random.gauss(0, w["spr"] * (1 - .7 * P.scope)), w["dmg"])
            for e in enemies:                                    # suara tembakan memancing musuh
                if e.hp > 0 and math.hypot(e.x - P.x, e.y - P.y) < 10: e.awake = True
        else: P.cd = .3; play("empty"); start_reload()
    P.dtimer = getattr(P, "dtimer", 0) - dt
    if P.dtimer <= 0: DIST = bfs((int(P.x), int(P.y))); P.dtimer = .4
    for e in enemies: e.update(dt)
    for p in projs[:]:
        p[0] += p[2] * dt; p[1] += p[3] * dt
        if MAP[int(p[1]), int(p[0])]: projs.remove(p)
        elif math.hypot(p[0] - P.x, p[1] - P.y) < .45 and P.z < .12: hurt(p[4]); projs.remove(p)
    for it in items[:]:
        if math.hypot(it[0] - P.x, it[1] - P.y) < .7:
            if it[2] == "health" and P.hp < 100: P.hp = min(100, P.hp + 30); m = "+30 HEALTH"
            elif it[2] == "armor" and P.armor < 100: P.armor = min(100, P.armor + 30); m = "+30 ARMOR"
            elif it[2] == "ammo":
                for q in P.weap: q["mags"] = min(9, q["mags"] + 1)
                m = "+1 MAGAZINE (SEMUA SENJATA)"
            else: continue
            items.remove(it); play("pickup"); P.msg = (m, 2)
    for c in cps:
        if not c[2] and math.hypot(c[0] - P.x, c[1] - P.y) < .9:
            c[2] = True; P.hp = min(100, P.hp + 20); save_cp(c[0], c[1]); play("pickup"); P.msg = ("CHECKPOINT TERSIMPAN  (+20 HEALTH)", 2.5)
    boss = next((e for e in enemies if e.k == "boss"), None)
    if boss and boss.hp <= 0: P.state = "ending"                  # boss tumbang = game tamat
    elif not boss and not any(e.hp > 0 for e in enemies): P.state = "clear"
    if boss and boss.hp > 0 and not P.wave and boss.hp < boss.maxhp * .5:      # fase 2: pasukan bantuan
        P.wave = True; P.msg = ("PASUKAN BANTUAN DATANG!", 3)
        spots = [(x + .5, y + .5) for y in range(9, 31) for x in range(26, 37) if MAP[y, x] == 0]; random.shuffle(spots)
        for x, y in spots[:DIFF["guards"] // 2 + 2]:
            e = Enemy(random.choice(("penjahat", "agen", "agen")), x, y); e.awake = True; enemies.append(e)

# ================= RENDER =================
CAMX = 2 * np.arange(W) / W - 1
ROWD = .5 * H / (np.arange(H // 2) + .5)
gy, gx = np.mgrid[0:H, 0:W]
VIG = np.clip(1.15 - .55 * (((gx - W / 2) / (W / 2)) ** 2 + ((gy - H / 2) / (H / 2)) ** 2), .3, 1).T[..., None].astype(np.float32)
GRADE = np.array([1.08, .94, .9], np.float32)

def draw_sprite(frame, zb, x, y, tex, scale=1.0, low=1.0, glow=False, hit=False):
    rx, ry = x - P.x, y - P.y; inv = 1 / (P.plx * P.dy - P.dx * P.ply)
    ty = inv * (-P.ply * rx + P.plx * ry)
    if ty < .2 or ty > 22: return
    sx = int(W / 2 * (1 + inv * (P.dy * rx - P.dx * ry) / ty)); size = int(H / ty * P.zk); sw = int(size * scale)
    if sw < 2: return
    cy = H // 2 + int(size * ((1 - scale) / 2 * low + P.z)); x0, y0 = sx - sw // 2, cy - sw // 2
    c0, c1, r0, r1 = max(x0, 0), min(x0 + sw, W), max(y0, 0), min(y0 + sw, H)
    if c0 >= c1 or r0 >= r1: return
    cols, rows = np.arange(c0, c1), np.arange(r0, r1)
    u, v = ((cols - x0) * 64 // sw).clip(0, 63), ((rows - y0) * 64 // sw).clip(0, 63)
    px = tex[v[None, :], u[:, None]]
    m = (px[..., 3] > 128) & (zb[cols] > ty)[:, None]
    b = 1.0 if glow else max(.12, min(1, 1.25 - ty / 13)) * LIGHT
    rgb = px[..., :3] * .4 + 150 if hit else px[..., :3]
    frame[c0:c1, r0:r1][m] = (rgb * b)[m]

def render():
    P.dx, P.dy = math.cos(P.a), math.sin(P.a); fov = .66 + (P.weap[P.cur]["zoom"] - .66) * P.scope; zk = P.zk = .66 / fov; P.plx, P.ply = -P.dy * fov, P.dx * fov
    rdx, rdy = P.dx + P.plx * CAMX, P.dy + P.ply * CAMX
    eh = 1 + 2 * P.z; fr, cr = ROWD * eh / zk, ROWD * (2 - eh) / zk          # tinggi mata naik saat lompat
    fx, fy = P.x + fr[None, :] * rdx[:, None], P.y + fr[None, :] * rdy[:, None]
    cx_, cy_ = (P.x + cr[None, :] * rdx[:, None]) * 64, (P.y + cr[None, :] * rdy[:, None]) * 64
    tx, ty = (fx * 64).astype(int) & 63, (fy * 64).astype(int) & 63
    fb = (np.clip(1.15 - fr / 11, .05, 1) * LIGHT)[None, :, None]; cb = (np.clip(1.15 - cr / 11, .05, 1) * LIGHT)[None, :, None]
    frame = np.empty((W, H, 3), np.float32)
    frame[:, H // 2:] = FLOOR[ty, tx] * fb; frame[:, :H // 2] = (CEIL[cy_.astype(int) & 63, cx_.astype(int) & 63] * cb)[:, ::-1]
    # --- DDA untuk semua kolom sekaligus ---
    mx, my = np.full(W, int(P.x)), np.full(W, int(P.y))
    ddx, ddy = np.abs(1 / np.where(rdx == 0, 1e-9, rdx)), np.abs(1 / np.where(rdy == 0, 1e-9, rdy))
    stx, sty = np.where(rdx < 0, -1, 1), np.where(rdy < 0, -1, 1)
    sdx = np.where(rdx < 0, (P.x - mx) * ddx, (mx + 1 - P.x) * ddx)
    sdy = np.where(rdy < 0, (P.y - my) * ddy, (my + 1 - P.y) * ddy)
    hit, side = np.zeros(W, bool), np.zeros(W, int)
    for _ in range(48):
        act = ~hit; xs = (sdx < sdy) & act; ys_ = ~(sdx < sdy) & act
        sdx = sdx + np.where(xs, ddx, 0); mx = mx + np.where(xs, stx, 0)
        sdy = sdy + np.where(ys_, ddy, 0); my = my + np.where(ys_, sty, 0)
        side = np.where(act, np.where(xs, 0, 1), side); hit = hit | (MAP[my, mx] > 0)
        if hit.all(): break
    perp = np.where(side == 0, sdx - ddx, sdy - ddy).clip(.05)
    wx = np.where(side == 0, P.y + perp * rdy, P.x + perp * rdx); wx -= np.floor(wx)
    texx = (wx * 64).astype(int).clip(0, 63); lineh = H / perp * zk; top = H / 2 - lineh * (.5 - P.z)
    texy = np.floor((np.arange(H)[None, :] - top[:, None]) * 64 / lineh[:, None]).astype(int)
    inw = (texy >= 0) & (texy < 64)
    wall = WALLS[(MAP[my, mx] - 1)[:, None], texy.clip(0, 63), texx[:, None]]
    wall *= (np.clip(1.25 - perp / 13, .06, 1) * np.where(side == 1, .72, 1) * LIGHT)[:, None, None]
    frame[inw] = wall[inw]
    # --- sprite (musuh, bola api, item) ---
    sp = [(e.x, e.y, TEX[e.k] if e.hp > 0 else TEX["dead_" + e.k], 1.3 if e.k == "boss" else 1.0, 1.0, False, e.flash > 0) for e in enemies]
    sp += [(p[0], p[1], TEX["fire"], .12, .5, True, False) for p in projs]
    sp += [(i[0], i[1], TEX[i[2]], .38, 1.0, False, False) for i in items]
    sp += [(c[0], c[1], TEX["cp1" if c[2] else "cp0"], .55, 1.0, True, False) for c in cps]
    sp.sort(key=lambda o: -((o[0] - P.x) ** 2 + (o[1] - P.y) ** 2))
    for o in sp: draw_sprite(frame, perp, *o)
    # --- efek: cahaya moncong, darah, vignette, grain ---
    if P.flash > 0: frame *= (1 + P.flash * 8, 1 + P.flash * 6, 1 + P.flash * 2)
    frame *= GRADE * VIG; frame += (np.random.random((W, H, 1)) - .5) * 9
    if P.hurt > 0: frame[..., 0] += P.hurt * 220; frame[..., 1:] *= 1 - P.hurt
    pg.surfarray.blit_array(canvas, np.clip(frame, 0, 255).astype(np.uint8))
    screen.blit(pg.transform.scale(canvas, (W * SC, H * SC)), (0, 0))

SKIN, SLV, MET, DRK, WOOD = (212, 160, 126), (22, 22, 27), (62, 62, 70), (34, 34, 40), (118, 72, 40)
GUNS = {   # (jarak dasar, panjang ujung laras, [kotak: x0, x1, y0, y1, z0, z1, warna])  z = ke depan, y = ke bawah
    "PISTOL": (.85, .86, [(-.03, .03, -.045, .015, 0, .78, MET), (-.015, .015, -.03, -.005, .78, .86, DRK), (-.028, .028, .015, .045, 0, .5, DRK),
                          (-.027, .027, .045, .17, 0, .17, DRK), (-.045, .045, .05, .19, -.04, .2, SKIN), (-.04, .05, .1, .4, -.7, 0, SLV)]),
    "ASSAULT RIFLE": (1.0, 1.75, [(-.012, .012, -.03, -.005, .9, 1.75, DRK), (-.03, .03, -.04, .03, .5, 1.0, MET), (-.034, .034, -.05, .035, 0, .55, MET),
                                  (-.018, .018, .035, .15, .25, .4, DRK), (-.022, .022, .035, .13, 0, .1, DRK), (-.025, .025, -.04, .045, -.5, 0, WOOD),
                                  (-.01, .01, -.058, -.05, .2, .7, MET), (-.02, .02, -.105, -.058, .15, .75, DRK), (-.027, .027, -.112, -.05, .62, .76, DRK),
                                  (-.04, .04, .04, .14, -.06, .1, SKIN), (-.045, .03, .03, .1, .55, .8, SKIN),
                                  (-.04, .05, .08, .4, -.7, -.05, SLV), (-.095, -.04, .05, .4, -.3, .55, SLV)]),
    "SHOTGUN": (1.0, 1.4, [(-.014, .014, -.035, -.005, .3, 1.35, MET), (-.014, .014, -.003, .02, .3, 1.15, DRK), (-.032, .032, -.005, .045, .55, .9, WOOD),
                           (-.034, .034, -.05, .04, -.15, .3, MET), (-.028, .028, -.025, .08, -.65, -.15, WOOD),
                           (-.04, .04, .03, .12, -.12, .05, SKIN), (-.05, .03, .03, .1, .55, .85, SKIN),
                           (-.04, .05, .08, .4, -.8, -.1, SLV), (-.095, -.04, .05, .4, -.3, .55, SLV)])}

def gun_box(ox, oy, zb, b, f=640):            # gambar 1 balok dengan proyeksi perspektif (sisi atas, samping, belakang)
    x0, x1, y0, y1, z0, z1, col = b; cx, cy = screen.get_width() // 2, screen.get_height() // 2
    pr = lambda x, y, z: (cx + (ox + x) / max(z, .12) * f, cy + (oy + y) / max(z, .12) * f)
    za, zz = zb + z0, zb + z1; mx, my = ox + (x0 + x1) / 2, oy + (y0 + y1) / 2
    xs, yt = (x0 if mx > 0 else x1), (y0 if my > 0 else y1)
    sh = lambda k: tuple(min(255, int(c * k)) for c in col)
    for pts, k in (([pr(xs, y0, za), pr(xs, y1, za), pr(xs, y1, zz), pr(xs, y0, zz)], .8),
                   ([pr(x0, yt, za), pr(x1, yt, za), pr(x1, yt, zz), pr(x0, yt, zz)], 1.3),
                   ([pr(x0, y0, za), pr(x1, y0, za), pr(x1, y1, za), pr(x0, y1, za)], .62)):
        D.polygon(screen, sh(k), pts); D.polygon(screen, sh(.35), pts, 1)

def draw_weapon(t):
    w = P.weap[P.cur]; nm = w["name"]
    if nm == "ASSAULT RIFLE" and P.scope > .5: return        # melihat lewat scope
    zb, tip, boxes = GUNS[nm]; sc = 0.0 if nm == "ASSAULT RIFLE" else P.scope
    low = math.sin(math.pi * (1 - P.rl / w["rl"])) * .45 if P.rl > 0 else 0.0
    ox = (.25 + math.sin(P.bob) * .012) * (1 - .93 * sc)
    oy = .21 + abs(math.cos(P.bob)) * .01 + low + P.z * .7 - .1 * sc + P.swap / .25 * .5 - P.kick * .0015
    zb -= P.kick * .004
    for b in sorted(boxes, key=lambda q: -q[4]): gun_box(ox, oy, zb, b)
    if P.flash > 0:                                          # kilatan moncong di ujung laras
        cx, cy = screen.get_width() // 2, screen.get_height() // 2; z = zb + tip; r = 640 / z * .12
        fx, fy = cx + ox / z * 640, cy + (oy - .02) / z * 640
        D.polygon(screen, (255, 200, 80), [(fx + math.cos(i * math.pi / 6) * r * (1.9 if i % 2 == 0 else .7), fy + math.sin(i * math.pi / 6) * r * (1.9 if i % 2 == 0 else .7)) for i in range(12)])
        D.circle(screen, (255, 245, 200), (int(fx), int(fy)), int(r * .7))

def txt(s, pos, f=font, col=(235, 225, 205)):
    screen.blit(f.render(s, True, (0, 0, 0)), (pos[0] + 2, pos[1] + 2)); screen.blit(f.render(s, True, col), pos)
def bar(x, y, w, h, frac, col, label):
    D.rect(screen, (14, 8, 8), (x - 2, y - 2, w + 4, h + 4)); D.rect(screen, col, (x, y, int(w * max(0, min(1, frac))), h))
    D.rect(screen, (130, 115, 105), (x - 2, y - 2, w + 4, h + 4), 1); txt(label, (x + 6, y + 1), small)

def make_scope():                              # lensa scope: layar gelap dengan lingkaran bening di tengah
    sw, sh = screen.get_size(); m = pg.Surface((sw, sh), pg.SRCALPHA); m.fill((0, 0, 0, 255)); R = int(sh * .43)
    for i in range(10): D.circle(m, (0, 0, 0, 230 - i * 25), (sw // 2, sh // 2), R + 27 - i * 3)
    D.circle(m, (0, 0, 0, 0), (sw // 2, sh // 2), R - 3); return m
SCOPE = make_scope()

def draw_scope():
    if P.scope <= 0: return
    sw, sh = screen.get_size(); cx, cy = sw // 2, sh // 2; R = int(sh * .43); nm = P.weap[P.cur]["name"]
    if nm == "ASSAULT RIFLE":                                  # scope rifle: lensa + reticle
        SCOPE.set_alpha(int(255 * P.scope)); screen.blit(SCOPE, (0, 0)); k = (12, 12, 14)
        D.line(screen, k, (cx - R, cy), (cx + R, cy), 1); D.line(screen, k, (cx, cy - R), (cx, cy + R), 1)
        for a, b in ((cx - R + 4, cx - 50), (cx + 50, cx + R - 4)): D.line(screen, k, (a, cy), (b, cy), 4)
        for a, b in ((cy - R + 4, cy - 50), (cy + 50, cy + R - 4)): D.line(screen, k, (cx, a), (cx, b), 4)
        for d in (80, 140, 200):
            for p in ((cx - d, cy), (cx + d, cy), (cx, cy - d), (cx, cy + d)): D.circle(screen, k, p, 3)
        D.circle(screen, (230, 40, 40), (cx, cy), 3); txt(f"x{P.zk:.1f}", (cx + int(R * .62), cy + int(R * .66)), small, (220, 220, 200))
    elif nm == "PISTOL": D.circle(screen, (255, 50, 50), (cx, cy), 4); D.circle(screen, (255, 120, 120), (cx, cy), 9, 1)   # red dot
    else: D.circle(screen, (235, 235, 235), (cx, cy), 22, 2); D.line(screen, (235, 235, 235), (cx - 30, cy), (cx - 22, cy), 2); D.line(screen, (235, 235, 235), (cx + 22, cy), (cx + 30, cy), 2)   # iron sight

def gun_icon(x, y, kind, on):                 # ikon senjata (tampak samping) untuk HUD
    m, g, wd = ((205, 205, 215), (120, 120, 130), (170, 108, 60)) if on else ((112, 112, 122), (70, 70, 78), (96, 64, 40))
    if kind == 0:                             # 1 = pistol
        x += 8; D.rect(screen, m, (x + 14, y + 7, 34, 8)); D.rect(screen, g, (x + 44, y + 9, 6, 4))
        D.polygon(screen, g, [(x + 17, y + 15), (x + 29, y + 15), (x + 26, y + 29), (x + 15, y + 29)])
        D.line(screen, m, (x + 30, y + 16), (x + 38, y + 16), 2); D.line(screen, m, (x + 38, y + 16), (x + 36, y + 22), 2)
    elif kind == 1:                           # 2 = rifle
        D.polygon(screen, wd, [(x, y + 10), (x + 14, y + 9), (x + 14, y + 18), (x + 5, y + 22)])
        D.rect(screen, m, (x + 14, y + 8, 34, 8)); D.rect(screen, g, (x + 48, y + 10, 16, 3)); D.rect(screen, g, (x + 28, y + 4, 10, 4))
        D.polygon(screen, g, [(x + 26, y + 16), (x + 33, y + 16), (x + 35, y + 28), (x + 28, y + 28)]); D.rect(screen, g, (x + 18, y + 16, 5, 9))
    else:                                     # 3 = shotgun
        D.rect(screen, m, (x + 24, y + 8, 40, 4)); D.rect(screen, g, (x + 24, y + 12, 34, 3)); D.rect(screen, wd, (x + 34, y + 11, 14, 6))
        D.rect(screen, g, (x + 16, y + 8, 10, 9)); D.polygon(screen, wd, [(x, y + 11), (x + 16, y + 9), (x + 16, y + 17), (x + 3, y + 25)])

def draw_slots(sh):                           # slot senjata 1 / 2 / 3 dengan gambar + sisa peluru
    for i, w in enumerate(P.weap):
        x0, y0, on = 258 + i * 78, sh - 72, i == P.cur
        D.rect(screen, (70, 28, 24) if on else (28, 20, 20), (x0, y0, 74, 46)); D.rect(screen, (225, 180, 80) if on else (95, 80, 70), (x0, y0, 74, 46), 2)
        gun_icon(x0 + 5, y0 + 8, i, on)
        txt(str(i + 1), (x0 + 6, y0 + 3), small, (255, 220, 120) if on else (150, 135, 120))
        a = str(w["ammo"]); txt(a, (x0 + 68 - small.size(a)[0], y0 + 29), small, (255, 90, 80) if w["ammo"] == 0 else (235, 225, 205) if on else (150, 135, 120))
    txt(P.weap[P.cur]["name"], (258, sh - 22), small, (240, 220, 170))

def draw_face(x, y, t):                       # wajah agen di HUD, berubah sesuai kondisi
    skin = (222, 172, 136); ko = P.state in ("dead", "over"); ouch = P.hurt > 0
    D.rect(screen, (24, 18, 18), (x, y, 64, 72)); D.rect(screen, (150, 130, 105), (x, y, 64, 72), 2)
    D.polygon(screen, (16, 16, 20), [(x + 2, y + 70), (x + 8, y + 54), (x + 56, y + 54), (x + 62, y + 70)])
    D.polygon(screen, (235, 235, 235), [(x + 26, y + 54), (x + 38, y + 54), (x + 32, y + 66)])
    D.line(screen, (170, 25, 30), (x + 32, y + 57), (x + 32, y + 70), 3)
    D.rect(screen, skin, (x + 26, y + 46, 12, 10)); D.ellipse(screen, skin, (x + 16, y + 8, 32, 42))
    D.ellipse(screen, (28, 22, 18), (x + 15, y + 5, 34, 15))
    if ko:
        for ex in (x + 22, x + 36):
            D.line(screen, (30, 20, 20), (ex, y + 22), (ex + 7, y + 29), 2); D.line(screen, (30, 20, 20), (ex + 7, y + 22), (ex, y + 29), 2)
    else:
        for ex in (x + 18, x + 34): D.rect(screen, (8, 8, 10), (ex, y + 23, 12, 8))
        D.line(screen, (8, 8, 10), (x + 30, y + 25), (x + 34, y + 25), 2)
    if P.hp < 66: D.ellipse(screen, (150, 95, 125), (x + 36, y + 33, 9, 6))
    if P.hp < 35:
        D.line(screen, (170, 15, 15), (x + 25, y + 10), (x + 28, y + 30), 2); D.line(screen, (170, 15, 15), (x + 28, y + 36), (x + 30, y + 46), 2)
    my = y + 40
    if ko or ouch or P.hp < 25: D.ellipse(screen, (80, 20, 20), (x + 26, my - 3, 12, 9))
    elif P.state in ("clear", "ending"): D.arc(screen, (120, 40, 40), (x + 24, my - 6, 16, 10), math.pi, 2 * math.pi, 2)
    else: D.line(screen, (120, 60, 50), (x + 26, my), (x + 38, my), 2)
    if ouch: D.rect(screen, (255, 0, 0), (x, y, 64, 72), 3)

def draw_hud(t):
    sw, sh = screen.get_size(); w = P.weap[P.cur]
    s = pg.Surface((sw, 78), pg.SRCALPHA); s.fill((18, 6, 6, 190)); screen.blit(s, (0, sh - 78))
    bar(16, sh - 66, 230, 26, P.hp / 100, (185, 28, 28), f"HEALTH  {int(P.hp)}")
    bar(16, sh - 32, 230, 20, P.armor / 100, (50, 110, 215), f"ARMOR  {int(P.armor)}")
    draw_slots(sh)
    draw_face(sw // 2 + 18, sh - 76, t)
    txt(f"{w['ammo']:02d}", (580, sh - 68), mid, (255, 200, 90) if w["ammo"] > 0 else (255, 60, 60))
    txt(f"/ {w['mag']}", (652, sh - 52)); txt(f"MAGAZINE x{w['mags']}", (652, sh - 28), small)
    alive = sum(e.hp > 0 for e in enemies); txt(f"KILLS {P.kills}   SISA {alive}", (800, sh - 46), small)
    txt((("RUANG BOS" if P.floor == DIFF["floors"] else f"LANTAI {P.floor + 1}/{DIFF['floors']}") + f"  {P.diff}"), (800, sh - 70), small); txt(f"CP {sum(c[2] for c in cps)}/{len(cps)}   CONT {P.conts if P.conts < 50 else 'INF'}", (800, sh - 24), small)
    bs = next((e for e in enemies if e.k == "boss" and e.hp > 0 and e.awake), None)
    if bs:
        bx = sw // 2 - 220; bar(bx, 74, 440, 22, bs.hp / bs.maxhp, (200, 40, 40), f"DON VARGO  [{bs.wp.upper()}]    {int(bs.hp)} / {int(bs.maxhp)}")
        for q in (1, 2, 3): D.line(screen, (20, 8, 8), (bx + 110 * q, 72), (bx + 110 * q, 98), 2)      # penanda 25 / 50 / 75 persen
        txt(f"{int(bs.hp / bs.maxhp * 100)}%", (bx + 450, 76), small)
    if P.scope < .3: D.line(screen, (230, 230, 230), (sw // 2 - 8, sh // 2), (sw // 2 + 8, sh // 2)); D.line(screen, (230, 230, 230), (sw // 2, sh // 2 - 8), (sw // 2, sh // 2 + 8))
    if P.rl > 0 and int(t * 6) % 2: txt("RELOADING...", (sw // 2 - 70, sh // 2 + 40))
    if P.run: txt("RUN", (16, sh - 96), small, (255, 200, 90))
    if P.msg[1] > 0: txt(P.msg[0], (sw // 2 - 110, sh // 2 + 80), font, (255, 220, 120))
    if t < 6:
        txt("AGENT DUTY", (sw // 2 - big.size("AGENT DUTY")[0] // 2, 40), big, (240, 200, 90))
        txt("Bersihkan mansion dari komplotan penjahat", (sw // 2 - 190, 112))
        center("WASD jalan | SHIFT lari | SPACE lompat | Klik kiri tembak | Klik kanan scope | R reload | 1/2/3 atau roll mouse = senjata", 150, small)
    screen.blit(MM, (sw - 128, 8))
    for e in enemies:
        if e.hp > 0: D.rect(screen, (230, 40, 40), (sw - 128 + e.x * 3 - 1, 8 + e.y * 3 - 1, 3, 3))
    for c in cps: D.rect(screen, (90, 255, 140) if c[2] else (255, 170, 50), (sw - 128 + c[0] * 3 - 2, 8 + c[1] * 3 - 2, 4, 4))
    D.circle(screen, (70, 255, 90), (int(sw - 128 + P.x * 3), int(8 + P.y * 3)), 3)
    if P.state != "play": draw_state()

# ================= LOOP UTAMA =================
def center(s, y, f=font, col=(235, 225, 205)): txt(s, (screen.get_width() // 2 - f.size(s)[0] // 2, y), f, col)

def draw_ending():
    sw, sh = screen.get_size(); mm, ss = divmod(int(P.time), 60)
    pts = 100 - P.used * 12 - max(0, P.time / 60 - (DIFF["floors"] + 1) * 5) * 3 + {"EASY": 0, "MEDIUM": 5, "HARD": 12}[P.diff]
    rank = "S" if pts >= 90 else "A" if pts >= 75 else "B" if pts >= 55 else "C"
    center("TAMAT", 36, big, (240, 200, 90)); center("MISSION COMPLETE", 112, font, (170, 230, 180))
    for i, l in enumerate(("Don Vargo, pemimpin komplotan, akhirnya tumbang.", "Seluruh mansion kini aman dan bukti kejahatannya ada di tanganmu.",
                           "Markas pusat memanggil: tugas selesai, Agen.", "Sampai jumpa di misi berikutnya.")): center(l, 165 + i * 30, font)
    for i, l in enumerate((f"Tingkat kesulitan : {P.diff}", f"Waktu            : {mm:02d}:{ss:02d}", f"Musuh dikalahkan : {P.kills}", f"Continue dipakai : {P.used}")):
        txt(l, (sw // 2 - 150, 310 + i * 28))
    center("RANK  " + rank, 440, big, (255, 210, 90)); center("ENTER = menu utama", sh - 50)

def draw_state():
    sw, sh = screen.get_size(); st = P.state; my = sh // 2
    o = pg.Surface((sw, sh), pg.SRCALPHA)
    o.fill((110, 0, 0, 150) if st in ("dead", "over") else (0, 0, 0, 185) if st in ("pause", "ending") else (0, 50, 25, 150)); screen.blit(o, (0, 0))
    if st == "dead":
        center("MISSION FAILED", my - 80, big, (235, 70, 60)); center(f"ENTER = lanjut dari checkpoint terakhir  (sisa continue: {P.conts})", my + 20); center("ESC = menu utama", my + 56, small)
    elif st == "over": center("GAME OVER", my - 80, big, (235, 70, 60)); center("Continue habis.  ENTER = menu utama", my + 20)
    elif st == "clear":
        center("LANTAI BERSIH", my - 80, big, (120, 235, 150)); center(f"Lantai {P.floor + 1} dari {DIFF['floors']} selesai.  ENTER = " + ("masuk ke RUANG BOS" if P.floor + 1 == DIFF["floors"] else "naik ke lantai berikutnya"), my + 20)
        center("Bonus: +30 health, +25 armor, +1 magazine", my + 56, small)
    elif st == "pause": center("PAUSE", my - 80, big); center("ESC = lanjut   |   M = menu utama", my + 20)
    else: draw_ending()

def make_bg():
    sw, sh = screen.get_size(); b = pg.Surface((sw, sh))
    for y in range(0, sh, 4): c = int(10 + 30 * y / sh); D.rect(b, (c + 8, c // 2 + 4, c // 2 + 6), (0, y, sw, 4))
    D.polygon(b, (14, 10, 12), [(180, 520), (180, 330), (330, 330), (480, 250), (630, 330), (780, 330), (780, 520)])
    D.polygon(b, (10, 7, 9), [(300, 330), (480, 200), (660, 330)])
    for wx in range(210, 760, 70):
        for wy in (370, 440): D.rect(b, (230, 170, 70) if random.random() < .45 else (30, 22, 20), (wx, wy, 26, 40))
    D.rect(b, (8, 6, 8), (0, 520, sw, sh - 520)); return b
BG = make_bg()
KEYNAMES = [("Maju", "maju"), ("Mundur", "mundur"), ("Kiri (geser)", "kiri"), ("Kanan (geser)", "kanan"), ("Lari", "lari"), ("Reload", "reload"), ("Lompat", "lompat")]

def menu_rows(S):
    if S["mode"] == "main": return [("START GAME", ""), ("SETTINGS", ""), ("QUIT", "")]
    if S["mode"] == "diff": return [(k, f"{v['floors']} lantai + bos") for k, v in DIFFS.items()] + [("BACK", "")]
    bar_ = lambda v: "<  " + "|" * v + "." * (10 - v) + "  >"
    rows = [(n, pg.key.name(CFG["keys"][k]).upper()) for n, k in KEYNAMES]
    rows += [("Sensitivitas mouse", bar_(CFG["sens"])), ("Volume", bar_(CFG["vol"])), ("KEMBALI", "")]
    if S["wait"] is not None: rows[S["wait"]] = (rows[S["wait"]][0], "tekan tombol...")
    return rows

def draw_menu(S):
    sw, sh = screen.get_size(); screen.blit(BG, (0, 0)); st = S["mode"] == "settings"
    center("AGENT DUTY", 30, big, (240, 200, 90))
    y0, sp = (140, 35) if st else (210, 46); rows = menu_rows(S); rects = []
    center({"main": "Bersihkan mansion. Hentikan komplotannya.", "diff": "PILIH TINGKAT KESULITAN", "settings": "SETTINGS & KONTROL"}[S["mode"]], y0 - 40, font, (200, 180, 150))
    for i, (a, b) in enumerate(rows):
        r = pg.Rect(sw // 2 - 290, y0 + i * sp, 580, sp - 4); rects.append(r); on = i == S["sel"]
        if on: D.rect(screen, (95, 30, 30), r); D.rect(screen, (200, 150, 70), r, 2)
        txt(a, (r.x + 14, r.y + 6), font, (255, 235, 180) if on else (190, 175, 150)); txt(b, (r.right - 14 - font.size(b)[0], r.y + 6), font, (230, 200, 120))
    if S["mode"] == "diff" and S["sel"] < 3: center(DIFFS[list(DIFFS)[S["sel"]]]["desc"], y0 + 4 * sp + 16, small, (210, 190, 160))
    if st:
        for i, l in enumerate(("Tembak: klik kiri  |  Scope: tahan klik kanan  |  Ganti senjata: 1/2/3 atau roll mouse  |  Pause: ESC", "Menoleh: Mouse, Q / E, atau panah kiri-kanan   |   Checkpoint: dekati lampu",
                               "Ubah tombol: pilih baris lalu ENTER, kemudian tekan tombol baru   |   Slider: panah kiri-kanan")):
            center(l, y0 + len(rows) * sp + 10 + i * 22, small, (200, 185, 160))
    return rects

WHEEL = hasattr(pg, "MOUSEWHEEL")
def switch_weapon(i):                         # dipakai tombol 1/2/3 dan roll mouse
    if i != P.cur: P.cur = i; P.rl = 0; P.swap = .25; SND["rmag"].stop(); SND["rsg"].stop(); play("step", 5)

def set_mouse(on): pg.event.set_grab(on); pg.mouse.set_visible(not on); pg.mouse.get_rel()

def main():
    global LIGHT, FLICK
    S = dict(mode="main", sel=0, wait=None); rects = []
    set_mouse(False); ambient.set_volume(CFG["vol"] / 10); ambient.play(-1)
    t, run, frames = 0.0, True, 0; limit = int(os.environ.get("HG_FRAMES", 0))
    def to_menu(): S.update(mode="main", sel=0, wait=None); set_mouse(False)
    while run:
        dt = min(clock.tick(45) / 1000, .05); t += dt; click_ev, act, adj = False, None, 0
        for e in pg.event.get():
            if e.type == pg.QUIT: run = False
            elif S["mode"] == "play":
                if e.type == pg.MOUSEBUTTONDOWN and e.button == 1: click_ev = True
                elif WHEEL and e.type == pg.MOUSEWHEEL and P.state == "play": switch_weapon((P.cur - (1 if e.y > 0 else -1 if e.y < 0 else 0)) % 3)
                elif not WHEEL and e.type == pg.MOUSEBUTTONDOWN and e.button in (4, 5) and P.state == "play": switch_weapon((P.cur + (-1 if e.button == 4 else 1)) % 3)
                elif e.type == pg.KEYDOWN:
                    if e.key == pg.K_ESCAPE:
                        if P.state == "play": P.state = "pause"; set_mouse(False)
                        elif P.state == "pause": P.state = "play"; set_mouse(True)
                        else: to_menu()
                    elif e.key == pg.K_RETURN:
                        if P.state == "dead": respawn()
                        elif P.state in ("over", "ending"): to_menu()
                        elif P.state == "clear": next_floor()
                    elif e.key == pg.K_m and P.state == "pause": to_menu()
                    elif P.state == "play" and e.key == CFG["keys"]["reload"]: start_reload()
                    elif P.state == "play" and e.key in (pg.K_1, pg.K_2, pg.K_3): switch_weapon(e.key - pg.K_1)
            elif e.type == pg.KEYDOWN and S["wait"] is not None:      # menunggu tombol baru
                if e.key != pg.K_ESCAPE: CFG["keys"][KEYNAMES[S["wait"]][1]] = e.key; save_cfg()
                S["wait"] = None
            elif e.type == pg.KEYDOWN:
                n = len(menu_rows(S))
                if e.key == pg.K_DOWN: S["sel"] = (S["sel"] + 1) % n
                elif e.key == pg.K_UP: S["sel"] = (S["sel"] - 1) % n
                elif e.key == pg.K_LEFT: adj = -1
                elif e.key == pg.K_RIGHT: adj = 1
                elif e.key in (pg.K_RETURN, pg.K_SPACE): act = S["sel"]
                elif e.key == pg.K_ESCAPE:
                    if S["mode"] == "main": run = False
                    else: S.update(mode="main", sel=0); save_cfg()
            elif e.type == pg.MOUSEMOTION:
                for i, r in enumerate(rects):
                    if r.collidepoint(e.pos): S["sel"] = i
            elif e.type == pg.MOUSEBUTTONDOWN and e.button == 1:
                for i, r in enumerate(rects):
                    if r.collidepoint(e.pos): S["sel"] = i; act = i; adj = 1 if e.pos[0] > r.centerx else -1
        if S["mode"] != "play":
            m = S["mode"]
            if m == "settings" and adj and S["sel"] in (len(KEYNAMES), len(KEYNAMES) + 1):
                k = "sens" if S["sel"] == len(KEYNAMES) else "vol"; CFG[k] = max(1 if k == "sens" else 0, min(10, CFG[k] + adj))
                ambient.set_volume(CFG["vol"] / 10); save_cfg()
            if act is not None:
                if m == "main":
                    if act == 0: S.update(mode="diff", sel=1)
                    elif act == 1: S.update(mode="settings", sel=0)
                    else: run = False
                elif m == "diff":
                    if act < 3: start_game(list(DIFFS)[act]); S["mode"] = "play"; set_mouse(True)
                    else: S.update(mode="main", sel=0)
                elif act < len(KEYNAMES): S["wait"] = act
                elif act == len(KEYNAMES) + 2: S.update(mode="main", sel=1); save_cfg()
        if S["mode"] == "play":
            mdx = pg.mouse.get_rel()[0]
            FLICK = .4 if random.random() < .012 else max(0, FLICK - dt * 3); LIGHT = .92 + .05 * math.sin(t * 11) - FLICK
            if P.state == "play": update(dt, mdx, click_ev)
            render(); draw_weapon(t); draw_scope(); draw_hud(P.time)
        else: rects = draw_menu(S)
        pg.display.flip(); frames += 1
        if limit and frames >= limit: break
    pg.quit()

if __name__ == "__main__":
    try:
        main()
    except Exception:
        import traceback; traceback.print_exc()
        input("\nTerjadi error di atas. Tekan ENTER untuk menutup...")