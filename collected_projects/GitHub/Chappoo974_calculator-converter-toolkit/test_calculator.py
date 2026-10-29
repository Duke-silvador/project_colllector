#!/usr/bin/env python3
"""
Unit tests for Calculator & Converter Toolkit
"""

import unittest
import math
from calculator_converter import Calculator, UnitConverter, CurrencyConverter


class TestCalculator(unittest.TestCase):
    """Test cases for Calculator class"""

    def setUp(self):
        self.calc = Calculator()

    def test_add(self):
        self.assertEqual(self.calc.add(5, 3), 8)
        self.assertEqual(self.calc.add(-5, 3), -2)
        self.assertAlmostEqual(self.calc.add(0.1, 0.2), 0.3, places=10)

    def test_subtract(self):
        self.assertEqual(self.calc.subtract(10, 4), 6)
        self.assertEqual(self.calc.subtract(4, 10), -6)

    def test_multiply(self):
        self.assertEqual(self.calc.multiply(6, 7), 42)
        self.assertEqual(self.calc.multiply(-3, 4), -12)
        self.assertEqual(self.calc.multiply(0, 100), 0)

    def test_divide(self):
        self.assertEqual(self.calc.divide(10, 2), 5)
        self.assertAlmostEqual(self.calc.divide(7, 3), 2.333333, places=5)

        with self.assertRaises(ValueError):
            self.calc.divide(5, 0)

    def test_power(self):
        self.assertEqual(self.calc.power(2, 3), 8)
        self.assertEqual(self.calc.power(5, 0), 1)
        self.assertEqual(self.calc.power(4, -1), 0.25)

    def test_square_root(self):
        self.assertEqual(self.calc.square_root(16), 4)
        self.assertEqual(self.calc.square_root(0), 0)
        self.assertAlmostEqual(self.calc.square_root(2), 1.414213, places=5)

        with self.assertRaises(ValueError):
            self.calc.square_root(-4)

    def test_factorial(self):
        self.assertEqual(self.calc.factorial(5), 120)
        self.assertEqual(self.calc.factorial(0), 1)
        self.assertEqual(self.calc.factorial(1), 1)

        with self.assertRaises(ValueError):
            self.calc.factorial(-5)

        with self.assertRaises(ValueError):
            self.calc.factorial(200)

    def test_logarithm(self):
        self.assertAlmostEqual(self.calc.logarithm(100, 10), 2, places=10)
        self.assertAlmostEqual(self.calc.logarithm(math.e, math.e), 1, places=10)
        self.assertAlmostEqual(self.calc.logarithm(8, 2), 3, places=10)

        with self.assertRaises(ValueError):
            self.calc.logarithm(0)

        with self.assertRaises(ValueError):
            self.calc.logarithm(-5)


class TestUnitConverter(unittest.TestCase):
    """Test cases for UnitConverter class"""

    def setUp(self):
        self.converter = UnitConverter()

    def test_temperature_conversions(self):
        self.assertAlmostEqual(self.converter.celsius_to_fahrenheit(0), 32, places=5)
        self.assertAlmostEqual(self.converter.celsius_to_fahrenheit(100), 212, places=5)
        self.assertAlmostEqual(self.converter.fahrenheit_to_celsius(32), 0, places=5)
        self.assertAlmostEqual(self.converter.celsius_to_kelvin(0), 273.15, places=5)
        self.assertAlmostEqual(self.converter.kelvin_to_celsius(273.15), 0, places=5)

    def test_distance_conversions(self):
        self.assertAlmostEqual(self.converter.miles_to_kilometers(1), 1.60934, places=5)
        self.assertAlmostEqual(self.converter.kilometers_to_miles(1.60934), 1, places=5)
        self.assertAlmostEqual(self.converter.feet_to_meters(1), 0.3048, places=5)
        self.assertAlmostEqual(self.converter.meters_to_feet(1), 3.28084, places=5)
        self.assertAlmostEqual(self.converter.inches_to_centimeters(1), 2.54, places=5)
        self.assertAlmostEqual(self.converter.centimeters_to_inches(2.54), 1, places=5)

    def test_weight_conversions(self):
        self.assertAlmostEqual(self.converter.pounds_to_kilograms(1), 0.453592, places=5)
        self.assertAlmostEqual(self.converter.kilograms_to_pounds(1), 2.20462, places=5)


class TestCurrencyConverter(unittest.TestCase):
    """Test cases for CurrencyConverter class"""

    def test_same_currency(self):
        result = CurrencyConverter.convert(100, 'USD', 'USD')
        self.assertAlmostEqual(result, 100, places=2)

    def test_usd_to_eur(self):
        result = CurrencyConverter.convert(100, 'USD', 'EUR')
        self.assertAlmostEqual(result, 92, places=2)

    def test_eur_to_usd(self):
        result = CurrencyConverter.convert(92, 'EUR', 'USD')
        self.assertAlmostEqual(result, 100, places=2)

    def test_invalid_currency(self):
        with self.assertRaises(ValueError):
            CurrencyConverter.convert(100, 'USD', 'INVALID')

        with self.assertRaises(ValueError):
            CurrencyConverter.convert(100, 'INVALID', 'USD')

    def test_case_insensitive(self):
        result1 = CurrencyConverter.convert(100, 'usd', 'eur')
        result2 = CurrencyConverter.convert(100, 'USD', 'EUR')
        self.assertAlmostEqual(result1, result2, places=2)


class TestConversionRoundTrip(unittest.TestCase):
    """Test that conversions are reversible"""

    def setUp(self):
        self.converter = UnitConverter()

    def test_temperature_round_trip(self):
        original = 25
        result = self.converter.fahrenheit_to_celsius(
            self.converter.celsius_to_fahrenheit(original)
        )
        self.assertAlmostEqual(result, original, places=10)

    def test_distance_round_trip(self):
        original = 100
        result = self.converter.kilometers_to_miles(
            self.converter.miles_to_kilometers(original)
        )
        self.assertAlmostEqual(result, original, places=10)

    def test_weight_round_trip(self):
        original = 150
        result = self.converter.kilograms_to_pounds(
            self.converter.pounds_to_kilograms(original)
        )
        self.assertAlmostEqual(result, original, places=10)


if __name__ == '__main__':
    unittest.main()
