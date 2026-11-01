"""
NHL moneyline / puck line / total mixed model with walk-forward backtest.

Model (one row per team-game, i.e. two rows per game), response = REGULATION goals (periods 1-3):
    goals_ij = mu + b_home*home + b_b2b_off*b2b_i + b_b2b_def*b2b_j + b_miss*miss_off_i
               + O_i(season) + D_j(season) + G_k(season) + e
  O = offensive team-season random effect, D = defensive team-season random effect,
  G = goalie-season random effect for team j's starting goalie k (goals he allows above/below average),
  each ~ N(rho * last season's effect, s2), e ~ N(0, s2_e)

Variance components by REML on the training seasons (Henderson's mixed model equations, the same machinery
as BLUP in animal breeding, here with three random effects). In the test season the variance components and
fixed effects are frozen, and team and goalie effects are re-solved each game day using ONLY earlier games
(no lookahead), with recent games weighted more (half-life tuned on the last training season).

From predicted regulation goals (lam_home, lam_away) the score is treated as two Poisson counts; a regulation
tie goes to overtime/shootout, which the home team wins with probability h_ot, adding one goal to the winner.
That gives win probability (moneyline), P(win by 2+) (puck line) and the distribution of the final total.
Each probability is then calibrated (logistic, fit on the last training season's walk-forward predictions),
because empty-net goals make 2-goal margins more common than Poisson says.

A bet is a side whose expected value at the posted price, p * decimal_odds - 1, is at least the threshold.

Two prediction modes for every game:
  open   = what is known the day before: expected goalie mix, skaters who missed the previous game
  pretip = confirmed starting goalie and the actual lineup (what closing lines know)
"""
import sys, json
import numpy as np, pandas as pd
from scipy.optimize import minimize
from scipy.stats import poisson

H_OT_DEFAULT = 0.51
MAXG = 13


# ---------------------------------------------------------------- data prep
def add_rest(df):
    df = df.sort_values("date").reset_index(drop=True)
    last = {}
    b2b_h, b2b_a = [], []
    for d, h, a in zip(df.date, df.home, df.away):
        b2b_h.append(int(h in last and (d - last[h]).days == 1))
        b2b_a.append(int(a in last and (d - last[a]).days == 1))
        last[h] = d; last[a] = d
    df["b2b_home"], df["b2b_away"] = b2b_h, b2b_a
    return df


def long_rows(g, mode="pretip"):
    """two rows per game: scoring team's regulation goals vs the opponent and the opponent's goalie"""
    suf = "_open" if mode == "open" else ""
    def side(o, d, h):
        return pd.DataFrame({"gid": g.index, "goals": g[f"{o}_reg"], "off": g[o], "def": g[d], "home": h,
                             "b2b_off": g[f"b2b_{o}"], "b2b_def": g[f"b2b_{d}"], "season": g.season, "date": g.date,
                             "miss_off": g[f"{o}_miss_off{suf}"].fillna(0.0), "goalie": g[f"{d}_goalie"],
                             "gmix": g[f"{d}_gmix"]})
    return pd.concat([side("home", "away", 1), side("away", "home", 0)], ignore_index=True)


def xmat(L):
    return np.column_stack([np.ones(len(L)), L.home, L.b2b_off, L.b2b_def, L.miss_off]).astype(float)


def design(L, teams_by_season, goalies_by_season):
    X = xmat(L)
    keys = [(s, t) for s in sorted(teams_by_season) for t in teams_by_season[s]]
    gkeys = [(s, k) for s in sorted(goalies_by_season) for k in goalies_by_season[s]]
    idx = {k: i for i, k in enumerate(keys)}; gidx = {k: i for i, k in enumerate(gkeys)}
    q, qg = len(keys), len(gkeys)
    Z = np.zeros((len(L), 2 * q + qg)); r = np.arange(len(L))
    Z[r, [idx[(s, t)] for s, t in zip(L.season, L.off)]] = 1
    Z[r, [q + idx[(s, t)] for s, t in zip(L.season, L["def"])]] = 1
    ok = L.goalie.notna().values
    Z[r[ok], [2 * q + gidx[(s, int(k))] for s, k in zip(L.season[ok], L.goalie[ok])]] = 1
    return X, Z, keys, gkeys


