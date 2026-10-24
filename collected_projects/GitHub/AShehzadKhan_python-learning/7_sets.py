# Set is a collection of unordered and un-indexed distinct elements.

fruits = {"banana", "mango", "apple", "orange"}

print(fruits)
print(len(fruits))

# ++++++++++++++++ Checking an Item +++++++++++++++++++

fruits = {"banana", "mango", "apple", "orange"}

print("Does mango exists in fruits : ", "mango" in fruits) # True
print("Does lemon exists in fruits : ", "lemon" in fruits) # False


# +++++++++++ Adding Items to a Set +++++++++++++++

# using add method

fruits = {"banana", "mango", "apple", "orange"}

fruits.add("lemon")
print(fruits)

# updating the list

fruits = {"banana", "mango", "apple", "orange"}

veg = {"tomato", "carrot"}

fruits.update(veg)

print(fruits)


# +++++++++++++++ Removing the item from set +++++++++++

fruits = {"banana", "mango", "apple", "orange"}

fruits.remove("orange")

print(fruits)

fruits = {"banana", "mango", "apple", "orange"}

elem = fruits.pop()   # return a random element and return it

print(elem)
print(fruits)

# +++++++++++++ Clearing a list item +++++++++++++

fruits = {'banana', 'orange', 'mango', 'lemon'}
fruits.clear()
print(fruits) # set()

# +++++++++++ Converting List to Set ++++++++++++
#We can convert list to set and set to list. Converting list to set removes duplicates and only unique items will be reserved.


nums = [1,2,3,4,5]

ls = set(nums)

print(ls)

# +++++++++++++ joining sets by union +++++++++++++

st1 = {1,2,3,4,5}
st2 = {5,6,7,8,9}

print(st1.union(st2))

# ++++++++++++ Finding Intersection Items ++++++++++++

whole_numbers = {0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10}
even_numbers = {0, 2, 4, 6, 8, 10}

print(whole_numbers.intersection(even_numbers))


# +++++++++++ Checking Subset and Super Set +++++++++++++++

whole_numbers = {0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10}
even_numbers = {0, 2, 4, 6, 8, 10}

print(whole_numbers.issubset(even_numbers)) #  Fasle
print(whole_numbers.issuperset(even_numbers)) # True
print(even_numbers.issubset(whole_numbers))  # True