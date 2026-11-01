"""Builds NHL_Live_Tracker.xlsx from state/picks_log.csv. Summary numbers are formulas on the Picks sheet."""
import os, math
import numpy as np, pandas as pd
from openpyxl import Workbook
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from openpyxl.formatting.rule import FormulaRule
from openpyxl.utils import get_column_letter as CL

F = "Arial"
f_norm = Font(name=F, size=10); f_bold = Font(name=F, size=10, bold=True)
f_title = Font(name=F, size=14, bold=True, color="1F3864"); f_h = Font(name=F, size=11, bold=True, color="1F3864")
f_white = Font(name=F, size=10, bold=True, color="FFFFFF"); f_note = Font(name=F, size=9, italic=True, color="595959")
fill_dark = PatternFill("solid", fgColor="1F3864"); fill_green = PatternFill("solid", fgColor="E2EFDA")
fill_rule = PatternFill("solid", fgColor="FFF2CC")
thin = Side(style="thin", color="BFBFBF"); box = Border(left=thin, right=thin, top=thin, bottom=thin)
center = Alignment(horizontal="center", vertical="center")
MARKETS = ("moneyline", "puck line", "total")
BASE = [("Date", "date"), ("Puck drop (ET)", "tip_et"), ("Away", "away"), ("Home", "home"), ("Pick type", "pick_type"),
        ("Locked at (ET)", "locked_at_et"), ("Expected goalie, away", "away_goalie_exp"), ("Expected goalie, home", "home_goalie_exp"),
        ("Model home win %", "p_home_win"), ("Model goals, away (reg.)", "lam_away"), ("Model goals, home (reg.)", "lam_home"),
        ("Model total", "pred_total"), ("Open ML away", "open_away_ml"), ("Open ML home", "open_home_ml"), ("Open total", "open_total"),
        ("Close ML away", "close_away_ml"), ("Close ML home", "close_home_ml"), ("Close total", "close_total"),
        ("Away goals", "away_goals"), ("Home goals", "home_goals")]
COLS = list(BASE)
for ln in ("open", "close"):
    for mk in MARKETS:
        t = f"{ln.title()} {mk}"
        COLS += [(f"{t}: bet", f"{ln}_{mk}_bet"), (f"{t}: price", f"{ln}_{mk}_price"), (f"{t}: line", f"{ln}_{mk}_line"),
                 (f"{t}: EV", f"{ln}_{mk}_ev"), (f"{t}: result", f"{ln}_{mk}_result"), (f"{t}: units", f"{ln}_{mk}_profit")]
CIDX = {c: CL(i + 1) for i, (_, c) in enumerate(COLS)}


def hdr(ws, r, c, text, span=1):
    if span > 1: ws.merge_cells(start_row=r, start_column=c, end_row=r, end_column=c + span - 1)
    x = ws.cell(r, c, text); x.font = f_white; x.fill = fill_dark
    x.alignment = Alignment(horizontal="center", vertical="center", wrap_text=True)
    for k in range(c, c + span): ws.cell(r, k).border = box


def clean(v):
    if isinstance(v, float) and np.isnan(v): return None
    if isinstance(v, pd.Timestamp): return v.to_pydatetime()
    return v


def rule_bets(df, rule, live_only=True):
    d = df[df.pick_type == "live"] if live_only else df
    parts = []
    for mk in rule["markets"]:
        ev, res, pr = d.get(f"{rule['line']}_{mk}_ev"), d.get(f"{rule['line']}_{mk}_result"), d.get(f"{rule['line']}_{mk}_profit")
        if ev is None: continue
        s = d[(pd.to_numeric(ev, errors="coerce") >= rule["ev"]) & res.isin(["W", "L"])]
        parts.append(pd.to_numeric(s[f"{rule['line']}_{mk}_profit"], errors="coerce"))
    return pd.concat(parts) if parts else pd.Series(dtype=float)