# ---------------------------------------------------------------- MME / REML
def penalty(q, qg, a):
    return np.r_[np.full(q, a[0]), np.full(q, a[1]), np.full(qg, a[2])]


def solve_mme(X, Z, y, q, a, w=None, z_prior=None, fixed=None):
    """Henderson MME. a = (a_off, a_def, a_goalie) = s2_e / s2_component. Optional weights, prior means for u,
    and fixed effects held constant (test season)."""
    w = np.ones(len(y)) if w is None else w
    A = penalty(q, Z.shape[1] - 2 * q, a)
    yy = y - (Z @ z_prior if z_prior is not None else 0)
    if fixed is not None:
        r = yy - X @ fixed
        u = np.linalg.solve((Z.T * w) @ Z + np.diag(A), (Z.T * w) @ r)
        return fixed, u + (0 if z_prior is None else z_prior)
    W = np.hstack([X, Z]); p = X.shape[1]
    C = (W.T * w) @ W; C[p:, p:] += np.diag(A)
    sol = np.linalg.solve(C, (W.T * w) @ yy)
    return sol[:p], sol[p:] + (0 if z_prior is None else z_prior)


def neg2_reml(log_a, X, Z, y, q):
    a = np.exp(log_a); n, p = X.shape; qg = Z.shape[1] - 2 * q
    W = np.hstack([X, Z]); C = W.T @ W; C[p:, p:] += np.diag(penalty(q, qg, a))
    rhs = W.T @ y; sol = np.linalg.solve(C, rhs)
    s2e = (y @ y - sol @ rhs) / (n - p)
    return (n - p) * np.log(s2e) - q * np.log(a[0]) - q * np.log(a[1]) - qg * np.log(a[2]) + np.linalg.slogdet(C)[1]


def fit_reml(X, Z, y, q):
    res = minimize(neg2_reml, x0=np.log([30.0, 30.0, 30.0]), args=(X, Z, y, q), method="Nelder-Mead",
                   options={"xatol": 1e-4, "fatol": 1e-4, "maxiter": 600})
    a = np.exp(res.x)
    b, u = solve_mme(X, Z, y, q, a)
    resid = y - X @ b - Z @ u
    s2e = resid @ resid / (len(y) - X.shape[1])
    return dict(a=a, s2e=s2e, s2=(s2e / a).tolist(), b=b, u=u)


def solve_partial(X, Z, y, pen, b0, idx, n0, w=None, prior=None):
    """Random effects plus SOME fixed effects re-estimated from these games (columns idx, e.g. home ice and back-to-backs),
    each shrunk toward its training value b0 with the weight of n0 team-game rows; the other fixed effects stay at b0.
    Lets in-season home-ice or fatigue effects drift from the training seasons' values as evidence builds."""
    w = np.ones(len(y)) if w is None else w
    idx = list(idx); keep = [j for j in range(X.shape[1]) if j not in idx]
    yy = y - X[:, keep] @ b0[keep] - (Z @ prior if prior is not None else 0)
    Wm = np.hstack([X[:, idx], Z]); C = (Wm.T * w) @ Wm
    k = len(idx); C[:k, :k] += np.eye(k) * n0; C[k:, k:] += np.diag(pen)
    rhs = (Wm.T * w) @ yy; rhs[:k] += n0 * b0[idx]
    sol = np.linalg.solve(C, rhs)
    b = b0.copy(); b[idx] = sol[:k]
    return b, sol[k:] + (0 if prior is None else prior)


# ---------------------------------------------------------------- probabilities
def score_matrix(lh, la):
    """P(home regulation goals = i, away = j), arrays of shape (n, MAXG, MAXG)"""
    lh = np.clip(np.asarray(lh, float), 0.3, 8); la = np.clip(np.asarray(la, float), 0.3, 8)
    k = np.arange(MAXG)
    ph = poisson.pmf(k[None, :], lh[:, None]); pa = poisson.pmf(k[None, :], la[:, None])
    return ph[:, :, None] * pa[:, None, :]


