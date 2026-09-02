from __future__ import annotations

from typing import Any, Optional


# ============================================================
# Helpers
# ============================================================

def clean(value: Any) -> Optional[str]:
    if value is None:
        return None
    text = str(value).strip()
    return text or None


def human(value: Any) -> Optional[str]:
    text = clean(value)
    return text.replace("_", " ") if text else None


def num(value: Any) -> Optional[str]:
    if value is None:
        return None
    try:
        x = float(value)
    except (TypeError, ValueError):
        return None
    return f"{int(x):,}" if x.is_integer() else f"{x:,.2f}"


def pct(value: Any) -> Optional[str]:
    if value is None:
        return None
    try:
        return f"{float(value) * 100:.0f}%"
    except (TypeError, ValueError):
        return None


def category_slug(category: dict) -> str:
    return str(category.get("slug") or category.get("category_slug") or "").lower()


def category_term(category: dict) -> str:
    return {
        "dentists": "dental practice",
        "salons": "salon",
        "restaurants": "restaurant",
        "gyms": "gym",
        "pharmacies": "pharmacy",
    }.get(category_slug(category), human(category_slug(category)) or "business")


def merchant_name(merchant: dict) -> str:
    identity = merchant.get("identity", {})
    if not isinstance(identity, dict):
        identity = {}
    return clean(identity.get("name") or merchant.get("merchant_name")) or "your business"


def owner_name(merchant: dict) -> str:
    identity = merchant.get("identity", {})
    if not isinstance(identity, dict):
        identity = {}
    return clean(identity.get("owner_first_name")) or merchant_name(merchant)


def payload(trigger: dict) -> dict:
    p = trigger.get("payload", {})
    return p if isinstance(p, dict) else {}


def suppression(trigger: dict) -> str:
    return clean(trigger.get("suppression_key") or trigger.get("id")) or "unknown_trigger"


def active_offers(merchant: dict) -> list[str]:
    offers = merchant.get("offers", [])
    if not isinstance(offers, list):
        return []
    out = []
    for offer in offers:
        if not isinstance(offer, dict) or str(offer.get("status", "")).lower() != "active":
            continue
        name = clean(offer.get("name") or offer.get("title") or offer.get("service"))
        price = num(offer.get("price"))
        if name and price:
            out.append(f"{name} @ ₹{price}")
        elif name:
            out.append(name)
    return out


def first_offer(merchant: dict) -> Optional[str]:
    offers = active_offers(merchant)
    return offers[0] if offers else None


def result(body: str, trigger: dict, send_as: str = "vera", cta: str = "open_ended", rationale: str = "") -> dict:
    return {
        "body": body,
        "cta": cta,
        "send_as": send_as,
        "suppression_key": suppression(trigger),
        "rationale": rationale,
    }


def empty_result(trigger: dict, send_as: str = "vera", reason: str = "") -> dict:
    return result("", trigger, send_as=send_as, cta="none", rationale=reason)


# ============================================================
# Merchant handlers
# ============================================================

def find_research_item(category: dict, trigger: dict) -> Optional[dict]:
    p = payload(trigger)
    for key in ("top_item", "item", "research_item"):
        item = p.get(key)
        if isinstance(item, dict):
            return item
    top_id = clean(p.get("top_item_id"))
    digest = category.get("digest", [])
    if isinstance(digest, list):
        if top_id:
            for item in digest:
                if not isinstance(item, dict):
                    continue
                item_id = clean(item.get("id") or item.get("item_id") or item.get("digest_id"))
                if item_id == top_id:
                    return item
        for item in digest:
            if isinstance(item, dict):
                return item
    return None


def research(category: dict, merchant: dict, trigger: dict) -> dict:
    name = owner_name(merchant)
    item = find_research_item(category, trigger)
    if not item:
        return result(
            f"{name}, there's a research update relevant to your {category_term(category)}. Want me to pull out the key point?",
            trigger,
            rationale="Research trigger detected without a specific digest item."
        )
    bits = [f"{name}, there's a useful research update relevant to your practice."]
    segment = human(item.get("patient_segment"))
    title = clean(item.get("title"))
    trials = num(item.get("trial_n"))
    source = clean(item.get("source"))
    if segment:
        bits.append(f" It is especially relevant to {segment}.")
    if title:
        bits.append(f" {title}.")
    if trials:
        bits.append(f" The trial included {trials} participants.")
    if source:
        bits.append(f" Source: {source}.")
    bits.append(" Want me to pull out the key takeaway?")
    return result("".join(bits), trigger, rationale="Uses the referenced research item from category/trigger context.")