def interpret(p):
    n = len(p)
    if n == 0:
        return ("No graded live bets under the rule yet.", "Nothing to judge yet. Let the season run; the first meaningful read comes after about 300 bets.")
    w, l = int((p > 0).sum()), int((p < 0).sum()); units = p.sum()
    sd = p.std(ddof=1) if n > 1 else 1.0; z = p.mean() / (sd / math.sqrt(n)) if sd > 0 else 0
    status = (f"Live record under the rule: {w}-{l}, {units:+.1f} units ({units / n:+.1%} return per bet). "
              f"Plausible range for the true return per bet: {p.mean() - 1.96 * sd / math.sqrt(n):+.0%} to {p.mean() + 1.96 * sd / math.sqrt(n):+.0%}.")
    if n < 100:
        adv = (f"Only {n} bets so far: far too few to tell skill from luck (hockey prices swing a lot, and at about 1 unit of spread per bet, "
               f"a coin-flip bettor lands anywhere from about {-1.96 / math.sqrt(n):+.0%} to {1.96 / math.sqrt(n):+.0%} per bet over {n} bets). Keep tracking.")
    elif n < 300:
        adv = ("Still early. " + ("It is running ahead, consistent with the opening-line backtests, but not proof. " if units > 0 else
                                  "It is running behind. Not yet evidence the edge is gone, but watch it. ")
               + "Keep the rule fixed and keep tracking to at least 300 bets.")
    else:
        if z > 1.645:
            adv = (f"After {n} bets it is ahead by more than chance would usually allow (z = {z:.2f}). Before risking money, check that the logged "
                   "opening prices were actually available to you, and start small.")
        elif units > 0:
            adv = f"After {n} bets it is ahead but not convincingly (z = {z:.2f}). Keep tracking through the end of the season."
        else:
            adv = (f"After {n} bets it is not making money (z = {z:.2f}). The backtested opening-line edge is not showing up live; "
                   "the honest conclusion so far is that the model does not beat the market.")
    return status, adv


def table_sheet(wb, title, frame, cols, widths=12, index=None, upper=()):
    ws = wb.create_sheet(title) if index is None else wb.create_sheet(title, index)
    for k, (t, _) in enumerate(cols): hdr(ws, 1, k + 1, t)
    ws.row_dimensions[1].height = 30
    for r in frame.to_dict("records") if len(frame) else []:
        vals = []
        for _, c in cols:
            v = clean(r.get(c))
            if c in upper and isinstance(v, str): v = v.upper()
            vals.append(v)
        ws.append(vals)
    for k in range(1, len(cols) + 1): ws.column_dimensions[CL(k)].width = widths
    ws.freeze_panes = "A2"
    return ws


def picks_and_summary(wb, df, rule, sheet, summ_name, pos):
    ps = table_sheet(wb, sheet, df, COLS, widths=11, upper=("away", "home"))
    ps.row_dimensions[1].height = 42
    N = max(ps.max_row, 2)
    for c in ("tip_et", "locked_at_et"):
        for row in range(2, N + 1): ps[f"{CIDX[c]}{row}"].number_format = "m/d h:mm"
    for c in [c for _, c in COLS if c.endswith("_ev") or c == "p_home_win"]:
        for row in range(2, N + 1): ps[f"{CIDX[c]}{row}"].number_format = "0.0%"
    for c in ("lam_home", "lam_away", "pred_total"):
        for row in range(2, N + 1): ps[f"{CIDX[c]}{row}"].number_format = "0.00"
    ps.freeze_panes = "E2"; ps.auto_filter.ref = f"A1:{CL(len(COLS))}{N}"
    sm = wb.create_sheet(summ_name, pos)
    ref = f"'{sheet}'"
    sm["A1"] = f"2026-27 results: {sheet[7:-1] if sheet.startswith('Picks (') else sheet} (formulas on the {sheet} sheet)"; sm["A1"].font = f_title
    sm["A2"] = (f"The tracked rule (highlighted): every {' and '.join(rule['markets'])} bet where the locked model's expected value at the "
                f"{rule['line']}ing DraftKings price is ≥ {rule['ev']:.0%}, graded at that price. EV = model win probability × decimal odds − 1. "
                "Units = profit per 1 unit risked. 'Live' = locked before puck drop. 'Backfilled' = games before tracking started, same no-lookahead method.")
    sm["A2"].font = f_note
    r = 4
    pt = CIDX["pick_type"]
    for scope, crit in [("Live picks only", '"live"'), ("Live + backfilled", '"*"')]:
        sm.cell(r, 1, scope).font = f_h; r += 1
        for k, t in enumerate(["Line", "Market", "EV ≥", "W", "L", "Win %", "Units", "Return/bet"]): hdr(sm, r, k + 1, t)
        r += 1; start = r
        for line in ("open", "close"):
            for mk in MARKETS:
                ec, rc, uc = CIDX[f"{line}_{mk}_ev"], CIDX[f"{line}_{mk}_result"], CIDX[f"{line}_{mk}_profit"]
                for th in (0, 0.03, 0.06, 0.09):
                    is_rule = line == rule["line"] and mk in rule["markets"] and abs(th - rule["ev"]) < 1e-9
                    for k, v in enumerate([line, mk, th]):
                        x = sm.cell(r, k + 1, v); x.font = f_bold if is_rule else f_norm; x.alignment = center; x.border = box
                        if k == 2: x.number_format = "0%"
                    base = f"{ref}!${pt}$2:${pt}${N},{crit},{ref}!${ec}$2:${ec}${N},\">=\"&$C{r}"
                    cells = [sm.cell(r, 4, f'=COUNTIFS({base},{ref}!${rc}$2:${rc}${N},"W")'),
                             sm.cell(r, 5, f'=COUNTIFS({base},{ref}!${rc}$2:${rc}${N},"L")'),
                             sm.cell(r, 6, f'=IFERROR(D{r}/(D{r}+E{r}),"")'),
                             sm.cell(r, 7, f"=SUMIFS({ref}!${uc}$2:${uc}${N},{base})"),
                             sm.cell(r, 8, f'=IFERROR(G{r}/(D{r}+E{r}),"")')]
                    cells[2].number_format = "0.0%"; cells[3].number_format = '+0.0;-0.0;0.0'; cells[4].number_format = '+0.0%;-0.0%;0.0%'
                    for x in cells:
                        x.font = f_bold if is_rule else f_norm; x.alignment = center; x.border = box
                        if is_rule: x.fill = fill_rule
                    r += 1
        sm.conditional_formatting.add(f"G{start}:G{r - 1}", FormulaRule(formula=[f"AND(ISNUMBER(G{start}),G{start}>0)"], fill=fill_green))
        r += 1
    for c, w in zip(range(1, 9), [9, 11, 8, 7, 7, 9, 9, 11]): sm.column_dimensions[CL(c)].width = w


