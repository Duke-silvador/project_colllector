# from flask import Flask
import time

# app = Flask(__name__)
# @app.route('/')
# def hello_coder():
#     return 'Hello Coder!'

# def delay_decorator(func):
#     def wrapper():
#         time.sleep(5)
#         func()
#     return wrapper
#
# @delay_decorator
# def hello_code():
#     return 'Hello Code!'
#
# hello_code()

# def emphasize_decorator(function):
#     def wrapper():
#         return f'<p><em>{function()}</em></p>'
#     return wrapper
#
# @app.route('/bye')
# @emphasize_decorator
# def bye():
#     return 'Bye!'
#
# if __name__ == '__main__':
#     app.run(debug=True)

# More decorator plays

# current_time = time.time()
# print(f"The current time is: {current_time}")  # seconds since Jan 1st, 1970
#
# def speed_calc_decorator(func):
#     def wrapper():
#         start_time = time.time()
#         result = func()
#         end_time = time.time()
#         print(f"Current function being used is: {func.__name__} and it's run speed: {end_time - start_time}s")
#         return result
#
#     return wrapper
#
# @speed_calc_decorator
# def fast_function():
#     for i in range(1000000):
#         i * i
#
# @speed_calc_decorator
# def slow_function():
#     for i in range(10000000):
#         i * i
#
# fast_function()
# slow_function()

def logging_decorator(func):
    def wrapper(*args):
        result = func(*args)
        print(f"You called {func.__name__}{args}\nIt returned: {result}")
        return result
    return wrapper

@logging_decorator
def a_function(*args):
    return sum(args)

a_function(1, 2, 3)