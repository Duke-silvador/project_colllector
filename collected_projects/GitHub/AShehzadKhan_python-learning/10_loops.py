# ++++++++++++++ While Loop +++++++++++++++++++

count = 0

while count < 5:
    print(count)
    count = count + 1

count = 0
while count < 5:
    print(count)
    count = count + 1
else:
    print(count)

# +++++++++++++++++ break +++++++++++++++++++

# Break: We use break when we like to get out of or stop the loop

count = 0

while count < 5:
    print(count)
    count += 1
    if count == 3:
        break

# ++++++++++++++++ continue +++++++++++++++++++
# Continue: With the continue statement we can skip the current iteration, and continue with the next:

count = 0

while count < 6:
    if count == 2:
        count += 2
        continue
    print(count)
    count += 1


# ++++++++++++++++++ For Loop +++++++++++++++++++

# -Using For loop on list

nums = [1,2,3,4,5]
for num in nums:
    print(num)


# Using For loop on strings

name = "Selena"

for letter in name:
    print(letter)

for i in range(len(name)):
    print(name[i])


# Using For loop on tuple

nums = (1,2,3,4,5)
for num in nums:
    print(num)


# -Using For loop on dictionary
# it gives keys

info = {
    "name":"Selena",
    "age":17,
    "city":"Nova"
}

for key in info:
    print(key)

for key, values in info.items():
    print(key, values)


# Using For Loop in set

cities = {"Nova", "Prague", "Zagreb", "Frankfurt"}

for city in cities:
    print(city)


# +++++++++++++++++ break and continue ++++++++++++++++++

nums = [1,2,3,4,5]

for num in nums:
        print(num)
        if num == 3:
            break
        

for num in nums:
    if num == 3:
        continue
    print(num)

# ++++++++++++++++ range function +++++++++++++++++++

ls = list(range(11)) # starts from zero and increment one
print(ls)

st = set(range(1,11))
print(st)

lst = list(range(0, 11, 2))
print(lst)

lst = list(range(11, 0, -2))
print(lst)   # list in reverse order


for num in range(10):
    print(num)


# +++++++++++++ Nested For loop +++++++++++++

person = {
    'first_name': 'Asabeneh',
    'last_name': 'Yetayeh',
    'age': 250,
    'country': 'Finland',
    'is_marred': True,
    'skills': ['JavaScript', 'React', 'Node', 'MongoDB', 'Python'],
    'address': {
        'street': 'Space street',
        'zipcode': '02210'
    }
}

for key in person:
    if key == "skills":
        for skill in person["skills"]:
            print(skill)


# +++++++++++++++++++++++ For Else ++++++++++++++++++++
# If we want to execute some message when the loop ends, we use else.


for num in range(11):
    print(num)
else:
    print("loop stops at",num)


# ++++++++++++++++++ Pass ++++++++++++++++++++
# In python when statement is required (after semicolon), but we don't like to execute any code there, we can write the word pass to avoid errors. Also we can use it as a placeholder, for future statements.    

for i in range(5):
    pass


# +++++++++++++++++++ Exercise +++++++++++++++++


# 1. Iterate 0 to 10 using for loop, do the same using while loop

for num in range(11):
    print(num)

count = 0

while count <= 10:
    print(count)
    count += 1

# 2. Iterate 10 to 0 using for loop, do the same using while loop.

for num in range(10,-1,-1):
    print(num)

count = 10

while count >= 0:
    print(count)
    count -= 1


# +++++++++++++++++ 3. Patterns +++++++++++++++++

for i in range(8):
    for j in range(i):
        print("*", end='')
    print()

for i in range(10):
    for j in range(15):
        print("*", end='')
    print()


