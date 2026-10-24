# +++++++++++++ Dictionaries ++++++++++++++

# A dictionary is a collection of unordered, modifiable(mutable) paired (key: value) data type.



# empty_dic = {}
# print(empty_dic)

# empty_dic = dict()

# print(empty_dic)

# person = {
#     'first_name':'Selena',
#     'last_name':'Khan',
#     'age':17,
#     'country':'Wonderland',
#     'is_marred':False,
#     'skills':['JavaScript', 'React', 'Node', 'MongoDB', 'Python'],
#     'address':{
#         'street':'Space street',
#         'zipcode':'02210'
#     }
#     }

# print(person)

# print(len(person))


# ++++++++++++++++ Accessing Dictionary Items +++++++++++


# person = {
#     'first_name':'Selena',
#     'last_name':'Khan',
#     'age':17,
#     'country':'Wonderland',
#     'is_marred':False,
#     'skills':['JavaScript', 'React', 'Node', 'MongoDB', 'Python'],
#     'address':{
#         'street':'main street',
#         'zipcode':'02210'
#     }
#     }

# print(person["first_name"])
# print(person["address"]["street"])

# print(person['city'])       # Error

# +++++++++++++++ using the get method +++++++++++++++++++

# print(person.get("city"))   # None

# print(person.get("first_name"))

# +++++++++++++ Adding Items to a Dictionary ++++++++++++++++++


# person = {
#     'first_name':'Selena',
#     'last_name':'Khan',
#     'age':17,
#     'country':'Wonderland',
#     'is_marred':False,
#     'skills':['JavaScript', 'React', 'Node', 'MongoDB', 'Python'],
#     'address':{
#         'street':'main street',
#         'zipcode':'02210'
#     }
#     }


# person["city"] = "Nova"

# person['skills'].append("ML")

# print(person)

# +++++++++++ Modifying Items in a Dictionary +++++++++++

# person = {
#     'first_name':'Selena',
#     'last_name':'Khan',
#     'age':17,
#     'country':'Wonderland',
#     'is_marred':False,
#     'skills':['JavaScript', 'React', 'Node', 'MongoDB', 'Python'],
#     'address':{
#         'street':'main street',
#         'zipcode':'02210'
#     }
#     }


# person["address"]["street"] = "new line"

# print(person)


# ++++++++++ Checking Keys in a Dictionary ++++++++++++

# info = {
#     "name": "khan", 
#     "age": 17,
#     "isPassed": True,
# }

# print("name" in info)  # True
# print("city" in info) # False


# ++++++++++++ Removing Key and Value Pairs from a Dictionary +++++++++

# person = {
#     'first_name':'Selena',
#     'last_name':'Khan',
#     'age':17,
#     'country':'Wonderland',
#     'is_marred':False,
#     'skills':['JavaScript', 'React', 'Node', 'MongoDB', 'Python'],
#     'address':{
#         'street':'main street',
#         'zipcode':'02210'
#     }
#     }

# person.pop("first_name")  # remove the item with specified key
# print(person)

# person.popitem()
# print(person)  # remove the element at last address

# +++++++++++ Changing Dictionary to a List of Items +++++++++++

# The items() method changes dictionary to a list of tuples.

person = {
    'first_name':'Selena',
    'last_name':'Khan',
    'age':17,
    'country':'Wonderland',
    'is_marred':False,
    'skills':['JavaScript', 'React', 'Node', 'MongoDB', 'Python'],
    'address':{
        'street':'main street',
        'zipcode':'02210'
    }
    }

print(person.items())

# ++++++++++++++++++ Copy a Dictionary +++++++++++++++++++++

# student = {
#     "name": "Selena",
#     "city": "nova"
# }

# info = student.copy()  # copy avoid mutating the original dictionary
# print(info)

# ++++++++++++++++ Getting Dictionary Keys as a List ++++++++++++++++++

personal_info = {
    "name" : "Selena",
    "country": "Wonderland",
    "city": "Nova"
}

print(personal_info.keys())


# +++++++++++++ Getting Dictionary Values as a List +++++++++++++

personal_info = {
    "name" : "Selena",
    "country": "Wonderland",
    "city": "Nova"
}

print(personal_info.values())