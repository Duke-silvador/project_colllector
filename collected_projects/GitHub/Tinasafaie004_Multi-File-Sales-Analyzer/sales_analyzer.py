"""
Multi-File Sales Analyzer
------------------------

A Pandas workflow that loads monthly sales records, customer records,
and product records. The project combines the data into one clean,
analysis-ready dataset and creates the business reports requested by
management.
"""

import pandas as pd


# ============================================================
# PART 1 — LOAD AND INSPECT THE RAW FILES
# ============================================================
# Load the monthly order files and the customer/product reference files.
january=pd.read_csv("january_orders.csv")
february=pd.read_csv("february_orders.csv")
march=pd.read_csv("march_orders.csv")
customers=pd.read_csv("customers.csv")
products=pd.read_csv("products.csv")

# Show the structure and data quality signals before any cleaning begins.

#investigating
print("January:")
january.info()
print("missing")
print(january.isna().sum())
print(f"duplicates: {january.duplicated().sum()}")

print("February:")
february.info()
print("missing")
print(february.isna().sum())
print(f"duplicates: {february.duplicated().sum()}")
# February has one duplicate row.

print("March:")
march.info()
print("missing")
print(march.isna().sum())
print(f"duplicates: {march.duplicated().sum()}")

print("customers:")
customers.info()
print("missing:")
print(customers.isna().sum())
print(f"duplicates: {customers.duplicated().sum()}")
# Customers has one missing city value and one duplicate.
print(customers["membership"].value_counts(dropna=False))
print(customers["city"].value_counts(dropna=False))

print("products:")
products.info()
print("missing:")
print(products.isna().sum())
print(f"duplicates: {products.duplicated().sum()}")
# Products has one duplicate row.
print(products["category"].value_counts(dropna=False))


# ============================================================
# PART 2 — COMBINE THE MONTHLY ORDERS
# ============================================================
# Stack the January, February, and March files into one order table.
# Reset the row index so the combined orders stay clean and sequential.
all_orders=pd.concat([january,february,march], ignore_index=True)

# ============================================================
# PART 3 — CLEAN THE COPIES
# ============================================================
# Work from copied DataFrames so the raw files stay untouched.
cleaned_orders=all_orders.copy()
cleaned_customers=customers.copy()
cleaned_products=products.copy()

# Normalize the order text and remove exact duplicate rows.
cleaned_orders["status"]=cleaned_orders["status"].str.strip().str.title()
cleaned_orders= cleaned_orders.drop_duplicates()

# Clean customer records and fill the missing city value.
cleaned_customers["name"]=cleaned_customers["name"].str.strip().str.title()
cleaned_customers["city"]=cleaned_customers["city"].fillna("Unknown")
cleaned_customers["city"]=cleaned_customers["city"].str.strip().str.title()
cleaned_customers["membership"]=cleaned_customers["membership"].str.strip().str.title()
cleaned_customers= cleaned_customers.drop_duplicates()

# Clean product names, categories, and numeric price/stock fields.
cleaned_products["product_name"]=cleaned_products["product_name"].str.strip().str.title()
cleaned_products["category"]=cleaned_products["category"].str.strip().str.title()
cleaned_products["unit_price"]=pd.to_numeric(cleaned_products["unit_price"], errors="coerce")
cleaned_products["stock"]=pd.to_numeric(cleaned_products["stock"], errors="coerce")
cleaned_products= cleaned_products.drop_duplicates()


# ============================================================
# PART 4 — VALIDATE THE CLEANING
# ============================================================
# Check the cleaned files again for missing values and duplicates.
print(cleaned_orders.isna().sum())
print(cleaned_orders.duplicated().sum())

print(cleaned_customers.isna().sum())
print(cleaned_customers.duplicated().sum())

print(cleaned_products.isna().sum())
print(cleaned_products.duplicated().sum())


# ============================================================
# PART 5 — BUILD THE MASTER SALES DATASET
# ============================================================
# Merge orders with customers and products using left joins.
# This keeps every valid order in the dataset and flags missing matches.
sales_data=cleaned_orders.merge(
    cleaned_customers,
    on="customer_id",
    how="left"
).merge(
    cleaned_products,
    on="product_id",
    how="left"
)

# Track orders that failed to find a matching customer or product record.
unmatched_customers=sales_data[
    sales_data["name"].isna()
]

unmatched_products=sales_data[
    sales_data["product_name"].isna()
]


# ============================================================
# PART 6 — CREATE BUSINESS METRICS
# ============================================================
# Add a new field showing how much each order is worth.
sales_data["order_value"] = sales_data["quantity"] * sales_data["unit_price"]

# High-value orders are worth at least $500, sorted highest first.
high_value_orders=sales_data[
    sales_data["order_value"]>=500
].sort_values("order_value",ascending=False)

# Gold-member orders are sorted from highest to lowest order value.
gold_customer_orders= sales_data[
    sales_data["membership"]=="Gold"
].sort_values("order_value",ascending=False)

# Toronto electronics orders are filtered and ranked by value.
toronto_electronics=sales_data[
    (sales_data["city"]=="Toronto") &
    (sales_data["category"]=="Electronics")
].sort_values("order_value",ascending=False)

# Products with fewer than 15 units in stock are shown by highest price first.
inventory_attention=sales_data[
    sales_data["stock"]<15
].sort_values("unit_price",ascending=False)

# Take the top five highest-value orders and reset the index.
top_orders=sales_data.sort_values("order_value",ascending=False).head(5).reset_index(drop=True)


# ============================================================
# PART 7 — EXPORT THE FINAL DATASET
# ============================================================
# Write the final sales dataset to CSV without the DataFrame index.
sales_data.to_csv("sales_analysis.csv", index=False)