def performance_trigger(category: dict, merchant: dict, trigger: dict, spike: bool) -> dict:
    name = owner_name(merchant)
    p = payload(trigger)
    metric = human(p.get("metric"))
    delta_pct = p.get("delta_pct")
    baseline = num(p.get("vs_baseline"))
    driver = human(p.get("likely_driver"))

    if metric and delta_pct is not None:
        try:
            d = float(delta_pct)
            value = abs(d) * 100 if not spike else d * 100
            verb = "are" if metric.endswith(("calls", "views")) else "is"
            direction = "up" if spike else "down"
            body = f"{name}, {metric} {verb} {value:.0f}% versus your recent baseline."
            if baseline:
                body += f" The comparison baseline is {baseline}."
            if driver:
                body += f" The trigger points to {driver} as the likely driver."
            body += " Want me to break down what is driving it?" if spike else " Want me to check the most likely reason for the change?"
            return result(body, trigger, rationale="Uses the trigger's measured performance change and supplied baseline/driver where available.")
        except (TypeError, ValueError):
            pass

    # Fallback to merchant performance context.
    perf = merchant.get("performance", {}) if isinstance(merchant.get("performance", {}), dict) else {}
    delta = perf.get("delta_7d", {}) if isinstance(perf.get("delta_7d", {}), dict) else {}
    body = f"{name}, your latest performance snapshot is moving {'up' if spike else 'down'}."
    calls = delta.get("calls_pct")
    views = delta.get("views_pct")
    if calls is not None:
        try:
            val = float(calls)
            if (spike and val > 0) or ((not spike) and val < 0):
                body += f" Calls are {'up' if spike else 'down'} {abs(val) * 100:.0f}%."
        except (TypeError, ValueError):
            pass
    if views is not None:
        try:
            val = float(views)
            if (spike and val > 0) or ((not spike) and val < 0):
                body += f" Views are {'up' if spike else 'down'} {abs(val) * 100:.0f}%."
        except (TypeError, ValueError):
            pass
    body += " Want me to break down what is driving it?" if spike else " Want me to check the most likely reason for the change?"
    return result(body, trigger, rationale="Uses merchant performance context as a fallback when trigger metrics are absent.")


def milestone(category: dict, merchant: dict, trigger: dict) -> dict:
    name = owner_name(merchant)
    p = payload(trigger)
    metric = human(p.get("metric") or p.get("metric_name")) or "metric"
    now = p.get("value_now")
    target = p.get("milestone_value")
    if now is not None and target is not None:
        try:
            remaining = float(target) - float(now)
            if remaining > 0:
                body = f"{name}, you're at {num(now) or now} {metric}, with {num(remaining) or remaining} to go to {num(target) or target}."
            elif remaining == 0:
                body = f"{name}, you've reached {num(target) or target} {metric}."
            else:
                body = f"{name}, you've crossed the {num(target) or target} {metric} milestone."
        except (TypeError, ValueError):
            body = f"{name}, your next {metric} milestone is {target}."
    else:
        body = f"{name}, your next {metric} milestone is {target}." if target is not None else f"{name}, there's a milestone coming up on {metric}."
    body += " Want me to suggest a simple way to use the momentum?"
    return result(body, trigger, rationale="Uses the current milestone values supplied by the trigger.")


