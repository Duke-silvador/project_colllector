import random

def choose_word():
    words = ["python", "hangman", "internship", "developer", "computer"]
    return random.choice(words)

def display_hangman(wrong_guesses):
    stages = [
        """
           ------
           |    |
           |
           |
           |
           |
        --------
        """,
        """
           ------
           |    |
           |    O
           |
           |
           |
        --------
        """,
        """
           ------
           |    |
           |    O
           |    |
           |
           |
        --------
        """,
        """
           ------
           |    |
           |    O
           |   /|
           |
           |
        --------
        """,
        """
           ------
           |    |
           |    O
           |   /|\\
           |
           |
        --------
        """,
        """
           ------
           |    |
           |    O
           |   /|\\
           |   /
           |
        --------
        """,
        """
           ------
           |    |
           |    O
           |   /|\\
           |   / \\
           |
        --------
        """
    ]
    return stages[wrong_guesses]

def play_hangman():
    word = choose_word()
    guessed_letters = []
    wrong_guesses = 0
    max_wrong = 6

    print("Welcome to Hangman!")
    print("Guess the word, one letter at a time.")

    while wrong_guesses < max_wrong:
        print(display_hangman(wrong_guesses))

        display_word = ""
        for letter in word:
            if letter in guessed_letters:
                display_word += letter + " "
            else:
                display_word += "_ "
        print("Word: " + display_word)

        if "_" not in display_word:
            print(f"\nCongratulations! You guessed the word: {word}")
            break

        guess = input("\nGuess a letter: ").lower()

        if len(guess) != 1 or not guess.isalpha():
            print("Please enter a single valid letter.")
            continue

        if guess in guessed_letters:
            print("You already guessed that letter.")
            continue

        guessed_letters.append(guess)

        if guess in word:
            print(f"Good guess! '{guess}' is in the word.")
        else:
            wrong_guesses += 1
            print(f"Wrong guess! '{guess}' is not in the word.")
            print(f"Wrong guesses left: {max_wrong - wrong_guesses}")

    else:
        print(display_hangman(wrong_guesses))
        print(f"\nGame over! You've used all your guesses. The word was: {word}")

    play_again = input("\nDo you want to play again? (yes/no): ").lower()
    if play_again == "yes":
        play_hangman()
    else:
        print("Thanks for playing! Goodbye.")

if __name__ == "__main__":
    play_hangman()