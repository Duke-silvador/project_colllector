"""
Shot-based NHL model: expected goals (xG) from shot location and context, then mixed models on xG.

Step 1, xG: logistic regression on every unblocked shot attempt (on goal, missed, goal) in the training seasons:
    distance and angle to the net, power play / shorthanded, rebound (another attempt by the same team
    within 3 seconds), shot type when ESPN records it, score state, overtime. (ESPN only tags empty-net
    shots when they go in, so empty-net status is left out; otherwise xG would contain the goals themselves.)  xG of a shot = its chance of being a goal.

Step 2, two mixed models on regulation play, one row per team-game (Henderson's equations, REML, walk-forward
exactly like nhl_mixed_model.py):
  (a) chance creation:  xGF_ij = mu + home + b2b_off + b2b_def + O_i(season) + D_j(season) + e
        O = how much xG team i creates, D = how much team j allows (shot volume and quality together)
  (b) conversion:       goals_ij - xGF_ij = mu2 + F_i(season) + G_k(season) + e
        F = team i's finishing above expected, G = goalie k's goals allowed above expected (negative = good goalie)
  Expected regulation goals = predicted xGF + predicted conversion.  Then the same Poisson + overtime + calibration
  step as the original model turns expected goals into moneyline, puck line and total probabilities.

Why: goals are noisy (a team can outscore its chances for weeks); xG tracks the underlying play, so team strength and
pace estimates should settle faster and be less fooled by hot goalies and shooting streaks.
"""
import json
import numpy as np, pandas as pd
from scipy.optimize import minimize
import nhl_mixed_model as nm

NET_X = 89.0
STYPES = ["wrist", "snap", "slap", "backhand", "tip-in", "deflected", "wrap-around"]


# ---------------------------------------------------------------- step 1: expected goals
def shot_features(S):
    S = S.copy()
    S = S[S.event.isin(["shot", "missed", "goal"]) & (S.period <= 4) & (S.strength != "penalty-shot")].reset_index(drop=True)
    ax = S.x.abs().clip(upper=NET_X + 10)
    dx = (NET_X - ax).abs(); dy = S.y.astype(float)
    S["dist"] = np.sqrt(dx ** 2 + dy ** 2)
    S["angle"] = np.degrees(np.arctan2(dy.abs(), dx.clip(lower=0.5)))
    S = S.sort_values(["game_id", "period", "sec"]).reset_index(drop=True)
    same = (S.game_id == S.game_id.shift()) & (S.period == S.period.shift()) & (S.team == S.team.shift())
    S["rebound"] = (same & ((S.sec - S.sec.shift()) <= 3)).astype(int)
    return S


def design_xg(S, home_of):
    is_home = (S.team.values == S.game_id.map(home_of).values)
    diff = np.where(is_home, S.home_score - S.away_score, S.away_score - S.home_score)
    st = S.shot_type.fillna("").astype(str).str.lower()
    cols = dict(const=np.ones(len(S)), dist=S.dist / 10, dist2=(S.dist / 10) ** 2, angle=S.angle / 10,
                pp=(S.strength == "power-play").astype(float), sh=(S.strength == "short-handed").astype(float),
                rebound=S.rebound.astype(float),
                rebound_angle=S.rebound * S.angle / 10, ot=(S.period == 4).astype(float),
                leading=(diff > 0).astype(float), trailing=(diff < 0).astype(float), typed=(st != "").astype(float))
    for t in STYPES: cols[f"t_{t}"] = (st == t).astype(float)
    return pd.DataFrame(cols)


def fit_logistic(X, y, l2=1e-3):
    X = np.asarray(X, float); y = np.asarray(y, float)
    def f(b):
        z = X @ b; p = 1 / (1 + np.exp(-z))
        ll = np.sum(y * z - np.logaddexp(0, z)); g = X.T @ (y - p)
        return -ll + l2 * b @ b, -g + 2 * l2 * b
    return minimize(f, np.zeros(X.shape[1]), jac=True, method="L-BFGS-B").x


