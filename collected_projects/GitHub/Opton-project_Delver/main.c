/* Delver: a small turn-based roguelike. One floor fits on the screen (20 x 14 tiles of 16 pixels).
 * Go down 8 floors, the last one is the dragon's. Arrows: move / attack / talk. OK: drink a potion. EXE: read a
 * scroll (shows the floor). Shift: wait. Back: pause (and save the run).
 * A red zone shows where the awake monsters can hit you next turn; a "z" is a sleeping monster, a "!" one that is
 * after you.
 *
 * Between runs the souls you earn (and the achievements you reach) buy permanent upgrades. They are saved like
 * Celeste's progress:
 * - delver.sav, one storage record;
 * - delver_saves.py, a Python script with three comment lines that explain it and one that holds a copy of
 *   the save in base64, which survives installing the app again from the NumWorks website.
 * A run in progress has its own record, delver.run: you can leave in the middle of a floor and come back. */
#include <eadk.h>
#include <stddef.h>
#include "../NumPlay/launcher/src/gfx.h"
#include "../NumPlay/games/common/np_text.h"
#include "../NumPlay/games/common/epsilon_app.h"
#include "../NumPlay/games/common/epsilon_files.h"
#define np_file_read ef_read
#define np_file_write ef_write
#ifndef HOST /* (a computer build has no app header) */
const char eadk_app_name[] __attribute__((section(".rodata.eadk_app_name"))) = "Delver";
const uint32_t eadk_api_level __attribute__((section(".rodata.eadk_api_level"))) = 0;
#endif
void np_push(int x, int y, int w, int h, const color_t *px) {
	eadk_display_push_rect((eadk_rect_t){(uint16_t)x, (uint16_t)y, (uint16_t)w, (uint16_t)h}, px);
}

#define KEY(k) (1ull << (k))
#define MW 20 /* the floor, in tiles */
#define MH 14
#define TS 16 /* a tile, in pixels */
#define TOP 16 /* the band on top */
#define MAXM 16 /* monsters on a floor */
#define MAXD 10 /* the last floor */
#define SIGHT2 40 /* how far you see, squared */
#define NT 10 /* kinds of monsters */
#define WHITE 0xFFFF

enum { T_WALL, T_FLOOR, T_STAIRS, T_ALTAR, T_ALTAR_USED, T_MERCHANT, T_SPIKE, T_SPIKE_SEEN, T_SPIKE_USED, T_FORGE, T_LIBRARY };
enum { I_NONE, I_COIN, I_POTION, I_SCROLL, I_SWORD, I_SHIELD, I_HEART };
enum { ST_TITLE, ST_SHOP, ST_ACH, ST_BEST, ST_CTRL, ST_QUIT, ST_FORGE, ST_LIBRARY, ST_PLAY, ST_PAUSE, ST_DEAD, ST_TRADE, ST_ALTAR };
enum { M_RAT, M_BAT, M_SLIME, M_SKEL, M_ORC, M_DEMON, M_ARCHER, M_THIEF, M_SHAMAN, M_DRAGON };
static bool solid(int t) { return t == T_WALL || t == T_ALTAR || t == T_ALTAR_USED || t == T_MERCHANT || t == T_SPIKE_USED || t == T_FORGE || t == T_LIBRARY; }

/* ------------------------------------------------------------------ pixel art: 8 x 8, drawn at twice the size */
enum { S_FLOOR, S_WALL, S_STAIRS, S_HERO, S_RAT, S_BAT, S_SLIME, S_SKEL, S_ORC, S_DEMON, S_ARCHER, S_THIEF, S_SHAMAN,
	S_DRAGON, S_POTION, S_SCROLL, S_SWORD, S_SHIELD, S_HEART, S_COIN, S_MERCHANT, S_ALTAR, S_ALTAR_USED, S_SPIKE, S_SPIKE_USED, S_FORGE, S_LIBRARY, S_COUNT };
static const char SPR[S_COUNT][8][9] = {
	[S_FLOOR] = {"FFFFFFFF", "FFFFFfFF", "FFFFFFFF", "FfFFFFFF", "FFFFFFFF", "FFFFFFFf", "FFFfFFFF", "FFFFFFFF"},
	[S_WALL] = {"WWWxWWWW", "WWWxWWWW", "xxxxxxxx", "WWWWWWxW", "WWWWWWxW", "xxxxxxxx", "WxWWWWWW", "WxWWWWWW"},
	[S_STAIRS] = {"gggggggg", "gddddddg", "gdkkkkdg", "gdkkkkdg", "gdkdkkdg", "gdkkkkdg", "gddddddg", "gggggggg"},
	[S_HERO] = {"..gggg..", ".gggggg.", ".ssksks.", ".ssssss.", "gbbbbbbg", ".bbbbbb.", ".bb..bb.", ".nn..nn."},
	[S_RAT] = {"........", "..d..d..", ".dddddd.", "ddrddrdd", "dddddddd", ".dddddd.", "n.d..d.n", "........"},
	[S_BAT] = {"........", "p......p", "pp.pp.pp", "pppppppp", "ppyppypp", ".pppppp.", "..p..p..", "........"},
	[S_SLIME] = {"........", "........", "..llll..", ".llllll.", ".lkllkl.", "llllllll", "leeeeeel", ".eeeeee."},
	[S_SKEL] = {"..wwww..", ".wwwwww.", ".wkwwkw.", ".wwwwww.", "..wwww..", ".wgwwgw.", "..w..w..", ".ww..ww."},
	[S_ORC] = {"..eeee..", ".eeeeee.", ".ereere.", ".eewwee.", "nnnnnnnn", "nnennenn", ".nn..nn.", ".kk..kk."},
	[S_DEMON] = {"r......r", "rr....rr", ".rrrrrr.", ".ryrryr.", ".rrrrrr.", ".rwrrwr.", "..rrrr..", ".rr..rr."},
	[S_ARCHER] = {"..eeee..", ".eeeeee.", ".essske.", "..ssss..", "n.eeee.n", "nreeeern", "n.e..e.n", "..nn.nn."},
	[S_THIEF] = {"..dddd..", ".dddddd.", ".dyddyd.", ".dddddd.", "..kkkk..", ".kkkkkky", ".k.kk.k.", ".kk..kk."},
	[S_SHAMAN] = {"..pppp.c", ".ppppppn", ".pyppypn", ".ppppppn", "pppppppn", "pppppppn", "..pppp.n", "..p..p.n"},
	[S_DRAGON] = {"e......e", "ee.ee.ee", ".eeeeee.", "eyeeeeye", "eeeeeeee", ".errrre.", "eeoooeee", ".ee..ee."},
	[S_POTION] = {"...nn...", "...gg...", "..gggg..", ".grrrrg.", ".grrrrg.", ".grrrrg.", "..gggg..", "........"},
	[S_SCROLL] = {"........", ".nwwwwn.", ".wwwwww.", ".wkkkkw.", ".wwwwww.", ".wkkkkw.", ".nwwwwn.", "........"},
	[S_SWORD] = {"......gw", ".....gww", "....gww.", "...gww..", "n.gww...", ".ngw....", ".nnw....", "nn.n...."},
	[S_SHIELD] = {"........", ".gggggg.", ".gbbbbg.", ".gbwwbg.", ".gbbbbg.", "..gbbg..", "...gg...", "........"},
	[S_HEART] = {"........", ".rr..rr.", "rrrrrrrr", "rwrrrrrr", "rrrrrrrr", ".rrrrrr.", "..rrrr..", "...rr..."},
	[S_COIN] = {"........", "..yyyy..", ".yyyyyy.", ".yyoyyy.", ".yyoyyy.", ".yyyyyy.", "..yyyy..", "........"},
	[S_MERCHANT] = {"..nnnn..", ".nnnnnn.", ".nskssn.", ".nssssn.", "nnyyyynn", "nnnnnnnn", ".nnnnnn.", ".nn..nn."},
	[S_ALTAR] = {"...rr...", "..roor..", "...rr...", "gggggggg", ".gggggg.", ".gddddg.", ".gddddg.", "gggggggg"},
	[S_ALTAR_USED] = {"........", "...dd...", "........", "gggggggg", ".gggggg.", ".gddddg.", ".gddddg.", "gggggggg"},
	[S_SPIKE] = {"........", ".w..w..w", ".w..w..w", "gg.gg.gg", "gg.gg.gg", "ggdggdgg", "dddddddd", "........"},
	[S_SPIKE_USED] = {"........", "........", "........", "gg.gg.gg", "gg.gg.gg", "ggdggdgg", "dddddddd", "........"},
	[S_FORGE] = {"........", ".oooooo.", ".oeeeeo.", ".oeeeeo.", ".oeeeeo.", ".oeeeeo.", ".oooooo.", "........"},
	[S_LIBRARY] = {"........", ".bbbbbb.", ".bwwwwb.", ".bwwwwb.", ".bwwwwb.", ".bwwwwb.", ".bbbbbb.", "........"},
};
static color_t palt[128];
static void init_pal(void) {
	palt['F'] = HEX(0x2A2A3C), palt['f'] = HEX(0x363650), palt['W'] = HEX(0x5C4C70), palt['x'] = HEX(0x3A2E4C);
	palt['k'] = HEX(0x12121A), palt['w'] = HEX(0xF2F2F2), palt['g'] = HEX(0xA4A8B8), palt['d'] = HEX(0x5C6072);
	palt['r'] = HEX(0xE04444), palt['o'] = HEX(0xF08A30), palt['y'] = HEX(0xFFD34E), palt['l'] = HEX(0x62D86E);
	palt['e'] = HEX(0x2E8A46), palt['b'] = HEX(0x4C8CF0), palt['p'] = HEX(0xB264E4), palt['n'] = HEX(0x8A5A32);
	palt['s'] = HEX(0xF0C8A0), palt['m'] = HEX(0x8A1E2A), palt['c'] = HEX(0x40E0E0);
}
static void blit(int x, int y, int spr) {
	for (int j = 0; j < 8; j++)
		for (int sy = 0; sy < 2; sy++) {
			int row = y + j * 2 + sy;
			if (row < gfx_y0 || row >= gfx_y1) continue;
			color_t *d = gfx_buf + (row - gfx_y0) * SCREEN_W;
			for (int i = 0; i < 8; i++) {
				char c = SPR[spr][j][i];
				int xx = x + i * 2;
				if (c == '.' || xx < 0 || xx + 1 >= SCREEN_W) continue;
				d[xx] = d[xx + 1] = palt[(uint8_t)c & 127];
			}
		}
}