def raw_probs(lh, la, h_ot=H_OT_DEFAULT, totals=(5.5, 6.5)):
    """home win, home by 2+, away by 2+, and P(final total > T) for each T (ties after regulation add one goal)"""
    M = score_matrix(lh, la); k = np.arange(MAXG)
    diff = k[:, None] - k[None, :]; tot = k[:, None] + k[None, :]
    tie = (M * (diff == 0)).sum((1, 2))
    out = dict(home_win=(M * (diff > 0)).sum((1, 2)) + tie * h_ot,
               home_by2=(M * (diff >= 2)).sum((1, 2)), away_by2=(M * (diff <= -2)).sum((1, 2)), tie=tie)
    final = tot + (diff == 0)
    for T in totals:
        out[f"over_{T}"] = (M * (final > T)).sum((1, 2)); out[f"push_{T}"] = (M * (final == T)).sum((1, 2))
    return out


def logit(p): p = np.clip(p, 1e-6, 1 - 1e-6); return np.log(p / (1 - p))
def expit(x): return 1 / (1 + np.exp(-x))


def fit_calibration(x, y):
    """logistic recalibration y ~ a + b*logit(x)"""
    from scipy.optimize import minimize as mn
    z = logit(np.asarray(x)); y = np.asarray(y, float)
    f = lambda t: -np.sum(y * np.log(expit(t[0] + t[1] * z) + 1e-12) + (1 - y) * np.log(1 - expit(t[0] + t[1] * z) + 1e-12))
    return mn(f, [0.0, 1.0], method="Nelder-Mead").x.tolist()


def calibrate(p, c): return expit(c[0] + c[1] * logit(p))


def over_prob(lh, la, T, h_ot, cal):
    """calibrated P(over T), P(under T) for any line T (integer lines can push)"""
    M = score_matrix(lh, la); k = np.arange(MAXG)
    diff = k[:, None] - k[None, :]; final = k[:, None] + k[None, :] + (diff == 0)
    T = np.asarray(T, float)
    po = (M * (final[None] > T[:, None, None])).sum((1, 2)); pp = (M * (final[None] == T[:, None, None])).sum((1, 2))
    pu = 1 - po - pp
    cond = po / np.clip(po + pu, 1e-9, None)
    if cal.get("over_lines"):                      # separate calibration for each common line (nearest one for others)
        keys = np.array(sorted(float(k) for k in cal["over_lines"]))
        near = keys[np.abs(T[:, None] - keys[None, :]).argmin(1)]
        cc = np.array([cal["over_lines"][str(k)] for k in near])
        cond = expit(cc[:, 0] + cc[:, 1] * logit(cond))
    elif cal.get("over"):
        cond = calibrate(cond, cal["over"])
    po_c = cond * (1 - pp)
    return po_c, (1 - pp) - po_c, pp


def market_probs(lh, la, h_ot, cal):
    r = raw_probs(lh, la, h_ot)
    return dict(home_win=calibrate(r["home_win"], cal["ml"]),
                home_by2=calibrate(r["home_by2"], cal["by2"]), away_by2=calibrate(r["away_by2"], cal["by2"]))


