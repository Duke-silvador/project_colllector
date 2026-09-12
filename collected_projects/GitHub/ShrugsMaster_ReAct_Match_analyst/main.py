import reasoning
from matchdata import matches
from tools import analyze, suggestion
from memory import memory, save_match, repeated

def run_agent(match):
    print("\nTHOUGHT")
    print(reasoning.think(match))
    print("ACTION")
    print(reasoning.choose_action())
    strengths, weaknesses, momentum = analyze(match)
    print("OBSERVATION")
    print(reasoning.observe(strengths, weaknesses, momentum))
    save_match(match, strengths, weaknesses)
    print("RESPONSE")
    print("Strengths:", ", ".join(strengths) or "None")
    print("Weaknesses:", ", ".join(weaknesses) or "None")
    print("Momentum:", ", ".join(momentum) or "None")
    print("Suggestion:", suggestion(weaknesses))

print("Liverpool Match Analyst")
print("\n1. Try sample matches")
print("2. Enter your own match")

while True:
    choice = input("\nChoose 1 or 2: ")
    if choice == "1" or choice == "2":
        break
    print("Please enter 1 or 2.")

if choice == "1":
    for i, match in enumerate(matches, 1):
        print("\nMATCH", i)
        run_agent(match)
else:
    while True:
        match = input("\nEnter match summary or type 'done': ")
        if match.lower() == "done":
            break
        run_agent(match)

print("\nOVERALL MEMORY")
print("Repeated strengths:", repeated(memory["strengths"]) or "None")
print("Repeated weaknesses:", repeated(memory["weaknesses"]) or "None")