def xg_model(S, games, train_seasons):
    """fit xG on the training seasons' shots; returns (coef, column names, home lookup)"""
    home_of = dict(zip(games.game_id, games.home))
    season_of = dict(zip(games.game_id, games.season))
    F = shot_features(S)
    tr = F[F.game_id.map(season_of).isin(train_seasons)]
    X = design_xg(tr, home_of)
    b = fit_logistic(X.values, (tr.event == "goal").values)
    return dict(coef=b.tolist(), cols=list(X.columns))


def apply_xg(S, games, xm):
    home_of = dict(zip(games.game_id, games.home))
    F = shot_features(S)
    X = design_xg(F, home_of)[xm["cols"]].values
    F["xg"] = 1 / (1 + np.exp(-(X @ np.array(xm["coef"]))))
    return F


def team_game_xg(F, games):
    """regulation xG and unblocked attempts per team-game, home and away columns"""
    r = F[F.period <= 3].groupby(["game_id", "team"]).agg(xg=("xg", "sum"), att=("xg", "size")).reset_index()
    g = games[["game_id", "home", "away"]]
    h = g.merge(r, left_on=["game_id", "home"], right_on=["game_id", "team"], how="left")[["game_id", "xg", "att"]]
    a = g.merge(r, left_on=["game_id", "away"], right_on=["game_id", "team"], how="left")[["game_id", "xg", "att"]]
    out = g[["game_id"]].copy()
    out["home_xg"], out["home_att"] = h.xg.values, h.att.values
    out["away_xg"], out["away_att"] = a.xg.values, a.att.values
    return out


# ---------------------------------------------------------------- step 2: generic mixed model
def rows(G, mode="pretip"):
    """two rows per game, both models: scoring team's regulation xG and goals"""
    suf = "_open" if mode == "open" else ""
    def side(o, d, h):
        return pd.DataFrame({"gid": G.index, "xg": G[f"{o}_xg"], "goals": G[f"{o}_reg"], "off": G[o], "def": G[d], "home": h,
                             "b2b_off": G[f"b2b_{o}"], "b2b_def": G[f"b2b_{d}"], "season": G.season, "date": G.date,
                             "miss_off": G[f"{o}_miss_off{suf}"].fillna(0.0), "goalie": G[f"{d}_goalie"], "gmix": G[f"{d}_gmix"]})
    return pd.concat([side("home", "away", 1), side("away", "home", 0)], ignore_index=True)


def X_a(L): return np.column_stack([np.ones(len(L)), L.home, L.b2b_off, L.b2b_def, L.miss_off]).astype(float)
def X_b(L): return np.ones((len(L), 1))


def zblocks(L, blocks):
    """blocks: list of (column, key function) -> Z with one indicator block per random effect, and index maps"""
    Zs, idx = [], []
    for col, keyf in blocks:
        keys = sorted(set(k for k in keyf(L) if k is not None))
        ix = {k: i for i, k in enumerate(keys)}
        Z = np.zeros((len(L), len(keys)))
        kk = keyf(L)
        r = [i for i, k in enumerate(kk) if k is not None]
        Z[r, [ix[kk[i]] for i in r]] = 1
        Zs.append(Z); idx.append(ix)
    return Zs, idx


def neg2_reml(log_a, X, Zs, y):
    a = np.exp(log_a); n, p = X.shape
    Z = np.hstack(Zs); W = np.hstack([X, Z]); C = W.T @ W
    pen = np.concatenate([np.full(z.shape[1], ai) for z, ai in zip(Zs, a)])
    C[p:, p:] += np.diag(pen)
    rhs = W.T @ y; sol = np.linalg.solve(C, rhs)
    s2e = (y @ y - sol @ rhs) / (n - p)
    return (n - p) * np.log(s2e) - sum(z.shape[1] * np.log(ai) for z, ai in zip(Zs, a)) + np.linalg.slogdet(C)[1]