/* ------------------------------------------------------------------ the monsters */
static const struct {
	const char *name, *plural;
	uint8_t hp, atk;
} MT[NT] = {{"rat", "rats", 3, 1}, {"bat", "bats", 3, 1}, {"slime", "slimes", 6, 1}, {"skeleton", "skeletons", 8, 2},
	{"orc", "orcs", 12, 3}, {"demon", "demons", 16, 4}, {"archer", "archers", 5, 2}, {"thief", "thieves", 4, 1},
	{"shaman", "shamans", 7, 2}, {"Dragon", "dragons", 60, 5}};
typedef struct {
	uint8_t x, y, type, hp, awake, tick, loot, flee, cnt, pad[3];
	uint32_t flash; /* white until this time */
} mon_t;

/* ------------------------------------------------------------------ achievements */
enum { A_KILL, A_FLOOR, A_GOLD, A_SPENT };
#define NACH 13
#define MAX_TIERS 7
static const struct {
	const char *name;
	uint8_t kind, arg;
	uint16_t target[MAX_TIERS];
	uint16_t reward[MAX_TIERS];
	uint8_t num_tiers;
} ACH[NACH] = {
	{"Rat catcher", A_KILL, M_RAT, {10, 20, 30, 40, 50, 0, 0}, {5, 10, 15, 20, 25, 0, 0}, 5},
	{"Bat hunter", A_KILL, M_BAT, {10, 20, 30, 40, 50, 0, 0}, {5, 10, 15, 20, 25, 0, 0}, 5},
	{"Slime squasher", A_KILL, M_SLIME, {8, 16, 24, 32, 40, 0, 0}, {8, 12, 16, 20, 24, 0, 0}, 5},
	{"Bone breaker", A_KILL, M_SKEL, {8, 16, 24, 32, 40, 0, 0}, {10, 15, 20, 25, 30, 0, 0}, 5},
	{"Orc slayer", A_KILL, M_ORC, {6, 12, 18, 24, 30, 0, 0}, {12, 18, 24, 30, 36, 0, 0}, 5},
	{"Demon bane", A_KILL, M_DEMON, {4, 8, 12, 16, 20, 0, 0}, {16, 24, 32, 40, 48, 0, 0}, 5},
	{"Archer ambush", A_KILL, M_ARCHER, {5, 10, 15, 20, 25, 0, 0}, {12, 18, 24, 30, 36, 0, 0}, 5},
	{"Thief taker", A_KILL, M_THIEF, {4, 8, 12, 16, 20, 0, 0}, {10, 15, 20, 25, 30, 0, 0}, 5},
	{"Shaman silencer", A_KILL, M_SHAMAN, {3, 6, 9, 12, 15, 0, 0}, {14, 21, 28, 35, 42, 0, 0}, 5},
	{"Dragonslayer", A_KILL, M_DRAGON, {1, 2, 3, 4, 5, 0, 0}, {20, 30, 40, 50, 60, 0, 0}, 5},
	{"Reach floor", A_FLOOR, 0, {2, 3, 4, 5, 6, 7, 10}, {5, 10, 15, 20, 30, 40, 50}, 7},
	{"Treasure hunter", A_GOLD, 0, {300, 600, 900, 1200, 1500, 0, 0}, {8, 16, 24, 32, 40, 0, 0}, 5},
	{"Big spender", A_SPENT, 0, {120, 240, 360, 480, 600, 0, 0}, {8, 16, 24, 32, 40, 0, 0}, 5}};

/* ------------------------------------------------------------------ the save: delver.sav and its Python copy */
#define SAVE_NAME "delver.sav"
#define COPY_NAME "delver_saves.py"
#define RUN_NAME "delver.run"
typedef struct {
	uint8_t magic[2], version, pad;
	uint32_t souls, runs, wins, kills, gold_got, gold_spent;
	uint8_t ach_tier[NACH]; /* highest tier reached for each achievement (0-5) */
	uint16_t kill_by[NT], best;
	uint16_t bestiary_seen;  /* bitmask: encountered */
	uint16_t bestiary_known; /* bitmask: killed at least once */
	uint8_t up[3], pad2[3];
	uint32_t checksum;
} save_t; /* 76 bytes */
static save_t sv;

static void zero(void *p, uint32_t n) {
	uint8_t *b = (uint8_t *)p;
	while (n--) *b++ = 0;
}
static uint32_t fnv(const void *data, uint32_t n) { /* FNV-1a */
	const uint8_t *p = (const uint8_t *)data;
	uint32_t h = 2166136261u;
	for (uint32_t i = 0; i < n; i++) h = (h ^ p[i]) * 16777619u;
	return h;
}
static uint32_t le32(const uint8_t *p) { return (uint32_t)p[0] | (uint32_t)p[1] << 8 | (uint32_t)p[2] << 16 | (uint32_t)p[3] << 24; }
static bool valid(void) {
	return sv.magic[0] == 'D' && sv.magic[1] == 'V' && sv.version == 4 && sv.checksum == fnv(&sv, offsetof(save_t, checksum));
}
static bool load_bytes(const uint8_t *p, uint32_t len) {
	if (len != sizeof sv) return false;
	for (uint32_t i = 0; i < len; i++) ((uint8_t *)&sv)[i] = p[i];
	return valid();
}

static const char copy_head[] = "# Delver keeps a copy of your progress here, so\n"
								"# reinstalling it doesn't erase it. If you delete this file,\n"
								"# Delver writes it again: your progress stays safe.\n";
static const char tag[] = "#>" SAVE_NAME ":";
static const char b64[] = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
static uint8_t copybuf[1 + sizeof copy_head + sizeof tag + (sizeof(save_t) + 2) / 3 * 4 + 4];

static void save_copy(void) {
	const uint8_t *d = (const uint8_t *)&sv;
	uint8_t *p = copybuf;
	*p++ = 0; /* the script's status byte: not imported */
	for (uint32_t i = 0; i < sizeof copy_head - 1; i++) *p++ = (uint8_t)copy_head[i];
	for (uint32_t i = 0; i < sizeof tag - 1; i++) *p++ = (uint8_t)tag[i];
	for (uint32_t i = 0; i < sizeof sv; i += 3, p += 4) {
		uint32_t left = sizeof sv - i, v = (uint32_t)d[i] << 16 | (left > 1 ? d[i + 1] << 8 : 0) | (left > 2 ? d[i + 2] : 0);
		p[0] = (uint8_t)b64[v >> 18 & 63];
		p[1] = (uint8_t)b64[v >> 12 & 63];
		p[2] = left > 1 ? (uint8_t)b64[v >> 6 & 63] : '=';
		p[3] = left > 2 ? (uint8_t)b64[v & 63] : '=';
	}
	*p++ = '\n';
	*p++ = 0;
	ef_write(COPY_NAME, copybuf, (uint32_t)(p - copybuf));
}
static void save_write(void) {
	sv.magic[0] = 'D', sv.magic[1] = 'V', sv.version = 4;
	sv.checksum = fnv(&sv, offsetof(save_t, checksum));
	ef_write(SAVE_NAME, &sv, sizeof sv);
	save_copy();
}
static int b64_value(uint8_t c) {
	for (int i = 0; i < 64; i++)
		if ((uint8_t)b64[i] == c) return i;
	return -1;
}
static bool restore_copy(void) { /* the save from the script, after the app was installed again */
	uint32_t n = 0;
	const uint8_t *c = ef_read(COPY_NAME, &n), *l = NULL;
	if (!c) return false;
	for (uint32_t i = 0; i + sizeof tag - 1 <= n; i++) {
		uint32_t k = 0;
		while (k < sizeof tag - 1 && c[i + k] == (uint8_t)tag[k]) k++;
		if (k == sizeof tag - 1) {
			l = c + i + k;
			break;
		}
	}
	if (!l) return false;
	uint32_t len = 0, o = 0;
	while (l + len < c + n && l[len] != '\n' && l[len]) len++;
	if (!len || len % 4) return false;
	uint32_t size = len / 4 * 3 - (l[len - 1] == '=') - (l[len - 2] == '=');
	uint8_t out[sizeof sv];
	if (size != 32 && size != sizeof sv) return false;
	for (uint32_t i = 0; i < len; i += 4) {
		int v[4];
		for (int k = 0; k < 4; k++) v[k] = l[i + k] == '=' ? 0 : b64_value(l[i + k]);
		if (v[0] < 0 || v[1] < 0 || v[2] < 0 || v[3] < 0) return false;
		uint32_t w = (uint32_t)(v[0] << 18 | v[1] << 12 | v[2] << 6 | v[3]);
		for (int k = 0; k < 3 && o < size; k++) out[o++] = (uint8_t)(w >> (16 - 8 * k));
	}
	return load_bytes(out, size);
}
static void save_load(void) {
	uint32_t len = 0;
	const uint8_t *p = ef_read(SAVE_NAME, &len);
	if (p && len == sizeof sv && load_bytes(p, len)) return;
	if (restore_copy()) {
		save_write(); /* the save itself was gone: it comes back */
		return;
	}
	zero(&sv, sizeof sv);
	save_write(); /* a new profile */
}

