# ++++++++++++++++ tuple +++++++++++++

# a tuple is a collection of different data types which in immutable

# tpl = tuple()  # Empty tuple
# print(tpl)

# fruits = ("orange", "mango", "apple", "banana")

# print(fruits)
# print(len(fruits))

# +++++++++++++ Accessing tuple items ++++++++++

# fruits = ("orange", "mango", "apple", "banana")

# print(fruits[2])

# print(fruits[len(fruits) - 1])

# +++++++++++++++ Negative Indexing ++++++++++

# fruits = ("orange", "mango", "apple", "banana")

# print(fruits[-1])
# print(fruits[::-1]) # reversing 


#+++++++++++++ Slicing tuples +++++++++++++

# fruits = ("orange", "mango", "apple", "banana")

# print(fruits[0:3])
# print(fruits[:4])
# print(fruits[0:])
# print(fruits[0:2])
# print(fruits[1:3])

# Negative Indexing --------

# print(fruits[-3:-1])


# ++++++++++++++++++++ Changing Tuples to Lists +++++++++++++

# nums = (1,2,3,4,5,6)

# nums = list(nums)

# print(nums)


# ++++++++++++++++ Checking an Item in a Tuple ++++++++++++

# fruits = ("orange", "mango", "apple", "banana")

# print("mango" in fruits)  # True
# print("lime" in fruits)   # False

# ++++++++++++++++++ Joining Tuples ++++++++++++++

# Plus (+) Operator

# num1 = (1,2,3,4)
# num2 = (5,6,7,8)

# numbers = num1 + num2

# print(numbers)


# +++++++++++++ Deleting Tuple ++++++++++=

# fruits = ("orange", "mango", "apple", "banana")

# del fruits

# print(fruits)  # NameError: name 'fruits' is not defined

# ++++++++++ Unpacking ++++++++++

# fruits = ("orange", "mango", "apple", "banana")

# first, second, *third = fruits

# print(first)
# print(second)
# print(third)