# ---------------------------------------------------------------- walk-forward season
def walk_forward(G, prev_O, prev_D, prev_G, fit, rho, half_life, modes=("pretip", "open"), lag_days=0, adapt=None):
    """Predict each game of one season using only earlier games of that season, shrinking toward
    rho * last season's effects. Returns lam_home/lam_away for each mode."""
    G = G.sort_values("date").reset_index(drop=True)
    teams = sorted(set(G.home) | set(G.away)); t_idx = {t: i for i, t in enumerate(teams)}; q = len(teams)
    gl = set(int(k) for k in prev_G)
    for c in ("home_goalie", "away_goalie"): gl |= set(int(x) for x in G[c].dropna())
    for c in ("home_gmix", "away_gmix"):
        for s in G[c].dropna(): gl |= set(int(k) for k in json.loads(s))
    goalies = sorted(gl); g_idx = {k: i for i, k in enumerate(goalies)}; qg = len(goalies)
    prior = np.r_[[rho[0] * prev_O.get(t, 0.0) for t in teams], [rho[1] * prev_D.get(t, 0.0) for t in teams],
                  [rho[2] * prev_G.get(k, 0.0) for k in goalies]]
    b = fit["b"].copy(); b0 = fit["b"].copy()
    L = {m: long_rows(G, m) for m in modes}
    Lp = L["pretip"] if "pretip" in L else long_rows(G, "pretip")
    preds = []
    for d in sorted(G.date.unique()):
        past = Lp[(Lp.date < d - pd.Timedelta(days=lag_days)) & Lp.goals.notna()]     # lag_days=1: results known when the line opens
        if len(past):
            Z = np.zeros((len(past), 2 * q + qg)); r = np.arange(len(past))
            Z[r, past.off.map(t_idx).values] = 1; Z[r, q + past["def"].map(t_idx).values] = 1
            ok = past.goalie.notna().values
            Z[r[ok], 2 * q + past.goalie[ok].astype(int).map(g_idx).values] = 1
            age = (d - past.date).dt.days.values
            w = 0.5 ** (age / half_life) if half_life else None
            if adapt is None or adapt[1] is None:
                _, u = solve_mme(xmat(past), Z, past.goals.values.astype(float), q, fit["a"], w=w, z_prior=prior, fixed=b0)
            else:            # adapt = (fixed-effect columns to re-estimate in season, shrinkage weight n0)
                b, u = solve_partial(xmat(past), Z, past.goals.values.astype(float), penalty(q, qg, fit["a"]), b0, adapt[0], adapt[1], w, prior)
        else:
            u = prior
        O, D, GG = u[:q], u[q:2 * q], u[2 * q:]
        gval = lambda k: GG[g_idx[int(k)]] if int(k) in g_idx else 0.0
        day = {}
        for m in modes:
            today = L[m][L[m].date == d]
            xb = xmat(today) @ b
            for gid, ih, v, off, df_, gk, gm in zip(today.gid, today.home, xb, today.off, today["def"], today.goalie, today.gmix):
                if m == "pretip" and not pd.isna(gk): gv = gval(gk)
                else:
                    mix = json.loads(gm) if isinstance(gm, str) else {}
                    gv = sum(wt * gval(k) for k, wt in mix.items())
                day[(m, gid, ih)] = (v + O[t_idx[off]] + D[t_idx[df_]] + gv, v, gv)
        for i in G.index[G.date == d]:
            rec = dict(i=i)
            for m in modes:
                suf = "" if m == "pretip" else "_open"
                rec[f"lam_home{suf}"] = day[(m, i, 1)][0]; rec[f"lam_away{suf}"] = day[(m, i, 0)][0]
            preds.append(rec)
    P = pd.DataFrame(preds).set_index("i")
    return G.join(P), dict(teams=teams, O=dict(zip(teams, O)), D=dict(zip(teams, D)), goalies=dict(zip(goalies, GG)))


def add_probs(P, h_ot, cal):
    for suf in ("", "_open"):
        if f"lam_home{suf}" not in P: continue
        lh, la = P[f"lam_home{suf}"].values, P[f"lam_away{suf}"].values
        mp = market_probs(lh, la, h_ot, cal["open" if suf else "pretip"])
        for k, v in mp.items(): P[f"p_{k}{suf}"] = v
        r = raw_probs(lh, la, h_ot)
        P[f"pred_margin{suf}"] = lh - la + (2 * h_ot - 1) * r["tie"]          # expected final goal margin
        P[f"pred_total{suf}"] = lh + la + r["tie"]                            # expected final total
    return P


