# +++++++++++++++ If Condition +++++++++++++++

age = 4

if age < 6:
    print("Child")

# ++++++++++++++++ If Else ++++++++++++++++++

num = 10

if num > 0:
    print("positive number")
else:
    print("negative number")


# +++++++++++++++++ If Elif Else ++++++++++++++++++++++++

a = 0

if a > 0:
    print("number is positive")
elif a < 0:
    print("number is negative")
else:
    print("number is zero")


# +++++++++++++++++++ Short hand for if else ++++++++++++++++

a=10
print("a is positive") if a > 0 else print("a is negative")


# ++++++++++++++++ Nested Conditions +++++++++++++++++++++++++

num = 0

if num > 0:
    if num % 2 == 0:
        print("number is postive and even")
    else:
        print("number is odd")
elif num == 0:
    print("number is zero")
else:
    print("number is negative")


# ++++++++++++++ If Condition and Logical Operators +++++++++++

# and operator

a = 3

if a > 0 and a % 2 == 0:
    print("a is positive even integer")
elif a > 0 and a % 2 != 0:
    print("a is positive integer")
elif a == 0:
    print("a is zero")
else:
    print("a is negative")


# or operator

role = "editor"

if role == "editor" or role == "admin":
    print("access granted")
else:
    print("access denied")


# +++++++++++++++++ Exercise ++++++++++++++++

a = input("Enter a : ")
b = input("enter b : ")

if a > b:
    print("a is greater than b")
elif a < b:
    print("a is less than b")
else:
    print("both are equal")


person={
    'first_name': 'Selena',
    'last_name': 'Khan',
    'age': 17,
    'country': 'Wonderland',
    'is_married': False,
    'skills': ['JavaScript', 'React', 'Node', 'MongoDB', 'Python'],
    'address': {
        'street': 'Space street',
        'zipcode': '02210'
    }
    }   

skills = person["skills"]
print(skills)

if "React" in skills:
    print("React Developer")
else:
    print("Unknown title")



print(skills[(len(skills)-1) // 2]) # middle element of skills