def renewal(category: dict, merchant: dict, trigger: dict) -> dict:
    name = owner_name(merchant)
    p = payload(trigger)
    sub = merchant.get("subscription", {}) if isinstance(merchant.get("subscription", {}), dict) else {}
    days = p.get("days_remaining", sub.get("days_remaining"))
    plan = clean(p.get("plan"))
    amount = num(p.get("renewal_amount"))
    timing = "your plan is nearing renewal"
    try:
        d = int(days)
        timing = "your plan is due now" if d <= 0 else ("your plan has 1 day left" if d == 1 else f"your plan has {d} days left")
    except (TypeError, ValueError):
        pass
    body = f"{name}, {timing}."
    if plan:
        body += f" This is for your {plan} plan."
    if amount:
        body += f" Renewal is ₹{amount}."
    body += " Want me to show the renewal options?"
    return result(body, trigger, rationale="Uses trigger subscription timing and plan details.")


def dormant(category: dict, merchant: dict, trigger: dict) -> dict:
    name = owner_name(merchant)
    p = payload(trigger)
    days = p.get("days_since_last_merchant_message")
    body = f"{name}, it's been a while since we last worked on your listing."
    if days is not None:
        body += f" It's been {days} days since your last merchant message."
    signals = p.get("signals")
    if isinstance(signals, list) and signals:
        sig = human(signals[0] if not isinstance(signals[0], dict) else signals[0].get("name") or signals[0].get("type"))
        if sig:
            body += f" I also noticed {sig}."
    body += " Want me to show one thing worth fixing?"
    return result(body, trigger, rationale="Re-engages using supplied dormancy context.")


def festival(category: dict, merchant: dict, trigger: dict) -> dict:
    name = owner_name(merchant)
    p = payload(trigger)
    event = clean(p.get("event") or p.get("festival") or p.get("name"))
    days = p.get("days_until", p.get("days_remaining", p.get("days")))
    body = f"{name}, {event or 'an upcoming seasonal event'}"
    if days is not None:
        body += f" is {days} days away."
    else:
        body += " is coming up."
    offer = first_offer(merchant)
    if offer:
        body += f" You already have {offer} active."
    body += " Want me to draft the campaign?"
    return result(body, trigger, rationale="Connects the seasonal event with supplied merchant context.")


def review_theme(category: dict, merchant: dict, trigger: dict) -> dict:
    name = owner_name(merchant)
    p = payload(trigger)
    theme = human(p.get("theme") or p.get("review_theme") or p.get("topic"))
    count = p.get("occurrences_30d", p.get("count", p.get("review_count")))
    trend = human(p.get("trend"))
    quote = clean(p.get("common_quote"))
    body = f"{name}, {count} recent reviews mention \"{theme}\"." if theme and count is not None else f"{name}, recent reviews repeatedly mention \"{theme}\"." if theme else f"{name}, there's a repeated theme in your recent customer reviews."
    if trend:
        body += f" The theme is {trend}."
    if quote:
        body += f" One recent example: \"{quote}\""
    body += " Want me to show the pattern?"
    return result(body, trigger, rationale="Uses concrete review-theme context supplied by the trigger.")


def competitor(category: dict, merchant: dict, trigger: dict) -> dict:
    name = owner_name(merchant)
    p = payload(trigger)
    comp = clean(p.get("competitor_name"))
    distance = clean(p.get("distance_km") if p.get("distance_km") is not None else p.get("distance"))
    if comp and distance:
        body = f"{name}, {comp} opened {distance} km away."
    elif comp:
        body = f"{name}, a new {category_term(category)} competitor opened nearby: {comp}."
    else:
        body = f"{name}, a new competitor has appeared nearby."
    body += " Want me to show what you can do about it?"
    return result(body, trigger, rationale="Uses the local competitive event supplied by the trigger.")


def curious(category: dict, merchant: dict, trigger: dict) -> dict:
    name = owner_name(merchant)
    return result(f"{name}, quick question about your {category_term(category)}: what's the service customers ask you about most right now?", trigger, rationale="Uses an open-ended engagement lever with category-specific wording.")