def models_sheet(wb, board):
    ws = wb.create_sheet("Models", 1)
    ws["A1"] = "Model scorecard: both models run and alert side by side"; ws["A1"].font = f_title
    ws["A2"] = ("Season to date. Rule bets = each model's locked picks with EV ≥ 6% at the opening DraftKings price (live + backfilled). "
                "Alerts = phone alerts each model sent (an alert marked 'both models' counts for both). Lower Brier = more accurate win chances.")
    ws["A2"].font = f_note
    cols = [("Model", None), ("Description", "label"), ("Rule bets", "rule_bets"), ("W", "wins"), ("L", "losses"), ("Units", "units"),
            ("Return/bet", "return_per_bet"), ("Avg CLV", "avg_clv"), ("Live rule bets", "live_rule_bets"), ("Live units", "live_units"),
            ("Alerts graded", "alerts_graded"), ("Alert units", "alert_units"), ("Moneyline Brier", "moneyline_brier"), ("Games graded", "games_graded")]
    for k, (t, _) in enumerate(cols): hdr(ws, 4, k + 1, t)
    r = 5
    for name, m in board["models"].items():
        for k, v in enumerate([name] + [m.get(c) for _, c in cols[1:]]):
            x = ws.cell(r, k + 1, v); x.font = f_norm; x.border = box
            if cols[k][1] in ("return_per_bet", "avg_clv"): x.number_format = "+0.0%;-0.0%;0.0%"
            if cols[k][1] in ("units", "live_units", "alert_units"): x.number_format = "+0.0;-0.0;0.0"
        r += 1
    ws.column_dimensions["A"].width = 10; ws.column_dimensions["B"].width = 50
    for k in range(3, len(cols) + 1): ws.column_dimensions[CL(k)].width = 11