def fit(X, Zs, y):
    res = minimize(neg2_reml, np.log(np.full(len(Zs), 20.0)), args=(X, Zs, y), method="Nelder-Mead",
                   options={"xatol": 1e-4, "fatol": 1e-4, "maxiter": 800})
    a = np.exp(res.x); p = X.shape[1]
    Z = np.hstack(Zs); W = np.hstack([X, Z]); C = W.T @ W
    C[p:, p:] += np.diag(np.concatenate([np.full(z.shape[1], ai) for z, ai in zip(Zs, a)]))
    sol = np.linalg.solve(C, W.T @ y); b, u = sol[:p], sol[p:]
    resid = y - X @ b - Z @ u; s2e = resid @ resid / (len(y) - p)
    out, k = [], 0
    for z in Zs: out.append(u[k:k + z.shape[1]]); k += z.shape[1]
    return dict(a=a, b=b, u=out, s2e=s2e, sd=[(s2e / ai) ** .5 for ai in a])


def solve_known_b(X, Zs, y, a, b, prior, w=None):
    """random effects only (fixed effects frozen), shrunk toward prior means"""
    Z = np.hstack(Zs); w = np.ones(len(y)) if w is None else w
    pen = np.concatenate([np.full(z.shape[1], ai) for z, ai in zip(Zs, a)])
    r = y - X @ b - Z @ prior
    u = np.linalg.solve((Z.T * w) @ Z + np.diag(pen), (Z.T * w) @ r) + prior
    return u


def carry(prev, cur):
    """rho: regression of this season's effects on last season's (same key)"""
    pairs = [(prev[k], v) for k, v in cur.items() if k in prev]
    if not pairs: return 0.0
    p = np.array(pairs); return float(p[:, 0] @ p[:, 1] / (p[:, 0] @ p[:, 0]))


# ---------------------------------------------------------------- training + walk-forward
def fit_block(df, train_seasons):
    tr = df[df.season.isin(train_seasons)].reset_index(drop=True)
    L = rows(tr); L = L[L.goals.notna() & L.xg.notna()].reset_index(drop=True)
    L["resid"] = L.goals - L.xg
    ka = [("off", lambda L: list(zip(L.season, L.off))), ("def", lambda L: list(zip(L.season, L["def"])))]
    kb = [("off", lambda L: list(zip(L.season, L.off))),
          ("goalie", lambda L: [(s, int(g)) if not pd.isna(g) else None for s, g in zip(L.season, L.goalie)])]
    Za, ia = zblocks(L, ka); Zb, ib = zblocks(L, kb)
    fa = fit(X_a(L), Za, L.xg.values.astype(float)); fb = fit(X_b(L), Zb, L.resid.values.astype(float))
    eff = lambda f, ix, j: {k: f["u"][j][i] for k, i in ix[j].items()}
    E = dict(O=eff(fa, ia, 0), D=eff(fa, ia, 1), F=eff(fb, ib, 0), G=eff(fb, ib, 1))
    ss = sorted(train_seasons); rho = {}
    for name in E:
        pr = []
        for s0, s1 in zip(ss, ss[1:]):
            prev = {k[1]: v for k, v in E[name].items() if k[0] == s0}; cur = {k[1]: v for k, v in E[name].items() if k[0] == s1}
            pr += [(prev[k], v) for k, v in cur.items() if k in prev]
        p = np.array(pr); rho[name] = float(p[:, 0] @ p[:, 1] / (p[:, 0] @ p[:, 0])) if len(p) else 0.0
    return fa, fb, E, rho