/* ------------------------------------------------------------------ the game */
static uint8_t tile[MH][MW], seen[MH][MW], vis[MH][MW], item[MH][MW];
static uint8_t danger[MH][MW]; /* how many monsters can hit this tile on their next turn */
static mon_t mon[MAXM];
static int nmon;
static int px, py, hp, maxhp, atk, def, weapon, armor, gold, potions, scrolls, depth, kills;
static uint8_t stock[5]; /* what the merchant of this floor has left */
static int state, sel, won, gain, has_run, menu_n, menu_id[5], title_sel;
static uint32_t rep_at, now, hurt_until, msg_until, toast_until, lvlup_until, trans_until, seed = 1;
static char msg[48], toast[48];
static color_t strip[SCREEN_W * STRIP_H];
enum { MI_CONTINUE, MI_NEW, MI_UPGRADES, MI_ACH, MI_BEST, MI_CTRL, MI_QUIT };

static uint32_t rnd(uint32_t n) { /* a number from 0 to n - 1 */
	seed ^= seed << 13, seed ^= seed >> 17, seed ^= seed << 5;
	return seed % n;
}
static int iabs(int v) { return v < 0 ? -v : v; }
static int sgn(int v) { return v > 0 ? 1 : v < 0 ? -1 : 0; }
static char *cat(char *d, const char *s) {
	while (*s) *d++ = *s++;
	*d = 0;
	return d;
}
static char *cati(char *d, int v) {
	char t[12];
	int n = 0;
	if (v < 0) *d++ = '-', v = -v;
	do t[n++] = (char)('0' + v % 10), v /= 10;
	while (v);
	while (n) *d++ = t[--n];
	*d = 0;
	return d;
}
static void say(const char *a, const char *b, int v) { /* "a b v" in the message line */
	char *d = cat(msg, a);
	if (b) d = cat(cat(d, " "), b);
	if (v >= 0) cati(cat(d, " "), v);
	msg_until = now + 2000;
}

static int ach_value(int i) { /* where you are on this achievement */
	switch (ACH[i].kind) {
	case A_KILL: return sv.kill_by[ACH[i].arg];
	case A_FLOOR: return sv.best;
	case A_GOLD: return (int)sv.gold_got;
	default: return (int)sv.gold_spent;
	}
}
static void ach_check(void) { /* gives the souls of each new tier reached */
	bool any = false;
	for (int i = 0; i < NACH; i++) {
		int val = ach_value(i);
		uint8_t current_tier = sv.ach_tier[i];
		for (int t = current_tier; t < ACH[i].num_tiers; t++) {
			if (val >= ACH[i].target[t]) {
				sv.ach_tier[i] = t + 1;
				sv.souls += ACH[i].reward[t];
				any = true;
				char *d = cat(toast, ACH[i].name);
				cati(cat(d, " tier "), t + 1);
				cati(cat(d, " +"), ACH[i].reward[t]);
				toast_until = now + 3500;
			} else break;
		}
	}
	if (any) save_write();
}

/* a run in progress: delver.run */
typedef struct {
	uint8_t magic, valid, px, py, nmon, pad[3];
	int16_t hp, maxhp, atk, def, weapon, armor, gold, potions, scrolls, depth, kills, pad2;
	uint8_t stock[5], pad3[3];
	uint32_t seed;
	uint8_t tile[MH][MW], seen[MH][MW], item[MH][MW];
	mon_t mon[MAXM];
	uint32_t checksum;
} run_t;
static run_t run;
static void run_write(int ok) {
	zero(&run, sizeof run);
	run.magic = 'R', run.valid = (uint8_t)ok;
	if (ok) {
		run.px = (uint8_t)px, run.py = (uint8_t)py, run.nmon = (uint8_t)nmon;
		run.hp = (int16_t)hp, run.maxhp = (int16_t)maxhp, run.atk = (int16_t)atk, run.def = (int16_t)def;
		run.weapon = (int16_t)weapon, run.armor = (int16_t)armor, run.gold = (int16_t)gold;
		run.potions = (int16_t)potions, run.scrolls = (int16_t)scrolls, run.depth = (int16_t)depth, run.kills = (int16_t)kills;
		for (int i = 0; i < 5; i++) run.stock[i] = stock[i];
		run.seed = seed;
		for (int y = 0; y < MH; y++)
			for (int x = 0; x < MW; x++) run.tile[y][x] = tile[y][x], run.seen[y][x] = seen[y][x], run.item[y][x] = item[y][x];
		for (int i = 0; i < nmon; i++) run.mon[i] = mon[i], run.mon[i].flash = 0;
	}
	run.checksum = fnv(&run, offsetof(run_t, checksum));
	ef_write(RUN_NAME, &run, sizeof run);
	has_run = ok;
}
static void run_save(void) {
	run_write(1);
	save_write(); /* what the run changed in the profile (kills, gold) goes along */
}
static bool run_read(void) { /* the stored run, in `run`, if it is a good one */
	uint32_t len = 0;
	const uint8_t *p = ef_read(RUN_NAME, &len);
	if (!p || len != sizeof run) return false;
	for (uint32_t i = 0; i < len; i++) ((uint8_t *)&run)[i] = p[i];
	if (!(run.magic == 'R' && run.valid == 1 && run.checksum == fnv(&run, offsetof(run_t, checksum)))) return false;
	if (run.nmon > MAXM) return false;
	if (run.px >= MW || run.py >= MH) return false;
	if (run.depth < 1 || run.depth > MAXD) return false;
	if (run.maxhp <= 0 || run.maxhp > 500) return false;
	if (run.hp < 0 || run.hp > run.maxhp) return false;
	if (run.atk < 0 || run.atk > 100) return false;
	if (run.def < 0 || run.def > 100) return false;
	return true;
}
static void run_load(void) {
	px = run.px, py = run.py, nmon = run.nmon;
	hp = run.hp, maxhp = run.maxhp, atk = run.atk, def = run.def, weapon = run.weapon, armor = run.armor;
	gold = run.gold, potions = run.potions, scrolls = run.scrolls, depth = run.depth, kills = run.kills;
	for (int i = 0; i < 5; i++) stock[i] = run.stock[i];
	seed = run.seed | 1;
	for (int y = 0; y < MH; y++)
		for (int x = 0; x < MW; x++) tile[y][x] = run.tile[y][x], seen[y][x] = run.seen[y][x], item[y][x] = run.item[y][x];
	zero(mon, sizeof mon);
	for (int i = 0; i < nmon; i++) mon[i] = run.mon[i];
}
static void build_menu(void) {
	has_run = run_read();
	menu_n = 0;
	if (has_run) menu_id[menu_n++] = MI_CONTINUE;
	menu_id[menu_n++] = MI_NEW, menu_id[menu_n++] = MI_UPGRADES, menu_id[menu_n++] = MI_ACH, menu_id[menu_n++] = MI_BEST, menu_id[menu_n++] = MI_CTRL, menu_id[menu_n++] = MI_QUIT;
	if (sel >= menu_n) sel = 0;
}

static int mon_at(int x, int y) {
	for (int i = 0; i < nmon; i++)
		if (mon[i].hp && mon[i].x == x && mon[i].y == y) return i;
	return -1;
}
static bool free_floor(int x, int y) {
	return tile[y][x] == T_FLOOR && !item[y][x] && mon_at(x, y) < 0 && !(x == px && y == py);
}
static int add_mon(int type, int x, int y) {
	if (nmon >= MAXM) return -1;
	mon_t *m = &mon[nmon++];
	zero(m, sizeof *m);
	m->x = (uint8_t)x, m->y = (uint8_t)y, m->type = (uint8_t)type, m->hp = MT[type].hp;
	return nmon - 1;
}
static void place_item(int what) {
	for (int t = 0; t < 300; t++) {
		int x = 1 + (int)rnd(MW - 2), y = 1 + (int)rnd(MH - 2);
		if (free_floor(x, y)) {
			item[y][x] = (uint8_t)what;
			return;
		}
	}
}

static bool los(int x0, int y0, int x1, int y1) { /* nothing solid between the two tiles */
	int dx = iabs(x1 - x0), dy = iabs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1, err = dx - dy, x = x0, y = y0;
	for (;;) {
		if (x == x1 && y == y1) return true;
		if ((x != x0 || y != y0) && tile[y][x] == T_WALL) return false;
		int e2 = 2 * err;
		if (e2 > -dy) err -= dy, x += sx;
		if (e2 < dx) err += dx, y += sy;
	}
}
static void fov(void) {
	for (int y = 0; y < MH; y++)
		for (int x = 0; x < MW; x++) {
			int dx = x - px, dy = y - py;
			vis[y][x] = dx * dx + dy * dy <= SIGHT2 && los(px, py, x, y);
			if (vis[y][x]) seen[y][x] = 1;
		}
	/* bestiary: mark monsters in view as seen */
	for (int i = 0; i < nmon; i++)
		if (mon[i].hp && vis[mon[i].y][mon[i].x])
			sv.bestiary_seen |= (1u << mon[i].type);
}
static bool connected(void) { /* can you get from where you are to the stairs (or the dragon's room)? */
	uint8_t reach[MH][MW];
	int qx[MH * MW], qy[MH * MW], h = 0, t = 0;
	zero(reach, sizeof reach);
	reach[py][px] = 1, qx[t] = px, qy[t++] = py;
	while (h < t) {
		int x = qx[h], y = qy[h++];
		for (int d = 0; d < 4; d++) {
			static const int8_t dir[4][2] = {{1, 0}, {-1, 0}, {0, 1}, {0, -1}};
			int nx = x + dir[d][0], ny = y + dir[d][1];
			if (nx < 0 || ny < 0 || nx >= MW || ny >= MH || reach[ny][nx] || solid(tile[ny][nx])) continue;
			reach[ny][nx] = 1, qx[t] = nx, qy[t++] = ny;
		}
	}
	for (int y = 0; y < MH; y++)
		for (int x = 0; x < MW; x++)
			if (tile[y][x] == T_STAIRS && !reach[y][x]) return false;
	for (int i = 0; i < nmon; i++)
		if (mon[i].hp && !reach[mon[i].y][mon[i].x]) return false;
	return true;
}