def regulation(category: dict, merchant: dict, trigger: dict) -> dict:
    name = owner_name(merchant)
    p = payload(trigger)
    item_id = clean(p.get("top_item_id") or p.get("item_id"))
    topic = clean(p.get("topic") or p.get("regulation") or p.get("title"))
    if item_id and "dci_radiograph" in item_id.lower():
        topic = "DCI radiograph compliance update"
    deadline = clean(p.get("deadline_iso") or p.get("deadline"))
    body = f"{name}, there's a compliance update relevant to your practice."
    if topic:
        body += f" {topic}."
    if deadline:
        body += f" The stated deadline is {deadline}."
    body += " Want me to summarize the action points?"
    return result(body, trigger, rationale="Uses the regulation topic and deadline supplied by the trigger.")


def planning(category: dict, merchant: dict, trigger: dict) -> dict:
    name = owner_name(merchant)
    p = payload(trigger)
    topic = human(p.get("intent_topic") or p.get("topic"))
    last_msg = clean(p.get("merchant_last_msg") or p.get("last_message"))
    body = f"{name}, you're already planning {topic or 'a new customer offer'}."
    if last_msg:
        body += f' Your latest note was: "{last_msg}"'
    body += " Want me to help turn that into the next concrete step?"
    return result(body, trigger, rationale="Recognizes an active planning intent and anchors the message to supplied context.")


def winback(category: dict, merchant: dict, trigger: dict) -> dict:
    name = owner_name(merchant)
    p = payload(trigger)
    days = p.get("days_since_expiry")
    lapsed = p.get("lapsed_customers_added")
    body = f"{name}, your account is eligible for a win-back push."
    if days is not None:
        body += f" Eligibility was triggered {days} days after expiry."
    if lapsed is not None:
        body += f" The trigger shows {num(lapsed) or lapsed} lapsed customers in the pool."
    body += " Want me to draft one focused win-back message?"
    return result(body, trigger, rationale="Uses win-back eligibility and supplied lapse volume.")


def ipl(category: dict, merchant: dict, trigger: dict) -> dict:
    name = owner_name(merchant)
    p = payload(trigger)
    teams = clean(p.get("teams") or p.get("match")) or "an IPL match"
    venue = clean(p.get("venue"))
    city = clean(p.get("city"))
    time = clean(p.get("time") or p.get("start_time"))
    body = f"{name}, {teams} is on today"
    details = [x for x in (venue, city) if x]
    if time:
        details.append(f"at {time}")
    body += (" near your local market: " + ", ".join(details) + ".") if details else "."
    body += " Want me to suggest one match-day campaign angle?"
    return result(body, trigger, rationale="Connects supplied local match details to a merchant-relevant campaign.")


def seasonal_dip(category: dict, merchant: dict, trigger: dict) -> dict:
    name = owner_name(merchant)
    p = payload(trigger)
    delta = p.get("views_pct")
    body = f"{name}, your seasonal performance dip is worth reviewing."
    try:
        d = float(delta)
        body += f" Views are down {abs(d) * 100:.0f}%." if d < 0 else f" Views are up {d * 100:.0f}%."
    except (TypeError, ValueError):
        pass
    if p.get("expected_seasonal") is True:
        body += " The trigger marks this as an expected seasonal pattern."
    note = clean(p.get("note"))
    if note:
        body += f" {note}."
    body += " Want me to focus on a recovery action that fits the season?"
    return result(body, trigger, rationale="Uses supplied seasonal performance context rather than assuming an unexplained decline.")


def supply_alert(category: dict, merchant: dict, trigger: dict) -> dict:
    if category_slug(category) != "pharmacies":
        return empty_result(trigger, reason="Supply alerts are restricted to pharmacy context.")
    name = owner_name(merchant)
    p = payload(trigger)
    product = clean(p.get("product") or p.get("medicine") or p.get("item")) or "an item in your pharmacy inventory"
    batches = p.get("affected_batches")
    manufacturer = clean(p.get("manufacturer"))
    body = f"{name}, there's a supply alert affecting {product}."
    if isinstance(batches, list) and batches:
        body += " Affected batches: " + ", ".join(map(str, batches)) + "."
    elif batches:
        body += f" Affected batches: {batches}."
    if manufacturer:
        body += f" Manufacturer: {manufacturer}."
    body += " Want me to show the supplied recall details?"
    return result(body, trigger, rationale="Uses only the supplied pharmacy supply-alert facts.")


