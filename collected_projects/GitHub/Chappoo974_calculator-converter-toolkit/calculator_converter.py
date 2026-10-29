#!/usr/bin/env python3
"""
Multi-Purpose Calculator and Converter
A comprehensive tool for calculations and unit conversions
"""

import math
import sys


class Calculator:
    """Scientific calculator with basic and advanced operations"""

    @staticmethod
    def add(x, y):
        return x + y

    @staticmethod
    def subtract(x, y):
        return x - y

    @staticmethod
    def multiply(x, y):
        return x * y

    @staticmethod
    def divide(x, y):
        if y == 0:
            raise ValueError("Cannot divide by zero")
        return x / y

    @staticmethod
    def power(x, y):
        return x ** y

    @staticmethod
    def square_root(x):
        if x < 0:
            raise ValueError("Cannot calculate square root of negative number")
        return math.sqrt(x)

    @staticmethod
    def factorial(n):
        if n < 0:
            raise ValueError("Factorial not defined for negative numbers")
        if n > 170:
            raise ValueError("Number too large for factorial calculation")
        return math.factorial(int(n))

    @staticmethod
    def logarithm(x, base=10):
        if x <= 0:
            raise ValueError("Logarithm only defined for positive numbers")
        if base == 10:
            return math.log10(x)
        elif base == math.e:
            return math.log(x)
        else:
            return math.log(x, base)


class UnitConverter:
    """Convert between various units of measurement"""

    @staticmethod
    def celsius_to_fahrenheit(celsius):
        return (celsius * 9/5) + 32

    @staticmethod
    def fahrenheit_to_celsius(fahrenheit):
        return (fahrenheit - 32) * 5/9

    @staticmethod
    def celsius_to_kelvin(celsius):
        return celsius + 273.15

    @staticmethod
    def kelvin_to_celsius(kelvin):
        return kelvin - 273.15

    @staticmethod
    def miles_to_kilometers(miles):
        return miles * 1.60934

    @staticmethod
    def kilometers_to_miles(km):
        return km / 1.60934

    @staticmethod
    def pounds_to_kilograms(pounds):
        return pounds * 0.453592

    @staticmethod
    def kilograms_to_pounds(kg):
        return kg / 0.453592

    @staticmethod
    def feet_to_meters(feet):
        return feet * 0.3048

    @staticmethod
    def meters_to_feet(meters):
        return meters / 0.3048

    @staticmethod
    def inches_to_centimeters(inches):
        return inches * 2.54

    @staticmethod
    def centimeters_to_inches(cm):
        return cm / 2.54


class CurrencyConverter:
    """Convert between common currencies (rates as of example date)"""

    RATES = {
        'USD': 1.0,
        'EUR': 0.92,
        'GBP': 0.79,
        'JPY': 149.50,
        'CAD': 1.36,
        'AUD': 1.53,
        'CHF': 0.88,
        'CNY': 7.24,
    }

    @classmethod
    def convert(cls, amount, from_currency, to_currency):
        from_currency = from_currency.upper()
        to_currency = to_currency.upper()

        if from_currency not in cls.RATES or to_currency not in cls.RATES:
            raise ValueError(f"Currency not supported. Available: {', '.join(cls.RATES.keys())}")

        usd_amount = amount / cls.RATES[from_currency]
        return usd_amount * cls.RATES[to_currency]


def print_menu():
    """Display main menu"""
    print("\n" + "="*50)
    print("  CALCULATOR & CONVERTER TOOLKIT")
    print("="*50)
    print("\n1. Basic Calculator")
    print("2. Scientific Calculator")
    print("3. Temperature Converter")
    print("4. Distance Converter")
    print("5. Weight Converter")
    print("6. Currency Converter")
    print("7. Exit")
    print("-"*50)


def basic_calculator():
    """Interactive basic calculator"""
    print("\n--- Basic Calculator ---")
    print("Operations: +, -, *, /, ^(power)")

    try:
        num1 = float(input("Enter first number: "))
        operation = input("Enter operation (+, -, *, /, ^): ").strip()
        num2 = float(input("Enter second number: "))

        calc = Calculator()

        if operation == '+':
            result = calc.add(num1, num2)
        elif operation == '-':
            result = calc.subtract(num1, num2)
        elif operation == '*':
            result = calc.multiply(num1, num2)
        elif operation == '/':
            result = calc.divide(num1, num2)
        elif operation == '^':
            result = calc.power(num1, num2)
        else:
            print("Invalid operation!")
            return

        print(f"\nResult: {num1} {operation} {num2} = {result}")

    except ValueError as e:
        print(f"Error: {e}")
    except Exception as e:
        print(f"Invalid input: {e}")