def build(log_csvs, out_xlsx, rule, run_log, board):
    dfs = {k: pd.read_csv(p, parse_dates=["date", "tip_et", "locked_at_et"]).sort_values(["date", "tip_et"]) for k, p in log_csvs.items()}
    df = dfs[board["active"]]
    st = os.path.dirname(list(log_csvs.values())[0])
    rd = lambda f: pd.read_csv(os.path.join(st, f)) if os.path.exists(os.path.join(st, f)) else pd.DataFrame()
    A, JJ, MB = rd("alerts.csv"), rd("line_jumps.csv"), rd("my_bets.csv")
    wb = Workbook(); notes = wb.active; notes.title = "Notes"

    table_sheet(wb, "Alerts", A, [("Alerted at (ET)", "alerted_at_et"), ("Away", "away"), ("Home", "home"), ("Puck drop", "tip_et"),
                                  ("Market", "market"), ("Model", "model"), ("Both models", "both_models"), ("Bet", "side"), ("Line", "line"), ("Price", "price"), ("Opening price", "open_price"),
                                  ("Model win prob", "model_prob"), ("EV", "ev"), ("Goalies", "goalies"), ("Caution (reason)", "skipped"),
                                  ("Result", "result"), ("Units", "profit"), ("CLV", "clv")], upper=("away", "home"))
    table_sheet(wb, "Line Jumps", JJ, [("Detected (ET)", "detected_at_et"), ("Game date", "date"), ("Away", "away"), ("Home", "home"),
                                       ("Market", "market"), ("From", "from_line"), ("To", "to_line"), ("Move", "move"),
                                       ("Steady since", "steady_since"), ("Move started", "move_started"), ("Minutes", "minutes"),
                                       ("Hours to puck drop", "hours_to_tip"), ("Model", "model"), ("Direction", "direction"),
                                       ("News items", "news_count"), ("Alerted", "alerted"), ("Closing line", "closing_line"),
                                       ("Kept moving to close?", "kept_moving_to_close"), ("Result matched move?", "result_matched_move"),
                                       ("News around the move", "news_in_window")], upper=("away", "home"))
    mcols = [("Logged at (ET)", "logged_at_et"), ("Game date", "date"), ("Away", "away"), ("Home", "home"), ("Market", "market"),
             ("Pick", "pick"), ("Line", "line"), ("Odds", "odds"), ("Stake ($)", "stake"), ("Book", "book"),
             ("Model win prob", "model_prob"), ("Model EV at your price", "model_ev_at_your_price"), ("Result", "result"),
             ("Profit ($)", "profit"), ("CLV", "clv"), ("Notes", "notes")]
    mb = table_sheet(wb, "My Bets", MB, mcols, index=1, upper=("pick", "away", "home"))
    n = max(mb.max_row, 2); r0 = n + 2
    mb.cell(r0, 1, "Totals (formulas)").font = f_h
    labels = [("Bets graded", f'=COUNTIF(M2:M{n},"W")+COUNTIF(M2:M{n},"L")+COUNTIF(M2:M{n},"P")'),
              ("Wins", f'=COUNTIF(M2:M{n},"W")'), ("Losses", f'=COUNTIF(M2:M{n},"L")'), ("Pushes", f'=COUNTIF(M2:M{n},"P")'),
              ("Staked on graded bets ($)", f'=SUMIF(M2:M{n},"?*",I2:I{n})'), ("Profit ($)", f"=SUM(N2:N{n})"),
              ("Return on money staked", f'=IFERROR(B{r0 + 6}/B{r0 + 5},"")')]
    for k, (lab, fml) in enumerate(labels):
        mb.cell(r0 + 1 + k, 1, lab).font = f_bold
        x = mb.cell(r0 + 1 + k, 2, fml); x.font = f_norm
        if "($)" in lab: x.number_format = '$#,##0.00;-$#,##0.00'
        if lab.startswith("Return"): x.number_format = "0.0%"

    for k in list(dfs)[::-1]:
        picks_and_summary(wb, dfs[k], rule, f"Picks ({k})", f"Summary ({k})", 1)
    models_sheet(wb, board)

    # ---- notes
    status, adv = interpret(rule_bets(df, rule))
    live = df[df.pick_type == "live"]
    sent = A[A.skipped.isna()] if len(A) and "skipped" in A else A
    g = sent[sent.result.isin(["W", "L"])] if len(sent) and "result" in sent else pd.DataFrame()
    c = A[A.skipped.notna() & A.result.isin(["W", "L"])] if len(A) and "result" in A and "skipped" in A else pd.DataFrame()
    gb = MB[MB.result.isin(["W", "L", "P"])] if len(MB) and "result" in MB else pd.DataFrame()
    clv_parts = []
    for mk in rule["markets"]:
        col = f"open_{mk}_clv"
        if col in df:
            x = pd.to_numeric(df[(df.pick_type == "live") & (pd.to_numeric(df[f"open_{mk}_ev"], errors="coerce") >= rule["ev"])][col], errors="coerce").dropna()
            if len(x): clv_parts.append(f"scorecard {mk} {x.mean():+.1%} avg, beat the close {(x > 0).mean():.0%} of the time (n={len(x)})")
    for nm_, fr in (("alerts", A), ("your bets", MB)):
        if len(fr) and "clv" in fr:
            x = pd.to_numeric(fr.clv, errors="coerce").dropna()
            if len(x): clv_parts.append(f"{nm_} {x.mean():+.1%} avg (n={len(x)})")
    lines = [
        ("h", "What this is"),
        ("t", f"Two models run side by side and keep separate locked picks: {'; '.join(f'{k} = {v}' for k, v in ((k, m['label']) for k, m in board['models'].items()))}. "
              f"Both send phone alerts, labeled with the model (one alert when they agree), and each is graded separately. "
              f"The Models sheet compares them; the notes below are about the {board['active']} model."),
        ("t", "Every evening (about 9:30 PM ET) GitHub refits the NHL mixed model (team offense, team defense and goalie random effects, home ice, "
              "back-to-backs, missing regular skaters; trained on 2021-22 through 2025-26) and locks its predictions for the next day's games, using what is "
              "known the day before: each team's likely goalie from its recent starts and the skaters who missed its last game. That is the same setup the "
              "backtests used for opening lines. A morning run adds results and grades. Locked picks are never changed. Lines are DraftKings via ESPN."),
        ("t", f"The tracked rule, fixed before live tracking began: every {' and '.join(rule['markets'])} side whose expected value at the opening "
              f"price is at least {rule['ev']:.0%} counts as a 1-unit bet at the opening price, even if the price moved before a bet could be placed. "
              "Totals are tracked on the Summary sheet but are not part of the rule: they lost money against opening lines in both backtest seasons."),
        ("t", f"Picks logged: {len(df)} games ({len(live)} live, {len(df) - len(live)} backfilled). Latest run: {run_log[0] if run_log else ''}"),
        ("h", "Where things stand"),
        ("t", status),
        ("t", (f"Phone alerts (EV {rule['ev']:.0%}+ against the price at the moment of the alert): {int((g.result == 'W').sum())}-{int((g.result == 'L').sum())}, "
               f"{pd.to_numeric(g.profit, errors='coerce').sum():+.1f} units. These face later, sharper prices than the scorecard, so expect them to do worse.")
         if len(g) else "Phone alerts: none graded yet."),
        ("t", (f"Caution alerts (goalie not confirmed, or the price moved against the bet): {int((c.result == 'W').sum())}-{int((c.result == 'L').sum())}, "
               f"{pd.to_numeric(c.profit, errors='coerce').sum():+.1f} units.") if len(c) else "Caution alerts: none graded yet."),
        ("t", (f"Your logged bets: {int((gb.result == 'W').sum())}-{int((gb.result == 'L').sum())}, ${gb.profit.sum():+.2f} on ${gb.stake.sum():.2f} staked.")
         if len(gb) else "Your logged bets: none graded yet. Log bets with the 'Log a bet' form (button on each alert, or the Issues tab)."),
        ("t", f"Line jumps logged: {len(JJ)} (moneyline moves of 3+ win-probability points, or total changes, within an hour)." if len(JJ)
         else "Line jumps: none logged yet."),
        ("t", ("Closing line value (how much better your price was than the fair closing price): " + "; ".join(clv_parts) + ". "
               "Consistently positive closing line value is the best early sign of a real edge.") if clv_parts
         else "Closing line value: nothing graded yet. Over time this is the best early sign of a real edge, far quicker than wins and losses."),
        ("h", "My note and advice"),
        ("t", adv),
        ("t", "Reminders: the opening price logged here is DraftKings' first posted number, which often has low limits and moves fast, so real results would "
              "be somewhat worse. In the backtests the model never beat closing prices; the closing rows are there as a reality check."),
        ("h", "Last run log"),
    ] + [("t", s) for s in run_log]
    notes["A1"] = "NHL Live Tracker, 2026-27"; notes["A1"].font = f_title
    r = 3
    for kind, text in lines:
        x = notes.cell(r, 1, text)
        if kind == "h": x.font = f_h; r += 1
        else:
            x.font = f_norm; x.alignment = Alignment(wrap_text=True, vertical="top")
            notes.row_dimensions[r].height = 15 * (1 + len(text) // 110)
        r += 1
    notes.column_dimensions["A"].width = 120
    wb.save(out_xlsx)