def category_seasonal(category: dict, merchant: dict, trigger: dict) -> dict:
    name = owner_name(merchant)
    p = payload(trigger)
    season = clean(p.get("season") or p.get("period") or p.get("season_name")) or "current"
    trends = p.get("trends")
    body = f"{name}, your {season.replace('_', ' ')} pharmacy demand mix is shifting."
    if isinstance(trends, list) and trends:
        items = []
        for t in trends[:6]:
            if isinstance(t, dict):
                label = clean(t.get("item") or t.get("name") or t.get("product"))
                change = clean(t.get("change") or t.get("delta") or t.get("delta_pct"))
                if label and change:
                    items.append(f"{label.replace('_', ' ')} {change}")
            elif clean(t):
                items.append(clean(t).replace("_", " "))
        if items:
            body += " Key shifts: " + ", ".join(items) + "."
    else:
        shifts = []
        # Support flat generated payloads such as ors_pct / sunscreen_pct.
        for key, value in p.items():
            if key.endswith("_pct") and key not in {"expected_seasonal"}:
                try:
                    shifts.append(f"{key[:-4].replace('_', ' ')} {float(value) * 100:.0f}%")
                except (TypeError, ValueError):
                    pass
        if shifts:
            body += " Key shifts: " + ", ".join(shifts[:6]) + "."
    if p.get("shelf_action_recommended") is True:
        body += " The trigger recommends a shelf adjustment."
    body += " Want me to suggest the priority shelf action?"
    return result(body, trigger, rationale="Links supplied seasonal demand changes to a concrete pharmacy merchandising action.")


def gbp(category: dict, merchant: dict, trigger: dict) -> dict:
    if category_slug(category) != "pharmacies":
        return empty_result(trigger, reason="Profile verification trigger is kept in pharmacy context.")
    name = owner_name(merchant)
    p = payload(trigger)
    method = clean(p.get("verification_method") or p.get("next_step"))
    uplift = p.get("estimated_uplift")
    body = f"{name}, your business profile is still unverified."
    if method:
        body += f" The supplied next step is {method}."
    if uplift is not None:
        try:
            body += f" The trigger estimates about {float(uplift) * 100:.0f}% potential uplift after verification."
        except (TypeError, ValueError):
            pass
    body += " Want me to explain the verification step?"
    return result(body, trigger, rationale="Uses the supplied profile verification state and next-step context.")


def cde(category: dict, merchant: dict, trigger: dict) -> dict:
    name = owner_name(merchant)
    p = payload(trigger)
    title = clean(p.get("title") or p.get("webinar_title") or p.get("topic"))
    credits = p.get("credits")
    digest_id = clean(p.get("digest_id"))
    body = f"{name}, there's a CDE learning opportunity relevant to your practice."
    if title:
        body += f" {title}."
    if credits is not None:
        try:
            body += f" It offers {int(float(credits)) if float(credits).is_integer() else credits} credits."
        except (TypeError, ValueError):
            body += f" It offers {credits} credits."
    if p.get("free_for_members") is True:
        body += " It's free for members."
    if digest_id:
        body += f" Digest item: {digest_id}."
    body += " Want me to share the available details?"
    return result(body, trigger, rationale="Uses the supplied CDE opportunity details.")


# ============================================================
# Customer helpers/handlers
# ============================================================

def consent(customer: dict) -> bool:
    c = customer.get("consent", {})
    if not isinstance(c, dict):
        return False
    return bool((isinstance(c.get("scope"), list) and c.get("scope")) or c.get("opted_in_at"))


def customer_name(customer: dict) -> str:
    i = customer.get("identity", {})
    return clean(i.get("name")) if isinstance(i, dict) else "there"


