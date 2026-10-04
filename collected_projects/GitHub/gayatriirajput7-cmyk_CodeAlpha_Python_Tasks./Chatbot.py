print("Hello! I am a simple chatbot. Type 'bye' to exit.")
while True:
    user_message = input("\nI am a simple chatbot. Type 'bye' to exit the chat: ").strip().lower()

    if user_message == 'bye':
        print("Good Bye nice to talk to you,Have Great Day..")
        break

    elif user_message == 'hello':
        print("Hello there,how may I help You?")
    
    elif user_message == 'how are you':
        print("I'm just a bunch of code, but I'm doing great!") 

    elif user_message == 'what is your name':
         print("my name is cute little chatbot.")
    else:
        print("Ohh,Sorry, I don't understand that yet.")
        