static void gen_level(void) {
	int rx[8], ry[8], rw[8], rh[8], n;
	do {
		zero(tile, sizeof tile);
		n = 0;
		for (int t = 0; t < 80 && n < 7; t++) {
			int w = 3 + (int)rnd(4), h = 3 + (int)rnd(3), x = 1 + (int)rnd(MW - 2 - w), y = 1 + (int)rnd(MH - 2 - h);
			bool ok = true;
			for (int i = 0; i < n; i++)
				if (x < rx[i] + rw[i] + 1 && x + w + 1 > rx[i] && y < ry[i] + rh[i] + 1 && y + h + 1 > ry[i]) ok = false;
			if (!ok) continue;
			rx[n] = x, ry[n] = y, rw[n] = w, rh[n] = h, n++;
			for (int j = y; j < y + h; j++)
				for (int i = x; i < x + w; i++) tile[j][i] = T_FLOOR;
		}
	} while (n < 3);
	for (int i = 1; i < n; i++) { /* corridors: each room to the next */
		int x = rx[i - 1] + rw[i - 1] / 2, y = ry[i - 1] + rh[i - 1] / 2, tx = rx[i] + rw[i] / 2, ty = ry[i] + rh[i] / 2;
		while (x != tx) tile[y][x] = T_FLOOR, x += x < tx ? 1 : -1;
		while (y != ty) tile[y][x] = T_FLOOR, y += y < ty ? 1 : -1;
		tile[y][x] = T_FLOOR;
	}
	zero(item, sizeof item), zero(seen, sizeof seen), zero(mon, sizeof mon);
	nmon = 0;
	px = rx[0] + rw[0] / 2, py = ry[0] + rh[0] / 2;
	int last = n - 1;
	if (depth == MAXD) {
		add_mon(M_DRAGON, rx[last] + rw[last] / 2, ry[last] + rh[last] / 2);
	} else {
		tile[ry[last] + (int)rnd(rh[last])][rx[last] + (int)rnd(rw[last])] = T_STAIRS;
	}
	int hi = depth <= 1 ? 1 : depth == 2 ? 2 : depth <= 4 ? 3 : depth <= 6 ? 4 : 5;
	for (int r = 1; r < n; r++) {
		int cnt = 1 + (int)rnd(2) + (depth > 2) + (depth > 5);
		for (int k = 0; k < cnt; k++) {
			int x = rx[r] + (int)rnd(rw[r]), y = ry[r] + (int)rnd(rh[r]), t = hi - (int)rnd(3);
			if (t < 0) t = 0;
			if (depth >= 2 && rnd(6) == 0) t = M_THIEF;
			else if (depth >= 3 && rnd(6) == 0) t = M_ARCHER;
			else if (depth >= 5 && rnd(7) == 0) t = M_SHAMAN;
			if (tile[y][x] == T_FLOOR && mon_at(x, y) < 0) add_mon(t, x, y);
		}
	}
	for (int i = 0; i < 3; i++) place_item(I_COIN);
	place_item(I_POTION);
	if (rnd(2)) place_item(I_POTION);
	if (rnd(5) < 2) place_item(I_SCROLL);
	if (depth >= 2 && rnd(4) == 0) place_item(I_SWORD);
	if (depth >= 2 && rnd(4) == 0) place_item(I_SHIELD);
	if (rnd(5) == 0) place_item(I_HEART);
	if (depth > 1 && depth < MAXD) {
		/* a treasure room: guarded, and full of what you came for */
		if (n >= 4 && rnd(100) < 40) {
			int r = 1 + (int)rnd(n - 2);
			for (int k = 0; k < 4; k++) {
				int x = rx[r] + (int)rnd(rw[r]), y = ry[r] + (int)rnd(rh[r]);
				if (free_floor(x, y)) item[y][x] = k < 3 ? I_COIN : (uint8_t)(I_SWORD + (int)rnd(3));
			}
			for (int k = 0; k < 2; k++) {
				int x = rx[r] + (int)rnd(rw[r]), y = ry[r] + (int)rnd(rh[r]);
				if (free_floor(x, y)) add_mon(hi, x, y);
			}
		}
		/* spikes, in the rooms and out of sight */
		int ns = 1 + (int)rnd(2 + (uint32_t)depth / 3);
		for (int k = 0; k < ns; k++) {
			int r = 1 + (int)rnd(n - 1), x = rx[r] + (int)rnd(rw[r]), y = ry[r] + (int)rnd(rh[r]);
			if (free_floor(x, y)) tile[y][x] = T_SPIKE;
		}
		/* a merchant, an altar, a forge, and a library: solid, and never where a corridor goes */
		for (int what = 0; what < 4; what++) {
			int chance = what == 0 ? 45 : what == 1 ? 35 : what == 2 ? 25 : 20;
			if (rnd(100) >= chance) continue;
			for (int t = 0; t < 40; t++) {
				int r = (int)rnd(n), x = rx[r] + (int)rnd(rw[r]), y = ry[r] + (int)rnd(rh[r]);
				bool onpath = false;
				for (int i = 0; i < n; i++)
					if (x == rx[i] + rw[i] / 2 || y == ry[i] + rh[i] / 2) onpath = true;
				if (onpath || !free_floor(x, y)) continue;
				if (what == 0) tile[y][x] = T_MERCHANT;
				else if (what == 1) tile[y][x] = T_ALTAR;
				else if (what == 2) tile[y][x] = T_FORGE;
				else tile[y][x] = T_LIBRARY;
				if (connected()) {
					if (!what) stock[0] = 3, stock[1] = stock[2] = stock[3] = stock[4] = 1;
					break;
				}
				tile[y][x] = T_FLOOR;
			}
		}
	}
	fov();
}

static void end_run(int win) {
	won = win;
	gain = depth * 2 + kills / 3 + gold / 6 + (win ? 25 : 0);
	sv.souls += (uint32_t)gain, sv.runs++, sv.kills += (uint32_t)kills;
	if (win) sv.wins++;
	if ((uint32_t)depth > sv.best) sv.best = (uint16_t)depth;
	ach_check();
	save_write();
	run_write(0); /* no way back: the run is over */
	state = ST_DEAD;
}
static void start_run(void) {
	depth = 1, maxhp = 12 + 2 * sv.up[0], hp = maxhp, atk = 2 + sv.up[1], def = 0, weapon = armor = gold = kills = 0;
	potions = 1 + sv.up[2], scrolls = 0;
	gen_level();
	state = ST_PLAY;
	say("Floor", 0, depth);
	run_save();
}
static void descend(void) {
	depth++;
	hp += maxhp / 4 > 0 ? maxhp / 4 : 1;
	if (hp > maxhp) hp = maxhp;
	if ((uint32_t)depth > sv.best) sv.best = (uint16_t)depth;
	gen_level();
	say("Floor", 0, depth);
	ach_check();
	trans_until = now + 1200;
	run_save();
}

static void add_gold(int v) {
	gold += v, sv.gold_got += (uint32_t)v;
	ach_check();
}
static void pickup(void) {
	int it = item[py][px];
	if (!it) return;
	item[py][px] = 0;
	switch (it) {
	case I_COIN: {
		int v = 1 + (int)rnd(3) + depth / 2;
		add_gold(v);
		say("Gold", 0, v);
		break;
	}
	case I_POTION: potions++, say("Potion", 0, -1); break;
	case I_SCROLL: scrolls++, say("Scroll", 0, -1); break;
	case I_SWORD:
		if (weapon < 4) weapon++, atk++, say("Sharper blade! ATK", 0, atk), lvlup_until = now + 800;
		else add_gold(5), say("Old blade: 5 gold", 0, -1);
		break;
	case I_SHIELD:
		if (armor < 3) armor++, def++, say("Sturdy shield! DEF", 0, def);
		else add_gold(5), say("Old shield: 5 gold", 0, -1);
		break;
	case I_HEART: maxhp += 2, hp += 2, say("Max HP", 0, maxhp), lvlup_until = now + 800; break;
	}
}