def customer_recall(category: dict, merchant: dict, trigger: dict, customer: dict) -> dict:
    name = customer_name(customer)
    mname = merchant_name(merchant)
    rel = customer.get("relationship", {})
    rel = rel if isinstance(rel, dict) else {}
    body = f"Hi {name}, {mname} here."
    last_visit = clean(rel.get("last_visit"))
    if last_visit:
        body += f" Our records show your last visit was on {last_visit}."
    offer = first_offer(merchant)
    if offer:
        body += f" We currently have {offer}."
    slots = payload(trigger).get("available_slots")
    formatted = []
    if isinstance(slots, list):
        for idx, slot in enumerate(slots[:3], 1):
            if isinstance(slot, dict):
                label = clean(slot.get("label") or slot.get("display"))
            else:
                label = clean(slot)
            if label:
                formatted.append(f"{idx}. {label}")
    if formatted:
        body += " Available slots:\n" + "\n".join(formatted) + "\nReply with the number you prefer."
    else:
        body += " Tell us what day or time works for you."
    return result(body, trigger, send_as="merchant_on_behalf", rationale="Uses customer relationship state, active offer, and available recall slots.")


def customer_hard_lapsed(category: dict, merchant: dict, trigger: dict, customer: dict) -> dict:
    name = customer_name(customer)
    mname = merchant_name(merchant)
    p = payload(trigger)
    days = p.get("days_since_last_visit")
    if days is None:
        days = p.get("days_lapsed")
    focus = human(p.get("previous_focus") or p.get("last_focus"))
    months = p.get("previous_membership_months")
    body = f"Hi {name}, {mname} here. It's been a while since your last visit."
    if days is not None:
        body += f" Our record shows {days} days since your last visit."
    if focus:
        body += f" Your previous focus was {focus}."
    if months is not None:
        body += f" You previously had {months} membership months with us."
    body += " Would you like to plan a return?"
    return result(body, trigger, send_as="merchant_on_behalf", rationale="Uses customer lapse duration and supplied historical context.")


def customer_trial(category: dict, merchant: dict, trigger: dict, customer: dict) -> dict:
    name = customer_name(customer)
    mname = merchant_name(merchant)
    i = customer.get("identity", {})
    parent = clean(i.get("parent_name")) if isinstance(i, dict) else None
    label = f"Hi {name}" + (f" (parent: {parent})" if parent else "")
    body = f"{label}, {mname} here. Just checking whether you'd like to continue with us."
    p = payload(trigger)
    trial_date = clean(p.get("trial_date"))
    options = p.get("next_session_options") or p.get("available_slots")
    if trial_date:
        body += f" Your trial was on {trial_date}."
    formatted = []
    if isinstance(options, list):
        for idx, opt in enumerate(options[:3], 1):
            text = clean(opt.get("label") or opt.get("display")) if isinstance(opt, dict) else clean(opt)
            if text:
                formatted.append(f"{idx}. {text}")
    if formatted:
        body += " Next session options:\n" + "\n".join(formatted) + "\nReply with the number you prefer."
    return result(body, trigger, send_as="merchant_on_behalf", rationale="Ties the follow-up to the trial date and supplied next-session options.")


def customer_wedding(category: dict, merchant: dict, trigger: dict, customer: dict) -> dict:
    name = customer_name(customer)
    mname = merchant_name(merchant)
    p = payload(trigger)
    wedding = clean(p.get("wedding_date"))
    days = p.get("days_to_wedding")
    next_step = human(p.get("next_step") or p.get("next_action"))
    body = f"Hi {name}, {mname} here. Your wedding-prep follow-up is ready."
    if wedding:
        body += f" Your wedding date is {wedding}."
    if days is not None:
        body += f" That's {days} days away."
    if next_step:
        body += f" The next step is {next_step}."
    body += " Would you like us to help with that next step?"
    return result(body, trigger, send_as="merchant_on_behalf", rationale="Uses the customer's wedding date and supplied next-step context.")


def customer_refill(category: dict, merchant: dict, trigger: dict, customer: dict) -> dict:
    if category_slug(category) != "pharmacies":
        return empty_result(trigger, send_as="merchant_on_behalf", reason="Chronic refill messaging is restricted to pharmacy context.")
    name = customer_name(customer)
    mname = merchant_name(merchant)
    body = f"Hi {name}, {mname} here. Your refill reminder is due."
    runout = clean(payload(trigger).get("runs_out_date") or payload(trigger).get("stock_runs_out_date"))
    if runout:
        body += f" Your pharmacy record shows supply running out around {runout}."
    body += " Please follow the prescription and contact your clinician or pharmacist if needed."
    return result(body, trigger, send_as="merchant_on_behalf", rationale="Keeps the pharmacy refill reminder factual and avoids unsupported medical advice.")