def scientific_calculator():
    """Interactive scientific calculator"""
    print("\n--- Scientific Calculator ---")
    print("1. Square Root")
    print("2. Factorial")
    print("3. Logarithm (base 10)")
    print("4. Natural Log (ln)")
    print("5. Custom Base Logarithm")

    try:
        choice = input("\nSelect operation (1-5): ").strip()
        calc = Calculator()

        if choice == '1':
            num = float(input("Enter number: "))
            result = calc.square_root(num)
            print(f"\n√{num} = {result}")

        elif choice == '2':
            num = float(input("Enter number: "))
            result = calc.factorial(num)
            print(f"\n{int(num)}! = {result}")

        elif choice == '3':
            num = float(input("Enter number: "))
            result = calc.logarithm(num)
            print(f"\nlog₁₀({num}) = {result}")

        elif choice == '4':
            num = float(input("Enter number: "))
            result = calc.logarithm(num, math.e)
            print(f"\nln({num}) = {result}")

        elif choice == '5':
            num = float(input("Enter number: "))
            base = float(input("Enter base: "))
            result = calc.logarithm(num, base)
            print(f"\nlog_{base}({num}) = {result}")

        else:
            print("Invalid choice!")

    except ValueError as e:
        print(f"Error: {e}")
    except Exception as e:
        print(f"Invalid input: {e}")


def temperature_converter():
    """Interactive temperature converter"""
    print("\n--- Temperature Converter ---")
    print("1. Celsius → Fahrenheit")
    print("2. Fahrenheit → Celsius")
    print("3. Celsius → Kelvin")
    print("4. Kelvin → Celsius")

    try:
        choice = input("\nSelect conversion (1-4): ").strip()
        temp = float(input("Enter temperature: "))
        converter = UnitConverter()

        if choice == '1':
            result = converter.celsius_to_fahrenheit(temp)
            print(f"\n{temp}°C = {result:.2f}°F")
        elif choice == '2':
            result = converter.fahrenheit_to_celsius(temp)
            print(f"\n{temp}°F = {result:.2f}°C")
        elif choice == '3':
            result = converter.celsius_to_kelvin(temp)
            print(f"\n{temp}°C = {result:.2f}K")
        elif choice == '4':
            result = converter.kelvin_to_celsius(temp)
            print(f"\n{temp}K = {result:.2f}°C")
        else:
            print("Invalid choice!")

    except Exception as e:
        print(f"Invalid input: {e}")


def distance_converter():
    """Interactive distance converter"""
    print("\n--- Distance Converter ---")
    print("1. Miles → Kilometers")
    print("2. Kilometers → Miles")
    print("3. Feet → Meters")
    print("4. Meters → Feet")
    print("5. Inches → Centimeters")
    print("6. Centimeters → Inches")

    try:
        choice = input("\nSelect conversion (1-6): ").strip()
        distance = float(input("Enter distance: "))
        converter = UnitConverter()

        conversions = {
            '1': (converter.miles_to_kilometers, 'mi', 'km'),
            '2': (converter.kilometers_to_miles, 'km', 'mi'),
            '3': (converter.feet_to_meters, 'ft', 'm'),
            '4': (converter.meters_to_feet, 'm', 'ft'),
            '5': (converter.inches_to_centimeters, 'in', 'cm'),
            '6': (converter.centimeters_to_inches, 'cm', 'in'),
        }

        if choice in conversions:
            func, from_unit, to_unit = conversions[choice]
            result = func(distance)
            print(f"\n{distance} {from_unit} = {result:.4f} {to_unit}")
        else:
            print("Invalid choice!")

    except Exception as e:
        print(f"Invalid input: {e}")


def weight_converter():
    """Interactive weight converter"""
    print("\n--- Weight Converter ---")
    print("1. Pounds → Kilograms")
    print("2. Kilograms → Pounds")

    try:
        choice = input("\nSelect conversion (1-2): ").strip()
        weight = float(input("Enter weight: "))
        converter = UnitConverter()

        if choice == '1':
            result = converter.pounds_to_kilograms(weight)
            print(f"\n{weight} lbs = {result:.4f} kg")
        elif choice == '2':
            result = converter.kilograms_to_pounds(weight)
            print(f"\n{weight} kg = {result:.4f} lbs")
        else:
            print("Invalid choice!")

    except Exception as e:
        print(f"Invalid input: {e}")


def currency_converter():
    """Interactive currency converter"""
    print("\n--- Currency Converter ---")
    print(f"Available currencies: {', '.join(CurrencyConverter.RATES.keys())}")
    print("Note: Exchange rates are examples only")

    try:
        amount = float(input("\nEnter amount: "))
        from_curr = input("From currency (e.g., USD): ").strip()
        to_curr = input("To currency (e.g., EUR): ").strip()

        result = CurrencyConverter.convert(amount, from_curr, to_curr)
        print(f"\n{amount} {from_curr.upper()} = {result:.2f} {to_curr.upper()}")

    except ValueError as e:
        print(f"Error: {e}")
    except Exception as e:
        print(f"Invalid input: {e}")


def main():
    """Main program loop"""
    print("\nWelcome to the Calculator & Converter Toolkit!")

    while True:
        print_menu()
        choice = input("\nSelect an option (1-7): ").strip()

        if choice == '1':
            basic_calculator()
        elif choice == '2':
            scientific_calculator()
        elif choice == '3':
            temperature_converter()
        elif choice == '4':
            distance_converter()
        elif choice == '5':
            weight_converter()
        elif choice == '6':
            currency_converter()
        elif choice == '7':
            print("\nThank you for using Calculator & Converter Toolkit!")
            sys.exit(0)
        else:
            print("\nInvalid choice! Please select 1-7.")

        input("\nPress Enter to continue...")


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\n\nProgram interrupted. Goodbye!")
        sys.exit(0)
