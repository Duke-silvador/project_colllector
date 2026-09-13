import random

# Predefined responses: keywords mapped to possible replies
responses = {
    "hello": ["Hi!", "Hello there!", "Hey! How can I help you?"],
    "hi": ["Hi!", "Hello there!", "Hey! How can I help you?"],
    "how are you": ["I'm fine, thanks!", "Doing great, thank you!", "All good here!"],
    "what is your name": ["I'm a simple chatbot built in Python.", "You can call me PyBot."],
    "bye": ["Goodbye!", "See you later!", "Bye, take care!"],
    "goodbye": ["Goodbye!", "See you later!", "Bye, take care!"],
    "thank you": ["You're welcome!", "No problem!", "Anytime!"],
    "thanks": ["You're welcome!", "No problem!", "Anytime!"]
}

default_responses = [
    "I'm not sure I understand. Can you rephrase?",
    "Sorry, I don't know that one yet.",
    "Can you ask that differently?"
]

def get_response(user_input):
    user_input = user_input.lower().strip()

    for keyword in responses:
        if keyword in user_input:
            return random.choice(responses[keyword])

    return random.choice(default_responses)

def chat():
    print("Chatbot: Hi! I'm a simple chatbot. Type 'bye' to exit.\n")

    while True:
        user_input = input("You: ")

        if user_input.lower().strip() in ["bye", "goodbye", "exit", "quit"]:
            print("Chatbot:", random.choice(responses["bye"]))
            break

        reply = get_response(user_input)
        print("Chatbot:", reply)

if __name__ == "__main__":
    chat()
