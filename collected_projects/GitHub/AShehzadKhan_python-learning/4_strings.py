letter = "s"
print(letter)

print(len(letter))

name = "selena"
print(name)
print(len(name))

sentence = "she sells sea shells by the sea shore"
print(sentence)

# +++++++++++  multiline strings ++++++++++++++++++

multiline_string = ''' this is a.
multi line.
string.
'''

print(multiline_string)

# +++++++++++++++++ concatenation +++++++++++++++++++

first_name = "Selena"
second_name = "Khan"
space = ' '
full_name = first_name + space + second_name

print(full_name)
print(len(full_name))


#   +++++++++++++++ Escape Sequences +++++++++++++++++++

print("hi, how are you?\nwhere were you yesterday?")
print("1\t2\t3")
print("Hi, Selena \"Welcome back\"")

# ++++++++++++++++ Strings Formatting ++++++++++++++

first_name = "Selena"
second_name = "Khan"
language = "Python"

formatted_string = "my name is {} {}. I'm learning {}".format(first_name, second_name, language)
print(formatted_string)

a=7
b=3

print('{} / {} = {:.2f}'.format(a, b, a / b))


# +++++++++++++++ Unpacking Characters +++++++++

name = "selena"

a,b,c,d,e,f = name

print(a)
print(b)


# +++++++++++++++ Strings Indexing ++++++++++++

name = "khan"

print(name[0])
print(name[2])

last_index = len(name) - 1

print(name[last_index])


# ++++++++++ Slicing a String +++++++++++++++++

city = "Zagreb"

first_three = city[0:3] # start at zero index, zero to three but no included three

print(first_three)

print(city[-1])
print(city[3:])
print(city[-3:])


# ++++++++++++ Reversing a string ++++++++++++++

name = "Hannah"


print(name[::-1])

# +++++++++++++++ String Methods ++++++++++++++++++++++

sentence = "i'm learning Python"

print(sentence.capitalize())

sentence = "i'm learning python"

print(sentence.count("n"))

print(sentence.count("n",10, len(sentence)))

city = "edinburgh"

print(city.endswith("h"))   # True
print(city.endswith("hg"))  # False


name = "Prague"

print(name.find("g"))  # return the index
print(name.find("z"))  # not found return -1

name = "croatia"

print(name.find("a")) # return the first occurence index
print(name.rfind("a")) # return the index of last occurence

sentence = "wonderland"
sub_string = "der"

print(sentence.index(sub_string,))

name = "selena"
print(name.isalnum())

name = "selena123"
print(name.isalnum())

full_name = "selena khan"
print(full_name.isalnum())

skills = ["React", "TypeScript", "Python", "RAG Pipelines"]
result = " & ".join(skills)
print(result)

name = "aselena"
print(name.strip("as"))

sentence = "Thirty days of python"
result = sentence.replace("python", "coding")
print(result)

sentence = "thirty days of coding"
print(sentence.startswith("thirty"))
print(sentence.startswith("30"))

print("30" + "days" + "of" + "Python")

companies = "Facebook, Google, Microsoft, Apple, IBM, Oracle, Amazon"

print(companies.split())