def walk_forward(G, E, rho, fa, fb, prev_season, half_life, modes=("pretip", "open"), lag_days=0, adapt=None):
    G = G.sort_values("date").reset_index(drop=True)
    last = lambda name: {k[1]: v for k, v in E[name].items() if k[0] == prev_season}
    teams = sorted(set(G.home) | set(G.away)); ti = {t: i for i, t in enumerate(teams)}; q = len(teams)
    gl = set(int(k) for k in last("G"))
    for c in ("home_goalie", "away_goalie"): gl |= set(int(x) for x in G[c].dropna())
    for c in ("home_gmix", "away_gmix"):
        for s in G[c].dropna(): gl |= set(int(k) for k in json.loads(s))
    goalies = sorted(gl); gi = {k: i for i, k in enumerate(goalies)}
    pa = np.r_[[rho["O"] * last("O").get(t, 0) for t in teams], [rho["D"] * last("D").get(t, 0) for t in teams]]
    pb = np.r_[[rho["F"] * last("F").get(t, 0) for t in teams], [rho["G"] * last("G").get(k, 0) for k in goalies]]
    Lm = {m: rows(G, m) for m in modes}; Lp = Lm["pretip"]
    b_cur = np.array(fa["b"], dtype=float)
    preds = []
    for d in sorted(G.date.unique()):
        past = Lp[(Lp.date < d - pd.Timedelta(days=lag_days)) & Lp.goals.notna() & Lp.xg.notna()]
        if len(past):
            n = len(past); r = np.arange(n)
            Zo = np.zeros((n, q)); Zo[r, past.off.map(ti).values] = 1
            Zd = np.zeros((n, q)); Zd[r, past["def"].map(ti).values] = 1
            Zg = np.zeros((n, len(goalies))); ok = past.goalie.notna().values
            Zg[r[ok], past.goalie[ok].astype(int).map(gi).values] = 1
            w = 0.5 ** ((d - past.date).dt.days.values / half_life) if half_life else None
            if adapt is None or adapt[1] is None:
                ua = solve_known_b(X_a(past), [Zo, Zd], past.xg.values.astype(float), fa["a"], fa["b"], pa, w)
            else:          # re-estimate some chance-creation fixed effects (1 home, 2/3 back-to-back) during the season
                pen = np.r_[np.full(q, fa["a"][0]), np.full(q, fa["a"][1])]
                ba, ua = nm.solve_partial(X_a(past), np.hstack([Zo, Zd]), past.xg.values.astype(float), pen, np.asarray(fa["b"]), adapt[0], adapt[1], w, pa)
                b_cur[:] = ba
            ub = solve_known_b(X_b(past), [Zo, Zg], (past.goals - past.xg).values.astype(float), fb["a"], fb["b"], pb, w)
        else:
            ua, ub = pa, pb
        O, D, Fi, GG = ua[:q], ua[q:], ub[:q], ub[q:]
        gval = lambda k: GG[gi[int(k)]] if int(k) in gi else 0.0
        day = {}
        for m in modes:
            T = Lm[m][Lm[m].date == d]
            xa = X_a(T) @ b_cur
            for gid, ih, v, off, df_, gk, gm in zip(T.gid, T.home, xa, T.off, T["def"], T.goalie, T.gmix):
                if m == "pretip" and not pd.isna(gk): gv = gval(gk)
                else:
                    mix = json.loads(gm) if isinstance(gm, str) else {}
                    gv = sum(wt * gval(k) for k, wt in mix.items())
                xg_hat = v + O[ti[off]] + D[ti[df_]]
                day[(m, gid, ih)] = (xg_hat + fb["b"][0] + Fi[ti[off]] + gv, xg_hat)
        for i in G.index[G.date == d]:
            rec = dict(i=i)
            for m in modes:
                s = "" if m == "pretip" else "_open"
                rec[f"lam_home{s}"], rec[f"xg_home{s}"] = day[(m, i, 1)]
                rec[f"lam_away{s}"], rec[f"xg_away{s}"] = day[(m, i, 0)]
            preds.append(rec)
    return G.join(pd.DataFrame(preds).set_index("i")), dict(goalies=dict(zip(goalies, GG)), F=dict(zip(teams, Fi)),
                                                           O=dict(zip(teams, O)), D=dict(zip(teams, D)))


