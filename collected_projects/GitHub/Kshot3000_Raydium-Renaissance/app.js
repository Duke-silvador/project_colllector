"use strict";
/* Raydium Renaissance hub logic: project filtering plus eighty-one fully
   local liquidity-pool tools — a constant-product swap model, an
   impermanent-loss calculator, an LP fee estimator, a break-even fee
   calculator, a liquidity deposit planner, an exact-out swap model, a
   liquidity withdrawal planner, a CLMM range deposit planner, a CLMM
   position checker, a slippage / minimum-received calculator, a CLMM
   tick / price converter, a CLMM position-vs-holding calculator, a CLMM
   fee estimator, a CLMM wallet-balance deposit planner, a CLMM
   break-even days calculator, a constant-product arbitrage model, a
   price-impact trade sizer, an LP-token share & value calculator, a
   single-sided zap-in planner, a single-sided zap-out planner, an IL
   tolerance band, a CLMM symmetric-range planner, a two-hop swap
   model, a net LP return calculator, a CLMM capital-efficiency
   calculator, a pool depth planner, a post-move reserves calculator,
   a split-route swap planner, a CLMM net return calculator, a
   CLMM IL tolerance band, a CLMM required-volume planner, a
   constant-product required-volume planner, a CLMM single-sided
   zap-in planner, a CLMM single-sided zap-out planner, a CLMM
   token-B deposit planner, a CLMM re-centre / rebalance planner,
   a CLMM withdrawal planner, a constant-product wallet-balance
   deposit planner, a two-hop exact-out swap model, a
   constant-product break-even days calculator, a split-route
   exact-out swap model, a CLMM single-range swap model, a
   CLMM two-range swap model, a CLMM single-range exact-out
   swap model, a CLMM two-range exact-out swap model, a
   CLMM three-range swap model, a CLMM three-range
   exact-out swap model, a CLMM single-sided zap-in
   planner from token B, a CLMM single-sided zap-out
   planner to token B, a single-sided zap-in planner
   from token B, a single-sided zap-out planner
   to token B, a fee compounding calculator, a
   loss-versus-rebalancing round-trip calculator, a
   pool seeding / initial-liquidity planner, a CLMM range
   probability calculator, a weighted-pool swap model, a
   CLMM range-order (limit-order) planner, a stableswap
   swap model, a stableswap exact-out swap model, a
   weighted-pool impermanent-loss calculator, a
   stableswap depeg-loss calculator, a weighted-pool
   arbitrage model, a weighted-pool exact-out
   swap model, a weighted-pool price-impact
   sizer, a stableswap arbitrage model, a
   stableswap price-impact sizer, a curve
   comparison model, a weighted-pool net
   return calculator, a stableswap net
   return calculator, a weighted-pool
   required-volume planner, a stableswap
   required-volume planner, a weighted-pool
   break-even days calculator, a stableswap
   break-even days calculator, a curve
   comparison exact-out model, a weighted-pool
   IL tolerance band, a stableswap IL
   tolerance band, a CLMM arbitrage model, a CLMM
   price-impact sizer, a CLMM two-range arbitrage
   model, a CLMM three-range arbitrage model, and a
   CLMM two-range price-impact sizer.
   These are educational MODELS using
   the maths Raydium's pool types are built on; they are not live quotes,
   not live pool data, and not financial advice. Everything runs locally. */

/* ---------- decimal <-> scaled BigInt (9 dp, like SOL lamport precision) ---------- */
var SCALE = 1000000000n;
function parseScaled(str) {
  var s = (str == null ? "" : String(str)).trim();
  if (!/^\d+(\.\d{1,9})?$/.test(s)) return null;
  var parts = s.split(".");
  return BigInt(parts[0]) * SCALE + BigInt(((parts[1] || "") + "000000000").slice(0, 9));
}
function formatScaled(nano) {
  var whole = nano / SCALE;
  var frac = (nano % SCALE).toString().padStart(9, "0").replace(/0+$/, "");
  return frac ? whole.toString() + "." + frac : whole.toString();
}
function scaledToNumber(nano) { return Number(nano) / 1e9; }

/* ---------- 1 · Constant-product swap model (x * y = k) ---------- */
/* The model behind Raydium AMM v4 / CPMM pools: the fee is taken from the
   input first, then out = reserveOut * inAfterFee / (reserveIn + inAfterFee). */
function cpSwap(reserveInStr, reserveOutStr, amountInStr, feeBps) {
  var rin = parseScaled(reserveInStr), rout = parseScaled(reserveOutStr), ain = parseScaled(amountInStr);
  var fee = Number(feeBps);
  if (rin === null || rout === null || ain === null) return null;
  if (rin <= 0n || rout <= 0n || ain <= 0n) return null;
  if (!Number.isInteger(fee) || fee < 0 || fee > 9999) return null;
  var inAfterFee = ain * BigInt(10000 - fee) / 10000n;
  if (inAfterFee <= 0n) return null;
  var out = rout * inAfterFee / (rin + inAfterFee);
  if (out <= 0n) return null;
  var spot = scaledToNumber(rout) / scaledToNumber(rin);
  var effective = scaledToNumber(out) / scaledToNumber(ain);
  var priceImpactPct = (1 - effective / spot) * 100;
  return {
    out: formatScaled(out),
    spotPrice: spot,
    effectivePrice: effective,
    priceImpactPct: priceImpactPct,
    feePct: fee / 100
  };
}

/* ---------- 2 · Impermanent loss (constant-product pool, 50/50 start) ---------- */
/* If one token's price moves by a multiple r against the other:
   LP value / hold value = 2*sqrt(r) / (1 + r). LP value itself (in the
   unchanged token's terms, deposit normalised) scales by sqrt(r). */
function impermanentLoss(priceRatio, depositStr) {
  var r = Number(priceRatio);
  if (!Number.isFinite(r) || r <= 0) return null;
  var ratio = 2 * Math.sqrt(r) / (1 + r);
  var ilPct = (ratio - 1) * 100;
  var out = { priceRatio: r, ilPct: ilPct, lpVsHold: ratio };
  if (depositStr != null && String(depositStr).trim() !== "") {
    var dep = Number(depositStr);
    if (!Number.isFinite(dep) || dep < 0) return null;
    out.deposit = dep;
    out.holdValue = dep * (1 + r) / 2;
    out.lpValue = dep * Math.sqrt(r);
  }
  return out;
}

/* ---------- 3 · LP fee estimator ---------- */
/* dailyFees = poolVolume24h * feeRate * yourShare, where yourShare is your
   liquidity / pool TVL. APR annualises that day naively (x365) — an estimate
   that assumes volume, fees and TVL never change, which they always do. */
function lpFees(volumeStr, feeBps, yourStr, tvlStr) {
  var volume = Number(volumeStr), your = Number(yourStr), tvl = Number(tvlStr);
  var fee = Number(feeBps);
  if (![volume, your, tvl].every(Number.isFinite)) return null;
  if (volume < 0 || your <= 0 || tvl <= 0 || your > tvl) return null;
  if (!Number.isInteger(fee) || fee < 0 || fee > 10000) return null;
  var share = your / tvl;
  var daily = volume * (fee / 10000) * share;
  return {
    sharePct: share * 100,
    dailyFees: daily,
    monthlyFees: daily * 30,
    aprPct: your > 0 ? (daily * 365 / your) * 100 : 0,
    feePct: fee / 100
  };
}

/* ---------- 4 · Break-even fees vs impermanent loss ---------- */
/* Fees are what compensate an LP for impermanent loss, so the break-even
   question is concrete: feesNeeded = holdValue - lpValue for the same
   price move and deposit as Tool 2. If the LP also estimates their daily
   fees (e.g. from Tool 3), daysToBreakEven = feesNeeded / dailyFees —
   a model that assumes that daily rate never changes, which it will. */
function breakEvenFees(priceRatio, depositStr, dailyFeesStr) {
  var il = impermanentLoss(priceRatio, depositStr);
  if (il === null || il.deposit == null || !(il.deposit > 0)) return null;
  var feesNeeded = il.holdValue - il.lpValue;
  var out = {
    priceRatio: il.priceRatio,
    ilPct: il.ilPct,
    deposit: il.deposit,
    holdValue: il.holdValue,
    lpValue: il.lpValue,
    feesNeeded: feesNeeded,
    feesNeededPctOfDeposit: il.deposit > 0 ? (feesNeeded / il.deposit) * 100 : 0
  };
  if (dailyFeesStr != null && String(dailyFeesStr).trim() !== "") {
    var daily = Number(dailyFeesStr);
    if (!Number.isFinite(daily) || daily < 0) return null;
    out.dailyFees = daily;
    out.daysToBreakEven = daily > 0 ? feesNeeded / daily : (feesNeeded === 0 ? 0 : Infinity);
  }
  return out;
}

/* ---------- 5 · Liquidity deposit planner (constant-product pools) ---------- */
/* Adding liquidity to a constant-product pool means depositing BOTH tokens
   in the pool's existing ratio — depositing only one side, or the wrong
   ratio, either fails or leaves the excess unused. Given the reserves and
   how much of token A you want to add: requiredB = reserveB * amountA /
   reserveA (exact scaled-BigInt, floored at 9 dp), and because the deposit
   is proportional, your share of the pool afterwards is
   amountA / (reserveA + amountA) — the same fraction on both sides.
   This plans a deposit for AMM v4 / CPMM / CP-Swap style pools; CLMM
   deposits are range-based and work differently. Model only. */
function depositPlan(reserveAStr, reserveBStr, amountAStr) {
  var ra = parseScaled(reserveAStr), rb = parseScaled(reserveBStr), aa = parseScaled(amountAStr);
  if (ra === null || rb === null || aa === null) return null;
  if (ra <= 0n || rb <= 0n || aa <= 0n) return null;
  var requiredB = rb * aa / ra;
  if (requiredB <= 0n) return null;
  return {
    requiredB: formatScaled(requiredB),
    sharePct: scaledToNumber(aa) / scaledToNumber(ra + aa) * 100,
    newReserveA: formatScaled(ra + aa),
    newReserveB: formatScaled(rb + requiredB),
    priceBperA: scaledToNumber(rb) / scaledToNumber(ra)
  };
}

/* ---------- 6 · Exact-out swap model (constant-product, inverse of Tool 1) ---------- */
/* Tool 1 answers "how much do I get for this much in?"; traders planning
   around a target amount ask the inverse: "how much in do I need for
   exactly this much out?" Inverting x * y = k:
   inAfterFee = reserveIn * amountOut / (reserveOut - amountOut), then the
   input is grossed back up for the fee: amountIn = inAfterFee * 10000 /
   (10000 - feeBps). Both divisions round UP (ceiling, exact scaled-BigInt)
   so the modelled input is never a hair short of buying the target output
   — the same round-up the on-chain programs require. amountOut must be
   strictly less than reserveOut: a constant-product pool can never pay
   out its whole reserve, and asking for more than it holds is rejected
   here instead of returning a nonsense (or negative) input. Model only. */
function cpSwapExactOut(reserveInStr, reserveOutStr, amountOutStr, feeBps) {
  var rin = parseScaled(reserveInStr), rout = parseScaled(reserveOutStr), aout = parseScaled(amountOutStr);
  var fee = Number(feeBps);
  if (rin === null || rout === null || aout === null) return null;
  if (rin <= 0n || rout <= 0n || aout <= 0n) return null;
  if (aout >= rout) return null;
  if (!Number.isInteger(fee) || fee < 0 || fee > 9999) return null;
  var denom = rout - aout;
  var inAfterFee = (rin * aout + denom - 1n) / denom;
  var amountIn = (inAfterFee * 10000n + BigInt(9999 - fee)) / BigInt(10000 - fee);
  if (amountIn <= 0n) return null;
  var spot = scaledToNumber(rout) / scaledToNumber(rin);
  var effective = scaledToNumber(aout) / scaledToNumber(amountIn);
  return {
    amountIn: formatScaled(amountIn),
    inAfterFee: formatScaled(inAfterFee),
    spotPrice: spot,
    effectivePrice: effective,
    priceImpactPct: (1 - effective / spot) * 100,
    feePct: fee / 100
  };
}

/* ---------- 7 · Liquidity withdrawal planner (constant-product pools) ---------- */
/* The exit side of Tool 5. Withdrawing liquidity from a constant-product
   pool pays out BOTH tokens in the pool's current ratio, in proportion
   to the share of the pool you redeem: amountOut = reserve * sharePct/100
   * withdrawPct/100, computed in exact scaled-BigInt and floored at 9 dp
   (the pool keeps any sub-unit remainder, as on-chain programs do).
   withdrawPct below 100 models a partial exit; your remaining share
   scales down by the same fraction. The reserves you enter are the
   pool's CURRENT reserves — if prices have moved since you deposited,
   the token mix you get back differs from what you put in, which is
   exactly impermanent loss made concrete (Tool 2). This plans a
   withdrawal for AMM v4 / CPMM / CP-Swap style pools; CLMM withdrawals
   depend on the position's range and ticks and work differently.
   Model only — no withdrawal fee is modelled, and real pools may have
   their own; check the pool page. */
function withdrawPlan(reserveAStr, reserveBStr, sharePctStr, withdrawPctStr) {
  var ra = parseScaled(reserveAStr), rb = parseScaled(reserveBStr);
  var share = parseScaled(sharePctStr), withdraw = parseScaled(withdrawPctStr);
  if (ra === null || rb === null || share === null || withdraw === null) return null;
  if (ra <= 0n || rb <= 0n) return null;
  var hundred = 100n * SCALE;
  if (share <= 0n || share > hundred || withdraw <= 0n || withdraw > hundred) return null;
  var denom = 10000n * SCALE * SCALE;
  var outA = ra * share * withdraw / denom;
  var outB = rb * share * withdraw / denom;
  if (outA <= 0n || outB <= 0n) return null;
  var shareVal = scaledToNumber(share), withdrawVal = scaledToNumber(withdraw);
  return {
    outA: formatScaled(outA),
    outB: formatScaled(outB),
    remainingReserveA: formatScaled(ra - outA),
    remainingReserveB: formatScaled(rb - outB),
    sharePct: shareVal,
    withdrawPct: withdrawVal,
    remainingSharePct: shareVal * (100 - withdrawVal) / 100
  };
}

/* ---------- 8 · CLMM range deposit planner (concentrated liquidity) ---------- */
/* Tools 5 and 7 keep noting CLMM deposits are range-based and different —
   this is how they differ. A CLMM position covers a price range
   [lower, upper] (price = token B per token A). With sqrt prices
   s = sqrt(P), sa = sqrt(lower), sb = sqrt(upper), a position with
   liquidity L holds, while the current price P is inside the range:
     amountA = L * (1/s - 1/sb)    amountB = L * (s - sa)
   So given the token A you want to deposit, L = amountA / (1/s - 1/sb)
   and the matching token B follows — the split is set by where the
   current price sits inside your range, not by you. Below the range the
   position is entirely token A (amountB = 0, and L is set by the range
   edges: L = amountA / (1/sa - 1/sb)); at or above the top of the range
   the position is entirely token B, so a token-A deposit cannot fund
   it and that combination is rejected here. Tick indices are the
   standard CLMM ticks, tick = floor(log_{1.0001}(price)) — modelled
   with floating-point logs, so a price sitting exactly on a tick
   boundary can be off by one tick; real positions snap ticks to the
   pool's tick spacing. Model only: no fees, no tick-spacing snapping,
   and real Raydium CLMM deposits are quoted live on the pool page. */
function priceToTick(price) {
  return Math.floor(Math.log(price) / Math.log(1.0001) + 1e-9);
}
function clmmRangePlan(currentStr, lowerStr, upperStr, amountAStr) {
  var current = Number(currentStr), lower = Number(lowerStr), upper = Number(upperStr), amountA = Number(amountAStr);
  if (![current, lower, upper, amountA].every(Number.isFinite)) return null;
  if (current <= 0 || lower <= 0 || upper <= 0 || amountA <= 0) return null;
  if (lower >= upper) return null;
  if (current >= upper) return null;
  var s = Math.sqrt(current), sa = Math.sqrt(lower), sb = Math.sqrt(upper);
  var liquidity, requiredB, status;
  if (current <= lower) {
    liquidity = amountA / (1 / sa - 1 / sb);
    requiredB = 0;
    status = "below";
  } else {
    liquidity = amountA / (1 / s - 1 / sb);
    requiredB = liquidity * (s - sa);
    status = "in";
  }
  if (!Number.isFinite(liquidity) || liquidity <= 0 || requiredB < 0) return null;
  var valueInB = amountA * current + requiredB;
  return {
    currentPrice: current,
    lowerPrice: lower,
    upperPrice: upper,
    amountA: amountA,
    requiredB: requiredB,
    liquidity: liquidity,
    status: status,
    inRange: status === "in",
    bValuePct: valueInB > 0 ? requiredB / valueInB * 100 : 0,
    tickCurrent: priceToTick(current),
    tickLower: priceToTick(lower),
    tickUpper: priceToTick(upper)
  };
}

/* ---------- 9 · CLMM position checker (what a position holds at a price) ---------- */
/* Tool 8 plans a CLMM deposit; this is its follow-up question: as the
   price moves, what does that position actually hold? A CLMM position's
   token mix is set by its liquidity L and its range [lower, upper]
   (price = token B per token A; s = sqrt(price) and friends):
     price at/below lower:  amountA = L * (1/sqrt(lower) - 1/sqrt(upper)), amountB = 0
     price inside range:    amountA = L * (1/s - 1/sqrt(upper)),
                            amountB = L * (s - sqrt(lower))
     price at/above upper:  amountA = 0,
                            amountB = L * (sqrt(upper) - sqrt(lower))
   So a rising price steadily converts the position into token B (the
   token whose price rose is the one you end up holding LESS of — that
   conversion is concentrated liquidity's version of impermanent loss),
   and outside the range the position is entirely one token and earns
   no fees until price returns. L here is the model liquidity Tool 8
   reports for a deposit — copy it across. Model only: no fees earned
   are added, no tick-spacing snapping, and a real position's amounts
   are quoted live on the pool page. */
function clmmPositionAtPrice(liquidityStr, lowerStr, upperStr, priceStr) {
  var liquidity = Number(liquidityStr), lower = Number(lowerStr), upper = Number(upperStr), price = Number(priceStr);
  if (![liquidity, lower, upper, price].every(Number.isFinite)) return null;
  if (liquidity <= 0 || lower <= 0 || upper <= 0 || price <= 0) return null;
  if (lower >= upper) return null;
  var sa = Math.sqrt(lower), sb = Math.sqrt(upper), s = Math.sqrt(price);
  var amountA, amountB, status;
  if (price <= lower) {
    amountA = liquidity * (1 / sa - 1 / sb);
    amountB = 0;
    status = "below";
  } else if (price >= upper) {
    amountA = 0;
    amountB = liquidity * (sb - sa);
    status = "above";
  } else {
    amountA = liquidity * (1 / s - 1 / sb);
    amountB = liquidity * (s - sa);
    status = "in";
  }
  if (!Number.isFinite(amountA) || !Number.isFinite(amountB) || amountA < 0 || amountB < 0) return null;
  var valueInB = amountA * price + amountB;
  return {
    liquidity: liquidity,
    lowerPrice: lower,
    upperPrice: upper,
    price: price,
    amountA: amountA,
    amountB: amountB,
    status: status,
    inRange: status === "in",
    valueInB: valueInB,
    bValuePct: valueInB > 0 ? amountB / valueInB * 100 : 0
  };
}

/* ---------- 10 · Slippage / minimum-received calculator ---------- */
/* Every swap and liquidity add carries a slippage tolerance: how far the
   result may move against you between quote and execution before the
   transaction should fail instead of fill badly. The bounds it produces
   are simple — minimum received = expectedOut * (1 - tolerance) and,
   for an exact-in trade, maximum input = expectedIn * (1 + tolerance) —
   but the ROUNDING is the whole point: both bounds are floored in exact
   scaled-BigInt (9 dp), never rounded up. A minimum that rounds up
   (e.g. half-up: an expected 4 at 0.5% tolerance is exactly 3.98, which
   half-up turns back into 4) is stricter than the tolerance you set and
   makes transactions fail that should have filled; a maximum that rounds
   up quietly lets you pay more than you authorised. Floored, neither
   bound ever exceeds the tolerance — the same flooring the on-chain
   programs and integer SDK paths use. Model only: your real bounds are
   computed from the live quote on the swap / pool page. */
function slippagePlan(expectedOutStr, slippageBps, expectedInStr) {
  var out = parseScaled(expectedOutStr);
  var bps = Number(slippageBps);
  if (out === null || out <= 0n) return null;
  if (!Number.isInteger(bps) || bps < 0 || bps > 9999) return null;
  var minReceived = out * BigInt(10000 - bps) / 10000n;
  if (minReceived <= 0n) return null;
  var res = {
    expectedOut: formatScaled(out),
    minReceived: formatScaled(minReceived),
    protectedAmount: formatScaled(out - minReceived),
    slippageBps: bps,
    slippagePct: bps / 100
  };
  if (expectedInStr != null && String(expectedInStr).trim() !== "") {
    var inp = parseScaled(expectedInStr);
    if (inp === null || inp <= 0n) return null;
    var maxIn = inp * BigInt(10000 + bps) / 10000n;
    if (maxIn <= 0n) return null;
    res.expectedIn = formatScaled(inp);
    res.maxIn = formatScaled(maxIn);
  }
  return res;
}

/* ---------- 11 · CLMM tick / price converter (with tick-spacing snapping) ---------- */
/* Tools 8 and 9 report CLMM ranges as tick indices and warn that real
   positions snap those ticks to the pool's tick spacing — this tool does
   that conversion and snapping. CLMM prices are discrete: each tick is a
   0.01% price step, price = 1.0001^tick, and a price's tick is
   floor(log_{1.0001}(price)) — floored, so the tick's own price is at or
   just below the price you entered and the next tick's price is above it.
   The standard CLMM tick range is -443636..443636; prices whose tick
   falls outside it are rejected here instead of returning a meaningless
   index. Pools only accept position boundaries on multiples of their
   tick spacing: a lower boundary snaps DOWN to the previous multiple
   and an upper boundary snaps UP to the next (floor division, which for
   negative ticks moves away from zero on the down snap — -2232 at
   spacing 10 snaps down to -2240, not -2230). Tick maths here uses
   floating-point logs / powers, so a price sitting exactly on a tick
   boundary can land one tick off; the pool page quotes the real ticks.
   Model only. */
var TICK_MIN = -443636, TICK_MAX = 443636;
function tickToPrice(tick) {
  var t = Number(tick);
  if (!Number.isInteger(t) || t < TICK_MIN || t > TICK_MAX) return null;
  return Math.pow(1.0001, t);
}
function tickPriceConvert(priceStr, spacingStr) {
  var price = Number(priceStr);
  if (!Number.isFinite(price) || price <= 0) return null;
  var tick = priceToTick(price);
  if (tick < TICK_MIN || tick > TICK_MAX) return null;
  var tickPrice = tickToPrice(tick);
  var out = {
    price: price,
    tick: tick,
    tickPrice: tickPrice,
    nextTick: tick + 1,
    nextTickPrice: tick === TICK_MAX ? null : tickToPrice(tick + 1)
  };
  if (spacingStr != null && String(spacingStr).trim() !== "") {
    var spacing = Number(spacingStr);
    if (!Number.isInteger(spacing) || spacing <= 0) return null;
    var down = Math.floor(tick / spacing) * spacing;
    var up = down === tick ? tick : down + spacing;
    out.spacing = spacing;
    out.snappedDownTick = down;
    out.snappedDownPrice = Math.pow(1.0001, down);
    out.snappedUpTick = up;
    out.snappedUpPrice = Math.pow(1.0001, up);
  }
  return out;
}

/* ---------- 12 · CLMM position vs holding (concentrated impermanent loss) ---------- */
/* Tool 9 shows what a CLMM position holds at a price; Tool 2 quantifies
   impermanent loss for a constant-product position. This joins the two:
   it is Tool 2's question for a CLMM position. Take the position's
   holdings at its ENTRY price (Tool 9's maths at that price) and value
   them two ways at the CHECK price, both in token B:
     holding value   = entryAmountA * checkPrice + entryAmountB
     position value  = checkAmountA * checkPrice + checkAmountB
   The position converts itself as price moves (selling the token that
   rises, buying the one that falls), so position value never exceeds
   holding value — the shortfall is concentrated liquidity's impermanent
   loss at that price, and feesNeededInB is exactly the fee income (in
   token B) the position must have earned to match simply holding. The
   gap is zero at the entry price and grows the further price travels,
   inside or outside the range. Model only: no fees earned are added,
   and a real position's value is quoted live on the pool page. */
function clmmVsHold(liquidityStr, lowerStr, upperStr, entryPriceStr, checkPriceStr) {
  var entry = clmmPositionAtPrice(liquidityStr, lowerStr, upperStr, entryPriceStr);
  var check = clmmPositionAtPrice(liquidityStr, lowerStr, upperStr, checkPriceStr);
  if (entry === null || check === null) return null;
  var holdValueInB = entry.amountA * check.price + entry.amountB;
  var positionValueInB = check.valueInB;
  var diffInB = positionValueInB - holdValueInB;
  return {
    liquidity: entry.liquidity,
    lowerPrice: entry.lowerPrice,
    upperPrice: entry.upperPrice,
    entryPrice: entry.price,
    checkPrice: check.price,
    entryAmountA: entry.amountA,
    entryAmountB: entry.amountB,
    checkAmountA: check.amountA,
    checkAmountB: check.amountB,
    entryStatus: entry.status,
    checkStatus: check.status,
    holdValueInB: holdValueInB,
    positionValueInB: positionValueInB,
    diffInB: diffInB,
    vsHoldPct: holdValueInB > 0 ? diffInB / holdValueInB * 100 : 0,
    feesNeededInB: holdValueInB - positionValueInB
  };
}

/* ---------- 13 · CLMM fee estimator ---------- */
/* Tool 3 estimates constant-product LP fees from your share of TVL;
   a CLMM position's share is not of TVL but of the ACTIVE liquidity
   at the current tick, and it only earns while price is inside its
   range. The model is the same shape with those two corrections:
     pool fees per day  = daily volume (in token B) * fee tier
     your share         = your liquidity L / total active liquidity
     your fees per day  = pool fees * share * time-in-range fraction
   Total active liquidity is the number nobody can read off a single
   pool page precisely — it is an input here, labelled an estimate,
   and it must be at least your own L (your liquidity is part of it),
   so total < L is rejected rather than silently paying out a share
   above 100%. The naive APR (only with a position value, also an
   input) just annualises the daily figure — it assumes volume, the
   active-liquidity total and your time in range all hold still,
   which in a live pool none of them do. Pair it with Tool 12: fees
   per day vs the fee hurdle a price move creates is the honest
   CLMM question. Model only — not a live quote or yield promise. */
function clmmFeeEstimate(yourLStr, totalActiveLStr, volumePerDayStr, feeBps, daysStr, inRangePctStr, positionValueStr) {
  /* required fields must be present: Number("") is 0, which the
     volume >= 0 allowance below would otherwise let slip through */
  var required = [yourLStr, totalActiveLStr, volumePerDayStr, feeBps, daysStr];
  for (var i = 0; i < required.length; i++) {
    if (required[i] == null || String(required[i]).trim() === "") return null;
  }
  var yourL = Number(yourLStr), totalL = Number(totalActiveLStr);
  var volume = Number(volumePerDayStr), fee = Number(feeBps), days = Number(daysStr);
  if (![yourL, totalL, volume, fee, days].every(Number.isFinite)) return null;
  if (yourL <= 0 || totalL <= 0 || volume < 0 || days <= 0) return null;
  if (totalL < yourL) return null;
  if (fee < 0 || fee > 10000) return null;
  var inRangePct = 100;
  if (inRangePctStr != null && String(inRangePctStr).trim() !== "") {
    inRangePct = Number(inRangePctStr);
    if (!Number.isFinite(inRangePct) || inRangePct < 0 || inRangePct > 100) return null;
  }
  var positionValue = null;
  if (positionValueStr != null && String(positionValueStr).trim() !== "") {
    positionValue = Number(positionValueStr);
    if (!Number.isFinite(positionValue) || positionValue <= 0) return null;
  }
  var sharePct = yourL / totalL * 100;
  var poolFeesPerDay = volume * fee / 10000;
  var feesPerDay = poolFeesPerDay * (yourL / totalL) * (inRangePct / 100);
  return {
    yourLiquidity: yourL,
    totalActiveLiquidity: totalL,
    volumePerDay: volume,
    feeBps: fee,
    days: days,
    inRangePct: inRangePct,
    sharePct: sharePct,
    poolFeesPerDay: poolFeesPerDay,
    feesPerDay: feesPerDay,
    feesForPeriod: feesPerDay * days,
    positionValueInB: positionValue,
    naiveAprPct: positionValue !== null ? feesPerDay * 365 / positionValue * 100 : null
  };
}

/* ---------- 14 · CLMM wallet-balance deposit planner ---------- */
/* Tool 8 answers "I want to deposit this much token A — how much token
   B do I need?" Real wallets ask the inverse: "I hold this much of
   BOTH tokens — what is the biggest position my balances can fund in
   this range, and what will be left over?" Inside the range a position
   with liquidity L uses (Tool 8/9's maths, s/sa/sb = sqrt prices):
     amountA = L * (1/s - 1/sb)    amountB = L * (s - sa)
   so each balance alone caps the liquidity:
     LfromA = balanceA / (1/s - 1/sb),  LfromB = balanceB / (s - sa)
   and the fundable liquidity is the SMALLER cap — the scarcer side is
   used in full and the other side is partly left over. Below the range
   the position is entirely token A (token B cannot fund it at all, so
   the whole B balance is leftover and L is set by the range edges);
   at or above the top it is entirely token B, symmetrically. A zero
   balance on a side the position needs funds nothing and is rejected
   inside the range. Model only: no fees, no tick-spacing snapping,
   and a real deposit is quoted live on the pool page. */
function clmmWalletPlan(currentStr, lowerStr, upperStr, balanceAStr, balanceBStr) {
  var required = [currentStr, lowerStr, upperStr, balanceAStr, balanceBStr];
  for (var i = 0; i < required.length; i++) {
    if (required[i] == null || String(required[i]).trim() === "") return null;
  }
  var current = Number(currentStr), lower = Number(lowerStr), upper = Number(upperStr);
  var balanceA = Number(balanceAStr), balanceB = Number(balanceBStr);
  if (![current, lower, upper, balanceA, balanceB].every(Number.isFinite)) return null;
  if (current <= 0 || lower <= 0 || upper <= 0) return null;
  if (balanceA < 0 || balanceB < 0) return null;
  if (lower >= upper) return null;
  var s = Math.sqrt(current), sa = Math.sqrt(lower), sb = Math.sqrt(upper);
  var liquidity, usedA, usedB, status, limiting;
  if (current <= lower) {
    if (balanceA <= 0) return null;
    liquidity = balanceA / (1 / sa - 1 / sb);
    usedA = balanceA; usedB = 0; status = "below"; limiting = "A";
  } else if (current >= upper) {
    if (balanceB <= 0) return null;
    liquidity = balanceB / (sb - sa);
    usedA = 0; usedB = balanceB; status = "above"; limiting = "B";
  } else {
    if (balanceA <= 0 || balanceB <= 0) return null;
    var lFromA = balanceA / (1 / s - 1 / sb);
    var lFromB = balanceB / (s - sa);
    liquidity = Math.min(lFromA, lFromB);
    usedA = liquidity * (1 / s - 1 / sb);
    usedB = liquidity * (s - sa);
    status = "in";
    limiting = Math.abs(lFromA - lFromB) <= Math.max(lFromA, lFromB) * 1e-12 ? "both" : (lFromA < lFromB ? "A" : "B");
  }
  if (!Number.isFinite(liquidity) || liquidity <= 0 || usedA < 0 || usedB < 0) return null;
  return {
    currentPrice: current,
    lowerPrice: lower,
    upperPrice: upper,
    balanceA: balanceA,
    balanceB: balanceB,
    liquidity: liquidity,
    usedA: usedA,
    usedB: usedB,
    leftoverA: balanceA - usedA,
    leftoverB: balanceB - usedB,
    status: status,
    inRange: status === "in",
    limiting: limiting
  };
}

/* ---------- 15 · CLMM break-even days (Tools 12 + 13 joined) ---------- */
/* Tool 4 does this for constant-product positions; Tools 12 and 13
   leave the CLMM version as two numbers on two different forms:
   Tool 12 reports the fees (in token B) a position must earn to
   match holding at a check price, and Tool 13 estimates the fees
   (in token B) it earns per day. This tool divides one by the other:
     daysToBreakEven = feesNeededInB (Tool 12) / feesPerDayInB (Tool 13)
   Both halves are computed by calling those tools' own functions, so
   the hurdle and the rate can never drift apart from what their own
   forms show. Two honest edges: at the entry price there is no gap
   to close, so the answer is 0 days even if the fee rate is 0; and
   with a real gap but a 0 fee rate (no volume, a 0 fee tier, or 0%
   time in range) the position never catches holding at that rate —
   daysToBreakEven is Infinity, not a very large number. The result
   assumes the fee rate holds still for the whole period, which in a
   live pool it will not — volume, active liquidity and time in range
   all move. Model only — not a live quote or a yield promise. */
function clmmBreakEven(liquidityStr, lowerStr, upperStr, entryPriceStr, checkPriceStr, totalActiveLStr, volumePerDayStr, feeBps, inRangePctStr) {
  var vh = clmmVsHold(liquidityStr, lowerStr, upperStr, entryPriceStr, checkPriceStr);
  if (vh === null) return null;
  /* one day of Tool 13's estimator at the same liquidity: its fees
     for a 1-day period are exactly its fees per day */
  var est = clmmFeeEstimate(liquidityStr, totalActiveLStr, volumePerDayStr, feeBps, "1", inRangePctStr, "");
  if (est === null) return null;
  var feesNeeded = vh.feesNeededInB;
  var days;
  if (feesNeeded <= 1e-12) days = 0;
  else if (est.feesPerDay > 0) days = feesNeeded / est.feesPerDay;
  else days = Infinity;
  return {
    liquidity: vh.liquidity,
    lowerPrice: vh.lowerPrice,
    upperPrice: vh.upperPrice,
    entryPrice: vh.entryPrice,
    checkPrice: vh.checkPrice,
    entryStatus: vh.entryStatus,
    checkStatus: vh.checkStatus,
    holdValueInB: vh.holdValueInB,
    positionValueInB: vh.positionValueInB,
    vsHoldPct: vh.vsHoldPct,
    feesNeededInB: feesNeeded,
    sharePct: est.sharePct,
    poolFeesPerDay: est.poolFeesPerDay,
    feesPerDay: est.feesPerDay,
    inRangePct: est.inRangePct,
    daysToBreakEven: days
  };
}

/* ---------- 16 · Constant-product arbitrage model ---------- */
/* Why pools stay near the market price: if a pool's spot price
   (reserveB / reserveA, in B per A) differs from a price elsewhere,
   a trade that moves the pool's price TO that external price is
   the textbook arbitrage. With k = reserveA * reserveB held
   constant, the reserves at the external price Pe are forced:
     reserveA' = sqrt(k / Pe),  reserveB' = sqrt(k * Pe)
   Pe above spot: A is cheap in the pool — pay B in (net
   reserveB' - reserveB), take A out (reserveA - reserveA').
   Pe below spot: the mirror — pay A in, take B out. The fee is
   taken from the input before it reaches the pool (as in Tool 1),
   so the gross input is net / (1 - fee) and the modelled profit,
   valued in B at the external price, is
     outValueInB - grossInValueInB.
   A gap smaller than the fee makes that profit negative at the
   price-aligning size — reported as-is, never dressed up. The
   external price is YOUR input, not a live feed: this sizes a
   textbook trade against a price you supply, it does not find
   one. Model only — no routing, no other venues' depth or fees,
   no transaction costs, not financial advice. */
function cpArbitrage(reserveAStr, reserveBStr, externalPriceStr, feeBps) {
  var required = [reserveAStr, reserveBStr, externalPriceStr, feeBps];
  for (var i = 0; i < required.length; i++) {
    if (required[i] == null || String(required[i]).trim() === "") return null;
  }
  var ra = Number(reserveAStr), rb = Number(reserveBStr);
  var pe = Number(externalPriceStr), fee = Number(feeBps);
  if (![ra, rb, pe, fee].every(Number.isFinite)) return null;
  if (ra <= 0 || rb <= 0 || pe <= 0) return null;
  if (fee < 0 || fee >= 10000) return null;
  var spot = rb / ra;
  var k = ra * rb;
  var targetA = Math.sqrt(k / pe), targetB = Math.sqrt(k * pe);
  var base = { reserveA: ra, reserveB: rb, spotPrice: spot, externalPrice: pe,
    priceGapPct: (pe / spot - 1) * 100, feeBps: fee, postTradeSpot: pe };
  if (Math.abs(pe - spot) / spot < 1e-12) {
    return Object.assign(base, { direction: "none", inToken: null, netIn: 0, grossIn: 0, amountOut: 0, outToken: null, profitInB: 0 });
  }
  var keep = 1 - fee / 10000;
  if (pe > spot) {
    var netInB = targetB - rb, outA = ra - targetA;
    var grossInB = netInB / keep;
    return Object.assign(base, { direction: "buy-a", inToken: "B", netIn: netInB, grossIn: grossInB, amountOut: outA, outToken: "A", profitInB: outA * pe - grossInB });
  }
  var netInA = targetA - ra, outB = rb - targetB;
  var grossInA = netInA / keep;
  return Object.assign(base, { direction: "sell-a", inToken: "A", netIn: netInA, grossIn: grossInA, amountOut: outB, outToken: "B", profitInB: outB - grossInA * pe });
}

/* ---------- 17 · Price-impact trade sizer ---------- */
/* The inverse question to Tool 1: not "what does this trade get?"
   but "how large can a trade get before its price impact crosses a
   cap I choose?" Tool 1 measures price impact as
     1 - (effective price / spot price),  effective = out / grossIn,
   a measure that INCLUDES the fee: even a vanishingly small trade
   shows impact = the fee fraction, because the fee is taken from
   the input before the curve sees it. With net = grossIn*(1-fee)
   reaching the pool, out/spot-expected works out to
   reserveIn*(1-fee) / (reserveIn + net), so setting the impact
   equal to the cap p and solving for the input gives
     grossIn = reserveIn * (p - fee) / ((1 - p) * (1 - fee)).
   Two honest consequences, reported as-is: a cap at or below the
   fee itself admits no positive trade at all (feasible:false, the
   only trade that fits is none), and the answer scales with the
   pool — the same cap in a pool 10x deeper allows a trade 10x
   larger, which is the whole point of pool depth. Model only —
   the reserves are your inputs, not live pool state, and real
   routes split trades across pools. Not financial advice. */
function priceImpactSizer(reserveInStr, reserveOutStr, maxImpactPctStr, feeBps) {
  var required = [reserveInStr, reserveOutStr, maxImpactPctStr, feeBps];
  for (var i = 0; i < required.length; i++) {
    if (required[i] == null || String(required[i]).trim() === "") return null;
  }
  var rin = Number(reserveInStr), rout = Number(reserveOutStr);
  var capPct = Number(maxImpactPctStr), fee = Number(feeBps);
  if (![rin, rout, capPct, fee].every(Number.isFinite)) return null;
  if (rin <= 0 || rout <= 0) return null;
  if (capPct <= 0 || capPct >= 100) return null;
  if (!Number.isInteger(fee) || fee < 0 || fee > 9999) return null;
  var feeFrac = fee / 10000, pFrac = capPct / 100;
  var base = { reserveIn: rin, reserveOut: rout, spotPrice: rout / rin,
    maxImpactPct: capPct, feeBps: fee, feeImpactPct: feeFrac * 100 };
  if (pFrac <= feeFrac) {
    return Object.assign(base, { feasible: false, maxAmountIn: 0, netIn: 0, amountOut: 0, actualImpactPct: feeFrac * 100 });
  }
  var grossIn = rin * (pFrac - feeFrac) / ((1 - pFrac) * (1 - feeFrac));
  var netIn = grossIn * (1 - feeFrac);
  var amountOut = rout * netIn / (rin + netIn);
  var effective = amountOut / grossIn;
  return Object.assign(base, {
    feasible: true,
    maxAmountIn: grossIn,
    netIn: netIn,
    amountOut: amountOut,
    effectivePrice: effective,
    actualImpactPct: (1 - effective / base.spotPrice) * 100,
    postTradeSpotPrice: (rout - amountOut) / (rin + netIn)
  });
}

/* ---------- 18 · LP-token share & value calculator ---------- */
/* Tools 5 and 7 work in share percentages, but what an LP actually
   HOLDS is a count of LP tokens against the pool's total LP supply —
   and that count is the share: share = yourTokens / totalSupply.
   Redeeming (burning) those tokens pays out both reserves in the
   pool's current ratio, exactly as Tool 7 models for a percentage:
     amountOut = reserve * yourTokens / totalSupply
   computed in exact scaled-BigInt and floored at 9 dp (the pool
   keeps any sub-unit remainder, as on-chain programs do). The
   position's value in token B values the token-A side at the pool's
   own spot price (reserveB / reserveA) — the pool's price, not an
   external one, so it is the value the pool itself implies. Two
   honest consequences: the share a fixed token count represents
   SHRINKS as new LPs deposit (the supply grows), so a count that
   was 1% at deposit need not be 1% now; and holding every token in
   the supply redeems the whole pool, no more and no less. Model
   only — no withdrawal fee is modelled, and a real redemption is
   quoted live on the pool page. CLMM positions are NFTs with
   range-based amounts (Tools 8/9), not fungible LP tokens. */
function lpTokenValue(reserveAStr, reserveBStr, totalSupplyStr, yourTokensStr) {
  var required = [reserveAStr, reserveBStr, totalSupplyStr, yourTokensStr];
  for (var i = 0; i < required.length; i++) {
    if (required[i] == null || String(required[i]).trim() === "") return null;
  }
  var ra = parseScaled(reserveAStr), rb = parseScaled(reserveBStr);
  var supply = parseScaled(totalSupplyStr), yours = parseScaled(yourTokensStr);
  if (ra === null || rb === null || supply === null || yours === null) return null;
  if (ra <= 0n || rb <= 0n || supply <= 0n || yours <= 0n) return null;
  if (yours > supply) return null;
  var outA = ra * yours / supply;
  var outB = rb * yours / supply;
  if (outA <= 0n || outB <= 0n) return null;
  var spot = scaledToNumber(rb) / scaledToNumber(ra);
  return {
    amountA: formatScaled(outA),
    amountB: formatScaled(outB),
    remainingReserveA: formatScaled(ra - outA),
    remainingReserveB: formatScaled(rb - outB),
    sharePct: scaledToNumber(yours) / scaledToNumber(supply) * 100,
    priceBperA: spot,
    valueInB: scaledToNumber(outB) + scaledToNumber(outA) * spot
  };
}

/* ---------- 19 · Single-sided zap-in planner (constant-product pools) ---------- */
/* Tools 5 and 14 assume you already hold both tokens in the right
   ratio. A wallet often holds only ONE side — say token A — and the
   standard way in is a "zap": swap part of the A for B in the same
   pool, then deposit what remains of the A together with all of the
   B the swap returned. The whole question is the split. The swap
   follows Tool 1's model (net = grossIn * (1 - fee) reaches the
   pool, out = reserveB * net / (reserveA + net), post-swap reserves
   Ra+net / Rb-out), and the deposit must match the POST-swap ratio
   (Tool 5), so with s the amount swapped and k = 1 - fee:
     out / (X - s)  =  (Rb - out) / (Ra + k*s)
   Substituting Tool 1's out and clearing denominators gives a
   quadratic in s:  k^2*s^2 + Ra*(k+1)*s - Ra*X = 0, whose positive
   root is the split (at zero fee it reduces to the classic
   s = sqrt(Ra*(Ra + X)) - Ra). Two invariants fall out and are
   tested: the B the swap takes out comes straight back in as the
   deposit, so the pool's final B reserve equals the B reserve you
   started with; and the deposit's share is the same fraction on
   both sides. A larger fee makes the swap leg less efficient, so
   the split swaps slightly MORE of the holding to raise the same
   B. Model only — one trade in one pool, no routing, no price
   movement between the swap and the deposit (a real zap is a
   single transaction for exactly that reason), and the reserves
   are your inputs, not live pool state. CLMM positions are
   range-based and a single-sided CLMM entry is Tools 8/14's
   entirely-one-token case, not this. Not financial advice. */
function zapInPlan(reserveAStr, reserveBStr, amountAStr, feeBps) {
  var required = [reserveAStr, reserveBStr, amountAStr, feeBps];
  for (var i = 0; i < required.length; i++) {
    if (required[i] == null || String(required[i]).trim() === "") return null;
  }
  var ra = Number(reserveAStr), rb = Number(reserveBStr);
  var x = Number(amountAStr), fee = Number(feeBps);
  if (![ra, rb, x, fee].every(Number.isFinite)) return null;
  if (ra <= 0 || rb <= 0 || x <= 0) return null;
  if (!Number.isInteger(fee) || fee < 0 || fee > 9999) return null;
  var k = 1 - fee / 10000;
  var a = k * k, b = ra * (k + 1), c = -ra * x;
  /* Stable product-form root: the naive (-b + sqrt(disc)) / (2a)
     subtracts two nearly-equal numbers when the holding is tiny
     against a deep pool and returned splits ~2% off there (0.00049073
     instead of 0.00050063 on a 1e12/1e12 pool with a 0.001 holding);
     -2c / (b + sqrt(disc)) is the same root with no cancellation. */
  var s = (-2 * c) / (b + Math.sqrt(b * b - 4 * a * c));
  if (!Number.isFinite(s) || s <= 0 || s >= x) return null;
  var netIn = s * k;
  var amountOut = rb * netIn / (ra + netIn);
  var depositA = x - s, depositB = amountOut;
  if (!(amountOut > 0) || !(depositA > 0)) return null;
  var postSwapReserveA = ra + netIn, postSwapReserveB = rb - amountOut;
  var finalReserveA = postSwapReserveA + depositA;
  var finalReserveB = postSwapReserveB + depositB;
  return {
    reserveA: ra, reserveB: rb, amountA: x, feeBps: fee,
    swapIn: s, netIn: netIn, swapOut: amountOut,
    depositA: depositA, depositB: depositB,
    postSwapReserveA: postSwapReserveA, postSwapReserveB: postSwapReserveB,
    finalReserveA: finalReserveA, finalReserveB: finalReserveB,
    sharePct: depositA / finalReserveA * 100,
    spotPrice: rb / ra
  };
}

/* ---------- 50 · Single-sided zap-in planner from token B (constant-product pools) ---------- */
/* Tool 19's entry mirror. Tool 19 zaps in from a wallet holding only
   token A, but a wallet holding only token B — the stablecoin side of
   the pair, say — needs the same entry run the other way: swap part
   of the B for A in the same pool, then deposit the B that remains
   together with all the A the swap returned. The split is the one
   where the deposit matches the pool's POST-swap ratio: with k the
   after-fee fraction it solves k^2 t^2 + Rb(k+1) t - Rb*Y = 0 for the
   B amount t to swap — Tool 19's quadratic with the reserves swapped
   — taken in the cancellation-free product form, for the reason
   Tool 19's own comment gives. One honest invariant, mirrored: the A
   comes straight back in as the deposit, so the pool's A reserve ends
   where it started. On a balanced pool the plan is Tool 19's own
   numbers mirrored (100 B at 25 bps on 1000/1000: swap 48.8728 B for
   46.4845 A, deposit 51.1272 B with that A, share 4.6484%). Model
   only — one pool, no routing, no price movement between the swap
   and the deposit (a real zap is a single transaction for exactly
   that reason), and the reserves are your inputs, not live pool
   state. CLMM entries are range-based and differ (Tools 33 and 48).
   Not financial advice. */
function zapInPlanB(reserveAStr, reserveBStr, amountBStr, feeBps) {
  var required = [reserveAStr, reserveBStr, amountBStr, feeBps];
  for (var i = 0; i < required.length; i++) {
    if (required[i] == null || String(required[i]).trim() === "") return null;
  }
  var ra = Number(reserveAStr), rb = Number(reserveBStr);
  var y = Number(amountBStr), fee = Number(feeBps);
  if (![ra, rb, y, fee].every(Number.isFinite)) return null;
  if (ra <= 0 || rb <= 0 || y <= 0) return null;
  if (!Number.isInteger(fee) || fee < 0 || fee > 9999) return null;
  var k = 1 - fee / 10000;
  var a = k * k, b = rb * (k + 1), c = -rb * y;
  var t = (-2 * c) / (b + Math.sqrt(b * b - 4 * a * c));
  if (!Number.isFinite(t) || t <= 0 || t >= y) return null;
  var netIn = t * k;
  var amountOut = ra * netIn / (rb + netIn);
  var depositB = y - t, depositA = amountOut;
  if (!(amountOut > 0) || !(depositB > 0)) return null;
  var postSwapReserveA = ra - amountOut, postSwapReserveB = rb + netIn;
  var finalReserveA = postSwapReserveA + depositA;
  var finalReserveB = postSwapReserveB + depositB;
  return {
    reserveA: ra, reserveB: rb, amountB: y, feeBps: fee,
    swapIn: t, netIn: netIn, swapOut: amountOut,
    depositA: depositA, depositB: depositB,
    postSwapReserveA: postSwapReserveA, postSwapReserveB: postSwapReserveB,
    finalReserveA: finalReserveA, finalReserveB: finalReserveB,
    sharePct: depositB / finalReserveB * 100,
    spotPrice: rb / ra
  };
}

/* ---------- 20 · Single-sided zap-out planner (constant-product pools) ---------- */
/* Tool 19's exit mirror. Tool 7's withdrawal always pays BOTH tokens
   in the pool's ratio, but a wallet often wants to leave holding ONE
   token — say token A. The standard way out is a "zap-out": withdraw
   (Tool 7's model, unchanged), then swap all of the token B the
   withdrawal returned back into token A in the same pool, against
   the POST-withdrawal reserves (Tool 1's model, unchanged). Both
   legs are computed by those tools' own functions, so the numbers
   can never drift from their own forms. The consolidation is not
   free, and the tool prices it honestly: valueAtSpotA is what the
   withdrawn pair would be worth in A if the B leg filled at the
   post-withdrawal spot price with no fee and no impact, and
   consolidationCostA / consolidationCostPct are the difference —
   the fee plus the price impact of swapping into a pool your own
   withdrawal just made shallower, which is why the cost grows with
   your share of the pool. One honest edge: withdrawing 100% of a
   pool you own 100% of leaves no pool behind to swap in, so that
   combination returns feasible: false (you simply keep both
   tokens, or swap elsewhere) instead of a made-up fill. Model
   only — one pool, no routing, no price movement between the
   withdrawal and the swap (a real zap-out is a single transaction
   for exactly that reason), no withdrawal fee modelled, and the
   reserves are your inputs, not live pool state. CLMM exits are
   range-based and differ. Not financial advice. */
function zapOutPlan(reserveAStr, reserveBStr, sharePctStr, withdrawPctStr, feeBps) {
  var required = [reserveAStr, reserveBStr, sharePctStr, withdrawPctStr, feeBps];
  for (var i = 0; i < required.length; i++) {
    if (required[i] == null || String(required[i]).trim() === "") return null;
  }
  var fee = Number(feeBps);
  if (!Number.isInteger(fee) || fee < 0 || fee > 9999) return null;
  var wd = withdrawPlan(reserveAStr, reserveBStr, sharePctStr, withdrawPctStr);
  if (wd === null) return null;
  var base = {
    withdrawA: wd.outA, withdrawB: wd.outB,
    postWithdrawReserveA: wd.remainingReserveA, postWithdrawReserveB: wd.remainingReserveB,
    sharePct: wd.sharePct, withdrawPct: wd.withdrawPct, feeBps: fee
  };
  var remA = parseScaled(wd.remainingReserveA), remB = parseScaled(wd.remainingReserveB);
  if (remA <= 0n || remB <= 0n) {
    return Object.assign(base, { feasible: false, swapInB: wd.outB, swapOutA: null, totalA: null,
      spotPrice: null, priceImpactPct: null, valueAtSpotA: null, consolidationCostA: null, consolidationCostPct: null });
  }
  var swap = cpSwap(wd.remainingReserveB, wd.remainingReserveA, wd.outB, fee);
  if (swap === null) return null;
  var totalA = parseScaled(wd.outA) + parseScaled(swap.out);
  var spot = scaledToNumber(remB) / scaledToNumber(remA);
  var valueAtSpotA = scaledToNumber(parseScaled(wd.outA)) + scaledToNumber(parseScaled(wd.outB)) / spot;
  var totalANum = scaledToNumber(totalA);
  return Object.assign(base, {
    feasible: true,
    swapInB: wd.outB,
    swapOutA: swap.out,
    totalA: formatScaled(totalA),
    spotPrice: spot,
    priceImpactPct: swap.priceImpactPct,
    valueAtSpotA: valueAtSpotA,
    consolidationCostA: valueAtSpotA - totalANum,
    consolidationCostPct: (valueAtSpotA - totalANum) / valueAtSpotA * 100
  });
}

/* ---------- 51 · Single-sided zap-out planner to token B (constant-product pools) ---------- */
/* Tool 20's exit mirror. Tool 20 zaps out to token A alone, but a
   wallet that measures itself in token B — the stablecoin side of
   the pair, say — wants to leave holding B: withdraw (Tool 7's
   model, unchanged), then swap all of the token A the withdrawal
   returned back into token B in the same pool, against the
   POST-withdrawal reserves (Tool 1's model, unchanged). Both legs
   are computed by those tools' own functions, so the numbers can
   never drift from their own forms. The consolidation is priced in
   B the way Tool 20 prices it in A: valueAtSpotB is what the
   withdrawn pair would be worth in B if the A leg filled at the
   post-withdrawal spot price with no fee and no impact, and
   consolidationCostB / consolidationCostPct are the difference —
   the fee plus the price impact of swapping into a pool your own
   withdrawal just made shallower, which is why the cost grows with
   your share of the pool. On a balanced pool the plan is Tool 20's
   own numbers mirrored (withdrawing a 10% share of 1000/1000 in
   full at 25 bps: swap 100 A for 89.797449362 B, total
   189.797449362 B against a 200 B spot value). The same honest
   edge: withdrawing 100% of a pool you own 100% of leaves no pool
   behind to swap in, so that combination returns feasible: false
   (you simply keep both tokens, or swap elsewhere) instead of a
   made-up fill. Model only — one pool, no routing, no price
   movement between the withdrawal and the swap (a real zap-out is
   a single transaction for exactly that reason), no withdrawal fee
   modelled, and the reserves are your inputs, not live pool state.
   CLMM exits are range-based and differ (Tool 49). Not financial
   advice. */
function zapOutPlanB(reserveAStr, reserveBStr, sharePctStr, withdrawPctStr, feeBps) {
  var required = [reserveAStr, reserveBStr, sharePctStr, withdrawPctStr, feeBps];
  for (var i = 0; i < required.length; i++) {
    if (required[i] == null || String(required[i]).trim() === "") return null;
  }
  var fee = Number(feeBps);
  if (!Number.isInteger(fee) || fee < 0 || fee > 9999) return null;
  var wd = withdrawPlan(reserveAStr, reserveBStr, sharePctStr, withdrawPctStr);
  if (wd === null) return null;
  var base = {
    withdrawA: wd.outA, withdrawB: wd.outB,
    postWithdrawReserveA: wd.remainingReserveA, postWithdrawReserveB: wd.remainingReserveB,
    sharePct: wd.sharePct, withdrawPct: wd.withdrawPct, feeBps: fee
  };
  var remA = parseScaled(wd.remainingReserveA), remB = parseScaled(wd.remainingReserveB);
  if (remA <= 0n || remB <= 0n) {
    return Object.assign(base, { feasible: false, swapInA: wd.outA, swapOutB: null, totalB: null,
      spotPrice: null, priceImpactPct: null, valueAtSpotB: null, consolidationCostB: null, consolidationCostPct: null });
  }
  var swap = cpSwap(wd.remainingReserveA, wd.remainingReserveB, wd.outA, fee);
  if (swap === null) return null;
  var totalB = parseScaled(wd.outB) + parseScaled(swap.out);
  var spot = scaledToNumber(remB) / scaledToNumber(remA);
  var valueAtSpotB = scaledToNumber(parseScaled(wd.outB)) + scaledToNumber(parseScaled(wd.outA)) * spot;
  var totalBNum = scaledToNumber(totalB);
  return Object.assign(base, {
    feasible: true,
    swapInA: wd.outA,
    swapOutB: swap.out,
    totalB: formatScaled(totalB),
    spotPrice: spot,
    priceImpactPct: swap.priceImpactPct,
    valueAtSpotB: valueAtSpotB,
    consolidationCostB: valueAtSpotB - totalBNum,
    consolidationCostPct: (valueAtSpotB - totalBNum) / valueAtSpotB * 100
  });
}

/* ---------- 21 · IL tolerance band (constant-product pool, 50/50 start) ---------- */
/* Tools 2 and 4 answer forwards: at THIS price move, how much impermanent
   loss, and how many fees to break even against it (Tool 4's feesNeeded =
   holdValue - lpValue)? This one inverts Tool 4 exactly: given the fees a
   position has already earned, how far can the price still move before the
   shortfall against holding consumes those fees? Tool 4's shortfall as a
   fraction of the deposit is (1 + r)/2 - sqrt(r) = (sqrt(r) - 1)^2 / 2, so
   with f = fees / deposit the band edges are sqrt(r) = 1 +/- sqrt(2f) —
   symmetric in the square root of the price, not in the price itself.
   One honest asymmetry: as the price falls to zero the shortfall caps at
   half the deposit (the half of the position held in the other token is
   untouched), so fees of 50% of the deposit or more can never be consumed
   by a fall, however far — reported as downUnbounded, not a made-up edge.
   A rise has no such cap. Zero fees earned means the band has already
   collapsed to the entry price. Model only — constant product, 50/50
   start, fees counted in the deposit's terms and held outside the pool;
   no compounding and no fee growth of the position itself is modelled.
   Not financial advice. */
function ilToleranceBand(depositStr, feesStr) {
  var required = [depositStr, feesStr];
  for (var i = 0; i < required.length; i++) {
    if (required[i] == null || String(required[i]).trim() === "") return null;
  }
  var dep = Number(depositStr), fees = Number(feesStr);
  if (!Number.isFinite(dep) || !Number.isFinite(fees)) return null;
  if (dep <= 0 || fees < 0) return null;
  var f = fees / dep;
  var a = Math.sqrt(2 * f);
  var rHigh = (1 + a) * (1 + a);
  var base = {
    deposit: dep, feesEarned: fees, feePctOfDeposit: f * 100,
    priceRatioHigh: rHigh, moveUpPct: (rHigh - 1) * 100
  };
  if (f >= 0.5) {
    return Object.assign(base, { downUnbounded: true, priceRatioLow: null, moveDownPct: null });
  }
  var rLow = (1 - a) * (1 - a);
  return Object.assign(base, {
    downUnbounded: false,
    priceRatioLow: rLow,
    moveDownPct: (1 - rLow) * 100
  });
}

/* ---------- 22 · CLMM symmetric-range (±%) planner ---------- */
/* Tools 8/14 ask for a CLMM range as two raw prices, but the way LPs
   actually talk about a range is a width around the current price:
   "±25%". This tool takes that form — current price P and a width w%
   — and builds the range MULTIPLICATIVELY symmetric around P:
     upper = P * m,  lower = P / m,  with m = 1 + w/100.
   Multiplicative symmetry is the honest kind for prices (a rise and a
   fall that undo each other), and it has a visible consequence the
   tool reports rather than hides: the percentage room differs by
   side — ±25% of width is +25% of room up but only −20% down,
   because the lower edge is P/1.25, not P*(1 − 0.25).
   With a pool tick spacing (optional), the raw edges are snapped the
   way pools require BEFORE planning — lower tick down, upper tick up
   (Tool 11's rule, floor division) — and the deposit is planned on
   the SNAPPED range's prices, because that is the range a real
   position would actually cover; without a spacing the raw range is
   planned as-is. Ranges whose ticks fall outside the standard CLMM
   tick range (-443636..443636, Tool 11) are rejected. The deposit
   itself is planned by Tool 8's own clmmRangePlan, so the split and
   liquidity can never drift from that tool's numbers. Model only —
   no fees, and a real position is quoted live on the pool page. */
function clmmSymmetricRange(currentStr, widthPctStr, amountAStr, spacingStr) {
  var required = [currentStr, widthPctStr, amountAStr];
  for (var i = 0; i < required.length; i++) {
    if (required[i] == null || String(required[i]).trim() === "") return null;
  }
  var current = Number(currentStr), widthPct = Number(widthPctStr), amountA = Number(amountAStr);
  if (![current, widthPct, amountA].every(Number.isFinite)) return null;
  if (current <= 0 || widthPct <= 0 || amountA <= 0) return null;
  var m = 1 + widthPct / 100;
  var rawLower = current / m, rawUpper = current * m;
  var tickLower = priceToTick(rawLower), tickUpper = priceToTick(rawUpper);
  if (tickLower < TICK_MIN || tickUpper > TICK_MAX) return null;
  var effLower = rawLower, effUpper = rawUpper, snapped = false, spacing = null;
  if (spacingStr != null && String(spacingStr).trim() !== "") {
    spacing = Number(spacingStr);
    if (!Number.isInteger(spacing) || spacing <= 0) return null;
    var downTick = Math.floor(tickLower / spacing) * spacing;
    var floorUp = Math.floor(tickUpper / spacing) * spacing;
    var upTick = floorUp === tickUpper ? tickUpper : floorUp + spacing;
    if (downTick < TICK_MIN || upTick > TICK_MAX) return null;
    snapped = downTick !== tickLower || upTick !== tickUpper;
    tickLower = downTick; tickUpper = upTick;
    effLower = tickToPrice(downTick); effUpper = tickToPrice(upTick);
    if (effLower == null || effUpper == null) return null;
  }
  var plan = clmmRangePlan(String(current), String(effLower), String(effUpper), String(amountA));
  if (plan === null) return null;
  return {
    currentPrice: current,
    widthPct: widthPct,
    multiple: m,
    rawLower: rawLower,
    rawUpper: rawUpper,
    effLower: effLower,
    effUpper: effUpper,
    snapped: snapped,
    spacing: spacing,
    tickLower: tickLower,
    tickUpper: tickUpper,
    amountA: amountA,
    requiredB: plan.requiredB,
    liquidity: plan.liquidity,
    bValuePct: plan.bValuePct,
    upRoomPct: (effUpper / current - 1) * 100,
    downRoomPct: (1 - effLower / current) * 100
  };
}

/* ---------- 23 · Two-hop swap model ---------- */
/* Real trades often have no direct pool for the pair wanted, so they
   route through an intermediate token: A -> M in one constant-product
   pool, then M -> C in a second. This model is Tool 1 twice, honestly
   composed: hop 1 is cpSwap on the first pool, and hop 2's input is
   hop 1's output STRING exactly as Tool 1 reports it (floored at
   9 dp — that, not a hidden-precision value, is what the second pool
   would receive). Each hop pays its own pool's fee and takes its own
   price impact against its own reserves, so the routed trade always
   does worse than either hop alone. The combined spot price is the
   product of the two hops' spot prices (M per A x C per M = C per A),
   and the combined price impact follows Tool 1's definition against
   that product — equivalently 1 - (1 - i1)(1 - i2) for the hops'
   impacts i1 and i2. Both hops are CP pools in this model; a real
   route may cross CLMM pools, other venues and priority fees, none of
   which are modelled. Model only — your inputs, not live pool state.
   Not a live quote and not financial advice. */
function twoHopSwap(reserve1InStr, reserve1OutStr, reserve2InStr, reserve2OutStr, amountInStr, fee1Bps, fee2Bps) {
  var hop1 = cpSwap(reserve1InStr, reserve1OutStr, amountInStr, fee1Bps);
  if (hop1 === null) return null;
  var hop2 = cpSwap(reserve2InStr, reserve2OutStr, hop1.out, fee2Bps);
  if (hop2 === null) return null;
  var amountIn = Number(amountInStr);
  if (!Number.isFinite(amountIn) || amountIn <= 0) return null;
  var spotPrice = hop1.spotPrice * hop2.spotPrice;
  var effectivePrice = Number(hop2.out) / amountIn;
  return {
    amountIn: amountIn,
    midOut: hop1.out,
    out: hop2.out,
    hop1ImpactPct: hop1.priceImpactPct,
    hop2ImpactPct: hop2.priceImpactPct,
    spotPrice: spotPrice,
    effectivePrice: effectivePrice,
    priceImpactPct: (1 - effectivePrice / spotPrice) * 100,
    fee1Pct: hop1.feePct,
    fee2Pct: hop2.feePct
  };
}

/* ---------- 24 · Net LP return calculator (fees earned vs holding) ---------- */
/* Tools 2 and 4 answer their halves separately: Tool 2 values the LP
   position and the hold alternative at a price move, and Tool 4 turns
   the gap between them into the fees needed to break even. This tool
   asks the question an LP actually settles with — "I earned THIS much
   in fees: am I ahead of or behind simply holding, and by how much?"
     netLpValue = lpValue + feesEarned
     netVsHold  = netLpValue - holdValue = feesEarned - feesNeeded
   Hold and LP values come from Tool 2's own impermanentLoss and the
   hurdle from the same subtraction Tool 4 makes, so the verdict can
   never drift from their forms. Two different bottom lines are both
   reported and neither is hidden: netVsHoldPct against holding, and
   netReturnPct against the deposit itself — a position can be UP on
   its deposit and still behind holding (at a 2x move with no fees the
   position is +41.4% on the deposit yet −5.72% vs holding), and only
   the holding comparison says whether providing liquidity beat doing
   nothing. Fees are counted in the deposit's ($) terms and held
   outside the pool — the same convention as Tools 4 and 21: no
   compounding, and fees the pool auto-compounds in reality are not
   separated out. Model only — a 50/50 constant-product position;
   CLMM positions are range-based and differ (Tools 12/15). */
function netLpReturn(priceRatio, depositStr, feesStr) {
  if (feesStr == null || String(feesStr).trim() === "") return null;
  var il = impermanentLoss(priceRatio, depositStr);
  if (il === null || il.deposit == null || !(il.deposit > 0)) return null;
  var fees = Number(feesStr);
  if (!Number.isFinite(fees) || fees < 0) return null;
  var feesNeeded = il.holdValue - il.lpValue;
  var netLpValue = il.lpValue + fees;
  var netVsHold = netLpValue - il.holdValue;
  var tol = 1e-9 * Math.max(1, il.holdValue);
  return {
    priceRatio: il.priceRatio,
    deposit: il.deposit,
    ilPct: il.ilPct,
    holdValue: il.holdValue,
    lpValue: il.lpValue,
    feesEarned: fees,
    feesNeeded: feesNeeded,
    feesCoveragePct: feesNeeded > 1e-9 ? fees / feesNeeded * 100 : null,
    netLpValue: netLpValue,
    netVsHold: netVsHold,
    netVsHoldPct: il.holdValue > 0 ? netVsHold / il.holdValue * 100 : 0,
    netReturnPct: (netLpValue - il.deposit) / il.deposit * 100,
    verdict: Math.abs(netVsHold) <= tol ? "even" : (netVsHold > 0 ? "ahead" : "behind")
  };
}

/* ---------- 25 · CLMM capital-efficiency calculator ---------- */
/* Why concentrated liquidity exists at all: a position spread over every
   possible price (a constant-product pool, in CLMM terms the full range
   0 to infinity) keeps most of its capital parked at prices the market
   never visits. A CLMM range position puts the same model liquidity L
   to work with far less capital. The comparison is exact at the current
   price: the ranged position holds Tool 9's own amounts for that L, and
   a full-range position with the same L holds L/sqrt(P) of A and
   L*sqrt(P) of B (the ranged formulas as lower -> 0 and upper -> inf).
   Capital efficiency = full-range value in B / ranged value in B, both
   valued at the current price. For a geometrically centred range
   (lower = P/m, upper = P*m) it collapses to 1 / (1 - 1/sqrt(m)) —
   the 0.8-1.25 range at price 1 (m = 1.25) is 9.47x — and the tests
   assert that closed form exactly. The honest half the headline hides:
   the multiple is not free money. The ranged position earns fees only
   while the price stays inside the range, and its impermanent loss per
   unit of liquidity is amplified by the same concentration (Tool 12
   measures it). Efficiency here compares capital for the same L at one
   price, nothing more. The price must sit strictly inside the range —
   at or outside an edge the position is single-sided and out of the
   market, so "efficiency" would be a number about a position that is
   not providing tradeable liquidity at the current price. Model only:
   no live pool state, not financial advice. */
function clmmCapitalEfficiency(liquidityStr, lowerStr, upperStr, priceStr) {
  var pos = clmmPositionAtPrice(liquidityStr, lowerStr, upperStr, priceStr);
  if (pos === null || pos.status !== "in") return null;
  var s = Math.sqrt(pos.price);
  var fullAmountA = pos.liquidity / s;
  var fullAmountB = pos.liquidity * s;
  var fullValueB = fullAmountA * pos.price + fullAmountB;
  if (!Number.isFinite(fullValueB) || !(fullValueB > 0) || !(pos.valueInB > 0)) return null;
  var efficiency = fullValueB / pos.valueInB;
  if (!Number.isFinite(efficiency) || !(efficiency > 0)) return null;
  return {
    liquidity: pos.liquidity,
    lowerPrice: pos.lowerPrice,
    upperPrice: pos.upperPrice,
    price: pos.price,
    rangeAmountA: pos.amountA,
    rangeAmountB: pos.amountB,
    rangeValueB: pos.valueInB,
    rangeBValuePct: pos.bValuePct,
    fullAmountA: fullAmountA,
    fullAmountB: fullAmountB,
    fullValueB: fullValueB,
    efficiency: efficiency,
    capitalSavedPct: (1 - pos.valueInB / fullValueB) * 100
  };
}

/* ---------- 26 · Pool depth planner ---------- */
/* Tool 17 answers "given this pool, how big a trade fits my impact
   cap?". A pool creator asks the inverse: "given the trade size I
   expect and the impact cap I want it to respect, how deep must the
   pool be?". Tool 17's closed form inverts exactly. With impact
   fraction p, fee fraction f and pay-in A, the input-side reserve
   that puts a trade of A exactly at the cap is
     reserveIn = A * (1 - p) * (1 - f) / (p - f)
   and the output-side reserve follows from the spot price the
   creator chooses (out per in): reserveOut = reserveIn * spot.
   The trade then returns A * spot * (1 - p) by construction — its
   effective price is exactly (1 - p) of spot. Depth scales linearly:
   twice the expected trade needs twice the reserves on both sides,
   and a tighter cap needs a deeper pool for the same trade. As in
   Tool 17, a cap at or below the fee admits no positive trade at any
   depth (the fee alone consumes the cap), so that case is reported
   as feasible:false rather than an infinite reserve. Depth is quoted
   for ONE trade at the cap in an otherwise untouched pool — repeated
   same-direction trades each move the price further, and a deeper
   pool is not a safe pool: depth says nothing about the tokens, the
   price being right, or impermanent loss. Model only: the reserves
   are targets you would have to fund, not live pool state. */
function poolDepthPlan(amountInStr, maxImpactPctStr, spotStr, feeBps) {
  var required = [amountInStr, maxImpactPctStr, spotStr, feeBps];
  for (var i = 0; i < required.length; i++) {
    if (required[i] == null || String(required[i]).trim() === "") return null;
  }
  var ain = Number(amountInStr), capPct = Number(maxImpactPctStr);
  var spot = Number(spotStr), fee = Number(feeBps);
  if (![ain, capPct, spot, fee].every(Number.isFinite)) return null;
  if (ain <= 0 || spot <= 0) return null;
  if (capPct <= 0 || capPct >= 100) return null;
  if (!Number.isInteger(fee) || fee < 0 || fee > 9999) return null;
  var feeFrac = fee / 10000, pFrac = capPct / 100;
  var base = { amountIn: ain, maxImpactPct: capPct, spotPrice: spot,
    feeBps: fee, feeImpactPct: feeFrac * 100 };
  if (pFrac <= feeFrac) {
    return Object.assign(base, { feasible: false, reserveIn: 0, reserveOut: 0, netIn: 0, amountOut: 0, actualImpactPct: feeFrac * 100 });
  }
  var reserveIn = ain * (1 - pFrac) * (1 - feeFrac) / (pFrac - feeFrac);
  var reserveOut = reserveIn * spot;
  var netIn = ain * (1 - feeFrac);
  var amountOut = reserveOut * netIn / (reserveIn + netIn);
  if (![reserveIn, reserveOut, amountOut].every(Number.isFinite) || !(reserveIn > 0) || !(amountOut > 0)) return null;
  var effective = amountOut / ain;
  return Object.assign(base, {
    feasible: true,
    reserveIn: reserveIn,
    reserveOut: reserveOut,
    netIn: netIn,
    amountOut: amountOut,
    effectivePrice: effective,
    actualImpactPct: (1 - effective / spot) * 100,
    totalValueIn: reserveIn + reserveOut / spot,
    postTradeSpotPrice: (reserveOut - amountOut) / (reserveIn + netIn)
  });
}

/* ---------- 27 · Post-move reserves calculator ---------- */
/* Tool 2 prices a price move as a percentage; this shows what the move
   physically does to a constant-product pool's reserves. Arbitrage keeps
   the pool price equal to the market price, and x*y=k then forces the
   reserves: at a price multiple r the A reserve becomes Ra/sqrt(r) and
   the B reserve Rb*sqrt(r) — the pool sells A as A's price rises and
   buys it as it falls, which is precisely the mechanism behind
   impermanent loss. The new reserves are valued in B at the new price
   and compared with holding the original reserves untouched; that ratio
   is Tool 2's own lpVsHold (the IL figure itself is taken from Tool 2's
   function, so the two tools can never disagree). No fees are modelled:
   in a live pool, arbitrage trades pay the pool fee, which slightly
   grows k — this model holds k exactly constant, as Tool 2 does. */
function cpReservesAfterMove(reserveAStr, reserveBStr, priceRatio) {
  var required = [reserveAStr, reserveBStr, priceRatio];
  for (var i = 0; i < required.length; i++) {
    if (required[i] == null || String(required[i]).trim() === "") return null;
  }
  var ra = Number(reserveAStr), rb = Number(reserveBStr), r = Number(priceRatio);
  if (![ra, rb, r].every(Number.isFinite)) return null;
  if (ra <= 0 || rb <= 0 || r <= 0) return null;
  var il = impermanentLoss(r);
  if (il === null) return null;
  var sqrtR = Math.sqrt(r);
  var newRa = ra / sqrtR, newRb = rb * sqrtR;
  if (![newRa, newRb].every(Number.isFinite) || !(newRa > 0) || !(newRb > 0)) return null;
  var startPrice = rb / ra, newPrice = startPrice * r;
  var lpValueInB = newRa * newPrice + newRb;
  var holdValueInB = ra * newPrice + rb;
  return {
    reserveA: ra, reserveB: rb, priceRatio: r,
    startPrice: startPrice, newPrice: newPrice,
    newReserveA: newRa, newReserveB: newRb,
    deltaA: newRa - ra, deltaB: newRb - rb,
    k: ra * rb, newK: newRa * newRb,
    lpValueInB: lpValueInB, holdValueInB: holdValueInB,
    lpVsHold: lpValueInB / holdValueInB, ilPct: il.ilPct
  };
}

/* ---------- 28 · Split-route swap planner (two parallel pools) ---------- */
/* Tool 23 routes a trade THROUGH two pools in series; aggregators also
   split one trade ACROSS two pools for the same pair in parallel: each
   leg is smaller, so each moves its pool's price less, and the combined
   output beats sending the whole trade through either pool alone. The
   optimum balances the legs' marginal rates — deep pools and low-fee
   pools earn the larger share. This searches the split fraction with a
   ternary search (the combined output is concave in the fraction),
   evaluating every candidate with Tool 1's own cpSwap, so each leg is
   exactly what Tool 1 would quote for that leg, floored at 9dp like a
   real fill. Endpoints are candidates too: if one pool cannot take a
   trade at all (empty/dust reserves), everything routes through the
   other. Only two pools, same pair and direction; a real aggregator
   searches many venues and also pays network/transaction costs, which
   are not modelled here. */
function splitSwap(reserve1InStr, reserve1OutStr, reserve2InStr, reserve2OutStr, amountInStr, fee1Bps, fee2Bps) {
  var total = parseScaled(amountInStr);
  if (total === null || total <= 0n) return null;
  var single1 = cpSwap(reserve1InStr, reserve1OutStr, amountInStr, fee1Bps);
  var single2 = cpSwap(reserve2InStr, reserve2OutStr, amountInStr, fee2Bps);
  if (single1 === null && single2 === null) return null;
  function legOut(which, s) {
    if (s === 0n) return 0n;
    var r = which === 1
      ? cpSwap(reserve1InStr, reserve1OutStr, formatScaled(s), fee1Bps)
      : cpSwap(reserve2InStr, reserve2OutStr, formatScaled(s), fee2Bps);
    return r === null ? null : parseScaled(r.out);
  }
  function combinedOut(s) {
    var a = legOut(1, s), b = legOut(2, total - s);
    return (a === null || b === null) ? null : a + b;
  }
  var lo = 0, hi = 1, i, midFrac;
  for (i = 0; i < 200; i++) {
    var m1 = lo + (hi - lo) / 3, m2 = hi - (hi - lo) / 3;
    var v1 = combinedOut(BigInt(Math.round(m1 * Number(total))));
    var v2 = combinedOut(BigInt(Math.round(m2 * Number(total))));
    if (v1 === null && v2 === null) break;
    if (v2 === null || (v1 !== null && v1 >= v2)) hi = m2; else lo = m1;
  }
  var mid = BigInt(Math.round(((lo + hi) / 2) * Number(total)));
  var cands = [0n, total, mid, mid - 1n, mid + 1n];
  var bestS = null, bestOut = null;
  for (i = 0; i < cands.length; i++) {
    var s = cands[i];
    if (s < 0n || s > total) continue;
    var v = combinedOut(s);
    if (v !== null && (bestOut === null || v > bestOut)) { bestOut = v; bestS = s; }
  }
  if (bestS === null) return null;
  var out1 = legOut(1, bestS), out2 = legOut(2, total - bestS);
  var single1Scaled = single1 === null ? null : parseScaled(single1.out);
  var single2Scaled = single2 === null ? null : parseScaled(single2.out);
  var bestSingle = single1Scaled === null ? single2Scaled
    : (single2Scaled === null ? single1Scaled : (single1Scaled > single2Scaled ? single1Scaled : single2Scaled));
  return {
    amount1: formatScaled(bestS), amount2: formatScaled(total - bestS),
    out1: formatScaled(out1), out2: formatScaled(out2),
    totalOut: formatScaled(bestOut),
    single1Out: single1 === null ? null : single1.out,
    single2Out: single2 === null ? null : single2.out,
    bestSingleOut: formatScaled(bestSingle),
    gainVsBestSingle: scaledToNumber(bestOut - bestSingle),
    splitPct1: scaledToNumber(bestS) / scaledToNumber(total) * 100
  };
}

/* ---------- 41 · Split-route exact-out swap model ---------- */
/* Tool 28 splits a fixed amount IN across two pools for the same pair;
   Tool 6 prices a fixed amount OUT of one pool. This composes them:
   given an exact amount out wanted, the target is split across the two
   pools so the TOTAL amount in is smallest, with every candidate leg
   priced by Tool 6's own cpSwapExactOut — so each leg is exactly what
   Tool 6 would quote for that leg, rounded up at 9dp the way Tool 6
   rounds. The total input is convex in the split (each pool's marginal
   cost of one more unit out rises as its reserve drains), so a ternary
   search over the split share finds it; endpoints are candidates too,
   so a pool that cannot supply any of the target (dust/invalid
   reserves, or a target at or above its whole reserve out) is routed
   around entirely. Three honest edges: a target no single pool can
   supply (at or above either pool's reserve out) can still be priced
   when the pools COMBINE to cover it — then there is no single-pool
   figure to save against, and bestSingleIn/saving are null, not a
   made-up comparison; a target at or above the two reserves combined
   can never be paid out (a constant-product pool never pays its whole
   reserve), so it is rejected, not priced; and the modelled saving
   ignores the extra leg's network/transaction costs, exactly as
   Tool 28 discloses. Only two pools, same pair and direction. */
function splitExactOut(reserve1InStr, reserve1OutStr, reserve2InStr, reserve2OutStr, amountOutStr, fee1Bps, fee2Bps) {
  if (amountOutStr == null || String(amountOutStr).trim() === "") return null;
  var target = parseScaled(amountOutStr);
  if (target === null || target <= 0n) return null;
  var single1 = cpSwapExactOut(reserve1InStr, reserve1OutStr, amountOutStr, fee1Bps);
  var single2 = cpSwapExactOut(reserve2InStr, reserve2OutStr, amountOutStr, fee2Bps);
  function legIn(which, y) {
    if (y === 0n) return 0n;
    var r = which === 1
      ? cpSwapExactOut(reserve1InStr, reserve1OutStr, formatScaled(y), fee1Bps)
      : cpSwapExactOut(reserve2InStr, reserve2OutStr, formatScaled(y), fee2Bps);
    return r === null ? null : parseScaled(r.amountIn);
  }
  function combinedIn(y) {
    var a = legIn(1, y), b = legIn(2, target - y);
    return (a === null || b === null) ? null : a + b;
  }
  /* The split is only feasible inside a band: leg 1 must stay below
     pool 1's reserve out and leg 2 below pool 2's, so y ranges over
     [target - reserve2Out + 1, reserve1Out - 1] in scaled units.
     Searching fractions of the WHOLE target instead samples mostly
     infeasible splits when the target is a large share of the combined
     reserves — both probes come back null, the search breaks, and only
     the endpoints survive, which can cost many times the true optimum
     (or miss the one feasible split entirely). Search the band itself,
     and offer its endpoints as candidates: when the band is a single
     point, that point IS the only split. A pool whose reserve out does
     not parse can take nothing, so the band collapses onto the other
     pool's endpoint, which the endpoint candidates already cover. */
  var rout1 = parseScaled(reserve1OutStr), rout2 = parseScaled(reserve2OutStr);
  var yLo = rout2 === null ? target : (target - rout2 + 1n > 0n ? target - rout2 + 1n : 0n);
  var yHi = rout1 === null ? 0n : (rout1 - 1n < target ? rout1 - 1n : target);
  var lo = 0, hi = 1, i, midFrac;
  var bandW = yHi - yLo;
  if (bandW >= 0n) {
    for (i = 0; i < 200; i++) {
      var m1 = lo + (hi - lo) / 3, m2 = hi - (hi - lo) / 3;
      var v1 = combinedIn(yLo + BigInt(Math.round(m1 * Number(bandW))));
      var v2 = combinedIn(yLo + BigInt(Math.round(m2 * Number(bandW))));
      if (v1 === null && v2 === null) break;
      if (v2 === null || (v1 !== null && v1 <= v2)) hi = m2; else lo = m1;
    }
  }
  var mid = yLo + BigInt(Math.round(((lo + hi) / 2) * Number(bandW > 0n ? bandW : 0n)));
  /* The exact half split is a candidate in its own right, ahead of the
     search midpoint: the ceiled leg costs form plateaus, the ternary
     search settles on a plateau edge, and for identical pools that
     leaves the reported split a few thousand scaled units off the even
     split that is the true optimum (and costs a unit or two more). */
  var half = target / 2n;
  var cands = [0n, target, yLo, yHi, half, half + 1n, mid, mid - 1n, mid + 1n];
  var bestY = null, bestIn = null;
  for (i = 0; i < cands.length; i++) {
    var y = cands[i];
    if (y < 0n || y > target) continue;
    var v = combinedIn(y);
    if (v !== null && (bestIn === null || v < bestIn)) { bestIn = v; bestY = y; }
  }
  if (bestY === null) return null;
  var in1 = legIn(1, bestY), in2 = legIn(2, target - bestY);
  var single1Scaled = single1 === null ? null : parseScaled(single1.amountIn);
  var single2Scaled = single2 === null ? null : parseScaled(single2.amountIn);
  var bestSingle = single1Scaled === null ? single2Scaled
    : (single2Scaled === null ? single1Scaled : (single1Scaled < single2Scaled ? single1Scaled : single2Scaled));
  return {
    in1: formatScaled(in1), in2: formatScaled(in2),
    out1: formatScaled(bestY), out2: formatScaled(target - bestY),
    totalIn: formatScaled(bestIn),
    totalOut: formatScaled(target),
    single1In: single1 === null ? null : single1.amountIn,
    single2In: single2 === null ? null : single2.amountIn,
    bestSingleIn: bestSingle === null ? null : formatScaled(bestSingle),
    savingVsBestSingle: bestSingle === null ? null : scaledToNumber(bestSingle - bestIn),
    splitPct1: scaledToNumber(bestY) / scaledToNumber(target) * 100
  };
}

/* ---------- 29 · CLMM net return calculator ---------- */
/* Tool 24 settles a constant-product position against holding with the
   fees it actually earned; this is that settlement for a CLMM position.
   Every value comes from Tool 12's own clmmVsHold, so the halves can
   never drift from their own form:
     net value      = position value at the check price + fees earned (B)
     verdict vs hold = net value - holding value = fees - Tool 12's hurdle
   Both bottom lines are reported: % vs holding AND % return on the
   position's value at entry — they answer different questions, and a
   CLMM position makes the gap vivid: at the upper edge of the headline
   range it is +5.90% on its entry value yet -5.87% vs holding with no
   fees, because holding kept the full token that rose. At the entry
   price the hurdle is zero, so coverage is honestly null (nothing to
   cover), not a made-up percentage. Fees are counted in token B outside
   the position; no compounding, no fee growth inside the range, and no
   re-centring is modelled. Model only — not a live quote. */
function clmmNetReturn(liquidityStr, lowerStr, upperStr, entryPriceStr, checkPriceStr, feesStr) {
  if (feesStr == null || String(feesStr).trim() === "") return null;
  var fees = Number(feesStr);
  if (!Number.isFinite(fees) || fees < 0) return null;
  var vh = clmmVsHold(liquidityStr, lowerStr, upperStr, entryPriceStr, checkPriceStr);
  if (vh === null) return null;
  var entryValueInB = vh.entryAmountA * vh.entryPrice + vh.entryAmountB;
  var netValueInB = vh.positionValueInB + fees;
  var netVsHoldInB = netValueInB - vh.holdValueInB;
  return {
    liquidity: vh.liquidity, lowerPrice: vh.lowerPrice, upperPrice: vh.upperPrice,
    entryPrice: vh.entryPrice, checkPrice: vh.checkPrice,
    entryValueInB: entryValueInB,
    positionValueInB: vh.positionValueInB,
    holdValueInB: vh.holdValueInB,
    feesNeededInB: vh.feesNeededInB,
    feesInB: fees,
    netValueInB: netValueInB,
    netVsHoldInB: netVsHoldInB,
    netVsHoldPct: vh.holdValueInB > 0 ? netVsHoldInB / vh.holdValueInB * 100 : 0,
    returnOnEntryPct: entryValueInB > 0 ? (netValueInB - entryValueInB) / entryValueInB * 100 : 0,
    coveragePct: vh.feesNeededInB > 0 ? fees / vh.feesNeededInB * 100 : null
  };
}

/* ---------- 30 · CLMM IL tolerance band ---------- */
/* Tool 21 answers "how far can the price move before the fees I have
   earned stop covering the shortfall vs holding?" for a constant-
   product position, in closed form. A CLMM position's shortfall
   (Tool 12's hurdle) has no closed form — it is piecewise, changing
   character at the range edges — so this tool finds the band by
   searching Tool 12's own clmmVsHold: the hurdle is zero at the entry
   price and rises monotonically as price moves away on either side
   (verified on grids inside and outside the range), so each edge is
   the price where the hurdle exactly equals the fees earned, found
   by geometric bisection directly on clmmVsHold. The band can
   therefore never drift from Tool 12's numbers. The entry price must
   be inside the range: a position entered outside it holds a single
   token and has no two-sided band to speak of, so that is rejected
   rather than papered over.
   One honest asymmetry, sharper than Tool 21's: as price falls to
   zero the position ends up holding only token A (worthless at zero)
   while holding kept the entry amount of token B, so the downside
   hurdle caps at exactly that entry B amount — fees at or above the
   cap can never be consumed by a fall, however far, and are reported
   as downUnbounded. A rise has no cap: holding keeps all of the token
   that rose, so the hurdle grows without bound. Whether each edge
   sits inside the position's own range is reported too — a band edge
   beyond a range edge means the fees survive the position going fully
   single-sided on that side. Zero fees collapse the band to the entry
   price. Model only — fees counted in token B outside the position,
   no fee growth or re-centring modelled. Not financial advice. */
function clmmIlBand(liquidityStr, lowerStr, upperStr, entryPriceStr, feesStr) {
  if (feesStr == null || String(feesStr).trim() === "") return null;
  var fees = Number(feesStr);
  if (!Number.isFinite(fees) || fees < 0) return null;
  var atEntry = clmmVsHold(liquidityStr, lowerStr, upperStr, entryPriceStr, entryPriceStr);
  if (atEntry === null) return null;
  var entry = atEntry.entryPrice, lower = atEntry.lowerPrice, upper = atEntry.upperPrice;
  /* Strictly inside: at exactly an edge Tool 8 classifies the position
     as below/above (single token), so an edge entry has no two-sided
     band either — the lower edge used to slip through with a degenerate
     zero-cap band while the upper edge fell out as null. */
  if (entry <= lower || entry >= upper) return null;
  var entryValueInB = atEntry.entryAmountA * entry + atEntry.entryAmountB;
  var base = {
    liquidity: atEntry.liquidity, lowerPrice: lower, upperPrice: upper,
    entryPrice: entry, feesInB: fees,
    entryAmountA: atEntry.entryAmountA, entryAmountB: atEntry.entryAmountB,
    entryValueInB: entryValueInB, downCapInB: atEntry.entryAmountB
  };
  if (fees === 0) {
    return Object.assign(base, {
      priceHigh: entry, priceLow: entry, moveUpPct: 0, moveDownPct: 0,
      downUnbounded: false, highInRange: true, lowInRange: true
    });
  }
  function hurdle(p) {
    var vh = clmmVsHold(liquidityStr, lowerStr, upperStr, entryPriceStr, String(p));
    return vh === null ? null : vh.feesNeededInB;
  }
  /* upper edge: hurdle grows without bound as price rises, so a
     doubling bracket always finds it; bisect geometrically */
  var lo = entry, hi = entry * 2;
  while (hurdle(hi) < fees && hi < entry * 1e15) hi *= 2;
  if (hurdle(hi) < fees) return null;
  for (var i = 0; i < 200; i++) {
    var mid = Math.sqrt(lo * hi);
    if (hurdle(mid) < fees) lo = mid; else hi = mid;
  }
  var priceHigh = Math.sqrt(lo * hi);
  var result = Object.assign(base, {
    priceHigh: priceHigh, moveUpPct: (priceHigh / entry - 1) * 100,
    highInRange: priceHigh <= upper
  });
  /* lower edge: the hurdle caps at the entry amount of token B. The
     cap is a limit as price -> 0, so fees at or above the hurdle
     already reached at a trillionth of the entry price are reported
     unbounded — no representable fall consumes them. */
  var capHurdle = hurdle(entry * 1e-12);
  if (capHurdle === null) return null;
  if (fees >= capHurdle) {
    return Object.assign(result, { downUnbounded: true, priceLow: null, moveDownPct: null, lowInRange: null });
  }
  var hiD = entry, loD = entry / 2;
  while (hurdle(loD) < fees && loD > entry * 1e-12) loD /= 2;
  if (hurdle(loD) < fees) return null;
  for (var j = 0; j < 200; j++) {
    var midD = Math.sqrt(loD * hiD);
    if (hurdle(midD) < fees) hiD = midD; else loD = midD;
  }
  var priceLow = Math.sqrt(loD * hiD);
  return Object.assign(result, {
    downUnbounded: false, priceLow: priceLow,
    moveDownPct: (1 - priceLow / entry) * 100, lowInRange: priceLow >= lower
  });
}

/* ---------- 31 · CLMM required-volume planner (Tools 12 + 13 inverted) ---------- */
/* Tool 15 asks "at this volume, how many days until my fees cover
   the hurdle holding opens?" An LP planning a position asks the
   inverse: "to cover that hurdle within N days, how much volume
   does the pool need per day?" The hurdle is Tool 12's own
   feesNeededInB; the fee side is Tool 13's own formula run in
   reverse:
     your fees per day = volume * (feeBps / 10000)
                         * (your L / total active L) * (in-range / 100)
     required volume   = (hurdle / days) / that product
   Validation rides on Tool 13 itself: a probe estimate at volume 1
   must succeed, so total active liquidity below your own L, a fee
   tier outside 0..10000 bps and an in-range share outside 0..100 are
   rejected exactly as Tool 13 rejects them, and the share/in-range
   figures reported are Tool 13's own. The tests feed the reported
   volume straight back into Tools 13 and 15 and assert the hurdle
   and the day count come back exactly, so the inverse can never
   drift from the forwards tools. Two honest edges: at the entry
   price there is no hurdle, so the required volume is honestly 0 —
   not a small number — even at a zero fee tier; and with a real
   hurdle but a zero fee tier or 0% time in range, no volume exists
   that earns a fee, so the answer is reported as not feasible with
   an infinite required volume rather than a made-up figure. The
   volume is a pool-wide total in token B per day at the fee rate
   assumed to hold still — in a live pool volume, active liquidity
   and time in range all move. Model only — not a live quote, not a
   volume forecast, not financial advice. */
function clmmRequiredVolume(liquidityStr, lowerStr, upperStr, entryPriceStr, checkPriceStr, totalActiveLStr, feeBps, daysStr, inRangePctStr) {
  if (daysStr == null || String(daysStr).trim() === "") return null;
  var days = Number(daysStr);
  if (!Number.isFinite(days) || days <= 0) return null;
  var vh = clmmVsHold(liquidityStr, lowerStr, upperStr, entryPriceStr, checkPriceStr);
  if (vh === null) return null;
  /* probe Tool 13 at volume 1 for validation + its own share/in-range */
  var est = clmmFeeEstimate(liquidityStr, totalActiveLStr, "1", feeBps, "1", inRangePctStr, "");
  if (est === null) return null;
  var feesNeeded = vh.feesNeededInB;
  var requiredFeesPerDay = feesNeeded / days;
  var shareFrac = est.yourLiquidity / est.totalActiveLiquidity;
  var inRangeFrac = est.inRangePct / 100;
  var feeFrac = Number(feeBps) / 10000;
  var base = {
    liquidity: vh.liquidity, lowerPrice: vh.lowerPrice, upperPrice: vh.upperPrice,
    entryPrice: vh.entryPrice, checkPrice: vh.checkPrice,
    holdValueInB: vh.holdValueInB, positionValueInB: vh.positionValueInB,
    feesNeededInB: feesNeeded, days: days,
    totalActiveLiquidity: est.totalActiveLiquidity, feeBps: est.feeBps,
    sharePct: est.sharePct, inRangePct: est.inRangePct,
    requiredFeesPerDay: requiredFeesPerDay
  };
  if (feesNeeded <= 1e-12) {
    return Object.assign(base, {
      feasible: true, requiredPoolFeesPerDay: 0, requiredVolumePerDay: 0
    });
  }
  var capture = feeFrac * shareFrac * inRangeFrac;
  if (capture <= 0) {
    return Object.assign(base, {
      feasible: false,
      requiredPoolFeesPerDay: shareFrac * inRangeFrac > 0 ? requiredFeesPerDay / (shareFrac * inRangeFrac) : null,
      requiredVolumePerDay: Infinity
    });
  }
  return Object.assign(base, {
    feasible: true,
    requiredPoolFeesPerDay: requiredFeesPerDay / (shareFrac * inRangeFrac),
    requiredVolumePerDay: requiredFeesPerDay / capture
  });
}

/* ---------- 32 · Constant-product required-volume planner (Tools 4 + 3 inverted) ---------- */
/* Tool 31 asks this planning question for a CLMM position; a
   constant-product LP asks the same: "to cover the break-even hurdle
   a price move opens within N days, how much volume does the pool
   need per day?" The hurdle is Tool 4's own feesNeeded; the fee side
   is Tool 3's own formula run in reverse:
     your fees per day = volume * (feeBps / 10000) * (your / TVL)
     required volume   = (hurdle / days) / that product
   Validation rides on the source tools themselves: the hurdle comes
   from breakEvenFees and a probe lpFees estimate at volume 1 must
   succeed, so a missing/zero deposit, your liquidity above the pool
   TVL and a fee tier outside integer 0..10000 bps are rejected
   exactly as Tools 4 and 3 reject them, and the share reported is
   Tool 3's own. The tests feed the reported volume straight back
   into Tool 3 and assert it earns the hurdle in exactly the days
   allowed, and into Tool 4 and assert the day count comes back, so
   the inverse can never drift from the forwards tools. Two honest
   edges: at no price move there is no hurdle, so the required
   volume is honestly 0 — not a small number — even at a zero fee
   tier; and with a real hurdle but a zero fee tier, no volume exists
   that earns a fee, so the answer is reported as not feasible with
   an infinite required volume rather than a made-up figure. The
   volume is a pool-wide total per day in the deposit's terms at a
   fee rate assumed to hold still — in a live pool volume, TVL and
   price all move. Model only — not a live quote, not a volume
   forecast, not financial advice. */
function cpRequiredVolume(priceRatio, depositStr, yourStr, tvlStr, feeBps, daysStr) {
  if (daysStr == null || String(daysStr).trim() === "") return null;
  var days = Number(daysStr);
  if (!Number.isFinite(days) || days <= 0) return null;
  var be = breakEvenFees(priceRatio, depositStr);
  if (be === null) return null;
  /* probe Tool 3 at volume 1 for validation + its own share */
  var est = lpFees("1", feeBps, yourStr, tvlStr);
  if (est === null) return null;
  var feesNeeded = be.feesNeeded;
  var requiredFeesPerDay = feesNeeded / days;
  var shareFrac = est.sharePct / 100;
  var feeFrac = Number(feeBps) / 10000;
  var base = {
    priceRatio: be.priceRatio, deposit: be.deposit,
    holdValue: be.holdValue, lpValue: be.lpValue, ilPct: be.ilPct,
    feesNeeded: feesNeeded, feesNeededPctOfDeposit: be.feesNeededPctOfDeposit,
    days: days, feeBps: Number(feeBps), feePct: est.feePct,
    sharePct: est.sharePct, requiredFeesPerDay: requiredFeesPerDay
  };
  if (feesNeeded <= 1e-12) {
    return Object.assign(base, {
      feasible: true, requiredPoolFeesPerDay: 0, requiredVolumePerDay: 0
    });
  }
  var capture = feeFrac * shareFrac;
  if (capture <= 0) {
    return Object.assign(base, {
      feasible: false,
      requiredPoolFeesPerDay: shareFrac > 0 ? requiredFeesPerDay / shareFrac : null,
      requiredVolumePerDay: Infinity
    });
  }
  return Object.assign(base, {
    feasible: true,
    requiredPoolFeesPerDay: requiredFeesPerDay / shareFrac,
    requiredVolumePerDay: requiredFeesPerDay / capture
  });
}

/* ---------- 40 · Constant-product break-even days calculator (Tools 4 + 3 joined) ---------- */
/* Tool 15 asks "how long until fees cover the shortfall?" for a CLMM
   position; a constant-product LP asks the same, and until now had to
   run Tool 3 for a daily fee figure and type it into Tool 4 by hand.
   This joins the two directly: the hurdle is Tool 4's own feesNeeded
   (hold value minus LP value after the move), and the rate is
   Tool 3's own dailyFees at the pool volume, fee tier and share the
   user supplies — days = hurdle / dailyFees, computed from those
   tools' own returns so it can never drift from either (the tests
   assert Tool 4 fed Tool 3's daily figure returns exactly this day
   count, and that Tool 32 run backwards from this day count returns
   exactly this volume). Two honest edges, mirroring Tool 15: at no
   price move there is no hurdle, so the answer is 0 days even at a
   zero fee rate or zero volume; and with a real hurdle but a zero
   rate — no volume or a zero fee tier — the position never breaks
   even, reported as Infinity, not a large number. A zero share is
   NOT a zero-rate case: Tool 3 rejects it (no position at all),
   exactly as Tool 32 does, so it is rejected as invalid input here
   too rather than reported as never. The
   blank-field guard matters here: Number("") is 0, so without it an
   empty volume would slip through Tool 3 as a zero rate and be
   reported as "never" instead of rejected as missing input. The
   day count assumes the volume, tier, share and price all hold
   still, which in a live pool they will not. Model only — your
   inputs, not live pool state; not a live quote, not a forecast,
   not financial advice. */
function cpBreakEvenDays(priceRatio, depositStr, volumeStr, feeBps, yourStr, tvlStr) {
  var required = [depositStr, volumeStr, yourStr, tvlStr, feeBps];
  for (var i = 0; i < required.length; i++) {
    if (required[i] == null || String(required[i]).trim() === "") return null;
  }
  var be = breakEvenFees(priceRatio, depositStr);
  if (be === null) return null;
  var est = lpFees(volumeStr, feeBps, yourStr, tvlStr);
  if (est === null) return null;
  var days;
  if (be.feesNeeded <= 1e-12) days = 0;
  else if (est.dailyFees > 0) days = be.feesNeeded / est.dailyFees;
  else days = Infinity;
  return {
    priceRatio: be.priceRatio,
    deposit: be.deposit,
    holdValue: be.holdValue,
    lpValue: be.lpValue,
    ilPct: be.ilPct,
    feesNeeded: be.feesNeeded,
    feesNeededPctOfDeposit: be.feesNeededPctOfDeposit,
    sharePct: est.sharePct,
    dailyFees: est.dailyFees,
    monthlyFees: est.monthlyFees,
    aprPct: est.aprPct,
    feeBps: Number(feeBps),
    feePct: est.feePct,
    daysToBreakEven: days
  };
}

/* ---------- 33 · CLMM single-sided zap-in planner (Tools 1 + 14 joined) ---------- */
/* Tool 19 zaps into a constant-product pool from one token; Tool 20's
   note and Tool 8's keep saying CLMM entries are range-based and
   differ — this is that entry. A wallet holding only token A funds a
   CLMM position by swapping part of the A for B, then depositing the
   rest. The deposit ratio is not the pool's ratio — it is set by
   where the current price P sits in the chosen range (Tools 8/14's
   maths, s/sa/sb = sqrt prices):
     rho = B required per A deposited = (s - sa) / (1/s - 1/sb)
   The swap leg runs in a constant-product pool the user describes
   (reserves Ra/Rb, fee tier), under Tool 1's model: swapping s of A
   returns Rb * k*s / (Ra + k*s), k = 1 - fee. The split is the s
   whose return exactly funds the deposit of what remains:
     Rb * k*s / (Ra + k*s) = rho * (X - s)
   which clears to a quadratic in s:
     rho*k*s^2 + (Rb*k - rho*X*k + rho*Ra)*s - rho*X*Ra = 0
   Its one root in (0, X) is the split (at the range's geometric
   centre rho = P, so the deposit is value-balanced; near the top
   edge rho runs away and nearly everything is swapped). The swap
   itself is executed by Tool 1's own cpSwap on the split floored to
   9 dp, and the deposit is settled by Tool 14's own clmmWalletPlan
   on what the swap actually returned, so both legs are those tools'
   numbers verbatim and the tests assert so. Because Tool 1 floors
   its fee and output at 9 dp, the B returned can fall a hair short
   of the unfloored split's promise: token B is then the limiting
   side and a dust of token A (about 1e-9 on the headline vector) is
   honestly reported as leftover rather than silently absorbed. The
   range edges need no swap maths at all: at or below the lower edge
   the position is entirely token A (no swap, Tool 14's below case),
   and at or above the upper edge it is entirely token B (swap
   everything, Tool 14's above case). Model only — the swap pool and
   the CLMM position are modelled separately (in practice the swap
   would route wherever the price is best, possibly the CLMM pool
   itself), no routing, no tick-spacing snapping, no price movement
   between the swap and the deposit. Not a live quote, not financial
   advice. */
function clmmZapIn(reserveAStr, reserveBStr, currentStr, lowerStr, upperStr, amountAStr, feeBps) {
  var required = [reserveAStr, reserveBStr, currentStr, lowerStr, upperStr, amountAStr, feeBps];
  for (var i = 0; i < required.length; i++) {
    if (required[i] == null || String(required[i]).trim() === "") return null;
  }
  var ra = Number(reserveAStr), rb = Number(reserveBStr);
  var current = Number(currentStr), lower = Number(lowerStr), upper = Number(upperStr);
  var x = Number(amountAStr), fee = Number(feeBps);
  if (![ra, rb, current, lower, upper, x, fee].every(Number.isFinite)) return null;
  if (ra <= 0 || rb <= 0 || current <= 0 || lower <= 0 || upper <= 0 || x <= 0) return null;
  if (lower >= upper) return null;
  if (!Number.isInteger(fee) || fee < 0 || fee > 9999) return null;
  var status, swapIn = 0, swapOut = 0, swapImpactPct = 0, ratio = null, plan;
  if (current <= lower) {
    status = "below";
    plan = clmmWalletPlan(currentStr, lowerStr, upperStr, amountAStr, "0");
    if (plan === null) return null;
  } else if (current >= upper) {
    status = "above";
    var swapAll = cpSwap(reserveAStr, reserveBStr, amountAStr, feeBps);
    if (swapAll === null) return null;
    swapIn = x;
    swapOut = Number(swapAll.out);
    swapImpactPct = swapAll.priceImpactPct;
    plan = clmmWalletPlan(currentStr, lowerStr, upperStr, "0", swapAll.out);
    if (plan === null) return null;
  } else {
    status = "in";
    var s = Math.sqrt(current), sa = Math.sqrt(lower), sb = Math.sqrt(upper);
    ratio = (s - sa) / (1 / s - 1 / sb);
    var k = 1 - fee / 10000;
    var qa = ratio * k, qb = rb * k - ratio * x * k + ratio * ra, qc = -ratio * x * ra;
    // Cancellation-free root: when qb > 0 (deep pool vs the holding)
    // -qb + sqrt(disc) subtracts two nearly-equal numbers and the
    // split can be off by percent, leaving a real leftover instead
    // of dust; the product form -2*qc / (qb + sqrt(disc)) is the
    // same root with no subtraction of near-equals.
    var discRoot = Math.sqrt(qb * qb - 4 * qa * qc);
    var root = qb >= 0 ? (-2 * qc) / (qb + discRoot) : (-qb + discRoot) / (2 * qa);
    if (!(root > 0 && root < x)) return null;
    var split = Math.floor(root * 1e9) / 1e9;
    if (split <= 0) return null;
    var swap = cpSwap(reserveAStr, reserveBStr, split.toFixed(9), feeBps);
    if (swap === null) return null;
    swapIn = split;
    swapOut = Number(swap.out);
    swapImpactPct = swap.priceImpactPct;
    plan = clmmWalletPlan(currentStr, lowerStr, upperStr, String(x - split), swap.out);
    if (plan === null) return null;
  }
  return {
    status: status,
    inRange: status === "in",
    reserveA: ra, reserveB: rb,
    currentPrice: current, lowerPrice: lower, upperPrice: upper,
    amountA: x, feeBps: fee,
    ratioBperA: ratio,
    swapIn: swapIn, swapOut: swapOut,
    swapSpotPrice: rb / ra, swapPriceImpactPct: swapImpactPct,
    depositA: plan.usedA, depositB: plan.usedB,
    leftoverA: plan.leftoverA, leftoverB: plan.leftoverB,
    liquidity: plan.liquidity, limiting: plan.limiting
  };
}

/* ---------- 48 · CLMM single-sided zap-in planner from token B ---------- */
/* Tool 33's entry mirror. Tool 33 zaps into a CLMM position from a
   wallet holding only token A; a wallet holding only token B (the
   stablecoin side of the pair, say) needs the same entry run the
   other way: swap part of the B for A, then deposit the B that
   remains alongside the A the swap returned. The deposit ratio is
   the same one Tool 33 uses — set by where the current price P sits
   in the chosen range, not by the swap pool's ratio:
     rho = B required per A deposited = (s - sa) / (1/s - 1/sb)
   The swap leg runs in a constant-product pool the user describes
   (reserves Ra/Rb, fee tier), under Tool 1's model with the tokens
   swapped: paying t of B returns Ra * k*t / (Rb + k*t) of A,
   k = 1 - fee. The split is the t whose return exactly funds the
   deposit of what remains:
     Y - t = rho * Ra * k*t / (Rb + k*t)
   which clears to a quadratic in t:
     k*t^2 + (Rb + rho*Ra*k - Y*k)*t - Y*Rb = 0
   Its one root in (0, Y) is the split (at the range's geometric
   centre rho = P and the deposit is value-balanced; near the lower
   edge rho collapses and nearly everything is swapped, near the top
   edge nearly nothing is). The swap itself is executed by Tool 1's
   own cpSwap on the split floored to 9 dp, and the deposit is
   settled by Tool 14's own clmmWalletPlan on what the swap actually
   returned, so both legs are those tools' numbers verbatim and the
   tests assert so. Because Tool 1 floors its fee and output at
   9 dp, the A returned can fall a hair short of the unfloored
   split's promise: token A is then the limiting side and a dust of
   token B (about 1e-9 on the headline vector) is honestly reported
   as leftover rather than silently absorbed — the exact mirror of
   Tool 33's dust. The range edges need no swap maths at all: at or
   below the lower edge the position is entirely token A (swap
   everything, Tool 14's below case), and at or above the upper edge
   it is entirely token B (no swap, Tool 14's above case). Model
   only — the swap pool and the CLMM position are modelled
   separately (in practice the swap would route wherever the price
   is best, possibly the CLMM pool itself), no routing, no
   tick-spacing snapping, no price movement between the swap and
   the deposit. Not a live quote, not financial advice. */
function clmmZapInB(reserveAStr, reserveBStr, currentStr, lowerStr, upperStr, amountBStr, feeBps) {
  var required = [reserveAStr, reserveBStr, currentStr, lowerStr, upperStr, amountBStr, feeBps];
  for (var i = 0; i < required.length; i++) {
    if (required[i] == null || String(required[i]).trim() === "") return null;
  }
  var ra = Number(reserveAStr), rb = Number(reserveBStr);
  var current = Number(currentStr), lower = Number(lowerStr), upper = Number(upperStr);
  var y = Number(amountBStr), fee = Number(feeBps);
  if (![ra, rb, current, lower, upper, y, fee].every(Number.isFinite)) return null;
  if (ra <= 0 || rb <= 0 || current <= 0 || lower <= 0 || upper <= 0 || y <= 0) return null;
  if (lower >= upper) return null;
  if (!Number.isInteger(fee) || fee < 0 || fee > 9999) return null;
  var status, swapIn = 0, swapOut = 0, swapImpactPct = 0, ratio = null, plan;
  if (current >= upper) {
    status = "above";
    plan = clmmWalletPlan(currentStr, lowerStr, upperStr, "0", amountBStr);
    if (plan === null) return null;
  } else if (current <= lower) {
    status = "below";
    var swapAll = cpSwap(reserveBStr, reserveAStr, amountBStr, feeBps);
    if (swapAll === null) return null;
    swapIn = y;
    swapOut = Number(swapAll.out);
    swapImpactPct = swapAll.priceImpactPct;
    plan = clmmWalletPlan(currentStr, lowerStr, upperStr, swapAll.out, "0");
    if (plan === null) return null;
  } else {
    status = "in";
    var s = Math.sqrt(current), sa = Math.sqrt(lower), sb = Math.sqrt(upper);
    ratio = (s - sa) / (1 / s - 1 / sb);
    var k = 1 - fee / 10000;
    var qa = k, qb = rb + ratio * ra * k - y * k, qc = -y * rb;
    // Cancellation-free root, same fix as Tool 33: when qb > 0 (deep
    // pool vs the holding) -qb + sqrt(disc) subtracts two nearly-
    // equal numbers and the split can be off by percent, leaving a
    // real leftover instead of dust; the product form
    // -2*qc / (qb + sqrt(disc)) is the same root without it.
    var discRoot = Math.sqrt(qb * qb - 4 * qa * qc);
    var root = qb >= 0 ? (-2 * qc) / (qb + discRoot) : (-qb + discRoot) / (2 * qa);
    if (!(root > 0 && root < y)) return null;
    var split = Math.floor(root * 1e9) / 1e9;
    if (split <= 0) return null;
    var swap = cpSwap(reserveBStr, reserveAStr, split.toFixed(9), feeBps);
    if (swap === null) return null;
    swapIn = split;
    swapOut = Number(swap.out);
    swapImpactPct = swap.priceImpactPct;
    plan = clmmWalletPlan(currentStr, lowerStr, upperStr, swap.out, String(y - split));
    if (plan === null) return null;
  }
  return {
    status: status,
    inRange: status === "in",
    reserveA: ra, reserveB: rb,
    currentPrice: current, lowerPrice: lower, upperPrice: upper,
    amountB: y, feeBps: fee,
    ratioBperA: ratio,
    swapIn: swapIn, swapOut: swapOut,
    swapSpotPrice: rb / ra, swapPriceImpactPct: swapImpactPct,
    depositA: plan.usedA, depositB: plan.usedB,
    leftoverA: plan.leftoverA, leftoverB: plan.leftoverB,
    liquidity: plan.liquidity, limiting: plan.limiting
  };
}

/* ---------- 34 · CLMM single-sided zap-out planner ---------- */
/* Tool 33's exit mirror, and Tool 20's question for a concentrated
   position. Closing a CLMM position pays whatever the position holds
   at the exit price — Tool 9's own clmmPositionAtPrice amounts for
   the position's liquidity L and range — which inside the range is
   BOTH tokens, and a wallet that wants to leave holding only token A
   must swap the token-B leg away. This models that swap in a
   constant-product pool the user describes (reserves Ra/Rb, fee
   tier), under Tool 1's own cpSwap, with the B leg floored to 9 dp
   first (Tool 1's precision — the sub-billionth remainder is not
   hidden: it stays inside the value-at-spot comparison below). The
   consolidation is priced honestly the way Tool 20 prices it:
   valueAtSpotA is what the withdrawn pair would be worth in A if
   the B leg filled at the swap pool's spot price with no fee and no
   impact, and consolidationCostA / consolidationCostPct are the
   difference — the swap fee plus its price impact. Two edges need
   no swap maths at all: at or below the lower edge the position is
   entirely token A already (no swap, zero cost), and at or above
   the upper edge it is entirely token B, so everything is swapped
   and the cost percentage equals the swap's price impact exactly.
   A B leg too small to swap at 9 dp is rejected rather than given
   a made-up fill. Model only — the position is closed in full (L
   is the whole position being exited), the swap pool and the CLMM
   position are modelled separately (in practice the swap would
   route wherever the price is best, possibly the CLMM pool
   itself), no routing, no price movement between the withdrawal
   and the swap, no withdrawal fee modelled. Not a live quote, not
   financial advice. */
function clmmZapOut(reserveAStr, reserveBStr, liquidityStr, lowerStr, upperStr, currentStr, feeBps) {
  var required = [reserveAStr, reserveBStr, liquidityStr, lowerStr, upperStr, currentStr, feeBps];
  for (var i = 0; i < required.length; i++) {
    if (required[i] == null || String(required[i]).trim() === "") return null;
  }
  var ra = Number(reserveAStr), rb = Number(reserveBStr), fee = Number(feeBps);
  if (![ra, rb, fee].every(Number.isFinite)) return null;
  if (ra <= 0 || rb <= 0) return null;
  if (!Number.isInteger(fee) || fee < 0 || fee > 9999) return null;
  var pos = clmmPositionAtPrice(liquidityStr, lowerStr, upperStr, currentStr);
  if (pos === null) return null;
  var spot = rb / ra;
  var base = {
    status: pos.status, inRange: pos.inRange,
    reserveA: ra, reserveB: rb,
    liquidity: pos.liquidity, lowerPrice: pos.lowerPrice, upperPrice: pos.upperPrice,
    currentPrice: pos.price, feeBps: fee,
    withdrawA: pos.amountA, withdrawB: pos.amountB,
    swapSpotPrice: spot
  };
  if (pos.amountB <= 0) {
    return Object.assign(base, {
      swapIn: 0, swapOut: 0, swapPriceImpactPct: 0,
      totalA: pos.amountA, valueAtSpotA: pos.amountA,
      consolidationCostA: 0, consolidationCostPct: 0
    });
  }
  var flooredB = Math.floor(pos.amountB * 1e9) / 1e9;
  if (flooredB <= 0) return null;
  var swap = cpSwap(reserveBStr, reserveAStr, flooredB.toFixed(9), feeBps);
  if (swap === null) return null;
  var totalA = pos.amountA + Number(swap.out);
  var valueAtSpotA = pos.amountA + pos.amountB / spot;
  return Object.assign(base, {
    swapIn: flooredB, swapOut: Number(swap.out),
    swapPriceImpactPct: swap.priceImpactPct,
    totalA: totalA, valueAtSpotA: valueAtSpotA,
    consolidationCostA: valueAtSpotA - totalA,
    consolidationCostPct: (valueAtSpotA - totalA) / valueAtSpotA * 100
  });
}

/* ---------- 49 · CLMM single-sided zap-out planner to token B ---------- */
/* Tool 34's exit mirror. Tool 34 closes a CLMM position into token A
   alone, swapping the token-B leg away; a wallet that wants to leave
   holding only token B (the stablecoin side of the pair, say) needs
   the reverse. Closing the position pays Tool 9's own
   clmmPositionAtPrice amounts for the position's liquidity L and
   range, and the token-A leg is swapped away in a constant-product
   pool the user describes (reserves Ra/Rb, fee tier) under Tool 1's
   own cpSwap, with the A leg floored to 9 dp first (Tool 1's
   precision — the sub-billionth remainder stays inside the
   value-at-spot comparison below, it is not hidden). The
   consolidation is priced honestly the way Tool 34 prices it:
   valueAtSpotB is what the withdrawn pair would be worth in B if
   the A leg filled at the swap pool's spot price with no fee and
   no impact, and consolidationCostB / consolidationCostPct are
   the difference — the swap fee plus its price impact. Two edges
   need no swap maths at all: at or above the upper edge the
   position is entirely token B already (no swap, zero cost), and
   at or below the lower edge it is entirely token A, so everything
   is swapped and the cost percentage equals the swap's price
   impact (to the 9 dp flooring dust). An A leg too small to swap
   at 9 dp is rejected rather than given a made-up fill. Model
   only — the position is closed in full (L is the whole position
   being exited), the swap pool and the CLMM position are modelled
   separately (in practice the swap would route wherever the price
   is best, possibly the CLMM pool itself), no routing, no price
   movement between the withdrawal and the swap, no withdrawal fee
   modelled. Not a live quote, not financial advice. */
function clmmZapOutB(reserveAStr, reserveBStr, liquidityStr, lowerStr, upperStr, currentStr, feeBps) {
  var required = [reserveAStr, reserveBStr, liquidityStr, lowerStr, upperStr, currentStr, feeBps];
  for (var i = 0; i < required.length; i++) {
    if (required[i] == null || String(required[i]).trim() === "") return null;
  }
  var ra = Number(reserveAStr), rb = Number(reserveBStr), fee = Number(feeBps);
  if (![ra, rb, fee].every(Number.isFinite)) return null;
  if (ra <= 0 || rb <= 0) return null;
  if (!Number.isInteger(fee) || fee < 0 || fee > 9999) return null;
  var pos = clmmPositionAtPrice(liquidityStr, lowerStr, upperStr, currentStr);
  if (pos === null) return null;
  var spot = rb / ra;
  var base = {
    status: pos.status, inRange: pos.inRange,
    reserveA: ra, reserveB: rb,
    liquidity: pos.liquidity, lowerPrice: pos.lowerPrice, upperPrice: pos.upperPrice,
    currentPrice: pos.price, feeBps: fee,
    withdrawA: pos.amountA, withdrawB: pos.amountB,
    swapSpotPrice: spot
  };
  if (pos.amountA <= 0) {
    return Object.assign(base, {
      swapIn: 0, swapOut: 0, swapPriceImpactPct: 0,
      totalB: pos.amountB, valueAtSpotB: pos.amountB,
      consolidationCostB: 0, consolidationCostPct: 0
    });
  }
  var flooredA = Math.floor(pos.amountA * 1e9) / 1e9;
  if (flooredA <= 0) return null;
  var swap = cpSwap(reserveAStr, reserveBStr, flooredA.toFixed(9), feeBps);
  if (swap === null) return null;
  var totalB = pos.amountB + Number(swap.out);
  var valueAtSpotB = pos.amountB + pos.amountA * spot;
  return Object.assign(base, {
    swapIn: flooredA, swapOut: Number(swap.out),
    swapPriceImpactPct: swap.priceImpactPct,
    totalB: totalB, valueAtSpotB: valueAtSpotB,
    consolidationCostB: valueAtSpotB - totalB,
    consolidationCostPct: (valueAtSpotB - totalB) / valueAtSpotB * 100
  });
}

/* ---------- 35 · CLMM token-B deposit planner ---------- */
/* Tool 8 plans a CLMM deposit from the token-A side: given an A amount,
   the matching B. Wallets holding the B side first (a stablecoin, say)
   need the mirror question: given a token-B deposit, the matching
   token A. The range maths is Tool 8's, inverted on the B leg
   (price = token B per token A; s = sqrt(price) and friends):
     price inside range:  amountB = L * (s - sqrt(lower)), so
                          L = amountB / (s - sqrt(lower)) and
                          requiredA = L * (1/s - 1/sqrt(upper))
     price at/above upper: the position is entirely token B, so
                          L = amountB / (sqrt(upper) - sqrt(lower))
                          and requiredA = 0
     price at/below lower: the position is entirely token A, so a
                          token-B deposit cannot fund it and that
                          combination is rejected here — the exact
                          mirror of Tool 8 rejecting a token-A deposit
                          at or above the top.
   The tests assert the mirror is exact: this planner's requiredA fed
   back into Tool 8 returns the original B amount and the same L, and
   Tool 9 at the current price returns both deposited amounts for that
   L. Tick indices are modelled with floating-point logs and are not
   snapped to a pool's tick spacing; no fees are modelled. */
function clmmRangePlanB(currentStr, lowerStr, upperStr, amountBStr) {
  var current = Number(currentStr), lower = Number(lowerStr), upper = Number(upperStr), amountB = Number(amountBStr);
  if (![current, lower, upper, amountB].every(Number.isFinite)) return null;
  if (current <= 0 || lower <= 0 || upper <= 0 || amountB <= 0) return null;
  if (lower >= upper) return null;
  if (current <= lower) return null;
  var s = Math.sqrt(current), sa = Math.sqrt(lower), sb = Math.sqrt(upper);
  var liquidity, requiredA, status;
  if (current >= upper) {
    liquidity = amountB / (sb - sa);
    requiredA = 0;
    status = "above";
  } else {
    liquidity = amountB / (s - sa);
    requiredA = liquidity * (1 / s - 1 / sb);
    status = "in";
  }
  if (!Number.isFinite(liquidity) || liquidity <= 0 || requiredA < 0) return null;
  var valueInB = requiredA * current + amountB;
  return {
    currentPrice: current,
    lowerPrice: lower,
    upperPrice: upper,
    amountB: amountB,
    requiredA: requiredA,
    liquidity: liquidity,
    status: status,
    inRange: status === "in",
    aValuePct: valueInB > 0 ? requiredA * current / valueInB * 100 : 0,
    bValuePct: valueInB > 0 ? amountB / valueInB * 100 : 0,
    tickCurrent: priceToTick(current),
    tickLower: priceToTick(lower),
    tickUpper: priceToTick(upper)
  };
}

/* ---------- 36 · CLMM re-centre / rebalance planner ---------- */
/* Tools 9 and 22 leave the follow-up question unanswered: the price
   has moved, your position's mix has drifted with it (Tool 9), and
   you want the position re-centred on the price you have now — what
   does that actually take? This tool joins the two: it takes the
   position's model liquidity L, its old range and the current price,
   reads what the position holds now from Tool 9's own
   clmmPositionAtPrice, builds the new range multiplicatively
   symmetric around the current price (Tool 22's rule: upper = P * m,
   lower = P / m, m = 1 + width/100), then sizes the NEW liquidity so
   the re-centred position is worth exactly what the old one is worth
   at the current price — a rebalance adds and removes nothing, it
   only swaps. Because the new range is centred, its holdings at the
   current price are always split 50/50 by value, whatever L it
   carries (tests assert that split and the value preservation
   exactly). The swap that gets you there is the difference between
   the target holdings and the current ones, priced at the current
   spot price: deltaB = -deltaA * P, so buying A costs deltaA * P of
   B and selling A returns the same rate. That spot pricing is the
   honest simplification, stated rather than hidden: a real swap pays
   a fee and moves the price (Tools 1, 33 and 34 model that cost), so
   treat this swap size as the plan, not the fill. If the old range
   already IS the symmetric range around the current price, the plan
   is the identity — same L, no swap (asserted in tests). A position
   the price has left behind entirely (all A below, all B above) can
   still be re-centred: exactly half its value swaps into the other
   token. New ranges whose ticks fall outside the standard CLMM tick
   range (-443636..443636, Tool 11) are rejected. Model only: no fees
   earned are added, no tick-spacing snapping, and a real rebalance
   is quoted live on the pool page. */
function clmmRebalance(liquidityStr, oldLowerStr, oldUpperStr, currentStr, widthPctStr) {
  var required = [liquidityStr, oldLowerStr, oldUpperStr, currentStr, widthPctStr];
  for (var i = 0; i < required.length; i++) {
    if (required[i] == null || String(required[i]).trim() === "") return null;
  }
  var liquidity = Number(liquidityStr), widthPct = Number(widthPctStr);
  if (!Number.isFinite(liquidity) || liquidity <= 0) return null;
  if (!Number.isFinite(widthPct) || widthPct <= 0) return null;
  var cur = clmmPositionAtPrice(liquidityStr, oldLowerStr, oldUpperStr, currentStr);
  if (cur === null) return null;
  var current = cur.price;
  var m = 1 + widthPct / 100;
  var newLower = current / m, newUpper = current * m;
  var tickNewLower = priceToTick(newLower), tickNewUpper = priceToTick(newUpper);
  if (tickNewLower < TICK_MIN || tickNewUpper > TICK_MAX) return null;
  var unit = clmmPositionAtPrice("1", String(newLower), String(newUpper), String(current));
  if (unit === null || !(unit.valueInB > 0)) return null;
  var newLiquidity = cur.valueInB / unit.valueInB;
  if (!Number.isFinite(newLiquidity) || newLiquidity <= 0) return null;
  var target = clmmPositionAtPrice(String(newLiquidity), String(newLower), String(newUpper), String(current));
  if (target === null) return null;
  var deltaA = target.amountA - cur.amountA;
  var deltaB = target.amountB - cur.amountB;
  /* A re-centre that keeps the price at the old range's centre (only the
     width changes) needs NO swap in exact maths — the holdings are already
     split 50/50 — but floating point leaves a dust delta (~1e-12), which
     would otherwise surface as "Swap ≈ 0.0000 of token B for ≈ 0.0000 of
     token A". A swap worth at most 1e-9 of the position's value is dust:
     snap it to no swap. */
  if (Math.abs(deltaA * current) <= 1e-9 * cur.valueInB) { deltaA = 0; deltaB = 0; }
  var swapSide = "none", swapSellToken = null, swapSellAmount = 0, swapBuyToken = null, swapBuyAmount = 0;
  if (deltaA > 0) {
    swapSide = "buyA"; swapSellToken = "B"; swapSellAmount = deltaA * current; swapBuyToken = "A"; swapBuyAmount = deltaA;
  } else if (deltaA < 0) {
    swapSide = "sellA"; swapSellToken = "A"; swapSellAmount = -deltaA; swapBuyToken = "B"; swapBuyAmount = -deltaA * current;
  }
  return {
    liquidity: liquidity,
    oldLower: cur.lowerPrice,
    oldUpper: cur.upperPrice,
    currentPrice: current,
    widthPct: widthPct,
    multiple: m,
    newLower: newLower,
    newUpper: newUpper,
    tickNewLower: tickNewLower,
    tickNewUpper: tickNewUpper,
    curA: cur.amountA,
    curB: cur.amountB,
    curStatus: cur.status,
    valueInB: cur.valueInB,
    newLiquidity: newLiquidity,
    targetA: target.amountA,
    targetB: target.amountB,
    targetBValuePct: target.bValuePct,
    deltaA: deltaA,
    deltaB: deltaB,
    swapSide: swapSide,
    swapSellToken: swapSellToken,
    swapSellAmount: swapSellAmount,
    swapBuyToken: swapBuyToken,
    swapBuyAmount: swapBuyAmount,
    upRoomPct: (newUpper / current - 1) * 100,
    downRoomPct: (1 - newLower / current) * 100
  };
}

/* ---------- 37 · CLMM withdrawal planner (partial or full exit) ---------- */
/* Tool 7 plans a withdrawal from a constant-product pool and keeps
   noting CLMM exits work differently; tool 34 closes a CLMM position
   only in full and only into one token. This is the missing middle:
   withdraw a chosen percentage of a CLMM position's liquidity and
   receive BOTH tokens, in the mix the position holds at the exit
   price. A CLMM position's holdings are linear in its liquidity L
   (tool 9's formulas are all L times a range/price factor), so
   withdrawing p% of L pays exactly p% of what tool 9 says the
   position holds at that price, and what stays behind is a position
   with (100 - p)% of the liquidity over the SAME range — its
   holdings are tool 9's own amounts at the reduced L (tests assert
   both halves against tool 9 verbatim, so this tool can never drift
   from it). At 100% the withdrawal is the full close: you receive
   tool 9's amounts exactly and nothing remains. Outside the range
   the position is a single token (tool 9's below/above cases), so
   the withdrawal is that token alone — withdrawing from an
   out-of-range position does not conjure the other token back.
   Model only: no fees earned are added to the payout (real CLMM
   withdrawals also collect accrued fees separately), no withdrawal
   fee is modelled, and a real exit is quoted live on the pool page. */
function clmmWithdrawPlan(liquidityStr, lowerStr, upperStr, priceStr, withdrawPctStr) {
  var required = [liquidityStr, lowerStr, upperStr, priceStr, withdrawPctStr];
  for (var i = 0; i < required.length; i++) {
    if (required[i] == null || String(required[i]).trim() === "") return null;
  }
  var liquidity = Number(liquidityStr), pct = Number(withdrawPctStr);
  if (!Number.isFinite(liquidity) || liquidity <= 0) return null;
  if (!Number.isFinite(pct) || pct <= 0 || pct > 100) return null;
  var cur = clmmPositionAtPrice(liquidityStr, lowerStr, upperStr, priceStr);
  if (cur === null) return null;
  var frac = pct / 100;
  var outA = cur.amountA * frac, outB = cur.amountB * frac;
  if (!(outA + outB > 0)) return null;
  var remL = liquidity * (1 - frac);
  var rem = remL > 0
    ? clmmPositionAtPrice(String(remL), lowerStr, upperStr, priceStr)
    : { amountA: 0, amountB: 0, valueInB: 0 };
  if (rem === null) return null;
  return {
    liquidity: liquidity,
    lowerPrice: cur.lowerPrice,
    upperPrice: cur.upperPrice,
    price: cur.price,
    status: cur.status,
    inRange: cur.inRange,
    withdrawPct: pct,
    curA: cur.amountA,
    curB: cur.amountB,
    outA: outA,
    outB: outB,
    outValueInB: outA * cur.price + outB,
    remainingLiquidity: remL,
    remainingA: rem.amountA,
    remainingB: rem.amountB,
    remainingValueInB: rem.valueInB,
    valueInB: cur.valueInB,
    fullClose: pct === 100
  };
}

/* ---------- 38 · Constant-product wallet-balance deposit planner ---------- */
/* Tool 14's question for an ordinary constant-product pool. Tool 5
   asks how much token B a chosen token-A deposit needs; a wallet
   instead holds fixed amounts of BOTH tokens, and a constant-product
   deposit must land in the pool's existing ratio — so the biggest
   deposit those balances can fund is capped by whichever side is
   scarcer in ratio terms. If token A's balance needs no more B than
   the wallet holds (reserveB * balanceA / reserveA <= balanceB, exact
   scaled-BigInt floored at 9 dp), A limits: the whole A balance is
   deposited and B is left over. Otherwise B limits: the deposit's A
   leg is floor(reserveA * balanceB / reserveB) and the pair is then
   settled by Tool 5's own depositPlan, so the B actually deposited is
   exactly Tool 5's requiredB for that A leg and can never drift from
   it. One honest rounding edge: on the B-limited side the 9 dp floors
   can leave a few smallest units of token B behind as dust (bounded
   by the pool's B-per-A ratio in those units) — the tests pin a
   case that leaves exactly one unit, 0.000000001. A zero balance on either
   side funds nothing (both tokens are required) and is rejected, as
   is a deposit whose other leg floors to zero. Model only: no fees,
   and a real deposit is quoted live on the pool page. */
function cpWalletPlan(reserveAStr, reserveBStr, balanceAStr, balanceBStr) {
  var required = [reserveAStr, reserveBStr, balanceAStr, balanceBStr];
  for (var i = 0; i < required.length; i++) {
    if (required[i] == null || String(required[i]).trim() === "") return null;
  }
  var ra = parseScaled(reserveAStr), rb = parseScaled(reserveBStr);
  var ba = parseScaled(balanceAStr), bb = parseScaled(balanceBStr);
  if (ra === null || rb === null || ba === null || bb === null) return null;
  if (ra <= 0n || rb <= 0n || ba <= 0n || bb <= 0n) return null;
  var reqBforA = rb * ba / ra;
  var usedA, limiting;
  if (reqBforA <= bb) {
    usedA = ba;
    limiting = reqBforA === bb ? "both" : "A";
  } else {
    usedA = ra * bb / rb;
    limiting = "B";
  }
  if (usedA <= 0n) return null;
  var plan = depositPlan(reserveAStr, reserveBStr, formatScaled(usedA));
  if (plan === null) return null;
  var usedB = parseScaled(plan.requiredB);
  if (usedB <= 0n || usedB > bb) return null;
  return {
    usedA: formatScaled(usedA),
    usedB: plan.requiredB,
    leftoverA: formatScaled(ba - usedA),
    leftoverB: formatScaled(bb - usedB),
    limiting: limiting,
    sharePct: plan.sharePct,
    newReserveA: plan.newReserveA,
    newReserveB: plan.newReserveB,
    priceBperA: plan.priceBperA
  };
}

/* ---------- 39 · Two-hop exact-out swap model ---------- */
/* Tool 23 routes a fixed amount IN through two pools; Tool 6 prices a
   fixed amount OUT of one pool. This is the two questions composed:
   "I need exactly this much of token C — how much token A must I pay?"
   Work backwards, and every leg is Tool 6's own cpSwapExactOut, so the
   legs can never drift from it: hop 2's exact-out on the target gives
   the intermediate token M that hop 2 must receive, and hop 1's
   exact-out on THAT amount (its string exactly as Tool 6 reports it,
   ceiling-rounded at 9 dp) gives the token A to pay. Each hop rounds
   its required input UP the way Tool 6 does, so feeding the reported
   input forward through Tool 23 returns at least the target (the
   tests assert this; the excess is a few smallest units at most).
   The combined spot price is the product of the hops' spots (M per
   A x C per M = C per A) and the combined impact follows Tool 6's
   definition against it. Feasibility is inherited from Tool 6: the
   target must be less than pool 2's out reserve, and the M required
   must be less than pool 1's out reserve — a route that would have
   to drain either pool is rejected, not priced. Both pools are
   constant-product here; no routing search is done. Model only. */
function twoHopExactOut(reserve1InStr, reserve1OutStr, reserve2InStr, reserve2OutStr, amountOutStr, fee1Bps, fee2Bps) {
  var required = [reserve1InStr, reserve1OutStr, reserve2InStr, reserve2OutStr, amountOutStr];
  for (var i = 0; i < required.length; i++) {
    if (required[i] == null || String(required[i]).trim() === "") return null;
  }
  var hop2 = cpSwapExactOut(reserve2InStr, reserve2OutStr, amountOutStr, fee2Bps);
  if (hop2 === null) return null;
  var hop1 = cpSwapExactOut(reserve1InStr, reserve1OutStr, hop2.amountIn, fee1Bps);
  if (hop1 === null) return null;
  var amountOut = Number(amountOutStr);
  if (!Number.isFinite(amountOut) || amountOut <= 0) return null;
  var spotPrice = hop1.spotPrice * hop2.spotPrice;
  var effectivePrice = amountOut / Number(hop1.amountIn);
  return {
    amountIn: hop1.amountIn,
    midIn: hop2.amountIn,
    out: formatScaled(parseScaled(amountOutStr)),
    hop1ImpactPct: hop1.priceImpactPct,
    hop2ImpactPct: hop2.priceImpactPct,
    spotPrice: spotPrice,
    effectivePrice: effectivePrice,
    priceImpactPct: (1 - effectivePrice / spotPrice) * 100,
    fee1Pct: hop1.feePct,
    fee2Pct: hop2.feePct
  };
}

/* ---------- 42 · CLMM single-range swap model ---------- */
/* Every CLMM tool so far plans, checks or closes a POSITION; the swap
   itself was always borrowed from a separate constant-product pool
   (tools 33 and 34 swap their legs through tool 1). This prices a swap
   against concentrated liquidity directly, inside the one active range
   that holds the current price. A range [lower, upper] with liquidity
   L (price = token B per token A; s = sqrt(price) and friends) holds
   amountA = L * (1/s - 1/sqrt(upper)) and amountB = L * (s - sqrt(lower))
   — tool 9's amounts — and a swap just walks s along those same curves:
     pay A (price falls):  1/s' = 1/s + netA / L,  out B = L * (s - s')
     pay B (price rises):  s' = s + netB / L,      out A = L * (1/s - 1/s')
   with the fee taken off the input first, exactly as tool 1 takes it.
   The range's edge is a hard wall: paying A can push the price down to
   lower and no further, because at lower the range holds no B left to
   pay out — the most B a pay-A swap can ever return here is the B the
   position holds now, L * (s - sqrt(lower)), and reaching it costs
   L * (1/sqrt(lower) - 1/s) of net A. An input past that point is NOT
   silently absorbed: the swap stops at the edge, reports the part of
   the input it actually used and leaves the rest unfilled (a real
   CLMM swap would continue into the next tick range with its own
   liquidity; this single-range model has no next range, so it says
   so instead of inventing one). A current price at or outside the
   range is rejected — the range holds no two-sided liquidity there,
   so there is no swap inside it to price. Price impact is measured
   tool 1's way: 1 - (out / amount in used) / spot rate, so it includes
   the fee. Floating point, like every CLMM tool here. Model only: a
   real CLMM pool's liquidity varies tick by tick and its live quote
   is on the pool page. */
function clmmSwap(liquidityStr, lowerStr, upperStr, priceStr, amountInStr, feeBps, direction) {
  var liquidity = Number(liquidityStr), lower = Number(lowerStr), upper = Number(upperStr);
  var price = Number(priceStr), amountIn = Number(amountInStr), fee = Number(feeBps);
  if (![liquidity, lower, upper, price, amountIn].every(Number.isFinite)) return null;
  if (liquidity <= 0 || lower <= 0 || upper <= 0 || price <= 0 || amountIn <= 0) return null;
  if (lower >= upper) return null;
  if (price <= lower || price >= upper) return null;
  if (!Number.isInteger(fee) || fee < 0 || fee > 9999) return null;
  if (direction !== "ab" && direction !== "ba") return null;
  var f = fee / 10000;
  var sa = Math.sqrt(lower), sb = Math.sqrt(upper), s = Math.sqrt(price);
  var netMax, sNew, usedIn, netUsed, amountOut, spotRate, hitBoundary = false;
  if (direction === "ab") {
    netMax = liquidity * (1 / sa - 1 / s);
    if (amountIn * (1 - f) <= netMax) {
      netUsed = amountIn * (1 - f);
      usedIn = amountIn;
      sNew = 1 / (1 / s + netUsed / liquidity);
    } else {
      netUsed = netMax;
      usedIn = netMax / (1 - f);
      sNew = sa;
      hitBoundary = true;
    }
    /* Uncapped, the output is formed as netUsed·s·sNew (paying A) or
       netUsed/(s·sNew) (paying B) — algebraically L·(s − sNew) and
       L·(1/s − 1/sNew), but without their cancellation: when the price
       barely moves (a small swap against a deep range), sNew rounds
       back to s and the difference form returns exactly 0, which the
       guard below would reject as invalid input. The capped branch
       keeps the edge difference, where sNew IS the edge, assigned. */
    amountOut = hitBoundary ? liquidity * (s - sNew) : netUsed * s * sNew;
    spotRate = price;
  } else {
    netMax = liquidity * (sb - s);
    if (amountIn * (1 - f) <= netMax) {
      netUsed = amountIn * (1 - f);
      usedIn = amountIn;
      sNew = s + netUsed / liquidity;
    } else {
      netUsed = netMax;
      usedIn = netMax / (1 - f);
      sNew = sb;
      hitBoundary = true;
    }
    amountOut = hitBoundary ? liquidity * (1 / s - 1 / sNew) : netUsed / (s * sNew);
    spotRate = 1 / price;
  }
  if (!Number.isFinite(amountOut) || amountOut <= 0) return null;
  var effectiveRate = amountOut / usedIn;
  return {
    liquidity: liquidity,
    lowerPrice: lower,
    upperPrice: upper,
    price: price,
    direction: direction,
    amountIn: amountIn,
    usedIn: usedIn,
    unfilledIn: amountIn - usedIn,
    feePaid: usedIn - netUsed,
    amountOut: amountOut,
    newPrice: sNew * sNew,
    spotRate: spotRate,
    effectiveRate: effectiveRate,
    priceImpactPct: (1 - effectiveRate / spotRate) * 100,
    hitBoundary: hitBoundary,
    feePct: fee / 100,
    feeBps: fee
  };
}

/* ---------- 43 · CLMM two-range swap model ---------- */
/* Tool 42 prices a swap inside the one active range and stops at its
   edge, leaving the rest unfilled, because a real CLMM swap continues
   into the next tick range at THAT range's liquidity — which the
   single-range model refused to invent. This tool lets the user supply
   that next range instead: an outer edge price and its own liquidity
   L2. The two ranges share the active range's edge by construction —
   paying A, the second range is [outer, lower]; paying B it is
   [upper, outer] — so adjacency is not an input to get wrong, only the
   outer edge (strictly beyond the shared edge, on the side the price
   is walking toward) and L2 are. Leg 1 is tool 42's own clmmSwap,
   verbatim: if the input never reaches the edge, the answer IS tool
   42's answer and crossed is false. If it does reach the edge, the
   unfilled remainder walks the second range's curve from the edge
   itself, under the same formulas (1/s' = 1/s + netA/L2 paying A,
   s' = s + netB/L2 paying B, fee off each leg's input first — the
   same tier on both legs, so the total fee is still exactly the
   tier's share of the total input used). At the shared edge the
   second range holds only the token the swap pays out, which is why
   tool 42 rejects an edge price as a STARTING price (no two-sided
   liquidity to open a position against) while a crossing swap
   legitimately passes through it: the walk is single-sided there
   for exactly one instant. The second range is also a wall: if it
   caps too, the swap stops at the outer edge and the rest is again
   unfilled, not absorbed — a real pool has a third range, a fourth,
   and liquidity that usually thins the further the price walks from
   where it started, which is the cliff tool 42's guide item warns
   about. Two ranges at two constant L values only. Floating point,
   like every CLMM tool here. Model only: a real CLMM pool's
   liquidity varies tick by tick and its live quote is on the pool
   page. */
function clmmCrossSwap(liquidityStr, lowerStr, upperStr, priceStr, amountInStr, feeBps, direction, secondLiquidityStr, secondOuterStr) {
  var liquidity2 = Number(secondLiquidityStr), outer = Number(secondOuterStr);
  if (!Number.isFinite(liquidity2) || !Number.isFinite(outer)) return null;
  if (liquidity2 <= 0 || outer <= 0) return null;
  if (direction !== "ab" && direction !== "ba") return null;
  var leg1 = clmmSwap(liquidityStr, lowerStr, upperStr, priceStr, amountInStr, feeBps, direction);
  if (leg1 === null) return null;
  if (direction === "ab" && !(outer < leg1.lowerPrice)) return null;
  if (direction === "ba" && !(outer > leg1.upperPrice)) return null;
  var f = leg1.feeBps / 10000;
  var boundary = direction === "ab" ? leg1.lowerPrice : leg1.upperPrice;
  var base = {
    liquidity: leg1.liquidity, lowerPrice: leg1.lowerPrice, upperPrice: leg1.upperPrice,
    secondLiquidity: liquidity2,
    secondLowerPrice: direction === "ab" ? outer : leg1.upperPrice,
    secondUpperPrice: direction === "ab" ? leg1.lowerPrice : outer,
    boundaryPrice: boundary,
    price: leg1.price, direction: direction, amountIn: leg1.amountIn,
    feeBps: leg1.feeBps, feePct: leg1.feePct, spotRate: leg1.spotRate
  };
  if (!leg1.hitBoundary) {
    return Object.assign(base, {
      crossed: false, hitSecondBoundary: false,
      usedIn: leg1.usedIn, unfilledIn: leg1.unfilledIn, feePaid: leg1.feePaid,
      leg1UsedIn: leg1.usedIn, leg1Out: leg1.amountOut, leg2UsedIn: 0, leg2Out: 0,
      amountOut: leg1.amountOut, newPrice: leg1.newPrice,
      effectiveRate: leg1.effectiveRate, priceImpactPct: leg1.priceImpactPct
    });
  }
  var remaining = leg1.unfilledIn;
  var sB = Math.sqrt(boundary), sOut = Math.sqrt(outer);
  var netMax2, sNew, used2, netUsed2, out2, hitSecond = false;
  if (direction === "ab") {
    netMax2 = liquidity2 * (1 / sOut - 1 / sB);
    if (remaining * (1 - f) <= netMax2) {
      netUsed2 = remaining * (1 - f); used2 = remaining;
      sNew = 1 / (1 / sB + netUsed2 / liquidity2);
    } else {
      netUsed2 = netMax2; used2 = netMax2 / (1 - f); sNew = sOut; hitSecond = true;
    }
    /* Cancellation-free output, as in tool 42: netUsed2·sB·sNew here,
       netUsed2/(sB·sNew) paying B; the capped branch keeps the edge
       difference. A remainder that barely enters this range against a
       deep L2 otherwise rounds sNew back to sB and reads as 0 out. */
    out2 = hitSecond ? liquidity2 * (sB - sNew) : netUsed2 * sB * sNew;
  } else {
    netMax2 = liquidity2 * (sOut - sB);
    if (remaining * (1 - f) <= netMax2) {
      netUsed2 = remaining * (1 - f); used2 = remaining;
      sNew = sB + netUsed2 / liquidity2;
    } else {
      netUsed2 = netMax2; used2 = netMax2 / (1 - f); sNew = sOut; hitSecond = true;
    }
    out2 = hitSecond ? liquidity2 * (1 / sB - 1 / sNew) : netUsed2 / (sB * sNew);
  }
  if (!Number.isFinite(out2) || out2 <= 0) return null;
  var usedIn = leg1.usedIn + used2;
  var amountOut = leg1.amountOut + out2;
  var effectiveRate = amountOut / usedIn;
  return Object.assign(base, {
    crossed: true, hitSecondBoundary: hitSecond,
    usedIn: usedIn, unfilledIn: leg1.amountIn - usedIn,
    feePaid: leg1.feePaid + (used2 - netUsed2),
    leg1UsedIn: leg1.usedIn, leg1Out: leg1.amountOut, leg2UsedIn: used2, leg2Out: out2,
    amountOut: amountOut, newPrice: sNew * sNew,
    effectiveRate: effectiveRate,
    priceImpactPct: (1 - effectiveRate / leg1.spotRate) * 100
  });
}

/* ---------- 44 · CLMM single-range exact-out swap model ---------- */
/* Tool 42 prices a CLMM swap forwards — a fixed amount in, whatever
   comes out — and tool 6 prices a constant-product swap backwards.
   This is tool 42 backwards: the user names the exact amount out a
   concentrated range must pay, and the model solves the range's own
   curve for the amount in that buys it. Paying A for B, the target
   sets the new sqrt-price directly (s' = s − out/L) and the net A
   owed is L × (1/s' − 1/s); paying B for A is the mirror
   (1/s' = 1/s − out/L, net B = L × (s' − s)). The net amount is then
   grossed up for the fee — amountIn = net / (1 − fee share) — exactly
   the way tool 42 takes the fee off the input first, so feeding this
   tool's amountIn back into tool 42 returns the target out (the tests
   assert that round trip across a sweep). The wall tool 42 warns
   about becomes a hard limit here, not a partial fill: the most one
   range can ever pay out is the out-token it actually holds at the
   current price — tool 9's own holding (L × (s − √lower) of B paying
   A, L × (1/s − 1/√upper) of A paying B) — so a target above that
   holding is rejected, not priced down or capped. A real swap would
   continue into the next tick range (tool 43 supplies one for the
   forwards case); this exact-out model has no next range and does
   not invent one, so an impossible-in-one-range target stays
   impossible here even though a live pool might fill it across
   ranges. The boundary flag's tolerance is purely relative (1e-12
   of the holding): an absolute floor would misreport a tiny
   range's half-drained target as draining it. A target exactly
   equal to the holding is priced: it walks
   the price to the edge, and its gross input is exactly tool 42's
   capped used-in for that same walk. Single range only, floating
   point like every CLMM tool here. Model only: a real CLMM pool's
   liquidity varies tick by tick and its live quote is on the pool
   page. */
function clmmSwapExactOut(liquidityStr, lowerStr, upperStr, priceStr, amountOutStr, feeBps, direction) {
  var liquidity = Number(liquidityStr), lower = Number(lowerStr), upper = Number(upperStr);
  var price = Number(priceStr), amountOut = Number(amountOutStr), fee = Number(feeBps);
  if (![liquidity, lower, upper, price, amountOut].every(Number.isFinite)) return null;
  if (liquidity <= 0 || lower <= 0 || upper <= 0 || price <= 0 || amountOut <= 0) return null;
  if (lower >= upper) return null;
  if (price <= lower || price >= upper) return null;
  if (!Number.isInteger(fee) || fee < 0 || fee > 9999) return null;
  if (direction !== "ab" && direction !== "ba") return null;
  var f = fee / 10000;
  var sa = Math.sqrt(lower), sb = Math.sqrt(upper), s = Math.sqrt(price);
  var maxOut, sNew, netIn, spotRate;
  if (direction === "ab") {
    maxOut = liquidity * (s - sa);
    if (amountOut > maxOut) return null;
    sNew = s - amountOut / liquidity;
    /* Cancellation-free net-in: L·(1/sNew − 1/s) formed as
       amountOut/(s·sNew) — since s − sNew is exactly amountOut/L,
       the reciprocal difference is the product form without its
       cancellation. A dust target against a deep range otherwise
       rounds sNew back to s, reads as 0 in, and is rejected below;
       a target a few ulps larger prices off a quantized reciprocal
       difference with errors of tens of percent. */
    netIn = amountOut / (s * sNew);
    spotRate = price;
  } else {
    maxOut = liquidity * (1 / s - 1 / sb);
    if (amountOut > maxOut) return null;
    sNew = 1 / (1 / s - amountOut / liquidity);
    /* Mirror: L·(sNew − s) formed as amountOut·s·sNew, since
       1/s − 1/sNew is exactly amountOut/L. */
    netIn = amountOut * s * sNew;
    spotRate = 1 / price;
  }
  if (!Number.isFinite(netIn) || netIn <= 0 || !Number.isFinite(sNew)) return null;
  var amountIn = netIn / (1 - f);
  var effectiveRate = amountOut / amountIn;
  return {
    liquidity: liquidity,
    lowerPrice: lower,
    upperPrice: upper,
    price: price,
    direction: direction,
    amountOut: amountOut,
    maxOut: maxOut,
    amountIn: amountIn,
    netIn: netIn,
    feePaid: amountIn - netIn,
    newPrice: sNew * sNew,
    spotRate: spotRate,
    effectiveRate: effectiveRate,
    priceImpactPct: (1 - effectiveRate / spotRate) * 100,
    hitBoundary: Math.abs(amountOut - maxOut) <= maxOut * 1e-12,
    feePct: fee / 100,
    feeBps: fee
  };
}

/* ---------- 45 · CLMM two-range exact-out swap model ---------- */
/* Tool 44 prices an exact-out swap against the one active range and
   rejects any target above what that range holds, because a real fill
   would cross into the next tick range at liquidity the single-range
   model refused to invent. Tool 43 supplies that next range for the
   forwards case; this tool supplies it backwards. The two ranges
   share the active range's edge by construction — paying A, the
   second range is [outer, lower]; paying B it is [upper, outer] — so
   only its liquidity L2 and its outer edge are inputs. A target that
   fits inside the first range IS tool 44's answer, verbatim
   (crossed false, both legs but the first zero). A bigger target
   drains the first range completely — leg 1 is tool 44 priced at
   exactly that range's holding, which costs exactly tool 42's capped
   used-in — and the remainder is solved on the second range's own
   curve starting from the shared edge (paying A: s' = √lower −
   remainder/L2, net A = L2 × (1/s' − 1/√lower); paying B mirrored),
   grossed up for the fee the same way on both legs, so the total fee
   is still exactly the tier's share of the total input. Feeding the
   total amount in back into tool 43 returns the target and lands on
   the same price (asserted across a sweep in the tests). The ceiling
   is now combined, and it is still a ceiling: the most the two
   ranges can pay out together is what they hold together — the first
   range's holding at the current price plus the second range's
   holding of the out-token at the shared edge — and a target above
   that sum is rejected, not priced, because the third range a live
   fill would need is not invented here either. A target exactly
   equal to the combined holding is priced and walks the price to the
   outer edge. The boundary flag measures the target's distance to
   that combined ceiling, relative to the second holding: forming it
   from the remainder instead would lose it to cancellation when the
   second range's holding is tiny next to the first range's, and the
   exact-ceiling target would be misreported as merely crossed. The second range's depth is the price of crossing:
   the same remainder out of a tenth-depth second range costs more
   input and walks the price far further than out of a deep one.
   Two ranges at two constant L values only, floating point like
   every CLMM tool here. Model only: a real CLMM pool's liquidity
   varies tick by tick and its live quote is on the pool page. */
function clmmCrossSwapExactOut(liquidityStr, lowerStr, upperStr, priceStr, amountOutStr, feeBps, direction, secondLiquidityStr, secondOuterStr) {
  var liquidity = Number(liquidityStr), lower = Number(lowerStr), upper = Number(upperStr);
  var price = Number(priceStr), amountOut = Number(amountOutStr), fee = Number(feeBps);
  var liquidity2 = Number(secondLiquidityStr), outer = Number(secondOuterStr);
  if (![liquidity, lower, upper, price, amountOut, liquidity2, outer].every(Number.isFinite)) return null;
  if (liquidity <= 0 || lower <= 0 || upper <= 0 || price <= 0 || amountOut <= 0 || liquidity2 <= 0 || outer <= 0) return null;
  if (lower >= upper) return null;
  if (price <= lower || price >= upper) return null;
  if (!Number.isInteger(fee) || fee < 0 || fee > 9999) return null;
  if (direction !== "ab" && direction !== "ba") return null;
  if (direction === "ab" && !(outer < lower)) return null;
  if (direction === "ba" && !(outer > upper)) return null;
  var f = fee / 10000;
  var sa = Math.sqrt(lower), sb = Math.sqrt(upper), s = Math.sqrt(price), sOut = Math.sqrt(outer);
  var maxOut1, maxOut2, spotRate;
  if (direction === "ab") {
    maxOut1 = liquidity * (s - sa);
    maxOut2 = liquidity2 * (sa - sOut);
    spotRate = price;
  } else {
    maxOut1 = liquidity * (1 / s - 1 / sb);
    maxOut2 = liquidity2 * (1 / sb - 1 / sOut);
    spotRate = 1 / price;
  }
  var base = {
    liquidity: liquidity, lowerPrice: lower, upperPrice: upper,
    secondLiquidity: liquidity2,
    secondLowerPrice: direction === "ab" ? outer : upper,
    secondUpperPrice: direction === "ab" ? lower : outer,
    boundaryPrice: direction === "ab" ? lower : upper,
    price: price, direction: direction, amountOut: amountOut,
    maxOut: maxOut1 + maxOut2, firstMaxOut: maxOut1, secondMaxOut: maxOut2,
    feeBps: fee, feePct: fee / 100, spotRate: spotRate
  };
  if (amountOut <= maxOut1) {
    var leg1 = clmmSwapExactOut(liquidityStr, lowerStr, upperStr, priceStr, amountOutStr, feeBps, direction);
    if (leg1 === null) return null;
    return Object.assign(base, {
      crossed: false, hitSecondBoundary: false,
      amountIn: leg1.amountIn, netIn: leg1.netIn, feePaid: leg1.feePaid,
      leg1In: leg1.amountIn, leg1Out: leg1.amountOut, leg2In: 0, leg2Out: 0,
      newPrice: leg1.newPrice, effectiveRate: leg1.effectiveRate,
      priceImpactPct: leg1.priceImpactPct
    });
  }
  var remainder = amountOut - maxOut1;
  /* A target passed as the exact combined ceiling (maxOut1 + maxOut2,
     formed by the caller in floating point) can leave a remainder a
     few ulps above maxOut2 after this subtraction — at some ranges
     that rejected the ceiling itself as above the combined holding.
     Within a purely relative tolerance of the combined holding the
     remainder is the ceiling, clamped to maxOut2; beyond it the
     target is genuinely above what the two ranges hold. */
  if (remainder > maxOut2) {
    if (remainder - maxOut2 > (maxOut1 + maxOut2) * 1e-12) return null;
    remainder = maxOut2;
  }
  var leg1Full = clmmSwapExactOut(liquidityStr, lowerStr, upperStr, priceStr, String(maxOut1), feeBps, direction);
  if (leg1Full === null) return null;
  var sNew, net2;
  if (direction === "ab") {
    sNew = sa - remainder / liquidity2;
    /* Cancellation-free leg-2 net-in, as in tool 44: remainder/(sa·sNew)
       instead of L2·(1/sNew − 1/sa). A dust remainder against a deep
       second range otherwise rounds sNew back to sa and reads as 0. */
    net2 = remainder / (sa * sNew);
  } else {
    sNew = 1 / (1 / sb - remainder / liquidity2);
    net2 = remainder * sb * sNew;
  }
  if (!Number.isFinite(net2) || net2 <= 0 || !Number.isFinite(sNew)) return null;
  var in2 = net2 / (1 - f);
  var amountIn = leg1Full.amountIn + in2;
  var netIn = leg1Full.netIn + net2;
  var effectiveRate = amountOut / amountIn;
  return Object.assign(base, {
    crossed: true,
    hitSecondBoundary: (maxOut1 + maxOut2) - amountOut <= maxOut2 * 1e-12,
    amountIn: amountIn, netIn: netIn, feePaid: amountIn - netIn,
    leg1In: leg1Full.amountIn, leg1Out: maxOut1, leg2In: in2, leg2Out: remainder,
    newPrice: sNew * sNew, effectiveRate: effectiveRate,
    priceImpactPct: (1 - effectiveRate / spotRate) * 100
  });
}

/* ---------- 46 · CLMM three-range swap model ---------- */
/* Tool 43 prices a CLMM swap forwards across two ranges and stops at
   the second range's outer edge, leaving the rest unfilled, because a
   real swap continues into a third tick range at THAT range's
   liquidity — which the two-range model refused to invent. This tool
   lets the user supply that third range instead: its own liquidity L3
   and its outer edge. The ranges chain by construction — paying A,
   the third range is [outer3, outer2]; paying B it is [outer2,
   outer3] — so adjacency is not an input to get wrong, only the
   third range's depth and how far it extends. Everything up to the
   second wall IS tool 43's own clmmCrossSwap, verbatim: a swap that
   never fills the second range returns tool 43's answer untouched
   (enteredThird false, third leg zero), and a swap that does fill it
   keeps tool 43's leg 1 and leg 2 exactly, then walks the unfilled
   remainder along the third range's curve from the second edge
   itself, under the same formulas and the same fee tier (fee off
   each leg's input first), so the total fee is still exactly the
   tier's share of the total input used. The third range is a wall
   too: fill it and the swap stops at its outer edge with the rest
   again unfilled, not absorbed — a real pool has a fourth range, a
   fifth, and liquidity that usually keeps thinning the further the
   price walks. Three ranges at three constant L values only.
   Floating point, like every CLMM tool here. Model only: a real CLMM
   pool's liquidity varies tick by tick and its live quote is on the
   pool page. */
function clmmTripleSwap(liquidityStr, lowerStr, upperStr, priceStr, amountInStr, feeBps, direction, secondLiquidityStr, secondOuterStr, thirdLiquidityStr, thirdOuterStr) {
  var liquidity3 = Number(thirdLiquidityStr), outer3 = Number(thirdOuterStr);
  if (!Number.isFinite(liquidity3) || !Number.isFinite(outer3)) return null;
  if (liquidity3 <= 0 || outer3 <= 0) return null;
  if (direction !== "ab" && direction !== "ba") return null;
  var prev = clmmCrossSwap(liquidityStr, lowerStr, upperStr, priceStr, amountInStr, feeBps, direction, secondLiquidityStr, secondOuterStr);
  if (prev === null) return null;
  if (direction === "ab" && !(outer3 < prev.secondLowerPrice)) return null;
  if (direction === "ba" && !(outer3 > prev.secondUpperPrice)) return null;
  var secondBoundary = direction === "ab" ? prev.secondLowerPrice : prev.secondUpperPrice;
  var base = {
    liquidity: prev.liquidity, lowerPrice: prev.lowerPrice, upperPrice: prev.upperPrice,
    secondLiquidity: prev.secondLiquidity,
    secondLowerPrice: prev.secondLowerPrice, secondUpperPrice: prev.secondUpperPrice,
    thirdLiquidity: liquidity3,
    thirdLowerPrice: direction === "ab" ? outer3 : prev.secondUpperPrice,
    thirdUpperPrice: direction === "ab" ? prev.secondLowerPrice : outer3,
    boundaryPrice: prev.boundaryPrice,
    secondBoundaryPrice: secondBoundary,
    price: prev.price, direction: direction, amountIn: prev.amountIn,
    feeBps: prev.feeBps, feePct: prev.feePct, spotRate: prev.spotRate
  };
  if (!prev.hitSecondBoundary) {
    return Object.assign(base, {
      crossed: prev.crossed, enteredThird: false, hitThirdBoundary: false,
      usedIn: prev.usedIn, unfilledIn: prev.unfilledIn, feePaid: prev.feePaid,
      leg1UsedIn: prev.leg1UsedIn, leg1Out: prev.leg1Out,
      leg2UsedIn: prev.leg2UsedIn, leg2Out: prev.leg2Out,
      leg3UsedIn: 0, leg3Out: 0,
      amountOut: prev.amountOut, newPrice: prev.newPrice,
      effectiveRate: prev.effectiveRate, priceImpactPct: prev.priceImpactPct
    });
  }
  var f = prev.feeBps / 10000;
  var remaining = prev.unfilledIn;
  var sB = Math.sqrt(secondBoundary), sOut = Math.sqrt(outer3);
  var netMax3, sNew, used3, netUsed3, out3, hitThird = false;
  if (direction === "ab") {
    netMax3 = liquidity3 * (1 / sOut - 1 / sB);
    if (remaining * (1 - f) <= netMax3) {
      netUsed3 = remaining * (1 - f); used3 = remaining;
      sNew = 1 / (1 / sB + netUsed3 / liquidity3);
    } else {
      netUsed3 = netMax3; used3 = netMax3 / (1 - f); sNew = sOut; hitThird = true;
    }
    /* Cancellation-free output, as in tools 42/43: netUsed3·sB·sNew
       here, netUsed3/(sB·sNew) paying B; the capped branch keeps the
       edge difference. A remainder that barely enters this range
       against a deep L3 otherwise rounds sNew back to sB, reads as
       0 out, and the whole swap is rejected as invalid input. */
    out3 = hitThird ? liquidity3 * (sB - sNew) : netUsed3 * sB * sNew;
  } else {
    netMax3 = liquidity3 * (sOut - sB);
    if (remaining * (1 - f) <= netMax3) {
      netUsed3 = remaining * (1 - f); used3 = remaining;
      sNew = sB + netUsed3 / liquidity3;
    } else {
      netUsed3 = netMax3; used3 = netMax3 / (1 - f); sNew = sOut; hitThird = true;
    }
    out3 = hitThird ? liquidity3 * (1 / sB - 1 / sNew) : netUsed3 / (sB * sNew);
  }
  if (!Number.isFinite(out3) || out3 <= 0) return null;
  var usedIn = prev.usedIn + used3;
  var amountOut = prev.amountOut + out3;
  var effectiveRate = amountOut / usedIn;
  return Object.assign(base, {
    crossed: true, enteredThird: true, hitThirdBoundary: hitThird,
    usedIn: usedIn, unfilledIn: prev.amountIn - usedIn,
    feePaid: prev.feePaid + (used3 - netUsed3),
    leg1UsedIn: prev.leg1UsedIn, leg1Out: prev.leg1Out,
    leg2UsedIn: prev.leg2UsedIn, leg2Out: prev.leg2Out,
    leg3UsedIn: used3, leg3Out: out3,
    amountOut: amountOut, newPrice: sNew * sNew,
    effectiveRate: effectiveRate,
    priceImpactPct: (1 - effectiveRate / prev.spotRate) * 100
  });
}

/* ---------- 47 · CLMM three-range exact-out swap model ---------- */
/* Tool 45 prices an exact-out swap across two ranges and rejects any
   target above what the two hold together, because a real fill would
   cross into a third tick range at THAT range's liquidity — which
   the two-range model refused to invent. This tool lets the user
   supply that third range instead: its own liquidity L3 and its
   outer edge. The ranges chain by construction — paying A, the
   third range is [outer3, outer2]; paying B it is [outer2, outer3] —
   so adjacency is not an input to get wrong, only the third range's
   depth and how far it extends. Everything up to the second wall IS
   tool 45's own clmmCrossSwapExactOut: a target inside the two
   ranges' combined holding returns tool 45's answer verbatim
   (enteredThird false, third leg zero), and a bigger target drains
   the two ranges at exactly tool 45's combined-ceiling price before
   the remainder is solved on the third range's own curve from the
   second edge, its net input formed cancellation-free the way tool
   44 forms it (remainder/(sEdge·sNew) paying A, remainder·sEdge·sNew
   paying B), grossed up for the same fee tier — so the total fee is
   still exactly the tier's share of the total input. The ceiling is
   now what three ranges hold together, and it is still a ceiling: a
   target above it is rejected, not priced — a real fill would need
   a fourth range, which this model does not invent either. Tool 45
   cannot be called with the full target to validate the inputs (it
   rightly rejects targets above its own ceiling), so the two-range
   holdings are computed here with tool 45's own formulas and tool 45
   itself is probed at the first range's holding, which it always
   prices when the inputs are valid. Three ranges at three constant
   L values only. Floating point, like every CLMM tool here. Model
   only: a real CLMM pool's liquidity varies tick by tick and its
   live quote is on the pool page. */
function clmmTripleSwapExactOut(liquidityStr, lowerStr, upperStr, priceStr, amountOutStr, feeBps, direction, secondLiquidityStr, secondOuterStr, thirdLiquidityStr, thirdOuterStr) {
  var liquidity3 = Number(thirdLiquidityStr), outer3 = Number(thirdOuterStr);
  var amountOut = Number(amountOutStr);
  if (!Number.isFinite(liquidity3) || !Number.isFinite(outer3) || !Number.isFinite(amountOut)) return null;
  if (liquidity3 <= 0 || outer3 <= 0 || amountOut <= 0) return null;
  if (direction !== "ab" && direction !== "ba") return null;
  var liquidity = Number(liquidityStr), lower = Number(lowerStr), upper = Number(upperStr);
  var price = Number(priceStr), liquidity2 = Number(secondLiquidityStr), outer = Number(secondOuterStr);
  if (![liquidity, lower, upper, price, liquidity2, outer].every(Number.isFinite)) return null;
  if (liquidity <= 0 || price <= 0 || liquidity2 <= 0) return null;
  var sa = Math.sqrt(lower), sb = Math.sqrt(upper), s = Math.sqrt(price), sOut2 = Math.sqrt(outer);
  var maxOut1 = direction === "ab" ? liquidity * (s - sa) : liquidity * (1 / s - 1 / sb);
  var maxOut2 = direction === "ab" ? liquidity2 * (sa - sOut2) : liquidity2 * (1 / sb - 1 / sOut2);
  if (!(maxOut1 > 0) || !(maxOut2 > 0)) return null;
  var probe = clmmCrossSwapExactOut(liquidityStr, lowerStr, upperStr, priceStr, String(maxOut1), feeBps, direction, secondLiquidityStr, secondOuterStr);
  if (probe === null) return null;
  var prev = probe;
  if (amountOut <= maxOut1 + maxOut2) {
    prev = clmmCrossSwapExactOut(liquidityStr, lowerStr, upperStr, priceStr, amountOutStr, feeBps, direction, secondLiquidityStr, secondOuterStr);
    if (prev === null) return null;
  }
  if (direction === "ab" && !(outer3 < prev.secondLowerPrice)) return null;
  if (direction === "ba" && !(outer3 > prev.secondUpperPrice)) return null;
  var secondBoundary = direction === "ab" ? prev.secondLowerPrice : prev.secondUpperPrice;
  var sB = Math.sqrt(secondBoundary), sOut = Math.sqrt(outer3);
  var maxOut3 = direction === "ab" ? liquidity3 * (sB - sOut) : liquidity3 * (1 / sB - 1 / sOut);
  if (!(maxOut3 > 0)) return null;
  var base = {
    liquidity: prev.liquidity, lowerPrice: prev.lowerPrice, upperPrice: prev.upperPrice,
    secondLiquidity: prev.secondLiquidity,
    secondLowerPrice: prev.secondLowerPrice, secondUpperPrice: prev.secondUpperPrice,
    thirdLiquidity: liquidity3,
    thirdLowerPrice: direction === "ab" ? outer3 : prev.secondUpperPrice,
    thirdUpperPrice: direction === "ab" ? prev.secondLowerPrice : outer3,
    boundaryPrice: prev.boundaryPrice,
    secondBoundaryPrice: secondBoundary,
    price: prev.price, direction: direction, amountOut: amountOut,
    maxOut: maxOut1 + maxOut2 + maxOut3, firstMaxOut: maxOut1, secondMaxOut: maxOut2, thirdMaxOut: maxOut3,
    feeBps: prev.feeBps, feePct: prev.feePct, spotRate: prev.spotRate
  };
  if (amountOut <= maxOut1 + maxOut2) {
    return Object.assign(base, {
      crossed: prev.crossed, enteredThird: false, hitThirdBoundary: false,
      amountIn: prev.amountIn, netIn: prev.netIn, feePaid: prev.feePaid,
      leg1In: prev.leg1In, leg1Out: prev.leg1Out, leg2In: prev.leg2In, leg2Out: prev.leg2Out,
      leg3In: 0, leg3Out: 0,
      newPrice: prev.newPrice, effectiveRate: prev.effectiveRate, priceImpactPct: prev.priceImpactPct
    });
  }
  var remainder = amountOut - (maxOut1 + maxOut2);
  if (remainder > maxOut3) {
    if (remainder - maxOut3 > (maxOut1 + maxOut2 + maxOut3) * 1e-12) return null;
    remainder = maxOut3;
  }
  var leg12 = clmmCrossSwapExactOut(liquidityStr, lowerStr, upperStr, priceStr, String(maxOut1 + maxOut2), feeBps, direction, secondLiquidityStr, secondOuterStr);
  if (leg12 === null) return null;
  var f = prev.feeBps / 10000;
  var sNew, net3;
  if (direction === "ab") {
    sNew = sB - remainder / liquidity3;
    net3 = remainder / (sB * sNew);
  } else {
    sNew = 1 / (1 / sB - remainder / liquidity3);
    net3 = remainder * sB * sNew;
  }
  if (!Number.isFinite(net3) || net3 <= 0 || !Number.isFinite(sNew)) return null;
  var in3 = net3 / (1 - f);
  var amountIn = leg12.amountIn + in3;
  var netIn = leg12.netIn + net3;
  var effectiveRate = amountOut / amountIn;
  return Object.assign(base, {
    crossed: true, enteredThird: true,
    hitThirdBoundary: (maxOut1 + maxOut2 + maxOut3) - amountOut <= maxOut3 * 1e-12,
    amountIn: amountIn, netIn: netIn, feePaid: amountIn - netIn,
    leg1In: leg12.leg1In, leg1Out: leg12.leg1Out, leg2In: leg12.leg2In, leg2Out: leg12.leg2Out,
    leg3In: in3, leg3Out: remainder,
    newPrice: sNew * sNew, effectiveRate: effectiveRate,
    priceImpactPct: (1 - effectiveRate / prev.spotRate) * 100
  });
}

/* ---------- 52 · Fee compounding calculator (APR to APY) ---------- */
/* Every fee tool on this hub reports a NAIVE APR (Tools 3 and 13
   annualise a day's fees by x365) and every settlement tool counts
   fees held outside the position, with no compounding modelled.
   This is the missing half: if the fees are put back into the
   position and themselves start earning, at n reinvestments a year
   for t years the deposit grows by
     final = deposit * (1 + r/n)^(n*t),   r = APR / 100,
   and the effective annual yield (APY) is (1 + r/n)^n - 1 — always
   above the APR when r > 0 and n > 1, rising with n toward the
   continuous limit e^r - 1 and never past it. Against that, the
   no-compounding line deposit * (1 + r*t) is reported too, so the
   compounding gain is a number, not a vibe. The honest catch is
   the assumption doing the work: the APR is held CONSTANT on a
   growing balance, which in a live pool it will not be — volume,
   TVL, your share and (for CLMM) time in range all move, the
   position also carries impermanent loss this model ignores, and
   each reinvestment in reality costs a transaction and re-enters
   at whatever ratio the pool then has. Model only — your APR
   input (e.g. from Tools 3/13), not a live yield, not financial
   advice. */
function feeCompounding(depositStr, aprPctStr, compoundsStr, yearsStr) {
  var required = [depositStr, aprPctStr, compoundsStr, yearsStr];
  for (var i = 0; i < required.length; i++) {
    if (required[i] == null || String(required[i]).trim() === "") return null;
  }
  var dep = Number(depositStr), apr = Number(aprPctStr);
  var n = Number(compoundsStr), yrs = Number(yearsStr);
  if (![dep, apr, n, yrs].every(Number.isFinite)) return null;
  if (dep <= 0 || apr < 0) return null;
  if (!Number.isInteger(n) || n < 1 || n > 36500) return null;
  if (yrs <= 0 || yrs > 100) return null;
  var r = apr / 100;
  var factor = Math.pow(1 + r / n, n * yrs);
  if (!Number.isFinite(factor)) return null;
  var finalValue = dep * factor;
  var simpleFinal = dep * (1 + r * yrs);
  var result = {
    deposit: dep, aprPct: apr, compoundsPerYear: n, years: yrs,
    periods: n * yrs, periodicRatePct: (r / n) * 100,
    apyPct: (Math.pow(1 + r / n, n) - 1) * 100,
    finalValue: finalValue, feesEarned: finalValue - dep,
    simpleFinal: simpleFinal, simpleFees: simpleFinal - dep,
    compoundingGain: finalValue - simpleFinal,
    growthPct: (finalValue / dep - 1) * 100
  };
  /* The factor check above is not enough on its own: the APY
     annualises a full year, so at a horizon under a year a huge APR
     can leave the final value finite while the APY overflows, and a
     huge deposit can overflow the final value (and turn the gain
     into Infinity - Infinity = NaN) behind a perfectly finite
     factor of 2. Every figure the tool reports must be finite, or
     the input is rejected like any other unusable one. */
  var fields = Object.keys(result);
  for (var k = 0; k < fields.length; k++) {
    if (!Number.isFinite(result[fields[k]])) return null;
  }
  return result;
}

/* ---------- 53 · Loss-versus-rebalancing (LVR) round-trip calculator ---------- */
/* Impermanent loss (Tool 2) compares an LP position with holding at the
   END price only, so a price that rises and then falls straight back
   scores exactly zero there — yet the LP did lose money on the trip.
   Arbitrageurs traded against the pool's stale price on BOTH legs and
   kept the difference: that path-dependent cost is loss-versus-
   rebalancing. The benchmark is a portfolio that holds the pool's own
   reserves but rebalances them at the external price; on each leg its
   advantage over the pool is (value of the pre-leg reserves at the new
   price) − (the pool's value at that price), which is Tool 27's own
   holdValueInB − lpValueInB for each leg: up by a multiple m, then
   back by 1/m to exactly the start price. The legs are EVALUATED in
   the algebraically identical closed form below, not as that raw
   difference, because the difference cancels catastrophically at
   tiny excursions: hold and LP values are both position-sized, so
   below roughly a 0.0001% move their difference quantises to whole
   ulps of the position — on a 1e12 pool a 0.000001% excursion read
   exactly 0 through the raw difference, where the true cost over
   10,000 trips is ≈ 0.5 B. The reserves after a full round trip are
   the starting reserves again (k never changed and the price is
   home), so every identical cycle costs exactly the same and the
   total is per-cycle × cycles. Closed forms: the up leg is
   Rb·(√m − 1)² and the down leg that divided by √m, with √m − 1
   formed as (move/100)/(√m + 1) — no near-equal subtraction, and
   not (m − 1), whose inherited rounding is a 1e-8-relative error
   on the step at a 0.000001% excursion.
   Gross of fees — arbitrageurs in a live pool
   pay the swap fee, part of which reaches LPs and offsets some of
   this; the fee tools (3/13) estimate that offset separately. A real
   price path is many unequal steps, not identical round trips, and
   no step here is a trade anyone can place. Educational model only —
   your reserves and excursion inputs, not live pool data, not a live
   quote, not financial advice. */
function lvrRoundTrip(reserveAStr, reserveBStr, movePctStr, cyclesStr) {
  var required = [reserveAStr, reserveBStr, movePctStr, cyclesStr];
  for (var i = 0; i < required.length; i++) {
    if (required[i] == null || String(required[i]).trim() === "") return null;
  }
  var ra = Number(reserveAStr), rb = Number(reserveBStr);
  var move = Number(movePctStr), cycles = Number(cyclesStr);
  if (![ra, rb, move, cycles].every(Number.isFinite)) return null;
  if (ra <= 0 || rb <= 0) return null;
  if (move <= 0 || move > 10000) return null;
  if (!Number.isInteger(cycles) || cycles < 1 || cycles > 10000) return null;
  var m = 1 + move / 100;
  var up = cpReservesAfterMove(ra, rb, m);
  if (up === null) return null;
  var down = cpReservesAfterMove(up.newReserveA, up.newReserveB, 1 / m);
  if (down === null) return null;
  var sqrtM = Math.sqrt(m);
  /* step == √m − 1, formed as (move/100)/(√m + 1): no near-equal
     subtraction, and not (m − 1) either — m's own rounding is a
     1e-8-relative error on the step at a 0.000001% excursion. */
  var step = (move / 100) / (sqrtM + 1);
  var lvrUp = rb * step * step;
  var lvrDown = lvrUp / sqrtM;
  var perCycle = lvrUp + lvrDown;
  var positionValue = ra * up.startPrice + rb;
  var result = {
    reserveA: ra, reserveB: rb, movePct: move, multiplier: m, cycles: cycles,
    startPrice: up.startPrice, topPrice: up.newPrice,
    topReserveA: up.newReserveA, topReserveB: up.newReserveB,
    lvrUpInB: lvrUp, lvrDownInB: lvrDown,
    upLegIlPct: -up.ilPct, downLegIlPct: -down.ilPct,
    perCycleInB: perCycle, perCyclePct: (perCycle / positionValue) * 100,
    totalInB: perCycle * cycles, totalPctOfPosition: (perCycle * cycles / positionValue) * 100,
    positionValueInB: positionValue,
    finalReserveA: down.newReserveA, finalReserveB: down.newReserveB,
    finalValueInB: down.lpValueInB
  };
  var fields = Object.keys(result);
  for (var k = 0; k < fields.length; k++) {
    if (!Number.isFinite(result[fields[k]])) return null;
  }
  if (!(result.lvrUpInB >= 0) || !(result.lvrDownInB >= 0)) return null;
  return result;
}

/* ---------- 54 · Pool seeding / initial-liquidity planner ---------- */
/* Every other tool here assumes a pool that already exists, with
   reserves and a price someone else set. Creating a constant-product
   pool is the one act where the depositor chooses the price — by
   choosing the amounts: the opening spot price is simply reserveB /
   reserveA in the seed, so the two sides are worth exactly the same
   at that price by construction, and there is no separate price
   field to set. The LP tokens minted for the seed are the geometric
   mean sqrt(A * B) of the two amounts — the standard constant-product
   mint — computed here as an exact integer square root of the scaled
   (9 dp) BigInt product and floored at 9 dp, the way on-chain
   programs floor. Tool 18 then redeems a full holding of that supply
   for exactly the seed (asserted in the tests), and later deposits
   follow the seeded ratio through Tool 5. The optional reference
   price is the check that matters: seed at a ratio the rest of the
   market does not trade at and the pool opens mispriced — the gap is
   reported against your reference, and arbitrageurs close gaps like
   it against the seed in the first trades (Tool 16 sizes that trade
   on an existing pool). Program-specific minimum-liquidity locks or
   burns are NOT modelled — a live program may keep a small part of
   the mint unwithdrawable; no number is invented for it. The
   above/below/aligned call against the reference carries the hub's
   usual 1e-12 relative tolerance (tools 44/45): the spot is a float
   quotient, so a mathematically aligned seed like 0.1/0.3 against a
   reference of 3 lands one ulp off — without the tolerance it would
   be reported as mispriced over a ~1e-14% gap.
   Educational model only — your seed amounts, not live pool data,
   not a live quote, not financial advice. */
function isqrtBigInt(n) {
  if (n < 2n) return n;
  var x = 1n << BigInt(Math.ceil(n.toString(2).length / 2));
  var y = (x + n / x) / 2n;
  while (y < x) { x = y; y = (x + n / x) / 2n; }
  return x;
}
function poolSeedPlan(amountAStr, amountBStr, referencePriceStr) {
  if (amountAStr == null || String(amountAStr).trim() === "" ||
      amountBStr == null || String(amountBStr).trim() === "") return null;
  var a = parseScaled(amountAStr), b = parseScaled(amountBStr);
  if (a === null || b === null || a <= 0n || b <= 0n) return null;
  var ref = null;
  if (referencePriceStr != null && String(referencePriceStr).trim() !== "") {
    ref = Number(referencePriceStr);
    if (!Number.isFinite(ref) || ref <= 0) return null;
  }
  var aNum = scaledToNumber(a), bNum = scaledToNumber(b);
  var spot = bNum / aNum;
  var lpScaled = isqrtBigInt(a * b);
  var lpNum = scaledToNumber(lpScaled);
  var result = {
    amountA: aNum, amountB: bNum, spotPrice: spot, k: aNum * bNum,
    lpMinted: formatScaled(lpScaled), lpMintedNum: lpNum,
    totalValueInB: 2 * bNum, perLpA: aNum / lpNum, perLpB: bNum / lpNum,
    referencePrice: ref,
    spotGapPct: ref === null ? null : (spot / ref - 1) * 100,
    refDirection: ref === null ? null : (Math.abs(spot / ref - 1) <= 1e-12 ? "aligned" : (spot < ref ? "below" : "above"))
  };
  var fields = Object.keys(result);
  for (var i = 0; i < fields.length; i++) {
    var v = result[fields[i]];
    if (typeof v === "number" && !Number.isFinite(v)) return null;
  }
  if (!(result.spotPrice > 0) || !(result.lpMintedNum > 0)) return null;
  return result;
}

/* ---------- 55 · CLMM range probability calculator ---------- */
/* Tools 13, 15 and 31 all take a "time in range %" figure the user
   has to invent. This gives that guess a model behind it: IF the
   log price follows a driftless random walk with constant daily
   volatility sigma_d (geometric Brownian motion with zero drift),
   the log price after d days is normal with standard deviation
   sigma = sigma_d * sqrt(d), so the probability the price ENDS the
   period inside [lower, upper] is Phi(zUpper) - Phi(zLower) with
   z = ln(edge / current) / sigma. Phi is the Abramowitz & Stegun
   7.1.26 erf approximation (absolute error <= ~1.5e-7), more than
   precise enough for a planning estimate. The honest edges are the
   point of the tool: ending inside is NOT staying inside — the
   price can leave the range and come back, so the true share of
   time in range is lower than this ending probability whenever the
   path wanders; zero drift and constant volatility are assumptions
   doing real work (a trending or vol-clustering market breaks
   both); and the volatility is the user's own input, not a live
   feed. Zero volatility is the degenerate case: the price never
   moves, so the ending probabilities are 100/0 by construction.
   Educational model only — your price, range and volatility
   inputs, not live pool data, not a live quote, not financial
   advice. */
function erfApprox(x) {
  var sign = x < 0 ? -1 : 1;
  var ax = Math.abs(x);
  var t = 1 / (1 + 0.3275911 * ax);
  var poly = (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t;
  return sign * (1 - poly * Math.exp(-ax * ax));
}
function normalCdf(z) { return 0.5 * (1 + erfApprox(z / Math.SQRT2)); }
function clmmRangeProbability(currentStr, lowerStr, upperStr, dailyVolPctStr, daysStr) {
  var raw = [currentStr, lowerStr, upperStr, dailyVolPctStr, daysStr];
  for (var i = 0; i < raw.length; i++) {
    if (raw[i] == null || String(raw[i]).trim() === "") return null;
  }
  var current = Number(currentStr), lower = Number(lowerStr), upper = Number(upperStr);
  var volPct = Number(dailyVolPctStr), days = Number(daysStr);
  if (![current, lower, upper, volPct, days].every(Number.isFinite)) return null;
  if (current <= 0 || lower <= 0 || upper <= 0 || volPct < 0 || days <= 0) return null;
  if (lower >= upper) return null;
  if (volPct > 10000 || days > 36500) return null;
  var sigma = volPct / 100 * Math.sqrt(days);
  var result = {
    currentPrice: current, lowerPrice: lower, upperPrice: upper,
    dailyVolPct: volPct, days: days, sigma: sigma,
    sigmaBandLower: current * Math.exp(-sigma), sigmaBandUpper: current * Math.exp(sigma)
  };
  if (sigma === 0) {
    result.deterministic = true;
    result.zLower = null; result.zUpper = null;
    result.probInPct = current >= lower && current <= upper ? 100 : 0;
    result.probAbovePct = current > upper ? 100 : 0;
    result.probBelowPct = current < lower ? 100 : 0;
  } else {
    result.deterministic = false;
    result.zUpper = Math.log(upper / current) / sigma;
    result.zLower = Math.log(lower / current) / sigma;
    var cdfU = normalCdf(result.zUpper), cdfL = normalCdf(result.zLower);
    result.probInPct = (cdfU - cdfL) * 100;
    result.probAbovePct = (1 - cdfU) * 100;
    result.probBelowPct = cdfL * 100;
  }
  var fields = Object.keys(result);
  for (var j = 0; j < fields.length; j++) {
    var v = result[fields[j]];
    if (typeof v === "number" && !Number.isFinite(v)) return null;
  }
  return result;
}

/* ---------- 56 · Weighted-pool swap model ---------- */
/* Tool 1's constant product is the 50/50 case of a wider family:
   a weighted pool keeps reserveIn^wIn x reserveOut^wOut constant,
   with weights wIn + wOut = 1. The fee comes off the input first
   (Tool 1's convention), then
     out = reserveOut x (1 - (reserveIn / (reserveIn + netIn))^(wIn/wOut))
   and the spot price carries the weights in it:
     spot = (reserveOut / wOut) / (reserveIn / wIn),
   so an 80/20 pool holding equal reserves prices the input token
   at 4 units of the output token, not 1 — the weight is part of
   the quote, which is the honest surprise of the tool. At 50/50
   the formula reduces to Tool 1's exactly (asserted in tests
   against cpSwap itself). The output is evaluated in the
   cancellation-free form -reserveOut x expm1(-exponent x
   log1p(netIn / reserveIn)) — the same closed form, but a dust
   trade at a 9999 bps fee leaves out at ~1e-9 of the reserve,
   where the direct 1 - pow(...) form loses it to cancellation
   (up to ~7e-6 relative error measured against this form).
   The honest edges: Raydium's own
   constant-product pools are the 50/50 case — weighted pools are
   a generalised AMM design used elsewhere, modelled here so the
   weight's effect is a number rather than a slogan; the maths is
   floating point (no 9 dp BigInt flooring like Tool 1); and a
   trade so large the float result saturates at the whole output
   reserve is rejected, not quoted — the curve approaches the
   reserve asymptotically and never pays it all. Educational
   model only — your reserves, weights and trade inputs, not live
   pool data, not a live quote, not financial advice. */
function weightedSwap(reserveInStr, reserveOutStr, weightInPctStr, amountInStr, feeBps) {
  var raw = [reserveInStr, reserveOutStr, weightInPctStr, amountInStr];
  for (var i = 0; i < raw.length; i++) {
    if (raw[i] == null || String(raw[i]).trim() === "") return null;
  }
  var reserveIn = Number(reserveInStr), reserveOut = Number(reserveOutStr);
  var weightInPct = Number(weightInPctStr), amountIn = Number(amountInStr);
  var fee = Number(feeBps);
  if (![reserveIn, reserveOut, weightInPct, amountIn].every(Number.isFinite)) return null;
  if (reserveIn <= 0 || reserveOut <= 0 || amountIn <= 0) return null;
  if (weightInPct <= 0 || weightInPct >= 100) return null;
  if (!Number.isInteger(fee) || fee < 0 || fee > 9999) return null;
  var wIn = weightInPct / 100, wOut = 1 - wIn;
  var exponent = wIn / wOut;
  var netIn = amountIn * (1 - fee / 10000);
  if (!(netIn > 0)) return null;
  var out = -reserveOut * Math.expm1(-exponent * Math.log1p(netIn / reserveIn));
  if (!(out > 0) || !(out < reserveOut)) return null;
  var spotPrice = (reserveOut / wOut) / (reserveIn / wIn);
  var effectivePrice = out / amountIn;
  var result = {
    reserveIn: reserveIn, reserveOut: reserveOut,
    weightInPct: weightInPct, weightOutPct: 100 - weightInPct,
    exponent: exponent, amountIn: amountIn, feeBps: fee,
    netIn: netIn, out: out,
    spotPrice: spotPrice, effectivePrice: effectivePrice,
    priceImpactPct: (1 - effectivePrice / spotPrice) * 100,
    newReserveIn: reserveIn + netIn, newReserveOut: reserveOut - out
  };
  var fields = Object.keys(result);
  for (var j = 0; j < fields.length; j++) {
    if (!Number.isFinite(result[fields[j]])) return null;
  }
  return result;
}

/* ---------- 63 · Weighted-pool exact-out swap model ---------- */
/* Tool 56 run backwards, for the trade specified by what must come
   out rather than what goes in. The weighted invariant
   Rin^wIn x Rout^wOut = k with the output reserve set to
   Rout - amountOut forces the post-trade input reserve:
     Rin' = Rin x (Rout / (Rout - amountOut))^(wOut/wIn)
   so netIn = Rin' - Rin, grossed back up for the fee exactly the
   way Tool 6 grosses up Tool 1. At 50/50 the exponent is 1 and this
   is Tool 6's constant-product answer (asserted against
   cpSwapExactOut in tests, allowing for its 9dp round-up). Feeding
   the gross input back through Tool 56's weightedSwap returns the
   target (asserted across a sweep). The honest edges mirror Tool
   56's: a target at or above the whole output reserve is rejected,
   not quoted — the curve approaches the reserve asymptotically and
   the cost explodes near it (900 out of 1,000 at an 80% input
   weight needs ~778.2794 net in); the maths is floating point, so
   dust targets carry the float noise floor of the reserve scale;
   and weighted pools are a generalised design used elsewhere —
   Raydium's own constant-product pools are the 50/50 case.
   Educational model only — your reserves, weights and target, not
   live pool data, not a live quote, not financial advice. */
function weightedSwapExactOut(reserveInStr, reserveOutStr, weightInPctStr, amountOutStr, feeBps) {
  var raw = [reserveInStr, reserveOutStr, weightInPctStr, amountOutStr, feeBps];
  for (var i = 0; i < raw.length; i++) {
    if (raw[i] == null || String(raw[i]).trim() === "") return null;
  }
  var reserveIn = Number(reserveInStr), reserveOut = Number(reserveOutStr);
  var weightInPct = Number(weightInPctStr), amountOut = Number(amountOutStr);
  var fee = Number(feeBps);
  if (![reserveIn, reserveOut, weightInPct, amountOut].every(Number.isFinite)) return null;
  if (reserveIn <= 0 || reserveOut <= 0 || amountOut <= 0) return null;
  if (amountOut >= reserveOut) return null;
  if (weightInPct <= 0 || weightInPct >= 100) return null;
  if (!Number.isInteger(fee) || fee < 0 || fee > 9999) return null;
  var wIn = weightInPct / 100, wOut = 1 - wIn;
  var exponent = wOut / wIn;
  var newReserveOut = reserveOut - amountOut;
  /* The log term is ln(reserveOut / newReserveOut), evaluated in
     whichever form keeps it exact at this target's scale. For a
     small target -log1p(-amountOut/reserveOut) is the accurate form
     (Tool 56's); near the ceiling the ratio amountOut/reserveOut
     rounds to a double whose complement 1 - ratio carries that
     rounding amplified by 1/(1 - ratio) — at a 1e-9 remainder
     fraction the net input was off by ~2.6e-5 relative at 50/50 —
     while reserveOut - amountOut is exact there (Sterbenz) and the
     ratio formed from it is large, so its rounding is harmless in
     the log. Branch at half the reserve; both forms agree there. */
  var logRatio = amountOut <= reserveOut / 2
    ? -Math.log1p(-amountOut / reserveOut)
    : Math.log(reserveOut / newReserveOut);
  var netIn = reserveIn * Math.expm1(exponent * logRatio);
  if (!(netIn > 0)) return null;
  var amountIn = netIn / (1 - fee / 10000);
  if (!(amountIn > 0)) return null;
  var spotPrice = (reserveOut / wOut) / (reserveIn / wIn);
  var effectivePrice = amountOut / amountIn;
  var result = {
    reserveIn: reserveIn, reserveOut: reserveOut,
    weightInPct: weightInPct, weightOutPct: 100 - weightInPct,
    exponent: exponent, amountOut: amountOut, feeBps: fee,
    netIn: netIn, amountIn: amountIn,
    spotPrice: spotPrice, effectivePrice: effectivePrice,
    priceImpactPct: (1 - effectivePrice / spotPrice) * 100,
    newReserveIn: reserveIn + netIn, newReserveOut: newReserveOut
  };
  var fields = Object.keys(result);
  for (var j = 0; j < fields.length; j++) {
    if (!Number.isFinite(result[fields[j]])) return null;
  }
  return result;
}

/* ---------- 64 · Weighted-pool price-impact sizer ---------- */
/* Tool 17's question for the weighted pools of Tool 56: how much
   can go in before the trade's own price impact reaches a cap?
   Tool 56 measures impact Tool 1's way — 1 minus the effective
   price (out divided by the GROSS input, fee included) over the
   weighted spot — so with u the fraction of the input reserve
   surviving the trade (u = reserveIn / (reserveIn + netIn)) the
   cap condition 1 - impact = (1 - feeFrac) x u(1 - u^e) /
   (e(1 - u)), with e = wIn/wOut, has no closed form once the
   weight leaves 50%: the left factor g(u) = u(1 - u^e)/(1 - u)
   rises monotonically from 0 to e on (0, 1) (verified numerically
   in tests), so the root is bisected and the trade rebuilt from
   it — netIn = reserveIn(1 - u)/u, grossed back up for the fee,
   out in Tool 56's own cancellation-free expm1 form. At 50/50
   g(u) = u exactly and the answer collapses to Tool 17's closed
   form (asserted against priceImpactSizer in tests to ~1e-15);
   feeding the sized input through Tool 56 returns the cap as the
   impact across a weight/cap/fee sweep (also asserted). The
   honest edges mirror Tool 17's: a cap at or below the fee tier
   admits NO trade at any weight — the fee alone spends the whole
   cap, since even a dust trade's impact is exactly the fee — and
   the weight is inside the price, so the same cap admits very
   different trades at different weights (zero fee, 10% cap,
   balanced 1,000/1,000: at an 80% input weight, spot 4, only
   ~43.5180 goes in but ~156.6649 comes out; at 20%, spot 0.25,
   ~181.5623 goes in for ~40.8515 out). The maths is floating
   point. Educational model only — your reserves, weights and
   cap, not live pool data, not a live quote, not financial
   advice. */
function weightedImpactSizer(reserveInStr, reserveOutStr, weightInPctStr, maxImpactPctStr, feeBps) {
  var raw = [reserveInStr, reserveOutStr, weightInPctStr, maxImpactPctStr, feeBps];
  for (var i = 0; i < raw.length; i++) {
    if (raw[i] == null || String(raw[i]).trim() === "") return null;
  }
  var reserveIn = Number(reserveInStr), reserveOut = Number(reserveOutStr);
  var weightInPct = Number(weightInPctStr), capPct = Number(maxImpactPctStr);
  var fee = Number(feeBps);
  if (![reserveIn, reserveOut, weightInPct, capPct].every(Number.isFinite)) return null;
  if (reserveIn <= 0 || reserveOut <= 0) return null;
  if (weightInPct <= 0 || weightInPct >= 100) return null;
  if (capPct <= 0 || capPct >= 100) return null;
  if (!Number.isInteger(fee) || fee < 0 || fee > 9999) return null;
  var wIn = weightInPct / 100, wOut = 1 - wIn;
  var exponent = wIn / wOut;
  var feeFrac = fee / 10000, pFrac = capPct / 100;
  var spotPrice = (reserveOut / wOut) / (reserveIn / wIn);
  var base = { reserveIn: reserveIn, reserveOut: reserveOut,
    weightInPct: weightInPct, weightOutPct: 100 - weightInPct,
    exponent: exponent, spotPrice: spotPrice,
    maxImpactPct: capPct, feeBps: fee, feeImpactPct: feeFrac * 100 };
  if (pFrac <= feeFrac) {
    return Object.assign(base, { feasible: false, maxAmountIn: 0, netIn: 0, amountOut: 0, actualImpactPct: feeFrac * 100 });
  }
  /* The cap condition in terms of the surviving fraction is
     (1 - feeFrac) x g(u) x s = 1 - pFrac, where s =
     (reserveOut / reserveIn) / spotPrice is exactly 1 / exponent
     in real arithmetic. Use s, not the exponent, in the target:
     spotPrice and exponent are different float roundings of the
     same real ratio (they can differ by ~2 ulps), and at a cap
     within ~1e-9 of the fee floor that ulp gap is ~1e-5 of the
     cap itself — sizing with the exponent would hand back a
     trade whose own reported impact (which divides by
     spotPrice, like Tool 56) misses the cap. */
  var target = (1 - pFrac) / ((1 - feeFrac) * ((reserveOut / reserveIn) / spotPrice));
  function g(u) { return u * (-Math.expm1(exponent * Math.log(u))) / (1 - u); }
  var netIn, out;
  if (target > g(0.5)) {
    /* The root sits in the upper half (a dust-sized trade): there
       u is within ulps of 1, so bisecting u quantises
       delta = 1 - u at ulp(1) ≈ 2.2e-16 and a trade with
       delta ≈ 4e-12 comes back ~4e-5 relative off. Bisect delta
       itself instead — g falls monotonically as delta grows, and
       the log1p/expm1 form stays exact at tiny delta. */
    function gd(d) { return (1 - d) * (-Math.expm1(exponent * Math.log1p(-d))) / d; }
    var dlo = 0, dhi = 0.5;
    for (var dit = 0; dit < 200; dit++) {
      var dmid = (dlo + dhi) / 2;
      if (gd(dmid) > target) dlo = dmid; else dhi = dmid;
    }
    var delta = (dlo + dhi) / 2;
    netIn = reserveIn * delta / (1 - delta);
    out = -reserveOut * Math.expm1(exponent * Math.log1p(-delta));
  } else {
    var lo = 0, hi = 0.5;
    for (var it = 0; it < 200; it++) {
      var mid = (lo + hi) / 2;
      if (g(mid) < target) lo = mid; else hi = mid;
    }
    var u = (lo + hi) / 2;
    netIn = reserveIn * (1 - u) / u;
    out = -reserveOut * Math.expm1(exponent * Math.log(u));
  }
  var grossIn = netIn / (1 - feeFrac);
  if (!(grossIn > 0) || !(out > 0) || !(out < reserveOut)) return null;
  var effectivePrice = out / grossIn;
  var result = Object.assign(base, {
    feasible: true,
    maxAmountIn: grossIn, netIn: netIn, amountOut: out,
    effectivePrice: effectivePrice,
    actualImpactPct: (1 - effectivePrice / spotPrice) * 100,
    postTradeSpotPrice: ((reserveOut - out) / wOut) / ((reserveIn + netIn) / wIn)
  });
  var fields = Object.keys(result);
  for (var j = 0; j < fields.length; j++) {
    var v = result[fields[j]];
    if (typeof v === "number" && !Number.isFinite(v)) return null;
  }
  return result;
}

/* ---------- 57 · CLMM range-order (limit-order) planner ---------- */
/* A single-sided CLMM position placed entirely outside the current
   price is a limit order in LP clothing: a position in a range above
   the current price holds only token A (Tool 9's below case), and as
   the price rises through the range the position converts into token
   B; a range below the current price mirrors it (only B, converting
   into A as the price falls through). Given the amount to sell, the
   range sets the liquidity exactly the way Tool 9's edges do:
     sell A: L = amount / (1/sqrt(lower) - 1/sqrt(upper)),
             full fill pays L * (sqrt(upper) - sqrt(lower)) of B
     sell B: L = amount / (sqrt(upper) - sqrt(lower)),
             full fill pays L * (1/sqrt(lower) - 1/sqrt(upper)) of A
   The average execution price of a full fill is sqrt(lower x upper)
   — the geometric mean of the range, in B per A either way — and a
   partial fill to a check price inside the range averages
   sqrt(edge x check) on the same identity (asserted in tests). The
   holdings at the check price are Tool 9's own clmmPositionAtPrice
   at this L (asserted verbatim), so sold = deposit - what the
   position still holds of the sold token. The honest edges: the
   range must sit entirely on the far side of the current price —
   a range straddling it starts two-sided, which is an LP position,
   not an order, and is rejected; nothing fills unless the price
   actually crosses, and a real crossing pays fees TO the position
   while it is in range (not modelled — they would add to the
   received side, they do not change the conversion price); tick
   spacing snapping is not modelled; and withdrawing mid-range
   leaves a two-token mix, not a clean partial fill at one price.
   Educational model only — your amounts, prices and range, not live
   pool data, not a live quote, not financial advice. */
function clmmRangeOrder(sideStr, amountStr, currentStr, lowerStr, upperStr, checkStr) {
  var raw = [amountStr, currentStr, lowerStr, upperStr, checkStr];
  for (var i = 0; i < raw.length; i++) {
    if (raw[i] == null || String(raw[i]).trim() === "") return null;
  }
  var side = String(sideStr == null ? "" : sideStr).trim().toLowerCase();
  if (side !== "a" && side !== "b") return null;
  var amount = Number(amountStr), current = Number(currentStr);
  var lower = Number(lowerStr), upper = Number(upperStr), check = Number(checkStr);
  if (![amount, current, lower, upper, check].every(Number.isFinite)) return null;
  if (amount <= 0 || current <= 0 || lower <= 0 || upper <= 0 || check <= 0) return null;
  if (lower >= upper) return null;
  var sa = Math.sqrt(lower), sb = Math.sqrt(upper);
  var liquidity, fullOut;
  if (side === "a") {
    if (lower < current) return null;
    liquidity = amount / (1 / sa - 1 / sb);
    fullOut = liquidity * (sb - sa);
  } else {
    if (upper > current) return null;
    liquidity = amount / (sb - sa);
    fullOut = liquidity * (1 / sa - 1 / sb);
  }
  if (!(liquidity > 0) || !(fullOut > 0)) return null;
  var pos = clmmPositionAtPrice(String(liquidity), lowerStr, upperStr, checkStr);
  if (pos === null) return null;
  var sold, received, remaining;
  if (side === "a") { remaining = pos.amountA; received = pos.amountB; }
  else { remaining = pos.amountB; received = pos.amountA; }
  sold = amount - remaining;
  if (sold < 0 && sold > -1e-9 * amount) sold = 0;
  if (!(sold >= 0)) return null;
  var avgPriceFull = side === "a" ? fullOut / amount : amount / fullOut;
  var avgPriceAtCheck = null;
  if (sold > 0 && received > 0) avgPriceAtCheck = side === "a" ? received / sold : sold / received;
  var status;
  if (side === "a") status = check <= lower ? "not-started" : (check >= upper ? "filled" : "partial");
  else status = check >= upper ? "not-started" : (check <= lower ? "filled" : "partial");
  var result = {
    side: side, amount: amount, currentPrice: current,
    lowerPrice: lower, upperPrice: upper, checkPrice: check,
    liquidity: liquidity, fullOut: fullOut, avgPriceFull: avgPriceFull,
    remaining: remaining, sold: sold, received: received,
    executedPct: sold / amount * 100, avgPriceAtCheck: avgPriceAtCheck,
    status: status
  };
  var fields = Object.keys(result);
  for (var j = 0; j < fields.length; j++) {
    var v = result[fields[j]];
    if (typeof v === "number" && !Number.isFinite(v)) return null;
  }
  return result;
}

/* ---------- 58 · Stableswap swap model ---------- */
/* Tools 1 and 56 keep a product (or weighted product) of the reserves
   constant; a stableswap pool for pegged pairs blends the sum and the
   product instead. Its invariant D is defined implicitly by
     Ann * (x + y) + D = Ann * D + D^3 / (4 * x * y),   Ann = 2 * amp,
   solved here by Newton iteration (the standard getD / getY pair).
   A balanced pool has D = x + y at any amplification, and the trade
   is solved so the post-trade reserves satisfy the same D — the
   tests re-check the invariant equation itself on both sides of
   every vector, not just this solver's say-so. The amplification
   amp interpolates the two curves: high amp hugs the sum (trades
   near 1:1 while the pool is balanced), low amp leans toward tool
   1's product curve. The marginal spot price follows from
   differentiating the invariant with D held constant:
     spot = (K / (x^2 * y) + Ann) / (Ann + K / (x * y^2)),
     K = D^3 / 4
   (verified against a numeric derivative in prototyping). The fee
   comes off the input first, exactly as in tool 1. Honest edges:
   near-1:1 pricing is the model working as designed ONLY while both
   tokens really are worth the same — if one side depegs, the curve
   keeps offering close to par for a token the market prices lower,
   which is precisely how stable pools get drained of the good side;
   amp is a parameter of the pool's design, not a dial a trader
   sets; the maths is floating point (Newton solves, no BigInt
   flooring); and a trade so large the float output saturates at
   the whole output reserve is rejected, not quoted — the curve
   only approaches the reserve asymptotically. Educational model
   only — your reserves, amplification and trade, not live pool
   data, not a live quote, not financial advice. */
function stableInvariantD(reserveA, reserveB, amp) {
  var S = reserveA + reserveB;
  if (!(S > 0)) return null;
  var Ann = 2 * amp;
  var D = S, prev = 0;
  /* Convergence is judged RELATIVE to D, with no absolute floor: an
     absolute epsilon (say 1e-12) dwarfs D itself in a dust-scale pool
     and stops Newton early, leaving the output — a small difference of
     two near-equal reserves — up to ~1e-4 relative off. The step
     threshold |D| * 1e-14 is ~45 ulps, so genuine ulp-level oscillation
     still terminates the loop. */
  for (var i = 0; i < 255; i++) {
    var Dp = D * D / (reserveA * 2);
    Dp = Dp * D / (reserveB * 2);
    prev = D;
    D = (Ann * S + Dp * 2) * D / ((Ann - 1) * D + 3 * Dp);
    if (Math.abs(D - prev) <= Math.abs(D) * 1e-14) break;
  }
  return D;
}
function stableSolveY(reserveInNew, reserveOutOld, amp, D) {
  var Ann = 2 * amp;
  var c = D * D / (reserveInNew * 2);
  c = c * D / (Ann * 2);
  var b = reserveInNew + D / Ann;
  var y = D, prev = 0;
  for (var i = 0; i < 255; i++) {
    prev = y;
    y = (y * y + c) / (2 * y + b - D);
    if (Math.abs(y - prev) <= Math.abs(y) * 1e-14) break;
  }
  return y;
}
function stableSwap(reserveInStr, reserveOutStr, ampStr, amountInStr, feeBps) {
  var raw = [reserveInStr, reserveOutStr, ampStr, amountInStr];
  for (var i = 0; i < raw.length; i++) {
    if (raw[i] == null || String(raw[i]).trim() === "") return null;
  }
  var reserveIn = Number(reserveInStr), reserveOut = Number(reserveOutStr);
  var amp = Number(ampStr), amountIn = Number(amountInStr);
  var fee = Number(feeBps);
  if (![reserveIn, reserveOut, amp, amountIn].every(Number.isFinite)) return null;
  if (reserveIn <= 0 || reserveOut <= 0 || amp <= 0 || amountIn <= 0) return null;
  if (!Number.isInteger(fee) || fee < 0 || fee > 9999) return null;
  var D = stableInvariantD(reserveIn, reserveOut, amp);
  if (D === null || !(D > 0)) return null;
  var netIn = amountIn * (1 - fee / 10000);
  if (!(netIn > 0)) return null;
  var newReserveOut = stableSolveY(reserveIn + netIn, reserveOut, amp, D);
  var out = reserveOut - newReserveOut;
  if (!(out > 0) || !(out < reserveOut)) return null;
  var Ann = 2 * amp, K = Math.pow(D, 3) / 4;
  var spotPrice = (K / (reserveIn * reserveIn * reserveOut) + Ann) /
    (Ann + K / (reserveIn * reserveOut * reserveOut));
  var effectivePrice = out / amountIn;
  var result = {
    reserveIn: reserveIn, reserveOut: reserveOut, amp: amp,
    amountIn: amountIn, feeBps: fee, netIn: netIn, out: out,
    invariantD: D, spotPrice: spotPrice, effectivePrice: effectivePrice,
    priceImpactPct: (1 - effectivePrice / spotPrice) * 100,
    newReserveIn: reserveIn + netIn, newReserveOut: newReserveOut
  };
  var fields = Object.keys(result);
  for (var j = 0; j < fields.length; j++) {
    if (!Number.isFinite(result[fields[j]])) return null;
  }
  return result;
}

/* ---------- 59 · Stableswap exact-out swap model ---------- */
/* Tool 58 run backwards, for the trade specified by what must come
   OUT — a payment, a debt, a target holding — rather than by what
   goes in. The output side is set first (newReserveOut = reserveOut
   − amountOut) and the same Newton pair from tool 58 is solved with
   the reserves' roles swapped: stableSolveY finds the input reserve
   that satisfies the same invariant D at that output reserve. The
   fee is then grossed back UP — amountIn = netIn / (1 − fee) — the
   mirror of tool 58 taking it off the input first, so feeding this
   tool's amountIn into tool 58 returns the target output (asserted
   in tests at a sweep of pools, amplifications and fee tiers).
   Honest edges: a target at or above the whole output reserve is
   rejected, not priced — the curve only approaches the reserve
   asymptotically, and targets close to it cost explosively more
   than spot suggests (999 out of a balanced 1,000/1,000 pool at
   A = 100 needs ≈3,309 in, not ≈999); the required input is a
   difference of two near-equal reserves, so for dust targets its
   last digits carry the float noise floor of the reserve scale
   itself (~1 ulp of the reserves, the same floor tool 58's dust
   pins document); and all of tool 58's labels apply unchanged —
   near-par pricing assumes the peg holds, and on a depeg this
   tool prices the cost of draining the good side just as calmly.
   Educational model only — your reserves, amplification and
   target, not live pool data, not a live quote, not financial
   advice. */
function stableSwapExactOut(reserveInStr, reserveOutStr, ampStr, amountOutStr, feeBps) {
  var raw = [reserveInStr, reserveOutStr, ampStr, amountOutStr];
  for (var i = 0; i < raw.length; i++) {
    if (raw[i] == null || String(raw[i]).trim() === "") return null;
  }
  var reserveIn = Number(reserveInStr), reserveOut = Number(reserveOutStr);
  var amp = Number(ampStr), amountOut = Number(amountOutStr);
  var fee = Number(feeBps);
  if (![reserveIn, reserveOut, amp, amountOut].every(Number.isFinite)) return null;
  if (reserveIn <= 0 || reserveOut <= 0 || amp <= 0 || amountOut <= 0) return null;
  if (!Number.isInteger(fee) || fee < 0 || fee > 9999) return null;
  if (amountOut >= reserveOut) return null;
  var D = stableInvariantD(reserveIn, reserveOut, amp);
  if (D === null || !(D > 0)) return null;
  var newReserveOut = reserveOut - amountOut;
  var newReserveIn = stableSolveY(newReserveOut, reserveIn, amp, D);
  var netIn = newReserveIn - reserveIn;
  if (!(netIn > 0)) return null;
  var amountIn = netIn / (1 - fee / 10000);
  if (!(amountIn > 0)) return null;
  var Ann = 2 * amp, K = Math.pow(D, 3) / 4;
  var spotPrice = (K / (reserveIn * reserveIn * reserveOut) + Ann) /
    (Ann + K / (reserveIn * reserveOut * reserveOut));
  var effectivePrice = amountOut / amountIn;
  var result = {
    reserveIn: reserveIn, reserveOut: reserveOut, amp: amp,
    amountOut: amountOut, feeBps: fee, netIn: netIn, amountIn: amountIn,
    invariantD: D, spotPrice: spotPrice, effectivePrice: effectivePrice,
    priceImpactPct: (1 - effectivePrice / spotPrice) * 100,
    newReserveIn: newReserveIn, newReserveOut: newReserveOut
  };
  var fields = Object.keys(result);
  for (var j = 0; j < fields.length; j++) {
    if (!Number.isFinite(result[fields[j]])) return null;
  }
  return result;
}

/* ---------- 60 · Weighted-pool impermanent-loss calculator ---------- */
/* Tool 2's question for the weighted pools of tool 56: tool 2 is the
   50/50 case, but a weighted pool holds a fixed VALUE fraction w in
   token A and (1 - w) in token B, and rebalancing along the weighted
   invariant keeps those fractions as the price moves. So when token
   A's price (in B) moves by a multiple r,
     lpFactor   = r^w            (the position's value, per unit in)
     holdFactor = w * r + (1 - w) (holding the starting mix, per unit)
     IL         = lpFactor / holdFactor - 1,
   which at w = 0.5 is tool 2's 2 * sqrt(r) / (1 + r) - 1 exactly
   (asserted in tests against impermanentLoss itself, values and the
   tool 4 fee hurdle alike). The closed form was also verified in
   prototyping against the weighted invariant solved numerically:
   an 800/200 pool at w = 0.8 rebalanced to spot prices 0.25..9 lands
   on r^0.8 to ~1e-15. The honest shape: the loss is NOT symmetric
   in the weight — at a 2x move an 80% weight on the token that rose
   loses ~3.27% while a 20% weight loses ~4.28%, and the two swap
   exactly when the move reverses (w with 1/r equals 1 - w with r,
   asserted in tests), because the heavier side tracks holding that
   token more closely. Weighting toward a token is a bet on it, not
   a shield: a 10% weight still loses ~11.64% at a 4x move. No fees
   are included — feesNeeded is exactly the fee total, in the
   deposit's terms, that would close the gap. Weighted pools are a
   generalised design used elsewhere (tool 56's label applies);
   Raydium's own constant-product pools are the 50/50 case tool 2
   already covers. Educational model only — your weight, price move
   and deposit inputs, not live pool data, not a live quote, not
   financial advice. */
function weightedImpermanentLoss(weightAPctStr, priceRatioStr, depositStr) {
  var raw = [weightAPctStr, priceRatioStr];
  for (var i = 0; i < raw.length; i++) {
    if (raw[i] == null || String(raw[i]).trim() === "") return null;
  }
  var weightAPct = Number(weightAPctStr), r = Number(priceRatioStr);
  if (![weightAPct, r].every(Number.isFinite)) return null;
  if (weightAPct <= 0 || weightAPct >= 100 || r <= 0) return null;
  var w = weightAPct / 100;
  var lpFactor = Math.pow(r, w);
  var holdFactor = w * r + (1 - w);
  if (!(lpFactor > 0) || !(holdFactor > 0)) return null;
  var result = {
    weightAPct: weightAPct, weightBPct: 100 - weightAPct,
    priceRatio: r, lpFactor: lpFactor, holdFactor: holdFactor,
    lpVsHold: lpFactor / holdFactor,
    ilPct: (lpFactor / holdFactor - 1) * 100
  };
  if (depositStr != null && String(depositStr).trim() !== "") {
    var dep = Number(depositStr);
    if (!Number.isFinite(dep) || dep < 0) return null;
    result.deposit = dep;
    result.holdValue = dep * holdFactor;
    result.lpValue = dep * lpFactor;
    result.feesNeeded = result.holdValue - result.lpValue;
    result.feesNeededPctOfDeposit = dep > 0 ? result.feesNeeded / dep * 100 : 0;
  }
  var fields = Object.keys(result);
  for (var j = 0; j < fields.length; j++) {
    if (!Number.isFinite(result[fields[j]])) return null;
  }
  return result;
}

/* ---------- 61 · Stableswap depeg-loss calculator ---------- */
/* Tools 58 and 59 keep warning that on a depeg the stableswap curve
   keeps offering close to par and the good side drains first; this
   tool prices that warning. Token B's external price is given in
   token A (1 while the peg holds). Arbitrage trades against the
   pool until the pool's own marginal price of B — the tool 58 spot
   formula with B as the input side — equals that external price,
   with the invariant D held constant (no fees: live arbitrage pays
   the swap fee, which slows the drain slightly and sends part of
   it to LPs, so the gross figure here is the honest upper shape).
   The rebalanced reserves are found by geometric bisection on
   reserve A: the other reserve comes from tool 58's own
   stableSolveY at the same D, and the spot is strictly increasing
   in reserve A along the curve. The loss is then plain accounting
   at the external price: LP value (A + price × B after) against
   holding the starting reserves (A + price × B before). Verified
   in prototyping BEFORE the tests were written, and asserted in
   tests: the rebalanced reserves satisfy the invariant equation
   itself, and selling the accumulated B through tool 58 returns
   exactly the A drained. The honest shape is the amplification:
   at a 0.90 depeg of a balanced 1,000/1,000 pool the loss grows
   with A — ≈0.28% at A = 1, ≈3.38% at A = 100, ≈4.95% at
   A = 5,000 — because a higher A defends par longer, and in the
   limit the pool simply swaps its whole A side for B at par and
   loses the full depeg on it. A price above the pool's starting
   spot runs the drain the other way (B is then the expensive side
   and A accumulates). A price the bisection cannot bracket on the
   curve is rejected, not extrapolated. Educational model only —
   your reserves, amplification and depeg price, not live pool
   data, not a live quote, not financial advice. */
function stableSpotBInA(reserveA, reserveB, amp, D) {
  var Ann = 2 * amp, K = Math.pow(D, 3) / 4;
  return (K / (reserveB * reserveB * reserveA) + Ann) /
    (Ann + K / (reserveB * reserveA * reserveA));
}
function stableDepegLoss(reserveAStr, reserveBStr, ampStr, priceBStr) {
  var raw = [reserveAStr, reserveBStr, ampStr, priceBStr];
  for (var i = 0; i < raw.length; i++) {
    if (raw[i] == null || String(raw[i]).trim() === "") return null;
  }
  var reserveA = Number(reserveAStr), reserveB = Number(reserveBStr);
  var amp = Number(ampStr), priceB = Number(priceBStr);
  if (![reserveA, reserveB, amp, priceB].every(Number.isFinite)) return null;
  if (reserveA <= 0 || reserveB <= 0 || amp <= 0 || priceB <= 0) return null;
  var D = stableInvariantD(reserveA, reserveB, amp);
  if (D === null || !(D > 0)) return null;
  var startSpotB = stableSpotBInA(reserveA, reserveB, amp, D);
  if (!Number.isFinite(startSpotB) || !(startSpotB > 0)) return null;
  function at(x) {
    var y = stableSolveY(x, reserveB, amp, D);
    if (!(y > 0) || !Number.isFinite(y)) return null;
    var s = stableSpotBInA(x, y, amp, D);
    if (!Number.isFinite(s) || !(s > 0)) return null;
    return { x: x, y: y, spot: s };
  }
  var end = null;
  if (priceB === startSpotB) {
    end = { x: reserveA, y: reserveB, spot: startSpotB };
  } else {
    var lo = null, hi = null, k;
    if (priceB < startSpotB) {
      hi = { x: reserveA, y: reserveB, spot: startSpotB };
      var xd = reserveA;
      for (k = 0; k < 200 && lo === null; k++) {
        xd /= 1.5;
        var ad = at(xd);
        if (ad !== null && ad.spot <= priceB) lo = ad;
      }
    } else {
      lo = { x: reserveA, y: reserveB, spot: startSpotB };
      var xu = reserveA;
      for (k = 0; k < 200 && hi === null; k++) {
        xu *= 1.5;
        var au = at(xu);
        if (au !== null && au.spot >= priceB) hi = au;
      }
    }
    if (lo === null || hi === null) return null;
    for (var b = 0; b < 200; b++) {
      var mid = at(Math.sqrt(lo.x * hi.x));
      if (mid === null) return null;
      if (mid.spot < priceB) lo = mid; else hi = mid;
      if (hi.x / lo.x - 1 < 1e-12) break;
    }
    end = at(Math.sqrt(lo.x * hi.x));
    if (end === null) return null;
  }
  var holdValueA = reserveA + priceB * reserveB;
  var lpValueA = end.x + priceB * end.y;
  var result = {
    reserveA: reserveA, reserveB: reserveB, amp: amp, priceB: priceB,
    invariantD: D, startSpotB: startSpotB, endSpotB: end.spot,
    newReserveA: end.x, newReserveB: end.y,
    aChange: end.x - reserveA, bChange: end.y - reserveB,
    holdValueA: holdValueA, lpValueA: lpValueA,
    lossA: lpValueA - holdValueA,
    lossPct: (lpValueA / holdValueA - 1) * 100
  };
  var fields = Object.keys(result);
  for (var j = 0; j < fields.length; j++) {
    if (!Number.isFinite(result[fields[j]])) return null;
  }
  return result;
}

/* ---------- 62 · Weighted-pool arbitrage model ---------- */
/* Tool 16's question for the weighted pools of Tool 56: if a
   weighted pool's spot price — spot = (reserveB / wB) /
   (reserveA / wA), the weights inside the quote — differs from a
   price elsewhere, a trade that moves the pool's spot exactly to
   that external price Pe is the textbook arbitrage, and making
   it is what pulls the pool back into line. The reserves at Pe
   are forced by the weighted invariant reserveA^wA x
   reserveB^wB = k together with the spot condition
   reserveB' = Pe x (wB / wA) x reserveA':
     reserveA' = k / (Pe x wB / wA)^wB,  reserveB' = Pe x (wB/wA) x reserveA'
   Pe above spot: A is cheap in the pool — pay B in (net
   reserveB' - reserveB), take A out (reserveA - reserveA').
   Pe below spot: the mirror. The fee comes off the input before
   it reaches the pool (Tool 56's convention), so the gross input
   is net / (1 - fee) and the modelled profit, valued in B at the
   external price, is outValueInB - grossInValueInB. At a 50%
   weight every figure reduces to Tool 16's exactly (asserted in
   tests), and swapping the modelled gross input through Tool 56
   itself returns the modelled output and lands the pool's spot
   on Pe (also asserted). A gap smaller than the fee honestly
   comes out unprofitable at the price-aligning size. The honest
   edges: the weights move the starting spot itself — an 80/20
   pool holding 800/200 spots at exactly 1, not at the naive
   reserve ratio 0.25 — so judging the gap off raw reserves
   misprices the trade; weighted pools are a generalised design
   used elsewhere, modelled for comparison (Raydium's own
   constant-product pools are the 50/50 case); the maths is
   floating point; and the external price is YOUR input, not a
   live feed — this sizes a textbook trade against a price you
   supply, it does not find one. Model only — no routing, no
   other venues' depth or fees, no transaction costs, not
   financial advice. */
function weightedArbitrage(reserveAStr, reserveBStr, weightAPctStr, externalPriceStr, feeBps) {
  var raw = [reserveAStr, reserveBStr, weightAPctStr, externalPriceStr, feeBps];
  for (var i = 0; i < raw.length; i++) {
    if (raw[i] == null || String(raw[i]).trim() === "") return null;
  }
  var reserveA = Number(reserveAStr), reserveB = Number(reserveBStr);
  var weightAPct = Number(weightAPctStr), pe = Number(externalPriceStr);
  var fee = Number(feeBps);
  if (![reserveA, reserveB, weightAPct, pe, fee].every(Number.isFinite)) return null;
  if (reserveA <= 0 || reserveB <= 0 || pe <= 0) return null;
  if (weightAPct <= 0 || weightAPct >= 100) return null;
  if (!Number.isInteger(fee) || fee < 0 || fee > 9999) return null;
  var wA = weightAPct / 100, wB = 1 - wA;
  var spot = (reserveB / wB) / (reserveA / wA);
  var k = Math.pow(reserveA, wA) * Math.pow(reserveB, wB);
  var c = pe * (wB / wA);
  var targetA = k / Math.pow(c, wB);
  var targetB = c * targetA;
  if (!(targetA > 0) || !(targetB > 0)) return null;
  var base = { reserveA: reserveA, reserveB: reserveB,
    weightAPct: weightAPct, weightBPct: 100 - weightAPct,
    spotPrice: spot, externalPrice: pe,
    priceGapPct: (pe / spot - 1) * 100, feeBps: fee,
    postTradeSpot: pe, targetReserveA: targetA, targetReserveB: targetB };
  var result;
  if (Math.abs(pe - spot) / spot < 1e-12) {
    result = Object.assign(base, { direction: "none", inToken: null, netIn: 0, grossIn: 0, amountOut: 0, outToken: null, profitInB: 0 });
  } else if (pe > spot) {
    var netInB = targetB - reserveB, outA = reserveA - targetA;
    if (!(netInB > 0) || !(outA > 0)) return null;
    var grossInB = netInB / (1 - fee / 10000);
    result = Object.assign(base, { direction: "buy-a", inToken: "B", netIn: netInB, grossIn: grossInB, amountOut: outA, outToken: "A", profitInB: outA * pe - grossInB });
  } else {
    var netInA = targetA - reserveA, outB = reserveB - targetB;
    if (!(netInA > 0) || !(outB > 0)) return null;
    var grossInA = netInA / (1 - fee / 10000);
    result = Object.assign(base, { direction: "sell-a", inToken: "A", netIn: netInA, grossIn: grossInA, amountOut: outB, outToken: "B", profitInB: outB - grossInA * pe });
  }
  var fields = Object.keys(result);
  for (var j = 0; j < fields.length; j++) {
    var v = result[fields[j]];
    if (typeof v === "number" && !Number.isFinite(v)) return null;
  }
  return result;
}

function stableSpotAInB(reserveA, reserveB, amp, D) {
  var Ann = 2 * amp, K = Math.pow(D, 3) / 4;
  return (K / (reserveA * reserveA * reserveB) + Ann) /
    (Ann + K / (reserveA * reserveB * reserveB));
}

/* ---------- 65 · Stableswap arbitrage model ---------- */
/* Tool 16's question for the stableswap pools of Tool 58: if the
   pool's own spot price of A (in B, Tool 58's spot formula with A
   as the input side) differs from a price elsewhere, the trade
   that moves the pool's spot exactly to that external price Pe is
   the textbook arbitrage. There is no closed form — the target
   reserves lie on the stableswap invariant at spot Pe, and the
   spot falls strictly as reserve A grows along the curve, so the
   target is bisected geometrically on reserve A exactly the way
   Tool 61 bisects its depeg endpoint, the other reserve coming
   from Tool 58's own stableSolveY at the same invariant D. The
   fee comes off the input before it reaches the pool (Tool 58's
   convention), so the gross input is net / (1 - fee) and the
   modelled profit, valued in B at the external price, is
   outValueInB - grossInValueInB. Feeding the gross input through
   Tool 58 returns the modelled output and lands the pool's spot
   on Pe (asserted in tests, both directions, with and without a
   fee). The honest shape is the amplification: because the curve
   defends par, even a 1% gap on a balanced 1,000/1,000 pool at
   A = 100 takes a trade of ~375 B — over a third of the reserve —
   to close, and at Pe = 1.1 the aligning input grows with A
   (~97.17 B at A = 1, ~795.83 at A = 100, ~971.44 at A = 5,000).
   A gap smaller than the fee honestly comes out unprofitable at
   the aligning size (a 0.1% gap at a 25 bps tier: ~-0.1007 B).
   With zero fee the endpoint is Tool 61's depeg endpoint at the
   reciprocal price and the profit is exactly that tool's LP loss
   with the sign flipped (asserted). A price the bisection cannot
   bracket on the curve is rejected, not extrapolated.
   Educational model only — your reserves, amplification and
   external price, not live pool data, not a found opportunity,
   not financial advice. */
function stableArbitrage(reserveAStr, reserveBStr, ampStr, externalPriceStr, feeBps) {
  var raw = [reserveAStr, reserveBStr, ampStr, externalPriceStr, feeBps];
  for (var i = 0; i < raw.length; i++) {
    if (raw[i] == null || String(raw[i]).trim() === "") return null;
  }
  var reserveA = Number(reserveAStr), reserveB = Number(reserveBStr);
  var amp = Number(ampStr), pe = Number(externalPriceStr);
  var fee = Number(feeBps);
  if (![reserveA, reserveB, amp, pe].every(Number.isFinite)) return null;
  if (reserveA <= 0 || reserveB <= 0 || amp <= 0 || pe <= 0) return null;
  if (!Number.isInteger(fee) || fee < 0 || fee > 9999) return null;
  var D = stableInvariantD(reserveA, reserveB, amp);
  if (D === null || !(D > 0)) return null;
  var startSpot = stableSpotAInB(reserveA, reserveB, amp, D);
  if (!Number.isFinite(startSpot) || !(startSpot > 0)) return null;
  var base = { reserveA: reserveA, reserveB: reserveB, amp: amp,
    spotPrice: startSpot, externalPrice: pe,
    priceGapPct: (pe / startSpot - 1) * 100, feeBps: fee,
    invariantD: D, targetReserveA: reserveA, targetReserveB: reserveB };
  if (Math.abs(pe - startSpot) / startSpot < 1e-12) {
    return Object.assign(base, { direction: "none", inToken: null, netIn: 0, grossIn: 0, amountOut: 0, outToken: null, profitInB: 0, postTradeSpot: startSpot });
  }
  function at(x) {
    var y = stableSolveY(x, reserveB, amp, D);
    if (!(y > 0) || !Number.isFinite(y)) return null;
    var s = stableSpotAInB(x, y, amp, D);
    if (!Number.isFinite(s) || !(s > 0)) return null;
    return { x: x, y: y, spot: s };
  }
  var lo = null, hi = null, k;
  if (pe > startSpot) {
    hi = { x: reserveA, y: reserveB, spot: startSpot };
    var xd = reserveA;
    for (k = 0; k < 200 && lo === null; k++) {
      xd /= 1.5;
      var ad = at(xd);
      if (ad !== null && ad.spot >= pe) lo = ad;
    }
  } else {
    lo = { x: reserveA, y: reserveB, spot: startSpot };
    var xu = reserveA;
    for (k = 0; k < 200 && hi === null; k++) {
      xu *= 1.5;
      var au = at(xu);
      if (au !== null && au.spot <= pe) hi = au;
    }
  }
  if (lo === null || hi === null) return null;
  for (var b = 0; b < 200; b++) {
    var mid = at(Math.sqrt(lo.x * hi.x));
    if (mid === null) return null;
    if (mid.spot < pe) hi = mid; else lo = mid;
    if (hi.x / lo.x - 1 < 1e-12) break;
  }
  var end = at(Math.sqrt(lo.x * hi.x));
  if (end === null) return null;
  var result;
  if (pe > startSpot) {
    var netInB = end.y - reserveB, outA = reserveA - end.x;
    if (!(netInB > 0) || !(outA > 0)) return null;
    var grossInB = netInB / (1 - fee / 10000);
    result = Object.assign(base, { direction: "buy-a", inToken: "B", netIn: netInB, grossIn: grossInB, amountOut: outA, outToken: "A", profitInB: outA * pe - grossInB, targetReserveA: end.x, targetReserveB: end.y, postTradeSpot: end.spot });
  } else {
    var netInA = end.x - reserveA, outB = reserveB - end.y;
    if (!(netInA > 0) || !(outB > 0)) return null;
    var grossInA = netInA / (1 - fee / 10000);
    result = Object.assign(base, { direction: "sell-a", inToken: "A", netIn: netInA, grossIn: grossInA, amountOut: outB, outToken: "B", profitInB: outB - grossInA * pe, targetReserveA: end.x, targetReserveB: end.y, postTradeSpot: end.spot });
  }
  var fields = Object.keys(result);
  for (var j = 0; j < fields.length; j++) {
    var v = result[fields[j]];
    if (typeof v === "number" && !Number.isFinite(v)) return null;
  }
  return result;
}

/* ---------- 66 · Stableswap price-impact sizer ---------- */
/* Tool 17's question for the stableswap pools of Tool 58: how
   much can go in before the trade's own price impact — Tool 58's
   measure, 1 minus the effective price (out divided by the GROSS
   input, fee included) over the pool's spot — reaches a cap? The
   stableswap curve has no closed-form inverse for that condition,
   so the cap is bisected geometrically on the input amount with
   every candidate priced by Tool 58's own stableSwap, which
   means the sized trade can never drift from the swap model it
   sizes for (asserted in tests across an amplification / cap /
   fee sweep: the sized input fed through Tool 58 lands on the cap
   to ~1e-13). The honest shape is how much MORE a stable curve
   admits than a product curve at the same cap, because it defends
   par: on balanced 1,000/1,000 reserves at a 1% cap and a 25 bps
   tier, A = 100 admits ≈546.3266 in where Tool 17's constant
   product admits ≈7.5947; at a 10% cap A = 1 admits ≈214.9800
   (Tool 17: ≈108.6048), A = 100 ≈1,063.7013 and A = 5,000
   ≈1,110.1387 — and that last trade pays out ≈999.1248 of the
   1,000 output reserve, leaving the pool's own spot at ≈0.0084
   against a start of exactly 1. That is the warning inside the
   tool: impact is an average-price measure, not a solvency one —
   on a high-amplification curve a trade can read 10% impact
   while draining 99.9% of one side, because the average is taken
   over a fill that hugged par until the reserve was nearly gone.
   The fee floor mirrors Tools 17/64: a cap at or below the fee
   tier admits NO trade, because even a dust trade's impact is
   exactly the fee. A cap within a hair of the fee sizes a dust
   trade at Tool 58's float noise floor (its output there is a
   difference of near-equal reserves, ~1 ulp of the reserve
   scale), so the last digits of such an answer are the floor's,
   not the curve's. The maths is floating point. Educational
   model only — your reserves, amplification and cap, not live
   pool data, not a live quote, not financial advice. */
function stableImpactSizer(reserveInStr, reserveOutStr, ampStr, maxImpactPctStr, feeBps) {
  var raw = [reserveInStr, reserveOutStr, ampStr, maxImpactPctStr, feeBps];
  for (var i = 0; i < raw.length; i++) {
    if (raw[i] == null || String(raw[i]).trim() === "") return null;
  }
  var reserveIn = Number(reserveInStr), reserveOut = Number(reserveOutStr);
  var amp = Number(ampStr), capPct = Number(maxImpactPctStr);
  var fee = Number(feeBps);
  if (![reserveIn, reserveOut, amp, capPct].every(Number.isFinite)) return null;
  if (reserveIn <= 0 || reserveOut <= 0 || amp <= 0) return null;
  if (capPct <= 0 || capPct >= 100) return null;
  if (!Number.isInteger(fee) || fee < 0 || fee > 9999) return null;
  var D = stableInvariantD(reserveIn, reserveOut, amp);
  if (D === null || !(D > 0)) return null;
  var Ann = 2 * amp, K = Math.pow(D, 3) / 4;
  function spotAt(x, y) {
    return (K / (x * x * y) + Ann) / (Ann + K / (x * y * y));
  }
  var spotPrice = spotAt(reserveIn, reserveOut);
  if (!Number.isFinite(spotPrice) || !(spotPrice > 0)) return null;
  var feeFrac = fee / 10000;
  var base = { reserveIn: reserveIn, reserveOut: reserveOut, amp: amp,
    spotPrice: spotPrice, maxImpactPct: capPct, feeBps: fee,
    feeImpactPct: feeFrac * 100, invariantD: D };
  if (capPct / 100 <= feeFrac) {
    return Object.assign(base, { feasible: false, maxAmountIn: 0, netIn: 0, amountOut: 0, actualImpactPct: feeFrac * 100 });
  }
  function impactOf(amount) {
    var r = stableSwap(String(reserveIn), String(reserveOut), String(amp), String(amount), fee);
    return r === null ? Infinity : r.priceImpactPct;
  }
  var lo = reserveIn * 1e-9, hi = reserveIn, guard = 0;
  while (impactOf(hi) < capPct && guard++ < 200) { lo = hi; hi *= 4; }
  if (impactOf(hi) < capPct) return null;
  for (var it = 0; it < 200; it++) {
    var mid = Math.sqrt(lo * hi);
    if (impactOf(mid) >= capPct) hi = mid; else lo = mid;
  }
  var amount = lo;
  var fin = stableSwap(String(reserveIn), String(reserveOut), String(amp), String(amount), fee);
  if (fin === null) return null;
  var result = Object.assign(base, {
    feasible: true, maxAmountIn: amount, netIn: fin.netIn, amountOut: fin.out,
    effectivePrice: fin.effectivePrice, actualImpactPct: fin.priceImpactPct,
    postTradeSpotPrice: spotAt(fin.newReserveIn, fin.newReserveOut),
    newReserveIn: fin.newReserveIn, newReserveOut: fin.newReserveOut
  });
  var fields = Object.keys(result);
  for (var j = 0; j < fields.length; j++) {
    var v = result[fields[j]];
    if (typeof v === "number" && !Number.isFinite(v)) return null;
  }
  return result;
}

/* ---------- 67 · Curve comparison model ---------- */
/* Tools 1, 56 and 58 each price a trade on ONE curve family; this
   runs the SAME trade through all three so the curves' shapes can
   be compared as numbers. Every leg is the source tool verbatim —
   the constant-product leg is tool 1's cpSwap (its output string
   parsed back to a number, 9 dp flooring and all), the weighted
   leg is tool 56's weightedSwap and the stableswap leg is tool
   58's stableSwap — so a leg can never drift from the model it
   stands for, and if any leg rejects the trade the comparison
   rejects it too rather than ranking a partial field.
   The honest trap, stated wherever the result is shown: these are
   three DIFFERENT pools that happen to hold the same reserves.
   Each curve sets its own spot from those reserves — the weighted
   spot carries the weight ((rout/wOut)/(rin/wIn)) and the stable
   spot sits near par only while the reserves are balanced — so
   the largest payout can simply be the curve that priced the
   token cheapest before the trade: at an 80% input weight on
   balanced 1,000/1,000 reserves the weighted leg pays ≈316.3653
   out for 100 in, not because the curve is generous but because
   its spot is 4, not 1. Price impact, measured against each
   curve's OWN spot, is the shape comparison; the raw payout is
   not. Only where the spots coincide is the payout ranking a
   curve ranking: on balanced reserves at a 50% weight all three
   spots are 1, the weighted leg IS the constant-product leg
   (90.70243237 out for 100 in at 25 bps), and the stableswap
   leg's 99.6506 out at 0.3494% impact is the stable curve
   defending par, priced honestly. Educational model only — your
   reserves, weight, amplification and trade, not live pool data,
   not a live quote, not financial advice. */
function curveCompare(reserveInStr, reserveOutStr, weightInPctStr, ampStr, amountInStr, feeBps) {
  var raw = [reserveInStr, reserveOutStr, weightInPctStr, ampStr, amountInStr];
  for (var i = 0; i < raw.length; i++) {
    if (raw[i] == null || String(raw[i]).trim() === "") return null;
  }
  var fee = Number(feeBps);
  if (!Number.isInteger(fee) || fee < 0 || fee > 9999) return null;
  var cp = cpSwap(reserveInStr, reserveOutStr, amountInStr, feeBps);
  var wt = weightedSwap(reserveInStr, reserveOutStr, weightInPctStr, amountInStr, feeBps);
  var st = stableSwap(reserveInStr, reserveOutStr, ampStr, amountInStr, feeBps);
  if (cp === null || wt === null || st === null) return null;
  var legs = {
    constantProduct: { out: Number(cp.out), spotPrice: cp.spotPrice, effectivePrice: cp.effectivePrice, priceImpactPct: cp.priceImpactPct },
    weighted: { out: wt.out, spotPrice: wt.spotPrice, effectivePrice: wt.effectivePrice, priceImpactPct: wt.priceImpactPct },
    stableswap: { out: st.out, spotPrice: st.spotPrice, effectivePrice: st.effectivePrice, priceImpactPct: st.priceImpactPct }
  };
  var names = Object.keys(legs);
  for (var n = 0; n < names.length; n++) {
    var legFields = Object.keys(legs[names[n]]);
    for (var m = 0; m < legFields.length; m++) {
      if (!Number.isFinite(legs[names[n]][legFields[m]])) return null;
    }
  }
  var bestOut = names[0], lowestImpact = names[0];
  for (var k = 1; k < names.length; k++) {
    if (legs[names[k]].out > legs[bestOut].out) bestOut = names[k];
    if (legs[names[k]].priceImpactPct < legs[lowestImpact].priceImpactPct) lowestImpact = names[k];
  }
  var outs = names.map(function (name) { return legs[name].out; });
  return {
    reserveIn: Number(reserveInStr), reserveOut: Number(reserveOutStr),
    weightInPct: Number(weightInPctStr), amp: Number(ampStr),
    amountIn: Number(amountInStr), feeBps: fee,
    constantProduct: legs.constantProduct, weighted: legs.weighted, stableswap: legs.stableswap,
    bestOut: bestOut, bestOutAmount: legs[bestOut].out,
    lowestImpact: lowestImpact, lowestImpactPct: legs[lowestImpact].priceImpactPct,
    outSpread: Math.max.apply(null, outs) - Math.min.apply(null, outs)
  };
}

/* ---------- 74 · Curve comparison exact-out model ---------- */
/* Tool 67's question reversed: tool 67 fixes the input and compares
   what each curve pays; this fixes the OUTPUT — the amount you must
   receive — and compares what each curve charges, with every leg
   priced by its own exact-out tool verbatim (tool 6's cpSwapExactOut,
   tool 63's weightedSwapExactOut, tool 59's stableSwapExactOut), so
   the comparison can never drift from the tools it compares. The
   trap is tool 67's, turned around: the cheapest input is not
   necessarily the cheapest trade. On balanced 1,000/1,000 reserves
   a target of 100 out at a 25 bps tier costs ≈111.3896 in on the
   constant-product curve (impact ≈10.225% against its own spot),
   exactly the same on the weighted curve at a 50% input weight,
   and ≈100.3510 in on the stableswap curve at A = 100 (impact
   ≈0.3497%). Move the weight to 80% and the weighted leg becomes
   the cheapest in raw input (≈26.7570 in) — because its spot is 4
   out per in, not 1 — while its impact (≈6.5665%) is still nearly
   nineteen times the stableswap leg's, so cheapest-in and
   lowest-impact name different curves. Read each leg's spot before
   ranking its cost: each curve sets its own spot from the same
   reserves, and a low required input can simply be a curve that
   priced the output token cheaply before the trade. A target at or
   above the whole output reserve is impossible on every curve —
   each leg rejects it, so the comparison rejects it too.
   Educational model only — your reserves, weight, amplification
   and target; not live pool data, not a live quote, not financial
   advice. */
function curveCompareExactOut(reserveInStr, reserveOutStr, weightInPctStr, ampStr, amountOutStr, feeBps) {
  var raw = [reserveInStr, reserveOutStr, weightInPctStr, ampStr, amountOutStr];
  for (var i = 0; i < raw.length; i++) {
    if (raw[i] == null || String(raw[i]).trim() === "") return null;
  }
  var fee = Number(feeBps);
  if (!Number.isInteger(fee) || fee < 0 || fee > 9999) return null;
  var cp = cpSwapExactOut(reserveInStr, reserveOutStr, amountOutStr, feeBps);
  var wt = weightedSwapExactOut(reserveInStr, reserveOutStr, weightInPctStr, amountOutStr, feeBps);
  var st = stableSwapExactOut(reserveInStr, reserveOutStr, ampStr, amountOutStr, feeBps);
  if (cp === null || wt === null || st === null) return null;
  var legs = {
    constantProduct: { "in": Number(cp.amountIn), spotPrice: cp.spotPrice, effectivePrice: cp.effectivePrice, priceImpactPct: cp.priceImpactPct },
    weighted: { "in": wt.amountIn, spotPrice: wt.spotPrice, effectivePrice: wt.effectivePrice, priceImpactPct: wt.priceImpactPct },
    stableswap: { "in": st.amountIn, spotPrice: st.spotPrice, effectivePrice: st.effectivePrice, priceImpactPct: st.priceImpactPct }
  };
  var names = Object.keys(legs);
  for (var n = 0; n < names.length; n++) {
    var legFields = Object.keys(legs[names[n]]);
    for (var m = 0; m < legFields.length; m++) {
      if (!Number.isFinite(legs[names[n]][legFields[m]])) return null;
    }
  }
  var cheapestIn = names[0], lowestImpact = names[0];
  for (var k = 1; k < names.length; k++) {
    if (legs[names[k]]["in"] < legs[cheapestIn]["in"]) cheapestIn = names[k];
    if (legs[names[k]].priceImpactPct < legs[lowestImpact].priceImpactPct) lowestImpact = names[k];
  }
  var ins = names.map(function (name) { return legs[name]["in"]; });
  return {
    reserveIn: Number(reserveInStr), reserveOut: Number(reserveOutStr),
    weightInPct: Number(weightInPctStr), amp: Number(ampStr),
    amountOut: Number(amountOutStr), feeBps: fee,
    constantProduct: legs.constantProduct, weighted: legs.weighted, stableswap: legs.stableswap,
    cheapestIn: cheapestIn, cheapestInAmount: legs[cheapestIn]["in"],
    lowestImpact: lowestImpact, lowestImpactPct: legs[lowestImpact].priceImpactPct,
    inSpread: Math.max.apply(null, ins) - Math.min.apply(null, ins)
  };
}

/* ---------- 68 · Weighted-pool net return calculator ---------- */
/* Tools 24 and 29 settle a position — LP value plus the fees actually
   earned, against simply holding — for a 50/50 constant-product pool
   and for a CLMM position. This is the same settlement for the
   weighted pools of tool 56, built entirely on tool 60's own
   weightedImpermanentLoss: net = lpValue + fees, and the verdict is
   fees minus tool 60's hurdle, so the settlement can never drift
   from the IL tool it settles. At a 50% weight it is tool 24's
   answer exactly (asserted in tests), because at 50/50 the weighted
   curve is the product curve. The honest shape is what the weight
   does to the two bottom lines: at an 80% weight on the token that
   doubled, a $1,000 deposit is worth $1,741.10 as an LP — up
   74.11% on the deposit — yet still $58.90 behind holding, because
   holding kept more of the token that rose. Weighting toward a
   token shrinks the hurdle on moves in that token's favour (the
   mirror move, a 20% weight on a halving, carries the identical
   −3.27% IL) but it is a bet, not a shield: a 10% weight still
   needs ≈$151.30 of fees per $1,000 at a 4x move. At no price move
   the hurdle is $0 and coverage is honestly null (nothing to
   cover), not a made-up percentage. Model only — fees counted in
   $ terms outside the position, no compounding, no rebalancing of
   the weights modelled. Weighted pools are a generalised design
   used elsewhere; Raydium's own constant-product pools are the
   50/50 case tool 24 covers. Not financial advice. */
function weightedNetReturn(weightAPctStr, priceRatioStr, depositStr, feesStr) {
  if (feesStr == null || String(feesStr).trim() === "") return null;
  if (depositStr == null || String(depositStr).trim() === "") return null;
  var wil = weightedImpermanentLoss(weightAPctStr, priceRatioStr, depositStr);
  if (wil === null || wil.deposit == null || !(wil.deposit > 0)) return null;
  var fees = Number(feesStr);
  if (!Number.isFinite(fees) || fees < 0) return null;
  var feesNeeded = wil.holdValue - wil.lpValue;
  var netLpValue = wil.lpValue + fees;
  var netVsHold = netLpValue - wil.holdValue;
  var tol = 1e-9 * Math.max(1, wil.holdValue);
  return {
    weightAPct: wil.weightAPct, weightBPct: wil.weightBPct,
    priceRatio: wil.priceRatio, deposit: wil.deposit, ilPct: wil.ilPct,
    lpVsHold: wil.lpVsHold,
    holdValue: wil.holdValue, lpValue: wil.lpValue,
    feesEarned: fees, feesNeeded: feesNeeded,
    feesCoveragePct: feesNeeded > 1e-9 ? fees / feesNeeded * 100 : null,
    netLpValue: netLpValue, netVsHold: netVsHold,
    netVsHoldPct: wil.holdValue > 0 ? netVsHold / wil.holdValue * 100 : 0,
    netReturnPct: (netLpValue - wil.deposit) / wil.deposit * 100,
    verdict: Math.abs(netVsHold) <= tol ? "even" : (netVsHold > 0 ? "ahead" : "behind")
  };
}

/* ---------- 69 · Stableswap net return calculator ---------- */
/* Tools 24, 29 and 68 settle a position — LP value plus the fees
   actually earned, against simply holding — for a constant-product
   pool, a CLMM position and a weighted pool. This is the same
   settlement for the stableswap pools of tool 58, and the last
   curve family without one. It is built entirely on tool 61's own
   stableDepegLoss: the user's share of the pool takes that tool's
   whole-pool hold and LP values pro-rata, so the hurdle is the
   share of tool 61's depeg loss and the settlement can never drift
   from the depeg tool it settles. The deposit baseline is the
   share's value at the pool's own starting spot (reserveA +
   startSpot x reserveB, pro-rata), which is what makes the two
   bottom lines differ on a depeg: at a 0.90 depeg of a balanced
   1,000/1,000 pool at A = 100, a 10% share was worth 200 A at
   entry; holding is worth 190 A (the depeg hurt the held token
   too, -5%), the LP share 183.5724 A, so the position is 6.4276 A
   behind holding (-3.3829%, tool 61's figure) and -8.2138% against
   its own deposit. Fees that cover the hurdle still leave the
   position down against its deposit, because holding fell too.
   The hurdle grows with the amplification exactly as tool 61's
   loss does (per 200 A of deposit share at the 0.90 depeg:
   0.5252 A at A = 1, 6.4276 A at A = 100, 9.4139 A at A = 5,000).
   A price above the starting spot runs the same settlement the
   other way (tool 61's reverse drain). At the peg the hurdle is
   0 and coverage is honestly null (nothing to cover), not a
   made-up percentage. Model only — fees counted in token A terms
   outside the position, no compounding; tool 61's no-fee
   arbitrage assumption is inherited, so live fees slow the drain
   slightly and the hurdle is the gross shape. Not financial
   advice. */
function stableNetReturn(reserveAStr, reserveBStr, ampStr, priceBStr, sharePctStr, feesStr) {
  if (sharePctStr == null || String(sharePctStr).trim() === "") return null;
  if (feesStr == null || String(feesStr).trim() === "") return null;
  var dep = stableDepegLoss(reserveAStr, reserveBStr, ampStr, priceBStr);
  if (dep === null) return null;
  var sharePct = Number(sharePctStr), fees = Number(feesStr);
  if (!Number.isFinite(sharePct) || sharePct <= 0 || sharePct > 100) return null;
  if (!Number.isFinite(fees) || fees < 0) return null;
  var share = sharePct / 100;
  var depositValueA = share * (dep.reserveA + dep.startSpotB * dep.reserveB);
  if (!(depositValueA > 0)) return null;
  var holdValueA = share * dep.holdValueA;
  var lpValueA = share * dep.lpValueA;
  var feesNeeded = holdValueA - lpValueA;
  var netLpValueA = lpValueA + fees;
  var netVsHoldA = netLpValueA - holdValueA;
  var tol = 1e-9 * Math.max(1, holdValueA);
  var result = {
    reserveA: dep.reserveA, reserveB: dep.reserveB, amp: dep.amp, priceB: dep.priceB,
    startSpotB: dep.startSpotB, endSpotB: dep.endSpotB,
    newReserveA: dep.newReserveA, newReserveB: dep.newReserveB,
    sharePct: sharePct, depositValueA: depositValueA,
    holdValueA: holdValueA, lpValueA: lpValueA, lossPct: dep.lossPct,
    feesEarned: fees, feesNeeded: feesNeeded,
    feesCoveragePct: feesNeeded > 1e-9 ? fees / feesNeeded * 100 : null,
    netLpValueA: netLpValueA, netVsHoldA: netVsHoldA,
    netVsHoldPct: holdValueA > 0 ? netVsHoldA / holdValueA * 100 : 0,
    netReturnPct: (netLpValueA - depositValueA) / depositValueA * 100,
    verdict: Math.abs(netVsHoldA) <= tol ? "even" : (netVsHoldA > 0 ? "ahead" : "behind")
  };
  var fields = Object.keys(result);
  for (var j = 0; j < fields.length; j++) {
    var v = result[fields[j]];
    if (typeof v === "number" && !Number.isFinite(v)) return null;
  }
  return result;
}

/* ---------- 70 · Weighted-pool required-volume planner (Tools 60 + 3 inverted) ---------- */
/* Tools 31 and 32 ask "how much volume per day covers the break-even
   hurdle a price move opens?" for a CLMM position and a 50/50
   constant-product pool; a weighted-pool LP asks the same, and the
   weight changes the answer before volume enters it at all — the
   hurdle is tool 60's own feesNeeded (hold value minus LP value under
   r^w vs w*r + (1-w)), so at an 80% weight on the token that doubled
   the hurdle on a $1,000 deposit is $58.8989, not the 50/50 pool's
   $85.7864, and at a 50% weight this tool IS tool 32 verbatim (the
   tests assert every shared field equal). The fee side is tool 3's
   own formula run in reverse:
     your fees per day = volume * (feeBps / 10000) * (your / TVL)
     required volume   = (hurdle / days) / that product
   Validation rides on the source tools: the hurdle comes from
   weightedImpermanentLoss with a deposit (a weight outside the open
   interval (0, 100), a non-positive price multiple, a zero deposit
   and a blank deposit are rejected exactly as tool 60 rejects them)
   and a probe lpFees estimate at volume 1 must succeed, so your
   liquidity above the pool TVL and a fee tier outside integer
   0..10000 bps are rejected exactly as tool 3 rejects them, and the
   share reported is tool 3's own. The tests feed the reported volume
   straight back into tool 3 and assert it earns the hurdle in exactly
   the days allowed, so the inverse can never drift from the forwards
   tool. Two honest edges, mirroring tool 32: at no price move there
   is no hurdle, so the required volume is honestly 0 — not a small
   number — even at a zero fee tier; and with a real hurdle but a
   zero fee tier, no volume exists that earns a fee, so the answer
   is reported as not feasible with an infinite required volume
   rather than a made-up figure. The hurdle is NOT monotonic in the
   weight, because it is hold minus LP and both sides move with the
   weight: at a 2x move the hurdle per $1,000 runs $28.2265 at a 10%
   weight, $85.7864 at 50%, $58.8989 at 80% and $33.9340 at 90%, and
   at a 4x move the worst IL% sits near a 39% weight (-20.8698% at
   w = 38.8%, the analytic argmin (3/ln4 - 1)/3; -20.2254% is merely
   the value AT a 30% weight), not at 50% (-20%) — so a weighted LP cannot read the hurdle off
   the 50/50 answer in either direction. The volume is a pool-wide
   total per day in the deposit's terms at a fee rate assumed to hold
   still — in a live pool volume, TVL, weights' values and price all
   move. Weighted pools are a generalised design used elsewhere —
   Raydium's own constant-product pools are the 50/50 case tool 32
   covers. Model only — not a live quote, not a volume forecast,
   not financial advice. */
function weightedRequiredVolume(weightAPctStr, priceRatioStr, depositStr, yourStr, tvlStr, feeBps, daysStr) {
  if (daysStr == null || String(daysStr).trim() === "") return null;
  var days = Number(daysStr);
  if (!Number.isFinite(days) || days <= 0) return null;
  if (depositStr == null || String(depositStr).trim() === "") return null;
  var wil = weightedImpermanentLoss(weightAPctStr, priceRatioStr, depositStr);
  if (wil === null || wil.deposit == null || !(wil.deposit > 0)) return null;
  /* probe Tool 3 at volume 1 for validation + its own share */
  var est = lpFees("1", feeBps, yourStr, tvlStr);
  if (est === null) return null;
  var feesNeeded = wil.feesNeeded;
  var requiredFeesPerDay = feesNeeded / days;
  var shareFrac = est.sharePct / 100;
  var feeFrac = Number(feeBps) / 10000;
  var base = {
    weightAPct: wil.weightAPct, weightBPct: wil.weightBPct,
    priceRatio: wil.priceRatio, deposit: wil.deposit,
    holdValue: wil.holdValue, lpValue: wil.lpValue, ilPct: wil.ilPct,
    feesNeeded: feesNeeded, feesNeededPctOfDeposit: wil.feesNeededPctOfDeposit,
    days: days, feeBps: Number(feeBps), feePct: est.feePct,
    sharePct: est.sharePct, requiredFeesPerDay: requiredFeesPerDay
  };
  if (feesNeeded <= 1e-12) {
    return Object.assign(base, {
      feasible: true, requiredPoolFeesPerDay: 0, requiredVolumePerDay: 0
    });
  }
  var capture = feeFrac * shareFrac;
  if (capture <= 0) {
    return Object.assign(base, {
      feasible: false,
      requiredPoolFeesPerDay: shareFrac > 0 ? requiredFeesPerDay / shareFrac : null,
      requiredVolumePerDay: Infinity
    });
  }
  return Object.assign(base, {
    feasible: true,
    requiredPoolFeesPerDay: requiredFeesPerDay / shareFrac,
    requiredVolumePerDay: requiredFeesPerDay / capture
  });
}

/* ---------- 71 · Stableswap required-volume planner (Tools 61/69 + 3 inverted) ---------- */
/* Tools 31, 32 and 70 ask "how much volume per day covers the
   break-even hurdle?" for a CLMM position, a 50/50 constant-product
   pool and a weighted pool; a stableswap LP asks the same, and here
   the amplification sets the hurdle before volume enters it. The
   hurdle is Tool 69's own feesNeeded — your share of Tool 61's
   depeg shortfall (hold value minus LP value after arbitrage has
   rebalanced the pool to your external price of token B, both in
   token A terms): on balanced 1,000/1,000 reserves at A = 100 with
   B at 0.90, a 10% share owes ≈6.4276 A, and the same depeg at
   A = 1 owes only ≈0.5252 A while A = 5,000 owes ≈9.4139 A,
   because a higher A defends par longer and drains further. The
   fee side is Tool 3's formula run in reverse with the share
   taken directly, the way Tool 69 takes it:
     your fees per day = volume * (feeBps / 10000) * share
     required volume   = (hurdle / days) / that product
   One honest consequence of that shape: the required POOL volume
   does not depend on your share at all — a bigger share owes a
   bigger slice of the hurdle but takes the same bigger slice of
   every fee, so the two cancel (the tests assert the volume is
   identical at 5%, 10%, 25% and 100% shares while the fees you
   must personally earn scale with the share). What the share
   cannot cancel is the amplification's bill. Validation rides on
   the source tools: the hurdle comes from stableDepegLoss itself
   (non-positive reserves, amplification or price are rejected
   exactly as Tool 61 rejects them, and an unbracketable price is
   rejected there too), the share must lie in (0, 100] exactly as
   Tool 69 requires, and the fee tier must be an integer
   0..10000 bps exactly as Tool 3 requires. The tests feed the
   reported volume's fees straight into Tool 69 and assert the
   position settles exactly even with holding, so the inverse can
   never drift from the forwards tools. Two honest edges,
   mirroring Tools 32/70: if the peg holds at your price there is
   no shortfall, so the required volume is honestly 0 — not a
   small number — even at a zero fee tier (a hurdle at or below
   Tool 69's own verdict tolerance counts as none); and with a
   real hurdle but a zero fee tier, no volume earns a fee, so the
   answer is reported as not feasible with an infinite required
   volume rather than a made-up figure. Volume is a pool-wide
   total per day in token A terms, at a fee rate, share, price
   and amplification assumed to hold still — in a live pool none
   of them will. Stableswap pools are a generalised design used
   elsewhere for pegged pairs, modelled for comparison.
   Model only — not a live quote, not a volume forecast,
   not financial advice. */
function stableRequiredVolume(reserveAStr, reserveBStr, ampStr, priceBStr, sharePctStr, feeBps, daysStr) {
  var raw = [reserveAStr, reserveBStr, ampStr, priceBStr, sharePctStr, feeBps, daysStr];
  for (var i = 0; i < raw.length; i++) {
    if (raw[i] == null || String(raw[i]).trim() === "") return null;
  }
  var days = Number(daysStr), sharePct = Number(sharePctStr), fee = Number(feeBps);
  if (!Number.isFinite(days) || days <= 0) return null;
  if (!Number.isFinite(sharePct) || sharePct <= 0 || sharePct > 100) return null;
  if (!Number.isInteger(fee) || fee < 0 || fee > 10000) return null;
  var dep = stableDepegLoss(reserveAStr, reserveBStr, ampStr, priceBStr);
  if (dep === null) return null;
  var share = sharePct / 100;
  var holdValueA = share * dep.holdValueA;
  var lpValueA = share * dep.lpValueA;
  var feesNeeded = holdValueA - lpValueA;
  var requiredFeesPerDay = feesNeeded / days;
  var base = {
    reserveA: dep.reserveA, reserveB: dep.reserveB, amp: dep.amp, priceB: dep.priceB,
    startSpotB: dep.startSpotB, endSpotB: dep.endSpotB,
    newReserveA: dep.newReserveA, newReserveB: dep.newReserveB,
    sharePct: sharePct,
    depositValueA: share * (dep.reserveA + dep.startSpotB * dep.reserveB),
    holdValueA: holdValueA, lpValueA: lpValueA, lossPct: dep.lossPct,
    feesNeeded: feesNeeded, feesNeededPctOfDeposit: 0,
    days: days, feeBps: fee, feePct: fee / 100,
    requiredFeesPerDay: requiredFeesPerDay
  };
  base.feesNeededPctOfDeposit = base.depositValueA > 0 ? feesNeeded / base.depositValueA * 100 : 0;
  if (feesNeeded <= 1e-9 * Math.max(1, holdValueA)) {
    return Object.assign(base, {
      feasible: true, requiredPoolFeesPerDay: 0, requiredVolumePerDay: 0
    });
  }
  if (fee <= 0) {
    return Object.assign(base, {
      feasible: false,
      requiredPoolFeesPerDay: requiredFeesPerDay / share,
      requiredVolumePerDay: Infinity
    });
  }
  return Object.assign(base, {
    feasible: true,
    requiredPoolFeesPerDay: requiredFeesPerDay / share,
    requiredVolumePerDay: requiredFeesPerDay / (fee / 10000 * share)
  });
}

/* ---------- 72 · Weighted-pool break-even days calculator (Tools 60 + 3) ---------- */
/* Tools 15 and 40 ask "at this daily volume, how many days until
   the fees cover the break-even hurdle?" for a CLMM position and a
   50/50 constant-product pool; weighted pools had the inverse
   question (Tool 70's required volume) but not this one. The
   hurdle is Tool 60's own feesNeeded for the weighted position,
   and the fee rate is Tool 3's own dailyFees at the user's
   volume, fee tier and share, so the answer is simply
     days = hurdle / daily fees
   and the two tools are exact inverses: feeding Tool 70's
   required daily volume for a 30-day target back through this
   calculator returns exactly 30 days (asserted in tests).
   Headline: an 80% weight on the token that doubled leaves a
   $1,000 deposit $58.8989 behind holding (Tool 60's figure); at
   $10,000 of pool volume a day, a 25 bps tier and a 10% share
   ($2.50 of fees a day to you) that is 23.5595 days — against
   34.3146 days for the 50/50 pool at the same move and volume,
   whose hurdle is $85.7864. At a 50% weight every figure equals
   Tool 40's cpBreakEvenDays exactly (asserted in tests), because
   the 50/50 weighted pool IS Tool 40's pool. The mirror move
   (a 20% weight on a token that halved) carries the identical
   impermanent-loss percentage as the headline but half the
   dollar hurdle — hold value scales the hurdle — so it breaks
   even in exactly half the days at the same daily fees. Two
   honest edges, mirroring Tool 40: at no price move there is
   no hurdle, so the answer is honestly 0 days even at a zero
   fee tier or zero volume; and with a real hurdle but no daily
   fees (zero volume or a 0 bps tier) the answer is Infinity —
   never breaks even at that rate — not a large made-up number.
   Validation rides on the source tools: the weight, ratio and
   deposit are rejected exactly as Tool 60 rejects them (a zero
   deposit is not a position at all), and the volume, fee tier
   and share exactly as Tool 3 rejects them. The day count
   assumes the volume, tier, share and post-move price all hold
   still — in a live pool none of them will, and further moves
   reopen the hurdle. Weighted pools are a generalised design
   used elsewhere; Raydium's own constant-product pools are the
   50/50 case Tool 40 covers. Educational model only — your
   weight, price-move, deposit, volume, share and fee inputs,
   not live pool data, not a live quote, not financial advice. */
function weightedBreakEvenDays(weightAPctStr, priceRatioStr, depositStr, volumeStr, feeBps, yourStr, tvlStr) {
  var required = [weightAPctStr, priceRatioStr, depositStr, volumeStr, yourStr, tvlStr, feeBps];
  for (var i = 0; i < required.length; i++) {
    if (required[i] == null || String(required[i]).trim() === "") return null;
  }
  var wil = weightedImpermanentLoss(weightAPctStr, priceRatioStr, depositStr);
  if (wil === null || wil.deposit == null || !(wil.deposit > 0)) return null;
  var est = lpFees(volumeStr, feeBps, yourStr, tvlStr);
  if (est === null) return null;
  var days;
  if (wil.feesNeeded <= 1e-12) days = 0;
  else if (est.dailyFees > 0) days = wil.feesNeeded / est.dailyFees;
  else days = Infinity;
  return {
    weightAPct: wil.weightAPct, weightBPct: wil.weightBPct,
    priceRatio: wil.priceRatio, deposit: wil.deposit,
    holdValue: wil.holdValue, lpValue: wil.lpValue,
    ilPct: wil.ilPct, feesNeeded: wil.feesNeeded,
    feesNeededPctOfDeposit: wil.feesNeededPctOfDeposit,
    sharePct: est.sharePct, dailyFees: est.dailyFees,
    monthlyFees: est.monthlyFees, aprPct: est.aprPct,
    feeBps: Number(feeBps), feePct: est.feePct,
    daysToBreakEven: days
  };
}

/* ---------- 73 · Stableswap break-even days calculator (Tools 61/69 + 3) ---------- */
/* Tools 15, 40 and 72 ask "at this daily volume, how many days
   until the fees cover the break-even hurdle?" for a CLMM
   position, a 50/50 constant-product pool and a weighted pool;
   stableswap pools had the inverse question (Tool 71's required
   volume) but not this one. The hurdle is Tool 69's own
   feesNeeded — your share of Tool 61's depeg shortfall (hold
   value minus LP value after arbitrage has rebalanced the pool
   to your external price of token B, both in token A terms) —
   and the fee rate is Tool 3's own formula with the share taken
   directly, the way Tools 69/71 take it:
     your fees per day = volume * (feeBps / 10000) * share
     days              = hurdle / daily fees
   so the two stableswap tools are exact inverses: feeding Tool
   71's required daily volume for a 30-day target back through
   this calculator returns exactly 30 days (asserted in tests at
   1, 7, 30, 90 and 365 days). Headline: on balanced 1,000/1,000
   reserves at A = 100 with B at 0.90, a 10% share owes
   ≈6.4276 A; at 10,000 A of pool volume a day and a 25 bps tier
   the share earns 2.5 A a day, so break-even takes ≈2.5710
   days. The amplification sets the hurdle before volume enters
   it, exactly as in Tools 61/69/71: at that same rate the count
   runs ≈0.2101 days at A = 1 and ≈3.7656 days at A = 5,000,
   because a higher A defends par longer and drains further. One
   honest shape, the mirror of Tool 71's: the day count does NOT
   depend on your share — a bigger share owes a bigger slice of
   the hurdle but takes the same bigger slice of every fee, so
   the two cancel (asserted identical at 5%, 10%, 25% and 100%
   shares, while the hurdle itself scales with the share). A
   price above the starting spot runs the same count on Tool
   61's reverse drain (B at 1.1: hurdle ≈6.2682 A, ≈2.5073 days
   at the headline rate). Two honest edges, mirroring Tools
   40/72: if the peg holds at your price there is no shortfall,
   so the answer is honestly 0 days even at zero volume or a
   zero fee tier (a hurdle at or below Tool 69's own verdict
   tolerance counts as none); and with a real hurdle but no
   daily fees (zero volume or a 0 bps tier) the answer is
   Infinity — never breaks even at that rate — not a large
   made-up number. Validation rides on the source tools: the
   reserves, amplification and price are rejected exactly as
   Tool 61 rejects them (an unbracketable price is rejected
   there too), the share must lie in (0, 100] exactly as Tool
   69 requires, and the fee tier must be an integer 0..10000
   bps exactly as Tool 3 requires. The day count assumes the
   volume, tier, share, price and amplification all hold still
   — in a live pool none of them will, and a further depeg
   reopens the hurdle. Stableswap pools are a generalised
   design used elsewhere for pegged pairs, modelled for
   comparison. Educational model only — your reserves,
   amplification, depeg price, share, volume and fee inputs,
   with amounts in token A terms; not live pool data, not a
   live quote, not financial advice. */
function stableBreakEvenDays(reserveAStr, reserveBStr, ampStr, priceBStr, sharePctStr, volumeStr, feeBps) {
  var raw = [reserveAStr, reserveBStr, ampStr, priceBStr, sharePctStr, volumeStr, feeBps];
  for (var i = 0; i < raw.length; i++) {
    if (raw[i] == null || String(raw[i]).trim() === "") return null;
  }
  var volume = Number(volumeStr), sharePct = Number(sharePctStr), fee = Number(feeBps);
  if (!Number.isFinite(volume) || volume < 0) return null;
  if (!Number.isFinite(sharePct) || sharePct <= 0 || sharePct > 100) return null;
  if (!Number.isInteger(fee) || fee < 0 || fee > 10000) return null;
  var dep = stableDepegLoss(reserveAStr, reserveBStr, ampStr, priceBStr);
  if (dep === null) return null;
  var share = sharePct / 100;
  var holdValueA = share * dep.holdValueA;
  var lpValueA = share * dep.lpValueA;
  var feesNeeded = holdValueA - lpValueA;
  var dailyFees = volume * (fee / 10000) * share;
  var days;
  if (feesNeeded <= 1e-9 * Math.max(1, holdValueA)) days = 0;
  else if (dailyFees > 0) days = feesNeeded / dailyFees;
  else days = Infinity;
  var depositValueA = share * (dep.reserveA + dep.startSpotB * dep.reserveB);
  return {
    reserveA: dep.reserveA, reserveB: dep.reserveB, amp: dep.amp, priceB: dep.priceB,
    startSpotB: dep.startSpotB, endSpotB: dep.endSpotB,
    newReserveA: dep.newReserveA, newReserveB: dep.newReserveB,
    sharePct: sharePct, depositValueA: depositValueA,
    holdValueA: holdValueA, lpValueA: lpValueA, lossPct: dep.lossPct,
    feesNeeded: feesNeeded,
    feesNeededPctOfDeposit: depositValueA > 0 ? feesNeeded / depositValueA * 100 : 0,
    dailyFees: dailyFees, monthlyFees: dailyFees * 30,
    feeBps: fee, feePct: fee / 100,
    daysToBreakEven: days
  };
}

/* ---------- 75 · Weighted-pool IL tolerance band (Tool 60 inverted) ---------- */
/* Tools 21 and 30 ask "how far can the price move before the fees
   I have earned stop covering the impermanent loss?" for a 50/50
   constant-product pool and for a CLMM position; the weighted
   pools of Tool 56 had no such band. The hurdle here is Tool 60's
   own feesNeeded as a fraction of the deposit,
     g(r) = w·r + (1 − w) − r^w,
   which has no closed form off a 50% weight (at 50% it collapses
   to Tool 21's (√r − 1)²/2 exactly, asserted in tests), so both
   edges are found by geometric bisection directly on Tool 60's
   weightedImpermanentLoss, and the hurdle at each reported edge
   equals the fees fed in. Headline: at an 80% weight on token A,
   $50 of fees on a $1,000 deposit covers a band of ≈0.3407x to
   ≈1.9114x — a ≈65.93% fall but a ≈91.14% rise, because the
   heavy side tracks holding more closely on the way up. The
   band's honest asymmetry is on the downside: as r → 0 the
   hurdle approaches (1 − w) of the deposit and never passes it
   (the position's token A is worthless but its token B side is
   untouched, and holding loses exactly that same B side's
   complement) — so fees at or above (1 − w) × deposit cover ANY
   fall, reported as down-unbounded exactly as Tool 21 reports
   its 50%-of-deposit cap. At an 80% weight that cap is just
   $200 of a $1,000 deposit; at a 20% weight it is $800, because
   a light weight on the collapsing token leaves most of the
   position in the other token either way. Zero fees collapse
   the band to exactly 1x on both sides, honestly. Validation
   rides on Tool 60: the weight must lie strictly between 0 and
   100 and the deposit above 0 exactly as that tool requires,
   and the fees must be finite and non-negative. The band
   assumes the fees are already earned and held outside the
   position and that the weight stays fixed — a live weighted
   pool rebalances continuously and fees compound into it.
   Weighted pools are a generalised design used elsewhere —
   Raydium's own constant-product pools are the 50/50 case
   Tool 21 covers. Educational model only — your weight,
   deposit and fees inputs; not live pool data, not a live
   quote, not financial advice. */
function weightedIlBand(weightAPctStr, depositStr, feesStr) {
  var required = [weightAPctStr, depositStr, feesStr];
  for (var i = 0; i < required.length; i++) {
    if (required[i] == null || String(required[i]).trim() === "") return null;
  }
  var fees = Number(feesStr);
  if (!Number.isFinite(fees) || fees < 0) return null;
  var atEntry = weightedImpermanentLoss(weightAPctStr, "1", depositStr);
  if (atEntry === null || atEntry.deposit == null || !(atEntry.deposit > 0)) return null;
  var w = atEntry.weightAPct / 100, dep = atEntry.deposit;
  var f = fees / dep;
  var base = {
    weightAPct: atEntry.weightAPct, weightBPct: atEntry.weightBPct,
    deposit: dep, feesEarned: fees, feePctOfDeposit: f * 100,
    maxDownHurdle: dep * (1 - w), maxDownHurdlePctOfDeposit: (1 - w) * 100
  };
  if (fees === 0) {
    return Object.assign(base, {
      priceRatioHigh: 1, priceRatioLow: 1, moveUpPct: 0, moveDownPct: 0,
      downUnbounded: false
    });
  }
  function hurdleFrac(r) {
    var wil = weightedImpermanentLoss(weightAPctStr, String(r), depositStr);
    return wil === null ? null : wil.feesNeeded / dep;
  }
  /* upper edge: the hurdle grows without bound as r rises (the
     hold side grows linearly, the LP side only as r^w), so a
     doubling bracket always finds it; bisect geometrically */
  var lo = 1, hi = 2;
  while (hurdleFrac(hi) < f && hi < 1e300) hi *= 2;
  if (hurdleFrac(hi) < f) return null;
  for (var a = 0; a < 200; a++) {
    var mid = Math.sqrt(lo * hi);
    if (hurdleFrac(mid) < f) lo = mid; else hi = mid;
  }
  var priceHigh = Math.sqrt(lo * hi);
  var result = Object.assign(base, {
    priceRatioHigh: priceHigh, moveUpPct: (priceHigh - 1) * 100
  });
  /* lower edge: the hurdle caps at (1 − w) of the deposit as
     r → 0, so fees at or above the cap cover any fall */
  if (f >= 1 - w) {
    return Object.assign(result, { downUnbounded: true, priceRatioLow: null, moveDownPct: null });
  }
  var loD = 0.5, hiD = 1;
  while (hurdleFrac(loD) < f && loD > 1e-300) loD /= 2;
  if (hurdleFrac(loD) < f) return null;
  for (var b = 0; b < 200; b++) {
    var midD = Math.sqrt(loD * hiD);
    if (hurdleFrac(midD) < f) hiD = midD; else loD = midD;
  }
  var priceLow = Math.sqrt(loD * hiD);
  return Object.assign(result, {
    downUnbounded: false, priceRatioLow: priceLow,
    moveDownPct: (1 - priceLow) * 100
  });
}

/* ---------- 76 · Stableswap IL tolerance band (Tool 61 inverted) ---------- */
/* Tools 21, 30 and 75 ask "how far can the price move before the
   fees I have earned stop covering the loss?" for a 50/50 pool, a
   CLMM position and a weighted pool; the stableswap pools of
   Tool 58 had no such band. The hurdle here is Tool 61's own
   depeg loss in token A — the whole pool's shortfall against
   holding, at the external price of token B — so both edges are
   found by geometric bisection directly on stableDepegLoss, and
   the loss at each reported edge equals the fees fed in.
   Headline: 64.275666 A of fees on a balanced 1,000/1,000 pool at
   A = 100 covers token B falling to exactly 0.90 A (Tool 61's
   own depeg figure) and rising to ≈1.1020394289 A. The band is
   centred on the pool's own starting spot, not on 1: an
   unbalanced 1,500/500 pool at A = 100 spots B at
   ≈1.0175352412 A before any move, and its band is measured
   from there. The band's honest asymmetry is the mirror of
   Tool 75's: as B's price falls toward zero the hurdle
   approaches the whole token A reserve and never passes it
   (the pool ends up holding almost nothing but the worthless
   side, and holding loses exactly that same A side), so fees
   at or above the A reserve cover ANY fall, reported as
   down-unbounded; as B's price rises the hurdle grows without
   bound (≈ price × reserveB — holding's B side keeps
   appreciating while the pool has sold almost all of its B),
   so every finite fee total has a finite upper edge. The band
   narrows as the amplification rises at fixed fees (at 50 A of
   fees on the balanced pool: ≈0.7051–1.3450 at A = 1,
   ≈0.9179–1.0835 at A = 100, ≈0.9456–1.0545 at A = 5,000),
   because a higher A defends par longer and drains further.
   Zero fees collapse the band to exactly the starting spot on
   both sides, honestly. The fees are the WHOLE pool's, in
   token A, assumed already earned and held outside the pool —
   an individual LP's band is this one scaled by their share
   only if both the loss and the fees are scaled, which is
   Tool 69's accounting. No swap fees are modelled inside
   Tool 61's drain (it says so itself), so live edges sit
   slightly wider than these. Stableswap pools are a
   generalised design used elsewhere for pegged pairs.
   Educational model only — your reserves, amplification and
   fees inputs; not live pool data, not a live quote, not
   financial advice. */
function stableIlBand(reserveAStr, reserveBStr, ampStr, feesStr) {
  var raw = [reserveAStr, reserveBStr, ampStr, feesStr];
  for (var i = 0; i < raw.length; i++) {
    if (raw[i] == null || String(raw[i]).trim() === "") return null;
  }
  var reserveA = Number(reserveAStr), reserveB = Number(reserveBStr);
  var amp = Number(ampStr), fees = Number(feesStr);
  if (![reserveA, reserveB, amp, fees].every(Number.isFinite)) return null;
  if (reserveA <= 0 || reserveB <= 0 || amp <= 0 || fees < 0) return null;
  var D = stableInvariantD(reserveA, reserveB, amp);
  if (D === null || !(D > 0)) return null;
  var spot = stableSpotBInA(reserveA, reserveB, amp, D);
  if (!Number.isFinite(spot) || !(spot > 0)) return null;
  function hurdle(p) {
    var d = stableDepegLoss(reserveAStr, reserveBStr, ampStr, String(p));
    return d === null ? null : -d.lossA;
  }
  var poolValueA = reserveA + spot * reserveB;
  var base = {
    reserveA: reserveA, reserveB: reserveB, amp: amp, feesEarned: fees,
    startSpotB: spot, poolValueA: poolValueA,
    feePctOfPoolValue: fees / poolValueA * 100,
    maxDownHurdle: reserveA,
    maxDownHurdlePctOfPoolValue: reserveA / poolValueA * 100
  };
  if (fees === 0) {
    return Object.assign(base, {
      priceHigh: spot, priceLow: spot, moveUpPct: 0, moveDownPct: 0,
      downUnbounded: false
    });
  }
  /* upper edge: the hurdle grows without bound as B's price
     rises, so a doubling bracket always finds it; bisect
     geometrically on Tool 61 itself */
  var lo = spot, hi = spot * 2, hHi = hurdle(hi), guard = 0;
  while ((hHi === null || hHi < fees) && guard++ < 300 && hi < 1e300) { lo = hi; hi *= 2; hHi = hurdle(hi); }
  if (hHi === null || hHi < fees) return null;
  for (var a = 0; a < 90; a++) {
    var mid = Math.sqrt(lo * hi);
    var hm = hurdle(mid);
    if (hm === null) return null;
    if (hm < fees) lo = mid; else hi = mid;
  }
  var priceHigh = Math.sqrt(lo * hi);
  var result = Object.assign(base, {
    priceHigh: priceHigh, moveUpPct: (priceHigh / spot - 1) * 100
  });
  /* lower edge: the hurdle caps at the whole token A reserve as
     B's price falls to zero, so fees at or above the reserve
     cover any fall */
  if (fees >= reserveA) {
    return Object.assign(result, { downUnbounded: true, priceLow: null, moveDownPct: null });
  }
  var hiD = spot, loD = spot / 2, hLo = hurdle(loD); guard = 0;
  while ((hLo === null || hLo < fees) && guard++ < 300 && loD > 1e-300) { hiD = loD; loD /= 2; hLo = hurdle(loD); }
  if (hLo === null || hLo < fees) return null;
  for (var b = 0; b < 90; b++) {
    var midD = Math.sqrt(loD * hiD);
    var hmd = hurdle(midD);
    if (hmd === null) return null;
    if (hmd < fees) hiD = midD; else loD = midD;
  }
  var priceLow = Math.sqrt(loD * hiD);
  var out = Object.assign(result, {
    downUnbounded: false, priceLow: priceLow,
    moveDownPct: (1 - priceLow / spot) * 100
  });
  var fields = Object.keys(out);
  for (var j = 0; j < fields.length; j++) {
    var v = out[fields[j]];
    if (typeof v === "number" && !Number.isFinite(v)) return null;
  }
  return out;
}

/* ---------- 77 · CLMM arbitrage model ---------- */
/* Tools 16, 62 and 65 price the price-aligning arbitrage trade
   for a constant-product pool, a weighted pool and a stableswap
   pool; the CLMM ranges of Tool 42 had none. Inside one range
   the pool's spot IS its current price, and the aligning trade
   walks the sqrt-price straight to the external price's sqrt:
   paying B (A is cheap in the pool) the net B owed is
   L x (s' - s) and the A taken is L x (1/s - 1/s'); paying A is
   the mirror. The fee comes off the input first (Tool 42's
   convention), so the gross input is net / (1 - fee share), and
   feeding that gross input through Tool 42's own clmmSwap
   returns the modelled output and lands the price on the
   external price (asserted in tests, both directions, with and
   without a fee). The honest shape is the range wall: a single
   range can only align as far as its own edge, so an external
   price beyond the edge caps the trade AT the edge — the model
   reports the capped trade, flags hitBoundary, and its
   post-trade spot is the edge, not the external price; the
   profit is still valued at the external price, which is why a
   capped trade can show a large paper profit no single range
   could actually finish collecting (a real pool continues into
   the next range at that range's liquidity, Tool 43's point).
   Headline: L = 10,000 over 0.5-2 at price 1, external 1.21,
   zero fee -> pay exactly 1,000 B, take ≈909.0909 A, profit
   exactly 100 B; the mirror at 0.81 pays ≈1,111.1111 A, takes
   exactly 1,000 B, same 100 B profit. A gap smaller than the
   fee honestly comes out negative (a 0.01% gap at a 25 bps
   tier: ≈-0.0012 B at the aligning size). Single range only,
   floating point like every CLMM tool here. Educational model
   only — your liquidity, range, prices and fee inputs; not
   live pool data, not a found opportunity, not financial
   advice. */
function clmmArbitrage(liquidityStr, lowerStr, upperStr, priceStr, externalPriceStr, feeBps) {
  var raw = [liquidityStr, lowerStr, upperStr, priceStr, externalPriceStr, feeBps];
  for (var i = 0; i < raw.length; i++) {
    if (raw[i] == null || String(raw[i]).trim() === "") return null;
  }
  var liquidity = Number(liquidityStr), lower = Number(lowerStr), upper = Number(upperStr);
  var price = Number(priceStr), pe = Number(externalPriceStr), fee = Number(feeBps);
  if (![liquidity, lower, upper, price, pe].every(Number.isFinite)) return null;
  if (liquidity <= 0 || lower <= 0 || upper <= 0 || price <= 0 || pe <= 0) return null;
  if (lower >= upper) return null;
  if (price <= lower || price >= upper) return null;
  if (!Number.isInteger(fee) || fee < 0 || fee > 9999) return null;
  var s = Math.sqrt(price);
  var base = { liquidity: liquidity, lowerPrice: lower, upperPrice: upper,
    price: price, spotPrice: price, externalPrice: pe,
    priceGapPct: (pe / price - 1) * 100, feeBps: fee, feePct: fee / 100 };
  var result;
  if (Math.abs(pe - price) / price < 1e-12) {
    result = Object.assign(base, { direction: "none", inToken: null, netIn: 0,
      grossIn: 0, amountOut: 0, outToken: null, profitInB: 0,
      postTradeSpot: price, targetPrice: price, hitBoundary: false });
  } else if (pe > price) {
    var targetUp = Math.min(pe, upper), sUp = Math.sqrt(targetUp);
    var netInB = liquidity * (sUp - s), outA = liquidity * (1 / s - 1 / sUp);
    if (!(netInB > 0) || !(outA > 0)) return null;
    var grossInB = netInB / (1 - fee / 10000);
    result = Object.assign(base, { direction: "buy-a", inToken: "B", netIn: netInB,
      grossIn: grossInB, amountOut: outA, outToken: "A",
      profitInB: outA * pe - grossInB,
      postTradeSpot: targetUp, targetPrice: targetUp, hitBoundary: pe >= upper });
  } else {
    var targetDn = Math.max(pe, lower), sDn = Math.sqrt(targetDn);
    var netInA = liquidity * (1 / sDn - 1 / s), outB = liquidity * (s - sDn);
    if (!(netInA > 0) || !(outB > 0)) return null;
    var grossInA = netInA / (1 - fee / 10000);
    result = Object.assign(base, { direction: "sell-a", inToken: "A", netIn: netInA,
      grossIn: grossInA, amountOut: outB, outToken: "B",
      profitInB: outB - grossInA * pe,
      postTradeSpot: targetDn, targetPrice: targetDn, hitBoundary: pe <= lower });
  }
  var fields = Object.keys(result);
  for (var j = 0; j < fields.length; j++) {
    var v = result[fields[j]];
    if (typeof v === "number" && !Number.isFinite(v)) return null;
  }
  return result;
}

/* ---------- 78 · CLMM price-impact sizer ---------- */
/* Tools 17, 64 and 66 answer "how big a trade fits my impact cap?"
   for a constant-product pool, a weighted pool and a stableswap pool;
   this answers it for one CLMM range — the last cell of the
   impact-sizer matrix. Tool 42's impact measure has a closed form
   inside one range. Paying B (price rises), with u = s'/s the
   sqrt-price multiple the trade walks to, the effective rate is
   (1 − fee) / (s² · u) against a spot of 1/s², so the impact is
   exactly 1 − (1 − fee)/u and the cap sets u = (1 − fee)/(1 − cap)
   directly. Paying A is the mirror: with v = s'/s the impact is
   1 − v · (1 − fee) and the cap sets v = (1 − cap)/(1 − fee). The
   trade is then rebuilt from that sqrt-price in tool 42's own
   cancellation-free forms, and the tests feed the reported gross
   input through tool 42 itself and assert it lands on the cap.
   Two honest edges, both stated on the tool. First, the fee floor
   the other sizers share: a dust trade's impact is exactly the fee,
   so a cap at or below the fee tier admits no trade at any L.
   Second, the range wall: impact inside one range is bounded —
   walking the price all the way to the edge costs a fixed impact
   (1 − (√lower/√price) · (1 − fee) paying A, mirrored paying B;
   ≈29.29% at zero fee for the symmetric 0.5–2 range at price 1) —
   so a cap at or above that bound sizes the whole range: the
   largest trade is the one that empties the range's out-token,
   its actual impact is that bound rather than your cap, and any
   larger input is simply unfilled in tool 42, not worse-priced.
   An impact cap is therefore not a way to trade past an edge.
   Single range only, floating point like every CLMM tool here.
   Model only: a real CLMM pool's liquidity varies tick by tick
   and its live quote is on the pool page. */
function clmmImpactSizer(liquidityStr, lowerStr, upperStr, priceStr, maxImpactPctStr, feeBps, direction) {
  var raw = [liquidityStr, lowerStr, upperStr, priceStr, maxImpactPctStr, feeBps, direction];
  for (var i = 0; i < raw.length; i++) {
    if (raw[i] == null || String(raw[i]).trim() === "") return null;
  }
  var liquidity = Number(liquidityStr), lower = Number(lowerStr), upper = Number(upperStr);
  var price = Number(priceStr), capPct = Number(maxImpactPctStr), fee = Number(feeBps);
  if (![liquidity, lower, upper, price, capPct].every(Number.isFinite)) return null;
  if (liquidity <= 0 || lower <= 0 || upper <= 0 || price <= 0) return null;
  if (lower >= upper) return null;
  if (price <= lower || price >= upper) return null;
  if (capPct <= 0 || capPct >= 100) return null;
  if (!Number.isInteger(fee) || fee < 0 || fee > 9999) return null;
  if (direction !== "ab" && direction !== "ba") return null;
  var f = fee / 10000, cap = capPct / 100;
  var sa = Math.sqrt(lower), sb = Math.sqrt(upper), s = Math.sqrt(price);
  var spotRate = direction === "ab" ? price : 1 / price;
  var boundaryImpactPct = direction === "ab"
    ? (1 - (sa / s) * (1 - f)) * 100
    : (1 - (1 - f) * (s / sb)) * 100;
  var base = { liquidity: liquidity, lowerPrice: lower, upperPrice: upper,
    price: price, direction: direction,
    inToken: direction === "ab" ? "A" : "B",
    outToken: direction === "ab" ? "B" : "A",
    spotRate: spotRate, maxImpactPct: capPct, feeBps: fee, feePct: fee / 100,
    feeImpactPct: f * 100, boundaryImpactPct: boundaryImpactPct };
  if (cap <= f) {
    return Object.assign(base, { feasible: false, maxAmountIn: 0, netIn: 0,
      amountOut: 0, effectiveRate: 0, actualImpactPct: f * 100,
      newPrice: price, hitBoundary: false });
  }
  var hitBoundary = capPct >= boundaryImpactPct;
  var sNew, netIn, amountOut;
  if (direction === "ab") {
    sNew = hitBoundary ? sa : s * ((1 - cap) / (1 - f));
    amountOut = liquidity * (s - sNew);
    netIn = amountOut / (s * sNew);
  } else {
    sNew = hitBoundary ? sb : s * ((1 - f) / (1 - cap));
    amountOut = liquidity * (1 / s - 1 / sNew);
    netIn = amountOut * s * sNew;
  }
  if (!Number.isFinite(netIn) || !(netIn > 0) || !Number.isFinite(amountOut) || !(amountOut > 0)) return null;
  var grossIn = netIn / (1 - f);
  var effectiveRate = amountOut / grossIn;
  var result = Object.assign(base, {
    feasible: true, maxAmountIn: grossIn, netIn: netIn, amountOut: amountOut,
    effectiveRate: effectiveRate,
    actualImpactPct: (1 - effectiveRate / spotRate) * 100,
    newPrice: sNew * sNew, hitBoundary: hitBoundary
  });
  var fields = Object.keys(result);
  for (var j = 0; j < fields.length; j++) {
    var v = result[fields[j]];
    if (typeof v === "number" && !Number.isFinite(v)) return null;
  }
  return result;
}

/* ---------- 81 · CLMM two-range price-impact sizer ---------- */
/* Tool 78 sizes a trade by an impact cap inside one CLMM range and
   stops honestly at that range's ceiling: a cap above it sizes only
   the range-emptying trade, because the model has no next range to
   continue into. This supplies that next range, the way tool 43 did
   for tool 42's swaps and tool 79 for tool 77's arbitrage. When the
   cap fits inside the first range the answer is tool 78's verbatim
   (asserted field by field) and the second range is never touched.
   Past the first range's ceiling impact the trade crosses: tool 43's
   two-range impact is monotone in the gross input (the price walks
   one way and the average rate can only worsen), so the largest
   input at the cap is bisected on tool 43's own priceImpactPct —
   every candidate is priced by the swap model itself, so the sizer
   cannot drift from it, and the tests feed the reported input back
   through tool 43 and assert it lands on the cap across a sweep.
   Two honest edges, both stated on the tool. First, the second wall:
   impact across two ranges is still bounded — emptying both
   headline ranges costs exactly 50% at zero fee — so a cap at or
   above the two-range ceiling sizes the trade that empties both
   ranges, at the ceiling's impact rather than your cap, and a
   thinner second range lowers that ceiling (a tenth-depth second
   range caps it at ≈33.67%): an impact cap is not a drain cap,
   twice over. Second, the fee floor tool 78 shares with every
   sizer here: a cap at or below the fee tier admits no trade at
   any size, because the measure counts the fee. Two ranges only,
   floating point like every CLMM tool here. Model only: a real
   CLMM pool's liquidity varies tick by tick and its live quote is
   on the pool page. */
function clmmCrossImpactSizer(liquidityStr, lowerStr, upperStr, priceStr, maxImpactPctStr, feeBps, direction, secondLiquidityStr, secondOuterStr) {
  var raw = [liquidityStr, lowerStr, upperStr, priceStr, maxImpactPctStr, feeBps, direction, secondLiquidityStr, secondOuterStr];
  for (var i = 0; i < raw.length; i++) {
    if (raw[i] == null || String(raw[i]).trim() === "") return null;
  }
  var liquidity = Number(liquidityStr), lower = Number(lowerStr), upper = Number(upperStr);
  var price = Number(priceStr), capPct = Number(maxImpactPctStr), fee = Number(feeBps);
  var liquidity2 = Number(secondLiquidityStr), outer = Number(secondOuterStr);
  if (![liquidity, lower, upper, price, capPct, liquidity2, outer].every(Number.isFinite)) return null;
  if (liquidity <= 0 || lower <= 0 || upper <= 0 || price <= 0 || liquidity2 <= 0 || outer <= 0) return null;
  if (lower >= upper) return null;
  if (price <= lower || price >= upper) return null;
  if (capPct <= 0 || capPct >= 100) return null;
  if (!Number.isInteger(fee) || fee < 0 || fee > 9999) return null;
  if (direction !== "ab" && direction !== "ba") return null;
  if (direction === "ab" && !(outer < lower)) return null;
  if (direction === "ba" && !(outer > upper)) return null;
  var single = clmmImpactSizer(liquidityStr, lowerStr, upperStr, priceStr, maxImpactPctStr, feeBps, direction);
  if (single === null) return null;
  var f = fee / 10000;
  var boundary = direction === "ab" ? lower : upper;
  var base = { liquidity: liquidity, lowerPrice: lower, upperPrice: upper,
    secondLiquidity: liquidity2,
    secondLowerPrice: direction === "ab" ? outer : upper,
    secondUpperPrice: direction === "ab" ? lower : outer,
    boundaryPrice: boundary,
    price: price, direction: direction,
    inToken: single.inToken, outToken: single.outToken,
    spotRate: single.spotRate, maxImpactPct: capPct, feeBps: fee, feePct: fee / 100,
    feeImpactPct: single.feeImpactPct, boundaryImpactPct: single.boundaryImpactPct };
  if (!single.feasible) {
    return Object.assign(base, { feasible: false, crossed: false,
      hitBoundary: false, hitSecondBoundary: false, secondBoundaryImpactPct: null,
      maxAmountIn: 0, netIn: 0, feePaid: 0, amountOut: 0, effectiveRate: 0,
      actualImpactPct: single.actualImpactPct, newPrice: price,
      leg1UsedIn: 0, leg1Out: 0, leg2UsedIn: 0, leg2Out: 0 });
  }
  /* The two-range ceiling: the impact of the trade that empties both
     ranges, priced by tool 43 itself at the exact total capacity. */
  var sB = Math.sqrt(boundary), sOut = Math.sqrt(outer);
  var netMax2 = direction === "ab"
    ? liquidity2 * (1 / sOut - 1 / sB)
    : liquidity2 * (sOut - sB);
  var grossTotal = single.maxAmountIn + netMax2 / (1 - f);
  var drain = clmmCrossSwap(liquidityStr, lowerStr, upperStr, priceStr, String(grossTotal), feeBps, direction, secondLiquidityStr, secondOuterStr);
  if (drain === null) return null;
  var ceiling = drain.priceImpactPct;
  var result;
  if (!single.hitBoundary) {
    var inside = clmmCrossSwap(liquidityStr, lowerStr, upperStr, priceStr, String(single.maxAmountIn), feeBps, direction, secondLiquidityStr, secondOuterStr);
    if (inside === null || inside.crossed) return null;
    result = Object.assign(base, { feasible: true, crossed: false,
      hitBoundary: false, hitSecondBoundary: false, secondBoundaryImpactPct: ceiling,
      maxAmountIn: single.maxAmountIn, netIn: single.netIn,
      feePaid: inside.feePaid, amountOut: single.amountOut,
      effectiveRate: single.effectiveRate, actualImpactPct: single.actualImpactPct,
      newPrice: single.newPrice,
      leg1UsedIn: inside.leg1UsedIn, leg1Out: inside.leg1Out, leg2UsedIn: 0, leg2Out: 0 });
  } else if (capPct >= ceiling) {
    result = Object.assign(base, { feasible: true, crossed: true,
      hitBoundary: true, hitSecondBoundary: true, secondBoundaryImpactPct: ceiling,
      maxAmountIn: drain.usedIn, netIn: drain.usedIn - drain.feePaid,
      feePaid: drain.feePaid, amountOut: drain.amountOut,
      effectiveRate: drain.effectiveRate, actualImpactPct: drain.priceImpactPct,
      newPrice: drain.newPrice,
      leg1UsedIn: drain.leg1UsedIn, leg1Out: drain.leg1Out,
      leg2UsedIn: drain.leg2UsedIn, leg2Out: drain.leg2Out });
  } else {
    var loIn = single.maxAmountIn, hiIn = grossTotal;
    for (var k = 0; k < 200; k++) {
      var mid = (loIn + hiIn) / 2;
      var trial = clmmCrossSwap(liquidityStr, lowerStr, upperStr, priceStr, String(mid), feeBps, direction, secondLiquidityStr, secondOuterStr);
      if (trial === null) return null;
      if (trial.priceImpactPct <= capPct) loIn = mid; else hiIn = mid;
    }
    var sized = clmmCrossSwap(liquidityStr, lowerStr, upperStr, priceStr, String(loIn), feeBps, direction, secondLiquidityStr, secondOuterStr);
    if (sized === null || !sized.crossed || sized.leg2UsedIn <= grossTotal * 1e-12) {
      /* The cap sits on (or within float noise of) the first range's
         ceiling: at the shared edge the impact curve is flat to
         float precision, so the bisection can drift a dust-scale
         second leg (≤1e-12 of the total capacity) past the edge.
         That is noise, not a crossing — the sized trade is tool
         78's range-emptying trade. */
      result = Object.assign(base, { feasible: true, crossed: false,
        hitBoundary: true, hitSecondBoundary: false, secondBoundaryImpactPct: ceiling,
        maxAmountIn: single.maxAmountIn, netIn: single.netIn,
        feePaid: single.maxAmountIn - single.netIn, amountOut: single.amountOut,
        effectiveRate: single.effectiveRate, actualImpactPct: single.actualImpactPct,
        newPrice: single.newPrice,
        leg1UsedIn: single.maxAmountIn, leg1Out: single.amountOut, leg2UsedIn: 0, leg2Out: 0 });
    } else {
      result = Object.assign(base, { feasible: true, crossed: true,
        hitBoundary: true, hitSecondBoundary: false, secondBoundaryImpactPct: ceiling,
        maxAmountIn: sized.usedIn, netIn: sized.usedIn - sized.feePaid,
        feePaid: sized.feePaid, amountOut: sized.amountOut,
        effectiveRate: sized.effectiveRate, actualImpactPct: sized.priceImpactPct,
        newPrice: sized.newPrice,
        leg1UsedIn: sized.leg1UsedIn, leg1Out: sized.leg1Out,
        leg2UsedIn: sized.leg2UsedIn, leg2Out: sized.leg2Out });
    }
  }
  var fields = Object.keys(result);
  for (var j = 0; j < fields.length; j++) {
    var v = result[fields[j]];
    if (typeof v === "number" && !Number.isFinite(v)) return null;
  }
  return result;
}

/* ---------- 79 · CLMM two-range arbitrage model ---------- */
/* Tool 77 prices the spot-aligning trade for one CLMM range and
   stops honestly at the range wall: an external price beyond the
   edge caps the trade there, where a real pool continues into the
   next range. This supplies that next range, the way tools 43 and
   45 did for tools 42 and 44. The first leg is tool 77's own capped
   trade to the shared edge; the second leg is the same aligning
   maths run on the second range from the edge toward the external
   price (or its outer edge). The fee is charged on each leg, the
   way tool 43 charges it again on the remainder that crosses, so
   the totals are the two legs' gross inputs summed — and the tests
   prove it: feeding the reported gross input through tool 43's
   two-range swap returns the modelled total output at the modelled
   post-trade price across a sweep. When the external price sits
   inside the first range the answer is tool 77's verbatim (asserted
   field by field) and the second range is never touched. The
   second range's depth scales its leg, not its reach: a tenth-depth
   second range takes a tenth of the trade to the same target price.
   Two honest edges, both stated on the tool. First, the second
   wall: an external price beyond the outer edge caps the combined
   trade at that edge (at the symmetric headline ranges the two legs
   to price 4 are exactly 10,000 in and 5,000 out in total), and
   past it a live pool would need a third range nobody modelled.
   Second, crossing is not free: the fee is charged again on the
   second leg, so a gap that only just clears the first range's fee
   can still lose money once it crosses. Two ranges only, floating
   point like every CLMM tool here. Model only: a real CLMM pool's
   liquidity varies tick by tick and its live quote is on the pool
   page. */
function clmmCrossArbitrage(liquidityStr, lowerStr, upperStr, priceStr, externalPriceStr, feeBps, secondLiquidityStr, secondOuterStr) {
  var raw = [liquidityStr, lowerStr, upperStr, priceStr, externalPriceStr, feeBps, secondLiquidityStr, secondOuterStr];
  for (var i = 0; i < raw.length; i++) {
    if (raw[i] == null || String(raw[i]).trim() === "") return null;
  }
  var liquidity = Number(liquidityStr), lower = Number(lowerStr), upper = Number(upperStr);
  var price = Number(priceStr), pe = Number(externalPriceStr), fee = Number(feeBps);
  var liquidity2 = Number(secondLiquidityStr), outer = Number(secondOuterStr);
  if (![liquidity, lower, upper, price, pe, liquidity2, outer].every(Number.isFinite)) return null;
  if (liquidity <= 0 || lower <= 0 || upper <= 0 || price <= 0 || pe <= 0) return null;
  if (liquidity2 <= 0 || outer <= 0) return null;
  if (lower >= upper) return null;
  if (price <= lower || price >= upper) return null;
  if (!Number.isInteger(fee) || fee < 0 || fee > 9999) return null;
  var f = fee / 10000, s = Math.sqrt(price);
  var noGap = Math.abs(pe - price) / price < 1e-12;
  if (noGap && outer >= lower && outer <= upper) return null;
  if (!noGap && pe > price && !(outer > upper)) return null;
  if (!noGap && pe < price && !(outer < lower)) return null;
  var up = pe > price;
  var boundary = noGap ? null : (up ? upper : lower);
  var base = { liquidity: liquidity, lowerPrice: lower, upperPrice: upper,
    secondLiquidity: liquidity2,
    secondLowerPrice: outer > upper ? upper : outer,
    secondUpperPrice: outer > upper ? outer : lower,
    boundaryPrice: boundary,
    price: price, spotPrice: price, externalPrice: pe,
    priceGapPct: (pe / price - 1) * 100, feeBps: fee, feePct: fee / 100 };
  var result;
  if (noGap) {
    result = Object.assign(base, { direction: "none", inToken: null, outToken: null,
      leg1NetIn: 0, leg1GrossIn: 0, leg1Out: 0, leg2NetIn: 0, leg2GrossIn: 0, leg2Out: 0,
      netIn: 0, grossIn: 0, amountOut: 0, profitInB: 0,
      postTradeSpot: price, targetPrice: price,
      crossed: false, hitBoundary: false, hitSecondBoundary: false });
  } else if (up) {
    var target1 = Math.min(pe, upper), s1 = Math.sqrt(target1);
    var net1 = liquidity * (s1 - s), out1 = liquidity * (1 / s - 1 / s1);
    if (!(net1 > 0) || !(out1 > 0)) return null;
    var gross1 = net1 / (1 - f);
    if (pe <= upper) {
      result = Object.assign(base, { direction: "buy-a", inToken: "B", outToken: "A",
        leg1NetIn: net1, leg1GrossIn: gross1, leg1Out: out1,
        leg2NetIn: 0, leg2GrossIn: 0, leg2Out: 0,
        netIn: net1, grossIn: gross1, amountOut: out1,
        profitInB: out1 * pe - gross1,
        postTradeSpot: target1, targetPrice: target1,
        crossed: false, hitBoundary: false, hitSecondBoundary: false });
    } else {
      var sB = Math.sqrt(upper), target2 = Math.min(pe, outer), s2 = Math.sqrt(target2);
      var net2 = liquidity2 * (s2 - sB), out2 = liquidity2 * (1 / sB - 1 / s2);
      if (!(net2 > 0) || !(out2 > 0)) return null;
      var gross2 = net2 / (1 - f);
      result = Object.assign(base, { direction: "buy-a", inToken: "B", outToken: "A",
        leg1NetIn: net1, leg1GrossIn: gross1, leg1Out: out1,
        leg2NetIn: net2, leg2GrossIn: gross2, leg2Out: out2,
        netIn: net1 + net2, grossIn: gross1 + gross2, amountOut: out1 + out2,
        profitInB: (out1 + out2) * pe - (gross1 + gross2),
        postTradeSpot: target2, targetPrice: target2,
        crossed: true, hitBoundary: true, hitSecondBoundary: pe >= outer });
    }
  } else {
    var target1d = Math.max(pe, lower), s1d = Math.sqrt(target1d);
    var net1d = liquidity * (1 / s1d - 1 / s), out1d = liquidity * (s - s1d);
    if (!(net1d > 0) || !(out1d > 0)) return null;
    var gross1d = net1d / (1 - f);
    if (pe >= lower) {
      result = Object.assign(base, { direction: "sell-a", inToken: "A", outToken: "B",
        leg1NetIn: net1d, leg1GrossIn: gross1d, leg1Out: out1d,
        leg2NetIn: 0, leg2GrossIn: 0, leg2Out: 0,
        netIn: net1d, grossIn: gross1d, amountOut: out1d,
        profitInB: out1d - gross1d * pe,
        postTradeSpot: target1d, targetPrice: target1d,
        crossed: false, hitBoundary: false, hitSecondBoundary: false });
    } else {
      var sBd = Math.sqrt(lower), target2d = Math.max(pe, outer), s2d = Math.sqrt(target2d);
      var net2d = liquidity2 * (1 / s2d - 1 / sBd), out2d = liquidity2 * (sBd - s2d);
      if (!(net2d > 0) || !(out2d > 0)) return null;
      var gross2d = net2d / (1 - f);
      result = Object.assign(base, { direction: "sell-a", inToken: "A", outToken: "B",
        leg1NetIn: net1d, leg1GrossIn: gross1d, leg1Out: out1d,
        leg2NetIn: net2d, leg2GrossIn: gross2d, leg2Out: out2d,
        netIn: net1d + net2d, grossIn: gross1d + gross2d, amountOut: out1d + out2d,
        profitInB: (out1d + out2d) - (gross1d + gross2d) * pe,
        postTradeSpot: target2d, targetPrice: target2d,
        crossed: true, hitBoundary: true, hitSecondBoundary: pe <= outer });
    }
  }
  var fields = Object.keys(result);
  for (var j = 0; j < fields.length; j++) {
    var v = result[fields[j]];
    if (typeof v === "number" && !Number.isFinite(v)) return null;
  }
  return result;
}

/* ---------- 80 · CLMM three-range arbitrage model ---------- */
/* Tool 79 prices the spot-aligning trade across two CLMM ranges and
   stops honestly at the second wall: an external price beyond the
   second range's outer edge caps the combined trade there, where a
   real pool continues into a third range. This supplies that third
   range, the way tool 46 did for tool 43's swap. Everything up to
   the second wall IS tool 79's own clmmCrossArbitrage: a target the
   two ranges can reach returns tool 79's answer verbatim (enteredThird
   false, third leg zero — asserted field by field in the tests), and
   a bigger gap drains the two ranges at exactly tool 79's capped
   legs before the third leg runs the same aligning maths on the
   third range from the second edge toward the external price (or
   its outer edge). The fee is charged on each leg, so the totals
   are the three legs' gross inputs summed — and the tests prove it:
   feeding the reported gross input through tool 46's three-range
   swap returns the modelled total output at the modelled post-trade
   price across a sweep. The third range's depth scales its leg, not
   its reach: a tenth-depth third range takes a tenth of the leg to
   the same target price. Two honest edges, both stated on the tool.
   First, the third wall: an external price beyond the third edge
   caps the combined trade at that edge (at the symmetric headline
   ranges an external price of 9 stops at 8 with exactly 18,284.2712
   in and 6,464.4661 out in total), and past it a live pool would
   need a fourth range nobody modelled. Second, crossing is not
   free: the fee is charged a third time on the third leg, so a gap
   that only just clears two ranges' fees can still lose money once
   it crosses twice. Three ranges only, floating point like every
   CLMM tool here. Model only: a real CLMM pool's liquidity varies
   tick by tick and its live quote is on the pool page. */
function clmmTripleArbitrage(liquidityStr, lowerStr, upperStr, priceStr, externalPriceStr, feeBps, secondLiquidityStr, secondOuterStr, thirdLiquidityStr, thirdOuterStr) {
  var raw3 = [thirdLiquidityStr, thirdOuterStr];
  for (var i = 0; i < raw3.length; i++) {
    if (raw3[i] == null || String(raw3[i]).trim() === "") return null;
  }
  var liquidity3 = Number(thirdLiquidityStr), outer3 = Number(thirdOuterStr);
  if (!Number.isFinite(liquidity3) || !Number.isFinite(outer3)) return null;
  if (liquidity3 <= 0 || outer3 <= 0) return null;
  var prev = clmmCrossArbitrage(liquidityStr, lowerStr, upperStr, priceStr, externalPriceStr, feeBps, secondLiquidityStr, secondOuterStr);
  if (prev === null) return null;
  /* The third range chains on the side the trade travels — and when
     there is no trade (direction none) the side is the one the second
     range sits on, which tool 79's own fields record. Validating only
     the two trading directions would let a none result carry a third
     range anchored on the wrong side or inverted, so the side is
     resolved first and every direction is checked against it. */
  var thirdBelow = prev.direction === "sell-a" ||
    (prev.direction === "none" && prev.secondLowerPrice < prev.lowerPrice);
  if (thirdBelow && !(outer3 < prev.secondLowerPrice)) return null;
  if (!thirdBelow && !(outer3 > prev.secondUpperPrice)) return null;
  var secondBoundary = prev.direction === "buy-a" ? prev.secondUpperPrice
    : prev.direction === "sell-a" ? prev.secondLowerPrice : null;
  var base = { liquidity: prev.liquidity, lowerPrice: prev.lowerPrice, upperPrice: prev.upperPrice,
    secondLiquidity: prev.secondLiquidity,
    secondLowerPrice: prev.secondLowerPrice, secondUpperPrice: prev.secondUpperPrice,
    thirdLiquidity: liquidity3,
    thirdLowerPrice: thirdBelow ? outer3 : prev.secondUpperPrice,
    thirdUpperPrice: thirdBelow ? prev.secondLowerPrice : outer3,
    boundaryPrice: prev.boundaryPrice, secondBoundaryPrice: secondBoundary,
    price: prev.price, spotPrice: prev.spotPrice, externalPrice: prev.externalPrice,
    priceGapPct: prev.priceGapPct, feeBps: prev.feeBps, feePct: prev.feePct };
  var notEntered = Object.assign(base, { direction: prev.direction, inToken: prev.inToken, outToken: prev.outToken,
    leg1NetIn: prev.leg1NetIn, leg1GrossIn: prev.leg1GrossIn, leg1Out: prev.leg1Out,
    leg2NetIn: prev.leg2NetIn, leg2GrossIn: prev.leg2GrossIn, leg2Out: prev.leg2Out,
    leg3NetIn: 0, leg3GrossIn: 0, leg3Out: 0,
    netIn: prev.netIn, grossIn: prev.grossIn, amountOut: prev.amountOut, profitInB: prev.profitInB,
    postTradeSpot: prev.postTradeSpot, targetPrice: prev.targetPrice,
    crossed: prev.crossed, enteredThird: false,
    hitBoundary: prev.hitBoundary, hitSecondBoundary: prev.hitSecondBoundary, hitThirdBoundary: false });
  if (!prev.hitSecondBoundary) {
    return notEntered;
  }
  var f = prev.feeBps / 10000, pe = prev.externalPrice;
  var sB = Math.sqrt(secondBoundary);
  var net3, out3, target3;
  if (prev.direction === "buy-a") {
    target3 = Math.min(pe, outer3);
    var s3 = Math.sqrt(target3);
    net3 = liquidity3 * (s3 - sB); out3 = liquidity3 * (1 / sB - 1 / s3);
  } else {
    target3 = Math.max(pe, outer3);
    var s3d = Math.sqrt(target3);
    net3 = liquidity3 * (1 / s3d - 1 / sB); out3 = liquidity3 * (sB - s3d);
  }
  /* An external price exactly at the second edge (or a hair beyond it,
     below float resolution) drains the second range and stops there:
     the third leg is zero-size and the answer is tool 79's capped one,
     not a rejection. */
  if (!(net3 > 0) || !(out3 > 0)) return notEntered;
  var gross3 = net3 / (1 - f);
  var grossIn = prev.grossIn + gross3, amountOut = prev.amountOut + out3;
  var result = Object.assign(base, { direction: prev.direction, inToken: prev.inToken, outToken: prev.outToken,
    leg1NetIn: prev.leg1NetIn, leg1GrossIn: prev.leg1GrossIn, leg1Out: prev.leg1Out,
    leg2NetIn: prev.leg2NetIn, leg2GrossIn: prev.leg2GrossIn, leg2Out: prev.leg2Out,
    leg3NetIn: net3, leg3GrossIn: gross3, leg3Out: out3,
    netIn: prev.netIn + net3, grossIn: grossIn, amountOut: amountOut,
    profitInB: prev.direction === "buy-a" ? amountOut * pe - grossIn : amountOut - grossIn * pe,
    postTradeSpot: target3, targetPrice: target3,
    crossed: true, enteredThird: true,
    hitBoundary: true, hitSecondBoundary: true,
    hitThirdBoundary: prev.direction === "buy-a" ? pe >= outer3 : pe <= outer3 });
  var fields = Object.keys(result);
  for (var j = 0; j < fields.length; j++) {
    var v = result[fields[j]];
    if (typeof v === "number" && !Number.isFinite(v)) return null;
  }
  return result;
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = { parseScaled, formatScaled, cpSwap, impermanentLoss, lpFees, breakEvenFees, depositPlan, cpWalletPlan, cpSwapExactOut, withdrawPlan, priceToTick, tickToPrice, tickPriceConvert, TICK_MIN, TICK_MAX, clmmRangePlan, clmmRangePlanB, clmmRebalance, clmmWithdrawPlan, clmmPositionAtPrice, clmmVsHold, clmmFeeEstimate, clmmWalletPlan, clmmBreakEven, cpArbitrage, priceImpactSizer, lpTokenValue, zapInPlan, zapInPlanB, zapOutPlan, zapOutPlanB, ilToleranceBand, clmmSymmetricRange, twoHopSwap, twoHopExactOut, splitExactOut, clmmSwap, clmmCrossSwap, clmmSwapExactOut, clmmCrossSwapExactOut, clmmTripleSwap, clmmTripleSwapExactOut, netLpReturn, clmmCapitalEfficiency, poolDepthPlan, cpReservesAfterMove, splitSwap, clmmNetReturn, clmmIlBand, clmmRequiredVolume, cpRequiredVolume, cpBreakEvenDays, clmmZapIn, clmmZapInB, clmmZapOut, clmmZapOutB, slippagePlan, feeCompounding, lvrRoundTrip, poolSeedPlan, clmmRangeProbability, normalCdf, weightedSwap, clmmRangeOrder, stableSwap, stableSwapExactOut, weightedImpermanentLoss, stableDepegLoss, weightedArbitrage, weightedSwapExactOut, weightedImpactSizer, stableArbitrage, stableImpactSizer, curveCompare, curveCompareExactOut, weightedNetReturn, stableNetReturn, weightedRequiredVolume, stableRequiredVolume, weightedBreakEvenDays, stableBreakEvenDays, weightedIlBand, stableIlBand, clmmArbitrage, clmmImpactSizer, clmmCrossArbitrage, clmmTripleArbitrage, clmmCrossImpactSizer, SCALE };
}

if (typeof document !== "undefined") {
  document.addEventListener("DOMContentLoaded", function () {
    /* --- project filtering --- */
    var cards = Array.prototype.slice.call(document.querySelectorAll("#cards .card"));
    var q = document.getElementById("q");
    var status = document.getElementById("filter-status");
    var noResults = document.getElementById("no-results");
    var activeFilter = "all";
    function applyFilter() {
      var needle = (q.value || "").toLowerCase();
      var shown = 0;
      cards.forEach(function (card) {
        var catOk = activeFilter === "all" || (card.getAttribute("data-cat") || "").split(" ").indexOf(activeFilter) !== -1;
        var textOk = !needle || (card.getAttribute("data-name") + " " + card.textContent).toLowerCase().indexOf(needle) !== -1;
        var show = catOk && textOk;
        card.hidden = !show;
        if (show) shown++;
      });
      noResults.hidden = shown !== 0;
      status.textContent = shown + (shown === 1 ? " project shown" : " projects shown");
    }
    q.addEventListener("input", applyFilter);
    document.querySelectorAll(".chip").forEach(function (chip) {
      chip.addEventListener("click", function () {
        document.querySelectorAll(".chip").forEach(function (c) { c.classList.remove("active"); });
        chip.classList.add("active");
        activeFilter = chip.getAttribute("data-filter");
        applyFilter();
      });
    });
    applyFilter();

    function fmt(n, dp) { return n.toLocaleString("en-US", { minimumFractionDigits: dp, maximumFractionDigits: dp }); }

    /* --- swap model --- */
    document.getElementById("swap-calc").addEventListener("submit", function (ev) {
      ev.preventDefault();
      var res = cpSwap(
        document.getElementById("rin").value,
        document.getElementById("rout").value,
        document.getElementById("ain").value,
        document.getElementById("swap-fee").value
      );
      var out = document.getElementById("swap-result");
      out.textContent = res === null
        ? "Enter positive reserves and an amount in (up to 9 decimal places), and a fee in basis points (25 = 0.25%)."
        : "Model output: ≈ " + res.out + " tokens out. Spot price " + fmt(res.spotPrice, 6) +
          ", effective price " + fmt(res.effectivePrice, 6) + " (after the " + fmt(res.feePct, 2) +
          "% fee), price impact incl. fee " + fmt(res.priceImpactPct, 2) +
          "%. A constant-product model, not a live Raydium quote.";
      if (res !== null) document.getElementById("aout").value = res.out;
    });

    /* --- impermanent loss --- */
    document.getElementById("il-calc").addEventListener("submit", function (ev) {
      ev.preventDefault();
      var res = impermanentLoss(document.getElementById("ratio").value, document.getElementById("deposit").value);
      var out = document.getElementById("il-result");
      if (res === null) {
        out.textContent = "Enter a price multiple above 0 — e.g. 2 if one token doubled against the other, 0.5 if it halved.";
      } else if (res.deposit != null) {
        out.textContent = "At a " + res.priceRatio + "x price move: impermanent loss " + fmt(res.ilPct, 2) +
          "% vs holding. Holding would be $" + fmt(res.holdValue, 2) + "; the LP position would be $" +
          fmt(res.lpValue, 2) + " (before fees earned — fees are what compensate for this). Model only.";
      } else {
        out.textContent = "At a " + res.priceRatio + "x price move: impermanent loss " + fmt(res.ilPct, 2) +
          "% vs holding (before fees earned). Model only.";
      }
    });

    /* --- LP fee estimator --- */
    document.getElementById("fee-calc").addEventListener("submit", function (ev) {
      ev.preventDefault();
      var res = lpFees(
        document.getElementById("volume").value,
        document.getElementById("fee-fee").value,
        document.getElementById("your-liq").value,
        document.getElementById("tvl").value
      );
      var out = document.getElementById("fee-result");
      out.textContent = res === null
        ? "Enter a 24h volume, your liquidity and the pool TVL (your liquidity can't exceed the TVL), plus a fee in basis points."
        : "Estimate: your share is " + fmt(res.sharePct, 4) + "% of the pool, earning ≈ $" + fmt(res.dailyFees, 2) +
          "/day (≈ $" + fmt(res.monthlyFees, 2) + "/30 days), a naive APR of " + fmt(res.aprPct, 2) +
          "% if nothing changed. Volume, TVL and prices always change — this is an estimate, not a promise.";
    });

    /* --- break-even fees --- */
    document.getElementById("be-calc").addEventListener("submit", function (ev) {
      ev.preventDefault();
      var res = breakEvenFees(
        document.getElementById("be-ratio").value,
        document.getElementById("be-deposit").value,
        document.getElementById("be-daily").value
      );
      var out = document.getElementById("be-result");
      if (res === null) {
        out.textContent = "Enter a price multiple above 0 and a deposit above $0 — e.g. 2 and 1000. Daily fees, if given, must be $0 or more.";
      } else if (res.feesNeeded === 0) {
        out.textContent = "At a " + res.priceRatio + "x price move there is no impermanent loss to offset — $0 in fees breaks even. Model only.";
      } else if (res.dailyFees != null) {
        out.textContent = "At a " + res.priceRatio + "x price move: holding would be $" + fmt(res.holdValue, 2) +
          ", the LP position $" + fmt(res.lpValue, 2) + " — so you need $" + fmt(res.feesNeeded, 2) + " in fees (" +
          fmt(res.feesNeededPctOfDeposit, 2) + "% of your deposit) to break even. At $" + fmt(res.dailyFees, 2) +
          "/day in fees that is ≈ " + (isFinite(res.daysToBreakEven) ? fmt(res.daysToBreakEven, 1) + " days" : "never — $0/day never offsets a loss") +
          ", if that rate held, which it won't. Model only, not financial advice.";
      } else {
        out.textContent = "At a " + res.priceRatio + "x price move: holding would be $" + fmt(res.holdValue, 2) +
          ", the LP position $" + fmt(res.lpValue, 2) + " — so you need $" + fmt(res.feesNeeded, 2) + " in fees (" +
          fmt(res.feesNeededPctOfDeposit, 2) + "% of your deposit) to break even, before the position counts as ahead. Model only.";
      }
    });

    /* --- deposit planner --- */
    document.getElementById("dep-calc").addEventListener("submit", function (ev) {
      ev.preventDefault();
      var res = depositPlan(
        document.getElementById("dep-ra").value,
        document.getElementById("dep-rb").value,
        document.getElementById("dep-aa").value
      );
      var out = document.getElementById("dep-result");
      out.textContent = res === null
        ? "Enter positive pool reserves for both tokens and a positive amount of token A (up to 9 decimal places)."
        : "Model output: deposit ≈ " + res.requiredB + " of token B alongside your token A (pool ratio ≈ " +
          fmt(res.priceBperA, 6) + " B per A). Your share of the pool after depositing would be ≈ " +
          fmt(res.sharePct, 4) + "%, with model reserves of " + res.newReserveA + " A / " + res.newReserveB +
          " B. A constant-product deposit model, not a live Raydium quote — CLMM deposits are range-based and differ.";
      if (res !== null) document.getElementById("dep-reqb").value = res.requiredB;
    });

    /* --- exact-out swap model --- */
    document.getElementById("xo-calc").addEventListener("submit", function (ev) {
      ev.preventDefault();
      var res = cpSwapExactOut(
        document.getElementById("xo-rin").value,
        document.getElementById("xo-rout").value,
        document.getElementById("xo-aout").value,
        document.getElementById("xo-fee").value
      );
      var out = document.getElementById("xo-result");
      out.textContent = res === null
        ? "Enter positive reserves and a target amount out that is less than the reserve out (a pool can never pay out its whole reserve), plus a fee in basis points (25 = 0.25%)."
        : "Model output: you need ≈ " + res.amountIn + " tokens in to receive that amount out. Spot price " + fmt(res.spotPrice, 6) +
          ", effective price " + fmt(res.effectivePrice, 6) + " (after the " + fmt(res.feePct, 2) +
          "% fee), price impact incl. fee " + fmt(res.priceImpactPct, 2) +
          "%. A constant-product model, not a live Raydium quote.";
      if (res !== null) document.getElementById("xo-ain").value = res.amountIn;
    });

    /* --- withdrawal planner --- */
    document.getElementById("wd-calc").addEventListener("submit", function (ev) {
      ev.preventDefault();
      var res = withdrawPlan(
        document.getElementById("wd-ra").value,
        document.getElementById("wd-rb").value,
        document.getElementById("wd-share").value,
        document.getElementById("wd-pct").value
      );
      var out = document.getElementById("wd-result");
      out.textContent = res === null
        ? "Enter positive pool reserves for both tokens, your share of the pool (above 0 and at most 100%), and a withdrawal percentage (above 0 and at most 100)."
        : "Model output: withdrawing " + fmt(res.withdrawPct, 2) + "% of your position returns ≈ " + res.outA +
          " of token A and ≈ " + res.outB + " of token B — both tokens, in the pool's current ratio. Your remaining share would be ≈ " +
          fmt(res.remainingSharePct, 4) + "%, with model reserves left of " + res.remainingReserveA + " A / " + res.remainingReserveB +
          " B. A constant-product withdrawal model, not a live Raydium quote — CLMM withdrawals are range-based and differ, and no withdrawal fee is modelled.";
      if (res !== null) {
        document.getElementById("wd-outa").value = res.outA;
        document.getElementById("wd-outb").value = res.outB;
      }
    });

    /* --- CLMM range deposit planner --- */
    document.getElementById("clmm-calc").addEventListener("submit", function (ev) {
      ev.preventDefault();
      var res = clmmRangePlan(
        document.getElementById("clmm-price").value,
        document.getElementById("clmm-lower").value,
        document.getElementById("clmm-upper").value,
        document.getElementById("clmm-aa").value
      );
      var out = document.getElementById("clmm-result");
      if (res === null) {
        out.textContent = "Enter a current price and a range with lower below upper (all above 0) and a positive token-A deposit. If the current price is at or above the top of your range, the position would be entirely token B — a token-A deposit can't fund it.";
      } else if (res.status === "below") {
        out.textContent = "Model output: the current price is below your range, so the position is entirely token A — deposit ≈ " +
          fmt(res.amountA, 6) + " of token A and 0 of token B (model liquidity ≈ " + fmt(res.liquidity, 2) +
          "). It earns no fees until the price enters the range (ticks " + res.tickLower + " to " + res.tickUpper +
          ", current tick " + res.tickCurrent + "). A CLMM range model, not a live Raydium quote.";
      } else {
        out.textContent = "Model output: deposit ≈ " + fmt(res.requiredB, 6) + " of token B alongside your token A (model liquidity ≈ " +
          fmt(res.liquidity, 2) + "; token B is ≈ " + fmt(res.bValuePct, 2) + "% of the position's value at the current price). " +
          "Your range is ticks " + res.tickLower + " to " + res.tickUpper + " (current tick " + res.tickCurrent +
          "). A CLMM range model, not a live Raydium quote — real positions snap ticks to the pool's tick spacing.";
      }
      if (res !== null) document.getElementById("clmm-reqb").value = fmt(res.requiredB, 6);
    });

    /* --- CLMM position checker --- */
    document.getElementById("pos-calc").addEventListener("submit", function (ev) {
      ev.preventDefault();
      var res = clmmPositionAtPrice(
        document.getElementById("pos-l").value,
        document.getElementById("pos-lower").value,
        document.getElementById("pos-upper").value,
        document.getElementById("pos-price").value
      );
      var out = document.getElementById("pos-result");
      if (res === null) {
        out.textContent = "Enter a positive model liquidity (Tool 8 reports it for a deposit), a range with lower below upper, and a positive price to check.";
      } else if (res.status === "below") {
        out.textContent = "Model output: at " + fmt(res.price, 6) + " B per A the price is at or below your range, so the position holds ≈ " +
          fmt(res.amountA, 6) + " of token A and 0 of token B (value ≈ " + fmt(res.valueInB, 6) +
          " B) and earns no fees until the price returns into the range. A CLMM position model, not a live Raydium quote.";
      } else if (res.status === "above") {
        out.textContent = "Model output: at " + fmt(res.price, 6) + " B per A the price is at or above your range, so the position holds 0 of token A and ≈ " +
          fmt(res.amountB, 6) + " of token B (value ≈ " + fmt(res.valueInB, 6) +
          " B) and earns no fees until the price returns into the range. A CLMM position model, not a live Raydium quote.";
      } else {
        out.textContent = "Model output: at " + fmt(res.price, 6) + " B per A the position holds ≈ " + fmt(res.amountA, 6) +
          " of token A and ≈ " + fmt(res.amountB, 6) + " of token B (value ≈ " + fmt(res.valueInB, 6) +
          " B; token B is ≈ " + fmt(res.bValuePct, 2) + "% of the value). As price rises inside the range the position converts into token B — that conversion is concentrated liquidity's version of impermanent loss. A CLMM position model, not a live Raydium quote — no fees earned are included.";
      }
      if (res !== null) {
        document.getElementById("pos-outa").value = fmt(res.amountA, 6);
        document.getElementById("pos-outb").value = fmt(res.amountB, 6);
      }
    });

    /* --- slippage / minimum-received --- */
    document.getElementById("slip-calc").addEventListener("submit", function (ev) {
      ev.preventDefault();
      var res = slippagePlan(
        document.getElementById("slip-out").value,
        document.getElementById("slip-bps").value,
        document.getElementById("slip-in").value
      );
      var out = document.getElementById("slip-result");
      if (res === null) {
        out.textContent = "Enter a positive expected amount out (up to 9 decimal places) and a slippage tolerance in basis points (50 = 0.5%, at most 9999). Expected amount in, if given, must be positive too.";
      } else {
        out.textContent = "Model output: at a " + fmt(res.slippagePct, 2) + "% slippage tolerance, your minimum received is ≈ " +
          res.minReceived + " tokens — the expected " + res.expectedOut + " minus a " + res.protectedAmount +
          " tolerance band, floored and never rounded up, so the bound never exceeds the tolerance you set" +
          (res.maxIn != null ? ". Your maximum input is ≈ " + res.maxIn + " tokens (expected in " + res.expectedIn + ", also floored)" : "") +
          ". If the live result would cross either bound, the transaction fails instead of filling badly. A slippage model, not a live Raydium quote.";
      }
      if (res !== null) document.getElementById("slip-min").value = res.minReceived;
    });

    /* --- CLMM tick / price converter --- */
    document.getElementById("tick-calc").addEventListener("submit", function (ev) {
      ev.preventDefault();
      var res = tickPriceConvert(
        document.getElementById("tick-price").value,
        document.getElementById("tick-spacing").value
      );
      var out = document.getElementById("tick-result");
      function fp(x) { return x === null ? "—" : String(parseFloat(x.toPrecision(10))); }
      if (res === null) {
        out.textContent = "Enter a positive price whose tick sits inside the standard CLMM tick range (-443636 to 443636), and — if you add a tick spacing — a positive whole number.";
      } else {
        out.textContent = "Model output: " + fp(res.price) + " B per A is tick " + res.tick +
          " — that tick's own price is " + fp(res.tickPrice) + " (ticks floor, so it sits at or just below your price; the next tick, " +
          res.nextTick + ", is " + fp(res.nextTickPrice) + ")" +
          (res.spacing != null
            ? ". At a tick spacing of " + res.spacing + ", a lower range boundary at this price snaps down to tick " +
              res.snappedDownTick + " (price " + fp(res.snappedDownPrice) + ") and an upper boundary snaps up to tick " +
              res.snappedUpTick + " (price " + fp(res.snappedUpPrice) + ") — pools only accept boundaries on spacing multiples"
            : ". Add your pool's tick spacing to see where a range boundary at this price would snap") +
          ". A tick model, not a live Raydium quote — real positions are quoted with the pool's own ticks on the pool page.";
      }
      if (res !== null) document.getElementById("tick-out").value = res.tick;
    });

    /* --- CLMM position vs holding --- */
    document.getElementById("vh-calc").addEventListener("submit", function (ev) {
      ev.preventDefault();
      var res = clmmVsHold(
        document.getElementById("vh-l").value,
        document.getElementById("vh-lower").value,
        document.getElementById("vh-upper").value,
        document.getElementById("vh-entry").value,
        document.getElementById("vh-check").value
      );
      var out = document.getElementById("vh-result");
      if (res === null) {
        out.textContent = "Enter a positive model liquidity (Tool 8 reports it for a deposit), a range with lower below upper, and positive entry and check prices.";
      } else if (Math.abs(res.diffInB) < 1e-12) {
        out.textContent = "Model output: at the check price of " + fmt(res.checkPrice, 6) + " B per A the position is worth exactly what simply holding its entry tokens would be — ≈ " +
          fmt(res.positionValueInB, 6) + " B either way, so $0 in fees is the break-even there. A CLMM position-vs-holding model, not a live Raydium quote.";
      } else {
        out.textContent = "Model output: at " + fmt(res.checkPrice, 6) + " B per A the position holds ≈ " + fmt(res.checkAmountA, 6) +
          " A / " + fmt(res.checkAmountB, 6) + " B, worth ≈ " + fmt(res.positionValueInB, 6) + " B — but simply holding the tokens it started with (" +
          fmt(res.entryAmountA, 6) + " A / " + fmt(res.entryAmountB, 6) + " B at entry) would be worth ≈ " + fmt(res.holdValueInB, 6) +
          " B. That is " + fmt(res.vsHoldPct, 2) + "% vs holding, so the position needs ≈ " + fmt(res.feesNeededInB, 6) +
          " B in fees earned to break even with holding. A CLMM position-vs-holding model, not a live Raydium quote — no fees earned are included.";
      }
      if (res !== null) document.getElementById("vh-fees").value = fmt(res.feesNeededInB, 6);
    });

    document.getElementById("cfee-calc").addEventListener("submit", function (ev) {
      ev.preventDefault();
      var res = clmmFeeEstimate(
        document.getElementById("cfee-l").value,
        document.getElementById("cfee-total").value,
        document.getElementById("cfee-volume").value,
        document.getElementById("cfee-bps").value,
        document.getElementById("cfee-days").value,
        document.getElementById("cfee-inrange").value,
        document.getElementById("cfee-value").value
      );
      var out = document.getElementById("cfee-result");
      if (res === null) {
        out.textContent = "Enter a positive position liquidity, a total active liquidity at least as large, a non-negative daily volume, a fee tier of 0–10,000 bps, a positive number of days, and a time-in-range of 0–100%.";
      } else {
        var msg = "Model output: your liquidity is ≈ " + fmt(res.sharePct, 4) + "% of the active liquidity, so of the pool's ≈ " +
          fmt(res.poolFeesPerDay, 6) + " B in daily fees your in-range share is ≈ " + fmt(res.feesPerDay, 6) + " B per day — ≈ " +
          fmt(res.feesForPeriod, 6) + " B over " + fmt(res.days, 0) + " days at " + fmt(res.inRangePct, 2) + "% time in range.";
        if (res.naiveAprPct !== null) {
          msg += " Against a position value of ≈ " + fmt(res.positionValueInB, 6) + " B that is a naive ≈ " + fmt(res.naiveAprPct, 2) +
            "% APR — it assumes volume, active liquidity and your time in range all hold still, which in a live pool none of them do.";
        }
        out.textContent = msg + " A CLMM fee model, not a live Raydium quote or a yield promise — the total active liquidity is your estimate, and real fees are read on the pool page.";
      }
      if (res !== null) document.getElementById("cfee-out").value = fmt(res.feesPerDay, 6);
    });

    /* --- CLMM wallet-balance deposit planner --- */
    document.getElementById("wp-calc").addEventListener("submit", function (ev) {
      ev.preventDefault();
      var res = clmmWalletPlan(
        document.getElementById("wp-price").value,
        document.getElementById("wp-lower").value,
        document.getElementById("wp-upper").value,
        document.getElementById("wp-bal-a").value,
        document.getElementById("wp-bal-b").value
      );
      var out = document.getElementById("wp-result");
      if (res === null) {
        out.textContent = "Enter a current price and a range with lower below upper (all above 0) and the balances you hold. Inside the range a position needs both tokens, so a zero balance on either side funds nothing; below the range it needs token A, at or above the top it needs token B.";
      } else if (res.status === "below") {
        out.textContent = "Model output: the current price is below your range, so the position is entirely token A — it uses ≈ " +
          fmt(res.usedA, 6) + " of token A and 0 of token B (model liquidity ≈ " + fmt(res.liquidity, 2) +
          "), leaving ≈ " + fmt(res.leftoverB, 6) + " of token B unused. It earns no fees until the price enters the range. A CLMM wallet model, not a live Raydium quote.";
      } else if (res.status === "above") {
        out.textContent = "Model output: the current price is at or above the top of your range, so the position is entirely token B — it uses ≈ " +
          fmt(res.usedB, 6) + " of token B and 0 of token A (model liquidity ≈ " + fmt(res.liquidity, 2) +
          "), leaving ≈ " + fmt(res.leftoverA, 6) + " of token A unused. It earns no fees until the price returns into the range. A CLMM wallet model, not a live Raydium quote.";
      } else {
        out.textContent = "Model output: your balances fund a position with model liquidity ≈ " + fmt(res.liquidity, 2) +
          ", using ≈ " + fmt(res.usedA, 6) + " of token A and ≈ " + fmt(res.usedB, 6) + " of token B" +
          (res.limiting === "both"
            ? " — both balances are used in full, with nothing left over"
            : " — token " + res.limiting + " is the limiting side and is used in full, leaving ≈ " +
              fmt(res.limiting === "A" ? res.leftoverB : res.leftoverA, 6) + " of token " + (res.limiting === "A" ? "B" : "A") + " unused") +
          ". A CLMM wallet model, not a live Raydium quote — real positions snap ticks to the pool's tick spacing.";
      }
      if (res !== null) {
        document.getElementById("wp-out-l").value = fmt(res.liquidity, 6);
      }
    });

    /* --- CLMM break-even days --- */
    document.getElementById("bed-calc").addEventListener("submit", function (ev) {
      ev.preventDefault();
      var res = clmmBreakEven(
        document.getElementById("bed-l").value,
        document.getElementById("bed-lower").value,
        document.getElementById("bed-upper").value,
        document.getElementById("bed-entry").value,
        document.getElementById("bed-check").value,
        document.getElementById("bed-total").value,
        document.getElementById("bed-volume").value,
        document.getElementById("bed-bps").value,
        document.getElementById("bed-inrange").value
      );
      var out = document.getElementById("bed-result");
      if (res === null) {
        out.textContent = "Enter a positive model liquidity (Tool 8 reports it), a range with lower below upper, positive entry and check prices, a total active liquidity at least as large as yours, a non-negative daily volume, a fee tier of 0–10,000 bps, and a time-in-range of 0–100%.";
      } else if (res.daysToBreakEven === 0) {
        out.textContent = "Model output: at the check price of " + fmt(res.checkPrice, 6) + " B per A there is no gap to close — the position is worth what holding its entry tokens would be (≈ " +
          fmt(res.positionValueInB, 6) + " B either way), so it breaks even with holding at 0 days. A CLMM break-even model, not a live Raydium quote.";
      } else {
        out.textContent = "Model output: at " + fmt(res.checkPrice, 6) + " B per A the position trails holding by ≈ " + fmt(res.feesNeededInB, 6) +
          " B (" + fmt(res.vsHoldPct, 2) + "% vs holding — Tool 12's hurdle). At ≈ " + fmt(res.feesPerDay, 6) + " B per day in fees (your ≈ " +
          fmt(res.sharePct, 4) + "% share of the active liquidity at " + fmt(res.inRangePct, 2) + "% time in range — Tool 13's rate) that gap closes in ≈ " +
          (isFinite(res.daysToBreakEven) ? fmt(res.daysToBreakEven, 2) + " days" : "never — a 0 fee rate never offsets a real gap") +
          ", if that rate held for the whole period, which in a live pool it won't. A CLMM break-even model, not a live Raydium quote or a yield promise.";
      }
      if (res !== null) document.getElementById("bed-out").value = isFinite(res.daysToBreakEven) ? fmt(res.daysToBreakEven, 2) : "never";
    });

    /* --- CP arbitrage model --- */
    document.getElementById("arb-calc").addEventListener("submit", function (ev) {
      ev.preventDefault();
      var res = cpArbitrage(
        document.getElementById("arb-ra").value,
        document.getElementById("arb-rb").value,
        document.getElementById("arb-ext").value,
        document.getElementById("arb-fee").value
      );
      var out = document.getElementById("arb-result");
      if (res === null) {
        out.textContent = "Enter positive reserves for both tokens, a positive external price (B per A), and a fee of 0–9,999 bps.";
        document.getElementById("arb-out").value = "";
      } else if (res.direction === "none") {
        out.textContent = "Model output: the pool's spot price (≈ " + fmt(res.spotPrice, 6) + " B per A) already matches your external price — no arbitrage trade exists at these numbers. A CP arbitrage model, not a live Raydium quote.";
        document.getElementById("arb-out").value = "0";
      } else {
        var dirText = res.direction === "buy-a"
          ? "token A is cheap in this pool vs your external price: pay ≈ " + fmt(res.grossIn, 6) + " B in (≈ " + fmt(res.netIn, 6) + " B reaches the pool after the fee) and take ≈ " + fmt(res.amountOut, 6) + " A out"
          : "token A is dear in this pool vs your external price: pay ≈ " + fmt(res.grossIn, 6) + " A in (≈ " + fmt(res.netIn, 6) + " A reaches the pool after the fee) and take ≈ " + fmt(res.amountOut, 6) + " B out";
        out.textContent = "Model output: spot ≈ " + fmt(res.spotPrice, 6) + " B per A vs your external " + fmt(res.externalPrice, 6) +
          " (" + (res.priceGapPct >= 0 ? "+" : "") + fmt(res.priceGapPct, 2) + "% gap) — " + dirText +
          ", moving the pool's modelled price to your external price. Modelled profit ≈ " + fmt(res.profitInB, 6) + " B valued at the external price" +
          (res.profitInB <= 0 ? " — not profitable at this fee: the gap is smaller than the fee takes. " : ". ") +
          "A CP arbitrage model against a price you supplied, not a live quote, a found opportunity, or financial advice — real venues have their own depth, fees and costs this model ignores.";
        document.getElementById("arb-out").value = fmt(res.profitInB, 6);
      }
    });

    /* --- price-impact trade sizer --- */
    document.getElementById("pi-calc").addEventListener("submit", function (ev) {
      ev.preventDefault();
      var res = priceImpactSizer(
        document.getElementById("pi-rin").value,
        document.getElementById("pi-rout").value,
        document.getElementById("pi-cap").value,
        document.getElementById("pi-fee").value
      );
      var out = document.getElementById("pi-result");
      if (res === null) {
        out.textContent = "Enter positive reserves for both tokens, a maximum price impact above 0% and below 100%, and a fee of 0–9,999 bps.";
        document.getElementById("pi-out").value = "";
      } else if (!res.feasible) {
        out.textContent = "Model output: no positive trade fits that cap — in this model the pool fee alone contributes ≈ " + fmt(res.feeImpactPct, 4) +
          "% price impact (Tool 1's measure includes the fee), so a cap of " + fmt(res.maxImpactPct, 4) +
          "% can only be met by not trading at all. Raise the cap above the fee, or use a pool with a lower fee tier. A price-impact sizing model, not a live Raydium quote.";
        document.getElementById("pi-out").value = "0";
      } else {
        out.textContent = "Model output: the largest pay-in whose modelled price impact stays at your ≈ " + fmt(res.maxImpactPct, 4) +
          "% cap is ≈ " + fmt(res.maxAmountIn, 6) + " in (≈ " + fmt(res.netIn, 6) + " reaches the pool after the fee), returning ≈ " +
          fmt(res.amountOut, 6) + " out at an effective price of ≈ " + fmt(res.effectivePrice, 6) + " vs a spot of ≈ " + fmt(res.spotPrice, 6) +
          " — any larger trade crosses the cap, any smaller one stays under it. The fee alone accounts for ≈ " + fmt(res.feeImpactPct, 4) +
          "% of that impact before trade size adds the rest. A price-impact sizing model against reserves you supplied, not a live Raydium quote or financial advice.";
        document.getElementById("pi-out").value = fmt(res.maxAmountIn, 6);
      }
    });

    /* --- LP-token share & value --- */
    document.getElementById("lp-calc").addEventListener("submit", function (ev) {
      ev.preventDefault();
      var res = lpTokenValue(
        document.getElementById("lp-ra").value,
        document.getElementById("lp-rb").value,
        document.getElementById("lp-supply").value,
        document.getElementById("lp-yours").value
      );
      var out = document.getElementById("lp-result");
      if (res === null) {
        out.textContent = "Enter positive pool reserves for both tokens, a positive total LP supply, and your LP-token count (above 0 and at most the total supply).";
        document.getElementById("lp-outa").value = "";
        document.getElementById("lp-outb").value = "";
      } else {
        out.textContent = "Model output: your LP tokens are ≈ " + fmt(res.sharePct, 4) + "% of the pool's supply, redeeming for ≈ " +
          res.amountA + " of token A and ≈ " + res.amountB + " of token B — both tokens, in the pool's current ratio — worth ≈ " +
          fmt(res.valueInB, 6) + " B valued at the pool's own spot price (≈ " + fmt(res.priceBperA, 6) +
          " B per A), with model reserves left of " + res.remainingReserveA + " A / " + res.remainingReserveB +
          " B. That share shrinks as new LPs deposit and the supply grows, so re-check the supply rather than trusting the share you had at deposit. An LP-token model, not a live Raydium quote — CLMM positions are range-based and differ, and no withdrawal fee is modelled.";
        document.getElementById("lp-outa").value = res.amountA;
        document.getElementById("lp-outb").value = res.amountB;
      }
    });

    /* --- single-sided zap-in planner --- */
    document.getElementById("zap-calc").addEventListener("submit", function (ev) {
      ev.preventDefault();
      var res = zapInPlan(
        document.getElementById("zap-ra").value,
        document.getElementById("zap-rb").value,
        document.getElementById("zap-aa").value,
        document.getElementById("zap-fee").value
      );
      var out = document.getElementById("zap-result");
      if (res === null) {
        out.textContent = "Enter positive pool reserves for both tokens, a positive amount of token A you hold, and a fee in basis points (25 = 0.25%).";
        document.getElementById("zap-swap").value = "";
        document.getElementById("zap-depb").value = "";
      } else {
        out.textContent = "Model output: swap ≈ " + fmt(res.swapIn, 6) + " of token A for ≈ " + fmt(res.swapOut, 6) +
          " of token B in the same pool, then deposit the remaining ≈ " + fmt(res.depositA, 6) + " A together with that ≈ " +
          fmt(res.depositB, 6) + " B — the split the pool's post-swap ratio requires, so nothing is left over. Your share of the pool would be ≈ " +
          fmt(res.sharePct, 4) + "%, with model reserves after both steps of " + fmt(res.finalReserveA, 2) + " A / " + fmt(res.finalReserveB, 2) +
          " B (the B reserve returns to what it was — the swap's B comes straight back as the deposit). A single-sided entry model in one pool, not a live Raydium quote — no routing or price movement between the two steps is modelled, and CLMM entries are range-based and differ.";
        document.getElementById("zap-swap").value = fmt(res.swapIn, 6);
        document.getElementById("zap-depb").value = fmt(res.depositB, 6);
      }
    });

    /* --- single-sided zap-in planner from token B --- */
    document.getElementById("zapb-calc").addEventListener("submit", function (ev) {
      ev.preventDefault();
      var res = zapInPlanB(
        document.getElementById("zapb-ra").value,
        document.getElementById("zapb-rb").value,
        document.getElementById("zapb-bb").value,
        document.getElementById("zapb-fee").value
      );
      var out = document.getElementById("zapb-result");
      if (res === null) {
        out.textContent = "Enter positive pool reserves for both tokens, a positive amount of token B you hold, and a fee in basis points (25 = 0.25%).";
        document.getElementById("zapb-swap").value = "";
        document.getElementById("zapb-depa").value = "";
      } else {
        out.textContent = "Model output: swap ≈ " + fmt(res.swapIn, 6) + " of token B for ≈ " + fmt(res.swapOut, 6) +
          " of token A in the same pool, then deposit the remaining ≈ " + fmt(res.depositB, 6) + " B together with that ≈ " +
          fmt(res.depositA, 6) + " A — the split the pool's post-swap ratio requires, so nothing is left over. Your share of the pool would be ≈ " +
          fmt(res.sharePct, 4) + "%, with model reserves after both steps of " + fmt(res.finalReserveA, 2) + " A / " + fmt(res.finalReserveB, 2) +
          " B (the A reserve returns to what it was — the swap's A comes straight back as the deposit). A single-sided entry model in one pool, not a live Raydium quote — no routing or price movement between the two steps is modelled, and CLMM entries are range-based and differ.";
        document.getElementById("zapb-swap").value = fmt(res.swapIn, 6);
        document.getElementById("zapb-depa").value = fmt(res.depositA, 6);
      }
    });

    /* --- single-sided zap-out planner --- */
    document.getElementById("zout-calc").addEventListener("submit", function (ev) {
      ev.preventDefault();
      var res = zapOutPlan(
        document.getElementById("zout-ra").value,
        document.getElementById("zout-rb").value,
        document.getElementById("zout-share").value,
        document.getElementById("zout-pct").value,
        document.getElementById("zout-fee").value
      );
      var out = document.getElementById("zout-result");
      if (res === null) {
        out.textContent = "Enter positive pool reserves for both tokens, your share of the pool (above 0 and at most 100%), how much of your position to withdraw (above 0 and at most 100%), and a fee in basis points (25 = 0.25%).";
        document.getElementById("zout-swapout").value = "";
        document.getElementById("zout-totala").value = "";
      } else if (!res.feasible) {
        out.textContent = "Model output: withdrawing " + fmt(res.withdrawPct, 4) + "% of a pool you own " + fmt(res.sharePct, 4) +
          "% of returns ≈ " + res.withdrawA + " of token A and ≈ " + res.withdrawB + " of token B — and leaves no pool behind to swap in, " +
          "so a same-pool zap-out cannot complete: you keep both tokens, or swap the B elsewhere. A single-sided exit model, not a live Raydium quote.";
        document.getElementById("zout-swapout").value = "";
        document.getElementById("zout-totala").value = "";
      } else {
        out.textContent = "Model output: withdraw ≈ " + res.withdrawA + " of token A and ≈ " + res.withdrawB +
          " of token B, then swap all of that B back into token A in the same (now shallower) pool for ≈ " + res.swapOutA +
          " A — leaving you holding ≈ " + res.totalA + " of token A in total. Consolidating costs ≈ " + fmt(res.consolidationCostA, 6) +
          " A (≈ " + fmt(res.consolidationCostPct, 4) + "% of the withdrawn pair's value at the post-withdrawal spot price) in fee plus price impact (≈ " +
          fmt(res.priceImpactPct, 4) + "% on the swap leg) — the cost grows with your share of the pool. A single-sided exit model in one pool, not a live Raydium quote — no routing or price movement between the two steps is modelled, no withdrawal fee is modelled, and CLMM exits are range-based and differ.";
        document.getElementById("zout-swapout").value = res.swapOutA;
        document.getElementById("zout-totala").value = res.totalA;
      }
    });

    /* --- single-sided zap-out planner to token B --- */
    document.getElementById("zob-calc").addEventListener("submit", function (ev) {
      ev.preventDefault();
      var res = zapOutPlanB(
        document.getElementById("zob-ra").value,
        document.getElementById("zob-rb").value,
        document.getElementById("zob-share").value,
        document.getElementById("zob-pct").value,
        document.getElementById("zob-fee").value
      );
      var out = document.getElementById("zob-result");
      if (res === null) {
        out.textContent = "Enter positive pool reserves for both tokens, your share of the pool (above 0 and at most 100%), how much of your position to withdraw (above 0 and at most 100%), and a fee in basis points (25 = 0.25%).";
        document.getElementById("zob-swapout").value = "";
        document.getElementById("zob-totalb").value = "";
      } else if (!res.feasible) {
        out.textContent = "Model output: withdrawing " + fmt(res.withdrawPct, 4) + "% of a pool you own " + fmt(res.sharePct, 4) +
          "% of returns ≈ " + res.withdrawA + " of token A and ≈ " + res.withdrawB + " of token B — and leaves no pool behind to swap in, " +
          "so a same-pool zap-out cannot complete: you keep both tokens, or swap the A elsewhere. A single-sided exit model, not a live Raydium quote.";
        document.getElementById("zob-swapout").value = "";
        document.getElementById("zob-totalb").value = "";
      } else {
        out.textContent = "Model output: withdraw ≈ " + res.withdrawA + " of token A and ≈ " + res.withdrawB +
          " of token B, then swap all of that A back into token B in the same (now shallower) pool for ≈ " + res.swapOutB +
          " B — leaving you holding ≈ " + res.totalB + " of token B in total. Consolidating costs ≈ " + fmt(res.consolidationCostB, 6) +
          " B (≈ " + fmt(res.consolidationCostPct, 4) + "% of the withdrawn pair's value at the post-withdrawal spot price) in fee plus price impact (≈ " +
          fmt(res.priceImpactPct, 4) + "% on the swap leg) — the cost grows with your share of the pool. A single-sided exit model in one pool, not a live Raydium quote — no routing or price movement between the two steps is modelled, no withdrawal fee is modelled, and CLMM exits are range-based and differ.";
        document.getElementById("zob-swapout").value = res.swapOutB;
        document.getElementById("zob-totalb").value = res.totalB;
      }
    });

    /* --- IL tolerance band --- */
    document.getElementById("band-calc").addEventListener("submit", function (ev) {
      ev.preventDefault();
      var res = ilToleranceBand(
        document.getElementById("band-dep").value,
        document.getElementById("band-fees").value
      );
      var out = document.getElementById("band-result");
      if (res === null) {
        out.textContent = "Enter a positive position value (in token B terms) and the fees earned so far (zero or more, in the same token B terms).";
        document.getElementById("band-high").value = "";
        document.getElementById("band-low").value = "";
      } else if (res.downUnbounded) {
        out.textContent = "Model output: fees of ≈ " + fmt(res.feesEarned, 6) + " B are ≈ " + fmt(res.feePctOfDeposit, 4) +
          "% of the ≈ " + fmt(res.deposit, 6) + " B position. On the way up, they cover impermanent loss until the price reaches ≈ " +
          fmt(res.priceRatioHigh, 6) + "× the entry price (+" + fmt(res.moveUpPct, 4) + "%). On the way down there is no edge to report: " +
          "the worst a fall can cost against holding is half the position (the half held in the other token), so fees of 50% or more can never be " +
          "consumed by a fall, however far the price drops. An IL tolerance model for a 50/50 constant-product position, not a live Raydium quote.";
        document.getElementById("band-high").value = fmt(res.priceRatioHigh, 6);
        document.getElementById("band-low").value = "";
      } else {
        out.textContent = "Model output: fees of ≈ " + fmt(res.feesEarned, 6) + " B (≈ " + fmt(res.feePctOfDeposit, 4) +
          "% of the ≈ " + fmt(res.deposit, 6) + " B position) cover impermanent loss until the price reaches ≈ " +
          fmt(res.priceRatioHigh, 6) + "× the entry price (+" + fmt(res.moveUpPct, 4) + "%) or falls to ≈ " + fmt(res.priceRatioLow, 6) +
          "× (−" + fmt(res.moveDownPct, 4) + "%) — the band is symmetric in the square root of the price, which is why the percentage moves differ. Past either edge, impermanent loss " +
          "exceeds the fees earned and holding would have been better. An IL tolerance model for a 50/50 constant-product position, not a live Raydium quote — fees are counted in token B terms outside the pool, with no compounding modelled, and CLMM positions are range-based and differ.";
        document.getElementById("band-high").value = fmt(res.priceRatioHigh, 6);
        document.getElementById("band-low").value = fmt(res.priceRatioLow, 6);
      }
    });

    /* --- CLMM symmetric-range planner --- */
    document.getElementById("sym-calc").addEventListener("submit", function (ev) {
      ev.preventDefault();
      var res = clmmSymmetricRange(
        document.getElementById("sym-price").value,
        document.getElementById("sym-width").value,
        document.getElementById("sym-aa").value,
        document.getElementById("sym-spacing").value
      );
      var out = document.getElementById("sym-result");
      if (res === null) {
        out.textContent = "Enter a positive current price, a width above 0%, and a positive token A deposit (and, if you give a tick spacing, a whole number above 0). Ranges wider than the standard CLMM tick range are rejected.";
        document.getElementById("sym-reqb").value = "";
      } else {
        out.textContent = "Model output: a ±" + fmt(res.widthPct, 4) + "% range around " + fmt(res.currentPrice, 6) +
          " runs from ≈ " + fmt(res.effLower, 6) + " to ≈ " + fmt(res.effUpper, 6) + " B per A (ticks " + res.tickLower + " to " + res.tickUpper + ")" +
          (res.snapped
            ? " — snapped outward to multiples of your pool's tick spacing " + res.spacing + " before planning, because that snapped range is the one a real position would cover (the raw ±% edges were ≈ " + fmt(res.rawLower, 6) + " to ≈ " + fmt(res.rawUpper, 6) + ")"
            : "") +
          ". The room is asymmetric by construction: +" + fmt(res.upRoomPct, 4) + "% up but −" + fmt(res.downRoomPct, 4) +
          "% down, because the range is symmetric in the price multiple, not in percentages. Depositing ≈ " + fmt(res.amountA, 6) +
          " of token A needs ≈ " + fmt(res.requiredB, 6) + " of token B (≈ " + fmt(res.bValuePct, 2) +
          "% of the position's value in B) for model liquidity L ≈ " + fmt(res.liquidity, 4) +
          ". A CLMM range model, not a live Raydium quote — no fees are modelled, and CLMM deposits are range-based, not pool-ratio based.";
        document.getElementById("sym-reqb").value = fmt(res.requiredB, 6);
      }
    });

    /* --- two-hop swap model --- */
    document.getElementById("hop-calc").addEventListener("submit", function (ev) {
      ev.preventDefault();
      var res = twoHopSwap(
        document.getElementById("hop-r1in").value,
        document.getElementById("hop-r1out").value,
        document.getElementById("hop-r2in").value,
        document.getElementById("hop-r2out").value,
        document.getElementById("hop-ain").value,
        document.getElementById("hop-fee1").value,
        document.getElementById("hop-fee2").value
      );
      var out = document.getElementById("hop-result");
      if (res === null) {
        out.textContent = "Enter positive reserves for both pools and a positive amount in (up to 9 decimal places), plus a fee in basis points for each pool (25 = 0.25%). A trade so small that the first hop rounds to zero cannot route.";
        document.getElementById("hop-mid").value = "";
        document.getElementById("hop-aout").value = "";
      } else {
        out.textContent = "Model output: hop 1 pays ≈ " + res.midOut + " of the intermediate token (price impact ≈ " + fmt(res.hop1ImpactPct, 2) +
          "% after its " + fmt(res.fee1Pct, 2) + "% fee), and hop 2 turns that into ≈ " + res.out + " of token C (price impact ≈ " + fmt(res.hop2ImpactPct, 2) +
          "% after its " + fmt(res.fee2Pct, 2) + "% fee). Combined: effective price ≈ " + fmt(res.effectivePrice, 6) + " C per A against a combined spot of ≈ " +
          fmt(res.spotPrice, 6) + " — a combined price impact of ≈ " + fmt(res.priceImpactPct, 2) +
          "%, worse than either hop alone, because each hop pays its own fee and moves its own pool. A two-hop constant-product model, not a live Raydium quote — a real route may cross CLMM pools or other venues, and no routing search is done here: these are the two pools you typed.";
        document.getElementById("hop-mid").value = res.midOut;
        document.getElementById("hop-aout").value = res.out;
      }
    });

    /* --- net LP return --- */
    document.getElementById("net-calc").addEventListener("submit", function (ev) {
      ev.preventDefault();
      var res = netLpReturn(
        document.getElementById("net-ratio").value,
        document.getElementById("net-deposit").value,
        document.getElementById("net-fees").value
      );
      var out = document.getElementById("net-result");
      if (res === null) {
        out.textContent = "Enter a price multiple above 0, a deposit above $0, and the fees you've earned ($0 or more).";
        document.getElementById("net-out").value = "";
      } else {
        var verdictText = res.verdict === "ahead"
          ? "≈ $" + fmt(res.netVsHold, 2) + " ahead of holding (" + fmt(res.netVsHoldPct, 2) + "%)"
          : res.verdict === "behind"
            ? "≈ $" + fmt(-res.netVsHold, 2) + " behind holding (" + fmt(res.netVsHoldPct, 2) + "%)"
            : "exactly even with holding ($0 either way)";
        out.textContent = "Model output: at a " + res.priceRatio + "x price move, holding would be $" + fmt(res.holdValue, 2) +
          " and the LP position $" + fmt(res.lpValue, 2) + " — impermanent loss " + fmt(res.ilPct, 2) + "%, so $" +
          fmt(res.feesNeeded, 2) + " in fees breaks even (Tool 4's hurdle). Adding your $" + fmt(res.feesEarned, 2) +
          " in fees" + (res.feesCoveragePct !== null ? " (" + fmt(res.feesCoveragePct, 2) + "% of that hurdle)" : "") +
          " brings the position to $" + fmt(res.netLpValue, 2) + " — " + verdictText +
          ". Against the $" + fmt(res.deposit, 2) + " deposit itself that is a net return of " + fmt(res.netReturnPct, 2) +
          "% — a different bottom line: a position can be up on its deposit and still behind holding, and only the holding comparison says whether providing liquidity beat doing nothing. A net-return model for a 50/50 constant-product position, not a live Raydium quote — fees are counted in $ terms outside the pool, with no compounding modelled, and CLMM positions are range-based and differ.";
        document.getElementById("net-out").value = fmt(res.netVsHold, 2);
      }
    });

    /* --- CLMM capital efficiency --- */
    document.getElementById("eff-calc").addEventListener("submit", function (ev) {
      ev.preventDefault();
      var res = clmmCapitalEfficiency(
        document.getElementById("eff-l").value,
        document.getElementById("eff-lower").value,
        document.getElementById("eff-upper").value,
        document.getElementById("eff-price").value
      );
      var out = document.getElementById("eff-result");
      if (res === null) {
        out.textContent = "Enter a model liquidity above 0, a lower price below an upper price, and a current price strictly inside the range — at or outside an edge the position is single-sided and out of the market, so capital efficiency is not quoted for it.";
        document.getElementById("eff-out").value = "";
      } else {
        out.textContent = "Model output: at price " + fmt(res.price, 6) + " B per A, liquidity " + fmt(res.liquidity, 4) +
          " inside " + fmt(res.lowerPrice, 6) + "–" + fmt(res.upperPrice, 6) + " needs " + fmt(res.rangeAmountA, 4) + " A + " +
          fmt(res.rangeAmountB, 4) + " B (worth " + fmt(res.rangeValueB, 4) + " B). A full-range position with the same liquidity needs " +
          fmt(res.fullAmountA, 4) + " A + " + fmt(res.fullAmountB, 4) + " B (worth " + fmt(res.fullValueB, 4) +
          " B) — so the ranged position puts the same liquidity to work with " + fmt(res.efficiency, 2) +
          "x less capital (" + fmt(res.capitalSavedPct, 2) + "% less). The honest half: that multiple is not free money — the position earns fees only while the price stays inside the range, and its impermanent loss per unit of liquidity is amplified by the same concentration (Tool 12 measures it). A capital-efficiency model at one price, not a live Raydium quote.";
        document.getElementById("eff-out").value = fmt(res.efficiency, 4);
      }
    });

    /* --- pool depth planner --- */
    document.getElementById("depth-calc").addEventListener("submit", function (ev) {
      ev.preventDefault();
      var res = poolDepthPlan(
        document.getElementById("depth-ain").value,
        document.getElementById("depth-cap").value,
        document.getElementById("depth-spot").value,
        document.getElementById("depth-fee").value
      );
      var out = document.getElementById("depth-result");
      if (res === null) {
        out.textContent = "Enter a trade amount above 0, a maximum price impact above 0% and below 100%, a spot price above 0 (out per in), and a pool fee in basis points (25 = 0.25%).";
        document.getElementById("depth-rin").value = "";
        document.getElementById("depth-rout").value = "";
      } else if (!res.feasible) {
        out.textContent = "Model output: no depth makes this work — a maximum impact of " + fmt(res.maxImpactPct, 4) +
          "% is at or below the pool's own " + fmt(res.feeImpactPct, 4) + "% fee, and the fee alone counts toward price impact in this measure, " +
          "so even the smallest trade in an infinitely deep pool would exceed the cap. Raise the cap above the fee tier first. A pool depth model, not a live Raydium quote.";
        document.getElementById("depth-rin").value = "";
        document.getElementById("depth-rout").value = "";
      } else {
        out.textContent = "Model output: for a trade of " + fmt(res.amountIn, 6) + " in to stay at a " + fmt(res.maxImpactPct, 4) +
          "% price-impact cap at a spot price of " + fmt(res.spotPrice, 6) + " out per in, the pool needs reserves of ≈ " +
          fmt(res.reserveIn, 4) + " of the input token and ≈ " + fmt(res.reserveOut, 4) + " of the output token (≈ " +
          fmt(res.totalValueIn, 4) + " of the input token in total value to fund). That trade then returns ≈ " + fmt(res.amountOut, 6) +
          " out (effective price ≈ " + fmt(res.effectivePrice, 6) + ", impact ≈ " + fmt(res.actualImpactPct, 4) +
          "%). The depth is sized for one trade at the cap in an untouched pool — repeated same-direction trades each move the price further, and a deeper pool is not a safe pool. A pool depth model, not a live Raydium quote.";
        document.getElementById("depth-rin").value = fmt(res.reserveIn, 4);
        document.getElementById("depth-rout").value = fmt(res.reserveOut, 4);
      }
    });

    /* --- post-move reserves calculator --- */
    document.getElementById("move-calc").addEventListener("submit", function (ev) {
      ev.preventDefault();
      var res = cpReservesAfterMove(
        document.getElementById("move-ra").value,
        document.getElementById("move-rb").value,
        document.getElementById("move-ratio").value
      );
      var out = document.getElementById("move-result");
      if (res === null) {
        out.textContent = "Enter a reserve above 0 for both tokens and a price multiple above 0 (2 = the price of A in B doubles, 0.5 = it halves).";
        document.getElementById("move-na").value = "";
        document.getElementById("move-nb").value = "";
      } else {
        out.textContent = "Model output: the price of A moves from " + fmt(res.startPrice, 6) + " to " + fmt(res.newPrice, 6) +
          " B per A (" + fmt(res.priceRatio, 4) + "x). Arbitrage rebalances the pool to \u2248 " + fmt(res.newReserveA, 4) +
          " A and \u2248 " + fmt(res.newReserveB, 4) + " B — a change of " + fmt(res.deltaA, 4) + " A and " + fmt(res.deltaB, 4) +
          " B, with x\u00d7y=k unchanged. The pool sold the token that rose and bought the one that fell: valued in B at the new price the pool holds \u2248 " +
          fmt(res.lpValueInB, 4) + " against \u2248 " + fmt(res.holdValueInB, 4) + " for simply holding the original reserves — impermanent loss " +
          fmt(res.ilPct, 2) + "% (Tool 2's figure for the same move). The rebalanced reserves are not what you deposited. A post-move reserves model, not a live Raydium quote.";
        document.getElementById("move-na").value = fmt(res.newReserveA, 4);
        document.getElementById("move-nb").value = fmt(res.newReserveB, 4);
      }
    });

    /* --- split-route swap planner --- */
    document.getElementById("split-calc").addEventListener("submit", function (ev) {
      ev.preventDefault();
      var res = splitSwap(
        document.getElementById("split-r1in").value,
        document.getElementById("split-r1out").value,
        document.getElementById("split-r2in").value,
        document.getElementById("split-r2out").value,
        document.getElementById("split-ain").value,
        document.getElementById("split-fee1").value,
        document.getElementById("split-fee2").value
      );
      var out = document.getElementById("split-result");
      if (res === null) {
        out.textContent = "Enter a positive amount in (up to 9 decimal places) and two pools with positive reserves — at least one pool must be able to take the trade — plus each pool's fee in basis points (25 = 0.25%).";
        document.getElementById("split-a1").value = "";
        document.getElementById("split-a2").value = "";
      } else {
        out.textContent = "Model output: split the trade — ≈ " + res.amount1 + " through pool 1 (" + fmt(res.splitPct1, 2) +
          "%) returns ≈ " + res.out1 + ", and ≈ " + res.amount2 + " through pool 2 returns ≈ " + res.out2 +
          ", for ≈ " + res.totalOut + " total. The best single-pool route returns ≈ " + res.bestSingleOut +
          ", so splitting gains ≈ " + fmt(res.gainVsBestSingle, 6) + " in this model. Each leg is Tool 1's own model for that pool. A split-route model over two pools you typed — not a live aggregator quote, not financial advice.";
        document.getElementById("split-a1").value = res.amount1;
        document.getElementById("split-a2").value = res.amount2;
      }
    });

    /* --- CLMM net return --- */
    document.getElementById("cnet-calc").addEventListener("submit", function (ev) {
      ev.preventDefault();
      var res = clmmNetReturn(
        document.getElementById("cnet-l").value,
        document.getElementById("cnet-lower").value,
        document.getElementById("cnet-upper").value,
        document.getElementById("cnet-entry").value,
        document.getElementById("cnet-check").value,
        document.getElementById("cnet-fees").value
      );
      var out = document.getElementById("cnet-result");
      if (res === null) {
        out.textContent = "Enter a positive model liquidity L, a range with lower below upper, entry and check prices above zero, and fees earned of zero or more in token B.";
        document.getElementById("cnet-out").value = "";
      } else {
        out.textContent = "Model output: the position is worth ≈ " + fmt(res.positionValueInB, 6) + " B at the check price against ≈ " +
          fmt(res.holdValueInB, 6) + " B for holding, a hurdle of ≈ " + fmt(res.feesNeededInB, 6) + " B. With ≈ " + fmt(res.feesInB, 6) +
          " B of fees earned, the net value is ≈ " + fmt(res.netValueInB, 6) + " B — " + fmt(res.netVsHoldInB, 6) + " B (" +
          fmt(res.netVsHoldPct, 4) + "%) vs holding, and " + fmt(res.returnOnEntryPct, 4) + "% on the position's ≈ " +
          fmt(res.entryValueInB, 6) + " B entry value" +
          (res.coveragePct === null ? "; at the entry price there is no hurdle to cover." : "; fees cover ≈ " + fmt(res.coveragePct, 2) + "% of the hurdle.") +
          " A CLMM net-return model — not a live quote, not financial advice.";
        document.getElementById("cnet-out").value = fmt(res.netVsHoldInB, 6);
      }
    });

    /* --- CLMM IL tolerance band --- */
    document.getElementById("cband-calc").addEventListener("submit", function (ev) {
      ev.preventDefault();
      var res = clmmIlBand(
        document.getElementById("cband-l").value,
        document.getElementById("cband-lower").value,
        document.getElementById("cband-upper").value,
        document.getElementById("cband-entry").value,
        document.getElementById("cband-fees").value
      );
      var out = document.getElementById("cband-result");
      if (res === null) {
        out.textContent = "Enter a positive model liquidity L, a range with lower below upper, an entry price inside the range, and fees earned of zero or more in token B.";
        document.getElementById("cband-out").value = "";
      } else {
        out.textContent = "Model output: with ≈ " + fmt(res.feesInB, 6) + " B of fees earned, the position stays at or ahead of holding from ≈ " +
          (res.downUnbounded ? "any price down to zero" : fmt(res.priceLow, 6) + " B per A (−" + fmt(res.moveDownPct, 2) + "%" + (res.lowInRange ? ", inside the range" : ", beyond the range's lower edge") + ")") +
          " up to ≈ " + fmt(res.priceHigh, 6) + " B per A (+" + fmt(res.moveUpPct, 2) + "%" + (res.highInRange ? ", inside the range" : ", beyond the range's upper edge") + ")" +
          " around the ≈ " + fmt(res.entryPrice, 6) + " entry price" +
          (res.downUnbounded ? "; no fall, however far, can consume the fees — the most a fall can cost vs holding is the ≈ " + fmt(res.downCapInB, 6) + " B of token B the position held at entry." : ".") +
          " A CLMM tolerance-band model — not a live quote, not financial advice.";
        document.getElementById("cband-out").value = res.downUnbounded ? "0 – " + fmt(res.priceHigh, 6) : fmt(res.priceLow, 6) + " – " + fmt(res.priceHigh, 6);
      }
    });

    document.getElementById("rvol-calc").addEventListener("submit", function (ev) {
      ev.preventDefault();
      var res = clmmRequiredVolume(
        document.getElementById("rvol-l").value,
        document.getElementById("rvol-lower").value,
        document.getElementById("rvol-upper").value,
        document.getElementById("rvol-entry").value,
        document.getElementById("rvol-check").value,
        document.getElementById("rvol-total").value,
        document.getElementById("rvol-bps").value,
        document.getElementById("rvol-days").value,
        document.getElementById("rvol-inrange").value
      );
      var out = document.getElementById("rvol-result");
      if (res === null) {
        out.textContent = "Enter a positive model liquidity L, a range with lower below upper, entry and check prices, total active liquidity of at least your own L, a fee tier between 0 and 10000 bps, a positive number of days, and a time-in-range share between 0 and 100%.";
        document.getElementById("rvol-out").value = "";
      } else if (!res.feasible) {
        out.textContent = "Model output: the position must earn ≈ " + fmt(res.feesNeededInB, 6) + " B of fees to match holding at ≈ " + fmt(res.checkPrice, 6) +
          " B per A — ≈ " + fmt(res.requiredFeesPerDay, 6) + " B per day over " + fmt(res.days, 2) + " days — but at a " + fmt(res.feeBps, 0) +
          " bps fee tier and " + fmt(res.inRangePct, 2) + "% time in range, no pool volume earns that fee: the required volume is not finite. Raise the fee tier, stay in range, or allow more days. A CLMM required-volume model — not a live quote, not financial advice.";
        document.getElementById("rvol-out").value = "not feasible at this fee tier / time in range";
      } else if (res.requiredVolumePerDay === 0) {
        out.textContent = "Model output: at the entry price there is no shortfall vs holding to cover, so the required pool volume is 0 B per day — any fees earned are ahead of holding at that price. A CLMM required-volume model — not a live quote, not financial advice.";
        document.getElementById("rvol-out").value = "0";
      } else {
        out.textContent = "Model output: covering the ≈ " + fmt(res.feesNeededInB, 6) + " B shortfall vs holding at ≈ " + fmt(res.checkPrice, 6) +
          " B per A within " + fmt(res.days, 2) + " days needs ≈ " + fmt(res.requiredFeesPerDay, 6) + " B of fees per day; at a " + fmt(res.feeBps, 0) +
          " bps tier, a " + fmt(res.sharePct, 4) + "% share of active liquidity and " + fmt(res.inRangePct, 2) +
          "% time in range, that means ≈ " + fmt(res.requiredVolumePerDay, 2) + " B of pool volume per day (≈ " + fmt(res.requiredPoolFeesPerDay, 6) +
          " B per day of pool-wide fees). That volume is the whole pool's, not your trades — and no volume is promised. A CLMM required-volume model — not a live quote, not financial advice.";
        document.getElementById("rvol-out").value = fmt(res.requiredVolumePerDay, 2);
      }
    });

    document.getElementById("cpvol-calc").addEventListener("submit", function (ev) {
      ev.preventDefault();
      var res = cpRequiredVolume(
        document.getElementById("cpvol-ratio").value,
        document.getElementById("cpvol-deposit").value,
        document.getElementById("cpvol-your").value,
        document.getElementById("cpvol-tvl").value,
        document.getElementById("cpvol-bps").value,
        document.getElementById("cpvol-days").value
      );
      var out = document.getElementById("cpvol-result");
      if (res === null) {
        out.textContent = "Enter a positive price multiple, a positive deposit, your liquidity no larger than the pool's TVL, a fee tier between 0 and 10000 bps, and a positive number of days.";
        document.getElementById("cpvol-out").value = "";
      } else if (!res.feasible) {
        out.textContent = "Model output: the position must earn ≈ " + fmt(res.feesNeeded, 2) + " of fees to match holding after a " + fmt(res.priceRatio, 4) +
          "× price move — ≈ " + fmt(res.requiredFeesPerDay, 2) + " per day over " + fmt(res.days, 2) + " days — but at a " + fmt(res.feeBps, 0) +
          " bps fee tier, no pool volume earns that fee: the required volume is not finite. Raise the fee tier or allow more days. A constant-product required-volume model — not a live quote, not financial advice.";
        document.getElementById("cpvol-out").value = "not feasible at this fee tier";
      } else if (res.requiredVolumePerDay === 0) {
        out.textContent = "Model output: with no price move there is no shortfall vs holding to cover, so the required pool volume is 0 per day — any fees earned are ahead of holding at that price. A constant-product required-volume model — not a live quote, not financial advice.";
        document.getElementById("cpvol-out").value = "0";
      } else {
        out.textContent = "Model output: covering the ≈ " + fmt(res.feesNeeded, 2) + " shortfall vs holding after a " + fmt(res.priceRatio, 4) +
          "× price move on a " + fmt(res.deposit, 2) + " deposit within " + fmt(res.days, 2) + " days needs ≈ " + fmt(res.requiredFeesPerDay, 2) +
          " of fees per day; at a " + fmt(res.feeBps, 0) + " bps tier and a " + fmt(res.sharePct, 4) +
          "% share of the pool, that means ≈ " + fmt(res.requiredVolumePerDay, 2) + " of pool volume per day (≈ " + fmt(res.requiredPoolFeesPerDay, 2) +
          " per day of pool-wide fees). That volume is the whole pool's, not your trades — and no volume is promised. A constant-product required-volume model — not a live quote, not financial advice.";
        document.getElementById("cpvol-out").value = fmt(res.requiredVolumePerDay, 2);
      }
    });

    document.getElementById("czap-calc").addEventListener("submit", function (ev) {
      ev.preventDefault();
      var res = clmmZapIn(
        document.getElementById("czap-ra").value,
        document.getElementById("czap-rb").value,
        document.getElementById("czap-cur").value,
        document.getElementById("czap-lower").value,
        document.getElementById("czap-upper").value,
        document.getElementById("czap-amt").value,
        document.getElementById("czap-bps").value
      );
      var out = document.getElementById("czap-result");
      if (res === null) {
        out.textContent = "Enter positive reserves for the swap pool, a positive amount of token A held, a fee tier between 0 and 9999 bps, and a CLMM range (lower below upper) at a positive current price. A holding too small for the swap leg to return anything at 9-decimal precision cannot fund a position.";
        document.getElementById("czap-out").value = "";
      } else if (res.status === "below") {
        out.textContent = "Model output: at a current price of " + fmt(res.currentPrice, 4) + " B per A, below your range's lower edge of " + fmt(res.lowerPrice, 4) +
          ", the position is entirely token A — no swap is needed. Deposit all " + fmt(res.depositA, 4) + " A for model liquidity ≈ " + fmt(res.liquidity, 4) +
          "; it earns nothing until the price enters the range. A CLMM zap-in model — not a live quote, not financial advice.";
        document.getElementById("czap-out").value = fmt(res.liquidity, 4);
      } else if (res.status === "above") {
        out.textContent = "Model output: at a current price of " + fmt(res.currentPrice, 4) + " B per A, at or above your range's upper edge of " + fmt(res.upperPrice, 4) +
          ", the position is entirely token B — swap all " + fmt(res.swapIn, 4) + " A in the swap pool for ≈ " + fmt(res.swapOut, 4) +
          " B (price impact ≈ " + fmt(res.swapPriceImpactPct, 2) + "%), then deposit the B alone for model liquidity ≈ " + fmt(res.liquidity, 4) +
          ". It earns nothing until the price falls back into the range. A CLMM zap-in model — not a live quote, not financial advice.";
        document.getElementById("czap-out").value = fmt(res.liquidity, 4);
      } else {
        out.textContent = "Model output: swap ≈ " + fmt(res.swapIn, 4) + " of your " + fmt(res.amountA, 4) + " A in the swap pool at a " + fmt(res.feeBps, 0) +
          " bps tier for ≈ " + fmt(res.swapOut, 4) + " B (price impact ≈ " + fmt(res.swapPriceImpactPct, 2) +
          "%), then deposit the remaining ≈ " + fmt(res.depositA + res.leftoverA, 4) + " A with all of that B — at a price of " + fmt(res.currentPrice, 4) +
          " your range needs ≈ " + fmt(res.ratioBperA, 4) + " B per A deposited. Model liquidity ≈ " + fmt(res.liquidity, 4) +
          "; ≈ " + fmt(res.leftoverA, 6) + " A is left over as dust because the swap leg rounds at 9 decimals. The swap pool and the CLMM position are modelled separately. A CLMM zap-in model — not a live quote, not financial advice.";
        document.getElementById("czap-out").value = fmt(res.liquidity, 4);
      }
    });

    document.getElementById("czapb-calc").addEventListener("submit", function (ev) {
      ev.preventDefault();
      var res = clmmZapInB(
        document.getElementById("czapb-ra").value,
        document.getElementById("czapb-rb").value,
        document.getElementById("czapb-cur").value,
        document.getElementById("czapb-lower").value,
        document.getElementById("czapb-upper").value,
        document.getElementById("czapb-amt").value,
        document.getElementById("czapb-bps").value
      );
      var out = document.getElementById("czapb-result");
      if (res === null) {
        out.textContent = "Enter positive reserves for the swap pool, a positive amount of token B held, a fee tier between 0 and 9999 bps, and a CLMM range (lower below upper) at a positive current price. A holding too small for the swap leg to return anything at 9-decimal precision cannot fund a position.";
        document.getElementById("czapb-out").value = "";
      } else if (res.status === "above") {
        out.textContent = "Model output: at a current price of " + fmt(res.currentPrice, 4) + " B per A, at or above your range's upper edge of " + fmt(res.upperPrice, 4) +
          ", the position is entirely token B — no swap is needed. Deposit all " + fmt(res.depositB, 4) + " B for model liquidity ≈ " + fmt(res.liquidity, 4) +
          "; it earns nothing until the price falls back into the range. A CLMM zap-in-from-B model — not a live quote, not financial advice.";
        document.getElementById("czapb-out").value = fmt(res.liquidity, 4);
      } else if (res.status === "below") {
        out.textContent = "Model output: at a current price of " + fmt(res.currentPrice, 4) + " B per A, at or below your range's lower edge of " + fmt(res.lowerPrice, 4) +
          ", the position is entirely token A — swap all " + fmt(res.swapIn, 4) + " B in the swap pool for ≈ " + fmt(res.swapOut, 4) +
          " A (price impact ≈ " + fmt(res.swapPriceImpactPct, 2) + "%), then deposit the A alone for model liquidity ≈ " + fmt(res.liquidity, 4) +
          ". It earns nothing until the price rises back into the range. A CLMM zap-in-from-B model — not a live quote, not financial advice.";
        document.getElementById("czapb-out").value = fmt(res.liquidity, 4);
      } else {
        out.textContent = "Model output: swap ≈ " + fmt(res.swapIn, 4) + " of your " + fmt(res.amountB, 4) + " B in the swap pool at a " + fmt(res.feeBps, 0) +
          " bps tier for ≈ " + fmt(res.swapOut, 4) + " A (price impact ≈ " + fmt(res.swapPriceImpactPct, 2) +
          "%), then deposit all of that A with the remaining ≈ " + fmt(res.depositB + res.leftoverB, 4) + " B — at a price of " + fmt(res.currentPrice, 4) +
          " your range needs ≈ " + fmt(res.ratioBperA, 4) + " B per A deposited. Model liquidity ≈ " + fmt(res.liquidity, 4) +
          "; ≈ " + fmt(res.leftoverB, 6) + " B is left over as dust because the swap leg rounds at 9 decimals. The swap pool and the CLMM position are modelled separately. A CLMM zap-in-from-B model — not a live quote, not financial advice.";
        document.getElementById("czapb-out").value = fmt(res.liquidity, 4);
      }
    });

    document.getElementById("czout-calc").addEventListener("submit", function (ev) {
      ev.preventDefault();
      var res = clmmZapOut(
        document.getElementById("czout-ra").value,
        document.getElementById("czout-rb").value,
        document.getElementById("czout-l").value,
        document.getElementById("czout-lower").value,
        document.getElementById("czout-upper").value,
        document.getElementById("czout-cur").value,
        document.getElementById("czout-bps").value
      );
      var out = document.getElementById("czout-result");
      if (res === null) {
        out.textContent = "Enter positive reserves for the swap pool, a positive model liquidity L for the position you are closing, a range with lower below upper, a positive exit price, and a fee tier between 0 and 9999 bps. A token-B leg too small to swap at 9-decimal precision cannot be priced.";
        document.getElementById("czout-out").value = "";
      } else if (res.status === "below") {
        out.textContent = "Model output: at an exit price of " + fmt(res.currentPrice, 4) + " B per A, at or below your range's lower edge of " + fmt(res.lowerPrice, 4) +
          ", the position is entirely token A — closing it returns ≈ " + fmt(res.withdrawA, 4) + " A and no swap is needed, so the consolidation cost is 0. A CLMM zap-out model — not a live quote, not financial advice.";
        document.getElementById("czout-out").value = fmt(res.totalA, 4);
      } else if (res.status === "above") {
        out.textContent = "Model output: at an exit price of " + fmt(res.currentPrice, 4) + " B per A, at or above your range's upper edge of " + fmt(res.upperPrice, 4) +
          ", the position is entirely token B — closing it returns ≈ " + fmt(res.withdrawB, 4) + " B, and swapping all of it in the swap pool at a " + fmt(res.feeBps, 0) +
          " bps tier returns ≈ " + fmt(res.swapOut, 4) + " A (price impact ≈ " + fmt(res.swapPriceImpactPct, 2) +
          "%). Consolidation cost ≈ " + fmt(res.consolidationCostA, 4) + " A — " + fmt(res.consolidationCostPct, 2) +
          "% of the pair's value at the swap pool's spot price. A CLMM zap-out model — not a live quote, not financial advice.";
        document.getElementById("czout-out").value = fmt(res.totalA, 4);
      } else {
        out.textContent = "Model output: closing the position at " + fmt(res.currentPrice, 4) + " B per A returns ≈ " + fmt(res.withdrawA, 4) + " A and ≈ " + fmt(res.withdrawB, 4) +
          " B. Keep the A and swap the B in the swap pool at a " + fmt(res.feeBps, 0) + " bps tier for ≈ " + fmt(res.swapOut, 4) +
          " A (price impact ≈ " + fmt(res.swapPriceImpactPct, 2) + "%), ending with ≈ " + fmt(res.totalA, 4) +
          " A in total. Consolidation cost ≈ " + fmt(res.consolidationCostA, 4) + " A — " + fmt(res.consolidationCostPct, 2) +
          "% of the pair's value at the swap pool's spot price. The swap pool and the CLMM position are modelled separately. A CLMM zap-out model — not a live quote, not financial advice.";
        document.getElementById("czout-out").value = fmt(res.totalA, 4);
      }
    });

    document.getElementById("czob-calc").addEventListener("submit", function (ev) {
      ev.preventDefault();
      var res = clmmZapOutB(
        document.getElementById("czob-ra").value,
        document.getElementById("czob-rb").value,
        document.getElementById("czob-l").value,
        document.getElementById("czob-lower").value,
        document.getElementById("czob-upper").value,
        document.getElementById("czob-cur").value,
        document.getElementById("czob-bps").value
      );
      var out = document.getElementById("czob-result");
      if (res === null) {
        out.textContent = "Enter positive reserves for the swap pool, a positive model liquidity L for the position you are closing, a range with lower below upper, a positive exit price, and a fee tier between 0 and 9999 bps. A token-A leg too small to swap at 9-decimal precision cannot be priced.";
        document.getElementById("czob-out").value = "";
      } else if (res.status === "above") {
        out.textContent = "Model output: at an exit price of " + fmt(res.currentPrice, 4) + " B per A, at or above your range's upper edge of " + fmt(res.upperPrice, 4) +
          ", the position is entirely token B — closing it returns ≈ " + fmt(res.withdrawB, 4) + " B and no swap is needed, so the consolidation cost is 0. A CLMM zap-out-to-B model — not a live quote, not financial advice.";
        document.getElementById("czob-out").value = fmt(res.totalB, 4);
      } else if (res.status === "below") {
        out.textContent = "Model output: at an exit price of " + fmt(res.currentPrice, 4) + " B per A, at or below your range's lower edge of " + fmt(res.lowerPrice, 4) +
          ", the position is entirely token A — closing it returns ≈ " + fmt(res.withdrawA, 4) + " A, and swapping all of it in the swap pool at a " + fmt(res.feeBps, 0) +
          " bps tier returns ≈ " + fmt(res.swapOut, 4) + " B (price impact ≈ " + fmt(res.swapPriceImpactPct, 2) +
          "%). Consolidation cost ≈ " + fmt(res.consolidationCostB, 4) + " B — " + fmt(res.consolidationCostPct, 2) +
          "% of the pair's value at the swap pool's spot price. A CLMM zap-out-to-B model — not a live quote, not financial advice.";
        document.getElementById("czob-out").value = fmt(res.totalB, 4);
      } else {
        out.textContent = "Model output: closing the position at " + fmt(res.currentPrice, 4) + " B per A returns ≈ " + fmt(res.withdrawA, 4) + " A and ≈ " + fmt(res.withdrawB, 4) +
          " B. Keep the B and swap the A in the swap pool at a " + fmt(res.feeBps, 0) + " bps tier for ≈ " + fmt(res.swapOut, 4) +
          " B (price impact ≈ " + fmt(res.swapPriceImpactPct, 2) + "%), ending with ≈ " + fmt(res.totalB, 4) +
          " B in total. Consolidation cost ≈ " + fmt(res.consolidationCostB, 4) + " B — " + fmt(res.consolidationCostPct, 2) +
          "% of the pair's value at the swap pool's spot price. The swap pool and the CLMM position are modelled separately. A CLMM zap-out-to-B model — not a live quote, not financial advice.";
        document.getElementById("czob-out").value = fmt(res.totalB, 4);
      }
    });

    document.getElementById("bdep-calc").addEventListener("submit", function (ev) {
      ev.preventDefault();
      var res = clmmRangePlanB(
        document.getElementById("bdep-cur").value,
        document.getElementById("bdep-lower").value,
        document.getElementById("bdep-upper").value,
        document.getElementById("bdep-ab").value
      );
      var out = document.getElementById("bdep-result");
      if (res === null) {
        out.textContent = "Enter a positive current price, a range with lower below upper, and a positive token-B deposit. At or below the range's lower edge the position is entirely token A, so a token-B deposit cannot fund it.";
        document.getElementById("bdep-out").value = "";
      } else if (res.status === "above") {
        out.textContent = "Model output: at a current price of " + fmt(res.currentPrice, 4) + " B per A, at or above your range's upper edge of " + fmt(res.upperPrice, 4) +
          ", the position is entirely token B — depositing ≈ " + fmt(res.amountB, 4) + " B needs no token A and gives model liquidity ≈ " + fmt(res.liquidity, 4) +
          " (ticks " + res.tickLower + " to " + res.tickUpper + "). It earns no fees until price returns into the range. A CLMM deposit model — not a live quote, not financial advice.";
        document.getElementById("bdep-out").value = fmt(res.requiredA, 4);
      } else {
        out.textContent = "Model output: depositing ≈ " + fmt(res.amountB, 4) + " B at " + fmt(res.currentPrice, 4) +
          " B per A in the range " + fmt(res.lowerPrice, 4) + "–" + fmt(res.upperPrice, 4) + " requires ≈ " + fmt(res.requiredA, 4) +
          " A alongside it (≈ " + fmt(res.aValuePct, 2) + "% of the deposit's value in A) and gives model liquidity ≈ " + fmt(res.liquidity, 4) +
          " (ticks " + res.tickLower + " to " + res.tickUpper + ", current tick " + res.tickCurrent + "). A CLMM deposit model — not a live quote, not financial advice.";
        document.getElementById("bdep-out").value = fmt(res.requiredA, 4);
      }
    });

    document.getElementById("reb-calc").addEventListener("submit", function (ev) {
      ev.preventDefault();
      var res = clmmRebalance(
        document.getElementById("reb-l").value,
        document.getElementById("reb-lower").value,
        document.getElementById("reb-upper").value,
        document.getElementById("reb-cur").value,
        document.getElementById("reb-width").value
      );
      var out = document.getElementById("reb-result");
      if (res === null) {
        out.textContent = "Enter a positive model liquidity, an old range with lower below upper, a positive current price and a new width above 0%. Widths whose re-centred range falls outside the standard CLMM tick range are rejected.";
        document.getElementById("reb-out").value = "";
        return;
      }
      var state = res.curStatus === "in" ? "inside its old range" : (res.curStatus === "below" ? "below its old range, holding only token A" : "above its old range, holding only token B");
      var swapText = res.swapSide === "none"
        ? "No swap is needed — the re-centred position holds exactly the token mix you already have (only the range and its liquidity change)"
        : "Swap ≈ " + fmt(res.swapSellAmount, 4) + " of token " + res.swapSellToken + " for ≈ " + fmt(res.swapBuyAmount, 4) + " of token " + res.swapBuyToken + " at the current spot price (a real swap also pays its fee and price impact — see tools 1, 33 and 34)";
      out.textContent = "Model output: at " + fmt(res.currentPrice, 4) + " B per A your position is " + state + ", holding ≈ " + fmt(res.curA, 4) + " A and ≈ " + fmt(res.curB, 4) +
        " B (worth ≈ " + fmt(res.valueInB, 4) + " B). Re-centred ±" + fmt(res.widthPct, 2) + "% it covers " + fmt(res.newLower, 4) + "–" + fmt(res.newUpper, 4) +
        " (" + fmt(res.upRoomPct, 2) + "% of room up, " + fmt(res.downRoomPct, 2) + "% down) with model liquidity ≈ " + fmt(res.newLiquidity, 4) +
        ", holding ≈ " + fmt(res.targetA, 4) + " A and ≈ " + fmt(res.targetB, 4) + " B — the same total value, split 50/50 at this price. " + swapText +
        ". A CLMM re-centre model, priced at spot — not a live quote, not financial advice.";
      document.getElementById("reb-out").value = fmt(res.newLiquidity, 4);
    });

    document.getElementById("cwd-calc").addEventListener("submit", function (ev) {
      ev.preventDefault();
      var res = clmmWithdrawPlan(
        document.getElementById("cwd-l").value,
        document.getElementById("cwd-lower").value,
        document.getElementById("cwd-upper").value,
        document.getElementById("cwd-price").value,
        document.getElementById("cwd-pct").value
      );
      var out = document.getElementById("cwd-result");
      if (res === null) {
        out.textContent = "Enter a positive model liquidity, a range with lower below upper, a positive price at withdrawal, and a percentage above 0 and at most 100.";
        document.getElementById("cwd-outb").value = "";
        return;
      }
      var state = res.status === "in" ? "inside its range" : (res.status === "below" ? "below its range, holding only token A" : "above its range, holding only token B");
      var left = res.fullClose
        ? "That is a full close — nothing remains in the position"
        : "Left behind: model liquidity ≈ " + fmt(res.remainingLiquidity, 4) + " over the same range, holding ≈ " + fmt(res.remainingA, 4) + " A and ≈ " + fmt(res.remainingB, 4) + " B (worth ≈ " + fmt(res.remainingValueInB, 4) + " B at this price)";
      out.textContent = "Model output: at " + fmt(res.price, 4) + " B per A your position is " + state + ", holding ≈ " + fmt(res.curA, 4) + " A and ≈ " + fmt(res.curB, 4) +
        " B. Withdrawing " + fmt(res.withdrawPct, 2) + "% of its liquidity pays ≈ " + fmt(res.outA, 4) + " A and ≈ " + fmt(res.outB, 4) +
        " B (worth ≈ " + fmt(res.outValueInB, 4) + " B at this price, before any fees the position has earned — a real withdrawal collects those separately). " + left +
        ". A CLMM withdrawal model — not a live quote, not financial advice.";
      document.getElementById("cwd-outb").value = fmt(res.outB, 4);
    });

    document.getElementById("cpw-calc").addEventListener("submit", function (ev) {
      ev.preventDefault();
      var res = cpWalletPlan(
        document.getElementById("cpw-ra").value,
        document.getElementById("cpw-rb").value,
        document.getElementById("cpw-bal-a").value,
        document.getElementById("cpw-bal-b").value
      );
      var out = document.getElementById("cpw-result");
      if (res === null) {
        out.textContent = "Enter positive pool reserves and positive balances of both tokens (up to 9 decimal places) — a constant-product deposit needs both sides, so a zero balance on either side funds nothing.";
        document.getElementById("cpw-outb").value = "";
        return;
      }
      var limitText = res.limiting === "both"
        ? "Your balances are exactly in the pool's ratio, so both sides are used in full"
        : res.limiting === "A"
          ? "Token A is the scarcer side in ratio terms, so it is used in full and some token B is left over"
          : "Token B is the scarcer side in ratio terms, so it caps the deposit and some token A is left over (settling the B leg through tool 5's floored maths can also leave a few smallest units of token B as dust)";
      out.textContent = "Model output: deposit ≈ " + res.usedA + " of token A and ≈ " + res.usedB +
        " of token B (pool ratio ≈ " + fmt(res.priceBperA, 6) + " B per A). " + limitText +
        ". Left in your wallet: ≈ " + res.leftoverA + " A and ≈ " + res.leftoverB +
        " B. Your share of the pool after depositing would be ≈ " + fmt(res.sharePct, 4) +
        "%, with model reserves of " + res.newReserveA + " A / " + res.newReserveB +
        " B. A constant-product wallet-balance deposit model, not a live Raydium quote — not financial advice.";
      document.getElementById("cpw-outb").value = res.usedB;
    });

    document.getElementById("hxo-calc").addEventListener("submit", function (ev) {
      ev.preventDefault();
      var res = twoHopExactOut(
        document.getElementById("hxo-r1in").value,
        document.getElementById("hxo-r1out").value,
        document.getElementById("hxo-r2in").value,
        document.getElementById("hxo-r2out").value,
        document.getElementById("hxo-aout").value,
        document.getElementById("hxo-fee1").value,
        document.getElementById("hxo-fee2").value
      );
      var out = document.getElementById("hxo-result");
      if (res === null) {
        out.textContent = "Enter positive reserves for both pools, a positive target amount of token C that is smaller than pool 2's token-C reserve (and whose intermediate amount is smaller than pool 1's token-M reserve), and a fee of 0–9,999 bps for each pool.";
        document.getElementById("hxo-ain").value = "";
        return;
      }
      out.textContent = "Model output: receiving exactly ≈ " + res.out + " of token C through this route takes ≈ " + res.amountIn +
        " of token A. Hop 2 must first receive ≈ " + res.midIn + " of intermediate token M (hop 2 impact ≈ " + fmt(res.hop2ImpactPct, 4) +
        "% at a " + fmt(res.fee2Pct, 2) + "% fee), and hop 1 must receive the token A above to pay that M out (hop 1 impact ≈ " + fmt(res.hop1ImpactPct, 4) +
        "% at a " + fmt(res.fee1Pct, 2) + "% fee). Combined spot ≈ " + fmt(res.spotPrice, 6) + " C per A, effective ≈ " + fmt(res.effectivePrice, 6) +
        " C per A — a combined price impact of ≈ " + fmt(res.priceImpactPct, 4) +
        "%. Each hop rounds its required input up, so paying the reported amount forward returns at least the target in this model. A two-hop exact-out model over two pools you typed — not a live quote, not financial advice.";
      document.getElementById("hxo-ain").value = res.amountIn;
    });

    document.getElementById("cpbed-calc").addEventListener("submit", function (ev) {
      ev.preventDefault();
      var res = cpBreakEvenDays(
        document.getElementById("cpbed-ratio").value,
        document.getElementById("cpbed-deposit").value,
        document.getElementById("cpbed-volume").value,
        document.getElementById("cpbed-bps").value,
        document.getElementById("cpbed-your").value,
        document.getElementById("cpbed-tvl").value
      );
      var out = document.getElementById("cpbed-result");
      if (res === null) {
        out.textContent = "Enter a positive price multiple, a positive deposit, a pool volume per day of zero or more, your liquidity no larger than the pool's TVL, and a fee tier between 0 and 10000 bps.";
        document.getElementById("cpbed-out").value = "";
      } else if (res.daysToBreakEven === 0) {
        out.textContent = "Model output: with no price move there is no shortfall vs holding to cover, so the break-even time is 0 days — any fees earned are ahead of holding at that price. A constant-product break-even days model — not a live quote, not financial advice.";
        document.getElementById("cpbed-out").value = "0";
      } else if (!isFinite(res.daysToBreakEven)) {
        out.textContent = "Model output: the position must earn ≈ " + fmt(res.feesNeeded, 2) + " of fees to match holding after a " + fmt(res.priceRatio, 4) +
          "× price move on a " + fmt(res.deposit, 2) + " deposit, but at this volume and a " + fmt(res.feeBps, 0) +
          " bps fee tier it earns nothing per day, so it never breaks even. Add volume, raise the fee tier, or increase your share. A constant-product break-even days model — not a live quote, not financial advice.";
        document.getElementById("cpbed-out").value = "never";
      } else {
        out.textContent = "Model output: after a " + fmt(res.priceRatio, 4) + "× price move, a " + fmt(res.deposit, 2) +
          " deposit holds ≈ " + fmt(res.lpValue, 2) + " in the pool vs ≈ " + fmt(res.holdValue, 2) + " held — a shortfall of ≈ " + fmt(res.feesNeeded, 2) +
          " (" + fmt(Math.abs(res.ilPct), 4) + "% vs holding). At ≈ " + fmt(res.dailyFees, 2) + " of fees per day (pool volume × a " + fmt(res.feeBps, 0) +
          " bps tier × your " + fmt(res.sharePct, 4) + "% share), covering that shortfall takes ≈ " + fmt(res.daysToBreakEven, 2) +
          " days — assuming volume, tier, share and price all hold still, which they will not. A constant-product break-even days model — not a live quote, not financial advice.";
        document.getElementById("cpbed-out").value = fmt(res.daysToBreakEven, 2);
      }
    });

    /* --- split-route exact-out model --- */
    document.getElementById("sxo-calc").addEventListener("submit", function (ev) {
      ev.preventDefault();
      var res = splitExactOut(
        document.getElementById("sxo-r1in").value,
        document.getElementById("sxo-r1out").value,
        document.getElementById("sxo-r2in").value,
        document.getElementById("sxo-r2out").value,
        document.getElementById("sxo-aout").value,
        document.getElementById("sxo-fee1").value,
        document.getElementById("sxo-fee2").value
      );
      var out = document.getElementById("sxo-result");
      if (res === null) {
        out.textContent = "Enter an exact amount out wanted (up to 9 decimal places) that the two pools' reserves out can cover between them, and two pools with positive reserves — at least one usable pool — plus each pool's fee in basis points (25 = 0.25%). A target at or above the two reserves out combined can never be paid out, so it is rejected, not priced.";
        document.getElementById("sxo-ain").value = "";
        document.getElementById("sxo-o1").value = "";
        document.getElementById("sxo-o2").value = "";
      } else if (res.bestSingleIn === null) {
        out.textContent = "Model output: no single pool can supply ≈ " + res.totalOut + " — the target is at or above either pool's reserve out — but split across both it takes ≈ " + res.totalIn +
          " in total: ≈ " + res.out1 + " from pool 1 for ≈ " + res.in1 + " in, and ≈ " + res.out2 + " from pool 2 for ≈ " + res.in2 +
          " in. Each leg is priced by Tool 6's own exact-out model for that pool. A split-route exact-out model over two pools you typed — not a live aggregator quote, not financial advice.";
        document.getElementById("sxo-ain").value = res.totalIn;
        document.getElementById("sxo-o1").value = res.out1;
        document.getElementById("sxo-o2").value = res.out2;
      } else {
        out.textContent = "Model output: receiving exactly ≈ " + res.totalOut + " costs ≈ " + res.totalIn +
          " in total when split — ≈ " + res.out1 + " from pool 1 (" + fmt(res.splitPct1, 2) + "% of the target) for ≈ " + res.in1 +
          " in, and ≈ " + res.out2 + " from pool 2 for ≈ " + res.in2 + " in. The cheapest single-pool route costs ≈ " + res.bestSingleIn +
          ", so splitting saves ≈ " + fmt(res.savingVsBestSingle, 6) + " in this model, before the extra leg's network and transaction costs, which are not modelled. Each leg is priced by Tool 6's own exact-out model for that pool. A split-route exact-out model over two pools you typed — not a live aggregator quote, not financial advice.";
        document.getElementById("sxo-ain").value = res.totalIn;
        document.getElementById("sxo-o1").value = res.out1;
        document.getElementById("sxo-o2").value = res.out2;
      }
    });

    /* --- CLMM single-range swap model --- */
    document.getElementById("cswap-calc").addEventListener("submit", function (ev) {
      ev.preventDefault();
      var res = clmmSwap(
        document.getElementById("cswap-liq").value,
        document.getElementById("cswap-lower").value,
        document.getElementById("cswap-upper").value,
        document.getElementById("cswap-price").value,
        document.getElementById("cswap-ain").value,
        document.getElementById("cswap-fee").value,
        document.getElementById("cswap-dir").value
      );
      var out = document.getElementById("cswap-result");
      var inName = res !== null && res.direction === "ba" ? "B" : "A";
      var outName = res !== null && res.direction === "ba" ? "A" : "B";
      if (res === null) {
        out.textContent = "Enter a positive model liquidity L (tool 8 reports it for a deposit), a range with lower below upper, a current price strictly inside the range, a positive amount in, and a fee tier between 0 and 9999 bps. A price at or outside the range holds no two-sided liquidity there, so there is no swap inside it to price.";
        document.getElementById("cswap-out").value = "";
        document.getElementById("cswap-newprice").value = "";
        document.getElementById("cswap-used").value = "";
      } else if (res.hitBoundary) {
        out.textContent = "Model output: paying " + inName + " walks the price to your range's " + (res.direction === "ab" ? "lower" : "upper") + " edge at " + fmt(res.direction === "ab" ? res.lowerPrice : res.upperPrice, 4) +
          " B per A and stops — the range holds no more " + outName + " to pay out. Only ≈ " + fmt(res.usedIn, 4) + " of your " + fmt(res.amountIn, 4) + " " + inName +
          " is used (≈ " + fmt(res.feePaid, 6) + " of it is the fee at a " + fmt(res.feeBps, 0) + " bps tier), returning ≈ " + fmt(res.amountOut, 4) + " " + outName +
          " — every " + outName + " this range holds at the starting price; the remaining ≈ " + fmt(res.unfilledIn, 4) + " " + inName +
          " is unfilled, not absorbed. A real CLMM swap would continue into the next tick range at its own liquidity; this single-range model has no next range. Price impact ≈ " + fmt(res.priceImpactPct, 2) +
          "% against the starting price, fee included. A CLMM single-range swap model — not a live quote, not financial advice.";
        document.getElementById("cswap-out").value = fmt(res.amountOut, 9);
        document.getElementById("cswap-newprice").value = fmt(res.newPrice, 9);
        document.getElementById("cswap-used").value = fmt(res.usedIn, 9);
      } else {
        out.textContent = "Model output: paying ≈ " + fmt(res.usedIn, 4) + " " + inName + " at a " + fmt(res.feeBps, 0) +
          " bps tier (≈ " + fmt(res.feePaid, 6) + " of it is the fee) returns ≈ " + fmt(res.amountOut, 4) + " " + outName +
          " and walks the price from " + fmt(res.price, 4) + " to ≈ " + fmt(res.newPrice, 4) + " B per A — still inside your range. Price impact ≈ " + fmt(res.priceImpactPct, 2) +
          "% against the starting price, fee included, measured the way tool 1 measures it. A CLMM single-range swap model — not a live quote, not financial advice.";
        document.getElementById("cswap-out").value = fmt(res.amountOut, 9);
        document.getElementById("cswap-newprice").value = fmt(res.newPrice, 9);
        document.getElementById("cswap-used").value = fmt(res.usedIn, 9);
      }
    });

    /* --- CLMM two-range swap model --- */
    document.getElementById("xswap-calc").addEventListener("submit", function (ev) {
      ev.preventDefault();
      var res = clmmCrossSwap(
        document.getElementById("xswap-liq").value,
        document.getElementById("xswap-lower").value,
        document.getElementById("xswap-upper").value,
        document.getElementById("xswap-price").value,
        document.getElementById("xswap-ain").value,
        document.getElementById("xswap-fee").value,
        document.getElementById("xswap-dir").value,
        document.getElementById("xswap-liq2").value,
        document.getElementById("xswap-outer").value
      );
      var out = document.getElementById("xswap-result");
      var inName = res !== null && res.direction === "ba" ? "B" : "A";
      var outName = res !== null && res.direction === "ba" ? "A" : "B";
      if (res === null) {
        out.textContent = "Enter a positive model liquidity L for the active range (tool 8 reports it for a deposit), a range with lower below upper, a current price strictly inside it, a positive amount in, a fee tier between 0 and 9999 bps, a positive liquidity for the second range, and its outer edge strictly beyond the shared edge on the side your direction walks toward — below the active range's lower edge when paying token A, above its upper edge when paying token B.";
        document.getElementById("xswap-out").value = "";
        document.getElementById("xswap-newprice").value = "";
        document.getElementById("xswap-used").value = "";
      } else if (!res.crossed) {
        out.textContent = "Model output: paying ≈ " + fmt(res.usedIn, 4) + " " + inName + " at a " + fmt(res.feeBps, 0) +
          " bps tier (≈ " + fmt(res.feePaid, 6) + " of it is the fee) returns ≈ " + fmt(res.amountOut, 4) + " " + outName +
          " and walks the price from " + fmt(res.price, 4) + " to ≈ " + fmt(res.newPrice, 4) + " B per A — the swap never reaches your range's " +
          (res.direction === "ab" ? "lower" : "upper") + " edge at " + fmt(res.boundaryPrice, 4) + ", so the second range is never entered and this is exactly tool 42's single-range answer. Price impact ≈ " + fmt(res.priceImpactPct, 2) +
          "% against the starting price, fee included. A CLMM two-range swap model — not a live quote, not financial advice.";
        document.getElementById("xswap-out").value = fmt(res.amountOut, 9);
        document.getElementById("xswap-newprice").value = fmt(res.newPrice, 9);
        document.getElementById("xswap-used").value = fmt(res.usedIn, 9);
      } else if (res.hitSecondBoundary) {
        out.textContent = "Model output: paying " + inName + " fills the active range to its " + (res.direction === "ab" ? "lower" : "upper") + " edge at " + fmt(res.boundaryPrice, 4) +
          " B per A (≈ " + fmt(res.leg1UsedIn, 4) + " " + inName + " in, ≈ " + fmt(res.leg1Out, 4) + " " + outName + " out), crosses into the second range and fills that one to its outer edge at " +
          fmt(res.direction === "ab" ? res.secondLowerPrice : res.secondUpperPrice, 4) + " too (≈ " + fmt(res.leg2UsedIn, 4) + " " + inName + " in, ≈ " + fmt(res.leg2Out, 4) + " " + outName +
          " out) — two ranges pay out ≈ " + fmt(res.amountOut, 4) + " " + outName + " for ≈ " + fmt(res.usedIn, 4) + " of your " + fmt(res.amountIn, 4) + " " + inName +
          " (≈ " + fmt(res.feePaid, 6) + " of it is the fee at a " + fmt(res.feeBps, 0) + " bps tier), and the remaining ≈ " + fmt(res.unfilledIn, 4) + " " + inName +
          " is unfilled, not absorbed: a real pool would continue into a third range this model does not have. Price impact ≈ " + fmt(res.priceImpactPct, 2) +
          "% against the starting price, fee included. A CLMM two-range swap model — not a live quote, not financial advice.";
        document.getElementById("xswap-out").value = fmt(res.amountOut, 9);
        document.getElementById("xswap-newprice").value = fmt(res.newPrice, 9);
        document.getElementById("xswap-used").value = fmt(res.usedIn, 9);
      } else {
        out.textContent = "Model output: paying " + inName + " fills the active range to its " + (res.direction === "ab" ? "lower" : "upper") + " edge at " + fmt(res.boundaryPrice, 4) +
          " B per A (≈ " + fmt(res.leg1UsedIn, 4) + " " + inName + " in, ≈ " + fmt(res.leg1Out, 4) + " " + outName + " out), then crosses into the second range, where the remaining ≈ " +
          fmt(res.leg2UsedIn, 4) + " " + inName + " returns ≈ " + fmt(res.leg2Out, 4) + " " + outName + " at that range's own liquidity — ≈ " + fmt(res.amountOut, 4) + " " + outName +
          " in total for your ≈ " + fmt(res.usedIn, 4) + " " + inName + " (≈ " + fmt(res.feePaid, 6) + " of it is the fee at a " + fmt(res.feeBps, 0) +
          " bps tier), walking the price to ≈ " + fmt(res.newPrice, 4) + " B per A, still inside the second range. Price impact ≈ " + fmt(res.priceImpactPct, 2) +
          "% against the starting price, fee included. A thinner second range would have walked the price further for the same input — that fall-off is the cliff a single-range model cannot show. A CLMM two-range swap model — not a live quote, not financial advice.";
        document.getElementById("xswap-out").value = fmt(res.amountOut, 9);
        document.getElementById("xswap-newprice").value = fmt(res.newPrice, 9);
        document.getElementById("xswap-used").value = fmt(res.usedIn, 9);
      }
    });

    /* --- CLMM single-range exact-out swap model --- */
    document.getElementById("cxo-calc").addEventListener("submit", function (ev) {
      ev.preventDefault();
      var res = clmmSwapExactOut(
        document.getElementById("cxo-liq").value,
        document.getElementById("cxo-lower").value,
        document.getElementById("cxo-upper").value,
        document.getElementById("cxo-price").value,
        document.getElementById("cxo-aout").value,
        document.getElementById("cxo-fee").value,
        document.getElementById("cxo-dir").value
      );
      var out = document.getElementById("cxo-result");
      var inName = res !== null && res.direction === "ba" ? "B" : "A";
      var outName = res !== null && res.direction === "ba" ? "A" : "B";
      if (res === null) {
        out.textContent = "Enter a positive model liquidity L (tool 8 reports it for a deposit), a range with lower below upper, a current price strictly inside the range, an exact amount out above 0 and no more than this range holds of that token at the current price, and a fee tier between 0 and 9999 bps. A target above the range's holding is rejected, not priced — one range cannot pay out more than it holds.";
        document.getElementById("cxo-ain").value = "";
        document.getElementById("cxo-newprice").value = "";
        document.getElementById("cxo-maxout").value = "";
      } else if (res.hitBoundary) {
        out.textContent = "Model output: receiving exactly " + fmt(res.amountOut, 4) + " " + outName + " takes every " + outName +
          " this range holds at the starting price and walks the price to your range's " + (res.direction === "ab" ? "lower" : "upper") + " edge at " +
          fmt(res.direction === "ab" ? res.lowerPrice : res.upperPrice, 4) + " B per A. You need ≈ " + fmt(res.amountIn, 4) + " " + inName +
          " in (≈ " + fmt(res.feePaid, 6) + " of it is the fee at a " + fmt(res.feeBps, 0) + " bps tier) — exactly tool 42's capped used-in for the same walk. One unit more out has no price inside this range at all. Price impact ≈ " + fmt(res.priceImpactPct, 2) +
          "% against the starting price, fee included. A CLMM single-range exact-out swap model — not a live quote, not financial advice.";
        document.getElementById("cxo-ain").value = fmt(res.amountIn, 9);
        document.getElementById("cxo-newprice").value = fmt(res.newPrice, 9);
        document.getElementById("cxo-maxout").value = fmt(res.maxOut, 9);
      } else {
        out.textContent = "Model output: receiving exactly " + fmt(res.amountOut, 4) + " " + outName + " needs ≈ " + fmt(res.amountIn, 4) + " " + inName +
          " in (≈ " + fmt(res.feePaid, 6) + " of it is the fee at a " + fmt(res.feeBps, 0) + " bps tier), walking the price from " + fmt(res.price, 4) +
          " to ≈ " + fmt(res.newPrice, 4) + " B per A — still inside your range, which holds at most ≈ " + fmt(res.maxOut, 4) + " " + outName +
          " to pay out at the starting price. Price impact ≈ " + fmt(res.priceImpactPct, 2) +
          "% against the starting price, fee included, measured the way tool 1 measures it. Feeding that amount in to tool 42 returns this target. A CLMM single-range exact-out swap model — not a live quote, not financial advice.";
        document.getElementById("cxo-ain").value = fmt(res.amountIn, 9);
        document.getElementById("cxo-newprice").value = fmt(res.newPrice, 9);
        document.getElementById("cxo-maxout").value = fmt(res.maxOut, 9);
      }
    });

    /* --- CLMM two-range exact-out swap model --- */
    document.getElementById("xxo-calc").addEventListener("submit", function (ev) {
      ev.preventDefault();
      var res = clmmCrossSwapExactOut(
        document.getElementById("xxo-liq").value,
        document.getElementById("xxo-lower").value,
        document.getElementById("xxo-upper").value,
        document.getElementById("xxo-price").value,
        document.getElementById("xxo-aout").value,
        document.getElementById("xxo-fee").value,
        document.getElementById("xxo-dir").value,
        document.getElementById("xxo-liq2").value,
        document.getElementById("xxo-outer").value
      );
      var out = document.getElementById("xxo-result");
      var inName = res !== null && res.direction === "ba" ? "B" : "A";
      var outName = res !== null && res.direction === "ba" ? "A" : "B";
      var clear = function () {
        document.getElementById("xxo-ain").value = "";
        document.getElementById("xxo-newprice").value = "";
        document.getElementById("xxo-maxout").value = "";
      };
      var fill = function () {
        document.getElementById("xxo-ain").value = fmt(res.amountIn, 9);
        document.getElementById("xxo-newprice").value = fmt(res.newPrice, 9);
        document.getElementById("xxo-maxout").value = fmt(res.maxOut, 9);
      };
      if (res === null) {
        out.textContent = "Enter a positive model liquidity L for the active range (tool 8 reports it for a deposit), a range with lower below upper, a current price strictly inside it, an exact amount out above 0 and no more than the two ranges hold of that token together, a fee tier between 0 and 9999 bps, a positive liquidity for the second range, and its outer edge strictly beyond the shared edge on the side your direction walks toward — below the active range's lower edge when paying token A, above its upper edge when paying token B. A target above the two ranges' combined holding is rejected, not priced — two ranges cannot pay out more than they hold together.";
        clear();
      } else if (!res.crossed) {
        out.textContent = "Model output: receiving exactly " + fmt(res.amountOut, 4) + " " + outName + " needs ≈ " + fmt(res.amountIn, 4) + " " + inName +
          " in (≈ " + fmt(res.feePaid, 6) + " of it is the fee at a " + fmt(res.feeBps, 0) + " bps tier), walking the price from " + fmt(res.price, 4) +
          " to ≈ " + fmt(res.newPrice, 4) + " B per A — the target fits inside your active range, which holds ≈ " + fmt(res.firstMaxOut, 4) + " " + outName +
          " at the starting price, so the second range is never entered and this is exactly tool 44's single-range answer. Price impact ≈ " + fmt(res.priceImpactPct, 2) +
          "% against the starting price, fee included. A CLMM two-range exact-out swap model — not a live quote, not financial advice.";
        fill();
      } else if (res.hitSecondBoundary) {
        out.textContent = "Model output: receiving exactly " + fmt(res.amountOut, 4) + " " + outName + " takes every " + outName +
          " both ranges hold: the active range pays its ≈ " + fmt(res.leg1Out, 4) + " for ≈ " + fmt(res.leg1In, 4) + " " + inName +
          " in, walking the price to the shared edge at " + fmt(res.boundaryPrice, 4) + " B per A, and the second range pays the remaining ≈ " + fmt(res.leg2Out, 4) +
          " for ≈ " + fmt(res.leg2In, 4) + " " + inName + " in, walking the price on to the outer edge at " +
          fmt(res.direction === "ab" ? res.secondLowerPrice : res.secondUpperPrice, 4) + " — ≈ " + fmt(res.amountIn, 4) + " " + inName +
          " in total (≈ " + fmt(res.feePaid, 6) + " of it is the fee at a " + fmt(res.feeBps, 0) + " bps tier). One unit more out has no price across these two ranges at all. Price impact ≈ " +
          fmt(res.priceImpactPct, 2) + "% against the starting price, fee included. A CLMM two-range exact-out swap model — not a live quote, not financial advice.";
        fill();
      } else {
        out.textContent = "Model output: receiving exactly " + fmt(res.amountOut, 4) + " " + outName + " drains your active range first — its ≈ " + fmt(res.leg1Out, 4) + " " + outName +
          " for ≈ " + fmt(res.leg1In, 4) + " " + inName + " in, walking the price to the shared edge at " + fmt(res.boundaryPrice, 4) +
          " B per A — then takes the remaining ≈ " + fmt(res.leg2Out, 4) + " " + outName + " from the second range for ≈ " + fmt(res.leg2In, 4) + " " + inName +
          " in at that range's own liquidity: ≈ " + fmt(res.amountIn, 4) + " " + inName + " in total (≈ " + fmt(res.feePaid, 6) + " of it is the fee at a " +
          fmt(res.feeBps, 0) + " bps tier), walking the price to ≈ " + fmt(res.newPrice, 4) + " B per A, still inside the second range. The two ranges together hold at most ≈ " +
          fmt(res.maxOut, 4) + " " + outName + ". Price impact ≈ " + fmt(res.priceImpactPct, 2) +
          "% against the starting price, fee included. A thinner second range would have charged more for the same remainder — that fall-off is the cliff a single-range model cannot show. A CLMM two-range exact-out swap model — not a live quote, not financial advice.";
        fill();
      }
    });

    /* --- CLMM three-range swap model --- */
    document.getElementById("tswap-calc").addEventListener("submit", function (ev) {
      ev.preventDefault();
      var res = clmmTripleSwap(
        document.getElementById("tswap-liq").value,
        document.getElementById("tswap-lower").value,
        document.getElementById("tswap-upper").value,
        document.getElementById("tswap-price").value,
        document.getElementById("tswap-ain").value,
        document.getElementById("tswap-fee").value,
        document.getElementById("tswap-dir").value,
        document.getElementById("tswap-liq2").value,
        document.getElementById("tswap-outer").value,
        document.getElementById("tswap-liq3").value,
        document.getElementById("tswap-outer3").value
      );
      var out = document.getElementById("tswap-result");
      var inName = res !== null && res.direction === "ba" ? "B" : "A";
      var outName = res !== null && res.direction === "ba" ? "A" : "B";
      var clear = function () {
        document.getElementById("tswap-out").value = "";
        document.getElementById("tswap-newprice").value = "";
        document.getElementById("tswap-used").value = "";
      };
      var fill = function () {
        document.getElementById("tswap-out").value = fmt(res.amountOut, 9);
        document.getElementById("tswap-newprice").value = fmt(res.newPrice, 9);
        document.getElementById("tswap-used").value = fmt(res.usedIn, 9);
      };
      if (res === null) {
        out.textContent = "Enter a positive model liquidity L for the active range (tool 8 reports it for a deposit), a range with lower below upper, a current price strictly inside it, a positive amount in, a fee tier between 0 and 9999 bps, positive liquidities for the second and third ranges, and each outer edge strictly beyond the previous range's edge on the side your direction walks toward — below the active range's lower edge, then below that, when paying token A; above the upper edge, then above that, when paying token B.";
        clear();
      } else if (!res.enteredThird) {
        out.textContent = "Model output: paying ≈ " + fmt(res.usedIn, 4) + " " + inName + " at a " + fmt(res.feeBps, 0) +
          " bps tier (≈ " + fmt(res.feePaid, 6) + " of it is the fee) returns ≈ " + fmt(res.amountOut, 4) + " " + outName +
          " and walks the price from " + fmt(res.price, 4) + " to ≈ " + fmt(res.newPrice, 4) + " B per A — the swap never fills the second range to its outer edge at " +
          fmt(res.secondBoundaryPrice, 4) + ", so the third range is never entered and this is exactly tool 43's two-range answer. Price impact ≈ " + fmt(res.priceImpactPct, 2) +
          "% against the starting price, fee included. A CLMM three-range swap model — not a live quote, not financial advice.";
        fill();
      } else if (res.hitThirdBoundary) {
        out.textContent = "Model output: paying " + inName + " fills the active range (≈ " + fmt(res.leg1UsedIn, 4) + " " + inName + " in, ≈ " + fmt(res.leg1Out, 4) + " " + outName +
          " out), fills the second range to its outer edge at " + fmt(res.secondBoundaryPrice, 4) + " B per A (≈ " + fmt(res.leg2UsedIn, 4) + " " + inName + " in, ≈ " + fmt(res.leg2Out, 4) + " " + outName +
          " out), then fills the third range to its outer edge at " + fmt(res.direction === "ab" ? res.thirdLowerPrice : res.thirdUpperPrice, 4) + " too (≈ " + fmt(res.leg3UsedIn, 4) + " " + inName + " in, ≈ " + fmt(res.leg3Out, 4) + " " + outName +
          " out) — three ranges pay out ≈ " + fmt(res.amountOut, 4) + " " + outName + " for ≈ " + fmt(res.usedIn, 4) + " of your " + fmt(res.amountIn, 4) + " " + inName +
          " (≈ " + fmt(res.feePaid, 6) + " of it is the fee at a " + fmt(res.feeBps, 0) + " bps tier), and the remaining ≈ " + fmt(res.unfilledIn, 4) + " " + inName +
          " is unfilled, not absorbed: a real pool would continue into a fourth range this model does not have. Price impact ≈ " + fmt(res.priceImpactPct, 2) +
          "% against the starting price, fee included. A CLMM three-range swap model — not a live quote, not financial advice.";
        fill();
      } else {
        out.textContent = "Model output: paying " + inName + " fills the active range (≈ " + fmt(res.leg1UsedIn, 4) + " " + inName + " in, ≈ " + fmt(res.leg1Out, 4) + " " + outName +
          " out) and the second range to its outer edge at " + fmt(res.secondBoundaryPrice, 4) + " B per A (≈ " + fmt(res.leg2UsedIn, 4) + " " + inName + " in, ≈ " + fmt(res.leg2Out, 4) + " " + outName +
          " out), then crosses into the third range, where the remaining ≈ " + fmt(res.leg3UsedIn, 4) + " " + inName + " returns ≈ " + fmt(res.leg3Out, 4) + " " + outName +
          " at that range's own liquidity — ≈ " + fmt(res.amountOut, 4) + " " + outName + " in total for your ≈ " + fmt(res.usedIn, 4) + " " + inName +
          " (≈ " + fmt(res.feePaid, 6) + " of it is the fee at a " + fmt(res.feeBps, 0) + " bps tier), walking the price to ≈ " + fmt(res.newPrice, 4) +
          " B per A, still inside the third range. Price impact ≈ " + fmt(res.priceImpactPct, 2) +
          "% against the starting price, fee included. A thinner third range would have walked the price further for the same input — the ladder thins as price walks away from where it started. A CLMM three-range swap model — not a live quote, not financial advice.";
        fill();
      }
    });

    /* --- CLMM three-range exact-out swap model --- */
    document.getElementById("txo-calc").addEventListener("submit", function (ev) {
      ev.preventDefault();
      var res = clmmTripleSwapExactOut(
        document.getElementById("txo-liq").value,
        document.getElementById("txo-lower").value,
        document.getElementById("txo-upper").value,
        document.getElementById("txo-price").value,
        document.getElementById("txo-aout").value,
        document.getElementById("txo-fee").value,
        document.getElementById("txo-dir").value,
        document.getElementById("txo-liq2").value,
        document.getElementById("txo-outer").value,
        document.getElementById("txo-liq3").value,
        document.getElementById("txo-outer3").value
      );
      var out = document.getElementById("txo-result");
      var inName = res !== null && res.direction === "ba" ? "B" : "A";
      var outName = res !== null && res.direction === "ba" ? "A" : "B";
      var clear = function () {
        document.getElementById("txo-ain").value = "";
        document.getElementById("txo-newprice").value = "";
        document.getElementById("txo-maxout").value = "";
      };
      var fill = function () {
        document.getElementById("txo-ain").value = fmt(res.amountIn, 9);
        document.getElementById("txo-newprice").value = fmt(res.newPrice, 9);
        document.getElementById("txo-maxout").value = fmt(res.maxOut, 9);
      };
      if (res === null) {
        out.textContent = "Enter a positive model liquidity L for the active range (tool 8 reports it for a deposit), a range with lower below upper, a current price strictly inside it, an exact amount out above 0 and no more than the three ranges hold of that token together, a fee tier between 0 and 9999 bps, positive liquidities for the second and third ranges, and each outer edge strictly beyond the previous range's edge on the side your direction walks toward — below the active range's lower edge, then below that, when paying token A; above its upper edge, then above that, when paying token B. A target above the three ranges' combined holding is rejected, not priced — three ranges cannot pay out more than they hold together.";
        clear();
      } else if (!res.enteredThird) {
        out.textContent = "Model output: receiving exactly " + fmt(res.amountOut, 4) + " " + outName + " needs ≈ " + fmt(res.amountIn, 4) + " " + inName +
          " in (≈ " + fmt(res.feePaid, 6) + " of it is the fee at a " + fmt(res.feeBps, 0) + " bps tier), walking the price from " + fmt(res.price, 4) +
          " to ≈ " + fmt(res.newPrice, 4) + " B per A — the target fits inside the first two ranges, which hold ≈ " + fmt(res.firstMaxOut + res.secondMaxOut, 4) + " " + outName +
          " together at the starting price, so the third range is never entered and this is exactly tool 45's two-range answer. Price impact ≈ " + fmt(res.priceImpactPct, 2) +
          "% against the starting price, fee included. A CLMM three-range exact-out swap model — not a live quote, not financial advice.";
        fill();
      } else if (res.hitThirdBoundary) {
        out.textContent = "Model output: receiving exactly " + fmt(res.amountOut, 4) + " " + outName + " takes every " + outName +
          " all three ranges hold: the active range pays its ≈ " + fmt(res.leg1Out, 4) + " for ≈ " + fmt(res.leg1In, 4) + " " + inName +
          " in, the second range pays its ≈ " + fmt(res.leg2Out, 4) + " for ≈ " + fmt(res.leg2In, 4) + " " + inName +
          " in, walking the price to the second edge at " + fmt(res.secondBoundaryPrice, 4) + " B per A, and the third range pays the remaining ≈ " + fmt(res.leg3Out, 4) +
          " for ≈ " + fmt(res.leg3In, 4) + " " + inName + " in, walking the price on to the third range's outer edge at " +
          fmt(res.direction === "ab" ? res.thirdLowerPrice : res.thirdUpperPrice, 4) + " — ≈ " + fmt(res.amountIn, 4) + " " + inName +
          " in total (≈ " + fmt(res.feePaid, 6) + " of it is the fee at a " + fmt(res.feeBps, 0) + " bps tier). One unit more out has no price across these three ranges at all. Price impact ≈ " +
          fmt(res.priceImpactPct, 2) + "% against the starting price, fee included. A CLMM three-range exact-out swap model — not a live quote, not financial advice.";
        fill();
      } else {
        out.textContent = "Model output: receiving exactly " + fmt(res.amountOut, 4) + " " + outName + " drains the first two ranges first — their ≈ " + fmt(res.leg1Out + res.leg2Out, 4) + " " + outName +
          " for ≈ " + fmt(res.leg1In + res.leg2In, 4) + " " + inName + " in, walking the price to the second edge at " + fmt(res.secondBoundaryPrice, 4) +
          " B per A — then takes the remaining ≈ " + fmt(res.leg3Out, 4) + " " + outName + " from the third range for ≈ " + fmt(res.leg3In, 4) + " " + inName +
          " in at that range's own liquidity: ≈ " + fmt(res.amountIn, 4) + " " + inName + " in total (≈ " + fmt(res.feePaid, 6) + " of it is the fee at a " +
          fmt(res.feeBps, 0) + " bps tier), walking the price to ≈ " + fmt(res.newPrice, 4) + " B per A, still inside the third range. The three ranges together hold at most ≈ " +
          fmt(res.maxOut, 4) + " " + outName + ". Price impact ≈ " + fmt(res.priceImpactPct, 2) +
          "% against the starting price, fee included. A thinner third range would have charged more for the same remainder — that fall-off is the cliff a two-range model cannot show. A CLMM three-range exact-out swap model — not a live quote, not financial advice.";
        fill();
      }
    });

    /* --- fee compounding calculator --- */
    document.getElementById("cmp-calc").addEventListener("submit", function (ev) {
      ev.preventDefault();
      var res = feeCompounding(
        document.getElementById("cmp-dep").value,
        document.getElementById("cmp-apr").value,
        document.getElementById("cmp-n").value,
        document.getElementById("cmp-years").value
      );
      var out = document.getElementById("cmp-result");
      if (res === null) {
        out.textContent = "Enter a positive deposit, an APR of zero or more (e.g. the naive APR from tools 3 or 13), a whole number of reinvestments per year between 1 and 36500 (1 = yearly, 12 = monthly, 365 = daily), and a period above 0 and at most 100 years.";
        document.getElementById("cmp-apy").value = "";
        document.getElementById("cmp-final").value = "";
      } else {
        out.textContent = "Model output: reinvesting the fees on ≈ " + fmt(res.deposit, 6) + " at a naive " + fmt(res.aprPct, 4) +
          "% APR, " + fmt(res.compoundsPerYear, 0) + "× a year for " + fmt(res.years, 4) + " year(s), is an effective ≈ " + fmt(res.apyPct, 4) +
          "% APY and grows the position to ≈ " + fmt(res.finalValue, 6) + " — ≈ " + fmt(res.feesEarned, 6) + " of fees. Held outside the pool instead, the same APR gives ≈ " +
          fmt(res.simpleFinal, 6) + ", so compounding adds ≈ " + fmt(res.compoundingGain, 6) + ". That gap assumes the APR never changes on a growing balance, which in a live pool it will — volume, TVL, your share and time in range all move, impermanent loss is not modelled here, and each real reinvestment costs a transaction. A fee compounding model, not a live Raydium yield — not financial advice.";
        document.getElementById("cmp-apy").value = fmt(res.apyPct, 4);
        document.getElementById("cmp-final").value = fmt(res.finalValue, 6);
      }
    });

    /* --- loss-versus-rebalancing round-trip calculator --- */
    document.getElementById("lvr-calc").addEventListener("submit", function (ev) {
      ev.preventDefault();
      var res = lvrRoundTrip(
        document.getElementById("lvr-ra").value,
        document.getElementById("lvr-rb").value,
        document.getElementById("lvr-move").value,
        document.getElementById("lvr-cycles").value
      );
      var out = document.getElementById("lvr-result");
      if (res === null) {
        out.textContent = "Enter positive reserves for both tokens, a price excursion above 0 and at most 10000% (the price rises by that much, then falls straight back), and a whole number of round trips between 1 and 10000.";
        document.getElementById("lvr-per").value = "";
        document.getElementById("lvr-total").value = "";
      } else {
        out.textContent = "Model output: from ≈ " + fmt(res.reserveA, 6) + " A / ≈ " + fmt(res.reserveB, 6) + " B at ≈ " + fmt(res.startPrice, 6) +
          " B per A, one round trip up " + fmt(res.movePct, 4) + "% to ≈ " + fmt(res.topPrice, 6) + " and straight back costs the LP ≈ " + fmt(res.perCycleInB, 6) +
          " B to arbitrageurs — ≈ " + fmt(res.lvrUpInB, 6) + " B on the way up, ≈ " + fmt(res.lvrDownInB, 6) + " B on the way down — ≈ " + fmt(res.perCyclePct, 4) +
          "% of the position's ≈ " + fmt(res.positionValueInB, 6) + " B value per trip, even though the price ends exactly where it started and tool 2's end-price impermanent loss is zero. Over " +
          fmt(res.cycles, 0) + " identical trip(s) that is ≈ " + fmt(res.totalInB, 6) + " B (≈ " + fmt(res.totalPctOfPosition, 4) +
          "% of the starting position value), while the pool's reserves return to where they began. This is gross of fees — arbitrageurs in a live pool pay the swap fee and part of it reaches LPs, offsetting some of this; a real price path is many unequal steps, not identical round trips. A loss-versus-rebalancing model, not live pool data — not financial advice.";
        document.getElementById("lvr-per").value = fmt(res.perCycleInB, 6);
        document.getElementById("lvr-total").value = fmt(res.totalInB, 6);
      }
    });

    /* --- pool seeding / initial-liquidity planner --- */
    document.getElementById("seed-calc").addEventListener("submit", function (ev) {
      ev.preventDefault();
      var res = poolSeedPlan(
        document.getElementById("seed-a").value,
        document.getElementById("seed-b").value,
        document.getElementById("seed-ref").value
      );
      var out = document.getElementById("seed-result");
      if (res === null) {
        out.textContent = "Enter positive amounts for both seed tokens (up to 9 decimal places), and optionally a positive reference price in token B per token A to check the seed ratio against.";
        document.getElementById("seed-price").value = "";
        document.getElementById("seed-lp").value = "";
      } else {
        var gap = "";
        if (res.refDirection === "aligned") {
          gap = " Against your reference price of ≈ " + fmt(res.referencePrice, 6) + " B per A the seed ratio matches, so there is no opening arbitrage gap on that measure.";
        } else if (res.refDirection !== null) {
          gap = " Against your reference price of ≈ " + fmt(res.referencePrice, 6) + " B per A, this seed prices token A ≈ " + fmt(Math.abs(res.spotGapPct), 4) + "% " + res.refDirection +
            " that reference — the pool would open mispriced, and arbitrageurs trade against a gap like that in the first fills, out of the seed (tool 16 sizes that trade on an existing pool). Check the ratio before creating anything.";
        }
        out.textContent = "Model output: seeding ≈ " + fmt(res.amountA, 6) + " A and ≈ " + fmt(res.amountB, 6) + " B sets the pool's opening price at ≈ " + fmt(res.spotPrice, 6) +
          " B per A — the amounts are the price; there is no separate price to choose — and mints ≈ " + res.lpMinted + " LP tokens (the geometric mean √(A×B), floored at 9 dp), so you start with 100% of the pool and each LP token stands for ≈ " +
          fmt(res.perLpA, 6) + " A and ≈ " + fmt(res.perLpB, 6) + " B. The seed is worth ≈ " + fmt(res.totalValueInB, 6) + " B at its own price, split evenly between the two sides by construction." + gap +
          " Program-specific minimum-liquidity locks or burns are not modelled — a live program may keep a small part of the mint unwithdrawable. A pool seeding model, not a live quote — not financial advice.";
        document.getElementById("seed-price").value = fmt(res.spotPrice, 6);
        document.getElementById("seed-lp").value = res.lpMinted;
      }
    });

    /* --- CLMM range probability calculator --- */
    document.getElementById("prob-calc").addEventListener("submit", function (ev) {
      ev.preventDefault();
      var res = clmmRangeProbability(
        document.getElementById("prob-p").value,
        document.getElementById("prob-lo").value,
        document.getElementById("prob-hi").value,
        document.getElementById("prob-vol").value,
        document.getElementById("prob-days").value
      );
      var out = document.getElementById("prob-result");
      if (res === null) {
        out.textContent = "Enter a positive current price, a range with its lower edge below its upper edge, a daily volatility of 0% or more, and a positive number of days.";
        document.getElementById("prob-in").value = "";
        document.getElementById("prob-band").value = "";
      } else if (res.deterministic) {
        out.textContent = "Model output: at 0% daily volatility the modelled price never moves from ≈ " + fmt(res.currentPrice, 6) +
          " B per A, so it ends the period " + (res.probInPct === 100 ? "inside" : "outside") + " the ≈ " + fmt(res.lowerPrice, 6) + " – " + fmt(res.upperPrice, 6) +
          " range with certainty under this model. Real prices move — a zero-volatility answer is the model telling you the input did all the work. A range probability model, not live pool data — not financial advice.";
        document.getElementById("prob-in").value = fmt(res.probInPct, 4) + "%";
        document.getElementById("prob-band").value = fmt(res.sigmaBandLower, 6) + " – " + fmt(res.sigmaBandUpper, 6);
      } else {
        out.textContent = "Model output: if the log price wanders with zero drift at ≈ " + fmt(res.dailyVolPct, 4) + "% daily volatility, after " + fmt(res.days, 2) +
          " day(s) the total one-sigma move is ≈ " + fmt(res.sigma * 100, 4) + "% in log terms (a one-sigma band of ≈ " + fmt(res.sigmaBandLower, 6) + " – " + fmt(res.sigmaBandUpper, 6) +
          " B per A), and the price ends inside the ≈ " + fmt(res.lowerPrice, 6) + " – " + fmt(res.upperPrice, 6) + " range with probability ≈ " + fmt(res.probInPct, 4) +
          "% — ≈ " + fmt(res.probAbovePct, 4) + "% above it and ≈ " + fmt(res.probBelowPct, 4) + "% below it. Ending inside is not staying inside: the price can leave the range and come back, so the share of time actually in range — the figure tools 13, 15 and 31 take as an input — will be lower than this ending probability whenever the path wanders. Zero drift and constant volatility are assumptions doing real work here. A range probability model, not live pool data — not financial advice.";
        document.getElementById("prob-in").value = fmt(res.probInPct, 4) + "%";
        document.getElementById("prob-band").value = fmt(res.sigmaBandLower, 6) + " – " + fmt(res.sigmaBandUpper, 6);
      }
    });

    /* --- weighted-pool swap model --- */
    document.getElementById("wswap-calc").addEventListener("submit", function (ev) {
      ev.preventDefault();
      var res = weightedSwap(
        document.getElementById("wswap-rin").value,
        document.getElementById("wswap-rout").value,
        document.getElementById("wswap-win").value,
        document.getElementById("wswap-ain").value,
        document.getElementById("wswap-fee").value
      );
      var out = document.getElementById("wswap-result");
      if (res === null) {
        out.textContent = "Enter positive reserves and an amount in, a weight for the input token above 0% and below 100%, and a fee of 0–9999 basis points. A trade so large the model saturates at the whole output reserve is rejected, not quoted.";
        document.getElementById("wswap-out").value = "";
        document.getElementById("wswap-spot").value = "";
      } else {
        out.textContent = "Model output: paying ≈ " + fmt(res.amountIn, 6) + " of the input token into a ≈ " + fmt(res.weightInPct, 2) + "% / ≈ " + fmt(res.weightOutPct, 2) +
          "% weighted pool returns ≈ " + fmt(res.out, 6) + " of the output token. The weights are in the price: the spot price is ≈ " + fmt(res.spotPrice, 6) +
          " out per in before the trade (equal reserves at 80/20 price at 4, not 1), the effective price after the fee is ≈ " + fmt(res.effectivePrice, 6) +
          ", and the price impact against that spot is ≈ " + fmt(res.priceImpactPct, 4) + "%. At 50/50 this is exactly tool 1's constant-product answer — Raydium's own constant-product pools are the 50/50 case, and weighted pools are a generalised design modelled here for comparison. A weighted-pool swap model, not live pool data — not financial advice.";
        document.getElementById("wswap-out").value = fmt(res.out, 6);
        document.getElementById("wswap-spot").value = fmt(res.spotPrice, 6);
      }
    });

    /* --- CLMM range-order (limit-order) planner --- */
    document.getElementById("rord-calc").addEventListener("submit", function (ev) {
      ev.preventDefault();
      var res = clmmRangeOrder(
        document.getElementById("rord-side").value,
        document.getElementById("rord-amt").value,
        document.getElementById("rord-cur").value,
        document.getElementById("rord-lo").value,
        document.getElementById("rord-hi").value,
        document.getElementById("rord-chk").value
      );
      var out = document.getElementById("rord-result");
      if (res === null) {
        out.textContent = "Enter a positive amount and prices with the lower edge below the upper edge. To sell token A the whole range must sit at or above the current price; to sell token B it must sit at or below it — a range straddling the current price starts two-sided, which is an LP position, not an order.";
        document.getElementById("rord-full").value = "";
        document.getElementById("rord-avg").value = "";
      } else {
        var sellTok = res.side === "a" ? "A" : "B", buyTok = res.side === "a" ? "B" : "A";
        var stateTxt = res.status === "filled"
          ? "At the check price of ≈ " + fmt(res.checkPrice, 6) + " B per A the order has fully crossed: all ≈ " + fmt(res.sold, 6) + " " + sellTok + " sold for ≈ " + fmt(res.received, 6) + " " + buyTok + "."
          : res.status === "partial"
            ? "At the check price of ≈ " + fmt(res.checkPrice, 6) + " B per A the order is part-filled: ≈ " + fmt(res.sold, 6) + " " + sellTok + " sold (≈ " + fmt(res.executedPct, 4) + "%) for ≈ " + fmt(res.received, 6) + " " + buyTok + " at an average of ≈ " + fmt(res.avgPriceAtCheck, 6) + " B per A so far, with ≈ " + fmt(res.remaining, 6) + " " + sellTok + " still in the position."
            : "At the check price of ≈ " + fmt(res.checkPrice, 6) + " B per A the price has not entered the range, so nothing has filled — the position still holds the full ≈ " + fmt(res.amount, 6) + " " + sellTok + ".";
        out.textContent = "Model output: selling ≈ " + fmt(res.amount, 6) + " token " + sellTok + " through a single-sided position over ≈ " + fmt(res.lowerPrice, 6) + " – " + fmt(res.upperPrice, 6) +
          " B per A (model liquidity ≈ " + fmt(res.liquidity, 4) + ") pays ≈ " + fmt(res.fullOut, 6) + " token " + buyTok + " on a full crossing, an average execution price of ≈ " + fmt(res.avgPriceFull, 6) +
          " B per A — the geometric mean of the range, whatever the amount. " + stateTxt +
          " A range order earns swap fees while the price crosses it, which this model does not add to the received side. A CLMM range-order model, not live pool data — not financial advice.";
        document.getElementById("rord-full").value = fmt(res.fullOut, 6);
        document.getElementById("rord-avg").value = fmt(res.avgPriceFull, 6);
      }
    });

    /* --- Stableswap swap model --- */
    document.getElementById("sswap-calc").addEventListener("submit", function (ev) {
      ev.preventDefault();
      var res = stableSwap(
        document.getElementById("sswap-rin").value,
        document.getElementById("sswap-rout").value,
        document.getElementById("sswap-amp").value,
        document.getElementById("sswap-ain").value,
        document.getElementById("sswap-fee").value
      );
      var out = document.getElementById("sswap-result");
      if (res === null) {
        out.textContent = "Enter positive reserves, a positive amplification parameter and a positive amount in, and a fee of 0–9999 basis points. A trade so large the model saturates at the whole output reserve is rejected, not quoted.";
        document.getElementById("sswap-out").value = "";
        document.getElementById("sswap-spot").value = "";
      } else {
        out.textContent = "Model output: paying ≈ " + fmt(res.amountIn, 6) + " of the input token into a stableswap pool with amplification ≈ " + fmt(res.amp, 2) +
          " returns ≈ " + fmt(res.out, 6) + " of the output token. The spot price before the trade is ≈ " + fmt(res.spotPrice, 6) +
          " out per in (exactly 1 when the pool is balanced, whatever the amplification), the effective price after the fee is ≈ " + fmt(res.effectivePrice, 6) +
          ", and the price impact against that spot is ≈ " + fmt(res.priceImpactPct, 4) + "%. Higher amplification trades closer to 1:1 while the pool stays balanced — and keeps pricing near par even if one token depegs, which is the design's known danger, not a safety feature. A stableswap swap model, not live pool data — not financial advice.";
        document.getElementById("sswap-out").value = fmt(res.out, 6);
        document.getElementById("sswap-spot").value = fmt(res.spotPrice, 6);
      }
    });

    /* --- Stableswap exact-out swap model --- */
    document.getElementById("ssxo-calc").addEventListener("submit", function (ev) {
      ev.preventDefault();
      var res = stableSwapExactOut(
        document.getElementById("ssxo-rin").value,
        document.getElementById("ssxo-rout").value,
        document.getElementById("ssxo-amp").value,
        document.getElementById("ssxo-aout").value,
        document.getElementById("ssxo-fee").value
      );
      var out = document.getElementById("ssxo-result");
      if (res === null) {
        out.textContent = "Enter positive reserves, a positive amplification parameter and a positive target out below the whole output reserve, and a fee of 0–9999 basis points. A target at or above the whole output reserve is rejected, not quoted.";
        document.getElementById("ssxo-ain").value = "";
        document.getElementById("ssxo-spot").value = "";
      } else {
        out.textContent = "Model output: receiving exactly ≈ " + fmt(res.amountOut, 6) + " of the output token from a stableswap pool with amplification ≈ " + fmt(res.amp, 2) +
          " needs ≈ " + fmt(res.amountIn, 6) + " of the input token in (≈ " + fmt(res.netIn, 6) + " after the fee is taken). The spot price before the trade is ≈ " + fmt(res.spotPrice, 6) +
          " out per in (exactly 1 when the pool is balanced, whatever the amplification), the effective price across the whole trade is ≈ " + fmt(res.effectivePrice, 6) +
          ", and the price impact against that spot is ≈ " + fmt(res.priceImpactPct, 4) + "%. The cost climbs steeply as the target approaches the whole output reserve — the curve approaches it asymptotically and never pays it all. A stableswap exact-out model, not live pool data — not financial advice.";
        document.getElementById("ssxo-ain").value = fmt(res.amountIn, 6);
        document.getElementById("ssxo-spot").value = fmt(res.spotPrice, 6);
      }
    });

    /* --- Weighted-pool impermanent-loss calculator --- */
    document.getElementById("wil-calc").addEventListener("submit", function (ev) {
      ev.preventDefault();
      var res = weightedImpermanentLoss(
        document.getElementById("wil-weight").value,
        document.getElementById("wil-ratio").value,
        document.getElementById("wil-deposit").value
      );
      var out = document.getElementById("wil-result");
      if (res === null) {
        out.textContent = "Enter a token-A weight strictly between 0 and 100 percent and a price multiple above 0 — e.g. 2 if token A doubled against token B, 0.5 if it halved. A deposit value, if given, must be 0 or more.";
        document.getElementById("wil-lpval").value = "";
        document.getElementById("wil-holdval").value = "";
      } else if (res.deposit != null) {
        out.textContent = "Model output: at a " + fmt(res.priceRatio, 4) + "x price move, a pool weighted ≈ " + fmt(res.weightAPct, 2) + "% to token A has impermanent loss ≈ " + fmt(res.ilPct, 4) +
          "% vs holding. Holding the starting mix would be worth ≈ $" + fmt(res.holdValue, 2) + "; the LP position would be worth ≈ $" + fmt(res.lpValue, 2) +
          " (before fees earned), so fees of ≈ $" + fmt(res.feesNeeded, 2) + " would be needed to break even with holding. The loss is not symmetric in the weight — weighting toward a token tracks holding it more closely, which helps if it rises and hurts if it falls. A weighted-pool impermanent-loss model, not live pool data — not financial advice.";
        document.getElementById("wil-lpval").value = fmt(res.lpValue, 2);
        document.getElementById("wil-holdval").value = fmt(res.holdValue, 2);
      } else {
        out.textContent = "Model output: at a " + fmt(res.priceRatio, 4) + "x price move, a pool weighted ≈ " + fmt(res.weightAPct, 2) + "% to token A has impermanent loss ≈ " + fmt(res.ilPct, 4) +
          "% vs holding (before fees earned — fees are what compensate for this). At a 50% weight this is exactly the 50/50 calculator's answer. A weighted-pool impermanent-loss model, not live pool data — not financial advice.";
        document.getElementById("wil-lpval").value = "";
        document.getElementById("wil-holdval").value = "";
      }
    });

    /* --- Stableswap depeg-loss calculator --- */
    document.getElementById("depeg-calc").addEventListener("submit", function (ev) {
      ev.preventDefault();
      var res = stableDepegLoss(
        document.getElementById("depeg-ra").value,
        document.getElementById("depeg-rb").value,
        document.getElementById("depeg-amp").value,
        document.getElementById("depeg-price").value
      );
      var out = document.getElementById("depeg-result");
      if (res === null) {
        out.textContent = "Enter positive reserves for both tokens, an amplification above 0 and an external price for token B (in token A) above 0 — e.g. 0.90 if token B trades at 0.90 A on the open market. A price the curve cannot reach is rejected, not extrapolated.";
        document.getElementById("depeg-lpval").value = "";
        document.getElementById("depeg-holdval").value = "";
      } else {
        /* 0 - loss, not -loss: at the peg the loss is exactly 0 and a
           plain negation would render it as "-0.000000". */
        out.textContent = "Model output: arbitrage rebalances the pool until its own price of token B matches ≈ " + fmt(res.priceB, 6) +
          " A, leaving ≈ " + fmt(res.newReserveA, 6) + " A and ≈ " + fmt(res.newReserveB, 6) + " B (token A changes by ≈ " + fmt(res.aChange, 6) +
          ", token B by ≈ " + fmt(res.bChange, 6) + "). Valued at that external price, holding the starting reserves would be worth ≈ " + fmt(res.holdValueA, 6) +
          " A; the LP position is worth ≈ " + fmt(res.lpValueA, 6) + " A — a depeg loss of ≈ " + fmt(0 - res.lossA, 6) + " A (≈ " + fmt(0 - res.lossPct, 4) +
          "% vs holding, before any fees earned). The loss grows with the amplification, because a higher A defends par longer. A stableswap depeg-loss model, not live pool data — not financial advice.";
        document.getElementById("depeg-lpval").value = fmt(res.lpValueA, 6);
        document.getElementById("depeg-holdval").value = fmt(res.holdValueA, 6);
      }
    });

    /* --- Weighted-pool arbitrage model --- */
    document.getElementById("warb-calc").addEventListener("submit", function (ev) {
      ev.preventDefault();
      var res = weightedArbitrage(
        document.getElementById("warb-ra").value,
        document.getElementById("warb-rb").value,
        document.getElementById("warb-wa").value,
        document.getElementById("warb-ext").value,
        document.getElementById("warb-fee").value
      );
      var out = document.getElementById("warb-result");
      if (res === null) {
        out.textContent = "Enter positive reserves for both tokens, a token-A weight between 0 and 100 (exclusive), an external price above 0 and a fee tier in whole basis points (0–9999). An external price so extreme the target reserves overflow is rejected, not extrapolated.";
        document.getElementById("warb-out").value = "";
      } else if (res.direction === "none") {
        out.textContent = "Model output: the pool's weighted spot price is already ≈ " + fmt(res.spotPrice, 6) + " B per A — the weights are inside that quote — so there is no price-aligning trade to size at your external price. A weighted-pool arbitrage model, not live pool data — not financial advice.";
        document.getElementById("warb-out").value = fmt(0, 6);
      } else {
        var dirText = res.direction === "buy-a"
          ? "token A is cheap in the pool: pay token B in and take token A out"
          : "token A is expensive in the pool: pay token A in and take token B out";
        out.textContent = "Model output: the pool's weighted spot price is ≈ " + fmt(res.spotPrice, 6) +
          " B per A against your external price of ≈ " + fmt(res.externalPrice, 6) + " (a gap of ≈ " + fmt(res.priceGapPct, 4) + "%) — " + dirText +
          ". The price-aligning trade pays ≈ " + fmt(res.grossIn, 6) + " of token " + res.inToken + " in (≈ " + fmt(res.netIn, 6) +
          " after the fee reaches the pool) and takes ≈ " + fmt(res.amountOut, 6) + " of token " + res.outToken +
          " out, leaving the pool at ≈ " + fmt(res.targetReserveA, 6) + " A / ≈ " + fmt(res.targetReserveB, 6) +
          " B with its spot on your price. Modelled profit valued in B at your external price: ≈ " + fmt(res.profitInB, 6) +
          " B — a gap smaller than the fee honestly comes out negative. At a 50% weight this is exactly the constant-product arbitrage model's answer. A weighted-pool arbitrage model over a price you typed — not a live feed, not a found opportunity, not financial advice.";
        document.getElementById("warb-out").value = fmt(res.profitInB, 6);
      }
    });

    document.getElementById("wxo-calc").addEventListener("submit", function (ev) {
      ev.preventDefault();
      var res = weightedSwapExactOut(
        document.getElementById("wxo-rin").value,
        document.getElementById("wxo-rout").value,
        document.getElementById("wxo-win").value,
        document.getElementById("wxo-aout").value,
        document.getElementById("wxo-fee").value
      );
      var out = document.getElementById("wxo-result");
      if (res === null) {
        out.textContent = "Enter positive reserves for both tokens, an input-token weight between 0 and 100 (exclusive), a target out above 0 and below the whole output reserve, and a fee tier in whole basis points (0–9999). A target at or above the output reserve is impossible on this curve, not expensive — it is rejected, not quoted.";
        document.getElementById("wxo-ain").value = "";
        document.getElementById("wxo-spot").value = "";
      } else {
        out.textContent = "Model output: receiving ≈ " + fmt(res.amountOut, 6) + " out costs ≈ " + fmt(res.amountIn, 6) +
          " in gross (≈ " + fmt(res.netIn, 6) + " after the fee reaches the pool), leaving the pool at ≈ " + fmt(res.newReserveIn, 6) +
          " in / ≈ " + fmt(res.newReserveOut, 6) + " out. The pool's weighted spot price before the trade is ≈ " + fmt(res.spotPrice, 6) +
          " out per in — the weights are inside that quote — against an effective price of ≈ " + fmt(res.effectivePrice, 6) +
          ", a price impact of ≈ " + fmt(res.priceImpactPct, 4) + "%. At a 50% input weight this is exactly the constant-product exact-out model's answer. A weighted-pool exact-out model — not live pool data, not a live quote, not financial advice.";
        document.getElementById("wxo-ain").value = fmt(res.amountIn, 6);
        document.getElementById("wxo-spot").value = fmt(res.spotPrice, 6);
      }
    });

    /* --- weighted-pool price-impact sizer --- */
    document.getElementById("wis-calc").addEventListener("submit", function (ev) {
      ev.preventDefault();
      var res = weightedImpactSizer(
        document.getElementById("wis-rin").value,
        document.getElementById("wis-rout").value,
        document.getElementById("wis-win").value,
        document.getElementById("wis-cap").value,
        document.getElementById("wis-fee").value
      );
      var out = document.getElementById("wis-result");
      if (res === null) {
        out.textContent = "Enter positive reserves for both tokens, an input-token weight between 0 and 100 (exclusive), a price-impact cap above 0% and below 100%, and a fee tier in whole basis points (0–9999).";
        document.getElementById("wis-ain").value = "";
        document.getElementById("wis-aout").value = "";
      } else if (!res.feasible) {
        out.textContent = "Model output: no trade fits. The cap of ≈ " + fmt(res.maxImpactPct, 4) + "% is at or below the fee tier of ≈ " + fmt(res.feeImpactPct, 4) + "% — even a dust trade's price impact is exactly the fee, because the fee is part of the impact measure, so the fee alone spends the whole cap at any input weight. Raise the cap or find a cheaper pool. A weighted-pool price-impact model — not live pool data, not a live quote, not financial advice.";
        document.getElementById("wis-ain").value = "0";
        document.getElementById("wis-aout").value = "0";
      } else {
        out.textContent = "Model output: the largest input that keeps the price impact at ≈ " + fmt(res.maxImpactPct, 4) + "% is ≈ " + fmt(res.maxAmountIn, 6) +
          " in (≈ " + fmt(res.netIn, 6) + " after the fee reaches the pool), returning ≈ " + fmt(res.amountOut, 6) +
          " out. The weighted spot price before the trade is ≈ " + fmt(res.spotPrice, 6) + " out per in — the weights are inside that quote — the effective price is ≈ " + fmt(res.effectivePrice, 6) +
          ", and the trade moves the pool's own spot to ≈ " + fmt(res.postTradeSpotPrice, 6) + ". At a 50% input weight this is exactly tool 17's constant-product answer; at lopsided weights the same cap admits a very different trade, because the weight is part of the price. A weighted-pool price-impact model — not live pool data, not a live quote, not financial advice.";
        document.getElementById("wis-ain").value = fmt(res.maxAmountIn, 6);
        document.getElementById("wis-aout").value = fmt(res.amountOut, 6);
      }
    });

    /* --- stableswap arbitrage model --- */
    document.getElementById("sarb-calc").addEventListener("submit", function (ev) {
      ev.preventDefault();
      var res = stableArbitrage(
        document.getElementById("sarb-ra").value,
        document.getElementById("sarb-rb").value,
        document.getElementById("sarb-amp").value,
        document.getElementById("sarb-ext").value,
        document.getElementById("sarb-fee").value
      );
      var out = document.getElementById("sarb-result");
      if (res === null) {
        out.textContent = "Enter positive reserves for both tokens, an amplification above 0, an external price above 0 and a fee tier in whole basis points (0–9999). An external price the curve cannot reach is rejected, not extrapolated.";
        document.getElementById("sarb-out").value = "";
      } else if (res.direction === "none") {
        out.textContent = "Model output: the pool's stableswap spot price is already ≈ " + fmt(res.spotPrice, 6) + " B per A, so there is no price-aligning trade to size at your external price. A stableswap arbitrage model, not live pool data — not financial advice.";
        document.getElementById("sarb-out").value = fmt(0, 6);
      } else {
        var dirText = res.direction === "buy-a"
          ? "token A is cheap in the pool: pay token B in and take token A out"
          : "token A is expensive in the pool: pay token A in and take token B out";
        out.textContent = "Model output: the pool's stableswap spot price is ≈ " + fmt(res.spotPrice, 6) +
          " B per A against your external price of ≈ " + fmt(res.externalPrice, 6) + " (a gap of ≈ " + fmt(res.priceGapPct, 4) + "%) — " + dirText +
          ". The price-aligning trade pays ≈ " + fmt(res.grossIn, 6) + " of token " + res.inToken + " in (≈ " + fmt(res.netIn, 6) +
          " after the fee reaches the pool) and takes ≈ " + fmt(res.amountOut, 6) + " of token " + res.outToken +
          " out, leaving the pool at ≈ " + fmt(res.targetReserveA, 6) + " A / ≈ " + fmt(res.targetReserveB, 6) +
          " B with its spot on your price. Modelled profit valued in B at your external price: ≈ " + fmt(res.profitInB, 6) +
          " B — a gap smaller than the fee honestly comes out negative, and because the curve defends par the aligning trade is large for its gap. A stableswap arbitrage model over a price you typed — not a live feed, not a found opportunity, not financial advice.";
        document.getElementById("sarb-out").value = fmt(res.profitInB, 6);
      }
    });

    /* --- stableswap price-impact sizer --- */
    document.getElementById("sis-calc").addEventListener("submit", function (ev) {
      ev.preventDefault();
      var res = stableImpactSizer(
        document.getElementById("sis-rin").value,
        document.getElementById("sis-rout").value,
        document.getElementById("sis-amp").value,
        document.getElementById("sis-cap").value,
        document.getElementById("sis-fee").value
      );
      var out = document.getElementById("sis-result");
      if (res === null) {
        out.textContent = "Enter positive reserves for both tokens, an amplification above 0, a price-impact cap above 0% and below 100%, and a fee tier in whole basis points (0–9999).";
        document.getElementById("sis-ain").value = "";
        document.getElementById("sis-aout").value = "";
      } else if (!res.feasible) {
        out.textContent = "Model output: no trade fits. The cap of ≈ " + fmt(res.maxImpactPct, 4) + "% is at or below the fee tier of ≈ " + fmt(res.feeImpactPct, 4) + "% — even a dust trade's price impact is exactly the fee, because the fee is part of the impact measure, so the fee alone spends the whole cap at any amplification. Raise the cap or find a cheaper pool. A stableswap price-impact model — not live pool data, not a live quote, not financial advice.";
        document.getElementById("sis-ain").value = "0";
        document.getElementById("sis-aout").value = "0";
      } else {
        out.textContent = "Model output: the largest input that keeps the price impact at ≈ " + fmt(res.maxImpactPct, 4) + "% is ≈ " + fmt(res.maxAmountIn, 6) +
          " in (≈ " + fmt(res.netIn, 6) + " after the fee reaches the pool), returning ≈ " + fmt(res.amountOut, 6) +
          " out. The pool's stableswap spot price before the trade is ≈ " + fmt(res.spotPrice, 6) + " out per in, the effective price is ≈ " + fmt(res.effectivePrice, 6) +
          ", and the trade leaves the pool's own spot at ≈ " + fmt(res.postTradeSpotPrice, 6) + ". Read that last figure before trusting the cap: on a high-amplification curve the impact is an average over a fill that hugged par, so a trade can sit inside your cap while draining nearly all of the output reserve and collapsing the spot behind it. A stableswap price-impact model — not live pool data, not a live quote, not financial advice.";
        document.getElementById("sis-ain").value = fmt(res.maxAmountIn, 6);
        document.getElementById("sis-aout").value = fmt(res.amountOut, 6);
      }
    });

    document.getElementById("curve-calc").addEventListener("submit", function (ev) {
      ev.preventDefault();
      var res = curveCompare(
        document.getElementById("cmp-rin").value,
        document.getElementById("cmp-rout").value,
        document.getElementById("cmp-weight").value,
        document.getElementById("cmp-amp").value,
        document.getElementById("cmp-ain").value,
        document.getElementById("cmp-fee").value
      );
      var out = document.getElementById("curve-result");
      if (res === null) {
        out.textContent = "Enter positive reserves for both tokens, an input weight above 0% and below 100%, an amplification above 0, a positive amount in as a plain decimal (up to 9 decimal places), and a fee tier in whole basis points (0–9999). If one curve rejects the trade, the comparison rejects it too.";
        document.getElementById("cmp-out").value = "";
      } else {
        var names = { constantProduct: "constant product", weighted: "weighted", stableswap: "stableswap" };
        out.textContent = "Model output: the same ≈ " + fmt(res.amountIn, 6) + " in buys ≈ " + fmt(res.constantProduct.out, 6) +
          " out on a constant-product curve (spot ≈ " + fmt(res.constantProduct.spotPrice, 6) + " out per in, price impact ≈ " + fmt(res.constantProduct.priceImpactPct, 4) + "%), ≈ " + fmt(res.weighted.out, 6) +
          " out on a weighted curve at a " + fmt(res.weightInPct, 4) + "% input weight (spot ≈ " + fmt(res.weighted.spotPrice, 6) + ", impact ≈ " + fmt(res.weighted.priceImpactPct, 4) + "%), and ≈ " + fmt(res.stableswap.out, 6) +
          " out on a stableswap curve at A = " + fmt(res.amp, 4) + " (spot ≈ " + fmt(res.stableswap.spotPrice, 6) + ", impact ≈ " + fmt(res.stableswap.priceImpactPct, 4) + "%). Most out: the " + names[res.bestOut] +
          " curve; lowest impact against its own spot: the " + names[res.lowestImpact] + " curve. Read the spots before ranking the payouts: each curve sets its own spot from the same reserves — the weighted spot carries the weight and the stable spot sits near par only while reserves are balanced — so the biggest payout can simply be the curve that priced the token cheapest before the trade. Impact, measured against each curve's own spot, is the shape comparison. A curve comparison model — not live pool data, not a live quote, not financial advice.";
        document.getElementById("cmp-out").value = fmt(res.bestOutAmount, 6);
      }
    });

    document.getElementById("ccx-calc").addEventListener("submit", function (ev) {
      ev.preventDefault();
      var res = curveCompareExactOut(
        document.getElementById("ccx-rin").value,
        document.getElementById("ccx-rout").value,
        document.getElementById("ccx-weight").value,
        document.getElementById("ccx-amp").value,
        document.getElementById("ccx-aout").value,
        document.getElementById("ccx-fee").value
      );
      var out = document.getElementById("ccx-result");
      if (res === null) {
        out.textContent = "Enter positive reserves for both tokens, an input weight above 0% and below 100%, an amplification above 0, a positive target out below the output reserve as a plain decimal (up to 9 decimal places), and a fee tier in whole basis points (0–9999). If one curve rejects the target, the comparison rejects it too.";
        document.getElementById("ccx-in").value = "";
      } else {
        var names = { constantProduct: "constant product", weighted: "weighted", stableswap: "stableswap" };
        out.textContent = "Model output: receiving ≈ " + fmt(res.amountOut, 6) + " out costs ≈ " + fmt(res.constantProduct["in"], 6) +
          " in on a constant-product curve (spot ≈ " + fmt(res.constantProduct.spotPrice, 6) + " out per in, price impact ≈ " + fmt(res.constantProduct.priceImpactPct, 4) + "%), ≈ " + fmt(res.weighted["in"], 6) +
          " in on a weighted curve at a " + fmt(res.weightInPct, 4) + "% input weight (spot ≈ " + fmt(res.weighted.spotPrice, 6) + ", impact ≈ " + fmt(res.weighted.priceImpactPct, 4) + "%), and ≈ " + fmt(res.stableswap["in"], 6) +
          " in on a stableswap curve at A = " + fmt(res.amp, 4) + " (spot ≈ " + fmt(res.stableswap.spotPrice, 6) + ", impact ≈ " + fmt(res.stableswap.priceImpactPct, 4) + "%). Cheapest in raw input: the " + names[res.cheapestIn] +
          " curve; lowest impact against its own spot: the " + names[res.lowestImpact] + " curve. Read the spots before ranking the costs: each curve sets its own spot from the same reserves — the weighted spot carries the weight and the stable spot sits near par only while reserves are balanced — so the cheapest input can simply be the curve that priced the output token cheapest before the trade. Impact, measured against each curve's own spot, is the shape comparison. A curve comparison exact-out model — not live pool data, not a live quote, not financial advice.";
        document.getElementById("ccx-in").value = fmt(res.cheapestInAmount, 6);
      }
    });

    document.getElementById("wnet-calc").addEventListener("submit", function (ev) {
      ev.preventDefault();
      var res = weightedNetReturn(
        document.getElementById("wnet-weight").value,
        document.getElementById("wnet-ratio").value,
        document.getElementById("wnet-deposit").value,
        document.getElementById("wnet-fees").value
      );
      var out = document.getElementById("wnet-result");
      if (res === null) {
        out.textContent = "Enter a token A weight above 0% and below 100%, a price multiple above 0, a deposit above $0, and the fees you've earned ($0 or more).";
        document.getElementById("wnet-out").value = "";
      } else {
        var verdictText = res.verdict === "ahead"
          ? "≈ $" + fmt(res.netVsHold, 2) + " ahead of holding (" + fmt(res.netVsHoldPct, 2) + "%)"
          : res.verdict === "behind"
            ? "≈ $" + fmt(-res.netVsHold, 2) + " behind holding (" + fmt(res.netVsHoldPct, 2) + "%)"
            : "exactly even with holding ($0 either way)";
        out.textContent = "Model output: at a " + fmt(res.weightAPct, 4) + "% token A weight and a " + res.priceRatio + "x price move, holding would be $" + fmt(res.holdValue, 2) +
          " and the weighted LP position $" + fmt(res.lpValue, 2) + " — impermanent loss " + fmt(res.ilPct, 2) + "% (tool 60), so $" +
          fmt(res.feesNeeded, 2) + " in fees breaks even. Adding your $" + fmt(res.feesEarned, 2) +
          " in fees" + (res.feesCoveragePct !== null ? " (" + fmt(res.feesCoveragePct, 2) + "% of that hurdle)" : "") +
          " brings the position to $" + fmt(res.netLpValue, 2) + " — " + verdictText +
          ". Against the $" + fmt(res.deposit, 2) + " deposit itself that is a net return of " + fmt(res.netReturnPct, 2) +
          "% — a different bottom line: weighting toward the token that rose shrinks the hurdle but never removes it, and a position can be well up on its deposit and still behind holding. At a 50% weight this is tool 24's constant-product settlement exactly. A weighted-pool net-return model, not a live Raydium quote — fees are counted in $ terms outside the pool, with no compounding modelled. Weighted pools are a generalised design used elsewhere; Raydium's own pools are the 50/50 case. Not financial advice.";
        document.getElementById("wnet-out").value = fmt(res.netVsHold, 2);
      }
    });

    /* --- Stableswap net return calculator --- */
    document.getElementById("snet-calc").addEventListener("submit", function (ev) {
      ev.preventDefault();
      var res = stableNetReturn(
        document.getElementById("snet-ra").value,
        document.getElementById("snet-rb").value,
        document.getElementById("snet-amp").value,
        document.getElementById("snet-price").value,
        document.getElementById("snet-share").value,
        document.getElementById("snet-fees").value
      );
      var out = document.getElementById("snet-result");
      if (res === null) {
        out.textContent = "Enter positive reserves for both tokens, an amplification above 0, an external price for token B (in token A) above 0, a pool share above 0% and at most 100%, and the fees you've earned in token A (0 or more). A price the curve cannot reach is rejected, not extrapolated.";
        document.getElementById("snet-out").value = "";
      } else {
        var verdictText = res.verdict === "ahead"
          ? "≈ " + fmt(res.netVsHoldA, 4) + " A ahead of holding (" + fmt(res.netVsHoldPct, 2) + "%)"
          : res.verdict === "behind"
            ? "≈ " + fmt(0 - res.netVsHoldA, 4) + " A behind holding (" + fmt(res.netVsHoldPct, 2) + "%)"
            : "exactly even with holding (0 A either way)";
        out.textContent = "Model output: your " + fmt(res.sharePct, 4) + "% share was worth ≈ " + fmt(res.depositValueA, 4) +
          " A at the pool's starting spot of ≈ " + fmt(res.startSpotB, 6) + " A per B. At an external price of ≈ " + fmt(res.priceB, 6) +
          " A per B, holding that share would be worth ≈ " + fmt(res.holdValueA, 4) + " A and the LP share ≈ " + fmt(res.lpValueA, 4) +
          " A — a depeg loss of " + fmt(res.lossPct, 2) + "% vs holding (tool 61), so ≈ " + fmt(res.feesNeeded, 4) +
          " A in fees breaks even. Adding your ≈ " + fmt(res.feesEarned, 4) + " A in fees" +
          (res.feesCoveragePct !== null ? " (" + fmt(res.feesCoveragePct, 2) + "% of that hurdle)" : "") +
          " brings the position to ≈ " + fmt(res.netLpValueA, 4) + " A — " + verdictText +
          ". Against the ≈ " + fmt(res.depositValueA, 4) + " A deposit itself that is a net return of " + fmt(res.netReturnPct, 2) +
          "% — a different bottom line: on a depeg holding falls too, so covering the hurdle can still leave the position down against its deposit. The hurdle grows with the amplification, because a higher A defends par longer. A stableswap net-return model, not a live Raydium quote — fees are counted in token A terms outside the pool, with no compounding modelled, and tool 61's no-fee arbitrage shape is inherited. Not financial advice.";
        document.getElementById("snet-out").value = fmt(res.netVsHoldA, 4);
      }
    });

    document.getElementById("wrv-calc").addEventListener("submit", function (ev) {
      ev.preventDefault();
      var res = weightedRequiredVolume(
        document.getElementById("wrv-weight").value,
        document.getElementById("wrv-ratio").value,
        document.getElementById("wrv-deposit").value,
        document.getElementById("wrv-your").value,
        document.getElementById("wrv-tvl").value,
        document.getElementById("wrv-fee").value,
        document.getElementById("wrv-days").value
      );
      var out = document.getElementById("wrv-result");
      if (res === null) {
        out.textContent = "Enter a token A weight strictly between 0 and 100%, a price multiple above 0, a deposit above $0, your liquidity and the pool TVL in $ (yours no larger than the TVL), a fee tier from 0 to 10,000 bps, and a number of days above 0.";
        document.getElementById("wrv-out").value = "";
      } else if (!res.feasible) {
        out.textContent = "Model output: the move leaves the position ≈ $" + fmt(res.feesNeeded, 4) + " behind holding (impermanent loss " + fmt(res.ilPct, 2) + "%), which needs ≈ $" + fmt(res.requiredFeesPerDay, 4) + " of fees a day for " + fmt(res.days, 0) + " days — but at a 0 bps fee tier no volume earns any fee at all, so no required volume exists. A weighted-pool required-volume model, not a live Raydium quote and not a volume forecast. Not financial advice.";
        document.getElementById("wrv-out").value = "no volume suffices at 0 bps";
      } else if (res.requiredVolumePerDay === 0) {
        out.textContent = "Model output: at a price multiple of " + fmt(res.priceRatio, 4) + " there is no impermanent loss to cover, so the required volume is honestly $0 a day — not a small number. A weighted-pool required-volume model, not a live Raydium quote and not a volume forecast. Not financial advice.";
        document.getElementById("wrv-out").value = "0";
      } else {
        out.textContent = "Model output: at a " + fmt(res.weightAPct, 2) + "% weight on token A and a price multiple of " + fmt(res.priceRatio, 4) + ", the position is ≈ $" + fmt(res.feesNeeded, 4) + " behind holding (impermanent loss " + fmt(res.ilPct, 2) + "%). To earn that in " + fmt(res.days, 0) + " days at a " + fmt(res.feeBps, 0) + " bps tier with your " + fmt(res.sharePct, 4) + "% share of the pool, the pool needs ≈ $" + fmt(res.requiredPoolFeesPerDay, 4) + " of fees a day — ≈ $" + fmt(res.requiredVolumePerDay, 2) + " of volume a day, of which your share is ≈ $" + fmt(res.requiredFeesPerDay, 4) + " a day. The weight moves the hurdle before volume enters it, and not monotonically: the hurdle is hold minus LP, both of which move with the weight, so at some moves the worst of it sits near an interior weight rather than at 50% — run your own weight, not the 50/50 answer. A weighted-pool required-volume model, not a live Raydium quote and not a volume forecast — it assumes the volume, tier, share and price all hold still. Not financial advice.";
        document.getElementById("wrv-out").value = fmt(res.requiredVolumePerDay, 2);
      }
    });

    document.getElementById("srv-calc").addEventListener("submit", function (ev) {
      ev.preventDefault();
      var res = stableRequiredVolume(
        document.getElementById("srv-ra").value,
        document.getElementById("srv-rb").value,
        document.getElementById("srv-amp").value,
        document.getElementById("srv-price").value,
        document.getElementById("srv-share").value,
        document.getElementById("srv-fee").value,
        document.getElementById("srv-days").value
      );
      var out = document.getElementById("srv-result");
      if (res === null) {
        out.textContent = "Enter positive reserves for both tokens, an amplification above 0, an external price for token B above 0, your share of the pool (above 0 and at most 100%), a fee tier from 0 to 10,000 bps, and a number of days above 0.";
        document.getElementById("srv-out").value = "";
      } else if (!res.feasible) {
        out.textContent = "Model output: the depeg leaves your share ≈ " + fmt(res.feesNeeded, 4) + " A behind holding (depeg loss " + fmt(res.lossPct, 2) + "% on the pool), which needs ≈ " + fmt(res.requiredFeesPerDay, 4) + " A of fees a day for " + fmt(res.days, 0) + " days — but at a 0 bps fee tier no volume earns any fee at all, so no required volume exists. A stableswap required-volume model, not a live Raydium quote and not a volume forecast. Not financial advice.";
        document.getElementById("srv-out").value = "no volume suffices at 0 bps";
      } else if (res.requiredVolumePerDay === 0) {
        out.textContent = "Model output: at an external price of " + fmt(res.priceB, 4) + " A per B the peg holds against the pool's own starting spot of " + fmt(res.startSpotB, 4) + ", so there is no depeg shortfall to cover and the required volume is honestly 0 a day — not a small number. A stableswap required-volume model, not a live Raydium quote and not a volume forecast. Not financial advice.";
        document.getElementById("srv-out").value = "0";
      } else {
        out.textContent = "Model output: with token B at " + fmt(res.priceB, 4) + " A, your " + fmt(res.sharePct, 2) + "% share is ≈ " + fmt(res.feesNeeded, 4) + " A behind holding (depeg loss " + fmt(res.lossPct, 2) + "% on the pool). To earn that in " + fmt(res.days, 0) + " days at a " + fmt(res.feeBps, 0) + " bps tier, the pool needs ≈ " + fmt(res.requiredPoolFeesPerDay, 4) + " A of fees a day — ≈ " + fmt(res.requiredVolumePerDay, 2) + " A of volume a day, of which your share is ≈ " + fmt(res.requiredFeesPerDay, 4) + " A a day. Amplification sets the hurdle before volume enters it, and one honest shape: the required pool volume does not depend on your share — a bigger share owes a bigger slice of the hurdle but takes the same bigger slice of every fee, so the two cancel; your share only changes the fees you must personally earn each day. A stableswap required-volume model, not a live Raydium quote and not a volume forecast — it assumes the volume, tier, share, price and amplification all hold still. Not financial advice.";
        document.getElementById("srv-out").value = fmt(res.requiredVolumePerDay, 2);
      }
    });

    document.getElementById("wbed-calc").addEventListener("submit", function (ev) {
      ev.preventDefault();
      var res = weightedBreakEvenDays(
        document.getElementById("wbed-weight").value,
        document.getElementById("wbed-ratio").value,
        document.getElementById("wbed-deposit").value,
        document.getElementById("wbed-volume").value,
        document.getElementById("wbed-fee").value,
        document.getElementById("wbed-your").value,
        document.getElementById("wbed-tvl").value
      );
      var out = document.getElementById("wbed-result");
      if (res === null) {
        out.textContent = "Enter a token A weight strictly between 0 and 100%, a price multiple above 0, a deposit above $0, a daily pool volume of $0 or more, your liquidity and the pool TVL in $ (yours no larger than the TVL), and a fee tier from 0 to 10,000 bps.";
        document.getElementById("wbed-out").value = "";
      } else if (res.daysToBreakEven === 0) {
        out.textContent = "Model output: at a price multiple of " + fmt(res.priceRatio, 4) + " there is no impermanent loss to cover, so the position breaks even in honestly 0 days — not a small number — whatever the volume or fee tier. A weighted-pool break-even days model, not a live Raydium quote. Not financial advice.";
        document.getElementById("wbed-out").value = "0";
      } else if (!isFinite(res.daysToBreakEven)) {
        out.textContent = "Model output: the move leaves the position ≈ $" + fmt(res.feesNeeded, 4) + " behind holding (impermanent loss " + fmt(res.ilPct, 2) + "%), but at this volume and fee tier your daily fees are $0, so it never breaks even at that rate. A weighted-pool break-even days model, not a live Raydium quote. Not financial advice.";
        document.getElementById("wbed-out").value = "never at this fee rate";
      } else {
        out.textContent = "Model output: at a " + fmt(res.weightAPct, 2) + "% weight on token A and a price multiple of " + fmt(res.priceRatio, 4) + ", the position is ≈ $" + fmt(res.feesNeeded, 4) + " behind holding (impermanent loss " + fmt(res.ilPct, 2) + "%). At ≈ $" + fmt(res.dailyFees, 4) + " of fees a day to you (your " + fmt(res.sharePct, 4) + "% share of a " + fmt(res.feeBps, 0) + " bps tier), that takes ≈ " + fmt(res.daysToBreakEven, 2) + " days. The weight moves the hurdle before volume enters it — and the mirror move (a " + fmt(res.weightBPct, 2) + "% weight on a token that moved the other way by the reciprocal multiple) carries the same impermanent-loss percentage but a hurdle scaled by its hold value. A weighted-pool break-even days model, not a live Raydium quote — it assumes the volume, tier, share and price all hold still. Not financial advice.";
        document.getElementById("wbed-out").value = fmt(res.daysToBreakEven, 2);
      }
    });

    document.getElementById("sbed-calc").addEventListener("submit", function (ev) {
      ev.preventDefault();
      var res = stableBreakEvenDays(
        document.getElementById("sbed-ra").value,
        document.getElementById("sbed-rb").value,
        document.getElementById("sbed-amp").value,
        document.getElementById("sbed-price").value,
        document.getElementById("sbed-share").value,
        document.getElementById("sbed-volume").value,
        document.getElementById("sbed-fee").value
      );
      var out = document.getElementById("sbed-result");
      if (res === null) {
        out.textContent = "Enter positive reserves for both tokens, an amplification above 0, an external price for token B above 0, your share of the pool (above 0 and at most 100%), a daily pool volume of 0 or more in token A, and a fee tier from 0 to 10,000 bps.";
        document.getElementById("sbed-out").value = "";
      } else if (res.daysToBreakEven === 0) {
        out.textContent = "Model output: at an external price of " + fmt(res.priceB, 4) + " A per B the peg holds against the pool's own starting spot of " + fmt(res.startSpotB, 4) + ", so there is no depeg shortfall to cover and the position breaks even in honestly 0 days — not a small number — whatever the volume or fee tier. A stableswap break-even days model, not a live Raydium quote. Not financial advice.";
        document.getElementById("sbed-out").value = "0";
      } else if (!isFinite(res.daysToBreakEven)) {
        out.textContent = "Model output: the depeg leaves your share ≈ " + fmt(res.feesNeeded, 4) + " A behind holding (depeg loss " + fmt(res.lossPct, 2) + "% on the pool), but at this volume and fee tier your daily fees are 0 A, so it never breaks even at that rate. A stableswap break-even days model, not a live Raydium quote. Not financial advice.";
        document.getElementById("sbed-out").value = "never at this fee rate";
      } else {
        out.textContent = "Model output: with token B at " + fmt(res.priceB, 4) + " A, your " + fmt(res.sharePct, 2) + "% share is ≈ " + fmt(res.feesNeeded, 4) + " A behind holding (depeg loss " + fmt(res.lossPct, 2) + "% on the pool). At ≈ " + fmt(res.dailyFees, 4) + " A of fees a day to you (your share of a " + fmt(res.feeBps, 0) + " bps tier), that takes ≈ " + fmt(res.daysToBreakEven, 2) + " days. Amplification sets the hurdle before volume enters it — a higher A defends par longer and drains further, so the count grows with A. One honest shape: the day count does not depend on your share — a bigger share owes a bigger slice of the hurdle but takes the same bigger slice of every fee, so the two cancel. A stableswap break-even days model, not a live Raydium quote — it assumes the volume, tier, share, price and amplification all hold still. Not financial advice.";
        document.getElementById("sbed-out").value = fmt(res.daysToBreakEven, 2);
      }
    });

    document.getElementById("wband-calc").addEventListener("submit", function (ev) {
      ev.preventDefault();
      var res = weightedIlBand(
        document.getElementById("wband-weight").value,
        document.getElementById("wband-deposit").value,
        document.getElementById("wband-fees").value
      );
      var out = document.getElementById("wband-result");
      if (res === null) {
        out.textContent = "Enter a token A weight strictly between 0 and 100%, a deposit above $0, and fees earned of $0 or more.";
        document.getElementById("wband-out").value = "";
      } else if (res.feesEarned === 0) {
        out.textContent = "Model output: with $0 of fees earned there is nothing to cover any impermanent loss, so the tolerance band collapses to exactly 1x on both sides — any move at all leaves the position behind holding. A weighted-pool IL tolerance band model, not a live Raydium quote. Not financial advice.";
        document.getElementById("wband-out").value = "1x to 1x";
      } else if (res.downUnbounded) {
        out.textContent = "Model output: at a " + fmt(res.weightAPct, 2) + "% weight on token A, $" + fmt(res.feesEarned, 4) + " of fees on a $" + fmt(res.deposit, 2) + " deposit covers a rise to ≈ " + fmt(res.priceRatioHigh, 4) + "x (+" + fmt(res.moveUpPct, 2) + "%), and covers ANY fall: the worst possible downside hurdle is ≈ $" + fmt(res.maxDownHurdle, 4) + " (" + fmt(res.maxDownHurdlePctOfDeposit, 2) + "% of the deposit — the token B side's share), because as token A's price falls toward zero the position's B side is untouched and holding loses exactly that same share. A weighted-pool IL tolerance band model, not a live Raydium quote. Not financial advice.";
        document.getElementById("wband-out").value = "any fall to " + fmt(res.priceRatioHigh, 4) + "x";
      } else {
        out.textContent = "Model output: at a " + fmt(res.weightAPct, 2) + "% weight on token A, $" + fmt(res.feesEarned, 4) + " of fees on a $" + fmt(res.deposit, 2) + " deposit covers price multiples from ≈ " + fmt(res.priceRatioLow, 4) + "x (−" + fmt(res.moveDownPct, 2) + "%) to ≈ " + fmt(res.priceRatioHigh, 4) + "x (+" + fmt(res.moveUpPct, 2) + "%). The band is not symmetric: the downside hurdle caps at ≈ $" + fmt(res.maxDownHurdle, 4) + " (" + fmt(res.maxDownHurdlePctOfDeposit, 2) + "% of the deposit) while the upside hurdle grows without bound, and the weight sets both shapes. At either edge the fees exactly equal tool 60's hurdle. A weighted-pool IL tolerance band model, not a live Raydium quote. Not financial advice.";
        document.getElementById("wband-out").value = fmt(res.priceRatioLow, 4) + "x to " + fmt(res.priceRatioHigh, 4) + "x";
      }
    });

    document.getElementById("sband-calc").addEventListener("submit", function (ev) {
      ev.preventDefault();
      var res = stableIlBand(
        document.getElementById("sband-ra").value,
        document.getElementById("sband-rb").value,
        document.getElementById("sband-amp").value,
        document.getElementById("sband-fees").value
      );
      var out = document.getElementById("sband-result");
      if (res === null) {
        out.textContent = "Enter positive reserves for both tokens, an amplification above 0, and fees earned of 0 or more in token A.";
        document.getElementById("sband-out").value = "";
      } else if (res.feesEarned === 0) {
        out.textContent = "Model output: with 0 A of fees earned there is nothing to cover any depeg loss, so the tolerance band collapses to exactly the pool's starting spot of " + fmt(res.startSpotB, 4) + " A per B on both sides — any move at all leaves the pool behind holding. A stableswap IL tolerance band model, not a live Raydium quote. Not financial advice.";
        document.getElementById("sband-out").value = fmt(res.startSpotB, 4) + " A to " + fmt(res.startSpotB, 4) + " A per B";
      } else if (res.downUnbounded) {
        out.textContent = "Model output: " + fmt(res.feesEarned, 4) + " A of fees earned by this pool covers token B rising to ≈ " + fmt(res.priceHigh, 4) + " A (+" + fmt(res.moveUpPct, 2) + "% from the starting spot of " + fmt(res.startSpotB, 4) + " A per B), and covers ANY fall: the worst possible downside hurdle is ≈ " + fmt(res.maxDownHurdle, 4) + " A (" + fmt(res.maxDownHurdlePctOfPoolValue, 2) + "% of the pool's value at its starting spot — the whole token A reserve), because as token B's price falls toward zero the pool ends up holding almost nothing but B, and holding loses exactly that same A side. A stableswap IL tolerance band model, not a live Raydium quote. Not financial advice.";
        document.getElementById("sband-out").value = "any fall to " + fmt(res.priceHigh, 4) + " A per B";
      } else {
        out.textContent = "Model output: " + fmt(res.feesEarned, 4) + " A of fees earned by this pool covers token B prices from ≈ " + fmt(res.priceLow, 4) + " A (−" + fmt(res.moveDownPct, 2) + "%) to ≈ " + fmt(res.priceHigh, 4) + " A (+" + fmt(res.moveUpPct, 2) + "%) around its starting spot of " + fmt(res.startSpotB, 4) + " A per B. The band is measured from the pool's own spot, not from 1, and it is not symmetric: the downside hurdle caps at ≈ " + fmt(res.maxDownHurdle, 4) + " A (the whole token A reserve) while the upside hurdle grows without bound, and the amplification narrows the band as it rises. At either edge the fees exactly equal tool 61's depeg loss. A stableswap IL tolerance band model, not a live Raydium quote. Not financial advice.";
        document.getElementById("sband-out").value = fmt(res.priceLow, 4) + " A to " + fmt(res.priceHigh, 4) + " A per B";
      }
    });

    document.getElementById("carb-calc").addEventListener("submit", function (ev) {
      ev.preventDefault();
      var res = clmmArbitrage(
        document.getElementById("carb-l").value,
        document.getElementById("carb-lower").value,
        document.getElementById("carb-upper").value,
        document.getElementById("carb-price").value,
        document.getElementById("carb-ext").value,
        document.getElementById("carb-fee").value
      );
      var out = document.getElementById("carb-result");
      if (res === null) {
        out.textContent = "Enter liquidity above 0, a range with lower below upper, a current price strictly inside the range, an external price above 0 and a fee tier in whole basis points (0–9999).";
        document.getElementById("carb-out").value = "";
      } else if (res.direction === "none") {
        out.textContent = "Model output: the range's spot price is already ≈ " + fmt(res.spotPrice, 6) + " B per A, so there is no price-aligning trade to size at your external price. A CLMM arbitrage model, not live pool data — not financial advice.";
        document.getElementById("carb-out").value = fmt(0, 6);
      } else {
        var dirText = res.direction === "buy-a"
          ? "token A is cheap in the pool: pay token B in and take token A out"
          : "token A is expensive in the pool: pay token A in and take token B out";
        var wallText = res.hitBoundary
          ? " Your external price sits beyond the range's edge, so this single range can only align as far as that edge — the trade stops there, the post-trade spot is the edge rather than your price, and the profit is the capped trade's, valued at your price; a real pool would continue into the next range at its own liquidity."
          : " The trade lands the range's price exactly on your external price.";
        out.textContent = "Model output: the range's spot price is ≈ " + fmt(res.spotPrice, 6) +
          " B per A against your external price of ≈ " + fmt(res.externalPrice, 6) + " (a gap of ≈ " + fmt(res.priceGapPct, 4) + "%) — " + dirText +
          ". The price-aligning trade pays ≈ " + fmt(res.grossIn, 6) + " of token " + res.inToken + " in (≈ " + fmt(res.netIn, 6) +
          " after the fee reaches the pool) and takes ≈ " + fmt(res.amountOut, 6) + " of token " + res.outToken +
          " out, leaving the range at ≈ " + fmt(res.postTradeSpot, 6) + " B per A." + wallText +
          " Modelled profit valued in B at your external price: ≈ " + fmt(res.profitInB, 6) +
          " B — a gap smaller than the fee honestly comes out negative. A CLMM arbitrage model over a price you typed — not a live feed, not a found opportunity, not financial advice.";
        document.getElementById("carb-out").value = fmt(res.profitInB, 6);
      }
    });

    document.getElementById("cis-calc").addEventListener("submit", function (ev) {
      ev.preventDefault();
      var res = clmmImpactSizer(
        document.getElementById("cis-l").value,
        document.getElementById("cis-lower").value,
        document.getElementById("cis-upper").value,
        document.getElementById("cis-price").value,
        document.getElementById("cis-cap").value,
        document.getElementById("cis-fee").value,
        document.getElementById("cis-dir").value
      );
      var out = document.getElementById("cis-result");
      if (res === null) {
        out.textContent = "Enter liquidity above 0, a range with lower below upper, a current price strictly inside the range, an impact cap above 0 and below 100%, and a fee tier in whole basis points (0–9999).";
        document.getElementById("cis-out").value = "";
      } else if (!res.feasible) {
        out.textContent = "Model output: no trade fits — a cap of " + fmt(res.maxImpactPct, 4) + "% is at or below the " + fmt(res.feeImpactPct, 4) + "% fee itself, and tool 42's impact measure counts the fee, so even a dust trade inside this range already carries that much impact. Raise the cap above the fee tier. A CLMM price-impact sizer model, not a live Raydium quote. Not financial advice.";
        document.getElementById("cis-out").value = fmt(0, 6);
      } else {
        var wallText = res.hitBoundary
          ? " Your cap is at or above this range's own ceiling impact of ≈ " + fmt(res.boundaryImpactPct, 4) + "% — the impact of walking the price all the way to the range's edge — so the largest trade is the one that empties this range: its actual impact is that ceiling, not your cap, and any larger input would simply go unfilled in this range rather than fill at a worse price. A real pool would continue into the next range at its own liquidity."
          : " The sized trade lands exactly on your cap and stays inside the range, whose own ceiling impact (walking to its edge) is ≈ " + fmt(res.boundaryImpactPct, 4) + "%.";
        out.textContent = "Model output: the largest trade at a " + fmt(res.maxImpactPct, 4) + "% impact cap pays ≈ " + fmt(res.maxAmountIn, 6) + " of token " + res.inToken + " in (≈ " + fmt(res.netIn, 6) + " after the fee reaches the range) and takes ≈ " + fmt(res.amountOut, 6) + " of token " + res.outToken + " out, leaving the range at ≈ " + fmt(res.newPrice, 6) + " B per A with an actual impact of ≈ " + fmt(res.actualImpactPct, 4) + "%." + wallText + " A CLMM price-impact sizer model over one range — not live pool data, not a live quote, not financial advice.";
        document.getElementById("cis-out").value = fmt(res.maxAmountIn, 6);
      }
    });

    document.getElementById("xcis-calc").addEventListener("submit", function (ev) {
      ev.preventDefault();
      var res = clmmCrossImpactSizer(
        document.getElementById("xcis-l").value,
        document.getElementById("xcis-lower").value,
        document.getElementById("xcis-upper").value,
        document.getElementById("xcis-price").value,
        document.getElementById("xcis-cap").value,
        document.getElementById("xcis-fee").value,
        document.getElementById("xcis-dir").value,
        document.getElementById("xcis-l2").value,
        document.getElementById("xcis-outer").value
      );
      var out = document.getElementById("xcis-result");
      if (res === null) {
        out.textContent = "Enter liquidity above 0 for both ranges, a range with lower below upper, a current price strictly inside the first range, an impact cap above 0 and below 100%, a fee tier in whole basis points (0–9999), and a second range whose outer edge sits beyond the first range on the side your trade walks toward.";
        document.getElementById("xcis-out").value = "";
      } else if (!res.feasible) {
        out.textContent = "Model output: no trade fits — a cap of " + fmt(res.maxImpactPct, 4) + "% is at or below the " + fmt(res.feeImpactPct, 4) + "% fee itself, and tool 43's impact measure counts the fee, so even a dust trade already carries that much impact. Raise the cap above the fee tier. A CLMM two-range price-impact sizer model, not a live Raydium quote. Not financial advice.";
        document.getElementById("xcis-out").value = fmt(0, 6);
      } else {
        var crossText;
        if (!res.crossed) {
          crossText = " Your cap fits inside the first range, whose own ceiling impact (walking to its edge) is ≈ " + fmt(res.boundaryImpactPct, 4) + "%: this is tool 78's single-range answer and the second range is untouched.";
        } else if (res.hitSecondBoundary) {
          crossText = " Your cap is at or above the two ranges' combined ceiling impact of ≈ " + fmt(res.secondBoundaryImpactPct, 4) + "% — the impact of emptying both ranges — so the largest trade empties both: leg 1 pays ≈ " + fmt(res.leg1UsedIn, 6) + " " + res.inToken + " in for ≈ " + fmt(res.leg1Out, 6) + " " + res.outToken + " out to the shared edge at ≈ " + fmt(res.boundaryPrice, 6) + " B per A, leg 2 pays ≈ " + fmt(res.leg2UsedIn, 6) + " " + res.inToken + " in for ≈ " + fmt(res.leg2Out, 6) + " " + res.outToken + " out to the outer edge. Its actual impact is that ceiling, not your cap, and any larger input would go unfilled past the second wall rather than fill at a worse price.";
        } else {
          crossText = " The sized trade crosses the shared edge at ≈ " + fmt(res.boundaryPrice, 6) + " B per A (leg 1: ≈ " + fmt(res.leg1UsedIn, 6) + " " + res.inToken + " in for ≈ " + fmt(res.leg1Out, 6) + " " + res.outToken + " out; leg 2: ≈ " + fmt(res.leg2UsedIn, 6) + " " + res.inToken + " in for ≈ " + fmt(res.leg2Out, 6) + " " + res.outToken + " out) and lands exactly on your cap inside the second range, whose combined ceiling impact (emptying both ranges) is ≈ " + fmt(res.secondBoundaryImpactPct, 4) + "%.";
        }
        out.textContent = "Model output: the largest trade at a " + fmt(res.maxImpactPct, 4) + "% impact cap pays ≈ " + fmt(res.maxAmountIn, 6) + " of token " + res.inToken + " in (≈ " + fmt(res.netIn, 6) + " after the fees reach the ranges) and takes ≈ " + fmt(res.amountOut, 6) + " of token " + res.outToken + " out, leaving the price at ≈ " + fmt(res.newPrice, 6) + " B per A with an actual impact of ≈ " + fmt(res.actualImpactPct, 4) + "%." + crossText + " A CLMM two-range price-impact sizer model — not live pool data, not a live quote, not financial advice.";
        document.getElementById("xcis-out").value = fmt(res.maxAmountIn, 6);
      }
    });

    document.getElementById("xarb-calc").addEventListener("submit", function (ev) {
      ev.preventDefault();
      var res = clmmCrossArbitrage(
        document.getElementById("xarb-l").value,
        document.getElementById("xarb-lower").value,
        document.getElementById("xarb-upper").value,
        document.getElementById("xarb-price").value,
        document.getElementById("xarb-ext").value,
        document.getElementById("xarb-fee").value,
        document.getElementById("xarb-l2").value,
        document.getElementById("xarb-outer").value
      );
      var out = document.getElementById("xarb-result");
      if (res === null) {
        out.textContent = "Enter liquidity above 0 for both ranges, a range with lower below upper, a current price strictly inside the first range, an external price above 0, a fee tier in whole basis points (0–9999), and a second range whose outer edge sits beyond the first range on the side of your external price.";
        document.getElementById("xarb-out").value = "";
      } else if (res.direction === "none") {
        out.textContent = "Model output: the range's spot price is already ≈ " + fmt(res.spotPrice, 6) + " B per A, so there is no price-aligning trade to size at your external price and neither range is touched. A CLMM two-range arbitrage model, not live pool data — not financial advice.";
        document.getElementById("xarb-out").value = fmt(0, 6);
      } else {
        var dirText = res.direction === "buy-a"
          ? "token A is cheap in the pool: pay token B in and take token A out"
          : "token A is expensive in the pool: pay token A in and take token B out";
        var crossText;
        if (!res.crossed) {
          crossText = " Your external price sits inside the first range, so the trade never crosses: this is tool 77's single-range answer and the second range is untouched.";
        } else if (res.hitSecondBoundary) {
          crossText = " The trade crosses the shared edge at ≈ " + fmt(res.boundaryPrice, 6) + " B per A (leg 1: ≈ " + fmt(res.leg1GrossIn, 6) + " " + res.inToken + " in for ≈ " + fmt(res.leg1Out, 6) + " " + res.outToken + " out) and continues into the second range (leg 2: ≈ " + fmt(res.leg2GrossIn, 6) + " " + res.inToken + " in for ≈ " + fmt(res.leg2Out, 6) + " " + res.outToken + " out), but your external price sits beyond the second range's outer edge, so the combined trade stops at that edge — the post-trade spot is the edge, not your price, and a live pool would need a third range to finish aligning.";
        } else {
          crossText = " The trade crosses the shared edge at ≈ " + fmt(res.boundaryPrice, 6) + " B per A (leg 1: ≈ " + fmt(res.leg1GrossIn, 6) + " " + res.inToken + " in for ≈ " + fmt(res.leg1Out, 6) + " " + res.outToken + " out) and finishes aligning inside the second range (leg 2: ≈ " + fmt(res.leg2GrossIn, 6) + " " + res.inToken + " in for ≈ " + fmt(res.leg2Out, 6) + " " + res.outToken + " out). The fee is charged on each leg, so crossing costs the fee twice.";
        }
        out.textContent = "Model output: the range's spot price is ≈ " + fmt(res.spotPrice, 6) +
          " B per A against your external price of ≈ " + fmt(res.externalPrice, 6) + " (a gap of ≈ " + fmt(res.priceGapPct, 4) + "%) — " + dirText +
          ". The price-aligning trade pays ≈ " + fmt(res.grossIn, 6) + " of token " + res.inToken + " in (≈ " + fmt(res.netIn, 6) +
          " after the fees reach the ranges) and takes ≈ " + fmt(res.amountOut, 6) + " of token " + res.outToken +
          " out, leaving the price at ≈ " + fmt(res.postTradeSpot, 6) + " B per A." + crossText +
          " Modelled profit valued in B at your external price: ≈ " + fmt(res.profitInB, 6) +
          " B — a gap smaller than the combined fees honestly comes out negative. A CLMM two-range arbitrage model over a price you typed — not a live feed, not a found opportunity, not financial advice.";
        document.getElementById("xarb-out").value = fmt(res.profitInB, 6);
      }
    });

    document.getElementById("tarb-calc").addEventListener("submit", function (ev) {
      ev.preventDefault();
      var res = clmmTripleArbitrage(
        document.getElementById("tarb-l").value,
        document.getElementById("tarb-lower").value,
        document.getElementById("tarb-upper").value,
        document.getElementById("tarb-price").value,
        document.getElementById("tarb-ext").value,
        document.getElementById("tarb-fee").value,
        document.getElementById("tarb-l2").value,
        document.getElementById("tarb-outer").value,
        document.getElementById("tarb-l3").value,
        document.getElementById("tarb-outer3").value
      );
      var out = document.getElementById("tarb-result");
      if (res === null) {
        out.textContent = "Enter liquidity above 0 for all three ranges, a range with lower below upper, a current price strictly inside the first range, an external price above 0, a fee tier in whole basis points (0–9999), a second range whose outer edge sits beyond the first range on the side of your external price, and a third range whose outer edge sits beyond the second range on that same side.";
        document.getElementById("tarb-out").value = "";
      } else if (res.direction === "none") {
        out.textContent = "Model output: the range's spot price is already ≈ " + fmt(res.spotPrice, 6) + " B per A, so there is no price-aligning trade to size at your external price and no range is touched. A CLMM three-range arbitrage model, not live pool data — not financial advice.";
        document.getElementById("tarb-out").value = fmt(0, 6);
      } else {
        var dirText = res.direction === "buy-a"
          ? "token A is cheap in the pool: pay token B in and take token A out"
          : "token A is expensive in the pool: pay token A in and take token B out";
        var crossText;
        if (!res.crossed) {
          crossText = " Your external price sits inside the first range, so the trade never crosses: this is tool 77's single-range answer and the second and third ranges are untouched.";
        } else if (!res.enteredThird && res.hitSecondBoundary) {
          crossText = " The trade crosses the shared edge at ≈ " + fmt(res.boundaryPrice, 6) + " B per A (leg 1: ≈ " + fmt(res.leg1GrossIn, 6) + " " + res.inToken + " in for ≈ " + fmt(res.leg1Out, 6) + " " + res.outToken + " out) and finishes aligning exactly at the second range's outer edge (leg 2: ≈ " + fmt(res.leg2GrossIn, 6) + " " + res.inToken + " in for ≈ " + fmt(res.leg2Out, 6) + " " + res.outToken + " out), so the third range is untouched — this is tool 79's two-range answer.";
        } else if (!res.enteredThird) {
          crossText = " The trade crosses the shared edge at ≈ " + fmt(res.boundaryPrice, 6) + " B per A (leg 1: ≈ " + fmt(res.leg1GrossIn, 6) + " " + res.inToken + " in for ≈ " + fmt(res.leg1Out, 6) + " " + res.outToken + " out) and finishes aligning inside the second range (leg 2: ≈ " + fmt(res.leg2GrossIn, 6) + " " + res.inToken + " in for ≈ " + fmt(res.leg2Out, 6) + " " + res.outToken + " out), so the third range is untouched — this is tool 79's two-range answer.";
        } else if (res.hitThirdBoundary) {
          crossText = " The trade crosses the first edge at ≈ " + fmt(res.boundaryPrice, 6) + " B per A (leg 1: ≈ " + fmt(res.leg1GrossIn, 6) + " " + res.inToken + " in for ≈ " + fmt(res.leg1Out, 6) + " " + res.outToken + " out), crosses the second edge at ≈ " + fmt(res.secondBoundaryPrice, 6) + " (leg 2: ≈ " + fmt(res.leg2GrossIn, 6) + " " + res.inToken + " in for ≈ " + fmt(res.leg2Out, 6) + " " + res.outToken + " out) and continues into the third range (leg 3: ≈ " + fmt(res.leg3GrossIn, 6) + " " + res.inToken + " in for ≈ " + fmt(res.leg3Out, 6) + " " + res.outToken + " out), but your external price sits beyond the third range's outer edge, so the combined trade stops at that edge — the post-trade spot is the edge, not your price, and a live pool would need a fourth range to finish aligning.";
        } else {
          crossText = " The trade crosses the first edge at ≈ " + fmt(res.boundaryPrice, 6) + " B per A (leg 1: ≈ " + fmt(res.leg1GrossIn, 6) + " " + res.inToken + " in for ≈ " + fmt(res.leg1Out, 6) + " " + res.outToken + " out), crosses the second edge at ≈ " + fmt(res.secondBoundaryPrice, 6) + " (leg 2: ≈ " + fmt(res.leg2GrossIn, 6) + " " + res.inToken + " in for ≈ " + fmt(res.leg2Out, 6) + " " + res.outToken + " out) and finishes aligning inside the third range (leg 3: ≈ " + fmt(res.leg3GrossIn, 6) + " " + res.inToken + " in for ≈ " + fmt(res.leg3Out, 6) + " " + res.outToken + " out). The fee is charged on each leg, so crossing twice costs the fee three times.";
        }
        out.textContent = "Model output: the range's spot price is ≈ " + fmt(res.spotPrice, 6) +
          " B per A against your external price of ≈ " + fmt(res.externalPrice, 6) + " (a gap of ≈ " + fmt(res.priceGapPct, 4) + "%) — " + dirText +
          ". The price-aligning trade pays ≈ " + fmt(res.grossIn, 6) + " of token " + res.inToken + " in (≈ " + fmt(res.netIn, 6) +
          " after the fees reach the ranges) and takes ≈ " + fmt(res.amountOut, 6) + " of token " + res.outToken +
          " out, leaving the price at ≈ " + fmt(res.postTradeSpot, 6) + " B per A." + crossText +
          " Modelled profit valued in B at your external price: ≈ " + fmt(res.profitInB, 6) +
          " B — a gap smaller than the combined fees honestly comes out negative. A CLMM three-range arbitrage model over a price you typed — not a live feed, not a found opportunity, not financial advice.";
        document.getElementById("tarb-out").value = fmt(res.profitInB, 6);
      }
    });

    /* --- copy donation address --- */
    document.getElementById("copy-address").addEventListener("click", function () {
      var addr = document.getElementById("donation-address").textContent.trim();
      var done = function () { document.getElementById("copy-status").textContent = "SOL address copied."; };
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(addr).then(done, function () {
          document.getElementById("copy-status").textContent = "Copy failed — select the address text manually.";
        });
      } else {
        document.getElementById("copy-status").textContent = "Select the address text to copy it.";
      }
    });
  });
}