# ---------------------------------------------------------------- betting evaluation
def dec(odds):
    o = np.asarray(odds, float); return np.where(o > 0, 1 + o / 100, 1 + 100 / np.abs(o))


def bets(P, lines, suf="", cal=None, h_ot=H_OT_DEFAULT):
    """For each game and market, the side with the larger expected value at the given lines.
    lines: prefix for columns {pre}_home_ml, {pre}_away_ml, {pre}_home_pl, {pre}_home_pl_odds, {pre}_away_pl_odds,
    {pre}_total, {pre}_over_odds, {pre}_under_odds. Returns long table: market, side, price, line, p, ev, result, profit."""
    out = []
    hg, ag = P.home_goals.values, P.away_goals.values
    margin = hg - ag; total = hg + ag
    ph, pa = P[f"p_home_win{suf}"].values, 1 - P[f"p_home_win{suf}"].values
    # moneyline
    dh, da = dec(P[f"{lines}_home_ml"]), dec(P[f"{lines}_away_ml"])
    for side, p, d, won in (("home", ph, dh, margin > 0), ("away", pa, da, margin < 0)):
        out.append(pd.DataFrame(dict(idx=P.index, market="moneyline", side=side, line=np.nan, price=P[f"{lines}_{side}_ml"],
                                     p=p, ev=p * d - 1, win=np.where(np.isnan(margin), np.nan, won.astype(float)), push=0.0, dec=d)))
    # puck line: home line is -1.5 or +1.5
    hl = P[f"{lines}_home_pl"].values
    p_home_cover = np.where(hl < 0, P[f"p_home_by2{suf}"].values, 1 - P[f"p_away_by2{suf}"].values)
    home_cover = np.where(hl < 0, margin >= 2, margin >= -1).astype(float)
    for side, p, odds, won, ln in (("home", p_home_cover, P[f"{lines}_home_pl_odds"], home_cover, hl),
                                   ("away", 1 - p_home_cover, P[f"{lines}_away_pl_odds"], 1 - home_cover, -hl)):
        d = dec(odds)
        out.append(pd.DataFrame(dict(idx=P.index, market="puck line", side=side, line=ln, price=odds, p=p, ev=p * d - 1,
                                     win=np.where(np.isnan(margin) | np.isnan(hl), np.nan, won), push=0.0, dec=d)))
    # total
    T = P[f"{lines}_total"].values; okT = ~np.isnan(T)
    po = np.full(len(P), np.nan); pu = po.copy(); pp = po.copy()
    if okT.any():
        a, b_, c = over_prob(P[f"lam_home{suf}"].values[okT], P[f"lam_away{suf}"].values[okT], T[okT], h_ot, cal)
        po[okT], pu[okT], pp[okT] = a, b_, c
    for side, p, odds, won in (("over", po, P[f"{lines}_over_odds"], total > T), ("under", pu, P[f"{lines}_under_odds"], total < T)):
        d = dec(odds)
        out.append(pd.DataFrame(dict(idx=P.index, market="total", side=side, line=T, price=odds, p=p, ev=p * d + pp - 1,
                                     win=np.where(np.isnan(total) | np.isnan(T), np.nan, won.astype(float)),
                                     push=(total == T).astype(float), dec=d)))
    Bt = pd.concat(out, ignore_index=True)
    Bt = Bt.dropna(subset=["ev"]).sort_values("ev", ascending=False).drop_duplicates(["idx", "market"])
    Bt["profit"] = np.where(Bt.push == 1, 0.0, np.where(Bt.win == 1, Bt.dec - 1, -1.0))
    Bt.loc[Bt.win.isna(), "profit"] = np.nan
    return Bt


