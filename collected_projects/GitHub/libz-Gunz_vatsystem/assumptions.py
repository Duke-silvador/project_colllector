LEGAL_ASSUMPTIONS = [
    "The configured VAT rate is a project setting and must be verified against current ZIMRA requirements.",
    "Zero-rated and exempt supplies are separate categories.",
    "Input VAT is only treated as allowable when the dataset marks it YES and the transaction is otherwise valid.",
    "Import VAT is separately identified.",
    "Credit/debit notes and adjustments are represented using signed transaction amounts and VAT effects.",
]

COMPUTATIONAL_ASSUMPTIONS = [
    "VAT-inclusive amounts are converted using VAT = gross × rate / (1 + rate).",
    "VAT-exclusive amounts are converted using VAT = taxable amount × rate.",
    "VAT is rounded to two decimal places.",
    "Invalid records are flagged before calculation.",
    "Net VAT = output VAT + adjustment VAT - allowable input VAT.",
]
