def analyze(match):
    text = match.lower()

    strengths = []
    weaknesses = []
    momentum = []

    if "attack" in text or "chances" in text:
        strengths.append("good attack")
    if "possession" in text:
        strengths.append("good possession")
    if "passing" in text:
        strengths.append("good passing")
    if "scored" in text:
        strengths.append("good finishing")
    if "pressing" in text or "pressed" in text:
        strengths.append("good pressing")
    if "defended well" in text:
        strengths.append("strong defense")
    if "conceded" in text or "defense struggled" in text:
        weaknesses.append("defensive problems")
    if "poor passing" in text:
        weaknesses.append("poor passing")
    if "missed chances" in text:
        weaknesses.append("poor finishing")
    if "midfield struggled" in text:
        weaknesses.append("weak midfield")
    if "lost control" in text:
        weaknesses.append("lost control")
    if "started slowly" in text or "slow start" in text:
        weaknesses.append("slow start")
    if "tired" in text or "lost energy" in text:
        weaknesses.append("poor stamina")
    if "started strongly" in text:
        momentum.append("strong start")
    if "halftime" in text or "second half" in text:
        momentum.append("dropped after halftime")
    if "lost momentum" in text:
        momentum.append("lost momentum")
    if "finished strongly" in text:
        momentum.append("strong finish")
    if "comeback" in text:
        momentum.append("comeback")
    return strengths, weaknesses, momentum

def suggestion(weaknesses):
    if "defensive problems" in weaknesses:
        return "Improve defensive organization"
    if "weak midfield" in weaknesses:
        return "Improve midfield control"
    if "poor finishing" in weaknesses:
        return "Work on finishing"
    if "poor passing" in weaknesses:
        return "Improve passing accuracy"
    if "lost control" in weaknesses:
        return "Keep possession for longer"
    if "poor stamina" in weaknesses:
        return "Improve stamina"
    return "Keep the current approach"  