def run(df, train_seasons, test_season, halflives=(None, 60, 30), tot_cal="none", lag_days=0, adapt_idx=None, adapt_grid=(None,), cal_seasons=1):
    """df: training_games rows plus home_xg/away_xg columns. Same outputs as nhl_mixed_model.run."""
    df = df.copy(); df["date"] = pd.to_datetime(df.date)
    df = pd.concat([nm.add_rest(df[df.season == s]) for s in sorted(df.season.unique())], ignore_index=True)
    ss = sorted(train_seasons)
    fa, fb, E, rho = fit_block(df, ss)
    tr = df[df.season.isin(ss) & df.home_goals.notna()]
    h_ot = float(((tr.home_reg == tr.away_reg) & (tr.home_goals > tr.away_goals)).sum() / max((tr.home_reg == tr.away_reg).sum(), 1))
    val_s = ss[-1]
    # validation walk-forward uses effects estimated with the validation season included (as the original model does)
    tune, val = {}, {}
    for h_ in halflives:
        for n0 in adapt_grid:
            ad = (adapt_idx, n0) if adapt_idx else None
            Pv, _ = walk_forward(df[df.season == val_s], E, rho, fa, fb, ss[-2], h_, lag_days=lag_days, adapt=ad)
            tune[f"{h_}|{n0}"] = float((((Pv.lam_home - Pv.home_reg) ** 2).mean() + ((Pv.lam_away - Pv.away_reg) ** 2).mean()) ** .5)
            val[(h_, n0)] = Pv
    hl, n0_best = min(val, key=lambda k: tune[f"{k[0]}|{k[1]}"]); Pv = val[(hl, n0_best)]
    adapt = (adapt_idx, n0_best) if adapt_idx else None
    if cal_seasons >= 2 and len(ss) >= 3:
        Pv2, _ = walk_forward(df[df.season == ss[-2]], E, rho, fa, fb, ss[-3], hl, lag_days=lag_days, adapt=adapt)
        Pv = pd.concat([Pv2, Pv], ignore_index=True)
    cal = {}
    for suf, m in (("", "pretip"), ("_open", "open")):
        r = nm.raw_probs(Pv[f"lam_home{suf}"].values, Pv[f"lam_away{suf}"].values, h_ot)
        mg = (Pv.home_goals - Pv.away_goals).values; tot = (Pv.home_goals + Pv.away_goals).values
        cal[m] = dict(ml=nm.fit_calibration(r["home_win"], mg > 0),
                      by2=nm.fit_calibration(np.r_[r["home_by2"], r["away_by2"]], np.r_[mg >= 2, mg <= -2]),
                      over=nm.fit_calibration(np.r_[r["over_5.5"], r["over_6.5"]], np.r_[tot > 5.5, tot > 6.5]) if tot_cal == "pooled" else None,
                      over_lines={str(T): nm.fit_calibration(r[f"over_{T}"], tot > T) for T in (5.5, 6.5)} if tot_cal == "per_line" else None)
    Pt, eff_now = walk_forward(df[df.season == test_season], E, rho, fa, fb, val_s, hl, lag_days=lag_days, adapt=adapt)
    Pt = nm.add_probs(Pt, h_ot, cal)
    summary = dict(train_seasons=ss, test_season=test_season, fixed_xg=np.round(fa["b"], 4).tolist(), conv_intercept=float(fb["b"][0]),
                   sd_xg_offense=fa["sd"][0], sd_xg_defense=fa["sd"][1], sd_finishing=fb["sd"][0], sd_goalie=fb["sd"][1],
                   sd_resid_xg=fa["s2e"] ** .5, sd_resid_conv=fb["s2e"] ** .5, rho=rho, h_ot=h_ot, halflife=hl, adapt_n0=n0_best, tune=tune)
    return summary, Pt, dict(h_ot=h_ot, cal=cal, c_miss=float(fa["b"][4]), effects=eff_now, hl=hl)