def customer_generic(category: dict, merchant: dict, trigger: dict, customer: dict) -> dict:
    name = customer_name(customer)
    return result(f"Hi {name}, {merchant_name(merchant)} here. We have an update related to your account. Would you like the details?", trigger, send_as="merchant_on_behalf", rationale="Customer-facing fallback using the available account context.")


# ============================================================
# Routers
# ============================================================

def compose_merchant_message(category: dict, merchant: dict, trigger: dict) -> dict:
    kind = str(trigger.get("kind") or "").lower()
    handlers = {
        "research_digest": research,
        "research_digest_release": research,
        "regulation_change": regulation,
        "perf_spike": lambda c, m, t: performance_trigger(c, m, t, True),
        "perf_dip": lambda c, m, t: performance_trigger(c, m, t, False),
        "milestone_reached": milestone,
        "renewal_due": renewal,
        "dormant_with_vera": dormant,
        "festival_upcoming": festival,
        "review_theme_emerged": review_theme,
        "competitor_opened": competitor,
        "curious_ask_due": curious,
        "scheduled_recurring": curious,
        "active_planning_intent": planning,
        "winback_eligible": winback,
        "ipl_match_today": ipl,
        "seasonal_perf_dip": seasonal_dip,
        "supply_alert": supply_alert,
        "category_seasonal": category_seasonal,
        "gbp_unverified": gbp,
        "cde_opportunity": cde,
    }
    fn = handlers.get(kind)
    return fn(category, merchant, trigger) if fn else result(
        f"{owner_name(merchant)}, I have a {human(kind) or 'business'} update for your {category_term(category)}. Want me to show the useful part?",
        trigger,
        rationale="Generic fallback for an unsupported merchant trigger."
    )


def handle_customer_trigger(category: dict, merchant: dict, trigger: dict, customer: dict) -> dict:
    if not consent(customer):
        return empty_result(trigger, send_as="merchant_on_behalf", reason="Customer message suppressed because eligible consent is not present.")
    kind = str(trigger.get("kind") or "").lower()
    if kind in ("recall_due", "customer_lapsed_soft"):
        return customer_recall(category, merchant, trigger, customer)
    if kind == "customer_lapsed_hard":
        return customer_hard_lapsed(category, merchant, trigger, customer)
    if kind == "appointment_tomorrow":
        return result(f"Hi {customer_name(customer)}, {merchant_name(merchant)} here. This is a reminder about your appointment tomorrow. Reply if you need any change.", trigger, send_as="merchant_on_behalf", rationale="Appointment reminder tied directly to the customer's booking trigger.")
    if kind == "chronic_refill_due":
        return customer_refill(category, merchant, trigger, customer)
    if kind == "trial_followup":
        return customer_trial(category, merchant, trigger, customer)
    if kind in ("wedding_package_followup", "bridal_followup"):
        return customer_wedding(category, merchant, trigger, customer)
    return customer_generic(category, merchant, trigger, customer)


def validate_result(data: dict) -> dict:
    out = dict(data)
    for key in ("body", "cta", "send_as", "suppression_key", "rationale"):
        out.setdefault(key, "")
        out[key] = str(out[key])
    if out["send_as"] not in ("vera", "merchant_on_behalf"):
        out["send_as"] = "vera"
    if not out["body"].strip():
        out["cta"] = "none"
    return out


def compose(category: dict, merchant: dict, trigger: dict, customer: Optional[dict] = None) -> dict:
    category = category if isinstance(category, dict) else {}
    merchant = merchant if isinstance(merchant, dict) else {}
    trigger = trigger if isinstance(trigger, dict) else {}
    if customer is not None and not isinstance(customer, dict):
        customer = None
    if customer is not None:
        return validate_result(handle_customer_trigger(category, merchant, trigger, customer))
    return validate_result(compose_merchant_message(category, merchant, trigger))
