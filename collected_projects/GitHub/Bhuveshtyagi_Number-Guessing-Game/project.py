import random

#welcome message
print("Welcome to the Number Guessing Game!\n"
"I'm thinking of a number between 1 and 100.\nYou have 5 chances to guess the correct number.")

num = random.randint(1,100)

print("Please select the difficulty level:\n"
"1. Easy (10 chances)\n"
"2. Medium (5 chances)\n"
"3. Hard (3 chances)")

difficulty = int(input("Enter your choice: "))

if difficulty == 1:
    chances = 10
    print("Great! You have selected the Easy difficulty level.\n Let's start the game!")

elif difficulty == 2:
    chances = 5
    print("Great! You have selected the Medium difficulty level.\n Let's start the game!")

elif difficulty == 3:
    chances = 3
    print("Great! You have selected the Hard difficulty level.\n Let's start the game!")

else:
    print("Invalid choice. Please try again.")

attempts = 0

while chances > 0:
    guess = int(input("enter a number b/w 1-100: "))
    attempts += 1
    
    if guess == num:
        print("Congratulations! You guessed the correct number in ", attempts, "attempts.")
        break

    elif guess > num:
        print("too high")

    else:
        print("too low")
    
    chances -=1
    print("Chances left:", chances)

    if chances == 0:
        print("Game Over! The number was:", num)
