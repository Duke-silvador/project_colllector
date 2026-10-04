import random
def play_hangman():
    words = ["python", "coding", "website", "developing", "games"]
    target_word = random.choice(words)
    
    'letter_guessed = [] 
    incorrect_guessed = 0
    maximum_incorrect_guessed = 6

    print("--Welcome To CodeAlpha Hangman Game!--")

    while incorrect_guessed < maximum_incorrect_guessed:
        display_word = ""
        
        for letter in target_word:
            if letter in letter_guessed:
                display_word = display_word + letter + " "
            else:
                display_word = display_word + "_ "
                
        print("\nWord to guess:", display_word)
        print("Mistakes made:", incorrect_guessed, "out of", maximum_incorrect_guessed)
        
        if "_" not in display_word:
            print("Congratulations! You guessed the word:", target_word, "and won!")
            
            # Save the winning result to a text file
            with open("hangman_result.txt", "w") as file:
                file.write("Game Result: WON\nThe word was: " + target_word)
            print("Game result saved to hangman_result.txt")
            
            break

        guess = input("Enter a letter: ")
        guess = guess.lower()
        
        if len(guess) != 1:
            print("Please enter only one letter.")
            continue

        if guess in letter_guessed:
            print("You have already guessed that letter.")
            continue

        letter_guessed.append(guess)
        
        if guess in target_word:
            print("Good guess! " + guess + " is in the word.")
        else:
            incorrect_guessed = incorrect_guessed + 1
            print("Wrong guess! " + guess + " is not in the word.")

    if incorrect_guessed == maximum_incorrect_guessed:
        print("\nGame Over! The correct word was:", target_word)
        
        # Save the losing result to a text file
        with open("hangman_result.txt", "w") as file:
            file.write("Game Result: LOST\nThe word was: " + target_word)
        print("Game result saved to hangman_result.txt")

play_hangman()