/* the monsters' turn */
static const int8_t DIR[4][2] = {{1, 0}, {-1, 0}, {0, 1}, {0, -1}};
static bool passable(int x, int y, int self) {
	if (x < 0 || y < 0 || x >= MW || y >= MH || solid(tile[y][x])) return false;
	if (x == px && y == py) return false;
	int m = mon_at(x, y);
	return m < 0 || m == self;
}
static void spike_damage_monster(int i) { /* monster i steps on spike */
	mon_t *m = &mon[i];
	if (tile[m->y][m->x] == T_SPIKE) {
		int d = 2 + depth / 3;
		m->hp = m->hp > d ? m->hp - d : 0;
		tile[m->y][m->x] = T_SPIKE_USED;
		if (m->hp == 0) {
			kills++;
			if (sv.kill_by[m->type] < 65535) sv.kill_by[m->type]++;
			sv.bestiary_seen |= (1u << m->type);
			sv.bestiary_known |= (1u << m->type);
			add_gold(1 + (int)rnd(2 + m->type % 6));
			ach_check();
			say(MT[m->type].name, "impaled on spikes", -1);
		} else {
			m->flash = now + 120;
			say(MT[m->type].name, "hits spikes", -1);
		}
	}
}
static void chase(int i, bool horiz_first) { /* one step toward you, along the longer side (or the shorter one) */
	mon_t *m = &mon[i];
	int sx = sgn(px - m->x), sy = sgn(py - m->y);
	for (int t = 0; t < 2; t++) {
		bool horiz = horiz_first == (t == 0);
		int nx = m->x + (horiz ? sx : 0), ny = m->y + (horiz ? 0 : sy);
		if ((horiz ? sx : sy) && passable(nx, ny, i)) {
			m->x = (uint8_t)nx, m->y = (uint8_t)ny;
			spike_damage_monster(i);
			return;
		}
	}
}
static void step_away(int i) { /* one step that takes it further from you, if there is one */
	mon_t *m = &mon[i];
	int best = iabs(m->x - px) + iabs(m->y - py), bx = -1, by = -1;
	for (int d = 0; d < 4; d++) {
		int nx = m->x + DIR[d][0], ny = m->y + DIR[d][1], dd = iabs(nx - px) + iabs(ny - py);
		if (dd > best && passable(nx, ny, i)) best = dd, bx = nx, by = ny;
	}
	if (bx >= 0) {
		m->x = (uint8_t)bx, m->y = (uint8_t)by;
		spike_damage_monster(i);
	}
}
static bool shot_clear(const mon_t *m, int range) { /* can this archer hit you from where it is? */
	if (m->x != px && m->y != py) return false;
	int dx = sgn(px - m->x), dy = sgn(py - m->y), x = m->x, y = m->y;
	for (int k = 0; k < range; k++) {
		x += dx, y += dy;
		if (x == px && y == py) return true;
		if (solid(tile[y][x]) || mon_at(x, y) >= 0) return false;
	}
	return false;
}
static void hurt(const mon_t *m, const char *verb) {
	int d = MT[m->type].atk + (int)rnd(2) - def;
	if (d < 1) d = 1;
	hp -= d;
	hurt_until = now + 140;
	say(MT[m->type].name, verb, d);
	if (hp <= 0) end_run(0);
}
static void monsters_act(void) {
	for (int i = 0; i < nmon && state == ST_PLAY; i++) {
		mon_t *m = &mon[i];
		if (!m->hp) continue;
		int dx = px - m->x, dy = py - m->y, dist = iabs(dx) + iabs(dy);
		if (!m->awake) {
			if (vis[m->y][m->x] && (dist <= 6 || m->type == M_DRAGON)) m->awake = 1;
			else continue;
		}
		if (m->type == M_SLIME && (m->tick ^= 1)) continue; /* slimes act every other turn */
		if (m->type == M_THIEF && m->flee) { /* with your gold: it runs, and is gone if it gets away */
			step_away(i);
			if (iabs(m->x - px) + iabs(m->y - py) >= 8 && !vis[m->y][m->x]) m->hp = 0, say("A thief got away", 0, -1);
			continue;
		}
		if (m->type == M_ARCHER) {
			if (shot_clear(m, 5)) hurt(m, "shoots you");
			else if (dist <= 12) chase(i, iabs(dx) < iabs(dy)); /* line up with you */
			continue;
		}
		if (dist == 1) {
			if (m->type == M_THIEF && gold > 0) {
				int s = 3 + (int)rnd(4) + depth / 2;
				if (s > gold) s = gold;
				gold -= s, m->loot = (uint8_t)s, m->flee = 1;
				say("A thief stole", 0, s);
			} else hurt(m, "hits you");
			continue;
		}
		if (dist > 12) continue;
		if (m->type == M_SHAMAN) {
			if (dist <= 2) step_away(i);
			else if (++m->cnt >= 5 && vis[m->y][m->x]) { /* it calls a rat */
				m->cnt = 0;
				for (int d = 0; d < 4; d++) {
					int nx = m->x + DIR[d][0], ny = m->y + DIR[d][1];
					if (passable(nx, ny, -1) && mon_at(nx, ny) < 0) {
						int r = add_mon(M_RAT, nx, ny);
						if (r >= 0) mon[r].awake = 1, say("The shaman calls a rat", 0, -1);
						break;
					}
				}
			} else if (dist > 4) chase(i, iabs(dx) >= iabs(dy));
			continue;
		}
		if (m->type == M_BAT && rnd(2)) { /* bats flutter */
				int r = (int)rnd(4), nx = m->x + DIR[r][0], ny = m->y + DIR[r][1];
				if (passable(nx, ny, i)) {
					m->x = (uint8_t)nx, m->y = (uint8_t)ny;
					spike_damage_monster(i);
				}
				continue;
			}
		chase(i, iabs(dx) >= iabs(dy));
	}
}

/* where each awake monster hits next turn: around it, or along its line of fire for an archer; a slime not when
 * it rests */
static void calc_danger(void) {
	zero(danger, sizeof danger);
	if (state == ST_TITLE || state == ST_SHOP || state == ST_ACH) return;
	for (int i = 0; i < nmon; i++) {
		const mon_t *m = &mon[i];
		if (!m->hp || !m->awake || m->flee || (m->type == M_SLIME && !m->tick)) continue;
		for (int d = 0; d < 4; d++) {
			int x = m->x, y = m->y;
			for (int k = 0; k < (m->type == M_ARCHER ? 5 : 1); k++) {
				x += DIR[d][0], y += DIR[d][1];
				if (x < 0 || y < 0 || x >= MW || y >= MH || solid(tile[y][x]) || mon_at(x, y) >= 0) break;
				if (danger[y][x] < 3) danger[y][x]++;
			}
		}
	}
}

/* the altar: its price, and its gift */
static int altar_cost(void) { return maxhp / 3 > 3 ? maxhp / 3 : 3; }
static void altar_pray(void) {
	hp -= altar_cost();
	hurt_until = now + 140;
	int r = (int)rnd(4);
	if (r == 0 && weapon < 4) weapon++, atk++, say("The altar sharpens you! ATK", 0, atk), lvlup_until = now + 800;
	else if (r == 1 && armor < 3) armor++, def++, say("The altar hardens you! DEF", 0, def);
	else if (r == 2) potions += 2, say("The altar gives 2 potions", 0, -1);
	else maxhp += 3, hp += 3, say("The altar fills you! Max HP", 0, maxhp), lvlup_until = now + 800;
}
static int altar_x, altar_y; /* the altar you are talking to */

/* the merchant */
static const char *const WARES[5] = {"Potion", "Scroll", "Heart (+2 max HP)", "Whetstone (+1 ATK)", "Plate (+1 DEF)"};
static int price(int i) {
	static const uint8_t base[5] = {10, 15, 30, 45, 45}, per[5] = {3, 3, 4, 4, 4};
	return base[i] + per[i] * depth;
}
static bool can_buy(int i) {
	if (!stock[i] || gold < price(i)) return false;
	return i == 3 ? weapon < 4 : i == 4 ? armor < 3 : true;
}
static void buy(int i) {
	if (!can_buy(i)) return;
	gold -= price(i), stock[i]--, sv.gold_spent += (uint32_t)price(i);
	switch (i) {
		case 0: potions++; break;
		case 1: scrolls++; break;
		case 2: maxhp += 2, hp += 2, lvlup_until = now + 800; break;
		case 3: weapon++, atk++, lvlup_until = now + 800; break;
		case 4: armor++, def++; break;
	}
	ach_check();
}

/* a step or an attack; true if a turn went by */
static bool step(int dx, int dy) {
	int nx = px + dx, ny = py + dy;
	if (nx < 0 || ny < 0 || nx >= MW || ny >= MH || tile[ny][nx] == T_WALL) return false;
	int t = tile[ny][nx];
	if (t == T_MERCHANT) {
		state = ST_TRADE, sel = 0;
		return false;
	}
	if (t == T_ALTAR) {
		if (hp > altar_cost()) state = ST_ALTAR, altar_x = nx, altar_y = ny;
		else say("Too weak for the altar", 0, -1);
		return false;
	}
	if (t == T_ALTAR_USED) {
		say("The altar is cold", 0, -1);
		return false;
	}
	if (t == T_FORGE) {
		state = ST_FORGE, sel = 0;
		return false;
	}
	if (t == T_LIBRARY) {
		state = ST_LIBRARY, sel = 0;
		return false;
	}
	int mi = mon_at(nx, ny);
	if (mi >= 0) {
		mon_t *m = &mon[mi];
		int d = atk + (int)rnd(2);
		m->hp = (uint8_t)(m->hp > d ? m->hp - d : 0);
		m->awake = 1;
		m->flash = now + 120;
		if (m->hp) {
			say("Hit", MT[m->type].name, d);
		} else {
			int g = 1 + (int)rnd(2 + m->type % 6);
			kills++, gold += m->loot;
			if (m->loot) say("Thief slain: gold back", 0, m->loot);
			else say("Slain", MT[m->type].name, -1);
			if (sv.kill_by[m->type] < 65535) sv.kill_by[m->type]++;
			sv.bestiary_seen |= (1u << m->type);
			sv.bestiary_known |= (1u << m->type);
			add_gold(g);
			ach_check();
			if (m->type == M_DRAGON) {
				end_run(1);
				return false;
			}
		}
	} else {
		px = nx, py = ny;
		pickup();
		if (tile[py][px] == T_SPIKE) {
				int d = 2 + depth / 3;
				tile[py][px] = T_SPIKE_USED;
				hp -= d, hurt_until = now + 140;
				say("Spikes!", 0, d);
			if (hp <= 0) {
				end_run(0);
				return false;
			}
		}
		if (tile[py][px] == T_STAIRS) {
			descend();
			return false; /* a new floor: the monsters there have not moved */
		}
	}
	return true;
}
static void end_turn(void) {
	fov();
	monsters_act();
	fov();
}
static void play_input(uint64_t k, uint64_t hit) {
	const uint64_t dirs = KEY(eadk_key_left) | KEY(eadk_key_right) | KEY(eadk_key_up) | KEY(eadk_key_down);
	int dx = k & KEY(eadk_key_left) ? -1 : k & KEY(eadk_key_right) ? 1 : 0;
	int dy = dx ? 0 : k & KEY(eadk_key_up) ? -1 : k & KEY(eadk_key_down) ? 1 : 0;
	bool turn = false;
	if (dx || dy) {
		if (hit & dirs) turn = step(dx, dy), rep_at = now + 220;
		else if ((int32_t)(now - rep_at) >= 0 && state == ST_PLAY) turn = step(dx, dy), rep_at = now + 90;
		if (state != ST_PLAY) return;
		if (turn) end_turn();
		return;
	}
	if (hit & KEY(eadk_key_ok)) {
		if (potions > 0 && hp < maxhp) {
			potions--;
			int heal = 8;
			if (hp + heal > maxhp) heal = maxhp - hp;
			hp += heal;
			say("Potion heals", 0, heal);
			turn = true;
		} else say(potions ? "HP is full" : "No potion", 0, -1);
	} else if (hit & KEY(eadk_key_exe)) {
		if (scrolls > 0) {
			scrolls--;
			for (int y = 0; y < MH; y++)
				for (int x = 0; x < MW; x++) seen[y][x] = 1;
			say("The floor appears", 0, -1);
			turn = true;
		} else say("No scroll", 0, -1);
	} else if (hit & KEY(eadk_key_shift)) {
		turn = true;
	} else if (hit & KEY(eadk_key_back)) {
		state = ST_PAUSE;
	}
	if (turn) end_turn();
}