def evaluate(Bt, thresholds=(0, 0.02, 0.04, 0.06, 0.08, 0.10)):
    out = {}
    for mk in ("moneyline", "puck line", "total"):
        rows = []
        for t in thresholds:
            s = Bt[(Bt.market == mk) & (Bt.ev >= t) & Bt.profit.notna()]
            w, l, pu = int((s.profit > 0).sum()), int((s.profit < 0).sum()), int((s.profit == 0).sum())
            rows.append(dict(ev_threshold=t, bets=w + l, wins=w, losses=l, pushes=pu, win_pct=round(w / (w + l), 4) if w + l else None,
                             avg_price=round(float(s.price.median()), 0) if len(s) else None,
                             units=round(float(s.profit.sum()), 2), roi=round(float(s.profit.sum()) / (w + l), 4) if w + l else None))
        out[mk] = rows
    return out


# ---------------------------------------------------------------- driver
def fit_season_block(df, train_seasons):
    tr = df[df.season.isin(train_seasons)].reset_index(drop=True)
    L = long_rows(tr, "pretip"); L = L[L.goals.notna()].reset_index(drop=True)
    tbs = {s: sorted(set(tr[tr.season == s].home) | set(tr[tr.season == s].away)) for s in train_seasons}
    gbs = {s: sorted(set(int(x) for x in L[L.season == s].goalie.dropna())) for s in train_seasons}
    X, Z, keys, gkeys = design(L, tbs, gbs)
    q = len(keys)
    fit = fit_reml(X, Z, L.goals.values.astype(float), q)
    O = {k: fit["u"][i] for i, k in enumerate(keys)}; D = {k: fit["u"][q + i] for i, k in enumerate(keys)}
    GG = {k: fit["u"][2 * q + i] for i, k in enumerate(gkeys)}
    return fit, O, D, GG, tbs


def slope(p):
    p = np.array(p); return float(p[:, 0] @ p[:, 1] / (p[:, 0] @ p[:, 0])) if len(p) else 0.0


