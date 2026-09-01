from flask import Flask
import random

app = Flask(__name__)
number = random.randint(0, 9)
print(number)
@app.route('/')
def welcome():
    return (f'<h1>Guess a number between 0 and 9: </h1>'
            f'<img src="https://media.giphy.com/media/3o7aCSPqXE5C6T8tBC/giphy.gif" '
            f'alt="Guess a Number">')

@app.route('/<guess>')
def view(guess):
    if int(guess) == number:
        return (f'<h1>You got me!</h1>'
                f'<img src="https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExZDZzZDdzbXcyNDgwZGcwaXgwcmFycXJoaDIwM242d3pxNm5xZnhsaiZlcD12MV9naWZzX3NlYXJjaCZjdD1n/dLhoOYRmsJVOhKbyTK/giphy.gif" '
                f'alt="Correct Number Guessed">')
    elif int(guess) < number:
        return (f'<h1>Too low, try again!</h1>'
                f'<img src="https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExYjg4aTQ2YXlqa21qbm45ZnRkMXJ5Ym5xZzNtdDh4d2ZnajRycWh6aSZlcD12MV9naWZzX3NlYXJjaCZjdD1n/hPPx8yk3Bmqys/giphy.gif" '
                f'alt="Guessed number is lower, try again">')
    elif int(guess) > number:
        return (f'<h1>Too high, try again!</h1>'
                f'<img src="https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExYjg4aTQ2YXlqa21qbm45ZnRkMXJ5Ym5xZzNtdDh4d2ZnajRycWh6aSZlcD12MV9naWZzX3NlYXJjaCZjdD1n/hPPx8yk3Bmqys/giphy.gif" '
                f'alt="Guessed number is higher, try again">')
    else:
        return (f'<h1>Wrong option, try again!</h1>')

if __name__ == '__main__':
    app.run(debug=True)