# import csv, os

# __location__ = os.path.realpath(
#     os.path.join(os.getcwd(), os.path.dirname(__file__)))

# cities = []
# with open(os.path.join(__location__, 'Cities.csv')) as f:
#     rows = csv.DictReader(f)
#     for r in rows:
#         cities.append(dict(r))

# # Print first 5 cities only
# for city in cities[:5]:
#     print(city)

# # Print the average temperature of all the cities
# print("The average temperature of all the cities:")
# temps = []
# for city in cities:
#     temps.append(float(city['temperature']))
# print(sum(temps)/len(temps))
# print()

# # Print the average temperature of all the cities
# print("The average temperature of all the cities:")
# temps = [float(city['temperature']) for city in cities]
# print(sum(temps)/len(temps))
# print()

# # Print all cities in Germany
# print("ALL CITIES IN GERMANY")
# for city in cities:
#     if city['country'] == "Germany":
#         print(city['city'])
# print()

# # Print all cities in Spain with a temperature above 12°C
# print("ACISWATA12C")
# for city in cities:
#     if city['country'] == "Spain":
#         if float(city['temperature']) > 12:
#             print(city["city"])
# print()
# # Count the number of unique countries
# countries = []
# print("CTNOUC")
# for city in cities:
#     countries.append(city['country'])
# print(len(set(countries)))
# print()
# # Print the average temperature for all the cities in Germany
# print()
# def PTATFATCG():
#     print("PTATFATCG")
#     temps = []
#     for c in cities:
#         if c['country'] == "Germany":
#             temps.append(float(c['temperature']))
#     print(sum(temps)/len(temps))
# PTATFATCG()
# # Print the max temperature for all the cities in Italy
# print()
# def PTMTFATCII():
#     print("PTMTFATCII")
#     temps = []
#     for c in cities:
#         if c['country'] == "Italy":
#             temps.append(float(c['temperature']))
#     print(max(temps))
# PTMTFATCII()

# students = [
#         {"name": "Alice", "score": 90},
#         {"name": "Bob", "score": 70},
#         {"name": "Charlie", "score": 85}]
 

# def filter_items(condition: function, dict_list: list):
#     filtered = []
#     for i in dict_list:
#         p = condition(i)
#         if p :
#             filtered.append(i)
#     print(filtered)

# filter_items(lambda s: s["score"] >= 85, students)


# def aggregate(aggregation_key, aggregation_function, dict_list):
#     temp = []
#     for i in dict_list:
#         temp.append(i[aggregation_key])
#     print(aggregation_function(temp))

# aggregate("score", max, students)

table = {
    'name': [...]

}

import csv, os
from pathlib import Path

class DataLoader:
    """Handles loading CSV data files."""
    
    def __init__(self, base_path=None):
        """Initialize the DataLoader with a base path for data files.
        """
        if base_path is None:
            self.base_path = Path(__file__).parent.resolve()
        else:
            self.base_path = Path(base_path)
    
    def load_csv(self, filename):
        """Load a CSV file and return its contents as a list of dictionaries.
        """
        filepath = self.base_path / filename
        data = []
        
        with filepath.open() as f:
            rows = csv.DictReader(f)
            for row in rows:
                data.append(dict(row))
        
        return data

class DB:
    def __init__(self):
        self._data = {}

    def __str__(self):
        string = ""
        for _, v in self._data.items():
            string += f'{v}\n'
        return string
    
    def insert(self,data):
        self._data.update({data.table_name : data})

    def search(self,key):
        if self._data[key]:
            print(f'{key} Found in the Database.')
            return self._data[key]



class Table:
    def __init__(self,label, list=None):
        self.table_name = label
        self.table = list or []

    def __str__(self):
        return self.table_name + ':' + str(self.table)

    def join(self,table,key):
        origin = self.table
        for i in origin:
            for v in table.table:
                if i[key] == v[key]:
                    i.update(v)
        print(f'{self.table_name} and {table.table_name} are merged.')
        table = None
        return self


    def filter(self,func):
        filtered = Table(f'Filtered_{self.table_name}')
        for i in self.table:
            p = func(i)
            if p :
                filtered.table.append(i)
        return filtered

    def aggregate(self,func,key):
        temp = []
        for i in self.table:
            try:
                if isinstance(float(i[key]), float):
                    temp.append(float(i[key]))
            except ValueError:
                temp.append(i)
        return func(temp)

loader = DataLoader()
cities = loader.load_csv('Cities.csv')
table1 = Table('cities', cities)
countries = loader.load_csv('Countries.csv')
table2 = Table('countries', countries)

my_DB = DB()
my_DB.insert(table1)
my_DB.insert(table2)

my_table1 = my_DB.search('cities')
print("List all cities in Italy:") 
my_table1_filtered = my_table1.filter(lambda x: x['country'] == 'Italy')
print(my_table1_filtered)
print()

print("Average temperature for all cities in Italy:")
print(my_table1_filtered.aggregate(lambda x: sum(x)/len(x), 'temperature'))
print()

my_table2 = my_DB.search('countries')
print("List all non-EU countries:") 
my_table2_filtered = my_table2.filter(lambda x: x['EU'] == 'no')
print(my_table2_filtered)
print()

print("Number of countries that have coastline:")
print(my_table2.filter(lambda x: x['coastline'] == 'yes').aggregate(lambda x: len(x), 'coastline'))
print()

my_table3 = my_table1.join(my_table2, 'country')
print("First 5 entries of the joined table (cities and countries):")
for item in my_table3.table[:5]:
    print(item)
print()

print("Cities whose temperatures are below 5.0 in non-EU countries:")
my_table3_filtered = my_table3.filter(lambda x: x['EU'] == 'no').filter(lambda x: float(x['temperature']) < 5.0)
print(my_table3_filtered.table)
print()

print("The min and max temperatures for cities in EU countries that do not have coastlines")
my_table3_filtered = my_table3.filter(lambda x: x['EU'] == 'yes').filter(lambda x: x['coastline'] == 'no')
print("Min temp:", my_table3_filtered.aggregate(lambda x: min(x), 'temperature'))
print("Max temp:", my_table3_filtered.aggregate(lambda x: max(x), 'temperature'))
print()