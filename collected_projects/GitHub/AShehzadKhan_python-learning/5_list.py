# A list is a collection of items of different data types.
# list is mutable.

tech = ["Containerization", "docker image", "linux", {"name": "selena", "city" : "wonderland"}, True, 17]

print(tech)


new_list = list()
print(new_list)

skills = ["React", "TypeScript", "Redux", "Node"]
print("skills : ",skills)
print(len(skills))


# +++++++++++ Accessing elements of list +++++++++++++

skills = ["React", "TypeScript", "Redux", "Node"]

print(skills[0])    # first index
print(skills[len(skills)-1]) # Last index

# +++++++++++++++ Negative Indexing +++++++++++

skills = ["React", "TypeScript", "Redux", "Node"]

print(skills[-1])
print(skills[-3])

# # +++++++++++++ Unpacking the list elements +++++++++++++++

nums = [1,2,3,4,5,6,7,8,9,10]

first, second, third, *remaining = nums

print(first)
print(second)
print(third)
print(remaining)

nums = [1,2,3,4,5,6,7,8,9,10]

first, second, third, *rest, tenth = nums

print(first)
print(second)
print(third)
print(rest)
print(tenth)


# ++++++++++ Slicing Items from a List +++++++++

fruits = ['banana', 'orange', 'mango', 'lemon']

print(fruits[2:])  # from two upto end
print(fruits[:2])  # from start upto 2

print(fruits[::2])  # give every second item

print(fruits[1:3])  # does not include last index

# ++++++++++++++ Negative Indexing +++++++++++++

fruits = ['banana', 'orange', 'mango', 'lemon']

# print(fruits[-1]) # last index
# print(fruits[-3:-1]) # it does not include the last index

# print(fruits[-len(fruits):]) # same as [4:]

# print(fruits[-3:])  # -3 to end

# print(fruits[::-1])  # it will reverse the list


# +++++++++++ Modifying a  List +++++++++++++++

# nums = [1,2,3,4,5,6,7]

# print(nums)

# nums[0] = 10
# nums[2] = 20
# nums[len(nums)-1] = 100

print(nums)


#  ++++++++++++ Checking Items in a List +++++++++++++

fruits = ['banana', 'orange', 'mango', 'lemon']

does_exist = "apple" in fruits # False
print(does_exist)

does_exist = "banana" in fruits # True

print(does_exist)


# +++++++++++++ Adding Items to a List ++++++++++++

fruits = ['banana', 'orange', 'mango', 'lemon']

fruits.append("apple")

print(fruits)

fruits.append("guava")

print(fruits)


# ++++++++++++ Inserting Items into a List ++++++++++++


# fruits = ['banana', 'orange', 'mango', 'lemon']

fruits.insert(2, "apple")

print(fruits)

fruits.insert(3, "guava")

print(fruits)

# +++++++++++ Removing items from the list ++++++++++++

fruits = ['banana', 'orange', 'mango', 'lemon', 'banana']

fruits.remove("mango")

print(fruits)


# +++++++++++++ Removing items using pop ++++++++++++

fruits = ['banana', 'orange', 'mango', 'lemon']

fruits.pop()

print(fruits)

fruits.pop(1)  # passing an index remove that item

print(fruits)

# ++++++++++++++++++++ Clearing List Items +++++++++++

fruits = ['banana', 'orange', 'mango', 'lemon']

fruits.clear() # empties the list

print(fruits)

# ++++++++++++++ Copying a List +++++++++++++

fruits = ['banana', 'orange', 'mango', 'lemon']

# modifying the copy does not modify the origina list
fruits_copy = fruits.copy()

print(fruits_copy)


# ++++++++++++++ Joining Lists +++++++++++

#  Plus operator

positive_numbers = [1, 2, 3, 4, 5]
zero = [0]
negative_numbers = [-5,-4,-3,-2,-1]
integers = negative_numbers + zero + positive_numbers
print(integers)

# using extend method

num1 = [1,2,3,4,5]
num2 = [6,7,8,9]

num1.extend(num2)

print("Numbers : ", num1)

# ++++++++++++++ Counting items in a list ++++++++++++

fruits = ['banana', 'orange', 'mango', 'lemon']
print(fruits.count("mango"))

numbers = [1,2,3,4,2,4,2]
print(numbers.count(2))

# ++++++++++++ Finding Index of an Item +++++++++++++

fruits = ['banana', 'orange', 'mango', 'lemon']
print(fruits.index("mango"))

# +++++++++++++ Reversing a list ++++++++++++++

fruits = ['banana', 'orange', 'mango', 'lemon']
fruits.reverse()
print(fruits)

# +++++++++++++ Sorting a list ++++++++++++++

fruits = ['banana', 'orange', 'mango', 'lemon']
fruits.sort()

print(fruits)

fruits = ['banana', 'orange', 'mango', 'lemon']
fruits.sort(reverse=True)

print(fruits)

nums = [22, 19, 24, 25, 26, 24, 25, 24]

nums.sort()

print(nums)

nums = [22, 19, 24, 25, 26, 24, 25, 24]

nums.sort(reverse=True)

print(nums)

# +++++++++++++ Exercise +++++++++++++++++

countries = ['China', 'Russia', 'USA', 'Finland', 'Sweden', 'Norway', 'Denmark']

middle = len(countries)// 2

print(countries[middle])