/* the upgrades: name, price of the first level, price of each next one, last level */
static const struct {
	const char *name, *what;
	uint8_t base, more, max;
} UP[3] = {{"Vitality", "+2 max HP", 25, 25, 8}, {"Might", "+1 attack", 50, 50, 4}, {"Supplies", "+1 potion", 20, 30, 4}};
static int up_cost(int i) { return UP[i].base + UP[i].more * sv.up[i]; }

static void update(uint64_t k, uint64_t hit) {
	const uint64_t ok = KEY(eadk_key_ok) | KEY(eadk_key_exe);
	switch (state) {
	case ST_TITLE:
			if (hit & KEY(eadk_key_up)) sel = sel > 0 ? sel - 1 : 0;
			if (hit & KEY(eadk_key_down)) sel = sel < menu_n - 1 ? sel + 1 : sel;
			if (hit & ok) {
				int id = menu_id[sel];
				title_sel = sel;  /* remember for when we return */
				if (id == MI_CONTINUE && run_read()) {
					run_load();
					fov();
					state = ST_PLAY;
					say("Welcome back", 0, -1);
				} else if (id == MI_NEW) start_run();
				else if (id == MI_UPGRADES) state = ST_SHOP, sel = 0;
				else if (id == MI_ACH) state = ST_ACH, sel = 0;
				else if (id == MI_BEST) state = ST_BEST, sel = 0;
				else if (id == MI_CTRL) state = ST_CTRL, sel = 0;
				else if (id == MI_QUIT) state = ST_QUIT, sel = 0;
			}
			break;
	case ST_SHOP:
		if (hit & KEY(eadk_key_up)) sel = sel > 0 ? sel - 1 : 2;
		if (hit & KEY(eadk_key_down)) sel = sel < 2 ? sel + 1 : 0;
		if (hit & KEY(eadk_key_back)) build_menu(), state = ST_TITLE, sel = title_sel;
		if ((hit & ok) && sv.up[sel] < UP[sel].max && sv.souls >= (uint32_t)up_cost(sel)) {
			sv.souls -= (uint32_t)up_cost(sel);
			sv.up[sel]++;
			save_write();
		}
		break;
	case ST_ACH:
		if (hit & KEY(eadk_key_up)) sel = sel > 0 ? sel - 1 : NACH - 1;
		if (hit & KEY(eadk_key_down)) sel = sel < NACH - 1 ? sel + 1 : 0;
		if (hit & (KEY(eadk_key_back) | ok)) build_menu(), state = ST_TITLE, sel = title_sel;
		break;
	case ST_BEST:
		if (hit & KEY(eadk_key_up)) sel = sel > 0 ? sel - 1 : NT - 1;
		if (hit & KEY(eadk_key_down)) sel = sel < NT - 1 ? sel + 1 : 0;
		if (hit & KEY(eadk_key_exe)) {
			char tmp[48];
			char *d = cati(cat(cat(tmp, MT[sel].name), " "), MT[sel].hp);
			d = cati(cat(d, " HP "), MT[sel].atk);
			msg_until = now + 3000, say(tmp, 0, -1);
		} else if (hit & (KEY(eadk_key_back) | KEY(eadk_key_ok))) {
			build_menu(), state = ST_TITLE, sel = title_sel;
		}
		break;
	case ST_CTRL:
		if (hit & (KEY(eadk_key_back) | ok)) build_menu(), state = ST_TITLE, sel = title_sel;
		break;
	case ST_QUIT:
		if (hit & KEY(eadk_key_back)) build_menu(), state = ST_TITLE, sel = title_sel;
		if (hit & ok) {
			if (run_read()) run_save();
			sel = 0, build_menu(), state = ST_TITLE;
		}
		break;
	case ST_FORGE:
		if (hit & KEY(eadk_key_up)) sel = sel > 0 ? sel - 1 : 2;
		if (hit & KEY(eadk_key_down)) sel = sel < 2 ? sel + 1 : 0;
		if (hit & ok) {
			if (sel == 0 && gold >= 50) gold -= 50, weapon++, atk++, lvlup_until = now + 800;
			else if (sel == 1 && gold >= 75) gold -= 75, armor++, def++, lvlup_until = now + 800;
			else if (sel == 2 && gold >= 100) gold -= 100, maxhp += 5, hp += 5, lvlup_until = now + 800;
		}
		if (hit & KEY(eadk_key_back)) state = ST_PLAY, rep_at = now + 500;
		break;
	case ST_LIBRARY:
		if (hit & KEY(eadk_key_up)) sel = sel > 0 ? sel - 1 : 2;
		if (hit & KEY(eadk_key_down)) sel = sel < 2 ? sel + 1 : 0;
		if (hit & ok) {
			if (sel == 0 && gold >= 25) gold -= 25, scrolls += 2;
			else if (sel == 1 && gold >= 50) gold -= 50, potions += 2;
			else if (sel == 2 && gold >= 75) gold -= 75, maxhp += 3, hp += 3, lvlup_until = now + 800;
		}
		if (hit & KEY(eadk_key_back)) state = ST_PLAY, rep_at = now + 500;
		break;
	case ST_PLAY: play_input(k, hit); break;
	case ST_PAUSE:
		if (hit & KEY(eadk_key_ok)) state = ST_PLAY;
		if (hit & KEY(eadk_key_back)) { /* save and leave: the run waits on the title screen */
			run_save();
			sel = 0, build_menu(), state = ST_TITLE;
		}
		if (hit & KEY(eadk_key_exe)) end_run(0); /* give up */
		break;
	case ST_TRADE:
		if (hit & KEY(eadk_key_up)) sel = sel > 0 ? sel - 1 : 4;
		if (hit & KEY(eadk_key_down)) sel = sel < 4 ? sel + 1 : 0;
		if (hit & ok) buy(sel);
		if (hit & KEY(eadk_key_back)) state = ST_PLAY, rep_at = now + 500;
		break;
	case ST_ALTAR:
		if (hit & ok) {
			altar_pray();
			tile[altar_y][altar_x] = T_ALTAR_USED;
			state = ST_PLAY, rep_at = now + 500;
			if (hp <= 0) end_run(0);
			else end_turn();
		}
		if (hit & KEY(eadk_key_back)) state = ST_PLAY, rep_at = now + 500;
		break;
	case ST_DEAD:
		if (hit & (ok | KEY(eadk_key_back))) sel = 0, build_menu(), state = ST_TITLE;
		break;
	}
}