def run(df, train_seasons, test_season, halflives=(None, 60, 30, 15), lines=("open", "close"), lag_days=0,
        adapt_idx=None, adapt_grid=(None,), cal_seasons=1):
    """adapt_idx: fixed effects (column numbers in xmat: 1 home, 2/3 back-to-back) to re-estimate during the season,
    with the shrinkage weight chosen from adapt_grid on the last training season. cal_seasons: how many of the last
    training seasons' walk-forward predictions the probability calibration is fit on (1 or 2)."""
    df = df.copy(); df["date"] = pd.to_datetime(df.date)
    df = pd.concat([add_rest(df[df.season == s]) for s in sorted(df.season.unique())], ignore_index=True)
    ss = sorted(train_seasons)
    fit, O, D, GG, tbs = fit_season_block(df, ss)
    pO, pD, pG = [], [], []
    for s0, s1 in zip(ss, ss[1:]):
        for t in tbs[s1]:
            if (s0, t) in O: pO.append((O[(s0, t)], O[(s1, t)])); pD.append((D[(s0, t)], D[(s1, t)]))
        for (s, k), v in GG.items():
            if s == s1 and (s0, k) in GG: pG.append((GG[(s0, k)], v))
    rho = (slope(pO), slope(pD), slope(pG))
    eff = lambda dct, s: {t: v for (s_, t), v in dct.items() if s_ == s}
    tr = df[df.season.isin(ss) & df.home_goals.notna()]
    h_ot = float(((tr.home_reg == tr.away_reg) & (tr.home_goals > tr.away_goals)).sum() / max((tr.home_reg == tr.away_reg).sum(), 1))
    # tune half-life on the last training season, then fit the probability calibration there
    val_s, prev_s = ss[-1], ss[-2]
    tune, val = {}, {}
    for hl in halflives:
        for n0 in adapt_grid:
            ad = (adapt_idx, n0) if adapt_idx else None
            Pv, _ = walk_forward(df[df.season == val_s], eff(O, prev_s), eff(D, prev_s), eff(GG, prev_s), fit, rho, hl, lag_days=lag_days, adapt=ad)
            tune[f"{hl}|{n0}"] = float((((Pv.lam_home - Pv.home_reg) ** 2).mean() + ((Pv.lam_away - Pv.away_reg) ** 2).mean()) ** .5)
            val[(hl, n0)] = Pv
    best_hl, best_n0 = min(val, key=lambda k: tune[f"{k[0]}|{k[1]}"])
    adapt = (adapt_idx, best_n0) if adapt_idx else None
    Pv = val[(best_hl, best_n0)]
    if cal_seasons >= 2 and len(ss) >= 3:
        Pv2, _ = walk_forward(df[df.season == prev_s], eff(O, ss[-3]), eff(D, ss[-3]), eff(GG, ss[-3]), fit, rho, best_hl, lag_days=lag_days, adapt=adapt)
        Pv = pd.concat([Pv2, Pv], ignore_index=True)
    cal = {}
    for suf, m in (("", "pretip"), ("_open", "open")):
        r = raw_probs(Pv[f"lam_home{suf}"].values, Pv[f"lam_away{suf}"].values, h_ot)
        mg = (Pv.home_goals - Pv.away_goals).values; tot = (Pv.home_goals + Pv.away_goals).values
        c = dict(ml=fit_calibration(r["home_win"], mg > 0),
                 by2=fit_calibration(np.r_[r["home_by2"], r["away_by2"]], np.r_[mg >= 2, mg <= -2]),
                 over=fit_calibration(np.r_[r["over_5.5"], r["over_6.5"]], np.r_[tot > 5.5, tot > 6.5]))
        cal[m] = c
    # TEST: one pass on the held-out season
    Pt, eff_now = walk_forward(df[df.season == test_season], eff(O, val_s), eff(D, val_s), eff(GG, val_s), fit, rho, best_hl, lag_days=lag_days, adapt=adapt)
    Pt = add_probs(Pt, h_ot, cal)
    res = {}
    if Pt.home_goals.notna().any():
        mg = Pt.home_goals - Pt.away_goals
        res["accuracy"] = dict(ml_brier_open=float(((Pt.p_home_win_open - (mg > 0)) ** 2).mean()),
                               ml_brier_pretip=float(((Pt.p_home_win - (mg > 0)) ** 2).mean()))
        for ln in lines:
            if f"{ln}_home_ml" in Pt and Pt[f"{ln}_home_ml"].notna().any():
                for suf, mode in (("_open", "open"), ("", "pretip")):
                    Bt = bets(Pt, ln, suf, cal[mode], h_ot)
                    res[f"{mode} model vs {ln} lines"] = evaluate(Bt)
                ok = Pt[f"{ln}_home_ml"].notna() & Pt.home_goals.notna()
                ih, ia = 1 / dec(Pt.loc[ok, f"{ln}_home_ml"]), 1 / dec(Pt.loc[ok, f"{ln}_away_ml"])
                res["accuracy"][f"{ln}_line_ml_brier"] = float(((ih / (ih + ia) - (mg[ok] > 0)) ** 2).mean())
    summary = dict(train_seasons=list(ss), test_season=test_season,
                   fixed_effects=dict(zip(["intercept", "home", "b2b_offense", "b2b_defense", "missing_skaters"], np.round(fit["b"], 4).tolist())),
                   sd_offense=fit["s2"][0] ** .5, sd_defense=fit["s2"][1] ** .5, sd_goalie=fit["s2"][2] ** .5,
                   sd_residual=fit["s2e"] ** .5, rho=dict(offense=rho[0], defense=rho[1], goalie=rho[2]), h_ot=h_ot,
                   calibration=cal, tuning_rmse_on_validation=tune, chosen_halflife=best_hl, chosen_adapt_n0=best_n0, test=res)
    return summary, Pt, dict(fit=fit, rho=rho, h_ot=h_ot, cal=cal, hl=best_hl, effects=eff_now)


if __name__ == "__main__":
    df = pd.read_csv(sys.argv[1])
    train = [int(s) for s in sys.argv[2].split(",")]
    summary, P, _ = run(df, train, int(sys.argv[3]))
    print(json.dumps(summary, indent=2, default=float))
    P.to_csv(sys.argv[4] if len(sys.argv) > 4 else "test_predictions.csv", index=False)
