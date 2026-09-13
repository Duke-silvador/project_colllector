import csv

# Hardcoded stock prices
stock_prices = {
    "AAPL": 180,
    "TSLA": 250,
    "GOOGL": 140,
    "AMZN": 145,
    "MSFT": 330
}

def get_portfolio():
    portfolio = {}
    print("Available stocks:", ", ".join(stock_prices.keys()))
    print("Enter stock name and quantity (type 'done' to finish).\n")

    while True:
        stock = input("Stock name: ").upper()
        if stock == "DONE":
            break

        if stock not in stock_prices:
            print("Stock not found in price list. Try again.")
            continue

        try:
            quantity = int(input(f"Quantity of {stock}: "))
        except ValueError:
            print("Please enter a valid number.")
            continue

        if quantity <= 0:
            print("Quantity must be greater than 0.")
            continue

        portfolio[stock] = portfolio.get(stock, 0) + quantity

    return portfolio

def calculate_investment(portfolio):
    investment_details = []
    total = 0

    for stock, quantity in portfolio.items():
        price = stock_prices[stock]
        value = price * quantity
        total += value
        investment_details.append((stock, quantity, price, value))

    return investment_details, total

def display_summary(investment_details, total):
    print("\n--- Portfolio Summary ---")
    print(f"{'Stock':<10}{'Qty':<8}{'Price':<10}{'Value':<10}")
    for stock, quantity, price, value in investment_details:
        print(f"{stock:<10}{quantity:<8}{price:<10}{value:<10}")
    print(f"\nTotal Investment: ${total}")

def save_to_file(investment_details, total):
    choice = input("\nSave results to a file? (yes/no): ").lower()
    if choice != "yes":
        return

    file_format = input("Choose format (txt/csv): ").lower()

    if file_format == "csv":
        filename = "portfolio_summary.csv"
        with open(filename, "w", newline="") as f:
            writer = csv.writer(f)
            writer.writerow(["Stock", "Quantity", "Price", "Value"])
            for row in investment_details:
                writer.writerow(row)
            writer.writerow(["Total Investment", "", "", total])
        print(f"Saved to {filename}")

    elif file_format == "txt":
        filename = "portfolio_summary.txt"
        with open(filename, "w") as f:
            f.write("--- Portfolio Summary ---\n")
            f.write(f"{'Stock':<10}{'Qty':<8}{'Price':<10}{'Value':<10}\n")
            for stock, quantity, price, value in investment_details:
                f.write(f"{stock:<10}{quantity:<8}{price:<10}{value:<10}\n")
            f.write(f"\nTotal Investment: ${total}\n")
        print(f"Saved to {filename}")

    else:
        print("Invalid format. Skipping save.")

def main():
    print("Welcome to the Stock Portfolio Tracker!\n")
    portfolio = get_portfolio()

    if not portfolio:
        print("No stocks entered. Exiting.")
        return

    investment_details, total = calculate_investment(portfolio)
    display_summary(investment_details, total)
    save_to_file(investment_details, total)

if __name__ == "__main__":
    main()