/* ------------------------------------------------------------------ drawing */
static void draw_tile(int tx, int ty) {
	int x = tx * TS, y = TOP + ty * TS, t = tile[ty][tx];
	if (!seen[ty][tx]) {
		gfx_fill(x, y, TS, TS, 0);
		return;
	}
	blit(x, y, t == T_WALL ? S_WALL : t == T_STAIRS ? S_STAIRS : S_FLOOR);
	if (t == T_SPIKE && vis[ty][tx]) blit(x, y, S_SPIKE);
	if (t == T_SPIKE_USED && vis[ty][tx]) blit(x, y, S_SPIKE_USED);
	if (t == T_MERCHANT) blit(x, y, S_MERCHANT);
	if (t == T_ALTAR) blit(x, y, S_ALTAR);
	if (t == T_ALTAR_USED) blit(x, y, S_ALTAR_USED);
	if (t == T_FORGE && vis[ty][tx]) blit(x, y, S_FORGE);
	if (t == T_LIBRARY && vis[ty][tx]) blit(x, y, S_LIBRARY);
	static const uint8_t item_spr[] = {0, S_COIN, S_POTION, S_SCROLL, S_SWORD, S_SHIELD, S_HEART};
	if (item[ty][tx]) blit(x, y, item_spr[item[ty][tx]]);
	if (!vis[ty][tx]) {
		gfx_fill_alpha(x, y, TS, TS, 0, 150);
		return;
	}
	if (danger[ty][tx]) {
		int sz = TS - 4;
		int ox = x + 2, oy = y + 2;
		gfx_fill_alpha(ox, oy, sz, sz, HEX(0xFF2020), 30 + 15 * danger[ty][tx]);
	}
	int m = mon_at(tx, ty);
	if (m >= 0) {
		blit(x, y, S_RAT + mon[m].type);
		if (now < mon[m].flash) gfx_fill_alpha(x, y, TS, TS, WHITE, 150);
		const char *mark = mon[m].awake ? "!" : "z"; /* asleep, or after you */
		color_t mc = mon[m].awake ? HEX(0xFFD34E) : HEX(0x8EC8FF);
		gfx_circle(x + 11, y + 5, 5, 0, 230); /* a dark badge, readable on any monster */
		gfx_text(&np_font_small, x + 8, y + 9, mark, mc, 256);
	}
	if (tx == px && ty == py) {
		blit(x, y, S_HERO);
		if (danger[ty][tx]) gfx_rrect_outline(x, y, TS, TS, 3, 2, HEX(0xFF4040), 256); /* you can be hit */
	}
}
static void number(int x, int base, int v, color_t c) {
	char s[12];
	cati(s, v);
	gfx_text(&np_font_small, x, base, s, c, 256);
}
static void scene_play(void) {
	if (gfx_y0 < TOP) {
		gfx_fill(0, 0, SCREEN_W, TOP, HEX(0x0C0C14));
		char s[16], *d = cati(s, hp);
		cati(cat(d, "/"), maxhp);
		blit(0, 0, S_HEART);
		gfx_text(&np_font_small, 18, 12, s, hp * 3 <= maxhp ? HEX(0xFF6060) : WHITE, 256);
		blit(64, 0, S_SWORD), number(82, 12, atk, WHITE);
		blit(104, 0, S_SHIELD), number(122, 12, def, WHITE);
		blit(144, 0, S_POTION), number(162, 12, potions, WHITE);
		blit(184, 0, S_SCROLL), number(202, 12, scrolls, WHITE);
		blit(224, 0, S_COIN), number(242, 12, gold, HEX(0xFFD34E));
		char f[8];
		cati(cat(f, "F"), depth);
		gfx_text_right(&np_font_small, SCREEN_W - 6, 12, f, HEX(0x8EC8FF), 256);
		return;
	}
	int ty = (gfx_y0 - TOP) / TS;
	for (int tx = 0; tx < MW; tx++) draw_tile(tx, ty);
	if (now < hurt_until) gfx_fill_alpha(0, gfx_y0, SCREEN_W, gfx_y1 - gfx_y0, HEX(0xFF2020), 90);
	if (now < lvlup_until) gfx_fill_alpha(0, gfx_y0, SCREEN_W, gfx_y1 - gfx_y0, HEX(0xFFD34E), 60);
	if (now < trans_until) {
		int alpha = 200 - (int)((now - (trans_until - 1200)) * 200 / 1200);
		if (alpha < 0) alpha = 0;
		gfx_fill_alpha(0, gfx_y0, SCREEN_W, gfx_y1 - gfx_y0, HEX(0x00FFFF), alpha);
	}
	if (ty == 0 && now < toast_until) { /* an achievement */
		gfx_fill_alpha(0, TOP, SCREEN_W, 16, 0, 200);
		gfx_text_center(&np_font_small, 160, TOP + 12, toast, HEX(0xFFD34E), 256);
	}
	if (now < msg_until && gfx_y1 > SCREEN_H - 16) {
		gfx_fill_alpha(0, SCREEN_H - 16, SCREEN_W, 16, 0, 170);
		gfx_text_center(&np_font_small, 160, SCREEN_H - 4, msg, WHITE, 256);
	}
}
static void panel(int x, int y, int w, int h) {
	gfx_shadow(x, y, w, h, 14, 6, 120);
	gfx_rrect(x, y, w, h, 14, HEX(0x10182E), 256);
	gfx_rrect_outline(x, y, w, h, 14, 2, HEX(0x5C6BA0), 256);
}
static void scene_title(void) {
	gfx_vgrad(0, 0, SCREEN_W, SCREEN_H, 0x10182E, 0x2A1038);
	gfx_text_center(&np_font_title, 160, 44, "DELVER", HEX(0xFFD34E), 256);
	gfx_text_center(&np_font_small, 160, 60, T("Ten floors. One dragon."), HEX(0xA0A8D0), 256);
	static const char *const names[7] = {"Continue", "New run", "Upgrades", "Achievements", "Bestiary", "Controls", "Quit"};
	for (int i = 0; i < menu_n; i++) {
		int y = 74 + i * 24;
		if (sel == i) gfx_rrect(80, y, 160, 22, 8, HEX(0x3A4A90), 256);
		gfx_text_center(&np_font_body, 160, y + 16, names[menu_id[i]], WHITE, sel == i ? 256 : 170);
	}
	char s[40], *d = cat(s, "Souls ");
	d = cati(d, (int)sv.souls);
	d = cati(cat(d, "   Best floor "), sv.best);
	gfx_text_center(&np_font_small, 160, 214, s, WHITE, 220);
	d = cati(cat(s, "Runs "), (int)sv.runs);
	cati(cat(d, "   Wins "), (int)sv.wins);
	gfx_text_center(&np_font_small, 160, 232, s, HEX(0x8890B8), 256);
}
static void scene_shop(void) {
	gfx_vgrad(0, 0, SCREEN_W, SCREEN_H, 0x10182E, 0x2A1038);
	gfx_text_center(&np_font_title, 160, 38, "Upgrades", HEX(0xFFD34E), 256);
	char s[24];
	cati(cat(s, "Souls "), (int)sv.souls);
	gfx_text_center(&np_font_body, 160, 62, s, WHITE, 256);
	for (int i = 0; i < 3; i++) {
		int y = 76 + i * 44;
		if (sel == i) gfx_rrect(16, y, 288, 38, 10, HEX(0x3A4A90), 256);
		gfx_text(&np_font_body, 28, y + 17, UP[i].name, WHITE, 256);
		gfx_text(&np_font_small, 28, y + 32, UP[i].what, HEX(0xA0A8D0), 256);
		for (int p = 0; p < UP[i].max; p++)
			gfx_rrect(296 - UP[i].max * 12 + p * 12, y + 24, 8, 8, 3, p < sv.up[i] ? HEX(0xFFD34E) : HEX(0x30385C), 256);
		if (sv.up[i] >= UP[i].max) {
			gfx_text_right(&np_font_body, 296, y + 17, "MAX", HEX(0x62D86E), 256);
		} else {
			cati(cat(s, "Cost "), up_cost(i));
			gfx_text_right(&np_font_body, 296, y + 17, s, sv.souls >= (uint32_t)up_cost(i) ? WHITE : HEX(0x8890B8), 256);
		}
	}
	gfx_text_center(&np_font_small, 160, 232, T("OK: buy    Back: return"), HEX(0xA0A8D0), 256);
}
static void scene_ach(void) {
	gfx_vgrad(0, 0, SCREEN_W, SCREEN_H, 0x10182E, 0x2A1038);
	int done = 0;
	for (int i = 0; i < NACH; i++) done += sv.ach_tier[i];
	char s[48], *d = cati(cat(s, "Achievements "), done);
	cati(cat(d, " /"), NACH * MAX_TIERS);
	gfx_text_center(&np_font_body, 160, 20, s, HEX(0xFFD34E), 256);
	int top = sel - 2 < 0 ? 0 : sel - 2 > NACH - 6 ? NACH - 6 : sel - 2;
	for (int r = 0; r < 6; r++) {
		int i = top + r, y = 30 + r * 33;
		uint8_t tier = sv.ach_tier[i];
		bool maxed = tier >= ACH[i].num_tiers;
		if (sel == i) gfx_rrect(8, y, 304, 30, 9, HEX(0x3A4A90), 256);
		else if (maxed) gfx_rrect(8, y, 304, 30, 9, HEX(0x1C3A2C), 256);
		gfx_text(&np_font_body, 16, y + 14, ACH[i].name, maxed ? HEX(0x62D86E) : WHITE, 256);
		/* progress squares like upgrades */
		int sq_x = 296 - ACH[i].num_tiers * 12;
		for (int p = 0; p < ACH[i].num_tiers; p++) {
			color_t c = p < tier ? HEX(0xFFD34E) : HEX(0x30385C);
			gfx_rrect(sq_x + p * 12, y + 18, 8, 8, 3, c, 256);
		}
		if (maxed) {
			gfx_text_right(&np_font_body, 296, y + 17, "MAX", HEX(0x62D86E), 256);
		} else {
			gfx_text_right(&np_font_body, 296, y + 17, "", HEX(0x8EC8FF), 256);
		}
	}
	gfx_text_center(&np_font_small, 160, 236, T("Up/Down: scroll    Back: return"), HEX(0xA0A8D0), 256);
}
static void scene_best(void) {
	gfx_vgrad(0, 0, SCREEN_W, SCREEN_H, 0x10182E, 0x2A1038);
	int seen_count = 0, known_count = 0;
	for (int i = 0; i < NT; i++) {
		if (sv.bestiary_seen & (1u << i)) seen_count++;
		if (sv.bestiary_known & (1u << i)) known_count++;
	}
	char s[48], *d = cati(cat(s, "Bestiary "), seen_count);
	cati(cat(d, " /"), NT);
	gfx_text_center(&np_font_body, 160, 20, s, HEX(0xFFD34E), 256);
	int top = sel - 2 < 0 ? 0 : sel - 2 > NT - 6 ? NT - 6 : sel - 2;
	for (int r = 0; r < 6; r++) {
		int i = top + r, y = 30 + r * 33;
		bool seen = sv.bestiary_seen & (1u << i);
		bool known = sv.bestiary_known & (1u << i);
		if (sel == i) gfx_rrect(8, y, 304, 30, 9, HEX(0x3A4A90), 256);
		else if (known) gfx_rrect(8, y, 304, 30, 9, HEX(0x1C3A2C), 256);
		else if (seen) gfx_rrect(8, y, 304, 30, 9, HEX(0x2A3A4A), 256);
		gfx_text(&np_font_body, 16, y + 14, MT[i].name, known ? HEX(0x62D86E) : seen ? HEX(0x8EC8FF) : HEX(0x606080), 256);
		if (known) {
				d = cat(s, "HP ");
				d = cati(d, MT[i].hp);
				d = cat(d, "  ATK ");
				d = cati(d, MT[i].atk);
			} else if (seen) {
			d = cat(s, "???  ???  ???");
		} else {
			d = cat(s, "??????????");
		}
		gfx_text(&np_font_small, 16, y + 26, s, known ? HEX(0x8EE0A0) : seen ? HEX(0xA0A8D0) : HEX(0x505070), 256);
		if (known) {
				cati(cat(s, "Known: "), sv.kill_by[i]);
		} else if (seen) {
			d = cat(s, "Seen   ?");
		} else {
			d = cat(s, "???");
		}
		gfx_text_right(&np_font_small, 304, y + 14, s, known ? HEX(0x62D86E) : seen ? HEX(0x8EC8FF) : HEX(0x505070), 256);
	}
	gfx_text_center(&np_font_small, 160, 236, T("Up/Down: scroll    Back: return"), HEX(0xA0A8D0), 256);
}
static void scene_ctrl(void) {
	gfx_vgrad(0, 0, SCREEN_W, SCREEN_H, 0x10182E, 0x2A1038);
	gfx_text_center(&np_font_title, 160, 30, "Controls", HEX(0xFFD34E), 256);
	static const char *const lines[] = {
		"Arrows:  Move / Attack",
		"OK:      Drink potion",
		"EXE:     Read scroll / View floor",
		"Shift:   Wait",
		"Back:    Pause / Menu",
		"Home:    Quit app",
	};
	for (int i = 0; i < 6; i++) {
		gfx_text(&np_font_body, 20, 60 + i * 22, lines[i], WHITE, 256);
	}
	gfx_text_center(&np_font_small, 160, 236, T("Back/OK: return"), HEX(0xA0A8D0), 256);
}
static void scene_forge(void) {
	gfx_vgrad(0, 0, SCREEN_W, SCREEN_H, 0x10182E, 0x2A1038);
	panel(20, 20, 280, 200);
	gfx_text_center(&np_font_title, 160, 40, "Forge", HEX(0xFFD34E), 256);
	char s[48];
	cati(cat(s, "Gold "), gold);
	gfx_text_right(&np_font_body, 284, 38, s, HEX(0xFFD34E), 256);
	static const char *const items[3] = {"Weapon +1 ATK (50g)", "Armor +1 DEF (75g)", "Heart +5 HP (100g)"};
	static const int costs[3] = {50, 75, 100};
	for (int i = 0; i < 3; i++) {
		int y = 64 + i * 36;
		bool can = gold >= costs[i] && (i == 0 ? weapon < 4 : i == 1 ? armor < 3 : true);
		if (sel == i) gfx_rrect(30, y, 260, 30, 8, HEX(0x3A4A90), 256);
		gfx_text(&np_font_small, 38, y + 18, items[i], can ? WHITE : HEX(0x8890B8), 256);
		if (!can) gfx_text_right(&np_font_small, 282, y + 18, "---", HEX(0x8890B8), 256);
		else {
			char cost_str[16];
			cati(cost_str, costs[i]);
			cat(cost_str, "g");
			gfx_text_right(&np_font_small, 282, y + 18, cost_str, can ? HEX(0xFFD34E) : HEX(0x8890B8), 256);
		}
	}
	gfx_text_center(&np_font_small, 160, 200, T("OK: buy    Back: leave"), HEX(0xA0A8D0), 256);
}
static void scene_library(void) {
	gfx_vgrad(0, 0, SCREEN_W, SCREEN_H, 0x10182E, 0x2A1038);
	panel(20, 20, 280, 200);
	gfx_text_center(&np_font_title, 160, 40, "Library", HEX(0xFFD34E), 256);
	char s[48];
	cati(cat(s, "Gold "), gold);
	gfx_text_right(&np_font_body, 284, 38, s, HEX(0xFFD34E), 256);
	static const char *const items[3] = {"2 Scrolls (25g)", "2 Potions (50g)", "Heart +3 HP (75g)"};
	static const int costs[3] = {25, 50, 75};
	for (int i = 0; i < 3; i++) {
		int y = 64 + i * 36;
		bool can = gold >= costs[i];
		if (sel == i) gfx_rrect(30, y, 260, 30, 8, HEX(0x3A4A90), 256);
		gfx_text(&np_font_small, 38, y + 18, items[i], can ? WHITE : HEX(0x8890B8), 256);
		if (!can) gfx_text_right(&np_font_small, 282, y + 18, "---", HEX(0x8890B8), 256);
		else {
			char cost_str[16];
			cati(cost_str, costs[i]);
			cat(cost_str, "g");
			gfx_text_right(&np_font_small, 282, y + 18, cost_str, can ? HEX(0xFFD34E) : HEX(0x8890B8), 256);
		}
	}
	gfx_text_center(&np_font_small, 160, 200, T("OK: buy    Back: leave"), HEX(0xA0A8D0), 256);
}
static void scene_quit(void) {
	gfx_vgrad(0, 0, SCREEN_W, SCREEN_H, 0x10182E, 0x2A1038);
	panel(50, 60, 220, 100);
	gfx_text_center(&np_font_title, 160, 80, "Quit?", HEX(0xFFD34E), 256);
	gfx_text_center(&np_font_body, 160, 110, "Progress will be saved.", WHITE, 256);
	gfx_text_center(&np_font_small, 160, 136, "OK: confirm    Back: cancel", HEX(0xA0A8D0), 256);
}
static void scene_over(void) {
	scene_play();
	if (state == ST_PLAY) return;
	gfx_fill_alpha(0, gfx_y0, SCREEN_W, gfx_y1 - gfx_y0, 0, 150);
	char s[40], *d;
	if (state == ST_TRADE) {
		panel(20, 14, 280, 212);
		gfx_text(&np_font_title, 36, 44, "Merchant", HEX(0xFFD34E), 256);
		cati(cat(s, "Gold "), gold);
		gfx_text_right(&np_font_body, 284, 42, s, HEX(0xFFD34E), 256);
		for (int i = 0; i < 5; i++) {
			int y = 56 + i * 32;
			bool ok = can_buy(i);
			if (sel == i) gfx_rrect(30, y, 260, 28, 8, HEX(0x3A4A90), 256);
			gfx_text(&np_font_small, 38, y + 18, WARES[i], ok ? WHITE : HEX(0x8890B8), 256);
			if (!stock[i] || (i == 3 && weapon >= 4) || (i == 4 && armor >= 3)) {
				gfx_text_right(&np_font_small, 282, y + 18, "sold out", HEX(0x8890B8), 256);
			} else {
				d = cat(cati(s, price(i)), "g");
				if (i == 0) cati(cat(d, " x"), stock[0]);
				gfx_text_right(&np_font_small, 282, y + 18, s, ok ? HEX(0xFFD34E) : HEX(0x8890B8), 256);
			}
		}
		gfx_text_center(&np_font_small, 160, 224, T("OK: buy    Back: leave"), HEX(0xA0A8D0), 256);
		return;
	}
	panel(50, 30, 220, 180);
	if (state == ST_PAUSE) {
		gfx_text_center(&np_font_title, 160, 76, T("Paused"), HEX(0xFFD34E), 256);
		char tmp[48];
		cati(cat(tmp, "Floor "), depth);
		gfx_text(&np_font_small, 60, 100, tmp, WHITE, 256);
		cati(cat(tmp, "Kills "), kills);
		gfx_text(&np_font_small, 60, 114, tmp, WHITE, 256);
		cati(cat(tmp, "Gold "), gold);
		gfx_text(&np_font_small, 60, 128, tmp, HEX(0xFFD34E), 256);
		cati(cat(tmp, "Time "), (now / 1000) / 60);
		cati(cat(tmp, "m "), (now / 1000) % 60);
		gfx_text(&np_font_small, 60, 142, tmp, WHITE, 256);
		gfx_text_center(&np_font_body, 160, 164, T("OK: resume"), WHITE, 256);
		gfx_text_center(&np_font_body, 160, 192, T("Back: save and quit"), WHITE, 220);
		gfx_text_center(&np_font_small, 160, 220, T("EXE: give up"), HEX(0xFF8080), 256);
		return;
	}
	if (state == ST_ALTAR) {
		gfx_text_center(&np_font_title, 160, 76, T("Blood altar"), HEX(0xFF6060), 256);
		gfx_text_center(&np_font_small, 160, 104, T("Give some of your blood for a gift?"), WHITE, 256);
		cati(cat(s, "Price: HP "), altar_cost());
		gfx_text_center(&np_font_body, 160, 134, s, HEX(0xFF8080), 256);
		gfx_text_center(&np_font_small, 160, 168, T("OK: pray    Back: leave"), HEX(0xA0A8D0), 256);
		return;
	}
	gfx_text_center(&np_font_title, 160, 76, won ? T("Victory!") : T("You died"), won ? HEX(0xFFD34E) : HEX(0xFF6060), 256);
	cati(cat(s, "Floor "), depth);
	gfx_text_center(&np_font_body, 160, 108, s, WHITE, 256);
	d = cati(cat(s, "Kills "), kills);
	cati(cat(d, "   Gold "), gold);
	gfx_text_center(&np_font_body, 160, 134, s, WHITE, 256);
	cati(cat(s, "Souls +"), gain);
	gfx_text_center(&np_font_body, 160, 166, s, HEX(0x8EC8FF), 256);
	gfx_text_center(&np_font_small, 160, 196, T("OK: continue"), HEX(0xA0A8D0), 256);
}
static void scene(void *ctx) {
	switch (state) {
	case ST_TITLE: scene_title(); break;
	case ST_SHOP: scene_shop(); break;
	case ST_ACH: scene_ach(); break;
	case ST_BEST: scene_best(); break;
	case ST_CTRL: scene_ctrl(); break;
	case ST_QUIT: scene_quit(); break;
	case ST_FORGE: scene_forge(); break;
	case ST_LIBRARY: scene_library(); break;
	default: scene_over(); break;
	}
}

int main(void) {
	np_app_begin();
	color_t *their_strip = gfx_buf;
	gfx_buf = strip;
	init_pal();
	save_load();
	seed = (uint32_t)eadk_timing_millis() | 1;
	state = ST_TITLE, sel = 0;
	build_menu();
	uint64_t held = eadk_keyboard_scan(); /* keys still down from the home screen wait to be let go */
	for (;;) {
		uint64_t k = eadk_keyboard_scan(), hit = k & ~held;
		held = k;
		now = (uint32_t)eadk_timing_millis();
		if (k & (KEY(eadk_key_home) | KEY(eadk_key_on_off))) break;
		if (state == ST_TITLE && (hit & KEY(eadk_key_back))) break;
		update(k, hit);
		calc_danger();
		gfx_render(scene, 0, 0, SCREEN_H);
		eadk_timing_msleep(12);
	}
	if (state == ST_PLAY || state == ST_PAUSE || state == ST_TRADE || state == ST_ALTAR) run_save(); /* back where you left */
	gfx_buf = their_strip;
	return np_app_end();
}
