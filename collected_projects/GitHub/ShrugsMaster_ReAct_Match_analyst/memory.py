memory = {
    "matches": [],
    "strengths": [],
    "weaknesses": []
}
def save_match(match, strengths, weaknesses):
    memory["matches"].append(match)

    for x in strengths:
        memory["strengths"].append(x)

    for x in weaknesses:
        memory["weaknesses"].append(x)
def repeated(items):
    result = []

    for x in items:
        if items.count(x) >= 2 and x not in result:
            result.append(x)

    return result